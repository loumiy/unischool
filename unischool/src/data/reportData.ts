import type { Pillar } from '../state/types';

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

// The six standings the report grades, as it names them: rivalsSystem.ts's
// seven less prestige, the blend of four of them, which the report reads
// once, as the guide's last word (Plan 95J, the second review's 2c D10).
export type ReportAxis = 'academics' | 'research' | 'experience' | 'athletics' | 'campus' | 'finance';

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

// The standing each specialization is a claim about (Plan 85D): the
// college's specialization names it first in the Final Report's title.
export const SPECIALIZATION_AXIS: Readonly<Record<Pillar, ReportAxis>> = {
  academics: 'academics',
  research: 'research',
  studentLife: 'experience',
  athletics: 'athletics',
};

// The standing each tag is, in effect, a claim about: the one its test in
// identity/tags.ts reads, so a tag never hides the weakness of a standing
// it does not measure (Plan 98F). A commuter school is a campus-life claim
// (its test reads beds), a country club a claim about its grounds (its test
// reads the price against what families expect, and the campus's beauty).
// Access's two claims moved with it (Plan 119): the country club to campus,
// the bargain to academics (its test reads the class's quality).
export const TAG_AXIS: Readonly<Record<string, ReportAxis>> = {
  'research-powerhouse': 'research',
  'teaching-college': 'academics',
  'party-school': 'experience',
  'jock-school': 'athletics',
  artsy: 'academics',
  commuter: 'experience',
  'country-club': 'campus',
  'pressure-cooker': 'academics',
  'the-bargain': 'academics',
  'old-money': 'finance',
};

export const AXIS_PHRASES: Readonly<Record<ReportAxis, string>> = {
  academics: 'a serious academic college',
  research: 'a research college',
  experience: 'a college with a campus life to envy',
  athletics: 'an athletic college',
  campus: 'a college with a campus worth walking',
  finance: 'a well-endowed college',
};

export const WEAKNESSES: Readonly<Record<ReportAxis, string>> = {
  academics: 'never earned its academic name',
  research: 'never wrote a paper anyone read',
  experience: 'never gave its students much of a campus life',
  athletics: 'never fielded a team anyone feared',
  // Campus is care, not size: decoration, quads, paths to doors and what
  // stands (Plan 119).
  campus: 'never made its campus a place to walk',
  finance: 'never built an endowment to match its size',
};

// A weakest standing scoring under this is named in the title.
export const WEAKNESS_BELOW = 45;

// When satisfaction leads the field (prestigeSystem.ts's
// satisfactionLeads, Plan 116C), the experience axis reads satisfaction at
// this share beside the campus-life standing (Plan 95U, the second
// review's B4-7).
export const SATISFACTION_LEAD_SHARE = 0.5;

// A pillar's place that earns its tag (Plan 95U): in the top this many in
// any year of the arc.
export const EARNED_PILLAR_TOP = 10;

export const REPORT_SHAPES = {
  strength: '{college}: {phrase}, with no glaring weakness',
  title: '{college}: {phrase}, though it {tail}',
} as const;

export const VERDICTS = {
  rich: 'Your college left its successors far richer than it began. The endowment grew from {from} to {to}.',
  steady: 'Your college kept its money. The endowment went from {from} to {to}.',
  poorer: 'Your college spent what it was given. The endowment went from {from} to {to}.',
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
  markHint: 'The grade covers all fifty years, not just the last one. It weighs where each standing stood across the fifty years, how far it came from the first decade to the last, where the guide ranked your college at the end, and how many promises you kept.',
  axes: 'Six of the seven standings, graded over fifty years',
  axesNote: 'Prestige is the seventh. It blends four of these six, so it counts only once, as the guide\'s last word above.',
  axisLine: 'Averaged {mean} over fifty years. First decade {first}, last decade {last}.',
  promises: 'The promises',
  promisesLine: '{kept} kept, {missed} missed, {declined} declined.',
  promisesNone: 'You made no public promises.',
  finances: 'The money',
  administration: 'The administration',
  administrationNone: 'Founders Hall held no offices. Your college ran without an administration of its own.',
  administrationLine: 'Founders Hall held {offices}.',
  chronicle: 'The eras',
  rank: 'The guide\'s last word: {rank} of {total}.',
  chart: 'The seven standings, year by year',
  draft: 'The Final Report is written in the fiftieth summer. Until then, this is a draft of the years so far.',
  notYet: 'The Final Report is written in the fiftieth summer. A draft appears from the tenth summer. Before that, it\'s too early to judge.',
  epilogue: 'The fifty years are over, but your college goes on. This summer you still set Year 51\'s tuition and admit its class. After that the clock keeps running, and every ten years the chronicle gets an addendum. Nothing new opens.',
  addendum: 'Addendum, Years {from}–{to}',
  // Play again (Plan 70J): what New game says before it acts.
  newCollege: 'Your college goes into the hall of fame and closes for good. There\'s no Epilogue and no addenda. You start again in Year 1, with a new name and a new campus.',
  newCollegeMidRun: 'This ends the college you\'re playing now. Only a college that reaches its fiftieth summer goes into the hall of fame, so this one won\'t.',
  newCollegeFresh: 'Name a new college and start again from Year 1.',
} as const;
