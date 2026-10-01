import type { QuirkEffects } from './quirkData';

// ---------------------------------------------------------------------
// The words of a professor's page (Plan 84E): the tile on the Faculty tab,
// expanded (tabs/FacultyPerson.tsx, read off tabs/facultyCareer.ts). Kept
// here, not in the component, so the voice is edited in one place and the
// string review (npm run review:strings) reads it as the Faculty tab's.
// ---------------------------------------------------------------------

// How long a professor serves to be recognized for it (Plan 84 §2).
export const LONG_SERVICE_YEARS = 25;

export const CAREER_WORDS = {
  // The sections, in the order the page reads.
  headings: {
    person: 'The person',
    courses: 'Courses taught',
    research: 'Research',
    recognition: 'Recognition',
    training: 'Training',
    growth: 'Teaching and research over the years',
  },

  joined: (college: string, year: number, term: string) => `Joined ${college} in Year ${year}, ${term.toLowerCase()}.`,
  // A founding professor's record from elsewhere (facultyData.ts's
  // FOUNDING_TENURE_WEEKS) comes with them.
  foundingNote: 'Came with a record from elsewhere, which counts toward their growth but not their years here.',
  yearsHere: (years: number) => (years < 1 ? 'In their first year here.' : `${years} ${years === 1 ? 'year' : 'years'} here.`),
  retires: (years: number) => (years <= 1 ? 'Retires within the year.' : `Retires in about ${years} years.`),

  // The person, each part explained.
  bioLabel: 'Background',
  bioNote: 'Their field and what they work on.',
  nationalityLabel: 'Nationality',
  nationalityNote: 'Where they come from. It changes nothing in their work.',
  quirkLabel: 'Quirk',
  noQuirk: 'None: nothing about them moves the numbers.',
  payLabel: 'Pay',
  payNote: (listed: string) => `(${listed} at a prestige-50 market)`,
  slotsLabel: 'Course slots',
  outputLabel: 'Scholarly output',
  output: (perWeek: string, paper: number) => `${perWeek} a week, of the ${paper} a paper takes`,
  noOutput: (field: string) => `none — no research facility in ${field}'s school`,

  // The courses.
  noCourses: 'Has not taught a course here yet.',
  courseSince: (from: number) => `Since Year ${from}`,
  year: (year: number) => `Year ${year}`,
  courseSpan: (from: number, to: number) => (from === to ? `Year ${from}` : `Years ${from}–${to}`),
  moreCourses: (n: number) => `and ${n} more ${n === 1 ? 'course' : 'courses'}`,

  // Research.
  noResearch: 'Has not been on a research project here yet.',
  onProject: (topic: string, weeks: string) => `On ${topic} now, ${weeks} left.`,
  projectLine: (depth: string, years: number, year: number) => `${depth}, ${years} ${years === 1 ? 'year' : 'years'}, ended Year ${year}`,
  outcome: (papers: number, breakthroughs: number) =>
    `${papers} ${papers === 1 ? 'paper' : 'papers'}, ${breakthroughs} ${breakthroughs === 1 ? 'breakthrough' : 'breakthroughs'}`,
  woundUp: 'wound up early',

  // Recognition (Plan 84 §2): prizes, a distinguished program, long service.
  prize: (name: string, year: number, topic: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}, Year ${year}, for "${topic}".`,
  distinguished: (program: string, year: number | undefined) =>
    `Taught in ${program}, a distinguished program${year !== undefined ? ` since Year ${year}` : ''}.`,
  longService: (years: number, year: number) => `${years} years of service, reached in Year ${year}.`,
  noRecognition: 'Nothing yet. Prizes, a distinguished program and 25 years of service are what count.',

  // Training at the Faculty Training Institute (Plan 85E).
  trained: (year: number, from: number, to: number, gradeFrom: string, gradeTo: string) =>
    `Trained at the Faculty Training Institute in Year ${year}: teaching from ${from} (${gradeFrom}) to ${to} (${gradeTo}), and their potential with it.`,
  trainingNow: (until: string) => `At the institute this term: one course fewer until ${until}.`,
  notTrained: 'Not trained at the institute yet. A training raises teaching a full grade, for good.',
  trainingPoints: (points: number) => `Training has added ${points} to their teaching in all.`,

  // The chart.
  chartLegend: { teaching: 'Teaching', research: 'Research' },
  chartTooShort: 'The chart begins once they have finished a year here.',
  chartNote: 'A mark at the end of each year, and today. The bands are the course grades: A from 78, B from 62.',

  // A candidate has no history here, and says so.
  candidate: (name: string, college: string) => `${name} has not worked at ${college}. There is no history here yet: the record starts the week they are appointed.`,

  // Doors and actions.
  toCurriculum: (field: string) => `${field} courses in the Curriculum →`,
  close: 'Close',
};

// A quirk's effects in words (data/quirkData.ts): what it does to the
// numbers, so a quirk is explained rather than only named.
export function quirkEffectWords(effects: QuirkEffects): string[] {
  const out: string[] = [];
  const points = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;
  if (effects.teaching) out.push(`teaching potential ${points(effects.teaching)}`);
  if (effects.research) out.push(`research potential ${points(effects.research)}`);
  if (effects.salary && effects.salary !== 1) {
    const pct = Math.round(Math.abs(effects.salary - 1) * 100);
    out.push(`paid ${pct}% ${effects.salary > 1 ? 'more' : 'less'}`);
  }
  if (effects.morale) out.push(effects.morale > 0 ? 'the students take to them' : 'the students find them hard going');
  return out;
}

export function quirkExplained(effects: QuirkEffects): string {
  const words = quirkEffectWords(effects);
  if (words.length === 0) return 'It changes nothing in the numbers.';
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  return `In the numbers: ${list}.`;
}
