import type { GameState, SatisfactionAttributes } from '../../state/types';
import { OPENING_LETTERS } from '../../data/eventData';
import { milestoneSchools, programById } from '../../data/techData';
import { isHoused } from '../techtree/programOffers';
import type { TabId } from '../../components/TabNav';
import { openingHoldsClock } from '../../state/opening';

// The next step: one toolbar line naming the highest-value thing on offer.
// In year 1 it is the latest undone letter ask (the letters' order must not
// be contradicted); afterwards it is a reading of the campus, in priority
// order: free hall slot, program one course from established, attribute
// shortfall, idle lab. Recomputed every render; nothing is stored.

export interface NextStep {
  text: string;
  // A tab to open or the build menu; absent when it is only something to know.
  go?: TabId | 'build';
}

const ATTRIBUTE_LABEL: Record<keyof SatisfactionAttributes, string> = {
  academic: 'Study space',
  social: 'Social life',
  basicNeeds: 'Basic needs',
  health: 'Health',
  housing: 'Housing',
};

// Shortfall line on the 0..100 attribute scale. Exported for sim/balanceSim.ts.
export const ATTRIBUTE_SHORTFALL = 50;

function letterAsk(s: GameState): NextStep | null {
  if (s.clock.year !== 1 || s.events.opening.skipped) return null;
  const read = s.events.opening.read;
  // The earliest delivered letter whose ask is not done.
  for (const letter of OPENING_LETTERS) {
    if (!read.includes(letter.id) || letter.done(s)) continue;
    return { text: letter.ask, go: letter.ask.includes('(Build)') ? 'build' : letter.ask.includes('(Curriculum)') ? 'curriculum' : undefined };
  }
  return null;
}

// A hall with an empty slot while programs are on offer.
function freeSlot(s: GameState): NextStep | null {
  if (s.programOffers.length === 0) return null;
  for (const [hallId, slots] of Object.entries(s.halls)) {
    if (!slots.some((slot) => slot.programId === null)) continue;
    const hall = s.tech.find((t) => t.id === hallId);
    if (!hall) continue;
    const offers = s.programOffers.map((id) => programById(id)?.name ?? id);
    return {
      text: `${hall.name} has a free slot — ${offers.join(', ')} ${offers.length === 1 ? 'is' : 'are'} on offer`,
      go: 'curriculum',
    };
  }
  return null;
}

// A housed program one tier-2 course from established.
function nearlyEstablished(s: GameState): NextStep | null {
  const done = new Set(s.tech.filter((t) => t.kind === 'course' && t.status === 'done').map((t) => t.id));
  for (const school of milestoneSchools()) {
    for (const major of school.majors) {
      if (s.milestones[`program-established:${major.prefix}`]) continue;
      if (!isHoused(s, major.prefix)) continue;
      const finished = major.tier2Ids.filter((id) => done.has(id)).length;
      if (finished === major.tier2Ids.length - 1) {
        const missing = major.tier2Ids.find((id) => !done.has(id));
        const course = missing ? s.tech.find((t) => t.id === missing) : undefined;
        return {
          text: `${major.name} is one course from established${course ? ` — ${course.name}` : ''}`,
          go: 'curriculum',
        };
      }
    }
  }
  return null;
}

// The worst satisfaction attribute under the shortfall line.
function shortfall(s: GameState): NextStep | null {
  let worst: { key: keyof SatisfactionAttributes; score: number } | null = null;
  for (const key of Object.keys(ATTRIBUTE_LABEL) as Array<keyof SatisfactionAttributes>) {
    const score = s.students.satisfactionBreakdown[key];
    if (score < ATTRIBUTE_SHORTFALL && (!worst || score < worst.score)) worst = { key, score };
  }
  if (!worst) return null;
  return { text: `${ATTRIBUTE_LABEL[worst.key]} is at ${Math.round(worst.score)} — build for it`, go: 'build' };
}

// A finished lab with nothing running in it.
function idleLab(s: GameState): NextStep | null {
  const lab = s.tech.find((t) => t.facilityType === 'lab' && t.status === 'done' && !s.research.initiatives[t.id]);
  if (!lab) return null;
  return { text: `${lab.name} is idle — commission research`, go: 'research' };
}

// A run that skipped the scripted first year gets the readings from the start.
export function nextStep(s: GameState): NextStep | null {
  // The opening walkthrough's coach card speaks instead (opening.ts).
  if (openingHoldsClock(s)) return null;
  if (s.clock.year === 1 && !s.events.opening.skipped) return letterAsk(s);
  return freeSlot(s) ?? nearlyEstablished(s) ?? shortfall(s) ?? idleLab(s);
}
