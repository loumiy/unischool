import type { GameState, OrgPetition } from '../../state/types';
import { absoluteWeek } from '../../data/eventData';
import {
  CHAPTER_FORMATION_WEEKLY_CHANCE, CLUB_FORMATION_WEEKLY_CHANCE, ORG_FORMATION_COOLDOWN_WEEKS,
  canFormChapter, canFormClub, hasStudentCenter, rollChapterPetition, rollClubPetition, venueForCategory,
} from '../../data/studentLifeData';

// ---------------------------------------------------------------------
// One ordinary pure tick function (see docs/design/student-life.md). All
// it does is roll for a new student organisation forming and, on a hit,
// raise a PETITION — a record on s.orgs.pendingPetitions plus a log line.
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
// than adding a second stream of interrupts on top of it. The varsity
// athletics petition is authored in that SAME table (see 'varsity-petition'
// there) purely to reuse its prompt/choices/interrupt shape — but it does
// NOT share the table's random cadence: it fires on its own deterministic
// five-year-tenure schedule (see eventSystem.ts's fireVarsityPetition and
// studentLifeData.ts's VARSITY_PETITION_MIN_TENURE_YEARS).
//
// What IS here, alongside the formation roll: tickVarsityVenues below,
// which resolves a durable condition (a shared venue finishing construction)
// rather than rolling anything — the same shape demandSystem.ts's
// resolution half uses for a met demand.
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
    topic: 'petition',
    subject: petition.id,
  });
}

// A varsity team stuck 'awaitingVenue' checks, every week, whether the
// shared venue Buildable it is waiting on has finished — tickTech (earlier
// in the reducer's SYSTEMS order, see engine/reducer.ts) is what actually
// flips it to 'done', so by the time this runs the check is never a week
// stale. No cooldown and no petition of its own: this is a durable
// condition resolving, exactly like a student demand's target being met,
// not a new formation.
function tickVarsityVenues(s: GameState): void {
  for (const team of s.orgs.teams) {
    if (team.status !== 'awaitingVenue') continue;
    const venue = venueForCategory(s, team.venueCategory);
    if (venue?.status !== 'done') continue;
    team.status = 'active';
    s.log.unshift({
      year: s.clock.year,
      week: s.clock.week,
      message: `${venue.name} is complete — ${team.name} is now varsity-active.`,
      kind: 'good',
      topic: 'team',
      subject: team.id,
    });
  }
}

export function tickStudentLife(s: GameState): void {
  tickVarsityVenues(s);
  // The week the first student centre stands, for the sport club's pity
  // timer (PR O).
  if (s.orgs.studentCenterWeek === 0 && hasStudentCenter(s)) s.orgs.studentCenterWeek = absoluteWeek(s);

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
