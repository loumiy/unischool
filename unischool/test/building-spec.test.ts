// ---------------------------------------------------------------------
// The campus's unit system (src/components/campusScale.ts) and the
// dimensional spec derived from it (src/components/buildingSpec.ts).
//
// This pins the thing the art brief actually asked for: that a storey means
// the SAME THING on every building on the map, and that a building's height
// and its floor count can never disagree. Both used to be authored in separate
// tables with no arithmetic between them, which is how a storey came to be
// 6.1 m in a residential tower and 26.3 m in a gym.
//
// Run over the REAL catalogue — every placeable Buildable the game can build —
// rather than over invented examples, so a new rung added to a chain without a
// storey count is caught here rather than by eye.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { TILE_H, TILE_W } from '../src/components/isoProjection';
import {
  METRES_PER_TILE, PITCH, STOREY, STOREY_METRES, UNITS_PER_TILE_UP, across, up,
} from '../src/components/campusScale';
import {
  BAY_METRES, TOWER_PODIUM_STOREYS, WINDOW_HEIGHT, baysAcross, clerestorySill,
  CORNICE, GILT, PARAPET, PLINTH, doorFamilyOf, doorOf, floorLinesOf, hasClockTower,
  materialOf, motifOf, rankSills, ridgeOf, storeysOf, wallHeightOf, wallShadeOf,
  windowRanksOf, windowWidthOf, type DoorFamily,
} from '../src/components/buildingSpec';
import { footprintOf, isPlaceableKind } from '../src/state/campusMap';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import type { Buildable } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

const CATALOGUE: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()]
  .filter(isPlaceableKind);
const byId = (id: string) => CATALOGUE.find((t) => t.id === id);

console.log('campus scale and building spec');

// --- 1. The scale is DERIVED from the projection, not chosen ---------------
{
  assert(near(PITCH, Math.asin(TILE_H / TILE_W)), 'the camera pitch comes out of the projection\'s own constants');
  assert(near(UNITS_PER_TILE_UP, (TILE_W / Math.SQRT2) * Math.cos(PITCH)),
    'a tile of height is foreshortened by cos(pitch), not assumed to be TILE_W / 2');
  assert(near(up(METRES_PER_TILE), UNITS_PER_TILE_UP),
    'up() and the tile agree: one tile of height is METRES_PER_TILE metres');
  assert(near(across(METRES_PER_TILE), 1), 'across() and the tile agree on the ground, too');
  assert(near(STOREY, up(STOREY_METRES)), 'a storey is its own height in metres and nothing else');
  // The number this replaced. If the derivation ever drifts far from it, the
  // campus silently rescales — so the agreement is asserted, not admired.
  assert(Math.abs(STOREY - 17) < 0.1,
    `the derived storey lands on the 17 units buildingMotifs already used for an added floor (got ${STOREY.toFixed(2)})`);
  // And the shortcut that was wrong: TILE_W / 2 understates height by ~18%,
  // which is exactly the "stylistic" exaggeration it then needed.
  assert(Math.abs(UNITS_PER_TILE_UP / (TILE_W / 2) - 1.22) < 0.01,
    'the TILE_W/2 shortcut understates height by the 1.22x a fudge factor was compensating for');
}

// --- 2. ONE storey height, campus-wide ------------------------------------
{
  const storeyed = CATALOGUE.filter((t) => storeysOf(t) > 0);
  assert(storeyed.length > 30, `the catalogue has plenty of storeyed buildings to compare (${storeyed.length})`);

  let worst: { id: string; metres: number } | null = null;
  for (const t of storeyed) {
    const metres = (wallHeightOf(t) / storeysOf(t)) / (UNITS_PER_TILE_UP / METRES_PER_TILE);
    if (!worst || Math.abs(metres - STOREY_METRES) > Math.abs(worst.metres - STOREY_METRES)) {
      worst = { id: t.id, metres };
    }
  }
  assert(worst !== null && near(worst.metres, STOREY_METRES, 1e-9),
    `every building's storey is ${STOREY_METRES} m (worst: ${worst?.id} at ${worst?.metres.toFixed(3)} m)`);
}

