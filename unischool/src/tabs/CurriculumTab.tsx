import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { discoverySchools, graduateGateMet, graduatePrograms, professionalSchools } from '../data/techData';
import {
  canStartDevelopment, facultyGate, eligibleInstructors, assignedInstructor,
  isUnstaffed, facultyLoad, developAllPlan,
} from '../systems/techtree/techSystem';
import { facultyQualityTier } from '../data/facultyData';
import { gradeFor, qualityOf, tierOf, type Grade } from '../data/courseQuality';
import {
  averageCourseQuality, courseQuality, facultyLoads, type FacultyLoads,
} from '../systems/faculty/facultyAssignment';
import HelpHint from '../components/HelpHint';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import { ProgressRing } from '../components/Progress';
import type { Faculty } from '../state/types';

// ---------------------------------------------------------------------
// Progressive discovery: the curriculum is not laid out whole. What's
// visible is derived purely from existing unlock/milestone state — no new
// gating, just a different read of it:
//   - The gen-ed core is the only thing revealed at the very start — it's
//     the true root of the tree now (see techData.ts: every major's
//     tier-1 requires the whole core, not just its own school). It stays
//     in the pool for good; General Studies has no majors, so it has
//     nothing further of its own to reveal.
//   - Once the gen-ed core is complete, every major's tier-1 joins the
//     ungrouped POOL. A major's tier-1 then sits there until its school
//     is built (all that school's tier-1s done).
//   - Once a school is built, its courses leave the pool and form a
//     labeled section: completed tier-1s + newly-visible tier-2s, shared
//     across majors that haven't completed their tier-2 quartet yet.
//   - Once a major's tier-2 quartet is complete (the existing
//     `program-established:<prefix>` milestone), that major splits into its
//     own labeled sub-group within the section, and its tier-3s appear
//     there — the same event, per the task.
//   - Once a GRADUATE PROGRAM's parent-school gate opens (see
//     techData.ts's graduateGateMet — five of six majors complete for a
//     professional school, a finished lab for a doctorate), the MBA and
//     each PhD doctorate appear as one more labeled sub-group inside their
//     home school's section, marked as the higher tier they are and
//     captioned with the gate they just cleared — unchanged from before.
//   - Medicine and Law are different: they award an external professional
//     degree rather than building on their parent school's own subject
//     matter, so each stands as its OWN top-level section (own heading, own
//     completion ring, own building), structurally parallel to an
//     undergraduate school rather than a sub-group inside one. Their
//     section reveals once their OWN building is done — the same boolean
//     an undergraduate school section reveals on — not merely once the
//     academic gate that makes the building buildable is met. Reveal, not
//     scarcity: before the building is done there is no Med/Law section on
//     screen at all, in the same way there is no wall of tier-3 courses
//     before a major completes.
// A course, once revealed, is never hidden again — only its cell state
// (locked/available/developing/done) changes as the underlying Buildable
// status does. "Locked" here means revealed-but-blocked (a faculty gate or
// a cross-major prereq bridge still unmet), never "not yet discovered".
// ---------------------------------------------------------------------

// Ring sizes: the catalogue's own completion is the panel's headline
// figure; a school card carries its own, one level down.
const CATALOG_RING_SIZE = 46;
const SCHOOL_CARD_RING_SIZE = 44;

// A sub-group inside a school section: a completed major (its own tier-3
// catalogue now visible) or a revealed graduate program. `graduate` is set
// only for the latter, and carries the two things a graduate group has to
// say that a major does not — which credential it awards, and which gate
// it cleared to appear at all.
export interface DiscoverySubgroup {
  key: string;
  label: string;
  courseIds: string[];
  graduate?: { degree: string; gate: string };
}

export interface DiscoverySection {
  key: string;
  label: string | null; // null = the top-level ungrouped pool
  // The section head's full title. "School of {label}" for every school
  // that hasn't sold its naming rights; the donor's full display text
  // verbatim once it has (see buildSections below and eventData.ts's
  // 'naming-rights' event). '' for the pool, which has no head.
  heading: string;
  courseIds: string[];
  subgroups: DiscoverySubgroup[];
  // Every course id this school will ever own (all tiers of all its
  // majors), whether revealed yet or not — the denominator of the
  // section head's completion ring. Empty for the pool, which has no
  // head and must not advertise a total (see the pool's comment below).
  schoolCourseIds: string[];
}

// The gen-ed core (General Studies' coreIds — no other school has any) is
// the shared prereq gating every major's tier-1 (see techData.ts). Whether
// it's complete decides both what joins the pool and what the pool caption
// below says, so it's computed once and threaded through.
function isGenEdComplete(s: GameState): boolean {
  const coreIds = discoverySchools().flatMap((school) => school.coreIds);
  return coreIds.length > 0 && coreIds.every((id) => s.tech.find((t) => t.id === id)?.status === 'done');
}

// Which graduate programs are currently revealed — the one reading the
// whole graduate half of this view runs on. Two readings, matching how
// each program is gated in the engine (see techSystem.ts's
// meetsUnlockGates):
//   - a program with no building of its own (the MBA, each PhD doctorate)
//     reveals the moment techData.ts's graduateGateMet is true — the same
//     predicate that unlocks its courses, so the tab can never show one the
//     engine has not opened, or hide one it has.
//   - a program WITH a building (Medicine, Law) reveals only once that
//     building is 'done' — graduateGateMet being true only makes the
//     building itself buildable (see meetsUnlockGates), the same
//     distinction an undergraduate school section already draws between
//     "tier-1s done" and "school built".
function revealedGraduatePrograms(s: GameState): Set<string> {
  const revealed = new Set<string>();
  for (const program of graduatePrograms()) {
    if (program.buildingId) {
      if (s.tech.find((t) => t.id === program.buildingId)?.status === 'done') revealed.add(program.id);
    } else if (graduateGateMet(s, program.id)) {
      revealed.add(program.id);
    }
  }
  return revealed;
}

