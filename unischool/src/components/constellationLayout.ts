import {
  GENED_BUILDING_ID, discoverySchools, graduatePrograms, professionalSchools,
} from '../data/techData';

// ---------------------------------------------------------------------
// THE CURRICULUM CONSTELLATION'S GEOMETRY — where every course sits, and
// nothing else. No GameState reaches this file: the layout is a pure
// function of the seed catalogue, computed ONCE at module scope, and the
// view (CurriculumConstellation.tsx) draws whichever parts of it the
// player has revealed.
//
// That "once, from the seed" is the important part, not an optimisation.
// Progressive discovery means courses arrive over decades of game time —
// a school's tier-2 ring when its hall goes up, a graduate crown when its
// gate opens — and a layout derived from what is currently REVEALED would
// re-solve itself every time, sliding whole schools across the canvas the
// moment one of them grew. Solving for the finished catalogue instead and
// hiding the rest means a major sits in the same place in year one as in
// year forty: the shape the player learns is the shape that stays.
//
// The nesting, from the inside out (see the three "zoom out" steps the
// design is drawn as):
//
//   1. A MAJOR is a wheel. Its tier-1 entry course is the hub disc; its
//      four tier-2 courses are the four arcs of the inner ring; its four
//      tier-3 courses are the four arcs of the outer ring. Reading
//      outward IS reading up the prereq chain, which is the one thing the
//      old card list could never show.
//   2. A SCHOOL is a hub disc with its six major wheels in a ring around
//      it, spoked to the middle. A school with a graduate program of its
//      own (the MBA, the three doctorates) wears it as a CROWN — one more
//      ring of arcs outside every major, because that is where it sits in
//      the climb: after the undergraduate catalogue, not inside it.
//   3. The CONSTELLATION is the gen-ed core at the centre — the root every
//      major's tier-1 waits on — with the schools ringed around it.
//      Medicine and Law ride that same ring as clusters of their own
//      rather than as a crown on anyone (they award an external degree and
//      stand as their own building; see techData's GRADUATE_PROGRAMS), and
//      each is seated next to the school it grows out of.
//
// Angles are measured from straight up and increase CLOCKWISE, so slot 0
// of anything is at twelve o'clock — the same reading as the drawing.
// ---------------------------------------------------------------------

// --- a major wheel ---
const T1_RADIUS = 30;          // the hub disc: the major's entry course
const RING_GAP = 5;            // between one ring and the next, world px
const T2_INNER = T1_RADIUS + RING_GAP;
const T2_OUTER = T2_INNER + 25;
const T3_INNER = T2_OUTER + RING_GAP;
const T3_OUTER = T3_INNER + 27;
const MAJOR_RADIUS = T3_OUTER;

// --- a school group ---
const SCHOOL_HUB_RADIUS = 76;
// Six major wheels on a ring, which needs a radius of at least
// MAJOR_RADIUS / sin(pi/6) for them not to touch; the rest is breathing
// room, and the spoke that reads as a spoke rather than a seam.
const MAJOR_ORBIT = 205;
const SCHOOL_CORE_RADIUS = MAJOR_ORBIT + MAJOR_RADIUS;
// The gap between the outermost major wheel and a school's graduate
// crown is wide enough to seat the majors' own NAMES in it: a name sits
// just outboard of the wheel it belongs to, which puts it between the
// wheels and the crown rather than across either.
const MAJOR_LABEL_ORBIT = SCHOOL_CORE_RADIUS + 14;
const CROWN_GAP = 40;
const CROWN_INNER = SCHOOL_CORE_RADIUS + CROWN_GAP;
const CROWN_OUTER = CROWN_INNER + 30;
// Every school is allotted the same envelope whether it has a crown or
// not, so the constellation's own ring stays even and a school does not
// shuffle its neighbours along on the day its doctorate opens.
const SCHOOL_RADIUS = CROWN_OUTER;
// A school with no crown still has to frame its majors' names, which sit
// outside the wheels themselves.
const SCHOOL_PLAIN_RADIUS = MAJOR_LABEL_ORBIT + 24;

