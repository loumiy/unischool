// ---------------------------------------------------------------------
// When does each scripted strategy (balanceSim.ts's STRATEGIES) hit a set of
// "firsts" and "campus is done" milestones, in game-years and in real
// playtime at useGame.ts's SPEEDS? `play()`'s rows are yearly, too coarse to
// say which week a milestone landed, so this drives its `onWeek` hook.
//
// Diagnostic, not part of `npm test`: a milestone moving a few years after
// an unrelated balance change is expected. Run with
// `npm run milestones -- [years] [strategy-name-substring]`.
// ---------------------------------------------------------------------

import { play, STRATEGIES } from './balanceSim';
import { FOUNDERS_HALL_ID, initialTech, isAcademicHall } from '../src/data/techData';
import { initialFacilities } from '../src/data/facilitiesData';
import { initialDorms } from '../src/data/campusData';
import { SPEEDS } from '../src/engine/useGame';
import { playerRank } from '../src/systems/rivals/rivalsSystem';
import type { GameState } from '../src/state/types';

const WEEKS_PER_YEAR = 52;

// The catalog, read from the real seed data so content changes are
// picked up automatically.
const tech = initialTech();
const facilities = initialFacilities();
const dorms = initialDorms();

const HALL_IDS = tech.filter(isAcademicHall).map((t) => t.id);
const LAB_IDS = tech
  .filter((t) => t.kind === 'facility' && t.facilityType === 'lab')
  .map((t) => t.id);
const ALL_COURSE_IDS = tech.filter((t) => t.kind === 'course').map((t) => t.id);
const DORM_IDS = dorms.map((d) => d.id);
const ALL_ASSET_IDS = [...tech.map((t) => t.id), ...facilities.map((f) => f.id), ...dorms.map((d) => d.id)];

// One-time "reached or not" milestones, in report order. Each `ids` set is
// checked with allDone(); the two varsity checks are read off `s.orgs.teams`
// directly instead (see MILESTONES below), since a team is not a Buildable.
const MILESTONES: Array<{ label: string; ids: string[] }> = [
  { label: 'All academic halls built', ids: HALL_IDS },
  { label: 'Labs completed', ids: LAB_IDS },
  { label: 'All courses developed', ids: ALL_COURSE_IDS },
  { label: 'All dorms built', ids: DORM_IDS },
  { label: 'All assets built', ids: ALL_ASSET_IDS },
];

function doneIds(s: GameState): Set<string> {
  return new Set(s.tech.filter((t) => t.status === 'done').map((t) => t.id));
}

// The firsts: when each thing in the game happens for the first time, which
// is what a pacing change actually moves. Predicates over live state (most
// are not Buildables), checked weekly and latched on the first true.
const FIRSTS: Array<{ label: string; reached: (s: GameState) => boolean }> = [
  { label: 'First dorm', reached: (s) => s.tech.some((t) => t.kind === 'dorm' && t.status === 'done') },
  // The first hall the school builds: Founders Hall stands on day one, so
  // counting it would report week 1 for every strategy.
  { label: 'First academic hall built', reached: (s) => s.tech.some((t) => isAcademicHall(t) && t.id !== FOUNDERS_HALL_ID && t.status === 'done') },
  // Schools are founded: six programs of one school in one hall.
  { label: 'First school founded', reached: (s) => Object.keys(s.milestones).some((k) => k.startsWith('school-founded:')) },
  { label: 'Every school founded', reached: (s) => Object.keys(s.milestones).filter((k) => k.startsWith('school-founded:')).length >= 7 },
  { label: 'First club', reached: (s) => s.orgs.clubs.length > 0 },
  { label: 'First program established', reached: (s) => Object.keys(s.milestones).some((k) => k.startsWith('program-established:')) },
  { label: 'First lab', reached: (s) => s.tech.some((t) => t.facilityType === 'lab' && t.status === 'done') },
  { label: 'First program distinguished', reached: (s) => Object.keys(s.milestones).some((k) => k.startsWith('program-distinguished:')) },
  { label: 'University charter taken', reached: (s) => s.self.suffix === 'University' },
  { label: 'First research initiative', reached: (s) => Object.keys(s.research.initiatives).length > 0 || s.research.completedInitiatives.length > 0 },
  { label: 'Entered the rankings (top 50)', reached: (s) => s.hasEnteredRankings },
  { label: 'First varsity team formed', reached: (s) => s.orgs.teams.length > 0 },
  { label: 'First varsity team active', reached: (s) => s.orgs.teams.some((t) => t.status === 'active') },
  { label: 'Athletic director hired', reached: (s) => s.orgs.athleticDirector !== null },
  { label: 'First school distinguished', reached: (s) => Object.keys(s.milestones).some((k) => k.startsWith('school-distinguished:')) },
  { label: 'First graduate course', reached: (s) => s.tech.some((t) => t.graduateProgram !== undefined && t.status === 'done') },
  { label: 'First national title', reached: (s) => s.orgs.titles.length > 0 },
  { label: 'Prestige 100', reached: (s) => s.self.reputation >= 100 },
  { label: 'First graduate program founded', reached: (s) => Object.keys(s.milestones).some((k) => k.startsWith('grad-program-complete:')) },
  { label: 'First research prize', reached: (s) => s.research.prizes > 0 },
  { label: 'First campaign', reached: (s) => s.finance.endowmentCampaigns > 0 || (s.advancement?.closed.length ?? 0) > 0 || s.advancement?.running != null },
  { label: 'Rank #1', reached: (s) => playerRank(s) === 1 },
];

