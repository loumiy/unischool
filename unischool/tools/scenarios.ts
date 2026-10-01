// ---------------------------------------------------------------------
// The scenario index: the states a playtest keeps returning to, each named.
//
// A scenario is a recipe, never a file: `npm run scenario -- <name>` builds
// the save on demand by playing the real reducer forward (tools/scenario.ts),
// so it survives a SAVE_VERSION bump where a committed save would go stale.
// Nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { GameState } from '../src/state/types';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { offerablePrograms, PROGRAM_OFFER_COUNT } from '../src/systems/techtree/programOffers';
import { claimedHalls, programsAwayFromHome, suggestedMove } from '../src/systems/techtree/schools';
import { relocateProgram, unlockAvailable } from '../src/systems/techtree/techSystem';
import { instituteStands } from '../src/data/trainingData';
import { RESEARCH_PARK_ID, parkStands } from '../src/data/researchParkData';
import { firstFreeSpot, footprintOf, placementFor } from '../src/state/campusMap';
import type { SpecializationRule } from '../sim/harness/specialization';

export interface Scenario {
  name: string;
  // One line, printed by `--list`: what this state is for, not what it
  // contains.
  what: string;
  // A player (sim/harness/archetypes.ts's PLAYERS: the guided player or an
  // archetype), matched case-insensitively on a prefix.
  player: string;
  // Years to play; the run stops at the start of the year after this one.
  // With `stopWhen` it is a cutoff, so a scenario waiting on a modal can
  // never become an unbounded search.
  year: number;
  // Where to stop inside a year. Checked at the top of a week, before the
  // player answers anything, so the modal is still pending.
  stopWhen?: (s: GameState) => boolean;
  // Break the state after the run, before it is written: no player
  // digs a hole deep enough on its own.
  mutate?: (s: GameState) => void;
  // While the player spends the faculty training program's picks (Plan
  // 85E, sim/harness/game.ts's Player.trains): absent, always.
  trains?: (s: GameState) => boolean;
  // How the player chooses its specialization (sim/harness/
  // specialization.ts): absent, its strongest pillar.
  specialization?: SpecializationRule;
}

// A Research Park built before Plan 85F made it the research
// specialization's: standing, sited at the first free spot, built in Year
// 17 as the strong players built it then. For the choice's cards on a save
// that already has one.
export function withOldPark(s: GameState): void {
  const park = s.tech.find((t) => t.id === RESEARCH_PARK_ID);
  if (!park || park.status === 'done') return;
  const fp = footprintOf(park);
  const spot = firstFreeSpot(s, park, fp);
  if (!spot) return;
  park.status = 'done';
  park.builtYear = 17;
  s.placements[park.id] = placementFor(spot.row, spot.col, fp);
}

// A school in crisis: satisfaction in the thirties, a body half again too
// big, and the year's accumulators saying so. Shared by the crisis scenario
// and test/archetypes.test.ts so both break the school the same way.
export function intoCrisis(s: GameState): void {
  s.students.satisfaction = 35;
  s.students.satisfactionYearSum = 35 * s.students.satisfactionYearWeeks;
  s.students.crowdingYearSum = 0.6 * s.students.crowdingYearWeeks;
  for (const key of ['freshman', 'sophomore', 'junior', 'senior'] as const) {
    s.students.classes[key] = Math.round(s.students.classes[key] * 1.5);
  }
  s.finance.cash = Math.min(s.finance.cash, 0) - 2_000_000;
  s.self.reputation = Math.max(5, s.self.reputation - 15);
}

// The split-school trap (the October review's trace 7, Plan 78D): the first
// school has moved into its hall, Founders Hall is full of other schools'
// programs, and nothing of the first school is on the global offer. Under
// the old offer rules its hall could grow only when the draw came round.
// Shared by the split-school scenario and test/split-school.test.ts.
export function intoSplitSchool(s: GameState): void {
  const claim = [...claimedHalls(s)].sort((a, b) => b.housed - a.housed)[0];
  if (!claim) return;
  // The school's strays move in, as the letters ask.
  for (const away of programsAwayFromHome(s).filter((p) => p.school === claim.school)) {
    const move = suggestedMove(s, away.programId);
    if (move) relocateProgram(s, { programId: away.programId, ...move });
  }
  // Founders Hall filled with other schools' programs.
  const founders = s.halls[FOUNDERS_HALL_ID];
  for (let i = 0; i < founders.length; i += 1) {
    if (founders[i].programId !== null) continue;
    const other = offerablePrograms(s).find((p) => p.school !== claim.school);
    if (other) founders[i] = { programId: other.id };
  }
  // And the offer holds none of the school's programs.
  s.programOffers = offerablePrograms(s).filter((p) => p.school !== claim.school).slice(0, PROGRAM_OFFER_COUNT).map((p) => p.id);
  unlockAvailable(s);
}

