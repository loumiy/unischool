import type { Buildable, Vernacular } from '../state/types';
import { boxFaces, facePoint, lift, polyPoints, project, projectedCircle, visibleWalls, wallOf, type BoxFaces, type FaceDir, type Pt } from './isoProjection';
import { depthOrder, type DepthBox } from './depthSort';
import { SUN_FROM, WALL_LIGHT } from './light';
import { METRES_PER_TILE, STOREY, across, up } from './campusScale';
import { shade } from './tint';
import {
  BASE_COURSE, CORNICE, EAVES_COURSE, ENTABLATURE, FLOOR_COURSE, SILL_HEIGHT, STEP_OVERHANG, TOWER_PINNACLE_PLAN, TOWER_PINNACLE_RISE,
  VERNACULARS, WINDOW_HEIGHT, baysAcross, eavesOf, hasTrim, paneShapeOf, rankSills, ridgeOf, roofFor, storeysOf, wallShadeOf, windowOutline,
  type DoorDimensions, type Material, type StonePalette, type WindowShape,
} from './buildingSpec';
import {
  Arcade, Balustrade, BellGable, Cylinder, CurtainWall, Door, EavesBrackets, EntranceSteps, GiltFinial, HippedRoof, LEAD, MansardRoof,
  Merlons, PavilionTower, Piers, RoofFlag, StageOpenings, TowerShaft, WallBand,
  againstWall, arcadeHeight, backSlopesFirst, gableEnds, gableSlopes, nearRing, opposite, outsideWall, outwardOf, paletteFrom,
  pyramid, ridgeChimneys, sideFaces, snowOnRoofs, wallSpan, windows, type Palette,
} from './buildingMotifs';
import { TiedPortico, flatRoofAt, mansardRoofAt, porticoReach, rotundaRoofAt, toneSlopes } from './porticoTie';

// The library (Plan 87F): a campus's centrepiece, so it is drawn as one,
// not as the flat civic box with rooflights it was in eight sets of nine.
// Every set gives it a raised reading room (its top two storeys one rank of
// tall windows, over the stack floors below), a way in up a flight of steps,
// and the crown its own precedent has:
//
//   Georgian, Classical  a rotunda over the reading room and a pedimented
//                        portico on a podium (UVA's Rotunda, Columbia's Low)
//   Gothic               a nave between low aisles, tall traceried windows,
//                        and a tall crossing tower (Yale's Sterling)
//   Modern               a glazed reading room lifted on pilotis over a
//                        recessed ground floor, under a deep slab (Aalto)
//   Mission              a tiled hip, an arcade and an espadana (Stanford)
//   Tudor                a steep gabled hall, cross-gables with oriels
//   Italianate           a low bracketed hip, a campanile and an arched loggia
//   Second Empire        a mansard with a central pavilion and a portico
//   Art Deco             a stepped, fluted central tower and a tall portal
//
// The storeys a renovation adds go in under the reading room, so the look
// holds from three storeys to six. While a floor goes up (an extension) the
// crown is off and the scaffold stands on the flat roof (BuildingMotif).

export interface LibraryProps {
  t: Buildable;
  p: { row: number; col: number; w: number; h: number };
  material: Material;
  vernacular: Vernacular;
  // The mass's palette (snow laid on its roofs) and stone.
  pal: Palette;
  stone: StonePalette;
  // The walls' standing height, and whether a floor is going up on them.
  H: number;
  extending: boolean;
  snow: number;
}

// The way in: a pair of tall doors up a flight (the formal portal's size, a
// little wider), on every wall the camera sees.
const LIBRARY_DOOR: DoorDimensions = {
  family: 'formal', widthTiles: across(3.6), height: up(4.4), threshold: up(1.5), treads: 6,
};
// The reading room's windows: one per bay, wider than a sash.
const READING_WINDOW = across(2.0);
// Its head this far under the eaves.
const READING_HEAD_DROP = up(1.7);
// Leaded glass in the tall windows, dark from outside as a chapel's are.
const READING_GLASS = 'rgba(46, 58, 78, 0.72)';

interface Face { dir: FaceDir; o: Pt; a: Pt; span: number }
function facesOf(f: BoxFaces): Face[] {
  return [
    { dir: f.dir.CD, o: f.D, a: f.C, span: f.spanLeft },
    { dir: f.dir.BC, o: f.C, a: f.B, span: f.spanRight },
  ];
}
const isRowWall = (dir: FaceDir) => dir === 'posRow' || dir === 'negRow';

// A path of openings on one face, each [u0, u1, z0, z1] (heights in units).
function openings(face: Face, H: number, list: Array<[number, number, number, number]>, shape: WindowShape): string {
  return list.map(([u0, u1, z0, z1]) => `M${polyPoints(windowOutline(shape, u0, u1, z0 / H, z1 / H)
    .map(([u, v]) => facePoint(face.o, face.a, H, u, v))).replace(/ /g, 'L')}Z`).join('');
}

// Tracery in a tall light: a mullion, and a transom near the head.
function tracery(face: Face, H: number, list: Array<[number, number, number, number]>, tone: string, key: string) {
  const d = list.map(([u0, u1, z0, z1]) => {
    const uc = (u0 + u1) / 2;
    const a = facePoint(face.o, face.a, H, uc, z0 / H); const b = facePoint(face.o, face.a, H, uc, (z0 + (z1 - z0) * 0.86) / H);
    const tz = (z0 + (z1 - z0) * 0.62) / H;
    const c = facePoint(face.o, face.a, H, u0, tz); const e = facePoint(face.o, face.a, H, u1, tz);
    return `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${b.x.toFixed(2)},${b.y.toFixed(2)}M${c.x.toFixed(2)},${c.y.toFixed(2)}L${e.x.toFixed(2)},${e.y.toFixed(2)}`;
  }).join('');
  return d ? <path key={key} d={d} stroke={tone} strokeWidth={0.7} fill="none" /> : null;
}

// The reading room and the stacks under it, on one face: a rank of ordinary
// windows a storey for all but the top two, then one rank of tall ones
// through both. `skip` is the u range kept clear below `skipTop` (a door, a
// porch); `from` the height the lowest rank may start at (over an arcade).
function readingWalls({ face, H, storeys, shape, tallShape = shape, glass, stone, skip, skipTop = 0, from = 0, lights = 1, tall = true, key }: {
  face: Face; H: number; storeys: number; shape: WindowShape; tallShape?: WindowShape; glass: string; stone: StonePalette;
  skip?: [number, number]; skipTop?: number; from?: number; lights?: 1 | 2; tall?: boolean; key: string;
}) {
  const bays = baysAcross(face.span);
  const lower = Math.max(0, storeys - (tall ? 2 : 0));
  const sills = rankSills(lower).filter((z) => z >= from);
  const clear = (u0: number, u1: number, z0: number) => !skip || z0 >= skipTop || u1 < skip[0] || u0 > skip[1];
  const small = windows(face.o, face.a, H, face.span, sills, across(1.5), `${key}s`, shape, glass,
    skip ? { u0: skip[0], u1: skip[1], v0: 0, v1: skipTop / H } : undefined, lights);
  if (!tall) return <>{small}</>;
  const z0 = Math.max(from, lower * STOREY) + SILL_HEIGHT;
  const z1 = H - READING_HEAD_DROP;
  const half = Math.min(READING_WINDOW / face.span, 0.7 / bays) / 2;
  const list: Array<[number, number, number, number]> = [];
  for (let b = 0; b < bays; b++) {
    const c = (b + 0.5) / bays;
    if (z1 - z0 > WINDOW_HEIGHT && clear(c - half, c + half, z0)) list.push([c - half, c + half, z0, z1]);
  }
  const trim = stone.trim === 'none' ? 'rgba(235, 238, 240, 0.7)' : stone.trim;
  return (
    <>
      {small}
      {list.length > 0 && <path key={`${key}t`} className="iso-window" fill={READING_GLASS} d={openings(face, H, list, tallShape)} />}
      {tracery(face, H, list, trim, `${key}tr`)}
    </>
  );
}