function buildSections(s: GameState, genEdComplete: boolean, revealedGrad: Set<string>): DiscoverySection[] {
  const findBuilding = (id: string) => s.tech.find((t) => t.id === id);
  const coreIds: string[] = [];
  const looseTier1Ids: string[] = [];
  const sections: DiscoverySection[] = [];

  for (const school of discoverySchools()) {
    coreIds.push(...school.coreIds); // gen-ed core (General Studies only) — never leaves the pool

    if (school.majors.length === 0) continue; // nothing further to discover (General Studies has no majors)
    if (!genEdComplete) continue; // every major's tier-1 waits on the shared gen-ed core

    const building = findBuilding(school.buildingId);
    const schoolBuilt = building?.status === 'done';
    if (!schoolBuilt) {
      for (const major of school.majors) looseTier1Ids.push(major.tier1Id);
      continue;
    }

    const sharedIds: string[] = [];
    const subgroups: DiscoverySubgroup[] = [];
    for (const major of school.majors) {
      const programEstablished = !!s.milestones[`program-established:${major.prefix}`];
      if (programEstablished) {
        subgroups.push({
          key: major.prefix,
          label: major.name,
          courseIds: [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids],
        });
      } else {
        sharedIds.push(major.tier1Id, ...major.tier2Ids);
      }
    }
    // Graduate programs come last inside the section, after every major,
    // because that is where they sit in the climb.
    const gradIds: string[] = [];
    for (const program of school.graduate) {
      if (!revealedGrad.has(program.id)) continue;
      gradIds.push(...program.courseIds);
      subgroups.push({
        key: program.id,
        label: program.name,
        courseIds: program.courseIds,
        graduate: { degree: program.degree, gate: program.gate },
      });
    }

    // A donor's `name` overwrite is only ever applied alongside
    // `donorSurname` (see eventData.ts's 'naming-rights' event), so its
    // presence is what distinguishes "the seeded building name changed" from
    // "the school was renamed" — read it straight through rather than
    // re-wrapping it as "School of X".
    const heading = building?.donorSurname ? building.name : `School of ${school.name}`;

    sections.push({
      key: school.buildingId,
      label: school.name,
      heading,
      courseIds: sharedIds,
      subgroups,
      // A school's completion ring counts its graduate programs only once
      // they are revealed. Counting them earlier would put a medical
      // school in the denominator of a Health Science ring years before
      // the player has any way of knowing one exists — the same leak the
      // pool's missing "x / 42" avoids.
      schoolCourseIds: [...school.majors.flatMap((m) => [m.tier1Id, ...m.tier2Ids, ...m.tier3Ids]), ...gradIds],
    });
  }

  // The pool is deliberately ordered core-first, then the loose tier-1s
  // SORTED BY COURSE CODE rather than left in seed order. Seed order walks
  // school by school, which quietly clustered each school's six entry
  // courses into adjacent cells — a structural hint the progressive-
  // discovery design does not intend to give away this early. Sorting by
  // the code the player can already read on the face of the cell scatters
  // those neighbours and adds nothing that wasn't already on screen.
  const poolIds = [...coreIds, ...looseTier1Ids.sort((a, b) => a.localeCompare(b))];

  // Medicine and Law, each its own top-level section — structurally
  // parallel to an undergraduate school section above (own heading, own
  // ring, its own building as the section key), never a sub-group of
  // Health Science or Social Sciences & Humanities. Appended last, after
  // every undergraduate school, the same place graduate sub-groups sit
  // inside a school section. Gated on revealedGrad, which for these two
  // (see revealedGraduatePrograms above) means their OWN building is
  // 'done' — not merely that the academic gate making it buildable is
  // met, so there is no section on screen at all until the building
  // stands. No naming-rights read here: unlike an undergraduate school
  // building, BLDG-MED/BLDG-LAW are deliberately excluded from the
  // naming-rights event's donor pool (see eventData.ts), so `heading` is
  // always the seeded program name.
  for (const program of professionalSchools()) {
    if (!revealedGrad.has(program.id)) continue;
    sections.push({
      key: program.buildingId,
      label: program.name,
      heading: program.name,
      courseIds: program.courseIds,
      subgroups: [],
      schoolCourseIds: program.courseIds,
    });
  }

  return [{ key: 'pool', label: null, heading: '', courseIds: poolIds, subgroups: [], schoolCourseIds: [] }, ...sections];
}

// The same section list buildSections computes for this tab's own render,
// exposed for anything else that needs a school/professional-school's
// completion without re-deriving genEdComplete/revealedGrad itself — the
// campus map's building info popover, in particular (see CampusMap.tsx).
// Each section's `key` is the Buildable id of the building it belongs to
// (a school's buildingId, or MED/LAW's), so a caller with only a placed
// building's id can find its section with a plain lookup. General Studies
// has no section of its own (see buildSections above — it has no majors),
// so a caller needing its completion falls back to discoverySchools()'s
// own coreIds directly.
export function discoverySections(s: GameState): DiscoverySection[] {
  const genEdComplete = isGenEdComplete(s);
  const revealedGrad = revealedGraduatePrograms(s);
  return buildSections(s, genEdComplete, revealedGrad);
}

// Every course id currently rendered somewhere on this tab — the pool, every
// school section, and every subgroup inside one — regardless of that
// course's own status. This is the curriculum alert badge's definition of
// "visible" (see types.ts's SeenState): a course counts as new the instant
// it's REVEALED, whether it arrives already 'available' (a freshly-unlocked
// tier-1, once gen-ed clears) or still 'locked' pending its own prereqs (a
// tier-2 sharing a brand-new school section with a tier-1 that isn't done
// yet) — both are a cell appearing on screen where there was none before,
// which is the moment there's something new to notice.
export function visibleCourseIds(s: GameState): string[] {
  const ids: string[] = [];
  for (const section of discoverySections(s)) {
    ids.push(...section.courseIds);
    for (const sub of section.subgroups) ids.push(...sub.courseIds);
  }
  return ids;
}

// =====================================================================
// THE MAP'S OWN SHAPE: schools, and the lanes inside them.
//
// A second reading of the SAME revealed set the sections above compute —
// never a second set of reveal rules. `visibleCourseIds` stays the one
// answer to "has the player met this course yet"; all this does is regroup
// what it returns from flat pools into the structure the catalogue
// actually has: school -> major -> tier.
//
// WHY LANES RATHER THAN A GRAPH. The curriculum is a total hierarchy with
// a sparse graph laid over it. 42 majors of exactly nine courses in a
// fixed 1/4/4 shape means the tier chain is ~336 edges every one of which
// says the same thing, while the ~50 authored CROSS_MAJOR_BRIDGES are the
// only interesting ones. Drawing them all spends the whole visual budget
// on the boring 336 and buries the 50 — and shrinks the node to a dot,
// which is what undid full course names last time. So the regular
// structure is carried by POSITION (three bands, left to right, with a
// chevron between) and drawn with zero lines, and an edge is only ever
// drawn for a bridge, on demand.
// =====================================================================

interface MajorLane {
  key: string;
  name: string;
  tier1: string[];
  tier2: string[];
  tier3: string[];
  // Set only for a graduate program, which is a lane like any other but
  // has two things a major does not: the credential it awards, and the
  // gate it cleared to appear at all.
  graduate?: { degree: string; gate: string };
}

interface SchoolView {
  key: string;         // the school building's Buildable id
  heading: string;
  label: string;
  schoolCourseIds: string[];
  lanes: MajorLane[];
}

