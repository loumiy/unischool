import { restaffPlan } from '../faculty/restaffing';
import { tickCatalogue, timeOutCatalogue } from './catalogueEngine';
import { delegate } from '../delegation/seats';
import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import type { DecisionEvent, DecisionEventContext, MilestoneEntry, MilestonePayload } from '../../data/eventData';
import {
  DECISION_EVENTS, DECISION_EVENT_COOLDOWN_WEEKS, DECISION_EVENT_FIRST_YEAR,
  DECISION_EVENT_REPEAT_COOLDOWN_WEEKS, DECISION_EVENT_WEEKLY_CHANCE,
  MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN, OPENING_LETTERS, VARSITY_PETITION_WEEK,
  absoluteWeek, describeMilestone, findDecisionEvent, hasFreeChoice,
} from '../../data/eventData';
import { labEquippedFields } from '../../data/researchData';
import { ELITE_CLOSE_ABOVE_PRESTIGE } from '../rivals/rivalsSystem';
import { coachNamesInUse, rollAthleticDirectorCandidates, rollMascotSuggestion } from '../../data/studentLifeData';
import { random } from '../../engine/random';

// Event cadence (content lives in data/eventData.ts; see
// docs/architecture/interrupts.md). Runs last in the reducer's SYSTEMS
// order and stands down if another system raised this week's interrupt.
// Everything here is queued or rests on a durable condition, so it fires on
// the next quiet week; a decision event that misses a week never happened.

// Exported for reducer.ts's DEBUG_FORCE_MILESTONE, which clears the
// frequency floor first.
export function fireMilestoneCelebration(s: GameState): boolean {
  if (s.events.pendingMilestones.length === 0) return false;

  const week = absoluteWeek(s);
  // Frequency floor; milestones inside the window stay queued.
  if (s.events.lastMilestoneWeek > 0 && week - s.events.lastMilestoneWeek < MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN) {
    return false;
  }

  const keys = s.events.pendingMilestones;
  const entries = keys
    .map((key) => describeMilestone(s, key))
    .filter((e): e is MilestoneEntry => e !== null);

  // Always empty the queue, including keys describeMilestone can't resolve,
  // so an undescribable key never blocks the queue.
  s.events.pendingMilestones = [];
  s.events.lastMilestoneWeek = week;
  if (entries.length === 0) return false;

  const payload: MilestonePayload = { keys: entries.map((e) => e.key), entries };
  s.pendingInterrupt = { type: 'milestone', payload };
  return true;
}

// The research completion report (researchSystem.ts). Its effects have
// already been applied, so a delayed modal delays nothing. One report per
// modal (each is about one project); no frequency floor, since projects
// are naturally spaced.
function fireResearchReport(s: GameState): boolean {
  const report = s.research.pendingCompletions.shift();
  if (!report) return false;

  s.pendingInterrupt = { type: 'research-complete', payload: { report } };
  return true;
}

// The one-time, cosmetic College -> University charter offer, raised once a
// lab exists (docs/design/progression.md). Not an authored decision event:
// it has no cost, roll or repeat.
function fireCharterOffer(s: GameState): boolean {
  if (s.self.universityCharterOffered) return false;
  // Same helper as research's own lab gate, so the two cannot drift.
  if (labEquippedFields(s).size === 0) return false;

  s.pendingInterrupt = { type: 'charter' };
  return true;
}

// The athletic director's offer, raised on a quiet week once a varsity team
// exists. Declining is not a one-shot: the offer returns after
// AD_OFFER_COOLDOWN_WEEKS, so a school that cannot afford a director early
// does not lose athletics for the run. Candidates are rolled here and
// carried in the payload so the modal hires exactly who it shows.
const AD_OFFER_COOLDOWN_WEEKS = 3 * WEEKS_PER_YEAR;

// Championships queue like milestones but drain one per modal.
function fireChampionshipReport(s: GameState): boolean {
  const sport = s.orgs.pendingTitles[0];
  if (!sport) return false;
  const result = s.orgs.lastSeason[sport];
  if (!result) {
    // Drop an unreportable entry so it cannot block the queue.
    s.orgs.pendingTitles.shift();
    return false;
  }
  s.orgs.pendingTitles.shift();
  s.pendingInterrupt = { type: 'championship', payload: { result } };
  return true;
}

