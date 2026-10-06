import type { Buildable, GameState, SatisfactionAttributes } from '../../state/types';
import { standsOnCampus } from '../../state/types';
import { OPENING_LETTERS } from '../../data/eventData';
import { FOUNDERS_HALL_ID, isAcademicHall, milestoneSchools, programById } from '../../data/techData';
import { claimedHalls, claimedSchool, hallDisplayName, schoolHall } from '../techtree/schools';
import { seatingAsk } from './seating';
import { establishAsk } from './establish';
import { isHoused, schoolOffers } from '../techtree/programOffers';
import type { TabId } from '../../components/TabNav';
import { openingHoldsClock } from '../../state/opening';
import type { StepIntent } from './intent';
import { absoluteWeek } from '../../data/eventData';
import { eventById, eventText, fill } from '../events/catalogue';
import { unstaffedPrograms } from '../techtree/darkness';
import { restaffPlan } from '../faculty/restaffing';
import { idleCashAsk, SWEEP_DEFAULT_WEEKS } from '../finance/sweep';
import { pct, satisfactionFigure, weeksProse } from '../../format';
import { NEED_LABELS } from '../../data/figureHints';
import { PARK_WORDS, parkStands } from '../../data/researchParkData';
import { specializationOf } from '../prestige/specialization';
import { slotFree } from '../administration/offices';
import { crowdingCoverages, CROWDING_GRACE } from '../prestige/prestigeSystem';

// The next step: one toolbar line naming the highest-value thing on offer.
// In year 1 it is the earliest undone letter ask (the letters' order must
// not be contradicted), then the students short of places; afterward it is
// a letter's ask still undone, then a reading of the campus, in priority
// order: a dark program the market can staff (Plan 60: it seats nobody, so
// it outranks a letter), the students short of places (Plan 80D), the
// board's ask about idle cash (Plan 70D), a school to establish, free hall
// slot, program one course from established, crowding (Plan 95P), attribute
// shortfall, idle lab. Recomputed every render; nothing is stored.

export interface NextStep {
  text: string;
  // A tab to open, the build menu, or back to the campus; absent when it is
  // only something to know.
  // 'hall' opens a hall's panel on the map (`hallId`), where programs are
  // founded; any placed building's panel the same way (Plan 95O: a
  // building going up).
  go?: TabId | 'build' | 'campus' | 'hall';
  hallId?: string;
  // With 'hall': a program housed there whose tile opens with the panel, its
  // move showing (Plan 78D).
  programId?: string;
  // Pulses: something is waiting that will not wait long (Plan 34).
  urgent?: true;
  // The line as data, for the guided player (intent.ts); the UI ignores it.
  intent?: StepIntent;
}

// What will not wait (Plan 77): the inbox holds everything addressed to the
// president and its button counts it, so NEXT points there only for what
// lapses or presses this week: the board's unread letter, or an event in
// its last week to answer. Both pulse.
export function inboxPointer(s: GameState): NextStep | null {
  if ((s.finance.distress?.letters.length ?? 0) > 0) return { text: 'The board has written', go: 'inbox', urgent: true };
  const week = absoluteWeek(s);
  const last = (s.catalogue?.pending ?? [])
    .map((p) => ({ p, e: eventById(p.eventId) }))
    .filter((x) => x.e?.kind === 'inline' && x.e.timeoutWeeks - (week - x.p.firedWeek) <= 1);
  if (last.length === 0) return null;
  const { p, e } = last[0];
  const text = firstClause(fill(eventText(e!, p), p.vars));
  return { text: last.length > 1 ? `${last.length} matters lapse this week: ${text}` : `Lapses this week: ${text}`, go: 'inbox', urgent: true };
}

// An event's question, cut to its first clause for the strip.
function firstClause(text: string): string {
  const cut = text.search(/[.;:!?—]/);
  const first = cut > 0 ? text.slice(0, cut) : text;
  return first.length > 70 ? `${first.slice(0, 67)}…` : first;
}

// The needs as the Students tab and the satisfaction chip name them (Plan
// 78F: one word each, so NEXT's "Academic is at 38" is the tab's row).
const ATTRIBUTE_LABEL: Record<keyof SatisfactionAttributes, string> = NEED_LABELS;

// What would raise each, named in the line (the build menu opens on it).
const ATTRIBUTE_BUILD: Record<keyof SatisfactionAttributes, string> = {
  academic: 'a library would raise it',
  social: 'a student center or a recreation building would raise it',
  basicNeeds: 'a dining hall would raise it',
  health: 'a health center or a gym would raise it',
  housing: 'a residence hall would raise it',
};

