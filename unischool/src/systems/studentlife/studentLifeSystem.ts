import type { GameState, OrgPetition } from '../../state/types';
import { absoluteWeek } from '../../data/eventData';
import {
  CHAPTER_FORMATION_WEEKLY_CHANCE, CLUB_FORMATION_WEEKLY_CHANCE, ORG_FORMATION_COOLDOWN_WEEKS,
  canFormChapter, canFormClub, rollChapterPetition, rollClubPetition,
} from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// One ordinary pure tick function (see README's "Student life"). All it
// does is roll for a new student organisation forming and, on a hit, raise
// a PETITION — a record on s.orgs.pendingPetitions plus a log line.
//
// WHAT THIS DELIBERATELY NEVER DOES: set s.pendingInterrupt. A club
// forming is the lightest beat in the game and must not stop the clock;
// the player answers the whole year's petitions in one batch at the summer
// admissions boundary, in a digest folded into an interrupt that already
// exists (see InterruptModal.tsx's AdmissionsInterruptForm and the
// reducer's RESOLVE_ADMISSIONS). So this system adds exactly ZERO
// stop-the-clock modals to a run.
//
// The consequential Greek beats — the one-time Hellenic Council question,
// chapter scandals, and the per-chapter housing petition — are NOT here.
// They are authored entries in the shared decision-event table
// (data/eventData.ts), fired by eventSystem.ts on the cadence that table
// already runs on, so they redistribute the existing event budget rather
// than adding a second stream of interrupts on top of it.
//
// CADENCE. The same two-dial machinery the decision events and research
// outputs use: a weekly probability, floored by a cooldown. The cooldown
// is SHARED between clubs and chapters so a lucky month can't hand the
// player a digest of nine petitions, and the caps in studentLifeData.ts
// (campus size, plus an absolute ceiling, plus a per-digest ceiling) do the
// rest.
//
// WHERE IT RUNS. After tickFinance, so a petition's upkeep is sized
// against this week's freshly recomputed operating cost, and before
// tickSatisfaction, so an organisation approved this week is already in
// this week's satisfaction target rather than a week behind it.
// ---------------------------------------------------------------------

function raise(s: GameState, petition: OrgPetition): void {
  s.orgs.pendingPetitions.push(petition);
  s.orgs.lastFormationWeek = absoluteWeek(s);
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: petition.kind === 'club'
      ? `Students have organised the ${petition.name} and are petitioning for recognition — you will decide at summer admissions.`
      : `A ${petition.greekKind ?? 'fraternity'} calling itself ${petition.name} has petitioned the Hellenic Council for a charter — you will decide at summer admissions.`,
    kind: 'info',
  });
}

export function tickStudentLife(s: GameState): void {
  const week = absoluteWeek(s);
  if (s.orgs.lastFormationWeek > 0 && week - s.orgs.lastFormationWeek < ORG_FORMATION_COOLDOWN_WEEKS) return;

  // Chapters are rolled first and return on a hit, so the shared cooldown
  // means at most one formation a week. Chapters go first because their
  // roll is much the rarer of the two and losing it to a club every time
  // would make an approved council feel like nothing happened.
  if (canFormChapter(s) && Math.random() < CHAPTER_FORMATION_WEEKLY_CHANCE) {
    const petition = rollChapterPetition(s);
    if (petition) {
      raise(s, petition);
      return;
    }
  }

  if (canFormClub(s) && Math.random() < CLUB_FORMATION_WEEKLY_CHANCE) {
    const petition = rollClubPetition(s);
    if (petition) raise(s, petition);
  }
}
