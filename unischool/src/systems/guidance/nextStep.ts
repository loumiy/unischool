import type { Buildable, GameState, SatisfactionAttributes } from '../../state/types';
import { standsOnCampus } from '../../state/types';
import { OPENING_LETTERS } from '../../data/eventData';
import { FOUNDERS_HALL_ID, isAcademicHall, milestoneSchools, programById } from '../../data/techData';
import { CLAIM_AT, claimedHalls, claimedSchool, hallDisplayName, homeSchool, schoolHall } from '../techtree/schools';
import { seatingAsk } from './seating';
import { establishAsk } from './establish';
import { drawsGlobalOffers, isHoused, schoolOffers } from '../techtree/programOffers';
import type { TabId } from '../../components/TabNav';
import { openingHoldsClock } from '../../state/opening';
import type { StepIntent } from './intent';
import { absoluteWeek } from '../../data/eventData';
import { eventById, eventText, fill } from '../events/catalogue';
import { unstaffedPrograms } from '../techtree/darkness';
import { restaffPlan } from '../faculty/restaffing';
import { idleCashAsk, SWEEP_DEFAULT_WEEKS } from '../finance/sweep';
import { countWord, pct, satisfactionFigure, weeksProse } from '../../format';
import { NEED_LABELS } from '../../data/figureHints';
import { ACADEMIC_LIBRARY_POINTS, libraryPoints } from '../satisfaction/satisfactionSystem';
import { slotFree } from '../administration/offices';
import { crowdingCoverages, CROWDING_GRACE } from '../prestige/prestigeSystem';
import { initiativeOffers } from '../../data/researchData';
import { milestoneById, milestoneForBuildable } from '../../data/ladderData';
import { financeBreakdown } from '../finance/financeSystem';

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
  if ((s.finance.distress?.letters.length ?? 0) > 0) return { text: 'The board has written to you', go: 'inbox', urgent: true };
  const week = absoluteWeek(s);
  const last = (s.catalogue?.pending ?? [])
    .map((p) => ({ p, e: eventById(p.eventId) }))
    .filter((x) => x.e?.kind === 'inline' && x.e.timeoutWeeks - (week - x.p.firedWeek) <= 1);
  if (last.length === 0) return null;
  const { p, e } = last[0];
  const text = firstClause(fill(eventText(e!, p), p.vars));
  return { text: last.length > 1 ? `${last.length} matters need an answer this week: ${text}` : `Answer this week: ${text}`, go: 'inbox', urgent: true };
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

// What would raise each, named in the line (the build menu opens on it),
// and the buildings the words name. A student center or a health center
// waits on the ladder (ladderData.ts), and through Plan 107 the line asked
// for one weeks before the build menu had it: until one opens, the line
// names whatever else serves the need, or when the named ones open.
const ATTRIBUTE_BUILD: Record<keyof SatisfactionAttributes, { text: string; names: (t: Buildable) => boolean }> = {
  academic: { text: 'build a library', names: (t) => t.facilityType === 'library' },
  social: { text: 'build a student center or a recreation building', names: (t) => t.facilityType === 'studentCenter' || t.facilityType === 'recCenter' },
  basicNeeds: { text: 'build a dining hall', names: (t) => t.facilityType === 'diningHall' },
  health: { text: 'build a health center or a gym', names: (t) => t.facilityType === 'healthCenter' || t.facilityType === 'gym' },
  housing: { text: 'build a residence hall', names: (t) => t.kind === 'dorm' },
};

// What raises an attribute, as the line says it: the buildings it names
// once any of them is open to build; else another building that serves
// the need, on the menu now (the Campus Quad, for social); else what the
// ladder waits on, which is only something to know.
export function attributeRemedy(s: GameState, key: keyof SatisfactionAttributes): { text: string; go?: 'build'; intent: StepIntent } {
  const build = ATTRIBUTE_BUILD[key];
  const serves = (t: Buildable) => (t.kind === 'facility' && t.effects?.satisfactionAttribute === key) || (key === 'housing' && t.kind === 'dorm');
  if (s.tech.some((t) => build.names(t) && t.status !== 'locked')) return { text: build.text, go: 'build', intent: { kind: 'build-for', attribute: key } };
  const other = s.tech.find((t) => serves(t) && t.status === 'available');
  if (other) return { text: `build the ${other.name}`, go: 'build', intent: { kind: 'build-for', attribute: key } };
  const gate = s.tech.filter(build.names).map((t) => milestoneById(milestoneForBuildable(t.id) ?? '')).find((m) => m !== undefined && s.ladder.reached[m.id] === undefined);
  return { text: gate ? `${build.text}, which opens with ${gate.condition}` : build.text, intent: { kind: 'wait' } };
}

