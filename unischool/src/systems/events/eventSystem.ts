import type { GameState } from '../../state/types';
import type { DecisionEvent, DecisionEventContext, MilestoneEntry, MilestonePayload } from '../../data/eventData';
import {
  DECISION_EVENTS, DECISION_EVENT_COOLDOWN_WEEKS, DECISION_EVENT_FIRST_YEAR,
  DECISION_EVENT_REPEAT_COOLDOWN_WEEKS, DECISION_EVENT_WEEKLY_CHANCE,
  MILESTONE_INTERRUPT_MIN_WEEKS_BETWEEN,
  absoluteWeek, describeMilestone, hasFreeChoice,
} from '../../data/eventData';

// ---------------------------------------------------------------------
// The week-to-week texture system. One ordinary pure tick function, last
// in the reducer's SYSTEMS order, that can raise exactly two kinds of
// interrupt on the EXISTING mechanism (see README's "Interrupts"): a
// celebration for a genuinely special curriculum milestone, and one of
// the authored decision events in data/eventData.ts. All of the content —
// which milestones are special, what the events are, what they cost, how
// often they may fire — is data over there; what is here is only the
// cadence logic that reads it.
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

  // Celebrations take priority over authored events: a queued milestone is
  // something the player earned, an event is something that merely
  // happened.
  if (fireMilestoneCelebration(s)) return;

  rollDecisionEvent(s);
}
