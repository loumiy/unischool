import type { Coach, GameState } from '../../state/types';
import {
  COACH_RETIREMENT_AGE, coachCandidateArrivalsThisWeek, COACH_CANDIDATE_LISTING_WEEKS, coachNamesInUse, coachSalaryFor,
  eliteWouldList, generateCoachCandidate, grownQualityOf, marketRng, rollCoachBand, rollCoachField, uncoveredChairFields,
} from '../../data/studentLifeData';
import { WEEKS_PER_YEAR } from '../../state/types';
import { PLAYOFF_WEEK, runPlayoffs } from './playoffs';
import { tickSeason } from './season';

// The coaching-staff system, mirroring facultySystem.ts: a weekly candidate
// market plus tenure growth for hired coaches.

// The market: age listings, drop expired ones, top up toward
// COACH_CANDIDATE_POOL_TARGET, then list a journeyman for every open chair
// with no listing in its field. One draw on the global stream a week, so the
// market's size never changes how many times the game rolls.
function tickCoachCandidatePool(s: GameState): void {
  for (const c of s.orgs.coachCandidates) c.weeksListed += 1;
  s.orgs.coachCandidates = s.orgs.coachCandidates.filter((c) => c.weeksListed < COACH_CANDIDATE_LISTING_WEEKS);

  const roll = marketRng();
  const arrivals = coachCandidateArrivalsThisWeek(s.orgs.coachCandidates.length);
  const used = coachNamesInUse(s);
  const adQuality = s.orgs.athleticDirector?.quality ?? 0;
  for (let i = 0; i < arrivals; i += 1) {
    const field = rollCoachField(roll);
    // An elite draw for a fielded sport without a reputation lists as solid.
    let band = rollCoachBand(roll);
    if (band === 'elite' && !eliteWouldList(s, field)) band = 'solid';
    const candidate = generateCoachCandidate(field, used, roll, band, adQuality);
    used.add(candidate.name);
    s.orgs.coachCandidates.push(candidate);
  }
  for (const field of uncoveredChairFields(s)) {
    const candidate = generateCoachCandidate(field, used, roll, 'journeyman', adQuality);
    used.add(candidate.name);
    s.orgs.coachCandidates.push(candidate);
  }
}

// Hired coaches grow one week of tenure (like growFaculty): quality climbs
// toward potential and salary is recomputed. Listed candidates do not grow.
function growCoach(c: Coach): void {
  c.tenureWeeks += 1;
  // A year older per year of tenure.
  if (c.tenureWeeks % WEEKS_PER_YEAR === 0 && c.age !== undefined) c.age += 1;
  c.quality = grownQualityOf(c);
  c.salary = coachSalaryFor(c.quality, c.tenureWeeks, c.field);
}

// At COACH_RETIREMENT_AGE a coach retires and the chair is vacated, so tenure
// is not free money.
const CHAIRS = ['headCoach', 'assistantCoach', 'trainer'] as const;
function retireCoaches(s: GameState): void {
  for (const t of s.orgs.teams) {
    for (const chair of CHAIRS) {
      const c = t[chair];
      if (!c || c.age === undefined || c.age < COACH_RETIREMENT_AGE) continue;
      t[chair] = null;
      s.log.unshift({
        year: s.clock.year, week: s.clock.week,
        message: `${c.name} has retired from ${t.name} at ${c.age}, after ${Math.floor(c.tenureWeeks / WEEKS_PER_YEAR)} years.`,
        kind: 'info', topic: 'team', subject: t.id,
      });
    }
  }
}

export function tickAthletics(s: GameState): void {
  tickCoachCandidatePool(s);
  // The season's dated occasions (season.ts), then the postseason on its week.
  tickSeason(s);
  if (s.clock.week === PLAYOFF_WEEK) runPlayoffs(s);
  for (const t of s.orgs.teams) {
    if (t.headCoach) growCoach(t.headCoach);
    if (t.assistantCoach) growCoach(t.assistantCoach);
    if (t.trainer) growCoach(t.trainer);
  }
  retireCoaches(s);
}
