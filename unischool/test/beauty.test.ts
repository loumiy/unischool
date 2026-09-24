// Campus beauty (src/systems/estate/beauty.ts): trees, landmarks, upkeep and
// quads each raise it; its swing on the applicant pool and on prestige is
// neutral at 50 and capped at either end.

import { createInitialState } from '../src/state/actions';
import { beautyPoolFactor, beautyTerms, campusBeauty, LAYOUT_CAP } from '../src/systems/estate/beauty';
import { projectAdmissions } from '../src/systems/admissions/admissionsSystem';
import { NEUTRAL_COHORT_SIGNALS } from '../src/systems/admissions/cohorts';
import { prestigeBreakdown } from '../src/systems/prestige/prestigeSystem';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';
import { AMENITIES } from '../src/data/facilitiesData';
import { milestoneForBuildable } from '../src/data/ladderData';
import { PAIRING_POINTS, pairingBumps } from '../src/systems/estate/pairing';

bindScriptStream(2627);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('beauty tests');

const fresh = (): GameState => createInitialState('Beauty');

// ---- The swing: neutral at 50, capped ----
{
  assert(beautyPoolFactor(50) === 1, 'beauty 50 leaves the pool alone');
  assert(beautyPoolFactor(100) === 1 + LAYOUT_CAP && beautyPoolFactor(0) === 1 - LAYOUT_CAP, `and moves it at most ${LAYOUT_CAP * 100}% either way`);
  assert(beautyPoolFactor(250) === 1 + LAYOUT_CAP, 'however high the score');
  const plain = projectAdmissions(60, 20_000, 1_000, 70, { ...NEUTRAL_COHORT_SIGNALS, beauty: 50 });
  const lovely = projectAdmissions(60, 20_000, 1_000, 70, { ...NEUTRAL_COHORT_SIGNALS, beauty: 100 });
  assert(Math.abs(lovely.applicants / plain.applicants - (1 + LAYOUT_CAP)) < 0.01, 'the pool follows it');
}

// ---- What raises it ----
{
  const s = fresh();
  const base = beautyTerms(s);
  assert(base.greenery === 1 && base.upkeep === 1, `a founding campus is wooded and well kept (${JSON.stringify(base)})`);
  const felled = fresh();
  felled.trees = {};
  assert(campusBeauty(felled) < base.score, 'felling the woodland costs beauty');
  const tired = fresh();
  for (const t of tired.tech) if (t.id in tired.placements) t.backlog = t.cost * 10 + 1e7;
  assert(beautyTerms(tired).upkeep < 0.5 && campusBeauty(tired) < base.score, 'so does letting the buildings go');
  const grand = fresh();
  const dome = grand.tech.find((t) => t.id === 'LANDMARK-DOME')!;
  dome.status = 'done';
  grand.placements[dome.id] = { row: 20, col: 20, w: 9, h: 9 };
  assert(beautyTerms(grand).landmarks > 0 && campusBeauty(grand) > base.score, 'a grand landmark adds to it');
}

// ---- Prestige hears it, either way from 50 ----
{
  const input = (s: GameState) => prestigeBreakdown(s).inputs.find((i) => i.key === 'beauty')!;
  const s = fresh();
  assert(input(s) !== undefined, 'prestige has a beauty input');
  const felled = fresh();
  felled.trees = {};
  for (const t of felled.tech) if (t.id in felled.placements) t.backlog = t.cost * 10 + 1e7;
  assert(input(felled).contribution < 0, 'an ugly campus costs prestige');
  assert(input(s).contribution > input(felled).contribution, 'and a fine one earns more');
}

// ---- The amenities ----
{
  const s = fresh();
  assert(AMENITIES.every((a) => milestoneForBuildable(a.id) !== undefined), 'every amenity waits on a milestone');
  assert(AMENITIES.every((a) => s.tech.find((t) => t.id === a.id)?.effects?.satisfactionAttribute === undefined), 'none is on the harness\'s path');
  const base = campusBeauty(s);
  const statue = s.tech.find((t) => t.id === 'AMENITY-STATUE')!;
  statue.status = 'done';
  s.placements[statue.id] = { row: 30, col: 30, w: 2, h: 2 };
  assert(campusBeauty(s) > base, 'a statue adds a little beauty');
}

// ---- Pairing bumps ----
{
  const s = fresh();
  s.placements = {};
  const stand = (id: string, row: number, col: number, w: number, h: number) => {
    s.tech.find((t) => t.id === id)!.status = 'done';
    s.placements[id] = { row, col, w, h };
  };
  stand('DORM-01', 20, 20, 7, 3);
  stand('DINING-01', 50, 50, 3, 3);
  assert(pairingBumps(s).housing === 0, 'a dorm far from any dining hall gets nothing');
  s.placements['DINING-01'] = { row: 25, col: 22, w: 3, h: 3 };
  assert(pairingBumps(s).housing === PAIRING_POINTS, `one beside a dining hall gets the full ${PAIRING_POINTS} points`);
  stand('DORM-02', 80, 80, 9, 4);
  assert(pairingBumps(s).housing === PAIRING_POINTS / 2, 'and half the dorms near one get half');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
