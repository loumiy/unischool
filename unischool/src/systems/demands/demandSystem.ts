import type { Buildable, GameState, LogTopic, SatisfactionAttributes, StudentDemand } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { absoluteWeek, DECISION_EVENT_COOLDOWN_WEEKS } from '../../data/eventData';
import {
  DEMAND_COOLDOWN_WEEKS, DEMAND_DEADLINE_WEEKS, DEMAND_FAILED_SATISFACTION_PENALTY,
  DEMAND_FIRST_YEAR, DEMAND_MET_SATISFACTION_REWARD, DEMAND_SATISFACTION_THRESHOLD,
  demandCopy,
} from '../../data/demandData';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../../data/facilitiesData';
import { attributeCoverage, servedPopulationFor } from '../satisfaction/satisfactionSystem';
import { instructionCapacity, instructionCoverage, SEATS_PER_COURSE } from '../techtree/instructionCapacity';
import { programOfCourse } from '../../data/techData';
import { isHoused } from '../techtree/programOffers';
import type { DemandSubject } from '../../data/demandData';
import { projectAdmissions } from '../admissions/admissionsSystem';
import { clamp } from '../../math';
import { newId } from '../../engine/random';

// ---------------------------------------------------------------------
// Student demands (see docs/design/student-life.md). Content and tuning are
// in data/demandData.ts; this file holds target logic, cadence and the two
// readings the views render.
//
// Below DEMAND_SATISFACTION_THRESHOLD the students ask for the fix to the
// campus's worst real shortfall, with a target and a deadline. Meeting it
// pays a satisfaction reward; missing it costs a penalty, which reaches
// admissions through word of mouth. Targets reuse readings the game already
// keeps (servedPopulationFor, capacity, instructionCapacity); meeting a
// demand is finishing a Buildable, and the tick notices.
//
// This runs last in the reducer's systems order, so it sees any other
// interrupt claiming the week and stands down; the rolled demand waits in
// s.events.pendingDemand, and its deadline starts only when announced.
// Announcing reads and writes s.events.lastDecisionWeek, the floor the
// authored decision events share, so demands spend the existing modal
// budget rather than adding to it. Resolution runs every week, interrupt or
// not.
// ---------------------------------------------------------------------

// The ratio-scored attributes, in tie-break order. Basic needs first: it is
// the heaviest attribute with the steepest penalty curve.
const RATIO_ATTRIBUTES: readonly (keyof SatisfactionAttributes)[] = [
  'basicNeeds', 'academic', 'social', 'health',
];

// =====================================================================
// READINGS — what the modal and the Students tab render
// =====================================================================

export interface DemandProgress {
  current: number;   // the reading as it stands, in the demand's own units
  target: number;    // what it has to reach
  fraction: number;  // 0..1 for the bar; 1 means met
  met: boolean;
  weeksLeft: number; // until the deadline; 0 once it has passed
}

// The one place a demand's target is compared against the world, read
// afresh each week: both metrics can fall (a demolished building, a
// disbanded chapter), and the demand closes the first week it is met.
export function demandProgress(s: GameState, demand: StudentDemand): DemandProgress {
  const current = demand.metric === 'capacity'
    ? s.students.capacity
    : demand.metric === 'seats'
      ? instructionCapacity(s)
      : servedPopulationFor(s, demand.attribute ?? 'social');
  return {
    current,
    target: demand.target,
    fraction: clamp(current / Math.max(demand.target, 1), 0, 1),
    met: current >= demand.target,
    weeksLeft: Math.max(0, demand.deadlineWeek - absoluteWeek(s)),
  };
}

export interface DemandStakes {
  satisfactionNow: number;
  satisfactionIfMet: number;
  satisfactionIfFailed: number;
  applicantsNow: number;
  applicantsIfMet: number;
  applicantsIfFailed: number;
}

// What the demand is worth, read off the model rather than authored. The
// satisfaction figures are clamped as resolveActiveDemand clamps them; the
// applicant figures run the shipped admissions funnel (projectAdmissions)
// at today's policy against each of the three satisfaction values.
export function demandStakes(s: GameState): DemandStakes {
  const now = s.students.satisfaction;
  const ifMet = clamp(now + DEMAND_MET_SATISFACTION_REWARD, 0, 100);
  const ifFailed = clamp(now - DEMAND_FAILED_SATISFACTION_PENALTY, 0, 100);
  const applicantsAt = (satisfaction: number): number => projectAdmissions(
    s.self.reputation,
    s.finance.listedTuition,
    s.students.capacity,
    satisfaction,
  ).applicants;

  return {
    satisfactionNow: now,
    satisfactionIfMet: ifMet,
    satisfactionIfFailed: ifFailed,
    applicantsNow: applicantsAt(now),
    applicantsIfMet: applicantsAt(ifMet),
    applicantsIfFailed: applicantsAt(ifFailed),
  };
}

