import { tagTeeth } from '../identity/teeth';
import type { GameState } from '../../state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../../state/types';
import { isPlaceableKind } from '../../state/campusMap';
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
    JSON.stringify(s.quads ?? null),
  ].join('#');
  if (quadCache?.key !== key) {
    quadCache = { key, quality: detectQuads(s).reduce((t, q) => t + q.quality, 0) };
  }
  return quadCache.quality;
}

export function beautyTerms(s: GameState): BeautyTerms {
  const trees = Object.keys(s.trees).filter((k) => !(k in s.pathways)).length;
  const greenery = Math.min(1, trees / Math.max(1, FOUNDING_TREES * GREENERY_TARGET_SHARE));
  const standing = s.tech.filter((t) => isPlaceableKind(t) && t.status === 'done' && t.id in s.placements);
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
