import type { Buildable, FacilityType } from '../state/types';
import { boxFaces, facePoint, lift, polyPoints, project, type Pt } from './isoProjection';
import GroundMarking, { StadiumField } from './groundMarkings';

// Architectural motifs: what makes a placed Buildable read as a BUILDING
// rather than as a coloured shape with a name on it.
//
// The TAXONOMY below is projection-independent — a hall is a hall whether
// you see its roof or its front — and survived the move from the flat map
// unchanged. What changed is everything under motifOf: on an angled map a
// building is a mass with a roof and two visible walls, so the facade
// details that were simply wrong drawn flat (windows, entrances) are now
// correct, because there are walls to put them on.
//
// House rules as ever: hand-rolled inline SVG, no icon library, no external
// art, no new dependency. Geometry here, colour in styles.css — with one
// deliberate exception noted at paletteFrom: the roof and wall tones are
// DERIVED from each building's tint at runtime, because there are ~22 tints
// and hand-authoring five shades of each would be 110 values to keep in sync
// with each other forever.

export type Motif =
  | 'hall'         // academic halls: the campus's landmarks — a deep gabled roof
  | 'residential'  // dorms: one long gable down a shallow block, ranked windows
  | 'portico'      // library / performing arts / gallery: flat roof, rooflights
  | 'pavilion'     // student centre, dining, health, grocery: low, a unit or two
  | 'hangar'       // rec centre, gym, arena, natatorium: clear-span vault
  | 'works'        // labs: low, flat, crowded with rooftop plant
  | 'grounds'      // quad, field, courts, diamond, pool: markings, no mass
  | 'bowl';        // the football stadium: stands around a gridiron

const FACILITY_MOTIFS: Record<FacilityType, Motif> = {
  library: 'portico',
  studentCenter: 'pavilion',
  diningHall: 'pavilion',
  recCenter: 'hangar',
  healthCenter: 'pavilion',
  quad: 'grounds',
  lab: 'works',
  gym: 'hangar',
  tennisCourts: 'grounds',
  // The rec pool is an open-air deck; the natatorium is a roofed competition
  // venue. Same water, different building — the same distinction styles.css
  // already draws between their two blues.
  pool: 'grounds',
  performingArtsCenter: 'portico',
  artGallery: 'portico',
  athleticsField: 'grounds',
  athleticsArena: 'hangar',
  athleticsDiamond: 'grounds',
  athleticsNatatorium: 'hangar',
  footballStadium: 'bowl',
  grocery: 'pavilion',
};

export function motifOf(t: Buildable): Motif {
  if (t.kind === 'building') return 'hall';
  if (t.kind === 'dorm') return 'residential';
  if (t.kind === 'facility' && t.facilityType) return FACILITY_MOTIFS[t.facilityType] ?? 'pavilion';
  return 'pavilion';
}

// How tall each motif stands, in screen units at zoom 1. A tile is TILE_H
// (32) deep, so a hall at 84 reads as roughly three storeys over its own
// footprint. This is the one dimension an angled camera ADDS: the flat map
// never had to have an opinion about how tall anything was.
const HEIGHT: Record<Motif, number> = {
  hall: 84, residential: 54, portico: 68, pavilion: 42, hangar: 56, works: 30, grounds: 0, bowl: 46,
};
// How far the ridge rises above the eaves, for the two motifs that are
// gabled. Everything else is flat-roofed, which is what those buildings
// actually are.
const RIDGE: Partial<Record<Motif, number>> = { hall: 30, residential: 20 };
// Windows per wall: [along the wall, up it].
const WALL_GRID: Partial<Record<Motif, [number, number]>> = {
  hall: [8, 3], residential: [10, 2], portico: [7, 2], pavilion: [6, 1], works: [4, 1], hangar: [7, 1],
};

// The building's full drawn height including its roof — what the label
// layer and the draw-order sort need in order to clear it.
export function heightOf(t: Buildable): number {
  const m = motifOf(t);
  return HEIGHT[m] + (RIDGE[m] ?? 0);
}

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => Math.max(0, Math.min(255, Math.round(v * factor))));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export interface Palette {
  roof: string; roofLit: string; roofShade: string; gable: string; wallLeft: string; wallRight: string;
}
// Five tones from one tint. Deriving rather than authoring keeps a single
// source of truth per building and guarantees every mass on the map is lit
// from the same direction — the upper left, which is the direction the flat
// map's own drop shadows already fell.
export function paletteFrom(tint: string): Palette {
  return {
    roof: tint,
    roofLit: shade(tint, 1.07),
    roofShade: shade(tint, 0.84),
    gable: shade(tint, 0.76),
    wallLeft: shade(tint, 0.93),
    wallRight: shade(tint, 0.75),
  };
}

