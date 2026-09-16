import type { GameState, Buildable, BuildableEffects, Faculty } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { graduateCourseIds, graduateGateMet, graduatePrograms, milestoneSchools } from '../../data/techData';
import { isCelebratedMilestone } from '../../data/eventData';
import { tierOf, type CourseTier } from '../../data/courseQuality';

// ---------------------------------------------------------------------
// The milestone chain (see README's "The milestone chain"). Unlocking
// itself (gen-ed -> tier-1 -> school building -> tier-2 -> tier-3) is pure
// authored prereq data resolved generically by unlockAvailable() below —
// nothing special needed for that. What's left for dedicated logic is the BONUS
// side: "program established" and "further" bonuses aren't a single course's
// own completion effect, they're a reward for an aggregate condition
// (every tier-2, or every tier-3, in a major being done), plus a
// school-wide capstone bonus once every program in a school is distinguished.
// This is deliberately the one place technSystem.ts is course/curriculum-
// aware rather than fully kind-agnostic — milestones are inherently a
// school/major concept, which buildings/dorms/facilities don't have.
// ---------------------------------------------------------------------
// Milestones no longer grant reputation directly — establishing or
// distinguishing a program, or distinguishing a school, raises
// curriculumBreadthScore() in prestigeSystem.ts instead, which lifts the
// prestige *target* that reputation slowly drifts toward. A one-time
// applicant bump for "program established" remains a flow effect on the
// applicant pool, which is not the stock-vs-flow concern this rework
// addresses.
const PROGRAM_ESTABLISHED_APPLICANT_BONUS = 30;
// The same one-time applicant bump an established program gets, and nothing
// else. Larger than a program's because a professional school is a
// genuinely new draw on the pool, but still a FLOW effect on applicants
// (which the summer funnel overwrites wholesale each year anyway), never
// a nudge to prestige — that stays a stock, and a graduate program's real
// payoff is the capped breadth input it lifts (see prestigeSystem.ts).
const GRAD_PROGRAM_COMPLETE_APPLICANT_BONUS = 60;

// Is this Buildable currently OFFERED — i.e. does it hold a faculty course
// slot? Development is the commitment, not completion: a course never
// "retires" once offered (there's no course-removal in this model), so from
// the week it starts it occupies a slot forever, which is what makes
// offering more courses in a subject an ongoing faculty-capacity cost
// rather than a one-time hiring gate.
function isOffered(t: Buildable): boolean {
  return t.status === 'developing' || t.status === 'done';
}

// Who is actually teaching this course right now: the faculty member the
// player assigned, if they are still on the roster. undefined for a course
// that is not offered, has no faculty field, or whose instructor has left
// (see isUnstaffed below).
//
// This is the ONE place a `courseFaculty` id is resolved against the
// roster, so "the assignment names someone who no longer works here" can
// never be answered two different ways by two different callers.
export function assignedInstructor(s: GameState, t: Buildable): Faculty | undefined {
  const facultyId = s.courseFaculty[t.id];
  if (!facultyId) return undefined;
  return s.faculty.find((f) => f.id === facultyId);
}

// An offered course with a faculty field and nobody live teaching it —
// the state a dismissal leaves behind (see the reducer's FIRE_FACULTY).
// The course is still offered and still counts toward the catalogue; what
// it has lost is its teacher, which is a thing the player must fix rather
// than an error the engine should paper over.
export function isUnstaffed(s: GameState, t: Buildable): boolean {
  return isOffered(t) && !!t.requiresFaculty && assignedInstructor(s, t) === undefined;
}

// Every offered course currently without a live instructor, in s.tech
// order. The UI's worklist, and the count a dismissal reports.
export function unstaffedCourses(s: GameState): Buildable[] {
  return s.tech.filter((t) => isUnstaffed(s, t));
}

// Is this person committed to a running research initiative?
//
// THE KEYSTONE CONSTRAINT, and the one place teaching and research
// actually compete. A committed scholar teaches a reduced load for the
// duration — six months to five years — so every initiative is paid for
// twice: once in money, and once in the courses those people are no longer
// holding (see RESEARCH_COMMITMENT_SLOTS below for how much that is, and
// why it is no longer all of them).
// That is what makes a hire an allocation decision rather than a number
// going up, and it is why a Landmark Program is a genuine institutional
// sacrifice rather than something to switch on for whoever is idle.
export function isCommitted(s: GameState, facultyId: string): boolean {
  for (const initiative of Object.values(s.research.initiatives)) {
    if (initiative.participantIds.includes(facultyId)) return true;
  }
  return false;
}

