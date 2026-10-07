import type { ReactNode } from 'react';
import type { Vernacular } from '../state/types';
import { shade } from './tint';

// The founding facade (StartupScreen.tsx's SchoolFacade) for every
// vernacular but Georgian, which draws its own Founders Hall there. Each is
// Founders Hall as the map draws it (buildingMotifs.tsx; docs/assets'
// hall-1.jpg), seen head-on: the roof and what rises over it, then the
// front under the name band. Colors come from VERNACULARS through
// FacadePalette, so a change there reaches both.
//
// Two layers, because the name band is drawn between them: the crown (the
// roof and the landmark, behind and above the band) and the front (the wall
// below it, its windows, its entrance and the steps).

export interface FacadePalette {
  wall: string;
  roof: string;
  trim: string;
  // The vernacular's glazing, as a solid color over the wall.
  pane: string;
  gilt: string | null;
  tower: string;
}

// The frame (StartupScreen.tsx's FACADE_VIEW_*), the name band and the span
// it runs.
const CX = 220;
const L = 18;
const R = 422;
export const FACADE_BAND_Y = 108;
const EAVES = FACADE_BAND_Y;
const WALL_TOP = FACADE_BAND_Y + 32;
const STEPS = 202;
const H = 214;
const IRON = '#2d3034';
const DOOR = '#3b3328';
const FACE = '#f2ede0';

// The vernacular's glazing as a solid color: an rgba over the wall.
// Pale glazing (the map's light panes) would vanish into a pale wall at
// this size, so it is drawn as glass catching the sky.
const SKY_GLASS = '#b7c6cf';
export function paneOver(wall: string, glass: string): string {
  const m = glass.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return glass;
  if (Number(m[1]) > 200) return SKY_GLASS;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const n = parseInt(wall.slice(1), 16);
  const base = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const out = [1, 2, 3].map((i, k) => Math.round(Number(m[i]) * a + base[k] * (1 - a)));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// --- Shared parts ------------------------------------------------------

// A hipped roof seen from the front: its slope and its two hip ends.
function HipRoof({ color, eaves = EAVES, ridge, left = L - 4, right = R + 4, reach = 2.2 }: {
  color: string; eaves?: number; ridge: number; left?: number; right?: number; reach?: number;
}) {
  const hip = (eaves - ridge) * reach;
  return (
    <>
      <polygon fill={color} points={`${left},${eaves} ${left + hip},${ridge} ${right - hip},${ridge} ${right},${eaves}`} />
      <polygon fill={shade(color, 1.14)} points={`${left},${eaves} ${left + hip},${ridge} ${left + hip * 1.25},${eaves}`} />
      <polygon fill={shade(color, 0.84)} points={`${right},${eaves} ${right - hip},${ridge} ${right - hip * 1.25},${eaves}`} />
      <rect fill={shade(color, 0.8)} x={left + hip} y={ridge - 1} width={right - left - hip * 2} height="1.5" />
    </>
  );
}

function Clock({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle fill={FACE} stroke={IRON} strokeWidth="0.8" cx={x} cy={y} r={r} />
      <line stroke={IRON} strokeWidth="0.9" x1={x} y1={y} x2={x} y2={y - r * 0.68} />
      <line stroke={IRON} strokeWidth="0.9" x1={x} y1={y} x2={x + r * 0.5} y2={y + r * 0.16} />
    </g>
  );
}

function Finial({ x, top, base, color }: { x: number; top: number; base: number; color: string }) {
  return (
    <g>
      <line stroke={color} strokeWidth="1.4" x1={x} y1={top} x2={x} y2={base} />
      <circle fill={color} cx={x} cy={top + 2} r="1.8" />
    </g>
  );
}

// The steps up to the door, widest at the bottom.
function Steps({ half, color }: { half: number; color: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <rect key={i} fill={shade(color, 0.96 - i * 0.04)} x={CX - half - i * 5} y={STEPS + i * 4} width={(half + i * 5) * 2} height="4" />
      ))}
    </>
  );
}

// A column the height of a storey or two: capital, shaft with its shade,
// base.
function Column({ x, top, bottom, trim, w = 10 }: { x: number; top: number; bottom: number; trim: string; w?: number }) {
  return (
    <g>
      <rect fill={trim} x={x - w / 2 - 2} y={top} width={w + 4} height="3" />
      <rect fill={trim} x={x - w / 2} y={top + 3} width={w} height={bottom - top - 6} />
      <rect fill={shade(trim, 0.82)} x={x + w / 2 - 3} y={top + 3} width="3" height={bottom - top - 6} />
      <rect fill={trim} x={x - w / 2 - 2} y={bottom - 3} width={w + 4} height="3" />
    </g>
  );
}

// A pediment: the triangle, its raking moulding and the tympanum.
function Pediment({ half, base, apex, trim, edge }: { half: number; base: number; apex: number; trim: string; edge?: string }) {
  const inset = half * 0.16;
  return (
    <>
      <polygon fill={trim} stroke={edge ?? shade(trim, 0.72)} strokeWidth={edge ? 2.2 : 1} strokeLinejoin="round" points={`${CX - half},${base} ${CX},${apex} ${CX + half},${base}`} />
      <polygon fill={shade(trim, 0.94)} points={`${CX - half + inset},${base - 2} ${CX},${apex + inset * 0.45} ${CX + half - inset},${base - 2}`} />
    </>
  );
}

// The bays either side of a central entrance: three each side, as
// Georgian's.
const SIDE_BAYS = [54, 82, 110, 330, 358, 386];
const RANKS = [WALL_TOP + 8, WALL_TOP + 36];

// A window that is a rectangle in a frame, with an optional hood over it.
function FramedWindow({ x, y, w = 11, h = 18, pane, frame, hood }: {
  x: number; y: number; w?: number; h?: number; pane: string; frame: string; hood?: 'flat' | 'pediment' | 'segment';
}) {
  return (
    <g>
      <rect fill={frame} x={x - w / 2 - 2} y={y - 2} width={w + 4} height={h + 4} />
      <rect fill={pane} x={x - w / 2} y={y} width={w} height={h} />
      <path stroke={frame} strokeWidth="0.7" fill="none" d={`M ${x} ${y} V ${y + h} M ${x - w / 2} ${y + h / 2} H ${x + w / 2}`} />
      {hood === 'flat' && <rect fill={shade(frame, 0.9)} x={x - w / 2 - 4} y={y - 5} width={w + 8} height="3" />}
      {hood === 'pediment' && <polygon fill={shade(frame, 0.9)} points={`${x - w / 2 - 4},${y - 3} ${x},${y - 8} ${x + w / 2 + 4},${y - 3}`} />}
      {hood === 'segment' && <path fill={shade(frame, 0.9)} d={`M ${x - w / 2 - 4} ${y - 2} A ${w / 2 + 4} 5 0 0 1 ${x + w / 2 + 4} ${y - 2} Z`} />}
    </g>
  );
}

