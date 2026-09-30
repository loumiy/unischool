import type { GameState, Pillar } from '../state/types';

// ---------------------------------------------------------------------
// The words for specializations: the tags that show a rival's (Plan 85C);
// each pillar's specialization term and how it fills; and the choice (Plan
// 85D): the board's notice, each specialization's card and what it gives.
// The rules are in systems/prestige/prestigeSystem.ts
// (SPECIALIZATION_TERM_WEIGHTS, the milestone's constants),
// systems/prestige/milestone.ts (the notice and the choice) and
// systems/rivals/rivalsSystem.ts. The word is "specialization", never
// "archetype" (Plan 47's glossary).
// ---------------------------------------------------------------------

// A pillar as a sentence names it.
export const PILLAR_WORDS: Readonly<Record<Pillar, string>> = {
  academics: 'academics',
  research: 'research',
  studentLife: 'student life',
  athletics: 'athletics',
};

// A rival's specialization as the guide's tag prints it, short, with the
// full words on hover.
export const SPECIALIZATION_TAGS: Readonly<Record<Pillar, string>> = {
  academics: 'Aca',
  research: 'Res',
  studentLife: 'Life',
  athletics: 'Ath',
};

export function specializedIn(pillar: Pillar): string {
  return `Specialized in ${PILLAR_WORDS[pillar]}`;
}

// ---------------------------------------------------------------------
// The specialization term (Plan 85D, the owner's decision replacing Plan
// 85C's ceilings): each pillar holds a share only its own specialization
// fills (prestigeSystem.ts's SPECIALIZATION_TERM_WEIGHTS). Until Plans
// 85E-H give each its mechanic, the reading is time: a tenth of the term
// for each year since the choice, full after SPECIALIZATION_FILL_YEARS. A
// PR that builds a pillar's mechanic replaces that pillar's reading here
// (SPECIALIZATION_READINGS), for example with the share of the faculty
// trained or what the park has produced.
// ---------------------------------------------------------------------

export const SPECIALIZATION_FILL_YEARS = 10;

// The share of the term filled, 0 to 1, for the college specialized in it.
export type SpecializationReading = (s: GameState) => number;

function yearsSinceChoice(s: GameState): number {
  return s.specializationYear === undefined ? 0 : Math.max(0, Math.min(1, (s.clock.year - s.specializationYear) / SPECIALIZATION_FILL_YEARS));
}

export const SPECIALIZATION_READINGS: Readonly<Record<Pillar, SpecializationReading>> = {
  academics: yearsSinceChoice,
  research: yearsSinceChoice,
  studentLife: yearsSinceChoice,
  athletics: yearsSinceChoice,
};

// The term as its row reads: how full, and why.
export function specializationTerm(s: GameState, pillar: Pillar): { score: number; detail: string } {
  const chosen = s.specialization === 'none' ? null : s.specialization;
  if (chosen !== pillar) {
    return {
      score: 0,
      detail: chosen
        ? `The college is specialized in ${PILLAR_WORDS[chosen]}, so this stays empty.`
        : `Comes only with a specialization in ${PILLAR_WORDS[pillar]}.`,
    };
  }
  const score = SPECIALIZATION_READINGS[pillar](s);
  const years = Math.round(score * SPECIALIZATION_FILL_YEARS);
  return {
    score,
    detail: score >= 1
      ? `The college is specialized in ${PILLAR_WORDS[pillar]}${s.specializationYear !== undefined ? ` (Year ${s.specializationYear})` : ''}, and the term is full.`
      : `The college is specialized in ${PILLAR_WORDS[pillar]}${s.specializationYear !== undefined ? ` (Year ${s.specializationYear})` : ''}: it fills a tenth for each year since, ${years} of ${SPECIALIZATION_FILL_YEARS} so far.`,
  };
}

// A program's quality slows above the knee without the athletics
// specialization (studentLifeData.ts's teamQuality), on its card in the
// Athletics tab.
export function teamSlowed(knee: number, earned: number, quality: number, chosen: Pillar | null): string {
  return chosen
    ? `Its staff, funding and recruiting would make it ${earned}; above ${knee} each point comes harder, and the college is specialized in ${PILLAR_WORDS[chosen]}, so it plays at ${quality}.`
    : `Its staff, funding and recruiting would make it ${earned}; above ${knee} each point comes harder without a specialization in athletics, so it plays at ${quality}.`;
}

