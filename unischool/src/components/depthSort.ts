// Painter's order for the campus map: which of two things on the grid has to
// be drawn on top of the other.
//
// On an angled map the draw ORDER *is* the occlusion — there is no depth
// buffer, so a thing nearer the camera is simply drawn later. Getting that
// order wrong does not look like a sorting bug, it looks like a building made
// of glass: something behind paints over something in front of it.
//
// WHY THIS ISN'T A SORT KEY. The map used to sort on one scalar, the
// footprint's far corner (`row + h + col + w`). That is exactly right for two
// POINTS and cannot be right for two RECTANGLES, because whether A occludes B
// depends on how the two are SEPARATED, not on where their far corners land.
// A 12-wide hall on rows 0-1 scores 13; a 2x2 lab standing directly in front
// of its left end, on rows 1-3, scores 5 — so the lab is drawn first and the
// hall paints straight over it. Measured against the real footprint catalogue,
// the scalar mis-ordered about 15% of the pairs that overlap on screen.
//
// No scalar can fix that, so this module doesn't look for a better one. It
// states the occlusion relation directly and produces an order that satisfies
// it — a topological sort, with the OLD scalar kept as the tie-break. Where
// the relation leaves the order free (which is most pairs) the scene therefore
// falls back to exactly what it drew before: this is a repair of the previous
// order, not a different-looking map.
//
// It is also what camera rotation needs. `row + h + col + w` hard-codes the
// camera — it assumes increasing col runs down-right and increasing row
// down-left. Turn the camera 90 degrees and that key is not 15% wrong, it is
// inverted. `occludes` below names the assumption in one place instead of
// baking it into an arithmetic expression, which is the difference between a
// rotating camera being a transform and being a rewrite.
//
// Pure geometry: no React, no game state, no colour, same as isoProjection.ts.

// The tiles a thing stands on. Whole tiles for a placed Buildable, a single
// tile for a tree, a fraction of one for a hedge or a fountain — the relation
// below never assumes integers.
export interface DepthBox {
  col: number; row: number; w: number; h: number;
}

// Could the CAMERA see these two overlap at all? On this projection the screen
// axes are (col + row) running down and (col - row) running across, so this
// asks whether two footprints overlap on both — four comparisons, no
// projection and no allocation.
//
// CONSERVATIVE ON PURPOSE. The image of a grid rectangle is a rhombus, so
// testing its extent on those two axes tests its BOUNDING box, not the
// rhombus itself: two footprints that only touch along an edge are admitted
// as overlapping. That is the safe direction to be wrong in. An extra pair
// admitted only costs an ordering constraint that was already true; a pair
// wrongly rejected would leave a real occlusion unordered.
//
// What the gate must never admit is a pair separated on BOTH grid axes — one
// up-left of the other, one down-right. Those get two contradictory answers
// out of the test below, and they are allowed to, because they sit on opposite
// diagonal sides of the screen and never touch. It cannot admit them: if
// `a.col1 <= b.col0` and `a.row0 >= b.row1` then `a.col1 - a.row0 <=
// b.col0 - b.row1`, so their extents on the across-screen axis cannot strictly
// overlap and the gate rejects. Consistency comes from that, and it is why the
// topological sort below never finds a cycle.
//
// This gate is about GROUND rhombuses, and a building is taller than its
// ground. That is safe too, and worth stating because it looks like it
// shouldn't be. Two footprints this rejects are separated along one of the two
// screen axes. Separated ACROSS the screen, no amount of height can bring them
// together, because height only moves a mass UP — so no order is needed.
// Separated DOWN the screen, height genuinely can carry the nearer mass over
// the farther one's base — but then the nearer footprint's whole extent lies
// beyond the farther one's far corner, so `farCorner` below already orders the
// two correctly and the tie-break is not a guess. Either way the answer comes
// out right without the gate having to know how tall anything is.
function overlapsOnScreen(a: DepthBox, b: DepthBox): boolean {
  const aFar = a.col + a.w; const aNear = a.row + a.h;
  const bFar = b.col + b.w; const bNear = b.row + b.h;
  return (a.col + a.row) < (bFar + bNear) && (b.col + b.row) < (aFar + aNear)
    && (a.col - aNear) < (bFar - b.row) && (b.col - bNear) < (aFar - a.row);
}

