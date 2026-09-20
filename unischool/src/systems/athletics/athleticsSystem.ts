import type { Coach, GameState } from '../../state/types';
import {
  coachCandidateArrivalsThisWeek, COACH_CANDIDATE_LISTING_WEEKS, coachNamesInUse, coachSalaryFor,
  generateCoachCandidate, grownCoachQuality, marketRng, rollCoachField, uncoveredChairFields,
} from '../../data/studentLifeData';
import { PLAYOFF_WEEK, runPlayoffs } from './playoffs';

// ---------------------------------------------------------------------
// The coaching-staff system for Athletics V2 (see data/studentLifeData.ts's
// "COACHING STAFF" block) — mirrors facultySystem.ts's own tickFaculty
// exactly: a standing candidate market that churns every week
// (tickCoachCandidatePool, below) plus tenure growth for every hire
// actually retained (growAssignedCoaches, below). Kept as its own system
// file, alongside its own data module, rather than folded into
// studentLifeSystem.ts — Athletics V2's whole premise is a hiring pool that
// mirrors faculty's, and faculty gets its own system file too.
// ---------------------------------------------------------------------

// The market side: age every listing a week, drop anyone who's been up for
// COACH_CANDIDATE_LISTING_WEEKS (they took another job), then top back up
// toward COACH_CANDIDATE_POOL_TARGET. No churn logging, unlike faculty's one
// "nobody in this field" exception — athletics has no roster-coverage
// concept a listing could be the first to fill (a team either has a coach
// in a role or it doesn't, and that's already visible on the Athletics tab
// itself), so there is nothing here worth interrupting the log for.
//
// ONE DRAW ON THE GLOBAL STREAM A WEEK (Plan 21's PR J), however many
// candidates the week mints: the market's size must not decide how many
// times the game rolls a die, which is what kept COACH_CANDIDATE_POOL_TARGET
// at 18 through two plans. Then the floor: every open chair on an active
// team gets a journeyman listed if nobody in its field is.
function tickCoachCandidatePool(s: GameState): void {
  for (const c of s.orgs.coachCandidates) c.weeksListed += 1;
  s.orgs.coachCandidates = s.orgs.coachCandidates.filter((c) => c.weeksListed < COACH_CANDIDATE_LISTING_WEEKS);

  const roll = marketRng();
  const arrivals = coachCandidateArrivalsThisWeek(s.orgs.coachCandidates.length);
  const used = coachNamesInUse(s);
  for (let i = 0; i < arrivals; i += 1) {
    const candidate = generateCoachCandidate(rollCoachField(roll), used, roll);
    used.add(candidate.name);
    s.orgs.coachCandidates.push(candidate);
  }
  for (const field of uncoveredChairFields(s)) {
    const candidate = generateCoachCandidate(field, used, roll, 'journeyman');
    used.add(candidate.name);
    s.orgs.coachCandidates.push(candidate);
  }
}

// The roster side: every coach actually assigned to a team (any of the
// three staff roles, across every team) grows one week of tenure, exactly
// like growFaculty — quality climbs toward qualityPotential, and salary is
// recomputed from the new current quality plus the tenure premium. A
// candidate still on the market does NOT grow, the same "only retained
// time counts" rule facultySystem.ts's growFaculty uses.
function growCoach(c: Coach): void {
  c.tenureWeeks += 1;
  c.quality = grownCoachQuality(c.qualityPotential, c.tenureWeeks);
  c.salary = coachSalaryFor(c.quality, c.tenureWeeks, c.field);
}

export function tickAthletics(s: GameState): void {
  tickCoachCandidatePool(s);
  // The postseason, once a year. Silent — it writes results and queues any
  // titles; the report that stops the clock is drained on a quiet week by
  // eventSystem.ts, exactly as a milestone is (see playoffs.ts).
  if (s.clock.week === PLAYOFF_WEEK) runPlayoffs(s);
  for (const t of s.orgs.teams) {
    if (t.headCoach) growCoach(t.headCoach);
    if (t.assistantCoach) growCoach(t.assistantCoach);
    if (t.trainer) growCoach(t.trainer);
  }
}
