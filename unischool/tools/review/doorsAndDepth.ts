// ---------------------------------------------------------------------
// THE DOOR AND DEPTH CHECKER (Plan 73, areas 1 and 7). A checker, not a
// picture: every door on every building is tested against its neighbors'
// footprints, trees, props and paths, in each of the four views that draw
// it, and every scene's paint order against depthSort.ts's own relation;
// every building's drawing is measured against the box the sort gives it,
// so an attachment that reaches a neighbor's tile is found by rule. Each
// hit names the save, the view, the building and the tile, so it can then
// be looked at (`npm run review:views`).
//
//   npm run review:doors -- node_modules/.tmp/arrangements/*.json
//   npm run review:doors -- a.json b.json --out node_modules/.tmp/doors
//
// The rules (each a row in the report):
//   door-onto-ground   a drawn door opens onto open ground (a court, a
//                      pool, a quad, a garden): nothing hides it
//   door-behind-mass   a door's tile is built over by a mass: the wall is
//                      hidden from the views that would draw it, and the
//                      walkers treat the door as shut (walkRoutes.ts)
//   door-under-tree    a tree stands on a drawn door's tile (paved tiles
//                      hide their trees, so an unpaved one)
//   door-under-prop    a lamp, a bench, the flag or a bike rack stands on a
//                      drawn door's tile
//   door-onto-lawn     a drawn door opens onto grass: no path reaches it
//   door-on-seam       the wall is an even number of tiles long, so its
//                      door is drawn on the seam between two tiles
//   door-unreachable   the door's tile is open, but no way on foot joins it
//                      to the road
//   walled-in          all four doors are shut; walkers reach the building
//                      at the nearest open tile round its edge
//   prop-on-tree       the flag or a bike rack is placed on a tile with a
//                      drawn tree or a lamp or bench (dressing.tsx checks
//                      buildings, not trees or the other props)
//   prop-behind        the flag or a rack stands on the building's +row
//                      side, which two of the four views do not face
//   overhang           a building draws beyond its footprint (steps, a
//                      portico, a crane): how far, and what stands there
//   depth-order        two things the camera sees overlap and the scene
//                      paints them against depthSort.ts's own relation
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Buildable, GameState, Placement } from '../../src/state/types';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../../src/state/types';
import { ROAD_FIRST_ROW, isLand, parsePathTileKey, pathTileKey, placementTiles } from '../../src/state/campusMap';
import { DEFAULT_PITCH, VIEWS, project, setCamera, unproject, visibleWalls, type FaceDir, type Pt } from '../../src/components/isoProjection';
import { depthOrder, occludes, type DepthBox } from '../../src/components/depthSort';
import BuildingMotif, { materialOf } from '../../src/components/buildingMotifs';
import { doorFamilyOf, motifOf } from '../../src/components/buildingSpec';
import { groundProps } from '../../src/components/groundMarkings';
import { campusLayout } from '../../src/components/campusLayout';
import { dressingProps } from '../../src/components/dressing';
import { dressingKindOf } from '../../src/state/dressing';
import type { DressingItem } from '../../src/state/types';
import { FOUNDERS_HALL_ID, isAcademicHall } from '../../src/data/techData';

// What a lamp or bench is called in a hit.
const dressingLabel = (item: DressingItem | undefined): string => (item ? dressingKindOf(item) : 'prop');

export type Rule =
  | 'door-onto-ground' | 'door-behind-mass' | 'door-under-tree' | 'door-under-prop' | 'door-onto-lawn' | 'door-on-seam'
  | 'door-unreachable' | 'walled-in' | 'prop-on-tree' | 'prop-behind' | 'overhang' | 'depth-order';

export interface Hit {
  save: string;
  rule: Rule;
  building: string;
  name: string;
  views: number[];          // the views (0–3, E turns) in which it shows
  wall?: string;
  tile?: string;
  other?: string;
  detail: string;
}

const WALLS: Array<{ side: FaceDir; name: string }> = [
  { side: 'posRow', name: 'south' }, { side: 'negRow', name: 'north' }, { side: 'posCol', name: 'east' }, { side: 'negCol', name: 'west' },
];
const INSET = 0.06; // CampusMap.tsx's BUILDING_INSET

