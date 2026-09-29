import { financingFor } from '../systems/finance/treasury';
import { distance, midpoint, pinchView, type Point, type View } from './mapGestures';
import { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Action, CampusTool } from '../state/actions';
import type { BenchFacing, Buildable, GameState, Initiative, Placement, TileCoord, Vernacular } from '../state/types';
import { totalEnrolled } from '../state/types';
import { useCampusLayout, type CampusLayout } from './campusLayout';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import {
  ROAD_FIRST_ROW, awaitsSite, canPlace, canRotate, footprintOf,
  isPlaceableKind, orientedFootprint, parsePathTileKey, pathTileKey,
} from '../state/campusMap';
import { siteRefusal } from '../state/reach';
import Walkers from './Walkers';
import AgeMarks, { type AgeBand } from './ageMarks';
import { Bench, dressingProps } from './dressing';
import { defaultBenchFacing, turnFacing } from '../state/dressing';
import { BannerContext, CollegeNameContext, ColorsContext, CrowdContext, DevelopingContext, VenueContext, crowdedVenues, isCommencement } from './mapOccasions';
import { desireLines, walkGrid } from './walkRoutes';
import { canStartDevelopment, facultyGate } from '../systems/techtree/techSystem';
import { schoolOffers } from '../systems/techtree/programOffers';
import { isTypingTarget, useHotkeys } from './hotkeys';
import HelpHint from './HelpHint';
import BuildingInfoPanel from './BuildingInfoPanel';
import { isAcademicHall, programById } from '../data/techData';
import { schoolMark } from '../data/schoolPalette';
import { researchTopic } from '../data/researchTopics';
import BuildingMotif, { ScaffoldPattern, drawnHeightOf, labelHeightOf } from './buildingMotifs';
import { floorsUnderConstruction, materialOf, motifOf, storeysOf, wallHeightOf } from './buildingSpec';
import { SiteFrame, siteStageOf } from './siteWorks';
import { groundProps } from './groundMarkings';
import { depthOrder, type DepthBox } from './depthSort';
import PathwayLayer from './pathways';
import { SUMMER_GREEN_WEEK, SnowContext, seasonOf, seasonStyle } from './seasons';
import { RingBack, RingFront } from './Surroundings';
import { clampView, ringZoomFloor } from './ringLand';
import Tree, { woodlandShadow } from './trees';
import { plantingSpecies } from './plantingChoice';
import { castShadow } from './light';
import {
  DEFAULT_CAMERA, DEFAULT_PITCH_INDEX, PITCHES, TURN_MS, VIEWS, WORLD, boxFaces, lift, polyPoints, project, setCamera, tileAt,
  turnStep, unproject, type Camera, type Pt,
} from './isoProjection';
import { reducedMotion, useSettings } from '../settings';
import { fullResidences } from './residenceFill';
import { setMapProbe } from './mapProbe';
import { CloseIcon, MapToolsIcon, TurnViewIcon } from './icons';
import { HitList, Painter, StyleResolver, registerArt, type ArtScope, type PaintOptions } from './canvasPaint';
import { registerMapArt } from './canvasArt';
import { pct, weeksShort } from '../format';

// How long a dust puff hangs over a footprint just placed (Plan 70H).
const DUST_MS = 900;

// The campus map: the game's base layer, always on screen (see App.tsx).
// It reads `s.placements` + `s.tech` and dispatches PLACE_BUILDABLE; it owns
// no game state. `selectedId` and `pathTool` are lifted to App.tsx because
// the build popup can also arm them. Pan/zoom is purely visual (a `<g>`
// transform) and never touches tile coordinates.

// --- layout ---
// Geometry lives in isoProjection.ts. The ground is one plate polygon plus
// one <path> of grid lines rather than a rect per tile; a pointer resolves
// to a tile by arithmetic (unproject), not DOM hit-testing.
const MAP_PADDING = 64;

// Placed buildings draw slightly inset within their footprint (render only;
// occupancy stays in whole tiles) so adjacent buildings don't fuse into one
// mass. In tile units.
const BUILDING_INSET = 0.06;

// Labels are drawn in a pass after every building, on a plate, so a name is
// never occluded and stays readable over any roof. Size scales with the
// footprint and is in world units, so the camera scales it; the floor keeps
// the smallest footprint legible at DEFAULT_ZOOM.
const LABEL_MIN_FONT_SIZE = 19;
const LABEL_MAX_FONT_SIZE = 34;
const LABEL_SIZE_PER_TILE = 1.8;   // font size grows this much per tile of (w + h)
const LABEL_CHAR_WIDTH_RATIO = 8 / 15;
const LABEL_PLATE_PAD_X = 5;
const LABEL_PLATE_PAD_Y = 3;

// The under-construction bar lies flat on the ground along the front edge
// of the site's footprint: the edge under its visible left wall, filling
// left to right on screen.
const PROGRESS_BAR_DEPTH = 0.22;   // in tiles

// The strip inside footprint `p` along the edge its screen-left wall stands
// on (D to C), from `u0` to `u1` of the way along and PROGRESS_BAR_DEPTH
// deep. Built from the footprint's screen corners, so it is the near edge
// at every camera: always the +row edge, it lay behind the building (and
// showed through it) when the camera looked from -row.
function frontEdgeStrip(p: Placement, u0: number, u1: number): Pt[] {
  const f = boxFaces(p.col, p.row, p.w, p.h, 0, 0);
  const v = PROGRESS_BAR_DEPTH / f.spanRight;   // D to A runs spanRight tiles
  const at = (u: number, vv: number): Pt => ({
    x: f.D.x + (f.C.x - f.D.x) * u + (f.A.x - f.D.x) * vv,
    y: f.D.y + (f.C.y - f.D.y) * u + (f.A.y - f.D.y) * vv,
  });
  return [at(u0, 0), at(u1, 0), at(u1, v), at(u0, v)];
}

// Cast shadows: the footprint translated away from the sun (light.ts),
// scaled by the mass's drawn height. All are drawn in one pass after the
// paths and the flat plates and before any mass (see CastShadows): with a
// world-fixed sun and a turning camera, a shadow can fall across a building
// nearer the camera, so shadows must go down first.

// Labels fade with cursor distance: full strength over the building, gone
// a couple of hundred pixels away. Measured in screen pixels so the falloff
// feels the same at every zoom.
const LABEL_FULL_PX = 30;    // within this of the footprint, fully lit
const LABEL_FADE_PX = 130;   // and gone by this

// How long a finished building's completion ring stays on screen. Long
// enough to notice at a glance, short enough that a run of completions in a
// fast-forwarded year does not leave the map permanently flashing.
const COMPLETION_PULSE_MS = 1500;

// --- pan & zoom ---
// Kept out of React state: the world `<g>`'s transform is set imperatively
// (it never carries a `transform` prop in JSX), so dragging never
// re-renders. MIN_ZOOM is low enough to take in a fully built-out campus.
const MIN_ZOOM = 0.22;
const MAX_ZOOM = 2.5;
// The zoom the map first loads at (see defaultView): wider than native size
// so a built-out campus reads as a campus.
const DEFAULT_ZOOM = 0.4;
const ZOOM_SPEED = 0.0016;       // wheel deltaY -> zoom factor
const PAN_CLICK_THRESHOLD = 4;   // px of movement before a mousedown counts as a drag, not a click
const TOUCH_SLOP = 8;            // px a finger may wander and still be a tap
const TOUCH_MOUSE_GRACE_MS = 800; // how long after a touch the emulated mouse events are ignored

// Keyboard panning (W/A/S/D and arrows) matters because the mouse is often
// busy holding a path stroke or carrying a building. Offsets are what the
// view translate moves by, so they read inverted against the key.
const PAN_KEYS: Record<string, readonly [number, number]> = {
  w: [0, 1], a: [1, 0], s: [0, -1], d: [-1, 0],
  arrowup: [0, 1], arrowleft: [1, 0], arrowdown: [0, -1], arrowright: [-1, 0],
};
// Screen pixels per second, not scaled by zoom.
const KEY_PAN_SPEED = 1100;
// Longest frame gap a single pan step integrates, so a backgrounded tab
// doesn't teleport the camera when it resumes.
const MAX_PAN_FRAME_S = 0.1;

// --- the camera ---
// Four views (VIEWS) and ten pitches (PITCHES), stepped with Q/E, Z/X and
// Home. The map rests only on those (the motifs are drawn for those exact
// angles); a quarter turn between views is eased over TURN_MS (Plan 37,
// see turnBy), and a tilt snaps. A camera change is a React re-render,
// unlike a pan. It turns about the ground at the canvas center.

// The grid projects to a diamond whose left corner is at negative x, so
// defaultView centers on WORLD's real bounds. Headroom at the top is for
// the tallest roof.
const WORLD_TOP_HEADROOM = 140;

