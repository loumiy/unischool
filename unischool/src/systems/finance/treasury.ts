import type { GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';

// The treasury's choices (Plan 27): how much the endowment pays out each
// year, and cash moved into it by hand. Both are the player's alone; the
// harness never touches them, and the defaults are the game's old fixed
// rate and no transfers.

export const DRAW_RATE_DEFAULT = 0.04;
export const DRAW_RATE_MIN = 0.03;
export const DRAW_RATE_MAX = 0.07;
export const DRAW_RATE_STEP = 0.005;
// Above this the board thinks the college is eating its seed corn
// (the distress ladder's confidence reads it).
export const DRAW_RATE_PRUDENT = 0.05;

export function drawRate(s: GameState): number {
  return s.finance.drawRate ?? DRAW_RATE_DEFAULT;
}

export function clampDrawRate(rate: number): number {
  if (!Number.isFinite(rate)) return DRAW_RATE_DEFAULT;
  const stepped = Math.round(rate / DRAW_RATE_STEP) * DRAW_RATE_STEP;
  return Number(Math.max(DRAW_RATE_MIN, Math.min(DRAW_RATE_MAX, stepped)).toFixed(4));
}

// The round sums a transfer is offered in: a tenth, a quarter and a half of
// the cash on hand, each rounded down to two significant figures. Nothing
// is offered under $100,000.
export const TRANSFER_MINIMUM = 100_000;
const TRANSFER_SHARES = [0.1, 0.25, 0.5] as const;

export function roundDown(amount: number): number {
  if (amount <= 0) return 0;
  const unit = 10 ** Math.max(0, Math.floor(Math.log10(amount)) - 1);
  return Math.floor(amount / unit) * unit;
}

export function transferOffers(s: GameState): number[] {
  const offers = TRANSFER_SHARES.map((share) => roundDown(s.finance.cash * share)).filter((a) => a >= TRANSFER_MINIMUM);
  return [...new Set(offers)];
}

// Moves cash into the endowment. Never more than the cash on hand, never
// less than the minimum; anything else is refused whole.
export function moveToEndowment(s: GameState, amount: number): boolean {
  if (!Number.isFinite(amount) || amount < TRANSFER_MINIMUM || amount > s.finance.cash) return false;
  s.finance.cash -= amount;
  s.finance.endowment += amount;
  return true;
}

// ---- Borrowing for buildings (Plan 27C) ----
// A building the cash cannot cover can be borrowed for: the shortfall, as a
// loan against the endowment, repaid weekly over fifteen years at 5%. What
// is outstanding never exceeds 30% of the endowment. Only a college with
// cash in hand borrows; one already in deficit cannot.

export const LOAN_RATE = 0.05;
export const LOAN_YEARS = 15;
export const BORROWING_SHARE = 0.3;
const LOAN_WEEKS = LOAN_YEARS * WEEKS_PER_YEAR;
const WEEKLY_RATE = LOAN_RATE / WEEKS_PER_YEAR;

export function debtOutstanding(s: GameState): number {
  return (s.finance.loans ?? []).reduce((t, l) => t + l.balance, 0);
}

export function debtService(s: GameState): number {
  return (s.finance.loans ?? []).reduce((t, l) => t + l.payment, 0);
}

export function borrowingRoom(s: GameState): number {
  return Math.max(0, s.finance.endowment * BORROWING_SHARE - debtOutstanding(s));
}

// The weekly payment that clears `amount` over the loan's term.
export function loanPayment(amount: number): number {
  return (amount * WEEKLY_RATE) / (1 - (1 + WEEKLY_RATE) ** -LOAN_WEEKS);
}

// What a building would borrow: the shortfall, when there is one, the cash
// is positive and the room allows it. Zero means it cannot, or need not.
export function loanFor(s: GameState, cost: number): number {
  const shortfall = cost - s.finance.cash;
  if (s.finance.cash <= 0 || shortfall <= 0 || shortfall > borrowingRoom(s)) return 0;
  return Math.ceil(shortfall);
}

export function takeLoan(s: GameState, amount: number, buildingId: string): void {
  s.finance.cash += amount;
  (s.finance.loans ??= []).push({ buildingId, balance: amount, payment: loanPayment(amount), weeksLeft: LOAN_WEEKS });
}

// Weekly, after the payments are charged: interest accrues, the payment
// comes off, and a loan that has run its term is gone.
export function serviceLoans(s: GameState): void {
  const loans = s.finance.loans;
  if (!loans) return;
  for (const l of loans) {
    l.balance = Math.max(0, l.balance * (1 + WEEKLY_RATE) - l.payment);
    l.weeksLeft -= 1;
  }
  const open = loans.filter((l) => l.weeksLeft > 0);
  if (open.length > 0) s.finance.loans = open;
  else delete s.finance.loans;
}
