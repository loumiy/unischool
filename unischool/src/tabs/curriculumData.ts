import type { GameState } from '../state/types';
import { discoverySchools, graduateGateMet, graduatePrograms, professionalSchools } from '../data/techData';

// ---------------------------------------------------------------------
// WHAT OF THE CURRICULUM IS REVEALED, and how it groups. The one place
// that question is answered, read by all three views that ask it:
//   - the Curriculum tab's constellation (CurriculumConstellation.tsx),
//     which asks it tier by tier — a school hub, a major's tier-2 ring, a
//     graduate crown;
//   - a school's own course list (SchoolCurriculumPanel.tsx), opened from
//     that school's building on the campus map, which asks it as the
//     grouped card list this file's DiscoverySection has always described;
//   - the toolbar's curriculum alert badge, via visibleCourseIds below.
// It was the Curriculum tab's own private derivation until the tab became
// a constellation and the card list moved out to the campus map; nothing
// about the rules below changed in that move.
//
// A note on THE POOL, which survives here but no longer appears on screen
// anywhere. In the card list it was a real thing the player saw: a wall of
// revealed courses belonging to no section yet. The constellation has no
// pool, because in it every course already has a place — a major's tier-1
// disc sits on its own school's ring whether that school's hall is up or
// not. So the pool is now purely a bucket: "revealed, but not yet part of
// any school's own list", which is exactly what the alert badge's
// visibleCourseIds needs and what sectionForBuilding routes around. The
// two views therefore reveal the SAME courses at the same moments and only
// differ in how they group them, which is the property worth keeping.
//
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
export function isGenEdComplete(s: GameState): boolean {
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
export function revealedGraduatePrograms(s: GameState): Set<string> {
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

export function buildSections(s: GameState, genEdComplete: boolean, revealedGrad: Set<string>): DiscoverySection[] {
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

// Completion of an arbitrary set of course ids. Used for the catalogue as
// a whole and for one school's own curriculum. Exported so anything else
// showing a school's completion (the campus map's building info popover)
// computes it the exact same way this tab's own rings do, rather than
// re-deriving the done/total logic a second time.
export function completion(s: GameState, ids: string[]): { done: number; total: number; fraction: number } {
  const done = ids.filter((id) => s.tech.find((t) => t.id === id)?.status === 'done').length;
  return { done, total: ids.length, fraction: ids.length > 0 ? done / ids.length : 0 };
}

// One building's own curriculum, as the card list opened from that
// building on the campus map needs it (see SchoolCurriculumPanel.tsx).
// Ordinarily this is simply that school's own DiscoverySection, looked up
// by the buildingId every section is keyed on — but a building can be
// standing on the map in two states buildSections has no section for, and
// both are worth answering rather than showing an empty panel:
//   - General Studies, which has no majors and so never forms a section at
//     all: its curriculum is the gen-ed core, which is always revealed.
//   - A school (or Medicine/Law) whose hall is still UNDER CONSTRUCTION.
//     Its section appears only once the building is done, but the player
//     can already click the half-built hall, and the honest answer is the
//     tier-1 courses that raised it — not nothing.
// Returns null for a building that owns no curriculum at all.
export function sectionForBuilding(s: GameState, buildingId: string): DiscoverySection | null {
  const existing = discoverySections(s).find((section) => section.key === buildingId);
  if (existing) return existing;

  const building = s.tech.find((t) => t.id === buildingId);
  const school = discoverySchools().find((sc) => sc.buildingId === buildingId);
  if (school) {
    const allIds = school.majors.flatMap((m) => [m.tier1Id, ...m.tier2Ids, ...m.tier3Ids]);
    return {
      key: buildingId,
      label: school.name,
      // Same rule the built sections use: a donor's `name` overwrite only
      // ever arrives with `donorSurname`, so that is what distinguishes a
      // renamed hall from the seeded one.
      heading: building?.donorSurname ? building.name : school.majors.length === 0 ? school.name : `School of ${school.name}`,
      courseIds: school.coreIds.length > 0
        ? school.coreIds
        : isGenEdComplete(s) ? school.majors.map((m) => m.tier1Id) : [],
      subgroups: [],
      schoolCourseIds: school.coreIds.length > 0 ? school.coreIds : allIds,
    };
  }

  const prof = professionalSchools().find((p) => p.buildingId === buildingId);
  if (prof) {
    return {
      key: buildingId,
      label: prof.name,
      heading: prof.name,
      courseIds: [],
      subgroups: [],
      schoolCourseIds: prof.courseIds,
    };
  }
  return null;
}
