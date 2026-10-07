import type { GameState, Pillar, SpeedUpKind, SpeedUps } from '../state/types';

// ---------------------------------------------------------------------
// A late use for money (Plan 95X, the second review's B4-10): what money
// buys to fill a specialization's share sooner. Each specialization has its
// purchase, open once the college has chosen it (and, where the share reads
// a building, once the building stands); the downtown has two. Each speeds
// the share's fill, and none raises its ceiling: money buys time, not
// standing the college could not reach.
//
//   academics     a second training class at the Faculty Training
//                 Institute: the year's picks twice over (trainingData.ts),
//                 once a year
//   research      the Research Park's second wing: more Landmark Programs
//                 count at once toward the share (researchParkData.ts), once
//   student life  an autumn festival with a headline act, once a year, on
//                 top of the spring's (downtownData.ts's festivalPoints); and
//                 the downtown's next growth step, bought, until it has grown
//   athletics     the Athletic Performance Complex's second phase: a deep run
//                 made with it counts half again (athleticsComplexData.ts),
//                 once
//
// The prices are weeks of operating cost (moneyScale.ts), so a purchase
// weighs at $1B as it did at $100M; a proposal, for the owner's review. The
// rules are systems/prestige/speedUps.ts's. Imports nothing but types, so
// the mechanics' data files can read it without joining an import cycle.
// ---------------------------------------------------------------------

export const SPEED_UP_KINDS: readonly SpeedUpKind[] = ['class', 'wing', 'autumn', 'step', 'phase'];

// The specialization each is for.
export const SPEED_UP_PILLAR: Readonly<Record<SpeedUpKind, Pillar>> = {
  class: 'academics',
  wing: 'research',
  autumn: 'studentLife',
  step: 'studentLife',
  phase: 'athletics',
};

// What each costs, in weeks of operating cost: a quarter's for a training
// class or a step of the downtown, half a year's for a building's second
// part, two months' for the autumn festival.
export const SPEED_UP_WEEKS: Readonly<Record<SpeedUpKind, number>> = {
  class: 13,
  wing: 26,
  autumn: 8,
  step: 13,
  phase: 26,
};

// The park's second wing: this many more Landmark Programs count at once
// toward the share (researchParkData.ts's LANDMARKS_COUNTED, 3, becomes 5).
export const WING_LANDMARKS = 2;

// The autumn festival counts as a festival with a headline act does
// (downtownData.ts's FESTIVAL.concert): a point toward the share, and the
// town's goodwill.
export const AUTUMN_POINTS = 1;
export const AUTUMN_GOODWILL = 6;

// The downtown's growth step: a sixth of the way (downtownData.ts's
// DISTRICT_STEPS, the map's steps).
export const STEP_GROWTH = 1 / 6;

// A deep run made with the complex's second phase standing counts this much
// (athleticsComplexData.ts's COMPLEX_POINTS, times this).
export const PHASE_RUN_WEIGHT = 1.5;

export function emptyBought(): SpeedUps {
  return { classes: [], autumn: [] };
}

// A second training class bought this year.
export function classBought(s: GameState): boolean {
  return (s.bought?.classes ?? []).includes(s.clock.year);
}

export function wingStands(s: GameState): boolean {
  return s.bought?.wing !== undefined;
}

export function phaseStands(s: GameState): boolean {
  return s.bought?.phase !== undefined;
}

// An autumn festival bought this year.
export function autumnBought(s: GameState): boolean {
  return (s.bought?.autumn ?? []).includes(s.clock.year);
}

// ---------------------------------------------------------------------
// The words. Each purchase sits on its specialization's own panel: the
// training bar in the Faculty tab, the Research Park in the Research tab,
// the downtown in the Students tab, the complex in the Athletics tab.
// ---------------------------------------------------------------------

const pct = (x: number) => `${Math.round(x * 100)}%`;

export const SPEED_UP_WORDS = {
  name: {
    class: 'A second training class',
    wing: 'The park\'s second wing',
    autumn: 'An autumn festival',
    step: 'The downtown\'s next block',
    phase: 'The complex\'s second phase',
  } as Readonly<Record<SpeedUpKind, string>>,
  // What it does, a sentence; `n` is the kind's own figure (the class's
  // picks, the park's Landmark Programs counted now).
  what: (kind: SpeedUpKind, n: number): string => {
    switch (kind) {
      case 'class': return `This year the institute takes a second class: ${n} more training ${n === 1 ? 'pick' : 'picks'}, once a year.`;
      case 'wing': return `Room for more Landmark Programs: ${n + WING_LANDMARKS} at once count toward the share, not ${n}.`;
      case 'autumn': return `A second festival this year, with a headline act: it counts ${AUTUMN_POINTS} toward the share and warms the town by ${AUTUMN_GOODWILL}, once a year.`;
      case 'step': return `The college matches the town's investors, and the district grows a step at once, ${pct(STEP_GROWTH)} of the way.`;
      case 'phase': return `A deep run made with the second phase standing counts half again toward the share.`;
    }
  },
  ceiling: 'It fills the share sooner.',
  buy: (price: string) => `Buy, ${price}`,
  armed: (price: string) => `Confirm — ${price}`,
  done: {
    class: 'Bought this year.',
    wing: 'Built.',
    autumn: 'Bought this year.',
    step: 'The downtown has grown in full.',
    phase: 'Built.',
  } as Readonly<Record<SpeedUpKind, string>>,
  head: 'What money can speed',
  // The log.
  bought: (kind: SpeedUpKind, price: string): string => {
    switch (kind) {
      case 'class': return `The Faculty Training Institute takes a second class this year, for ${price}.`;
      case 'wing': return `The Research Park's second wing opens, for ${price}: more of its Landmark Programs count at once.`;
      case 'autumn': return `An autumn festival with a headline act filled the downtown, for ${price}.`;
      case 'step': return `The downtown grows another block, the college matching the town's investors for ${price}.`;
      case 'phase': return `The Athletic Performance Complex's second phase opens, for ${price}: its deep runs count half again.`;
    }
  },
};