// Every revealed school, with its majors as lanes. Built by intersecting
// each major's authored tiers with the revealed set, so a major that has
// not established yet simply shows an empty tier-3 band rather than being
// grouped differently — the progression reads as one lane filling up,
// left to right, instead of a course jumping between sections when its
// major completes.
function schoolViews(s: GameState, sections: DiscoverySection[]): SchoolView[] {
  const revealed = new Set(visibleCourseIds(s));
  const keep = (ids: string[]) => ids.filter((id) => revealed.has(id));
  const schools = new Map(discoverySchools().map((school) => [school.buildingId, school]));
  const professional = new Map(professionalSchools().map((program) => [program.buildingId, program]));

  const views: SchoolView[] = [];
  for (const section of sections) {
    if (section.label === null) continue; // the ungrouped pool has no lanes

    const school = schools.get(section.key);
    if (school) {
      const lanes: MajorLane[] = [];
      for (const major of school.majors) {
        const tier1 = keep([major.tier1Id]);
        const tier2 = keep(major.tier2Ids);
        const tier3 = keep(major.tier3Ids);
        if (tier1.length + tier2.length + tier3.length === 0) continue;
        lanes.push({ key: major.prefix, name: major.name, tier1, tier2, tier3 });
      }
      // Graduate programs come last inside a school, where they sit in the
      // climb. Their courses have no tier ladder of their own, so the
      // whole program rides in the tier-2 band: one row of cards, which is
      // what it is.
      for (const program of school.graduate) {
        const ids = keep(program.courseIds);
        if (ids.length === 0) continue;
        lanes.push({
          key: program.id,
          name: program.name,
          tier1: [],
          tier2: ids,
          tier3: [],
          graduate: { degree: program.degree, gate: program.gate },
        });
      }
      views.push({ key: section.key, heading: section.heading, label: section.label, schoolCourseIds: section.schoolCourseIds, lanes });
      continue;
    }

    // Medicine and Law: their own top-level school, one lane.
    const program = professional.get(section.key);
    if (program) {
      const ids = keep(program.courseIds);
      views.push({
        key: section.key,
        heading: section.heading,
        label: section.label,
        schoolCourseIds: section.schoolCourseIds,
        lanes: ids.length === 0 ? [] : [{
          key: program.id,
          name: program.name,
          tier1: [],
          tier2: ids,
          tier3: [],
          graduate: { degree: program.degree, gate: 'its own building' },
        }],
      });
    }
  }
  return views;
}

// Which school a course belongs to, so search results and a bridge badge
// can say where a course lives and navigate straight to it. Derived from
// the seed, memoized — the catalogue is static.
let courseSchoolMap: Map<string, { buildingId: string; school: string }> | null = null;
function courseSchools(): Map<string, { buildingId: string; school: string }> {
  if (courseSchoolMap) return courseSchoolMap;
  const map = new Map<string, { buildingId: string; school: string }>();
  for (const school of discoverySchools()) {
    const entry = { buildingId: school.buildingId, school: school.name };
    for (const id of school.coreIds) map.set(id, entry);
    for (const major of school.majors) {
      for (const id of [major.tier1Id, ...major.tier2Ids, ...major.tier3Ids]) map.set(id, entry);
    }
    for (const program of school.graduate) {
      for (const id of program.courseIds) map.set(id, entry);
    }
  }
  for (const program of professionalSchools()) {
    const entry = { buildingId: program.buildingId, school: program.name };
    for (const id of program.courseIds) map.set(id, entry);
  }
  courseSchoolMap = map;
  return map;
}

// The cross-major prereqs of a course: prereqs that are THEMSELVES COURSES
// and come from a different major. Read off the course's own prereqs rather
// than CROSS_MAJOR_BRIDGES directly, so a bridge authored anywhere still
// shows up.
//
// The course check is not defensive tidying — prereqs cross KINDS as well
// as majors (docs/architecture/buildables.md), so a tier-3 course
// routinely requires its major's LAB. `LAB-CHEM` trivially has a different
// id prefix from `CHEM230`, so a prefix test alone calls a building a
// cross-listed course and offers to navigate to it, which the map cannot
// do and the player would not want: the lab is something you BUILD, not
// somewhere you go in the catalogue.
function crossMajorPrereqs(t: Buildable, lookup: Map<string, Buildable>): string[] {
  const prefix = t.id.replace(/[0-9]+$/, '');
  return t.prereqs.filter((id) => {
    if (lookup.get(id)?.kind !== 'course') return false;
    return id.replace(/[0-9]+$/, '') !== prefix;
  });
}

type CellState = 'locked' | 'blocked' | 'available' | 'developing' | 'done';

function cellState(s: GameState, t: Buildable): CellState {
  if (t.status === 'done') return 'done';
  if (t.status === 'developing') return 'developing';
  if (t.status === 'locked') return 'locked';
  return canStartDevelopment(s, t) ? 'available' : 'blocked';
}

// The grade chip. One component for a course's own grade and for an
// aggregate (a major's, a school's), because they are the same claim at
// different scales and must read identically — a school showing "B" means
// its courses average a B, not something else that happens to look alike.
//
// The letter carries the meaning and the tint is only a cue: colour alone
// would be unreadable to a colour-blind player, and unreadable at the
// zoomed-out sizes the curriculum map will want, so the letter never drops.
export function GradeChip({ grade, title, size = 'sm' }: { grade: Grade; title?: string; size?: 'sm' | 'lg' }) {
  return (
    <span className={`grade-chip grade-${grade.toLowerCase()} ${size}`} title={title}>
      {grade}
    </span>
  );
}

// An aggregate grade across a set of courses, or nothing when none of them
// are graded yet. What a school section head and a major subgroup show —
// and, once the curriculum map lands, what its university-level view is
// built from.
function AggregateGrade({ s, ids, label, loads }: { s: GameState; ids: string[]; label: string; loads: FacultyLoads }) {
  const avg = averageCourseQuality(s, ids, loads);
  if (avg === null) return null;
  return <GradeChip grade={gradeFor(avg)} title={`${label} averages ${Math.round(avg)} / 100 across its developed courses`} />;
}

