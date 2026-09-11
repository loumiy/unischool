import { createRoot } from 'react-dom/client';
import type { Buildable, FacilityType } from './state/types';
import { footprintOf } from './state/campusMap';
import { motifOf, type Motif } from './components/buildingMotifs';

// ---------------------------------------------------------------------
// THROWAWAY SPIKE — not part of the game, not imported by anything.
// Reachable only at /iso-spike.html in dev; Vite's production build only
// emits index.html, so this never ships. Delete this file and iso-spike.html
// together when the flat-vs-angled question is settled.
//
// Its only job is to answer one question: is an angled camera worth what it
// costs? It deliberately reuses the REAL footprint table (footprintOf) and
// the REAL motif taxonomy (motifOf) so what's on screen is this game's
// campus at this game's sizes, not a flattering mock-up.
//
// Everything below is the honest minimum needed to judge the look. It is NOT
// a design for the real thing: no hit-testing, no placement, no rotation, no
// occlusion sorting beyond a naive painter's pass, no pan/zoom.
// ---------------------------------------------------------------------

// 2:1 dimetric — the projection this genre means by "isometric". One grid
// tile is TW wide and TH tall on screen; the 2:1 ratio is what makes the
// diagonals land on clean pixel slopes instead of shimmering.
const TW = 64;
const TH = 32;

interface P { x: number; y: number; }
function px(col: number, row: number): P {
  return { x: (col - row) * (TW / 2), y: (col + row) * (TH / 2) };
}
function lift(p: P, h: number): P {
  return { x: p.x, y: p.y - h };
}
function poly(pts: P[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

// The three faces of an axis-aligned box standing on the grid. A is the back
// corner (smallest screen y), C the front corner — so the two faces the
// camera can see are always the ones meeting at C.
function boxFaces(col: number, row: number, w: number, h: number, base: number, height: number) {
  const A = lift(px(col, row), base);
  const B = lift(px(col + w, row), base);
  const C = lift(px(col + w, row + h), base);
  const D = lift(px(col, row + h), base);
  return {
    A, B, C, D,
    At: lift(A, height), Bt: lift(B, height), Ct: lift(C, height), Dt: lift(D, height),
    top: [lift(A, height), lift(B, height), lift(C, height), lift(D, height)],
    left: [D, C, lift(C, height), lift(D, height)],
    right: [C, B, lift(B, height), lift(C, height)],
  };
}

// A window on a wall face, in the wall's own (u along the wall, v up it)
// coordinates — so it comes out correctly skewed for free instead of needing
// its own projection maths.
function wallPanels(origin: P, along: P, height: number, cols: number, rows: number): string[] {
  const out: string[] = [];
  const at = (u: number, v: number): P => ({
    x: origin.x + (along.x - origin.x) * u,
    y: origin.y + (along.y - origin.y) * u - height * v,
  });
  const uPitch = 1 / cols;
  const vPitch = 1 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u0 = (c + 0.26) * uPitch;
      const u1 = (c + 0.74) * uPitch;
      const v0 = (r + 0.3) * vPitch;
      const v1 = (r + 0.75) * vPitch;
      out.push(poly([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]));
    }
  }
  return out;
}

// Storey height and roof pitch per motif. This is the dimension an angled
// camera ADDS — every buildable needs one, and it is authored data that a
// flat map never has to have an opinion about.
const HEIGHT: Record<Motif, number> = {
  hall: 84, residential: 54, portico: 70, pavilion: 44, hangar: 58, works: 30, grounds: 0, bowl: 42,
};
const RIDGE: Partial<Record<Motif, number>> = { hall: 26, residential: 18, portico: 0 };
const WALL_GRID: Partial<Record<Motif, [number, number]>> = {
  hall: [7, 3], residential: [9, 2], portico: [6, 2], pavilion: [5, 1], works: [3, 1],
};

// The REAL per-kind/tint palette from styles.css, so the angled view is
// judged against the colour language the flat map already has rather than
// against a field of identical gold boxes. Roof takes the tint itself; the
// two walls are shaded from it, lit from the upper left to match the flat
// map's own shadow direction.
const TINTS: Record<string, string> = {
  building: '#c9a227', dorm: '#cfe0cf',
  library: '#d9cba3', studentCenter: '#e0cdb4', diningHall: '#e6d3ae', recCenter: '#d3cdb2',
  healthCenter: '#e3d6c6', quad: '#cfdcc4', lab: '#cdd0c0', gym: '#d6c9a0',
  tennisCourts: '#d1d9b8', pool: '#b9cdd4', performingArtsCenter: '#d8c2c9', artGallery: '#cbc0d3',
  athleticsField: '#c9d9a8', athleticsArena: '#cdbfa0', athleticsDiamond: '#d7c49a',
  athleticsNatatorium: '#a9c7cf', footballStadium: '#d4a94f', grocery: '#ecd9a4',
};
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.max(0, Math.min(255, Math.round(v * factor))));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function paletteFor(t: Buildable) {
  const base = TINTS[t.facilityType ?? t.kind] ?? '#d9cba3';
  return {
    roof: base,
    roofBack: shade(base, 1.06),
    roofFront: shade(base, 0.82),
    gable: shade(base, 0.74),
    wallLeft: shade(base, 0.9),
    wallRight: shade(base, 0.72),
  };
}