// Windows on one wall, in that wall's own (u along, v up) coordinates — so
// they come out correctly skewed with no projection maths of their own.
function windows(origin: Pt, along: Pt, height: number, cols: number, rows: number, key: string) {
  const out: React.JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u0 = (c + 0.28) / cols; const u1 = (c + 0.72) / cols;
      const v0 = (r + 0.3) / rows; const v1 = (r + 0.74) / rows;
      out.push(
        <polygon
          key={`${key}${r}-${c}`}
          className="iso-window"
          points={polyPoints([
            facePoint(origin, along, height, u0, v0),
            facePoint(origin, along, height, u1, v0),
            facePoint(origin, along, height, u1, v1),
            facePoint(origin, along, height, u0, v1),
          ])}
        />,
      );
    }
  }
  return out;
}

// A small box standing on a roof: plant, a stair head, a lift overrun — the
// thing you actually see on a flat roof from above and to one side.
function RoofBox({ col, row, w, h, base, height, tint }: {
  col: number; row: number; w: number; h: number; base: number; height: number; tint: string;
}) {
  const f = boxFaces(col, row, w, h, base, height);
  return (
    <>
      <polygon points={polyPoints(f.left)} fill={shade(tint, 0.66)} />
      <polygon points={polyPoints(f.right)} fill={shade(tint, 0.56)} />
      <polygon points={polyPoints(f.top)} fill={shade(tint, 0.8)} />
    </>
  );
}