// The first sport club's beat (naming the mascot), on the first quiet week
// after the club is recognized; the flag just clears if a mascot exists.
function fireMascotBeat(s: GameState): boolean {
  if (!s.orgs.mascotBeatPending) return false;
  if (s.self.mascot) { s.orgs.mascotBeatPending = false; return false; }
  const club = s.orgs.clubs.find((c) => c.sport !== null);
  s.pendingInterrupt = {
    type: 'first-sport-club',
    payload: {
      clubName: club?.name ?? 'a sport club',
      sportId: club?.sport ?? null,
      mascotSuggestion: rollMascotSuggestion(),
    },
  };
  return true;
}

function fireAthleticDirectorOffer(s: GameState): boolean {
  if (s.orgs.athleticDirector) return false;
  if (s.orgs.teams.length === 0) return false;
  const asked = s.orgs.athleticDirectorAskedWeek;
  if (asked > 0 && absoluteWeek(s) - asked < AD_OFFER_COOLDOWN_WEEKS) return false;

  // Stamped here, not on the answer (see types.ts's athleticDirectorAskedWeek).
  s.orgs.athleticDirectorAskedWeek = absoluteWeek(s);
  s.pendingInterrupt = {
    type: 'athletic-director',
    payload: {
      candidates: rollAthleticDirectorCandidates(coachNamesInUse(s)),
      mascotSuggestion: rollMascotSuggestion(),
    },
  };
  return true;
}

// The varsity petition ('varsity-petition' in eventData.ts) on its own
// deterministic cadence: a club past VARSITY_PETITION_MIN_TENURE_YEARS
// (studentLifeData.ts) is guaranteed to be asked on a quiet week from
// VARSITY_PETITION_WEEK, rather than entering the weighted lottery.
function fireVarsityPetition(s: GameState): boolean {
  if (s.clock.week < VARSITY_PETITION_WEEK) return false;

  const event = findDecisionEvent('varsity-petition');
  if (!event?.rollContext) return false;
  const ctx = event.rollContext(s);
  if (ctx === null) return false;
  if (!hasFreeChoice(s, event, ctx)) return false;

  s.pendingInterrupt = { type: 'decision-event', payload: { eventId: event.id, ctx } };
  return true;
}

// The trustees' response to a rival passing the school ('rival-passed' in
// eventData.ts). Guaranteed rather than drawn, but it spends the shared
// decision cooldown, and is stamped per rival at fire time so it is never
// repeated. Only above ELITE_CLOSE_ABOVE_PRESTIGE: below it a school is
// passed most years and this would eat the whole decision budget.
function fireTrusteeResponse(s: GameState): boolean {
  if (s.clock.year < DECISION_EVENT_FIRST_YEAR) return false;
  if (s.self.reputation <= ELITE_CLOSE_ABOVE_PRESTIGE) return false;
  const week = absoluteWeek(s);
  if (s.events.lastDecisionWeek > 0 && week - s.events.lastDecisionWeek < DECISION_EVENT_COOLDOWN_WEEKS) return false;

  const event = findDecisionEvent('rival-passed');
  if (!event?.rollContext) return false;
  const ctx = event.rollContext(s);
  if (ctx === null || !ctx.subjectId) return false;
  if (!hasFreeChoice(s, event, ctx)) return false;

  s.events.passedResponses.push(ctx.subjectId);
  s.events.lastDecisionWeek = week;
  const history = s.events.decisionHistory[event.id] ?? { fires: 0, lastWeek: 0 };
  s.events.decisionHistory[event.id] = { fires: history.fires + 1, lastWeek: week };
  s.pendingInterrupt = { type: 'decision-event', payload: { eventId: event.id, ctx } };
  return true;
}

// A weekly probability, floored by a global cooldown, then a weighted draw
// across the events the current state makes eligible.
function rollDecisionEvent(s: GameState): void {
  if (s.clock.year < DECISION_EVENT_FIRST_YEAR) return;

  const week = absoluteWeek(s);
  if (s.events.lastDecisionWeek > 0 && week - s.events.lastDecisionWeek < DECISION_EVENT_COOLDOWN_WEEKS) return;
  if (random() >= DECISION_EVENT_WEEKLY_CHANCE) return;

  const eligible = DECISION_EVENTS.filter((event) => offCooldown(s, event, week) && event.eligible(s));
  if (eligible.length === 0) return;

  // If the winner's context fails or it has no free choice, the week stays
  // quiet rather than falling through, which would bias the mix.
  const chosen = weightedPick(eligible, s);
  if (!chosen) return;

  const history = s.events.decisionHistory[chosen.event.id] ?? { fires: 0, lastWeek: 0 };
  s.events.lastDecisionWeek = week;
  s.events.decisionHistory[chosen.event.id] = { fires: history.fires + 1, lastWeek: week };
  // A seat covering the event's domain answers routine by policy, and only
  // what escalates reaches the president (systems/delegation/seats.ts).
  if (delegate(s, chosen.event, chosen.ctx)) return;
  s.pendingInterrupt = {
    type: 'decision-event',
    // JSON-plain: the definition is looked up by id when rendered and applied.
    payload: { eventId: chosen.event.id, ctx: chosen.ctx },
  };
}

