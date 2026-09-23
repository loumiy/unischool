import type { GameState, Rival, VarsityTeam } from '../../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../../state/types';
import { athleticProgramStrength, teamQuality } from '../../data/studentLifeData';
import { ELITE_RIVAL_IDS, makeRivalRng, sportStrengthFor } from '../../data/rivalData';
import { clamp } from '../../math';
import { random } from '../../engine/random';

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
// Athletics' own band, narrower than the three standings' 5..150. The ceiling
// sits BELOW the 100 teamQuality can reach, on purpose: sportStrengthFor
// (data/rivalData.ts) spreads this number by up to 28 points per sport and
// has to land inside 0..100 without being clamped into it, or the top of
// every sport's table collapses into a tie. A little above the seeding
// ceiling of 80, so a school that climbs for decades is not stuck against the
// same wall it started under.
const ATHLETIC_STRENGTH_MIN = 5;
const ATHLETIC_STRENGTH_MAX = 85;

// THE TOP HAS TO BE HELD (Plan 17's PR D). The elite band (rivalData.ts's
// ELITE_RIVAL_IDS) gains a term in its annual drift: a pull toward the
// player's own standing less ELITE_CLOSE_GAP, at a rate that closes a
// ten-point gap in about five years. The player can still be first; the
// field arrives. Applied only while the player is above
// ELITE_CLOSE_ABOVE_PRESTIGE, so the found and build eras are untouched —
// a school climbing through the 80s meets the same field it always did.
//
// Deterministic, and only ever UPWARD on the rival: a rival already above
// the target keeps its own number and its ordinary drift. With Plan 15's
// asymmetric prestige a school that coasts falls, and a field closing at
// this rate is what makes falling cost rank — the whole mechanism of the
// defend era, and it needs no new system. No draw on any random stream.
export const ELITE_CLOSE_ABOVE_PRESTIGE = 100;
// Eight rather than the plan's four: prestige is capped at 150 and the
// closing term only ever pulls upward, so the band random-walks up from
// its target on its own momentum and shocks for the rest of the run. At
// four, a school holding the cap was tied at the cap by two or three elite
// schools inside a decade and ranked behind them (the sort favours nobody,
// so a tie is a loss). At eight the walk seldom reaches the cap in fifteen
// years, and a school that COASTS off it still finds the field waiting
// four or five points below — which is the whole point.
export const ELITE_CLOSE_GAP = 8;
// THE BAND DOES NOT LEAPFROG. Its own momentum and shocks can carry a
// rival from the target up past the leader by luck alone, and at the top
// of the scale that is decisive: prestige is capped at 150, so a school
// holding the cap and a rival that wandered up to it are tied, and a tie
// is a loss. So while the closing applies, an elite rival BELOW the leader
// rises no closer than this in a year — it chases, it does not overtake.
// A rival passes the leader in one way only: the leader falls into the
// band. That is "coasting has to be losable", and nothing else is.
// A rival already above the leader keeps its own drift.
export const ELITE_NO_LEAPFROG_GAP = 1;
export const ELITE_CLOSE_RATE = 0.35; // 0.65^5 ≈ 0.12: a ten-point gap is a little over one point after five years

// How far an elite rival's reputation moves this year toward the leader.
// Zero below the prestige gate, zero for a rival already at or above the
// target, and never a draw on any stream.
// THE ATHLETIC FIELD CLOSES TOO (Plan 21's PR I). The elite band above
// applies to reputation only, so the athletic field never reacted to the
// player: a department at 95 in every sport sat there. The strongest
// ATHLETIC_CLOSING_FIELD rivals by athletic strength now drift toward the
// player's own program strength less ATHLETIC_CLOSE_GAP once the player is
// above ATHLETIC_CLOSE_ABOVE, on the same rate — a dynasty is a thing that
// has to be held, which is the move Plan 17 already made for the academic
// number. Read against athleticProgramStrength, the same number the
// department-wide table ranks.
export const ATHLETIC_CLOSE_ABOVE = 75;
export const ATHLETIC_CLOSE_GAP = 6;
export const ATHLETIC_CLOSING_FIELD = 10;

export function athleticClosingStep(rivalStrength: number, playerStrength: number): number {
  if (playerStrength <= ATHLETIC_CLOSE_ABOVE) return 0;
  const target = playerStrength - ATHLETIC_CLOSE_GAP;
  if (rivalStrength >= target) return 0;
  return (target - rivalStrength) * ELITE_CLOSE_RATE;
}

export function eliteClosingStep(rivalReputation: number, playerReputation: number): number {
  if (playerReputation <= ELITE_CLOSE_ABOVE_PRESTIGE) return 0;
  const target = playerReputation - ELITE_CLOSE_GAP;
  if (rivalReputation >= target) return 0;
  return (target - rivalReputation) * ELITE_CLOSE_RATE;
}

