import type { GameState, SatisfactionAttributes } from '../../state/types';
import { OPENING_LETTERS } from '../../data/eventData';
import { FOUNDERS_HALL_ID, isAcademicHall, milestoneSchools, programById } from '../../data/techData';
import { claimedHalls, claimedSchool, hallDisplayName, programsAwayFromHome, schoolHall, suggestedMove } from '../techtree/schools';
import { isHoused } from '../techtree/programOffers';
import type { TabId } from '../../components/TabNav';
import { openingHoldsClock } from '../../state/opening';
import { absoluteWeek } from '../../data/eventData';
import { milestoneById } from '../../data/ladderData';
import { eventById, fill } from '../events/catalogue';

// The next step: one toolbar line naming the highest-value thing on offer.
// In year 1 it is the latest undone letter ask (the letters' order must not
// be contradicted); afterward it is a letter's ask still undone, then a
// reading of the campus, in priority order: a program that can move to its
// school's hall, free hall slot, program one course from established,
// attribute shortfall, idle lab. Recomputed every render; nothing is stored.

export interface NextStep {
  text: string;
  // A tab to open, the build menu, or back to the campus; absent when it is
  // only something to know.
  // 'hall' opens a hall's panel on the map (`hallId`), where programs are
  // founded.
  go?: TabId | 'build' | 'campus' | 'hall';
  hallId?: string;
  // Pulses: something is waiting that will not wait long (Plan 34).
  urgent?: true;
}

// What waits on the map while a tab hides it (Plan 34, V1-34): the board's
// letter, a milestone's note, a student demand, an event in the panel. The
// ticker's NEXT points back to it; an event with a week or less to answer,
// or the board, pulses.
export function waitingOnMap(s: GameState): NextStep | null {
  if ((s.finance.distress?.letters.length ?? 0) > 0) return { text: 'The board has written', go: 'campus', urgent: true };
  const pending = (s.catalogue?.pending ?? []).map((p) => ({ p, e: eventById(p.eventId) })).filter((x) => x.e?.kind === 'inline');
  if (pending.length > 0) {
    const { p, e } = pending[0];
    const left = e!.timeoutWeeks - (absoluteWeek(s) - p.firedWeek);
    const text = firstClause(fill(e!.text, p.vars));
    return { text: pending.length > 1 ? `${pending.length} matters wait: ${text}` : `A matter waits: ${text}`, go: 'campus', ...(left <= 1 ? { urgent: true as const } : {}) };
  }
  if (s.ladder.unread.length > 0) return { text: `A milestone: ${milestoneById(s.ladder.unread[0])?.name ?? 'reached'}`, go: 'campus' };
  if (s.events.demandUnread && s.events.activeDemand) return { text: 'The students have a demand', go: 'campus' };
  return null;
}

// An event's question, cut to its first clause for the strip.
function firstClause(text: string): string {
  const cut = text.search(/[.;:!?—]/);
  const first = cut > 0 ? text.slice(0, cut) : text;
  return first.length > 70 ? `${first.slice(0, 67)}…` : first;
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
  if (s.events.opening.skipped) return null;
  const read = s.events.opening.read;
  // The earliest delivered letter whose ask is not done: a calendar letter's
  // in year one, a letter that waited on the college's in any year.
  for (const letter of OPENING_LETTERS) {
    if (!read.includes(letter.id) || letter.done(s)) continue;
    if (!letter.arrives && s.clock.year !== 1) continue;
    const ask = letter.ask(s);
    return { text: ask.text, ...(ask.go ? { go: ask.go } : {}), ...(ask.hallId ? { hallId: ask.hallId } : {}) };
  }
  return null;
}

// A program away from home that can move now (Plan 55): into its school's
// hall, or, for the next school to move, into an empty one. Pointed at the
// hall it is in, whose panel carries the move.
function awayFromHome(s: GameState): NextStep | null {
  for (const away of programsAwayFromHome(s)) {
    const move = suggestedMove(s, away.programId);
    if (!move) continue;
    const program = programById(away.programId);
    const hall = s.tech.find((t) => t.id === move.hallId);
    if (!program || !hall) continue;
    const name = hallDisplayName(s, hall);
    return {
      text: claimedSchool(s, move.hallId)
        ? `${program.name} could move to ${name}, which teaches ${program.school}`
        : `${name} stands empty: move ${program.name} into it and ${program.school} has a hall of its own`,
      go: 'hall',
      hallId: away.hallId,
    };
  }
  return null;
}

// A hall with an empty slot while programs are on offer (Plan 55): an offer
// whose school has a hall of its own belongs there; anything else goes to a
// hall no school claims — Founders Hall, an empty hall, or a mixed one.
function freeSlot(s: GameState): NextStep | null {
  if (s.programOffers.length === 0) return null;
  const hasRoom = (hallId: string) => s.halls[hallId]?.some((slot) => slot.programId === null) ?? false;
  const nameOf = (hallId: string) => {
    const hall = s.tech.find((t) => t.id === hallId);
    return hall ? hallDisplayName(s, hall) : hallId;
  };
  // A program is founded from the hall's panel (BuildingInfoPanel.tsx).
  for (const id of s.programOffers) {
    const program = programById(id);
    const home = program ? schoolHall(s, program.school) : undefined;
    if (program && home && hasRoom(home)) {
      return { text: `${nameOf(home)} has room for ${program.name}, on offer — it teaches ${program.school}`, go: 'hall', hallId: home };
    }
  }
  const open = Object.keys(s.halls).find((hallId) => {
    const hall = s.tech.find((t) => t.id === hallId);
    return !!hall && isAcademicHall(hall) && hasRoom(hallId) && claimedSchool(s, hallId) === null;
  });
  if (open) {
    const offers = s.programOffers.map((id) => programById(id)?.name ?? id);
    return {
      text: `${nameOf(open)} has a free slot — ${offers.join(', ')} ${offers.length === 1 ? 'is' : 'are'} on offer`,
      go: 'hall',
      hallId: open,
    };
  }
  // Every free slot is some school's, and nothing on offer is.
  const claimed = claimedHalls(s).find((c) => hasRoom(c.hallId));
  return claimed
    ? { text: `${nameOf(FOUNDERS_HALL_ID)} is full; ${nameOf(claimed.hallId)} has room for ${claimed.school} when one is on offer` }
    : null;
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
          text: `The ${major.name} program is one course from being established${course ? ` — ${course.name}` : ''}`,
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
  return letterAsk(s) ?? awayFromHome(s) ?? freeSlot(s) ?? nearlyEstablished(s) ?? shortfall(s) ?? idleLab(s);
}