// Which of two footprints is nearer the camera: 1 if `a` is (so `a` is painted
// AFTER `b`), -1 if `b` is, 0 if they never overlap and the order is free.
//
// THE SEPARATING AXIS IS THE WHOLE ANSWER. Two disjoint axis-aligned
// rectangles are always separated along at least one axis — that is just the
// separating-axis theorem for boxes — and this projection makes both axes run
// toward the camera: greater col is down-right on screen, greater row is
// down-left. So whichever box sits further along the axis that separates them
// is the nearer one, and that is the entire test.
//
// Footprints of placed Buildables are disjoint by construction (see
// campusMap.ts's footprintIsClear), and a tree is only ever on an unbuilt
// tile, so the disjointness this relies on is enforced upstream rather than
// assumed here. Two boxes that genuinely overlap fall through to 0 and keep
// whatever order the tie-break gives them, which is the only sane answer for
// two things occupying the same ground.
export function occludes(a: DepthBox, b: DepthBox): -1 | 0 | 1 {
  if (!overlapsOnScreen(a, b)) return 0;
  if (a.col >= b.col + b.w) return 1;
  if (b.col >= a.col + a.w) return -1;
  if (a.row >= b.row + b.h) return 1;
  if (b.row >= a.row + a.h) return -1;
  return 0;
}

// The old scalar key, demoted to a TIE-BREAK. Everywhere the occlusion
// relation is indifferent, the scene keeps drawing in the order it always did.
function farCorner(b: DepthBox): number {
  return b.row + b.h + b.col + b.w;
}

// Anything this size or smaller is treated as standing on a point rather than
// covering ground: one tile is the tree, the hedge, the fountain, the rooftop
// unit. It matters because a small thing can only be occluded by another small
// thing in its immediate neighbourhood (two boxes of at most a tile overlap on
// screen only if their origins are within a tile of each other on both axes),
// which is what keeps this from being O(n^2) over eight hundred trees.
const SMALL = 1;
function isSmall(b: DepthBox): boolean {
  return b.w <= SMALL && b.h <= SMALL;
}
// How far the neighbourhood scan reaches, in tiles. Two, not one: the boxes
// are placed at fractional coordinates, so two that are within a tile of each
// other can still land in buckets two apart.
const NEIGHBOURHOOD = 2;

// A binary heap of item indices ordered by the tie-break key, so Kahn's
// algorithm below releases ready items in the old scalar order rather than in
// whatever order they happened to become ready. Small enough to spell out; a
// sorted array would be O(n^2) on a scene of this size.
function keyHeap(keyOf: (i: number) => number) {
  const h: number[] = [];
  const swap = (a: number, b: number) => { const t = h[a]; h[a] = h[b]; h[b] = t; };
  return {
    get size(): number { return h.length; },
    push(i: number): void {
      h.push(i);
      for (let c = h.length - 1; c > 0;) {
        const p = (c - 1) >> 1;
        if (keyOf(h[p]) <= keyOf(h[c])) break;
        swap(p, c);
        c = p;
      }
    },
    pop(): number {
      const top = h[0];
      const last = h.pop()!;
      if (h.length > 0) {
        h[0] = last;
        for (let p = 0;;) {
          const l = p * 2 + 1; const r = l + 1;
          let m = p;
          if (l < h.length && keyOf(h[l]) < keyOf(h[m])) m = l;
          if (r < h.length && keyOf(h[r]) < keyOf(h[m])) m = r;
          if (m === p) break;
          swap(p, m);
          p = m;
        }
      }
      return top;
    },
  };
}

