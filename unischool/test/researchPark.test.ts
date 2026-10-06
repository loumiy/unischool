// ---------------------------------------------------------------------
// The research park as a specialization (Plan 85F, data/researchParkData.ts).
// What is worth pinning:
//
//   - the gate: the Research Park opens only to a college specialized in
//     research, and to it only once every lab has finished a research
//     project (Plan 53); the build menu lists it closed, with the reason, to
//     any other college that has earned it, and the words say so;
//   - it lifts no standing of its own;
//   - a park that already stands keeps its Landmark Programs whatever the
//     college chooses, and at a college specialized in anything else fills
//     no term and gives no boost, and the Research tab and the cards say so;
//   - the research pillar's specialization term reads the park's Landmark
//     work over the last ten years, one for each running at once and no
//     more than three, full at twenty; nothing without the park, and the
//     row says why;
//   - the boost to the labs' output applies only to a college specialized
//     in research with the park standing;
//   - the migration closes a park open but not begun at a college not
//     specialized in research, keeps one standing, and reads the Landmark
//     work back; a save round trip keeps the record, and a malformed one is
//     dropped;
//   - the harness's research specialist keeps Landmark Programs running.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState, Initiative } from '../src/state/types';
import { WEEKS_PER_YEAR } from '../src/state/types';
import { exportSave, readSave, SAVE_VERSION } from '../src/state/persistence';
import {
  LANDMARKS_COUNTED, LANDMARK_WINDOW_YEARS, LANDMARK_YEARS_FOR_FULL, PARK_RESEARCH_BOOST, RESEARCH_PARK_ID,
  landmarkYears, parkBoost, parkReading, recordLandmarkWork,
} from '../src/data/researchParkData';
import { depthOpen, initiativeOffers, researchRateMultiplier } from '../src/data/researchData';
import { PROJECTS, projectOpens } from '../src/data/projectData';
import { SPECIALIZATION_CARDS, choiceParkNote, opensLine } from '../src/data/specializationData';
import { OPENING_LETTERS } from '../src/data/eventData';
import { closedBySpecialization, projectLift, projectOpen } from '../src/systems/estate/projects';
import { unlockAvailable } from '../src/systems/techtree/techSystem';
import { pillarBreakdown } from '../src/systems/prestige/prestigeSystem';
import { tickResearch } from '../src/systems/research/researchSystem';
import { brokenRules } from '../sim/harness/invariants';
import { LANDMARKS_AT_ONCE, commissionLandmarks } from '../sim/harness/researchPark';
import { foundGame } from '../sim/harness/game';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('research park tests');