// The tiles a wall's door opens onto (walkRoutes.ts's entrancesOf): the one
// under an odd wall's middle, the two either side of an even wall's.
function doorTiles(p: Placement, side: FaceDir): Array<{ row: number; col: number }> {
  const midCol = p.col + p.w / 2;
  const midRow = p.row + p.h / 2;
  const across = (mid: number, even: boolean) => (even ? [mid - 1, mid] : [Math.floor(mid)]);
  switch (side) {
    case 'posRow': return across(midCol, p.w % 2 === 0).map((c) => ({ row: p.row + p.h, col: c }));
    case 'negRow': return across(midCol, p.w % 2 === 0).map((c) => ({ row: p.row - 1, col: c }));
    case 'posCol': return across(midRow, p.h % 2 === 0).map((r) => ({ row: r, col: p.col + p.w }));
    case 'negCol': return across(midRow, p.h % 2 === 0).map((r) => ({ row: r, col: p.col - 1 }));
  }
}
const wallLength = (p: Placement, side: FaceDir) => (side === 'posRow' || side === 'negRow' ? p.w : p.h);

// Which views draw a wall: the two it faces of the four.
function viewsDrawing(side: FaceDir): number[] {
  const out: number[] = [];
  for (let k = 0; k < 4; k++) {
    setCamera({ azimuth: VIEWS[k], pitch: DEFAULT_PITCH });
    const seen = visibleWalls();
    if (seen.left === side || seen.right === side) out.push(k);
  }
  return out;
}

// ---- SVG coordinates, transforms applied ----
type M = [number, number, number, number, number, number]; // a b c d e f
const IDENT: M = [1, 0, 0, 1, 0, 0];
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: M, x: number, y: number): Pt => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
function parseTransform(t: string): M {
  let m: M = IDENT;
  for (const [, fn, body] of t.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = body.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === 'translate') m = mul(m, [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0]);
    else if (fn === 'matrix' && v.length === 6) m = mul(m, v as M);
    else if (fn === 'scale') m = mul(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0]);
    else if (fn === 'rotate') {
      const a = ((v[0] ?? 0) * Math.PI) / 180;
      const [cx, cy] = [v[1] ?? 0, v[2] ?? 0];
      m = mul(m, [1, 0, 0, 1, cx, cy]);
      m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
      m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    }
  }
  return m;
}
const attr = (attrs: string, name: string) => attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
const nums = (s: string) => (s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);

function pathPoints(d: string): Pt[] {
  const out: Pt[] = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  for (const [, cmd, body] of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const v = nums(body);
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const push = (nx: number, ny: number) => { x = rel ? x + nx : nx; y = rel ? y + ny : ny; out.push({ x, y }); };
    if (C === 'Z') { x = sx; y = sy; continue; }
    if (C === 'M' || C === 'L' || C === 'T') {
      for (let i = 0; i + 1 < v.length; i += 2) { push(v[i], v[i + 1]); if (C === 'M' && i === 0) { sx = x; sy = y; } }
    } else if (C === 'H') { for (const n of v) { x = rel ? x + n : n; out.push({ x, y }); } }
    else if (C === 'V') { for (const n of v) { y = rel ? y + n : n; out.push({ x, y }); } }
    else if (C === 'C') { for (let i = 0; i + 5 < v.length; i += 6) push(v[i + 4], v[i + 5]); }
    else if (C === 'S' || C === 'Q') { for (let i = 0; i + 3 < v.length; i += 4) push(v[i + 2], v[i + 3]); }
    else if (C === 'A') { for (let i = 0; i + 6 < v.length; i += 7) push(v[i + 5], v[i + 6]); }
  }
  return out;
}

