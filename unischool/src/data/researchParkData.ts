import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR, standsOnCampus } from '../state/types';

// ---------------------------------------------------------------------
// The research park (Plan 85F): the research specialization's mechanic.
// The Research Park (projectData.ts's PROJ-RESEARCH-PARK) is a capital
// project only a college specialized in research may build; it opens the
// Landmark Program to every lab (researchData.ts's depthOpen), and while it
// stands at a college specialized in research it lifts the labs' output
// (PARK_RESEARCH_BOOST) and its Landmark work fills the research pillar's
// specialization term (parkReading). The numbers, the reading and the words.
// The weekly record is kept by systems/research/researchSystem.ts.
// Imports nothing but the state's types module, so specializationData.ts
// (which prestige reads) and researchData.ts can read it without joining an
// import cycle.
// ---------------------------------------------------------------------

export const RESEARCH_PARK_ID = 'PROJ-RESEARCH-PARK';
export const RESEARCH_PARK_NAME = 'the Research Park';

// The research pillar's specialization term reads the park's Landmark work:
// the years Landmark Programs have run in the last LANDMARK_WINDOW_YEARS,
// one for each running at once, full at LANDMARK_YEARS_FOR_FULL. Two run
// without a break fill it in six years, three in four; no more than
// LANDMARKS_COUNTED at once count, so it fills no faster than that however
// many labs take one on. The window makes it a rate, not a stock: the park
// has to keep working (a little more than one running at a time holds it
// full), as the academics term's trained faculty retire and have to be
// replaced (trainingData.ts). Tuned (Plan 85F) so the harness's research
// specialist, whose Landmark Programs wait on the money for their funding
// (four weeks of operating cost each), fills it 10 to 12 years after the
// choice, the build of the park included, as academics fills.
// At 20 it filled in 13 to 15.
export const LANDMARK_WINDOW_YEARS = 10;
export const LANDMARK_YEARS_FOR_FULL = 12;
export const LANDMARKS_COUNTED = 3;

// The boost (the owner's decision, 2026-10-01): while the park stands at a
// college specialized in research, every lab's output is this much higher
// (researchData.ts's researchRateMultiplier): more papers, and the grants
// that ride on them. A park at a college specialized in anything else gives
// none.
export const PARK_RESEARCH_BOOST = 0.15;

export function parkStands(s: GameState): boolean {
  const t = s.tech.find((x) => x.id === RESEARCH_PARK_ID);
  return t !== undefined && standsOnCampus(t);
}

export function parkGoingUp(s: GameState): boolean {
  const t = s.tech.find((x) => x.id === RESEARCH_PARK_ID);
  return t !== undefined && t.status === 'developing' && t.renovatingFrom === undefined;
}

// The college the park works for: specialized in research, with the park
// standing. (s.specialization read directly: specialization.ts is a systems
// module.)
export function parkWorks(s: GameState): boolean {
  return s.specialization === 'research' && parkStands(s);
}

// The labs' output multiplier the park adds: 1 + the boost, or 1.
export function parkBoost(s: GameState): number {
  return parkWorks(s) ? 1 + PARK_RESEARCH_BOOST : 1;
}

// The Landmark Programs running now.
export function landmarksRunning(s: GameState): number {
  return Object.values(s.research.initiatives).filter((i) => i.depth === 'landmark').length;
}

// The weeks of Landmark work in the window: this year and the nine before.
export function landmarkWeeks(s: GameState): number {
  const from = s.clock.year - LANDMARK_WINDOW_YEARS + 1;
  return (s.research.landmarkWork ?? []).filter((w) => w.year >= from).reduce((sum, w) => sum + w.weeks, 0);
}

export function landmarkYears(s: GameState): number {
  return landmarkWeeks(s) / WEEKS_PER_YEAR;
}

// The week's Landmark work, recorded (researchSystem.ts's tickResearch):
// one week for each Landmark Program running, at most LANDMARKS_COUNTED,
// on this year's line; lines older than the window go.
export function recordLandmarkWork(s: GameState): void {
  const running = Math.min(LANDMARKS_COUNTED, landmarksRunning(s));
  const from = s.clock.year - LANDMARK_WINDOW_YEARS + 1;
  const work = (s.research.landmarkWork ?? []).filter((w) => w.year >= from);
  if (running > 0) {
    const line = work.find((w) => w.year === s.clock.year);
    if (line) line.weeks += running;
    else work.push({ year: s.clock.year, weeks: running });
  }
  s.research.landmarkWork = work;
}

// The term's reading (specializationData.ts's SPECIALIZATION_READINGS), 0
// to 1: nothing while no park stands.
export function parkReading(s: GameState): number {
  if (!parkStands(s)) return 0;
  return Math.min(1, landmarkYears(s) / LANDMARK_YEARS_FOR_FULL);
}

// ---------------------------------------------------------------------
// The words (Plan 47's glossary: an initiative is a "research project"; the
// Landmark Program is its deepest kind, by its own name).
// ---------------------------------------------------------------------