// A round-headed window, with a hood mould over the arch.
function ArchedWindow({ x, y, w = 10, h = 20, pane, frame, hood }: {
  x: number; y: number; w?: number; h?: number; pane: string; frame: string; hood?: string;
}) {
  const r = w / 2;
  return (
    <g>
      <path fill={frame} d={`M ${x - r - 1.5} ${y + h + 1} V ${y + r} A ${r + 1.5} ${r + 1.5} 0 0 1 ${x + r + 1.5} ${y + r} V ${y + h + 1} Z`} />
      <path fill={pane} d={`M ${x - r} ${y + h} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y + r} V ${y + h} Z`} />
      <line stroke={frame} strokeWidth="0.7" x1={x} y1={y + 1} x2={x} y2={y + h} />
      {hood && <path stroke={hood} strokeWidth="1.8" fill="none" d={`M ${x - r - 3.5} ${y + r + 1} A ${r + 3.5} ${r + 3.5} 0 0 1 ${x + r + 3.5} ${y + r + 1}`} />}
      <rect fill={hood ?? frame} x={x - r - 2.5} y={y + h + 1} width={w + 5} height="2" />
    </g>
  );
}

// --- Collegiate Gothic -----------------------------------------------
// The slate roof with its lucarnes and stacks, the stone tower over the
// middle: clock stage, a belfry of lancets between pinnacles, and the
// spire. Below the band: buttresses between paired lancets under hood
// moulds, and the gabled porch with its pointed door.
function GothicCrown({ wall, roof, trim, pane, tower }: FacadePalette) {
  const tw = 17;
  return (
    <>
      {/* Stacks, then the slate, its lucarnes, and the merlons of the parapet. */}
      {[92, 336].map((x) => (
        <g key={x}>
          <rect fill={shade(wall, 0.95)} x={x} y="62" width="10" height="26" />
          <rect fill={shade(wall, 0.8)} x={x + 7} y="62" width="3" height="26" />
          <rect fill={trim} x={x - 2} y="59" width="14" height="3" />
        </g>
      ))}
      <HipRoof color={roof} ridge={82} />
      {[70, 128, 312, 370].map((x) => (
        <g key={x}>
          <rect fill={shade(wall, 1.12)} x={x - 6} y={EAVES - 15} width="12" height="13" />
          <polygon fill={shade(wall, 1.12)} points={`${x - 7},${EAVES - 15} ${x},${EAVES - 22} ${x + 7},${EAVES - 15}`} />
          <path fill={pane} d={`M ${x - 2.5} ${EAVES - 3} V ${EAVES - 10} L ${x} ${EAVES - 13} L ${x + 2.5} ${EAVES - 10} V ${EAVES - 3} Z`} />
        </g>
      ))}
      {Array.from({ length: 29 }, (_, i) => L + i * 14).map((x) => (
        <rect key={x} fill={trim} stroke={shade(trim, 0.8)} strokeWidth="0.5" x={x} y={EAVES - 6} width="8" height="6" />
      ))}
      {/* The spire, its lucarne, and the belfry under it. */}
      <Finial x={CX} top={0} base={8} color={trim} />
      <polygon fill={shade(tower, 0.94)} points={`${CX - 15},44 ${CX},6 ${CX + 15},44`} />
      <polygon fill={shade(tower, 0.78)} points={`${CX},6 ${CX + 15},44 ${CX},44`} />
      <polygon fill={shade(tower, 0.86)} points={`${CX - 4},36 ${CX},30 ${CX + 4},36`} />
      {[CX - tw, CX + tw].map((x) => (
        <g key={x}>
          <polygon fill={shade(tower, x > CX ? 0.82 : 0.96)} points={`${x - 3},36 ${x},22 ${x + 3},36`} />
          <rect fill={shade(tower, x > CX ? 0.86 : 1)} x={x - 3} y="36" width="6" height="12" />
        </g>
      ))}
      <rect fill={tower} x={CX - tw} y="46" width={tw * 2} height={EAVES - 46} />
      <rect fill={shade(tower, 0.86)} x={CX + tw - 7} y="46" width="7" height={EAVES - 46} />
      <rect fill={trim} x={CX - tw - 2} y="44" width={tw * 2 + 4} height="3" />
      {[CX - 7, CX + 7].map((x) => (
        <path key={x} fill="#4a4e52" d={`M ${x - 3.5} 64 V 54 L ${x} 49 L ${x + 3.5} 54 V 64 Z`} />
      ))}
      <rect fill={trim} x={CX - tw - 1} y="66" width={tw * 2 + 2} height="2.5" />
      <Clock x={CX} y={80} r={7} />
      <rect fill={trim} x={CX - tw - 1} y="91" width={tw * 2 + 2} height="2.5" />

    </>
  );
}

function Lancets({ x, y, h, pane, trim }: { x: number; y: number; h: number; pane: string; trim: string }) {
  return (
    <g>
      {[x - 4.5, x + 4.5].map((lx) => (
        <path key={lx} fill={pane} stroke={shade(trim, 0.85)} strokeWidth="0.6" d={`M ${lx - 3} ${y + h} V ${y + 6} L ${lx} ${y + 1} L ${lx + 3} ${y + 6} V ${y + h} Z`} />
      ))}
      <path stroke={trim} strokeWidth="1.3" fill="none" d={`M ${x - 10} ${y + 9} V ${y + 4} L ${x} ${y - 3} L ${x + 10} ${y + 4} V ${y + 9}`} />
      <rect fill={trim} x={x - 9} y={y + h} width="18" height="2" />
    </g>
  );
}

