import type { ComplexRun, GameState } from '../state/types';
import { standsOnCampus } from '../state/types';

// ---------------------------------------------------------------------
// The athletic performance complex (Plan 85G): the athletics
// specialization's mechanic. The Athletic Performance Complex
// (projectData.ts's PROJ-ATHLETICS-COMPLEX) is a capital project only a
// college specialized in athletics may build. While it stands at such a
// college it gives the department more flagships than the subsidy allows
// (studentLifeData.ts's departmentPot), recruits better (recruitingTarget)
// and plays stronger deep in the postseason (playoffs.ts's stageEdge), and
// the athletics pillar's specialization term reads what it produces: the
// department's deep postseason runs in the last ten years (complexReading).
// The numbers, the reading and the words. The record is written by
// systems/athletics/playoffs.ts. Imports nothing but the state's types
// module, so specializationData.ts (which prestige reads), studentLifeData.ts
// and playoffs.ts can read it without joining an import cycle.
// ---------------------------------------------------------------------

export const ATHLETICS_COMPLEX_ID = 'PROJ-ATHLETICS-COMPLEX';
export const ATHLETICS_COMPLEX_NAME = 'the Athletic Performance Complex';

// More flagships (the plan's "two more"): while the complex works, the
// department may name this many flagships above what its subsidy level
// allows (2, 4 or 6, studentLifeData.ts's ATHLETICS_BUDGET_TIERS). Each is
// funded in full from the department's fund and may recruit. A proposal,
// for the owner's review.
export const COMPLEX_FLAGSHIPS = 2;

// The recruiting boost (the owner's decision, 2026-10-01: halved from the
// first version's third, for fewer titles): while the complex works, every
// flagship's scholarships recruit this much more, so full scholarships
// build to +17.5 over the four classes, not +15
// (studentLifeData.ts's RECRUITING_FULL_LIFT). It builds a class a year, as
// recruiting does, and falls away a class a year if the complex goes.
export const COMPLEX_RECRUITING_BOOST = 1 / 6;

// Better odds deep in the postseason (the owner's decision, 2026-10-01:
// about halved from the first version's 5 and 8, for fewer titles): while
// the complex works, the college plays this many points stronger in
// its own semifinals and finals (playoffs.ts's stageEdge; at 25 points of
// difference the stronger side wins about three times in four). The
// athletics specialization alone shrinks the established powers' edge to a
// quarter (playoffs.ts's SPECIALIZED_STAGE_SHARE); the complex's edge comes
// off what is left.
export const COMPLEX_HOME_EDGE: Readonly<Record<'quarterfinal' | 'semifinal' | 'final', number>> = { quarterfinal: 0, semifinal: 3, final: 4 };

// The athletics pillar's specialization term reads the complex's deep
// runs: each postseason the department reached the last four while the
// complex worked, in the last COMPLEX_WINDOW_YEARS, a title worth 1, a lost
// final a half and a lost semifinal a quarter, full at
// COMPLEX_POINTS_FOR_FULL. The window makes it a rate, not a stock: the
// complex has to keep producing, as the research park's Landmark work
// must. Nothing while no complex stands. Tuned (Plan 85G) so the harness's
// athletics specialist fills it 10 to 12 years after the choice, the
// complex's build included, as academics and research fill. It was 40 until
// the owner kept a quarter of the big stage against the specialized college
// (playoffs.ts's SPECIALIZED_STAGE_SHARE), which brought the deep runs down.
export const COMPLEX_WINDOW_YEARS = 10;
export const COMPLEX_POINTS: Readonly<Record<ComplexRun['finish'], number>> = { champion: 1, final: 0.5, semifinal: 0.25 };
export const COMPLEX_POINTS_FOR_FULL = 30;

export function complexStands(s: GameState): boolean {
  const t = s.tech.find((x) => x.id === ATHLETICS_COMPLEX_ID);
  return t !== undefined && standsOnCampus(t);
}

export function complexGoingUp(s: GameState): boolean {
  const t = s.tech.find((x) => x.id === ATHLETICS_COMPLEX_ID);
  return t !== undefined && t.status === 'developing' && t.renovatingFrom === undefined;
}

