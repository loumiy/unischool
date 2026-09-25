import { totalEnrolled } from '../../state/types';
import { priceTolerance } from '../admissions/admissionsSystem';
import type { GameState, Rival, VarsityTeam } from '../../state/types';
import { WEEKS_PER_YEAR, institutionName } from '../../state/types';
import { athleticProgramStrength, teamQuality } from '../../data/studentLifeData';
import { ELITE_RIVAL_IDS, makeRivalRng, sportStrengthFor } from '../../data/rivalData';
import { clamp } from '../../math';
import { random } from '../../engine/random';

// ---------------------------------------------------------------------
// Rivals evolve so the ranking stays a live target across decades
// (docs/design/progression.md). Once a year each rival's momentum may reroll
// (a new multi-year trend) and every rival takes an independent shock, so
// the leaderboard reshuffles visibly. Values are clamped to a legible band.
// ---------------------------------------------------------------------
const MOMENTUM_REROLL_CHANCE = 0.35; // per rival, per year
const MOMENTUM_RANGE = 3.5;          // new momentum spans roughly [-1.6, +1.9]
const MOMENTUM_UPWARD_BIAS = 0.45;   // slight upward skew, so the field isn't a pure random walk
const ANNUAL_SHOCK_RANGE = 5;        // independent +/- jitter applied every year, on top of momentum
const RIVAL_REPUTATION_MIN = 5;
const RIVAL_REPUTATION_MAX = 150;
// Athletics' own band. The ceiling sits below 100 on purpose: sportStrengthFor
// (rivalData.ts) spreads this by up to 28 points per sport and must land in
// 0..100 unclamped, or the top of every sport's table collapses into a tie.
const ATHLETIC_STRENGTH_MIN = 5;
const ATHLETIC_STRENGTH_MAX = 85;

// The top has to be held. Above ELITE_CLOSE_ABOVE_PRESTIGE, the elite band
// (rivalData.ts's ELITE_RIVAL_IDS) is pulled toward the player's standing
// less ELITE_CLOSE_GAP, closing a ten-point gap in about five years. Only
// ever upward, deterministic (no random draw), and inactive in the early
// eras. With asymmetric prestige, this is what makes coasting cost rank.
export const ELITE_CLOSE_ABOVE_PRESTIGE = 100;
// Eight: prestige caps at 150 and the band random-walks upward from its
// target, so a smaller gap lets elite schools tie the capped player within a
// decade (and a tie is a loss in the sort).
export const ELITE_CLOSE_GAP = 8;
// No leapfrogging: while the closing applies, an elite rival below the leader
// rises no closer than this in a year. A rival passes the leader only when
// the leader falls into the band; one already above keeps its own drift.
export const ELITE_NO_LEAPFROG_GAP = 1;
export const ELITE_CLOSE_RATE = 0.35; // 0.65^5 ≈ 0.12: a ten-point gap is a little over one point after five years

// The athletic field closes too: above ATHLETIC_CLOSE_ABOVE, the strongest
// ATHLETIC_CLOSING_FIELD rivals drift toward the player's
// athleticProgramStrength less ATHLETIC_CLOSE_GAP, at the same rate.
export const ATHLETIC_CLOSE_ABOVE = 75;
export const ATHLETIC_CLOSE_GAP = 6;
export const ATHLETIC_CLOSING_FIELD = 10;

export function athleticClosingStep(rivalStrength: number, playerStrength: number): number {
  if (playerStrength <= ATHLETIC_CLOSE_ABOVE) return 0;
  const target = playerStrength - ATHLETIC_CLOSE_GAP;
  if (rivalStrength >= target) return 0;
  return (target - rivalStrength) * ELITE_CLOSE_RATE;
}

// How far an elite rival's reputation moves toward the leader this year.
export function eliteClosingStep(rivalReputation: number, playerReputation: number): number {
  if (playerReputation <= ELITE_CLOSE_ABOVE_PRESTIGE) return 0;
  const target = playerReputation - ELITE_CLOSE_GAP;
  if (rivalReputation >= target) return 0;
  return (target - rivalReputation) * ELITE_CLOSE_RATE;
}

// The U.S. News report is a mid-game reveal (docs/design/progression.md):
// the player is unaware of it until prestige first enters the top
// TOP_50_CUTOFF, which fires a one-time interrupt. The annual report was the
// summer's Standing beat until Plan 33 dropped it (V1-1); buildReportPayload
// still builds it for that reveal and for the trustees' response, and the
// History tab's standings show the table. The field drifts at week
// WEEKS_PER_YEAR, so the table is this year's.
export const TOP_50_CUTOFF = 50;

// A rival must move more than this many places to be named; smaller moves
// are noise.
const RIVAL_MOVE_THRESHOLD = 2;
// Caps on the lists the modal shows, biggest moves first.
const MAX_MOVERS_SHOWN = 6;
const MAX_PASSED_SHOWN = 5;