// The U.S. News report is a mid-game reveal (see
// docs/design/progression.md): the player is unaware of it until prestige
// first cracks the top TOP_50_CUTOFF, which fires a one-time reveal
// interrupt — entering is the event, and it keeps its own moment.
//
// THE ANNUAL REPORT NO LONGER FIRES HERE (Plan 16's PR A). It used to be
// its own interrupt at week 26, chosen so it never competed with the
// summer for a tick; the September review found it a good beat in the
// wrong place — a mid-year stop the player waves through. It is the
// Standing beat of the summer sequence now (see types.ts's SUMMER_BEATS
// and InterruptModal.tsx), rendered off buildReportPayload below at the
// boundary, where the field has just drifted and the year's grade is being
// read anyway. Nothing about the field's drift moved: it still runs at
// week WEEKS_PER_YEAR, so the table the Standing beat shows is this year's.
export const TOP_50_CUTOFF = 50;

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
    // drift used to call random() two or three times PER RIVAL, so the
    // number of global draws a year scaled with the size of the rival
    // table. the game seeds its stream to make a run
    // reproducible, and its own note says the hazard outright: "any content
    // change that alters how many times random() is called ... moves the
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
    // Deliberately seeded from random() rather than from the id and the
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
    // Derived by xor rather than by three separate random() calls so the
    // global stream still sees exactly one draw a year however many axes the
    // field grows — the property PR 1A introduced this generator for.
    const seed = Math.floor(random() * 4294967296);
    const roll = makeRivalRng(seed);
    const socialRoll = makeRivalRng(seed ^ 0x9e37_79b9);
    const researchRoll = makeRivalRng(seed ^ 0x85eb_ca6b);
    const athleticRoll = makeRivalRng(seed ^ 0xc2b2_ae35);
    // The athletic closing band's members: the strongest few by athletic
    // strength as the year opens, and the player's own strength read once.
    const playerStrength = athleticProgramStrength(s);
    const athleticElite = new Set(
      [...s.rivals].sort((a, b) => b.athleticStrength - a.athleticStrength).slice(0, ATHLETIC_CLOSING_FIELD).map((r) => r.id),
    );
    for (const r of s.rivals) {
      // Occasionally reroll momentum so trends aren't permanent.
      if (roll() < MOMENTUM_REROLL_CHANCE) {
        r.momentum = (roll() - MOMENTUM_UPWARD_BIAS) * MOMENTUM_RANGE;
      }
      const shock = (roll() - 0.5) * ANNUAL_SHOCK_RANGE;
      // The elite band closes on the leader (see eliteClosingStep above):
      // the same momentum and shock as everybody, plus the pull.
      const elite = ELITE_RIVAL_IDS.has(r.id) && s.self.reputation > ELITE_CLOSE_ABOVE_PRESTIGE;
      const closing = elite ? eliteClosingStep(r.reputation, s.self.reputation) : 0;
      let next = r.reputation + r.momentum + shock + closing;
      // No leapfrogging (see ELITE_NO_LEAPFROG_GAP): a chasing rival stops
      // short of the leader; only a leader who falls is passed.
      const ceiling = s.self.reputation - ELITE_NO_LEAPFROG_GAP;
      if (elite && r.reputation <= ceiling) next = Math.min(next, ceiling);
      r.reputation = clamp(next, RIVAL_REPUTATION_MIN, RIVAL_REPUTATION_MAX);

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

      // ATHLETIC STRENGTH MOVES TOO, which it did not until now (types.ts
      // called that "a deferred deepening, not an oversight"). A playoff
      // bracket seeded off a field that never changes is a bracket whose
      // result is known a decade in advance, so this is a prerequisite for
      // the tournament rather than a flourish.
      //
      // Clamped to ATHLETIC_STRENGTH_MIN/MAX rather than the reputation band
      // the three standings share: athletics is scored on 0..100 on both
      // sides (a rival's strength against the player's own teamQuality), and
      // letting a rival drift to 150 would put the whole field permanently
      // out of reach of a number that cannot exceed 100.
      r.athleticMomentum = driftMomentum(r.athleticMomentum, athleticRoll);
      const athleticClosing = athleticElite.has(r.id) ? athleticClosingStep(r.athleticStrength, playerStrength) : 0;
      r.athleticStrength = clamp(
        r.athleticStrength + r.athleticMomentum + (athleticRoll() - 0.5) * ANNUAL_SHOCK_RANGE + athleticClosing,
        ATHLETIC_STRENGTH_MIN, ATHLETIC_STRENGTH_MAX,
      );
    }
  }

  if (!s.pendingInterrupt && !s.hasEnteredRankings) {
    const rank = playerRank(s);
    if (rank <= TOP_50_CUTOFF) {
      s.hasEnteredRankings = true;
      // The one-time reveal carries no movement section: the player had
      // no standing to move from, and buildReportPayload's year-over-year
      // comparison would be meaningless on the week they first appear.
      s.pendingInterrupt = {
        type: 'rankings-entry',
        payload: {
          rank, field: s.rivals.length + 1, previousRank: null, movers: [], passed: [], passedBy: [],
          standings: rankedList(s).slice(0, TOP_50_CUTOFF).map((e) => ({ ...e, previousRank: null })),
          others: otherStandings(s),
        },
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

// The core every leaderboard is built from: one entry per school, sorted by
// whatever the caller says a school's number is. Extracted so the per-sport
// tables below are the same function with a different reading rather than a
// fifth hand-written sort.
//
// `self` is null when the player does not belong on this table at all — see
// sportRankedList, where a school that does not field the sport has no
// program to rank.
function rankedFrom(
  s: GameState,
  self: number | null,
  rivalValue: (r: Rival) => number,
): RankedEntry[] {
  const all: RankedEntry[] = s.rivals.map((r) => ({
    key: r.id, name: r.name, mascot: r.mascot, value: rivalValue(r), isPlayer: false,
  }));
  if (self !== null) {
    all.push({ key: 'self', name: institutionName(s.self), mascot: s.self.mascot, value: self, isPlayer: true });
  }
  return all.sort((a, b) => b.value - a.value);
}

export function rankedListBy(s: GameState, axis: StandingAxis): RankedEntry[] {
  return rankedFrom(s, selfValue(s, axis), (r) => r[axis]);
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
// PER-SPORT STANDINGS. The department-wide table above says whether a school
// runs a good athletics program; these say whether it is any good at
// LACROSSE, which is the question a team's own coach hire is an answer to.
//
// A rival's number is derived per sport (rivalData.ts's sportStrengthFor);
// the player's is the teamQuality of the team they actually field, which is
// the number their coaching staff and recruiting budget already move. So the
// two sides of the comparison are the same scale by construction rather than
// by a conversion somebody has to keep honest.
//
// A SCHOOL THAT DOES NOT FIELD THE SPORT IS NOT ON THE TABLE. That is the
// honest reading — there is no program to rank — and it is why sportRank
// returns null rather than a last place that would imply one. An
// 'awaitingVenue' team is not on it either, for the same reason it
// contributes no social bonus and does not count toward
// athleticProgramStrength: it cannot compete yet.
// ---------------------------------------------------------------------

// The player's own team in a sport, if they field one that can compete.
export function playerTeamIn(s: GameState, sportId: string): VarsityTeam | undefined {
  return s.orgs.teams.find((t) => t.sport === sportId && t.status === 'active');
}

export function sportRankedList(s: GameState, sportId: string): RankedEntry[] {
  const team = playerTeamIn(s, sportId);
  return rankedFrom(
    s,
    team ? teamQuality(team, s) : null,
    (r) => sportStrengthFor(r, sportId),
  );
}

// The player's 1-indexed place in one sport, or null if they do not field it.
export function sportRank(s: GameState, sportId: string): number | null {
  const place = sportRankedList(s, sportId).findIndex((e) => e.isPlayer);
  return place === -1 ? null : place + 1;
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

// One row of the published table: the school, its number, and where it
// stood a year ago — null on the first reveal, and for a school outside
// last year's reconstructed table (see previousEntries). The player's own
// prior is exact; a rival's is the same momentum-step estimate the movers
// list uses.
export interface StandingRow extends RankedEntry {
  previousRank: number | null;
}

export interface ReportPayload {
  rank: number;
  field: number;               // how many schools are ranked at all — the player and every rival
  previousRank: number | null; // null when there is no prior year to compare against
  movers: RankMove[];
  passed: string[];            // schools that were ahead a year ago and are behind now
  passedBy: string[];          // schools that were behind a year ago and are ahead now
  standings: StandingRow[]; // the top TOP_50_CUTOFF on the ACADEMIC axis — the list the report is about, each with last year's place (Plan 16's PR E)
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
  const top = rankedList(s).slice(0, TOP_50_CUTOFF);
  const rank = playerRank(s);

  // The history row from a year ago. The report is read at the SUMMER now
  // (Plan 16's PR A), before RESOLVE_ADMISSIONS files this year's row, so
  // the most recent row (at -1) is last summer's standing — the rank the
  // school carried into the year that is closing — and that is exactly
  // what "a year ago" means for this report. (It used to read the row at
  // -2, because the report fired mid-year, after this year's row existed.)
  const priorYear = s.history.length >= 1 ? s.history[s.history.length - 1] : null;
  const field = s.rivals.length + 1;
  if (!priorYear) {
    const standings = top.map((e) => ({ ...e, previousRank: null }));
    return { rank, field, previousRank: null, movers: [], passed: [], passedBy: [], standings, others: otherStandings(s) };
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
    field,
    previousRank: priorYear.rank,
    movers: movers.slice(0, MAX_MOVERS_SHOWN),
    passed: passed.slice(0, MAX_PASSED_SHOWN),
    passedBy: passedBy.slice(0, MAX_PASSED_SHOWN),
    // The player's prior place is the recorded rank, exact; a rival's is
    // read off the same reconstructed table the movers were.
    standings: top.map((e) => ({ ...e, previousRank: e.isPlayer ? priorYear.rank : thenPlace.get(e.key) ?? null })),
    others: otherStandings(s),
  };
}