// The college the complex works for: specialized in athletics, with the
// complex standing. (s.specialization read directly: specialization.ts is a
// systems module.)
export function complexWorks(s: GameState): boolean {
  return s.specialization === 'athletics' && complexStands(s);
}

// The flagships the complex adds above the subsidy's: COMPLEX_FLAGSHIPS, or 0.
export function complexFlagships(s: GameState): number {
  return complexWorks(s) ? COMPLEX_FLAGSHIPS : 0;
}

// The recruiting multiplier the complex adds: 1 + the boost, or 1.
export function complexRecruiting(s: GameState): number {
  return complexWorks(s) ? 1 + COMPLEX_RECRUITING_BOOST : 1;
}

// The points the college plays stronger in a round of its own postseason.
export function complexEdge(s: GameState, round: keyof typeof COMPLEX_HOME_EDGE): number {
  return complexWorks(s) ? COMPLEX_HOME_EDGE[round] : 0;
}

// A finish that counts: the last four.
export function isDeepRun(finish: string): finish is ComplexRun['finish'] {
  return finish === 'champion' || finish === 'final' || finish === 'semifinal';
}

// The runs in the window: this year and the nine before.
export function complexRuns(s: GameState): ComplexRun[] {
  const from = s.clock.year - COMPLEX_WINDOW_YEARS + 1;
  return (s.orgs.complexRuns ?? []).filter((r) => r.year >= from);
}

export function complexPoints(s: GameState): number {
  return complexRuns(s).reduce((sum, r) => sum + COMPLEX_POINTS[r.finish], 0);
}

// A sport's postseason, recorded (playoffs.ts's runPlayoffs): a deep run
// while the complex works goes on the record; runs older than the window go.
export function recordComplexRun(s: GameState, sport: string, finish: string): void {
  const from = s.clock.year - COMPLEX_WINDOW_YEARS + 1;
  const runs = (s.orgs.complexRuns ?? []).filter((r) => r.year >= from);
  if (complexWorks(s) && isDeepRun(finish)) runs.push({ year: s.clock.year, sport, finish });
  s.orgs.complexRuns = runs;
}

// The term's reading (specializationData.ts's SPECIALIZATION_READINGS), 0
// to 1: nothing while no complex stands.
export function complexReading(s: GameState): number {
  if (!complexStands(s)) return 0;
  return Math.min(1, complexPoints(s) / COMPLEX_POINTS_FOR_FULL);
}

// ---------------------------------------------------------------------
// The words (Plan 47's glossary: a *deep run* is a postseason that reaches
// the last four; a program at the top of the department's order is a
// *flagship*; the subsidy is a *subsidy level*; the pot is *the
// department's fund*).
// ---------------------------------------------------------------------

const pct = (x: number) => `${Math.round(x * 100)}%`;
const points = (x: number) => (Math.abs(x - Math.round(x)) < 0.01 ? `${Math.round(x)}` : x.toFixed(2).replace(/0$/, ''));
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const recruitedFull = (full: number) => Number((full * (1 + COMPLEX_RECRUITING_BOOST)).toFixed(1));
const SCORING = 'a title counts 1, a lost final a half and a lost semifinal a quarter';

export function runsSummary(s: GameState): string {
  const runs = complexRuns(s);
  const titles = runs.filter((r) => r.finish === 'champion').length;
  const finals = runs.filter((r) => r.finish === 'final').length;
  const semis = runs.filter((r) => r.finish === 'semifinal').length;
  return `${count(titles, 'title', 'titles')}, ${count(finals, 'lost final', 'lost finals')} and ${count(semis, 'lost semifinal', 'lost semifinals')}`;
}