// The building a build door's line names, from its intent (Plan 114F, the
// third review's C3-9: the menu opened on Grounds whatever the line said):
// the first of a site's buildings on the menu, or the first building a
// need's line names, else one that serves the need. The menu opens on its
// tab and rings it while it can be built.
export function stepBuilding(s: GameState, intent: StepIntent | undefined): Buildable | null {
  if (intent?.kind === 'site') {
    return intent.buildableIds.map((id) => s.tech.find((t) => t.id === id)).find((t) => !!t && t.status !== 'locked') ?? null;
  }
  if (intent?.kind !== 'build-for') return null;
  const key = intent.attribute;
  const serves = (t: Buildable) => (t.kind === 'facility' && t.effects?.satisfactionAttribute === key) || (key === 'housing' && t.kind === 'dorm');
  return s.tech.find((t) => ATTRIBUTE_BUILD[key].names(t) && t.status === 'available')
    ?? s.tech.find((t) => ATTRIBUTE_BUILD[key].names(t) && t.status !== 'locked')
    ?? s.tech.find((t) => serves(t) && t.status === 'available')
    ?? null;
}

// What a line's door opens on, beyond its tab or hall: the building a build
// line names (Plan 114F).
export function stepTarget(s: GameState, step: NextStep): string | undefined {
  return step.go === 'build' ? stepBuilding(s, step.intent)?.id : undefined;
}

// Shortfall line on the 0..100 attribute scale.
export const ATTRIBUTE_SHORTFALL = 50;

// What would raise academic, read off its two parts (satisfactionSystem.ts):
// the library's seats, and the teaching. Through 0.1.2 the line always asked
// for a library, and a player with one standing and its seats enough was
// told to build one (Playtest 1, S2): academic also reads the courses'
// teaching, which no building raises.
export function academicRemedy(s: GameState): { text: string; go: TabId | 'build'; library: boolean } {
  if (libraryPoints(s) < ACADEMIC_LIBRARY_POINTS) {
    const stands = s.tech.some((t) => t.effects?.satisfactionAttribute === 'academic' && standsOnCampus(t));
    return stands
      ? { text: 'add library seats with another story or a second library', go: 'build', library: true }
      : { text: ATTRIBUTE_BUILD.academic.text, go: 'build', library: true };
  }
  return { text: 'better teaching would raise it (the library has room)', go: 'faculty', library: false };
}

