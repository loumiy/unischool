// The treasury's choices (src/systems/finance/treasury.ts): the endowment's
// draw rate, defaulting to the old fixed 4%, and cash moved into the
// endowment by hand, in round sums, never more than the cash on hand.

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { financeBreakdown, tickFinance } from '../src/systems/finance/financeSystem';
import {
  BORROWING_SHARE, DRAW_RATE_DEFAULT, DRAW_RATE_MAX, DRAW_RATE_MIN, LOAN_YEARS, TRANSFER_MINIMUM,
  borrowingRoom, debtOutstanding, drawRate, loanFor, loanPayment, roundDown, transferOffers,
} from '../src/systems/finance/treasury';
import { firstFreeSpot, footprintOf } from '../src/state/campusMap';
import { loadGame, saveGame } from '../src/state/persistence';
import { bindScriptStream } from '../src/engine/random';
import { WEEKS_PER_YEAR } from '../src/state/types';
import type { GameState } from '../src/state/types';
import { canStartDevelopment } from '../src/systems/techtree/techSystem';
import { readSave } from '../src/state/persistence';
import { EXPENSE_LINES, INCOME_LINES, shownLines } from '../src/tabs/treasuryStatement';
import { intoCrisis } from '../tools/scenarios';
import { foundGame, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const canStartBorrowing = (s: GameState, id: string) => canStartDevelopment(s, s.tech.find((t) => t.id === id)!, undefined, 'loan');

bindScriptStream(2727);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('treasury tests');

const fresh = () => {
  const s = createInitialState('Treasury');
  s.pendingInterrupt = null;
  return s;
};

// ---- The draw rate ----
{
  let s = fresh();
  assert(drawRate(s) === DRAW_RATE_DEFAULT && DRAW_RATE_DEFAULT === 0.04, 'the draw defaults to the old fixed 4%');
  const payout = financeBreakdown(s).endowmentPayout;
  assert(Math.abs(payout - (s.finance.endowment * 0.04) / WEEKS_PER_YEAR) < 1e-6, 'and pays that share a year, weekly');
  s = reducer(s, { type: 'SET_DRAW_RATE', rate: 0.0512 });
  assert(s.finance.drawRate === 0.05, 'the draw steps in halves of a point');
  assert(financeBreakdown(s).endowmentPayout > payout, 'a higher draw pays more now');
  s = reducer(s, { type: 'SET_DRAW_RATE', rate: 0.5 });
  assert(drawRate(s) === DRAW_RATE_MAX, `and never more than ${DRAW_RATE_MAX * 100}%`);
  s = reducer(s, { type: 'SET_DRAW_RATE', rate: 0 });
  assert(drawRate(s) === DRAW_RATE_MIN, `nor less than ${DRAW_RATE_MIN * 100}%`);

  const low = fresh();
  low.finance.drawRate = DRAW_RATE_MIN;
  const high = fresh();
  high.finance.drawRate = DRAW_RATE_MAX;
  tickFinance(low);
  tickFinance(high);
  assert(low.finance.endowment > high.finance.endowment, 'and the endowment grows by its return less the draw');
}

// ---- Moving cash in ----
{
  let s = fresh();
  s.finance.cash = 12_345_678;
  const offers = transferOffers(s);
  assert(offers.join(',') === '1200000,3000000,6100000', `offered in round sums of the cash on hand (${offers.join(', ')})`);
  const endowment = s.finance.endowment;
  s = reducer(s, { type: 'MOVE_TO_ENDOWMENT', amount: 3_000_000 });
  assert(s.finance.cash === 9_345_678 && s.finance.endowment === endowment + 3_000_000, 'a transfer moves the cash across');
  s = reducer(s, { type: 'MOVE_TO_ENDOWMENT', amount: 20_000_000 });
  assert(s.finance.cash === 9_345_678, 'never more than the cash on hand');
  s = reducer(s, { type: 'MOVE_TO_ENDOWMENT', amount: TRANSFER_MINIMUM - 1 });
  assert(s.finance.cash === 9_345_678, `nor less than ${TRANSFER_MINIMUM.toLocaleString()}`);
  s.finance.cash = -5_000;
  assert(transferOffers(s).length === 0, 'and nothing is offered out of a deficit');
  assert(roundDown(987_654) === 980_000 && roundDown(45) === 45, 'round sums keep two figures');
}

// ---- Borrowing for a building ----
{
  let s = fresh();
  const hall = s.tech.find((t) => t.kind === 'facility' && t.cost >= 5_000_000 && !t.requiresFaculty)!;
  hall.status = 'available';
  s.finance.endowment = 10_000_000;
  s.finance.cash = hall.cost - 500_000;
  const spot = firstFreeSpot(s, hall, footprintOf(hall))!;
  const place = (borrow: boolean) => reducer(s, { type: 'PLACE_BUILDABLE', buildableId: hall.id, row: spot.row, col: spot.col, rotated: false, borrow });
  assert(place(false).tech.find((t) => t.id === hall.id)!.status === 'available', 'a building the cash cannot cover does not start on cash');
  assert(loanFor(s, hall.cost) === 500_000, 'the loan is the shortfall');
  s = place(true);
  assert(s.tech.find((t) => t.id === hall.id)!.status === 'developing', 'borrowed for, it starts');
  assert(s.finance.cash === 0 && debtOutstanding(s) === 500_000, 'with the cash spent and the shortfall owed');
  assert(borrowingRoom(s) === 10_000_000 * BORROWING_SHARE - 500_000, `against ${BORROWING_SHARE * 100}% of the endowment`);
  const payment = financeBreakdown(s).debtService;
  assert(payment > 0 && s.finance.loans![0].payment === payment, 'the payment is a line in the weekly statement');
  for (let i = 0; i < LOAN_YEARS * WEEKS_PER_YEAR; i++) tickFinance(s);
  assert(s.finance.loans === undefined, `and after ${LOAN_YEARS} years it is paid off`);
  assert(Math.abs(payment * LOAN_YEARS * WEEKS_PER_YEAR - 500_000 * 1.422) < 500_000 * 0.01, 'having cost the interest a 5% loan does');

  const broke = fresh();
  broke.finance.cash = -1;
  assert(loanFor(broke, 1_000_000) === 0, 'a college in deficit cannot borrow');
  const small = fresh();
  small.finance.endowment = 1_000_000;
  small.finance.cash = 1;
  assert(loanFor(small, 1_000_000) === 0, 'nor past its room');
  const course = s.tech.find((t) => t.kind === 'course' && t.status === 'available');
  assert(course === undefined || !canStartBorrowing(s, course.id), 'and courses are never borrowed for');
}

// ---- Paying from building gifts (Plan 30E) ----
{
  let s = fresh();
  const hall = s.tech.find((t) => t.kind === 'facility' && t.cost >= 5_000_000 && !t.requiresFaculty)!;
  hall.status = 'available';
  s.finance.cash = 10;
  s.advancement = { running: null, closed: [], restrictedBuilding: hall.cost + 1 };
  const spot = firstFreeSpot(s, hall, footprintOf(hall))!;
  s = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: hall.id, row: spot.row, col: spot.col, rotated: false, gift: true });
  assert(s.tech.find((t) => t.id === hall.id)!.status === 'developing', 'a building the gifts cover starts from them');
  assert(s.finance.cash === 10 && s.advancement!.restrictedBuilding === 1, 'the cash untouched, the gifts spent');
  const course = s.tech.find((t) => t.kind === 'course' && t.status === 'available');
  assert(course === undefined || !canStartDevelopment(s, course, undefined, 'gift'), 'building money is not spent on courses');
}

