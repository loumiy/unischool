// ---------------------------------------------------------------------
// THE DOOR CENTRE CHECKER (Plan 122D, from Ginger's playtest: "Doors should
// always be centered on a tile"). Every placeable building, in every
// vernacular and all four facings, is drawn through the game's own
// BuildingMotif with a probe on its Door (buildingMotifs.ts's setDoorProbe),
// in each of the four views, so every door that draws is heard once. Each
// door's middle, at the foot of its wall, is taken back to the grid, and
// its place along the wall must be a tile's centre, so a one-tile path
// drawn straight out meets it, and the tile the walkers come and go by
// (walkRoutes.ts's entrancesOf: the wall's middle tile, or on an even wall
// the one past the middle), so the path, the walkers and the Campus
// grade's paths to doors (beauty.ts) agree.
//
//   npm run review:door-centres
//
// Exits non-zero when any door is off a tile's centre, or a side of a
// building has doors and none of them on the walkers' tile (a second door
// on a side, on a tile's centre, is the building's own). Not part of the
// game: nothing in src/ imports this.
// ---------------------------------------------------------------------
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import BuildingMotif, { materialOf, setDoorProbe } from '../../src/components/buildingMotifs';
import { doorFamilyOf, motifOf } from '../../src/components/buildingSpec';
import { DEFAULT_PITCH, VIEWS, setCamera, unproject, type FaceDir } from '../../src/components/isoProjection';
import { sidesOf } from '../../src/components/facing';
import { initialTech } from '../../src/data/techData';
import { initialDorms } from '../../src/data/campusData';
import { initialFacilities } from '../../src/data/facilitiesData';
import { isPlaceableKind, orientedFootprint } from '../../src/state/campusMap';
import type { Buildable, Facing, Vernacular } from '../../src/state/types';

const VERNS: Vernacular[] = ['georgian', 'gothic', 'classical', 'mission', 'modern', 'tudor', 'italianate', 'secondEmpire', 'artDeco'];
const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()].filter(isPlaceableKind);
// The map's inset (CampusMap.tsx's BUILDING_INSET): symmetric, so no door
// moves for it.
const INSET = 0.06;
// How far from a tile's centre a door may sit, in tiles.
const SLACK = 0.05;

// A door kept off the walkers' tile on purpose, by building: the side it
// is on, for a facing. The Recreation Center's climbing tower stands over
// its right side's middle tile, so that side's door is a tile further back
// (the owner, 2 November 2026).
const OFF_ON_PURPOSE: Record<string, (facing: Facing) => FaceDir> = {
  'REC-T1': (facing) => sidesOf(facing).right,
};
const byCol = (side: FaceDir) => side === 'posRow' || side === 'negRow';
interface Hit { id: string; name: string; v: Vernacular; facing: Facing; side: FaceDir; front: boolean; at: number; fp: string; family: string; why: 'off-centre' | 'not-the-walkers-tile' }
const hits: Hit[] = [];
let doors = 0;

for (const t of CATALOGUE) {
  if (!doorFamilyOf(t) && motifOf(t) !== 'village') continue;
  for (const v of VERNS) {
    for (const facing of [0, 1, 2, 3] as Facing[]) {
      const fp = orientedFootprint(t, facing);
      const p = { col: INSET, row: INSET, w: fp.w - 2 * INSET, h: fp.h - 2 * INSET, facing };
      const front = sidesOf(facing).front;
      const heard = new Map<string, Hit | null>();
      for (const az of VIEWS) {
        setCamera({ azimuth: az, pitch: DEFAULT_PITCH });
        setDoorProbe(({ origin, along, side, family }) => {
          const mid = unproject((origin.x + along.x) / 2, (origin.y + along.y) / 2);
          // Along the wall: a wall on ±row runs along the columns.
          const at = byCol(side) ? mid.col : mid.row;
          const key = `${side}:${at.toFixed(2)}`;
          if (heard.has(key)) return;
          const off = Math.abs((at % 1 + 1) % 1 - 0.5);
          // The tile walkRoutes.ts's entrancesOf opens this side onto: the
          // wall's middle tile, or on an even wall the one past the middle.
          const walkers = Math.floor((byCol(side) ? fp.w : fp.h) / 2) + 0.5;
          const why = off > SLACK ? 'off-centre' : Math.abs(at - walkers) > SLACK ? 'not-the-walkers-tile' : null;
          heard.set(key, why ? { id: t.id, name: t.name, v, facing, side, front: side === front, at, fp: `${fp.w}x${fp.h}`, family, why } : null);
        });
        renderToStaticMarkup(createElement('svg', null, createElement(BuildingMotif, { t, p, material: materialOf(t, v), vernacular: v, developing: false })));
      }
      setDoorProbe(null);
      doors += heard.size;
      // A side passes when one of its doors is on the walkers' tile: a
      // second door on it (the hospital wing's beside its slab's) is the
      // building's own, as long as it is on a tile's centre.
      const served = new Set([...heard.entries()].filter(([, h]) => h === null).map(([k]) => k.split(':')[0]));
      for (const h of heard.values()) {
        if (!h) continue;
        if (h.why === 'not-the-walkers-tile' && served.has(h.side)) continue;
        if (h.why === 'not-the-walkers-tile' && OFF_ON_PURPOSE[h.id]?.(h.facing) === h.side) continue;
        hits.push(h);
      }
    }
  }
}

// One line per building and side kind, with the vernaculars and facings it
// is off in.
const groups = new Map<string, Hit[]>();
for (const h of hits) {
  const k = `${h.id}|${h.front ? 'front' : 'other'}|${h.family}|${h.why}`;
  groups.set(k, [...(groups.get(k) ?? []), h]);
}
console.log(`door centres: ${doors} doors heard on ${CATALOGUE.length} buildables`);
for (const [k, hs] of [...groups.entries()].sort()) {
  const [id, which, family, why] = k.split('|');
  const vs = [...new Set(hs.map((h) => h.v))];
  const fs = [...new Set(hs.map((h) => h.facing))];
  console.log(`  ${id} (${hs[0].name}, ${hs[0].fp}) ${which} ${family} door ${why === 'off-centre' ? 'off a tile centre' : 'on a tile, not the walkers\' one'} at ${[...new Set(hs.map((h) => h.at.toFixed(2)))].slice(0, 4).join('/')} — ${vs.length === VERNS.length ? 'every vernacular' : vs.join(', ')}; facing ${fs.join(',')}`);
}
const failed = hits.length;
console.log(failed === 0
  ? "  ✓ every door is on a tile centre, and every side with doors has one on the walkers' tile"
  : `  ✗ ${failed} doors off a tile centre, or on a side with none on the walkers' tile`);
process.exit(failed === 0 ? 0 : 1);
