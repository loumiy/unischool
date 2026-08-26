import type { GameState, Buildable, BuildableEffects } from '../../state/types';
import { milestoneSchools } from '../../data/techData';

// ---------------------------------------------------------------------
// The milestone chain (see README's "The milestone chain"). Unlocking
// itself (tier-1 -> school building -> tier-2 -> tier-3) is pure authored
// prereq data resolved generically by unlockAvailable() below — nothing
// special needed for that. What's left for dedicated logic is the BONUS
// side: "major complete" and "further" bonuses aren't a single course's
// own completion effect, they're a reward for an aggregate condition
// (every tier-2, or every tier-3, in a major being done), plus a
// school-wide capstone bonus once every major in a school is fully done.
// This is deliberately the one place technSystem.ts is course/curriculum-
// aware rather than fully kind-agnostic — milestones are inherently a
// school/major concept, which buildings/dorms/facilities don't have.
// ---------------------------------------------------------------------
const MAJOR_COMPLETE_REPUTATION_BONUS = 15; // all tier-2 courses in a major done
const MAJOR_COMPLETE_APPLICANT_BONUS = 30;
const MAJOR_MASTERED_REPUTATION_BONUS = 25; // all tier-3 courses in a major also done (the "further" bonus)
const SCHOOL_COMPLETE_REPUTATION_BONUS = 80; // every major in the school fully done (tier-2 and tier-3)

// Development slots are a purchasable relief valve, not the primary
// pacing throttle (see README's "Pacing model"). Flat cost and a soft cap
// for now — tune freely.
export const SLOT_COST = 40_000;
export const MAX_SLOTS = 8;

// Shared by the reducer's START_DEVELOPMENT case and this system's
// auto-develop fill, so "what it takes to start" has one definition.
// The cash>=0 check is the "stall, don't die" bottleneck from README's
// pacing model: a shortfall blocks starting anything new — regardless of
// that Buildable's own cost — rather than ending the run. It naturally
// covers manual starts, auto-develop, and any future build-initiation
// path that goes through this function.
export function canStartDevelopment(s: GameState, node: Buildable): boolean {
  const slotsUsed = Object.keys(s.developing).length;
  const facultyOk = !node.requiresFaculty || s.faculty.some((f) => f.field === node.requiresFaculty);
  const notInTheRed = s.finance.cash >= 0;
  return node.status === 'available' && slotsUsed < s.slots && facultyOk && notInTheRed;
}

export function startDevelopment(s: GameState, node: Buildable): void {
  node.status = 'developing';
  s.developing[node.id] = node.duration;
  s.finance.cash -= node.cost; // cost is charged up front; can dip cash below zero, which then stalls the *next* start
}

// When autoDevelop is on, greedily fills any open slots with available
// Buildables, in list order, using the same rule a manual start uses — it's
// a sandbox playtesting convenience for bypassing manual "develop" clicks,
// nothing more, so each course still takes its full `duration` in weeks
// (it goes through the normal tickTech countdown like any other start).
// canStartDevelopment's cash>=0 check already stalls it while in the red;
// on top of that, auto-develop won't pick a specific Buildable it can't
// afford even while cash is still non-negative, so it can't be used to
// unattendedly grind the balance down to the stall threshold.
function autoFillSlots(s: GameState): void {
  if (!s.autoDevelop) return;
  for (const node of s.tech) {
    if (Object.keys(s.developing).length >= s.slots) break;
    if (node.cost > 0 && s.finance.cash < node.cost) continue;
    if (canStartDevelopment(s, node)) startDevelopment(s, node);
  }
}

function applyEffects(s: GameState, e?: Partial<BuildableEffects>): void {
  if (!e) return;
  if (e.capacityBonus) s.students.capacity += e.capacityBonus;
  if (e.reputationBonus) s.self.reputation += e.reputationBonus;
  if (e.tuitionBonus) s.finance.tuitionPerStudent += e.tuitionBonus;
  if (e.slotBonus) s.slots += e.slotBonus;
  if (e.applicantPoolBonus) s.students.applicantPool += e.applicantPoolBonus;
  // researchRateBonus is read live in weeklyResearchPoints extensions later.
  if (e.unlockIds) {
    for (const id of e.unlockIds) {
      const target = s.tech.find((t) => t.id === id);
      if (target && target.status === 'locked') target.status = 'available';
    }
  }
}

function unlockAvailable(s: GameState): void {
  for (const t of s.tech) {
    if (t.status === 'locked' && t.prereqs.every((p) => s.tech.find((x) => x.id === p)?.status === 'done')) {
      t.status = 'available';
    }
  }
}

function isDone(s: GameState, id: string): boolean {
  return s.tech.find((t) => t.id === id)?.status === 'done';
}

// Awards a milestone bonus exactly once, guarded by s.milestones.
function awardMilestone(s: GameState, key: string, reputationBonus: number, applicantBonus: number, message: string): void {
  if (s.milestones[key]) return;
  s.milestones[key] = true;
  s.self.reputation += reputationBonus;
  s.students.applicantPool += applicantBonus;
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind: 'good' });
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
          MAJOR_COMPLETE_REPUTATION_BONUS,
          MAJOR_COMPLETE_APPLICANT_BONUS,
          `Major complete: ${major.name} (${school.schoolName}).`,
        );
      }

      const tier3Done = major.tier3Ids.every((id) => isDone(s, id));
      if (tier3Done) {
        awardMilestone(
          s,
          `major-mastered:${major.prefix}`,
          MAJOR_MASTERED_REPUTATION_BONUS,
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
        SCHOOL_COMPLETE_REPUTATION_BONUS,
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

  if (finished.length > 0) {
    unlockAvailable(s);
    checkMilestones(s);
  }
  autoFillSlots(s);
}