// The ground plate, the grid lines over the land and the road along the
// south edge (campusMap.ts's ROAD_FIRST_ROW), rebuilt only when the camera
// moves.
function groundGeometry(): { plate: string; grid: string; road: string; kerb: string; centre: string } {
  const plate = polyPoints(boxFaces(0, 0, CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT, 0, 0).top);
  const line = (c0: number, r0: number, c1: number, r1: number) => {
    const a = project(c0, r0); const b = project(c1, r1);
    return `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  };
  const road = polyPoints(boxFaces(0, ROAD_FIRST_ROW, CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT - ROAD_FIRST_ROW, 0, 0).top);
  // Both kerbs: the land around the campus (Plan 81B) runs on past the
  // road's far side.
  const kerb = line(0, ROAD_FIRST_ROW, CAMPUS_GRID_WIDTH, ROAD_FIRST_ROW)
    + line(0, CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH, CAMPUS_GRID_HEIGHT);
  const centre = line(0, (ROAD_FIRST_ROW + CAMPUS_GRID_HEIGHT) / 2, CAMPUS_GRID_WIDTH, (ROAD_FIRST_ROW + CAMPUS_GRID_HEIGHT) / 2);
  const seg: string[] = [];
  for (let r = 0; r <= ROAD_FIRST_ROW; r++) {
    const a = project(0, r); const b = project(CAMPUS_GRID_WIDTH, r);
    seg.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  }
  for (let c = 0; c <= CAMPUS_GRID_WIDTH; c++) seg.push(line(c, 0, c, ROAD_FIRST_ROW));
  return { plate, grid: seg.join(''), road, kerb, centre };
}
const MAP_HEIGHT = WORLD.maxY - WORLD.minY + MAP_PADDING * 2 + WORLD_TOP_HEADROOM;

// The tiles of an eight-connected line from `a` to `b`, both included.
function tilesBetween(a: TileCoord, b: TileCoord): TileCoord[] {
  const steps = Math.max(Math.abs(b.row - a.row), Math.abs(b.col - a.col));
  const out: TileCoord[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    out.push({ row: Math.round(a.row + (b.row - a.row) * t), col: Math.round(a.col + (b.col - a.col) * t) });
  }
  return out;
}

// The path tool the secondary mouse button paints with, given the armed one.
function otherPathTool(tool: CampusTool): CampusTool {
  switch (tool) {
    case 'draw': return 'erase';
    case 'erase': return 'draw';
    case 'plant': return 'fell';
    case 'fell': return 'plant';
    case 'lamp': return 'lamp';
    case 'bench': return 'bench';
  }
}

// Color comes from materialOf (buildingSpec.ts); the kind class only
// drives behavior rules such as the inspect dimming.
function kindClasses(t: Buildable): string {
  return `kind-${t.kind}`;
}

function drawnFootprint(p: Placement) {
  return {
    col: p.col + BUILDING_INSET,
    row: p.row + BUILDING_INSET,
    w: p.w - BUILDING_INSET * 2,
    h: p.h - BUILDING_INSET * 2,
  };
}

// Where a building's label sits and how big. `centre` is the center of the
// plate, not a text baseline.
function labelLayout(label: string, t: Buildable, p: Placement, v: Vernacular) {
  const size = Math.max(
    LABEL_MIN_FONT_SIZE,
    Math.min(LABEL_MAX_FONT_SIZE, (p.w + p.h) * LABEL_SIZE_PER_TILE),
  );
  const centre = lift(project(p.col + p.w / 2, p.row + p.h / 2), labelHeightOf(t, v));
  const textWidth = label.length * size * LABEL_CHAR_WIDTH_RATIO;
  return { size, centre, textWidth };
}

// One thing standing on the map, as the depth sort sees it. Masses, trees
// and props are sorted as one list so a tree can be in front of one hall and
// behind another.
export type SceneEntry = DepthBox & (
  | { kind: 'mass'; key: string; id: string }
  | { kind: 'tree'; key: string; seed: number }
  // `owner` is the Buildable a prop belongs to, for its stands' crowd.
  | { kind: 'prop'; key: string; node: React.JSX.Element; owner?: string; shadows?: Pt[][] }
);


// A site's progress: the building's shell rising in scaffolding over its
// build weeks, from the motif's low frame to the eaves, a progress bar lying
// flat along the front edge of its footprint, and the tooltip that counts
// it down.
function SiteProgress({ t, p, label }: { t: Buildable; p: Placement; label: string }) {
  const weeksLeft = useContext(DevelopingContext)[t.id];
  if (weeksLeft === undefined) return null;
  const elapsedFraction = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  const motif = motifOf(t);
  const rises = motif !== 'grounds' && motif !== 'landmark' && floorsUnderConstruction(t) === 0;
  // A plot of houses or a bowl fills in as it goes; a building rises in the
  // landmarks' three stages (Plan 74H): footings (the motif's own site),
  // then the frame to full height, then the closed shell in scaffolding.
  const staged = rises && motif !== 'village' && motif !== 'bowl';
  const stage = siteStageOf(elapsedFraction);
  const d = drawnFootprint(p);
  const shellHeight = !rises ? 0 : staged ? (stage === 2 ? wallHeightOf(t) : 0) : wallHeightOf(t) * elapsedFraction;
  const shell = shellHeight > 0 && (staged || elapsedFraction > 0.05) ? boxFaces(d.col, d.row, d.w, d.h, 0, shellHeight) : null;
  return (
    <>
      {staged && stage === 1 && (
        <SiteFrame col={d.col} row={d.row} w={d.w} h={d.h} height={wallHeightOf(t)} floors={storeysOf(t)} />
      )}
      {shell && (
        <g className="campus-site-shell">
          <polygon points={polyPoints(shell.left)} />
          <polygon points={polyPoints(shell.right)} />
          <polygon points={polyPoints(shell.top)} />
          <polygon className="campus-site-hatch" points={polyPoints(shell.left)} />
          <polygon className="campus-site-hatch" points={polyPoints(shell.right)} />
        </g>
      )}
      <polygon
        className="campus-building-progress-track"
        points={polyPoints(frontEdgeStrip(p, 0, 1))}
      />
      <polygon
        className="campus-building-progress-fill"
        points={polyPoints(frontEdgeStrip(p, 0, Math.max(0, elapsedFraction)))}
      />
      {t.facilityType !== 'quad' && <title>{`${label} · under construction · ${weeksShort(weeksLeft)} left`}</title>}
    </>
  );
}

// One placed building: its mass (buildingMotifs.tsx) plus, while going up,
// a progress bar on the ground. Clicks are handled by the drawn shape, since
// a tall building is drawn above the tiles it occupies.
function PlacedBuilding({
  t, p, label, onInspect, inspected, developing, justFinished, glyphs, vernacular, camera, age = 0, renovating = false, historic = false,
}: {
  t: Buildable; p: Placement; onInspect: () => void; inspected: boolean;
  camera: Camera;
  // What the map calls it (see schools.ts's hallDisplayName).
  label: string;
  developing: boolean; justFinished?: boolean;
  // Resolves to objects on buildingSpec's VERNACULARS table, so they are
  // reference-stable and BuildingMotif's memo still short-circuits.
  vernacular: Vernacular;
  glyphs?: string;
  age?: AgeBand;
  renovating?: boolean;
  historic?: boolean;
}) {
  const d = drawnFootprint(p);

  return (
    <g
      className={`campus-building ${kindClasses(t)} ${inspected ? 'inspected' : ''} ${developing ? 'under-construction' : ''}`}
      // The walkers find this building's doors by it (Walkers.tsx).
      data-building={t.id}
      aria-label={label}
      role="button"
      onClick={onInspect}
    >
      <BuildingMotif
        t={t} p={d}
        material={materialOf(t, vernacular)}
        vernacular={vernacular}
        developing={developing} glyphs={glyphs}
        camera={camera}
      />
      {!developing && motifOf(t) !== 'grounds' && <AgeMarks t={t} p={d} band={renovating ? 0 : age} vernacular={vernacular} historic={historic} />}
      {renovating && motifOf(t) !== 'grounds' && (() => {
        // Scaffolding over the whole of a building under renovation.
        const shell = boxFaces(d.col, d.row, d.w, d.h, 0, wallHeightOf(t) * 1.04);
        return (
          <g className="campus-site-shell renovating">
            <polygon className="campus-site-hatch" points={polyPoints(shell.left)} />
            <polygon className="campus-site-hatch" points={polyPoints(shell.right)} />
          </g>
        );
      })()}
      {inspected && (
        // The footprint outline on the ground, which the building can't hide.
        <polygon className="campus-building-halo" points={polyPoints(boxFaces(p.col, p.row, p.w, p.h, 0, 0).top)} />
      )}
      {justFinished && (
        // A ring on the ground, not over the mass, so it doesn't hide the
        // building it celebrates.
        <polygon
          className="campus-building-complete"
          points={polyPoints(boxFaces(p.col - 0.15, p.row - 0.15, p.w + 0.3, p.h + 0.3, 0, 0).top)}
        />
      )}
      {developing && <SiteProgress t={t} p={p} label={label} />}
      {/* A quad gets no tooltip and no label. */}
      {t.facilityType !== 'quad' && !developing && <title>{`${label} · ${p.w}×${p.h}`}</title>}
    </g>
  );
}

// Every cast shadow in one pass (see the shadow note above). One <path> per
// fill rather than a polygon per shadow, so overlaps draw as one shadow
// rather than a darker one.
type CastShadowsProps = {
  placed: CampusLayout['placed'];
  scene: readonly SceneEntry[];
  vernacular: Vernacular;
  camera: Camera;
};
function CastShadows({ placed, scene, vernacular, camera }: CastShadowsProps) {
  return castShadowsArt(useMemo(
    () => castShadowPaths(placed, scene, vernacular),
    // `camera` is read by the projection, not here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed, scene, vernacular, camera],
  ));
}
function castShadowPaths(placed: CampusLayout['placed'], scene: readonly SceneEntry[], vernacular: Vernacular): { buildings: string; trees: string } {
  const sub = (pts: { x: number; y: number }[]) => `M${polyPoints(pts).replace(/ /g, 'L')}Z`;
  const buildings: string[] = [];
  for (const { t, p, developing } of placed) {
    const height = drawnHeightOf(t, developing, vernacular);
    if (height <= 0) continue;
    const f = drawnFootprint(p);
    buildings.push(sub(castShadow(f.col, f.row, f.w, f.h, height)));
  }
  const trees: string[] = [];
  for (const e of scene) {
    if (e.kind === 'tree') trees.push(sub(woodlandShadow(e.row, e.col, e.seed)));
    // A quad's or garden's planting (groundMarkings.tsx's GroundProp).
    else if (e.kind === 'prop') for (const pts of e.shadows ?? []) trees.push(sub(pts));
  }
  return { buildings: buildings.join(''), trees: trees.join('') };
}
function castShadowsArt(d: { buildings: string; trees: string }) {
  return (
    <g className="campus-shadows" aria-hidden="true">
      {d.buildings && <path className="campus-building-shadow" d={d.buildings} />}
      {d.trees && <path className="campus-tree-shadow" d={d.trees} />}
    </g>
  );
}

// The label layer: drawn after every building, on a plate. The plate is
// sized from the text's measured box (getBBox), since a character-count
// estimate is wrong for a proportional face. Measured in a layout effect so
// no frame shows the estimate.
function BuildingLabel({ t, p, label, pinned, vernacular }: {
  t: Buildable; p: Placement; label: string; pinned: boolean; vernacular: Vernacular;
}) {
  const { size, centre, textWidth } = labelLayout(label, t, p, vernacular);
  const textRef = useRef<SVGTextElement>(null);
  // The measured box, relative to the text's anchor. It depends only on the
  // name and size, so it is re-measured when those change and re-anchored on
  // camera moves (getBBox forces a layout).
  const [box, setBox] = useState<{ dx: number; dy: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const b = el.getBBox();
    const cx = Number(el.getAttribute('x')); const cy = Number(el.getAttribute('y'));
    const next = { dx: b.x - cx, dy: b.y - cy, w: b.width, h: b.height };
    setBox((prev) => (prev && prev.dx === next.dx && prev.dy === next.dy
      && prev.w === next.w && prev.h === next.h
      ? prev
      : next));
  }, [label, size]);

  const plate = box
    ? { x: centre.x + box.dx, y: centre.y + box.dy, w: box.w, h: box.h }
    : {
      x: centre.x - textWidth / 2,
      y: centre.y - size * 0.475,
      w: textWidth,
      h: size * 0.95,
    };

  return (
    <g
      className="campus-label"
      aria-hidden="true"
      // The footprint, for the cursor-distance pass, which runs on every
      // mouse move and so reads the DOM rather than React state.
      data-col={p.col}
      data-row={p.row}
      data-w={p.w}
      data-h={p.h}
      data-pinned={pinned ? '1' : undefined}
    >
      <rect
        className="campus-label-plate"
        x={plate.x - LABEL_PLATE_PAD_X}
        y={plate.y - LABEL_PLATE_PAD_Y}
        width={plate.w + LABEL_PLATE_PAD_X * 2}
        height={plate.h + LABEL_PLATE_PAD_Y * 2}
        rx={3}
      />
      {/* .campus-label-text carries dominant-baseline: middle; don't add a
          manual baseline nudge. */}
      <text ref={textRef} className="campus-label-text" x={centre.x} y={centre.y} fontSize={size}>
        {label}
      </text>
    </g>
  );
}

// The slot pips over a standing hall, just above the label position.
const HALL_PIP_R = 6.5;
const HALL_PIP_GAP = 17;
const HALL_MARK_LIFT = 28;

// Is a program in this hall stuck for want of a department? Its next
// startable course's field has no free slot.
function programBlocked(s: GameState, programId: string): boolean {
  const program = programById(programId);
  if (!program) return false;
  const next = program.courseIds.map((id) => s.tech.find((x) => x.id === id)).find((c) => c?.status === 'available');
  return !!next?.requiresFaculty && facultyGate(s, next.requiresFaculty) !== 'open';
}

function HallMarks({ t, p, slots, offerWaiting, blocked, vernacular, onInspect }: {
  t: Buildable; p: Placement; slots: ReadonlyArray<{ programId: string | null }>;
  offerWaiting: boolean; blocked: ReadonlyArray<boolean>; vernacular: Vernacular; onInspect: () => void;
}) {
  const { size, centre } = labelLayout(t.name, t, p, vernacular);
  const y = centre.y - size * 0.6 - HALL_MARK_LIFT;
  const free = slots.filter((slot) => slot.programId === null).length;
  const flag = free > 0 && offerWaiting;
  const total = slots.length + (flag ? 1 : 0);
  const x0 = centre.x - ((total - 1) * HALL_PIP_GAP) / 2;
  const hues = slots.map((slot) => {
    const program = slot.programId ? programById(slot.programId) : undefined;
    return program ? schoolMark(program.school).hue : null;
  });
  return (
    <g className="campus-hall-marks" role="button" onClick={onInspect} aria-label={`${t.name}: ${slots.length - free} of ${slots.length} program slots filled${flag ? ', a program on offer' : ''}`}>
      <title>{`${slots.length - free} of ${slots.length} program slots filled${flag ? ' · room for a program on offer' : ''}${blocked.some(Boolean) ? ' · a program is waiting on a department' : ''}`}</title>
      <rect
        className="campus-hall-marks-plate"
        x={x0 - HALL_PIP_R - 4} y={y - HALL_PIP_R - 3}
        width={(total - 1) * HALL_PIP_GAP + HALL_PIP_R * 2 + 8} height={HALL_PIP_R * 2 + 6}
        rx={HALL_PIP_R + 3}
      />
      {hues.map((hue, i) => (
        <circle
          key={i}
          className={`campus-hall-pip${hue ? ' filled' : ''}${blocked[i] ? ' blocked' : ''}`}
          cx={x0 + i * HALL_PIP_GAP} cy={y} r={HALL_PIP_R}
          style={hue ? { fill: hue } : undefined}
        />
      ))}
      {flag && (
        <g className="campus-hall-flag" transform={`translate(${x0 + slots.length * HALL_PIP_GAP} ${y})`}>
          <circle r={HALL_PIP_R + 1} />
          <path d={`M ${-HALL_PIP_R * 0.55} 0 H ${HALL_PIP_R * 0.55} M 0 ${-HALL_PIP_R * 0.55} V ${HALL_PIP_R * 0.55}`} />
        </g>
      )}
    </g>
  );
}

// A lab at work (Plan 41): over a facility hosting a research project, a
// dark disc like the hall's pips, a ring filling in the school's color as
// the project runs, and an atom turning inside it. Nothing when idle.
const LAB_MARK_R = 12;
const LAB_MARK_RING = 2 * Math.PI * LAB_MARK_R;
// The atom's orbit, an ellipse as a path so the electron can run it.
const LAB_ORBIT = (() => {
  const rx = LAB_MARK_R * 0.62;
  const ry = LAB_MARK_R * 0.26;
  return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${-rx} 0 A ${rx} ${ry} 0 1 1 ${rx} 0 Z`;
})();

