// ---------------------------------------------------------------------
// How long does each scripted strategy (see balanceSim.ts's STRATEGIES)
// take to hit a fixed set of "the campus is done" milestones — full
// schools, full labs, a complete curriculum, a full dorm chain, a fielded
// varsity team, every asset in the game — in both game-years and real
// playtime at the game's own tick speeds (see src/engine/useGame.ts's
// SPEEDS)? `play()`'s own `rows` are one snapshot a YEAR (at the summer
// admissions boundary), too coarse to say which WEEK a one-time milestone
// first became true, so this drives `play()`'s optional `onWeek` hook
// directly instead.
//
// Not part of the game, and not part of `npm test` — this is diagnostic,
// not an assertion suite; a milestone moving a few years because of an
// unrelated balance change is expected, not a regression. Run with
// `npm run milestones -- [years] [strategy-name-substring]`.
// ---------------------------------------------------------------------

import { play, STRATEGIES } from './balanceSim';
import { GENED_BUILDING_ID, initialTech } from '../src/data/techData';
import { initialFacilities } from '../src/data/facilitiesData';
import { initialDorms } from '../src/data/campusData';
import { SPEEDS } from '../src/engine/useGame';
import { playerRank } from '../src/systems/rivals/rivalsSystem';
import type { GameState } from '../src/state/types';

const WEEKS_PER_YEAR = 52;

// The catalogue, read once from the real seed data — never hand-counted —
// so a future content change (a new school, a new dorm) is picked up
// automatically rather than silently going stale here.
const tech = initialTech();
const facilities = initialFacilities();
const dorms = initialDorms();

const UNDERGRAD_BUILDING_IDS = tech
  .filter((t) => t.kind === 'building' && t.graduateProgram === undefined)
  .map((t) => t.id);
const GRAD_BUILDING_IDS = tech
  .filter((t) => t.kind === 'building' && t.graduateProgram !== undefined)
  .map((t) => t.id);
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
  { label: 'All undergrad schools built', ids: UNDERGRAD_BUILDING_IDS },
  { label: 'Grad schools built', ids: GRAD_BUILDING_IDS },
  { label: 'Labs completed', ids: LAB_IDS },
  { label: 'All courses developed', ids: ALL_COURSE_IDS },
  { label: 'All dorms built', ids: DORM_IDS },
  { label: 'All assets built', ids: ALL_ASSET_IDS },
];

function doneIds(s: GameState): Set<string> {
  return new Set(s.tech.filter((t) => t.status === 'done').map((t) => t.id));
}

// THE FIRSTS: the other half of the pacing question, and the half the
// September 2026 review actually measured by hand (Appendix A's "Firsts",
// from dorm at 1.0 to the last placeable at 28.8). The milestones above ask
// "when is everything finished"; these ask "when does each thing in the game
// happen for the first time", which is what a pacing change actually moves.
// A line here reads as "rank #1 moved from year 18 to year 31".
//
// Each is a predicate over the live state rather than a set of ids, because
// most of them are not Buildables at all — a rank, a charter, a banner. They
// are checked every week and latched on the first one that returns true.
const FIRSTS: Array<{ label: string; reached: (s: GameState) => boolean }> = [
  { label: 'First dorm', reached: (s) => s.tech.some((t) => t.kind === 'dorm' && t.status === 'done') },
  // The first hall the school BUILDS. The founding campus already has one —
  // General Studies stands on day one (see data/actions.ts's founding
  // state) — so counting it would report week 1 for every strategy and say
  // nothing about pacing.
  { label: 'First school hall built', reached: (s) => s.tech.some((t) => t.kind === 'building' && t.id !== GENED_BUILDING_ID && t.status === 'done') },
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
  { label: 'First endowment campaign', reached: (s) => s.finance.endowmentCampaigns > 0 },
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
  // Firsts first, then the completion milestones: a report that reads in
  // the order things happen is a timeline, and one that reads in the order
  // the arrays were declared is a list.
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