// Plinth, a string course over the ground floor and the cornice.
function courses(face: Face, H: number, stone: StonePalette, key: string, cornice = true) {
  if (stone.trim === 'none') return null;
  return (
    <g key={key}>
      <WallBand origin={face.o} along={face.a} wallHeight={H} from={0} to={BASE_COURSE * 1.6} className="iso-plinth" />
      {H > STOREY * 1.5 && <WallBand origin={face.o} along={face.a} wallHeight={H} from={STOREY - FLOOR_COURSE} to={STOREY + FLOOR_COURSE * 0.6} className="iso-cornice" />}
      {cornice && <WallBand origin={face.o} along={face.a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />}
    </g>
  );
}

// The door on a face at its middle, and the flight before it, `out` tiles
// from the wall's plane (a portico's depth).
function doorway(face: Face, H: number, d: DoorDimensions, shape: 'rect' | 'arched') {
  return <Door d={d} origin={face.o} along={face.a} wallHeight={H} span={face.span} side={face.dir} shape={shape} />;
}
function flight(col: number, row: number, w: number, h: number, dir: FaceDir, out: number, widthTiles: number, rise: number, treads: number, stone: StonePalette) {
  const span = wallSpan(w, h, dir);
  const at = outsideWall(col, row, w, h, dir, span / 2, out);
  const o = outwardOf(dir);
  const d: DoorDimensions = { ...LIBRARY_DOOR, widthTiles: Math.max(0, widthTiles - STEP_OVERHANG * 2), threshold: rise, treads };
  return <EntranceSteps key={`st${dir}`} d={d} centreCol={at.col} centreRow={at.row} outCol={o.col} outRow={o.row} span={span * 2} stone={stone} />;
}

// The u range a centred width takes on a face.
const centred = (width: number, span: number): [number, number] => [0.5 - width / span / 2, 0.5 + width / span / 2];

// --- The rotunda (Georgian, Classical) -----------------------------------

// A drum with tall windows round it, a cornice, and a dome built as rings
// of its own latitude painted bottom up (so it is a solid of revolution
// from every side and pitch), its ribs, and a lantern.
function Rotunda({ cc, cr, r, base, drumRise, domeRise, drum, dome, stone, glass }: {
  cc: number; cr: number; r: number; base: number; drumRise: number; domeRise: number;
  drum: string; dome: string; stone: StonePalette; glass: string;
}) {
  const ring = (rad: number, z: number, n = 40) => projectedCircle(cc, cr, rad, n).map((q) => lift(q, z));
  const N = 40;
  const lo = ring(r, base, N); const hi = ring(r, base + drumRise, N);
  const centre = lift(project(cc, cr), base);
  // The drum's near half as strips, each lit by the way it faces the sun.
  const near = (i: number) => lo[i].y >= centre.y - 0.01 && lo[(i + 1) % N].y >= centre.y - 0.01;
  const tone = (a: number) => shade(drum, 0.8 + 0.34 * Math.max(0, Math.cos(a) * SUN_FROM.col + Math.sin(a) * SUN_FROM.row));
  const strips: React.JSX.Element[] = [];
  for (let i = 0; i < N; i++) {
    if (!near(i)) continue;
    const j = (i + 1) % N;
    const a = ((i + 0.5) / N) * Math.PI * 2;
    strips.push(<polygon key={`d${i}`} points={polyPoints([lo[i], lo[j], hi[j], hi[i]])} fill={tone(a)} stroke={tone(a)} strokeWidth={0.4} />);
  }
  // Tall round-headed windows, one every few strips, on the near half.
  const win: string[] = [];
  const W = 12;
  for (let k = 0; k < W; k++) {
    const a = ((k + 0.5) / W) * Math.PI * 2;
    const p0 = lift(project(cc + Math.cos(a) * r, cr + Math.sin(a) * r), base);
    if (p0.y < centre.y + 0.25 * Math.abs(lo[N / 4].y - centre.y)) continue;
    const da = (Math.PI * 2) / W * 0.2;
    const at = (b: number, z: number) => lift(project(cc + Math.cos(b) * r * 1.002, cr + Math.sin(b) * r * 1.002), z);
    const z0 = base + drumRise * 0.2; const z1 = base + drumRise * 0.66; const zt = base + drumRise * 0.8;
    win.push(`M${[at(a - da, z0), at(a + da, z0), at(a + da, z1), at(a, zt), at(a - da, z1)].map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join('L')}Z`);
  }
  // The cornice: a ring a little proud of the drum.
  const cornice = ring(r * 1.07, base + drumRise, N);
  const corniceSide = [...nearRing(ring(r * 1.07, base + drumRise - up(0.7), N)), ...nearRing(cornice).reverse()];
  // The dome as bands of latitude, darker low, lit toward the crown.
  const top = base + drumRise;
  const bands: React.JSX.Element[] = [];
  const B = 9;
  for (let i = 0; i <= B; i++) {
    const lat = (i / B) * (Math.PI / 2) * 0.96;
    const rr = r * Math.cos(lat);
    const z = top + domeRise * Math.sin(lat);
    bands.push(<polygon key={`b${i}`} points={polyPoints(ring(rr, z, 36))} fill={shade(dome, 0.8 + 0.22 * (i / B))} />);
  }
  // Ribs on the near half: meridians from the cornice to the eye.
  const ribs: string[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const foot = lift(project(cc + Math.cos(a) * r, cr + Math.sin(a) * r), top);
    if (foot.y < lift(centre, drumRise).y - 0.01) continue;
    const pts: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const lat = (i / 8) * (Math.PI / 2) * 0.86;
      pts.push(lift(project(cc + Math.cos(a) * r * Math.cos(lat), cr + Math.sin(a) * r * Math.cos(lat)), top + domeRise * Math.sin(lat)));
    }
    ribs.push(`M${pts.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join('L')}`);
  }
  // The lantern: a small drum of columns, its own cap, a gilt finial.
  const lr = r * 0.2; const lz = top + domeRise * 0.97; const lh = up(2.6);
  const capTop = lift(project(cc, cr), lz + lh + up(1.3));
  return (
    <g className="lib-rotunda">
      {strips}
      {win.length > 0 && <path className="iso-window" fill={glass} d={win.join('')} />}
      <polygon points={polyPoints(corniceSide)} fill={shade(stone.trim === 'none' ? stone.towerStone : stone.trim, 0.86)} />
      <polygon points={polyPoints(cornice)} fill={shade(stone.trim === 'none' ? stone.towerStone : stone.trim, 0.96)} />
      {bands}
      <path d={ribs.join('')} stroke={shade(dome, 0.66)} strokeWidth={0.7} fill="none" />
      <Cylinder cc={cc} cr={cr} r={lr} z0={lz} z1={lz + lh} fill={shade(stone.towerStone, 0.95)} />
      <polygon points={polyPoints([...nearRing(ring(lr * 1.15, lz + lh, 16)), capTop])} fill={shade(dome, 0.9)} />
      <polygon points={polyPoints([...nearRing(ring(lr * 1.15, lz + lh, 16)).reverse(), capTop])} fill={shade(dome, 0.9)} />
      <GiltFinial at={capTop} rise={up(2.2)} stone={stone} />
    </g>
  );
}

// --- The temple front ----------------------------------------------------