function GothicFront({ wall, trim, pane }: FacadePalette) {
  const lancetBays = [70, 114, 158, 282, 326, 370];
  const buttresses = [48, 92, 136, 304, 348, 392];
  return (
    <>
      {/* Coursing in the stone. */}
      {[150, 162, 174, 186, 198].map((y) => (
        <line key={y} stroke={shade(wall, 0.93)} strokeWidth="0.6" x1={L} y1={y} x2={R} y2={y} />
      ))}
      {lancetBays.flatMap((x) => [WALL_TOP + 8, WALL_TOP + 36].map((y) => <Lancets key={`${x}-${y}`} x={x} y={y} h={20} pane={pane} trim={trim} />))}
      {buttresses.map((x) => (
        <g key={x}>
          <rect fill={shade(wall, 1.08)} x={x - 4} y={WALL_TOP} width="8" height={STEPS - WALL_TOP} />
          <polygon fill={shade(wall, 1.04)} points={`${x - 6},${STEPS} ${x - 6},176 ${x},170 ${x + 6},176 ${x + 6},${STEPS}`} />
          <rect fill={shade(wall, 0.82)} x={x + 3} y="176" width="3" height={STEPS - 176} />
          <rect fill={trim} x={x - 6} y="174" width="12" height="2" />
        </g>
      ))}
      {/* The porch: a gable of its own, crenellated, over a pointed door. */}
      <rect fill={shade(wall, 1.06)} x={CX - 38} y="160" width="76" height={STEPS - 160} />
      <rect fill={shade(wall, 0.86)} x={CX + 30} y="160" width="8" height={STEPS - 160} />
      <polygon fill={shade(wall, 1.06)} stroke={trim} strokeWidth="1.4" strokeLinejoin="round" points={`${CX - 42},162 ${CX},${WALL_TOP + 4} ${CX + 42},162`} />
      <circle fill={pane} stroke={trim} strokeWidth="1" cx={CX} cy="154" r="4" />
      <path fill={trim} d={`M ${CX - 18} ${STEPS} V 184 L ${CX} 164 L ${CX + 18} 184 V ${STEPS} Z`} />
      <path fill={DOOR} d={`M ${CX - 14} ${STEPS} V 185 L ${CX} 169 L ${CX + 14} 185 V ${STEPS} Z`} />
      <line stroke={shade(DOOR, 1.5)} strokeWidth="0.8" x1={CX} y1="170" x2={CX} y2={STEPS} />
      <Steps half={30} color={trim} />
    </>
  );
}

// --- Classical ---------------------------------------------------------
// The low copper hip behind its balustrade, the drum and its shallow dome
// with a lantern and a gilt finial, and the great pediment. Below: coursed
// ashlar, pedimented windows, and six columns before the door.
function ClassicalCrown({ roof, trim, gilt, tower }: FacadePalette) {
  const gold = gilt ?? trim;
  return (
    <>
      <Finial x={CX} top={6} base={20} color={gold} />
      <rect fill={trim} x={CX - 6} y="20" width="12" height="11" />
      <rect fill={shade(trim, 0.84)} x={CX + 2} y="20" width="4" height="11" />
      <path fill={tower} d={`M ${CX - 9} 21 A 9 4 0 0 1 ${CX + 9} 21 Z`} />
      <path fill={shade(tower, 0.97)} stroke={shade(tower, 0.8)} strokeWidth="0.7" d={`M ${CX - 54} 58 A 54 26 0 0 1 ${CX + 54} 58 Z`} />
      <path fill={shade(tower, 1.06)} d={`M ${CX - 44} 56 A 46 22 0 0 1 ${CX - 6} 33 A 40 24 0 0 0 ${CX - 30} 56 Z`} />
      <rect fill={trim} x={CX - 58} y="57" width="116" height="4" />
      <rect fill={tower} x={CX - 52} y="61" width="104" height="32" />
      <rect fill={shade(tower, 0.86)} x={CX + 24} y="61" width="28" height="32" />
      {Array.from({ length: 9 }, (_, i) => CX - 44 + i * 11).map((x) => (
        <g key={x}>
          <rect fill={shade(tower, x > CX + 20 ? 0.8 : 0.9)} x={x - 1} y="61" width="2" height="32" />
          <rect fill={paneOver(tower, 'rgba(70, 80, 80, 0.35)')} x={x + 3} y="68" width="4" height="14" rx="2" />
        </g>
      ))}

      <HipRoof color={roof} ridge={90} reach={3} />
      {/* The balustrade along the eaves: rail, balusters, plinth. */}
      <rect fill={trim} x={L} y="94" width={R - L} height="3" />
      {Array.from({ length: 67 }, (_, i) => L + 2 + i * 6).map((x) => (
        <rect key={x} fill={shade(trim, 0.92)} x={x} y="97" width="2.6" height="9" rx="1" />
      ))}
      <rect fill={trim} x={L} y="105" width={R - L} height="3" />

      <Pediment half={92} base={EAVES} apex={66} trim={trim} />
      <circle fill={paneOver(trim, 'rgba(70, 80, 80, 0.4)')} stroke={shade(trim, 0.75)} strokeWidth="1.2" cx={CX} cy="92" r="5" />
    </>
  );
}

function ClassicalFront({ wall, trim, pane }: FacadePalette) {
  const cols = [-75, -45, -15, 15, 45, 75].map((d) => CX + d);
  return (
    <>
      {[152, 164, 176, 188, 200].map((y) => (
        <line key={y} stroke={shade(wall, 0.92)} strokeWidth="0.7" x1={L} y1={y} x2={R} y2={y} />
      ))}
      {SIDE_BAYS.flatMap((x) => RANKS.map((y, r) => (
        <FramedWindow key={`${x}-${y}`} x={x} y={y + 2} pane={pane} frame={trim} hood={r === 0 ? 'pediment' : 'flat'} />
      )))}
      {/* The portico: the shade behind it, its door, its six columns. */}
      <rect fill={shade(wall, 0.72)} x={CX - 88} y={WALL_TOP} width="176" height={STEPS - WALL_TOP} />
      <rect fill={shade(trim, 0.86)} x={CX - 12} y="160" width="24" height={STEPS - 160} />
      <rect fill={DOOR} x={CX - 9} y="165" width="18" height={STEPS - 165} />
      <line stroke={shade(DOOR, 1.5)} strokeWidth="0.8" x1={CX} y1="165" x2={CX} y2={STEPS} />
      {[CX - 30, CX + 30].map((x) => <FramedWindow key={x} x={x} y={150} pane={shade(pane, 0.8)} frame={shade(trim, 0.86)} hood="flat" />)}
      {cols.map((x) => (
        <g key={x}>
          <Column x={x} top={WALL_TOP} bottom={STEPS} trim={trim} />
          {[-2.5, 0, 2.5].map((d) => <line key={d} stroke={shade(trim, 0.88)} strokeWidth="0.5" x1={x + d - 1} y1={WALL_TOP + 4} x2={x + d - 1} y2={STEPS - 4} />)}
          <circle fill={trim} cx={x - 6} cy={WALL_TOP + 4} r="2" />
          <circle fill={trim} cx={x + 6} cy={WALL_TOP + 4} r="2" />
        </g>
      ))}
      <Steps half={92} color={trim} />
    </>
  );
}

