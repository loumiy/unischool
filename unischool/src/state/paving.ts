import type { PathMaterial, Pathways } from './types';

// What a path is paved with (the build menu's three path tools): the plain
// flagged walk every path had before materials, cobbles, or brick. A saved
// tile stores `true` for the flagged walk, so a campus laid before
// materials loads as it was drawn, and a material's name otherwise.
// Drawing only: reach, quads, walkers and beauty ask whether a tile is
// paved, never with what.
export type PathSurface = 'paving' | PathMaterial;
export const PATH_SURFACES: readonly PathSurface[] = ['paving', 'cobble', 'brick'];

export function surfaceOf(value: Pathways[string] | undefined): PathSurface {
  return value === 'cobble' || value === 'brick' ? value : 'paving';
}

// The stored value for a surface.
export function pavingValue(surface: PathSurface | undefined): true | PathMaterial {
  return surface === 'cobble' || surface === 'brick' ? surface : true;
}

// Whether a stored value is one this version draws (a save's hygiene).
export function isPavingValue(v: unknown): v is true | PathMaterial {
  return v === true || v === 'cobble' || v === 'brick';
}
