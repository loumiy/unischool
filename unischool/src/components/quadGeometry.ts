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
  // The ring walk round it (the gardens' fountain only): inner and outer radius.
  ring: [number, number] | null;
}

export function quadCentre(col: number, row: number, w: number, h: number, tier: number): QuadCentre {
  const short = Math.min(w, h);
  const cc = col + w * 0.5; const cr = row + h * 0.5;
  if (tier >= 2) {
    const R = short * 0.20;
    const inner = R + short * 0.02;
    return { cc, cr, R, ring: [inner, inner + short * QUAD_WALK] };
  }
  return { cc, cr, R: short * 0.13, ring: null };
}

// What a walker pays to step onto a tile of the quad, by its center: null
// where it cannot step (the centerpiece), 'walk' on a walk or the ring,
// 'lawn' elsewhere.
export function quadTile(col: number, row: number, w: number, h: number, tier: number, c: number, r: number): 'blocked' | 'walk' | 'lawn' {
  const { cc, cr, R, ring } = quadCentre(col, row, w, h, tier);
  const x = c + 0.5; const y = r + 0.5;
  const d = Math.hypot(x - cc, y - cr);
  if (d < R + 0.15) return 'blocked';
  // The ring's tiles: those whose center falls within half a tile of it.
  if (ring && d >= ring[0] - 0.5 && d <= ring[1] + 0.5) return 'walk';
  // The cross walks, edge midpoint to edge midpoint.
  if (Math.abs(x - cc) <= 0.5 || Math.abs(y - cr) <= 0.5) return 'walk';
  return 'lawn';
}
