import type { GameState, Pillar } from '../state/types';
import { decimal, pct } from '../format';
import { FACULTY_PER_TRAINING_PICK, MIN_TRAINING_PICKS, TRAINED_SHARE_FOR_FULL, TRAINING_WORDS, instituteStands, trainedCount, trainingReading } from './trainingData';
import { LANDMARK_WINDOW_YEARS, LANDMARK_YEARS_FOR_FULL, PARK_RESEARCH_BOOST, PARK_WORDS, landmarkYears, landmarksRunning, parkGoingUp, parkReading, parkStands } from './researchParkData';
import { COMPLEX_POINTS_FOR_FULL, COMPLEX_WINDOW_YEARS, COMPLEX_WORDS, complexGoingUp, complexReading, complexStands } from './athleticsComplexData';
import { DOWNTOWN_WORDS, FESTIVAL_POINTS_FOR_FULL, FESTIVAL_WINDOW_YEARS, OFF_CAMPUS_SHARE, downtownReading, festivalPoints } from './downtownData';

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
// fills (prestigeSystem.ts's SPECIALIZATION_TERM_WEIGHTS). Plan 85D filled
// each with the years: a tenth of the term for each year since the choice.
// Plans 85E-H replaced each pillar's reading with its mechanic's here
// (SPECIALIZATION_READINGS), and say how it reads in the term's row
// (SPECIALIZATION_DETAILS). Academics reads the faculty training program
// (Plan 85E): the share of the faculty trained at the institute
// (trainingData.ts's trainingReading), and nothing while none stands.
// Research reads the research park (Plan 85F): the years of Landmark work it
// has hosted in the last ten (researchParkData.ts's parkReading), and
// nothing while none stands. Athletics reads the athletic performance
// complex (Plan 85G): the deep postseason runs its programs have made in the
// last ten years with the complex standing (athleticsComplexData.ts's
// complexReading), and nothing while none stands. Student life reads the
// downtown and the festival (Plan 85H): the festivals held in the last ten
// years, carried by the district's growth and the town's goodwill
// (downtownData.ts's downtownReading), and nothing without a festival.
// ---------------------------------------------------------------------

// The share of the term filled, 0 to 1, for the college specialized in it.
export type SpecializationReading = (s: GameState) => number;

export const SPECIALIZATION_READINGS: Readonly<Record<Pillar, SpecializationReading>> = {
  academics: trainingReading,
  research: parkReading,
  studentLife: downtownReading,
  athletics: complexReading,
};

// How a mechanic's reading says itself in the term's row, for the college
// specialized in it.
const chosenIn = (s: GameState) => (s.specializationYear !== undefined ? ` (Year ${s.specializationYear})` : '');
export const SPECIALIZATION_DETAILS: Readonly<Record<Pillar, (s: GameState, score: number) => string>> = {
  academics: (s, score) => (instituteStands(s)
    ? TRAINING_WORDS.termReading(chosenIn(s), trainedCount(s), s.faculty.length, score >= 1)
    : TRAINING_WORDS.termNoInstitute(chosenIn(s))),
  research: (s, score) => (parkStands(s)
    ? PARK_WORDS.termReading(chosenIn(s), landmarkYears(s), landmarksRunning(s), score >= 1)
    : PARK_WORDS.termNoPark(chosenIn(s), parkGoingUp(s))),
  athletics: (s, score) => (complexStands(s)
    ? COMPLEX_WORDS.termReading(chosenIn(s), s, score >= 1)
    : COMPLEX_WORDS.termNoComplex(chosenIn(s), complexGoingUp(s))),
  studentLife: (s, score) => (festivalPoints(s) > 0
    ? DOWNTOWN_WORDS.termReading(chosenIn(s), s, score >= 1)
    : DOWNTOWN_WORDS.termEmpty(chosenIn(s))),
};

// What the term's row adds while it is empty for want of the
// specialization, where the college has its mechanic's building already
// (Plan 85F: a Research Park built before the park became the research
// specialization's).
const SPECIALIZATION_ASIDES: Partial<Readonly<Record<Pillar, (s: GameState, chosen: Pillar | null) => string | null>>> = {
  research: (s, chosen) => (parkStands(s) ? (chosen ? PARK_WORDS.asideElsewhere : PARK_WORDS.asideUnchosen) : null),
};

// A copy of the state with one pillar's share read as full, for the choice's
// comparison line (Plan 95F, the second review's B2-3): what the college
// would be if that share were full today. The copy is only marked, never
// written, so nothing else in it differs from the state it was taken from;
// a fresh object, so the mark cannot reach the game's own state. Nothing in
// the simulation makes one.
const SHARE_FULL = new WeakMap<GameState, Pillar>();
export function withShareFull(s: GameState, pillar: Pillar): GameState {
  const copy = { ...s };
  SHARE_FULL.set(copy, pillar);
  return copy;
}

