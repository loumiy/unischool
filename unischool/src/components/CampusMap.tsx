import { financingFor } from '../systems/finance/treasury';
import { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Action, CampusTool } from '../state/actions';
import type { Buildable, GameState, Initiative, Placement, TileCoord, Vernacular } from '../state/types';
import { totalEnrolled } from '../state/types';
import { useCampusLayout, type CampusLayout } from './campusLayout';
import { CAMPUS_GRID_HEIGHT, CAMPUS_GRID_WIDTH } from '../state/types';
import {
  ROAD_FIRST_ROW, awaitsSite, canPlace, canRotate, footprintOf,
  isPlaceableKind, orientedFootprint, parsePathTileKey, pathTileKey,
} from '../state/campusMap';
import { siteRefusal } from '../state/reach';
import { detectQuads, tileIndex, type Quad } from '../state/quads';
import { QuadOverlay, QuadPatches } from './quadLayer';
import QuadPanel from './QuadPanel';
import Walkers from './Walkers';
import AgeMarks, { type AgeBand } from './ageMarks';
import { dressingProps } from './dressing';
import { BannerContext, CollegeNameContext, ColorsContext, CrowdContext, DevelopingContext, VenueContext, crowdedVenues, isCommencement } from './mapOccasions';
import { desireLines, walkGrid } from './walkRoutes';
import { canStartDevelopment, facultyGate } from '../systems/techtree/techSystem';
import { isTypingTarget, useHotkeys } from './hotkeys';
import HelpHint from './HelpHint';
import BuildingInfoPanel from './BuildingInfoPanel';
import { isAcademicHall, programById } from '../data/techData';
import { schoolMark } from '../data/schoolPalette';
import { researchTopic } from '../data/researchTopics';
import BuildingMotif, { ScaffoldPattern, drawnHeightOf, labelHeightOf } from './buildingMotifs';
import { floorsUnderConstruction, materialOf, motifOf, wallHeightOf } from './buildingSpec';
import { groundProps } from './groundMarkings';
import { depthOrder, type DepthBox } from './depthSort';
import PathwayLayer from './pathways';
import Tree, { woodlandShadow } from './trees';
import { plantingSpecies } from './plantingChoice';
import { castShadow } from './light';
import {
  DEFAULT_CAMERA, DEFAULT_PITCH_INDEX, PITCHES, TURN_MS, VIEWS, WORLD, boxFaces, lift, polyPoints, project, setCamera, tileAt,
  turnStep, unproject, type Camera,
} from './isoProjection';
import { reducedMotion } from '../settings';

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
// of the site's footprint.
const PROGRESS_BAR_DEPTH = 0.22;   // in tiles

// Cast shadows: the footprint translated away from the sun (light.ts),
// scaled by the mass's drawn height. All are drawn in one pass after the
// paths and before any mass (see CastShadows): with a world-fixed sun and a
// turning camera, a shadow can fall across a building nearer the camera, so
// shadows must go down first.

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
// unlike a pan. It turns about the ground at the canvas centre.

// The grid projects to a diamond whose left corner is at negative x, so
// defaultView centres on WORLD's real bounds. Headroom at the top is for
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
  const kerb = line(0, ROAD_FIRST_ROW, CAMPUS_GRID_WIDTH, ROAD_FIRST_ROW);
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
    case 'quad': return 'quad';
    case 'lamp': return 'lamp';
    case 'bench': return 'bench';
  }
}

// Colour comes from materialOf (buildingSpec.ts); the kind class only
// drives behaviour rules such as the inspect dimming.
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

// Where a building's label sits and how big. `centre` is the centre of the
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
type SceneEntry = DepthBox & (
  | { kind: 'mass'; key: string; id: string }
  | { kind: 'tree'; key: string; seed: number }
  // `owner` is the Buildable a prop belongs to, for its stands' crowd.
  | { kind: 'prop'; key: string; node: React.JSX.Element; owner?: string }
);


