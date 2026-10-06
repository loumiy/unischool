import type { GameState, Pillar } from '../../state/types';
import { PILLARS, PRESTIGE_MAX, SPECIALIZATION_MILESTONE_RANK, SPECIALIZATION_NOTICE_PLACES, SPECIALIZATION_PILLAR_RANK, SPECIALIZATION_TERM_WEIGHTS, computePrestigeTarget } from './prestigeSystem';
import { specializationOf } from './specialization';
import { PILLAR_AXES, pillarColumns, playerRank, rankBy, rivalPillars } from '../rivals/rivalsSystem';
import { foundingDistress } from '../finance/distress';
import { specializationOfferRule } from '../../data/prestigeWords';
import { PILLAR_WORDS, SPECIALIZATION_CARDS, SPECIALIZATION_NOTICE_ID, specializationOfferLine, specializationStatus, withShareFull } from '../../data/specializationData';

// ---------------------------------------------------------------------
// The milestone and the choice (Plan 85D). A college that climbs into the
// guide's top SPECIALIZATION_MILESTONE_RANK, or into the top
// SPECIALIZATION_PILLAR_RANK of any one pillar's standing (Plan 95R, the
// second review's B4-2), is asked to choose a specialization: one pillar,
// for good (specialization.ts). Either route is "the milestone" below.
// Three beats:
//
//   notice  the first week the college stands within
//           SPECIALIZATION_NOTICE_PLACES of the milestone (overall, or in
//           a pillar), the board's
//           letter (a board letter in the inbox; it never stops the clock)
//           names the four and what each gives;
//   offer   the first summer the college stands at the milestone, read on
//           the summer's own week after the field has moved (the table the
//           summer's review prints), the offer is made and stands for good;
//   choice  at the close of that summer (after RESOLVE_ADMISSIONS turns the
//           page) the choice is raised as its own stop, and at the close of
//           every summer after until it is made. "Not this year" puts it
//           off; nothing ever makes it for the player.
//
// A college that never reaches the milestone is never offered it. Reads the
// ranking and draws nothing, so the harness's runs are unmoved until a
// choice is made.
// ---------------------------------------------------------------------

export interface SpecializationPayload {
  // The summer the choice closes: the year it is recorded against.
  year: number;
}

// The weekly watch: the notice, and the offer on the summer's week. After
// tickRivals, so the summer's reading is the field that has moved.
export function tickSpecialization(s: GameState): void {
  if (specializationOf(s) || s.sandbox) return;
  const noticeDue = s.specializationNotice === undefined;
  const offerDue = s.specializationOffered === undefined && s.pendingInterrupt?.type === 'summer';
  if (!noticeDue && !offerDue) return;
  const rank = playerRank(s);
  const best = bestPillarStanding(s);
  const within = (places: number) => rank <= SPECIALIZATION_MILESTONE_RANK + places || best.rank <= SPECIALIZATION_PILLAR_RANK + places;
  if (noticeDue && within(SPECIALIZATION_NOTICE_PLACES)) {
    s.specializationNotice = s.clock.year;
    (s.finance.distress ??= foundingDistress()).letters.push(SPECIALIZATION_NOTICE_ID);
  }
  if (offerDue && within(0)) {
    s.specializationOffered = s.clock.year;
    s.log.unshift({
      year: s.clock.year, week: s.clock.week,
      message: specializationOfferLine(rank <= SPECIALIZATION_MILESTONE_RANK ? null : best, rank),
      kind: 'good',
    });
  }
}

// The college's best place in the four pillars' standings (the standings'
// own ranking, as the choice's cards read it), the first pillar on a tie.
// Ranks only: the weekly watch runs it until the notice has come.
export function bestPillarStanding(s: GameState): { pillar: Pillar; rank: number } {
  let best = { pillar: PILLARS[0], rank: Infinity };
  PILLARS.forEach((pillar, i) => {
    const rank = rankBy(s, PILLAR_AXES[i]);
    if (rank < best.rank) best = { pillar, rank };
  });
  return best;
}

// Whether the choice is open: offered, and not yet made.
export function specializationOpen(s: GameState): boolean {
  return s.specializationOffered !== undefined && specializationOf(s) === null;
}

// At the close of a summer (reducer.ts's RESOLVE_ADMISSIONS, after the page
// turned): the choice, while it is open. Raised on the new year's first
// week before it has run, so answering it holds no week.
export function raiseSpecializationChoice(s: GameState, summerYear: number): void {
  if (!specializationOpen(s) || s.pendingInterrupt) return;
  const payload: SpecializationPayload = { year: summerYear };
  s.pendingInterrupt = { type: 'specialization', payload };
}

