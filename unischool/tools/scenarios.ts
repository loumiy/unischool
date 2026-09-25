// ---------------------------------------------------------------------
// The scenario index: the states a playtest keeps returning to, each named.
//
// A scenario is a recipe, never a file: `npm run scenario -- <name>` builds
// the save on demand by playing the real reducer forward (tools/scenario.ts),
// so it survives a SAVE_VERSION bump where a committed save would go stale.
// Nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { GameState } from '../src/state/types';

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
    name: 'rankings-entry',
    what: 'the week the school enters the top 50',
    player: 'Guided',
    year: 20,
    stopWhen: atModal('rankings-entry'),
  },
  {
    // The annual report is the summer's Standing beat, so this is the report
    // scenario too.
    name: 'summer',
    what: 'the summer sequence — review, standing (the U.S. News report), the blind price, the digest',
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
    // The Completionist fields every team it can, and teamQuality seeds a
    // bracket (systems/athletics/playoffs.ts); a title may take decades.
    player: 'Completionist',
    year: 40,
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
    name: 'demand',
    what: 'a student demand on the clock — the player that earns them',
    // The overbuilder builds only beds, so its satisfaction falls far enough
    // to raise demands.
    player: 'Completionist',
    year: 40,
    stopWhen: atModal('demand'),
  },
];

export function findScenario(name: string): Scenario | undefined {
  return SCENARIOS.find((sc) => sc.name === name);
}
