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

// Exported for the playtest panel's "celebrate the queue now" (see
// reducer.ts's DEBUG_FORCE_MILESTONE), which stands the frequency floor
// below down before calling it. Nothing else outside this file calls it.
export function fireMilestoneCelebration(s: GameState): boolean {
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
// The athletic director's one-time offer. Fires the first quiet week after
// the school fields a varsity team — the same self-healing shape
// fireCharterOffer uses above, and for the same reason: "a team exists" is a
// durable condition, so a busy week means the offer waits rather than being
// dropped.
//
// DECLINING IS NOT A ONE-SHOT, unlike the charter or the Hellenic Council.
// Those close a question for the run on purpose; this one must not, because a
// school that cannot afford a director in year 12 would otherwise lose the
// position — and with it the mascot, the shortage interrupts and the
// championship reports — for the rest of the game. A decline records the week
// and the offer comes back after AD_OFFER_COOLDOWN_WEEKS, phrased as the
// search continuing.
//
// The candidates are rolled HERE rather than in the reducer, and carried in
// the payload: the three people the modal describes must be the three people
// it can hire (see data/studentLifeData.ts's rollAthleticDirectorCandidates).
const AD_OFFER_COOLDOWN_WEEKS = 3 * WEEKS_PER_YEAR;

// A CHAMPIONSHIP. Queued rather than fired on the spot, for the same reason
// a milestone is: the playoff week may already belong to something else, and
// only one interrupt can be pending at a time. The queue drains one at a
// time — two titles in one year are two different teams and do not read as
// one modal.
function fireChampionshipReport(s: GameState): boolean {
  const sport = s.orgs.pendingTitles[0];
  if (!sport) return false;
  const result = s.orgs.lastSeason[sport];
  if (!result) {
    // Defensive: a queued sport with no result cannot be reported on, and
    // leaving it queued would block every title behind it forever.
    s.orgs.pendingTitles.shift();
    return false;
  }
  s.orgs.pendingTitles.shift();
  s.pendingInterrupt = { type: 'championship', payload: { result } };
  return true;
}

// THE FIRST SPORT CLUB'S BEAT (Plan 21's PR O): the moment the school stops
// being an institution and becomes a name people shout, moved out of the
// athletic-director modal — which keeps that modal about the director —
// and two decades earlier. Fires on the first quiet week after the club
// is recognised; if a mascot somehow exists already, the flag simply
// clears.
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

  // Stamped HERE, not on the answer — see types.ts's athleticDirectorAskedWeek
  // for the loop this closes.
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

// THE TRUSTEES' RESPONSE (Plan 17's PR D — see eventData.ts's
// 'rival-passed'). A rival that passed the school this year, read off the
// same crossing the Standing beat and the year in review report, is
// answered once: the first quiet week the shared cooldown allows, the
// board proposes a response. GUARANTEED rather than drawn, because being
// passed is a moment; but it spends the same budget as the lottery
// (lastDecisionWeek is stamped), so the defend era's years stop the clock
// no more often than the build era's. Stamped per rival at FIRE time, so a
// dismissed modal never comes back for the same school.
//
// ONLY IN THE DEFEND ERA — above the same prestige gate the elite band's
// closing term uses. Measured without the gate, a mid-table school is
// passed by somebody most years (a hundred schools reshuffle), so the board
// asked every year from year three, spent the whole decision budget on it,
// and — through the candidate the chair rolls — moved the sim's dice for
// every strategy from year five. At the top of the table being passed is
// news; at #55 it is the field breathing.
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
  // An event's weight, lifted by its boost for the moment (see
  // DecisionEvent.boost): read once here so the total and the walk agree.
  const weightOf = (event: DecisionEvent) => event.weight * (event.boost?.(s) ?? 1);
  const total = events.reduce((sum, event) => sum + weightOf(event), 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
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

// THE FIRST YEAR'S LETTERS (Plan 16's PR F — see data/eventData.ts's
// OPENING_LETTERS). In year one only: the first unread letter whose week
// has come fires, on the first quiet week at or after it, and is marked
// read at fire time so a generic dismissal can never re-fire it. It yields
// to everything the player EARNED — a queued milestone, a finished project's
// report, a title — and to the one-shot questions, and outranks only the
// random decision roll (which does not run in year one anyway): a letter is
// the board's voice, and the board does not talk over a celebration. In
// practice nothing earned exists in weeks 1 to 9 of a new school, so the
// first three arrive on their weeks; the fourth may wait a quiet week
// behind a late-year milestone. A run that declined the script on the
// first letter never sees another; a letter still unread when year two
// begins is simply not sent — the script is the first year, and a player
// who reached summer two has the loop.
export function fireOpeningLetter(s: GameState): boolean {
  if (s.clock.year !== 1 || s.events.opening.skipped) return false;
  const letter = OPENING_LETTERS.find((l) => l.week <= s.clock.week && !s.events.opening.read.includes(l.id));
  if (!letter) return false;
  s.events.opening.read.push(letter.id);
  s.pendingInterrupt = { type: 'letter', payload: { id: letter.id } };
  return true;
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
  if (fireChampionshipReport(s)) return;
  if (fireMascotBeat(s)) return;
  if (fireAthleticDirectorOffer(s)) return;
  if (fireVarsityPetition(s)) return;
  if (fireTrusteeResponse(s)) return;
  if (fireOpeningLetter(s)) return;

  rollDecisionEvent(s);
}
