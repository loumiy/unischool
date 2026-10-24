import type { BoardAnswer, GameState, Pillar } from '../state/types';
import type { CatalogueEvent } from './eventCatalogueTypes';

// ---------------------------------------------------------------------
// The board's question (Plan 116D, the review's C4-4): from
// BOARD_QUESTION_FROM_YEAR, at BOARD_QUESTION_WEEK, the board puts one
// question a year. It is an inbox matter with BOARD_QUESTION_ANSWER_WEEKS to
// answer, so it never pauses on arrival (inbox/unseen.ts's
// SHORT_OF_TIME_WEEKS), only in its last week unopened. Each question
// trades one pillar for another, and none is answered by paying: late money
// decides nothing (C4-5). Unanswered, it takes the answer that changes
// nothing.
//
// The questions come in turn by year (BOARD_QUESTIONS); one the college
// cannot be asked (a gift that names a program, with none it could close)
// gives way to the next. Raised by catalogueEngine.ts's raiseBoardQuestion,
// never drawn: a fixed instance id and names read off the state, so it takes
// nothing from the run's stream, and no seat answers it.
//
// Each answer is sized to one to two points of prestige over five years,
// either way, on the harness (sim/harness/boardQuestion.ts). Imports nothing
// but types.
// ---------------------------------------------------------------------

export const BOARD_QUESTION_FROM_YEAR = 25;
export const BOARD_QUESTION_WEEK = 20;
export const BOARD_QUESTION_ANSWER_WEEKS = 6;

// The one instance a year ever has.
export const BOARD_QUESTION_INSTANCE = 'board-question';

// The expansion: this share more students, joining every class by its size
// (the catalog's enrollmentSpread, a share of a founding body of 2,000), and
// the students' satisfaction this many points lower at once. The crowding
// that follows costs more, as any crowding does.
export const EXPANSION_SHARE = 0.1;
export const EXPANSION_MOOD = -4;

// The conditional gift: the endowment it gives, for a founding college
// (scaled by the college's budget, catalogue.ts's priceScale), and the
// families it may come from, one a year in turn.
export const CHAIR_GIFT = 3_000_000;
export const DONOR_FAMILIES: readonly string[] = ['Whitcombe', 'Ashdown', 'Marchetti', 'Okafor', 'Lindqvist', 'Delacroix', 'Haverford'];

// The honors college: for this many summers from the next, the entering
// class is this share smaller (students.honorsSummers). The class is cut
// from its weakest admits, as a full campus cuts it (admissionsSystem.ts's
// projectAdmissions), so it is stronger.
export const HONORS_SUMMERS = 4;
export const HONORS_CUT = 0.15;

const countWords = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

// The trade (CatalogueChoice.standing): the pillar an answer favors stands
// this many points of prestige higher for BOARD_STANDING_YEARS, from the
// summer of the year it was given, and the pillar it costs as many lower. So
// the trade alone leaves prestige even, and moves the pillars against the
// field; what the answer does besides (students, a program, a gift, a
// class) moves it a little either way.
export const BOARD_TRADE_PRESTIGE = 1.5;
export const BOARD_STANDING_YEARS = 5;
export const BOARD_STANDING_LABEL = 'The board\'s question';

// The answers still counted this year.
export function activeBoardAnswers(s: GameState): BoardAnswer[] {
  return (s.boardAnswers ?? []).filter((a) => s.clock.year >= a.year && s.clock.year < a.year + BOARD_STANDING_YEARS);
}

// The pillar term's line: which answers it counts, and until when.
export function boardStandingDetail(answers: readonly { year: number; gains: boolean }[]): string {
  return answers.map((a) => `Your answer to the board in Year ${a.year} ${a.gains ? 'raises' : 'lowers'} this pillar through Year ${a.year + BOARD_STANDING_YEARS - 1}.`).join(' ');
}

const PILLAR_WORDS: Readonly<Record<Pillar, string>> = { academics: 'academics', research: 'research', studentLife: 'student life', athletics: 'athletics' };
function trade(gains: Pillar, loses: Pillar): Partial<Record<Pillar, number>> {
  return { [gains]: BOARD_TRADE_PRESTIGE, [loses]: -BOARD_TRADE_PRESTIGE };
}
function tradeWords(gains: Pillar, loses: Pillar): string {
  return `For ${countWords[BOARD_STANDING_YEARS]} years, the guide would rate your ${PILLAR_WORDS[gains]} higher and your ${PILLAR_WORDS[loses]} lower.`;
}

const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;

