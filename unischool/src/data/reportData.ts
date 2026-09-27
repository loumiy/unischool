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
  'jock-school': 'an athletics school',
  artsy: 'an artists\' college',
  commuter: 'a commuter school',
  'country-club': 'a country club',
  'pressure-cooker': 'a pressure cooker',
  'the-bargain': 'a bargain college',
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
  experience: 'a college with a campus life to envy',
  athletics: 'an athletic college',
  access: 'a college that opened its doors',
  finance: 'a well-endowed college',
};

export const WEAKNESSES: Readonly<Record<ReportAxis, string>> = {
  academics: 'never earned its academic name',
  research: 'never wrote a paper anyone read',
  experience: 'never gave its students much of a campus life',
  athletics: 'never fielded a team anyone feared',
  access: 'never opened its doors very wide',
  finance: 'never built an endowment to match its size',
};

// A weakest standing scoring under this is named in the title.
export const WEAKNESS_BELOW = 45;

export const REPORT_SHAPES = {
  strength: '{college}: {phrase}, with no glaring weakness',
  title: '{college}: {phrase} that {tail}',
} as const;

export const VERDICTS = {
  rich: 'It left its successors far richer than it found itself: the endowment grew from {from} to {to}.',
  steady: 'It kept its money: the endowment went from {from} to {to}.',
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
  eyebrow: 'Year 50 · the fiftieth year closes',
  mark: 'Final grade',
  markHint: 'The whole arc, not the last snapshot: where each standing stood across fifty years, how far it came from the first decade to the last, where the guide put the college at the end, and how many promises it kept.',
  axes: 'The six standings, graded over the arc',
  axisLine: 'Averaged {mean} over fifty years; {first} in the first decade, {last} in the last.',
  promises: 'The promises',
  promisesLine: '{kept} kept, {missed} missed, {declined} declined.',
  promisesNone: 'The college made no promises in public.',
  finances: 'The money',
  chronicle: 'The eras',
  rank: 'The guide\'s last word: {rank} of {total}.',
  chart: 'The six standings, year by year',
  draft: 'The Final Report is written at the fiftieth summer. Until then, the arc so far.',
  notYet: 'The Final Report is written at the fiftieth summer, and drafted from the tenth: the first decade is too early to judge.',
  epilogue: 'The fifty years are over; the college is not. This summer goes on to set Year 51\'s tuition and admit its class; then the clock runs on, and every ten years the chronicle gets an addendum. Nothing new opens.',
  addendum: 'Addendum, Years {from}–{to}',
  // Play again (Plan 70J): what New game says before it acts.
  newCollege: 'The college hangs in the hall of fame and closes its books for good: no Epilogue, no addenda. A new name, a new campus, Year 1.',
  newCollegeMidRun: 'This ends the college now under way. Only a college that reached its fiftieth summer hangs here; this one will not.',
  newCollegeFresh: 'Name a new college and start again from Year 1.',
} as const;