function LabMark({ t, p, run, vernacular, onInspect }: {
  t: Buildable; p: Placement; run: Initiative; vernacular: Vernacular; onInspect: () => void;
}) {
  const { size, centre } = labelLayout(t.name, t, p, vernacular);
  const y = centre.y - size * 0.6 - HALL_MARK_LIFT;
  const done = run.weeksTotal > 0 ? Math.max(0, Math.min(1, 1 - run.weeksRemaining / run.weeksTotal)) : 0;
  const hue = t.schoolGate ? schoolMark(t.schoolGate).hue : undefined;
  const topic = researchTopic(run.topicId)?.name ?? 'Research';
  const still = reducedMotion();
  return (
    <g className="campus-lab-mark" role="button" onClick={onInspect} transform={`translate(${centre.x.toFixed(2)} ${y.toFixed(2)})`}
      aria-label={`${t.name}: ${topic}, ${pct(done)} done`}>
      <title>{`${topic} · ${weeksShort(run.weeksRemaining)} left`}</title>
      <circle className="campus-lab-plate" r={LAB_MARK_R + 4.5} />
      <circle className="campus-lab-track" r={LAB_MARK_R} />
      <circle
        className="campus-lab-progress" r={LAB_MARK_R} transform="rotate(-90)"
        strokeDasharray={`${(LAB_MARK_RING * done).toFixed(2)} ${LAB_MARK_RING.toFixed(2)}`}
        style={hue ? { stroke: hue } : undefined}
      />
      <g transform="rotate(-30)">
        <path className="campus-lab-orbit" d={LAB_ORBIT} />
        <circle className="campus-lab-nucleus" r={2.8} style={hue ? { fill: hue } : undefined} />
        {/* The electron runs the orbit; with reduced motion it rests on it. */}
        {still ? (
          <circle className="campus-lab-electron" cx={LAB_MARK_R * 0.62} r={2} />
        ) : (
          <circle className="campus-lab-electron" r={2}>
            <animateMotion dur="2.6s" repeatCount="indefinite" path={LAB_ORBIT} />
          </circle>
        )}
      </g>
    </g>
  );
}

// Memoised, as the hall pips are: a turn redraws it for the camera and
// nothing else.
const LabMarksLayer = memo(function LabMarksLayer({ s, layout, onInspect, camera }: {
  s: GameState; layout: CampusLayout; onInspect: (id: string) => void;
  // A prop so the memo redraws on a camera change (the marks are projected).
  camera: Camera;
}) {
  void camera;
  return (
    <>
      {layout.placed.filter(({ t }) => s.research.initiatives[t.id]).map(({ t, p }) => (
        <LabMark key={`lab-${t.id}`} t={t} p={p} run={s.research.initiatives[t.id]} vernacular={layout.vernacular} onInspect={() => onInspect(t.id)} />
      ))}
    </>
  );
});

// A full residence (Plan 72G): the lab's dark disc with a bed on it, over
// a residence whose every bed is taken (residenceFill.ts), and nothing once
// one frees. Still, so reduced motion has nothing to stop.
const HOUSE_MARK_R = 11;

function FullMark({ t, p, vernacular, onInspect }: {
  t: Buildable; p: Placement; vernacular: Vernacular; onInspect: () => void;
}) {
  const { size, centre } = labelLayout(t.name, t, p, vernacular);
  const y = centre.y - size * 0.6 - HALL_MARK_LIFT;
  const r = HOUSE_MARK_R;
  return (
    <g className="campus-full-mark" role="button" onClick={onInspect} transform={`translate(${centre.x.toFixed(2)} ${y.toFixed(2)})`}
      aria-label={`${t.name}: full, every bed taken`}>
      <title>Full: every bed taken</title>
      <circle className="campus-lab-plate" r={r + 4.5} />
      <circle className="campus-full-ring" r={r} />
      {/* A bed: headboard, mattress, pillow, legs. */}
      <path className="campus-full-bed" d={`M ${-r * 0.6} ${-r * 0.4} V ${r * 0.42} M ${-r * 0.6} ${r * 0.1} H ${r * 0.62} V ${r * 0.42}`} />
      <rect className="campus-full-pillow" x={-r * 0.46} y={-r * 0.16} width={r * 0.34} height={r * 0.22} rx={r * 0.06} />
      <path className="campus-full-bed" d={`M ${-r * 0.08} ${-r * 0.06} H ${r * 0.62}`} />
    </g>
  );
}

const FullMarksLayer = memo(function FullMarksLayer({ s, layout, onInspect, camera }: {
  s: GameState; layout: CampusLayout; onInspect: (id: string) => void; camera: Camera;
}) {
  void camera;
  const full = useMemo(() => fullResidences(s), [s.tech, s.students, s.self.reputation]);
  return (
    <>
      {layout.placed.filter(({ t }) => full.has(t.id)).map(({ t, p }) => (
        <FullMark key={`full-${t.id}`} t={t} p={p} vernacular={layout.vernacular} onInspect={() => onInspect(t.id)} />
      ))}
    </>
  );
});

// The sorted scene at the camera the projection is at: every mass, tree and
// raised prop in paint order (see depthSort.ts), whole at every angle,
// including every frame of a turn (Plan 82). Open-ground facilities
// (quads, pitches, courts, pool decks) have no height, so their plates are
// drawn in their own pass under every mass (a single depth key can't
// express a large flat footprint; see groundMarkings.tsx): only what stands
// on them, from groundProps, joins the sort.
export function sceneEntries(layout: CampusLayout): SceneEntry[] {
  const { placed, trees, pathways } = layout;
  const entries: SceneEntry[] = [];
  for (const { t, p, developing } of placed) {
    if (motifOf(t) === 'grounds') {
      // Each prop enters the sort on the ground it covers. A site has no
      // props yet.
      const d = drawnFootprint(p);
      // A venue expanding in place keeps its props (Plan 54), and they
      // grow with its expansions.
      for (const prop of groundProps(t.facilityType, d.col, d.row, d.w, d.h, t.tier, developing && t.renovatingFrom === undefined, t.id, t.expansions ?? 0)) {
        entries.push({
          kind: 'prop', key: `g-${t.id}-${prop.key}`, node: prop.node, owner: t.id, shadows: prop.shadows,
          col: prop.col, row: prop.row, w: prop.w, h: prop.h,
        });
      }
    } else {
      entries.push({ kind: 'mass', key: `b-${t.id}`, id: t.id, col: p.col, row: p.row, w: p.w, h: p.h });
    }
  }
  // Lamps, benches and bike racks (dressing.tsx).
  for (const prop of dressingProps(layout)) entries.push({ kind: 'prop', ...prop });
  // A paved tree is hidden, not deleted, so lifting the path brings it
  // back (see state/types.ts's Trees block).
  for (const [key, seed] of Object.entries(trees)) {
    if (key in pathways) continue;
    const tile = parsePathTileKey(key);
    if (!tile) continue;
    entries.push({ kind: 'tree', key: `t-${key}`, seed, col: tile.col, row: tile.row, w: 1, h: 1 });
  }
  return depthOrder(entries);
}

// Everything that stands on the ground, as one memoised component: the
// static layer. Its props change only when the layout does (campusLayout.ts),
// the camera turns, or a building is inspected or finishes; a week in which
// nothing was built or paved skips it entirely, as does a hover. `onInspect`
// must be a stable callback for this to work.
//
// While the camera turns, every frame redraws the whole scene at the angle
// the turn has reached: trees, props and dressing too (Plan 82 undid 80H's
// light turn, which left them out and saved about a fifth of a frame).
type CampusSceneProps = {
  layout: CampusLayout;
  inspectedId: string | null;
  justFinished: readonly string[];
  onInspect: (id: string) => void;
  // A prop so this memo and the memoised motifs and trees redraw on a
  // camera change.
  camera: Camera;
  // The label layer's node; the parent writes opacity straight onto it on
  // every mouse move (see paintLabels).
  labelLayerRef: React.RefObject<SVGGElement | null>;
  // The land around the campus that stands in front of the parcel (Plan
  // 81B): over the campus, under its labels. A stable element.
  front: React.ReactNode;
};
const CampusScene = memo(function CampusScene(props: CampusSceneProps) {
  const { layout, camera } = props;
  // The sorted scene: every mass, tree and raised prop in paint order (see
  // depthSort.ts). It returns descriptors, not elements, so inspect/finish
  // changes never invalidate the sort.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scene = useMemo(() => sceneEntries(layout), [layout, camera]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ground = useMemo(groundGeometry, [camera]);
  return sceneArt(props, scene, ground);
});

// The scene's elements, given its sorted entries and the ground: what
// CampusScene renders, and what the canvas map paints (registered below).
function sceneArt(
  { layout, inspectedId, justFinished, onInspect, labelLayerRef, camera, front }: CampusSceneProps,
  scene: readonly SceneEntry[],
  ground: ReturnType<typeof groundGeometry>,
) {
  const { placed, byId, pathways, vernacular } = layout;

  // Open-ground facilities (quads, pitches, courts, pool decks) have no
  // height, so their plates are drawn in their own pass under every mass: a
  // single depth key can't express a large flat footprint (see
  // groundMarkings.tsx). Anything standing on them comes back from
  // groundProps and joins the sorted pass below.
  const groundPlaced = placed.filter(({ t }) => motifOf(t) === 'grounds');

  const building = ({ t, p, label, developing, glyphs, age, renovating, historic }: CampusLayout['placed'][number]) => (
    <PlacedBuilding
      t={t}
      p={p}
      label={label}
      onInspect={() => onInspect(t.id)}
      inspected={t.id === inspectedId}
      developing={developing}
      justFinished={justFinished.includes(t.id)}
      glyphs={glyphs}
      vernacular={vernacular}
      camera={camera}
      age={age}
      renovating={renovating}
      historic={historic}
    />
  );

  return (
    <>
      {/* Ground, pathways, flat plates, shadows, the sorted scene, then
          labels on top. Hall marks and the ghost are drawn outside. */}
      <polygon className="campus-ground" points={ground.plate} />
      <path className="campus-grid" d={ground.grid} />
      <polygon className="campus-road" points={ground.road} />
      <path className="campus-road-kerb" d={ground.kerb} />
      <path className="campus-road-centre" d={ground.centre} />

      <DesireLines layout={layout} camera={camera} />

      <PathwayLayer pathways={pathways} camera={camera} />

      {groundPlaced.map((e) => <g key={e.t.id}>{building(e)}</g>)}

      {/* Over the flat plates, like the paths: a shadow falls across a quad
          or a pitch as it does across the lawn, and the quad's own trees
          cast theirs here too. */}
      <CastShadows placed={placed} scene={scene} vernacular={vernacular} camera={camera} />

      {scene.map((entry) => {
        if (entry.kind === 'tree') return <Tree key={entry.key} row={entry.row} col={entry.col} seed={entry.seed} camera={camera} />;
        if (entry.kind === 'prop') {
          return <VenueContext.Provider key={entry.key} value={entry.owner ?? null}><g>{entry.node}</g></VenueContext.Provider>;
        }
        const e = byId.get(entry.id);
        return e ? <VenueContext.Provider key={entry.key} value={e.t.id}><g>{building(e)}</g></VenueContext.Provider> : null;
      })}

      {front}

      <LabelLayer placed={placed} inspectedId={inspectedId} vernacular={vernacular} labelLayerRef={labelLayerRef} />
    </>
  );
}

function LabelLayer({ placed, inspectedId, vernacular, labelLayerRef }: {
  placed: CampusLayout['placed']; inspectedId: string | null; vernacular: Vernacular;
  labelLayerRef: React.RefObject<SVGGElement | null>;
}) {
  return (
    <g ref={labelLayerRef}>
      {placed.filter(({ t }) => t.facilityType !== 'quad').map(({ t, p, label }) => (
        <BuildingLabel key={`label-${t.id}`} t={t} p={p} label={label} pinned={t.id === inspectedId} vernacular={vernacular} />
      ))}
    </g>
  );
}

// The canvas map (Plan 83C, the prototype of 83B made the map): the scene
// and the ring are painted on a canvas under the map's SVG (canvasPaint.ts,
// canvasArt.ts), and the labels, walkers, marks, the completion ring, the
// ghost and the dust stay SVG over it. `?map=svg` keeps the SVG scene, for
// comparison, until Plan 83E retires it; outside a browser (the tests, the
// review tools) the map renders its SVG.
export function canvasMapWanted(search: string): boolean {
  return new URLSearchParams(search).get('map') !== 'svg';
}
export const CANVAS_MAP = typeof window !== 'undefined' && canvasMapWanted(window.location.search);