// Per-event gating on top of the global cooldown: optional maxFires plus a
// repeat cooldown.
function offCooldown(s: GameState, event: DecisionEvent, week: number): boolean {
  const history = s.events.decisionHistory[event.id];
  if (!history) return true;
  if (event.maxFires !== undefined && history.fires >= event.maxFires) return false;
  return week - history.lastWeek >= DECISION_EVENT_REPEAT_COOLDOWN_WEEKS;
}

function weightedPick(
  events: readonly DecisionEvent[],
  s: GameState,
): { event: DecisionEvent; ctx: DecisionEventContext } | null {
  // Weight times DecisionEvent.boost, read once so the total and the walk agree.
  const weightOf = (event: DecisionEvent) => event.weight * (event.boost?.(s) ?? 1);
  const total = events.reduce((sum, event) => sum + weightOf(event), 0);
  if (total <= 0) return null;

  let roll = random() * total;
  for (const event of events) {
    roll -= weightOf(event);
    if (roll > 0) continue;
    const ctx = event.rollContext ? event.rollContext(s) : {};
    if (ctx === null) return null;          // the event turned out not to be possible this week
    if (!hasFreeChoice(s, event, ctx)) return null; // no zero-cost way out: never show it (see eventData.ts)
    return { event, ctx };
  }
  return null;
}

// The opening letters (eventData.ts's OPENING_LETTERS): the first unread
// letter that is due fires on a quiet week and is marked read at fire time
// so it never re-fires. A calendar letter is due from its week of year one
// and never after it; a letter with `arrives` is due while that holds, in
// any year, and is recorded read unsent if its ask was done before it came.
// Yields to everything earned and to the one-shot questions.
export function fireOpeningLetter(s: GameState): boolean {
  if (s.events.opening.skipped) return false;
  const read = s.events.opening.read;
  for (const letter of OPENING_LETTERS) {
    if (read.includes(letter.id)) continue;
    const due = letter.arrives ? letter.arrives(s) : s.clock.year === 1 && letter.week <= s.clock.week;
    if (!due) continue;
    read.push(letter.id);
    if (letter.arrives && letter.done(s)) continue;
    s.pendingInterrupt = { type: 'letter', payload: { id: letter.id } };
    return true;
  }
  return false;
}

// The Deans' year-end recommendations (Plan 59): on the first quiet week
// of a year, every school with a Dean and an unstaffed course gets a plan
// to restaff it (restaffing.ts), put to the President once, accepted in one
// click. Only in the year's first quarter, so it reads as the year-end
// turnover it is, and once a year.
export const DEAN_RECOMMENDATION_WEEKS = 13;
export function deanSchoolsToRestaff(s: GameState): string[] {
  const deans = (s.seats ?? []).filter((x) => x.seatId === 'dean' && x.school !== null).map((x) => x.school!);
  return [...new Set(deans)].filter((school) => restaffPlan(s, school).length > 0);
}
function fireDeanRecommendations(s: GameState): boolean {
  if (s.events.deanYear === s.clock.year || s.clock.week > DEAN_RECOMMENDATION_WEEKS) return false;
  const schools = deanSchoolsToRestaff(s);
  if (schools.length === 0) return false;
  s.events.deanYear = s.clock.year;
  s.pendingInterrupt = { type: 'dean-recommendations', payload: { schools } };
  return true;
}

export function tickEvents(s: GameState): void {
  // The panel's unanswered events take their defaults whoever claims the
  // week.
  timeOutCatalogue(s);
  // Another system already claimed this week.
  if (s.pendingInterrupt) return;

  // Priority order: earned celebrations and one-shot questions first, the
  // random decision roll last.
  if (fireMilestoneCelebration(s)) return;
  if (fireCharterOffer(s)) return;
  if (fireDeanRecommendations(s)) return;
  if (fireResearchReport(s)) return;
  if (fireChampionshipReport(s)) return;
  if (fireMascotBeat(s)) return;
  if (fireAthleticDirectorOffer(s)) return;
  if (fireVarsityPetition(s)) return;
  if (fireTrusteeResponse(s)) return;
  if (fireOpeningLetter(s)) return;

  rollDecisionEvent(s);
  // The catalog (catalogueEngine.ts): a letter only on a week nothing
  // else claimed; an inline event joins the panel and the clock runs on.
  tickCatalogue(s);
}