// The scene in painter's order: back to front, ready to map straight into
// elements. Returns the SAME objects it was given, reordered — the caller
// carries whatever it likes on them.
//
// Two tiers, because the scene has two kinds of thing in it and treating them
// alike is what would make this too slow to run. The masses — at most a few
// dozen placed buildings — get compared with each other pairwise. The small
// things — hundreds of trees and props — are compared with every mass, but
// with each other only across the handful of tiles close enough to overlap
// them on screen. A full scene (about seventy buildings and eight hundred
// trees) costs a few milliseconds, and the caller memoises it on the state it
// reads, so it runs when the campus changes rather than when the mouse moves.
export function depthOrder<T extends DepthBox>(items: readonly T[]): T[] {
  const n = items.length;
  if (n < 2) return items.slice();

  // after[i] holds the items that must be drawn AFTER item i.
  const after: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Uint32Array(n);
  const link = (first: number, second: number) => {
    after[first].push(second);
    indegree[second] += 1;
  };
  const relate = (i: number, j: number) => {
    const v = occludes(items[i], items[j]);
    if (v === 1) link(j, i);
    else if (v === -1) link(i, j);
  };

  const large: number[] = [];
  const small: number[] = [];
  for (let i = 0; i < n; i++) (isSmall(items[i]) ? small : large).push(i);

  // Mass against mass, and every small thing against every mass.
  for (let a = 0; a < large.length; a++) {
    for (let b = a + 1; b < large.length; b++) relate(large[a], large[b]);
  }
  for (const s of small) for (const l of large) relate(s, l);

  // Small against small, but only within a tile or two — see NEIGHBOURHOOD.
  // Without this a tree that happens to be free of every building could be
  // released ahead of one waiting behind a hall, and land in front of it.
  const buckets = new Map<string, number[]>();
  for (const s of small) {
    const key = `${Math.floor(items[s].row)},${Math.floor(items[s].col)}`;
    const at = buckets.get(key);
    if (at) at.push(s); else buckets.set(key, [s]);
  }
  for (const s of small) {
    const r0 = Math.floor(items[s].row); const c0 = Math.floor(items[s].col);
    for (let dr = -NEIGHBOURHOOD; dr <= NEIGHBOURHOOD; dr++) {
      for (let dc = -NEIGHBOURHOOD; dc <= NEIGHBOURHOOD; dc++) {
        for (const o of buckets.get(`${r0 + dr},${c0 + dc}`) ?? []) {
          if (o > s) relate(s, o);   // each pair once
        }
      }
    }
  }

  const ready = keyHeap((i) => farCorner(items[i]));
  for (let i = 0; i < n; i++) if (indegree[i] === 0) ready.push(i);

  const out: T[] = [];
  const drawn = new Uint8Array(n);
  while (out.length < n) {
    if (ready.size === 0) {
      // Unreachable for the footprints this map can produce: the screen-overlap
      // gate in `occludes` is what makes the relation consistent, and a sweep
      // over random layouts of the whole catalogue finds no cycle (see
      // test/depth-sort.test.ts). Kept anyway, and kept CHEAP, because the
      // alternative to a defensive release here is dropping a building off the
      // map — release whatever is left in the old scalar order and carry on.
      let fallback = -1;
      for (let i = 0; i < n; i++) {
        if (drawn[i]) continue;
        if (fallback < 0 || farCorner(items[i]) < farCorner(items[fallback])) fallback = i;
      }
      if (fallback < 0) break;
      indegree[fallback] = 0;
      ready.push(fallback);
    }
    const u = ready.pop();
    if (drawn[u]) continue;
    drawn[u] = 1;
    out.push(items[u]);
    for (const v of after[u]) {
      indegree[v] -= 1;
      if (indegree[v] === 0 && !drawn[v]) ready.push(v);
    }
  }
  return out;
}
