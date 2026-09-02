import type { GameState, Buildable, BuildableEffects } from '../../state/types';
import { milestoneSchools } from '../../data/techData';
import { isCelebratedMilestone } from '../../data/eventData';

// ---------------------------------------------------------------------
// The milestone chain (see README's "The milestone chain"). Unlocking
// itself (gen-ed -> tier-1 -> school building -> tier-2 -> tier-3) is pure
// authored prereq data resolved generically by unlockAvailable() below —
// nothing special needed for that. What's left for dedicated logic is the BONUS
// side: "major complete" and "further" bonuses aren't a single course's
// own completion effect, they're a reward for an aggregate condition
// (every tier-2, or every tier-3, in a major being done), plus a
// school-wide capstone bonus once every major in a school is fully done.
// This is deliberately the one place technSystem.ts is course/curriculum-
// aware rather than fully kind-agnostic — milestones are inherently a
// school/major concept, which buildings/dorms/facilities don't have.
// ---------------------------------------------------------------------
// Milestones no longer grant reputation directly — completing a major or a
// school raises curriculumBreadthScore() in prestigeSystem.ts instead,
// which lifts the prestige *target* that reputation slowly drifts toward.
// A one-time applicant bump for "major complete" remains a flow effect on
// the applicant pool, which is not the stock-vs-flow concern this rework
// addresses.
const MAJOR_COMPLETE_APPLICANT_BONUS = 30;

// Counts how many course Buildables currently occupy a faculty course-slot
// in `field` — every course whose requiresFaculty matches that has started
// developing or finished. A course never "retires" once offered (there's no
// course-removal in this model), so it keeps occupying its slot forever —
// which is exactly what makes offering more courses in a subject a real,
// ongoing faculty-capacity cost rather than a one-time hiring gate. Only
// the curated set of courses with a requiresFaculty field are slot-gated at
// all (see techData.ts's REQUIRES_FACULTY) — most of the curriculum has no
// requiresFaculty and so never touches this.
export function usedFacultySlots(s: GameState, field: string): number {
  return s.tech.filter((t) => t.requiresFaculty === field && (t.status === 'developing' || t.status === 'done')).length;
}

// Total course-slot capacity the roster offers in `field` — the sum of
// courseSlots across every hired faculty member with that field (see
// facultyData.ts's grownSlots: an individual's slot count grows slowly with
// tenure, on top of the base rolled at hire).
export function totalFacultySlots(s: GameState, field: string): number {
  return s.faculty.filter((f) => f.field === field).reduce((sum, f) => sum + f.courseSlots, 0);
}

// UI-facing helper (CurriculumTab.tsx, CampusTab.tsx) so "is there a free
// slot" is computed the one same way everywhere canStartDevelopment itself
// checks it, rather than each screen re-deriving its own boolean.
export function hasFreeFacultySlot(s: GameState, field: string): boolean {
  return totalFacultySlots(s, field) > usedFacultySlots(s, field);
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
export function canStartDevelopment(s: GameState, node: Buildable): boolean {
  const facultyOk = !node.requiresFaculty || hasFreeFacultySlot(s, node.requiresFaculty);
  const canAfford = s.finance.cash >= node.cost;
  return node.status === 'available' && facultyOk && canAfford;
}

export function startDevelopment(s: GameState, node: Buildable): void {
  node.status = 'developing';
  s.developing[node.id] = node.duration;
  // Charged in full, up front. Never takes cash below zero: only
  // canStartDevelopment admits a start, and it requires the cash to be
  // there first.
  s.finance.cash -= node.cost;
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
  if (e.tuitionBonus) s.finance.tuitionPerStudent += e.tuitionBonus;
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
// center: only large campuses need one) or a prestige level (a research
// library / athletics complex tier). Both are ADDITIONAL to prereqs, never
// a replacement, and — unlike prereqs — can change in either direction
// (capacity only grows, but prestige can drift down), so this is checked
// fresh every tick rather than only right after something finishes. Once
// something clears the gate and goes 'available' it stays available even
// if prestige later dips back below the threshold — same as everything
// else here, nothing ever re-locks.
function meetsUnlockGates(s: GameState, t: Buildable): boolean {
  if (t.minCapacityToUnlock !== undefined && s.students.capacity < t.minCapacityToUnlock) return false;
  if (t.minPrestigeToUnlock !== undefined && s.self.reputation < t.minPrestigeToUnlock) return false;
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
    let allMajorsFullyDone = school.majors.length > 0;

    for (const major of school.majors) {
      const tier2Done = major.tier2Ids.every((id) => isDone(s, id));
      if (tier2Done) {
        awardMilestone(
          s,
          `major-complete:${major.prefix}`,
          MAJOR_COMPLETE_APPLICANT_BONUS,
          `Major complete: ${major.name} (${school.schoolName}).`,
        );
      }

      const tier3Done = major.tier3Ids.every((id) => isDone(s, id));
      if (tier3Done) {
        awardMilestone(
          s,
          `major-mastered:${major.prefix}`,
          0,
          `${major.name} fully mastered — every course complete.`,
        );
      }

      if (!(tier2Done && tier3Done)) allMajorsFullyDone = false;
    }

    if (allMajorsFullyDone) {
      awardMilestone(
        s,
        `school-complete:${school.schoolName}`,
        0,
        `${school.schoolName} is now a fully distinguished school.`,
      );
    }
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
