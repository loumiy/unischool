import type { GameState } from '../../state/types';
import type { DecisionEvent, DecisionEventContext, MilestoneEntry, MilestonePayload } from '../../data/eventData';
import {
  DECISION_EVENTS, DECISION_EVENT_COOLDOWN_WEEKS, DECISION_EVENT_FIRST_YEAR,
  DECISION_EVENT_REPEAT_COOLDOWN_WEEKS, DECISION_EVENT_WEEKLY_CHANCE,
  MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN, VARSITY_PETITION_WEEK,
  absoluteWeek, describeMilestone, findDecisionEvent, hasFreeChoice,
} from '../../data/eventData';
import { labEquippedFields } from '../../data/researchData';

// ---------------------------------------------------------------------
// The week-to-week texture system. One ordinary pure tick function, last
// in the reducer's SYSTEMS order, that can raise exactly two kinds of
// interrupt on the EXISTING mechanism (see
// docs/architecture/interrupts.md): a celebration for a genuinely special
// curriculum milestone, and one of the authored decision events in
// data/eventData.ts. All of the content — which milestones are special,
// what the events are, what they cost, how often they may fire — is data
// over there; what is here is only the cadence logic that reads it.
//
// WHY THIS RUNS LAST. The summer admissions decision (tickAdmissions) and
// the U.S. News report (tickRivals) own their weeks, and only one
// interrupt can be pending at a time. Running last means this system sees
// their claim and stands down, so neither annual interrupt ever has to
// know that decision events exist and no week numbers are duplicated
// anywhere. Nothing is lost by standing down: milestones wait in
// s.events.pendingMilestones for the next quiet week, and a decision
// event that didn't fire this week is simply one that didn't happen.
//
// WHAT ELSE RIDES HERE. Two more things use this same stand-down-and-
// drain slot rather than raising interrupts of their own:
//
//   - The RESEARCH COMPLETION report. researchSystem.ts files one when a
// project runs its course — outputs, team, and the award if it won one —
// onto s.research.pendingCompletions; this drains it on the next quiet
// week, exactly as it drains milestones. It is the ONLY research moment
// that stops the clock: grants, publications and breakthroughs resolve
// silently into finance and the prestige target as they land (see
// docs/design/research.md), and are reported together at the end.
//   - The COLLEGE -> UNIVERSITY charter offer, fired once, the first
//     quiet week after any lab finishes. It needs no queue at all: "a
//     finished lab exists" is a durable condition (nothing ever un-
//     finishes), so a busy week simply means the offer waits, and the
//     one-shot guard is the flag the answer sets.
//   - The VARSITY PETITION's deterministic cadence (fireVarsityPetition
//     below): a sport club that has cleared its five-year tenure gate
//     (studentLifeData.ts) is asked on the first quiet week at or after
//     VARSITY_PETITION_WEEK, GUARANTEED rather than merely eligible for
//     the weighted lottery below — see the function's own comment for why.
//
// WHY A QUEUE FOR MILESTONES. techSystem.ts awards milestones the week
// the last course finishes, which may well be the week the admissions
// interrupt fires — and dropping the celebration in that case would mean
// the single best moment in a decade of play silently not happening.
// techSystem pushes the key onto s.events.pendingMilestones and this
// system drains it, so the celebration is at worst delayed. Draining the
// WHOLE queue into one interrupt is what keeps a burst of simultaneous
// completions to a single modal.
// ---------------------------------------------------------------------

function fireMilestoneCelebration(s: GameState): boolean {
  if (s.events.pendingMilestones.length === 0) return false;

  const week = absoluteWeek(s);
  // The frequency floor. Milestones inside the window stay queued rather
  // than being dropped — see MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN.
  if (s.events.lastMilestoneWeek > 0 && week - s.events.lastMilestoneWeek < MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN) {
    return false;
  }

  const keys = s.events.pendingMilestones;
  const entries = keys
    .map((key) => describeMilestone(s, key))
    .filter((e): e is MilestoneEntry => e !== null);

  // Always empty the queue, including any key describeMilestone couldn't
  // resolve (a milestone kind that no longer exists in the curriculum
  // data, e.g. after a content edit) — a key that can never be described
  // must not sit in the queue forever blocking the ones behind it.
  s.events.pendingMilestones = [];
  s.events.lastMilestoneWeek = week;
  if (entries.length === 0) return false;

  const payload: MilestonePayload = { keys: entries.map((e) => e.key), entries };
  s.pendingInterrupt = { type: 'milestone', payload };
  return true;
}

// The research completion report (see systems/research/researchSystem.ts).
// Same contract as the milestone celebration above: everything in it has
// already happened — the outputs banked, the grant money spent, the award's
// permanent premium applied — and this is the report on it, so a delayed
// modal never delays an effect.
//
// ONE AT A TIME, unlike the milestone queue this otherwise mirrors. A
// milestone celebration is a headline and several of them read as one
// modal; a completion report is a page about one project, with its own
// team and its own outputs, and two of them stacked would be two pages the
// player has to read as one. Concluding two projects in the same week is
// rare enough that the next quiet week reporting the second is the right
// trade.
//
// No frequency floor of its own: a project takes between six months and
// five years, so the queue is naturally spaced, and adding a second
// spacing rule on top would only be able to delay the one modal research
// is allowed.
function fireResearchReport(s: GameState): boolean {
  const report = s.research.pendingCompletions.shift();
  if (!report) return false;

  s.pendingInterrupt = { type: 'research-complete', payload: { report } };
  return true;
}