// --- 3. Height and floor count cannot disagree ----------------------------
{
  for (const t of CATALOGUE) {
    const storeys = storeysOf(t);
    if (storeys === 0) continue;
    if (!near(wallHeightOf(t), storeys * STOREY)) {
      assert(false, `${t.id}: wall height is its storey count times STOREY`);
      break;
    }
    if (windowRanksOf(t) !== storeys) {
      assert(false, `${t.id}: one rank of windows per storey`);
      break;
    }
  }
  assert(true, 'every storeyed building: height = storeys x STOREY, and one window rank per storey');
}

// --- 4. Clear-span volumes have a height but no floors --------------------
{
  const clearSpan = CATALOGUE.filter((t) => ['hangar', 'bowl'].includes(motifOf(t)));
  assert(clearSpan.length > 0, 'the catalogue has clear-span venues');
  assert(clearSpan.every((t) => storeysOf(t) === 0),
    'a gym, a pool hall and a stadium have no storeys — they are one volume');
  assert(clearSpan.every((t) => wallHeightOf(t) > 0), 'but they still stand up');
  assert(clearSpan.every((t) => windowRanksOf(t) === 1),
    'and are lit by one continuous band rather than by ranks');
  const grounds = CATALOGUE.filter((t) => motifOf(t) === 'grounds');
  assert(grounds.every((t) => wallHeightOf(t) === 0 && ridgeOf(t) === 0),
    'open ground has no mass at all');
}

// --- 5. A renovation adds a REAL floor ------------------------------------
{
  const library = CATALOGUE.find((t) => t.facilityType === 'library');
  assert(library !== undefined, 'the catalogue has a library');
  if (library) {
    const base = storeysOf(library);
    const renovated = { ...library, floorsAdded: 3 };
    assert(storeysOf(renovated) === base + 3, 'three added floors are three more storeys');
    assert(near(wallHeightOf(renovated) - wallHeightOf(library), 3 * STOREY),
      'and they raise the building by three storeys — not by half of one, as the old 17-against-34 did');
    assert(windowRanksOf(renovated) === base + 3, 'each added floor brings its own rank of windows');
  }
}

// --- 6. The chains are legible as HEIGHT, not just as numbers -------------
{
  const dorm = (beds: number) => CATALOGUE.find((t) => t.kind === 'dorm' && (t.effects?.capacityBonus ?? 0) === beds);
  const founding = dorm(350); const early = dorm(500); const mid = dorm(1_000); const tower = dorm(5_000);
  assert(!!founding && !!early && !!mid && !!tower, 'the housing chain covers all four size classes');
  if (founding && early && mid && tower) {
    assert(storeysOf(founding) < storeysOf(early), 'the founding hall is shorter than an ordinary one');
    assert(storeysOf(early) === 4, 'a 500-bed hall is the four-storey residence hall campusData.ts calls it');
    assert(storeysOf(early) < storeysOf(mid), 'a 1,000-bed hall is taller than a 500-bed one');
    assert(storeysOf(mid) < storeysOf(tower), 'and a tower is taller than both');
    assert(storeysOf(tower) > TOWER_PODIUM_STOREYS, 'a tower has a shaft above its podium');
  }

  const hall = byId('BLDG-GENSTUDIES');
  assert(!!hall, 'Founders Hall is in the catalogue');
  if (hall && mid && early) {
    // A residence hall genuinely is taller than the teaching building it
    // serves. On the old table every hall stood at 84 and every dorm at 54.
    assert(wallHeightOf(mid) > wallHeightOf(hall), 'a high-rise residence hall stands over the academic halls');
    assert(near(wallHeightOf(early), wallHeightOf(hall)), 'and a four-storey one stands level with them');
  }

  const hospital = CATALOGUE.find((t) => t.facilityType === 'healthCenter' && (t.effects?.servesPopulation ?? 0) >= 20_000);
  const counselling = CATALOGUE.filter((t) => t.facilityType === 'healthCenter')
    .sort((a, b) => (a.effects?.servesPopulation ?? 0) - (b.effects?.servesPopulation ?? 0))[0];
  assert(!!hospital && !!counselling, 'the health chain has both ends');
  if (hospital && counselling && hall) {
    assert(storeysOf(hospital) > storeysOf(hall), 'the teaching hospital towers over a teaching hall');
    assert(storeysOf(counselling) < storeysOf(hospital),
      'and a counselling centre is not the same building relabelled');
  }
}

