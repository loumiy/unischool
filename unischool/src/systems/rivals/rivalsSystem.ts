import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../../state/types';
import { athleticProgramStrength } from '../../data/studentLifeData';
import { makeRivalRng } from '../../data/rivalData';

// ---------------------------------------------------------------------
// Rivals evolve so the ranking stays a live target across decades (see
// docs/design/progression.md's "Rankings: the U.S. News report" —
// prestige "fluctuates dynamically year to year rather than sitting
// static"). Once a year, each rival's momentum can reroll (a new
// multi-year trend begins) and every rival also takes an independent
// random shock on top, so the leaderboard visibly reshuffles rather
// than drifting in a smooth, predictable line. Reputation is clamped to
// a sane band so the numbers stay legible after decades of compounding
// drift.
// ---------------------------------------------------------------------
const MOMENTUM_REROLL_CHANCE = 0.35; // per rival, per year
const MOMENTUM_RANGE = 3.5;          // new momentum spans roughly [-1.6, +1.9]
const MOMENTUM_UPWARD_BIAS = 0.45;   // slight upward skew, so the field isn't a pure random walk
const ANNUAL_SHOCK_RANGE = 5;        // independent +/- jitter applied every year, on top of momentum
const RIVAL_REPUTATION_MIN = 5;
const RIVAL_REPUTATION_MAX = 150;