// The term as its row reads: how full, and why.
export function specializationTerm(s: GameState, pillar: Pillar): { score: number; detail: string } {
  if (SHARE_FULL.get(s) === pillar) return { score: 1, detail: `As if full, for the choice's comparison.` };
  const chosen = s.specialization === 'none' ? null : s.specialization;
  if (chosen !== pillar) {
    const aside = SPECIALIZATION_ASIDES[pillar]?.(s, chosen);
    return {
      score: 0,
      detail: (chosen
        ? `The college is specialized in ${PILLAR_WORDS[chosen]}, so this stays empty.`
        : `Comes only with a specialization in ${PILLAR_WORDS[pillar]}.`) + (aside ? ` ${aside}` : ''),
    };
  }
  const score = SPECIALIZATION_READINGS[pillar](s);
  return { score, detail: SPECIALIZATION_DETAILS[pillar](s, score) };
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
  if (chosen === 'athletics') return 'The college is specialized in athletics: a program\'s quality comes as easily above ' + knee + ' as below it, and the established powers keep only a quarter of their edge over it in the postseason.';
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
  chosen: Pillar | null, year: number | undefined, offered: boolean, offer: string, max: number,
): string {
  if (chosen) {
    return `The college is specialized in ${PILLAR_WORDS[chosen]}${year !== undefined ? `, chosen in Year ${year}` : ''}: ${PILLAR_WORDS[chosen]} may rise to the full ${max}, and the other three pillars' specialization shares stay empty.`;
  }
  if (offered) return 'The college has not chosen a specialization, so each pillar\'s specialization share is empty. The board\'s offer stands, and comes back at the close of every summer until one is chosen.';
  return `The college has no specialization, so each pillar's specialization share is empty. ${offer}`;
}

// The log's line on the summer the offer is made (Plan 95R): by the
// overall ranking, or, when only a pillar brought it, by that pillar.
export function specializationOfferLine(pillar: { pillar: Pillar; rank: number } | null, rank: number): string {
  const where = pillar ? `#${pillar.rank} in ${PILLAR_WORDS[pillar.pillar]} in the standings` : `#${rank} in the guide`;
  return `The college stands ${where}. At the summer's close the board will ask it to choose a specialization.`;
}

// A specialization's own building in the build menu, closed to a college
// not specialized in it (Plan 85F): its tile's line, and why.
export const CLOSED_BUILD_WORDS = {
  sub: (pillar: Pillar) => `specialized in ${PILLAR_WORDS[pillar]} only`,
  foot: 'closed',
  why: (name: string, pillar: Pillar, chosen: Pillar | null, offer: string) =>
    `Only a college specialized in ${PILLAR_WORDS[pillar]} may build ${name.replace(/^The /, 'the ')}. ${chosen
      ? `The college is specialized in ${PILLAR_WORDS[chosen]}, for good.`
      : offer}`,
};

// A rival leading a pillar, on its standings card.
export function ledBy(name: string, specialization: Pillar): string {
  return `Led by ${name}, ${specializedIn(specialization).toLowerCase()}`;
}

// ---------------------------------------------------------------------
// The choice (Plan 85D). Each specialization's card: what it is called,
// what it gives now, and what arrives with it later. What works now: the
// pillar's specialization term opens and fills over the years (above; and,
// for athletics, the teams' slowdown stands down and the big stage shrinks
// to a quarter,
// specialization.ts's athleticsLifted). `mechanics` are the plan's
// (docs/plans/85-specializations.md, PRs 85E-H): each is `ready` once its PR
// builds it, and until then the screen says it is still to come. Since Plan
// 85H every one is ready.
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
  // How its term fills, as its mechanic reads it (Plans 85E-H): the end of
  // the card's "Opens …" line, in its detail.
  fills: string;
  // The card's face, three lines (Plan 95F, the second review's B2-3): what
  // it is, in a clause; what it adds now; how its share fills, cut to its
  // measure. The rest is behind More.
  what: string;
  adds: string;
  fillsShort: string;
  mechanics: readonly SpecializationMechanic[];
}