function Building({ t, row, col }: { t: Buildable; row: number; col: number }) {
  const motif = motifOf(t);
  const { w, h } = footprintOf(t);
  const H = HEIGHT[motif];
  const f = boxFaces(col, row, w, h, 0, H);
  const ridge = RIDGE[motif] ?? 0;
  const grid = WALL_GRID[motif];
  const pal = paletteFor(t);

  // Open ground: no mass at all, just the plate and a marking. These are the
  // motifs that were already correct on the flat map.
  if (motif === 'grounds') {
    const inset = 0.12;
    const gi = boxFaces(col + w * inset, row + h * inset, w * (1 - inset * 2), h * (1 - inset * 2), 0, 0);
    return (
      <g>
        <polygon points={poly(f.top)} fill={TINTS[t.facilityType ?? t.kind] ?? '#a3c17d'} />
        <polygon className="iso-ground-mark" points={poly(gi.top)} />
      </g>
    );
  }

  if (motif === 'bowl') {
    // Stands as a raised ring (evenodd path, so the bowl is genuinely open)
    // with the pitch lying on the ground inside it.
    const t2 = 0.2;
    const inner = boxFaces(col + w * t2, row + h * t2, w * (1 - t2 * 2), h * (1 - t2 * 2), 0, H);
    const pitch = boxFaces(col + w * 0.26, row + h * 0.26, w * 0.48, h * 0.48, 0, 0);
    return (
      <g>
        <polygon className="iso-pitch" points={poly(pitch.top)} />
        <path fill={pal.roof} fillRule="evenodd" d={`M${poly(f.top).replace(/ /g, 'L')}Z M${poly(inner.top).replace(/ /g, 'L')}Z`} />
        <polygon points={poly(f.left)} fill={pal.wallLeft} />
        <polygon points={poly(f.right)} fill={pal.wallRight} />
      </g>
    );
  }

  return (
    <g>
      <polygon points={poly(f.left)} fill={pal.wallLeft} />
      <polygon points={poly(f.right)} fill={pal.wallRight} />
      {grid && wallPanels(f.D, f.C, H, grid[0], grid[1]).map((p, i) => (
        <polygon key={`l${i}`} className="iso-window" points={p} />
      ))}
      {grid && wallPanels(f.C, f.B, H, grid[0], grid[1]).map((p, i) => (
        <polygon key={`r${i}`} className="iso-window" points={p} />
      ))}
      {ridge > 0 ? (
        // A gable: two slopes meeting at a raised ridge, with the triangular
        // gable ends closing it off. The ridge runs along the longer axis.
        (() => {
          const alongW = w >= h;
          const rs = lift(alongW ? px(col, row + h / 2) : px(col + w / 2, row), H + ridge);
          const re = lift(alongW ? px(col + w, row + h / 2) : px(col + w / 2, row + h), H + ridge);
          const back = alongW ? [f.At, f.Bt, re, rs] : [f.At, f.Dt, re, rs];
          const front = alongW ? [f.Dt, f.Ct, re, rs] : [f.Bt, f.Ct, re, rs];
          const endA = alongW ? [f.At, f.Dt, rs] : [f.At, f.Bt, rs];
          const endB = alongW ? [f.Bt, f.Ct, re] : [f.Dt, f.Ct, re];
          return (
            <>
              <polygon points={poly(back)} fill={pal.roofBack} />
              <polygon points={poly(front)} fill={pal.roofFront} />
              <polygon points={poly(endA)} fill={pal.gable} />
              <polygon points={poly(endB)} fill={pal.gable} />
              <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
            </>
          );
        })()
      ) : (
        <>
          <polygon points={poly(f.top)} fill={pal.roof} />
          {/* Rooftop plant: the thing you actually see on a flat roof. */}
          {[[0.22, 0.3, 0.2, 0.22], [0.58, 0.52, 0.26, 0.2]].map(([fx, fy, fw, fh], i) => {
            const u = boxFaces(col + w * fx, row + h * fy, w * fw, h * fh, H, motif === 'works' ? 13 : 9);
            return (
              <g key={i}>
                <polygon className="iso-plant-side" points={poly(u.left)} />
                <polygon className="iso-plant-side" points={poly(u.right)} />
                <polygon className="iso-plant-top" points={poly(u.top)} />
              </g>
            );
          })}
        </>
      )}
      <text className="iso-label" x={lift(px(col + w / 2, row + h / 2), H + ridge + 12).x} y={lift(px(col + w / 2, row + h / 2), H + ridge + 12).y}>
        {t.name}
      </text>
    </g>
  );
}

const mk = (kind: string, name: string, facilityType?: FacilityType): Buildable =>
  ({ id: `${kind}-${facilityType ?? name}`, name, kind, facilityType, status: 'done',
     duration: 1, effects: { servesPopulation: 2000 } } as unknown as Buildable);

