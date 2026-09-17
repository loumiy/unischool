// ---------------------------------------------------------------------
// THE SCENARIO INDEX: the dozen-odd states a playtest keeps returning to,
// each named so it can be asked for by name.
//
// A scenario is a RECIPE, never a file. Committing generated saves would
// mean a few hundred KiB per state, every one of them stale the next time
// the save shape changes — so what is written down here is the strategy,
// the year, and the moment to stop at, and `npm run scenario -- <name>`
// builds the save on demand by playing the real reducer forward (see
// tools/scenario.ts). The recipe survives a SAVE_VERSION bump; a file
// would not.
//
// Nothing in src/ imports this, and none of it ships.
// ---------------------------------------------------------------------

import type { GameState } from '../src/state/types';

export interface Scenario {
  name: string;
  // One line, printed by `--list`. What this state is FOR, not what it
  // contains — "the week a title is won" rather than "year 24".
  what: string;
  // A STRATEGIES name (see sim/balanceSim.ts). Matched case-insensitively
  // on a prefix, so 'Balanced' finds 'Balanced builder'.
  strategy: string;
  // How many years to play. The run stops at the START of the year after
  // this one, so `year: 8` is the state a school is in having just lived
  // through its eighth. With `stopWhen` it is a CUTOFF — the run halts at
  // whichever comes first — so a scenario that waits on a modal can never
  // turn into an unbounded search.
  year: number;
  // Where to stop inside a year, if not at its boundary. See play()'s own
  // stopWhen: it is checked at the top of a week, before the scripted
  // player answers anything, so a run stopped here hands back a state with
  // its modal still pending.
  stopWhen?: (s: GameState) => boolean;
}

// Stops the week a modal of this type is on screen. The one predicate
// nearly every scenario below wants, and the one `--modal <type>` builds.
// The interrupt types are the ones the systems raise (see
// docs/architecture/interrupts.md): admissions, annual-report, milestone,
// rankings-entry, research-complete, decision-event, demand, charter,
// championship, athletic-director.
export function atModal(type: string): (s: GameState) => boolean {
  return (s) => s.pendingInterrupt?.type === type;
}

export const SCENARIOS: Scenario[] = [
  // --- The plain waypoints: a school at a stage, at a year boundary. ---
  {
    name: 'founding',
    what: 'week one, nothing built — what a new player is looking at',
    strategy: 'Balanced builder',
    year: 1,
    // Immediately: the loop checks this before its first week runs.
    stopWhen: () => true,
  },
  {
    name: 'year-3-first-hall',
    what: 'the first school hall standing, the campus still small',
    strategy: 'Balanced builder',
    year: 3,
  },
  {
    name: 'year-8-balanced',
    what: 'the intended line of play, mid-buildout',
    strategy: 'Balanced builder',
    year: 8,
  },
  {
    name: 'year-8-discount',
    what: 'the same year at the volume archetype: beds first, priced low',
    strategy: 'Discount volume',
    year: 8,
  },
  {
    name: 'year-15-completionist',
    what: 'everything affordable built — the review\'s "what is there left to do" state',
    strategy: 'Completionist',
    year: 15,
  },
  {
    name: 'year-25-rich',
    what: 'the catalogue done, cash piling up, rank held',
    strategy: 'Completionist',
    year: 25,
  },
  {
    name: 'year-40-done',
    what: 'the end of the default horizon — the late game as it actually plays',
    strategy: 'Completionist',
    year: 40,
  },

  // --- The modals: a state that only exists for one week. ---
  {
    name: 'first-milestone',
    what: 'the first milestone celebration, unanswered',
    strategy: 'Balanced builder',
    year: 10,
    stopWhen: atModal('milestone'),
  },
  {
    name: 'rankings-entry',
    what: 'the week the school enters the top 50',
    strategy: 'Balanced builder',
    year: 20,
    stopWhen: atModal('rankings-entry'),
  },
  {
    name: 'annual-report',
    what: 'the U.S. News report, with a year of movement in it',
    strategy: 'Balanced builder',
    year: 15,
    stopWhen: atModal('annual-report'),
  },
  {
    name: 'admissions',
    what: 'the summer decision, blind price and admit slider waiting',
    strategy: 'Balanced builder',
    year: 12,
    // Any summer will do, but not the FIRST one: the interesting version of
    // this screen is the one with a prior year to be read against.
    stopWhen: (s) => s.pendingInterrupt?.type === 'admissions' && s.clock.year >= 6,
  },
  {
    name: 'championship',
    what: 'the week a national title is won',
    // THE ONLY STRATEGY THAT CAN REACH THIS, and the reason is the finding
    // Plan 09's PR A recorded: none of the other six ever hires a coach, and
    // teamQuality is what seeds a bracket (see systems/athletics/playoffs.ts),
    // so none of them has ever won a title in forty years. The earnest
    // completionist plays the coaching market, and wins its first around
    // year 24.
    strategy: 'Earnest completionist',
    year: 40,
    stopWhen: atModal('championship'),
  },
  {
    name: 'athletic-director',
    what: 'the three AD candidates, nobody hired yet',
    strategy: 'Completionist',
    year: 30,
    stopWhen: atModal('athletic-director'),
  },
  {
    name: 'research-report',
    what: 'an initiative concluding — the run\'s most frequent interrupt',
    strategy: 'Completionist',
    year: 30,
    stopWhen: atModal('research-complete'),
  },
  {
    name: 'decision-event',
    what: 'an authored decision event, unanswered',
    strategy: 'Balanced builder',
    year: 15,
    stopWhen: atModal('decision-event'),
  },
  {
    name: 'demand',
    what: 'a student demand on the clock — the strategy that earns them',
    // The overbuilder builds beds and nothing else, so it is the strategy
    // whose satisfaction actually falls far enough to be asked for
    // something (see STRATEGIES' own note on it failing demands).
    strategy: 'Overbuilder',
    year: 40,
    stopWhen: atModal('demand'),
  },
];

export function findScenario(name: string): Scenario | undefined {
  return SCENARIOS.find((sc) => sc.name === name);
}