// The answer: a pillar, for good, or null for not this year.
export function resolveSpecialization(s: GameState, pillar: Pillar | null): void {
  if (s.pendingInterrupt?.type !== 'specialization') return;
  const payload = s.pendingInterrupt.payload as SpecializationPayload | undefined;
  s.pendingInterrupt = null;
  if (!specializationOpen(s)) return;
  if (pillar !== null && !PILLARS.includes(pillar)) pillar = null;
  if (pillar === null) {
    s.log.unshift({
      year: s.clock.year, week: s.clock.week,
      message: 'The college has not chosen a specialization this year. The board will ask again at the close of the next summer.',
      kind: 'info',
    });
    return;
  }
  s.specialization = pillar;
  s.specializationYear = payload?.year ?? s.clock.year - 1;
  s.log.unshift({
    year: s.clock.year, week: s.clock.week,
    message: `The college specializes in ${PILLAR_WORDS[pillar]}: ${SPECIALIZATION_CARDS[pillar].name.replace(/^The /, 'the ')}. Its share of ${PILLAR_WORDS[pillar]} opens, for good.`,
    kind: 'good',
  });
}

// The college's specialization, or where it stands on the choice, in a
// sentence (History › Prestige, the standings).
export function collegeSpecialization(s: GameState): string {
  return specializationStatus(specializationOf(s), s.specializationYear, specializationOpen(s), specializationOfferRule(), PRESTIGE_MAX);
}

// Each specialization as the choice shows it: the college's value and rank
// in its pillar (as the standings read them), the points of the pillar the
// choice opens, and the rivals already specialized in it, the strongest
// first.
export interface SpecializationOption {
  pillar: Pillar;
  value: number;
  rank: number;
  // The points of the pillar's span only its specialization fills.
  weight: number;
  rivals: number;
  strongest: { name: string; value: number } | null;
}

export function specializationOptions(s: GameState): SpecializationOption[] {
  // On the prestige scale, as the guide's columns print them.
  const mine = pillarColumns(s).get('self') ?? [];
  return PILLARS.map((pillar, i) => {
    const specialists = s.rivals.filter((r) => r.specialization === pillar)
      .map((r) => ({ name: r.name, value: rivalPillars(r)[pillar] }))
      .sort((a, b) => b.value - a.value);
    return {
      pillar,
      value: mine[i] ?? 0,
      rank: rankBy(s, PILLAR_AXES[i]),
      weight: SPECIALIZATION_TERM_WEIGHTS[pillar],
      rivals: specialists.length,
      strongest: specialists[0] ?? null,
    };
  });
}

// The choice's comparison line (Plan 95F, the second review's B2-3): the
// college's prestige and rank if the pillar's share were full today. The
// target is prestigeSystem.ts's own, on a copy with that share read full
// (specializationData.ts's withShareFull), so the teaching standard's limit
// holds as it would; prestige moves by what that adds to today's target,
// and the rank is the guide's own (playerRank) against today's rivals.
// Reads, never writes: the game's state is not touched.
export interface ShareFullProjection {
  before: number;
  after: number;
  rankBefore: number;
  rankAfter: number;
}

export function shareFullProjection(s: GameState, pillar: Pillar): ShareFullProjection {
  const lift = computePrestigeTarget(withShareFull(s, pillar)) - computePrestigeTarget(s);
  const before = s.self.reputation;
  const after = Math.min(PRESTIGE_MAX, before + lift);
  const moved: GameState = { ...s, self: { ...s.self, reputation: after } };
  return { before, after, rankBefore: playerRank(s), rankAfter: playerRank(moved) };
}

// The line above the cards (Plan 95F, the second review's B3-6): the
// college's strongest pillar, by its rank in the standings (on a tie, the
// higher value), and how many rivals are specialized in each pillar.
export function strongestStanding(s: GameState): { pillar: Pillar; rank: number; rivals: Record<Pillar, number> } {
  const options = specializationOptions(s);
  const best = [...options].sort((a, b) => a.rank - b.rank || b.value - a.value)[0];
  const rivals = Object.fromEntries(options.map((o) => [o.pillar, o.rivals])) as Record<Pillar, number>;
  return { pillar: best.pillar, rank: best.rank, rivals };
}