// A site's progress: the building's shell rising in scaffolding over its
// build weeks, from the motif's low frame to the eaves, a progress bar lying
// flat along the front edge of its footprint, and the tooltip that counts
// it down.
function SiteProgress({ t, p, label }: { t: Buildable; p: Placement; label: string }) {
  const weeksLeft = useContext(DevelopingContext)[t.id];
  if (weeksLeft === undefined) return null;
  const elapsedFraction = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  const rises = motifOf(t) !== 'grounds' && motifOf(t) !== 'landmark' && floorsUnderConstruction(t) === 0;
  const d = drawnFootprint(p);
  const shell = rises ? boxFaces(d.col, d.row, d.w, d.h, 0, wallHeightOf(t) * elapsedFraction) : null;
  return (
    <>
      {shell && elapsedFraction > 0.05 && (
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
        points={polyPoints(boxFaces(p.col, p.row + p.h - PROGRESS_BAR_DEPTH, p.w, PROGRESS_BAR_DEPTH, 0, 0).top)}
      />
      <polygon
        className="campus-building-progress-fill"
        points={polyPoints(boxFaces(p.col, p.row + p.h - PROGRESS_BAR_DEPTH, Math.max(0, p.w * elapsedFraction), PROGRESS_BAR_DEPTH, 0, 0).top)}
      />
      {t.facilityType !== 'quad' && <title>{`${label} · under construction · ${weeksLeft}w left`}</title>}
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
function CastShadows({ placed, scene, vernacular, camera }: {
  placed: CampusLayout['placed'];
  scene: readonly SceneEntry[];
  vernacular: Vernacular;
  camera: Camera;
}) {
  const d = useMemo(() => {
    const sub = (pts: { x: number; y: number }[]) => `M${polyPoints(pts).replace(/ /g, 'L')}Z`;
    const buildings: string[] = [];
    for (const { t, p, developing } of placed) {
      const height = drawnHeightOf(t, developing, vernacular);
      if (height <= 0) continue;
      const f = drawnFootprint(p);
      buildings.push(sub(castShadow(f.col, f.row, f.w, f.h, height)));
    }
    const trees: string[] = [];
    for (const e of scene) if (e.kind === 'tree') trees.push(sub(woodlandShadow(e.row, e.col, e.seed)));
    return { buildings: buildings.join(''), trees: trees.join('') };
    // `camera` is read by the projection, not here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, scene, vernacular, camera]);
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
    <g className="campus-hall-marks" role="button" onClick={onInspect} aria-label={`${t.name}: ${slots.length - free} of ${slots.length} slots filled${flag ? ', a program on offer' : ''}`}>
      <title>{`${slots.length - free} of ${slots.length} slots filled${flag ? ' · room for a program on offer' : ''}${blocked.some(Boolean) ? ' · a program is waiting on a department' : ''}`}</title>
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
// dark disc like the hall's pips, a ring filling in the school's colour as
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
      aria-label={`${t.name}: ${topic}, ${Math.round(done * 100)}% done`}>
      <title>{`${topic} · ${run.weeksRemaining} week${run.weeksRemaining === 1 ? '' : 's'} to go`}</title>
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

function LabMarksLayer({ s, layout, onInspect }: {
  s: GameState; layout: CampusLayout; onInspect: (id: string) => void;
}) {
  return (
    <>
      {layout.placed.filter(({ t }) => s.research.initiatives[t.id]).map(({ t, p }) => (
        <LabMark key={`lab-${t.id}`} t={t} p={p} run={s.research.initiatives[t.id]} vernacular={layout.vernacular} onInspect={() => onInspect(t.id)} />
      ))}
    </>
  );
}

// Everything that stands on the ground, as one memoised component: the
// static layer. Its props change only when the layout does (campusLayout.ts),
// the camera turns, or a building is inspected or finishes; a week in which
// nothing was built or paved skips it entirely, as does a hover. `onInspect`
// must be a stable callback for this to work.
const CampusScene = memo(function CampusScene({ layout, quads, inspectedId, justFinished, onInspect, labelLayerRef, camera }: {
  layout: CampusLayout;
  // Detected once per layout (state/quads.ts).
  quads: readonly Quad[];
  inspectedId: string | null;
  justFinished: readonly string[];
  onInspect: (id: string) => void;
  // A prop so this memo and the memoised motifs and trees redraw on a
  // camera change.
  camera: Camera;
  // The label layer's node; the parent writes opacity straight onto it on
  // every mouse move (see paintLabels).
  labelLayerRef: React.RefObject<SVGGElement | null>;
}) {
  const { placed, byId, trees, pathways, vernacular } = layout;

  // Open-ground facilities (quads, pitches, courts, pool decks) have no
  // height, so their plates are drawn in their own pass under every mass: a
  // single depth key can't express a large flat footprint (see
  // groundMarkings.tsx). Anything standing on them comes back from
  // groundProps and joins the sorted pass below.
  const groundPlaced = placed.filter(({ t }) => motifOf(t) === 'grounds');

  // The sorted scene: every mass, tree and raised prop in paint order (see
  // depthSort.ts). It returns descriptors, not elements, so inspect/finish
  // changes never invalidate the sort.
  const scene = useMemo(() => {
    const entries: SceneEntry[] = [];
    for (const { t, p, developing } of placed) {
      if (motifOf(t) === 'grounds') {
        // Each prop enters the sort on the ground it covers. A site has no
        // props yet.
        const d = drawnFootprint(p);
        for (const prop of groundProps(t.facilityType, d.col, d.row, d.w, d.h, t.tier, developing, t.id)) {
          entries.push({
            kind: 'prop', key: `g-${t.id}-${prop.key}`, node: prop.node, owner: t.id,
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
    // The camera changes the order and the props' geometry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, camera]);

  const ground = useMemo(groundGeometry, [camera]);

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
      {/* Ground, pathways, shadows, flat plates, the sorted scene, then
          labels on top. Hall marks and the ghost are drawn outside. */}
      <polygon className="campus-ground" points={ground.plate} />
      <path className="campus-grid" d={ground.grid} />
      <polygon className="campus-road" points={ground.road} />
      <path className="campus-road-kerb" d={ground.kerb} />
      <path className="campus-road-centre" d={ground.centre} />

      <QuadPatches quads={quads} camera={camera} />
      <DesireLines layout={layout} camera={camera} />

      <PathwayLayer pathways={pathways} camera={camera} />

      <CastShadows placed={placed} scene={scene} vernacular={vernacular} camera={camera} />

      {groundPlaced.map((e) => <g key={e.t.id}>{building(e)}</g>)}

      {scene.map((entry) => {
        if (entry.kind === 'tree') return <Tree key={entry.key} row={entry.row} col={entry.col} seed={entry.seed} camera={camera} />;
        if (entry.kind === 'prop') {
          return <VenueContext.Provider key={entry.key} value={entry.owner ?? null}><g>{entry.node}</g></VenueContext.Provider>;
        }
        const e = byId.get(entry.id);
        return e ? <VenueContext.Provider key={entry.key} value={e.t.id}><g>{building(e)}</g></VenueContext.Provider> : null;
      })}

      <g ref={labelLayerRef}>
        {placed.filter(({ t }) => t.facilityType !== 'quad').map(({ t, p, label }) => (
          <BuildingLabel key={`label-${t.id}`} t={t} p={p} label={label} pinned={t.id === inspectedId} vernacular={vernacular} />
        ))}
      </g>
    </>
  );
});

// Desire lines: the lawn worn where the busiest routes cross it (see
// walkRoutes.ts), under the paving, so a path laid over one covers it and
// the next layout no longer routes across the grass there.
const DesireLines = memo(function DesireLines({ layout, camera }: { layout: CampusLayout; camera: Camera }) {
  // The routes are found once per layout; a turn only re-projects them.
  const runs = useMemo(() => {
    const input = { placements: layout.placements, tech: layout.placed.map((e) => e.t), pathways: layout.pathways };
    return desireLines(input, walkGrid(input));
  }, [layout]);
  const d = useMemo(() => runs
    .map((run) => run.map((w, i) => {
      const p = project(w.col, w.row);
      return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(''))
    .join(''),
  // `camera` is read by the projection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [runs, camera]);
  return d ? <path className="campus-desire" d={d} aria-hidden="true" /> : null;
});

// Hall pips: one per slot, in the colour of the school whose program holds
// it, plus a flag when a slot is free and a program is on offer. Always on,
// unlike the labels, and redrawn every week, since a program can arrive or
// stall in any week.
function HallMarksLayer({ s, layout, onInspect }: {
  s: GameState; layout: CampusLayout; onInspect: (id: string) => void;
}) {
  return (
    <>
      {layout.placed.filter(({ t }) => isAcademicHall(t) && s.halls[t.id]).map(({ t, p }) => (
        <HallMarks
          key={`marks-${t.id}`}
          t={t}
          p={p}
          slots={s.halls[t.id]}
          offerWaiting={s.programOffers.length > 0}
          blocked={s.halls[t.id].map((slot) => !!slot.programId && programBlocked(s, slot.programId))}
          vernacular={layout.vernacular}
          onInspect={() => onInspect(t.id)}
        />
      ))}
    </>
  );
}

export default function CampusMap({
  s, act, selectedId, onSelect, pathTool, onSetPathTool, backOutEnabled, controlsEnabled,
  onOpenCurriculum, inspectTarget, onInspectTargetConsumed, onInspectedChange, gait,
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
  // A hall to open the panel on (from the Curriculum tab's "Found in
  // <hall>"). Consumed on arrival and cleared through the callback.
  inspectTarget?: string | null;
  onInspectTargetConsumed?: () => void;
  // Reports which building's panel is open (the opening walkthrough reads it).
  onInspectedChange?: (id: string | null) => void;
  // The clock's pace as a multiple of Play, 0 while it is stopped: how fast
  // the walkers walk.
  gait: number;
}) {
  const [rotated, setRotated] = useState(false);
  // The building whose info panel is open. Mutually exclusive with
  // `selectedId`/`pathTool`: selectBuilding and the pathTool effect clear
  // it, and inspectBuilding refuses while either is active.
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  useEffect(() => { onInspectedChange?.(inspectedId); }, [inspectedId]);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  // React state, unlike pan and zoom, because a turn changes every polygon.
  // Set on the projection here at the top of the render so everything below
  // draws at it. Not persisted.
  const [camera, setCameraState] = useState<Camera>(DEFAULT_CAMERA);
  setCamera(camera);
  const layout = useCampusLayout(s);
  // This week's occasions (mapOccasions.ts), reference-stable between them.
  const crowdKey = crowdedVenues(s).join(',');
  const crowds = useMemo(() => new Set(crowdKey ? crowdKey.split(',') : []), [crowdKey]);
  const commencement = isCommencement(s);
  const banners = useMemo(() => (commencement ? { ...s.self.colors } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commencement, s.self.colors.primary, s.self.colors.secondary]);
  // The quads, once per layout, and which quad (by index + 1) each tile is in.
  const quads = useMemo(
    () => detectQuads({ placements: layout.placements, tech: layout.placed.map((e) => e.t), pathways: layout.pathways, quads: layout.quads }),
    [layout],
  );
  const quadAt = useMemo(() => {
    const at = new Int16Array(CAMPUS_GRID_WIDTH * CAMPUS_GRID_HEIGHT);
    quads.forEach((q, k) => { for (const i of q.tiles) at[i] = k + 1; });
    return at;
  }, [quads]);
  const quadUnder = (tile: TileCoord | null): Quad | null => (tile ? quads[quadAt[tileIndex(tile.row, tile.col)] - 1] ?? null : null);
  // The quad under the pointer (for its outline and name) and the one whose
  // card is open, by key; N puts every name up.
  const [hoveredQuad, setHoveredQuad] = useState<string | null>(null);
  const [inspectedQuadKey, setInspectedQuadKey] = useState<string | null>(null);
  const [showQuadNames, setShowQuadNames] = useState(false);
  const inspectedQuad = quads.find((q) => q.key === inspectedQuadKey) ?? null;
  // The camera is derived from these, so it only rests on a crisp view.
  const stanceRef = useRef({ view: 0, pitch: DEFAULT_PITCH_INDEX });
  // Buildings that finished within the last COMPLETION_PULSE_MS. Derived by
  // diffing the previous developing set, so nothing enters GameState.
  const [justFinished, setJustFinished] = useState<readonly string[]>([]);
  const wasDevelopingRef = useRef<Set<string>>(new Set());
  // Pending expiries are cancelled on unmount only. A cleanup in the effect
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

  // `selectedId` can change from outside (BuildPopup.tsx), so a fresh pickup
  // resets rotation here.
  useEffect(() => {
    setRotated(false);
  }, [selectedId]);
  // Changing path mode closes any open info panel.
  useEffect(() => {
    setInspectedId(null);
    setHover(null);
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
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  // The label layer and the last cursor position in world coordinates.
  // Refs, because the label pass runs on every mouse move.
  const labelLayerRef = useRef<SVGGElement>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  // The pointer in canvas pixels, for the refused ghost's reason (re-read on
  // the re-render a new hover tile causes).
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // A mousedown that moves past the threshold is a drag-to-pan. `button` is
  // recorded because only a left-button pan sets justPannedRef: a left
  // mouseup is followed by a `click`, a middle one by `auxclick`, so a
  // middle pan setting the flag would swallow the next real click.
  const dragRef = useRef<{ button: number; startX: number; startY: number; startView: { x: number; y: number }; moved: boolean } | null>(null);
  // Set when a drag is recognised as a pan, so the click fired after mouseup
  // doesn't also place a building. Consumed by the next click or mousedown.
  const justPannedRef = useRef(false);
  const pathDragRef = useRef<CampusTool | null>(null);
  // The last tile a stroke painted. Mousemove can skip tiles on a fast
  // drag, so paintStroke draws the line from here.
  const pathLastRef = useRef<TileCoord | null>(null);
  // Where the current stroke began and the tiles it has laid, for the
  // Shift-held straight run.
  const strokeRef = useRef<{ anchor: TileCoord; laid: Set<string> } | null>(null);

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
  // building to the canvas centre (the panel sits top-left).
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
    }
    onInspectTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectTarget]);

  // Re-light after every render: fresh label nodes carry no opacity.
  useEffect(paintLabelsFromCursor);
  function paintLabelsFromCursor() { paintLabels(cursorRef.current); }

  function applyView(next: { x: number; y: number; zoom: number }) {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom));
    viewRef.current = { x: next.x, y: next.y, zoom };
    const transform = `translate(${next.x} ${next.y}) scale(${zoom})`;
    worldRef.current?.setAttribute('transform', transform);
    ghostWorldRef.current?.setAttribute('transform', transform);
    paintLabels(cursorRef.current);
  }

  // Move the camera, keeping the ground at the canvas centre fixed on screen
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
  // ground at the canvas centre, which stays put. The azimuth runs
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
  // the centre. After the commit, not in the frame callback: that put the
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
    const frame = (now: number) => {
      const t = (now - start) / TURN_MS;
      turn.at = t >= 1 ? VIEWS[st.view] : turnStep(from, to, t);
      anchorRef.current = anchor;
      if (t >= 1) {
        turnRef.current = null;
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

  // The starting view: centred at DEFAULT_ZOOM, but never so far out that
  // the grid stops overflowing the canvas vertically (MIN_COVERAGE). Only
  // bites on an unusually tall, narrow canvas.
  function defaultView(rect: { width: number; height: number }) {
    const MIN_COVERAGE = 1.15;
    const zoom = Math.max(DEFAULT_ZOOM, (rect.height * MIN_COVERAGE) / MAP_HEIGHT);
    // Centre on the world's real midpoint (the diamond starts at negative x).
    const midX = (WORLD.minX + WORLD.maxX) / 2;
    const midY = (WORLD.minY + WORLD.maxY) / 2;
    return { x: rect.width / 2 - midX * zoom, y: rect.height / 2 - midY * zoom, zoom };
  }

  // Centre the grid on first paint only; resizing leaves the player's
  // pan/zoom alone.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    applyView(defaultView(svg.getBoundingClientRect()));
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
  // Diagonals are normalised. Writes through applyView, like the mouse drag.
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
      // Opposite keys cancel to zero, which must not be normalised.
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
    const rect = svg.getBoundingClientRect();
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
    // Labels track the cursor in every mode, including mid-pan.
    cursorRef.current = worldFromEvent(e);
    paintLabels(cursorRef.current);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (dragRef.current?.moved) return;   // panning: don't jitter the ghost across the tiles a drag crosses
    const overQuad = selected || (pathTool && pathTool !== 'quad') ? null : quadUnder(tileFromEvent(e))?.key ?? null;
    if (overQuad !== hoveredQuad) setHoveredQuad(overQuad);
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
    setHover(null);
    setHoveredQuad(null);
    cursorRef.current = null;
    paintLabels(null);
  }

  function onMapClick(e: React.MouseEvent<SVGSVGElement>) {
    const tile = tileFromEvent(e);
    if (!tile) return;
    onGroundClick(tile.row, tile.col);
  }

  function onMapMouseDown(e: React.MouseEvent<SVGSVGElement>) {
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
    // The quad tool marks on a click, not along a stroke.
    if (pathTool === 'quad' && e.button === 0) {
      const tile = tileFromEvent(e);
      if (tile) act({ type: 'MARK_QUAD', tile });
      return;
    }
    // Lamps and benches: one a click, the right button lifts.
    if ((pathTool === 'lamp' || pathTool === 'bench') && (e.button === 0 || e.button === 2)) {
      const tile = tileFromEvent(e);
      if (tile) act(e.button === 0 ? { type: 'PLACE_DRESSING', tile, kind: pathTool } : { type: 'REMOVE_DRESSING', tile });
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
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * Math.exp(-e.deltaY * ZOOM_SPEED)));
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
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * factor));
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
    if (key === 'p') onSetPathTool('draw');
    if (key === 'q') turnBy(1);
    if (key === 'e') turnBy(-1);
    if (key === 'z') tiltBy(-1);
    if (key === 'x') tiltBy(1);
    if (key === 'home') resetCamera();
    if (key === 'n') setShowQuadNames((on) => !on);
  }, controlsEnabled);

  // Escape backs out one layer at a time (path tool, pickup, info panel), on
  // its own gate because App.tsx's ladder hands off to it.
  useHotkeys((e) => {
    if (e.key === 'Escape') {
      if (pathTool) onSetPathTool(pathTool);
      else if (selected) selectBuilding(null);
      else if (inspectedId) setInspectedId(null);
      else if (inspectedQuadKey) setInspectedQuadKey(null);
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
    if (selected) { placeById(selected.id, row, col); return; }
    if (inspectedId) setInspectedId(null);
    // Open ground inside a quad opens its card; anywhere else closes it.
    setInspectedQuadKey(pathTool ? null : quadUnder({ row, col })?.key ?? null);
  };
  // A placed building: toggles its info panel, but only when nothing is
  // being sited or drawn; otherwise the click belongs to that mode.
  const inspectBuilding = (id: string) => {
    if (consumePanClick()) return;
    if (selected || pathTool) return;
    setInspectedQuadKey(null);
    setInspectedId((cur) => (cur === id ? null : id));
  };
  // A stable identity for the scene, reading the current inspectBuilding
  // through a ref so CampusScene's memo holds.
  const inspectRef = useRef(inspectBuilding);
  inspectRef.current = inspectBuilding;
  const onInspect = useCallback((id: string) => inspectRef.current(id), []);


  const paintTile = (tile: TileCoord, tool: CampusTool) => {
    act(
      tool === 'draw' ? { type: 'ADD_PATH_TILE', tile }
        : tool === 'erase' ? { type: 'REMOVE_PATH_TILE', tile }
          : tool === 'plant' ? { type: 'PLANT_TREE', tile, species: plantingSpecies() ?? undefined }
            : tool === 'fell' ? { type: 'FELL_TREE', tile }
              : tool === 'quad' ? { type: 'MARK_QUAD', tile }
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

  // The path tool's ghost: the tile the next click would pave or lift.
  // Needs no `ok`, since a path tile can never be refused.
  const pathGhost = pathTool && hover ? { ...hover, tool: pathTool } : null;

  return (
    <section className="campus-map">
      <div className="campus-map-canvas">
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
          <defs><ScaffoldPattern /></defs>
          <g ref={worldRef}>
            <CrowdContext.Provider value={crowds}>
            <BannerContext.Provider value={banners}>
            <ColorsContext.Provider value={layout.colors}>
            <CollegeNameContext.Provider value={s.self.name}>
            <DevelopingContext.Provider value={s.developing}>
              <CampusScene
                layout={layout}
                quads={quads}
                inspectedId={inspectedId}
                justFinished={justFinished}
                onInspect={onInspect}
                labelLayerRef={labelLayerRef}
                camera={camera}
              />
            </DevelopingContext.Provider>
            </CollegeNameContext.Provider>
            </ColorsContext.Provider>
            </BannerContext.Provider>
            </CrowdContext.Provider>
            <Walkers layout={layout} students={totalEnrolled(s.students)} gait={gait} camera={camera} />
            <HallMarksLayer s={s} layout={layout} onInspect={onInspect} />
            <LabMarksLayer s={s} layout={layout} onInspect={onInspect} />
            <QuadOverlay quads={quads} hovered={hoveredQuad} inspected={inspectedQuadKey} showAll={showQuadNames} camera={camera} />
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
                      inside the world <g>, so it tracks the ghost. */}
                  {canRotateSelected && (() => {
                    const at = project(preview.col + preview.w, preview.row);
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
        {inspectedQuad && !inspected && (
          <QuadPanel quad={inspectedQuad} act={act} onClose={() => setInspectedQuadKey(null)} />
        )}
        {inspected && (
          <BuildingInfoPanel
            t={inspected.t}
            s={s}
            act={act}
            onClose={() => setInspectedId(null)}
            onOpenCurriculum={(key) => { setInspectedId(null); onOpenCurriculum(key); }}
          />
        )}

        {/* Zoom stays on the map, not in the toolbar: it is a viewport
            control, and a map bigger than the screen must be zoomable
            without a wheel. */}
        <div className="campus-map-zoom-controls">
          <HelpHint
            align="end"
            text="Where the college physically grows. Pick a building, residence hall or facility from the Build menu (the toolbar's Build button); placing it here is how it starts: the cost is charged at once, and it goes up right where you put it, reserving those tiles until it is done. Press R, or click the ⟳ on the footprint ghost, to turn a non-square building 90 degrees before setting it down. Buildings vary in size: a school hall covers many tiles, a lab a few. There must be room for the whole footprint on empty ground, and a way to walk to it from the road along the campus's south edge; a building that would wall another off is refused, and the ghost says why. Courses are never sited: a course is not a place, and develops from the Curriculum tab. Press P (or use the Build menu's Draw path tile) to lay walkways, free: drag with the left button to pave, the right button to lift, and hold Shift for a straight run from where you started, diagonals included. Paths shape the quads the campus finds, and a paved tile holds no tree, so both count toward campus beauty. Every tab (Curriculum, Faculty, Research and the rest) opens as a full screen over this one; the Campus button, the tab's own Close, or Escape brings you back here. Open ground the buildings close in is found as a quad and named; click one to rename it, press N to show every name, and use the Build menu's Mark a quad to make one of a space the campus has not. Keys: W/A/S/D or the arrows pan; Q/E turn the view a quarter turn, Z/X tilt it, Home brings back the opening view; R rotates, P draws, Escape backs out one layer at a time; C, F and L open the Curriculum, Faculty and Students tabs; Space pauses and resumes, 1 to 4 set the speed, and M mutes. Drag the map to pan (or hold the scroll wheel, which pans even mid-stroke), and scroll or pinch to zoom."
          />
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">−</button>
          {/* The camera is keys only (Q/E, Z/X, Home). */}
        </div>
      </div>
    </section>
  );
}