// The U.S. News report is a mid-game reveal (see
// docs/design/progression.md): the player is unaware of it until prestige
// first cracks the top TOP_50_CUTOFF, which fires a one-time reveal
// interrupt; thereafter an annual report fires at REPORT_WEEK every year.
// REPORT_WEEK is deliberately not WEEKS_PER_YEAR (that's admissions'
// summer boundary) so the two interrupts never compete for the same tick
// — see reducer.ts's generic "hold the clock while a system just enqueued
// an interrupt" handling.
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
  // slow-moving stock driven by curriculum breadth, selectivity, incoming
  // student quality, faculty and research, drifted toward its target a little
  // every week. See prestigeSystem.ts's tickPrestige, registered in
  // reducer.ts's SYSTEMS array.

  if (s.clock.week === WEEKS_PER_YEAR) {
    // ONE draw on the global stream per year, whatever the field size, and
    // then the whole field's drift runs off a local PRNG seeded from it.
    //
    // WHY, and it is a harness property rather than a gameplay one. The
    // drift used to call Math.random() two or three times PER RIVAL, so the
    // number of global draws a year scaled with the size of the rival
    // table. sim/balanceSim.ts seeds Math.random to make a run
    // reproducible, and its own note says the hazard outright: "any content
    // change that alters how many times Math.random is called ... moves the
    // whole stream, so a single seed cannot tell 'this rebalanced the game'
    // from 'this reshuffled the dice'". Adding 44 schools moved it by ~120
    // draws a year and knocked four checks off
    // test/balance-regression.test.ts at the default seed — with, as the
    // PR's controls showed, no economic effect whatsoever: nothing outside
    // this module reads a rival, and a 100-school field run on the OLD
    // stream reproduced main's results at every seed tried, including the
    // seed main itself fails.
    //
    // Pinning consumption at one draw is what stops that happening again.
    // The field can now grow, or gain axes of its own to drift (which is
    // exactly what this plan's next two PRs do), without reshuffling a
    // single faculty potential or candidate listing.
    //
    // Deliberately seeded from Math.random rather than from the id and the
    // year: a deterministic function of those would make every run's
    // leaderboard reshuffle identically, and the field's year-to-year
    // surprise is the whole of what it is for.
    // THREE STREAMS FROM ONE SEED, and the split is not fastidiousness.
    // Running all three axes off a single generator would mean each rival's
    // reputation draw came after the previous rival had consumed four more
    // numbers for the other two axes — so adding an axis would silently
    // change every rival's ACADEMIC trajectory, and through the one channel
    // rivals do reach the economy (when the top-50 reveal fires, and
    // therefore which weeks the annual report takes away from decision
    // events) it would move the balance sim. Measured, before this split: it
    // did, from year 10 onward.
    //
    // Derived by xor rather than by three separate Math.random() calls so the
    // global stream still sees exactly one draw a year however many axes the
    // field grows — the property PR 1A introduced this generator for.
    const seed = Math.floor(Math.random() * 4294967296);
    const roll = makeRivalRng(seed);
    const socialRoll = makeRivalRng(seed ^ 0x9e37_79b9);
    const researchRoll = makeRivalRng(seed ^ 0x85eb_ca6b);
    for (const r of s.rivals) {
      // Occasionally reroll momentum so trends aren't permanent.
      if (roll() < MOMENTUM_REROLL_CHANCE) {
        r.momentum = (roll() - MOMENTUM_UPWARD_BIAS) * MOMENTUM_RANGE;
      }
      const shock = (roll() - 0.5) * ANNUAL_SHOCK_RANGE;
      r.reputation = clamp(r.reputation + r.momentum + shock, RIVAL_REPUTATION_MIN, RIVAL_REPUTATION_MAX);

      // The other two standings drift the same way, each on its OWN
      // momentum — which is what keeps the three tables from moving as one
      // body. A school can be climbing academically while its campus life
      // slides, and a reader comparing two of the three lists should find
      // them telling different stories.
      //
      // All of it still runs off `roll`, so the field's whole annual pass
      // costs one draw on the global stream no matter how many axes it
      // grows (see the note above).
      r.socialMomentum = driftMomentum(r.socialMomentum, socialRoll);
      r.researchMomentum = driftMomentum(r.researchMomentum, researchRoll);
      r.socialStanding = clamp(
        r.socialStanding + r.socialMomentum + (socialRoll() - 0.5) * ANNUAL_SHOCK_RANGE,
        RIVAL_REPUTATION_MIN, RIVAL_REPUTATION_MAX,
      );
      r.researchStanding = clamp(
        r.researchStanding + r.researchMomentum + (researchRoll() - 0.5) * ANNUAL_SHOCK_RANGE,
        RIVAL_REPUTATION_MIN, RIVAL_REPUTATION_MAX,
      );
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
          payload: {
            rank, previousRank: null, movers: [], passed: [], passedBy: [],
            standings: rankedList(s).slice(0, TOP_50_CUTOFF),
            others: otherStandings(s),
          },
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

// One axis's momentum, rerolled on the same odds and into the same band the
// academic one uses. Extracted rather than written three times: the two new
// axes do exactly what reputation's momentum has always done, and any future
// retune of "how often does a trend break" should move all three together.
function driftMomentum(current: number, roll: () => number): number {
  if (roll() >= MOMENTUM_REROLL_CHANCE) return current;
  return (roll() - MOMENTUM_UPWARD_BIAS) * MOMENTUM_RANGE;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------
// THE LEADERBOARDS — four of them, from one function.
//
// This used to be three near-identical copies: rankedList/playerRank for
// reputation and athleticRankedList/athleticRank for athletic strength,
// differing only in which field they sorted on. Adding two more standings
// (see prestigeSystem.ts) would have made it five, so the axis becomes a
// parameter instead.
//
// What makes this a one-liner rather than a refactor is that the player and
// a rival name these fields IDENTICALLY — `socialStanding` is
// `socialStanding` on both sides — which is why types.ts says that is not
// cosmetic. The one exception is athletics, where the player has no stored
// field at all: their strength is computed live from the teams they field
// (athleticProgramStrength), so that axis reads through a function while the
// other three read a property.
// ---------------------------------------------------------------------
export type StandingAxis = 'reputation' | 'socialStanding' | 'researchStanding' | 'athleticStrength';

export interface RankedEntry {
  key: string;   // 'self', or the rival's id — never the name, which two schools may share
  name: string;
  mascot: string;
  value: number;
  isPlayer: boolean;
}

// The player's own number on an axis. Athletics is the odd one out (see
// above); the other three are stocks sitting on s.self.
function selfValue(s: GameState, axis: StandingAxis): number {
  return axis === 'athleticStrength' ? athleticProgramStrength(s) : s.self[axis];
}

export function rankedListBy(s: GameState, axis: StandingAxis): RankedEntry[] {
  const all: RankedEntry[] = [
    { key: 'self', name: institutionName(s.self), mascot: s.self.mascot, value: selfValue(s, axis), isPlayer: true },
    ...s.rivals.map((r) => ({ key: r.id, name: r.name, mascot: r.mascot, value: r[axis], isPlayer: false })),
  ];
  return all.sort((a, b) => b.value - a.value);
}

// The player's 1-indexed position on an axis.
export function rankBy(s: GameState, axis: StandingAxis): number {
  return rankedListBy(s, axis).findIndex((e) => e.isPlayer) + 1;
}

// Named wrappers, so nothing outside this module has to learn an axis
// vocabulary to ask the question it was already asking.
export function rankedList(s: GameState) {
  return rankedListBy(s, 'reputation');
}

export function playerRank(s: GameState): number {
  return rankBy(s, 'reputation');
}

// Athletics' own ranking axis (Athletics V2's "scores & standings"): a
// second, INDEPENDENT leaderboard — a school can be an academic power and an
// athletic minnow, or the reverse, same as real conferences (see
// rivalData.ts's athleticStrengthFor for why the axes are decoupled).
export function athleticRank(s: GameState): number {
  return rankBy(s, 'athleticStrength');
}

// ---------------------------------------------------------------------
// The annual report's year-over-year movement (see
// docs/design/progression.md's "Rankings"). The standings alone are a list
// of names; what a player actually feels is motion — that they climbed
// three places, that a rival is surging, that they finally passed a school
// that had been ahead of them for a decade. All of it is derived from data
// that already exists: the history record's prior-year rank/prestige (see
// state/history.ts) and the rivals' own momentum field.
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

// The two years are compared on RankedEntry above, which is already keyed by
// identity rather than by name — so two schools that happen to share a name
// (the player is free to name theirs anything) never collapse into one row.
function sortedByValue(entries: RankedEntry[]): RankedEntry[] {
  return [...entries].sort((a, b) => b.value - a.value);
}

function currentEntries(s: GameState): RankedEntry[] {
  return rankedListBy(s, 'reputation');
}

// Last year's table, reconstructed: the player's prestige comes from the
// history row recorded a year ago; each rival's is stepped back by one
// momentum step (see the estimate note above).
function previousEntries(s: GameState, previousPrestige: number): RankedEntry[] {
  return sortedByValue([
    { key: 'self', name: institutionName(s.self), mascot: s.self.mascot, value: previousPrestige, isPlayer: true },
    ...s.rivals.map((r) => ({ key: r.id, name: r.name, mascot: r.mascot, value: r.reputation - r.momentum, isPlayer: false })),
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
  standings: RankedEntry[]; // the top TOP_50_CUTOFF on the ACADEMIC axis — the list the report is about
  // The other two standings, as one line each under the headline rank (see
  // prestigeSystem.ts). Deliberately NOT two more tables: the report is a
  // modal, and the full lists belong where their subject does.
  others: OtherStanding[];
}

// One of the two secondary axes, as the report shows it.
//
// NO YEAR-OVER-YEAR MOVE, and the absence is honest rather than lazy.
// YearSnapshot records one `rank`, the academic one, and a move needs a
// stored prior — the rivals' side of the academic movers list is
// reconstructed by stepping momentum back, but the PLAYER's side is read off
// the history row, and there is no row for these. Rather than infer a
// number, each line carries the school that LEADS the axis, which is the
// context a bare rank was missing: "#37 of 100, behind the Harrowgate
// Ravens" says something a "#37" does not.
export interface OtherStanding {
  label: string;
  rank: number;
  value: number;
  leader: string;      // the school at the top of this axis
  leaderMascot: string;
  isLeader: boolean;   // the player IS the leader, in which case the modal says so instead
}

function otherStanding(s: GameState, label: string, axis: StandingAxis): OtherStanding {
  const list = rankedListBy(s, axis);
  const top = list[0];
  const me = list.find((e) => e.isPlayer)!;
  return {
    label,
    rank: list.findIndex((e) => e.isPlayer) + 1,
    value: me.value,
    leader: top.name,
    leaderMascot: top.mascot,
    isLeader: top.isPlayer,
  };
}

function otherStandings(s: GameState): OtherStanding[] {
  return [
    otherStanding(s, 'Research', 'researchStanding'),
    otherStanding(s, 'Campus life', 'socialStanding'),
  ];
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
    return { rank, previousRank: null, movers: [], passed: [], passedBy: [], standings, others: otherStandings(s) };
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
    others: otherStandings(s),
  };
}
