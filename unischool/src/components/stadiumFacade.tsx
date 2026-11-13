import { useContext } from 'react';
import type { SchoolColors } from '../state/types';
import { CollegeNameContext, ColorsContext } from './mapOccasions';
import { facePoint, heightScale, polyPoints, type Pt } from './isoProjection';
import { METRES_PER_TILE, up } from './campusScale';
import { shade } from './tint';

// The football stadium's outside (Plan 124 M2): a college stadium's face in
// place of the plain brick box. After Ohio Stadium's arches and rotunda,
// Notre Dame Stadium's brick and Bryant-Denny's facade:
//   - a stone plinth;
//   - ground-level openings, with a wide gate every sixth bay;
//   - a tier of tall arches with stone voussoirs (round, pointed or
//     square-headed as the vernacular's openings are);
//   - banners in the college's colours on every third pier;
//   - a limestone cornice carrying the stadium's name;
// Each expansion adds to it: the opening stands get an arcade along their
// backs, the ends a second, the closed bowl its full height of arches and
// gates, and the upper deck a second tier of arches over the first.

export type ArchHead = 'round' | 'pointed' | 'flat';

// One outer wall as the camera sees it: from `origin` to `along` on the
// ground (screen points at its foot), `height` high in screen units as
// authored, `span` tiles long, in its brick.
export interface FacadeWall {
  origin: Pt;
  along: Pt;
  height: number;
  span: number;
  brick: string;
}

export interface StadiumFacadeProps {
  walls: ReadonlyArray<FacadeWall>;
  // 0–1: the stands' backs; 2: the closed bowl; 3: with its upper deck.
  stage: number;
  head: ArchHead;
  stone: string;
  // The building's own name ("Football Stadium" reads as the college's).
  name: string;
}

export function StadiumFacade(props: StadiumFacadeProps) {
  return stadiumFacadeArt(props, useContext(ColorsContext), useContext(CollegeNameContext));
}

// The stadium's name as it is carved: a "Football Stadium" is the college's.
export function stadiumTitle(name: string, college: string): string {
  return (name === 'Football Stadium' && college ? `${college} Stadium` : name).toUpperCase();
}

const DARK = '#2a2421';
// A capital's width in the inscription's face, letter-spacing and all, as
// a share of its size.
const CHAR_W = 0.8;

// A face's v per unit of u, so a round arch is round in the world.
function aspect(span: number, hgt: number): number {
  return up(METRES_PER_TILE * span) / Math.max(0.0001, hgt);
}

// An opening on a wall, centred at uc, halfU each side, from v0 up to its
// crown at `top`: round, pointed (an equilateral lancet) or square-headed.
function opening(w: FacadeWall, head: ArchHead, uc: number, halfU: number, v0: number, top: number): Pt[] {
  const at = (u: number, v: number) => facePoint(w.origin, w.along, w.height, u, v);
  const k = aspect(w.span, w.height);
  if (head === 'flat') return [at(uc - halfU, v0), at(uc - halfU, top), at(uc + halfU, top), at(uc + halfU, v0)];
  const pts: Pt[] = [at(uc - halfU, v0)];
  if (head === 'round') {
    const vr = halfU * k;
    const spring = Math.max(v0, top - vr);
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI - (i / 10) * Math.PI;
      pts.push(at(uc + Math.cos(a) * halfU, spring + Math.sin(a) * vr));
    }
  } else {
    // Two arcs of radius twice the half-width, meeting at the crown.
    const R = halfU * 2;
    const rise = R * Math.sin(Math.PI / 3) * k;
    const spring = Math.max(v0, top - rise);
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * (Math.PI / 3);
      pts.push(at(uc + halfU - R * Math.cos(a), spring + R * Math.sin(a) * k));
    }
    for (let i = 4; i >= 0; i--) {
      const a = (i / 5) * (Math.PI / 3);
      pts.push(at(uc - halfU + R * Math.cos(a), spring + R * Math.sin(a) * k));
    }
  }
  pts.push(at(uc + halfU, v0));
  return pts;
}

function band(w: FacadeWall, v0: number, v1: number, u0 = 0, u1 = 1): Pt[] {
  const at = (u: number, v: number) => facePoint(w.origin, w.along, w.height, u, v);
  return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
}

// The tiers on a wall, as v fractions, by stage.
interface Tiers {
  plinth: number;
  ground: [number, number] | null;     // the ground openings
  tall: [number, number];              // the tall arches
  upper: [number, number] | null;      // the upper deck's arches
  cornice: number;                     // where the cornice starts
  banner: [number, number];
}
function tiersOf(stage: number): Tiers {
  if (stage >= 3) return { plinth: 0.05, ground: [0.05, 0.15], tall: [0.19, 0.58], upper: [0.62, 0.82], cornice: 0.86, banner: [0.3, 0.56] };
  if (stage === 2) return { plinth: 0.06, ground: [0.06, 0.19], tall: [0.25, 0.81], upper: null, cornice: 0.86, banner: [0.38, 0.76] };
  return { plinth: 0.1, ground: null, tall: [0.18, 0.76], upper: null, cornice: 0.82, banner: [0.3, 0.7] };
}