export const COMPLEX_WORDS = {
  // The athletics pillar's specialization term, as its row reads.
  termNoComplex: (year: string, goingUp: boolean) => (goingUp
    ? `The college is specialized in athletics${year}, but the Athletic Performance Complex is still going up, so this stays empty. Once it stands, each deep run its programs make fills the share (${SCORING}): ${COMPLEX_POINTS_FOR_FULL} points in the last ${COMPLEX_WINDOW_YEARS} years fill it.`
    : `The college is specialized in athletics${year}, but no Athletic Performance Complex stands, so this stays empty. Build one from the capital projects; then each deep run its programs make fills the share (${SCORING}): ${COMPLEX_POINTS_FOR_FULL} points in the last ${COMPLEX_WINDOW_YEARS} years fill it.`),
  termReading: (year: string, s: GameState, full: boolean) =>
    `The college is specialized in athletics${year}: training at the Athletic Performance Complex, its programs have made ${runsSummary(s)} in the last ${COMPLEX_WINDOW_YEARS} years, ${points(complexPoints(s))} points (${SCORING}). ${full ? `The share is full from ${COMPLEX_POINTS_FOR_FULL}.` : `It fills as that rises, full at ${COMPLEX_POINTS_FOR_FULL}.`}`,

  // The choice's card (specializationData.ts's SPECIALIZATION_CARDS).
  fills: `filling as its programs make deep runs once the Athletic Performance Complex stands, full at ${COMPLEX_POINTS_FOR_FULL} points in the last ${COMPLEX_WINDOW_YEARS} years (${SCORING})`,
  cardComplex: 'The Athletic Performance Complex on the map, a capital project only this specialization may build.',
  cardMechanics: `While it stands: ${COMPLEX_FLAGSHIPS} more flagship programs than the subsidy level allows, scholarships that recruit ${pct(COMPLEX_RECRUITING_BOOST)} more, and the established powers' edge over the college cut by a further ${COMPLEX_HOME_EDGE.semifinal} points in a semifinal and ${COMPLEX_HOME_EDGE.final} in a final.`,

  // The Athletics tab, under the department.
  head: 'The Athletic Performance Complex',
  works: (s: GameState, full: boolean, flagships: number, cap: number, base: number, recruitFull: number) =>
    `The complex stands. The department may name ${cap} flagships, ${COMPLEX_FLAGSHIPS} more than the subsidy level's ${base}, and names ${flagships}. Full scholarships recruit to +${recruitedFull(recruitFull)}, not +${recruitFull}, and the established powers' edge over the college is cut by a further ${COMPLEX_HOME_EDGE.semifinal} points in a semifinal and ${COMPLEX_HOME_EDGE.final} in a final. Deep runs in the last ${COMPLEX_WINDOW_YEARS} years: ${runsSummary(s)}, ${points(complexPoints(s))} of the ${COMPLEX_POINTS_FOR_FULL} points that fill athletics' specialization share${full ? ', which is full' : ''}.`,
  goingUp: 'The Athletic Performance Complex is going up. Once it stands, the department may name more flagships, its scholarships recruit better and the established powers\' edge in a semifinal and a final shrinks further; and each deep run fills athletics\' specialization share.',
  build: `The college is specialized in athletics, and may build the Athletic Performance Complex from the capital projects in the build menu: ${COMPLEX_FLAGSHIPS} more flagships, scholarships that recruit ${pct(COMPLEX_RECRUITING_BOOST)} more and a stronger college in its semifinals and finals; and its deep runs fill athletics' specialization share.`,
  gatedUnchosen: (milestone: number) => `The Athletic Performance Complex is the athletics specialization's own building: ${COMPLEX_FLAGSHIPS} more flagships, better recruiting and a stronger college deep in the postseason. The board offers the choice of a specialization at the first summer the college stands in the guide's top ${milestone}.`,
  gatedElsewhere: (chosen: string) => `The Athletic Performance Complex is the athletics specialization's own building, and the college is specialized in ${chosen}, so it cannot be built here.`,
  // The flagships figure's hint, with the complex's slots.
  flagshipsHint: (cap: number, base: number, tier: string): `${string}.` => `How many programs are flagships, of the ${cap} the department may name: ${base} for the ${tier} subsidy level and ${COMPLEX_FLAGSHIPS} more for the Athletic Performance Complex. The first on the list. Only a flagship is funded in full and recruits.`,
};
