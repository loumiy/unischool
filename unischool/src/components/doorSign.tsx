import type { Buildable } from '../state/types';
import { boxFaces, facePoint, polyPoints, wallOf } from './isoProjection';
import { doorOf, wallHeightOf } from './buildingSpec';
import { sidesOf } from './facing';
import type { Plot } from './facing';

// Door signs (Plan 99D): a small plate on the wall beside a building's front
// door, with its name. Drawn with the building, so it sorts with it and a
// building in front hides it; only on the front wall, and only while the
// camera sees that wall. Buildings with no front door (open ground, the
// stadium, the village, the landmarks: doorOf's null) get none.
//
// The plates are drawn whatever the zoom, and shown from SIGNS_FROM_ZOOM in:
// CampusMap gives the map the `signs` class there, and styles.css hides
// `.door-sign` without it. The canvas map reads the same rule (its rules
// are read under the map's classes, mapCanvas.ts), so both maps agree.

export const SIGNS_FROM_ZOOM = 1.4;

// The most characters a plate holds before its name is cut with an
// ellipsis, and the plate's size in a wall's own units.
export const SIGN_MAX_CHARS = 22;
// Tiles between the door's edge and the plate: clear of a porch or a
// portico's side where the wall has room, else close by the door.
const SIGN_GAPS = [0.5, 0.15];
const CHAR_WIDTH = 0.56;          // a character's width, in font sizes (the UI's sans)

export function signText(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length <= SIGN_MAX_CHARS) return clean;
  return `${clean.slice(0, SIGN_MAX_CHARS - 1).trimEnd()}…`;
}

export default function DoorSign({ t, p, label }: { t: Buildable; p: Plot; label: string }) {
  const door = doorOf(t);
  const H = wallHeightOf(t);
  if (!door || H <= 0) return null;
  const front = sidesOf(p.facing).front;
  const f = boxFaces(p.col, p.row, p.w, p.h, 0, H);
  const wall = wallOf(f, front);
  if (!wall.visible) return null;
  const span = front === 'posRow' || front === 'negRow' ? p.w : p.h;
  const text = signText(label);
  // The letters at a third of the door's height; the plate a little larger.
  const size = Math.max(3.2, door.height * 0.32);
  const plateW = text.length * CHAR_WIDTH * size + size;
  const run = Math.hypot(wall.along.x - wall.origin.x, wall.along.y - wall.origin.y);
  if (run <= 0) return null;
  const uw = plateW / run;
  // Beside the door, on the side nearer the screen's right.
  const doorHalf = Math.min(door.widthTiles / span, 0.6) / 2;
  const right = wall.along.x >= wall.origin.x;
  const fits = (gap: number) => {
    const near = 0.5 + doorHalf + gap / span;
    const lo = right ? near : 1 - near - uw;
    return lo >= 0.02 && lo + uw <= 0.98 ? lo : null;
  };
  const u0 = SIGN_GAPS.map(fits).find((u) => u !== null);
  if (u0 === undefined || u0 === null) return null; // no room beside the door on this wall
  const u1 = u0 + uw;
  const vMid = (door.threshold + door.height * 0.55) / H;
  const vh = (size * 1.5) / H / 2;
  if (vMid + vh > 0.95) return null;
  const at = (u: number, v: number) => facePoint(wall.origin, wall.along, H, u, v);
  const a = at(u0, vMid - vh); const b = at(u1, vMid - vh); const c = at(u1, vMid + vh); const d = at(u0, vMid + vh);
  const mid = at((u0 + u1) / 2, vMid);
  const slope = (b.y - a.y) / (b.x - a.x || 1);
  return (
    <g className="door-sign">
      <polygon className="door-sign-plate" points={polyPoints([a, b, c, d])} />
      <text
        className="door-sign-text"
        transform={`matrix(1 ${slope.toFixed(4)} 0 1 ${mid.x.toFixed(2)} ${mid.y.toFixed(2)})`}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size.toFixed(2)}
      >
        {text}
      </text>
    </g>
  );
}
