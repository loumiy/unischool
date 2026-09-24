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

// 0 nothing, 1 streaks, 2 lost slates, 3 boarded windows, 4 derelict: a
// fence round it and weeds at its foot.
export type AgeBand = 0 | 1 | 2 | 3 | 4;

export function ageBand(t: Pick<Buildable, 'builtYear'>, year: number): AgeBand {
  if (t.builtYear === undefined) return 0;
  const age = year - t.builtYear;
  return age >= SLATE_YEARS ? 2 : age >= STREAK_YEARS ? 1 : 0;
}

// Condition (systems/estate) wears a building faster than age does (Plan 26).
export function conditionBand(condition: number): AgeBand {
  return condition < 0.1 ? 4 : condition < 0.25 ? 3 : condition < 0.5 ? 2 : condition < 0.75 ? 1 : 0;
}

export function weatherBand(t: Pick<Buildable, 'builtYear'>, year: number, condition: number): AgeBand {
  return Math.max(ageBand(t, year), conditionBand(condition)) as AgeBand;
}

function hash(id: string, salt: number): number {
  let h = salt * 0x9e3779b1;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

// Ivy on a historic building (Plan 26): clusters climbing the visible walls
// from the ground, thickest at the corners.
function Ivy({ t, f }: { t: Buildable; f: ReturnType<typeof boxFaces> }) {
  const walls: [Pt, Pt, Pt, Pt][] = [[f.C, f.D, f.Ct, f.Dt], [f.B, f.C, f.Bt, f.Ct]];
  const leaves: React.JSX.Element[] = [];
  walls.forEach(([g0, g1, e0, e1], k) => {
    for (let i = 0; i < 26; i++) {
      // Corners first: u clusters toward each end of the wall.
      const r = hash(t.id, 300 + k * 40 + i);
      const u = r < 0.5 ? r * 0.5 : 1 - (r - 0.5) * 0.5;
      const v = hash(t.id, 340 + k * 40 + i) * 0.7 * (1 - Math.abs(u - 0.5));
      const q = lerp(lerp(g0, g1, u), lerp(e0, e1, u), v);
      leaves.push(<circle key={`${k}-${i}`} cx={q.x.toFixed(1)} cy={q.y.toFixed(1)} r={2.2 + hash(t.id, 380 + i) * 1.8} />);
    }
  });
  return <g className="campus-ivy">{leaves}</g>;
}

export default function AgeMarks({ t, p, band, historic = false }: {
  t: Buildable; p: { col: number; row: number; w: number; h: number }; band: AgeBand; vernacular: Vernacular;
  historic?: boolean;
}) {
  if (band === 0 && !historic) return null;
  if (band === 0) return <Ivy t={t} f={boxFaces(p.col, p.row, p.w, p.h, 0, wallHeightOf(t))} />;
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
    if (band >= 2) {
      const gaps = 2 + Math.floor(hash(t.id, 90 + k) * 3);
      for (let i = 0; i < gaps; i++) {
        const u = 0.1 + 0.8 * hash(t.id, 100 + k * 10 + i);
        const a = lerp(e0, e1, u);
        const b = lerp(e0, e1, Math.min(1, u + 0.05));
        slates.push(`M${a.x.toFixed(1)},${(a.y - 1).toFixed(1)}L${b.x.toFixed(1)},${(b.y - 1).toFixed(1)}`);
      }
    }
  });
  // Boarded windows: planks across a few openings on each visible wall.
  const boards: string[] = [];
  if (band >= 3) {
    walls.forEach(([g0, g1, e0, e1], k) => {
      for (let i = 0; i < 4; i++) {
        const u = 0.12 + 0.76 * hash(t.id, 200 + k * 10 + i);
        const v = 0.25 + 0.45 * hash(t.id, 240 + k * 10 + i);
        const a = lerp(lerp(g0, g1, u - 0.03), lerp(e0, e1, u - 0.03), v);
        const b = lerp(lerp(g0, g1, u + 0.03), lerp(e0, e1, u + 0.03), v);
        const c = lerp(lerp(g0, g1, u + 0.03), lerp(e0, e1, u + 0.03), v + 0.12);
        const d = lerp(lerp(g0, g1, u - 0.03), lerp(e0, e1, u - 0.03), v + 0.12);
        boards.push(`M${[a, b, c, d].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`);
      }
    });
  }
  // Derelict: a fence round the footprint and weeds at its foot.
  const ground = boxFaces(p.col - 0.3, p.row - 0.3, p.w + 0.6, p.h + 0.6, 0, 0);
  const fenceTop = boxFaces(p.col - 0.3, p.row - 0.3, p.w + 0.6, p.h + 0.6, 0, 7);
  return (
    <g className="campus-age" aria-hidden="true">
      <path className="campus-age-streak" d={streaks.join('')} />
      {slates.length > 0 && <path className="campus-age-slates" d={slates.join('')} />}
      {boards.length > 0 && <path className="campus-age-boards" d={boards.join('')} />}
      {historic && <Ivy t={t} f={f} />}
      {band === 4 && (
        <>
          <path className="campus-age-weeds" d={walls.map(([g0, g1]) => [0.1, 0.3, 0.55, 0.8].map((u) => {
            const q = lerp(g0, g1, u);
            return `M${(q.x - 3).toFixed(1)},${q.y.toFixed(1)}q3,-7 6,0`;
          }).join('')).join('')} />
          <polygon className="campus-age-fence" points={[ground.D, ground.C, ground.B, fenceTop.Bt, fenceTop.Ct, fenceTop.Dt].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} />
        </>
      )}
    </g>
  );
}