// Shortfall line on the 0..100 attribute scale.
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
    return {
      text: ask.text, ...(ask.go ? { go: ask.go } : {}), ...(ask.hallId ? { hallId: ask.hallId } : {}),
      ...(ask.programId ? { programId: ask.programId } : {}), ...(ask.intent ? { intent: ask.intent } : {}),
    };
  }
  return null;
}

// A school to establish (Plan 80D): once a second academic hall stands,
// the school closest to six in one hall, "Establish a school: six programs
// of {school} in one hall (n of 6)". It replaced the move out of Founders
// Hall this line used to push (Plan 55): a school is six programs of one
// school in any hall, and where it grows is the player's choice. Only when
// something can be done about it this week (the guided player's intent is
// not a wait); otherwise the readings after it speak.
function establishSchool(s: GameState): NextStep | null {
  const ask = establishAsk(s);
  if (!ask || ask.intent.kind === 'wait') return null;
  return ask;
}

// The students short of places (Plan 80D, seating.ts): the college opens
// with no course, and is crowded until the catalog seats everyone.
function seating(s: GameState): NextStep | null {
  return seatingAsk(s);
}

// A hall with an empty slot and something to found in it (Plan 55): an
// offer whose school has a hall of its own belongs there; anything else
// goes to a hall no school claims — Founders Hall, an empty hall, or a
// mixed one; and a purchased hall one school claims offers that school's
// programs whatever the draw (Plan 78D), so its room is never a wait on
// the offer.
function freeSlot(s: GameState): NextStep | null {
  const hasRoom = (hallId: string) => s.halls[hallId]?.some(slotFree) ?? false;
  const nameOf = (hallId: string) => {
    const hall = s.tech.find((t) => t.id === hallId);
    return hall ? hallDisplayName(s, hall) : hallId;
  };
  // A program is founded from the hall's panel (BuildingInfoPanel.tsx).
  for (const id of s.programOffers) {
    const program = programById(id);
    const home = program ? schoolHall(s, program.school) : undefined;
    if (program && home && hasRoom(home)) {
      return { text: `${nameOf(home)} has room for ${program.name}, on offer — it teaches ${program.school}`, go: 'hall', hallId: home, intent: { kind: 'found', hallId: home, programId: program.id } };
    }
  }
  const open = Object.keys(s.halls).find((hallId) => {
    const hall = s.tech.find((t) => t.id === hallId);
    return !!hall && isAcademicHall(hall) && hasRoom(hallId) && claimedSchool(s, hallId) === null;
  });
  if (open && s.programOffers.length > 0) {
    const offers = s.programOffers.map((id) => programById(id)?.name ?? id);
    return {
      text: `${nameOf(open)} has a free program slot — ${offers.join(', ')} ${offers.length === 1 ? 'is' : 'are'} on offer`,
      go: 'hall',
      hallId: open,
      intent: { kind: 'found', hallId: open },
    };
  }
  // A school's own hall, with room: its panel offers every program of the
  // school the college can found.
  for (const claim of claimedHalls(s)) {
    if (claim.hallId === FOUNDERS_HALL_ID || !hasRoom(claim.hallId)) continue;
    const own = schoolOffers(s, claim.hallId);
    if (own.length === 0) continue;
    return {
      text: `${nameOf(claim.hallId)} has room for ${claim.school} (${claim.housed} of ${claim.slots}): ${own.length === 1 ? own[0].name : `${own[0].name} or ${own.length - 1} more`} on offer there`,
      go: 'hall',
      hallId: claim.hallId,
      intent: { kind: 'found', hallId: claim.hallId },
    };
  }
  if (s.programOffers.length === 0) return null;
  // Nothing on offer has anywhere to go: the next hall, if the chain has
  // one to site (Plan 58; the line used to stop at saying so).
  const nextHall = s.tech.find((t) => isAcademicHall(t) && t.status === 'available');
  if (nextHall) {
    return {
      text: `Nothing on offer has a hall to go to — site ${nextHall.name}`,
      go: 'build',
      intent: { kind: 'site', buildableIds: [nextHall.id] },
    };
  }
  // Every free program slot is some school's. Founders Hall, once a
  // school's home (Plan 59), still founds from the draw; a purchased hall
  // whose school has nothing left to found is filled only by a move.
  const claimed = claimedHalls(s).find((c) => hasRoom(c.hallId));
  if (!claimed) return null;
  return claimed.hallId === FOUNDERS_HALL_ID
    ? { text: `${nameOf(FOUNDERS_HALL_ID)} has room for ${claimed.school} when one is on offer: founding a program or declining an offer draws the next`, intent: { kind: 'wait' } }
    : { text: `${nameOf(claimed.hallId)} has room only for ${claimed.school}, and nothing of ${claimed.school} is left to offer`, intent: { kind: 'wait' } };
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
          ...(missing ? { intent: { kind: 'develop' as const, courseId: missing } } : {}),
        };
      }
    }
  }
  return null;
}

