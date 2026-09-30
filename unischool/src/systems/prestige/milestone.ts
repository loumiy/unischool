import type { GameState, Pillar } from '../../state/types';
import { PILLARS, PRESTIGE_MAX, SPECIALIZATION_MILESTONE_RANK, SPECIALIZATION_NOTICE_PLACES, SPECIALIZATION_TERM_WEIGHTS } from './prestigeSystem';
import { specializationOf } from './specialization';
import { PILLAR_AXES, pillarColumns, playerRank, rankBy, rivalPillars } from '../rivals/rivalsSystem';
import { foundingDistress } from '../finance/distress';
import { PILLAR_WORDS, SPECIALIZATION_CARDS, SPECIALIZATION_NOTICE_ID, specializationStatus } from '../../data/specializationData';

// ---------------------------------------------------------------------
// The milestone and the choice (Plan 85D). A college that climbs into the
// guide's top SPECIALIZATION_MILESTONE_RANK is asked to choose a
// specialization: one pillar, for good (specialization.ts). Three beats:
//
//   notice  the first week the college stands within
//           SPECIALIZATION_NOTICE_PLACES of the milestone, the board's
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
  if (noticeDue && rank <= SPECIALIZATION_MILESTONE_RANK + SPECIALIZATION_NOTICE_PLACES) {
    s.specializationNotice = s.clock.year;
    (s.finance.distress ??= foundingDistress()).letters.push(SPECIALIZATION_NOTICE_ID);
  }
  if (offerDue && rank <= SPECIALIZATION_MILESTONE_RANK) {
    s.specializationOffered = s.clock.year;
    s.log.unshift({
      year: s.clock.year, week: s.clock.week,
      message: `The college stands #${rank} in the guide. At the summer's close the board will ask it to choose a specialization.`,
      kind: 'good',
    });
  }
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
  return specializationStatus(specializationOf(s), s.specializationYear, specializationOpen(s), SPECIALIZATION_MILESTONE_RANK, PRESTIGE_MAX);
}

// Each specialization as the choice shows it: the college's value and rank
// in its pillar (as the standings read them), the points of it the choice opens, and the
// rivals already specialized in it, the strongest first.
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
