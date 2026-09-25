import type { GameState, OrgPetition } from '../../state/types';
import { absoluteWeek } from '../../data/eventData';
import {
  CHAPTER_FORMATION_WEEKLY_CHANCE, CLUB_FORMATION_WEEKLY_CHANCE, ORG_FORMATION_COOLDOWN_WEEKS,
  canFormChapter, canFormClub, hasStudentCenter, rollChapterPetition, rollClubPetition, venueForCategory,
} from '../../data/studentLifeData';
import { random } from '../../engine/random';

// Student life tick (docs/design/student-life.md): rolls for a new student
// organisation and raises a petition on a hit. Never sets
// s.pendingInterrupt; petitions are answered in one batch in the summer
// admissions interrupt. Greek beats and the varsity petition are decision
// events in data/eventData.ts, fired by eventSystem.ts.
//
// Runs after tickFinance (petition upkeep uses this week's operating cost)
// and before tickSatisfaction (an approval counts this week).

function raise(s: GameState, petition: OrgPetition): void {
  s.orgs.pendingPetitions.push(petition);
  s.orgs.lastFormationWeek = absoluteWeek(s);
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: petition.kind === 'club'
      ? `Students have organised the ${petition.name} and are petitioning for recognition — you will decide in the summer's Students beat.`
      : `A ${petition.greekKind ?? 'fraternity'} calling itself ${petition.name} has petitioned the Hellenic Council for a charter — you will decide in the summer's Students beat.`,
    kind: 'info',
    topic: 'petition',
    subject: petition.id,
  });
}

// Activates varsity teams whose shared venue has finished. tickTech runs
// earlier in the reducer's SYSTEMS order, so the check is never a week stale.
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
  // The week the first student centre stands, for the sport club's pity timer.
  if (s.orgs.studentCenterWeek === 0 && hasStudentCenter(s)) s.orgs.studentCenterWeek = absoluteWeek(s);

  const week = absoluteWeek(s);
  if (s.orgs.lastFormationWeek > 0 && week - s.orgs.lastFormationWeek < ORG_FORMATION_COOLDOWN_WEEKS) return;

  // At most one formation a week. Chapters roll first because their roll is
  // much rarer and should not keep losing to clubs.
  if (canFormChapter(s) && random() < CHAPTER_FORMATION_WEEKLY_CHANCE) {
    const petition = rollChapterPetition(s);
    if (petition) {
      raise(s, petition);
      return;
    }
  }

  if (canFormClub(s) && random() < CLUB_FORMATION_WEEKLY_CHANCE) {
    const petition = rollClubPetition(s);
    if (petition) raise(s, petition);
  }
}
