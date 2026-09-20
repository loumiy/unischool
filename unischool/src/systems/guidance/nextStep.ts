import type { GameState, SatisfactionAttributes } from '../../state/types';
import { OPENING_LETTERS } from '../../data/eventData';
import { milestoneSchools, programById } from '../../data/techData';
import { isHoused } from '../techtree/programOffers';
import type { TabId } from '../../components/TabNav';
import { openingHoldsClock } from '../../state/opening';

// ---------------------------------------------------------------------
// THE NEXT STEP (Plan 16's PR F): one line the toolbar carries, saying
// the highest-value thing the game is currently offering. During the first
// year it is the latest letter's ask, until that is done; after that it is
// a READING of the campus — a hall with a free slot and a program on
// offer, a program one course from established, a facility whose
// satisfaction attribute is under 50, a lab standing idle — in that order,
// which is roughly the order of what each is worth to the run.
//
// In the first year the line belongs to the letters alone (see nextStep
// below): the script says things in an order, and a reading that jumped
// ahead of it would be the toolbar contradicting the board.
//
// A reading, never a queue. There is no list behind this line, nothing is
// ticked off, and nothing here is stored: it is recomputed from state on
// every render, so it says what is true now and goes quiet when nothing
// is. The September review's finding was "uncertain what to do next: week
// 5 of year 1; every summer after year 25" — this is the first half's
// answer, and Plans 14 and 17 are the second's.
// ---------------------------------------------------------------------

export interface NextStep {
  text: string;
  // Where the line points, if anywhere: a tab to open, or the build menu.
  // Plain text when it is only something to know.
  go?: TabId | 'build';
}

const ATTRIBUTE_LABEL: Record<keyof SatisfactionAttributes, string> = {
  academic: 'Study space',
  social: 'Social life',
  basicNeeds: 'Basic needs',
  health: 'Health',
  housing: 'Housing',
};

// Below this an attribute is a shortfall worth naming, on the 0..100 scale
// each one is scored on (satisfactionSystem.ts). Exported for the balance
// harness, whose prudent strategies save for the facility this line would
// name (sim/balanceSim.ts).
export const ATTRIBUTE_SHORTFALL = 50;

function letterAsk(s: GameState): NextStep | null {
  if (s.clock.year !== 1 || s.events.opening.skipped) return null;
  const read = s.events.opening.read;
  // The latest letter delivered whose ask is not done; earlier letters
  // left undone still count, so a player who skipped ahead is reminded of
  // the first thing before the second.
  for (const letter of OPENING_LETTERS) {
    if (!read.includes(letter.id) || letter.done(s)) continue;
    return { text: letter.ask, go: letter.ask.includes('(Build)') ? 'build' : letter.ask.includes('(Curriculum)') ? 'curriculum' : undefined };
  }
  return null;
}

// A hall with an empty slot while programs are on offer: founding is the
// single most valuable thing a school can do with a click.
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

// A housed program with three of its four tier-2 courses done: one course
// from established, which is the milestone that counts toward breadth.
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

// The worst satisfaction attribute under the shortfall line, named with
// its figure. The build menu is where the fix lives.
function shortfall(s: GameState): NextStep | null {
  let worst: { key: keyof SatisfactionAttributes; score: number } | null = null;
  for (const key of Object.keys(ATTRIBUTE_LABEL) as Array<keyof SatisfactionAttributes>) {
    const score = s.students.satisfactionBreakdown[key];
    if (score < ATTRIBUTE_SHORTFALL && (!worst || score < worst.score)) worst = { key, score };
  }
  if (!worst) return null;
  return { text: `${ATTRIBUTE_LABEL[worst.key]} is at ${Math.round(worst.score)} — build for it`, go: 'build' };
}

// A finished lab with nothing running in it. Idle capacity produces
// nothing (research.md); the way to produce is to start something.
function idleLab(s: GameState): NextStep | null {
  const lab = s.tech.find((t) => t.facilityType === 'lab' && t.status === 'done' && !s.research.initiatives[t.id]);
  if (!lab) return null;
  return { text: `${lab.name} is idle — commission research`, go: 'research' };
}

// During the scripted first year the line is the letters' and nothing
// else's: a reading of the campus in week 2 ("basic needs is at 41") is
// true, and it is exactly what the week-9 letter is written to say, in
// order, with the reason. A run that declined the script gets the readings
// from the start.
export function nextStep(s: GameState): NextStep | null {
  // While the opening walkthrough holds the clock the coach card is the
  // one voice (see opening.ts); the line would only repeat it.
  if (openingHoldsClock(s)) return null;
  if (s.clock.year === 1 && !s.events.opening.skipped) return letterAsk(s);
  return freeSlot(s) ?? nearlyEstablished(s) ?? shortfall(s) ?? idleLab(s);
}