// ---- Saves ----
{
  const s = fresh();
  s.finance.drawRate = 0.0612;
  saveGame(s);
  const back = loadGame();
  assert(back?.finance.drawRate === 0.06, 'a saved draw comes back on its step');
  (s.finance as { drawRate?: unknown }).drawRate = 'lots';
  saveGame(s);
  assert(loadGame()?.finance.drawRate === undefined, 'and a malformed one is dropped');
}

// ---- The statement adds up (the review's G7-8) ----
// The Treasury's lines, as the tab shows them (treasuryStatement.ts), sum to
// its totals, over the founding college, the committed saves and the crisis
// scenario's break: an expense with no line (Student life was one) fails.
{
  const states: [string, GameState][] = [['the founding college', fresh()]];
  for (const file of ['save-launch.json', 'save-v78-charter.json', 'save-v79.json']) {
    const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures', file), 'utf8'));
    assert(!('refused' in read), `${file} loads`);
    if ('refused' in read) continue;
    states.push([file, read.state]);
    const crisis = structuredClone(read.state);
    intoCrisis(crisis);
    states.push([`${file}, in crisis`, crisis]);
  }
  // The launch save with every line in play: its teams fielded in venues
  // that stand, full scholarships on each (the flagships spend them), a
  // Provost appointed and a building loan running.
  const launch = states.find(([name]) => name === 'save-launch.json')?.[1];
  if (launch) {
    const s = structuredClone(launch);
    for (const team of s.orgs.teams) {
      team.status = 'active';
      team.scholarships = 'full';
      for (const t of s.tech) if (t.facilityType === team.venueCategory) t.status = 'done';
    }
    s.seats = [{ seatId: 'provost', school: null, holder: 'A. Provost', internal: false, policy: 'balanced', salary: 250_000, appointedYear: s.clock.year }];
    (s.finance.loans ??= []).push({ buildingId: 'test', balance: 1_000_000, payment: loanPayment(1_000_000), weeksLeft: LOAN_YEARS * WEEKS_PER_YEAR });
    states.push(['save-launch.json, with every line in play', s]);
  }
  const seen = new Set<string>();
  // Why a state's statement does not add up, or null when it does.
  const unbalanced = (s: GameState): string | null => {
    const flow = financeBreakdown(s);
    const sum = (lines: typeof INCOME_LINES) => shownLines(lines, flow).reduce((t, l) => { seen.add(l.key); return t + flow[l.key]; }, 0);
    const income = sum(INCOME_LINES);
    const expenses = sum(EXPENSE_LINES);
    if (Math.abs(income - flow.totalIncome) > 0.01) return `the income lines sum to ${income}, total income is ${flow.totalIncome}`;
    if (Math.abs(expenses - flow.totalExpenses) > 0.01) return `the expense lines sum to ${expenses}, total expenses are ${flow.totalExpenses}`;
    if (Math.abs(flow.net - (flow.totalIncome - flow.totalExpenses)) > 0.01) return 'net is not income less expenses';
    return null;
  };
  for (const [name, s] of states) {
    const why = unbalanced(s);
    assert(why === null, `${name}: the statement adds up (${why})`);
  }
  // And every week of a guided college's first ten years, which builds,
  // hires, admits and recognizes clubs and teams.
  const g = foundGame({ seed: 7979 });
  let first: string | null = null;
  let weeks = 0;
  playYears(g, createGuidedPlayer(), 10, (g) => {
    weeks += 1;
    const why = unbalanced(g.s);
    if (why !== null) first ??= `year ${g.s.clock.year}, week ${g.s.clock.week}: ${why}`;
  });
  assert(first === null, `a guided college's statement adds up every week of ${weeks} (${first})`);
  // Every line was on show somewhere, Student life among them, so the sums
  // above are not held only by lines that were left off.
  for (const l of [...INCOME_LINES, ...EXPENSE_LINES]) assert(seen.has(l.key), `${l.label} shows in at least one of the states`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