// WHAT A COMMITMENT COSTS IN TEACHING: two course slots, not the career.
//
// This used to be all of them — a committed scholar taught nothing for the
// duration, which for a five-year Landmark Program meant four professors'
// entire capacity and every course they held. The playtest overruled that:
// the constraint is right, the price was not. A funded project is a
// reduced teaching load, which is what it is at a real university, and at
// two slots it is still the thing that makes a hire an allocation decision
// rather than a number going up.
//
// Note where the floor bites: somebody with two slots or fewer still
// teaches nothing while committed, so a junior hire is a genuinely
// expensive person to commit and a senior one (whose slots have grown with
// tenure — see facultyData.ts's grownSlots) is the cheaper choice. That is
// the same shape the old rule had, just no longer applied to everybody.
export const RESEARCH_COMMITMENT_SLOTS = 2;

// The course slots this person actually offers the school right now: their
// own count, less the commitment if they are on a project. Every capacity
// read goes through this rather than f.courseSlots directly, so the
// commitment cannot be forgotten in one place and honoured in another.
export function effectiveCourseSlots(s: GameState, f: Faculty): number {
  return isCommitted(s, f.id) ? Math.max(0, f.courseSlots - RESEARCH_COMMITMENT_SLOTS) : f.courseSlots;
}

// Which courses a team would have to give up by committing — the ONE
// answer, so the warning the player reads before clicking and the
// reassignment the reducer performs after cannot disagree.
//
// Only the EXCESS moves. Each member keeps as many courses as their
// reduced load allows and sheds the rest, and which ones they shed is
// decided here rather than left to s.tech order: lowest tier first, so a
// professor committed to a five-year programme keeps the capstone and
// hands away the survey course. Ties break on course id, so the same
// commitment always sheds the same courses.
//
// Callers: START_INITIATIVE (reducer.ts), which re-homes what it can and
// orphans the rest, and ResearchTab's pre-commitment warning.
const TIER_RANK: Record<string, number> = { core: 0, '1': 1, '2': 2, '3': 3, graduate: 4 };
function tierRank(tier: CourseTier): number {
  return TIER_RANK[String(tier)] ?? 0;
}

export function coursesShedByCommitment(s: GameState, facultyIds: readonly string[]): Buildable[] {
  const shed: Buildable[] = [];
  for (const id of facultyIds) {
    const f = s.faculty.find((person) => person.id === id);
    if (!f) continue;
    // Their load under the commitment, computed from courseSlots directly:
    // effectiveCourseSlots reads the CURRENT state, where they are not
    // committed yet, so it would answer about the wrong world.
    const keeps = Math.max(0, f.courseSlots - RESEARCH_COMMITMENT_SLOTS);
    const theirs = s.tech
      .filter((t) => isOffered(t) && s.courseFaculty[t.id] === id)
      .sort((a, b) => tierRank(tierOf(b.id)) - tierRank(tierOf(a.id)) || a.id.localeCompare(b.id));
    shed.push(...theirs.slice(keeps));
  }
  return shed;
}

// WHAT ACTUALLY HAPPENS TO THE SHED COURSES: the whole plan, worked out
// before anything is changed, so the Research tab can show it and the
// reducer can apply it from the same arithmetic.
//
// The rule the playtest asked for: when committing a team leaves a course
// without a professor, and another professor in that field is on the
// roster with room, they take it. This is not a second assignment rule —
// it is the same eligibleInstructors list the Curriculum tab's assignment
// panel offers, already sorted strongest-teacher-first and already
// filtered on free capacity, so a re-homed course lands with whoever the
// player would most likely have picked.
//
// Two details that are choices rather than mechanics:
//
//   - Courses are re-homed HIGHEST TIER FIRST. When there is not enough
//     free capacity for all of them, the capstone finds cover and the
//     survey course is the one left open, which is the same priority the
//     shedding order takes from the other end.
//   - A member of the committing team can be the one who takes it. They
//     are committed, not gone: somebody with five slots teaching one still
//     has room for two more after losing two to the project, and refusing
//     that would be inventing a rule the capacity arithmetic does not have.
//
// Capacity is computed here rather than read through effectiveCourseSlots
// because this answers a question about a world that does not exist yet:
// the team is not committed at the moment the tab asks. Anyone ALREADY
// committed elsewhere is read normally, so the two kinds of commitment
// compose.
export interface CommitmentCoverage {
  /** Courses the team can no longer hold. */
  shed: Buildable[];
  /** Of those, the ones a colleague picks up, with who takes each. */
  covered: Array<{ course: Buildable; instructor: Faculty }>;
  /** And the ones nobody has room for. */
  orphaned: Buildable[];
}

