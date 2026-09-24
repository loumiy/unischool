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
  BASE_COURSE, CANOPY_SLAB, COLONNADE_HEIGHT, CORNICE, EAVES_COURSE, PLINTH,
  doorFamilyOf, doorOf, floorLinesOf, hasClockTower,
  materialOf, materialsFor, stoneFor, roofFor, parapetOf, paneShapeOf,
  windowOutline, windowShapeOf, variesByVernacular, VERNACULAR_INVARIANT_MOTIFS,
  partsFor, entrancePartOf, rooflineEndPartOf, apexPartOf, hasRoofForm,
  VERNACULAR_CHOICES,
  IMPLEMENTED_ENTRANCE_PARTS, IMPLEMENTED_ROOFLINE_END_PARTS, IMPLEMENTED_APEX_PARTS,
  hasClockTower as carriesClockTower,
  VERNACULARS, motifOf, rankSills, ridgeOf,
  storeysOf, wallHeightOf, wallShadeOf,
  windowRanksOf, windowWidthOf, type DoorFamily,
} from '../src/components/buildingSpec';
import { footprintOf, isPlaceableKind } from '../src/state/campusMap';
import { initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import type { Buildable, Vernacular } from '../src/state/types';

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
  assert(grounds.every((t) => wallHeightOf(t) === 0 && ridgeOf(t, FOUNDING_VERNACULAR) === 0),
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
    // The parapet joins the sum since Plan 07's PR E made it
    // per-vernacular: this is now the honest question (does the applied
    // stonework fit?) rather than the old `PARAPET > 0`, which was really
    // asserting that the one vernacular had a parapet at all. Zero is a
    // legitimate answer — a Gothic roof springs from its eaves.
    if (!(PLINTH + CORNICE + parapetOf(FOUNDING_VERNACULAR) < wall)) {
      assert(false, `${t.id}: plinth, cornice and parapet fit inside a ${wall.toFixed(1)}-unit wall`);
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
    assert(ridgeOf(hall, FOUNDING_VERNACULAR) < STOREY, 'a hall\'s ridge rises less than one storey above its eaves');
    assert(ridgeOf(hall, FOUNDING_VERNACULAR) > 0, 'but it is still a pitched roof');
  }
}

// --- 12. Materials, not a colour chart -----------------------------------
{
  const V = FOUNDING_VERNACULAR;
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

  const walls = [...new Set(CATALOGUE.map((t) => materialOf(t, V).wall))];
  const roofs = [...new Set(CATALOGUE.map((t) => materialOf(t, V).roof))];
  // Seven, not six: 4E gave the residence halls a dark brick of their own
  // (buildingSpec's brickDark), and the bar moved to let it in. Stated here
  // rather than quietly relaxed, because a cap that follows the palette
  // around is not a cap. What it is guarding is the 23-tint colour chart
  // this replaced, and the real guard against that is the pairwise-distance
  // check below, which has NOT moved: seven materials a player can tell
  // apart is a palette; seven near-neighbours would fail on the next line
  // whatever this number said.
  assert(walls.length <= 7, `the campus is built of at most seven materials (got ${walls.length})`);
  assert(roofs.length <= 3, `and roofed in at most three (got ${roofs.length})`);

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
    const m = materialOf(t, V);
    const d = dist(m.wall, m.roof);
    if (d < worstRoof.d) worstRoof = { d, id: t.id };
  }
  assert(worstRoof.d > 60,
    `every building's roof reads against its own walls (worst: ${worstRoof.id} at ${worstRoof.d.toFixed(1)})`);

  // And nothing is gilded but the one thing that should be.
  assert(!walls.includes(stoneFor(V).gilt) && !roofs.includes(stoneFor(V).gilt),
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

// --- 14. Applied pieces fit the buildings they are applied to ------------
{
  // The recurring bug of this whole sequence, in one check. A civic door was
  // taller than a single-storey wall; a plinth was taller than a ground-floor
  // sill; a canopy's slab sat above the roof of the building it hung on. Each
  // was invisible in the numbers and obvious on screen, and each is the same
  // mistake: a piece sized in the abstract against a wall that is too short
  // for it. So every applied piece is checked against the SHORTEST building
  // that wears it.
  const shortest = (predicate: (t: Buildable) => boolean) =>
    CATALOGUE.filter(predicate).sort((a, b) => wallHeightOf(a) - wallHeightOf(b))[0];

  const pavilion = shortest((t) => motifOf(t) === 'pavilion');
  if (pavilion) {
    const d = doorOf(pavilion);
    const wall = wallHeightOf(pavilion);
    assert(BASE_COURSE + EAVES_COURSE < wall,
      `the shared base and eaves courses fit the shortest pavilion (${pavilion.id}, ${wall.toFixed(1)} units)`);
    assert(!!d && d.threshold + d.height < wall - EAVES_COURSE,
      `and its door clears the eaves course above it`);
    assert(wall - EAVES_COURSE - CANOPY_SLAB > (d ? d.threshold + d.height * 0.5 : 0),
      'and there is room under the eaves for an entrance canopy');
  }

  const portico = shortest((t) => motifOf(t) === 'portico');
  if (portico) {
    const wall = wallHeightOf(portico);
    // The colonnade is clamped at draw time; this asserts the clamp leaves
    // something worth drawing rather than a knee-high stub.
    assert(Math.min(COLONNADE_HEIGHT, wall - EAVES_COURSE * 2) > STOREY,
      `the shortest colonnaded building (${portico.id}) can still carry a colonnade over a storey tall`);
  }

  // And every roofed motif on the campus can wear the shared courses.
  for (const t of CATALOGUE) {
    if (motifOf(t) === 'grounds') continue;
    if (!(BASE_COURSE + EAVES_COURSE < wallHeightOf(t))) {
      assert(false, `${t.id}: too short for the base and eaves courses every building shares`);
      break;
    }
  }
  assert(true, 'every roofed building on the campus can wear the shared base and eaves courses');
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

// --- 8. A door lands on a tile, not on a seam ------------------------------
//
// The rule campusMap.ts's footprint tables are written against: any footprint
// whose motif draws a CENTRED DOOR has an odd width. An even width centres
// the door on the boundary between two tiles, so no walkway can arrive at it
// and the building cannot line up with the quad it faces.
//
// Checked over the real catalogue rather than over the tables, because the
// tables are three (fixed sizes, size ladders, the two building constants)
// and the property is about what comes out of them.
{
  const doored = CATALOGUE.filter((t) => doorFamilyOf(t) !== null);
  assert(doored.length > 20, `the catalogue has buildings with front doors (${doored.length})`);

  const seams = doored.filter((t) => footprintOf(t).w % 2 === 0);
  assert(
    seams.length === 0,
    `every building with a door has an odd width — ${seams.length} centre theirs on a seam` +
    (seams.length ? ` (e.g. ${seams[0].id} at ${footprintOf(seams[0]).w} wide)` : ''),
  );

  // Rotation swaps the two spans (see campusMap.ts's orientedFootprint), so a
  // building turned 90 degrees puts its door on the OTHER span. Both have to
  // be odd for the door to land on a tile either way round — which is why the
  // rule is about the footprint rather than about one wall.
  const rotatedSeams = doored.filter((t) => footprintOf(t).h % 2 === 0);
  console.log(
    `  · ${doored.length} doored buildings: all odd across the front, ` +
    `${doored.length - rotatedSeams.length} odd on both spans`,
  );

  // Open ground and the stadium are exempt, and it matters that they ARE
  // exempt rather than accidentally compliant: the tennis courts are 12 wide
  // precisely because six courts in a row is what that plot is.
  const exempt = CATALOGUE.filter((t) => doorFamilyOf(t) === null);
  assert(exempt.length > 0, `and the catalogue has doorless plots too (${exempt.length})`);
  assert(
    exempt.some((t) => footprintOf(t).w % 2 === 0),
    'at least one of which keeps an even width, because it has no door to centre',
  );
}

// --- 13. The vernacular seam changed nothing ------------------------------
// Plan 07's PR D moved the campus's colours behind a per-vernacular table so
// PRs G/H/I can add a second, third and fourth set. The whole claim of that
// PR is that it is INVISIBLE, and a claim like that is worth pinning rather
// than trusting: these are the literal values the campus was drawn with
// before the table existed, written out by hand here so that a typo made
// while moving them shows up as a failing test rather than as a slightly
// wrong-coloured library nobody notices for three PRs.
//
// When a second vernacular lands, this block does NOT grow a second copy for
// it — that would be asserting that a new palette equals itself. It stays
// pinned to Georgian, whose job from then on is to be the set that did not
// change.
{
  const SLATE = '#5f6b5f';
  const DECK = '#7c8377';
  const BEFORE = {
    brickRed: { wall: '#a2564a', roof: SLATE },
    brickBuff: { wall: '#bb9468', roof: SLATE },
    limestone: { wall: '#d8cdb4', roof: DECK },
    render: { wall: '#b0a992', roof: DECK },
    curtain: { wall: '#93a9b4', roof: DECK },
    brickDark: { wall: '#6d4b3c', roof: DECK },
    clinical: { wall: '#eef1f2', roof: '#c2ccd1' },
  };
  const BEFORE_STONE = { trim: '#efe9da', gilt: '#c9a227', towerStone: '#e4dcc8' };

  const georgian = materialsFor('georgian');
  for (const [name, m] of Object.entries(BEFORE)) {
    const got = georgian[name as keyof typeof BEFORE];
    assert(got.wall === m.wall && got.roof === m.roof,
      `georgian.${name} is unchanged by the vernacular table (got ${got.wall}/${got.roof}, was ${m.wall}/${m.roof})`);
  }
  const stone = stoneFor('georgian');
  for (const [name, hex] of Object.entries(BEFORE_STONE)) {
    assert(stone[name as keyof typeof BEFORE_STONE] === hex,
      `georgian stone.${name} is unchanged (got ${stone[name as keyof typeof BEFORE_STONE]}, was ${hex})`);
  }

  // Every vernacular owes the same seven walls and three stones. Trivial
  // with one entry and the point of the block with four: a set that forgets
  // `clinical` would otherwise draw the hospital as undefined, and the first
  // anyone would know is a blank building on the map.
  const REQUIRED = Object.keys(BEFORE) as (keyof typeof BEFORE)[];
  for (const [vname, palette] of Object.entries(VERNACULARS)) {
    for (const key of REQUIRED) {
      const m = palette.materials[key];
      assert(!!m && typeof m.wall === 'string' && typeof m.roof === 'string',
        `vernacular '${vname}' supplies a ${key} wall and roof`);
    }
    for (const key of ['trim', 'gilt', 'towerStone'] as const) {
      assert(typeof palette.stone[key] === 'string',
        `vernacular '${vname}' supplies its ${key}`);
    }
  }

  // REFERENCE STABILITY, which is load-bearing and easy to break by
  // "tidying" either helper into building a fresh object. CampusMap resolves
  // these once per building per render and BuildingMotif's memo comparator
  // compares them by identity (see its note): return a new object each call
  // and every pane on the campus re-reconciles on every mouse move.
  const v: Vernacular = 'georgian';
  assert(materialsFor(v) === materialsFor(v), 'materialsFor returns a stable reference');
  assert(stoneFor(v) === stoneFor(v), 'stoneFor returns a stable reference');
  const anyHall = CATALOGUE.find((t) => t.kind === 'building');
  assert(!!anyHall && materialOf(anyHall, v) === materialOf(anyHall, v),
    'materialOf returns a stable reference for the same building');
}

// --- 14. The roof-and-openings seam changed nothing either ----------------
// Plan 07's PR E moved the ridge table, the parapet and the window's shape
// behind the same per-vernacular table PR D built. Same discipline as
// section 13: the claim is that it is invisible, so the pre-refactor values
// are written out here by hand and compared.
{
  const V = FOUNDING_VERNACULAR;

  // The ridge table, exactly as it read before it was keyed by vernacular —
  // plus the ONE deliberate change since: the pavilions are pitched (the
  // 2026 map-assets review, docs/reviews/2026-09-map-assets-visual-review.md),
  // because a Georgian refectory under a flat slab read as a warehouse. The
  // two original entries are still pinned; the third is pinned too, so it
  // cannot drift either.
  const roof = roofFor('georgian');
  assert(roof.ridgeMetres.hall === 2.2, `georgian's hall ridge is unchanged (got ${roof.ridgeMetres.hall})`);
  assert(roof.ridgeMetres.village === 3.0, `georgian's village ridge is unchanged (got ${roof.ridgeMetres.village})`);
  assert(roof.ridgeMetres.pavilion === 2.0, `georgian's pavilions carry a shallow hip (got ${roof.ridgeMetres.pavilion})`);
  assert(Object.keys(roof.ridgeMetres).length === 3,
    `and nothing else is pitched (got ${Object.keys(roof.ridgeMetres).join(', ')})`);

  // The residence-hall ladder: a house, an institutional hall, and — since
  // the same review — a block that keeps the institutional hip rather than
  // going flat, because a six-storey hall on a brick-and-slate campus is
  // still roofed.
  for (const [storeys, metres] of [[3, 4.2], [4, 2.4], [5, 2.4], [6, 2.2], [9, 2.2]] as const) {
    assert(roof.residentialRidgeMetres(storeys) === metres,
      `a ${storeys}-storey residence hall's ridge is unchanged (got ${roof.residentialRidgeMetres(storeys)}, was ${metres})`);
  }

  assert(parapetOf('georgian') === up(0.85), `georgian's parapet is unchanged (got ${parapetOf('georgian')})`);
  assert(windowShapeOf('georgian') === 'rect', 'georgian windows are still rectangles');

  // THE OUTLINE ITSELF, corner for corner and in the same order. windows()
  // used to emit these four points inline; if the order rotated, every pane
  // on the campus would still be a rectangle and nothing would look wrong
  // until a non-convex shape went through the same path.
  const rect = windowOutline('rect', 0.2, 0.8, 0.3, 0.7);
  const EXPECTED: Array<[number, number]> = [[0.2, 0.3], [0.8, 0.3], [0.8, 0.7], [0.2, 0.7]];
  assert(rect.length === 4, `a rectangular pane is four points (got ${rect.length})`);
  assert(rect.every((pt, i) => pt[0] === EXPECTED[i][0] && pt[1] === EXPECTED[i][1]),
    `and they are the same four, in the same order (got ${JSON.stringify(rect)})`);

  // EVERY shape stays inside the bay it was given. An arch that bulged past
  // its own bay would collide with its neighbour and a lancet that rose past
  // the head would punch through the floor course above — both invisible in
  // the numbers and obvious on the map, so the bound is what gets pinned.
  for (const shape of ['rect', 'arched', 'lancet', 'slot'] as const) {
    const pts = windowOutline(shape, 0.2, 0.8, 0.3, 0.7);
    assert(pts.length >= 3, `a ${shape} opening is a closed outline (got ${pts.length} points)`);
    const inside = pts.every(([u, v]) => u >= 0.2 - 1e-9 && u <= 0.8 + 1e-9 && v >= 0.3 - 1e-9 && v <= 0.7 + 1e-9);
    assert(inside, `a ${shape} opening stays inside its own bay`);
    // And it reaches the head, or it is not the shape it claims to be: an
    // arch drawn upside down still passes the bound check above.
    assert(pts.some(([, v]) => v > 0.7 - 1e-9), `a ${shape} opening actually reaches its head`);
    assert(pts.some(([, v]) => v < 0.3 + 1e-9), `a ${shape} opening actually reaches its sill`);
  }

  // THE INVARIANT SIX, enforced rather than described. This is the check
  // that stops a future set PR quietly restyling the gym.
  assert(VERNACULAR_INVARIANT_MOTIFS.length === 7, 'seven motifs are vernacular-invariant');
  for (const t of CATALOGUE) {
    const m = motifOf(t);
    if (variesByVernacular(m)) continue;
    assert(paneShapeOf(t, V) === 'rect',
      `${t.id} (${m}) keeps rectangular openings whatever the vernacular`);
  }
  // No vernacular may pitch a roof onto one of them either — a Gothic gym
  // is still a shed, and a ridge is the loudest way to break that.
  for (const [vname, spec] of Object.entries(VERNACULARS)) {
    for (const m of VERNACULAR_INVARIANT_MOTIFS) {
      assert(spec.roof.ridgeMetres[m] === undefined,
        `vernacular '${vname}' does not pitch a roof onto '${m}'`);
    }
  }
}

// --- 15. The ornament table names what the campus already wore -----------
// Plan 07's PR F replaced the renderer's `motif === 'hall'` ornament
// branches with a per-vernacular table of parts. Same claim as 13 and 14:
// nothing moved on the map, so Georgian's row is checked against what each
// motif was actually drawing before the table existed.
{
  const V = FOUNDING_VERNACULAR;
  const parts = partsFor('georgian');

  // The entrance, motif by motif, exactly as the old branches read: a hall
  // had a portico, the civic set a colonnade, a dining hall and a residence
  // hall a canopy, a village nothing applied.
  const EXPECTED_ENTRANCE = {
    hall: 'portico', portico: 'colonnade',
    pavilion: 'canopy', residential: 'canopy', village: 'none',
  } as const;
  for (const [motif, part] of Object.entries(EXPECTED_ENTRANCE)) {
    assert(parts.entrance[motif as keyof typeof EXPECTED_ENTRANCE] === part,
      `georgian's ${motif} entrance is unchanged (got ${parts.entrance[motif as keyof typeof EXPECTED_ENTRANCE]}, was ${part})`);
  }
  assert(parts.rooflineEnd === 'pavilion', 'georgian still raises a pavilion at each end of the roofline');
  assert(parts.apex === 'cupola', 'and still tops its landmark with a cupola');

  // THE TABLE COVERS EXACTLY THE FIVE VARYING MOTIFS. One short is a
  // building that silently loses its entrance; one extra is a vernacular
  // reaching into the invariant seven by the back door.
  const varying = [...new Set(CATALOGUE.map(motifOf))].filter(variesByVernacular);
  for (const m of varying) {
    assert(parts.entrance[m] !== undefined,
      `georgian says what goes at a '${m}' entrance`);
  }
  for (const m of VERNACULAR_INVARIANT_MOTIFS) {
    assert(parts.entrance[m] === undefined,
      `georgian does not reach into '${m}', which no vernacular restyles`);
  }

  // And the gate holds at the level the renderer actually asks at: every
  // invariant building answers 'none', whatever the table says.
  for (const t of CATALOGUE) {
    if (variesByVernacular(motifOf(t))) continue;
    assert(entrancePartOf(t, V) === 'none',
      `${t.id} (${motifOf(t)}) has no applied entrance in any vernacular`);
  }

  // The apex belongs to the one building that has one. The vernacular says
  // WHAT stands there; hasClockTower still says WHICH building.
  const towered = CATALOGUE.filter(carriesClockTower);
  assert(towered.length === 1 && apexPartOf(V) !== 'none',
    'exactly one building tops out, and this vernacular has something to put there');

  // NO VERNACULAR MAY NAME A PART NOTHING DRAWS. This is the check that
  // makes it safe for EntrancePart/ApexPart to name the parts PRs G, H and
  // I will need before those PRs exist: adding `apex: 'spire'` to a new row
  // fails here until a spire is actually drawn.
  for (const [vname, spec] of Object.entries(VERNACULARS)) {
    for (const [m, part] of Object.entries(spec.parts.entrance)) {
      assert(IMPLEMENTED_ENTRANCE_PARTS.includes(part),
        `vernacular '${vname}' names entrance part '${part}' for '${m}', which nothing draws yet`);
    }
    assert(IMPLEMENTED_ROOFLINE_END_PARTS.includes(spec.parts.rooflineEnd),
      `vernacular '${vname}' names roofline end '${spec.parts.rooflineEnd}', which nothing draws yet`);
    assert(IMPLEMENTED_APEX_PARTS.includes(spec.parts.apex),
      `vernacular '${vname}' names apex '${spec.parts.apex}', which nothing draws yet`);
  }
  assert(rooflineEndPartOf(V) === 'pavilion', 'and the roofline-end lookup agrees with the table');
}

// --- 16. Every vernacular keeps the campus's own rules -------------------
// Sections 12 to 15 pin GEORGIAN, which is the set that must not change.
// This one is the gate every NEW set has to pass: the palette discipline of
// section 12 applied to each vernacular in turn, plus the one rule that only
// exists once there is more than one set.
{
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

  for (const vname of Object.keys(VERNACULARS) as Vernacular[]) {
    const walls = [...new Set(CATALOGUE.map((t) => materialOf(t, vname).wall))];
    const roofs = [...new Set(CATALOGUE.map((t) => materialOf(t, vname).roof))];
    assert(walls.length <= 7, `'${vname}' is built of at most seven materials (got ${walls.length})`);
    assert(roofs.length <= 3, `'${vname}' is roofed in at most three (got ${roofs.length})`);

    let closest = { d: Infinity, a: '', b: '' };
    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length; j++) {
        const d = dist(walls[i], walls[j]);
        if (d < closest.d) closest = { d, a: walls[i], b: walls[j] };
      }
    }
    assert(closest.d > 35,
      `'${vname}': its closest two materials are ${closest.d.toFixed(1)} apart (${closest.a} vs ${closest.b})`);

    // A ROOF MUST READ AGAINST ITS OWN WALLS — but only where there IS a
    // roof. A vernacular that pitches nothing and carries no parapet has a
    // TOP, not a roof: what you look down onto is the same concrete as the
    // walls, and forcing it 60 away would put a dark lid on the one set
    // whose whole argument is that the building is a single poured mass.
    //
    // Not skipped for those, INVERTED: they must stay close, or the "no
    // roof" claim is not being honoured either. Both directions are checked,
    // so neither can be quietly relaxed into the other.
    let worstRoof = { d: Infinity, id: '' };
    let widestRoof = { d: 0, id: '' };
    for (const t of CATALOGUE) {
      const m = materialOf(t, vname);
      const d = dist(m.wall, m.roof);
      if (d < worstRoof.d) worstRoof = { d, id: t.id };
      // The invariant motifs keep Georgian's own materials whatever the set
      // (see below), so their roofs are exempt from the "stays close" half.
      if (variesByVernacular(motifOf(t)) && d > widestRoof.d) widestRoof = { d, id: t.id };
    }
    if (hasRoofForm(vname)) {
      assert(worstRoof.d > 60,
        `'${vname}': every roof reads against its own walls (worst: ${worstRoof.id} at ${worstRoof.d.toFixed(1)})`);
    } else {
      assert(widestRoof.d < 90,
        `'${vname}' has no roof form, so its tops stay in the same material as its walls `
        + `(widest: ${widestRoof.id} at ${widestRoof.d.toFixed(1)})`);
    }

    const gilt = stoneFor(vname).gilt;
    assert(!walls.includes(gilt) && !roofs.includes(gilt),
      `'${vname}': its landmark metal is not also the colour of a building`);
  }

  // THE INVARIANT MOTIFS ARE MADE OF INVARIANT MATERIALS.
  //
  // This is the rule that only exists once there are two sets, and it is the
  // one a set PR is most likely to break by eye: the six motifs no
  // vernacular restyles are still drawn with materialOf, so a set that
  // recolours every entry in its MaterialSet repaints the gym and the
  // teaching hospital along with the halls — and a campus whose sports hall
  // changed colour with its founding century would be claiming the 1970s
  // shed was built in 1890.
  //
  // Measured off the CATALOGUE rather than asserted against a hand-listed
  // set of material names, because which materials reach an invariant motif
  // is a consequence of materialOf's switch and moves when that moves. As of
  // PR G that is render (labs, gyms, the stadium, open ground), curtain (the
  // natatorium and the residential tower) and clinical (the teaching
  // hospital) — and note two of the three ALSO serve varying motifs, so
  // "recolour everything the halls don't use" is not a safe shortcut either.
  const invariantBuildings = CATALOGUE.filter((t) => !variesByVernacular(motifOf(t)));
  assert(invariantBuildings.length > 0, 'the catalogue has invariant buildings to check');
  for (const t of invariantBuildings) {
    const base = materialOf(t, 'georgian');
    for (const vname of Object.keys(VERNACULARS) as Vernacular[]) {
      const here = materialOf(t, vname);
      assert(here.wall === base.wall && here.roof === base.roof,
        `${t.id} (${motifOf(t)}) is the same material in '${vname}' as in 'georgian' `
        + `(got ${here.wall}/${here.roof}, expected ${base.wall}/${base.roof})`);
    }
  }
}

// --- 17. Every vernacular is offerable ------------------------------------
// The founding screen builds its picker from VERNACULAR_CHOICES (Plan 07's
// PR K). A set that exists in VERNACULARS but not in that list is a set
// nobody can ever choose — it would be in the game, tested, drawn, and
// unreachable — and nothing about adding one would fail without this.
{
  const offered = VERNACULAR_CHOICES.map((c) => c.id);
  const built = Object.keys(VERNACULARS) as Vernacular[];
  for (const v of built) {
    assert(offered.includes(v), `'${v}' is offered on the founding screen`);
  }
  for (const id of offered) {
    assert(built.includes(id), `the founding screen does not offer '${id}', which is not a vernacular`);
  }
  assert(new Set(offered).size === offered.length, 'no vernacular is offered twice');
  for (const c of VERNACULAR_CHOICES) {
    assert(c.label.trim().length > 0 && c.blurb.trim().length > 0,
      `'${c.id}' has a name and a description to offer`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