// A letter recorded read unsent counts: a run the chapters guide is sent no
// letter (Plan 112A), and the line still carries each one's ask once it
// falls due.
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
// the offer. The Curriculum's head shows it too (Plan 114F).
export function freeSlot(s: GameState): NextStep | null {
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
      // Short of three, the line says how many more make it the school's
      // hall (Plan 100): until then the hall founds from the offers.
      const short = claimedSchool(s, home) ? 0 : CLAIM_AT - (homeSchool(s, home)?.housed ?? 0);
      const tail = short > 0
        ? `. ${countWord(short)[0].toUpperCase()}${countWord(short).slice(1)} more ${program.school} ${short === 1 ? 'program' : 'programs'} there will make it ${program.school}'s hall`
        : `, ${program.school}'s hall`;
      return { text: `Found ${program.name} in ${nameOf(home)}${tail}`, go: 'hall', hallId: home, intent: { kind: 'found', hallId: home, programId: program.id } };
    }
  }
  const open = Object.keys(s.halls).find((hallId) => {
    const hall = s.tech.find((t) => t.id === hallId);
    // An open hall, or a claimed one whose school has nothing left to found.
    return !!hall && isAcademicHall(hall) && hasRoom(hallId)
      && (homeSchool(s, hallId) === null || (claimedSchool(s, hallId) !== null && drawsGlobalOffers(s, hallId)));
  });
  if (open && s.programOffers.length > 0) {
    const offers = s.programOffers.map((id) => programById(id)?.name ?? id);
    return {
      text: `${nameOf(open)} has a free slot: found ${offers.length === 1 ? offers[0] : `${offers.slice(0, -1).join(', ')} or ${offers[offers.length - 1]}`}`,
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
      text: `Found ${own.length === 1 ? own[0].name : `${own[0].name} or one of ${own.length - 1} more`} in ${nameOf(claim.hallId)} (${claim.school}: ${claim.housed} of ${claim.slots})`,
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
      text: `Place ${nextHall.name}: no hall has room for the programs on offer`,
      go: 'build',
      intent: { kind: 'site', buildableIds: [nextHall.id] },
    };
  }
  // Every free program slot is some school's. Founders Hall, once a
  // school's home (Plan 59), still founds from the draw; a purchased hall
  // whose school has nothing left to found is filled only by a move.
  // A hall short of a claim takes the offers, so only a claimed hall can be
  // waiting on its own school (Plan 100).
  const claimed = claimedHalls(s).find((c) => hasRoom(c.hallId));
  if (!claimed) return null;
  return claimed.hallId === FOUNDERS_HALL_ID
    ? { text: `${nameOf(FOUNDERS_HALL_ID)} has room for a ${claimed.school} program once one is on offer`, intent: { kind: 'wait' } }
    : { text: `${nameOf(claimed.hallId)} only takes ${claimed.school} programs, and none are left to found`, intent: { kind: 'wait' } };
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
          text: course ? `Develop ${course.name} to establish the ${major.name} program` : `The ${major.name} program is one course from being established`,
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
  const need = `${ATTRIBUTE_LABEL[worst.key]} is at ${satisfactionFigure(worst.score)} out of 100`;
  const coming = comingFor(s, worst.key);
  if (coming) {
    const name = coming.story ? `${coming.building.name}'s new story` : coming.building.name;
    return { text: `${need}. ${name} opens in ${weeksProse(coming.weeks)}`, go: 'hall', hallId: coming.building.id, intent: { kind: 'wait' } };
  }
  if (worst.key === 'academic') {
    const remedy = academicRemedy(s);
    // With the library's seats enough, nothing to build: the guided player
    // waits on the line, as on any reading it cannot act on.
    return { text: `${need}: ${remedy.text}`, go: remedy.go, intent: remedy.library ? { kind: 'build-for', attribute: 'academic' } : { kind: 'wait' } };
  }
  const remedy = attributeRemedy(s, worst.key);
  return { text: `${need}: ${remedy.text}`, ...(remedy.go ? { go: remedy.go } : {}), intent: remedy.intent };
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
  const need = `${CROWDED_LABEL[worst.attribute] ?? ATTRIBUTE_LABEL[worst.attribute]} at ${pct(worst.coverage)}`;
  const intent = rest?.intent ? { intent: rest.intent } : {};
  const coming = comingFor(s, worst.attribute);
  if (coming) {
    if (rest?.intent && rest.intent.kind !== 'wait') return rest;
    const name = coming.story ? `${coming.building.name}'s new story` : coming.building.name;
    return { text: `${need}. ${name} opens in ${weeksProse(coming.weeks)}`, go: 'hall', hallId: coming.building.id, ...intent };
  }
  const remedy = attributeRemedy(s, worst.attribute);
  return { text: `${need}: ${remedy.text}`, ...(remedy.go ? { go: remedy.go } : {}), ...intent };
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
    ? `${names[0]} has a course with no professor: staff it in the Curriculum`
    : `${names.length} programs have courses with no professor, ${names[0]} first: staff them in the Curriculum`;
  return { text, go: 'curriculum', urgent: true, intent: { kind: 'restaff', school: null } };
}

// A finished lab with nothing running in it.
// A lab that has not seen an initiative through comes first: every lab
// finishing one opens the Research Park (Plan 59), which since Plan 85F only
// a college specialized in research may build, so only such a college (or
// one yet to choose) is told the park comes closer.
// Only a lab with a project it can start (Plan 98G): an
// unblocked offer the college can fund and keep LAB_RESERVE_WEEKS of
// expenses in hand. Otherwise the line moves on: it never asks for what
// the player can't do.
export const LAB_RESERVE_WEEKS = 5;

export function labCanStart(s: GameState, labId: string): boolean {
  const floor = LAB_RESERVE_WEEKS * financeBreakdown(s).totalExpenses;
  return initiativeOffers(s, labId).some((o) => !o.blockedReason && s.finance.cash - o.fundingCost >= floor);
}

function idleLab(s: GameState): NextStep | null {
  const idle = s.tech.filter((t) => t.facilityType === 'lab' && t.status === 'done' && !s.research.initiatives[t.id] && labCanStart(s, t.id));
  if (idle.length === 0) return null;
  // The first idle lab. Which have finished a project no longer matters
  // to anything (Plan 114A), so none is put first for it.
  const lab = idle[0];
  return {
    text: `${lab.name} is idle: start a research project`,
    go: 'research',
    intent: { kind: 'research', labId: lab.id },
  };
}

// The board's ask about idle cash (Plan 70D), until a sweep is set or the
// cash is spent: one click in the Treasury.
function idleCash(s: GameState): NextStep | null {
  if (!idleCashAsk(s)) return null;
  return {
    text: 'Set up a sweep to move spare cash into the endowment',
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
    return { text: 'Place Founders Hall. Time is paused until you do', go: 'build', urgent: true, intent: { kind: 'site', buildableIds: [FOUNDERS_HALL_ID] } };
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