// Stops the week a modal of this type is on screen; what `--modal <type>`
// builds. Interrupt types: see docs/architecture/interrupts.md.
export function atModal(type: string): (s: GameState) => boolean {
  return (s) => s.pendingInterrupt?.type === type;
}

export const SCENARIOS: Scenario[] = [
  // --- The plain waypoints: a school at a stage, at a year boundary. ---
  {
    name: 'founding',
    what: 'week one: Founders Hall teaching three programs, three rooms free, three on offer — what a new player is looking at',
    player: 'Guided',
    year: 1,
    // Immediately: the loop checks this before its first week runs.
    stopWhen: () => true,
  },
  {
    name: 'year-3-first-hall',
    // The guided player fills Founders Hall's three rooms first and buys
    // its first hall in year two.
    what: 'the first purchased hall standing beside a full Founders Hall, the campus still small',
    player: 'Guided',
    year: 3,
  },
  {
    name: 'year-8-balanced',
    what: 'the intended line of play, mid-buildout',
    player: 'Guided',
    year: 8,
  },
  {
    name: 'year-8-discount',
    what: 'the same year at the Lean college: spending only while in the black',
    player: 'Lean',
    year: 8,
  },
  {
    name: 'year-15-completionist',
    what: 'everything affordable built — the review\'s "what is there left to do" state',
    player: 'Completionist',
    year: 15,
  },
  {
    name: 'year-25-rich',
    what: 'the catalog done, cash piling up, rank held',
    player: 'Completionist',
    year: 25,
  },
  {
    name: 'year-40-done',
    what: 'the end of the default horizon — the late game as it actually plays',
    player: 'Completionist',
    year: 40,
  },

  // --- The modals: a state that only exists for one week. ---
  {
    name: 'first-milestone',
    what: 'the first milestone celebration, unanswered',
    player: 'Guided',
    year: 10,
    stopWhen: atModal('milestone'),
  },
  {
    // The board's notice (Plan 85D): the week the college first stands
    // within reach of the milestone; the letter waits in the inbox.
    name: 'specialization-notice',
    what: 'the board\'s notice that the specialization\'s milestone is within reach',
    player: 'Guided',
    year: 45,
    stopWhen: (s) => s.specializationNotice !== undefined,
  },
  {
    // The specialization (Plan 85D): the choice at the close of the first
    // summer in the guide's top SPECIALIZATION_MILESTONE_RANK, left
    // standing (scenario.ts sets the player to wait on it).
    name: 'specialization',
    what: 'the choice of a specialization at the milestone, unanswered',
    player: 'Guided',
    year: 45,
    stopWhen: atModal('specialization'),
  },
  {
    // The faculty training program (Plan 85E): a college specialized in
    // academics with its institute standing, professors trained in earlier
    // years, and Year 38's picks not yet spent: the player trains until
    // then, and the run stops a few weeks into it.
    name: 'training',
    what: 'the faculty training program at work, the year\'s training picks still to spend',
    player: 'Guided',
    year: 45,
    trains: (s) => s.clock.year < 38,
    stopWhen: (s) => s.clock.year >= 38 && s.clock.week >= 6 && instituteStands(s),
  },
  {
    // The research park (Plan 85F): a college specialized in research with
    // the park standing and its Landmark Programs running, its term part
    // full: the run plays a fixed pick of research and stops a few weeks
    // into Year 40.
    name: 'research-park',
    what: 'the research park at work: specialized in research, the park standing, Landmark Programs running',
    player: 'Guided',
    year: 45,
    specialization: 'research',
    stopWhen: (s) => s.clock.year >= 40 && s.clock.week >= 6 && parkStands(s),
  },
  {
    // The choice (Plan 85D) at a college whose Research Park was built
    // before Plan 85F: each card says what the choice makes of the park.
    name: 'specialization-old-park',
    what: 'the choice of a specialization at a college that already has a Research Park',
    player: 'Guided',
    year: 45,
    stopWhen: atModal('specialization'),
    mutate: withOldPark,
  },
  {
    name: 'rankings-entry',
    what: 'the week the school enters the top 50',
    player: 'Guided',
    year: 20,
    stopWhen: atModal('rankings-entry'),
  },
  {
    // The summer's three beats (types.ts's SUMMER_BEATS). Plan 33 dropped the
    // Standing beat, so the U.S. News report is no longer in it.
    name: 'summer',
    what: 'the summer sequence — Review (the year and its promises), Admissions (the blind price and the pool), Students (the digest)',
    player: 'Guided',
    year: 12,
    // Not the first summer: the screen is interesting with a prior year to
    // read against.
    stopWhen: (s) => s.pendingInterrupt?.type === 'summer' && s.clock.year >= 6,
  },
  {
    // The final report: the fiftieth summer, stopped on its first beat. The
    // slowest scenario (about half a minute); the completionist because its
    // report has the most on it.
    name: 'final-report',
    what: 'the fiftieth summer — the final report as its first beat, the record about to be sealed',
    player: 'Completionist',
    year: 50,
    stopWhen: (s) => s.pendingInterrupt?.type === 'summer' && s.clock.year >= 50,
  },
  {
    name: 'championship',
    what: 'the week a national title is won',
    // The Natural player: the only one whose teams make the bracket
    // (systems/athletics/playoffs.ts's top eight). It wins its first title
    // in year 18. The Completionist fields twenty teams and misses the
    // bracket in every sport, every year.
    player: 'Natural',
    year: 25,
    stopWhen: atModal('championship'),
  },
  {
    name: 'athletic-director',
    what: 'the three AD candidates, nobody hired yet',
    player: 'Completionist',
    year: 30,
    stopWhen: atModal('athletic-director'),
  },
  {
    // Reached in year 12. At the October review it never came by year 30:
    // Plan 74B's backlog paydown moved the Completionist's run onto a lab.
    name: 'research-report',
    what: 'an initiative concluding — the run\'s most frequent interrupt',
    player: 'Completionist',
    year: 30,
    stopWhen: atModal('research-complete'),
  },
  {
    name: 'decision-event',
    what: 'an authored decision event, unanswered',
    player: 'Guided',
    year: 15,
    stopWhen: atModal('decision-event'),
  },
  {
    // The recovery scenario: the guided player's fifteenth year, broken (see
    // intoCrisis). test/archetypes.test.ts asks whether correct play gets it
    // out.
    name: 'crisis',
    what: 'year 15 in the hole — satisfaction in the thirties, a body it cannot serve, cash gone, standing falling',
    player: 'Guided',
    year: 15,
    mutate: intoCrisis,
  },
  {
    // The October review's trace 7 (Plan 78D): see intoSplitSchool.
    name: 'split-school',
    what: 'the first school in its hall, Founders Hall full of others, and nothing of the school on offer — the trap a claimed hall\'s own offers break',
    player: 'Guided',
    year: 6,
    stopWhen: (s) => s.events.opening.read.includes('a-school-grows'),
    mutate: intoSplitSchool,
  },
  {
    // Not a modal since Plan 29: a demand is raised into the inbox's "To
    // decide" and the clock runs on. Stops the week one is announced. The
    // Lean college, which builds for a need only once it is dire, is the
    // player whose satisfaction falls far enough (year 27); the Idle one
    // raises one in year 3, before there is anything to look at.
    name: 'demand',
    what: 'a student demand on the clock, in the inbox — the player that earns them',
    player: 'Lean',
    year: 30,
    stopWhen: (s) => s.events.activeDemand !== null,
  },
  {
    // Not a modal (Plan 78G): the charter waits in the inbox. Open it with
    // `npm run shot -- out.json charter.png --tab=inbox`.
    name: 'charter',
    what: 'the university charter waiting in the inbox, the week the first lab is at work',
    player: 'Guided',
    year: 20,
    stopWhen: (s) => (s.catalogue?.pending ?? []).some((p) => p.eventId === 'university-charter'),
  },
];

export function findScenario(name: string): Scenario | undefined {
  return SCENARIOS.find((sc) => sc.name === name);
}
