import type { ReactElement } from 'react';
import { CAMPUS_GRID_HEIGHT, type Buildable, type GameState, type Pillar, type SchoolColors, type Vernacular } from '../state/types';
import BuildingMotif, { drawnHeightOf, materialOf } from './buildingMotifs';
import { FittedDrawing, drawFitted, thumbKey } from './BuildThumb';
import { boxFaces, polyPoints, project } from './isoProjection';
import { castShadow } from './light';
import { ROAD_FIRST_ROW, orientedFootprint } from '../state/campusMap';
import { districtCentre, landOf, ringView, type RingSprite } from './ringLand';
import { RingSpritesArt } from './Surroundings';
import { DISTRICT_STEPS, FESTIVAL_SCALES } from '../data/downtownData';
import { SPECIALIZATION_BUILDINGS } from '../data/specializationData';
import { PILLARS } from '../systems/prestige/prestigeSystem';

// ---------------------------------------------------------------------
// What each specialization builds, drawn on its panel of the choice (Plan
// 109, SpecializationChoice.tsx), by the map's own drawing and kept as
// markup once drawn (BuildThumb.tsx's FittedDrawing), from the default
// camera.
//
// - The three capital projects (the Faculty Training Institute, the
//   Research Park, the Athletic Performance Complex) stand finished on a
//   plate of grass a little wider than their footprint, in the college's
//   vernacular (or the one a standing building was raised in).
// - Student life's is the downtown, full grown and dressed for a gala
//   festival in the college's colours: the town's shops and strings of
//   lights from the ring beside the parcel (ringLand.ts, Surroundings.tsx)
//   within DOWNTOWN_REACH tiles either way of the middle of its first two
//   strings of lights, where the district starts to grow and the street is
//   dressed (else of its first steps' shopfronts, districtCentre), on a
//   plate of their own with the road along it.
// ---------------------------------------------------------------------

// CampusMap's inset, so a building sits in its footprint as on the map.
const INSET = 0.06;
// Tiles of grass round a building's footprint.
const PLATE_MARGIN = 1.5;
// The downtown's slice: tiles either way along the street from its middle,
// and, for a town with fewer than two strings of lights, the steps whose
// shopfronts it centres on.
const DOWNTOWN_REACH = 5;
const DOWNTOWN_CENTRE_STEP = 3;
// Tiles of grass round the downtown's shops.
const DOWNTOWN_MARGIN = 0.8;
// The festival it is dressed for: the largest, a gala.
const DOWNTOWN_FESTIVAL = FESTIVAL_SCALES.length;

// A capital project on its plate, finished.
export function PlateDrawing({ t, vernacular }: { t: Buildable; vernacular: Vernacular }) {
  const fp = orientedFootprint(t, 0);
  const d = { col: INSET, row: INSET, w: fp.w - INSET * 2, h: fp.h - INSET * 2, facing: 0 as const };
  const lift = drawnHeightOf(t, false, vernacular);
  const plate = boxFaces(-PLATE_MARGIN, -PLATE_MARGIN, fp.w + PLATE_MARGIN * 2, fp.h + PLATE_MARGIN * 2, 0, 0).top;
  return (
    <svg className="campus-map-svg" xmlns="http://www.w3.org/2000/svg">
      <g>
        <polygon className="campus-ground" points={polyPoints(plate)} />
        {lift > 0 && <polygon className="campus-building-shadow" points={polyPoints(castShadow(d.col, d.row, d.w, d.h, lift))} />}
        <BuildingMotif t={t} p={d} material={materialOf(t, vernacular)} vernacular={vernacular} developing={false} />
      </g>
    </svg>
  );
}