// What the canvas map paints: the scaffold's pattern, the land behind the
// campus, and the scene (with the land in front of it) in the occasions'
// providers, as the SVG map mounts them.
export function mapSceneTree(a: Omit<CampusSceneProps, 'front'> & {
  name: string; developing: GameState['developing']; turning: boolean; snow: number;
  crowds: ReadonlySet<string>; banners: GameState['self']['colors'] | null; front: React.ReactNode;
}): React.ReactNode {
  return (
    <>
      <defs><ScaffoldPattern /></defs>
      <RingBack name={a.name} vernacular={a.layout.vernacular} camera={a.camera} turning={a.turning} snow={a.snow} />
      <CrowdContext.Provider value={a.crowds}>
      <BannerContext.Provider value={a.banners}>
      <ColorsContext.Provider value={a.layout.colors}>
      <CollegeNameContext.Provider value={a.name}>
      <DevelopingContext.Provider value={a.developing}>
      <SnowContext.Provider value={a.snow}>
        <CampusScene
          layout={a.layout}
          inspectedId={a.inspectedId}
          justFinished={a.justFinished}
          onInspect={a.onInspect}
          labelLayerRef={a.labelLayerRef}
          camera={a.camera}
          front={a.front}
        />
      </SnowContext.Provider>
      </DevelopingContext.Provider>
      </CollegeNameContext.Provider>
      </ColorsContext.Provider>
      </BannerContext.Provider>
      </CrowdContext.Provider>
    </>
  );
}

// How far the canvas's image reaches past each edge of the map, in CSS
// pixels: a share of the map's width and height, at least a floor. A pan
// moves the image, and repaints it only once the pan would show past this,
// or when it settles with less than half of it left on a side.
const SCENE_MARGIN_SHARE = 0.35;
const SCENE_MARGIN_MIN = 200;
function sceneMargin(size: { width: number; height: number }): { mx: number; my: number } {
  return {
    mx: Math.round(Math.max(SCENE_MARGIN_MIN, size.width * SCENE_MARGIN_SHARE)),
    my: Math.round(Math.max(SCENE_MARGIN_MIN, size.height * SCENE_MARGIN_SHARE)),
  };
}
// How long a pan or a zoom rests before the image is repainted at its view.
const SCENE_SETTLE_MS = 140;

// The labels alone, for the canvas map; a prop for the camera so the memo
// redraws on a turn, as CampusScene does.
const CanvasLabels = memo(function CanvasLabels({ camera, ...rest }: Parameters<typeof LabelLayer>[0] & { camera: Camera }) {
  void camera;
  return <LabelLayer {...rest} />;
});

