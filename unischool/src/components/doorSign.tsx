import type { Buildable } from '../state/types';
import { boxFaces, facePoint, polyPoints, wallOf } from './isoProjection';
import { doorOf, wallHeightOf } from './buildingSpec';
import { sidesOf } from './facing';
import type { Plot } from './facing';

// Door signs (Plan 99D): a small plate on the wall over a building's front
// door, centred, with its name. Drawn with the building, so it sorts with it and a
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
  const run = Math.hypot(wall.along.x - wall.origin.x, wall.along.y - wall.origin.y);
  if (run <= 0) return null;
  // Small: a detail of the building, not something to read from afar (the
  // owner, 13 October). No wider than the door, so it stays in the door's
  // bay: between a portico's middle columns, under a porch's gable. Long
  // names take smaller letters; the plate is a little larger than them.
  const doorW = (Math.min(door.widthTiles / span, 0.6)) * run;
  const size = Math.min(door.height * 0.12, (doorW * 1.15) / (text.length * CHAR_WIDTH + 0.8));
  if (size < 0.8) return null; // too small to be a sign
  const plateW = text.length * CHAR_WIDTH * size + size * 0.8;
  const uw = plateW / run;
  // Centred over the door, just above its head (the door is at the front's
  // middle).
  const u0 = 0.5 - uw / 2;
  const u1 = 0.5 + uw / 2;
  const vh = (size * 1.4) / H / 2;
  const vMid = (door.threshold + door.height + size * 0.5) / H + vh;
  if (vMid + vh > 0.97) return null; // no wall above the door for it
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