// --- Mission -----------------------------------------------------------
// The terracotta hip on deep eaves, the campanile with its paired arched
// openings under a tiled cap. Below: a rank of round-headed windows in the
// stucco, a tiled pent roof, and the arcade along the ground.
function MissionCrown({ wall, roof, trim, gilt, tower }: FacadePalette) {
  const tw = 17;
  return (
    <>
      <HipRoof color={roof} ridge={76} left={L - 12} right={R + 12} reach={2.4} />
      {/* Barrel tiles in courses down the slope. */}
      {Array.from({ length: 40 }, (_, i) => 94 + i * 6.4).filter((x) => x < 346).map((x) => (
        <line key={x} stroke={shade(roof, 0.86)} strokeWidth="0.7" x1={x} y1="77" x2={x} y2={EAVES - 3} />
      ))}
      <rect fill={shade(roof, 0.68)} x={L - 12} y={EAVES - 3} width={R - L + 24} height="3" />
      <rect fill={shade(wall, 0.8)} x={L} y={EAVES} width={R - L} height="2" />
      <Finial x={CX} top={4} base={16} color={gilt ?? trim} />
      <polygon fill={roof} points={`${CX - tw - 4},38 ${CX},14 ${CX + tw + 4},38`} />
      <polygon fill={shade(roof, 0.8)} points={`${CX},14 ${CX + tw + 4},38 ${CX},38`} />
      <rect fill={shade(roof, 0.7)} x={CX - tw - 4} y="37" width={tw * 2 + 8} height="2.5" />
      <rect fill={tower} x={CX - tw} y="39" width={tw * 2} height={EAVES - 39} />
      <rect fill={shade(tower, 0.84)} x={CX + tw - 8} y="39" width="8" height={EAVES - 39} />
      {[CX - 7, CX + 7].map((x) => (
        <path key={x} fill="#4c5255" d={`M ${x - 4.5} 64 V 50 A 4.5 4.5 0 0 1 ${x + 4.5} 50 V 64 Z`} />
      ))}
      <path fill="#8a6a32" d={`M ${CX - 9} 56 l 2 -4 h 4 l 2 4 Z M ${CX + 5} 56 l 2 -4 h 4 l 2 4 Z`} />
      <rect fill={trim} x={CX - tw - 1} y="65" width={tw * 2 + 2} height="3" />
      <rect fill={shade(tower, 0.9)} x={CX - 2} y="76" width="4" height="10" rx="2" />

    </>
  );
}

function MissionFront({ wall, roof, trim, pane }: FacadePalette) {
  const upper = Array.from({ length: 12 }, (_, i) => 54 + i * 30.2);
  const span = (R - L) / 7;
  return (
    <>
      {upper.map((x) => <ArchedWindow key={x} x={x} y={WALL_TOP + 6} w={9} h={18} pane={pane} frame={shade(wall, 0.84)} />)}
      {/* The pent roof over the arcade. */}
      <polygon fill={roof} points={`${L - 6},178 ${L},168 ${R},168 ${R + 6},178`} />
      {Array.from({ length: 70 }, (_, i) => L + 2 + i * 5.8).map((x) => (
        <line key={x} stroke={shade(roof, 0.84)} strokeWidth="0.6" x1={x} y1="169" x2={x} y2="177" />
      ))}
      <rect fill={shade(roof, 0.66)} x={L - 6} y="177" width={R - L + 12} height="2" />
      {/* The arcade: piers in the stucco's light, arches in shadow. */}
      <rect fill={trim} x={L} y="179" width={R - L} height={H - 179} />
      {Array.from({ length: 7 }, (_, i) => L + i * span).map((x0) => (
        <g key={x0}>
          <path fill="#33403f" d={`M ${x0 + 6} ${H} V 194 A ${span / 2 - 6} 12 0 0 1 ${x0 + span - 6} 194 V ${H} Z`} />
          <path fill={shade(trim, 0.82)} d={`M ${x0 + 6} ${H} V 194 A ${span / 2 - 6} 12 0 0 1 ${x0 + span / 2} 182 L ${x0 + span / 2} 186 A ${span / 2 - 10} 9 0 0 0 ${x0 + 10} 195 V ${H} Z`} />
        </g>
      ))}
    </>
  );
}