// A portico on a podium against wall `dir`: round columns under an
// entablature and a pediment pitched to its width, roofed back to the wall,
// the podium reached up a wide flight. The wall behind is shaded.
function TemplePortico({ col, row, w, h, dir, width, depth, podium, height, columns, stone, pal, arches = false }: {
  col: number; row: number; w: number; h: number; dir: FaceDir;
  width: number; depth: number; podium: number; height: number; columns: number;
  stone: StonePalette; pal: Palette;
  // An arched loggia (Italianate) in place of columns and pediment.
  arches?: boolean;
}) {
  const span = wallSpan(w, h, dir);
  const along0 = span / 2 - width / 2;
  const stoneT = stone.trim === 'none' ? stone.towerStone : stone.trim;
  const base = againstWall(col, row, w, h, dir, along0, width, depth);
  const pf = boxFaces(base.col, base.row, base.w, base.h, 0, podium);
  // The wall behind, in shadow.
  const wall = wallOf(boxFaces(col, row, w, h, 0, podium + height), dir);
  const [u0, u1] = centred(width, span);
  const shadow = [facePoint(wall.origin, wall.along, podium + height, u0, podium / (podium + height)), facePoint(wall.origin, wall.along, podium + height, u1, podium / (podium + height)),
    facePoint(wall.origin, wall.along, podium + height, u1, 1), facePoint(wall.origin, wall.along, podium + height, u0, 1)];
  const ent = boxFaces(base.col, base.row, base.w, base.h, podium + height, ENTABLATURE);
  const front = wallOf(ent, dir);
  const out = outwardOf(dir);
  const back = (q: Pt) => {
    const o0 = project(0, 0); const o1 = project(-out.col * depth, -out.row * depth);
    return { x: q.x + o1.x - o0.x, y: q.y + o1.y - o0.y };
  };
  const lit = WALL_LIGHT[dir];
  if (arches) {
    // A loggia: a box with round arches cut through its front and sides,
    // a flat top with a balustrade.
    const lf = boxFaces(base.col, base.row, base.w, base.h, podium, height + ENTABLATURE);
    const lfront = wallOf(lf, dir);
    const n = 3;
    const holes = Array.from({ length: n }, (_, i) => windowOutline('arched', (i + 0.16) / n, (i + 0.84) / n, 0, 0.76));
    const frontPath = [
      `M${[lfront.origin, lfront.along, lift(lfront.along, height + ENTABLATURE), lift(lfront.origin, height + ENTABLATURE)].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`,
      ...holes.map((hl) => `M${hl.map(([u, v]) => facePoint(lfront.origin, lfront.along, height + ENTABLATURE, u, v)).map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`),
    ].join('');
    const sideFace = lfront.poly === lf.left ? { o: lf.C, a: lf.B } : { o: lf.D, a: lf.C };
    const sideDir = lfront.poly === lf.left ? lf.dir.BC : lf.dir.CD;
    const sideHole = windowOutline('arched', 0.22, 0.78, 0, 0.76).map(([u, v]) => facePoint(sideFace.o, sideFace.a, height + ENTABLATURE, u, v));
    const sidePath = `M${[sideFace.o, sideFace.a, lift(sideFace.a, height + ENTABLATURE), lift(sideFace.o, height + ENTABLATURE)].map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}ZM${sideHole.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}Z`;
    return (
      <>
        {sideFaces(pf, shade(stoneT, 0.86), shade(stoneT, 0.72))}
        <polygon className="iso-step-tread" points={polyPoints(pf.top)} fill={shade(stoneT, 0.95)} />
        <polygon points={polyPoints(shadow)} fill="rgba(28, 38, 46, 0.45)" />
        <path fillRule="evenodd" d={sidePath} fill={shade(pal.wall[sideDir], 1.0)} />
        <path fillRule="evenodd" d={frontPath} fill={pal.wall[dir]} />
        <WallBand origin={lfront.origin} along={lfront.along} wallHeight={height + ENTABLATURE} from={height} to={height + ENTABLATURE} className="iso-cornice" />
        <polygon points={polyPoints(lf.top)} fill={pal.roofDeck} />
        <Balustrade col={base.col} row={base.row} w={base.w} h={base.h} base={podium + height + ENTABLATURE} outward={dir} pal={pal} stone={stone} />
      </>
    );
  }
  // Columns along the front, round, back to front.
  const r = across(0.62);
  const shafts = Array.from({ length: columns }, (_, i) => {
    const along = along0 + r + across(0.2) + (i * (width - 2 * r - across(0.4))) / (columns - 1);
    const at = outsideWall(col, row, w, h, dir, along, depth - r - across(0.25));
    return { col: at.col - r, row: at.row - r, w: 2 * r, h: 2 * r };
  });
  const mid = { x: (front.origin.x + front.along.x) / 2, y: (front.origin.y + front.along.y) / 2 };
  const rise = up((width * METRES_PER_TILE / 2) * 0.27);
  const eaveL = lift(front.origin, ENTABLATURE); const eaveR = lift(front.along, ENTABLATURE);
  const apex = lift(mid, ENTABLATURE + rise);
  const inset = (q: Pt, s: number) => ({ x: q.x + s * 5, y: q.y });
  return (
    <>
      {sideFaces(pf, shade(stoneT, 0.86), shade(stoneT, 0.72))}
      <polygon className="iso-step-tread" points={polyPoints(pf.top)} fill={shade(stoneT, 0.95)} />
      <polygon points={polyPoints(shadow)} fill="rgba(28, 38, 46, 0.32)" />
      {depthOrder(shafts).map((c, i) => (
        <g key={i}>
          <Cylinder cc={c.col + r} cr={c.row + r} r={r * 0.82} z0={podium} z1={podium + height} fill={shade(stone.towerStone, 0.98)} />
          <Cylinder cc={c.col + r} cr={c.row + r} r={r} z0={podium + height - up(0.5)} z1={podium + height} fill={shade(stone.towerStone, 1.02)} />
        </g>
      ))}
      {sideFaces(ent, shade(stone.towerStone, 0.92), shade(stone.towerStone, 0.76))}
      <polygon points={polyPoints(ent.top)} fill={shade(stone.towerStone, 1.0)} />
      <polygon points={polyPoints([eaveL, apex, back(apex), back(eaveL)])} fill={shade(pal.roof, 1.0)} />
      <polygon points={polyPoints([apex, eaveR, back(eaveR), back(apex)])} fill={shade(pal.roof, 0.82)} />
      <polygon points={polyPoints([eaveL, eaveR, apex])} fill={shade(stone.towerStone, lit)} />
      <polygon points={polyPoints([inset(lift(front.origin, ENTABLATURE + up(0.35)), 1), inset(lift(front.along, ENTABLATURE + up(0.35)), -1), lift(mid, ENTABLATURE + rise - up(0.4))])}
        fill={shade(stone.towerStone, lit * 0.86)} />
    </>
  );
}

// --- The schemes ---------------------------------------------------------

type Scheme = 'rotunda' | 'gothic' | 'modern' | 'mission' | 'tudor' | 'campanile' | 'pavilion' | 'deco';
const SCHEMES: Record<Vernacular, Scheme> = {
  georgian: 'rotunda', classical: 'rotunda', gothic: 'gothic', modern: 'modern', mission: 'mission',
  tudor: 'tudor', italianate: 'campanile', secondEmpire: 'pavilion', artDeco: 'deco',
};

// The vernacular's pitched roof, on a library whose walls are the civic
// stone and whose own roof was a flat deck.
function pitchedPalette({ t, material, vernacular, snow }: LibraryProps): Palette {
  const roof = roofFor(vernacular).pitchedRoof ?? VERNACULARS[vernacular].materials.brickRed.roof;
  return snowOnRoofs(paletteFrom({ wall: material.wall, roof }, wallShadeOf(t)), snow);
}

export default function LibraryMass(props: LibraryProps) {
  switch (SCHEMES[props.vernacular]) {
    case 'gothic': return <GothicLibrary {...props} />;
    case 'modern': return <ModernLibrary {...props} />;
    default: return <CivicLibrary {...props} />;
  }
}

