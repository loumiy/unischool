import { type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { professionalSchools } from '../data/techData';
import { isGenEdComplete, revealedGraduatePrograms } from '../tabs/curriculumData';
import { hasFreeFacultySlot } from '../systems/techtree/techSystem';
import {
  CONSTELLATION, type Cluster, type CourseNode, type MajorWheel, type Point,
  SCHOOL_LABEL_SIZE, arcPath,
} from './constellationLayout';
import { CourseTooltipBody, cellState, courseCodeAndTitle, tooltipPosition, type TooltipPos } from './courseCells';
import HelpHint from './HelpHint';

// ---------------------------------------------------------------------
// THE CURRICULUM, AS A MAP OF ITSELF. The catalogue used to be a column of
// card grids — a pool, then a section per school, then a sub-group per
// established major — which said what was available but never what the
// shape of the thing was: that four tier-2 courses sit on ONE major's
// entry course, that six majors sit on one school, that every one of them
// sits on the same six gen-ed courses.
//
// So it is drawn instead. constellationLayout.ts solves the geometry once
// from the seed catalogue and never again; this file is the camera over
// it, the reveal rules on top of it, and the five colours a course can
// wear — the same five the card list uses, from the same cellState, so a
// brass arc here and a brass cell in a school's own course list (see
// SchoolCurriculumPanel.tsx, opened from the building on the campus map)
// mean the identical thing.
//
// WHAT IS REVEALED is unchanged from the card list it replaces — the same
// predicates, imported from curriculumData.ts rather than re-read here:
//   - the gen-ed core at the centre is visible from the first week;
//   - a school's hub and its six majors' tier-1 discs appear once the
//     gen-ed core is complete;
//   - a major's tier-2 ring appears once the school's BUILDING is done;
//   - its tier-3 ring appears once its tier-2 quartet is complete (the
//     `program-established:` milestone);
//   - a school's graduate crown appears when that program's gate opens,
//     and Medicine and Law appear as clusters of their own once their own
//     buildings stand.
// Nothing here can show a course the engine has not opened, or hide one it
// has: every reveal above is a read of existing unlock/milestone state.
//
// The camera is deliberately imperative — the transform is written
// straight onto the world <g> and never appears in JSX — for the reason
// CampusMap.tsx does the same: there are four hundred-odd paths under it,
// and re-rendering all of them on every pixel of a drag is the difference
// between a smooth pan and a slideshow. React is told about the view only
// when the zoom crosses a level-of-detail threshold, which is a handful of
// times in a session rather than a hundred times a second.
// ---------------------------------------------------------------------

const MIN_ZOOM = 0.06;
const MAX_ZOOM = 3;
const ZOOM_SPEED = 0.0016;
const ZOOM_BUTTON_STEP = 1.35;
// px of pointer movement before a mousedown counts as a drag rather than a
// click — so a slightly unsteady click on a course still starts it.
const PAN_CLICK_THRESHOLD = 4;

// A camera move to a school or a major runs rather than teleports: the
// whole point of clicking a hub is to learn where that school SITS, and a
// cut leaves the player re-orienting from scratch on the far side of it.
const FLIGHT_MS = 520;

// How much of the canvas the thing you flew to should fill.
const FOCUS_FILL = 0.82;
// ...but never closer than this. A single major wheel is small enough
// that filling the canvas with it would put four course arcs on screen
// and nothing to place them against; stopping here lands with the wheel
// large and its neighbours still in the frame, which is what "go to this
// major" actually means.
const MAX_FOCUS_ZOOM = 1.5;

// LEVEL OF DETAIL. Every label in the constellation is drawn in world
// units, so it shrinks with the view — which means that without these,
// pulling back to the whole university renders four hundred course codes
// at a third of a pixel each: invisible, and paid for on every frame.
//
// The thresholds are where a label's own size crosses legibility, so each
// tier of naming appears exactly as you zoom into the level it belongs to.
// This is the "zoom out" sequence the design is drawn as, run backwards.
//
// Cluster names are the exception, and have to survive every zoom: they
// are how you find the School of Engineering in order to fly to it. So
// below LOD_MAJOR_NAMES the name leaves its hub — a hub is a dozen pixels
// across out there — and reappears OUTSIDE the cluster at a size fixed in
// screen pixels rather than world ones (see --cz below).
const LOD_MAJOR_NAMES = 0.45;  // major and graduate-program names, and the name in a hub
const LOD_COURSE_CODES = 0.8;  // the course codes themselves
type Lod = 'far' | 'mid' | 'near';

function lodOf(zoom: number): Lod {
  if (zoom >= LOD_COURSE_CODES) return 'near';
  if (zoom >= LOD_MAJOR_NAMES) return 'mid';
  return 'far';
}

interface View { x: number; y: number; zoom: number }

// What of the constellation the player has actually met. One object,
// computed once per render from the same predicates the card list uses.
interface Reveal {
  clusters: Set<string>;  // buildingId
  tier2: Set<string>;     // major prefix
  tier3: Set<string>;     // major prefix
  crowns: Set<string>;    // graduate program id
}

function computeReveal(s: GameState): Reveal {
  const genEdComplete = isGenEdComplete(s);
  const revealedGrad = revealedGraduatePrograms(s);
  const reveal: Reveal = { clusters: new Set(), tier2: new Set(), tier3: new Set(), crowns: revealedGrad };
  const profByBuilding = new Map(professionalSchools().map((p) => [p.buildingId, p.id]));

  for (const cluster of CONSTELLATION.clusters) {
    if (cluster.kind === 'core') {
      reveal.clusters.add(cluster.buildingId); // the root, visible from week one
      continue;
    }
    if (cluster.kind === 'professional') {
      // Medicine and Law reveal on their own BUILDING being done, not
      // merely on the academic gate that makes it buildable — see
      // curriculumData.ts's revealedGraduatePrograms.
      const programId = profByBuilding.get(cluster.buildingId);
      if (programId && revealedGrad.has(programId)) reveal.clusters.add(cluster.buildingId);
      continue;
    }
    if (!genEdComplete) continue; // every major's tier-1 waits on the shared core
    reveal.clusters.add(cluster.buildingId);
    const built = s.tech.find((t) => t.id === cluster.buildingId)?.status === 'done';
    for (const major of cluster.majors) {
      if (built) reveal.tier2.add(major.prefix);
      if (s.milestones[`program-established:${major.prefix}`]) reveal.tier3.add(major.prefix);
    }
  }
  return reveal;
}

// Break a name across at most three lines so it sits inside its own hub
// disc. Greedy by word and by the width the disc actually has — a hub is
// a circle, so this is the chord across it at the middle, not its
// diameter. A word longer than a line is left to overflow rather than
// hyphenated: there is no such name in the catalogue, and a broken one
// would read worse than a wide one.
const CHAR_WIDTH_RATIO = 0.55;
function wrapLabel(name: string, radius: number, fontSize: number): string[] {
  const maxChars = Math.max(6, Math.floor((radius * 1.7) / (fontSize * CHAR_WIDTH_RATIO)));
  const lines: string[] = [];
  let line = '';
  for (const word of name.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

// A course code ("FINA 210") set on two lines — department over number,
// the way the design draws it. On an arc there is more tangential room
// than radial, but not enough of it for eight characters at a size worth
// reading, and the split is how the eye finds a department anyway.
function CourseLabel({ node, t }: { node: CourseNode; t: Buildable }) {
  const { code } = courseCodeAndTitle(t);
  const [dept, num] = code.split(' ');
  const size = node.labelSize;
  return (
    <text className="constellation-code" x={node.label.x} y={node.label.y} fontSize={size}>
      <tspan x={node.label.x} dy={num ? -size * 0.12 : size * 0.34}>{dept}</tspan>
      {num && <tspan x={node.label.x} dy={size * 0.92}>{num}</tspan>}
    </text>
  );
}

// One course. The path is precomputed (see constellationLayout.ts); what
// is decided here is only which of the five states it wears, whether it
// answers a click, and — while it is developing — how much of its own
// segment is filled in.
function CourseShape({
  s, act, node, lookup, lod, onHover, onLeave,
}: {
  s: GameState;
  act: (a: Action) => void;
  node: CourseNode;
  lookup: Map<string, Buildable>;
  lod: Lod;
  onHover: (id: string, rect: DOMRect) => void;
  onLeave: (id: string) => void;
}) {
  const t = lookup.get(node.id);
  if (!t) return null;
  const state = cellState(s, t);
  const available = state === 'available';
  const missingFaculty = !!(t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty));
  const showGateDot = missingFaculty && state !== 'developing' && state !== 'done';

  const weeksLeft = s.developing[t.id] ?? 0;
  const elapsed = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;
  // The developing fill is the same segment re-cut short — a wedge of a
  // disc, a shorter arc of a ring. Never a full turn: at f = 1 the two
  // endpoints coincide and the arc would collapse to nothing.
  const fill = state === 'developing' && elapsed > 0
    ? arcPath(
      node.sweep.center, node.sweep.inner, node.sweep.outer, node.sweep.a0,
      node.sweep.a0 + (node.sweep.a1 - node.sweep.a0) * Math.min(elapsed, 0.999),
    )
    : null;

  return (
    // The state rides the GROUP, not the path, because a course's colour
    // has to reach its own code as well as its shape — a brass-filled arc
    // needs a cream label on it, and a locked one a faded label.
    <g className={`constellation-node-group ${state}${t.graduateProgram ? ' graduate' : ''}`}>
      <path
        className="constellation-node"
        d={node.d}
        tabIndex={available ? 0 : undefined}
        role={available ? 'button' : undefined}
        onPointerEnter={(e) => onHover(node.id, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => onLeave(node.id)}
        onFocus={(e) => onHover(node.id, e.currentTarget.getBoundingClientRect())}
        onBlur={() => onLeave(node.id)}
        onClick={() => available && act({ type: 'START_DEVELOPMENT', nodeId: node.id })}
        onKeyDown={(e) => {
          if (!available || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          act({ type: 'START_DEVELOPMENT', nodeId: node.id });
        }}
      >
        <title>{t.name}</title>
      </path>
      {fill && <path className="constellation-node-fill" d={fill} />}
      {showGateDot && <circle className="constellation-gate-dot" cx={node.center.x} cy={node.center.y - node.labelSize * 1.5} r={3} />}
      {lod === 'near' && <CourseLabel node={node} t={t} />}
    </g>
  );
}

// A major's wheel: its tier-1 hub disc always, then whichever of its two
// rings the player has earned the sight of.
function MajorGroup({
  s, act, major, lookup, reveal, lod, onHover, onLeave, onFocusMajor,
}: {
  s: GameState;
  act: (a: Action) => void;
  major: MajorWheel;
  lookup: Map<string, Buildable>;
  reveal: Reveal;
  lod: Lod;
  onHover: (id: string, rect: DOMRect) => void;
  onLeave: (id: string) => void;
  onFocusMajor: (major: MajorWheel) => void;
}) {
  const shape = (node: CourseNode) => (
    <CourseShape key={node.id} s={s} act={act} node={node} lookup={lookup} lod={lod} onHover={onHover} onLeave={onLeave} />
  );
  return (
    <g>
      {reveal.tier3.has(major.prefix) && major.tier3.map(shape)}
      {reveal.tier2.has(major.prefix) && major.tier2.map(shape)}
      {shape(major.tier1)}
      {lod !== 'far' && (
        <text
          className="constellation-major-label"
          x={major.label.x}
          y={major.label.y}
          fontSize={major.labelSize}
          transform={`rotate(${major.labelRotation} ${major.label.x} ${major.label.y})`}
          onClick={() => onFocusMajor(major)}
        >
          {major.name}
        </text>
      )}
    </g>
  );
}

// A cluster's hub: the school's own building, drawn as the disc everything
// else in the cluster hangs off. It wears the building's own progress —
// pending, under construction, standing — rather than a course's five
// states, because that is what it is. Clicking it flies the camera to the
// school, which is the only navigation the constellation needs: the
// school's actual COURSE LIST opens from its building on the campus map
// (see SchoolCurriculumPanel.tsx), where a building is already the thing
// you click to ask about a school.
function ClusterHub({ s, cluster, lod, onFocus }: { s: GameState; cluster: Cluster; lod: Lod; onFocus: () => void }) {
  const building = s.tech.find((t) => t.id === cluster.buildingId);
  const phase = building?.status === 'done' ? 'built' : building?.status === 'developing' ? 'building' : 'pending';
  // A donor's `name` overwrite always arrives with `donorSurname` (see
  // eventData.ts's 'naming-rights' event), so its presence is what
  // distinguishes "the hall was renamed" from the seeded name — read it
  // straight through, exactly as the card list's heading does.
  const name = building?.donorSurname ? building.name : cluster.name;
  const lines = wrapLabel(name, cluster.hubRadius, SCHOOL_LABEL_SIZE);
  const top = -((lines.length - 1) / 2) * SCHOOL_LABEL_SIZE * 1.1;

  return (
    <g className={`constellation-hub ${cluster.kind} ${phase}`} onClick={onFocus} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus(); } }}
    >
      <title>{name} — click to centre the view on it</title>
      <circle cx={cluster.center.x} cy={cluster.center.y} r={cluster.hubRadius} />
      {lod === 'far' ? (
        // Too far out for the hub to hold a word. The name stands off the
        // cluster instead, at a fixed size on screen (see --cz), so the
        // whole university still reads as nine named places rather than
        // nine anonymous rosettes.
        <text
          className="constellation-far-label"
          x={cluster.farLabel.x}
          y={cluster.farLabel.y}
          textAnchor={cluster.farLabelAnchor}
        >
          {name}
        </text>
      ) : (
        <text className="constellation-hub-name" x={cluster.center.x} y={cluster.center.y} fontSize={SCHOOL_LABEL_SIZE}>
          {lines.map((line, i) => (
            <tspan key={line} x={cluster.center.x} dy={i === 0 ? top + SCHOOL_LABEL_SIZE * 0.34 : SCHOOL_LABEL_SIZE * 1.1}>
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  );
}

// The one hover card in the constellation, moved to whichever shape the
// pointer is over — rather than four hundred hidden ones, which is what
// the card list can afford and this cannot. Measured after its first paint
// (it lays out while still invisible) and then placed in viewport
// coordinates by the same tooltipPosition the card list uses.
//
// Rendered into document.body rather than into the canvas, because the
// canvas is a LAYER: it sits under the chrome (see `.curriculum-screen`'s
// z-index against `.app`'s), which is what keeps the toolbar over it — and
// which would equally put the toolbar over a card raised near the bottom
// of the screen. A portal takes it out of that layer entirely, so it is
// always on top of everything, wherever on the canvas it was raised.
function NodeTooltip({ s, t, lookup, anchor }: { s: GameState; t: Buildable; lookup: Map<string, Buildable>; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TooltipPos | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos(tooltipPosition(anchor, el.offsetWidth, el.offsetHeight));
  }, [anchor, t.id]);
  return createPortal(
    <div
      ref={ref}
      className={`course-tooltip constellation-tooltip${pos ? ' shown' : ''}`}
      role="tooltip"
      style={pos ? { position: 'fixed', top: pos.top, left: pos.left } : undefined}
    >
      <CourseTooltipBody s={s} t={t} lookup={lookup} />
    </div>,
    document.body,
  );
}

export default function CurriculumConstellation({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const viewRef = useRef<View>({ x: 0, y: 0, zoom: 1 });
  const flightRef = useRef<number | null>(null);
  // A mousedown that never travels far enough is a click on whatever is
  // under it; one that does is a pan, and the click it would otherwise
  // become is swallowed (see consumePanClick) so dragging across a course
  // never starts it by accident.
  const dragRef = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const panClickRef = useRef(false);

  const [lod, setLod] = useState<Lod>('far');
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);

  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  const reveal = computeReveal(s);
  // What the fit button frames depends only on WHICH clusters are out, so
  // that — not the whole reveal object, which is new on every render — is
  // what it re-binds on.
  const revealedKey = [...reveal.clusters].join('|');

  const applyView = useCallback((next: View) => {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom));
    viewRef.current = { x: next.x, y: next.y, zoom };
    worldRef.current?.setAttribute('transform', `translate(${next.x} ${next.y}) scale(${zoom})`);
    // The current scale, published to CSS. Everything inside the world <g>
    // is drawn in world units and shrinks with it, which is right for a
    // course arc and wrong for the label that names a whole school — so
    // that one label divides by this and comes out the same size on screen
    // at every zoom. Set here, imperatively, for the same reason the
    // transform is: it must not cost a React render per frame.
    svgRef.current?.style.setProperty('--cz', String(zoom));
    setLod((cur) => {
      const wanted = lodOf(zoom);
      return cur === wanted ? cur : wanted;
    });
  }, []);

  const cancelFlight = useCallback(() => {
    if (flightRef.current !== null) cancelAnimationFrame(flightRef.current);
    flightRef.current = null;
  }, []);

  // The view that puts `center` in the middle of the canvas with a circle
  // of `radius` filling most of it.
  const viewFor = useCallback((center: Point, radius: number): View | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const zoom = Math.min(
      MAX_FOCUS_ZOOM,
      Math.max(MIN_ZOOM, (Math.min(rect.width, rect.height) * FOCUS_FILL) / (radius * 2)),
    );
    return { x: rect.width / 2 - center.x * zoom, y: rect.height / 2 - center.y * zoom, zoom };
  }, []);

  const flyTo = useCallback((center: Point, radius: number) => {
    const target = viewFor(center, radius);
    if (!target) return;
    cancelFlight();
    const from = { ...viewRef.current };
    const start = performance.now();
    const step = (now: number) => {
      const raw = Math.min(1, (now - start) / FLIGHT_MS);
      const k = 1 - (1 - raw) ** 3; // ease-out: leaves quickly, arrives gently
      applyView({
        x: from.x + (target.x - from.x) * k,
        y: from.y + (target.y - from.y) * k,
        // Zoom interpolates geometrically — a linear ramp between two
        // scales rushes the far half of the move and crawls the near one.
        zoom: from.zoom * (target.zoom / from.zoom) ** k,
      });
      flightRef.current = raw < 1 ? requestAnimationFrame(step) : null;
    };
    flightRef.current = requestAnimationFrame(step);
  }, [applyView, cancelFlight, viewFor]);

  // The opening view frames WHAT IS REVEALED rather than the whole
  // catalogue: in the first year that is the gen-ed core alone, and a
  // camera pulled back far enough to hold nine schools would show it as a
  // speck in an empty field, most of which is a curriculum the player has
  // no way of knowing exists. Only ever applied on mount and on the fit
  // button — a reveal mid-session must not move a camera the player has
  // placed by hand.
  const fitRevealed = useCallback((animate: boolean) => {
    const visible = CONSTELLATION.clusters.filter((c) => reveal.clusters.has(c.buildingId));
    const extent = visible.length > 0
      ? Math.max(...visible.map((c) => Math.hypot(c.center.x, c.center.y) + c.radius))
      : CONSTELLATION.extent;
    if (animate) flyTo({ x: 0, y: 0 }, extent);
    else {
      const target = viewFor({ x: 0, y: 0 }, extent);
      if (target) applyView(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyView, flyTo, viewFor, revealedKey]);

  // Frame the constellation once the canvas has a real size. Resizing the
  // window afterwards deliberately leaves the player's own pan/zoom alone,
  // same as the campus map.
  useEffect(() => {
    fitRevealed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => cancelFlight, [cancelFlight]);

  // --- panning ---
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD) {
        d.moved = true;
        svgRef.current?.classList.add('panning');
        setHover(null); // a card anchored to a shape that is moving is a lie
      }
      if (d.moved) applyView({ x: d.view.x + dx, y: d.view.y + dy, zoom: viewRef.current.zoom });
    }
    function onUp() {
      const d = dragRef.current;
      if (!d) return;
      panClickRef.current = d.moved;
      dragRef.current = null;
      svgRef.current?.classList.remove('panning');
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [applyView]);

  // True exactly once after a drag that actually panned, so the click the
  // browser fires at the end of it is spent here rather than on a course.
  const consumePanClick = () => {
    if (!panClickRef.current) return false;
    panClickRef.current = false;
    return true;
  };

  const onMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    cancelFlight();
    dragRef.current = { x: e.clientX, y: e.clientY, view: { ...viewRef.current }, moved: false };
  };

  // Zoom about the POINTER, not the canvas middle: find the world point
  // under the cursor, then solve the translate that keeps it there.
  const onWheel = (e: ReactWheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    cancelFlight();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const cur = viewRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * Math.exp(-e.deltaY * ZOOM_SPEED)));
    if (next === cur.zoom) return;
    applyView({ x: px - ((px - cur.x) / cur.zoom) * next, y: py - ((py - cur.y) / cur.zoom) * next, zoom: next });
  };

  // The zoom buttons work on the canvas middle, since there is no pointer
  // position to anchor to.
  const zoomBy = (factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    cancelFlight();
    const cur = viewRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cur.zoom * factor));
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    applyView({ x: cx - ((cx - cur.x) / cur.zoom) * next, y: cy - ((cy - cur.y) / cur.zoom) * next, zoom: next });
  };

  const focusCluster = (cluster: Cluster) => {
    if (consumePanClick()) return;
    setHover(null);
    flyTo(cluster.center, cluster.radius);
  };
  const focusMajor = (major: MajorWheel) => {
    if (consumePanClick()) return;
    setHover(null);
    flyTo(major.center, major.radius);
  };

  const onHover = (id: string, rect: DOMRect) => setHover({ id, rect });
  const onLeave = (id: string) => setHover((cur) => (cur?.id === id ? null : cur));

  const hovered = hover ? lookup.get(hover.id) : undefined;
  const visibleClusters = CONSTELLATION.clusters.filter((c) => reveal.clusters.has(c.buildingId));

  return (
    <div className="constellation">
      <svg
        ref={svgRef}
        className="constellation-svg"
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        role="img"
        aria-label="The curriculum, drawn as a constellation of schools and majors"
      >
        <g ref={worldRef}>
          {/* Tethers from the gen-ed core out to each revealed cluster —
              the prereq every major's entry course actually has, drawn. */}
          {visibleClusters.filter((c) => c.kind !== 'core').map((cluster) => (
            <line
              key={`tether-${cluster.buildingId}`}
              className="constellation-tether"
              x1={0} y1={0} x2={cluster.center.x} y2={cluster.center.y}
            />
          ))}

          {visibleClusters.map((cluster) => (
            <g key={cluster.buildingId} className={`constellation-cluster ${cluster.kind}`}>
              {cluster.spokes.map((spoke, i) => (
                <line key={i} className="constellation-spoke" x1={spoke.x1} y1={spoke.y1} x2={spoke.x2} y2={spoke.y2} />
              ))}

              {cluster.crown && reveal.crowns.has(cluster.crown.id) && (
                <g>
                  {cluster.crown.courses.map((node) => (
                    <CourseShape key={node.id} s={s} act={act} node={node} lookup={lookup} lod={lod} onHover={onHover} onLeave={onLeave} />
                  ))}
                  {lod !== 'far' && (
                    <text
                      className="constellation-crown-label"
                      x={cluster.crown.label.x}
                      y={cluster.crown.label.y}
                      fontSize={cluster.crown.labelSize}
                    >
                      {cluster.crown.name} · {cluster.crown.degree}
                    </text>
                  )}
                </g>
              )}

              {cluster.majors.map((major) => (
                <MajorGroup
                  key={major.prefix}
                  s={s} act={act} major={major} lookup={lookup} reveal={reveal} lod={lod}
                  onHover={onHover} onLeave={onLeave} onFocusMajor={focusMajor}
                />
              ))}

              {cluster.ownCourses.map((node) => (
                <CourseShape key={node.id} s={s} act={act} node={node} lookup={lookup} lod={lod} onHover={onHover} onLeave={onLeave} />
              ))}

              <ClusterHub s={s} cluster={cluster} lod={lod} onFocus={() => focusCluster(cluster)} />
            </g>
          ))}
        </g>
      </svg>

      {hovered && hover && <NodeTooltip s={s} t={hovered} lookup={lookup} anchor={hover.rect} />}

      <div className="constellation-controls">
        <HelpHint
          align="end"
          text="The whole curriculum, drawn. The gen-ed core sits at the centre — every major's entry course waits on all six of it. Each school is a hub with its six majors ringed around it, and each major is a wheel: its entry course at the middle, its four tier-2 courses as the inner ring, its four tier-3 courses as the outer one, so reading outward is reading up the prereq chain. A graduate program appears as a further ring around its school; Medicine and Law stand as clusters of their own once their buildings do. Rings stay hidden until the tier inside them is earned, exactly as before. Click a course to start developing it — hover for its full entry. Click a school hub or a major's name to fly the camera to it. Drag to pan, scroll to zoom, and use ⤢ to frame everything you have revealed. A school's full course list opens from its building on the campus map."
        />
        <button type="button" onClick={() => zoomBy(ZOOM_BUTTON_STEP)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(1 / ZOOM_BUTTON_STEP)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => fitRevealed(true)} aria-label="Frame the whole constellation">⤢</button>
      </div>
    </div>
  );
}