export const SPECIALIZATION_CARDS: Readonly<Record<Pillar, SpecializationCard>> = {
  academics: {
    pillar: 'academics',
    name: 'The faculty training program',
    summary: 'A college known first for its teaching.',
    known: 'a college known first for its teaching',
    fills: TRAINING_WORDS.fills,
    what: 'The Faculty Training Institute, where picked professors train.',
    adds: `Each year it trains one professor for every ${FACULTY_PER_TRAINING_PICK} on the faculty, each a full grade better at teaching, for good.`,
    fillsShort: `The share fills as professors are trained, full once ${pct(TRAINED_SHARE_FOR_FULL)} of the faculty is.`,
    mechanics: [
      { text: 'The Faculty Training Institute on the map, a capital project only this specialization may build.', ready: true },
      { text: `Each year the institute takes professors picked for training, one for every ${FACULTY_PER_TRAINING_PICK} on the faculty and at least ${MIN_TRAINING_PICKS}. Each rises a full grade in teaching (the width of their grade on the course scale) and keeps it, and teaches one course fewer for a term.`, ready: true },
    ],
  },
  research: {
    pillar: 'research',
    name: 'The research park',
    summary: 'A college known first for what its laboratories find.',
    known: 'a college known first for what its laboratories find',
    fills: PARK_WORDS.fills,
    what: 'The Research Park, home of the Landmark Programs.',
    adds: `While the park stands, every lab's output is ${pct(PARK_RESEARCH_BOOST)} higher.`,
    fillsShort: `The share fills as Landmark Programs run, full at ${LANDMARK_YEARS_FOR_FULL} years of their work in ${LANDMARK_WINDOW_YEARS}.`,
    mechanics: [
      { text: PARK_WORDS.cardPark, ready: true },
      { text: PARK_WORDS.cardBoost, ready: true },
    ],
  },
  studentLife: {
    pillar: 'studentLife',
    name: 'The downtown and the festival',
    summary: 'A college known first as the place to be a student.',
    known: 'a college known first as the place to be a student',
    fills: DOWNTOWN_WORDS.fills,
    what: 'A downtown district beside the campus, and a festival each spring.',
    adds: `The downtown meets up to ${pct(OFF_CAMPUS_SHARE)} of the students' social, dining and housing needs as it grows.`,
    fillsShort: `The share fills with the festivals, full at ${FESTIVAL_POINTS_FOR_FULL} points of them in ${FESTIVAL_WINDOW_YEARS} years.`,
    mechanics: [
      { text: DOWNTOWN_WORDS.cardDistrict, ready: true },
      { text: DOWNTOWN_WORDS.cardFestival, ready: true },
      { text: DOWNTOWN_WORDS.cardTown, ready: true },
    ],
  },
  athletics: {
    pillar: 'athletics',
    name: 'The athletic performance complex',
    summary: 'A college known first for its teams.',
    known: 'a college known first for its teams',
    alsoNow: 'A program\'s quality no longer slows above 80, so a team may play to 100, and the established powers keep only a quarter of their edge in the postseason.',
    fills: COMPLEX_WORDS.fills,
    what: 'The Athletic Performance Complex, where the varsity programs train.',
    adds: 'A team may play to 100, and the established powers keep a quarter of their postseason edge.',
    fillsShort: `The share fills with deep postseason runs, full at ${COMPLEX_POINTS_FOR_FULL} points of them in ${COMPLEX_WINDOW_YEARS} years.`,
    mechanics: [
      { text: COMPLEX_WORDS.cardComplex, ready: true },
      { text: COMPLEX_WORDS.cardMechanics, ready: true },
    ],
  },
};

// A college whose Research Park already stands, or is going up (one built
// before Plan 85F made it the research specialization's), keeps it and its
// Landmark Programs whatever it chooses (Plan 85F). Each card says what the
// choice makes of it: the research card that it works at once; the others
// that it stays but fills nothing and lifts nothing. Null without a park.
export function choiceParkNote(s: GameState, pillar: Pillar): string | null {
  const goingUp = parkGoingUp(s);
  if (!parkStands(s) && !goingUp) return null;
  return pillar === 'research' ? PARK_WORDS.cardParkStands(goingUp) : PARK_WORDS.cardParkElsewhere(goingUp);
}

// A pillar's top (prestigeSystem.ts's PRESTIGE_MAX, not imported: that
// module imports this one).
const PILLAR_MAX = 150;

// What opens, in the card's detail: the share in the pillar's own points
// (Plan 95F: the card's face gives it in points of prestige).
export function opensLine(pillar: Pillar, weight: number): string {
  const card = SPECIALIZATION_CARDS[pillar];
  return `Opens ${card.name.replace(/^The /, 'the ')}'s share of ${PILLAR_WORDS[pillar]}, ${weight} of the pillar's ${PILLAR_MAX} points, ${card.fills}.`;
}