// --- Modern ------------------------------------------------------------
// The flat roof behind its parapet, a row of north lights on it, and the
// carillon (Plan 87L): an open concrete frame, braced, with its bells and
// clock. Below: ribbon windows between fins, the glazed ground story and
// the canopy over the door.
function ModernCrown({ wall, roof, tower }: FacadePalette) {
  const frame = shade(tower, 0.72);
  const x = CX - 17;
  const w = 34;
  return (
    <>
      {/* North lights on the roof deck, left of the tower. */}
      <rect fill={roof} x={L + 30} y="88" width={R - L - 60} height="12" />
      {[90, 128, 166, 270, 308].map((sx) => (
        <g key={sx}>
          <polygon fill="#e9e8e3" points={`${sx},100 ${sx},82 ${sx + 34},100`} />
          <rect fill="#9fb4c0" x={sx} y="82" width="3" height="18" />
          <line stroke="#6f7479" strokeWidth="0.7" x1={sx} y1="82" x2={sx} y2="76" />
        </g>
      ))}
      {/* The carillon. */}
      <line stroke={IRON} strokeWidth="1.2" x1={CX} y1="0" x2={CX} y2="10" />
      <rect fill={shade(tower, 0.8)} x={x - 6} y="8" width={w + 12} height="4" />
      <rect fill={frame} x={x - 2} y="12" width="7" height={EAVES - 12} />
      <rect fill={frame} x={x + w - 5} y="12" width="7" height={EAVES - 12} />
      <path fill="#8a6a3a" d={`M ${CX - 3} 15 L ${CX + 3} 15 L ${CX + 4} 22 L ${CX + 6} 26 L ${CX - 6} 26 L ${CX - 4} 22 Z`} />
      <path fill="#8a6a3a" d={`M ${CX - 11} 21 h 4 l 1 4 h -6 Z M ${CX + 7} 21 h 4 l 1 4 h -6 Z`} />
      <rect fill={shade(tower, 0.8)} x={x + 5} y="29" width={w - 10} height="18" />
      <Clock x={CX} y={38} r={6} />
      {[50, 66, 84].map((y) => <rect key={y} fill={frame} x={x + 5} y={y} width={w - 10} height="3" />)}
      {[[53, 66], [69, 84], [87, EAVES]].map(([a, b]) => (
        <path key={a} stroke={frame} strokeWidth="1.6" fill="none" d={`M ${x + 5} ${a} L ${x + w - 5} ${b} M ${x + w - 5} ${a} L ${x + 5} ${b}`} />
      ))}
      {/* The parapet. */}
      <rect fill={shade(wall, 1.04)} x={L - 2} y="98" width={R - L + 4} height={EAVES - 98} />
      <rect fill={shade(wall, 1.1)} x={L - 2} y="98" width={R - L + 4} height="2" />
    </>
  );
}

function ModernFront({ wall, trim, pane }: FacadePalette) {
  const fins = Array.from({ length: 16 }, (_, i) => 46 + i * 23.2);
  const glaze = '#8fbbe0';
  return (
    <>
      {[146, 166].map((y) => <rect key={y} fill={pane} x={L} y={y} width={R - L} height="13" />)}
      <rect fill={shade(wall, 0.86)} x={L} y="182" width={R - L} height="2" />
      <rect fill={glaze} x={L} y="184" width={R - L} height={H - 184} />
      <rect fill={shade(glaze, 1.12)} x={L} y="184" width={R - L} height="4" />
      {fins.map((x) => (
        <g key={x}>
          <rect fill={shade(wall, 1.08)} x={x - 1.5} y={WALL_TOP} width="3" height="42" />
          <rect fill={shade(wall, 0.8)} x={x + 1.5} y={WALL_TOP} width="1" height="42" />
          <rect fill={trim} x={x - 1.2} y="184" width="2.4" height={H - 184} />
        </g>
      ))}
      {/* The canopy and the door under it. */}
      <rect fill={shade(glaze, 0.7)} x={CX - 18} y="186" width="36" height={STEPS - 186} />
      <line stroke={trim} strokeWidth="1" x1={CX} y1="186" x2={CX} y2={STEPS} />
      <rect fill={trim} x={CX - 40} y="178" width="80" height="4" />
      <rect fill={shade(wall, 0.6)} x={CX - 40} y="182" width="80" height="2" />
      {[CX - 36, CX + 34].map((x) => <rect key={x} fill={shade(wall, 0.85)} x={x} y="184" width="2" height={STEPS - 184} />)}
      <Steps half={26} color={trim} />
    </>
  );
}

// --- Tudor -------------------------------------------------------------
// The steep slate with tall brick stacks, and the gatehouse: battlemented
// brick between corner turrets with slate caps and gilt vanes, a clock and
// a mullioned oriel. Below: close-studded timbering over the brick ground
// story, and the gabled brick porch with its four-centred door.
function TudorCrown({ wall, roof, trim, pane, gilt, tower }: FacadePalette) {
  const gold = gilt ?? trim;
  const tw = 24;
  const slate = roof;
  return (
    <>
      {/* Clustered stacks, then the steep slate. */}
      {[78, 344].map((x) => (
        <g key={x}>
          {[0, 7].map((d) => <rect key={d} fill={shade(wall, d ? 0.86 : 1)} x={x + d} y="44" width="6" height="36" />)}
          <rect fill={trim} x={x - 2} y="41" width="17" height="3" />
        </g>
      ))}
      <HipRoof color={slate} ridge={70} reach={1.6} />
      {/* The rear turrets' caps, over the battlements. */}
      {[CX - 11, CX + 11].map((x) => (
        <g key={x}>
          <Finial x={x} top={6} base={14} color={gold} />
          <polygon fill={shade(slate, x > CX ? 0.82 : 1)} points={`${x - 5},28 ${x},14 ${x + 5},28`} />
          <rect fill={shade(tower, 0.9)} x={x - 4} y="28" width="8" height="6" />
        </g>
      ))}
      <rect fill={tower} x={CX - tw} y="36" width={tw * 2} height={EAVES - 36} />
      <rect fill={shade(tower, 0.84)} x={CX + tw - 9} y="36" width="9" height={EAVES - 36} />
      {Array.from({ length: 6 }, (_, i) => CX - tw + 2 + i * 8.4).map((x) => (
        <rect key={x} fill={tower} x={x} y="30" width="5" height="6" />
      ))}
      <rect fill={trim} x={CX - tw} y="36" width={tw * 2} height="2" />
      <Clock x={CX} y={50} r={6.5} />
      {/* The oriel: stone mullions and transom. */}
      <rect fill={trim} x={CX - 11} y="63" width="22" height="24" />
      <rect fill={pane} x={CX - 9} y="65" width="18" height="20" />
      <path stroke={trim} strokeWidth="1" fill="none" d={`M ${CX - 3} 65 V 85 M ${CX + 3} 65 V 85 M ${CX - 9} 74 H ${CX + 9}`} />
      <polygon fill={trim} points={`${CX - 12},87 ${CX + 12},87 ${CX + 7},92 ${CX - 7},92`} />
      <rect fill={shade(tower, 0.6)} x={CX + 14} y="58" width="2" height="12" />
      {[CX - tw - 3, CX + tw + 3].map((x) => (
        <g key={x}>
          <Finial x={x} top={2} base={10} color={gold} />
          <polygon fill={shade(slate, x > CX ? 0.82 : 1)} points={`${x - 6},26 ${x},10 ${x + 6},26`} />
          <rect fill={shade(tower, x > CX ? 0.82 : 0.94)} x={x - 5} y="26" width="10" height={EAVES - 26} />
          {[34, 40].map((y) => <rect key={y} fill={shade(tower, 0.6)} x={x - 1} y={y + 20} width="2" height="5" />)}
        </g>
      ))}
    </>
  );
}