// The one-time College -> University charter offer, gated on the same lab
// that gates research (see docs/design/progression.md's "College and
// University"). Cosmetic: what the player is choosing is which word
// follows their school's name, and the flag is set either way so the
// question is asked exactly once.
//
// Deliberately not an authored decision event: it has no cost, no roll and
// no repeat, and putting it in that table would mean giving it a weight
// and a cooldown it can never use.
function fireCharterOffer(s: GameState): boolean {
  if (s.self.universityCharterOffered) return false;
  // The same lab gate research itself runs on, read through the same
  // helper — so "the charter arrives with the first lab" can never drift
  // from "research starts with the first lab".
  if (labEquippedFields(s).size === 0) return false;

  s.pendingInterrupt = { type: 'charter' };
  return true;
}

// The varsity petition's OWN deterministic cadence (see data/eventData.ts's
// 'varsity-petition' entry and studentLifeData.ts's VARSITY_PETITION_MIN_
// TENURE_YEARS): a club that has cleared five years since founding is
// GUARANTEED to be asked, rather than merely eligible to win the weighted
// lottery rollDecisionEvent runs below — that lottery is what made the
// pipeline slow (and unpredictable) in the first place. Reuses the same
// authored prompt/choices/apply and the same 'decision-event' interrupt
// shape; only how it gets raised differs.
//
// From VARSITY_PETITION_WEEK through year-end, any quiet week fires one
// waiting club — the same self-healing shape fireCharterOffer uses, so a
// week lost to a milestone or another interrupt just means the next quiet
// week asks instead, never a lost petition.
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

// The trigger model: a weekly probability, floored by a global cooldown,
// then a WEIGHTED draw across everything the current game state makes
// eligible. Purely random in its timing; entirely state-driven in its
// content — a donor only turns up at a school worth donating to, a
// heating plant only fails on a campus big enough to have one.
function rollDecisionEvent(s: GameState): void {
  if (s.clock.year < DECISION_EVENT_FIRST_YEAR) return;

  const week = absoluteWeek(s);
  if (s.events.lastDecisionWeek > 0 && week - s.events.lastDecisionWeek < DECISION_EVENT_COOLDOWN_WEEKS) return;
  if (Math.random() >= DECISION_EVENT_WEEKLY_CHANCE) return;

  const eligible = DECISION_EVENTS.filter((event) => offCooldown(s, event, week) && event.eligible(s));
  if (eligible.length === 0) return;

  // Draw one, weighted. The winner is only committed once its context
  // rolls successfully and it passes the no-soft-lock check; otherwise the
  // week simply stays quiet rather than falling through to a second-choice
  // event, which would quietly bias the mix toward whatever happens to be
  // listed next.
  const chosen = weightedPick(eligible, s);
  if (!chosen) return;

  const history = s.events.decisionHistory[chosen.event.id] ?? { fires: 0, lastWeek: 0 };
  s.events.lastDecisionWeek = week;
  s.events.decisionHistory[chosen.event.id] = { fires: history.fires + 1, lastWeek: week };
  s.pendingInterrupt = {
    type: 'decision-event',
    // JSON-plain, like every other payload: the event's id plus whatever
    // it rolled about itself. The definition (prompt, choices, effects)
    // is looked up from the data table by id when the modal renders and
    // again when the reducer applies the choice, so nothing unserializable
    // ever reaches state.
    payload: { eventId: chosen.event.id, ctx: chosen.ctx },
  };
}

// Per-event gating on top of the global cooldown: an optional hard cap on
// how many times an event may ever fire, plus a repeat cooldown so the
// same donor or the same failure doesn't come back around while the player
// still remembers the last one.
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
  const total = events.reduce((sum, event) => sum + event.weight, 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  for (const event of events) {
    roll -= event.weight;
    if (roll > 0) continue;
    const ctx = event.rollContext ? event.rollContext(s) : {};
    if (ctx === null) return null;          // the event turned out not to be possible this week
    if (!hasFreeChoice(s, event, ctx)) return null; // no zero-cost way out: never show it (see eventData.ts)
    return { event, ctx };
  }
  return null;
}

export function tickEvents(s: GameState): void {
  // Another system already claimed this week — stand down entirely.
  if (s.pendingInterrupt) return;

  // Celebrations take priority over authored events: a queued milestone or
  // a concluded research project is something the player earned, an event
  // is something that merely happened. The charter offer sits between them — it is a
  // question rather than a celebration, but it is a one-shot tied to a
  // moment, so it should not wait behind a random draw.
  if (fireMilestoneCelebration(s)) return;
  if (fireCharterOffer(s)) return;
  if (fireResearchReport(s)) return;
  if (fireVarsityPetition(s)) return;

  rollDecisionEvent(s);
}