export default function BuildingMotif({ t, p, tint, developing }: {
  t: Buildable;
  p: { row: number; col: number; w: number; h: number };
  tint: string;
  developing: boolean;
}) {
  const motif = motifOf(t);
  const { row, col, w, h } = p;
  const pal = paletteFrom(tint);

  // Open ground has no mass at all — and no construction state worth
  // drawing either, since there is nothing to raise.
  if (motif === 'grounds') {
    return <GroundMarking facilityType={t.facilityType} col={col} row={row} w={w} h={h} />;
  }

  // A site under construction is a footprint pegged out and a frame barely
  // off the ground, not a building with the roof left off. The mass RISING
  // is what completion looks like — which is a thing an angled map can show
  // and a flat one never could.
  const full = HEIGHT[motif];
  const H = developing ? Math.max(4, full * 0.16) : full;
  const ridge = developing ? 0 : (RIDGE[motif] ?? 0);
  const f = boxFaces(col, row, w, h, 0, H);
  const grid = WALL_GRID[motif];

  if (motif === 'bowl') {
    // The stands: a ring around a field. The interior is drawn FIRST and
    // covers the whole opening (see StadiumField) — the first pass left the
    // gap between the pitch edge and the stands showing bare lawn and grid
    // lines, which read as a hole in the map rather than as a stadium.
    const inset = 0.17;
    const iCol = col + w * inset; const iRow = row + h * inset;
    const iW = w * (1 - inset * 2); const iH = h * (1 - inset * 2);
    const inner = boxFaces(iCol, iRow, iW, iH, 0, H);
    return (
      <>
        {!developing && <StadiumField col={iCol} row={iRow} w={iW} h={iH} />}
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {/* evenodd, so the bowl is genuinely open rather than a filled slab
            sitting on top of the field that was just drawn. */}
        <path
          d={`M${polyPoints(f.top).replace(/ /g, 'L')}Z M${polyPoints(inner.top).replace(/ /g, 'L')}Z`}
          fillRule="evenodd"
          fill={pal.roof}
        />
        {/* The inner faces of the FAR stands — both of them. Drawing only
            one read as a dark slab dropped across the field rather than as
            the inside of a bowl; the pair reads as depth because they meet
            at the back corner the way the outer walls meet at the front. */}
        <polygon points={polyPoints([inner.At, inner.Bt, inner.B, inner.A])} fill={shade(tint, 0.72)} />
        <polygon points={polyPoints([inner.At, inner.Dt, inner.D, inner.A])} fill={shade(tint, 0.62)} />
      </>
    );
  }

  const gabled = ridge > 0;
  const alongW = w >= h;
  const rs = lift(alongW ? project(col, row + h / 2) : project(col + w / 2, row), H + ridge);
  const re = lift(alongW ? project(col + w, row + h / 2) : project(col + w / 2, row + h), H + ridge);

  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {!developing && grid && windows(f.D, f.C, H, grid[0], grid[1], 'l')}
      {!developing && grid && windows(f.C, f.B, H, grid[0], grid[1], 'r')}

      {gabled ? (
        <>
          <polygon points={polyPoints(alongW ? [f.At, f.Bt, re, rs] : [f.At, f.Dt, re, rs])} fill={pal.roofLit} />
          <polygon points={polyPoints(alongW ? [f.Dt, f.Ct, re, rs] : [f.Bt, f.Ct, re, rs])} fill={pal.roofShade} />
          <polygon points={polyPoints(alongW ? [f.At, f.Dt, rs] : [f.At, f.Bt, rs])} fill={pal.gable} />
          <polygon points={polyPoints(alongW ? [f.Bt, f.Ct, re] : [f.Dt, f.Ct, re])} fill={pal.gable} />
          <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
        </>
      ) : motif === 'hangar' && !developing ? (
        // A clear-span roof: a shallow raised deck with a glazed strip along
        // its ridge, which is what actually lights a gym or a pool hall.
        <>
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          <polygon
            points={polyPoints(alongW
              ? [lift(project(col, row + h * 0.28), H + 9), lift(project(col + w, row + h * 0.28), H + 9),
                lift(project(col + w, row + h * 0.72), H + 9), lift(project(col, row + h * 0.72), H + 9)]
              : [lift(project(col + w * 0.28, row), H + 9), lift(project(col + w * 0.28, row + h), H + 9),
                lift(project(col + w * 0.72, row + h), H + 9), lift(project(col + w * 0.72, row), H + 9)])}
            fill={pal.roofLit}
          />
          <polygon
            className="iso-rooflight"
            points={polyPoints(alongW
              ? [lift(project(col + w * 0.08, row + h * 0.42), H + 10), lift(project(col + w * 0.92, row + h * 0.42), H + 10),
                lift(project(col + w * 0.92, row + h * 0.58), H + 10), lift(project(col + w * 0.08, row + h * 0.58), H + 10)]
              : [lift(project(col + w * 0.42, row + h * 0.08), H + 10), lift(project(col + w * 0.42, row + h * 0.92), H + 10),
                lift(project(col + w * 0.58, row + h * 0.92), H + 10), lift(project(col + w * 0.58, row + h * 0.08), H + 10)])}
          />
        </>
      ) : (
        <>
          <polygon points={polyPoints(f.top)} fill={pal.roof} />
          {!developing && motif === 'portico' && [0.26, 0.5, 0.74].map((v) => (
            // Libraries and galleries are top-lit. Rooflights are both true
            // and the thing that tells them apart from a plain shed.
            [0.24, 0.54].map((u) => (
              <polygon
                key={`${u}-${v}`}
                className="iso-rooflight"
                points={polyPoints(boxFaces(col + w * u, row + h * v, w * 0.22, h * 0.16, H + 1, 0).top)}
              />
            ))
          ))}
          {!developing && (motif === 'works' || motif === 'pavilion') && (
            // A lab's roof is the most crowded on campus; a pavilion's
            // carries a unit or two. Same vocabulary, different density.
            (motif === 'works'
              ? [[0.12, 0.18, 0.28, 0.26], [0.48, 0.44, 0.32, 0.28], [0.18, 0.6, 0.22, 0.22]]
              : [[0.18, 0.26, 0.26, 0.24], [0.54, 0.52, 0.28, 0.22]]
            ).map(([fx, fy, fw, fh], i) => (
              <RoofBox
                key={i}
                col={col + w * fx} row={row + h * fy}
                w={w * fw} h={h * fh}
                base={H} height={motif === 'works' ? 12 : 9}
                tint={tint}
              />
            ))
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// Building tints. These moved OUT of styles.css: the motifs above derive
// five tones from each tint at runtime, so the tint has to be a value this
// code can read rather than a rule a stylesheet applies. Keeping both would
// have meant one source of truth for the flat colour and another for every
// shade of it, drifting apart at the first retune.
//
// Facility values and the dorm shades are carried over UNCHANGED from the
// stylesheet's own kind-/tint- table, so no placed building changes colour.
// ---------------------------------------------------------------------
const BUILDING_TINT = '#c9a227';           // academic halls: one fixed landmark gold, never id-hashed
const DORM_TINTS = ['#cfe0cf', '#c2d8c1', '#d8e6d3', '#c8ddd0'];
const FACILITY_TINTS: Record<FacilityType, string> = {
  library: '#d9cba3',
  studentCenter: '#e0cdb4',
  diningHall: '#e6d3ae',
  recCenter: '#d3cdb2',
  healthCenter: '#e3d6c6',
  quad: '#cfdcc4',
  lab: '#cdd0c0',
  gym: '#d6c9a0',
  tennisCourts: '#d1d9b8',
  pool: '#b9cdd4',
  performingArtsCenter: '#d8c2c9',
  artGallery: '#cbc0d3',
  athleticsField: '#c9d9a8',
  athleticsArena: '#cdbfa0',
  athleticsDiamond: '#d7c49a',
  athleticsNatatorium: '#a9c7cf',   // a distinct blue from the rec pool's
  footballStadium: '#d4a94f',       // the pinnacle venue, boldest of the facility tints
  grocery: '#ecd9a4',
};

// Dorms take their shade from a hash of their own id, so neighbouring
// residences differ; every other kind is fixed by what it is.
function hashTint(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000003;
  return h % DORM_TINTS.length;
}

export function tintFor(t: Buildable): string {
  if (t.kind === 'building') return BUILDING_TINT;
  if (t.kind === 'dorm') return DORM_TINTS[hashTint(t.id)];
  if (t.kind === 'facility' && t.facilityType) return FACILITY_TINTS[t.facilityType] ?? '#dccfa6';
  return '#dccfa6';
}