function TudorFront({ wall, trim, pane }: FacadePalette) {
  const oak = '#3b2e27';
  const lime = '#ece3cc';
  const upper = [62, 104, 146, 294, 336, 378];
  return (
    <>
      {/* The timbered storey: limewash, close studs, the rails, and its
          mullioned lights. */}
      <rect fill={lime} x={L} y={WALL_TOP} width={R - L} height="38" />
      {Array.from({ length: 45 }, (_, i) => L + 2 + i * 9.1).map((x) => (
        <rect key={x} fill={oak} x={x} y={WALL_TOP} width="2.6" height="38" />
      ))}
      {[WALL_TOP, WALL_TOP + 17, WALL_TOP + 35].map((y) => <rect key={y} fill={oak} x={L} y={y} width={R - L} height="3" />)}
      {upper.map((x) => (
        <g key={x}>
          <rect fill={oak} x={x - 12} y={WALL_TOP + 4} width="24" height="12" />
          <rect fill={pane} x={x - 10} y={WALL_TOP + 5} width="20" height="10" />
          <path stroke={oak} strokeWidth="1" fill="none" d={`M ${x - 3.3} ${WALL_TOP + 5} V ${WALL_TOP + 15} M ${x + 3.3} ${WALL_TOP + 5} V ${WALL_TOP + 15}`} />
        </g>
      ))}
      {/* The brick ground story and its paired lights. */}
      <rect fill={wall} x={L} y="178" width={R - L} height={H - 178} />
      {[184, 190, 196, 202, 208].map((y) => <line key={y} stroke={shade(wall, 0.9)} strokeWidth="0.5" x1={L} y1={y} x2={R} y2={y} />)}
      {[62, 104, 146, 294, 336, 378].map((x) => (
        <g key={x}>
          <rect fill={trim} x={x - 9} y="183" width="18" height="14" />
          {[x - 4, x + 4].map((lx) => <rect key={lx} fill={pane} x={lx - 3} y="185" width="6" height="10" />)}
          <rect fill={trim} x={x - 10} y="181" width="20" height="2" />
        </g>
      ))}
      {/* The porch. */}
      <rect fill={shade(wall, 1.05)} x={CX - 30} y="160" width="60" height={STEPS - 160} />
      <rect fill={shade(wall, 0.84)} x={CX + 22} y="160" width="8" height={STEPS - 160} />
      <polygon fill={shade(wall, 1.05)} points={`${CX - 34},162 ${CX},${WALL_TOP + 2} ${CX + 34},162`} />
      <polyline fill="none" stroke={trim} strokeWidth="2" strokeLinejoin="round" points={`${CX - 36},163 ${CX},${WALL_TOP + 1} ${CX + 36},163`} />
      <path fill={trim} d={`M ${CX - 15} ${STEPS} V 182 Q ${CX - 15} 170 ${CX} 168 Q ${CX + 15} 170 ${CX + 15} 182 V ${STEPS} Z`} />
      <path fill={DOOR} d={`M ${CX - 12} ${STEPS} V 183 Q ${CX - 12} 173 ${CX} 171 Q ${CX + 12} 173 ${CX + 12} 183 V ${STEPS} Z`} />
      <Steps half={22} color={trim} />
    </>
  );
}

// --- Italianate ----------------------------------------------------------
// The low hip on deep bracketed eaves, and the belvedere: a stone tower
// with arched openings and clocks under its own bracketed cap. Below:
// round-headed windows under hood moulds, and a pedimented portico.
function ItalianateCrown({ roof, trim, pane, gilt, tower }: FacadePalette) {
  const tw = 19;
  return (
    <>
      <HipRoof color={roof} ridge={76} eaves={100} left={L - 16} right={R + 16} reach={3.4} />
      <rect fill={shade(roof, 0.7)} x={L - 16} y="100" width={R - L + 32} height="3" />
      {Array.from({ length: 18 }, (_, i) => L + 6 + i * 23.4).map((x) => (
        <g key={x}>
          {[-2.5, 2.5].map((d) => (
            <path key={d} fill={trim} d={`M ${x + d - 1.2} 103 h 2.4 v 5 h -2.4 Z`} />
          ))}
        </g>
      ))}
      <Finial x={CX} top={8} base={22} color={gilt ?? trim} />
      <polygon fill={roof} points={`${CX - tw - 10},36 ${CX},22 ${CX + tw + 10},36`} />
      <polygon fill={shade(roof, 0.8)} points={`${CX},22 ${CX + tw + 10},36 ${CX},36`} />
      <rect fill={shade(roof, 0.7)} x={CX - tw - 10} y="36" width={tw * 2 + 20} height="2.5" />
      <rect fill={tower} x={CX - tw} y="38" width={tw * 2} height={EAVES - 38} />
      <rect fill={shade(tower, 0.84)} x={CX + tw - 8} y="38" width="8" height={EAVES - 38} />
      {Array.from({ length: 6 }, (_, i) => CX - tw + 3 + i * 6.8).map((x) => (
        <rect key={x} fill={trim} x={x - 1} y="38.5" width="2.4" height="4" />
      ))}
      {[CX - 11, CX, CX + 11].map((x) => (
        <path key={x} fill={pane} d={`M ${x - 3.5} 60 V 49 A 3.5 3.5 0 0 1 ${x + 3.5} 49 V 60 Z`} />
      ))}
      <rect fill={trim} x={CX - tw - 1} y="62" width={tw * 2 + 2} height="3" />
      <Clock x={CX} y={77} r={7} />

    </>
  );
}