export const CHOICE_WORDS = {
  title: 'A specialization',
  from: 'The board',
  // Two sentences (Plan 95F); `rule` is prestigeWords.ts's pillarShareRule
  // (Plan 95E: the rule is said in one place).
  // Plan 95R: by the route that brought it, the overall ranking first; a
  // college that has slipped from both since the offer is asked again all
  // the same.
  intro: (rank: number, milestone: number, best: { pillar: Pillar; rank: number }, pillarRank: number, rule: string) => {
    const where = rank <= milestone ? `stands #${rank} in the guide, in the top ${milestone},`
      : best.rank <= pillarRank ? `stands #${best.rank} in ${PILLAR_WORDS[best.pillar]}, in the top ${pillarRank} of a pillar's standing,`
        : `has stood in the guide's top ${milestone} or a pillar's top ${pillarRank},`;
    return `The college ${where} and the board asks it to choose, once and for good, the one pillar it means to be the very best at. ${rule}`;
  },
  // The college's strongest pillar, and where the rivals have gone (Plan
  // 95F, the second review's B3-6): one line above the cards.
  strongest: (pillar: Pillar, rank: number, rivals: Readonly<Record<Pillar, number>>) => {
    const each = (['academics', 'research', 'studentLife', 'athletics'] as const)
      .map((p, i) => `${rivals[p]}${i === 0 ? ` specialize${rivals[p] === 1 ? 's' : ''}` : ''} in ${PILLAR_WORDS[p]}`);
    return `The college's strongest pillar is ${PILLAR_WORDS[pillar]} (#${rank}). Of the rivals, ${each.slice(0, -1).join(', ')} and ${each[each.length - 1]}.`;
  },
  // The share, in points of prestige (Plan 95F: "worth 34 points" was the
  // pillar's, and read largest where it is worth least).
  worth: (points: number) => `Up to ${decimal(points, 1)} points of prestige`,
  // The comparison: the college as it would be with the share full today.
  compare: (before: number, after: number, rankBefore: number, rankAfter: number) =>
    `Full today: prestige ${decimal(before, 1)} → ${decimal(after, 1)}, ${rankAfter === rankBefore ? `still #${rankBefore}` : `#${rankBefore} → #${rankAfter}`}.`,
  more: 'More',
  less: 'Less',
  moreLabel: (name: string, open: boolean) => `${open ? 'Show less about' : 'Show more about'} ${name.replace(/^The /, 'the ')}`,
  yours: (value: number, rank: number) => `The college stands at ${value.toFixed(0)}, #${rank} in the pillar.`,
  rivals: (count: number) => (count === 0 ? 'No rival is specialized in it.' : `${count} rival${count === 1 ? ' is' : 's are'} specialized in it`),
  strongestRival: (name: string, value: number) => `; the strongest, ${name}, stands at ${value.toFixed(0)}.`,
  choose: (name: string) => `Choose ${name.replace(/^The /, 'the ')}`,
  confirm: 'Confirm — the other three shares stay empty for good',
  warning: (pillar: Pillar) => `The college will be specialized in ${PILLAR_WORDS[pillar]} for good. It cannot be changed or undone.`,
  later: 'Not this year',
  laterNote: 'The offer stands: it comes back at the close of every summer until a specialization is chosen.',
};

// The board's notice (Plan 85D), when the college first comes within reach
// of the milestone: a board letter in the inbox (boardData.ts), which never
// stops the clock.
export const SPECIALIZATION_NOTICE_ID = 'specialization-notice';

// `rule` is prestigeWords.ts's pillarShareRule (Plan 95E), which gives each
// share in points of prestige; the list no longer repeats them in the
// pillar's points (Plan 95F). The notice names both routes (Plan 95R).
export function specializationNotice(milestone: number, pillarRank: number, rule: string): { title: string; text: string } {
  const each = (['academics', 'research', 'studentLife', 'athletics'] as const)
    .map((p) => `${PILLAR_WORDS[p]}, ${SPECIALIZATION_CARDS[p].name.replace(/^The /, 'the ')}`)
    .join('; ');
  return {
    title: 'Within reach of a specialization',
    text: `The college has come within reach of the guide's top ${milestone}, or of the top ${pillarRank} in one of the four pillars' standings. At the close of the first summer it stands in either, the board will ask the administration to choose a specialization: the one pillar the college means to be the very best at, chosen once and kept. ${rule} There are four: ${each}. Athletics also lets a team's quality rise past 80 as easily as below it, and shrinks the established powers' edge in the postseason to a quarter. Each brings a program of its own, which the choice describes. Whichever the college chooses, the other three pillars' shares stay empty.`,
  };
}