const pct = (x: number) => `${Math.round(x * 100)}%`;
const years = (x: number) => (Math.abs(x - Math.round(x)) < 0.05 ? `${Math.round(x)}` : x.toFixed(1));
const runningNow = (n: number) => (n === 0 ? 'none running now' : `${n} running now`);

export const PARK_WORDS = {
  // The research pillar's specialization term, as its row reads.
  termNoPark: (year: string, goingUp: boolean) => (goingUp
    ? `The college is specialized in research${year}, but the Research Park is still going up, so this stays empty. Once it stands, each Landmark Program its labs run fills the share: ${LANDMARK_YEARS_FOR_FULL} years of Landmark work in the last ${LANDMARK_WINDOW_YEARS} fill it.`
    : `The college is specialized in research${year}, but no Research Park stands, so this stays empty. Build one from the capital projects, then commission Landmark Programs in the labs: ${LANDMARK_YEARS_FOR_FULL} years of Landmark work in the last ${LANDMARK_WINDOW_YEARS} fill it.`),
  termReading: (year: string, done: number, running: number, full: boolean) =>
    `The college is specialized in research${year}: its Landmark Programs at the Research Park add up to ${years(done)} years of work in the last ${LANDMARK_WINDOW_YEARS} (a year for each program, each year it runs; ${runningNow(running)}). ${full ? `The share is full from ${LANDMARK_YEARS_FOR_FULL}.` : `It fills as that rises, full at ${LANDMARK_YEARS_FOR_FULL}; no more than ${LANDMARKS_COUNTED} running at once count.`}`,

  // The term's row while it is empty for want of the specialization, at a
  // college whose park already stands.
  asideElsewhere: 'Its Research Park stays, with its Landmark Programs, but fills none of this.',
  asideUnchosen: 'The Research Park on campus would fill it with its Landmark work, once the college specializes in research.',

  // The choice's card (specializationData.ts's SPECIALIZATION_CARDS).
  fills: `filling as Landmark Programs run at the park, full at ${LANDMARK_YEARS_FOR_FULL} years of Landmark work in the last ${LANDMARK_WINDOW_YEARS} (a year for each program, each year it runs)`,
  cardPark: `The Research Park, a capital project only this specialization may build, and with it the Landmark Program: four scholars across disciplines for five years.`,
  cardBoost: `While the park stands, every lab's output is ${pct(PARK_RESEARCH_BOOST)} higher: more papers, and the grants that ride on them.`,
  // On the cards, for a college whose park already stands (or is going up).
  cardParkStands: (goingUp: boolean) => `The college's Research Park ${goingUp ? 'is already going up' : 'already stands'}: chosen, its Landmark work fills this share${goingUp ? ' once it opens' : ' at once'}, and the boost applies.`,
  cardParkElsewhere: (goingUp: boolean) => `The Research Park ${goingUp ? 'going up ' : ''}on campus stays, and its Landmark Programs stay open, but with this choice it fills no share of research and adds nothing to the labs' output.`,

  // The Research tab, under the labs.
  head: 'The Research Park',
  works: (done: number, running: number, full: boolean) =>
    `Landmark work in the last ${LANDMARK_WINDOW_YEARS} years: ${years(done)} years of the ${LANDMARK_YEARS_FOR_FULL} that fill research's specialization share${full ? ', which is full' : ''} (a year for each program, each year it runs; ${runningNow(running)}, and no more than ${LANDMARKS_COUNTED} at once count). Every lab's output is ${pct(PARK_RESEARCH_BOOST)} higher while the park stands.`,
  idle: (chosen: string) => `The Research Park stands and its labs may take on Landmark Programs, but the college is specialized in ${chosen}: the park fills no share of research and adds nothing to the labs' output.`,
  idleUnchosen: `The Research Park stands and its labs may take on Landmark Programs. Only once the college specializes in research does its Landmark work fill research's specialization share, and the labs' output rise ${pct(PARK_RESEARCH_BOOST)}.`,
  gatedUnchosen: (milestone: number) => `The Research Park is the research specialization's own building, and the Landmark Program comes with it. The board offers the choice of a specialization at the first summer the college stands in the guide's top ${milestone}.`,
  gatedElsewhere: (chosen: string) => `The Research Park is the research specialization's own building, and the college is specialized in ${chosen}, so it cannot be built here, and Landmark Programs stay closed.`,
  landmarkClosed: 'Landmark Programs, four scholars across disciplines over five years, are commissioned once the Research Park stands, which only a college specialized in research may build.',

  // The next-step line, at a lab that has not finished a research project
  // while the park is still ahead (nextStep.ts's idleLab).
  unprovenLab: (lab: string, specialized: boolean) => (specialized
    ? `${lab} has not finished a research project — every lab that does brings the Research Park closer`
    : `${lab} has not finished a research project — the Research Park waits on every lab, and on a specialization in research`),
};
