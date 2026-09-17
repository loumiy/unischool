import type { Buildable, GameState, SatisfactionAttributes, StudentDemand } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { absoluteWeek, DECISION_EVENT_COOLDOWN_WEEKS } from '../../data/eventData';
import {
  DEMAND_COOLDOWN_WEEKS, DEMAND_DEADLINE_WEEKS, DEMAND_FAILED_SATISFACTION_PENALTY,
  DEMAND_FIRST_YEAR, DEMAND_MET_SATISFACTION_REWARD, DEMAND_SATISFACTION_THRESHOLD,
  demandCopy,
} from '../../data/demandData';
import { HEALTH_CENTER_TIER1_POPULATION_GATE } from '../../data/facilitiesData';
import { attributeCoverage, servedPopulationFor } from '../satisfaction/satisfactionSystem';
import { projectAdmissions } from '../admissions/admissionsSystem';

// ---------------------------------------------------------------------
// STUDENT DEMANDS — the inverse of clubs (see
// docs/design/student-life.md's "Student demands"). One ordinary pure tick
// function. All of the content and every tunable number is in
// data/demandData.ts; what is here is the target logic, the cadence, and
// the two readings the views render.
//
// THE SHAPE. When satisfaction sits below DEMAND_SATISFACTION_THRESHOLD the
// student body asks for one concrete, buildable thing — derived from the
// campus's WORST actual shortfall, not drawn at random — with a target and
// a deadline. Build it in time and the demand clears with a satisfaction
// reward; let the deadline pass and it clears with a satisfaction penalty.
// The penalty needs no machinery of its own: satisfaction feeds word of
// mouth, and word of mouth costs applicants at the next summer funnel (see
// admissionsSystem.ts's WORD_OF_MOUTH_STRENGTH). That IS the consequence.
//
// NO PARALLEL CAPACITY MODEL. A demand's target is measured with
// satisfactionSystem.ts's own servedPopulationFor — the sum of
// servesPopulation across the 'done' facilities feeding one attribute — or
// against s.students.capacity for a housing demand. Both are readings the
// game already keeps; this system adds none of its own. Which is also why
// there is no acknowledge button on the resolution: meeting a demand is
// finishing a Buildable, and the tick notices.
//
// WHY THIS RUNS LAST IN THE REDUCER'S SYSTEMS ORDER, after tickEvents.
// Only one interrupt can be pending at a time, and every other claimant on
// a week — the summer admissions decision, the U.S. News report, a
// milestone celebration, the charter offer, a research prize, an authored
// decision event — is either annual or something the player earned.
// Running last means this system SEES their claim and stands down, so no
// other system has to know demands exist. Nothing is lost by standing
// down: the rolled demand waits in s.events.pendingDemand for the next
// quiet week, exactly as a milestone waits in s.events.pendingMilestones,
// and its deadline clock does not start until it is actually announced.
//
// THE SHARED CADENCE. Announcing a demand reads AND writes
// s.events.lastDecisionWeek, the same global floor the authored decision
// events run on. So a demand can never land in the week after an event (or
// an event in the week after a demand), and the combined number of
// stop-the-clock modals a year does not rise by the number of demands — a
// demand spends the existing texture budget rather than adding to it, the
// same way the Greek-life entries in eventData.ts do. That is deliberate:
// the answer to "does the modal frequency still read as light flavour"
// should not depend on how badly the school is being run.
//
// RESOLUTION RUNS EVERY WEEK, interrupt or no interrupt. The reducer runs
// every system each tick and only holds the CLOCK when one of them raises
// an interrupt, so a demand met during the week the summer decision fires
// is met that week, not the week after.
// ---------------------------------------------------------------------

