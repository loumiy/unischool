import { heightScale, project, type Pt } from './isoProjection';

// The wind: like the sun (light.ts), one direction across the grid, fixed to
// the world rather than the screen, so a flag keeps flying the same way over
// the ground as the camera turns (as the crane's jib holds its heading, see
// siteWorks.tsx) instead of always streaming to the right of the screen.
//
// Toward +col and more toward -row: screen-right and a touch up at the
// opening camera, and never quite toward or away from the camera at any of
// the four views, so a flag is never seen edge-on as a sliver.
const WIND_TO = { col: 0.45, row: -0.9 };

// The screen vector of something `tiles` long streaming downwind. A world
// vector projected, so it foreshortens with the turn and the tilt.
export function downwind(tiles: number): Pt {
  return project(WIND_TO.col * tiles, WIND_TO.row * tiles);
}

// A flag's cloth as an SVG path: hoisted at `top` on its pole, streaming
// `tiles` downwind, `drop` deep, starting `from` below the pole's head, and
// billowing a little up across its middle. Depths are screen units as
// authored at the opening camera and foreshorten with the tilt like any
// height (isoProjection's lift).
export function flagCloth(top: Pt, tiles: number, from: number, drop: number, billow: number): string {
  const hs = heightScale();
  const w = downwind(tiles);
  const n = (v: number) => v.toFixed(2);
  const y0 = top.y + from * hs;
  return `M${n(top.x)},${n(y0)} q${n(w.x / 2)},${n(w.y / 2 - billow * hs)} ${n(w.x)},${n(w.y)} `
    + `v${n(drop * hs)} q${n(-w.x / 2)},${n(-w.y / 2 - billow * hs)} ${n(-w.x)},${n(-w.y)} Z`;
}
