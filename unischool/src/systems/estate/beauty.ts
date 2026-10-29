import { tagTeeth } from '../identity/teeth';
import type { GameState } from '../../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH, standsOnCampus } from '../../state/types';
import { isPlaceableKind, pathTileKey } from '../../state/campusMap';
import { detectQuads } from '../../state/quads';
import { TREE_COVERAGE } from '../../data/treeData';
import { conditionOf } from './estate';

// Campus beauty (Plan 26, ported from v2's beauty.ts): a score from 0 to 100
// out of four shares of a target, weighted:
//   greenery   trees, against 60% of the founding woodland;
//   landmarks  what the landmarks are worth (effects.beauty), at their
//              condition;
//   upkeep     the finished buildings' mean condition;
//   enclosure  the quads the buildings make (state/quads.ts), at the
//              estate's condition.
// It reaches the applicant pool (admissionsSystem.ts, capped at the layout
// cap) and prestige (prestigeSystem.ts), both neutral at 50.
//
// Also the Campus standing (Plan 119), which the Final Report grades in place
// of Access.
//
// The one module in systems/ that reads the map: the layout is load-bearing
// here on purpose (test/invariants.test.ts, section 4).

const FOUNDING_TREES = Math.round(CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT * TREE_COVERAGE);
export const GREENERY_TARGET_SHARE = 0.6;
export const LANDMARK_TARGET = 6;
export const QUAD_TARGET = 3;
export const BEAUTY_WEIGHTS = { greenery: 0.3, landmarks: 0.25, upkeep: 0.25, enclosure: 0.2 } as const;
// The most any layout effect moves the applicant pool, either way.
export const LAYOUT_CAP = 0.12;

export interface BeautyTerms {
  greenery: number;   // 0–1
  landmarks: number;  // 0–1
  upkeep: number;     // 0–1
  enclosure: number;  // 0–1
  score: number;      // 0–100
}

// Quad detection floods the parcel, so it is kept for the layout it read.
let quadCache: { key: string; quality: number } | null = null;
function quadQuality(s: GameState): number {
  const key = [
    Object.entries(s.placements).map(([id, p]) => `${id}:${p.row},${p.col},${p.w},${p.h}`).join('|'),
    Object.keys(s.pathways).join(';'),
  ].join('#');
  if (quadCache?.key !== key) {
    quadCache = { key, quality: detectQuads(s).reduce((t, q) => t + q.quality, 0) };
  }
  return quadCache.quality;
}

export function beautyTerms(s: GameState): BeautyTerms {
  const trees = Object.keys(s.trees).filter((k) => !(k in s.pathways)).length;
  const greenery = Math.min(1, trees / Math.max(1, FOUNDING_TREES * GREENERY_TARGET_SHARE));
  const standing = s.tech.filter((t) => isPlaceableKind(t) && standsOnCampus(t) && t.id in s.placements);
  const marks = standing.reduce((t, b) => t + (b.effects?.beauty ?? 0) * conditionOf(b), 0);
  const landmarks = Math.min(1, marks / LANDMARK_TARGET);
  // Well-kept buildings are something a campus has to have: an empty parcel
  // earns no upkeep, only its trees.
  const upkeep = standing.length === 0 ? 0 : standing.reduce((t, b) => t + conditionOf(b), 0) / standing.length;
  const enclosure = Math.min(1, quadQuality(s) / QUAD_TARGET) * upkeep;
  const score = 100 * (
    greenery * BEAUTY_WEIGHTS.greenery + landmarks * BEAUTY_WEIGHTS.landmarks
    + upkeep * BEAUTY_WEIGHTS.upkeep + enclosure * BEAUTY_WEIGHTS.enclosure
  );
  return {
    greenery: Number(greenery.toFixed(3)),
    landmarks: Number(landmarks.toFixed(3)),
    upkeep: Number(upkeep.toFixed(3)),
    enclosure: Number(enclosure.toFixed(3)),
    score: Number(Math.min(100, score).toFixed(1)),
  };
}

