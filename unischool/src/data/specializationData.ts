import type { Pillar } from '../state/types';

// ---------------------------------------------------------------------
// The words for specializations (Plan 85C): the ceilings a pillar stops at
// without one, and the tags that show a rival's; and the choice (Plan 85D):
// the board's notice, each specialization's card and what it gives. A
// ceiling is said as a "limit" to the player (Plan 47's glossary: ceiling →
// limit). The rules are in systems/prestige/prestigeSystem.ts
// (UNSPECIALIZED_CEILINGS, pillarCeiling, the milestone's constants),
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

// A pillar at the head of a sentence.
const PILLAR_LABEL: Readonly<Record<Pillar, string>> = {
  academics: 'Academics',
  research: 'Research',
  studentLife: 'Student life',
  athletics: 'Athletics',
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

// The ceiling's line under a pillar's breakdown.
export const CEILING_LABEL = 'The limit without a specialization';
// The same, once the college has chosen another pillar (Plan 85D).
export const CEILING_LABEL_CHOSEN = 'Its limit';

// `chosen` is the college's specialization, if it has one (Plan 85D): then
// the limit is for good.
export function ceilingDetail(pillar: Pillar, ceiling: number, max: number, chosen: Pillar | null = null): string {
  return chosen
    ? `${PILLAR_LABEL[pillar]} stands no higher than ${ceiling.toFixed(0)} of ${max}, however much it earns.`
    : `Without a specialization in ${PILLAR_WORDS[pillar]}, the pillar stands no higher than ${ceiling.toFixed(0)} of ${max}, however much it earns.`;
}

// The mark on a pillar's row while its ceiling holds it.
export const CEILING_TAG = 'At its limit';

// When the ceiling is what holds the pillar: its breakdown, and its row in
// History › Prestige.
// Once the college has chosen another pillar (Plan 85D), the limit stays.
export function ceilingHeld(pillar: Pillar, ceiling: number, chosen: Pillar | null = null): string {
  return chosen
    ? `Held at its limit of ${ceiling.toFixed(0)}, where it stays: the college is specialized in ${PILLAR_WORDS[chosen]}.`
    : `Held at its limit of ${ceiling.toFixed(0)}. Only a specialization in ${PILLAR_WORDS[pillar]} would lift it.`;
}

// A program the unspecialized team ceiling holds (studentLifeData.ts's
// UNSPECIALIZED_TEAM_CEILING), on its card in the Athletics tab.
export function teamCeilingHeld(ceiling: number, chosen: Pillar | null = null): string {
  return chosen
    ? `Held at ${ceiling}: the college is specialized in ${PILLAR_WORDS[chosen]}, so no program plays above it, however it is staffed, funded and recruited.`
    : `Held at ${ceiling}: without a specialization in athletics, no program plays above it, however it is staffed, funded and recruited. A specialization would lift it.`;
}

// The team limit in the Athletics tab's help (Plan 85C), as the college's
// specialization leaves it (Plan 85D).
export function teamLimitHelp(ceiling: number, chosen: Pillar | null): string {
  if (chosen === 'athletics') return 'The college is specialized in athletics: every program may play to 100, and the established powers have no edge over it in the postseason.';
  return chosen
    ? `The college is specialized in ${PILLAR_WORDS[chosen]}, so no program plays above ${ceiling}, and the established powers are stronger still in a semifinal and a final: a title is rare.`
    : `Without a specialization in athletics, no program plays above ${ceiling}, and the established powers are stronger still in a semifinal and a final, so a title is rare.`;
}

// The specialized pillar's own line (Plan 85D): its limit is gone.
export function ceilingLifted(pillar: Pillar, max: number, year: number | undefined): string {
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
    return `The college is specialized in ${PILLAR_WORDS[chosen]}${year !== undefined ? `, chosen in Year ${year}` : ''}: ${PILLAR_WORDS[chosen]} may rise to the full ${max}, and the other three pillars stay at their limits.`;
  }
  if (offered) return 'The college has not chosen a specialization. The board\'s offer stands, and comes back at the close of every summer until one is chosen.';
  return `The college has no specialization. The board offers the choice at the first summer the college stands in the guide's top ${milestone}.`;
}

