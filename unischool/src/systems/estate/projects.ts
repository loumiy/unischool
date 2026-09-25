import type { Buildable, CapitalProject, GameState } from '../../state/types';
import { ALL_PROJECT_TERMS, DEFEND_ERA_PRESTIGE, DEFEND_ERA_YEAR, ENDOWMENT_PROJECT_SHARE, LATE_TIER_YEAR } from '../../data/projectData';
import { curriculumGateMet } from '../../data/techData';
import { conditionOf } from './estate';

// CAPITAL PROJECTS (Plan 33, data/projectData.ts): when one opens, what it
// lifts while it stands, and paying for half of it from the endowment.

type Axis = keyof CapitalProject['boosts'];

// The defend era (V1-24): the elite band closes on a college at prestige
// 100, and from Year 35 that is the late tier's cue; from Year 40 it opens
// to any college.
export function lateTierOpen(s: GameState): boolean {
  return s.clock.year >= LATE_TIER_YEAR || (s.clock.year >= DEFEND_ERA_YEAR && s.self.reputation >= DEFEND_ERA_PRESTIGE);
}

export function projectOpen(s: GameState, t: Buildable): boolean {
  const p = t.project;
  if (!p) return true;
  if (p.late) return lateTierOpen(s);
  if (s.clock.year < p.fromYear) return false;
  // A graduate program's host waits on its school's whole curriculum (Plan 51).
  if (p.curriculum !== undefined && !curriculumGateMet(s, p.curriculum)) return false;
  return true;
}

// What the standing projects lift an axis by, in points, each in
// proportion to its condition.
export function projectLift(s: GameState, axis: Axis): number {
  return s.tech
    .filter((t) => t.project && t.status === 'done')
    .reduce((sum, t) => sum + (t.project!.boosts[axis] ?? 0) * conditionOf(t), 0);
}

// The most an axis can be lifted: every project standing in full repair.
export function projectLiftMax(axis: Axis): number {
  return ALL_PROJECT_TERMS.reduce((sum, p) => sum + (p.boosts[axis] ?? 0), 0);
}

export function standingProjects(s: GameState): Buildable[] {
  return s.tech.filter((t) => t.project && t.status === 'done');
}

// Half from the endowment, while half the endowment covers that half; the
// other half in cash.
export function endowmentHalf(t: Buildable): number {
  return Math.ceil(t.cost / 2);
}

export function canPayFromEndowment(s: GameState, t: Buildable): boolean {
  if (!t.project) return false;
  const half = endowmentHalf(t);
  return s.finance.endowment * ENDOWMENT_PROJECT_SHARE >= half && s.finance.cash >= t.cost - half;
}