export function planCommitmentCoverage(s: GameState, facultyIds: readonly string[]): CommitmentCoverage {
  const shed = coursesShedByCommitment(s, facultyIds);

  const capacity = new Map<string, number>();
  const load = new Map<string, number>();
  for (const f of s.faculty) {
    capacity.set(f.id, facultyIds.includes(f.id)
      ? Math.max(0, f.courseSlots - RESEARCH_COMMITMENT_SLOTS)
      : effectiveCourseSlots(s, f));
    load.set(f.id, facultyLoad(s, f.id));
  }
  // The shed courses are off their old instructor's plate before anybody
  // else is asked to take one.
  for (const course of shed) {
    const previous = s.courseFaculty[course.id];
    if (previous) load.set(previous, (load.get(previous) ?? 1) - 1);
  }

  const covered: CommitmentCoverage['covered'] = [];
  const orphaned: Buildable[] = [];
  const byTierThenId = [...shed].sort(
    (a, b) => tierRank(tierOf(b.id)) - tierRank(tierOf(a.id)) || a.id.localeCompare(b.id),
  );
  for (const course of byTierThenId) {
    const taker = s.faculty
      .filter((f) => f.field === course.requiresFaculty)
      .filter((f) => (load.get(f.id) ?? 0) < (capacity.get(f.id) ?? 0))
      .sort((a, b) => b.teaching - a.teaching || a.id.localeCompare(b.id))[0];
    if (taker) {
      load.set(taker.id, (load.get(taker.id) ?? 0) + 1);
      covered.push({ course, instructor: taker });
    } else {
      orphaned.push(course);
    }
  }
  return { shed, covered, orphaned };
}

// How many courses this specific person is currently teaching — their
// personal load against their own `courseSlots`.
//
// The per-PERSON half of the capacity rule. Before assignments were real
// state there was only the per-FIELD aggregate below, because there was no
// answer to "whose slot is this": the round-robin spread a field's courses
// across its faculty on read. Now that the player picks, load is a fact
// about a person, and it is what decides whether THEY can take one more.
export function facultyLoad(s: GameState, facultyId: string): number {
  return s.tech.filter((t) => isOffered(t) && s.courseFaculty[t.id] === facultyId).length;
}

// Can this person take on one more course?
export function hasFreeSlot(s: GameState, f: Faculty): boolean {
  return facultyLoad(s, f.id) < effectiveCourseSlots(s, f);
}

// Everyone who could be assigned to this course right now: on the roster,
// in its field, and not already at their own slot ceiling. Sorted
// strongest-teacher first, so the list the player is offered leads with
// the answer they most likely want and the engine's own auto-pick (see
// startDevelopment) is simply its first entry.
//
// `except` is the course being REASSIGNED away from, if any: its current
// instructor keeps the slot that course occupies, so without this they
// would appear ineligible to go on teaching a course they already teach
// whenever they are otherwise full.
export function eligibleInstructors(s: GameState, node: Buildable, except?: string): Faculty[] {
  if (!node.requiresFaculty) return [];
  return s.faculty
    .filter((f) => f.field === node.requiresFaculty)
    .filter((f) => hasFreeSlot(s, f) || (except !== undefined && s.courseFaculty[except] === f.id))
    .sort((a, b) => b.teaching - a.teaching || a.id.localeCompare(b.id));
}

