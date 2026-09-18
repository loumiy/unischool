import { tickSearches } from './facultySearch';
import type { Faculty, GameState } from '../../state/types';

// THE ONE WAY SOMEBODY JOINS THE ROSTER. Two callers reach it: the
// reducer's HIRE_FACULTY, which appoints off the candidate market, and the
// visiting-chair decision event, which appoints somebody the market never
// listed. Shared rather than duplicated so an appointment can never mean
// two slightly different things — a bug that would show up as a professor
// who works here but is quietly still "listed", aged out of a job they
// already hold.
//
// weeksListed is the POOL's clock and tenureWeeks is the ROSTER's, so
// clearing the first is what actually moves a person from one to the
// other.
export function appointFaculty(s: GameState, person: Faculty): void {
  person.weeksListed = 0;
  s.faculty.push(person);
}
import {
  generateCandidate, grownStat, facultySalary, rollCandidateField, candidateArrivalsThisWeek,
  SLOT_GROWTH_INTERVAL_WEEKS, MAX_FACULTY_SLOTS, CANDIDATE_LISTING_WEEKS,
} from '../../data/facultyData';

// Applies one week of tenure to a retained faculty member: teaching and
// research each grow toward their own rolled potential, and salary is
// recomputed from the new current stats plus the separate, slower
// seniority-premium curve (see facultyData.ts's grownStat/facultySalary).
// Candidates sitting in the hiring pool do NOT grow — only being on the
// roster ("retained") counts toward tenure; what a listing accrues instead
// is weeksListed, which only ever counts down its time on the market.
function growFaculty(f: Faculty): void {
  f.tenureWeeks += 1;
  f.teaching = grownStat(f.teachingPotential, f.tenureWeeks);
  f.research = grownStat(f.researchPotential, f.tenureWeeks);
  // acclaim is passed, not stored into the figure: a research prize's
  // permanent raise has to be an INPUT to this recomputation, since the
  // line below overwrites whatever salary was there last week (see
  // researchData.ts's note on why the award lives on its own field).
  f.salary = facultySalary(f.teaching, f.research, f.tenureWeeks, f.acclaim);
  // Course slots grow in flat +1 steps on tenure milestones rather than a
  // smooth curve (there's no per-hire ceiling to approach, unlike teaching/
  // research) — a further, concrete reason to retain a hire long-term on
  // top of their rising stats.
  if (f.tenureWeeks % SLOT_GROWTH_INTERVAL_WEEKS === 0 && f.courseSlots < MAX_FACULTY_SLOTS) {
    f.courseSlots += 1;
  }
}

// One week of the standing academic job market (see facultyData.ts's churn
// block and docs/design/faculty.md). Three things happen, in this order:
//
//   1. every listing ages a week;
//   2. anyone who has been up for CANDIDATE_LISTING_WEEKS withdraws — they
//      took another job. This is the whole reason the list is worth
//      watching: a specialist the player scrolled past is gone in a couple
//      of months, and the pool never becomes a static shopping catalogue;
//   3. new listings arrive to bring the pool back toward
//      CANDIDATE_POOL_TARGET, each in a weighted-random field so the mix
//      tracks curriculum demand thinned by how hard each field is to hire
//      into (facultyData.ts's rollCandidateField).
//
// There is no posting to pay for and no countdown to wait out: a field is
// available when someone in it happens to be on the market, which is what
// makes a common field feel abundant and a thin-market specialist feel
// like a find.
//
// None of that churn is logged: at ~2.5 arrivals and ~2.5 withdrawals a
// week, narrating any of it would bury every other line in the ticker and
// train the player to ignore it — including a listing in a field the
// school has nobody in, which reads as real news exactly once (a founding
// school starts unstaffed in most of the ~30 fields, so this alone would
// fire on nearly every early arrival) and then as noise every time after.
// The alert badge on the Faculty tab (see Toolbar.tsx's TAB_ALERT, which
// already flags an unseen candidate in a field the curriculum needs) is
// where this actually belongs — a glance at the tab a player is going to
// open anyway, not a line competing for space in the log.
function tickCandidatePool(s: GameState): void {
  for (const c of s.candidates) c.weeksListed += 1;
  s.candidates = s.candidates.filter((c) => c.weeksListed < CANDIDATE_LISTING_WEEKS);

  const arrivals = candidateArrivalsThisWeek(s.candidates.length);
  for (let i = 0; i < arrivals; i += 1) {
    const existingNames = [...s.faculty, ...s.candidates].map((f) => f.name);
    s.candidates.push(generateCandidate(rollCandidateField(), existingNames));
  }
  // A posted search's listing lands on top of the ordinary churn (Plan
  // 14's PR H — see facultySearch.ts).
  tickSearches(s);
}

export function tickFaculty(s: GameState): void {
  tickCandidatePool(s);
  for (const f of s.faculty) growFaculty(f);
}
