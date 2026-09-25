// THE FINAL REPORT's words (Plan 33, from v2's report.json; V2 #54): the
// grade bands (on v2's 0–100 scale; this game's standings are read at two
// thirds of their 150), the phrases a title is built from, and the money's
// verdicts. state/finalReport.ts decides which apply.

export const REPORT_GRADES: ReadonlyArray<{ at: number; letter: string }> = [
  { at: 75, letter: 'A' },
  { at: 62, letter: 'B' },
  { at: 48, letter: 'C' },
  { at: 34, letter: 'D' },
  { at: 0, letter: 'F' },
];

export function reportGrade(score: number): string {
  return REPORT_GRADES.find((g) => score >= g.at)?.letter ?? 'F';
}

// The six standings as the report names them (rivalsSystem.ts's STANDINGS).
export type ReportAxis = 'academics' | 'research' | 'experience' | 'athletics' | 'access' | 'finance';

export const TAG_PHRASES: Readonly<Record<string, string>> = {
  'research-powerhouse': 'a research powerhouse',
  'teaching-college': 'a teaching college',
  'party-school': 'a party school',
  'jock-school': 'a jock school',
  artsy: 'an artists\' college',
  commuter: 'a commuter school',
  'country-club': 'a country club',
  'pressure-cooker': 'a pressure cooker',
  'the-bargain': 'the bargain of its region',
  'old-money': 'an old-money college',
};

// The standing each tag is, in effect, a claim about.
export const TAG_AXIS: Readonly<Record<string, ReportAxis>> = {
  'research-powerhouse': 'research',
  'teaching-college': 'academics',
  'party-school': 'experience',
  'jock-school': 'athletics',
  artsy: 'academics',
  commuter: 'access',
  'country-club': 'experience',
  'pressure-cooker': 'academics',
  'the-bargain': 'access',
  'old-money': 'finance',
};

export const AXIS_PHRASES: Readonly<Record<ReportAxis, string>> = {
  academics: 'a serious academic college',
  research: 'a research college',
  experience: 'a college its students loved',
  athletics: 'a sporting college',
  access: 'a college that opened its doors',
  finance: 'a well-endowed college',
};

export const WEAKNESSES: Readonly<Record<ReportAxis, string>> = {
  academics: 'never quite learned to teach',
  research: 'never wrote a paper anyone read',
  experience: 'never learned to make its students happy',
  athletics: 'never won a game that mattered',
  access: 'never opened its doors very wide',
  finance: 'never balanced its books',
};

// A weakest standing scoring under this is named in the title.
export const WEAKNESS_BELOW = 45;

export const REPORT_SHAPES = {
  strength: '{college}: {phrase}, and a very good one',
  title: '{college}: {phrase} that {tail}',
} as const;

export const VERDICTS = {
  rich: 'It left its successors far richer than it found itself: the endowment grew from {from} to {to}.',
  steady: 'It kept its money: the endowment went from {from} to {to}, and the books mostly balanced.',
  poorer: 'It spent what it was given: the endowment went from {from} to {to}.',
  distress: 'It spent {years} in distress{scars}.',
  scars: ', and had an interim CFO appointed {times}',
  debt: 'It ends owing {debt}.',
  clean: 'It ends owing nothing.',
} as const;

// The draft report shows from this year (Plan 35: a mark of F after one
// year read as a verdict on a college that had barely opened).
export const REPORT_DRAFT_FROM = 10;

export const REPORT_WORDS = {
  title: 'The Final Report',
  eyebrow: 'Year 50 · the run formally ends',
  mark: 'Final mark',
  markHint: 'The whole arc, not the last snapshot: where each standing stood across fifty years, how far it came from the first decade to the last, where the guide put the college at the end, and how many promises it kept.',
  axes: 'The six standings, graded over the arc',
  axisLine: 'Averaged {mean} over the run; {first} in the first decade, {last} in the last.',
  promises: 'The promises',
  promisesLine: '{kept} kept, {missed} missed, {declined} declined.',
  promisesNone: 'The college made no promises in public.',
  finances: 'The money',
  chronicle: 'The eras',
  rank: 'The guide\'s last word: {rank} of {total}.',
  chart: 'The six standings, year by year',
  draft: 'The Final Report is written at the fiftieth summer. Until then, the arc so far.',
  notYet: 'The Final Report is written at the fiftieth summer, and drafted from the tenth: a college is not graded on its first decade.',
  epilogue: 'The run is over; the college is not. This summer goes on to set Year 51\'s tuition and admit its class; then the clock runs on, and every ten years the chronicle gets an addendum. Nothing new unlocks.',
  addendum: 'Addendum, Years {from}–{to}',
} as const;