// How many faculty course-slots in `field` are spoken for: every OFFERED
// course in it, whether or not somebody is currently teaching it.
//
// UNSTAFFED COURSES STILL COUNT, and that is the whole subtlety. The
// tempting reading is that a course nobody teaches holds nobody's slot, so
// a dismissal should hand its capacity back — losing the teacher, not the
// teacher and the capacity both. That is wrong, and the balance sim is
// what proved it: an unstaffed course has not gone away. It is still in
// the catalogue, still owed to students, and still needs somebody to teach
// it. The capacity to teach it is precisely what the school just lost.
//
// Counting only staffed courses made dismissal a way to BUY capacity:
// fire a professor, their courses go quiet, the department reads as having
// room again, and the school opens more courses it equally cannot staff.
// Run to its conclusion in the sim, a school reached 421 offered courses
// on 68 faculty — a catalogue five times larger than anyone could teach,
// which looked healthy only because nothing yet read the silence.
//
// Note what this does NOT block. Re-staffing an orphan is a PER-PERSON
// check (eligibleInstructors -> hasFreeSlot), not this field-level one, so
// a replacement hire can always take over the courses their predecessor
// left — what an over-committed department cannot do is open NEW ones
// until it has the people for the ones it already offers. That is the
// right pressure, and the right order: staff what you promised before
// promising more.
//
// Only the curated set of courses with a requiresFaculty field are
// slot-gated at all (see techData.ts's REQUIRES_FACULTY).
export function usedFacultySlots(s: GameState, field: string): number {
  return s.tech.filter((t) => t.requiresFaculty === field && isOffered(t)).length;
}

// Total course-slot capacity the roster offers in `field` — the sum of
// courseSlots across every hired faculty member with that field (see
// facultyData.ts's grownSlots: an individual's slot count grows slowly with
// tenure, on top of the base rolled at hire).
export function totalFacultySlots(s: GameState, field: string): number {
  return s.faculty
    .filter((f) => f.field === field)
    .reduce((sum, f) => sum + effectiveCourseSlots(s, f), 0);
}

// UI-facing helper (CurriculumTab.tsx, CampusTab.tsx) so "is there a free
// slot" is computed the one same way everywhere canStartDevelopment itself
// checks it, rather than each screen re-deriving its own boolean.
export function hasFreeFacultySlot(s: GameState, field: string): boolean {
  return totalFacultySlots(s, field) > usedFacultySlots(s, field);
}

// CAN WAITING HELP? The three states a field-gated course can be in, and
// the reason the curriculum draws two different dots rather than one.
//
// A course blocked on faculty capacity used to get one mark whatever the
// reason, which collapsed two situations that call for opposite actions:
//
//   'open'     — there is a free slot. Nothing is in the way.
//   'hireable' — no free slot, but somebody in that field is on the market.
//                Go and appoint them; the block lifts today.
//   'blocked'  — no free slot and nobody listed. Nothing to do but grow the
//                department and wait for the market to turn over.
//
// Both halves were already computed elsewhere (slot arithmetic here, the
// market on s.candidates); this is only the one place that says what the
// pair of them MEANS, so the cell, its tooltip and any future caller cannot
// disagree about it.
export type FacultyGate = 'open' | 'hireable' | 'blocked';

export function facultyGate(s: GameState, field: string): FacultyGate {
  if (hasFreeFacultySlot(s, field)) return 'open';
  return s.candidates.some((c) => c.field === field) ? 'hireable' : 'blocked';
}

// Every field the school is actually short on right now: a course sits
// 'available' needing it and there's no free slot to start it. The single
// definition of "needed", shared by the Faculty tab (which flags these
// candidates and sorts them to the top) and the faculty alert badge (which
// fires the moment a needed candidate the player hasn't seen enters the
// pool — see types.ts's SeenState).
export function neededFacultyFields(s: GameState): Set<string> {
  return new Set(
    s.tech
      .filter((t) => t.status === 'available' && t.requiresFaculty)
      .map((t) => t.requiresFaculty!)
      .filter((field) => usedFacultySlots(s, field) >= totalFacultySlots(s, field)),
  );
}