// The common mass: a box of the footprint with the reading room in its top
// storeys, its entrance and its crown by scheme (all but Gothic and Modern).
function CivicLibrary(props: LibraryProps) {
  const { t, p, vernacular, pal: flatPal, stone, H, extending } = props;
  const { col, row, w, h } = p;
  const scheme = SCHEMES[vernacular];
  const storeys = storeysOf(t) - (extending ? 1 : 0);
  const shape = paneShapeOf(t, vernacular);
  const tallShape: WindowShape = shape === 'rect' && scheme !== 'tudor' && scheme !== 'pavilion' && scheme !== 'deco' ? 'arched' : shape === 'ribbon' ? 'rect' : shape;
  const trim = hasTrim(vernacular);
  const pitched = scheme === 'mission' || scheme === 'tudor' || scheme === 'campanile' || scheme === 'pavilion';
  const pal = pitched ? pitchedPalette(props) : flatPal;
  const f = boxFaces(col, row, w, h, 0, H);
  const faces = facesOf(f);
  const seen = visibleWalls();
  const fronts: FaceDir[] = [seen.left, seen.right];
  const alongW = w >= h;
  const cc = col + w / 2; const cr = row + h / 2;

  // The entrance's width and depth on each front.
  const porticoed = scheme === 'rotunda' || scheme === 'pavilion' || scheme === 'campanile';
  const podium = LIBRARY_DOOR.threshold;
  const porticoDepth = across(3.8);
  const porticoWidth = (span: number) => Math.min(span * (scheme === 'rotunda' && vernacular === 'classical' ? 0.5 : 0.42), across(scheme === 'campanile' ? 16 : 22));
  const porticoHeight = Math.min(H - podium - ENTABLATURE - up(0.6), STOREY * 2.1);
  const door = { ...LIBRARY_DOOR, threshold: porticoed ? podium : scheme === 'mission' ? 0 : LIBRARY_DOOR.threshold };
  const doorShape: 'rect' | 'arched' = shape === 'arched' || scheme === 'mission' || scheme === 'campanile' ? 'arched' : 'rect';
  const eaves = pitched ? eavesOf(vernacular) : 0;

  // Mission's arcade, Tudor's cross-gable: what stands on each front.
  const arcadeH = Math.min(arcadeHeight(H), STOREY * 1.25);
  const crossW = Math.min(across(18), Math.min(w, h) * 0.56);
  const ridge = scheme === 'tudor' ? up(9.5) : scheme === 'mission' ? up(3.4) : scheme === 'campanile' ? up(2.8) : scheme === 'pavilion' ? up(5.6) : 0;

  const wallFace = (face: Face, i: number) => {
    const skip = centred(Math.max(door.widthTiles * 1.5, scheme === 'tudor' && isRowWall(face.dir) === alongW ? crossW : 0), face.span);
    const skipTop = door.threshold + door.height + up(1.2);
    return (
      <g key={`f${i}`}>
        {courses(face, H, stone, `c${i}`, !pitched || eaves === 0)}
        {readingWalls({
          face, H, storeys, shape: shape === 'ribbon' ? 'rect' : shape, tallShape, glass: stone.glass, stone, skip, skipTop,
          from: scheme === 'mission' ? arcadeH : 0, lights: scheme === 'tudor' ? 2 : 1, key: `w${i}`,
        })}
        {doorway(face, H, door, doorShape)}
      </g>
    );
  };

  // The roof, then what stands on it.
  const roof = (() => {
    if (extending) return <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />;
    const rc = col - eaves; const rr = row - eaves; const rw = w + eaves * 2; const rh = h + eaves * 2;
    switch (scheme) {
      case 'mission':
      case 'campanile':
        return <HippedRoof col={rc} row={rr} w={rw} h={rh} base={H} rise={ridge} pal={pal} />;
      case 'pavilion':
        return <MansardRoof col={rc} row={rr} w={rw} h={rh} base={H} rise={ridge} pal={pal} stone={stone} />;
      case 'tudor': {
        const rf = boxFaces(rc, rr, rw, rh, 0, H);
        const rs = lift(alongW ? project(rc, rr + rh / 2) : project(rc + rw / 2, rr), H + ridge);
        const re = lift(alongW ? project(rc + rw, rr + rh / 2) : project(rc + rw / 2, rr + rh), H + ridge);
        return (
          <>
            {gableSlopes(rf, alongW, rs, re, pal)}
            {gableEnds(rf, alongW, rs, re, pal)}
            <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
          </>
        );
      }
      default:
        return <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />;
    }
  })();

  const crown = (() => {
    if (extending) return null;
    const short = Math.min(w, h);
    switch (scheme) {
      case 'rotunda': {
        const r = short * 0.27;
        return (
          <Rotunda cc={cc} cr={cr} r={r} base={H} drumRise={up(8.5)} domeRise={up(r * METRES_PER_TILE * 0.82)}
            drum={vernacular === 'georgian' ? shade(props.material.wall, 1.0) : stone.towerStone}
            dome={vernacular === 'classical' ? '#cfc9b6' : '#e2ddd0'} stone={stone} glass={READING_GLASS} />
        );
      }
      case 'campanile': return <LibraryCampanile cc={cc} cr={cr} plan={Math.min(across(8), short * 0.24)} base={H + ridge * 0.45} stone={stone} pal={pal} />;
      case 'pavilion': return <PavilionTower col={col} row={row} w={w} h={h} base={H + ridge} stone={stone} pal={pal} />;
      case 'deco': return <DecoTower cc={cc} cr={cr} plan={Math.min(across(13), short * 0.4)} base={H} stone={stone} />;
      case 'tudor':
        return <>{ridgeChimneys({ col: col - eaves, row: row - eaves, w: w + eaves * 2, h: h + eaves * 2, base: H, rise: ridge, at: [0.08, 0.92], pal, stone })}</>;
      default: return null;
    }
  })();

  // Each front's entrance, after the roof (a pediment or a gable rises past
  // the eaves).
  const entrance = (dir: FaceDir) => {
    const span = wallSpan(w, h, dir);
    switch (scheme) {
      case 'rotunda':
      case 'pavilion': {
        // A temple front to the cornice, its pediment's roof run back into
        // the rotunda's drum (UVA's) or the mansard (Plan 87O).
        const width = porticoWidth(span);
        const short = Math.min(w, h);
        const roofAt = extending ? flatRoofAt(col, row, w, h, H)
          : scheme === 'pavilion' ? mansardRoofAt(col - eaves, row - eaves, w + eaves * 2, h + eaves * 2, H, ridge)
            : rotundaRoofAt(col, row, w, h, H, cc, cr, short * 0.27, up(8.5));
        return (
          <g key={`e${dir}`}>
            <TiedPortico col={col} row={row} w={w} h={h} dir={dir} width={width} depth={porticoDepth} base={podium} top={H} podium
              columns={vernacular === 'classical' ? 6 : 4} roofAt={roofAt} stone={stone}
              slopes={scheme === 'pavilion' ? pal : toneSlopes(pal.roof)} tone={stone.towerStone} oculus />
            {flight(col, row, w, h, dir, porticoReach(porticoDepth), width * 0.86, podium, 6, stone)}
          </g>
        );
      }
      case 'campanile': {
        const width = porticoWidth(span);
        return (
          <g key={`e${dir}`}>
            <TemplePortico col={col} row={row} w={w} h={h} dir={dir} width={width} depth={porticoDepth} podium={podium}
              height={scheme === 'campanile' ? Math.min(porticoHeight, STOREY * 1.5) : porticoHeight}
              columns={vernacular === 'classical' ? 6 : 4} stone={stone} pal={pal} arches={scheme === 'campanile'} />
            {flight(col, row, w, h, dir, porticoDepth, width * 0.86, podium, 6, stone)}
          </g>
        );
      }
      case 'mission':
        return (
          <g key={`e${dir}`}>
            <Arcade col={col} row={row} w={w} h={h} outward={dir} pal={pal} stone={stone} height={arcadeH} />
            {flight(col, row, w, h, dir, across(2.6), across(7), up(0.8), 3, stone)}
          </g>
        );
      case 'tudor':
        return (
          <g key={`e${dir}`}>
            {isRowWall(dir) === alongW
              ? <CrossGable col={col} row={row} w={w} h={h} dir={dir} width={crossW} depth={across(2.4)} H={H} rise={ridge * (crossW / 2) / (Math.min(w, h) / 2 + eaves)} pal={pal} stone={stone} storeys={storeys} door={door} />
              : <Oriel col={col} row={row} w={w} h={h} dir={dir} H={H} stone={stone} pal={pal} />}
            {flight(col, row, w, h, dir, isRowWall(dir) === alongW ? across(2.4) : 0, door.widthTiles * 2, door.threshold, 5, stone)}
          </g>
        );
      case 'deco':
        return (
          <g key={`e${dir}`}>
            <DecoPortal col={col} row={row} w={w} h={h} dir={dir} H={H} stone={stone} pal={pal} door={door} />
            {flight(col, row, w, h, dir, across(1.3), door.widthTiles * 2.6, door.threshold, 6, stone)}
          </g>
        );
      default: return null;
    }
  };

  // Mission's espadana over the middle of each front, after the roof.
  const bellGables = scheme === 'mission' && !extending && fronts.map((dir, i) => {
    const face = faces.find((fc) => fc.dir === dir)!;
    const strip = againstWall(col, row, w, h, dir, 0, face.span, across(0.6), across(0.6));
    const back = wallOf(boxFaces(strip.col, strip.row, strip.w, strip.h, 0, 0), opposite(dir));
    return (
      <BellGable key={`bg${dir}`} pal={pal} stone={stone} origin={face.o} along={face.a} inward={{ origin: back.origin, along: back.along }}
        wallHeight={H} span={face.span} centreU={0.5} sideAt={i === 0 ? 'u1' : 'u0'} scale={1.6} />
    );
  });

  return (
    <>
      <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
      {scheme === 'deco' && fronts.map((dir) => <Piers key={`dp${dir}`} stone={stone} col={col} row={row} w={w} h={h} height={H} outward={dir} pal={pal} />)}
      {faces.map(wallFace)}
      {scheme === 'deco' && faces.map((face, i) => (
        <WallBand key={`gf${i}`} origin={face.o} along={face.a} wallHeight={H} from={H - EAVES_COURSE * 1.6} to={H - EAVES_COURSE * 0.6} className="iso-cornice" fill={shade(stone.gilt, i === 0 ? 1 : 0.82)} />
      ))}
      {scheme === 'campanile' && trim && faces.map((face, i) => (
        <EavesBrackets key={`eb${i}`} origin={face.o} along={face.a} wallHeight={H} span={face.span} top={H} stone={stone} />
      ))}
      {pitched && eaves > 0 && faces.map((face, i) => (
        <WallBand key={`es${i}`} origin={face.o} along={face.a} wallHeight={H} from={H - up(0.9)} to={H} className="iso-eaves-shadow" />
      ))}
      {roof}
      {/* Tudor: a mullioned window high in each gable end the camera sees. */}
      {scheme === 'tudor' && !extending && faces.filter((face) => isRowWall(face.dir) !== alongW).map((face) => {
        const z0 = H + up(1.4); const z1 = H + ridge * 0.5;
        const half = across(2.6) / face.span;
        return (
          <g key={`gw${face.dir}`}>
            <path className="iso-window" fill={stone.glass} d={openings(face, H, [[0.5 - half, 0.5 + half, z0, z1]], 'rect')} />
            <path d={[-0.5, 0, 0.5].map((k) => { const u = 0.5 + k * half; const a = facePoint(face.o, face.a, H, u, z0 / H); const c = facePoint(face.o, face.a, H, u, z1 / H); return `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${c.x.toFixed(2)},${c.y.toFixed(2)}`; }).join('')} stroke={stone.trim} strokeWidth={0.9} fill="none" />
          </g>
        );
      })}
      {crown}
      {/* Parapets on the flat roofs, after the crown they stand in front of. */}
      {!pitched && fronts.map((dir) => (vernacular === 'classical'
        ? <Balustrade key={`ba${dir}`} col={col} row={row} w={w} h={h} base={H} outward={dir} pal={pal} stone={stone} />
        : <Merlons key={`pa${dir}`} col={col} row={row} w={w} h={h} base={H} outward={dir} pal={pal} block={wallSpan(w, h, dir)} gap={0} rise={up(scheme === 'deco' ? 1.2 : 0.85)} depth={across(0.35)} fill={trim ? stone.trim : undefined} />
      ))}
      {fronts.map(entrance)}
      {bellGables}
    </>
  );
}