// A representative campus on the real footprint table.
const CAMPUS: { t: Buildable; row: number; col: number }[] = [
  { t: mk('building', 'Founders Hall'), row: 10, col: 10 },
  { t: mk('building', 'School of Sciences'), row: 10, col: 21 },
  { t: mk('dorm', 'Weston Residence'), row: 10, col: 32 },
  { t: mk('dorm', 'Ellery Residence'), row: 14, col: 32 },
  { t: mk('facility', 'Quad', 'quad'), row: 20, col: 12 },
  { t: mk('facility', 'Library', 'library'), row: 20, col: 21 },
  { t: mk('facility', 'Student Center', 'studentCenter'), row: 20, col: 32 },
  { t: mk('facility', 'Lab', 'lab'), row: 28, col: 12 },
  { t: mk('facility', 'Dining Hall', 'diningHall'), row: 26, col: 21 },
  { t: mk('facility', 'Recreation Center', 'recCenter'), row: 26, col: 32 },
  { t: mk('facility', 'Athletics Field', 'athleticsField'), row: 33, col: 10 },
  { t: mk('facility', 'Football Stadium', 'footballStadium'), row: 33, col: 22 },
];

const GRID_MIN = 4;
const GRID_MAX = 48;

// Fit the whole campus in frame: project every corner of every footprint,
// including its lifted roof, and scale that bounding box to the viewport.
// (A real implementation needs this too — an angled world is ~2x wider and
// ~half as tall as the same grid drawn flat, so the existing pan/zoom bounds
// maths does not carry over.)
function campusBounds() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const { t, row, col } of CAMPUS) {
    const { w, h } = footprintOf(t);
    const motif = motifOf(t);
    const top = HEIGHT[motif] + (RIDGE[motif] ?? 0) + 16;
    for (const [c, r] of [[col, row], [col + w, row], [col + w, row + h], [col, row + h]]) {
      for (const lifted of [0, top]) {
        const q = lift(px(c, r), lifted);
        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
        minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
      }
    }
  }
  return { minX, maxX, minY, maxY };
}

function Scene({ width, height, pad }: { width: number; height: number; pad: number }) {
  const lines: string[] = [];
  for (let r = GRID_MIN; r <= GRID_MAX; r++) {
    const a = px(GRID_MIN, r), b = px(GRID_MAX, r);
    lines.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  }
  for (let c = GRID_MIN; c <= GRID_MAX; c++) {
    const a = px(c, GRID_MIN), b = px(c, GRID_MAX);
    lines.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  }
  const plate = [px(GRID_MIN, GRID_MIN), px(GRID_MAX, GRID_MIN), px(GRID_MAX, GRID_MAX), px(GRID_MIN, GRID_MAX)];
  const bb = campusBounds();
  const scale = Math.min((width - pad * 2) / (bb.maxX - bb.minX), (height - pad * 2) / (bb.maxY - bb.minY));
  const tx = pad - bb.minX * scale + ((width - pad * 2) - (bb.maxX - bb.minX) * scale) / 2;
  const ty = pad - bb.minY * scale + ((height - pad * 2) - (bb.maxY - bb.minY) * scale) / 2;
  // Naive painter's pass: back to front by (row + col). Enough for
  // well-separated footprints; real occlusion needs a proper topological
  // sort, which is one of the costs this spike exists to expose.
  const order = [...CAMPUS].sort((a, b) => (a.row + a.col) - (b.row + b.col));
  return (
    <svg width={width} height={height} style={{ display: 'block', background: '#6d8c52' }}>
      <g transform={`translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${scale.toFixed(4)})`}>
        <polygon points={poly(plate)} fill="#7d9c60" />
        <path d={lines.join('')} stroke="rgba(42,56,28,0.10)" strokeWidth={1 / scale} fill="none" />
        {order.map(({ t, row, col }) => <Building key={t.id} t={t} row={row} col={col} />)}
      </g>
    </svg>
  );
}

const CSS = `
  body { margin: 0; background: #10182a; font-family: ui-sans-serif, system-ui, sans-serif; }
  .iso-roof { fill: #c9a227; }
  .iso-roof-back { fill: #d9b43a; }
  .iso-roof-front { fill: #b08c1d; }
  .iso-gable { fill: #a5831b; }
  .iso-ridge { stroke: rgba(42,56,28,0.35); stroke-width: 1.2; }
  .iso-wall-left { fill: #b9a97e; }
  .iso-wall-right { fill: #9c8d66; }
  .iso-window { fill: rgba(255,253,246,0.45); }
  .iso-plant-top { fill: rgba(42,56,28,0.30); }
  .iso-plant-side { fill: rgba(42,56,28,0.45); }
  .iso-ground-plate { fill: #a3c17d; }
  .iso-ground-mark { fill: none; stroke: rgba(255,253,246,0.45); stroke-width: 1.5; }
  .iso-pitch { fill: #8fae6b; }
  .iso-label { fill: #2b2417; font-family: Georgia, serif; font-size: 11px; text-anchor: middle; }
`;

createRoot(document.getElementById('root')!).render(
  <>
    <style>{CSS}</style>
    <Scene width={1500} height={900} pad={40} />
  </>,
);