// The single definition of "what it takes to start" a Buildable, shared by
// the reducer's START_DEVELOPMENT case and every UI screen that has to
// decide whether to offer the affordance.
// There is deliberately NO cap on how many Buildables can develop at once:
// money is the sole pacing resource (see README's "Pacing model"), so cash
// is the only throttle here. The rule is simply that you cannot commit to
// what you cannot pay for — the cost is charged in full, up front, so the
// school must actually have it.
//
// This used to be a cash>=0 check instead, which let a player buy anything
// at all while solvent and land in the red, where EVERY start was then
// blocked regardless of price. That punished a single over-reach by
// locking the whole build menu — including things the school could plainly
// afford — and made the throttle read as a penalty rather than a budget.
// Now an unaffordable item is simply not startable, and nothing else is
// affected: expansion still stalls when money runs out ("stall, don't
// die"), it just stalls item by item, at the moment of the decision.
//
// Debt is still possible — the weekly operating deficit can carry cash
// below zero (see financeSystem.ts) — and while it is negative nothing
// with a cost can be started, because no cost is ever <= a negative
// balance. That is the same bottleneck as before, arrived at honestly.
//
// This covers manual starts and any future build-initiation path that goes
// through this function. The faculty course-slot gate is a
// separate, per-field capacity rule on the curated requiresFaculty
// courses, not a throttle on development volume.
//
// `facultyId` is the instructor the player CHOSE (see the Curriculum tab).
// Supplying it narrows the faculty half of the gate from "this department
// has a free slot somewhere" to "this specific person can take it" —
// they are on the roster, in the right field, and not already full.
// Omitting it keeps the old department-level question, which is what a
// placeable Buildable's PLACE_BUILDABLE still asks (a building is not
// taught by anyone) and what the UI asks when it only needs to know
// whether a course is startable AT ALL before offering the picker.
// WHAT "DEVELOP ALL" WOULD ACTUALLY DO, worked out before it does it.
//
// Two callers need the same answer: the reducer, which starts the courses,
// and the Curriculum tab's button, which has to say how many and at what
// total cost BEFORE the click — at a large catalogue that is a substantial
// sum, and it used to be invisible until it had been spent.
//
// It cannot be "every course that passes canStartDevelopment right now",
// because each start spends cash and takes a faculty slot, so the later
// courses in the sweep are checked against a poorer, fuller school than
// the earlier ones. This walks s.tech in the same order the reducer does,
// carrying the running cash and per-field slot usage with it, which is what
// makes the figure on the button the figure the player is charged.
//
// Deliberately no clone of the state: the tab recomputes this whenever the
// state changes, and a structuredClone of the whole GameState per render is
// a real cost for a button label.
export function developAllPlan(s: GameState): { ids: string[]; cost: number } {
  let cash = s.finance.cash;
  const takenSlots = new Map<string, number>();
  const ids: string[] = [];

  for (const node of s.tech) {
    if (node.kind !== 'course' || node.status !== 'available') continue;
    if (node.cost > cash) continue;
    if (node.requiresFaculty) {
      const field = node.requiresFaculty;
      const taken = takenSlots.get(field) ?? 0;
      if (usedFacultySlots(s, field) + taken >= totalFacultySlots(s, field)) continue;
      takenSlots.set(field, taken + 1);
    }
    cash -= node.cost;
    ids.push(node.id);
  }
  return { ids, cost: s.finance.cash - cash };
}

export function canStartDevelopment(s: GameState, node: Buildable, facultyId?: string): boolean {
  const facultyOk = !node.requiresFaculty
    || (facultyId === undefined
      ? hasFreeFacultySlot(s, node.requiresFaculty)
      : eligibleInstructors(s, node).some((f) => f.id === facultyId));
  const canAfford = s.finance.cash >= node.cost;
  return node.status === 'available' && facultyOk && canAfford;
}

export function startDevelopment(s: GameState, node: Buildable, facultyId?: string): void {
  node.status = 'developing';
  s.developing[node.id] = node.duration;
  // Charged in full, up front. Never takes cash below zero: only
  // canStartDevelopment admits a start, and it requires the cash to be
  // there first.
  s.finance.cash -= node.cost;

  // Record who teaches it. The assignment is written in the SAME
  // transaction as the start, for the same reason PLACE_BUILDABLE writes a
  // placement in the same transaction as its start: a developing course is
  // never without an instructor, exactly as a developing building is never
  // without a location.
  //
  // An omitted facultyId auto-picks the strongest eligible teacher rather
  // than leaving the course unstaffed. That path is deliberately NOT the
  // player's: the UI always passes an explicit choice, because the choice
  // is the feature. It exists for the two callers that are not a player
  // making one — the playtest-only "Develop All" button and the headless
  // balance sim — where a forced pick would be noise, and for a course
  // with no faculty field at all, which simply records nothing.
  if (node.requiresFaculty) {
    const chosen = facultyId ?? eligibleInstructors(s, node)[0]?.id;
    if (chosen) s.courseFaculty[node.id] = chosen;
  }
}