export function tickRivals(s: GameState): void {
  if (s.clock.week === WEEKS_PER_YEAR) {
    // One draw on the global stream per year, whatever the field size or
    // number of axes: the drift runs off local PRNGs seeded from it, so
    // growing the field never reshuffles the rest of the seeded run
    // (test/balance-regression.test.ts). Seeded from random() rather than
    // id/year so each run's leaderboard reshuffles differently. One stream
    // per axis (derived by xor) so adding an axis cannot change another
    // axis's trajectory.
    const seed = Math.floor(random() * 4294967296);
    const roll = makeRivalRng(seed);
    const socialRoll = makeRivalRng(seed ^ 0x9e37_79b9);
    const researchRoll = makeRivalRng(seed ^ 0x85eb_ca6b);
    const athleticRoll = makeRivalRng(seed ^ 0xc2b2_ae35);
    // The athletic closing band: the strongest few as the year opens.
    const playerStrength = athleticProgramStrength(s);
    const athleticElite = new Set(
      [...s.rivals].sort((a, b) => b.athleticStrength - a.athleticStrength).slice(0, ATHLETIC_CLOSING_FIELD).map((r) => r.id),
    );
    for (const r of s.rivals) {
      if (roll() < MOMENTUM_REROLL_CHANCE) {
        r.momentum = (roll() - MOMENTUM_UPWARD_BIAS) * MOMENTUM_RANGE;
      }
      const shock = (roll() - 0.5) * ANNUAL_SHOCK_RANGE;
      // The elite band's pull (eliteClosingStep) on top of momentum and shock.
      const elite = ELITE_RIVAL_IDS.has(r.id) && s.self.reputation > ELITE_CLOSE_ABOVE_PRESTIGE;
      const closing = elite ? eliteClosingStep(r.reputation, s.self.reputation) : 0;
      let next = r.reputation + r.momentum + shock + closing;
      // No leapfrogging (ELITE_NO_LEAPFROG_GAP).
      const ceiling = s.self.reputation - ELITE_NO_LEAPFROG_GAP;
      if (elite && r.reputation <= ceiling) next = Math.min(next, ceiling);
      r.reputation = clamp(next, RIVAL_REPUTATION_MIN, RIVAL_REPUTATION_MAX);

      // The other standings drift on their own momentum, so the tables tell
      // different stories.
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

      // Athletic strength drifts too, so playoff seeding is not fixed a
      // decade ahead. Clamped to its own band because the player's side
      // (teamQuality) cannot exceed 100.
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
      // The one-time reveal has no movement section: there is no prior
      // standing to move from.
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

// One axis's momentum reroll, shared so a retune moves all axes together.
function driftMomentum(current: number, roll: () => number): number {
  if (roll() >= MOMENTUM_REROLL_CHANCE) return current;
  return (roll() - MOMENTUM_UPWARD_BIAS) * MOMENTUM_RANGE;
}

// ---------------------------------------------------------------------
// The leaderboards, one function per axis. The player and a rival name each
// field identically (types.ts), except athletics, where the player's
// strength is computed live (athleticProgramStrength).
// ---------------------------------------------------------------------
export type StandingAxis = 'reputation' | 'socialStanding' | 'researchStanding' | 'athleticStrength' | 'access' | 'financial';

// The six standings in the league (Plan 31, V1-22), in the order the History
// tab lists them.
export const STANDINGS: ReadonlyArray<{ axis: StandingAxis; label: string }> = [
  { axis: 'reputation', label: 'Academics' },
  { axis: 'researchStanding', label: 'Research' },
  { axis: 'socialStanding', label: 'Campus life' },
  { axis: 'athleticStrength', label: 'Athletic standing' },
  { axis: 'access', label: 'Access' },
  { axis: 'financial', label: 'Financial strength' },
];

// Access and financial strength (Plan 31) are read, not stored. The player's:
// access is half the admit rate and half how far the price sits under what
// its standing could charge; financial strength is endowment per student
// against $80,000, the stewardship axis's full mark. Both on the 0–150
// scale the other axes use.
const ACCESS_SCALE = 150;
const FINANCIAL_FULL_PER_STUDENT = 80_000;
export function selfAccess(s: GameState): number {
  const tolerance = priceTolerance(s.self.reputation);
  const affordability = tolerance > 0 ? Math.max(0, Math.min(1, 1 - s.finance.listedTuition / (2 * tolerance))) : 0;
  return ACCESS_SCALE * (0.5 * Math.max(0, Math.min(1, s.students.admitRate)) + 0.5 * affordability);
}
export function selfFinancial(s: GameState): number {
  const enrolled = totalEnrolled(s.students);
  const perStudent = enrolled > 0 ? s.finance.endowment / enrolled : 0;
  return ACCESS_SCALE * Math.max(0, Math.min(1, perStudent / FINANCIAL_FULL_PER_STUDENT));
}

// A rival's: read off its reputation, tilted by a fixed share from its id,
// so the field's elite is dear and rich and its tail open and poor, and no
// two schools agree exactly. No state and no draws.
function tilt(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return 0.8 + ((h % 1000) / 1000) * 0.4;
}
function rivalValue(r: Rival, axis: StandingAxis): number {
  if (axis === 'access') return Math.max(0, ACCESS_SCALE - r.reputation * 0.75 * tilt(r.id, 1));
  if (axis === 'financial') return Math.min(ACCESS_SCALE, r.reputation * 0.8 * tilt(r.id, 2));
  return r[axis];
}

export interface RankedEntry {
  key: string;   // 'self', or the rival's id — never the name, which two schools may share
  name: string;
  mascot: string;
  value: number;
  isPlayer: boolean;
}

function selfValue(s: GameState, axis: StandingAxis): number {
  if (axis === 'athleticStrength') return athleticProgramStrength(s);
  if (axis === 'access') return selfAccess(s);
  if (axis === 'financial') return selfFinancial(s);
  return s.self[axis];
}

// Every leaderboard's core: one entry per school, sorted by the caller's
// reading. `self` is null when the player does not belong on the table
// (a sport they do not field).
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
  return rankedFrom(s, selfValue(s, axis), (r) => rivalValue(r, axis));
}

// The college's own value on an axis, on the 0–150 scale.
export function standingValue(s: GameState, axis: StandingAxis): number {
  return rankedListBy(s, axis).find((e) => e.isPlayer)?.value ?? 0;
}

// The player's 1-indexed position on an axis.
export function rankBy(s: GameState, axis: StandingAxis): number {
  return rankedListBy(s, axis).findIndex((e) => e.isPlayer) + 1;
}

// Named wrappers for the academic axis.
export function rankedList(s: GameState) {
  return rankedListBy(s, 'reputation');
}

export function playerRank(s: GameState): number {
  return rankBy(s, 'reputation');
}

// An independent leaderboard: academic and athletic strength are decoupled
// (rivalData.ts's athleticStrengthFor).
export function athleticRank(s: GameState): number {
  return rankBy(s, 'athleticStrength');
}

// ---------------------------------------------------------------------
// Per-sport standings. A rival's number is derived per sport (rivalData.ts's
// sportStrengthFor); the player's is their team's teamQuality, the same
// scale. A school that does not field the sport, or whose team is still
// 'awaitingVenue', is not on the table, so sportRank returns null.
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
// The annual report's year-over-year movement. Nothing stores last year's
// rival reputations, so their prior places are estimated by stepping back
// one momentum step; the unrecoverable annual shock can make a rival's move
// off by a place or two. The player's own movement is exact.
// ---------------------------------------------------------------------

// Keyed by identity, not name: two schools may share a name.
function sortedByValue(entries: RankedEntry[]): RankedEntry[] {
  return [...entries].sort((a, b) => b.value - a.value);
}

function currentEntries(s: GameState): RankedEntry[] {
  return rankedListBy(s, 'reputation');
}

// Last year's table: the player's from last year's history row, each
// rival's stepped back one momentum step.
function previousEntries(s: GameState, previousPrestige: number): RankedEntry[] {
  return sortedByValue([
    { key: 'self', name: institutionName(s.self), mascot: s.self.mascot, value: previousPrestige, isPlayer: true },
    ...s.rivals.map((r) => ({ key: r.id, name: r.name, mascot: r.mascot, value: r.reputation - r.momentum, isPlayer: false })),
  ]);
}

function placesByKey(entries: RankedEntry[]): Map<string, number> {
  return new Map(entries.map((e, i) => [e.key, i + 1]));
}

// `delta` is positive for a climb, as the modal renders it.
export interface RankMove {
  name: string;
  from: number;
  to: number;
  delta: number;
}

// A table row with last year's place: null on the first reveal or outside
// last year's reconstructed table.
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
  standings: StandingRow[]; // the top TOP_50_CUTOFF on the academic axis, with last year's place
  // The other two standings, one line each; the full lists live elsewhere.
  others: OtherStanding[];
}

// One secondary axis as the report shows it. No year-over-year move (no
// history row records these ranks); instead it names the axis's leader.
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
    otherStanding(s, 'Access', 'access'),
    otherStanding(s, 'Financial strength', 'financial'),
  ];
}

export function buildReportPayload(s: GameState): ReportPayload {
  const top = rankedList(s).slice(0, TOP_50_CUTOFF);
  const rank = playerRank(s);

  // The report is read at the summer before this year's history row is
  // filed, so the last row is a year ago.
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

    // Crossings are read off the two orderings, so they hold whether it was
    // your climb, their slide, or both.
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
    standings: top.map((e) => ({ ...e, previousRank: e.isPlayer ? priorYear.rank : thenPlace.get(e.key) ?? null })),
    others: otherStandings(s),
  };
}