function wallArt(w: FacadeWall, key: string, p: StadiumFacadeProps, colors: SchoolColors, title: string, named: boolean): React.JSX.Element {
  const { head, stone, stage } = p;
  const tiers = tiersOf(stage);
  const bays = Math.max(3, Math.round(w.span / (stage >= 2 ? 1.15 : 0.95)));
  const bu = 1 / bays;
  const lime = stone;
  const limeShade = shade(stone, 0.86);
  const parts: React.JSX.Element[] = [];
  // The brick, over the stands' plain backs.
  parts.push(<polygon key="b" points={polyPoints(band(w, 0, 1))} fill={w.brick} />);
  parts.push(<polygon key="pl" points={polyPoints(band(w, 0, tiers.plinth))} fill={limeShade} />);
  const arcade = (span: [number, number], half: number, tag: string) => {
    for (let i = 0; i < bays; i++) {
      const uc = (i + 0.5) * bu;
      // The voussoirs: a ring of stone round the opening.
      const ring = opening(w, head, uc, half * bu + bu * 0.07, span[0], span[1] + (span[1] - span[0]) * 0.04);
      parts.push(<polygon key={`${tag}r${i}`} points={polyPoints(ring)} fill={lime} />);
      parts.push(<polygon key={`${tag}o${i}`} points={polyPoints(opening(w, head, uc, half * bu, span[0], span[1]))} fill={DARK} />);
    }
    // A sill course under the tier.
    parts.push(<polygon key={`${tag}s`} points={polyPoints(band(w, span[0] - 0.012, span[0] + 0.01))} fill={lime} />);
  };
  if (tiers.ground) {
    const [g0, g1] = tiers.ground;
    for (let i = 0; i < bays; i++) {
      const uc = (i + 0.5) * bu;
      const gate = i % 6 === 3;
      const pts = gate ? opening(w, head, uc, 0.4 * bu, 0, g1 + 0.03) : opening(w, head, uc, 0.2 * bu, g0, g1);
      if (gate) parts.push(<polygon key={`gr${i}`} points={polyPoints(opening(w, head, uc, 0.46 * bu, 0, g1 + 0.05))} fill={lime} />);
      parts.push(<polygon key={`g${i}`} points={polyPoints(pts)} fill={DARK} />);
    }
  }
  arcade(tiers.tall, stage >= 2 ? 0.31 : 0.3, 't');
  if (tiers.upper) arcade(tiers.upper, 0.26, 'u');
  // Banners on every third pier, hung from the pier's head.
  for (let i = 3; i < bays; i += 3) {
    const u = i * bu;
    const half = bu * 0.15;
    const [b0, b1] = tiers.banner;
    parts.push(<polygon key={`bn${i}`} points={polyPoints(band(w, b0, b1, u - half, u + half))} fill={colors.primary} />);
    parts.push(<polygon key={`bs${i}`} points={polyPoints(band(w, b0 + (b1 - b0) * 0.12, b1 - (b1 - b0) * 0.06, u - half * 0.3, u + half * 0.3))} fill={colors.secondary} />);
  }
  // The cornice, and the name cut in it on the longest wall.
  parts.push(<polygon key="cs" points={polyPoints(band(w, tiers.cornice - 0.02, tiers.cornice))} fill={shade(lime, 0.7)} />);
  parts.push(<polygon key="c" points={polyPoints(band(w, tiers.cornice, 1))} fill={lime} />);
  if (named && title) {
    const mid = facePoint(w.origin, w.along, w.height, 0.5, (tiers.cornice + 1) / 2);
    const len = Math.hypot(w.along.x - w.origin.x, w.along.y - w.origin.y);
    const ux = (w.along.x - w.origin.x) / Math.max(0.001, len);
    const uy = (w.along.y - w.origin.y) / Math.max(0.001, len);
    const bandPx = w.height * (1 - tiers.cornice) * heightScale();
    const size = Math.min(bandPx * 0.78, (len * 0.6) / (Math.max(8, title.length) * CHAR_W));
    if (size >= 2.5) {
      parts.push(
        <text key="n" className="stadium-inscription" fontSize={size}
          transform={`matrix(${ux.toFixed(4)},${uy.toFixed(4)},0,1,${mid.x.toFixed(1)},${mid.y.toFixed(1)})`}>
          {title}
        </text>,
      );
    }
  }
  return <g key={key}>{parts}</g>;
}

export function stadiumFacadeArt(p: StadiumFacadeProps, colors: SchoolColors, college: string): React.JSX.Element {
  const title = stadiumTitle(p.name, college);
  // The name goes on the longest wall the camera sees.
  let longest = -1;
  p.walls.forEach((w, i) => { if (longest < 0 || w.span > p.walls[longest]!.span) longest = i; });
  const walls = p.walls.map((w, i) => wallArt(w, `w${i}`, p, colors, title, p.stage >= 2 && i === longest));
  return (
    <g className="stadium-facade">
      {walls}
    </g>
  );
}