// Applies only the "apply-once, at completion" effect fields (see the split
// documented on BuildableEffects in state/types.ts). servesPopulation,
// satisfactionAttribute, flatSatisfactionBonus,
// prestigeContribution, researchRateBonus and upkeepPerWeek are
// deliberately NOT handled
// here — they're read live, every tick, straight off `s.tech`'s 'done'
// entries by satisfactionSystem.ts / prestigeSystem.ts / financeSystem.ts /
// researchSystem.ts,
// so a facility's contribution never needs "applying" and can't drift out
// of sync with which facilities are actually still built.
function applyEffects(s: GameState, e?: Partial<BuildableEffects>): void {
  if (!e) return;
  if (e.capacityBonus) s.students.capacity += e.capacityBonus;
  // Raises the LISTED price only — the price the next class will be quoted
  // — never a class already enrolled. A Buildable that repriced the four
  // classes on the books would be the retroactive-hike exploit wearing a
  // building's clothes (see types.ts's tuitionByClass). Nothing in
  // src/data/ sets tuitionBonus today; this is the effect's contract for
  // whenever something does.
  if (e.tuitionBonus) s.finance.listedTuition += e.tuitionBonus;
  if (e.applicantPoolBonus) s.students.applicantPool += e.applicantPoolBonus;
  if (e.unlockIds) {
    for (const id of e.unlockIds) {
      const target = s.tech.find((t) => t.id === id);
      if (target && target.status === 'locked') target.status = 'available';
    }
  }
}

// Beyond prereqs, some Buildables also gate on the school's current state
// rather than another Buildable's status — a population size (the health
// center: only large campuses need one; read against total ENROLLED
// students, not bed capacity, despite the field's name — see
// minCapacityToUnlock in state/types.ts) or a prestige level (a research
// library / athletics complex tier). Both are ADDITIONAL to prereqs, never
// a replacement, and — unlike prereqs — can change in either direction
// (enrollment can shrink year to year same as prestige can drift down), so
// this is checked fresh every tick rather than only right after something
// finishes. Once something clears the gate and goes 'available' it stays
// available even if enrollment or prestige later dips back below the
// threshold — same as everything else here, nothing ever re-locks.
//
// A graduate course is the third such gate, and the reason it belongs
// here rather than in a pass of its own: "five of Health Science's six
// majors are complete" and "the Engineering school has a finished lab"
// are exactly the shape the two gates above already are — a reading of
// the school's current state that no single Buildable id can express.
// Routing it through meetsUnlockGates means the generic resolver still
// does all the opening, and a graduate program REVEALS the same way a
// tier-3 course does: hidden while locked, available the tick its gate
// and its own prereqs are both satisfied. graduateGateMet is the single
// predicate (see techData.ts) — this only asks it.
function meetsUnlockGates(s: GameState, t: Buildable): boolean {
  if (t.minCapacityToUnlock !== undefined && totalEnrolled(s.students) < t.minCapacityToUnlock) return false;
  if (t.minPrestigeToUnlock !== undefined && s.self.reputation < t.minPrestigeToUnlock) return false;
  if (t.graduateProgram !== undefined && !graduateGateMet(s, t.graduateProgram)) return false;
  // The fourth gate: a varsity athletics venue (facilitiesData.ts) stays
  // hidden until a team needing its facilityType category has been granted
  // (see data/eventData.ts's 'varsity-petition'). No separate "revealed"
  // flag anywhere in state — a team's existence on s.orgs.teams IS the
  // reveal signal, the same way graduateGateMet reads milestones rather
  // than a bespoke flag of its own.
  if (t.athleticsVenueReveal && !s.orgs.teams.some((team) => team.venueCategory === t.facilityType)) return false;
  return true;
}

function unlockAvailable(s: GameState): void {
  for (const t of s.tech) {
    if (
      t.status === 'locked' &&
      t.prereqs.every((p) => s.tech.find((x) => x.id === p)?.status === 'done') &&
      meetsUnlockGates(s, t)
    ) {
      t.status = 'available';
    }
  }
}

