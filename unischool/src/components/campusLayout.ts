import { useMemo, useRef } from 'react';
import type { Buildable, GameState, Pathways, Placement, Placements, QuadState, Trees, Vernacular } from '../state/types';
import { chapterHouseId } from '../data/eventData';
import { hallDisplayName } from '../systems/techtree/schools';

// What the campus scene draws, and nothing that changes week to week: which
// buildings stand where and in what state, the paths, the trees, the names.
// The reducer clones the state every tick, so every record arrives with a new
// identity whether or not anything moved. The layout is kept until its key
// changes, which makes the scene's memo hold through a week in which nothing
// was built, finished, renamed or paved. Construction countdowns and hall pips
// change weekly and are drawn outside it (see CampusMap.tsx).

export interface PlacedEntry {
  t: Buildable;
  p: Placement;
  // What the map calls it (schools.ts's hallDisplayName).
  label: string;
  // Standing as a site: under construction with weeks still to run.
  developing: boolean;
  // A chapter house's letters.
  glyphs?: string;
}

export interface CampusLayout {
  key: string;
  placed: readonly PlacedEntry[];
  byId: ReadonlyMap<string, PlacedEntry>;
  placements: Placements;
  trees: Trees;
  pathways: Pathways;
  quads: QuadState | undefined;
  vernacular: Vernacular;
}

// Everything the scene reads from a placed Buildable. Fields the catalogue
// never changes for a given id (kind, facilityType, tier) ride on the id.
function entryKey(e: PlacedEntry): string {
  const { t, p } = e;
  const fx = t.effects;
  return [
    t.id, p.col, p.row, p.w, p.h, t.status, e.developing ? 1 : 0, e.label, e.glyphs ?? '',
    t.floorsAdded ?? 0, t.renovatingFrom ?? '', fx?.capacityBonus ?? 0, fx?.servesPopulation ?? 0,
  ].join(':');
}

function recordKey(r: Record<string, unknown>): string {
  let out = '';
  for (const k in r) out += `${k}=${String(r[k])};`;
  return out;
}

export function campusLayout(s: GameState): CampusLayout {
  const glyphs: Record<string, string> = {};
  for (const c of s.orgs.chapters) glyphs[chapterHouseId(c.id)] = c.glyphs;
  const placed: PlacedEntry[] = [];
  for (const [id, p] of Object.entries(s.placements)) {
    const t = s.tech.find((x) => x.id === id);
    if (!t) continue;
    placed.push({
      t, p,
      label: hallDisplayName(s, t),
      developing: t.status === 'developing' && s.developing[id] !== undefined,
      glyphs: glyphs[id],
    });
  }
  const key = [
    s.self.vernacular,
    placed.map(entryKey).join('|'),
    recordKey(s.trees),
    recordKey(s.pathways),
    s.quads ? JSON.stringify(s.quads) : '',
  ].join('#');
  return {
    key, placed, byId: new Map(placed.map((e) => [e.t.id, e])),
    placements: s.placements, trees: s.trees, pathways: s.pathways, quads: s.quads, vernacular: s.self.vernacular,
  };
}

// The layout, reference-stable while its key holds.
export function useCampusLayout(s: GameState): CampusLayout {
  const ref = useRef<CampusLayout | null>(null);
  // Per state, not per render: the map re-renders on every pointer move.
  const next = useMemo(() => campusLayout(s), [s]);
  if (ref.current?.key !== next.key) ref.current = next;
  return ref.current;
}