function formatDuration(weeks: number, msPerWeek: number): string {
  const totalSeconds = Math.round((weeks * msPerWeek) / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// A short, actionable reason a milestone never lands within the cutoff —
// which specific ids are still missing — rather than a bare "NOT REACHED"
// a reader has to go dig for themselves.
function stuckReport(s: GameState, ids: string[]): string {
  const done = doneIds(s);
  const stuck = ids.filter((id) => !done.has(id));
  if (stuck.length === 0) return '';
  const shown = stuck.slice(0, 6).join(', ') + (stuck.length > 6 ? `, +${stuck.length - 6} more` : '');
  return ` — stuck: ${shown}`;
}

function runOne(strategyName: string, years: number): void {
  const strategy = STRATEGIES.find((s) => s.name === strategyName)!;
  const hitWeek: Record<string, number | null> = {};
  // Firsts first, then completion milestones; the report is sorted by week.
  for (const f of FIRSTS) hitWeek[f.label] = null;
  for (const m of MILESTONES) hitWeek[m.label] = null;

  let week = 0;
  let finalState: GameState | null = null;
  const onWeek = (s: GameState) => {
    week += 1;
    finalState = s;
    for (const m of MILESTONES) {
      if (hitWeek[m.label] !== null) continue;
      const done = doneIds(s);
      if (m.ids.every((id) => done.has(id))) hitWeek[m.label] = week;
    }
    for (const f of FIRSTS) {
      if (hitWeek[f.label] === null && f.reached(s)) hitWeek[f.label] = week;
    }
  };

  const result = play(strategy, years, onWeek);
  const last = result.rows[result.rows.length - 1];

  console.log(`\n=== ${strategyName} — cutoff ${years} game-years ===`);
  const inOrder = Object.entries(hitWeek).sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity));
  for (const [label, w] of inOrder) {
    if (w === null) {
      const m = MILESTONES.find((x) => x.label === label);
      const reason = m && finalState ? stuckReport(finalState, m.ids) : '';
      console.log(`  ${label.padEnd(48)} NOT REACHED${reason}`);
    } else {
      const gameYears = w / WEEKS_PER_YEAR;
      console.log(
        `  ${label.padEnd(48)} week ${String(w).padStart(5)}  (~${gameYears.toFixed(2)} yr) — ` +
        `${formatDuration(w, SPEEDS.real)} @1x, ${formatDuration(w, SPEEDS.double)} @2x`,
      );
    }
  }
  console.log(`  (end of run: year ${last?.year ?? years}, cash ${last?.cash.toLocaleString() ?? '?'}, courses ${last?.courses ?? '?'}/${ALL_COURSE_IDS.length}, faculty ${last?.faculty ?? '?'})`);
}

const YEARS = Number(process.argv[2] ?? 80);
const filter = process.argv[3];
for (const strategy of STRATEGIES) {
  if (filter && !strategy.name.toLowerCase().includes(filter.toLowerCase())) continue;
  runOne(strategy.name, YEARS);
}
