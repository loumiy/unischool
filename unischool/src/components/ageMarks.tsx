import type { Buildable, Vernacular } from '../state/types';
import { wallHeightOf } from './buildingSpec';
import { boxFaces, type Pt } from './isoProjection';

// Weathering by years standing: rain streaks down the walls after
// STREAK_YEARS, and slates gone from the eaves after SLATE_YEARS. Phase E ties
// both to a building's condition and adds the derelict and the historic;
// here they are age alone. Drawn over the motif, per building, and placed by
// a hash of its id so each weathers its own way and the same way every time.

export const STREAK_YEARS = 15;
export const SLATE_YEARS = 30;

export type AgeBand = 0 | 1 | 2;

export function ageBand(t: Pick<Buildable, 'builtYear'>, year: number): AgeBand {
  if (t.builtYear === undefined) return 0;
  const age = year - t.builtYear;
  return age >= SLATE_YEARS ? 2 : age >= STREAK_YEARS ? 1 : 0;
}

function hash(id: string, salt: number): number {
  let h = salt * 0x9e3779b1;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

export default function AgeMarks({ t, p, band }: {
  t: Buildable; p: { col: number; row: number; w: number; h: number }; band: AgeBand; vernacular: Vernacular;
}) {
  if (band === 0) return null;
  const H = wallHeightOf(t);
  const f = boxFaces(p.col, p.row, p.w, p.h, 0, H);
  // The two visible walls, each as its ground edge and its eave edge.
  const walls: [Pt, Pt, Pt, Pt][] = [[f.C, f.D, f.Ct, f.Dt], [f.B, f.C, f.Bt, f.Ct]];
  const streaks: string[] = [];
  const slates: string[] = [];
  walls.forEach(([g0, g1, e0, e1], k) => {
    const count = 3 + Math.floor(hash(t.id, k) * 3);
    for (let i = 0; i < count; i++) {
      const u = 0.08 + 0.84 * hash(t.id, 10 + k * 10 + i);
      const top = lerp(e0, e1, u);
      const foot = lerp(g0, g1, u);
      const reach = 0.3 + 0.35 * hash(t.id, 40 + k * 10 + i);
      const end = lerp(top, foot, reach);
      streaks.push(`M${top.x.toFixed(1)},${(top.y + 2).toFixed(1)}L${end.x.toFixed(1)},${end.y.toFixed(1)}`);
    }
    if (band === 2) {
      const gaps = 2 + Math.floor(hash(t.id, 90 + k) * 3);
      for (let i = 0; i < gaps; i++) {
        const u = 0.1 + 0.8 * hash(t.id, 100 + k * 10 + i);
        const a = lerp(e0, e1, u);
        const b = lerp(e0, e1, Math.min(1, u + 0.05));
        slates.push(`M${a.x.toFixed(1)},${(a.y - 1).toFixed(1)}L${b.x.toFixed(1)},${(b.y - 1).toFixed(1)}`);
      }
    }
  });
  return (
    <g className="campus-age" aria-hidden="true">
      <path className="campus-age-streak" d={streaks.join('')} />
      {slates.length > 0 && <path className="campus-age-slates" d={slates.join('')} />}
    </g>
  );
}