// Italianate's campanile: a plain shaft, an open belfry of paired arches,
// a bracketed cornice and a low pyramid (Plan 87F).
function LibraryCampanile({ cc, cr, plan, base, stone, pal }: {
  cc: number; cr: number; plan: number; base: number; stone: StonePalette; pal: Palette;
}) {
  const x0 = cc - plan / 2; const y0 = cr - plan / 2;
  const shaftRise = up(13);
  const shaft = boxFaces(x0, y0, plan, plan, base, shaftRise);
  const bBase = base + shaftRise; const bRise = up(5.5);
  const belfry = boxFaces(x0, y0, plan, plan, bBase, bRise);
  const e = across(0.9);
  const cap = pyramid(x0 - e, y0 - e, plan + 2 * e, bBase + bRise, up(3.4), pal.roof);
  return (
    <>
      <TowerShaft f={shaft} rise={shaftRise} stone={stone} />
      <StageOpenings f={shaft} rise={shaftRise} n={1} shape="arched" v0={0.58} v1={0.8} cls="iso-louvre" />
      <TowerShaft f={belfry} rise={bRise} stone={stone} cornice={false} />
      <StageOpenings f={belfry} rise={bRise} n={2} shape="arched" v0={0.12} v1={0.82} />
      {[[belfry.D, belfry.C, belfry.spanLeft] as const, [belfry.C, belfry.B, belfry.spanRight] as const].map(([o, a, span], i) => (
        <EavesBrackets key={i} origin={o} along={a} wallHeight={bRise} span={span} top={bRise} stone={stone} />
      ))}
      {cap.faces}
      <GiltFinial at={cap.tip} rise={up(2.2)} stone={stone} />
    </>
  );
}

// Art Deco's tower: three setbacks, fluted by deep vertical reveals and
// banded in gilt, to a mast with the flag (Plan 87F).
function DecoTower({ cc, cr, plan, base, stone }: { cc: number; cr: number; plan: number; base: number; stone: StonePalette }) {
  const tiers = [[1, up(9)], [0.76, up(6)], [0.52, up(5)]] as const;
  let z = base;
  const nodes = tiers.map(([k, rise], i) => {
    const p = plan * k;
    const f = boxFaces(cc - p / 2, cr - p / 2, p, p, z, rise);
    const flutes = facesOf(f).map((face, s) => {
      const n = i === 0 ? 6 : 4;
      const list: Array<[number, number, number, number]> = Array.from({ length: n }, (_, j) => {
        const u = (j + 0.5) / n;
        return [u - 0.22 / n, u + 0.22 / n, rise * 0.1, rise * 0.84];
      });
      return <path key={`fl${s}`} d={openings(face, rise, list, 'rect')} fill={shade(stone.towerStone, 0.62)} />;
    });
    const node = (
      <g key={i}>
        {sideFaces(f, shade(stone.towerStone, 0.99), shade(stone.towerStone, 0.8))}
        {flutes}
        <WallBand origin={f.D} along={f.C} wallHeight={rise} from={rise * 0.9} to={rise} className="iso-cornice" fill={stone.gilt} />
        <WallBand origin={f.C} along={f.B} wallHeight={rise} from={rise * 0.9} to={rise} className="iso-cornice" fill={shade(stone.gilt, 0.8)} />
        <polygon points={polyPoints(f.top)} fill={shade(stone.towerStone, 0.9)} />
      </g>
    );
    z += rise;
    return node;
  });
  const mast = lift(project(cc, cr), z);
  return (
    <>
      {nodes}
      <line className="iso-finial" x1={mast.x} y1={mast.y} x2={mast.x} y2={lift(mast, up(3)).y} stroke={stone.gilt} strokeWidth={1.4} />
      <RoofFlag at={lift(mast, up(3))} />
    </>
  );
}

// Art Deco's way in: a tall frontispiece standing proud of the wall and up
// past the parapet in two steps, a deep fluted portal in it, gilt above.
function DecoPortal({ col, row, w, h, dir, H, stone, pal, door }: {
  col: number; row: number; w: number; h: number; dir: FaceDir; H: number; stone: StonePalette; pal: Palette; door: DoorDimensions;
}) {
  const span = wallSpan(w, h, dir);
  const width = Math.min(across(14), span * 0.34);
  const depth = across(1.3);
  const top = H + up(3.2);
  const b = againstWall(col, row, w, h, dir, span / 2 - width / 2, width, depth);
  const f = boxFaces(b.col, b.row, b.w, b.h, 0, top);
  const front = wallOf(f, dir);
  const fo = { dir, o: front.origin, a: front.along, span: width };
  // The second step, narrower and higher.
  const b2 = againstWall(col, row, w, h, dir, span / 2 - width * 0.3, width * 0.6, depth * 0.6);
  const f2 = boxFaces(b2.col, b2.row, b2.w, b2.h, top, up(3));
  const opening: Array<[number, number, number, number]> = [[0.3, 0.7, door.threshold, Math.min(top * 0.82, door.threshold + door.height + up(5))]];
  const flutes: Array<[number, number, number, number]> = [0.12, 0.2, 0.8, 0.88].map((u) => [u - 0.018, u + 0.018, up(1), top - up(1.4)]);
  return (
    <>
      {sideFaces(f, shade(pal.wall.posRow, 1.04), shade(pal.wall.posCol, 1.04))}
      <path d={openings(fo, top, flutes, 'rect')} fill={shade(pal.wall[dir], 0.7)} />
      <path d={openings(fo, top, opening, 'rect')} fill="rgba(28, 38, 46, 0.7)" />
      {/* Gilt bands over the portal and round its head. */}
      <WallBand origin={fo.o} along={fo.a} wallHeight={top} from={opening[0][3]} to={opening[0][3] + up(0.8)} className="iso-cornice" fill={stone.gilt} u0={0.26} u1={0.74} />
      <WallBand origin={fo.o} along={fo.a} wallHeight={top} from={top - up(1.0)} to={top} className="iso-cornice" fill={stone.gilt} />
      <Door d={{ ...door, widthTiles: width * 0.32 }} origin={fo.o} along={fo.a} wallHeight={top} span={width} side={dir} />
      <polygon points={polyPoints(f.top)} fill={shade(pal.wall.posRow, 0.95)} />
      {sideFaces(f2, shade(pal.wall.posRow, 1.04), shade(pal.wall.posCol, 1.04))}
      <WallBand origin={wallOf(f2, dir).origin} along={wallOf(f2, dir).along} wallHeight={up(3)} from={up(2.2)} to={up(3)} className="iso-cornice" fill={stone.gilt} />
      <polygon points={polyPoints(f2.top)} fill={shade(pal.wall.posRow, 0.95)} />
    </>
  );
}

// Tudor's entrance bay: a gabled bay standing out from the long wall the
// full height, its roof running back into the hall's with a valley each
// side, a great oriel over its door (Plan 87F).
function CrossGable({ col, row, w, h, dir, width, depth, H, rise, pal, stone, storeys, door }: {
  col: number; row: number; w: number; h: number; dir: FaceDir; width: number; depth: number; H: number; rise: number;
  pal: Palette; stone: StonePalette; storeys: number; door: DoorDimensions;
}) {
  const span = wallSpan(w, h, dir);
  const along0 = span / 2 - width / 2;
  const b = againstWall(col, row, w, h, dir, along0, width, depth);
  const f = boxFaces(b.col, b.row, b.w, b.h, 0, H);
  const front = wallOf(f, dir);
  const fo: Face = { dir, o: front.origin, a: front.along, span: width };
  const sideDir: FaceDir = front.poly === f.left ? f.dir.BC : f.dir.CD;
  const side = wallOf(f, sideDir);
  // Grid points along the wall at `a` tiles, `o` tiles out from its plane.
  const at = (a: number, o: number, z: number) => {
    const g = outsideWall(col, row, w, h, dir, a, o);
    return lift(project(g.col, g.row), z);
  };
  const lo = along0; const hi = along0 + width; const midA = span / 2;
  // How far into the hall's roof the ridge runs before it meets that slope.
  const inward = width / 2;
  const ridgeOut = at(midA, depth, H + rise); const ridgeIn = at(midA, -inward, H + rise);
  const halves: Array<[FaceDir, Pt[]]> = isRowWall(dir)
    ? [['negCol', [at(lo, depth, H), at(lo, 0, H), ridgeIn, ridgeOut]], ['posCol', [at(hi, depth, H), at(hi, 0, H), ridgeIn, ridgeOut]]]
    : [['negRow', [at(lo, depth, H), at(lo, 0, H), ridgeIn, ridgeOut]], ['posRow', [at(hi, depth, H), at(hi, 0, H), ridgeIn, ridgeOut]]];
  const gable = [lift(front.origin, H), lift(front.along, H), ridgeOut];
  const z0 = STOREY * 1.15; const z1 = H - up(1.2);
  return (
    <>
      <polygon points={polyPoints(side.poly)} fill={pal.wall[sideDir]} />
      <polygon points={polyPoints(front.poly)} fill={pal.wall[dir]} />
      {courses(fo, H, stone, 'cg', false)}
      {/* The oriel: one great mullioned window up the bay. */}
      <path className="iso-window" fill={stone.glass} d={openings(fo, H, [[0.2, 0.8, z0, z1]], 'rect')} />
      <path d={(() => {
        const out: string[] = [];
        for (const u of [0.35, 0.5, 0.65]) { const a = facePoint(fo.o, fo.a, H, u, z0 / H); const c = facePoint(fo.o, fo.a, H, u, z1 / H); out.push(`M${a.x.toFixed(2)},${a.y.toFixed(2)}L${c.x.toFixed(2)},${c.y.toFixed(2)}`); }
        for (let s = 1; s < Math.max(2, storeys - 1); s++) { const z = z0 + ((z1 - z0) * s) / Math.max(2, storeys - 1); const a = facePoint(fo.o, fo.a, H, 0.2, z / H); const c = facePoint(fo.o, fo.a, H, 0.8, z / H); out.push(`M${a.x.toFixed(2)},${a.y.toFixed(2)}L${c.x.toFixed(2)},${c.y.toFixed(2)}`); }
        return out.join('');
      })()} stroke={stone.trim} strokeWidth={0.9} fill="none" />
      <Door d={door} origin={fo.o} along={fo.a} wallHeight={H} span={width} side={dir} />
      {backSlopesFirst(halves, (x) => x[0]).map(([d, pts]) => <polygon key={d} points={polyPoints(pts)} fill={pal[d]} />)}
      <polygon points={polyPoints(gable)} fill={pal.wall[dir]} />
      {/* Bargeboards and a finial on the gable. */}
      <polyline points={polyPoints(gable.slice(0, 1).concat([ridgeOut, gable[1]]))} stroke={shade(stone.trim, 0.8)} strokeWidth={1.4} fill="none" />
      <GiltFinial at={ridgeOut} rise={up(1.6)} stone={stone} />
    </>
  );
}

