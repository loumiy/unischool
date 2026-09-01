import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// ---------------------------------------------------------------------
// Rivals evolve so the ranking stays a live target across decades (see
// README's "Rankings: the U.S. News report" — prestige "fluctuates
// dynamically year to year rather than sitting static"). Once a year,
// each rival's momentum can reroll (a new multi-year trend begins) and
// every rival also takes an independent random shock on top, so the
// leaderboard visibly reshuffles rather than drifting in a smooth,
// predictable line. Reputation is clamped to a sane band so the numbers
// stay legible after decades of compounding drift.
// ---------------------------------------------------------------------
const MOMENTUM_REROLL_CHANCE = 0.35; // per rival, per year
const MOMENTUM_RANGE = 3.5;          // new momentum spans roughly [-1.6, +1.9]
const MOMENTUM_UPWARD_BIAS = 0.45;   // slight upward skew, so the field isn't a pure random walk
const ANNUAL_SHOCK_RANGE = 5;        // independent +/- jitter applied every year, on top of momentum
const RIVAL_REPUTATION_MIN = 5;
const RIVAL_REPUTATION_MAX = 150;

// The U.S. News report is a mid-game reveal (see README): the player is
// unaware of it until prestige first cracks the top TOP_50_CUTOFF, which
// fires a one-time reveal interrupt; thereafter an annual report fires at
// REPORT_WEEK every year. REPORT_WEEK is deliberately not WEEKS_PER_YEAR
// (that's admissions' summer boundary) so the two interrupts never
// compete for the same tick — see reducer.ts's generic "hold the clock
// while a system just enqueued an interrupt" handling.
const TOP_50_CUTOFF = 50;
const REPORT_WEEK = Math.floor(WEEKS_PER_YEAR / 2);

// --- the report's year-over-year movement section ---
// A rival has to move MORE than this many places to be worth naming: one
// or two places of shuffling is the field breathing, not news.
const RIVAL_MOVE_THRESHOLD = 2;
// Caps on how much of that movement the modal lists, so a chaotic year
// reads as a report rather than a wall of names. Both lists are sorted
// biggest-move-first, so what's cut is always the least interesting.
const MAX_MOVERS_SHOWN = 6;
const MAX_PASSED_SHOWN = 5;

