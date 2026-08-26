import type { GameState, GameEffects, TechNode } from '../../state/types';

// Weeks needed to develop a course, scaled by tier.
const WEEKS_PER_TIER = 3;
export function developmentWeeks(tier: number): number {
  return tier * WEEKS_PER_TIER;
}

// Slots the university starts with, before any are purchased. Shared with
// createInitialState() so the cost curve below and the starting state agree
// on where "zero purchases" is.
export const STARTING_SLOTS = 2;

// Cost to buy the next development slot, given how many the player already
// has. This is the main lever for long-term growth, so it's the one curve
// to tune: SLOT_BASE_COST is the first purchased slot's price, SLOT_COST_GROWTH
// is how much pricier each additional slot gets.
const SLOT_BASE_COST = 40_000;
const SLOT_COST_GROWTH = 1.6;
export function nextSlotCost(currentSlots: number): number {
  const purchased = currentSlots - STARTING_SLOTS;
  return Math.round(SLOT_BASE_COST * SLOT_COST_GROWTH ** purchased);
}

function applyEffects(s: GameState, e?: Partial<GameEffects>): void {
  if (!e) return;
  if (e.capacityBonus) s.students.capacity += e.capacityBonus;
  if (e.reputationBonus) s.self.reputation += e.reputationBonus;
  if (e.tuitionBonus) s.finance.tuitionPerStudent += e.tuitionBonus;
  // researchRateBonus is read live in weeklyResearchPoints extensions later.
}

function unlockAvailable(s: GameState): void {
  for (const t of s.tech) {
    if (t.status === 'locked' && t.prereqs.every((p) => s.tech.find((x) => x.id === p)?.status === 'done')) {
      t.status = 'available';
    }
  }
}

// Curriculum milestone bonuses. All one-time prestige rewards live here so
// the whole progression curve is visible and tunable in one place.
const MAJOR_COMPLETE_BONUS = 20;        // reputation, once all of a major's courses are done
const CORE_COMPLETE_BONUS = 60;         // reputation, once all of a school's general-ed core courses are done
const SCHOOL_ESTABLISHED_BONUS = 40;    // reputation, once enough majors have started, per below
const SCHOOL_DISTINGUISHED_BONUS = 150; // reputation, once every major in a school is fully complete
const MAJORS_TO_ESTABLISH_SCHOOL = 3;   // majors needing their tier-1 course done to "establish" a school
const FULL_MAJOR_SIZE = 9;              // courses per major; distinguishes majors from the smaller core group

// Groups tech nodes by school, then by major, from the state itself — the
// tech system doesn't know about techData.ts's internal seed structure.
function groupBySchoolAndMajor(tech: TechNode[]): Map<string, Map<string, TechNode[]>> {
  const schools = new Map<string, Map<string, TechNode[]>>();
  for (const node of tech) {
    if (!schools.has(node.school)) schools.set(node.school, new Map());
    const majors = schools.get(node.school)!;
    if (!majors.has(node.major)) majors.set(node.major, []);
    majors.get(node.major)!.push(node);
  }
  return schools;
}

function awardMilestone(s: GameState, key: string, bonus: number, message: string): void {
  if (s.milestones[key]) return;
  s.milestones[key] = true;
  s.self.reputation += bonus;
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind: 'good' });
}

function checkMilestones(s: GameState): void {
  for (const [school, majors] of groupBySchoolAndMajor(s.tech)) {
    let majorsStarted = 0;
    let hasFullMajor = false;
    let allMajorsComplete = true;

    for (const [major, courses] of majors) {
      const allDone = courses.every((c) => c.status === 'done');

      if (courses.length === FULL_MAJOR_SIZE) {
        hasFullMajor = true;
        if (allDone) {
          awardMilestone(s, `major:${school}:${major}`, MAJOR_COMPLETE_BONUS, `Major complete: ${major} (${school}).`);
        } else {
          allMajorsComplete = false;
        }
        const tier1 = courses.find((c) => c.tier === 1);
        if (tier1?.status === 'done') majorsStarted += 1;
      } else if (allDone) {
        // A smaller group of tier-1-only courses — the school's gen-ed core.
        awardMilestone(s, `core:${school}:${major}`, CORE_COMPLETE_BONUS, `${major} complete: ${school}.`);
      }
    }

    if (majorsStarted >= MAJORS_TO_ESTABLISH_SCHOOL) {
      awardMilestone(s, `established:${school}`, SCHOOL_ESTABLISHED_BONUS, `${school} is now an established school.`);
    }
    if (hasFullMajor && allMajorsComplete) {
      awardMilestone(s, `distinguished:${school}`, SCHOOL_DISTINGUISHED_BONUS, `${school} is now a distinguished school.`);
    }
  }
}

export function tickTech(s: GameState): void {
  const finished: TechNode[] = [];

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
    applyEffects(s, node.unlocks);
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `Course developed: ${node.name}.`,
      kind: 'good',
    });
  }

  if (finished.length > 0) {
    unlockAvailable(s);
    checkMilestones(s);
  }
}