const FIXTURES = join(process.cwd(), 'test/fixtures');
// The launch fixture: a year-25 Guided run from before Plan 85F, the park
// built in Year 14, one Landmark Program running, no specialization.
function launch(): GameState {
  const read = readSave(readFileSync(join(FIXTURES, 'save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}
const park = (s: GameState) => s.tech.find((t) => t.id === RESEARCH_PARK_ID)!;
const term = (s: GameState) => pillarBreakdown(s, 'research').inputs.find((i) => i.key === 'specialization')!;
// A college with the park open but for the specialization: every lab
// finished, the year past 12, the park not begun.
function earned(specialization: GameState['specialization']): GameState {
  const s = launch();
  s.specialization = specialization;
  s.specializationYear = specialization === 'none' ? undefined : s.clock.year;
  park(s).status = 'locked';
  delete s.placements[RESEARCH_PARK_ID];
  return s;
}

// ---- The gate ----
{
  const def = PROJECTS.find((p) => p.id === RESEARCH_PARK_ID)!;
  assert(def.project.specialization === 'research' && def.project.everyLabFinished === true, 'the park is the research specialization\'s, and still waits on the labs');
  assert(Object.values(def.project.boosts).every((b) => !b), 'it lifts no standing of its own');
  for (const chosen of ['none', 'academics', 'studentLife', 'athletics'] as const) {
    const s = earned(chosen);
    unlockAvailable(s);
    assert(park(s).status === 'locked' && !projectOpen(s, park(s)), `closed to a college specialized in ${chosen}`);
    assert(closedBySpecialization(s, park(s)), `and listed closed in the build menu (${chosen})`);
  }
  const s = earned('research');
  unlockAvailable(s);
  assert(park(s).status === 'available', 'open to a college specialized in research');
  assert(!closedBySpecialization(s, park(s)), 'and not listed closed');
  s.research.finishedLabs = [];
  park(s).status = 'locked';
  unlockAvailable(s);
  assert(park(s).status === 'locked' && !closedBySpecialization(s, park(s)), 'not before every lab has finished a project, nor listed closed then');
  assert(/specialized in research and every lab on campus has finished a research project; no other college may build it/.test(projectOpens(def.project)), `its gate in words ("${projectOpens(def.project)}")`);
  assert(/keeps its Landmark Programs and adds nothing more/.test(def.description) && def.description.includes(`${Math.round(PARK_RESEARCH_BOOST * 100)}%`), 'the description says what it does, and what an old park keeps');
  // The letter asks to site it only while it can be: closed again, it asks nothing.
  const letter = OPENING_LETTERS.find((l) => l.id === 'the-research-park')!;
  assert(park(s).status === 'locked' && letter.done(s), 'the letter is done while the park is closed');
  park(s).status = 'available';
  assert(!letter.done(s), 'and asks while it is open');
}

// ---- A park that already stands ----
{
  const s = launch();
  assert(park(s).status === 'done' && s.specialization === 'none', 'the launch fixture has the park, and no specialization');
  assert(depthOpen(s, 'landmark'), 'it keeps the Landmark Program');
  assert(/would fill it with its Landmark work, once the college specializes in research/.test(term(s).detail), `unspecialized, the research row says what the park would do ("${term(s).detail}")`);
  const lab = s.tech.find((t) => t.facilityType === 'lab' && t.status === 'done' && !s.research.initiatives[t.id]);
  if (lab) assert(initiativeOffers(s, lab.id).some((o) => o.depth.key === 'landmark'), 'and the labs are offered one');
  for (const chosen of ['academics', 'studentLife', 'athletics'] as const) {
    const t = structuredClone(s);
    t.specialization = chosen;
    t.specializationYear = t.clock.year;
    assert(depthOpen(t, 'landmark'), `specialized in ${chosen}, the park keeps its Landmark Programs`);
    assert(term(t).score === 0 && /specialized in/.test(term(t).detail) && /Research Park stays, with its Landmark Programs, but fills none of this/.test(term(t).detail), `but fills no research term, and the row says so ("${term(t).detail}")`);
    assert(parkBoost(t) === 1, 'and gives no boost');
    assert(choiceParkNote(t, chosen)?.includes('fills no share of research') === true, 'the card it chose says so');
  }
  assert(projectLift(s, 'research') === 0 || s.tech.some((t) => t.id === 'HLTH-T3' && t.status === 'done'), 'the park adds no project lift');
  assert(/already stands/.test(choiceParkNote(s, 'research') ?? '') && /fills no share/.test(choiceParkNote(s, 'academics') ?? ''), 'each card says what the choice makes of a park that stands');
  const none = earned('none');
  assert(choiceParkNote(none, 'research') === null, 'and nothing without one');
}

// ---- The term reads the park ----
{
  const s = launch();
  s.specialization = 'research';
  s.specializationYear = s.clock.year;
  const y = s.clock.year;
  s.research.landmarkWork = [];
  assert(term(s).score === 0 && /Landmark Programs at the Research Park add up to 0 years of work in the last 10/.test(term(s).detail), `no Landmark work, an empty term ("${term(s).detail}")`);
  s.research.landmarkWork = [{ year: y - 1, weeks: 2 * WEEKS_PER_YEAR }, { year: y, weeks: 3 * WEEKS_PER_YEAR }];
  assert(Math.abs(landmarkYears(s) - 5) < 1e-9 && Math.abs(term(s).score - 5 / LANDMARK_YEARS_FOR_FULL) < 1e-9, `five years of Landmark work fill five ${LANDMARK_YEARS_FOR_FULL}ths (${term(s).score})`);
  s.research.landmarkWork = [{ year: y - LANDMARK_WINDOW_YEARS, weeks: 3 * WEEKS_PER_YEAR }, { year: y - LANDMARK_WINDOW_YEARS + 1, weeks: WEEKS_PER_YEAR }];
  assert(Math.abs(landmarkYears(s) - 1) < 1e-9, 'a year older than the window counts for nothing');
  s.research.landmarkWork = Array.from({ length: LANDMARK_WINDOW_YEARS }, (_, i) => ({ year: y - i, weeks: 2 * WEEKS_PER_YEAR })).reverse();
  assert(term(s).score === 1 && /The share is full/.test(term(s).detail), `two running without a break for ten years fill it ("${term(s).detail}")`);
  // Nothing without the park, and the row says why.
  park(s).status = 'locked';
  assert(parkReading(s) === 0 && term(s).score === 0 && /no Research Park stands/.test(term(s).detail), `without the park it is empty ("${term(s).detail}")`);
  park(s).status = 'developing';
  assert(term(s).score === 0 && /still going up/.test(term(s).detail), `going up, still empty ("${term(s).detail}")`);
  park(s).status = 'done';
  // The record: a week for each Landmark Program running, at most three.
  const run = (labId: string, depth: Initiative['depth']): Initiative => ({
    labId, topicId: labId, depth, participantIds: [], weeksTotal: 260, weeksRemaining: 100, publications: 0, breakthroughs: 0, grantIncome: 0, banked: 0,
  });
  // n Landmark Programs and a pilot study.
  const running = (n: number) => Object.fromEntries([
    ...Array.from({ length: n }, (_, i) => run(`LAB-${i}`, 'landmark')),
    run('LAB-P', 'pilot'),
  ].map((i) => [i.labId, i]));
  s.research.landmarkWork = [];
  s.research.initiatives = running(2);
  recordLandmarkWork(s);
  assert(s.research.landmarkWork.length === 1 && s.research.landmarkWork[0].weeks === 2, 'two running, two weeks of work in the week; a pilot study counts none');
  s.research.initiatives = running(5);
  recordLandmarkWork(s);
  assert(s.research.landmarkWork[0].weeks === 2 + LANDMARKS_COUNTED, `five running, no more than ${LANDMARKS_COUNTED} count`);
  s.research.landmarkWork.unshift({ year: y - LANDMARK_WINDOW_YEARS, weeks: 10 });
  recordLandmarkWork(s);
  assert(s.research.landmarkWork.every((w) => w.year > y - LANDMARK_WINDOW_YEARS), 'a year that leaves the window is dropped');
  // The research tick keeps it.
  const t = launch();
  t.research.landmarkWork = [];
  const landmarks = Object.values(t.research.initiatives).filter((i) => i.depth === 'landmark').length;
  tickResearch(t);
  assert(landmarks > 0 && t.research.landmarkWork[0]?.weeks === Math.min(landmarks, LANDMARKS_COUNTED), 'the research tick records the week');
  // The card.
  assert(/as Landmark Programs run at the park/.test(opensLine('research', 24)), `the card says how it fills ("${opensLine('research', 24)}")`);
  assert(SPECIALIZATION_CARDS.research.mechanics.length === 2 && SPECIALIZATION_CARDS.research.mechanics.every((m) => m.ready), 'the park and the boost are now, not still to come');
}

// ---- The boost ----
{
  const s = launch();
  const base = researchRateMultiplier(s);
  assert(parkBoost(s) === 1, 'no specialization, no boost');
  s.specialization = 'research';
  s.specializationYear = s.clock.year;
  assert(Math.abs(researchRateMultiplier(s) / base - (1 + PARK_RESEARCH_BOOST)) < 1e-9, `specialized in research with the park, output is ${Math.round(PARK_RESEARCH_BOOST * 100)}% higher`);
  park(s).status = 'locked';
  assert(Math.abs(researchRateMultiplier(s) - base) < 1e-9, 'without the park, none');
  park(s).status = 'done';
  s.specialization = 'academics';
  assert(Math.abs(researchRateMultiplier(s) - base) < 1e-9, 'specialized in academics with the park, none');
}

// ---- The migration, and a round trip ----
{
  const raw = readFileSync(join(FIXTURES, 'save-v90.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  assert(parsed.version === 90 && !('landmarkWork' in parsed.state.research), 'the version-90 fixture predates the record');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    assert(Array.isArray(read.state.research.landmarkWork) && read.state.research.landmarkWork.length === 0, 'with no Landmark work');
    assert(brokenRules(read.state).length === 0, `the rules hold (${brokenRules(read.state).join('; ')})`);
  }
  // A park open but not begun at a college not specialized in research is
  // closed again; at one specialized in research it stays open.
  for (const [chosen, status] of [['none', 'locked'], ['academics', 'locked'], ['research', 'available']] as const) {
    const old = structuredClone(parsed);
    old.state.specialization = chosen;
    if (chosen !== 'none') old.state.specializationYear = old.state.clock.year;
    old.state.tech.find((t) => t.id === RESEARCH_PARK_ID)!.status = 'available';
    const back = readSave(JSON.stringify(old));
    assert(!('refused' in back) && park(back.state).status === status, `an open park at a college specialized in ${chosen} is ${status}`);
  }
  // The launch fixture walks the whole chain: its park stands, and the
  // Landmark Program running is read back into the record.
  const s = launch();
  const running = Object.values(s.research.initiatives).find((i) => i.depth === 'landmark')!;
  const ran = running.weeksTotal - running.weeksRemaining;
  assert(park(s).status === 'done' && depthOpen(s, 'landmark'), 'the launch fixture keeps its park, and the Landmark Program');
  assert(s.research.landmarkWork.reduce((t, w) => t + w.weeks, 0) === Math.min(ran, LANDMARK_WINDOW_YEARS * WEEKS_PER_YEAR), `its running Landmark Program is read back (${ran} weeks)`);
  assert(brokenRules(s).length === 0, `the rules hold (${brokenRules(s).join('; ')})`);
  // A round trip keeps the record; a malformed one is dropped.
  s.research.landmarkWork = [{ year: s.clock.year - 1, weeks: 50 }, { year: s.clock.year, weeks: 3 }];
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back) && JSON.stringify(back.state.research.landmarkWork) === JSON.stringify(s.research.landmarkWork), 'a round trip keeps the record');
  const bad = JSON.parse(exportSave(s).text) as { state: GameState };
  (bad.state.research as unknown as { landmarkWork: unknown }).landmarkWork = [{ year: 'soon', weeks: 3 }, { year: s.clock.year, weeks: 9999 }, { year: s.clock.year - 1, weeks: 4 }];
  const cleaned = readSave(JSON.stringify(bad));
  assert(!('refused' in cleaned) && JSON.stringify(cleaned.state.research.landmarkWork) === JSON.stringify([{ year: s.clock.year - 1, weeks: 4 }]), 'malformed years are dropped on load');
  (bad.state.research as unknown as { landmarkWork: unknown }).landmarkWork = 'lots';
  const none = readSave(JSON.stringify(bad));
  assert(!('refused' in none) && none.state.research.landmarkWork.length === 0, 'and a malformed record starts again');
  assert(SAVE_VERSION >= 91, `at version 91 or later (${SAVE_VERSION})`);
}

// ---- The harness's research specialist ----
{
  const s = launch();
  s.specialization = 'research';
  s.specializationYear = s.clock.year;
  s.finance.cash = 1e9;
  // Free every lab, so each could take one.
  for (const id of Object.keys(s.research.initiatives)) delete s.research.initiatives[id];
  const g = foundGame({ from: s });
  const started = commissionLandmarks(g);
  const running = Object.values(g.s.research.initiatives).filter((i) => i.depth === 'landmark').length;
  assert(started > 0 && running === started && running <= LANDMARKS_AT_ONCE, `it commissions Landmark Programs, no more than ${LANDMARKS_AT_ONCE} (${running})`);
  assert(commissionLandmarks(g) === 0 || running < LANDMARKS_AT_ONCE, 'and no more once they run');
  const other = structuredClone(s);
  other.specialization = 'academics';
  assert(commissionLandmarks(foundGame({ from: other })) === 0, 'a college specialized in anything else commissions none');
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