// Whether a building serves a need once it opens: its beds for housing,
// otherwise the need it is built for. A residence hall's shop feeds a few
// (facilitiesData.ts's isRetailFood) but is not what the line means by
// dining.
function servesNeed(t: Buildable, key: keyof SatisfactionAttributes): boolean {
  if (key === 'housing') return (t.effects?.capacityBonus ?? 0) > 0;
  return t.kind !== 'dorm' && t.effects?.satisfactionAttribute === key;
}

// What is going up for a need (Plan 95O, the second review's B3-3): a
// building under construction, or a story being added to a standing
// one, and the weeks until it opens. The first to open, if several.
export function comingFor(s: GameState, key: keyof SatisfactionAttributes): { building: Buildable; weeks: number; story: boolean } | null {
  let first: { building: Buildable; weeks: number; story: boolean } | null = null;
  for (const t of s.tech) {
    // A building develops only once sited, so no reading of the map is needed.
    if (t.kind === 'course' || !servesNeed(t, key)) continue;
    const building = t.status === 'developing' && t.renovatingFrom === undefined ? s.developing[t.id] : undefined;
    const story = standsOnCampus(t) && (t.extensionWeeks ?? 0) > 0 ? t.extensionWeeks : undefined;
    const weeks = building ?? story;
    if (weeks === undefined || weeks <= 0) continue;
    if (!first || weeks < first.weeks) first = { building: t, weeks, story: building === undefined };
  }
  return first;
}

// The worst satisfaction attribute under the shortfall line. When something
// that serves it is going up, the line names it and when it opens, and opens
// its site on the map, not the build menu: a player who trusted the line
// built the same hall twice (B3-3). It is then a wait, so the guided player
// does not build twice either; once the building opens, the line reads the
// need afresh.
function shortfall(s: GameState): NextStep | null {
  let worst: { key: keyof SatisfactionAttributes; score: number } | null = null;
  for (const key of Object.keys(ATTRIBUTE_LABEL) as Array<keyof SatisfactionAttributes>) {
    const score = s.students.satisfactionBreakdown[key];
    if (score < ATTRIBUTE_SHORTFALL && (!worst || score < worst.score)) worst = { key, score };
  }
  if (!worst) return null;
  const need = `${ATTRIBUTE_LABEL[worst.key]} is at ${satisfactionFigure(worst.score)}`;
  const coming = comingFor(s, worst.key);
  if (coming) {
    const name = coming.story ? `${coming.building.name}'s new story` : coming.building.name;
    return { text: `${need} — ${name} opens in ${weeksProse(coming.weeks)}`, go: 'hall', hallId: coming.building.id, intent: { kind: 'wait' } };
  }
  return { text: `${need}: ${ATTRIBUTE_BUILD[worst.key]}`, go: 'build', intent: { kind: 'build-for', attribute: worst.key } };
}

// Crowding (Plan 95P, the second review's B3-5): a need the class overruns,
// under the grace prestige's grade allows, costs prestige directly, so it
// speaks before the shortfall, which starts only at a score under 50. It
// is a line, not an intent: the guided player keeps the intent of the
// reading it stands before (`rest`), and relieves crowding by its own rule
// (sim/harness/moves.ts's relieveCrowding). When something that serves the
// need is going up (comingFor), the line names it and opens its site, and
// gives way to a step the player can act on (Plan 95O's rules).
const CROWDED_LABEL: Partial<Record<keyof SatisfactionAttributes, string>> = {
  housing: 'Housing', basicNeeds: 'Dining', health: 'Health care',
};
function crowding(s: GameState, rest: NextStep | null): NextStep | null {
  const worst = crowdingCoverages(s).find((c) => c.attribute !== undefined && c.coverage < CROWDING_GRACE);
  if (!worst?.attribute) return rest;
  const need = `${CROWDED_LABEL[worst.attribute] ?? ATTRIBUTE_LABEL[worst.attribute]} serves ${pct(worst.coverage)} — crowding is costing prestige`;
  const intent = rest?.intent ? { intent: rest.intent } : {};
  const coming = comingFor(s, worst.attribute);
  if (coming) {
    if (rest?.intent && rest.intent.kind !== 'wait') return rest;
    const name = coming.story ? `${coming.building.name}'s new story` : coming.building.name;
    return { text: `${need}; ${name} opens in ${weeksProse(coming.weeks)}`, go: 'hall', hallId: coming.building.id, ...intent };
  }
  return { text: `${need}; ${ATTRIBUTE_BUILD[worst.attribute]}`, go: 'build', ...intent };
}