// --- 7. A window is the same window everywhere ----------------------------
{
  // The measure that matters. A window's size must be a property of the
  // WINDOW, not of the building it is on — the old grid made it the wall's
  // length divided by a fixed count, so one residence hall's two walls carried
  // windows 5.94 m and 2.64 m wide, and rotating the building resized them.
  const widths = new Set(CATALOGUE.map((t) => windowWidthOf(t).toFixed(6)));
  assert(widths.size <= 3,
    `the whole catalogue draws at most three window widths (got ${widths.size}: ${[...widths].join(', ')})`);
  assert(CATALOGUE.every((t) => windowWidthOf(t) > 0), 'and every one of them is a real width');

  // Height is a single constant, so it cannot vary at all.
  assert(WINDOW_HEIGHT > 0 && Number.isFinite(WINDOW_HEIGHT), 'a window has one height, campus-wide');

  // Bays are set out at a fixed pitch, so a longer wall gets MORE windows
  // rather than wider ones. Checked across every span the catalogue produces.
  const spans = new Set<number>();
  for (const t of CATALOGUE) { const fp = footprintOf(t); spans.add(fp.w); spans.add(fp.h); }
  let worstPitch = 0;
  for (const span of spans) {
    const pitch = (span * METRES_PER_TILE) / baysAcross(span);
    worstPitch = Math.max(worstPitch, Math.abs(pitch - BAY_METRES));
  }
  assert(worstPitch < 0.9,
    `every wall span in the catalogue sets out near a ${BAY_METRES} m bay (worst drift ${worstPitch.toFixed(2)} m)`);

  // And the specific thing that was visibly wrong: one building, two walls of
  // different length, one window. A fixed REAL width means the window takes up
  // two different FRACTIONS of the two walls — which is precisely what a
  // count-based grid cannot express, because it fixes the fraction and lets
  // the size vary instead. So the fractions differing is the property to
  // assert, not the widths matching.
  let checkedTwoWalls = 0;
  for (const t of CATALOGUE) {
    if (motifOf(t) === 'grounds') continue;
    const fp = footprintOf(t);
    if (fp.w === fp.h) continue;
    const width = windowWidthOf(t);
    if (!(width / fp.w !== width / fp.h)) {
      assert(false, `${t.id}: one real window width should span two different wall fractions`);
      break;
    }
    if (baysAcross(fp.w) <= baysAcross(fp.h)) {
      assert(false, `${t.id}: the longer wall should get MORE bays, not wider windows`);
      break;
    }
    checkedTwoWalls += 1;
  }
  assert(checkedTwoWalls > 20,
    `checked ${checkedTwoWalls} buildings with unequal walls: each gets more bays on the longer one, same window on both`);
}

// --- 8. Ranks and courses sit where the storeys are -----------------------
{
  const hall = byId('BLDG-GENSTUDIES');
  if (hall) {
    const sills = rankSills(windowRanksOf(hall));
    assert(sills.length === storeysOf(hall), 'one sill height per storey');
    const gaps = sills.slice(1).map((v, i) => v - sills[i]);
    assert(gaps.every((g) => near(g, STOREY)), 'each rank sits exactly one storey above the last');
    assert(sills[sills.length - 1] + WINDOW_HEIGHT < wallHeightOf(hall),
      'and the top rank still fits under the eaves');
    assert(floorLinesOf(hall).length === storeysOf(hall) - 1,
      'a four-storey building shows three floor lines');
  }
  const gym = CATALOGUE.find((t) => motifOf(t) === 'hangar');
  if (gym) {
    const h = wallHeightOf(gym);
    const sill = clerestorySill(h);
    assert(sill > h / 2, 'a clear-span volume is lit from high up, not from a rank near the ground');
    assert(sill + WINDOW_HEIGHT < h, 'and its band fits under the eaves');
    assert(floorLinesOf(gym).length === 0, 'with no floor lines, because it has no floors');
  }
}