// A two-storey oriel on a Tudor gable end, over its door.
function Oriel({ col, row, w, h, dir, H, stone, pal }: {
  col: number; row: number; w: number; h: number; dir: FaceDir; H: number; stone: StonePalette; pal: Palette;
}) {
  const span = wallSpan(w, h, dir);
  const width = across(5);
  const b = againstWall(col, row, w, h, dir, span / 2 - width / 2, width, across(1.0));
  const z0 = STOREY * 1.25; const z1 = Math.min(H - up(1.0), z0 + STOREY * 2);
  const f = boxFaces(b.col, b.row, b.w, b.h, z0, z1 - z0);
  const corbel = boxFaces(b.col, b.row, b.w, b.h, z0 - up(1.2), up(1.2));
  const front = wallOf(f, dir);
  const fo: Face = { dir, o: front.origin, a: front.along, span: width };
  const cf = wallOf(corbel, dir);
  return (
    <>
      {/* The corbel under it, tapering back to the wall. */}
      <polygon points={polyPoints([lift(cf.origin, up(1.2)), lift(cf.along, up(1.2)), facePoint(cf.origin, cf.along, up(1.2), 0.5, 0)])} fill={shade(pal.wall[dir], 0.85)} />
      <polygon points={polyPoints(f.left)} fill={shade(pal.wall[f.dir.CD], 1)} />
      <polygon points={polyPoints(f.right)} fill={shade(pal.wall[f.dir.BC], 1)} />
      <path className="iso-window" fill={stone.glass} d={openings(fo, z1 - z0, [[0.1, 0.9, up(0.5), z1 - z0 - up(0.6)]], 'rect')} />
      <path d={[0.3, 0.5, 0.7].map((u) => { const a = facePoint(fo.o, fo.a, z1 - z0, u, 0.08); const c = facePoint(fo.o, fo.a, z1 - z0, u, 0.92); return `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${c.x.toFixed(2)},${c.y.toFixed(2)}`; }).join('')} stroke={stone.trim} strokeWidth={0.9} fill="none" />
      <polygon points={polyPoints(f.top)} fill={LEAD} />
    </>
  );
}

// --- Gothic: a nave between aisles under a crossing tower ----------------