// =====================================================================
// DERIVING THE ASK — the worst real shortfall, and the thing that fixes it
// =====================================================================

// The Buildable a shortfall resolves to: the next rung of that attribute's
// chain. 'available' so a demand is always buildable (if not affordable),
// and servesPopulation > 0 so the ask isn't met the instant it is raised
// (the target is a served-population total).
function nextAskFor(s: GameState, attribute: keyof SatisfactionAttributes): Buildable | undefined {
  return s.tech.find((t) =>
    t.status === 'available' &&
    t.effects?.satisfactionAttribute === attribute &&
    (t.effects?.servesPopulation ?? 0) > 0);
}

function nextDorm(s: GameState): Buildable | undefined {
  return s.tech.find((t) => t.kind === 'dorm' && t.status === 'available' && (t.effects?.capacityBonus ?? 0) > 0);
}

interface Candidate {
  severity: number; // 0..1, how badly this need is unmet — the ranking key
  demand: StudentDemand;
}

function candidateFor(s: GameState, attribute: keyof SatisfactionAttributes): Candidate | null {
  // Health isn't short below the population the health center unlocks at
  // (satisfactionSystem.ts's dormancy rule).
  if (attribute === 'health' && totalEnrolled(s.students) < HEALTH_CENTER_TIER1_POPULATION_GATE) return null;

  const ask = nextAskFor(s, attribute);
  if (!ask) return null; // nothing left to build for this need: not a demand anyone could meet

  const coverage = attributeCoverage(s, attribute);
  return {
    severity: 1 - coverage,
    demand: {
      id: newId(),
      metric: 'served',
      attribute,
      askId: ask.id,
      askName: ask.name,
      // Served today plus what the ask adds. Fixed when rolled: a coverage
      // ratio target would move as enrollment grows.
      target: servedPopulationFor(s, attribute) + (ask.effects?.servesPopulation ?? 0),
      raisedWeek: 0,
      deadlineWeek: 0,
    },
  };
}

// Housing is scored off attributeCoverage like the others: with commuters
// the norm, "every bed is full" is nearly always true and says little.
function housingCandidate(s: GameState): Candidate | null {
  const dorm = nextDorm(s);
  if (!dorm) return null; // nothing left to build for this need: not a demand anyone could meet

  const coverage = attributeCoverage(s, 'housing');
  return {
    severity: 1 - coverage,
    demand: {
      id: newId(),
      metric: 'capacity',
      attribute: null,
      askId: dorm.id,
      askName: dorm.name,
      target: s.students.capacity + (dorm.effects?.capacityBonus ?? 0),
      raisedWeek: 0,
      deadlineWeek: 0,
    },
  };
}

// The instruction shortfall: classes are full. The ask is the next course
// startable in a housed program; met at one more course's worth of seats.
function instructionCandidate(s: GameState): Candidate | null {
  const ask = s.tech.find((t) => {
    if (t.kind !== 'course' || t.status !== 'available') return false;
    const programId = programOfCourse(t.id);
    return programId !== undefined && isHoused(s, programId);
  });
  if (!ask) return null;
  const coverage = instructionCoverage(s);
  return {
    severity: 1 - coverage,
    demand: {
      id: newId(),
      metric: 'seats',
      attribute: null,
      askId: ask.id,
      askName: ask.name,
      target: instructionCapacity(s) + SEATS_PER_COURSE,
      raisedWeek: 0,
      deadlineWeek: 0,
    },
  };
}

// One named shortfall's demand, if there is anything left to build for it.
// Also used by the playtest panel's "force a demand" (reducer.ts's
// DEBUG_FORCE_DEMAND), so a forced demand is a real one.
export function shortfallDemandFor(
  s: GameState,
  subject: DemandSubject,
): StudentDemand | null {
  const candidate = subject === 'housing'
    ? housingCandidate(s)
    : subject === 'instruction'
      ? instructionCandidate(s)
      : candidateFor(s, subject);
  return candidate?.demand ?? null;
}