// --- 9. Doors are one family of shapes, not one shape stretched ----------
{
  // Every door of a family is the same door, and there are only six. The old
  // table gave every motif its own width AND a height that was a fraction of
  // whatever wall it landed on, so aspect ratios ran 0.83 to 27.38.
  const sizes = new Map<string, string>();
  for (const t of CATALOGUE) {
    const d = doorOf(t);
    if (!d) continue;
    const key = `${d.widthTiles.toFixed(6)}x${d.height.toFixed(6)}`;
    const seen = sizes.get(d.family);
    if (seen && seen !== key) {
      assert(false, `${d.family}: one size everywhere (got ${seen} and ${key})`);
      break;
    }
    sizes.set(d.family, key);
  }
  assert(sizes.size > 0 && sizes.size <= 6, `the catalogue draws ${sizes.size} door families, one size each`);

  // The proportions. Four of the six are doors you walk through and cluster
  // tightly; the two that are wide are a shop window and an ambulance bay.
  const aspects: Array<[DoorFamily, number]> = [];
  for (const t of CATALOGUE) {
    const d = doorOf(t);
    if (d && !aspects.some(([f]) => f === d.family)) {
      aspects.push([d.family, (d.widthTiles * METRES_PER_TILE) / (d.height / (UNITS_PER_TILE_UP / METRES_PER_TILE))]);
    }
  }
  const walkThrough = aspects.filter(([f]) => f !== 'shopfront' && f !== 'canopy').map(([, a]) => a);
  assert(walkThrough.length >= 3 && Math.max(...walkThrough) / Math.min(...walkThrough) < 1.6,
    `the walk-through families share a proportion (spread ${(Math.max(...walkThrough) / Math.min(...walkThrough)).toFixed(2)}x)`);
  const all = aspects.map(([, a]) => a);
  assert(Math.max(...all) / Math.min(...all) < 4,
    `and the whole catalogue spans ${(Math.max(...all) / Math.min(...all)).toFixed(1)}x, against the old table's 33x`);
}

// --- 10. Every door actually fits the wall it is drawn on ----------------
{
  // The assertion that would have caught the founding dining hall rendering
  // with no way in: its civic door was 4.05 m over a 3.9 m storey, so the
  // motif declined to draw it rather than overflowing the wall. Silent, and
  // invisible unless you go and look at that one building.
  let checked = 0;
  for (const t of CATALOGUE) {
    const d = doorOf(t);
    if (!d) continue;
    // A tower's entrance is on its PODIUM, which is shorter than the mass.
    const wall = motifOf(t) === 'tower' ? TOWER_PODIUM_STOREYS * STOREY : wallHeightOf(t);
    if (!(d.threshold + d.height < wall)) {
      assert(false, `${t.id} (${d.family}): its door is taller than the ${wall.toFixed(1)}-unit wall it is drawn on`);
      break;
    }
    checked += 1;
  }
  assert(checked > 40, `all ${checked} doors in the catalogue fit the walls they are drawn on`);

  // And the specific case that was wrong in the old table: a tower's shopfront
  // was a height fraction measured against the 190-unit mass and then applied
  // to the 34-unit podium, which made a 24 m opening 0.88 m high.
  const tower = CATALOGUE.find((t) => motifOf(t) === 'tower');
  if (tower) {
    const d = doorOf(tower);
    assert(d?.family === 'shopfront', 'a tower is entered through its podium shopfront');
    assert(!!d && d.height > STOREY * 0.5,
      `and that shopfront is a real opening, not the 0.88 m sliver the old fraction produced`);
  }

  // Nothing with no front door claims one.
  for (const t of CATALOGUE) {
    const motif = motifOf(t);
    if (motif === 'grounds' || motif === 'bowl' || motif === 'village') {
      if (doorFamilyOf(t) !== null) { assert(false, `${t.id}: open ground and villages have no single front door`); break; }
    }
  }
  assert(true, 'open ground, the stadium and the villages carry no single front door');
}