function ItalianateFront({ wall, trim, pane, roof }: FacadePalette) {
  const cols = [-50, -18, 18, 50].map((d) => CX + d);
  return (
    <>
      {SIDE_BAYS.flatMap((x) => RANKS.map((y) => (
        <ArchedWindow key={`${x}-${y}`} x={x} y={y} w={10} h={20} pane={pane} frame={trim} hood={shade(trim, 0.9)} />
      )))}
      <rect fill={trim} x={L} y="167" width={R - L} height="2" />
      {/* Behind the portico: its windows, and the arched door. */}
      {[CX - 44, CX, CX + 44].map((x) => <ArchedWindow key={x} x={x} y={RANKS[0]} w={10} h={18} pane={pane} frame={trim} hood={shade(trim, 0.9)} />)}
      <rect fill={shade(wall, 0.74)} x={CX - 64} y="172" width="128" height={STEPS - 172} />
      <path fill={shade(trim, 0.86)} d={`M ${CX - 12} ${STEPS} V 186 A 12 12 0 0 1 ${CX + 12} 186 V ${STEPS} Z`} />
      <path fill={DOOR} d={`M ${CX - 9} ${STEPS} V 187 A 9 9 0 0 1 ${CX + 9} 187 V ${STEPS} Z`} />
      {/* The portico: its pediment, entablature and four columns. */}
      <polygon fill={trim} stroke={shade(roof, 0.9)} strokeWidth="2" strokeLinejoin="round" points={`${CX - 66},168 ${CX},151 ${CX + 66},168`} />
      <polygon fill={shade(trim, 0.93)} points={`${CX - 52},166.5 ${CX},154.5 ${CX + 52},166.5`} />
      <rect fill={trim} x={CX - 64} y="168" width="128" height="5" />
      {cols.map((x) => <Column key={x} x={x} top={173} bottom={STEPS} trim={trim} w={8} />)}
      <Steps half={66} color={trim} />
    </>
  );
}

// --- Second Empire -------------------------------------------------------
// The mansard with its arched dormers and iron cresting, and the pavilion
// tower: a clock stage under a tall mansard cap with an oeil-de-boeuf.
// Below: pedimented windows, a string course, and the portico.
function SecondEmpireCrown({ roof, trim, pane, gilt, tower }: FacadePalette) {
  const tw = 20;
  const cresting = (x1: number, x2: number, y: number) => (
    <>
      <line stroke={IRON} strokeWidth="1.3" x1={x1} y1={y} x2={x2} y2={y} />
      {Array.from({ length: Math.floor((x2 - x1) / 5) + 1 }, (_, i) => x1 + i * 5).map((x) => (
        <line key={x} stroke={IRON} strokeWidth="0.7" x1={x} y1={y} x2={x} y2={y - 4} />
      ))}
    </>
  );
  return (
    <>
      {/* The mansard: its slope, its dormers, the cornice and cresting. */}
      <polygon fill={roof} points={`${L - 4},${EAVES} ${L + 12},60 ${R - 12},60 ${R + 4},${EAVES}`} />
      <polygon fill={shade(roof, 1.12)} points={`${L - 4},${EAVES} ${L + 12},60 ${L + 18},${EAVES}`} />
      <polygon fill={shade(roof, 0.84)} points={`${R + 4},${EAVES} ${R - 12},60 ${R - 18},${EAVES}`} />
      {cresting(L + 12, R - 12, 60)}
      {Array.from({ length: 12 }, (_, i) => L + 34 + i * 32).filter((x) => Math.abs(x - CX) > 30).map((x) => (
        <g key={x}>
          <path fill={trim} d={`M ${x - 7.5} 100 V 78 A 7.5 7.5 0 0 1 ${x + 7.5} 78 V 100 Z`} />
          <path fill={pane} stroke={shade(trim, 0.7)} strokeWidth="0.6" d={`M ${x - 4.5} 98 V 79 A 4.5 4.5 0 0 1 ${x + 4.5} 79 V 98 Z`} />
        </g>
      ))}
      {/* The pavilion tower. */}
      <Finial x={CX} top={0} base={10} color={gilt ?? trim} />
      {cresting(CX - 16, CX + 16, 12)}
      <polygon fill={roof} points={`${CX - tw - 4},40 ${CX - 16},12 ${CX + 16},12 ${CX + tw + 4},40`} />
      <polygon fill={shade(roof, 0.8)} points={`${CX + 6},12 ${CX + 16},12 ${CX + tw + 4},40 ${CX + 8},40`} />
      <ellipse fill={trim} cx={CX} cy="27" rx="5.5" ry="6.5" />
      <ellipse fill={shade(roof, 0.6)} cx={CX} cy="27" rx="3.5" ry="4.5" />
      <rect fill={trim} x={CX - tw - 5} y="40" width={tw * 2 + 10} height="3" />
      <rect fill={tower} x={CX - tw} y="43" width={tw * 2} height={EAVES - 43} />
      <rect fill={shade(tower, 0.84)} x={CX + tw - 8} y="43" width="8" height={EAVES - 43} />
      <Clock x={CX} y={53} r={7} />

      <Pediment half={60} base={EAVES} apex={80} trim={trim} edge={shade(roof, 0.9)} />
      <circle fill={pane} stroke={shade(trim, 0.75)} strokeWidth="1.2" cx={CX} cy="97" r="4.5" />
      <rect fill={trim} x={L - 6} y={EAVES - 3} width={R - L + 12} height="3" />
    </>
  );
}

function SecondEmpireFront({ wall, trim, pane }: FacadePalette) {
  const cols = [-50, -18, 18, 50].map((d) => CX + d);
  return (
    <>
      {SIDE_BAYS.flatMap((x) => RANKS.map((y, r) => (
        <FramedWindow key={`${x}-${y}`} x={x} y={y + 2} pane={pane} frame={trim} hood={r === 0 ? 'segment' : 'pediment'} />
      )))}
      <rect fill={trim} x={L} y="168" width={R - L} height="3" />
      {/* Quoins at the corners of the portico bay. */}
      {[CX - 66, CX + 60].flatMap((x) => [0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={`${x}-${i}`} fill={shade(trim, 0.95)} x={x + (i % 2 ? 1 : 0)} y={WALL_TOP + i * 10} width={i % 2 ? 5 : 6} height="8" />
      )))}
      <rect fill={shade(wall, 0.72)} x={CX - 60} y={WALL_TOP} width="120" height={STEPS - WALL_TOP} />
      {[CX - 34, CX + 34].map((x) => RANKS.map((y) => <FramedWindow key={`${x}-${y}`} x={x} y={y + 2} pane={shade(pane, 0.8)} frame={shade(trim, 0.86)} hood="flat" />))}
      <rect fill={shade(trim, 0.86)} x={CX - 11} y="166" width="22" height={STEPS - 166} />
      <rect fill={DOOR} x={CX - 8} y="170" width="16" height={STEPS - 170} />
      <path fill={pane} stroke={shade(trim, 0.86)} strokeWidth="1" d={`M ${CX - 8} 170 A 8 6 0 0 1 ${CX + 8} 170 Z`} />
      {cols.map((x) => <Column key={x} x={x} top={WALL_TOP} bottom={STEPS} trim={trim} />)}
      <Steps half={62} color={trim} />
    </>
  );
}