// The score, with an identity tag's teeth (Plan 31: Artsy's galleries).
export function campusBeauty(s: GameState): number {
  return Math.min(100, beautyTerms(s).score + tagTeeth(s, 'beauty'));
}

// Beauty's swing on the applicant pool: neutral at 50, the layout cap at
// either end.
export function beautyPoolFactor(beauty: number): number {
  return 1 + Math.max(-1, Math.min(1, (beauty - 50) / 50)) * LAYOUT_CAP;
}

// ---------------------------------------------------------------------
// Campus (Plan 119, the owner: reward "players who spend time making the
// campus look good, not just buying every asset"). Four parts, each 0–1 and
// each a ratio, so a campus's size doesn't decide it (F10: the game "pushes
// creating simply massive university instead of quality"):
//   decoration    lamps, benches, banner lamps and flower beds, per building;
//   quads         the quads the buildings make, against what the campus's
//                 size could hold;
//   paths         the share of buildings with a path at a door (the middle of
//                 a wall, where the walkers go in);
//   assets        the buildings the college may build that stand, at their
//                 condition.
// On the 0–150 scale the standings use.
// ---------------------------------------------------------------------

export const CAMPUS_SCALE = 150;
export const DECOR_PER_BUILDING = 3;
export const BUILDINGS_PER_QUAD = 8;
// Weighted so a campus laid out with care reads an A, and one that bought
// everything and dressed none of it about a C (Plan 119D).
export const CAMPUS_WEIGHTS = { decoration: 0.25, quads: 0.2, paths: 0.25, assets: 0.3 } as const;

export interface CampusTerms {
  decoration: number; // 0–1
  quads: number;      // 0–1
  paths: number;      // 0–1
  assets: number;     // 0–1
  score: number;      // 0–150
}

// The tiles just outside the middle of each wall: where a door is.
function doorTiles(p: { row: number; col: number; w: number; h: number }): Array<{ row: number; col: number }> {
  const out: Array<{ row: number; col: number }> = [];
  for (const c of new Set([p.col + Math.floor((p.w - 1) / 2), p.col + Math.ceil((p.w - 1) / 2)])) {
    out.push({ row: p.row - 1, col: c }, { row: p.row + p.h, col: c });
  }
  for (const r of new Set([p.row + Math.floor((p.h - 1) / 2), p.row + Math.ceil((p.h - 1) / 2)])) {
    out.push({ row: r, col: p.col - 1 }, { row: r, col: p.col + p.w });
  }
  return out;
}

export function campusTerms(s: GameState): CampusTerms {
  const standing = s.tech.filter((t) => isPlaceableKind(t) && t.facilityType !== 'quad' && standsOnCampus(t) && t.id in s.placements);
  const n = standing.length;
  const decor = Object.keys(s.dressing ?? {}).length;
  const decoration = n === 0 ? 0 : Math.min(1, decor / (DECOR_PER_BUILDING * n));
  const quads = n === 0 ? 0 : Math.min(1, quadQuality(s) / Math.max(1, n / BUILDINGS_PER_QUAD));
  const atDoor = standing.filter((t) => doorTiles(s.placements[t.id]).some((d) => s.pathways[pathTileKey(d)])).length;
  const paths = n === 0 ? 0 : atDoor / n;
  const open = s.tech.filter((t) => isPlaceableKind(t) && t.facilityType !== 'quad' && t.status !== 'locked');
  const assets = open.length === 0 ? 0 : standing.reduce((sum, t) => sum + conditionOf(t), 0) / open.length;
  const score = CAMPUS_SCALE * (
    decoration * CAMPUS_WEIGHTS.decoration + quads * CAMPUS_WEIGHTS.quads
    + paths * CAMPUS_WEIGHTS.paths + Math.min(1, assets) * CAMPUS_WEIGHTS.assets
  );
  return {
    decoration: Number(decoration.toFixed(3)),
    quads: Number(quads.toFixed(3)),
    paths: Number(paths.toFixed(3)),
    assets: Number(Math.min(1, assets).toFixed(3)),
    score: Number(score.toFixed(1)),
  };
}

export function campusStanding(s: GameState): number {
  return campusTerms(s).score;
}