// The ratio-scored satisfaction attributes, in the order a tie between two
// equally bad shortfalls is broken. Basic needs first because it is the
// heaviest attribute and the one with the steepest penalty curve (see
// satisfactionSystem.ts), so when two needs are equally uncovered, going
// hungry is the one students organise about.
const RATIO_ATTRIBUTES: readonly (keyof SatisfactionAttributes)[] = [
  'basicNeeds', 'academic', 'social', 'health',
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// =====================================================================
// READINGS — what the modal and the Student Life tab render
// =====================================================================

export interface DemandProgress {
  current: number;   // the reading as it stands, in the demand's own units
  target: number;    // what it has to reach
  fraction: number;  // 0..1 for the bar; 1 means met
  met: boolean;
  weeksLeft: number; // until the deadline; 0 once it has passed
}

// The one place a demand's target is compared against the world. Both
// metrics read numbers the game already maintains — no capacity model of
// this system's own — and neither can move backwards, so a demand that has
// been met stays met.
export function demandProgress(s: GameState, demand: StudentDemand): DemandProgress {
  const current = demand.metric === 'capacity'
    ? s.students.capacity
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

// WHAT THE DEMAND IS ACTUALLY WORTH, read off the model rather than
// authored — the same honesty rule satisfactionSystem.ts's
// studentLifeSatisfaction follows for the club panel, and the milestone
// modal's prestigeTargetWithout before it.
//
// The satisfaction figures are the nudge this system would apply, clamped
// exactly as resolveActiveDemand clamps it. The applicant figures are the
// consequence that actually matters, and they are produced by running the
// SHIPPED admissions funnel (projectAdmissions — the same pure function the
// summer modal previews with and the reducer commits with) at today's
// policy against each of those three satisfaction values. So "failing this
// costs you N applicants" is a real reading of word of mouth, not a
// sentence someone wrote.
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

// The Buildable a shortfall's ask resolves to: the next rung of that
// attribute's chain that the school could actually start today.
//
// Two conditions, both load-bearing. 'available' rather than any unfinished
// node, so students never demand something whose prereqs or prestige/
// capacity gate the school has not reached — a demand must always be
// buildable, even when it is not yet affordable. And servesPopulation > 0,
// which excludes the flat contributors (the quad): a demand's target is a
// served-population total, so an ask that serves nobody would be met the
// instant it was raised.
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
  // Health scores full — and so is genuinely not short — below the
  // population threshold the health center itself unlocks at (see
  // satisfactionSystem.ts's dormancy rule). Students cannot demand a
  // building the campus is too small to have a use for.
  if (attribute === 'health' && totalEnrolled(s.students) < HEALTH_CENTER_TIER1_POPULATION_GATE) return null;

  const ask = nextAskFor(s, attribute);
  if (!ask) return null; // nothing left to build for this need: not a demand anyone could meet

  const coverage = attributeCoverage(s, attribute);
  return {
    severity: 1 - coverage,
    demand: {
      id: crypto.randomUUID(),
      metric: 'served',
      attribute,
      askId: ask.id,
      askName: ask.name,
      // The ask, in the units the satisfaction model already counts: what
      // this need serves today plus what the demanded building would add.
      // Fixed at the moment the demand is rolled and never re-derived, so
      // enrollment growing later cannot silently move the goalposts — a
      // coverage RATIO target would do exactly that, since every ratio is
      // scored against enrolled.
      target: servedPopulationFor(s, attribute) + (ask.effects?.servesPopulation ?? 0),
      raisedWeek: 0,
      deadlineWeek: 0,
    },
  };
}

// Housing is scored exactly like the four RATIO_ATTRIBUTES above — off
// satisfactionSystem.ts's own attributeCoverage — rather than a bespoke
// fill-ratio gate: with commuters the norm, "every bed is full" is true of
// almost any campus almost all the time, so the real question is the same
// one basicNeeds/academic/social/health ask: is this need, per the target
// ratio the satisfaction model itself uses, adequately covered right now.
function housingCandidate(s: GameState): Candidate | null {
  const dorm = nextDorm(s);
  if (!dorm) return null; // nothing left to build for this need: not a demand anyone could meet

  const coverage = attributeCoverage(s, 'housing');
  return {
    severity: 1 - coverage,
    demand: {
      id: crypto.randomUUID(),
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

// One named shortfall's demand, if there is anything left to build for it.
// The roll below picks the worst of these; the playtest panel's "force a
// demand" asks for a specific one (see reducer.ts's DEBUG_FORCE_DEMAND).
// Same candidates either way — a forced demand is a real demand, with the
// real ask and the real target, not a mock-up of one.
export function shortfallDemandFor(
  s: GameState,
  subject: keyof SatisfactionAttributes | 'housing',
): StudentDemand | null {
  const candidate = subject === 'housing' ? housingCandidate(s) : candidateFor(s, subject);
  return candidate?.demand ?? null;
}

// The whole content decision, and the reason a demand reads as a real
// grievance: score every candidate shortfall against the model's own
// coverage reading and ask for the WORST one. No weighted draw, no random
// pick — if the students are demanding dining it is because dining is
// the thing this campus is most short of.
export function rollShortfallDemand(s: GameState): StudentDemand | null {
  const candidates: Candidate[] = [];
  for (const attribute of RATIO_ATTRIBUTES) {
    const candidate = candidateFor(s, attribute);
    if (candidate) candidates.push(candidate);
  }
  const housing = housingCandidate(s);
  if (housing) candidates.push(housing);

  let best: Candidate | null = null;
  for (const candidate of candidates) {
    if (!best || candidate.severity > best.severity) best = candidate;
  }
  // A school under the satisfaction threshold with nothing left to build
  // for any of its needs simply gets no demand — there would be nothing to
  // ask for. Rare, and deliberately silent.
  return best && best.severity > 0 ? best.demand : null;
}

// =====================================================================
// THE TICK
// =====================================================================

function log(s: GameState, message: string, kind: 'info' | 'good' | 'bad'): void {
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind });
}

function nudgeSatisfaction(s: GameState, points: number): void {
  s.students.satisfaction = clamp(s.students.satisfaction + points, 0, 100);
}

// Clears the demand, wherever it was sitting, and starts the cooldown.
// Every way a demand can end goes through here — met, expired, or fixed
// before it could even be announced — so there is exactly one place the
// anti-spiral cooldown is set and no path can forget it.
function closeDemand(s: GameState, week: number): void {
  s.events.activeDemand = null;
  s.events.pendingDemand = null;
  s.events.lastDemandWeek = week;
}

// Met or expired. Runs every week regardless of what else claimed it — the
// player finishing the demanded building is the resolution, and it should
// not wait on a quiet week.
function resolveActiveDemand(s: GameState): void {
  const demand = s.events.activeDemand;
  if (!demand) return;

  const week = absoluteWeek(s);
  const progress = demandProgress(s, demand);

  if (progress.met) {
    nudgeSatisfaction(s, DEMAND_MET_SATISFACTION_REWARD);
    closeDemand(s, week);
    log(s, `The student body's demand has been met: ${demand.askName} is open, and the campus knows who asked for it.`, 'good');
    return;
  }

  if (week >= demand.deadlineWeek) {
    nudgeSatisfaction(s, -DEMAND_FAILED_SATISFACTION_PENALTY);
    closeDemand(s, week);
    log(s, `The deadline on the student body's demand for ${demand.askName} has passed with nothing built. Word of it will follow the school into next year's admissions.`, 'bad');
  }
}

// Rolls a demand and QUEUES it. Deliberately separate from announcing it:
// what the school is short of is true this week, but which week the student
// body gets to say so depends on what else is happening (see the header).
function queueDemand(s: GameState): void {
  if (s.events.activeDemand || s.events.pendingDemand) return; // one at a time, ever
  if (s.clock.year < DEMAND_FIRST_YEAR) return;
  if (s.students.satisfaction >= DEMAND_SATISFACTION_THRESHOLD) return;

  const week = absoluteWeek(s);
  if (s.events.lastDemandWeek > 0 && week - s.events.lastDemandWeek < DEMAND_COOLDOWN_WEEKS) return;

  const demand = rollShortfallDemand(s);
  if (demand) s.events.pendingDemand = demand;
}

// Drains the queue of one onto the interrupt mechanism, on a week nothing
// else has claimed and the shared cadence floor allows. The demand becomes
// ACTIVE here — this is where its deadline is stamped — so a demand that
// waited three weeks for a quiet slot still gets its full DEMAND_DEADLINE
// _WEEKS to be met.
function announceDemand(s: GameState): void {
  const demand = s.events.pendingDemand;
  if (!demand) return;
  if (s.pendingInterrupt) return; // another interrupt owns this week — wait, don't drop

  const week = absoluteWeek(s);
  if (s.events.lastDecisionWeek > 0 && week - s.events.lastDecisionWeek < DECISION_EVENT_COOLDOWN_WEEKS) return;

  // The shortfall may have been fixed while the demand sat in the queue —
  // the player built the thing before anyone got round to asking for it.
  // Nothing to announce, and the cooldown starts anyway, so a school that
  // is still unhappy does not immediately roll a second one.
  if (demandProgress(s, demand).met) {
    closeDemand(s, week);
    return;
  }

  raiseDemand(s, demand);
}

// Announces one demand: stamps its deadline, puts it on the interrupt
// mechanism, spends the cadence budget and says so in the log. The tail of
// announceDemand above, lifted out so the playtest panel's "force a demand"
// raises one exactly the way the system does (see reducer.ts's
// DEBUG_FORCE_DEMAND) rather than assembling a lookalike beside it — a
// forced demand has a real deadline and ends the real way.
export function raiseDemand(s: GameState, demand: StudentDemand): void {
  const week = absoluteWeek(s);
  demand.raisedWeek = week;
  demand.deadlineWeek = week + DEMAND_DEADLINE_WEEKS;
  s.events.activeDemand = demand;
  s.events.pendingDemand = null;
  // Spends the shared texture budget rather than adding to it (see header).
  s.events.lastDecisionWeek = week;
  // No payload: the demand lives on s.events.activeDemand, which the modal
  // and the Student Life tab both read, so a run saved with the modal open
  // resumes showing the same demand rather than a stale copy of it.
  s.pendingInterrupt = { type: 'demand' };
  log(s, `The student body has raised a formal demand: ${demandCopy(demand).ask(demand.askName)}, within ${DEMAND_DEADLINE_WEEKS} weeks.`, 'bad');
}

export function tickDemands(s: GameState): void {
  resolveActiveDemand(s);
  queueDemand(s);
  announceDemand(s);
}
