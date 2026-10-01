// ---------------------------------------------------------------------
// A HAND-BUILT CAMPUS AS A PLAN. Reads one of tools/campuses/'s saves — a
// campus the owner laid out in the game itself — as a placement plan for
// layout.ts and timelapse.ts (`--plan <save>`). Only the arrangement is
// read: where each building stands, the walks, the lamps and benches and
// the trees. The plan's school (its name, architecture, money, catalogue
// and everything else in its state) is ignored, which is what lets one
// plan be put onto any run in any vernacular.
//
// Not part of the game: nothing in src/ imports it.
// ---------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { GRAND_LANDMARK_IDS } from '../src/data/facilitiesData';
import type { Dressing, GameState, Pathways, Placements, Trees } from '../src/state/types';

export interface CampusPlan {
  placements: Placements;
  pathways: Pathways;
  dressing: Dressing;
  trees: Trees;
}

export function readPlan(path: string): CampusPlan {
  const { state } = JSON.parse(readFileSync(path, 'utf8')) as { state: GameState };
  return {
    placements: state.placements,
    pathways: state.pathways,
    dressing: state.dressing ?? {},
    trees: state.trees,
  };
}

// The value of `--plan` in an argv, as `--plan <path>` or `--plan=<path>`;
// the argv with it taken out.
export function planFlag(argv: string[]): { plan: string | undefined; rest: string[] } {
  const rest: string[] = [];
  let plan: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--plan') plan = argv[++i];
    else if (argv[i].startsWith('--plan=')) plan = argv[i].slice('--plan='.length);
    else rest.push(argv[i]);
  }
  return { plan, rest };
}

// A run builds one grand landmark and the other two close. When the plan
// sites a different one from the run's, the run's takes the plan's id: the
// three have one price, one build time and one set of effects
// (facilitiesData.ts's GRAND_LANDMARKS), so the swap changes the picture
// and nothing the run computed. Returns the swap made, if any.
const CHOSEN = new Set(['developing', 'done']);
const IDENTITY = new Set(['id', 'name', 'description']);
export function takePlansLandmark(s: GameState, plan: CampusPlan): string | null {
  const wanted = GRAND_LANDMARK_IDS.find((id) => id in plan.placements);
  if (!wanted) return null;
  const want = s.tech.find((t) => t.id === wanted);
  const built = s.tech.find((t) => GRAND_LANDMARK_IDS.includes(t.id) && t.id !== wanted && CHOSEN.has(t.status));
  if (!want || !built || CHOSEN.has(want.status)) return null;
  const a = want as unknown as Record<string, unknown>;
  const b = built as unknown as Record<string, unknown>;
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (IDENTITY.has(key)) continue;
    const [x, y] = [a[key], b[key]];
    if (y === undefined) delete a[key]; else a[key] = y;
    if (x === undefined) delete b[key]; else b[key] = x;
  }
  if (built.id in s.placements) {
    s.placements[want.id] = s.placements[built.id];
    delete s.placements[built.id];
  }
  return `${built.id} -> ${want.id}`;
}