// --- a professional school (Medicine, Law) ---
// Eight to twelve courses and no majors, so its own rings are drawn
// fatter than a major's: sized to sit legibly beside a six-major school
// rather than to a scale of its own.
const PROF_HUB_RADIUS = 70;
const PROF_RING1_INNER = PROF_HUB_RADIUS + 12;
const PROF_RING1_OUTER = PROF_RING1_INNER + 48;
const PROF_RING2_INNER = PROF_RING1_OUTER + 10;
const PROF_RING2_OUTER = PROF_RING2_INNER + 48;
const PROF_RADIUS = PROF_RING2_OUTER;

// --- the gen-ed core at the centre ---
const CORE_HUB_RADIUS = 96;
const CORE_RING_INNER = CORE_HUB_RADIUS + 10;
const CORE_RING_OUTER = CORE_RING_INNER + 46;
const CORE_RADIUS = CORE_RING_OUTER;

// How far outside its own envelope a cluster's name sits when the camera
// is too far out for the name to fit in its hub (see the far level of
// detail in CurriculumConstellation.tsx).
const FAR_LABEL_GAP = 64;

// How far the schools ring sits from the gen-ed core. Two clusters at
// adjacent slots are 2 * ORBIT * sin(pi/slots) apart, which at nine slots
// has to clear two full school envelopes with room to spare.
const SCHOOL_ORBIT = 1200;

// The visual gap between one arc and the next, in WORLD px rather than
// degrees: an arc ring at radius 47 and a crown at radius 330 should look
// like they are cut with the same blade, which a fixed angular gap does
// not give (it would be four times wider on the crown).
const ARC_GAP_PX = 7;

// Label type sizes, in world units — they scale with the view like
// everything else, and CurriculumConstellation's level-of-detail rules
// decide at which zooms each is drawn at all.
const COURSE_LABEL_SIZE = 11;
const CROWN_LABEL_SIZE = 15;
const CORE_LABEL_SIZE = 15;
const MAJOR_LABEL_SIZE = 20;
export const SCHOOL_LABEL_SIZE = 18;

export type NodeTier = 'core' | 'tier1' | 'tier2' | 'tier3' | 'grad';

export interface Point { x: number; y: number }

// One course, drawn. Either the disc at a wheel's hub (a major's tier-1)
// or a segment of one of its rings; `d` is the finished SVG path either
// way, so the view never does trigonometry of its own.
export interface CourseNode {
  id: string;            // the Buildable id — the only handle the view needs
  tier: NodeTier;
  shape: 'disc' | 'arc';
  d: string;
  // Where the course code goes, and how much room it has. `width` is the
  // tangential room at the label's own radius, which is what decides
  // whether a code fits on one line or has to break.
  label: Point;
  labelWidth: number;
  labelSize: number;
  center: Point;         // for the camera, and for a disc, its middle
  radius: number;        // a disc's radius; an arc's ring thickness
  // The polar span the shape was cut from, kept so the view can re-cut a
  // shorter one: a developing course fills its own segment as it runs, the
  // same figure the card list draws as a bar along the bottom of a cell.
  // A disc is expressed as the full turn of a ring with no hole.
  sweep: { center: Point; inner: number; outer: number; a0: number; a1: number };
}

export interface MajorWheel {
  prefix: string;
  name: string;
  center: Point;         // world coordinates
  radius: number;
  tier1: CourseNode;
  tier2: CourseNode[];
  tier3: CourseNode[];
  label: Point;          // the major's name, outboard of its own wheel
  // Degrees to turn that name by so it lies ALONG the ring rather than
  // across it. A horizontal name at three o'clock would run straight
  // through the graduate crown outside it; a tangential one never leaves
  // the gap it was seated in. Flipped past the horizon so no name on the
  // lower half of a school reads upside down.
  labelRotation: number;
  labelSize: number;
}

// A graduate program worn as a ring around its parent school (the MBA,
// the three doctorates). Medicine and Law are not these — they are
// clusters of their own; see professional clusters below.
export interface GraduateCrown {
  id: string;
  name: string;
  degree: string;
  courses: CourseNode[];
  label: Point;
  labelSize: number;
}