// --- 11. The academic halls, and the one that carries a tower ------------
{
  const halls = CATALOGUE.filter((t) => motifOf(t) === 'hall');
  assert(halls.length >= 8, `every academic building wears the hall motif (${halls.length} of them)`);

  // "The same style, without the spire" is one flag, not a second motif — so
  // every hall has to agree on everything except that flag.
  const families = new Set(halls.map((t) => doorFamilyOf(t)));
  assert(families.size === 1 && families.has('formal'),
    'every hall is entered through the same formal portal');
  const storeyCounts = new Set(halls.map((t) => storeysOf(t)));
  assert(storeyCounts.size <= 2,
    `halls come in ${storeyCounts.size} heights — the undergraduate one and the professional schools' extra storey`);

  const towered = CATALOGUE.filter(hasClockTower);
  assert(towered.length === 1, `exactly one building on campus carries a clock tower (got ${towered.length})`);
  assert(towered[0]?.id === 'BLDG-GENSTUDIES', 'and it is Founders Hall');
  assert(motifOf(towered[0]) === 'hall', 'which is an ordinary academic hall in every other respect');

  // The applied stonework has to fit inside the wall it is applied to, or a
  // band silently lands outside the mass.
  for (const t of halls) {
    const wall = wallHeightOf(t);
    if (!(PLINTH + CORNICE < wall && PARAPET > 0)) {
      assert(false, `${t.id}: plinth and cornice fit inside a ${wall.toFixed(1)}-unit wall`);
      break;
    }
    // The plinth must clear the bottom rank's sill, or the base course eats
    // the ground-floor windows.
    if (!(PLINTH < rankSills(windowRanksOf(t))[0])) {
      assert(false, `${t.id}: the base course sits below the ground-floor sills`);
      break;
    }
  }
  assert(true, 'every hall\'s stonework fits the wall it is applied to');

  // A hall's roof is a shallow HIP now, not the barn gable it was: a ridge
  // deeper than a storey and a half is what made the campus's landmarks read
  // as sheds.
  const hall = byId('BLDG-GENSTUDIES');
  if (hall) {
    assert(ridgeOf(hall) < STOREY, 'a hall\'s ridge rises less than one storey above its eaves');
    assert(ridgeOf(hall) > 0, 'but it is still a pitched roof');
  }
}

