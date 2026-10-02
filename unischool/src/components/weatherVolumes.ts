import type { Buildable, Vernacular } from '../state/types';
import {
  BLOCK_SPLIT_MIN_TILES, SLAB_ROW_FRACTION, TOWER_PODIUM_STOREYS, WING_COL_FRACTION, WING_STOREY_FRACTION,
  BUSINESS_SCHOOL_ID, businessSchoolPlan, chapelPlan, isHospital, motifOf, ridgeOf, storeysOf, wallHeightOf,
} from './buildingSpec';
import { STOREY, up } from './campusScale';
import { VILLAGE_HOUSES } from './buildingMotifs';
import { landmarkVolumes } from './landmarks';

// The boxes a building's walls actually stand in, for its weathering
// (ageMarks.tsx, Plan 75A). Streaks, lost slates, boarded windows and the
// derelict's grime and tarpaulin were drawn on one box of the whole
// footprint to the wall's height: right for a hall, wrong wherever the
// footprint is partly open air. The hospital is a ward slab and a lower
// wing; a village is a dozen houses on a green; a stadium is open stands
// until its bowl closes; a tower is a podium and a slimmer shaft; a
// landmark is a shaft, a podium or a gate's body.

export interface WeatherVolume {
  col: number; row: number; w: number; h: number;
  // Where its walls start and how tall they stand.
  base: number; height: number;
  // Its roof's rise, which the tarpaulin lies up.
  ridge: number;
  // Whether it has windows to board, and whether the tarpaulin goes on it.
  boards: boolean; tarp: boolean;
}

type Plot = { col: number; row: number; w: number; h: number };

export function weatherVolumes(t: Buildable, p: Plot, v: Vernacular): WeatherVolume[] {
  const H = wallHeightOf(t);
  const motif = motifOf(t);
  const box = (col: number, row: number, w: number, h: number, base: number, height: number, extra: Partial<WeatherVolume> = {}): WeatherVolume => ({
    col, row, w, h, base, height, ridge: 0, boards: true, tarp: false, ...extra,
  });
  switch (motif) {
    case 'grounds':
      return [];
    case 'landmark':
      return landmarkVolumes(t, p).map((b) => ({ ...b, ridge: 0, boards: false, tarp: false }));
    case 'village':
      // Each house its own walls; the tarpaulin on two of them.
      return VILLAGE_HOUSES.map((lot, i) => box(
        p.col + p.w * lot.u, p.row + p.h * lot.v, p.w * lot.uw, p.h * lot.vh, 0, Math.min(H, lot.s * STOREY),
        { ridge: up(3), tarp: i === 1 || i === 8 },
      ));
    case 'bowl': {
      // Open stands until the bowl closes (buildingMotifs.tsx's stadium
      // stages): only then is there an outer wall to weather.
      const stage = Math.min(3, t.expansions ?? 0);
      if (stage < 2) return [];
      return [box(p.col, p.row, p.w, p.h, 0, stage >= 3 ? H * 1.6 : H * 0.85, { boards: false })];
    }
    case 'tower': {
      const podium = TOWER_PODIUM_STOREYS * STOREY;
      const inset = 0.17;
      return [
        box(p.col, p.row, p.w, p.h, 0, podium),
        box(p.col + p.w * inset, p.row + p.h * inset, p.w * (1 - inset * 2), p.h * (1 - inset * 2), podium, H - podium, { tarp: true }),
      ];
    }
    case 'block': {
      if (t.id === BUSINESS_SCHOOL_ID) {
        // The podium's parts, the glazed atrium (nothing to board) and the
        // tower over the back (buildingMotifs.tsx's BusinessSchool, Plan 87A).
        const b = businessSchoolPlan(p);
        return [
          box(b.back.col, b.back.row, b.back.w, b.back.h, 0, b.podiumHeight),
          ...b.wings.map((x) => box(x.col, x.row, x.w, x.h, 0, b.podiumHeight)),
          box(b.atrium.col, b.atrium.row, b.atrium.w, b.atrium.h, 0, b.atriumHeight, { boards: false }),
          box(b.tower.col, b.tower.row, b.tower.w, b.tower.h, b.podiumHeight, H - b.podiumHeight, { tarp: true }),
        ];
      }
      if (!isHospital(t) || Math.min(p.w, p.h) < BLOCK_SPLIT_MIN_TILES) break;
      // The hospital: the ward slab across the back, the lower public wing
      // in front (buildingMotifs.tsx's split block).
      const storeys = storeysOf(t);
      const wing = Math.max(2, Math.round(storeys * WING_STOREY_FRACTION));
      return [
        box(p.col, p.row, p.w, p.h * SLAB_ROW_FRACTION, 0, storeys * STOREY, { tarp: true }),
        box(p.col, p.row + p.h * SLAB_ROW_FRACTION, p.w * WING_COL_FRACTION, p.h * (1 - SLAB_ROW_FRACTION), 0, wing * STOREY),
      ];
    }
    case 'chapel': {
      // The nave and the chancel (buildingSpec.ts's chapelPlan). Not the
      // tower: the marks of a volume are masked only by the walls of those
      // nearer it, not their roofs, so the tower's would show through the
      // nave's steep roof in the views that put it behind.
      const c = chapelPlan(p, v);
      return [
        box(c.nave.col, c.nave.row, c.nave.w, c.nave.h, 0, c.naveHeight, { ridge: c.naveRidge, tarp: true }),
        box(c.chancel.col, c.chancel.row, c.chancel.w, c.chancel.h, 0, c.chancelHeight, { ridge: c.chancelRidge }),
      ];
    }
    default:
      break;
  }
  return [box(p.col, p.row, p.w, p.h, 0, H, { ridge: ridgeOf(t, v), tarp: true })];
}