// A rival leading a pillar, on its standings card.
export function ledBy(name: string, specialization: Pillar): string {
  return `Led by ${name}, ${specializedIn(specialization).toLowerCase()}`;
}

// ---------------------------------------------------------------------
// The choice (Plan 85D). Each specialization's card: what it is called,
// what it gives now, and what arrives with it later. `lift` works now: the
// pillar's limit rises to the full maximum (and, for athletics, the team
// ceiling and the big stage stand down, specialization.ts's
// athleticsLifted). `mechanics` are the plan's (docs/plans/85-
// specializations.md, PRs 85E-H): each is `ready` once its PR builds it,
// and until then the screen says it is still to come. Plans 85E-H add to
// these lists and flip `ready`; nothing else needs to change.
// ---------------------------------------------------------------------

export interface SpecializationMechanic {
  text: string;
  ready: boolean;
}

export interface SpecializationCard {
  pillar: Pillar;
  // The specialization's name, as the card heads it.
  name: string;
  // One line on what it is for.
  summary: string;
  // What the lift gives besides the limit, now (athletics' teams).
  alsoNow?: string;
  mechanics: readonly SpecializationMechanic[];
}

export const SPECIALIZATION_CARDS: Readonly<Record<Pillar, SpecializationCard>> = {
  academics: {
    pillar: 'academics',
    name: 'The faculty training program',
    summary: 'A college known first for its teaching.',
    mechanics: [
      { text: 'A faculty training institute on the map, which only this specialization may build.', ready: false },
      { text: 'Each year, professors picked for training rise a full letter grade in teaching, and keep it.', ready: false },
    ],
  },
  research: {
    pillar: 'research',
    name: 'The research park',
    summary: 'A college known first for what its laboratories find.',
    mechanics: [
      { text: 'The Research Park becomes this specialization\'s own building, and with it the Landmark Program.', ready: false },
      { text: 'A boost to research output.', ready: false },
    ],
  },
  studentLife: {
    pillar: 'studentLife',
    name: 'The downtown and the festival',
    summary: 'A college known first as the place to be a student.',
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
    alsoNow: 'No program is held at the team limit: every team may play to 100, and the established powers lose their edge in the postseason.',
    mechanics: [
      { text: 'An athletic performance complex on the map, which only this specialization may build.', ready: false },
      { text: 'More flagship programs than the subsidy allows, a recruiting boost and better odds deep in the postseason.', ready: false },
    ],
  },
};

// The lift, said on each card: it works from the moment of the choice.
export function liftLine(pillar: Pillar, ceiling: number, max: number): string {
  return `The ${PILLAR_WORDS[pillar]} limit rises from ${ceiling.toFixed(0)} to ${max}.`;
}

export const CHOICE_WORDS = {
  title: 'A specialization',
  from: 'The board',
  intro: (rank: number, milestone: number) => `The college stands #${rank} in the guide, in the top ${milestone}. The board asks the administration to choose the one pillar the college means to be the very best at. The choice is made once and kept: that pillar's limit is lifted, and the other three stay at theirs.`,
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

export function specializationNotice(milestone: number, ceilings: Readonly<Record<Pillar, number>>, max: number): { title: string; text: string } {
  const each = (['academics', 'research', 'studentLife', 'athletics'] as const)
    .map((p) => `${PILLAR_WORDS[p]}, ${SPECIALIZATION_CARDS[p].name.replace(/^The /, 'the ')}, which lifts its limit from ${ceilings[p]} to ${max}`)
    .join('; ');
  return {
    title: `Within reach of the top ${milestone}`,
    text: `The college has come within reach of the guide's top ${milestone}. At the close of the first summer it stands there, the board will ask the administration to choose a specialization: the one pillar the college means to be the very best at, chosen once and kept. There are four: ${each}. Athletics also frees the teams from the team limit and takes away the established powers' edge in the postseason. Each will bring more of its own in time; the choice will say what arrives now and what is still to come. Whichever the college chooses, the other three pillars stay at their limits.`,
  };
}