function isDone(s: GameState, id: string): boolean {
  return s.tech.find((t) => t.id === id)?.status === 'done';
}

// Awards a milestone bonus exactly once, guarded by s.milestones. Setting
// s.milestones[key] is itself the durable "curriculum breadth" signal
// prestigeSystem.ts's curriculumBreadthScore() reads — no reputation is
// granted here directly (see that file for why).
function awardMilestone(s: GameState, key: string, applicantBonus: number, message: string): void {
  if (s.milestones[key]) return;
  s.milestones[key] = true;
  s.students.applicantPool += applicantBonus;
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind: 'good' });
  // The handful of milestones special enough to stop the clock get queued
  // for a celebration (see data/eventData.ts's MILESTONE_INTERRUPT_KINDS
  // for which, and systems/events/eventSystem.ts for when it fires). This
  // system does NOT raise the interrupt itself: the week a milestone lands
  // may already belong to the admissions or U.S. News interrupt, and
  // queueing is what makes a celebration delayable rather than droppable.
  // Everything else about a milestone — the applicant bump above, the
  // durable curriculum-breadth signal prestige reads — is unchanged.
  if (isCelebratedMilestone(key)) s.events.pendingMilestones.push(key);
}

function checkMilestones(s: GameState): void {
  for (const school of milestoneSchools()) {
    let allProgramsDistinguished = school.majors.length > 0;

    for (const major of school.majors) {
      const tier2Done = major.tier2Ids.every((id) => isDone(s, id));
      if (tier2Done) {
        awardMilestone(
          s,
          `program-established:${major.prefix}`,
          PROGRAM_ESTABLISHED_APPLICANT_BONUS,
          `Program established: ${major.name} (${school.schoolName}).`,
        );
      }

      const tier3Done = major.tier3Ids.every((id) => isDone(s, id));
      if (tier3Done) {
        awardMilestone(
          s,
          `program-distinguished:${major.prefix}`,
          0,
          `${major.name} is now a distinguished program — every course complete.`,
        );
      }

      if (!(tier2Done && tier3Done)) allProgramsDistinguished = false;
    }

    if (allProgramsDistinguished) {
      awardMilestone(
        s,
        `school-distinguished:${school.schoolName}`,
        0,
        `${school.schoolName} is now a fully distinguished school.`,
      );
    }
  }

  // Graduate programs complete the same way a major does: an aggregate
  // condition (every course in the program finished) rather than any one
  // course's own effect. The milestone key is the whole payoff — it is
  // what prestigeSystem.ts's graduate-breadth term (and, for a doctorate,
  // its research term) reads, and what the celebration modal prices with
  // prestigeTargetWithout. There is no completion bonus of any kind here,
  // for exactly the reason there is none on a major.
  for (const program of graduatePrograms()) {
    if (!graduateCourseIds(program).every((id) => isDone(s, id))) continue;
    awardMilestone(
      s,
      `grad-program-complete:${program.id}`,
      GRAD_PROGRAM_COMPLETE_APPLICANT_BONUS,
      `${program.name} is now founded — the first ${program.degree} class can be admitted.`,
    );
  }
}

export function tickTech(s: GameState): void {
  const finished: Buildable[] = [];

  for (const id of Object.keys(s.developing)) {
    const weeksLeft = s.developing[id] - 1;
    if (weeksLeft <= 0) {
      delete s.developing[id];
      const node = s.tech.find((t) => t.id === id);
      if (node) finished.push(node);
    } else {
      s.developing[id] = weeksLeft;
    }
  }

  for (const node of finished) {
    node.status = 'done';
    // An in-place renovation is over: the node is serving its new figure
    // outright, so the pre-renovation reading it was standing in for has
    // nothing left to describe (see types.ts's servingPopulation).
    delete node.renovatingFrom;
    applyEffects(s, node.effects);
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Developed: ${node.name}.`,
      kind: 'good',
    });
  }

  // Re-checked every tick, not just after a finish: a locked Buildable's
  // prereqs only ever change when something finishes, but its dynamic gates
  // (population, prestige — see meetsUnlockGates) can cross their threshold
  // on any week even with nothing currently developing.
  unlockAvailable(s);
  if (finished.length > 0) {
    checkMilestones(s);
  }
}
