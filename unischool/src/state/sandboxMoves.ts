import type { Facing, GameState, Vernacular } from './types';
import { isVernacular } from './types';
import { orientedFootprint, pathTileKey, placementFor, placementTiles } from './campusMap';
import { siteRefusal } from './reach';
import { fellTrees } from '../data/treeData';
import { isSandbox } from '../systems/sandbox/sandbox';

// What a sandbox run (systems/sandbox) may do to a campus that a normal run
// may not, beside placeBuildable.ts's siting: pick up a standing building
// and set it down elsewhere, and draw one building in another architecture. Neither touches the simulation: a building keeps
// its programs, its condition and its history wherever it stands and
// whatever it looks like.

// The campus with one building lifted off it: what a move is checked
// against, so the building never blocks its own new site.
export function withoutPlacement(s: GameState, id: string): GameState {
  const placements = { ...s.placements };
  delete placements[id];
  return { ...s, placements };
}

// Why a building may not be moved to this site, or null if it may. The
// same rules as siting a new one (reach.ts): clear land, a walk from the
// road, and nothing else walled off.
export function moveRefusal(s: GameState, id: string, row: number, col: number, facing: Facing): string | null {
  if (!isSandbox(s)) return 'only in a sandbox';
  const node = s.tech.find((t) => t.id === id);
  if (!node || !(id in s.placements)) return 'not on the map';
  return siteRefusal(withoutPlacement(s, id), node, row, col, orientedFootprint(node, facing));
}

// Moves it, if the site is allowed. As siting does, the new ground's trees
// are felled for good; decoration under the new footprint is lifted.
export function moveBuildable(s: GameState, id: string, row: number, col: number, facing: Facing): void {
  if (moveRefusal(s, id, row, col, facing) !== null) return;
  const node = s.tech.find((t) => t.id === id)!;
  const was = s.placements[id]!;
  const placement = placementFor(row, col, orientedFootprint(node, facing), facing);
  if (was.vernacular) placement.vernacular = was.vernacular;
  s.placements[id] = placement;
  fellTrees(s.trees, placement);
  if (s.dressing) for (const tile of placementTiles(placement)) delete s.dressing[pathTileKey(tile)];
}

// Draws one standing building in another vernacular, or (null, or the
// college's own) back in the college's.
export function setBuildingStyle(s: GameState, id: string, vernacular: Vernacular | null): void {
  if (!isSandbox(s)) return;
  const p = s.placements[id];
  if (!p) return;
  if (vernacular === null || vernacular === s.self.vernacular) delete p.vernacular;
  else if (isVernacular(vernacular)) p.vernacular = vernacular;
}