// The downtown's slice: its shops and strings of lights near the corner,
// the plate under them, and the column it centres on. Pure, for the tests
// (test/specialization-page.test.ts).
export function downtownSlice(name: string): {
  sprites: RingSprite[]; plate: { c0: number; r0: number; c1: number; r1: number }; centre: number;
} | null {
  const land = landOf(name);
  const first = [...land.district.strings].sort((a, b) => a.step - b.step).slice(0, 2);
  const centre = first.length === 2 ? (first[0].col + first[1].col) / 2 : districtCentre(name, DOWNTOWN_CENTRE_STEP).col;
  const near = (col: number) => Math.abs(col - centre) <= DOWNTOWN_REACH;
  const view = ringView(name, true, DISTRICT_STEPS, false, DOWNTOWN_FESTIVAL);
  const sprites = [...view.back, ...view.front].filter((x) => {
    if (x.kind === 'shop') return near(x.shop.col + x.shop.w / 2);
    if (x.kind === 'lights') {
      const string = land.district.strings[Number(x.key.slice(1))];
      return string !== undefined && near(string.col);
    }
    return false;
  }).sort((a, b) => a.y - b.y);
  const shops = sprites.flatMap((x) => (x.kind === 'shop' ? [x.shop] : []));
  if (shops.length === 0) return null;
  return {
    sprites,
    centre,
    plate: {
      c0: Math.min(...shops.map((x) => x.col)) - DOWNTOWN_MARGIN,
      r0: Math.min(...shops.map((x) => x.row)) - DOWNTOWN_MARGIN,
      c1: Math.max(...shops.map((x) => x.col + x.w)) + DOWNTOWN_MARGIN,
      r1: Math.max(...shops.map((x) => x.row + x.h)) + DOWNTOWN_MARGIN,
    },
  };
}

// A line along the street at `row`, from `c0` to `c1`.
function along(c0: number, c1: number, row: number): string {
  const a = project(c0, row);
  const b = project(c1, row);
  return `M${a.x},${a.y}L${b.x},${b.y}`;
}

export function DowntownDrawing({ name, vernacular, colors }: { name: string; vernacular: Vernacular; colors: SchoolColors }) {
  const slice = downtownSlice(name);
  if (!slice) return <svg className="campus-map-svg" xmlns="http://www.w3.org/2000/svg"><g /></svg>;
  const { c0, r0, c1, r1 } = slice.plate;
  // The road as the ring draws it (ringLand.ts's buildView: the parcel's
  // own rows, carried on past it), cut to the plate's length.
  const road = boxFaces(c0, ROAD_FIRST_ROW, c1 - c0, CAMPUS_GRID_HEIGHT - ROAD_FIRST_ROW, 0, 0).top;
  return (
    <svg className="campus-map-svg" xmlns="http://www.w3.org/2000/svg">
      <g>
        <polygon className="campus-ground" points={polyPoints(boxFaces(c0, r0, c1 - c0, r1 - r0, 0, 0).top)} />
        <polygon className="campus-road" points={polyPoints(road)} />
        <path className="campus-road-kerb" d={along(c0, c1, ROAD_FIRST_ROW) + along(c0, c1, CAMPUS_GRID_HEIGHT)} />
        <path className="campus-road-centre" d={along(c0, c1, (ROAD_FIRST_ROW + CAMPUS_GRID_HEIGHT) / 2)} />
        <RingSpritesArt sprites={slice.sprites} vernacular={vernacular} snow={0} colors={colors} />
      </g>
    </svg>
  );
}

// The vernacular a project is drawn in: the one it was raised in, if it
// stands (a Research Park built before Plan 85F), else the college's.
function vernacularOf(s: GameState, id: string): Vernacular {
  return s.placements[id]?.vernacular ?? s.self.vernacular;
}

// A pillar's drawing: the key it is kept under, and what draws it.
function previewOf(s: GameState, pillar: Pillar): { key: string; node: () => ReactElement } | null {
  const id = SPECIALIZATION_BUILDINGS[pillar];
  if (id === null) {
    const { name, vernacular, colors } = s.self;
    return {
      key: `spec-downtown|${name}|${vernacular}|${colors.primary}|${colors.secondary}`,
      node: () => <DowntownDrawing name={name} vernacular={vernacular} colors={colors} />,
    };
  }
  const t = s.tech.find((x) => x.id === id);
  if (!t) return null;
  const v = vernacularOf(s, id);
  return { key: `spec-plate|${thumbKey(t, v)}`, node: () => <PlateDrawing t={t} vernacular={v} /> };
}

// Draws the four while the letter is read, one to a task, so the page
// opens on drawings already kept and its panels drop in without the main
// thread stopping to draw them. Returns the way to call it off.
export function drawPreviewsAhead(s: GameState): () => void {
  const jobs = PILLARS.map((p) => previewOf(s, p)).filter((j) => j !== null);
  let timer = 0;
  const next = (i: number) => {
    if (i >= jobs.length) return;
    timer = window.setTimeout(() => {
      drawFitted(jobs[i].key, jobs[i].node());
      next(i + 1);
    }, i === 0 ? 120 : 40);
  };
  next(0);
  return () => window.clearTimeout(timer);
}

export default function SpecializationPreview({ s, pillar }: { s: GameState; pillar: Pillar }) {
  const job = previewOf(s, pillar);
  return job && <FittedDrawing drawKey={job.key} node={job.node} />;
}