export const EXPANSION_EVENT: CatalogueEvent = {
  id: 'board-expansion',
  kind: 'inline',
  domain: 'board',
  from: 'The board',
  weight: 0,
  cooldownYears: 0,
  when: {},
  title: 'Should the college grow?',
  text: `The board has a question for you this year. The town wants the college to grow. It asks you to take in ${pct(EXPANSION_SHARE)} more students now, in every class. Their tuition comes in for as long as they stay. But the campus would be more crowded, and satisfaction would fall ${-EXPANSION_MOOD} points at once. ${tradeWords('academics', 'studentLife')} If you say no, nothing changes.`,
  timeoutWeeks: BOARD_QUESTION_ANSWER_WEEKS,
  choices: [
    { id: 'grow', label: `Take in ${pct(EXPANSION_SHARE)} more students`, effects: { enrollmentSpread: EXPANSION_SHARE * 2000, mood: EXPANSION_MOOD }, standing: trade('academics', 'studentLife') },
    { id: 'decline', label: 'Stay the size you are', effects: {} },
  ],
  default: 'decline',
};

// Names {donor}, {gift} and {program}: raiseBoardQuestion fills them.
export const GIFT_EVENT: CatalogueEvent = {
  id: 'board-gift',
  kind: 'inline',
  domain: 'board',
  from: 'The board',
  weight: 0,
  cooldownYears: 0,
  when: {},
  names: { program: 'closable' },
  title: 'A gift with a condition',
  text: `The board has a question for you this year. The {donor} family offers {gift} to endow a named chair. One of your professors would hold it. The family asks one thing in return. You would close {program}, a small program they think has run its course. Its courses would end for good. ${tradeWords('research', 'academics')} If you say no, nothing changes.`,
  timeoutWeeks: BOARD_QUESTION_ANSWER_WEEKS,
  choices: [
    { id: 'accept', label: 'Take the gift and close {program}', effects: { endowment: CHAIR_GIFT, closeProgram: 1 }, fund: { purpose: 'chair', name: 'The {donor} Chair' }, standing: trade('research', 'academics') },
    { id: 'decline', label: 'Decline the gift and keep {program}', effects: {} },
  ],
  default: 'decline',
};

export const HONORS_EVENT: CatalogueEvent = {
  id: 'board-honors',
  kind: 'inline',
  domain: 'board',
  from: 'The board',
  weight: 0,
  cooldownYears: 0,
  when: {},
  title: 'An honors college?',
  text: `The board has a question for you this year. It would like you to found an honors college. For the next ${countWords[HONORS_SUMMERS]} summers, you would admit a class ${pct(HONORS_CUT)} smaller. You would turn away your weakest admits, so each class would be stronger. A smaller college takes in less tuition, and fewer students try out for its teams. ${tradeWords('academics', 'athletics')} If you say no, nothing changes.`,
  timeoutWeeks: BOARD_QUESTION_ANSWER_WEEKS,
  choices: [
    { id: 'honors', label: 'Found the honors college', effects: { honors: HONORS_SUMMERS }, standing: trade('academics', 'athletics') },
    { id: 'decline', label: 'Keep admitting as you do', effects: {} },
  ],
  default: 'decline',
};

// In turn by year: Year 25 asks the first, Year 26 the second, and so on.
export const BOARD_QUESTIONS: readonly CatalogueEvent[] = [EXPANSION_EVENT, GIFT_EVENT, HONORS_EVENT];

export function isBoardQuestion(eventId: string): boolean {
  return BOARD_QUESTIONS.some((e) => e.id === eventId);
}

// The question a year asks first, before one it cannot name gives way.
export function boardQuestionIndex(year: number): number {
  return (((year - BOARD_QUESTION_FROM_YEAR) % BOARD_QUESTIONS.length) + BOARD_QUESTIONS.length) % BOARD_QUESTIONS.length;
}

// The family a year's gift comes from.
export function donorFamily(year: number): string {
  return DONOR_FAMILIES[((year % DONOR_FAMILIES.length) + DONOR_FAMILIES.length) % DONOR_FAMILIES.length];
}

// What an answer's own levers do, as its line in the inbox says it
// (components/EventChoices.tsx): the honors college's classes, and the trade.
export function honorsPhrase(summers: number): string {
  return `the next ${countWords[summers] ?? summers} classes ${pct(HONORS_CUT)} smaller and stronger`;
}
export function tradePhrase(standing: Partial<Record<Pillar, number>>): string {
  const pillars = Object.keys(standing) as Pillar[];
  const moves = [
    ...pillars.filter((p) => (standing[p] ?? 0) > 0).map((p) => `${PILLAR_WORDS[p]} up`),
    ...pillars.filter((p) => (standing[p] ?? 0) < 0).map((p) => `${PILLAR_WORDS[p]} down`),
  ];
  return `${moves.join(', ')} for ${countWords[BOARD_STANDING_YEARS]} years`;
}