export function markupPoints(svg: string): { points: Pt[]; skipped: number } {
  const points: Pt[] = [];
  const stack: M[] = [IDENT];
  let skipped = 0;
  for (const [, close, name, attrs, self] of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    const t = attr(attrs, 'transform');
    const m = t ? mul(stack[stack.length - 1], parseTransform(t)) : stack[stack.length - 1];
    const add = (x: number, y: number) => { if (Number.isFinite(x) && Number.isFinite(y)) points.push(apply(m, x, y)); };
    switch (name) {
      case 'polygon': case 'polyline': { const v = nums(attr(attrs, 'points') ?? ''); for (let i = 0; i + 1 < v.length; i += 2) add(v[i], v[i + 1]); break; }
      case 'line': add(+(attr(attrs, 'x1') ?? 0), +(attr(attrs, 'y1') ?? 0)); add(+(attr(attrs, 'x2') ?? 0), +(attr(attrs, 'y2') ?? 0)); break;
      case 'rect': { const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((k) => +(attr(attrs, k) ?? 0)); add(x, y); add(x + w, y + h); break; }
      case 'circle': { const [cx, cy, r] = ['cx', 'cy', 'r'].map((k) => +(attr(attrs, k) ?? 0)); add(cx - r, cy); add(cx + r, cy); add(cx, cy + r); add(cx, cy - r); break; }
      case 'ellipse': { const [cx, cy, rx, ry] = ['cx', 'cy', 'rx', 'ry'].map((k) => +(attr(attrs, k) ?? 0)); add(cx - rx, cy); add(cx + rx, cy); add(cx, cy + ry); add(cx, cy - ry); break; }
      case 'path': for (const p of pathPoints(attr(attrs, 'd') ?? '')) add(p.x, p.y); break;
      case 'text': case 'tspan': skipped += 1; break;
      default: break;
    }
    if (!self && name !== 'polygon' && name !== 'polyline' && name !== 'line' && name !== 'rect' && name !== 'circle' && name !== 'ellipse' && name !== 'path') stack.push(m);
    else if (!self) stack.push(m);
  }
  return { points, skipped };
}

// How far a drawing reaches past the upward prism of its footprint: the
// deepest point below the footprint's front edges (toward the camera) and
// beyond its side corners, in screen units, and the ground tiles those
// points stand over.
function overhangOf(points: Pt[], d: { col: number; row: number; w: number; h: number }): { front: number; side: number; tiles: Set<string> } {
  const corners = [project(d.col, d.row), project(d.col + d.w, d.row), project(d.col + d.w, d.row + d.h), project(d.col, d.row + d.h)];
  const minX = Math.min(...corners.map((c) => c.x)); const maxX = Math.max(...corners.map((c) => c.x));
  // The lower envelope of the rhombus at x: the largest y on its outline there.
  const lower = (x: number) => {
    let best = -Infinity;
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      if ((x < Math.min(a.x, b.x) - 1e-9) || (x > Math.max(a.x, b.x) + 1e-9)) continue;
      const y = a.x === b.x ? Math.max(a.y, b.y) : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
      best = Math.max(best, y);
    }
    return best;
  };
  let front = 0, side = 0;
  const tiles = new Set<string>();
  const TOL = 1.5;
  for (const p of points) {
    let out = 0;
    if (p.x < minX - TOL) { side = Math.max(side, minX - p.x); out = minX - p.x; }
    else if (p.x > maxX + TOL) { side = Math.max(side, p.x - maxX); out = p.x - maxX; }
    else {
      const below = p.y - lower(Math.min(maxX, Math.max(minX, p.x)));
      if (below > TOL) { front = Math.max(front, below); out = below; }
    }
    if (out > TOL) {
      const g = unproject(p.x, p.y);
      const t = { row: Math.floor(g.row), col: Math.floor(g.col) };
      // Only the ground next to the building: a tall roof overhanging
      // sideways is not standing on anything.
      if (t.row >= d.row - 2 && t.row <= d.row + d.h + 1 && t.col >= d.col - 2 && t.col <= d.col + d.w + 1
        && !(t.row >= Math.floor(d.row) && t.row < d.row + d.h && t.col >= Math.floor(d.col) && t.col < d.col + d.w)) {
        tiles.add(pathTileKey(t));
      }
    }
  }
  return { front, side, tiles };
}