function GothicLibrary(props: LibraryProps) {
  const { t, p, vernacular, stone, H, extending } = props;
  const pal = pitchedPalette(props);
  const { col, row, w, h } = p;
  const alongW = w >= h;
  const L = alongW ? w : h; const S = alongW ? h : w;
  // A box by its extent along the long axis and across it.
  const box = (a0: number, al: number, c0: number, cl: number): DepthBox => (alongW
    ? { col: col + a0, row: row + c0, w: al, h: cl }
    : { col: col + c0, row: row + a0, w: cl, h: al });
  const aisle = S * 0.22; const nave = S - aisle * 2;
  // While a floor goes up the aisles stand to the walls' height, so the
  // scaffold lies on one flat roof.
  const Ha = extending ? H : STOREY; const leanRise = extending ? 0 : up(1.4);
  const ridge = extending ? 0 : ridgeOf(t, vernacular);
  const storeys = storeysOf(t) - (extending ? 1 : 0);
  const crossing = box(L / 2 - nave / 2, nave, aisle, nave);
  const naveA = box(0, L / 2 - nave / 2, aisle, nave);
  const naveB = box(L / 2 + nave / 2, L / 2 - nave / 2, aisle, nave);
  const aisleA = box(0, L, 0, aisle);
  const aisleB = box(0, L, S - aisle, aisle);
  const sideDirs: [FaceDir, FaceDir] = alongW ? ['negRow', 'posRow'] : ['negCol', 'posCol'];
  const seen = visibleWalls();
  const visible = (d: FaceDir) => d === seen.left || d === seen.right;
  const door: DoorDimensions = { ...LIBRARY_DOOR, widthTiles: across(3.0), height: up(3.6), threshold: up(0.9), treads: 4 };
  const glass = READING_GLASS;
  const trim = stone.trim;

  const naveHalf = (b: DepthBox, outer: FaceDir) => {
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, H);
    const rs = lift(alongW ? project(b.col, b.row + b.h / 2) : project(b.col + b.w / 2, b.row), H + ridge);
    const re = lift(alongW ? project(b.col + b.w, b.row + b.h / 2) : project(b.col + b.w / 2, b.row + b.h), H + ridge);
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {facesOf(f).map((face) => {
          if (face.dir === outer) {
            // The gable end: the door, and a great traceried window over it.
            return (
              <g key={face.dir}>
                {courses(face, H, stone, `ce${face.dir}`, false)}
                {doorway(face, H, door, 'arched')}
                <EntranceSteps d={door} {...(() => { const at = outsideWall(b.col, b.row, b.w, b.h, face.dir, face.span / 2, 0); const o = outwardOf(face.dir); return { centreCol: at.col, centreRow: at.row, outCol: o.col, outRow: o.row }; })()} span={face.span} stone={stone} />
              </g>
            );
          }
          if (face.dir !== sideDirs[0] && face.dir !== sideDirs[1]) return null;
          // The clerestory over the aisle: the reading room's tall lights.
          const z0 = Ha + leanRise + up(0.8); const z1 = H - up(1.1);
          const bays = baysAcross(face.span);
          const half = Math.min(READING_WINDOW / face.span, 0.6 / bays) / 2;
          const list: Array<[number, number, number, number]> = z1 - z0 > up(2.4)
            ? Array.from({ length: bays }, (_, i) => [(i + 0.5) / bays - half, (i + 0.5) / bays + half, Math.max(z0, z1 - up(9)), z1])
            : [];
          // Any storeys under a tall clerestory are stacks: paired lancets.
          const stackTop = Math.max(z0, z1 - up(9)) - up(0.6);
          const stackSills = rankSills(storeys).filter((s) => s >= z0 && s + WINDOW_HEIGHT <= stackTop);
          return (
            <g key={face.dir}>
              {windows(face.o, face.a, H, face.span, stackSills, across(1.5), `gs${face.dir}`, 'lancet', stone.glass, undefined, 2)}
              {list.length > 0 && <path className="iso-window" fill={glass} d={openings(face, H, list, 'lancet')} />}
              {tracery(face, H, list, trim, `gt${face.dir}`)}
              <WallBand origin={face.o} along={face.a} wallHeight={H} from={H - EAVES_COURSE} to={H} className="iso-cornice" />
            </g>
          );
        })}
        {ridge > 0 ? (
          <>
            {gableSlopes(f, alongW, rs, re, pal)}
            {gableEnds(f, alongW, rs, re, pal)}
            <line className="iso-ridge" x1={rs.x} y1={rs.y} x2={re.x} y2={re.y} />
          </>
        ) : <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />}
        {/* The great window in the gable end, after the gable it rises into. */}
        {facesOf(f).filter((face) => face.dir === outer).map((face) => {
          const z0 = door.threshold + door.height + up(1.6); const z1 = H + ridge * 0.5;
          const ww = Math.min(0.5, across(8) / face.span) / 2;
          const big: Array<[number, number, number, number]> = [[0.5 - ww, 0.5 + ww, z0, z1]];
          return (
            <g key={`gw${face.dir}`}>
              {trim !== 'none' && <path d={openings(face, H, [[0.5 - ww * 1.14, 0.5 + ww * 1.14, z0 - up(0.4), z1 + up(0.6)]], 'lancet')} fill={trim} />}
              <path className="iso-window" fill={glass} d={openings(face, H, big, 'lancet')} />
              <path d={[0.5 - ww * 0.33, 0.5 + ww * 0.33].map((u) => { const a = facePoint(face.o, face.a, H, u, z0 / H); const c = facePoint(face.o, face.a, H, u, (z0 + (z1 - z0) * 0.7) / H); return `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${c.x.toFixed(2)},${c.y.toFixed(2)}`; }).join('')} stroke={trim} strokeWidth={0.9} fill="none" />
            </g>
          );
        })}
      </>
    );
  };

  const aisleRange = (b: DepthBox, outer: FaceDir) => {
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, Ha);
    const inner = opposite(outer);
    // The lean-to: low at the outer wall, up against the nave.
    const edge = (dir: FaceDir, z: number) => {
      const wl = wallOf(boxFaces(b.col, b.row, b.w, b.h, z, 0), dir);
      return [wl.origin, wl.along];
    };
    const [o0, o1] = edge(outer, Ha); const [i0, i1] = edge(inner, Ha + leanRise);
    // Hidden walls run the way their visible opposites do (wallOf), so the
    // two edges pair up end for end.
    const roof = [o0, o1, i1, i0];
    const ends = facesOf(f).filter((face) => face.dir !== outer && face.dir !== inner);
    const porchW = Math.min(across(8), L * 0.16);
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {/* The end walls' slope up to the nave. */}
        {ends.map((face) => {
          // The end of the lean-to: a triangle up to the nave wall.
          const endAt = face.dir === 'negCol' ? b.col : face.dir === 'posCol' ? b.col + b.w : face.dir === 'negRow' ? b.row : b.row + b.h;
          const outerAt = outer === 'negCol' ? b.col : outer === 'posCol' ? b.col + b.w : outer === 'negRow' ? b.row : b.row + b.h;
          const innerAt = outer === 'negCol' ? b.col + b.w : outer === 'posCol' ? b.col : outer === 'negRow' ? b.row + b.h : b.row;
          const P = (across0: number, z: number) => lift(alongW ? project(endAt, across0) : project(across0, endAt), z);
          return <polygon key={`ec${face.dir}`} points={polyPoints([P(outerAt, Ha), P(innerAt, Ha), P(innerAt, Ha + leanRise)])} fill={pal.wall[face.dir]} />;
        })}
        {facesOf(f).filter((face) => face.dir === outer).map((face) => {
          const bays = baysAcross(face.span);
          const half = Math.min(READING_WINDOW * 0.8 / face.span, 0.5 / bays) / 2;
          const [s0, s1] = centred(porchW + across(1.5), face.span);
          const list: Array<[number, number, number, number]> = Array.from({ length: bays }, (_, i) => (i + 0.5) / bays)
            .filter((c) => c + half < s0 || c - half > s1)
            .map((c) => [c - half, c + half, SILL_HEIGHT + up(0.4), Ha - up(1.0)]);
          return (
            <g key={`ao${face.dir}`}>
              {courses(face, Ha, stone, 'ca', true)}
              {extending
                ? windows(face.o, face.a, Ha, face.span, rankSills(storeys), across(1.5), 'ax', 'lancet', stone.glass, { u0: s0, u1: s1, v0: 0, v1: 1 }, 2)
                : <path className="iso-window" fill={glass} d={openings(face, Ha, list, 'lancet')} />}
            </g>
          );
        })}
        <polygon points={polyPoints(roof)} fill={pal[outer]} />
        {visible(outer) && <GothicPorch col={col} row={row} w={w} h={h} dir={outer} width={porchW} depth={across(2.4)} aisle={aisle} eave={Ha + leanRise} rise={up(5.2)} pal={pal} stone={stone} door={door} />}
      </>
    );
  };

  const tower = () => {
    const b = crossing;
    const Hc = extending ? H : H + ridge + up(1.5);
    const f = boxFaces(b.col, b.row, b.w, b.h, 0, Hc);
    const p2 = nave * 0.68;
    const cc = b.col + b.w / 2; const cr = b.row + b.h / 2;
    const stageRise = up(18);
    const st = boxFaces(cc - p2 / 2, cr - p2 / 2, p2, p2, Hc, stageRise);
    const top = Hc + stageRise;
    const pp = TOWER_PINNACLE_PLAN;
    const lancet = (face: Face, rise: number, z0: number, z1: number, n: number, cls: string, key: string) => {
      const list: Array<[number, number, number, number]> = Array.from({ length: n }, (_, i) => {
        const c = (i + 0.5) / n; const hw = 0.28 / n;
        return [c - hw, c + hw, z0, z1];
      });
      return (
        <g key={key}>
          <path className={cls} fill={cls === 'iso-window' ? glass : undefined} d={openings(face, rise, list, 'lancet')} />
          {tracery(face, rise, list, trim, `${key}t`)}
        </g>
      );
    };
    return (
      <>
        <polygon points={polyPoints(f.left)} fill={pal.wallLeft} />
        <polygon points={polyPoints(f.right)} fill={pal.wallRight} />
        {facesOf(f).map((face) => lancet(face, Hc, Math.max(Ha + leanRise + up(2), H + ridge * 0.45), Hc - up(2.2), 2, 'iso-window', `cw${face.dir}`))}
        {facesOf(f).map((face) => <WallBand key={`cc${face.dir}`} origin={face.o} along={face.a} wallHeight={Hc} from={Hc - CORNICE} to={Hc} className="iso-cornice" />)}
        <polygon points={polyPoints(f.top)} fill={pal.roofDeck} />
        {!extending && (
          <>
            {sideFaces(st, shade(pal.wall.posRow, 1.0), shade(pal.wall.posCol, 1.0))}
            {facesOf(st).map((face) => lancet(face, stageRise, up(1.5), stageRise - up(2), 2, 'iso-louvre', `sw${face.dir}`))}
            {facesOf(st).map((face) => <WallBand key={`sc${face.dir}`} origin={face.o} along={face.a} wallHeight={stageRise} from={stageRise - CORNICE} to={stageRise} className="iso-cornice" />)}
            <polygon points={polyPoints(st.top)} fill={pal.roofDeck} />
            {[seen.left, seen.right].map((dir) => <Merlons key={`sm${dir}`} col={cc - p2 / 2} row={cr - p2 / 2} w={p2} h={p2} base={top} outward={dir} pal={pal} block={across(1.0)} gap={across(0.8)} rise={up(1.1)} depth={across(0.45)} />)}
            {depthOrder([[cc - p2 / 2, cr - p2 / 2], [cc + p2 / 2 - pp, cr - p2 / 2], [cc - p2 / 2, cr + p2 / 2 - pp], [cc + p2 / 2 - pp, cr + p2 / 2 - pp]]
              .map(([c, r]) => ({ col: c, row: r, w: pp, h: pp }))).map((q, i) => {
              const pf = boxFaces(q.col, q.row, q.w, q.h, top, TOWER_PINNACLE_RISE);
              const pin = pyramid(q.col, q.row, q.w, top + TOWER_PINNACLE_RISE, up(3), pal.roof);
              return (
                <g key={`pn${i}`}>
                  <polygon points={polyPoints(pf.left)} fill={pal.wall[pf.dir.CD]} />
                  <polygon points={polyPoints(pf.right)} fill={pal.wall[pf.dir.BC]} />
                  {pin.faces}
                </g>
              );
            })}
            <RoofFlag at={lift(project(cc, cr), top)} />
          </>
        )}
        {[seen.left, seen.right].map((dir) => <Merlons key={`cm${dir}`} col={b.col} row={b.row} w={b.w} h={b.h} base={Hc} outward={dir} pal={pal} block={across(1.1)} gap={across(0.9)} rise={up(1.1)} depth={across(0.5)} />)}
      </>
    );
  };

  const items = depthOrder([
    { ...aisleA, part: 'aisleA' as const }, { ...aisleB, part: 'aisleB' as const },
    { ...naveA, part: 'naveA' as const }, { ...naveB, part: 'naveB' as const },
    { ...crossing, part: 'tower' as const },
  ]);
  const ends: [FaceDir, FaceDir] = alongW ? ['negCol', 'posCol'] : ['negRow', 'posRow'];
  return (
    <>
      {items.map((it) => {
        switch (it.part) {
          case 'aisleA': return <g key="aA">{aisleRange(aisleA, sideDirs[0])}</g>;
          case 'aisleB': return <g key="aB">{aisleRange(aisleB, sideDirs[1])}</g>;
          case 'naveA': return <g key="nA">{naveHalf(naveA, ends[0])}</g>;
          case 'naveB': return <g key="nB">{naveHalf(naveB, ends[1])}</g>;
          default: return <g key="tw">{tower()}</g>;
        }
      })}
    </>
  );
}