// Desire lines: the lawn worn where the busiest routes cross it (see
// walkRoutes.ts), under the paving, so a path laid over one covers it and
// the next layout no longer routes across the grass there.
const DesireLines = memo(function DesireLines({ layout, camera }: { layout: CampusLayout; camera: Camera }) {
  // The routes are found once per layout; a turn only re-projects them.
  const runs = useMemo(() => desireRuns(layout), [layout]);
  // `camera` is read by the projection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return desireArt(useMemo(() => desirePath(runs), [runs, camera]));
});
function desireRuns(layout: CampusLayout) {
  const input = { placements: layout.placements, tech: layout.placed.map((e) => e.t), pathways: layout.pathways };
  return desireLines(input, walkGrid(input));
}
function desirePath(runs: ReturnType<typeof desireRuns>): string {
  return runs
    .map((run) => run.map((w, i) => {
      const p = project(w.col, w.row);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(''))
    .join('');
}
function desireArt(d: string) {
  return d ? <path className="campus-desire" d={d} aria-hidden="true" /> : null;
}

// The scene's art as the painter calls it: CampusScene, the desire lines
// and the shadows read their memoised values from the painter's scope
// (the rest of the art registers in canvasArt.ts).
registerMapArt();
registerArt(CampusScene, (p: CampusSceneProps, s: ArtScope) => sceneArt(
  p,
  s.keep('scene', [p.layout, p.camera], () => sceneEntries(p.layout)),
  s.keep('ground', [p.camera], groundGeometry),
), true);
registerArt(DesireLines, (p: { layout: CampusLayout; camera: Camera }, s: ArtScope) => {
  const runs = s.keep('runs', [p.layout], () => desireRuns(p.layout));
  return desireArt(s.keep('d', [runs, p.camera], () => desirePath(runs)));
}, true);
registerArt(CastShadows, (p: CastShadowsProps, s: ArtScope) => castShadowsArt(
  s.keep('d', [p.placed, p.scene, p.vernacular, p.camera], () => castShadowPaths(p.placed, p.scene, p.vernacular)),
));

// Hall pips: one per slot, in the color of the school whose program holds
// it, plus a flag when a slot is free and a program is on offer. Always on,
// unlike the labels, and redrawn every week, since a program can arrive or
// stall in any week. What each hall shows is read once a state (the offers
// and the departments are the costly part), and a turn only re-projects it
// (Plan 80H: every frame of a turn read every hall's offers again).
const HallMarksLayer = memo(function HallMarksLayer({ s, layout, onInspect, camera }: {
  s: GameState; layout: CampusLayout; onInspect: (id: string) => void;
  // A prop so the memo redraws on a camera change (the pips are projected).
  camera: Camera;
}) {
  void camera;
  const halls = useMemo(() => layout.placed.filter(({ t }) => isAcademicHall(t) && s.halls[t.id]).map(({ t, p }) => ({
    t, p,
    slots: s.halls[t.id],
    offerWaiting: s.programOffers.length > 0 || schoolOffers(s, t.id).length > 0,
    blocked: s.halls[t.id].map((slot) => !!slot.programId && programBlocked(s, slot.programId)),
  })), [s, layout]);
  return (
    <>
      {halls.map(({ t, p, slots, offerWaiting, blocked }) => (
        <HallMarks
          key={`marks-${t.id}`}
          t={t}
          p={p}
          slots={slots}
          offerWaiting={offerWaiting}
          blocked={blocked}
          vernacular={layout.vernacular}
          onInspect={() => onInspect(t.id)}
        />
      ))}
    </>
  );
});

export default function CampusMap({
  s, act, selectedId, onSelect, pathTool, onSetPathTool, backOutEnabled, controlsEnabled,
  onOpenCurriculum, onOpenResearch, inspectTarget, inspectProgram, onInspectTargetConsumed, onInspectedChange, gait,
}: {
  s: GameState;
  act: (a: Action) => void;
  // Which Buildable is picked up for siting; lifted to App.tsx so
  // BuildPopup.tsx can arm it too.
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  // The active path tool, or null in placement mode. Owned by App.tsx,
  // which keeps it and a picked-up building mutually exclusive.
  pathTool: CampusTool | null;
  // App.tsx's setPathTool: calling it with the active mode turns it off.
  // P and Escape reuse it.
  onSetPathTool: (mode: CampusTool) => void;
  // Escape only, gated separately because App.tsx's ladder arbitrates it
  // (see hotkeys.ts's mapBackOutLive).
  backOutEnabled: boolean;
  // Everything else the map binds: panning, R, P, camera keys.
  controlsEnabled: boolean;
  // Opens the Curriculum tab at a school, from a hall's info panel.
  onOpenCurriculum: (sectionKey: string) => void;
  // Opens the Research tab at a lab, from a lab's info panel (Plan 80B).
  onOpenResearch?: (target: string) => void;
  // A hall to open the panel on (from the Curriculum tab's "Found in
  // <hall>"). Consumed on arrival and cleared through the callback.
  inspectTarget?: string | null;
  // A program housed there whose tile opens with the panel, its move
  // showing (the next-step line's move, Plan 78D).
  inspectProgram?: string | null;
  onInspectTargetConsumed?: () => void;
  // Reports which building's panel is open (the opening walkthrough reads it).
  onInspectedChange?: (id: string | null) => void;
  // The clock's pace as a multiple of Play, 0 while it is stopped: how fast
  // the walkers walk.
  gait: number;
}) {
  const [rotated, setRotated] = useState(false);
  // The bench tool's facing once R has turned it (Plan 80I); until then a
  // bench faces the path beside the tile it would stand on.
  const [benchTurn, setBenchTurn] = useState<BenchFacing | null>(null);
  // The building whose info panel is open. Mutually exclusive with
  // `selectedId`/`pathTool`: selectBuilding and the pathTool effect clear
  // it, and inspectBuilding refuses while either is active.
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  // The program tile to open in that panel, while it is the hall asked for.
  const [focus, setFocus] = useState<{ hallId: string; programId: string } | null>(null);
  useEffect(() => {
    onInspectedChange?.(inspectedId);
    if (focus && inspectedId !== focus.hallId) setFocus(null);
  }, [inspectedId]);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  // React state, unlike pan and zoom, because a turn changes every polygon.
  // Set on the projection here at the top of the render so everything below
  // draws at it. Not persisted.
  const [camera, setCameraState] = useState<Camera>(DEFAULT_CAMERA);
  setCamera(camera);
  // A quarter turn is being animated (turnBy): every frame draws the whole
  // scene, the land around it and the walkers at the angle reached (Plan
  // 82); the walkers go unclipped and the ring's in-between views are not
  // cached until it settles.
  const [turning, setTurning] = useState(false);
  const layout = useCampusLayout(s);
  // This week's occasions (mapOccasions.ts), reference-stable between them.
  const crowdKey = useMemo(() => crowdedVenues(s).join(','), [s]);
  const crowds = useMemo(() => new Set(crowdKey ? crowdKey.split(',') : []), [crowdKey]);
  const commencement = isCommencement(s);
  const banners = useMemo(() => (commencement ? { ...s.self.colors } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commencement, s.self.colors.primary, s.self.colors.secondary]);
  // The map's tools fold into one button (Plan 70G, the owner's call: open,
  // the stack took too much of a phone's screen). Open, they stay open until
  // folded again, since zooming is done in runs.
  const [toolsOpen, setToolsOpen] = useState(false);
  // The camera is derived from these, so it only rests on a crisp view.
  const stanceRef = useRef({ view: 0, pitch: DEFAULT_PITCH_INDEX });
  // Buildings that finished within the last COMPLETION_PULSE_MS. Derived by
  // diffing the previous developing set, so nothing enters GameState.
  const [justFinished, setJustFinished] = useState<readonly string[]>([]);
  const wasDevelopingRef = useRef<Set<string>>(new Set());
  // Pending expiries are canceled on unmount only. A cleanup in the effect
  // would cancel them on every unrelated tick and the ring would never
  // leave.
  const pulseTimersRef = useRef<number[]>([]);
  useEffect(() => {
    const now = new Set(Object.keys(s.developing));
    const done = [...wasDevelopingRef.current].filter((id) => !now.has(id) && id in s.placements);
    wasDevelopingRef.current = now;
    if (done.length === 0) return;
    setJustFinished((cur) => [...cur, ...done]);
    pulseTimersRef.current.push(window.setTimeout(
      () => setJustFinished((cur) => cur.filter((id) => !done.includes(id))),
      COMPLETION_PULSE_MS,
    ));
  }, [s.developing, s.placements]);
  useEffect(() => () => {
    for (const timer of pulseTimersRef.current) window.clearTimeout(timer);
  }, []);

  // Ground broken (Plan 70H): a puff of dust at a footprint the week it is
  // placed. The first reading is where the run stands, not news.
  const [justPlaced, setJustPlaced] = useState<readonly string[]>([]);
  const wasPlacedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const now = new Set(Object.keys(s.placements));
    const was = wasPlacedRef.current;
    wasPlacedRef.current = now;
    if (!was || reducedMotion()) return;
    const fresh = [...now].filter((id) => !was.has(id));
    if (fresh.length === 0 || fresh.length > 3) return;
    setJustPlaced((cur) => [...cur, ...fresh]);
    pulseTimersRef.current.push(window.setTimeout(
      () => setJustPlaced((cur) => cur.filter((id) => !fresh.includes(id))),
      DUST_MS,
    ));
  }, [s.placements]);

  // Whether a placed building is on the screen now (Plan 70H: a toast
  // speaks for one finished out of sight). Read by Toasts.tsx through
  // mapProbe.ts, so the map need not know about toasts.
  useEffect(() => setMapProbe((id) => {
    const p = s.placements[id];
    const svg = svgRef.current;
    if (!p || !svg) return false;
    const rect = svg.getBoundingClientRect();
    const v = viewRef.current;
    const w = project(p.col + p.w / 2, p.row + p.h / 2);
    const x = w.x * v.zoom + v.x;
    const y = w.y * v.zoom + v.y;
    return rect.width > 0 && x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
  }), [s.placements]);
  useEffect(() => () => setMapProbe(null), []);

  // `selectedId` can change from outside (BuildPopup.tsx), so a fresh pickup
  // resets rotation here.
  useEffect(() => {
    setRotated(false);
  }, [selectedId]);
  // Changing path mode closes any open info panel.
  useEffect(() => {
    setInspectedId(null);
    setHover(null);
    setBenchTurn(null);
  }, [pathTool]);
  // The one place selection changes: resets rotation and closes the info
  // panel.
  function selectBuilding(id: string | null) {
    onSelect(id);
    setRotated(false);
    setInspectedId(null);
  }

  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  // The ghost layer: a second SVG whose world group carries the same
  // transform.
  const ghostSvgRef = useRef<SVGSVGElement>(null);
  const ghostWorldRef = useRef<SVGGElement>(null);
  // The land around the campus: a third <svg>, under the map's.
  const ringWorldRef = useRef<SVGGElement>(null);
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  // The canvas's size, kept by an observer so the pan's leash never has to
  // measure the scene mid-drag.
  const canvasSizeRef = useRef<{ width: number; height: number } | null>(null);
  // The label layer and the last cursor position in world coordinates.
  // Refs, because the label pass runs on every mouse move.
  const labelLayerRef = useRef<SVGGElement>(null);
  // The canvas map (`?map=canvas`): the canvas, its painter, the element
  // tree it paints, and a pending repaint for a pan or a zoom.
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const painterRef = useRef<{ painter: Painter; resolver: StyleResolver; opts: PaintOptions; season: unknown } | null>(null);
  const sceneTreeRef = useRef<React.ReactNode>(null);
  const sceneRootClassRef = useRef('');
  const scenePaintRef = useRef(0);
  // The view the canvas's image was painted at, the repaint a pan or zoom
  // waits to settle for, and what the image has that can be pointed at.
  const drawnViewRef = useRef<{ view: View; width: number; height: number; mx: number; my: number } | null>(null);
  const sceneSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitsRef = useRef(new HitList());
  // The building under the cursor (canvas map), for its tooltip and cursor.
  const overBuildingRef = useRef<string | null>(null);
  const mapTitleRef = useRef<HTMLTitleElement>(null);
  // Where the map's <svg> sits in the window, measured at mount and on a
  // resize.
  const svgOriginRef = useRef<{ left: number; top: number } | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  // The pointer in canvas pixels, for the refused ghost's reason (re-read on
  // the re-render a new hover tile causes).
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // A mousedown that moves past the threshold is a drag-to-pan. `button` is
  // recorded because only a left-button pan sets justPannedRef: a left
  // mouseup is followed by a `click`, a middle one by `auxclick`, so a
  // middle pan setting the flag would swallow the next real click.
  const dragRef = useRef<{ button: number; startX: number; startY: number; startView: { x: number; y: number }; moved: boolean } | null>(null);
  // Set when a drag is recognized as a pan, so the click fired after mouseup
  // doesn't also place a building. Consumed by the next click or mousedown.
  const justPannedRef = useRef(false);
  const pathDragRef = useRef<CampusTool | null>(null);
  // The last tile a stroke painted. Mousemove can skip tiles on a fast
  // drag, so paintStroke draws the line from here.
  const pathLastRef = useRef<TileCoord | null>(null);
  // Where the current stroke began and the tiles it has laid, for the
  // Shift-held straight run.
  const strokeRef = useRef<{ anchor: TileCoord; laid: Set<string> } | null>(null);
  // Touch (Plan 70F), read from pointer events of type 'touch' only, so the
  // mouse keeps exactly the handlers above. One finger pans, moves the
  // ghost while a building is picked up, or paints with a path tool; two
  // pinch and pan. The fingers down, in canvas pixels, and the gesture.
  const touchesRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<
    | { mode: 'pan' | 'ghost' | 'paint' | 'tap-tool'; start: Point; startView: View; moved: boolean }
    | { mode: 'pinch'; startView: View; startMid: Point; startDist: number }
    | null
  >(null);
  // When a touch last touched the map. A tap is followed by the browser's
  // emulated mouse events; for a moment after a touch those are ignored, and
  // a click does not place (the touch bar's Place does).
  const lastTouchRef = useRef(0);
  const recentTouch = () => performance.now() - lastTouchRef.current < TOUCH_MOUSE_GRACE_MS;
  // Once the map has been touched, the touch bar and camera buttons show.
  const [touchUi, setTouchUi] = useState(false);

  // Light each label by the cursor's distance to the building's footprint
  // (not the label), converted to screen pixels via the zoom.
  function paintLabels(cursor: { x: number; y: number } | null) {
    const layer = labelLayerRef.current;
    if (!layer) return;
    const zoom = viewRef.current.zoom;
    const at = cursor ? unproject(cursor.x, cursor.y) : null;
    for (const node of Array.from(layer.children)) {
      const el = node as SVGGElement;
      if (el.dataset.pinned === '1') { el.style.opacity = '1'; continue; }
      if (!at) { el.style.opacity = '0'; continue; }
      const c0 = Number(el.dataset.col); const r0 = Number(el.dataset.row);
      const c1 = c0 + Number(el.dataset.w); const r1 = r0 + Number(el.dataset.h);
      // Nearest point on the footprint in grid units; zero when over it.
      const dc = at.col < c0 ? c0 - at.col : at.col > c1 ? at.col - c1 : 0;
      const dr = at.row < r0 ? r0 - at.row : at.row > r1 ? at.row - r1 : 0;
      const d = project(dc, dr);   // the projection is linear, so a difference projects to a difference
      const px = Math.hypot(d.x, d.y) * zoom;
      const t = (px - LABEL_FULL_PX) / (LABEL_FADE_PX - LABEL_FULL_PX);
      el.style.opacity = String(Math.max(0, Math.min(1, 1 - t)));
    }
  }

  // Arriving from the tab with a hall to look at: open its panel and pan the
  // building to the canvas center (the panel sits top-left).
  useEffect(() => {
    if (!inspectTarget) return;
    const p = s.placements[inspectTarget];
    const svg = svgRef.current;
    if (p && svg) {
      const zoom = viewRef.current.zoom;
      const rect = svg.getBoundingClientRect();
      const c = project(p.col + p.w / 2, p.row + p.h / 2);
      applyView({ x: rect.width / 2 - c.x * zoom, y: rect.height / 2 - c.y * zoom, zoom });
      setInspectedId(inspectTarget);
      setFocus(inspectProgram ? { hallId: inspectTarget, programId: inspectProgram } : null);
    }
    onInspectTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectTarget]);

  // Re-light after every render: fresh label nodes carry no opacity.
  useEffect(paintLabelsFromCursor);
  function paintLabelsFromCursor() { paintLabels(cursorRef.current); }

  // The widest zoom the land around the campus allows at this camera
  // (Plan 81B): the canvas never shows past the ring's outer edge.
  function zoomFloor(): number {
    const size = canvasSizeRef.current;
    return size ? Math.max(MIN_ZOOM, ringZoomFloor(size.width, size.height)) : MIN_ZOOM;
  }

  function applyView(next: { x: number; y: number; zoom: number }) {
    let v = { x: next.x, y: next.y, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom)) };
    // Kept over the land around the campus (Plan 81B). Not mid-turn: a turn
    // holds the ground under the center, and the view it settles on is
    // kept in once it has.
    const size = canvasSizeRef.current;
    if (size && !turnRef.current) {
      const floor = zoomFloor();
      if (v.zoom < floor) {
        // In about the canvas's center, so the ground there stays put.
        const cx = size.width / 2;
        const cy = size.height / 2;
        v = { x: cx - ((cx - v.x) / v.zoom) * floor, y: cy - ((cy - v.y) / v.zoom) * floor, zoom: floor };
      }
      v = clampView(v, size.width, size.height);
    }
    viewRef.current = v;
    const transform = `translate(${v.x} ${v.y}) scale(${v.zoom})`;
    worldRef.current?.setAttribute('transform', transform);
    ghostWorldRef.current?.setAttribute('transform', transform);
    ringWorldRef.current?.setAttribute('transform', transform);
    paintLabels(cursorRef.current);
    if (CANVAS_MAP) placeScene();
  }

  // The canvas map's image follows a pan or a zoom as a whole (a CSS
  // transform, which the compositor applies without a repaint): moved by
  // the pan, scaled by the zoom, from the view it was painted at. It is
  // repainted when a pan would show past its margin, and at the view a pan
  // or a zoom settles on.
  function placeScene() {
    const canvas = sceneCanvasRef.current;
    const drawn = drawnViewRef.current;
    const size = canvasSizeRef.current;
    if (!canvas || !size) return;
    if (!drawn) { requestScenePaint(); return; }
    const v = viewRef.current;
    const k = v.zoom / drawn.view.zoom;
    const { mx, my } = drawn;
    // Where the image's corner, painted at (-mx, -my), lands now: on a
    // device pixel while it is not scaled, so a pan keeps it sharp. (Its
    // size is the one it was painted at: reading the element's would lay
    // out the page mid-turn.)
    const dpr = window.devicePixelRatio || 1;
    let x = (-mx - drawn.view.x) * k + v.x;
    let y = (-my - drawn.view.y) * k + v.y;
    if (k === 1) { x = Math.round(x * dpr) / dpr; y = Math.round(y * dpr) / dpr; }
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
    const w = drawn.width * k;
    const h = drawn.height * k;
    const want = sceneMargin(size);
    const sized = drawn.width === Math.round(size.width + 2 * want.mx) && drawn.height === Math.round(size.height + 2 * want.my);
    // What is left of the margin on each side.
    const left = -x; const top = -y; const right = x + w - size.width; const bottom = y + h - size.height;
    const covered = Math.min(left, top, right, bottom) >= -0.5;
    if (!sized || (k === 1 && !covered)) requestScenePaint();
    if (sceneSettleRef.current) clearTimeout(sceneSettleRef.current);
    sceneSettleRef.current = k !== 1 || Math.min(left / mx, right / mx, top / my, bottom / my) < 0.5
      ? setTimeout(requestScenePaint, SCENE_SETTLE_MS) : null;
  }
  function requestScenePaint() {
    if (scenePaintRef.current) return;
    scenePaintRef.current = requestAnimationFrame(() => {
      scenePaintRef.current = 0;
      paintScene();
    });
  }

  // Paints the scene on the canvas map at the current view, at device
  // pixels, over the map and a margin past each edge. Serves any repaint a
  // pan or a zoom was waiting for.
  function paintScene() {
    if (scenePaintRef.current) {
      cancelAnimationFrame(scenePaintRef.current);
      scenePaintRef.current = 0;
    }
    if (sceneSettleRef.current) {
      clearTimeout(sceneSettleRef.current);
      sceneSettleRef.current = null;
    }
    const canvas = sceneCanvasRef.current;
    const size = canvasSizeRef.current;
    const tree = sceneTreeRef.current;
    if (!canvas || !size || !tree) return;
    const { mx, my } = sceneMargin(size);
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.round(size.width + 2 * mx);
    const cssH = Math.round(size.height + 2 * my);
    const width = Math.round(cssW * dpr);
    const height = Math.round(cssH * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    if (drawnViewRef.current?.width !== cssW || drawnViewRef.current?.height !== cssH) {
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const v = viewRef.current;
    let pr = painterRef.current;
    if (!pr) {
      const resolver = new StyleResolver(canvas.parentElement ?? document.body);
      const opts: PaintOptions = {
        rules: resolver, skipRef: labelLayerRef, skipClass: 'campus-building-complete', dpr, zoom: v.zoom, hits: hitsRef.current,
      };
      pr = { painter: new Painter(ctx, opts), resolver, opts, season: null };
      painterRef.current = pr;
    }
    // The season's tokens: every class color is read again.
    if (pr.season !== season) {
      pr.resolver.reset();
      pr.season = season;
    }
    pr.resolver.setRootClass(sceneRootClassRef.current);
    pr.opts.dpr = dpr;
    pr.opts.zoom = v.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.setTransform(dpr * v.zoom, 0, 0, dpr * v.zoom, dpr * (v.x + mx), dpr * (v.y + my));
    const t0 = performance.now();
    const stats = pr.painter.paint(tree);
    drawnViewRef.current = { view: { ...v }, width: cssW, height: cssH, mx, my };
    canvas.style.transform = `translate(${-mx}px, ${-my}px)`;
    // For the review tools: the last paint's cost and what it could not draw.
    (window as unknown as { __canvasPaint?: unknown }).__canvasPaint = {
      ms: performance.now() - t0, elements: stats.elements, drawn: stats.drawn,
      unsupported: Object.fromEntries(stats.unsupported),
    };
  }

  // The building under a pointer on the canvas map, as the SVG's hit test
  // found it: the topmost painted shape that takes pointer events, and the
  // building it belongs to (null for none, or on the SVG map).
  function buildingAt(e: { clientX: number; clientY: number }): string | null {
    if (!CANVAS_MAP) return null;
    const w = worldFromEvent(e);
    return w ? hitsRef.current.at(w.x, w.y) ?? null : null;
  }
  // The cursor over a building: the pointer, and its name as a tooltip, as
  // the SVG building's own <title> gave it.
  function hoverBuilding(id: string | null) {
    if (overBuildingRef.current === id) return;
    overBuildingRef.current = id;
    const svg = svgRef.current;
    svg?.classList.toggle('over-building', id !== null);
    // For the review tools, as the SVG's buildings carry data-building.
    if (svg) svg.dataset.overBuilding = id ?? '';
    const title = mapTitleRef.current;
    if (!title) return;
    const e = id ? layout.byId.get(id) : undefined;
    title.textContent = e && e.t.facilityType !== 'quad' && !e.developing ? `${e.label} · ${e.p.w}×${e.p.h}` : '';
  }

  // Move the camera, keeping the ground at the canvas center fixed on screen
  // (same "point stays put" formula as the wheel zoom). The projection is
  // updated synchronously so hit-tests before the re-render see the new
  // camera.
  function applyCamera(next: Camera) {
    const rect = svgRef.current?.getBoundingClientRect();
    const px = rect ? rect.width / 2 : 0;
    const py = rect ? rect.height / 2 : 0;
    const v = viewRef.current;
    const g = unproject((px - v.x) / v.zoom, (py - v.y) / v.zoom);
    const applied = setCamera(next);
    const w = project(g.col, g.row);
    applyView({ x: px - w.x * v.zoom, y: py - w.y * v.zoom, zoom: v.zoom });
    setCameraState(applied);
  }
  // The quarter turn (Plan 37, from v2's): eased over TURN_MS about the
  // ground at the canvas center, which stays put. The azimuth runs
  // unwrapped through the turn (setCamera wraps it); a second press mid-turn
  // retargets from where the view has got to (`at`), not from the last
  // target, which is v2's jump. Reduced motion keeps the snap.
  const turnRef = useRef<{ at: number; to: number; raf: number; anchor: { col: number; row: number; rect?: DOMRect } } | null>(null);
  const anchorRef = useRef<{ col: number; row: number; rect?: DOMRect } | null>(null);
  function groundUnderCentre() {
    const rect = svgRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    return unproject(((rect ? rect.width / 2 : 0) - v.x) / v.zoom, ((rect ? rect.height / 2 : 0) - v.y) / v.zoom);
  }
  // After each committed frame of a turn, pan so the anchor is back under
  // the center. After the commit, not in the frame callback: that put the
  // transform a frame ahead of the geometry and the scene shook.
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    // Measured once when the turn starts: reading it here, every frame,
    // forced the browser to lay the whole redrawn scene out twice a frame.
    const rect = a.rect ?? svgRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    const w = project(a.col, a.row);
    applyView({ x: (rect ? rect.width / 2 : 0) - w.x * v.zoom, y: (rect ? rect.height / 2 : 0) - w.y * v.zoom, zoom: v.zoom });
    if (!turnRef.current) anchorRef.current = null;
  }, [camera]);
  function cancelTurn() {
    const live = turnRef.current;
    if (!live) return;
    cancelAnimationFrame(live.raf);
    turnRef.current = null;
    anchorRef.current = null;
    setTurning(false);
  }
  function turnBy(steps: number) {
    const st = stanceRef.current;
    st.view = ((st.view + steps) % VIEWS.length + VIEWS.length) % VIEWS.length;
    const pitch = PITCHES[st.pitch];
    if (reducedMotion()) {
      cancelTurn();
      applyCamera({ azimuth: VIEWS[st.view], pitch });
      return;
    }
    const live = turnRef.current;
    if (live) cancelAnimationFrame(live.raf);
    const from = live ? live.at : camera.azimuth;
    const to = (live ? live.to : from) + steps * (Math.PI / 2);
    const anchor = live?.anchor ?? { ...groundUnderCentre(), rect: svgRef.current?.getBoundingClientRect() };
    const start = performance.now();
    const turn = { at: from, to, raf: 0, anchor };
    turnRef.current = turn;
    setTurning(true);
    const frame = (now: number) => {
      const t = (now - start) / TURN_MS;
      turn.at = t >= 1 ? VIEWS[st.view] : turnStep(from, to, t);
      anchorRef.current = anchor;
      if (t >= 1) {
        turnRef.current = null;
        // The last frame rests on the view: the walkers' outlines and the
        // ring's cache are this view's again.
        setTurning(false);
      } else {
        turn.raf = requestAnimationFrame(frame);
      }
      setCameraState(setCamera({ azimuth: turn.at, pitch }));
    };
    turn.raf = requestAnimationFrame(frame);
  }
  function tiltBy(steps: number) {
    const st = stanceRef.current;
    const next = Math.min(PITCHES.length - 1, Math.max(0, st.pitch + steps));
    if (next === st.pitch) return;
    cancelTurn();
    st.pitch = next;
    applyCamera({ azimuth: VIEWS[st.view], pitch: PITCHES[st.pitch] });
  }
  function resetCamera() {
    cancelTurn();
    stanceRef.current = { view: 0, pitch: DEFAULT_PITCH_INDEX };
    applyCamera(DEFAULT_CAMERA);
  }

  // The starting view: centered at DEFAULT_ZOOM, but never so far out that
  // the grid stops overflowing the canvas vertically (MIN_COVERAGE). Only
  // bites on an unusually tall, narrow canvas.
  function defaultView(rect: { width: number; height: number }) {
    const MIN_COVERAGE = 1.15;
    const zoom = Math.max(DEFAULT_ZOOM, (rect.height * MIN_COVERAGE) / MAP_HEIGHT);
    // Center on the world's real midpoint (the diamond starts at negative x).
    const midX = (WORLD.minX + WORLD.maxX) / 2;
    const midY = (WORLD.minY + WORLD.maxY) / 2;
    return { x: rect.width / 2 - midX * zoom, y: rect.height / 2 - midY * zoom, zoom };
  }

  // Center the grid on first paint only; resizing leaves the player's
  // pan/zoom alone.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    canvasSizeRef.current = { width: rect.width, height: rect.height };
    svgOriginRef.current = { left: rect.left, top: rect.top };
    applyView(defaultView(rect));
    // A resize keeps the view, but keeps it over the land.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      canvasSizeRef.current = { width: entry.contentRect.width, height: entry.contentRect.height };
      const r = svg.getBoundingClientRect();
      svgOriginRef.current = { left: r.left, top: r.top };
      applyView(viewRef.current);
    });
    observer.observe(svg);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global listeners so a drag that outruns the map's edge still tracks.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD) {
        d.moved = true;
        svgRef.current?.classList.add('panning');
      }
      if (d.moved) applyView({ x: d.startView.x + dx, y: d.startView.y + dy, zoom: viewRef.current.zoom });
    }
    function onUp() {
      const d = dragRef.current;
      dragRef.current = null;
      if (d?.moved) {
        if (d.button === 0) justPannedRef.current = true;
        svgRef.current?.classList.remove('panning');
      }
      pathDragRef.current = null;
      pathLastRef.current = null;
      strokeRef.current = null;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Keyboard panning. Held keys drive an animation-frame loop scaled by real
  // elapsed time, so the camera glides at the same speed at any frame rate.
  // Diagonals are normalized. Writes through applyView, like the mouse drag.
  useEffect(() => {
    if (!controlsEnabled) return;
    const held = new Set<string>();
    let frame: number | null = null;
    let prevTs = 0;

    function step(ts: number) {
      if (held.size === 0) { frame = null; return; }
      // The first frame of a stretch only establishes the baseline.
      const dt = prevTs === 0 ? 0 : Math.min(MAX_PAN_FRAME_S, (ts - prevTs) / 1000);
      prevTs = ts;
      let dx = 0;
      let dy = 0;
      for (const key of held) {
        const [kx, ky] = PAN_KEYS[key];
        dx += kx;
        dy += ky;
      }
      // Opposite keys cancel to zero, which must not be normalized.
      const len = Math.hypot(dx, dy);
      if (len > 0 && dt > 0) {
        const view = viewRef.current;
        applyView({
          x: view.x + (dx / len) * KEY_PAN_SPEED * dt,
          y: view.y + (dy / len) * KEY_PAN_SPEED * dt,
          zoom: view.zoom,
        });
      }
      frame = requestAnimationFrame(step);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (!(key in PAN_KEYS)) return;
      // The arrows would otherwise scroll the page under the map.
      e.preventDefault();
      if (held.has(key)) return;   // OS key-repeat, not a second press
      held.add(key);
      if (frame === null) { prevTs = 0; frame = requestAnimationFrame(step); }
    }
    function onKeyUp(e: KeyboardEvent) {
      held.delete(e.key.toLowerCase());
    }
    // A key held while the window loses focus never delivers its keyup.
    function onBlur() {
      held.clear();
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (frame !== null) cancelAnimationFrame(frame);
    };
    // applyView reads and writes refs only, so the closure is never stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlsEnabled]);

  // The ground tile under a pointer event, or null off-grid: screen -> world
  // -> tile. Resolves to the ground on purpose (right for "where would this
  // go"); inspecting uses the building's own click target instead.
  function worldFromEvent(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    // The canvas map reads the map's corner as last measured (it is fixed
    // to the window): measuring it on every move laid out the page after
    // each change of the hover cursor.
    const rect = CANVAS_MAP && svgOriginRef.current ? svgOriginRef.current : svg.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (e.clientX - rect.left - v.x) / v.zoom, y: (e.clientY - rect.top - v.y) / v.zoom };
  }
  function tileFromEvent(e: { clientX: number; clientY: number }): TileCoord | null {
    const w = worldFromEvent(e);
    return w ? tileAt(w.x, w.y) : null;
  }

  // Hover drives the ghost: the picked-up footprint, or the single tile a
  // path tool would paint. While a stroke is held down it also paints.
  function onMapMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (recentTouch()) return;
    if (touchUi) setTouchUi(false);
    // Labels track the cursor in every mode, including mid-pan.
    cursorRef.current = worldFromEvent(e);
    paintLabels(cursorRef.current);
    const rect = CANVAS_MAP && svgOriginRef.current ? svgOriginRef.current : svgRef.current?.getBoundingClientRect();
    if (rect) pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (dragRef.current?.moved) return;   // panning: don't jitter the ghost across the tiles a drag crosses
    if (CANVAS_MAP) hoverBuilding(buildingAt(e));
    if (selected || pathTool) {
      const tile = tileFromEvent(e);
      setHover((cur) => (cur && tile && cur.row === tile.row && cur.col === tile.col ? cur : tile));
    }
    if (pathDragRef.current) paintStroke(e, pathDragRef.current);
  }

  // A freehand stroke paints every tile between the last one painted and
  // the one under the pointer, so a fast drag leaves no gaps. With Shift held
  // the draw tool lays a straight run from where the stroke began instead,
  // diagonals included (drawn as one band, see pathways.tsx), and moving the
  // pointer moves the run: tiles this stroke laid off the new line are lifted.
  function paintStroke(e: { clientX: number; clientY: number; shiftKey: boolean }, tool: CampusTool) {
    const here = tileFromEvent(e);
    if (!here) return;
    const stroke = strokeRef.current;
    if (e.shiftKey && tool === 'draw' && stroke) {
      const line = tilesBetween(stroke.anchor, here);
      const onLine = new Set(line.map(pathTileKey));
      const add = line.filter((t) => !(pathTileKey(t) in s.pathways));
      const remove = [...stroke.laid].filter((key) => !onLine.has(key)).map((key) => parsePathTileKey(key)!);
      for (const key of remove.map(pathTileKey)) stroke.laid.delete(key);
      for (const t of add) stroke.laid.add(pathTileKey(t));
      if (add.length > 0 || remove.length > 0) act({ type: 'PAINT_PATH_TILES', add, remove });
      pathLastRef.current = here;
      return;
    }
    const from = pathLastRef.current;
    pathLastRef.current = here;
    const run = from ? tilesBetween(from, here).slice(1) : [here];
    for (const tile of run) {
      if (tool === 'draw' && stroke && !(pathTileKey(tile) in s.pathways)) stroke.laid.add(pathTileKey(tile));
      paintTile(tile, tool);
    }
  }

  function leaveMap() {
    if (CANVAS_MAP) hoverBuilding(null);
    setHover(null);
    cursorRef.current = null;
    paintLabels(null);
  }

  function onMapClick(e: React.MouseEvent<SVGSVGElement>) {
    // On the canvas map a click on a building opens it here, before the
    // ground's click, as the SVG building's own handler did as the click
    // bubbled through it.
    if (CANVAS_MAP && e.target === e.currentTarget) {
      const id = buildingAt(e);
      if (id) onInspect(id);
    }
    const tile = tileFromEvent(e);
    if (!tile) return;
    onGroundClick(tile.row, tile.col);
  }

  function onMapMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (recentTouch()) return;
    // The middle button always pans, in every mode, checked first: under a
    // path tool the left button is busy painting. preventDefault suppresses
    // the browser's autoscroll widget.
    if (e.button === 1) {
      e.preventDefault();
      startPanDrag(e);
      return;
    }
    // A path tool owns the gesture and never arms the pan. Left paints with
    // the armed tool, right with its opposite (so left draws, right erases).
    // Lamps and benches: one a click, the right button lifts.
    if ((pathTool === 'lamp' || pathTool === 'bench') && (e.button === 0 || e.button === 2)) {
      const tile = tileFromEvent(e);
      if (tile) act(e.button === 0 ? placeDressing(tile, pathTool) : { type: 'REMOVE_DRESSING', tile });
      return;
    }
    if (pathTool && (e.button === 0 || e.button === 2)) {
      const tool = e.button === 0 ? pathTool : otherPathTool(pathTool);
      const tile = tileFromEvent(e);
      if (tile) {
        pathDragRef.current = tool;
        pathLastRef.current = null;   // a new stroke never interpolates from where the last one ended
        strokeRef.current = { anchor: tile, laid: new Set() };
        paintStroke(e, tool);
        return;
      }
    }
    if (e.button !== 0) return;
    justPannedRef.current = false;
    startPanDrag(e);
  }

  // ---- Touch (Plan 70F) ----
  function canvasPoint(e: { clientX: number; clientY: number }): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }
  function endStroke() {
    pathDragRef.current = null;
    pathLastRef.current = null;
    strokeRef.current = null;
  }
  function onMapPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.pointerType !== 'touch') return;
    lastTouchRef.current = performance.now();
    if (!touchUi) setTouchUi(true);
    svgRef.current?.setPointerCapture?.(e.pointerId);
    const touches = touchesRef.current;
    touches.set(e.pointerId, canvasPoint(e));
    if (touches.size === 2) {
      // A second finger turns whatever the first was doing into a pinch.
      endStroke();
      const [a, b] = [...touches.values()];
      gestureRef.current = { mode: 'pinch', startView: { ...viewRef.current }, startMid: midpoint(a, b), startDist: distance(a, b) };
      svgRef.current?.classList.add('panning');
      return;
    }
    if (touches.size > 2) return;
    const tile = tileFromEvent(e);
    const strokeTool = pathTool !== null && pathTool !== 'lamp' && pathTool !== 'bench';
    const mode = strokeTool ? 'paint' : pathTool ? 'tap-tool' : selected ? 'ghost' : 'pan';
    gestureRef.current = { mode, start: canvasPoint(e), startView: { ...viewRef.current }, moved: false };
    if (mode === 'paint' && tile && pathTool) {
      pathDragRef.current = pathTool;
      pathLastRef.current = null;
      strokeRef.current = { anchor: tile, laid: new Set() };
      paintStroke({ clientX: e.clientX, clientY: e.clientY, shiftKey: false }, pathTool);
    }
    if (mode === 'ghost' && tile) setHover(tile);
    // A building's name shows for the finger, as it does for the cursor.
    cursorRef.current = worldFromEvent(e);
    paintLabels(cursorRef.current);
  }
  function onMapPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (e.pointerType !== 'touch') return;
    const touches = touchesRef.current;
    if (!touches.has(e.pointerId)) return;
    lastTouchRef.current = performance.now();
    const p = canvasPoint(e);
    touches.set(e.pointerId, p);
    const g = gestureRef.current;
    if (!g) return;
    if (g.mode === 'pinch') {
      if (touches.size < 2) return;
      const [a, b] = [...touches.values()];
      applyView(pinchView(g.startView, g.startMid, g.startDist, midpoint(a, b), distance(a, b), zoomFloor(), MAX_ZOOM));
      return;
    }
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) > TOUCH_SLOP) {
      g.moved = true;
      if (g.mode === 'pan') svgRef.current?.classList.add('panning');
    }
    if (g.mode === 'pan' && g.moved) applyView({ x: g.startView.x + dx, y: g.startView.y + dy, zoom: viewRef.current.zoom });
    if (g.mode === 'ghost') {
      const tile = tileFromEvent(e);
      if (tile) setHover((cur) => (cur && cur.row === tile.row && cur.col === tile.col ? cur : tile));
    }
    if (g.mode === 'paint' && pathDragRef.current) paintStroke({ clientX: e.clientX, clientY: e.clientY, shiftKey: false }, pathDragRef.current);
    cursorRef.current = worldFromEvent(e);
    paintLabels(cursorRef.current);
  }
  function onMapPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (e.pointerType !== 'touch') return;
    lastTouchRef.current = performance.now();
    const touches = touchesRef.current;
    if (!touches.delete(e.pointerId)) return;
    const g = gestureRef.current;
    if (g?.mode === 'pinch') {
      // One finger left: it carries on as a pan from here.
      const rest = [...touches.values()][0];
      gestureRef.current = rest ? { mode: 'pan', start: rest, startView: { ...viewRef.current }, moved: true } : null;
      if (!rest) svgRef.current?.classList.remove('panning');
      return;
    }
    if (touches.size > 0) return;
    // A tap with the lamp or bench tool, which act on a tap, not a stroke.
    if (g?.mode === 'tap-tool' && !g.moved && e.type === 'pointerup') {
      const tile = tileFromEvent(e);
      if (tile && (pathTool === 'lamp' || pathTool === 'bench')) act(placeDressing(tile, pathTool));
    }
    endStroke();
    gestureRef.current = null;
    svgRef.current?.classList.remove('panning');
  }

  function startPanDrag(e: React.MouseEvent<SVGSVGElement>) {
    dragRef.current = {
      button: e.button,
      startX: e.clientX,
      startY: e.clientY,
      startView: { x: viewRef.current.x, y: viewRef.current.y },
      moved: false,
    };
  }

  // While a path tool is armed the right button is its secondary stroke, so
  // suppress the context menu. An idle map's right-click is left alone.
  function onMapContextMenu(e: React.MouseEvent<SVGSVGElement>) {
    if (!pathTool) return;
    e.preventDefault();
  }

  // Zoom toward the cursor: the world point under it stays under it.
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const cur = viewRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(zoomFloor(), cur.zoom * Math.exp(-e.deltaY * ZOOM_SPEED)));
    if (nextZoom === cur.zoom) return;
    const worldX = (px - cur.x) / cur.zoom;
    const worldY = (py - cur.y) / cur.zoom;
    applyView({ x: px - worldX * nextZoom, y: py - worldY * nextZoom, zoom: nextZoom });
  }

  function zoomBy(factor: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const cur = viewRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(zoomFloor(), cur.zoom * factor));
    const worldX = (cx - cur.x) / cur.zoom;
    const worldY = (cy - cur.y) / cur.zoom;
    applyView({ x: cx - worldX * nextZoom, y: cy - worldY * nextZoom, zoom: nextZoom });
  }

  // Every placeable Buildable that has cleared its gate and isn't sited yet
  // (what BuildPopup.tsx lists). Includes 'done' items awaiting a site
  // (awaitsSite); placeById branches the gate/cost on which one it is.
  const pickable = s.tech.filter((t) => isPlaceableKind(t) && !(t.id in s.placements) && (t.status === 'available' || t.status === 'done'));
  // A pickable entry can vanish between renders, so re-check the stored id.
  const selected = pickable.find((t) => t.id === selectedId) ?? null;

  const selectedFootprint = selected ? orientedFootprint(selected, rotated) : null;

  // A 'done' item awaiting a site always sites at its base footprint (the
  // reducer ignores `rotated` for it), so rotation isn't offered.
  const canRotateSelected = !!selected && selected.status !== 'done' && canRotate(footprintOf(selected));

  // The map's keys, minus panning. R rotates the picked-up building. P arms
  // the draw tool or puts it away (setPathTool toggles, so P with erase armed
  // swaps to draw). Live under the build menu, where these tools are reached.
  useHotkeys((e) => {
    const key = e.key.toLowerCase();
    if (key === 'r' && canRotateSelected) setRotated((r) => !r);
    // R with the bench tool turns the bench about to be set, a quarter at a time.
    if (key === 'r' && pathTool === 'bench') setBenchTurn(turnFacing(benchFacingAt(hover)));
    if (key === 'p') onSetPathTool('draw');
    if (key === 'q') turnBy(1);
    if (key === 'e') turnBy(-1);
    if (key === 'z') tiltBy(-1);
    if (key === 'x') tiltBy(1);
    if (key === 'home') resetCamera();
  }, controlsEnabled);

  // Escape backs out one layer at a time (path tool, pickup, info panel), on
  // its own gate because App.tsx's ladder hands off to it.
  useHotkeys((e) => {
    if (e.key === 'Escape') {
      if (pathTool) onSetPathTool(pathTool);
      else if (selected) selectBuilding(null);
      else if (inspectedId) setInspectedId(null);
    }
  }, backOutEnabled);

  // The one placement path, clicked or dropped. canPlace is also checked in
  // the reducer; this copy keeps the selection on an illegal drop. A 'done'
  // pickup (awaitsSite) is Founders Hall being sited: no rotation, no cost,
  // mirroring the reducer.
  const placeById = (id: string, row: number, col: number) => {
    const t = pickable.find((x) => x.id === id);
    if (!t) return;
    const fp = t.status === 'done' ? footprintOf(t) : orientedFootprint(t, rotated);
    if (!canPlace(s, t, row, col, fp)) return;
    // Paid as the tile said (BuildPopup.tsx): building gifts first, then
    // cash, then a loan for the shortfall (finance/treasury.ts).
    const financing = t.status === 'done' ? 'cash' : financingFor((f) => canStartDevelopment(s, t, undefined, f));
    if (t.status === 'done' ? !awaitsSite(s, t) : financing === null) return;
    act({ type: 'PLACE_BUILDABLE', buildableId: id, row, col, rotated, ...(financing === 'loan' ? { borrow: true } : financing === 'gift' ? { gift: true } : financing === 'endowment' ? { endowment: true } : {}) });
    selectBuilding(null);
    setHover(null);
  };
  // True (and clears the flag) when this click is the tail of a drag-to-pan;
  // the browser fires click on mouseup however far the pointer moved.
  const consumePanClick = () => {
    if (justPannedRef.current) { justPannedRef.current = false; return true; }
    return false;
  };
  const onGroundClick = (row: number, col: number) => {
    if (consumePanClick()) return;
    // A tap sets the ghost down; the touch bar's Place places it.
    if (selected && recentTouch()) return;
    if (selected) { placeById(selected.id, row, col); return; }
    if (inspectedId) setInspectedId(null);
  };
  // A placed building: toggles its info panel, but only when nothing is
  // being sited or drawn; otherwise the click belongs to that mode.
  const inspectBuilding = (id: string) => {
    if (consumePanClick()) return;
    if (selected || pathTool) return;
    setInspectedId((cur) => (cur === id ? null : id));
  };
  // A stable identity for the scene, reading the current inspectBuilding
  // through a ref so CampusScene's memo holds.
  const inspectRef = useRef(inspectBuilding);
  inspectRef.current = inspectBuilding;
  const onInspect = useCallback((id: string) => inspectRef.current(id), []);


  // Which way a bench set on this tile would face: as R turned it, or
  // toward the path beside it.
  const benchFacingAt = (tile: TileCoord | null): BenchFacing => benchTurn ?? (tile ? defaultBenchFacing(s.pathways, tile.row, tile.col) : 's');
  const placeDressing = (tile: TileCoord, kind: 'lamp' | 'bench'): Action => (kind === 'bench'
    ? { type: 'PLACE_DRESSING', tile, kind, facing: benchFacingAt(tile) }
    : { type: 'PLACE_DRESSING', tile, kind });

  const paintTile = (tile: TileCoord, tool: CampusTool) => {
    act(
      tool === 'draw' ? { type: 'ADD_PATH_TILE', tile }
        : tool === 'erase' ? { type: 'REMOVE_PATH_TILE', tile }
          : tool === 'plant' ? { type: 'PLANT_TREE', tile, species: plantingSpecies() ?? undefined }
            : tool === 'fell' ? { type: 'FELL_TREE', tile }
              : { type: 'PLACE_DRESSING', tile, kind: tool },
    );
  };

  // Re-resolved every render: a placement can vanish (e.g. demolition).
  const inspectedPlacement = inspectedId ? s.placements[inspectedId] : undefined;
  const inspectedBuildable = inspectedPlacement ? s.tech.find((x) => x.id === inspectedId) : undefined;
  const inspected = inspectedPlacement && inspectedBuildable ? { t: inspectedBuildable, p: inspectedPlacement } : null;

  // The footprint ghost at the current rotation, and whether a click would
  // succeed: the site is allowed (reach.ts: clear land, a walk from the road,
  // nothing walled off) and the school can afford it (canStartDevelopment,
  // or awaitsSite for Founders Hall). A refused site says why. Memoised on
  // the tile, since the walk check floods the parcel.
  const refusal = useMemo(
    () => (selected && hover && selectedFootprint
      ? siteRefusal(s, selected, hover.row, hover.col, selectedFootprint)
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id, hover?.row, hover?.col, selectedFootprint?.w, selectedFootprint?.h, s.placements],
  );
  const preview = selected && hover && selectedFootprint
    ? {
        ...hover,
        ...selectedFootprint,
        refusal,
        ok: refusal === null
          && (selected.status === 'done' ? awaitsSite(s, selected) : canStartDevelopment(s, selected)),
      }
    : null;

  // The season on the map (Plan 74I): CSS variables for the grass and the
  // leaves, and the snow on the roofs. Changes by the week, never animates.
  // With the setting off, the map stays at a week of plain summer green.
  const seasonsOn = useSettings().seasons;
  const week = seasonsOn ? s.clock.week : SUMMER_GREEN_WEEK;
  const season = useMemo(() => seasonStyle(week), [week]);
  const snow = useMemo(() => seasonOf(week).snow, [week]);
  // The land around the campus that stands in front of it, drawn by the
  // scene over the campus; an element kept while nothing it draws changes.
  const ringFront = useMemo(
    () => <RingFront name={s.self.name} vernacular={layout.vernacular} camera={camera} turning={turning} snow={snow} />,
    [s.self.name, layout.vernacular, camera, turning, snow],
  );
  // The path tool's ghost: the tile the next click would pave or lift.
  // Needs no `ok`, since a path tile can never be refused.
  const pathGhost = pathTool && hover ? { ...hover, tool: pathTool } : null;

  // The canvas map's scene: the same elements the SVG map mounts, painted
  // instead (see paintScene). Only built with the flag.
  if (CANVAS_MAP) {
    sceneRootClassRef.current = `${selected ? 'placing' : ''} ${pathTool ? `path-${pathTool}` : ''} ${inspectedId ? 'inspecting' : ''}`;
    sceneTreeRef.current = mapSceneTree({
      name: s.self.name, developing: s.developing, layout, camera, turning, snow, crowds, banners,
      inspectedId, justFinished, onInspect, labelLayerRef, front: ringFront,
    });
  }
  // React writes the map's class afresh on a render; the cursor's building,
  // found on the canvas, is kept on it.
  useLayoutEffect(() => {
    if (CANVAS_MAP && overBuildingRef.current) svgRef.current?.classList.add('over-building');
  });
  // Repainted when anything the scene draws changes (after the turn's
  // anchor has re-panned the view, which is an earlier layout effect).
  useLayoutEffect(() => {
    if (CANVAS_MAP) paintScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, layout, inspectedId, justFinished, season, snow, crowds, banners, s.developing, s.self.name, turning, selected, pathTool]);

  return (
    <section className="campus-map" style={season}>
      <div className="campus-map-canvas">
        {/* The land around the campus (Plan 81B), in an <svg> of its own
            under the map's, carrying the same pan/zoom transform (applyView
            writes both): a frame in which only the campus changes, as a
            walking crowd's do, repaints none of it. */}
        {CANVAS_MAP ? (
          <div className="campus-map-scene" aria-hidden="true"><canvas ref={sceneCanvasRef} /></div>
        ) : (
          <svg className="campus-map-ring" width="100%" height="100%" aria-hidden="true">
            <g ref={ringWorldRef}>
              <RingBack name={s.self.name} vernacular={layout.vernacular} camera={camera} turning={turning} snow={snow} />
            </g>
          </svg>
        )}
        <svg
          ref={svgRef}
          className={`campus-map-svg ${selected ? 'placing' : ''} ${pathTool ? `path-${pathTool}` : ''} ${inspectedId ? 'inspecting' : ''}`}
          // No viewBox: 1 user unit is 1 CSS px, so the pan/zoom transform
          // needs no conversion.
          width="100%"
          height="100%"
          role="group"
          aria-label="Campus map"
          onMouseLeave={(e) => {
            // Moving onto the rotate control (in the ghost SVG) isn't leaving
            // the map.
            if (e.relatedTarget instanceof Node && ghostSvgRef.current?.contains(e.relatedTarget)) return;
            leaveMap();
          }}
          onMouseMove={onMapMouseMove}
          onMouseDown={onMapMouseDown}
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
          onClick={onMapClick}
          onContextMenu={onMapContextMenu}
          onWheel={onWheel}
          // Drag-and-drop from the build popup resolves to a tile like every
          // other pointer event.
          onDragOver={(e) => {
            if (!selected) return;
            e.preventDefault();
            const tile = tileFromEvent(e);
            if (tile) setHover((cur) => (cur && cur.row === tile.row && cur.col === tile.col ? cur : tile));
          }}
          onDrop={(e) => {
            e.preventDefault();
            const tile = tileFromEvent(e);
            if (tile) placeById(e.dataTransfer.getData('text/plain'), tile.row, tile.col);
          }}
        >
          {CANVAS_MAP && <title ref={mapTitleRef} />}
          <defs><ScaffoldPattern /></defs>
          <g ref={worldRef}>
            {CANVAS_MAP ? (<>
              {/* The completion ring plays its animation here, over the
                  painted scene (Plan 83C). */}
              {justFinished.map((id) => {
                const p = s.placements[id];
                return p ? (
                  <polygon
                    key={`complete-${id}`}
                    className="campus-building-complete"
                    points={polyPoints(boxFaces(p.col - 0.15, p.row - 0.15, p.w + 0.3, p.h + 0.3, 0, 0).top)}
                  />
                ) : null;
              })}
              <CanvasLabels placed={layout.placed} inspectedId={inspectedId} vernacular={layout.vernacular} labelLayerRef={labelLayerRef} camera={camera} />
            </>) : (<>
            <CrowdContext.Provider value={crowds}>
            <BannerContext.Provider value={banners}>
            <ColorsContext.Provider value={layout.colors}>
            <CollegeNameContext.Provider value={s.self.name}>
            <DevelopingContext.Provider value={s.developing}>
            <SnowContext.Provider value={snow}>
              <CampusScene
                layout={layout}
                inspectedId={inspectedId}
                justFinished={justFinished}
                onInspect={onInspect}
                labelLayerRef={labelLayerRef}
                camera={camera}
                front={ringFront}
              />
            </SnowContext.Provider>
            </DevelopingContext.Provider>
            </CollegeNameContext.Provider>
            </ColorsContext.Provider>
            </BannerContext.Provider>
            </CrowdContext.Provider>
            </>)}
            <Walkers layout={layout} students={totalEnrolled(s.students)} gait={gait} camera={camera} turning={turning} />
            <HallMarksLayer s={s} layout={layout} onInspect={onInspect} camera={camera} />
            <LabMarksLayer s={s} layout={layout} onInspect={onInspect} camera={camera} />
            <FullMarksLayer s={s} layout={layout} onInspect={onInspect} camera={camera} />
            {justPlaced.map((id) => {
              const p = s.placements[id];
              if (!p) return null;
              const c = project(p.col + p.w / 2, p.row + p.h / 2);
              const spread = Math.max(p.w, p.h) * 9;
              return (
                <g key={id} className="dust-puff" transform={`translate(${c.x} ${c.y})`} aria-hidden="true">
                  {[-1, -0.4, 0.3, 1].map((k, i) => (
                    <circle key={i} cx={k * spread} cy={(i % 2 ? -0.3 : 0.2) * spread * 0.5} r={spread * 0.35} style={{ animationDelay: `${i * 40}ms` }} />
                  ))}
                </g>
              );
            })}
          </g>
        </svg>

        {/* The ghost's own layer: a second <svg> over the map, so moving the
            ghost doesn't repaint the scene under it. Same pan/zoom transform
            (applyView writes both); no pointer events except the rotate
            control (see styles.css). */}
        <svg ref={ghostSvgRef} className="campus-map-ghost" width="100%" height="100%" aria-hidden="true">
          <g ref={ghostWorldRef}>
              {preview && (
                <>
                  <polygon
                    className={`campus-preview ${preview.ok ? 'ok' : 'blocked'}`}
                    points={polyPoints(boxFaces(preview.col, preview.row, preview.w, preview.h, 0, 0).top)}
                  />

                  {/* The rotate control, pinned to the ghost's right corner
                      on screen (boxFaces' B, whichever grid corner that is)
                      inside the world <g>, so it tracks the ghost. */}
                  {canRotateSelected && (() => {
                    const at = boxFaces(preview.col, preview.row, preview.w, preview.h, 0, 0).B;
                    return (
                      <g
                        className="campus-rotate-btn"
                        transform={`translate(${at.x.toFixed(1)}, ${at.y.toFixed(1)})`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setRotated((r) => !r); }}
                        onMouseLeave={(e) => {
                          if (e.relatedTarget instanceof Node && svgRef.current?.contains(e.relatedTarget)) return;
                          leaveMap();
                        }}
                        role="button"
                        aria-label="Rotate building 90 degrees"
                      >
                        <circle r={13} />
                        <text textAnchor="middle" dominantBaseline="central">⟳</text>
                        <title>Rotate (R)</title>
                      </g>
                    );
                  })()}
                </>
              )}

              {pathGhost && (
                <polygon
                  className={`campus-path-ghost ${pathGhost.tool}`}
                  points={polyPoints(boxFaces(pathGhost.col, pathGhost.row, 1, 1, 0, 0).top)}
                />
              )}
              {/* The bench itself, at the facing it would be set at. */}
              {pathGhost?.tool === 'bench' && (
                <Bench col={pathGhost.col} row={pathGhost.row} facing={benchFacingAt(pathGhost)} ghost />
              )}

          </g>
        </svg>

        {/* Why the ghost is refused (reach.ts's siteRefusal), by the
            pointer and at screen size whatever the zoom. */}
        {preview?.refusal && (
          <div className="campus-map-why" style={{ left: pointerRef.current.x, top: pointerRef.current.y }}>
            {preview.refusal}
          </div>
        )}

        {/* The inspected building's info panel: a fixed corner card, not
            anchored to the building, since tracking it under imperative
            pan/zoom would mean re-rendering on every pixel of a drag. */}
        {inspected && (
          <BuildingInfoPanel
            t={inspected.t}
            s={s}
            act={act}
            onClose={() => setInspectedId(null)}
            onOpenCurriculum={(key) => { setInspectedId(null); onOpenCurriculum(key); }}
            onOpenResearch={onOpenResearch ? (target) => { setInspectedId(null); onOpenResearch(target); } : undefined}
            focusProgramId={focus?.hallId === inspected.t.id ? focus.programId : undefined}
          />
        )}

        {/* Zoom stays on the map, not in the toolbar: it is a viewport
            control, and a map bigger than the screen must be zoomable
            without a wheel. */}
        {/* Placing on touch (Plan 70F): a tap or a drag sets the ghost
            down, and nothing is built without Place. */}
        {touchUi && selected && (
          <div className="map-touch-bar" role="toolbar" aria-label={`Place ${selected.name}`}>
            <span className="map-touch-bar-name">
              {selected.name}
              <span className="map-touch-bar-note">{!hover ? 'Tap the ground to set it down' : preview?.refusal ?? (preview?.ok ? 'Drag to move it' : 'Not affordable yet')}</span>
            </span>
            {canRotateSelected && <button type="button" onClick={() => setRotated((r) => !r)}>Rotate</button>}
            <button type="button" className="primary" disabled={!hover || !preview?.ok} onClick={() => { if (hover) placeById(selected.id, hover.row, hover.col); }}>Place</button>
            <button type="button" onClick={() => selectBuilding(null)}>Cancel</button>
          </div>
        )}

        <div className={`campus-map-zoom-controls${touchUi ? ' touch-ui' : ''}${toolsOpen ? ' open' : ''}`}>
          <button
            type="button"
            className="map-tools-toggle"
            aria-expanded={toolsOpen}
            aria-label={toolsOpen ? 'Fold the map tools away' : 'Map tools'}
            title={toolsOpen ? 'Fold the map tools away' : 'Map tools: zoom, turn, tilt, the view, help'}
            onClick={() => setToolsOpen((open) => !open)}
          >
            {toolsOpen ? <CloseIcon /> : <MapToolsIcon />}
          </button>
          {toolsOpen && (
            <>
              <HelpHint
                align="end"
                text="Where the college physically grows. Pick a building, residence hall or facility from the build menu (the toolbar's Build button); placing it here is how it starts: the cost is charged at once, and it goes up right where you put it, reserving those tiles until it is done. Press R, or click the ⟳ on the footprint ghost, to turn a non-square building 90 degrees before setting it down; with the bench tool, R turns the bench. Buildings vary in size: a school hall covers many tiles, a lab a few. There must be room for the whole footprint on empty ground, and a way to walk to it from the road along the campus's south edge; a building that would wall another off is refused, and the ghost says why. Courses are never sited: a course is not a place, and develops from the Curriculum tab. Press P (or use the Build menu's Draw path tile) to lay walkways, free: drag with the left button to pave, the right button to lift, and hold Shift for a straight run from where you started, diagonals included. Paths shape the quads the campus finds, and a paved tile holds no tree, so both count toward campus beauty. Every tab (Curriculum, Faculty, Research and the rest) opens as a full screen over this one; the Campus button, the tab's own Close, or Escape brings you back here. Keys: W/A/S/D or the arrows pan; Q/E turn the view a quarter turn, Z/X tilt it, Home brings back the opening view; R rotates, P draws, Escape backs out one layer at a time; C, F and L open the Curriculum, Faculty and Students tabs; Space pauses and resumes, 1 to 4 set the speed, and M mutes. Drag the map to pan (or hold the scroll wheel, which pans even mid-stroke), and scroll or pinch to zoom. On a touch screen, one finger pans, two pinch to zoom, a tap opens a building, and a picked-up building is set down with a tap or a drag and built with Place; the two curved-arrow buttons turn the view, ⤓ ⤒ tilt it, and ⌂ brings back the opening view."
              />
              <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
              <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">−</button>
              {/* The camera's keys (Q/E, Z/X, Home) as buttons, once the map
                  has been touched (Plans 70F and 70G); a keyboard player has
                  the keys. */}
              {touchUi && (
                <>
                  <button type="button" onClick={() => turnBy(1)} aria-label="Turn the view left"><TurnViewIcon direction="left" /></button>
                  <button type="button" onClick={() => turnBy(-1)} aria-label="Turn the view right"><TurnViewIcon direction="right" /></button>
                  <button type="button" onClick={() => tiltBy(-1)} aria-label="Tilt the view down">⤓</button>
                  <button type="button" onClick={() => tiltBy(1)} aria-label="Tilt the view up">⤒</button>
                  <button type="button" onClick={resetCamera} aria-label="Back to the opening view">⌂</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
