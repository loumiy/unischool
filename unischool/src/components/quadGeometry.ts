// The quad's centerpiece and walks as geometry (Plan 62), shared by the
// drawing (groundMarkings.tsx) and the walkers' grid (walkRoutes.ts), so a
// walker keeps to the walks the quad paints and goes round what stands in
// the middle instead of through it. Pure numbers: no React.

// The walks' width, as a share of the quad's side.
export const QUAD_WALK = 0.075;

export interface QuadCentre {
  cc: number; cr: number;
  // The centerpiece's radius, in tiles: the fountain's curb on the gardens
  // tier, the monument's roundel on the first.
  R: number;
  // The paving round it (the gardens' fountain only): inner and outer radius.
  // Since Plan 87K a round plaza, paved from the curb out, that the walks
  // all meet at.
  ring: [number, number] | null;
}

export function quadCentre(col: number, row: number, w: number, h: number, tier: number): QuadCentre {
  const short = Math.min(w, h);
  const cc = col + w * 0.5; const cr = row + h * 0.5;
  if (tier >= 2) {
    // A smaller pool in a round plaza (Plan 87K), so the walks have length
    // and the lawn panels room for their hedges and beds.
    const R = short * 0.13;
    return { cc, cr, R, ring: [R, R + short * 0.1] };
  }
  return { cc, cr, R: short * 0.13, ring: null };
}

// What a walker pays to step onto a tile of the quad, by its center:
// 'blocked' where it cannot step (the centerpiece), 'walk' on a walk or the
// plaza, 'lawn' elsewhere. The Grand Quad (Plan 87K) is walked only on its
// walks: a perimeter walk on its outermost ring of tiles, the cross walks
// and the plaza; its lawn panels are hedged and planted, and kept off.
export function quadTile(col: number, row: number, w: number, h: number, tier: number, c: number, r: number): 'blocked' | 'walk' | 'lawn' {
  const { cc, cr, R, ring } = quadCentre(col, row, w, h, tier);
  const x = c + 0.5; const y = r + 0.5;
  const d = Math.hypot(x - cc, y - cr);
  if (d < R + 0.15) return 'blocked';
  // The plaza's tiles: those whose center it paves, or nearly.
  if (ring && d <= ring[1] + 0.2) return 'walk';
  // The cross walks, edge midpoint to edge midpoint.
  if (Math.abs(x - cc) <= 0.5 || Math.abs(y - cr) <= 0.5) return 'walk';
  if (tier >= 2) {
    const edge = c === col || r === row || c === col + w - 1 || r === row + h - 1;
    return edge ? 'walk' : 'blocked';
  }
  return 'lawn';
}
