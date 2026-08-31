import type { Buildable, GameState, Placements } from './types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH, PLACEABLE_KINDS } from './types';

// Pure helpers for the campus map's placement rules, shared by the
// reducer's PLACE_BUILDABLE case and the map UI so "can this go here" has
// exactly one definition (the same way techSystem.ts's
// canStartDevelopment is shared by the reducer and the Campus tab).
//
// Nothing here mutates state and nothing here ticks — placement is a
// player action interpreted by the reducer, not a system.

// Courses are never placeable; buildings, dorms, and facilities are.
export function isPlaceableKind(t: Buildable): boolean {
  return PLACEABLE_KINDS.includes(t.kind);
}

export function isInBounds(row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col)
    && row >= 0 && row < CAMPUS_GRID_HEIGHT
    && col >= 0 && col < CAMPUS_GRID_WIDTH;
}

// The Buildable id sitting on a tile, or undefined if the tile is empty.
// Linear over `placements`, which holds at most CAMPUS_GRID_WIDTH *
// CAMPUS_GRID_HEIGHT entries — no index worth keeping in state for that.
export function occupantAt(placements: Placements, row: number, col: number): string | undefined {
  for (const [id, tile] of Object.entries(placements)) {
    if (tile.row === row && tile.col === col) return id;
  }
  return undefined;
}

// A finished, placeable Buildable that hasn't been sited yet. Placement is
// optional and non-blocking: a building's effects already landed when it
// finished, so leaving this list full costs the player nothing mechanically.
export function isAwaitingPlacement(s: GameState, t: Buildable): boolean {
  return t.status === 'done' && isPlaceableKind(t) && !(t.id in s.placements);
}

export function awaitingPlacement(s: GameState): Buildable[] {
  return s.tech.filter((t) => isAwaitingPlacement(s, t));
}

// The one definition of a legal placement: a finished, placeable, not-yet-
// placed Buildable onto an in-bounds empty tile.
export function canPlace(s: GameState, t: Buildable, row: number, col: number): boolean {
  return isAwaitingPlacement(s, t)
    && isInBounds(row, col)
    && occupantAt(s.placements, row, col) === undefined;
}