// The team quality in the Athletics tab's help (Plan 85C), as the college's
// specialization leaves it (Plan 85D).
export function teamLimitHelp(knee: number, chosen: Pillar | null): string {
  if (chosen === 'athletics') return 'The college is specialized in athletics: a program\'s quality comes as easily above ' + knee + ' as below it, and the established powers have no edge over it in the postseason.';
  return chosen
    ? `The college is specialized in ${PILLAR_WORDS[chosen]}, so above ${knee} each point of a program's quality comes harder and 100 is out of reach, and the established powers are stronger still in a semifinal and a final: a title is rare.`
    : `Without a specialization in athletics, each point of a program's quality comes harder above ${knee} and 100 is out of reach, and the established powers are stronger still in a semifinal and a final, so a title is rare.`;
}

// The specialized pillar's own line (Plan 85D): nothing is empty.
export function specializedLine(pillar: Pillar, max: number, year: number | undefined): string {
  return `The college is specialized in ${PILLAR_WORDS[pillar]}${year !== undefined ? ` (Year ${year})` : ''}: the pillar may rise to the full ${max}.`;
}

// The mark on the specialized pillar's row.
export const SPECIALIZED_TAG = 'Specialized';

// Where the college stands on the choice, in History › Prestige and the
// standings (Plan 85D).
export function specializationStatus(
  chosen: Pillar | null, year: number | undefined, offered: boolean, milestone: number, max: number,
): string {
  if (chosen) {
    return `The college is specialized in ${PILLAR_WORDS[chosen]}${year !== undefined ? `, chosen in Year ${year}` : ''}: ${PILLAR_WORDS[chosen]} may rise to the full ${max}, and the other three pillars' specialization terms stay empty.`;
  }
  if (offered) return 'The college has not chosen a specialization, so each pillar\'s specialization term is empty. The board\'s offer stands, and comes back at the close of every summer until one is chosen.';
  return `The college has no specialization, so each pillar's specialization term is empty. The board offers the choice at the first summer the college stands in the guide's top ${milestone}.`;
}

// A rival leading a pillar, on its standings card.
export function ledBy(name: string, specialization: Pillar): string {
  return `Led by ${name}, ${specializedIn(specialization).toLowerCase()}`;
}

// ---------------------------------------------------------------------
// The choice (Plan 85D). Each specialization's card: what it is called,
// what it gives now, and what arrives with it later. What works now: the
// pillar's specialization term opens and fills over the years (above; and,
// for athletics, the teams' slowdown and the big stage stand down,
// specialization.ts's athleticsLifted). `mechanics` are the plan's
// (docs/plans/85-specializations.md, PRs 85E-H): each is `ready` once its PR
// builds it, and until then the screen says it is still to come. Plans
// 85E-H add to these lists, flip `ready` and replace their reading.
// ---------------------------------------------------------------------

export interface SpecializationMechanic {
  text: string;
  ready: boolean;
}

export interface SpecializationCard {
  pillar: Pillar;
  // The specialization's name, as the card heads it.
  name: string;
  // One line on what it is for, as the card prints it.
  summary: string;
  // What the college is known for, in a sentence's middle: the Final
  // Report's identity for a specialized college (reportData.ts).
  known: string;
  // What the choice gives besides its term, now (athletics' teams).
  alsoNow?: string;
  mechanics: readonly SpecializationMechanic[];
}