// ---- The walkable grid: every open tile reachable from the road ----
function reachMask(s: GameState): Uint8Array {
  const W = CAMPUS_GRID_WIDTH, H = CAMPUS_GRID_HEIGHT;
  const open = new Uint8Array(W * H).fill(1);
  const byId = new Map(s.tech.map((t) => [t.id, t]));
  for (const [id, p] of Object.entries(s.placements)) {
    if (byId.get(id)?.facilityType === 'quad') continue;
    for (const t of placementTiles(p)) open[t.row * W + t.col] = 0;
  }
  const seen = new Uint8Array(W * H);
  const queue: number[] = [];
  for (let r = ROAD_FIRST_ROW; r < H; r++) for (let c = 0; c < W; c++) { const j = r * W + c; seen[j] = 1; queue.push(j); }
  while (queue.length) {
    const j = queue.pop()!;
    const r = Math.floor(j / W), c = j % W;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
      const k = nr * W + nc;
      if (open[k] && !seen[k]) { seen[k] = 1; queue.push(k); }
    }
  }
  return seen;
}

// ---- One save ----
export interface Overhang { id: string; name: string; motif: string; view: number; front: number; side: number; developing: boolean }
export const overhangs: Overhang[] = [];

export function check(saveName: string, s: GameState): Hit[] {
  const hits: Hit[] = [];
  const byId = new Map(s.tech.map((t) => [t.id, t]));
  const placed = Object.entries(s.placements).map(([id, p]) => ({ id, p, t: byId.get(id)! })).filter((x) => x.t);
  const occupant = new Map<string, { id: string; t: Buildable }>();
  for (const { id, p, t } of placed) for (const tile of placementTiles(p)) occupant.set(pathTileKey(tile), { id, t });
  const treeAt = (key: string) => key in s.trees && !(key in s.pathways);
  const dressing = s.dressing ?? {};
  const reach = reachMask(s);
  const layout = campusLayout(s);
  // Props the scene adds itself (the flag, the racks), by tile.
  const props = new Map<string, string>();
  for (const pr of dressingProps(layout)) props.set(`${pr.row},${pr.col}`, pr.key.startsWith('d-') ? (dressingLabel(dressing[`${pr.row},${pr.col}`])) : pr.key === 'flag' ? 'flag' : 'bike rack');

  for (const { id, p, t } of placed) {
    const name = t.name;
    const family = doorFamilyOf(t);
    const motif = motifOf(t);
    if (family) {
      let shut = 0;
      for (const { side, name: wall } of WALLS) {
        const views = viewsDrawing(side);
        const tiles = doorTiles(p, side);
        const base = { save: saveName, building: id, name, views, wall };
        if (wallLength(p, side) % 2 === 0) {
          hits.push({ ...base, rule: 'door-on-seam', detail: `${wall} wall is ${wallLength(p, side)} tiles long: its door is drawn on the seam between two tiles (${t.kind === 'dorm' ? 'a residence' : motif}, ${p.w}x${p.h})` });
        }
        let isShut = false;
        for (const tile of tiles) {
          const key = pathTileKey(tile);
          const tileText = `${tile.row},${tile.col}`;
          if (!isLand(tile.row, tile.col)) { isShut = true; continue; }
          const occ = occupant.get(key);
          if (occ) {
            isShut = true;
            const flat = motifOf(occ.t) === 'grounds';
            hits.push({ ...base, rule: flat ? 'door-onto-ground' : 'door-behind-mass', tile: tileText, other: occ.id,
              detail: flat ? `${wall} door opens onto ${occ.t.name}` : `${wall} door opens into ${occ.t.name}'s wall` });
            continue;
          }
          if (treeAt(key)) hits.push({ ...base, rule: 'door-under-tree', tile: tileText, detail: `a tree stands on the ${wall} door's tile` });
          const prop = props.get(key);
          if (prop) hits.push({ ...base, rule: 'door-under-prop', tile: tileText, other: prop, detail: `a ${prop} stands on the ${wall} door's tile` });
          if (!(key in s.pathways)) hits.push({ ...base, rule: 'door-onto-lawn', tile: tileText, detail: `${wall} door opens onto grass` });
          if (!reach[tile.row * CAMPUS_GRID_WIDTH + tile.col]) hits.push({ ...base, rule: 'door-unreachable', tile: tileText, detail: `${wall} door's tile has no way on foot to the road` });
        }
        if (isShut) shut += 1;
      }
      if (shut === 4) hits.push({ save: saveName, rule: 'walled-in', building: id, name, views: [0, 1, 2, 3], detail: 'every door is shut; walkers reach it at the nearest open tile round its edge' });
    }
  }

  // The flag and the racks: on a tree, a lamp or a bench; behind the building.
  const flagHall = layout.byId.get(FOUNDERS_HALL_ID);
  for (const pr of dressingProps(layout)) {
    if (pr.key.startsWith('d-')) continue;
    const key = `${pr.row},${pr.col}`;
    const what = pr.key === 'flag' ? 'flag' : 'bike rack';
    const owner = pr.key === 'flag' ? flagHall?.t : layout.placed.find((e) => `r-${e.t.id}` === pr.key)?.t;
    if (treeAt(key)) hits.push({ save: saveName, rule: 'prop-on-tree', building: owner?.id ?? '', name: owner?.name ?? '', views: [0, 1, 2, 3], tile: key, other: what, detail: `the ${what} stands on a tile with a tree` });
    if (dressing[key]) hits.push({ save: saveName, rule: 'prop-on-tree', building: owner?.id ?? '', name: owner?.name ?? '', views: [0, 1, 2, 3], tile: key, other: what, detail: `the ${what} stands on a tile with a ${dressingLabel(dressing[key])}` });
    if (owner) hits.push({ save: saveName, rule: 'prop-behind', building: owner.id, name: owner.name, views: [0, 1, 2, 3].filter((k) => !viewsDrawing('posRow').includes(k)), tile: key, other: what, detail: `the ${what} stands on the +row side, behind the building in two views` });
  }

  // Overhang and paint order, view by view. The scene is sorted first, so
  // an overhang can be judged against what is painted before it.
  for (let k = 0; k < 4; k++) {
    setCamera({ azimuth: VIEWS[k], pitch: DEFAULT_PITCH });
    // The scene as CampusMap.tsx sorts it.
    type Entry = DepthBox & { key: string };
    const entries: Entry[] = [];
    for (const { id, p, t } of placed) {
      if (motifOf(t) === 'grounds') {
        const d = { col: p.col + INSET, row: p.row + INSET, w: p.w - 2 * INSET, h: p.h - 2 * INSET };
        for (const pr of groundProps(t.facilityType, d.col, d.row, d.w, d.h, t.tier, t.status === 'developing' && t.renovatingFrom === undefined, t.id, t.expansions ?? 0)) {
          entries.push({ key: `g-${id}-${pr.key}`, col: pr.col, row: pr.row, w: pr.w, h: pr.h });
        }
      } else entries.push({ key: `b-${id}`, col: p.col, row: p.row, w: p.w, h: p.h });
    }
    for (const pr of dressingProps(layout)) entries.push({ key: pr.key, col: pr.col, row: pr.row, w: pr.w, h: pr.h });
    for (const key of Object.keys(s.trees)) {
      if (key in s.pathways) continue;
      const tile = parsePathTileKey(key);
      if (tile) entries.push({ key: `t-${key}`, col: tile.col, row: tile.row, w: 1, h: 1 });
    }
    const order = depthOrder(entries);
    const at = new Map(order.map((e, i) => [e.key, i]));
    // What stands on a tile, as scene entries.
    const standing = new Map<string, string[]>();
    for (const e of order) {
      if (e.w > 1 || e.h > 1) {
        for (let r = Math.floor(e.row); r < e.row + e.h; r++) for (let c = Math.floor(e.col); c < e.col + e.w; c++) standing.set(`${r},${c}`, [...(standing.get(`${r},${c}`) ?? []), e.key]);
      } else standing.set(`${Math.floor(e.row)},${Math.floor(e.col)}`, [...(standing.get(`${Math.floor(e.row)},${Math.floor(e.col)}`) ?? []), e.key]);
    }
    const label = (key: string) => key.startsWith('b-') ? (byId.get(key.slice(2))?.name ?? key) : key.startsWith('t-') ? 'a tree' : key === 'flag' ? 'the flag' : key.startsWith('r-') ? 'a bike rack' : key.startsWith('d-') ? `a ${dressingLabel(dressing[key.slice(2)])}` : key.startsWith('g-') ? `${byId.get(key.split('-').slice(1, -1).join('-'))?.name ?? 'open ground'}'s ${key.split('-').pop()}` : key;
    for (const { id, p, t } of placed) {
      if (motifOf(t) === 'grounds') continue;
      const d = { col: p.col + INSET, row: p.row + INSET, w: p.w - 2 * INSET, h: p.h - 2 * INSET };
      const developing = t.status === 'developing';
      const svg = renderToStaticMarkup(createElement('svg', null, createElement(BuildingMotif, {
        t, p: d, material: materialOf(t, s.self.vernacular), vernacular: s.self.vernacular, developing,
      })));
      const o = overhangOf(markupPoints(svg).points, d);
      overhangs.push({ id, name: t.name, motif: motifOf(t), view: k, front: o.front, side: o.side, developing });
      // Drawn over something painted before it: an attachment standing in
      // what is behind it on screen, the one overlap painter's order gets wrong.
      const mine = at.get(`b-${id}`) ?? -1;
      const under = [...o.tiles].flatMap((tile) => (standing.get(tile) ?? []).filter((key) => key !== `b-${id}` && (at.get(key) ?? Infinity) < mine && !key.startsWith('g-')).map((key) => ({ tile, key })));
      if (under.length > 0) {
        const what = [...new Set(under.map((u) => label(u.key)))];
        hits.push({
          save: saveName, rule: 'overhang', building: id, name: t.name, views: [k],
          tile: [...new Set(under.map((u) => u.tile))].join(' '), other: what.join(', '),
          detail: `draws ${o.front.toFixed(0)} px in front of and ${o.side.toFixed(0)} px beside its footprint, over ${what.join(', ')}, which is painted before it${developing ? ' (under construction)' : ''}`,
        });
      }
    }
    // Every pair the relation orders, masses and props against everything
    // (trees against trees are left: a wood is thousands of pairs).
    const big = order.filter((e) => !e.key.startsWith('t-'));
    for (const a of big) {
      for (const b of order) {
        if (a === b || (b.key.startsWith('t-') === false && a.key > b.key)) continue;
        const v = occludes(a, b);
        if (v === 0) continue;
        const aFirst = at.get(a.key)! < at.get(b.key)!;
        // v === 1: a is nearer, so a must be painted after b.
        if ((v === 1 && aFirst) || (v === -1 && !aFirst)) {
          hits.push({ save: saveName, rule: 'depth-order', building: a.key, name: a.key, views: [k], other: b.key, detail: `${a.key} and ${b.key} overlap and are painted in the wrong order` });
        }
      }
    }
  }
  return hits;
}