// One course cell: its code (e.g. "FINA 101") over its title, filling
// brass when done and pulsing while developing. Clicking it opens the
// course drawer (see CourseDrawer below). The code is split into
// department and number so a wall of forty-odd codes reads as a column of
// departments with a number attached, rather than eight undifferentiated
// characters.
//
// THERE IS NO HOVER CARD. There used to be, and it carried everything a
// course had to say — description, prereqs, the faculty gate, cost,
// instructor — because hovering was the only way to learn any of it. The
// drawer is that now, and better: it holds the same facts plus the
// decision they are there to inform, it stays put while you read it, and
// it does not cover the neighbouring cells you are scanning. A hover card
// repeating a strict subset of an open panel is not a shortcut, it is a
// second answer to the same question.
//
// So the cell carries only what has to be legible WITHOUT clicking, at a
// glance, across a whole screen of cells: state (by fill), progress (the
// bar on a developing course), an unstaffed marker, and a dot for a
// course whose field has no free slot (see the legend under the panel
// head). Everything else is one click away.
//
// The dot is a neutral marker, NOT the field's initial: same-field cells
// lighting up together with a letter on them would draw the eye to
// clusters that correlate with school membership the pool is not meant to
// reveal yet.
function CourseCell({ s, t, selected, onSelect, loads }: { s: GameState; t: Buildable; selected: boolean; onSelect: (id: string) => void; loads: FacultyLoads }) {
  const state = cellState(s, t);
  // A course's stored name is "CODE · Title" (see techData). The cell used
  // to show only the code, which meant reading the catalogue was a matter of
  // hovering each cell in turn to find out what it actually taught. The card
  // leads with the TITLE and keeps the code as an eyebrow above it — the
  // code still identifies the course, it just stops being the only thing on
  // offer at a glance.
  const [code, titleFromName] = t.name.split(' · ');
  const title = titleFromName ?? code;
  // Not just "is the field full" but "would waiting help" — see
  // techSystem.ts's facultyGate.
  const gate = t.requiresFaculty ? facultyGate(s, t.requiresFaculty) : 'open';
  // An offered course whose instructor has left (see types.ts's
  // CourseFaculty) — marked on the cell because it is a thing the player
  // must fix, and they should not have to open a course to discover it.
  const unstaffed = isUnstaffed(s, t);
  // Only an offered, staffed course carries a grade: an undeveloped one is
  // an empty slot in the catalogue rather than a failing course, and an
  // unstaffed one is not being taught at all (see courseQuality).
  const quality = courseQuality(s, t, loads);
  // The gate is only news while the course is still ahead of the player:
  // a developing or finished course already holds its slot.
  const showGateDot = gate !== 'open' && state !== 'developing' && state !== 'done';

  const weeksLeft = s.developing[t.id] ?? 0;
  const elapsed = t.duration > 0 ? (t.duration - weeksLeft) / t.duration : 1;

  return (
    <button
      type="button"
      className={`course-cell ${state}${t.graduateProgram ? ' graduate' : ''}${unstaffed ? ' unstaffed' : ''}${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(t.id)}
    >
      <span className="cell-code">{code}</span>
      <span className="cell-title">{title}</span>
      {/* The grade replaces the done-tick: a graded course is self-evidently
          developed, and two marks in one corner competing for the same
          glance is one mark too many. */}
      {quality && <GradeChip grade={quality.grade} title={`Quality ${Math.round(quality.score)} / 100`} />}
      {state === 'done' && !quality && !unstaffed && <span className="cell-stamp" aria-hidden="true">✓</span>}
      {unstaffed && <span className="cell-stamp unstaffed" title="No instructor">!</span>}
      {/* Two colours, two actions. Yellow: the department is full but
          somebody is listed, so this is one appointment away. Red: full and
          nobody to appoint, so only time fixes it. */}
      {showGateDot && (
        <span
          className={`cell-gate-dot ${gate}`}
          aria-hidden="true"
          title={gate === 'hireable'
            ? `No free ${t.requiresFaculty} slot — a candidate is on the market`
            : `No free ${t.requiresFaculty} slot, and nobody on the market`}
        />
      )}
      {state === 'developing' && (
        <span className="cell-progress" aria-hidden="true">
          <span className="cell-progress-fill" style={{ width: `${Math.round(elapsed * 100)}%` }} />
        </span>
      )}
    </button>
  );
}

function CellGrid({ s, ids, lookup, selectedId, onSelect, loads }: { s: GameState; ids: string[]; lookup: Map<string, Buildable>; selectedId: string | null; onSelect: (id: string) => void; loads: FacultyLoads }) {
  return (
    <div className="cell-grid">
      {ids.map((id) => {
        const t = lookup.get(id);
        return t ? <CourseCell key={id} s={s} t={t} selected={selectedId === id} onSelect={onSelect} loads={loads} /> : null;
      })}
    </div>
  );
}

// ---------------------------------------------------------------------
// THE COURSE DRAWER, and the decision it exists for.
//
// Clicking a course no longer starts it. It opens this, and the drawer
// leads with the question the old build never asked: WHO TEACHES IT.
// Before, development auto-assigned nobody in particular — the engine
// tracked only per-field slot capacity, and the name under a cell was a
// round-robin computed on read. Now the player picks, the pick is stored
// (see types.ts's CourseFaculty), and it is editable for the life of the
// course.
//
// Four cases, and the last two are the reason this is a panel rather than
// a confirm dialog:
//
//   1. SEVERAL eligible. A list, strongest teacher first, each a real
//      person — portrait, rank, teaching, current load. The player chooses.
//   2. EXACTLY ONE eligible. Pre-selected, one button. Frictionless, as it
//      should be — but never silent: the player still learns who it is,
//      because they will want to know in five years when the grade is bad.
//   3. NOBODY free, but the department EXISTS. The old build showed a dot
//      on a cell and left the player to work out what to do. Here the
//      people who are full are listed by name with their loads, because
//      "Dr. Iyer is teaching 2 of 2" is the actual information — it says
//      reassign, or hire, rather than just "no".
//   4. NOBODY at all. The hire happens HERE, from the standing market, in
//      the course's own field. And when the market is empty in that field
//      this says so plainly, because that is real information too (a
//      thin-market specialist turns up only every few months — see
//      facultyData.ts's churn block), and it tells the player to wait and
//      watch rather than hunt for a button that does not exist.
// ---------------------------------------------------------------------

// One selectable person. Deliberately the same furniture the Faculty tab
// uses for a roster card — portrait, name, rank badge — so a professor
// reads as the same professor in both places, plus the two things that
// matter HERE and nowhere else: how good a teacher they are, and how
// loaded they already are.
function InstructorOption(
  { s, f, selected, disabled = false, projectedFor, onPick }:
  { s: GameState; f: Faculty; selected: boolean; disabled?: boolean; projectedFor?: Buildable; onPick?: () => void },
) {
  const load = facultyLoad(s, f.id);
  // WHAT THIS COURSE WOULD BE GRADED if they took it — the single most
  // useful thing on the card, and the reason the picker is a list of
  // people rather than a dropdown of names. Comparing "teaching 71" with
  // "teaching 64" is abstract; comparing a B with a C is the actual
  // consequence, and it already folds in what their existing load and this
  // course's tier will do to it.
  //
  // Costs nothing to compute speculatively: qualityOf is pure arithmetic
  // on four numbers (see data/courseQuality.ts). The load passed is what
  // theirs WOULD become — their current count plus this course, unless
  // they already teach it.
  const projected = projectedFor
    ? qualityOf({
      teaching: f.teaching,
      acclaim: f.acclaim,
      load: s.courseFaculty[projectedFor.id] === f.id ? load : load + 1,
      slots: f.courseSlots,
      tier: tierOf(projectedFor.id),
    })
    : null;
  return (
    <button
      type="button"
      className={`instructor-option${selected ? ' selected' : ''}${disabled ? ' full' : ''}`}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onPick}
    >
      <FacultyPortrait f={portraitOf(f)} size={34} />
      <span className="instructor-option-body">
        <span className="instructor-option-name">{f.name}</span>
        <span className="instructor-option-meta">
          {facultyQualityTier(f)} · {f.field}
        </span>
        <span className="instructor-option-bars">
          <span className="instructor-stat" title={`Teaching ${f.teaching} of a possible ${f.teachingPotential}`}>
            <span className="instructor-stat-label">Teaching</span>
            <span className="instructor-bar-track">
              <span className="instructor-bar-headroom" style={{ width: `${f.teachingPotential}%` }} />
              <span className="instructor-bar-fill" style={{ width: `${f.teaching}%` }} />
            </span>
            <span className="instructor-stat-value">{f.teaching}</span>
          </span>
        </span>
      </span>
      <span className="instructor-option-right">
        {projected && (
          <GradeChip
            grade={projected.grade}
            title={`This course would be graded ${projected.grade} (${Math.round(projected.score)} / 100) with them`}
          />
        )}
        <span className={`instructor-option-load${load >= f.courseSlots ? ' full' : ''}`}>
          {load} / {f.courseSlots}
          <span className="instructor-load-label">courses</span>
        </span>
      </span>
    </button>
  );
}

function CourseDrawer(
  { s, act, t, lookup, onClose, loads, onGoToCourse }:
  {
    s: GameState; act: (a: Action) => void; t: Buildable; lookup: Map<string, Buildable>;
    onClose: () => void; loads: FacultyLoads; onGoToCourse: (id: string) => void;
  },
) {
  const state = cellState(s, t);
  const offered = t.status === 'developing' || t.status === 'done';
  const instructor = assignedInstructor(s, t);
  const unstaffed = isUnstaffed(s, t);
  const quality = courseQuality(s, t, loads);
  const bridges = crossMajorPrereqs(t, lookup);

  // For an offered course the current instructor must stay eligible for
  // their own course (see techSystem.ts's eligibleInstructors `except`),
  // or a full professor would read as unable to go on teaching what they
  // already teach.
  const eligible = eligibleInstructors(s, t, offered ? t.id : undefined);
  const inField = t.requiresFaculty ? s.faculty.filter((f) => f.field === t.requiresFaculty) : [];
  const marketInField = t.requiresFaculty ? s.candidates.filter((c) => c.field === t.requiresFaculty) : [];

  // The pick resets whenever the course changes, and defaults to the
  // current instructor for an offered course or the strongest eligible
  // teacher for a new one — which is what makes the one-candidate case a
  // single click rather than a click to choose and a click to confirm.
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { setPicked(null); }, [t.id]);
  const chosen = picked ?? instructor?.id ?? eligible[0]?.id ?? null;

  const [code, titleFromName] = t.name.split(' · ');
  const title = titleFromName ?? code;
  const weeksLeft = s.developing[t.id] ?? 0;
  const shortfall = t.cost - s.finance.cash;

  function develop() {
    if (chosen) act({ type: 'START_DEVELOPMENT', nodeId: t.id, facultyId: chosen });
  }
  function reassign() {
    if (chosen && chosen !== instructor?.id) act({ type: 'REASSIGN_COURSE_FACULTY', courseId: t.id, facultyId: chosen });
  }

  return (
    <aside className="course-drawer" aria-label={`${title} detail`}>
      <div className="course-drawer-head">
        <div>
          <span className="course-drawer-code">{code}</span>
          <h3>{title}</h3>
        </div>
        <button type="button" className="course-drawer-close" onClick={onClose} aria-label="Close course detail">✕</button>
      </div>

      <div className="course-drawer-body">
        <p className="course-drawer-desc">{t.description}</p>

        <dl className="course-drawer-facts">
          <div><dt>Cost</dt><dd>${t.cost.toLocaleString()}</dd></div>
          <div><dt>Duration</dt><dd>{t.duration} weeks</dd></div>
          <div><dt>Department</dt><dd>{t.requiresFaculty ?? '—'}</dd></div>
          {state === 'developing' && <div><dt>Remaining</dt><dd>{weeksLeft} weeks</dd></div>}
        </dl>

        {/* THE GRADE, ITEMIZED. A letter on its own tells the player
            nothing they can act on; the factors tell them exactly what to
            do — move a course off this professor, or put a stronger one on
            the capstone. Every line names something they decided. */}
        {quality && (
          <section className="course-drawer-section">
            <h4>Quality</h4>
            <div className="course-drawer-grade">
              <GradeChip grade={quality.grade} size="lg" />
              <div className="course-drawer-grade-body">
                <span className="course-drawer-grade-score">{Math.round(quality.score)} / 100</span>
                <ul className="course-drawer-factors">
                  {quality.factors.map((factor) => (
                    <li key={factor.label} className={factor.value < 0 ? 'down' : 'up'}>
                      <span>{factor.label}</span>
                      <span className="num">{factor.value > 0 ? '+' : '−'}{Math.abs(Math.round(factor.value))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {t.prereqs.length > 0 && (
          <section className="course-drawer-section">
            <h4>Prerequisites</h4>
            {/* EVERY PREREQUISITE IS A DOOR. Clicking one goes there —
                opens its school, selects it, and clears any filter in the
                way. This is the map's most useful move and the reason
                cross-major bridges are not drawn as lines: the prerequisite
                that matters is almost always one the player cannot
                currently see, and a line to an offscreen node is worth
                nothing next to arriving at it.

                A bridge (a prereq from another major — see
                crossMajorPrereqs) is marked, because "this course needs
                something from another school" is the genuinely surprising
                fact in a catalogue whose other 336 prereq edges all say
                the same thing. */}
            <ul className="course-drawer-prereqs">
              {t.prereqs.map((id) => {
                const p = lookup.get(id);
                const met = p?.status === 'done';
                const bridge = bridges.includes(id);
                // Only a course is somewhere to go. A prereq of another
                // kind — a school building, a lab — is something to build,
                // so it is stated rather than offered as a door that leads
                // nowhere this view can show.
                if (p?.kind !== 'course') {
                  return (
                    <li key={id} className={met ? 'met' : 'unmet'}>
                      <span className="prereq-static">
                        {met ? '✓' : '✗'} {p?.name ?? id}
                        <span className="prereq-bridge" title="Built on the campus map, not developed here">build</span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={id} className={met ? 'met' : 'unmet'}>
                    <button type="button" className="prereq-link" onClick={() => onGoToCourse(id)}>
                      {met ? '✓' : '✗'} {p.name}
                      {bridge && <span className="prereq-bridge" title="A prerequisite from another program">cross-listed</span>}
                      <span className="prereq-go" aria-hidden="true">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {t.requiresFaculty && (
          <section className="course-drawer-section">
            <h4>{offered ? 'Instructor' : 'Choose an instructor'}</h4>

            {unstaffed && (
              <p className="course-drawer-warning">
                This course has no instructor and is not being taught. Assign someone to restore it.
              </p>
            )}

            {/* CASE 1 & 2: somebody can take it. */}
            {eligible.length > 0 && (
              <>
                <div className="instructor-options">
                  {eligible.map((f) => (
                    <InstructorOption
                      key={f.id}
                      s={s}
                      f={f}
                      selected={chosen === f.id}
                      projectedFor={t}
                      onPick={() => setPicked(f.id)}
                    />
                  ))}
                </div>

                {state === 'available' && (
                  <button type="button" className="course-drawer-action" disabled={!chosen || !canStartDevelopment(s, t, chosen)} onClick={develop}>
                    {chosen
                      ? `Develop with ${eligible.find((f) => f.id === chosen)?.name ?? 'selected faculty'}`
                      : 'Develop'}
                  </button>
                )}
                {offered && (
                  <button type="button" className="course-drawer-action" disabled={!chosen || chosen === instructor?.id} onClick={reassign}>
                    {chosen && chosen !== instructor?.id ? 'Move this course to them' : 'Currently assigned'}
                  </button>
                )}
              </>
            )}

            {/* CASE 3: the department exists but everyone is full. Naming
                who, and how loaded, is what turns a refusal into a choice
                between reassigning and hiring. */}
            {eligible.length === 0 && inField.length > 0 && (
              <>
                <p className="course-drawer-note">
                  Every {t.requiresFaculty} professor is at capacity. Free a slot by moving one of their
                  courses, or appoint someone new.
                </p>
                <div className="instructor-options">
                  {inField.map((f) => <InstructorOption key={f.id} s={s} f={f} selected={false} disabled />)}
                </div>
              </>
            )}

            {/* CASE 4: nobody in the department at all. The hire happens
                here rather than in a separate explanation of the problem. */}
            {eligible.length === 0 && inField.length === 0 && (
              <p className="course-drawer-note">
                The university has no {t.requiresFaculty} faculty. Appoint someone to open this course.
              </p>
            )}

            {eligible.length === 0 && (
              <div className="course-drawer-hire">
                <h5>On the market in {t.requiresFaculty}</h5>
                {marketInField.length === 0 ? (
                  <p className="course-drawer-note quiet">
                    No {t.requiresFaculty} candidates are listed this week. The market turns over
                    constantly — check back.
                  </p>
                ) : (
                  marketInField.map((c) => (
                    <div key={c.id} className="course-drawer-candidate">
                      <InstructorOption s={s} f={c} selected={false} projectedFor={t} />
                      <button
                        type="button"
                        className="course-drawer-appoint"
                        onClick={() => act({ type: 'HIRE_FACULTY', facultyId: c.id })}
                      >
                        Appoint · ${Math.round(c.salary).toLocaleString()}/yr
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )}

        {state === 'blocked' && shortfall > 0 && (
          <p className="course-drawer-warning">${Math.ceil(shortfall).toLocaleString()} short of the development cost.</p>
        )}
        {state === 'locked' && (
          <p className="course-drawer-note quiet">Locked until its prerequisites are complete.</p>
        )}
      </div>
    </aside>
  );
}

// =====================================================================
// LEVEL 1 — THE UNIVERSITY. One card per school.
//
// The view that did not exist in any form before, and the direct answer to
// "look at a school and see its strengths and weaknesses": breadth as a
// completion ring, quality as a grade, side by side, so a school can
// visibly be one without the other.
// =====================================================================
function SchoolCard(
  { s, view, loads, onOpen }:
  { s: GameState; view: SchoolView; loads: FacultyLoads; onOpen: () => void },
) {
  const done = completion(s, view.schoolCourseIds);
  const avg = averageCourseQuality(s, view.schoolCourseIds, loads);
  const majors = view.lanes.filter((lane) => !lane.graduate).length;
  const grad = view.lanes.filter((lane) => lane.graduate).length;

  return (
    <button type="button" className="school-card" onClick={onOpen}>
      <span className="school-card-head">
        <span className="school-card-name">{view.heading}</span>
        {avg !== null && <GradeChip grade={gradeFor(avg)} title={`Averages ${Math.round(avg)} / 100 across its developed courses`} />}
      </span>
      <span className="school-card-body">
        <ProgressRing
          fraction={done.fraction}
          size={SCHOOL_CARD_RING_SIZE}
          center={`${Math.round(done.fraction * 100)}%`}
          title={`${done.done} of ${done.total} courses developed`}
        />
        <span className="school-card-stats">
          <span className="school-card-count">{done.done} / {done.total}</span>
          <span className="school-card-sub">courses developed</span>
          <span className="school-card-sub">
            {majors} {majors === 1 ? 'program' : 'programs'}
            {grad > 0 && ` · ${grad} graduate`}
          </span>
        </span>
      </span>
    </button>
  );
}

// =====================================================================
// LEVEL 2 — ONE SCHOOL. Its majors as lanes.
//
// T1 leads at full width because it is the gateway and the course the
// player acts on first; T2 and T3 follow as bands. The chevron between
// bands replaces sixteen prereq lines per major and says the same thing
// more clearly. An empty band is drawn as a rule rather than omitted, so
// a lane's shape stays constant as it fills and the eye can compare
// majors down the column.
// =====================================================================
function TierBand(
  { s, ids, lookup, selectedId, onSelect, loads, tier, empty }:
  {
    s: GameState; ids: string[]; lookup: Map<string, Buildable>; selectedId: string | null;
    onSelect: (id: string) => void; loads: FacultyLoads; tier: 'tier1' | 'tier2' | 'tier3'; empty: string;
  },
) {
  if (ids.length === 0) return <div className={`tier-band ${tier} empty`}><span>{empty}</span></div>;
  return (
    <div className={`tier-band ${tier}`}>
      {ids.map((id) => {
        const t = lookup.get(id);
        return t ? <CourseCell key={id} s={s} t={t} selected={selectedId === id} onSelect={onSelect} loads={loads} /> : null;
      })}
    </div>
  );
}

function Lane(
  { s, lane, lookup, selectedId, onSelect, loads }:
  {
    s: GameState; lane: MajorLane; lookup: Map<string, Buildable>;
    selectedId: string | null; onSelect: (id: string) => void; loads: FacultyLoads;
  },
) {
  const ids = [...lane.tier1, ...lane.tier2, ...lane.tier3];
  const avg = averageCourseQuality(s, ids, loads);
  const done = completion(s, ids);

  return (
    <section className={`lane${lane.graduate ? ' graduate' : ''}`}>
      <header className="lane-head">
        <h4>{lane.name}</h4>
        {lane.graduate && <span className="subgroup-degree">{lane.graduate.degree}</span>}
        {avg !== null && <GradeChip grade={gradeFor(avg)} title={`${lane.name} averages ${Math.round(avg)} / 100`} />}
        <span className="lane-count">{done.done} / {done.total}</span>
      </header>
      {lane.graduate ? (
        <div className="lane-bands graduate">
          <TierBand s={s} ids={lane.tier2} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} tier="tier2" empty="" />
        </div>
      ) : (
        <div className="lane-bands">
          <TierBand s={s} ids={lane.tier1} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} tier="tier1" empty="—" />
          <span className="lane-chevron" aria-hidden="true">›</span>
          <TierBand s={s} ids={lane.tier2} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} tier="tier2" empty="Opens with the entry course" />
          <span className="lane-chevron" aria-hidden="true">›</span>
          <TierBand s={s} ids={lane.tier3} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} tier="tier3" empty="Opens when the program is established" />
        </div>
      )}
    </section>
  );
}

// =====================================================================
// FINDING THINGS IN 421 COURSES.
//
// Progressive discovery already does the heavy lifting — a player only
// ever sees what they have unlocked — but a mature catalogue is still
// hundreds of cards across eight schools, and the two questions that get
// hard are "where is X" and "what needs my attention".
//
// Both are answered by the same mechanism: a filter turns the map into a
// WORKLIST — one flat, cross-school list of exactly what matched. That is
// deliberately not a dimming pass over the lanes. "Show me everything at D
// or below" is a to-do list, and a to-do list spread across eight screens
// with the irrelevant items greyed out is not one. When nothing is
// filtered, the map is the map.
// =====================================================================

type StatusFilter = 'all' | 'available' | 'developing' | 'done' | 'unstaffed';
type GradeFilter = 'all' | 'weak';

const WEAK_GRADES = new Set<Grade>(['D', 'F']);

interface Filters {
  query: string;
  status: StatusFilter;
  grade: GradeFilter;
}

const NO_FILTERS: Filters = { query: '', status: 'all', grade: 'all' };

function filtersActive(f: Filters): boolean {
  return f.query.trim() !== '' || f.status !== 'all' || f.grade !== 'all';
}

function matchesFilters(s: GameState, t: Buildable, f: Filters, loads: FacultyLoads): boolean {
  const query = f.query.trim().toLowerCase();
  if (query !== '' && !t.name.toLowerCase().includes(query)) return false;

  if (f.status !== 'all') {
    if (f.status === 'unstaffed') {
      if (!isUnstaffed(s, t)) return false;
    } else if (cellState(s, t) !== f.status) return false;
  }

  if (f.grade === 'weak') {
    const q = courseQuality(s, t, loads);
    // An unstaffed course belongs in the improvement worklist too: it is
    // the most broken thing a course can be, and it has no grade to match
    // on, so it is admitted explicitly rather than filtered out for
    // lacking the very letter that would qualify it.
    if (!q) return isUnstaffed(s, t);
    if (!WEAK_GRADES.has(q.grade)) return false;
  }
  return true;
}

function FilterBar(
  { filters, onChange, resultCount }:
  { filters: Filters; onChange: (f: Filters) => void; resultCount: number | null },
) {
  return (
    <div className="curriculum-filters">
      <input
        id="curriculum-search"
        type="search"
        className="curriculum-search"
        placeholder="Search courses…"
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
      />
      <select
        id="curriculum-status"
        className="curriculum-select"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as StatusFilter })}
      >
        <option value="all">Any status</option>
        <option value="available">Ready to start</option>
        <option value="developing">In development</option>
        <option value="done">Developed</option>
        <option value="unstaffed">Unstaffed</option>
      </select>
      <button
        type="button"
        className={`curriculum-chip${filters.grade === 'weak' ? ' on' : ''}`}
        aria-pressed={filters.grade === 'weak'}
        onClick={() => onChange({ ...filters, grade: filters.grade === 'weak' ? 'all' : 'weak' })}
        title="Every developed course graded D or F, plus any left unstaffed"
      >
        Needs attention
      </button>
      {resultCount !== null && (
        <span className="curriculum-result-count">
          {resultCount} {resultCount === 1 ? 'course' : 'courses'}
        </span>
      )}
      {filtersActive(filters) && (
        <button type="button" className="curriculum-chip clear" onClick={() => onChange(NO_FILTERS)}>
          Clear
        </button>
      )}
    </div>
  );
}

// Completion of an arbitrary set of course ids. Used for the catalogue as
// a whole and for one school's own curriculum. Exported so anything else
// showing a school's completion (the campus map's building info popover)
// computes it the exact same way this tab's own rings do, rather than
// re-deriving the done/total logic a second time.
export function completion(s: GameState, ids: string[]): { done: number; total: number; fraction: number } {
  const done = ids.filter((id) => s.tech.find((t) => t.id === id)?.status === 'done').length;
  return { done, total: ids.length, fraction: ids.length > 0 ? done / ids.length : 0 };
}

export default function CurriculumTab(
  { s, act, target, onTargetConsumed }:
  {
    s: GameState; act: (a: Action) => void;
    // A school building id to open on arrival, when the tab was opened
    // FROM something — today the hall's own info panel on the map (see
    // BuildingInfoPanel.tsx). Consumed on arrival and cleared by the
    // caller, so clicking the same hall twice arrives twice.
    target?: string;
    onTargetConsumed?: () => void;
  },
) {
  const revealedGrad = revealedGraduatePrograms(s);
  // The headline ring counts the undergraduate catalogue plus whatever
  // graduate work has been revealed — never the whole seed. A "0 / 421"
  // in year one would announce that thirty-seven courses exist somewhere
  // the player has no way to see, which is precisely what progressive
  // discovery is for.
  const courses = s.tech.filter(
    (t) => t.kind === 'course' && (!t.graduateProgram || revealedGrad.has(t.graduateProgram)),
  );
  const doneCourses = courses.filter((t) => t.status === 'done').length;
  const catalogFraction = courses.length > 0 ? doneCourses / courses.length : 0;
  const catalogPct = Math.round(catalogFraction * 100);

  // What Develop All would start, and what it would cost (see the button
  // below, and techSystem.ts's developAllPlan). Memoised on the state
  // because it walks the whole catalogue, and this header re-renders on
  // every hover in the grid.
  const developAll = useMemo(() => developAllPlan(s), [s]);

  const lookup = new Map(s.tech.map((t) => [t.id, t]));
  // Built ONCE per render and threaded to every cell, every heading and
  // the drawer. Grading is cheap; counting a professor's load is not (see
  // facultyLoads), and a screen of four hundred cells each counting it for
  // itself is the same quadratic that would stall the weekly tick.
  const loads = facultyLoads(s);
  const genEdComplete = isGenEdComplete(s);
  const sections = buildSections(s, genEdComplete, revealedGrad);
  const pool = sections[0];
  const views = schoolViews(s, sections);

  // WHERE THE PLAYER IS. null = the university view (every school at
  // once); a building id = inside that school. The course drawer is the
  // third level and rides on top of either, so selecting a course never
  // costs the player their place.
  const [openSchool, setOpenSchool] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const selected = selectedId ? lookup.get(selectedId) ?? null : null;
  const onSelect = useCallback((id: string) => {
    setSelectedId((cur) => (cur === id ? null : id));
  }, []);

  // Jumping to a course from anywhere: a search result, or a bridge badge
  // naming a prerequisite in another school. This is the single most
  // useful thing the map does — the prerequisite you care about is almost
  // always one you cannot currently see, and a line drawn to an offscreen
  // node is worth nothing next to actually going there.
  const goToCourse = useCallback((id: string) => {
    const home = courseSchools().get(id);
    const revealed = new Set(visibleCourseIds(s));
    // A course still in the ungrouped pool has no school to open yet.
    setOpenSchool(home && revealed.has(id) && !pool.courseIds.includes(id) ? home.buildingId : null);
    setSelectedId(id);
    setFilters(NO_FILTERS);
  }, [s, pool.courseIds]);

  // Arriving with somewhere to be. Deliberately the same three pieces of
  // state goToCourse sets — which school is open, which course is selected,
  // and no filters left over from last time — because "open the tab at this
  // school" and "jump to this course" are the same act of navigation, and a
  // second mechanism would be a second place for them to disagree.
  useEffect(() => {
    if (!target) return;
    setOpenSchool(target);
    setSelectedId(null);
    setFilters(NO_FILTERS);
    onTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const unseenIds = visibleCourseIds(s).filter((id) => !s.seen.courseIds[id]);
  const unseenKey = unseenIds.join('|');
  useEffect(() => {
    if (unseenIds.length > 0) act({ type: 'MARK_SEEN', kind: 'course', ids: unseenIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey]);

  const filtering = filtersActive(filters);
  const matches = filtering
    ? visibleCourseIds(s)
      .map((id) => lookup.get(id))
      .filter((t): t is Buildable => !!t && matchesFilters(s, t, filters, loads))
    : [];

  const school = openSchool ? views.find((v) => v.key === openSchool) ?? null : null;

  return (
    <div className={`tab-content curriculum-layout${selected ? ' with-drawer' : ''}`}>
      <section className="panel curriculum-panel">
        <div className="panel-head">
          <span className="panel-head-title">
            {/* The breadcrumb IS the level indicator: at the university
                view it is a plain title, inside a school it becomes a way
                back. One control, so there is never a "close this view"
                button competing with the tab's own close. */}
            {/* A filter searches the WHOLE catalogue, so while one is on
                the crumb must say so — claiming "School of Engineering"
                over a list drawn from four schools is a straightforward
                lie about where the player is. Leaving the filter restores
                whatever level they were on, which is why openSchool is
                left alone rather than cleared. */}
            {filtering ? (
              <h2 className="curriculum-crumbs">
                <button type="button" className="crumb" onClick={() => setFilters(NO_FILTERS)}>
                  {school ? school.heading : 'The Curriculum'}
                </button>
                <span className="crumb-sep" aria-hidden="true">›</span>
                <span className="crumb-current">Matching courses</span>
              </h2>
            ) : school ? (
              <h2 className="curriculum-crumbs">
                <button type="button" className="crumb" onClick={() => setOpenSchool(null)}>The Curriculum</button>
                <span className="crumb-sep" aria-hidden="true">›</span>
                <span className="crumb-current">{school.heading}</span>
              </h2>
            ) : (
              <h2>The Curriculum</h2>
            )}
            {/* DEVELOP ALL, no longer playtest-only. It routes through the
                same canStartDevelopment every manual click uses, so it
                cannot start anything unaffordable, unstaffable or
                unrevealed, and charges normally for everything it does
                start — there was never a sandbox reason for it, only a
                sandbox habit. The +$1B grant and the Fast speed stay
                gated; they break the game's constraints, this one works
                inside them.

                It says what it is about to do. At a large catalogue the
                bill is substantial and used to be invisible until it had
                been spent, and the count is not simply "everything
                available": each start takes cash and a faculty slot, so
                the sweep runs out of one or the other partway (see
                developAllPlan). */}
            {developAll.ids.length > 0 && (
              <button
                type="button"
                className="develop-all-btn"
                onClick={() => act({ type: 'DEVELOP_ALL_AVAILABLE_COURSES' })}
                title="Starts development on every course the school can currently afford and staff, in catalogue order."
              >
                Develop {developAll.ids.length} · ${developAll.cost.toLocaleString()}
              </button>
            )}
          </span>
          <span className="panel-head-figure">
            <span className="progress-figure">
              <ProgressRing
                fraction={catalogFraction}
                size={CATALOG_RING_SIZE}
                center={`${catalogPct}%`}
                title={`${doneCourses} of ${courses.length} courses developed`}
              />
              <span className="stat">{doneCourses} / {courses.length}<br />developed</span>
            </span>
            <AggregateGrade s={s} ids={courses.map((c) => c.id)} label="The catalogue" loads={loads} />
            <HelpHint
              align="end"
              text={genEdComplete
                ? 'Open a school to see its programs. Every course shows the grade its instructor earns it.'
                : 'The general-education core — every major waits on it. Complete it to unlock every major\'s entry course.'}
            />
          </span>
        </div>

        <FilterBar filters={filters} onChange={setFilters} resultCount={filtering ? matches.length : null} />

        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — the school is running an operating deficit, so nothing can be started until the balance recovers.</p>
        )}

        <div className="curriculum-scroll">
          {/* A filter replaces the map with its results, across every
              school at once (see the worklist note above). */}
          {filtering ? (
            matches.length === 0 ? (
              <p className="empty-note">Nothing matches those filters.</p>
            ) : (
              <div className="worklist">
                {matches.map((t) => {
                  const home = courseSchools().get(t.id);
                  return (
                    <div key={t.id} className="worklist-row">
                      <CourseCell s={s} t={t} selected={selectedId === t.id} onSelect={onSelect} loads={loads} />
                      <span className="worklist-where">{home?.school ?? 'General Studies'}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : school ? (
            // LEVEL 2 — one school, its majors as lanes.
            <div className="school-lanes">
              {school.lanes.length === 0
                ? <p className="empty-note">Nothing revealed in this school yet.</p>
                : school.lanes.map((lane) => (
                  <Lane key={lane.key} s={s} lane={lane} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} />
                ))}
            </div>
          ) : (
            // LEVEL 1 — the university.
            <>
              {pool.courseIds.length > 0 && (
                <div className="discovery-pool">
                  {/* The pool carries no completion indicator on purpose:
                      an "x / 42" here would count majors the player has
                      not met. */}
                  <p className="pool-caption">
                    {genEdComplete
                      ? 'Entry courses, not yet organised by school — complete a school\'s entry courses to raise its building.'
                      : 'The general-education core. Every major waits on it.'}
                  </p>
                  <CellGrid s={s} ids={pool.courseIds} lookup={lookup} selectedId={selectedId} onSelect={onSelect} loads={loads} />
                </div>
              )}
              {views.length > 0 && (
                <div className="school-grid">
                  {views.map((view) => (
                    <SchoolCard key={view.key} s={s} view={view} loads={loads} onOpen={() => setOpenSchool(view.key)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      {selected && (
        <CourseDrawer
          s={s}
          act={act}
          t={selected}
          lookup={lookup}
          onClose={() => setSelectedId(null)}
          loads={loads}
          onGoToCourse={goToCourse}
        />
      )}
    </div>
  );
}