export interface Cluster {
  // The Buildable id of this cluster's own building. Doubles as the
  // camera target's id, as the DiscoverySection key the per-school card
  // list is looked up by (see curriculumData.ts), and as the id of the
  // hub's own Buildable — the three happen to be the same thing, which is
  // what lets a click on a hub open that school's course list.
  buildingId: string;
  kind: 'core' | 'school' | 'professional';
  name: string;
  center: Point;
  radius: number;
  hubRadius: number;
  majors: MajorWheel[];
  crown?: GraduateCrown;
  // A cluster whose courses hang off its OWN hub rather than off majors:
  // the gen-ed core's six, and Medicine's and Law's.
  ownCourses: CourseNode[];
  // Where this cluster's name goes when the camera is too far out for it
  // to fit inside the hub — clear of the cluster's own ring, on the ray
  // out from the constellation's middle. The anchor is what keeps it
  // clear: a centred name on a cluster at three o'clock grows back over
  // the cluster it names, so a name out to the side is anchored at the
  // edge nearest its own cluster and grows AWAY from it. Only a name
  // directly above or below one is centred, where growing sideways runs
  // into nothing.
  farLabel: Point;
  farLabelAnchor: 'start' | 'middle' | 'end';
  // Hub-to-wheel spokes, in world coordinates. Drawn, not inferred, so
  // the view has no geometry to redo.
  spokes: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

export interface ConstellationLayout {
  clusters: Cluster[];   // the gen-ed core first, then the ring, clockwise from noon
  extent: number;        // half-width of the square the whole thing fits in
}

// Polar -> cartesian with zero straight UP and angles increasing
// clockwise, which is how the constellation is read and described.
function polar(center: Point, radius: number, angle: number): Point {
  return { x: center.x + radius * Math.sin(angle), y: center.y - radius * Math.cos(angle) };
}

// The rotation that lays text along the ring at this angle, kept the
// right way up: a label past the horizon is turned through a half-turn so
// it reads left-to-right rather than upside down.
function tangentDegrees(angle: number): number {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  return deg > 90 && deg < 270 ? deg - 180 : deg;
}

// Which end of a cluster's far-out name to pin to the point it was placed
// at, so the name grows away from its own cluster rather than back across
// it. A cluster near noon or six o'clock has nothing either side of its
// name, so it centres.
const FAR_LABEL_SIDE_SIN = 0.35;
function farLabelAnchor(angle: number): 'start' | 'middle' | 'end' {
  const side = Math.sin(angle);
  if (side > FAR_LABEL_SIDE_SIN) return 'start';   // out to the right of the middle
  if (side < -FAR_LABEL_SIDE_SIN) return 'end';    // out to the left
  return 'middle';
}

// One annular sector: the shape every course but a major's tier-1 is
// drawn as. Swept clockwise along the outer edge and back along the
// inner one, which in SVG's y-down space is sweep-flag 1 then 0.
export function arcPath(center: Point, inner: number, outer: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const oStart = polar(center, outer, a0);
  const oEnd = polar(center, outer, a1);
  const iEnd = polar(center, inner, a1);
  const iStart = polar(center, inner, a0);
  return [
    `M${oStart.x.toFixed(2)},${oStart.y.toFixed(2)}`,
    `A${outer},${outer} 0 ${large} 1 ${oEnd.x.toFixed(2)},${oEnd.y.toFixed(2)}`,
    `L${iEnd.x.toFixed(2)},${iEnd.y.toFixed(2)}`,
    `A${inner},${inner} 0 ${large} 0 ${iStart.x.toFixed(2)},${iStart.y.toFixed(2)}`,
    'Z',
  ].join('');
}

// A whole ring of courses, evenly divided, starting at twelve o'clock.
// The gap between segments is subtracted as an ANGLE derived from the
// ring's own mid-radius, so every ring in the constellation is cut with
// the same visual kerf no matter how large it is.
function ringOf(
  ids: string[], center: Point, inner: number, outer: number, tier: NodeTier, labelSize: number,
): CourseNode[] {
  const mid = (inner + outer) / 2;
  const step = (Math.PI * 2) / ids.length;
  const gap = Math.min(ARC_GAP_PX / mid, step * 0.3);
  return ids.map((id, i) => {
    const a0 = i * step + gap / 2;
    const a1 = (i + 1) * step - gap / 2;
    const aMid = (a0 + a1) / 2;
    return {
      id,
      tier,
      shape: 'arc' as const,
      d: arcPath(center, inner, outer, a0, a1),
      label: polar(center, mid, aMid),
      labelWidth: 2 * mid * Math.sin((a1 - a0) / 2),
      labelSize,
      center: polar(center, mid, aMid),
      radius: outer - inner,
      sweep: { center, inner, outer, a0, a1 },
    };
  });
}

function discNode(id: string, center: Point, radius: number, tier: NodeTier, labelSize: number): CourseNode {
  return {
    id,
    tier,
    shape: 'disc',
    d: `M${center.x},${center.y - radius}A${radius},${radius} 0 1 1 ${center.x},${center.y + radius}A${radius},${radius} 0 1 1 ${center.x},${center.y - radius}Z`,
    label: { ...center },
    labelWidth: radius * 1.8,
    labelSize,
    center: { ...center },
    radius,
    sweep: { center, inner: 0, outer: radius, a0: 0, a1: Math.PI * 2 },
  };
}

// Medicine's twelve courses and Law's eight have no tiers to speak of, so
// they are split across two rings by number — the low 5xx entry courses
// inside, the rest outside. Same climb read outward as a major's, without
// pretending to a tier structure the seed does not have.
function splitRings(ids: string[]): [string[], string[]] {
  if (ids.length <= 5) return [ids, []];
  const half = Math.ceil(ids.length / 2);
  return [ids.slice(0, half), ids.slice(half)];
}

function buildClusterCourses(center: Point, ids: string[], tier: NodeTier): CourseNode[] {
  const [innerIds, outerIds] = splitRings(ids);
  const nodes = ringOf(innerIds, center, PROF_RING1_INNER, PROF_RING1_OUTER, tier, COURSE_LABEL_SIZE);
  if (outerIds.length > 0) {
    nodes.push(...ringOf(outerIds, center, PROF_RING2_INNER, PROF_RING2_OUTER, tier, COURSE_LABEL_SIZE));
  }
  return nodes;
}

function buildMajor(
  major: { name: string; prefix: string; tier1Id: string; tier2Ids: string[]; tier3Ids: string[] },
  hub: Point,
  angle: number,
): MajorWheel {
  const center = polar(hub, MAJOR_ORBIT, angle);
  return {
    prefix: major.prefix,
    name: major.name,
    center,
    radius: MAJOR_RADIUS,
    tier1: discNode(major.tier1Id, center, T1_RADIUS, 'tier1', COURSE_LABEL_SIZE),
    tier2: ringOf(major.tier2Ids, center, T2_INNER, T2_OUTER, 'tier2', COURSE_LABEL_SIZE),
    tier3: ringOf(major.tier3Ids, center, T3_INNER, T3_OUTER, 'tier3', COURSE_LABEL_SIZE),
    // Outboard of the wheel, on the same ray the spoke came in on: a
    // label below every wheel would collide with the neighbour below it,
    // where radially outward there is a whole circumference of room.
    label: polar(hub, MAJOR_LABEL_ORBIT, angle),
    labelRotation: tangentDegrees(angle),
    labelSize: MAJOR_LABEL_SIZE,
  };
}

// The constellation's ring, in order, clockwise from noon. The seven
// undergraduate schools in seed order, with Medicine seated straight
// after Health Science and Law straight after Social Sciences &
// Humanities — the schools each actually grows out of (techData's
// homeSchool), so the two professional schools read as neighbours of
// their parent rather than as an appendix bolted onto the end.
function ringOrder(): Array<{ school?: string; professional?: string }> {
  const order: Array<{ school?: string; professional?: string }> = [];
  const profs = professionalSchools();
  const programs = graduatePrograms();
  for (const school of discoverySchools()) {
    if (school.buildingId === GENED_BUILDING_ID) continue; // the centre, not the ring
    order.push({ school: school.name });
    for (const prof of profs) {
      const home = programs.find((p) => p.id === prof.id)?.homeSchool;
      if (home === school.name) order.push({ professional: prof.id });
    }
  }
  return order;
}

function buildLayout(): ConstellationLayout {
  const schools = discoverySchools();
  const profs = professionalSchools();
  const origin: Point = { x: 0, y: 0 };
  const clusters: Cluster[] = [];

  // The gen-ed core, at the middle: the root of the whole tree (every
  // major's tier-1 requires all six of these), so it is what the schools
  // are arranged around rather than one school among them.
  const genEd = schools.find((school) => school.buildingId === GENED_BUILDING_ID);
  clusters.push({
    buildingId: GENED_BUILDING_ID,
    kind: 'core',
    name: genEd?.name ?? 'General Studies',
    center: origin,
    radius: CORE_RADIUS,
    hubRadius: CORE_HUB_RADIUS,
    majors: [],
    ownCourses: ringOf(genEd?.coreIds ?? [], origin, CORE_RING_INNER, CORE_RING_OUTER, 'core', CORE_LABEL_SIZE),
    // Straight below its own ring — the one direction out of the middle
    // of the constellation that is not also a tether to a school.
    farLabel: { x: 0, y: CORE_RADIUS + FAR_LABEL_GAP },
    farLabelAnchor: 'middle',
    spokes: [],
  });

  const order = ringOrder();
  const slot = (Math.PI * 2) / order.length;

  order.forEach((entry, i) => {
    const angle = i * slot;
    const center = polar(origin, SCHOOL_ORBIT, angle);

    if (entry.professional) {
      const prof = profs.find((p) => p.id === entry.professional);
      if (!prof) return;
      clusters.push({
        buildingId: prof.buildingId,
        kind: 'professional',
        name: prof.name,
        center,
        radius: PROF_RADIUS,
        hubRadius: PROF_HUB_RADIUS,
        majors: [],
        ownCourses: buildClusterCourses(center, prof.courseIds, 'grad'),
        farLabel: polar(origin, SCHOOL_ORBIT + PROF_RADIUS + FAR_LABEL_GAP, angle),
        farLabelAnchor: farLabelAnchor(angle),
        spokes: [],
      });
      return;
    }

    const school = schools.find((sc) => sc.name === entry.school);
    if (!school) return;
    const majorSlot = (Math.PI * 2) / school.majors.length;
    const majors = school.majors.map((major, j) => buildMajor(major, center, j * majorSlot));
    // One graduate program per school at most, today. If that ever stops
    // being true the extra ones would stack on the same ring, so take the
    // first and let the rest stay in the school's card list rather than
    // silently drawing two crowns on top of each other.
    const program = school.graduate[0];
    const crown: GraduateCrown | undefined = program && {
      id: program.id,
      name: program.name,
      degree: program.degree,
      courses: ringOf(program.courseIds, center, CROWN_INNER, CROWN_OUTER, 'grad', CROWN_LABEL_SIZE),
      // Seated at the bottom of the crown, clear of the ring's own top
      // where the constellation's spoke comes in.
      label: polar(center, CROWN_OUTER + 26, Math.PI),
      labelSize: MAJOR_LABEL_SIZE,
    };

    clusters.push({
      buildingId: school.buildingId,
      kind: 'school',
      name: school.name,
      center,
      radius: crown ? SCHOOL_RADIUS : SCHOOL_PLAIN_RADIUS,
      hubRadius: SCHOOL_HUB_RADIUS,
      majors,
      crown,
      ownCourses: [],
      farLabel: polar(origin, SCHOOL_ORBIT + SCHOOL_RADIUS + FAR_LABEL_GAP, angle),
      farLabelAnchor: farLabelAnchor(angle),
      spokes: majors.map((major) => {
        const angleToMajor = Math.atan2(major.center.x - center.x, center.y - major.center.y);
        const from = polar(center, SCHOOL_HUB_RADIUS, angleToMajor);
        const to = polar(center, MAJOR_ORBIT - MAJOR_RADIUS, angleToMajor);
        return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
      }),
    });
  });

  // The far labels sit outside every cluster's own ring, so they — not the
  // rings — are what the framing view has to hold.
  const extent = Math.max(
    ...clusters.map((c) => Math.hypot(c.farLabel.x, c.farLabel.y) + FAR_LABEL_GAP),
    ...clusters.map((c) => Math.hypot(c.center.x, c.center.y) + c.radius),
  );
  return { clusters, extent };
}

// Computed once: the catalogue this is solved from is seed data that never
// changes within a run (see the file header on why it is not re-solved as
// courses are revealed).
export const CONSTELLATION: ConstellationLayout = buildLayout();