// Scores every candidate shortfall and asks for the worst one. No random
// draw: if students demand dining, dining is what the campus lacks most.
export function rollShortfallDemand(s: GameState): StudentDemand | null {
  const candidates: Candidate[] = [];
  for (const attribute of RATIO_ATTRIBUTES) {
    const candidate = candidateFor(s, attribute);
    if (candidate) candidates.push(candidate);
  }
  const housing = housingCandidate(s);
  if (housing) candidates.push(housing);
  const instruction = instructionCandidate(s);
  if (instruction) candidates.push(instruction);

  let best: Candidate | null = null;
  for (const candidate of candidates) {
    if (!best || candidate.severity > best.severity) best = candidate;
  }
  // Under the threshold with nothing left to build: no demand.
  return best && best.severity > 0 ? best.demand : null;
}

// =====================================================================
// THE TICK
// =====================================================================

function log(s: GameState, message: string, kind: 'info' | 'good' | 'bad', topic?: LogTopic): void {
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind, topic });
}

function nudgeSatisfaction(s: GameState, points: number): void {
  s.students.satisfaction = clamp(s.students.satisfaction + points, 0, 100);
}

// Clears the demand wherever it sits and starts the cooldown. Every ending
// goes through here, so no path can forget the cooldown.
function closeDemand(s: GameState, week: number): void {
  s.events.activeDemand = null;
  s.events.pendingDemand = null;
  s.events.lastDemandWeek = week;
}

// Met or expired. Runs every week regardless of what else claimed it.
function resolveActiveDemand(s: GameState): void {
  const demand = s.events.activeDemand;
  if (!demand) return;

  const week = absoluteWeek(s);
  const progress = demandProgress(s, demand);

  if (progress.met) {
    nudgeSatisfaction(s, DEMAND_MET_SATISFACTION_REWARD);
    closeDemand(s, week);
    log(s, `The student body's demand has been met: ${demand.askName} is open, and the campus knows who asked for it.`, 'good', 'demand-met');
    return;
  }

  if (week >= demand.deadlineWeek) {
    nudgeSatisfaction(s, -DEMAND_FAILED_SATISFACTION_PENALTY);
    closeDemand(s, week);
    log(s, `The deadline on the student body's demand for ${demand.askName} has passed with nothing built. Word of it will follow the college into next year's admissions.`, 'bad', 'demand-failed');
  }
}

// Rolls a demand and queues it; which week it is announced depends on what
// else is happening.
function queueDemand(s: GameState): void {
  if (s.events.activeDemand || s.events.pendingDemand) return; // one at a time, ever
  if (s.clock.year < DEMAND_FIRST_YEAR) return;
  if (s.students.satisfaction >= DEMAND_SATISFACTION_THRESHOLD) return;

  const week = absoluteWeek(s);
  if (s.events.lastDemandWeek > 0 && week - s.events.lastDemandWeek < DEMAND_COOLDOWN_WEEKS) return;

  const demand = rollShortfallDemand(s);
  if (demand) s.events.pendingDemand = demand;
}

// Announces a queued demand on a week nothing else has claimed and the
// shared cadence floor allows. The deadline is stamped here, so a demand
// that waited still gets its full DEMAND_DEADLINE_WEEKS.
function announceDemand(s: GameState): void {
  const demand = s.events.pendingDemand;
  if (!demand) return;
  if (s.pendingInterrupt) return; // another interrupt owns this week — wait, don't drop

  const week = absoluteWeek(s);
  if (s.events.lastDecisionWeek > 0 && week - s.events.lastDecisionWeek < DECISION_EVENT_COOLDOWN_WEEKS) return;

  // Fixed while queued: nothing to announce, but the cooldown still starts.
  if (demandProgress(s, demand).met) {
    closeDemand(s, week);
    return;
  }

  raiseDemand(s, demand);
}

// Announces one demand: stamps its deadline, raises the note over the map,
// spends the cadence budget and logs it. Exported for the playtest panel's "force
// a demand" (reducer.ts's DEBUG_FORCE_DEMAND).
export function raiseDemand(s: GameState, demand: StudentDemand): void {
  const week = absoluteWeek(s);
  demand.raisedWeek = week;
  demand.deadlineWeek = week + DEMAND_DEADLINE_WEEKS;
  s.events.activeDemand = demand;
  s.events.pendingDemand = null;
  s.events.lastDecisionWeek = week;
  // A note over the map, not a modal (Plan 29): the clock runs on, and the
  // Students tab keeps the demand in view until it is met or lapses.
  s.events.demandUnread = true;
  log(s, `The student body has raised a formal demand: ${demandCopy(demand).ask(demand.askName)}, within ${DEMAND_DEADLINE_WEEKS} weeks.`, 'bad', 'demand-raised');
}

export function tickDemands(s: GameState): void {
  resolveActiveDemand(s);
  queueDemand(s);
  announceDemand(s);
}