// --- Art Deco ------------------------------------------------------------
// The flat roof behind a parapet banded in gilt, and the ziggurat: fluted
// setbacks, each capped in gilt, a clock on the lowest, and the mast.
// Below: piers the full height, windows and chevroned spandrels between
// them, and the recessed entrance under its canopy.
function ArtDecoCrown({ wall, trim, gilt, tower }: FacadePalette) {
  const gold = gilt ?? trim;
  const stages: [number, number, number][] = [[26, 54, EAVES], [19, 34, 54], [12, 18, 34]];
  return (
    <>
      <line stroke={gold} strokeWidth="1.6" x1={CX} y1="0" x2={CX} y2="18" />
      {stages.map(([half, top, bottom]) => (
        <g key={top}>
          <rect fill={tower} x={CX - half} y={top} width={half * 2} height={bottom - top} />
          <rect fill={shade(tower, 0.84)} x={CX + half - 8} y={top} width="8" height={bottom - top} />
          {Array.from({ length: Math.floor((half * 2 - 4) / 5) }, (_, i) => CX - half + 4 + i * 5).map((x) => (
            <line key={x} stroke={shade(tower, 0.86)} strokeWidth="0.7" x1={x} y1={top + 4} x2={x} y2={bottom} />
          ))}
          <rect fill={gold} x={CX - half - 1} y={top} width={half * 2 + 2} height="2.5" />
        </g>
      ))}
      <rect fill={tower} x={CX - 10} y="72" width="20" height="20" />
      <Clock x={CX} y={82} r={7.5} />

      {/* The parapet: pier heads, the gilt band, the coping. */}
      <rect fill={shade(wall, 1.03)} x={L} y="90" width={R - L} height={EAVES - 90} />
      {Array.from({ length: 11 }, (_, i) => 46 + i * 34.8).map((x) => (
        <rect key={x} fill={shade(wall, 1.08)} x={x - 4} y="86" width="8" height={EAVES - 86} />
      ))}
      <rect fill={shade(wall, 1.1)} x={L} y="90" width={R - L} height="2" />
      <rect fill={gold} x={L} y="98" width={R - L} height="3" />
    </>
  );
}

function ArtDecoFront({ wall, trim, pane, gilt }: FacadePalette) {
  const gold = gilt ?? trim;
  const piers = Array.from({ length: 11 }, (_, i) => 46 + i * 34.8);
  const bays = piers.slice(0, -1).map((x, i) => (x + piers[i + 1]) / 2);
  return (
    <>
      {bays.map((x) => (
        <g key={x}>
          <rect fill={pane} x={x - 11} y="145" width="22" height="16" />
          <rect fill={shade(wall, 0.9)} x={x - 11} y="161" width="22" height="7" />
          <polyline fill="none" stroke={gold} strokeWidth="0.8" points={`${x - 9},166 ${x - 6},163 ${x - 3},166 ${x},163 ${x + 3},166 ${x + 6},163 ${x + 9},166`} />
          {Math.abs(x - CX) > 40 && <rect fill={pane} x={x - 11} y="168" width="22" height="16" />}
          {[x - 4, x + 4].map((m) => <line key={m} stroke={shade(wall, 1.05)} strokeWidth="0.8" x1={m} y1="145" x2={m} y2="184" />)}
        </g>
      ))}
      {piers.map((x) => (
        <g key={x}>
          <rect fill={shade(wall, 1.07)} x={x - 4} y={WALL_TOP} width="8" height={H - WALL_TOP} />
          <rect fill={shade(wall, 0.85)} x={x + 2.5} y={WALL_TOP} width="1.5" height={H - WALL_TOP} />
        </g>
      ))}
      <rect fill={shade(wall, 0.92)} x={L} y="188" width={R - L} height="2" />
      {/* The recessed entrance under its canopy. */}
      <rect fill={shade(wall, 0.45)} x={CX - 40} y="174" width="80" height={STEPS - 174} />
      {[-27, -9, 9, 27].map((d) => (
        <g key={d}>
          <rect fill={pane} x={CX + d - 7} y="178" width="14" height={STEPS - 178} />
          <rect fill="none" stroke={gold} strokeWidth="0.8" x={CX + d - 7} y="178" width="14" height={STEPS - 178} />
        </g>
      ))}
      <rect fill={trim} x={CX - 46} y="169" width="92" height="5" />
      <rect fill={gold} x={CX - 46} y="173" width="92" height="1.5" />
      <Steps half={42} color={trim} />
    </>
  );
}

const CROWNS: Partial<Record<Vernacular, (p: FacadePalette) => ReactNode>> = {
  gothic: GothicCrown, classical: ClassicalCrown, mission: MissionCrown, modern: ModernCrown,
  tudor: TudorCrown, italianate: ItalianateCrown, secondEmpire: SecondEmpireCrown, artDeco: ArtDecoCrown,
};
const FRONTS: Partial<Record<Vernacular, (p: FacadePalette) => ReactNode>> = {
  gothic: GothicFront, classical: ClassicalFront, mission: MissionFront, modern: ModernFront,
  tudor: TudorFront, italianate: ItalianateFront, secondEmpire: SecondEmpireFront, artDeco: ArtDecoFront,
};

export function FacadeCrown({ vernacular, palette }: { vernacular: Vernacular; palette: FacadePalette }) {
  const draw = CROWNS[vernacular];
  return draw ? <>{draw(palette)}</> : null;
}

export function FacadeFront({ vernacular, palette }: { vernacular: Vernacular; palette: FacadePalette }) {
  const draw = FRONTS[vernacular];
  return draw ? <>{draw(palette)}</> : null;
}