export const SPECIALIZATION_CARDS: Readonly<Record<Pillar, SpecializationCard>> = {
  academics: {
    pillar: 'academics',
    name: 'The faculty training program',
    summary: 'A college known first for its teaching.',
    known: 'a college known first for its teaching',
    mechanics: [
      { text: 'A faculty training institute on the map, which only this specialization may build.', ready: false },
      { text: 'Each year, professors picked for training rise a full letter grade in teaching, and keep it.', ready: false },
    ],
  },
  research: {
    pillar: 'research',
    name: 'The research park',
    summary: 'A college known first for what its laboratories find.',
    known: 'a college known first for what its laboratories find',
    mechanics: [
      { text: 'The Research Park becomes this specialization\'s own building, and with it the Landmark Program.', ready: false },
      { text: 'A boost to research output.', ready: false },
    ],
  },
  studentLife: {
    pillar: 'studentLife',
    name: 'The downtown and the festival',
    summary: 'A college known first as the place to be a student.',
    known: 'a college known first as the place to be a student',
    mechanics: [
      { text: 'The town beside the campus grows into a downtown district that meets part of the students\' social, dining and housing needs.', ready: false },
      { text: 'An annual festival each spring, from a modest weekend to a headline gala.', ready: false },
      { text: 'Town-and-gown events from a lively downtown.', ready: false },
    ],
  },
  athletics: {
    pillar: 'athletics',
    name: 'The athletic performance complex',
    summary: 'A college known first for its teams.',
    known: 'a college known first for its teams',
    alsoNow: 'A program\'s quality no longer slows above 80, so a team may play to 100, and the established powers lose their edge in the postseason.',
    mechanics: [
      { text: 'An athletic performance complex on the map, which only this specialization may build.', ready: false },
      { text: 'More flagship programs than the subsidy allows, a recruiting boost and better odds deep in the postseason.', ready: false },
    ],
  },
};

// What opens, said on each card: it works from the moment of the choice.
export function opensLine(pillar: Pillar, weight: number): string {
  return `Opens ${SPECIALIZATION_CARDS[pillar].name.replace(/^The /, 'the ')}'s share of ${PILLAR_WORDS[pillar]}, worth ${weight} points, filling over ${SPECIALIZATION_FILL_YEARS} years.`;
}

export const CHOICE_WORDS = {
  title: 'A specialization',
  from: 'The board',
  intro: (rank: number, milestone: number) => `The college stands #${rank} in the guide, in the top ${milestone}. The board asks the administration to choose the one pillar the college means to be the very best at. The choice is made once and kept: each pillar holds a share only its own specialization fills, and the chosen pillar's opens; the other three stay empty.`,
  now: 'Now',
  coming: 'Still to come',
  comingNote: 'Arrives in a later update.',
  yours: (value: number, rank: number) => `The college stands at ${value.toFixed(0)}, #${rank} in the pillar.`,
  rivals: (count: number) => (count === 0 ? 'No rival is specialized in it.' : `${count} rival${count === 1 ? ' is' : 's are'} specialized in it`),
  strongest: (name: string, value: number) => `; the strongest, ${name}, stands at ${value.toFixed(0)}.`,
  choose: (name: string) => `Choose ${name.replace(/^The /, 'the ')}`,
  confirm: 'Confirm: this is for good',
  warning: (pillar: Pillar) => `The college will be specialized in ${PILLAR_WORDS[pillar]} for good. It cannot be changed or undone.`,
  later: 'Not this year',
  laterNote: 'The offer stands: it comes back at the close of every summer until a specialization is chosen.',
};

// The board's notice (Plan 85D), when the college first comes within reach
// of the milestone: a board letter in the inbox (boardData.ts), which never
// stops the clock.
export const SPECIALIZATION_NOTICE_ID = 'specialization-notice';

export function specializationNotice(milestone: number, weights: Readonly<Record<Pillar, number>>): { title: string; text: string } {
  const each = (['academics', 'research', 'studentLife', 'athletics'] as const)
    .map((p) => `${PILLAR_WORDS[p]}, ${SPECIALIZATION_CARDS[p].name.replace(/^The /, 'the ')}, which opens ${weights[p]} points of it`)
    .join('; ');
  return {
    title: `Within reach of the top ${milestone}`,
    text: `The college has come within reach of the guide's top ${milestone}. At the close of the first summer it stands there, the board will ask the administration to choose a specialization: the one pillar the college means to be the very best at, chosen once and kept. Each pillar holds a share that only its own specialization fills, so without one no pillar reaches the top. There are four: ${each}. Athletics also lets a team's quality rise past 80 as easily as below it, and takes away the established powers' edge in the postseason. Each will bring more of its own in time; the choice will say what arrives now and what is still to come. Whichever the college chooses, the other three pillars' shares stay empty.`,
  };
}
