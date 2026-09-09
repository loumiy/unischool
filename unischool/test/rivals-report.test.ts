// ---------------------------------------------------------------------
// The annual U.S. News report's athletics line (see rivalsSystem.ts's
// AthleticsReportPayload/buildReportPayload and InterruptModal.tsx's
// RankingsReportView): Athletics V3's season report, deliberately folded
// into the EXISTING annual report rather than built as a standalone modal
// or interrupt — see rivalsSystem.ts's own comment on why. Two things
// worth a regression guard: it stays absent for a school with no varsity
// program (no season to report on), and once a team is active it reports
// the exact same rank athleticRank/AthleticsTab.tsx would.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { buildReportPayload, tickRivals, athleticRank } from '../src/systems/rivals/rivalsSystem';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function withActiveTeam(s: GameState): GameState {
  s.orgs.teams.push({
    id: 'team-report', name: 'Test Team', foundedYear: 1, foundingMembers: 20, foundingEnrolled: 400,
    upkeepPerWeek: 500, sport: 'soccer-m', venueCategory: 'athleticsField', status: 'active',
    headCoach: {
      id: 'c1', name: 'Coach A', gender: 'male', heritage: 'Anglo/Western European', field: 'soccer-m',
      quality: 80, qualityPotential: 90, tenureWeeks: 10, weeksListed: 0, salary: 50_000,
    },
    assistantCoach: null,
    trainer: null,
  });
  return s;
}

// =====================================================================
// 1. buildReportPayload (the recurring annual-report path): no active
// team means no athletics section, at all, on both branches of the
// function (with and without a prior year to compare against).
// =====================================================================
{
  const noPriorYear = createInitialState('Report Test Bare A', 'private');
  assert(buildReportPayload(noPriorYear).athletics === null, 'no prior-year branch: a school with no varsity team gets no athletics section');

  const withPriorYear = createInitialState('Report Test Bare B', 'private');
  withPriorYear.history.push(
    { year: 1, prestige: withPriorYear.self.reputation, rank: 40, enrolled: 500, cash: 0, coursesDone: 0, programsEstablished: 0, satisfaction: 60 },
    { year: 2, prestige: withPriorYear.self.reputation, rank: 38, enrolled: 520, cash: 0, coursesDone: 0, programsEstablished: 0, satisfaction: 60 },
  );
  assert(buildReportPayload(withPriorYear).athletics === null, 'prior-year branch: a school with no varsity team still gets no athletics section');
}

// =====================================================================
// 2. buildReportPayload WITH an active team reports the exact same rank
// athleticRank (and, by extension, AthleticsTab.tsx's own standings line)
// would compute — the report can never disagree with the tab.
// =====================================================================
{
  const s = withActiveTeam(createInitialState('Report Test Staffed', 'private'));
  const payload = buildReportPayload(s);
  assert(payload.athletics !== null, 'a school with an active varsity team gets an athletics section');
  if (payload.athletics) {
    assert(payload.athletics.rank === athleticRank(s), `the report's athletic rank matches athleticRank (report ${payload.athletics.rank}, direct ${athleticRank(s)})`);
    assert(payload.athletics.total === s.rivals.length + 1, `the report's athletics total counts every rival plus the player (got ${payload.athletics.total})`);
  }
}

// =====================================================================
// 3. tickRivals' ONE-TIME "entered the rankings" reveal (the OTHER path
// that constructs a ReportPayload, separately from buildReportPayload)
// carries the same athletics section — a player fielding a team before
// ever cracking the top 50 should not lose that line on the reveal.
// =====================================================================
{
  const s = withActiveTeam(createInitialState('Report Test Reveal', 'private'));
  s.self.reputation = 500; // guaranteed top-50, regardless of starting prestige or rival spread
  s.clock.week = 1;
  tickRivals(s);
  assert(s.pendingInterrupt?.type === 'rankings-entry', `a reputation this high triggers the one-time rankings reveal (got ${s.pendingInterrupt?.type})`);
  const payload = s.pendingInterrupt && 'payload' in s.pendingInterrupt
    ? (s.pendingInterrupt.payload as { athletics: { rank: number; total: number } | null })
    : null;
  assert(payload?.athletics !== null && payload?.athletics !== undefined, 'the one-time rankings-entry reveal also carries the athletics section for a school already fielding a team');
}

console.log('rivals-report tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