// The porch on a Gothic aisle: a steep gable standing out from it, its
// roof carried back over the aisle's lean-to to the nave wall, a pointed
// door in it up a short flight.
function GothicPorch({ col, row, w, h, dir, width, depth, aisle, eave, rise, pal, stone, door }: {
  col: number; row: number; w: number; h: number; dir: FaceDir; width: number; depth: number; aisle: number;
  eave: number; rise: number; pal: Palette; stone: StonePalette; door: DoorDimensions;
}) {
  const span = wallSpan(w, h, dir);
  const along0 = span / 2 - width / 2;
  const b = againstWall(col, row, w, h, dir, along0, width, depth);
  const f = boxFaces(b.col, b.row, b.w, b.h, 0, eave);
  const front = wallOf(f, dir);
  const sideDir: FaceDir = front.poly === f.left ? f.dir.BC : f.dir.CD;
  const side = wallOf(f, sideDir);
  const fo: Face = { dir, o: front.origin, a: front.along, span: width };
  const at = (a: number, o: number, z: number) => { const g = outsideWall(col, row, w, h, dir, a, o); return lift(project(g.col, g.row), z); };
  const lo = along0; const hi = along0 + width; const mid = span / 2;
  // Over the aisle: the side wall carried back above the lean-to.
  const sideA = sideDir === (isRowWall(dir) ? 'negCol' : 'negRow') ? lo : hi;
  const over = [at(sideA, 0, eave - up(1.8) - 0), at(sideA, -aisle, eave), at(sideA, 0, eave)];
  const ridgeOut = at(mid, depth, eave + rise); const ridgeIn = at(mid, -aisle, eave + rise);
  const halves: Array<[FaceDir, Pt[]]> = isRowWall(dir)
    ? [['negCol', [at(lo, depth, eave), at(lo, -aisle, eave), ridgeIn, ridgeOut]], ['posCol', [at(hi, depth, eave), at(hi, -aisle, eave), ridgeIn, ridgeOut]]]
    : [['negRow', [at(lo, depth, eave), at(lo, -aisle, eave), ridgeIn, ridgeOut]], ['posRow', [at(hi, depth, eave), at(hi, -aisle, eave), ridgeIn, ridgeOut]]];
  const gable = [lift(front.origin, eave), lift(front.along, eave), ridgeOut];
  const o = outwardOf(dir);
  const step = outsideWall(col, row, w, h, dir, mid, depth);
  return (
    <>
      <polygon points={polyPoints(side.poly)} fill={pal.wall[sideDir]} />
      <polygon points={polyPoints(over)} fill={pal.wall[sideDir]} />
      <polygon points={polyPoints(front.poly)} fill={pal.wall[dir]} />
      <Door d={door} origin={fo.o} along={fo.a} wallHeight={eave} span={width} side={dir} shape="arched" />
      {backSlopesFirst(halves, (x) => x[0]).map(([d, pts]) => <polygon key={d} points={polyPoints(pts)} fill={pal[d]} />)}
      <polygon points={polyPoints(gable)} fill={pal.wall[dir]} />
      {/* A small rose in the gable. */}
      <polygon className="iso-window" fill={READING_GLASS} points={polyPoints(Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return facePoint(fo.o, fo.a, eave, 0.5 + Math.cos(a) * 0.12, 1 + (rise * 0.36 + Math.sin(a) * up(1.0)) / eave);
      }))} />
      <GiltFinial at={ridgeOut} rise={up(1.6)} stone={stone} />
      <EntranceSteps d={door} centreCol={step.col} centreRow={step.row} outCol={o.col} outRow={o.row} span={width} stone={stone} />
    </>
  );
}

// --- Modern: the reading room on pilotis --------------------------------

function ModernLibrary(props: LibraryProps) {
  const { t, p, pal, stone, H, extending } = props;
  const { col, row, w, h } = p;
  const seen = visibleWalls();
  const storeys = storeysOf(t) - (extending ? 1 : 0);
  // The terrace, the recessed ground floor, the pilotis and the glass box.
  const terrace = up(1.4);
  const G = STOREY * 1.5;
  const inset = across(3.0);
  const terraceF = boxFaces(col, row, w, h, 0, terrace);
  const core = boxFaces(col + inset, row + inset, w - inset * 2, h - inset * 2, terrace, G - terrace);
  const upper = boxFaces(col, row, w, h, G, H - G);
  const UH = H - G;
  const concrete = stone.towerStone;
  // Pilotis along the two walls the camera sees, at every other bay.
  const piloti = across(0.7);
  const posts: DepthBox[] = [];
  for (const dir of [seen.left, seen.right]) {
    const span = wallSpan(w, h, dir);
    const n = Math.max(2, Math.round((span * METRES_PER_TILE) / 9));
    for (let i = 0; i <= n; i++) {
      const along = Math.min(span - piloti, Math.max(0, (i / n) * span - piloti / 2));
      posts.push(againstWall(col, row, w, h, dir, along, piloti, piloti, piloti));
    }
  }
  const slab = across(0.9);
  const roofF = boxFaces(col - slab, row - slab, w + slab * 2, h + slab * 2, H, up(1.4));
  const door = { ...LIBRARY_DOOR, threshold: 0, treads: 0, height: up(3.4) };
  // The transoms of the stack floors; the top two storeys are one height.
  const floors = Array.from({ length: Math.max(0, storeys - 3) }, (_, i) => (i + 1) * STOREY);
  return (
    <>
      {sideFaces(terraceF, shade(concrete, 0.86), shade(concrete, 0.72))}
      <polygon className="iso-step-tread" points={polyPoints(terraceF.top)} fill={shade(concrete, 0.94)} />
      {/* The recessed lobby: glass under the box, in its shade. */}
      <polygon points={polyPoints(core.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(core.right)} fill={pal.wallRight} />
      {facesOf(core).map((face) => (
        <g key={`lb${face.dir}`}>
          <CurtainWall origin={face.o} along={face.a} wallHeight={G - terrace} spanTiles={face.span} from={0} floors={[]} id={`lb${face.dir}`} u0={0.04} u1={0.96} />
          <Door d={door} origin={face.o} along={face.a} wallHeight={G - terrace} span={face.span} side={face.dir} />
        </g>
      ))}
      <polygon points={polyPoints(core.left)} fill="rgba(28, 38, 46, 0.3)" />
      <polygon points={polyPoints(core.right)} fill="rgba(28, 38, 46, 0.3)" />
      {depthOrder(posts).map((q, i) => {
        const pf = boxFaces(q.col, q.row, q.w, q.h, terrace, G - terrace);
        return <g key={`pl${i}`}>{sideFaces(pf, shade(concrete, 0.96), shade(concrete, 0.78))}</g>;
      })}
      {/* The reading room: the glass box, its storeys behind one wall of
          glass and fins, the top two one tall room. */}
      <polygon points={polyPoints(upper.left)} fill={pal.wallLeft} />
      <polygon points={polyPoints(upper.right)} fill={pal.wallRight} />
      {facesOf(upper).map((face) => {
        const span = face.span;
        const fins = Math.max(3, Math.round((span * METRES_PER_TILE) / 3));
        const d = Array.from({ length: fins + 1 }, (_, i) => {
          const u = i / fins;
          const a = facePoint(face.o, face.a, UH, u, 0); const c = facePoint(face.o, face.a, UH, u, 1);
          return `M${a.x.toFixed(2)},${a.y.toFixed(2)}L${c.x.toFixed(2)},${c.y.toFixed(2)}`;
        }).join('');
        return (
          <g key={`gl${face.dir}`}>
            <CurtainWall origin={face.o} along={face.a} wallHeight={UH} spanTiles={span} from={up(0.5)} to={UH - up(0.4)} floors={floors.filter((z) => z > 0).map((z) => z)} id={`gl${face.dir}`} />
            <path d={d} stroke={shade(concrete, 0.95)} strokeWidth={1.3} fill="none" />
            <WallBand origin={face.o} along={face.a} wallHeight={UH} from={0} to={up(0.6)} className="iso-cornice" fill={shade(concrete, 0.9)} />
          </g>
        );
      })}
      <polygon points={polyPoints(upper.top)} fill={pal.roofDeck} />
      {/* The deep roof slab, oversailing every wall. */}
      {sideFaces(roofF, shade(concrete, 0.97), shade(concrete, 0.8))}
      <polygon points={polyPoints(roofF.top)} fill={pal.roofDeck} />
      {/* The reading room's clerestory: a long glazed monitor down the
          middle of the slab, under its own thin cap. */}
      {!extending && (() => {
        const mw = w >= h ? w * 0.56 : w * 0.3; const mh = w >= h ? h * 0.3 : h * 0.56;
        const mf = boxFaces(col + (w - mw) / 2, row + (h - mh) / 2, mw, mh, H + up(1.4), up(2.4));
        const cap = boxFaces(col + (w - mw) / 2 - slab * 0.4, row + (h - mh) / 2 - slab * 0.4, mw + slab * 0.8, mh + slab * 0.8, H + up(3.8), up(0.7));
        return (
          <>
            {facesOf(mf).map((face) => <CurtainWall key={`mo${face.dir}`} origin={face.o} along={face.a} wallHeight={up(2.4)} spanTiles={face.span} from={0} floors={[]} id={`mo${face.dir}`} />)}
            {sideFaces(cap, shade(concrete, 0.97), shade(concrete, 0.8))}
            <polygon points={polyPoints(cap.top)} fill={shade(pal.roofDeck, 0.97)} />
          </>
        );
      })()}
      {/* A wide stair up to the terrace on each front. */}
      {[seen.left, seen.right].map((dir) => flight(col, row, w, h, dir, 0, Math.min(across(16), wallSpan(w, h, dir) * 0.45), terrace, 5, stone))}
    </>
  );
}