// ---- The report ----
const RULE_NOTES: Record<Rule, string> = {
  'door-onto-ground': 'A drawn door opens onto open ground (a court, a pool, a quad, a garden); nothing hides it.',
  'door-behind-mass': 'A door\'s tile is built over; the wall is hidden where it would be drawn, and walkers treat the door as shut.',
  'door-under-tree': 'A tree stands on a drawn door\'s tile.',
  'door-under-prop': 'A lamp, bench, the flag or a bike rack stands on a drawn door\'s tile.',
  'door-onto-lawn': 'A drawn door opens onto grass: no path.',
  'door-on-seam': 'The wall is an even number of tiles long: its door is drawn on a tile seam.',
  'door-unreachable': 'The door\'s tile has no way on foot to the road.',
  'walled-in': 'Every door is shut.',
  'prop-on-tree': 'The flag or a bike rack is placed on a tile with a tree, a lamp or a bench.',
  'prop-behind': 'The flag or a rack stands on the +row side, which two of the four views do not face.',
  'overhang': 'A building draws past its footprint over something painted before it: the attachment shows in front of what it should stand inside or behind.',
  'depth-order': 'Two overlapping things are painted against depthSort.ts\'s relation.',
};

export function report(all: Hit[], saves: string[]): string {
  const lines: string[] = ['# Doors and depth', ''];
  const byMotif = new Map<string, Overhang[]>();
  for (const o of overhangs) byMotif.set(o.motif, [...(byMotif.get(o.motif) ?? []), o]);
  lines.push(`Written by \`npm run review:doors\` (\`tools/review/doorsAndDepth.ts\`) over ${saves.length} saves: ${saves.map((x) => `\`${x}\``).join(', ')}. Views are numbered by E presses from the opening view (0).`, '');
  lines.push('| Rule | Hits | Saves | Buildings | What it means |', '|---|---|---|---|---|');
  const rules = Object.keys(RULE_NOTES) as Rule[];
  for (const rule of rules) {
    const hs = all.filter((h) => h.rule === rule);
    lines.push(`| ${rule} | ${hs.length} | ${new Set(hs.map((h) => h.save)).size} | ${new Set(hs.map((h) => h.building)).size} | ${RULE_NOTES[rule]} |`);
  }
  lines.push('');
  lines.push('## How far each form draws past its footprint', '', 'The deepest point any building of the form draws in front of its footprint\'s near edges and beyond its side corners, in screen units at the opening zoom (a tile is 64 wide and 32 deep), over every save and view. Steps, porticos, pavilions and canopies are meant to stand proud of the wall; what matters is what stands on the tile they reach (the overhang rule below).', '');
  lines.push('| Form | Buildings | Front (max) | Side (max) | Under construction, front (max) |', '|---|---|---|---|---|');
  for (const [motif, os] of [...byMotif.entries()].sort()) {
    const done = os.filter((o) => !o.developing); const dev = os.filter((o) => o.developing);
    lines.push(`| ${motif} | ${new Set(os.map((o) => o.id)).size} | ${Math.max(0, ...done.map((o) => o.front)).toFixed(0)} | ${Math.max(0, ...done.map((o) => o.side)).toFixed(0)} | ${dev.length ? Math.max(...dev.map((o) => o.front)).toFixed(0) : '—'} |`);
  }
  lines.push('');
  for (const rule of rules) {
    const hs = all.filter((h) => h.rule === rule);
    if (hs.length === 0) continue;
    lines.push(`## ${rule} (${hs.length})`, '');
    // Group identical findings on the same building across vernaculars.
    const groups = new Map<string, Hit[]>();
    for (const h of hs) {
      const key = `${h.save.replace(/-(georgian|gothic|classical|mission|modern)$/, '')}|${h.building}|${h.wall ?? ''}|${h.tile ?? ''}|${h.detail.replace(/\d+ px/g, 'N px')}`;
      groups.set(key, [...(groups.get(key) ?? []), h]);
    }
    for (const g of [...groups.values()].slice(0, 80)) {
      const h = g[0];
      const saves = [...new Set(g.map((x) => x.save))];
      const views = [...new Set(g.flatMap((x) => x.views))].sort();
      lines.push(`- **${h.name}** (\`${h.building}\`)${h.tile ? ` at ${h.tile}` : ''}: ${h.detail}. Views ${views.join(', ') || '—'}; ${saves.length > 1 ? `${saves.length} saves (${saves.slice(0, 5).join(', ')}${saves.length > 5 ? '…' : ''})` : saves[0]}.`);
    }
    if (groups.size > 80) lines.push(`- …and ${groups.size - 80} more in doors.json.`);
    lines.push('');
  }
  return lines.join('\n');
}

if (process.argv[1]?.includes('doorsAndDepth')) {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const out = outIdx >= 0 ? argv[outIdx + 1] : 'node_modules/.tmp/doors';
  const files = argv.filter((a, i) => !a.startsWith('--') && i !== outIdx + 1);
  if (files.length === 0) { console.error('usage: doorsAndDepth <save.json>... [--out dir]'); process.exit(2); }
  const all: Hit[] = [];
  for (const f of files) {
    const s = (JSON.parse(readFileSync(f, 'utf8')) as { state: GameState }).state;
    const name = basename(f).replace(/\.json$/, '');
    const hits = check(name, s);
    all.push(...hits);
    const by = new Map<string, number>();
    for (const h of hits) by.set(h.rule, (by.get(h.rule) ?? 0) + 1);
    console.log(`${name}: ${[...by.entries()].map(([r, n]) => `${r} ${n}`).join(', ') || 'clean'}`);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'doors.json'), JSON.stringify(all, null, 1));
  writeFileSync(join(out, 'doors.md'), report(all, files.map((f) => basename(f).replace(/\.json$/, ''))));
  console.log(`${all.length} hits → ${out}/doors.{json,md}`);
}
void isAcademicHall;
