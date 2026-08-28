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
        s.pendingInterrupt = {
          type: 'rankings-entry',
          payload: { rank, standings: rankedList(s).slice(0, TOP_50_CUTOFF) },
        };
      }
    } else if (s.clock.week === REPORT_WEEK) {
      s.pendingInterrupt = {
        type: 'annual-report',
        payload: { rank: playerRank(s), standings: rankedList(s).slice(0, TOP_50_CUTOFF) },
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