export function tickRivals(s: GameState): void {
  // The player's own reputation (prestige) no longer moves here — it is a
  // slow-moving stock driven by curriculum breadth, selectivity, and
  // incoming student quality, drifted toward once a year at the admissions
  // boundary. See prestigeSystem.ts's tickPrestigeAnnual, called from
  // reducer.ts's RESOLVE_ADMISSIONS.

  if (s.clock.week === WEEKS_PER_YEAR) {
    for (const r of s.rivals) {
      // Occasionally reroll momentum so trends aren't permanent.
      if (Math.random() < MOMENTUM_REROLL_CHANCE) {
        r.momentum = (Math.random() - MOMENTUM_UPWARD_BIAS) * MOMENTUM_RANGE;
      }
      const shock = (Math.random() - 0.5) * ANNUAL_SHOCK_RANGE;
      r.reputation = clamp(r.reputation + r.momentum + shock, RIVAL_REPUTATION_MIN, RIVAL_REPUTATION_MAX);
    }
  }

  if (!s.pendingInterrupt) {
    if (!s.hasEnteredRankings) {
      const rank = playerRank(s);
      if (rank <= TOP_50_CUTOFF) {
        s.hasEnteredRankings = true;
        // The one-time reveal carries no movement section: the player had
        // no standing to move from, and buildReportPayload's year-over-year
        // comparison would be meaningless on the week they first appear.
        s.pendingInterrupt = {
          type: 'rankings-entry',
          payload: { rank, previousRank: null, movers: [], passed: [], passedBy: [], standings: rankedList(s).slice(0, TOP_50_CUTOFF) },
        };
      }
    } else if (s.clock.week === REPORT_WEEK) {
      s.pendingInterrupt = {
        type: 'annual-report',
        payload: buildReportPayload(s),
      };
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Convenience: full ranked list including the player.
export function rankedList(s: GameState) {
  const all = [
    { name: s.self.name, reputation: s.self.reputation, isPlayer: true },
    ...s.rivals.map((r) => ({ name: r.name, reputation: r.reputation, isPlayer: false })),
  ];
  return all.sort((a, b) => b.reputation - a.reputation);
}

// The player's 1-indexed position in the full ranked list.
export function playerRank(s: GameState): number {
  return rankedList(s).findIndex((r) => r.isPlayer) + 1;
}

// ---------------------------------------------------------------------
// The annual report's year-over-year movement (see README's "Rankings").
// The standings alone are a list of names; what a player actually feels is
// motion — that they climbed three places, that a rival is surging, that
// they finally passed a school that had been ahead of them for a decade.
// All of it is derived from data that already exists: the history record's
// prior-year rank/prestige (see state/history.ts) and the rivals' own
// momentum field.
//
// ESTIMATE, and deliberately so: nothing stores last year's rival
// reputations, so "where each rival stood a year ago" is reconstructed by
// stepping their current reputation back by one momentum step. Momentum is
// the persistent trend, but tickRivals also applies an independent random
// shock each year (ANNUAL_SHOCK_RANGE) that is not recoverable, so a
// reported place move can be off by a place or two for rivals sitting in a
// tightly packed part of the table. The player's OWN movement is exact —
// it compares two recorded ranks — and so are the passed/passed-by lists'
// current side; only the rivals' prior side is inferred.
// ---------------------------------------------------------------------

// A ranked entry keyed by identity rather than name, so two schools that
// happen to share a name (the player is free to name theirs anything)
// never collapse into one row when the two years are compared.
interface RankedEntry {
  key: string;
  name: string;
  reputation: number;
  isPlayer: boolean;
}

function sortedByReputation(entries: RankedEntry[]): RankedEntry[] {
  return [...entries].sort((a, b) => b.reputation - a.reputation);
}

function currentEntries(s: GameState): RankedEntry[] {
  return sortedByReputation([
    { key: 'self', name: s.self.name, reputation: s.self.reputation, isPlayer: true },
    ...s.rivals.map((r) => ({ key: r.id, name: r.name, reputation: r.reputation, isPlayer: false })),
  ]);
}

// Last year's table, reconstructed: the player's prestige comes from the
// history row recorded a year ago; each rival's is stepped back by one
// momentum step (see the estimate note above).
function previousEntries(s: GameState, previousPrestige: number): RankedEntry[] {
  return sortedByReputation([
    { key: 'self', name: s.self.name, reputation: previousPrestige, isPlayer: true },
    ...s.rivals.map((r) => ({ key: r.id, name: r.name, reputation: r.reputation - r.momentum, isPlayer: false })),
  ]);
}

function placesByKey(entries: RankedEntry[]): Map<string, number> {
  return new Map(entries.map((e, i) => [e.key, i + 1]));
}

// One rival's year-over-year move. `delta` is positive for a climb (a
// smaller rank number), matching how the modal renders it.
export interface RankMove {
  name: string;
  from: number;
  to: number;
  delta: number;
}

export interface ReportPayload {
  rank: number;
  previousRank: number | null; // null when there is no prior year to compare against
  movers: RankMove[];
  passed: string[];            // schools that were ahead a year ago and are behind now
  passedBy: string[];          // schools that were behind a year ago and are ahead now
  standings: Array<{ name: string; reputation: number; isPlayer: boolean }>;
}

export function buildReportPayload(s: GameState): ReportPayload {
  const standings = rankedList(s).slice(0, TOP_50_CUTOFF);
  const rank = playerRank(s);

  // The history row from a year ago. The most recent row (at -1) is the
  // standing the school ENTERED this year with — and since rivals only move
  // at week WEEKS_PER_YEAR and prestige only drifts at the admissions
  // boundary, nothing has changed between then and REPORT_WEEK, so it is
  // simply today's standing. The row before it (at -2) is therefore what
  // "a year ago" means for this report.
  const priorYear = s.history.length >= 2 ? s.history[s.history.length - 2] : null;
  if (!priorYear) {
    return { rank, previousRank: null, movers: [], passed: [], passedBy: [], standings };
  }

  const current = currentEntries(s);
  const previous = previousEntries(s, priorYear.prestige);
  const nowPlace = placesByKey(current);
  const thenPlace = placesByKey(previous);

  const movers: RankMove[] = [];
  const passed: string[] = [];
  const passedBy: string[] = [];

  const selfNow = nowPlace.get('self') ?? rank;
  const selfThen = thenPlace.get('self') ?? rank;

  for (const rival of s.rivals) {
    const to = nowPlace.get(rival.id);
    const from = thenPlace.get(rival.id);
    if (to === undefined || from === undefined) continue;

    const delta = from - to; // positive = climbed
    if (Math.abs(delta) > RIVAL_MOVE_THRESHOLD) {
      movers.push({ name: rival.name, from, to, delta });
    }

    // Crossings are read off the two orderings rather than off the rank
    // deltas, so "you passed them" stays true whether it was your climb,
    // their slide, or both.
    if (from < selfThen && to > selfNow) passed.push(rival.name);
    if (from > selfThen && to < selfNow) passedBy.push(rival.name);
  }

  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    rank,
    previousRank: priorYear.rank,
    movers: movers.slice(0, MAX_MOVERS_SHOWN),
    passed: passed.slice(0, MAX_PASSED_SHOWN),
    passedBy: passedBy.slice(0, MAX_PASSED_SHOWN),
    standings,
  };
}