// --- 12. Materials, not a colour chart -----------------------------------
{
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

  const walls = [...new Set(CATALOGUE.map((t) => materialOf(t).wall))];
  const roofs = [...new Set(CATALOGUE.map((t) => materialOf(t).roof))];
  assert(walls.length <= 5, `the campus is built of at most five materials (got ${walls.length})`);
  assert(roofs.length <= 2, `and roofed in at most two (got ${roofs.length})`);

  // The measure the old palette failed. Twenty-three tints formed 253 pairs,
  // of which 40 sat within an RGB distance of 22 — the library and the gym
  // were 4.7 apart. Every pair of materials has to be a difference a player
  // can actually see.
  let closest = { d: Infinity, a: '', b: '' };
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const d = dist(walls[i], walls[j]);
      if (d < closest.d) closest = { d, a: walls[i], b: walls[j] };
    }
  }
  assert(closest.d > 35,
    `the closest two materials are ${closest.d.toFixed(1)} apart (${closest.a} vs ${closest.b}), against the old palette's 4.7`);

  // A roof is not a shade of its own wall. This is the split that stops a
  // building reading as one undifferentiated mass: roof tones used to be
  // derived from the wall tint, so a gold hall stood under a gold roof.
  let worstRoof = { d: Infinity, id: '' };
  for (const t of CATALOGUE) {
    const m = materialOf(t);
    const d = dist(m.wall, m.roof);
    if (d < worstRoof.d) worstRoof = { d, id: t.id };
  }
  assert(worstRoof.d > 60,
    `every building's roof reads against its own walls (worst: ${worstRoof.id} at ${worstRoof.d.toFixed(1)})`);

  // And nothing is gilded but the one thing that should be.
  assert(!walls.includes(GILT) && !roofs.includes(GILT),
    'the landmark gold is no longer the colour of nine whole buildings');

  // Neighbouring residence halls still differ, which is what the four hashed
  // dorm tints used to buy — now a nudge within one brick rather than four
  // separate colours.
  const dormShades = new Set(CATALOGUE.filter((t) => t.kind === 'dorm').map(wallShadeOf));
  assert(dormShades.size > 1, `residence halls still vary (${dormShades.size} shades of the same brick)`);
  assert(CATALOGUE.filter((t) => t.kind !== 'dorm').every((t) => wallShadeOf(t) === 1),
    'and nothing else is nudged at all');
}

// --- 13. The athletics venues are the size the things they are -----------
{
  // These were sized from an assumed 15 m per tile, while the map draws at 9 —
  // so every venue came out two-thirds of its proper size beside the
  // buildings, and a 400 m running track had 108 m to fit a 176 m straight
  // into. Checked in METRES against what each venue actually is, with a
  // generous tolerance: the requirement is the right ballpark, not the survey.
  const metres = (t: Buildable) => {
    const fp = footprintOf(t);
    return { long: Math.max(fp.w, fp.h) * METRES_PER_TILE, short: Math.min(fp.w, fp.h) * METRES_PER_TILE };
  };
  const check = (facilityType: string, name: string, long: number, short: number, tol = 0.3) => {
    const t = CATALOGUE.find((x) => x.facilityType === facilityType);
    if (!t) { assert(false, `the catalogue has a ${name}`); return; }
    const m = metres(t);
    const ok = Math.abs(m.long - long) / long <= tol && Math.abs(m.short - short) / short <= tol;
    assert(ok, `${name} is about ${long}m by ${short}m (got ${m.long.toFixed(0)} by ${m.short.toFixed(0)})`);
  };
  check('athleticsField', 'a 400m track and its infield', 176, 92);
  check('footballStadium', 'a football stadium', 220, 180);
  check('athleticsDiamond', 'a ball field to the outfield fence', 125, 125);
  check('athleticsArena', 'an arena', 110, 80);
  check('athleticsNatatorium', 'a 50m competition pool hall', 72, 45);
  check('tennisCourts', 'six tennis courts in a row', 110, 36);
  check('pool', 'an open-air 50m pool and its deck', 63, 36);

  // And the pinnacle venue is still the biggest thing on campus, which is the
  // one relationship its footprint is actually load-bearing for.
  const stadium = CATALOGUE.find((t) => t.facilityType === 'footballStadium');
  const areas = CATALOGUE.map((t) => { const fp = footprintOf(t); return { id: t.id, a: fp.w * fp.h }; })
    .sort((x, y) => y.a - x.a);
  assert(stadium !== undefined && areas[0].id === stadium.id,
    `the football stadium covers more ground than anything else (biggest is ${areas[0].id})`);
}

// --- 7. Nothing in the catalogue is missing a spec -------------------------
{
  for (const t of CATALOGUE) {
    const h = wallHeightOf(t);
    if (!Number.isFinite(h) || h < 0) { assert(false, `${t.id}: has a real wall height`); break; }
    if (motifOf(t) !== 'grounds' && h <= 0) { assert(false, `${t.id}: stands up`); break; }
  }
  assert(true, `all ${CATALOGUE.length} placeable Buildables carry a usable spec`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