// A program gone dark with an unstaffed course (Plan 59), when the payroll
// or the market can staff it. It seats nobody and grades as zeros until
// then; one click in the Curriculum puts it back (Plan 60: the guided player
// found thirteen programs dark at Year 31 with nothing on the line saying so).
function darkProgram(s: GameState): NextStep | null {
  const dark = unstaffedPrograms(s);
  if (dark.size === 0) return null;
  const plan = restaffPlan(s);
  if (plan.length === 0) return null;
  const names = [...dark].map((id) => programById(id)?.name ?? id);
  const text = names.length === 1
    ? `${names[0]} is dark — a course has no instructor; staff it from the market`
    : `${names.length} programs are dark — ${names[0]} and more; staff them from the market`;
  return { text, go: 'curriculum', urgent: true, intent: { kind: 'restaff', school: null } };
}

// A finished lab with nothing running in it.
// A lab that has not seen an initiative through comes first: every lab
// finishing one opens the Research Park (Plan 59), which since Plan 85F only
// a college specialized in research may build, so only such a college (or
// one yet to choose) is told the park comes closer.
function idleLab(s: GameState): NextStep | null {
  const idle = s.tech.filter((t) => t.facilityType === 'lab' && t.status === 'done' && !s.research.initiatives[t.id]);
  if (idle.length === 0) return null;
  const finished = new Set(Array.isArray(s.research.finishedLabs) ? s.research.finishedLabs : []);
  const unproven = idle.find((t) => !finished.has(t.id));
  const lab = unproven ?? idle[0];
  const chosen = specializationOf(s);
  const parkAhead = !parkStands(s) && (chosen === null || chosen === 'research');
  return {
    text: unproven && parkAhead
      ? PARK_WORDS.unprovenLab(lab.name, chosen === 'research')
      : `${lab.name} is idle — commission research`,
    go: 'research',
    intent: { kind: 'research', labId: lab.id },
  };
}

// The board's ask about idle cash (Plan 70D), until a sweep is set or the
// cash is spent: one click in the Treasury.
function idleCash(s: GameState): NextStep | null {
  if (!idleCashAsk(s)) return null;
  return {
    text: 'Idle cash counts for nothing — set a standing sweep into the endowment',
    go: 'treasury',
    intent: { kind: 'sweep', weeks: SWEEP_DEFAULT_WEEKS },
  };
}

// A run that skipped the scripted first year gets the readings from the start.
export function nextStep(s: GameState): NextStep | null {
  // The opening walkthrough's coach card speaks instead (opening.ts); once
  // it is skipped, an unsited Founders Hall still holds the clock, and the
  // line says so (Plan 80D).
  if (openingHoldsClock(s)) {
    if (s.events.opening.stage !== 'play') return null;
    return { text: 'Site Founders Hall: the clock waits until it stands', go: 'build', urgent: true, intent: { kind: 'site', buildableIds: [FOUNDERS_HALL_ID] } };
  }
  if (s.clock.year === 1 && !s.events.opening.skipped) return letterAsk(s) ?? seating(s) ?? shortfall(s);
  // A letter whose ask cannot be acted on this week (it waits on an offer
  // or a hall) gives way to a reading that can (Plan 58): "grow Science"
  // with no Science on offer and nowhere for the offers to go is a
  // deadlock only the next hall breaks, and the line has to say so.
  const dark = darkProgram(s);
  if (dark) return dark;
  const letter = letterAsk(s);
  if (letter && letter.intent?.kind !== 'wait') return letter;
  // A shortfall with its building going up is only something to know, so a
  // lab to set working speaks first (Plan 95O).
  const short = shortfall(s);
  const waiting = short?.intent?.kind === 'wait';
  return seating(s) ?? idleCash(s) ?? establishSchool(s) ?? freeSlot(s) ?? nearlyEstablished(s) ?? crowding(s, (waiting ? null : short) ?? idleLab(s) ?? short ?? letter);
}
