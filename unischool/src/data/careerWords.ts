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
  foundingNote: 'Came with a record from elsewhere.',
  yearsHere: (years: number) => (years < 1 ? 'In their first year here.' : `${years} ${years === 1 ? 'year' : 'years'} here.`),
  retires: (years: number) => (years <= 1 ? 'Retires within the year.' : `Retires in about ${years} years.`),

  // The person: each fact as itself, no explainer beside it (Plan 96D).
  bioLabel: 'Background',
  nationalityLabel: 'Nationality',
  quirkLabel: 'Quirk',
  noQuirk: 'None',
  payLabel: 'Pay',
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

  // Recognition (Plan 84 §2): prizes, a program taught in to its last
  // course, long service. On a person page "distinguished" is the
  // professor's rank alone, so the program's stage is said as what it
  // means, every course complete (Plan 95J, the second review's 2c D11).
  prize: (name: string, year: number, topic: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}, Year ${year}, for "${topic}".`,
  distinguished: (program: string, year: number | undefined) =>
    (year !== undefined ? `Taught in ${program}, a program complete since Year ${year}.` : `Taught in ${program}, a program with every course complete.`),
  longService: (years: number, year: number) => `${years} years of service, reached in Year ${year}.`,
  noRecognition: 'Nothing yet.',

  // Training at the Faculty Training Institute (Plan 85E).
  trained: (year: number, from: number, to: number, gradeFrom: string, gradeTo: string) =>
    `Trained at the Faculty Training Institute in Year ${year}: teaching from ${from} (${gradeFrom}) to ${to} (${gradeTo}), and their potential with it.`,
  trainingNow: (until: string) => `At the institute this term: one course fewer until ${until}.`,
  notTrained: 'Not trained at the institute yet.',
  trainingPoints: (points: number) => `Training has added ${points} to their teaching in all.`,

  // The chart.
  chartLegend: { teaching: 'Teaching', research: 'Research' },
  chartTooShort: 'The chart begins once they have finished a year here.',

  // A candidate has no history here, and says so.
  candidate: (name: string, college: string) => `${name} has not worked at ${college}.`,

  // Doors and actions.
  toCurriculum: (field: string) => `${field} courses in the Curriculum →`,
  close: 'Close',
};

// A quirk's effects as numbers (data/quirkData.ts), the numbers only
// (Plan 96D): "teaching potential +4, morale −2".
export function quirkEffectWords(effects: QuirkEffects): string[] {
  const out: string[] = [];
  const points = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;
  if (effects.teaching) out.push(`teaching potential ${points(effects.teaching)}`);
  if (effects.research) out.push(`research potential ${points(effects.research)}`);
  if (effects.salary && effects.salary !== 1) {
    const pct = Math.round(Math.abs(effects.salary - 1) * 100);
    out.push(`pay ${effects.salary > 1 ? '+' : '−'}${pct}%`);
  }
  if (effects.morale) out.push(`morale ${points(effects.morale)}`);
  return out;
}

export function quirkExplained(effects: QuirkEffects): string {
  const words = quirkEffectWords(effects);
  return words.join(', ');
}
