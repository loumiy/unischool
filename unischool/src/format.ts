// How the game writes numbers and names, shared by every screen. The rules
// are the register's (docs/architecture/ui-shell.md, "Numbers").

import { WEEKS_PER_YEAR } from './state/types';

// The game's text is English, so its figures are too: one locale under
// every helper, whatever the browser's. A German browser reads "$1,234,567"
// and "4.5%" like any other.
const LOCALE = 'en-US';
const FIXED = new Map<number, Intl.NumberFormat>();
function fixedFormat(digits: number): Intl.NumberFormat {
  let f = FIXED.get(digits);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    FIXED.set(digits, f);
  }
  return f;
}

// A figure at a fixed number of decimals, with thousands separators:
// 1234.5 → "1,234.5". A figure that rounds to zero never reads "-0".
export function decimal(v: number, digits = 0): string {
  const out = fixedFormat(digits).format(v);
  return /^-0(\.0+)?$/.test(out) ? out.slice(1) : out;
}

// A plain count, whole, with thousands separators: 12234 → "12,234".
export function count(n: number): string {
  return decimal(Math.round(n));
}

// Whole dollars with thousands separators. A negative figure takes a true
// minus sign before the dollar sign: −$5,000. The long form, for sentences,
// statements and ledgers.
export function money(v: number): string {
  const whole = Math.round(v);
  return `${whole < 0 ? '−' : ''}$${decimal(Math.abs(whole))}`;
}

// Money at the grain a scan or a chart axis needs: "$180k", "$4.0M", "$12M",
// "$3.2B". The short form, for tiles, cards, chips, buttons and salary tags:
// wherever prices are compared at a glance.
export function moneyShort(v: number): string {
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${sign}$${decimal(abs / 1_000_000_000, abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${sign}$${decimal(abs / 1_000_000, abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${decimal(Math.round(abs / 1_000))}k`;
  return `${sign}$${decimal(Math.round(abs))}`;
}

// A hand-built signed figure, with a true minus: "+1.5", "−3". A change
// that rounds to zero reads "0", not "+0".
export function signed(v: number, digits = 0): string {
  const shown = decimal(Math.abs(v), digits);
  if (Number(shown.replace(/,/g, '')) === 0) return shown;
  return `${v > 0 ? '+' : '−'}${shown}`;
}

// A change in money: "+$5,000", "−$5,000", and "$0" when there is none.
export function signedMoney(v: number): string {
  const whole = Math.round(v);
  return whole > 0 ? `+${money(whole)}` : money(whole);
}

// A share (0..1) as a percent: 0.42 → "42%". Whole points unless the figure
// is one whose meaning is in the decimal (a draw rate, "4.5%"), and then
// that grain everywhere the figure appears.
export function pct(v: number, digits = 0): string {
  return `${decimal(v * 100, digits)}%`;
}

// A change (0.34 = up 34%) as signed points: "+34%", "−3%". A move that
// rounds to zero reads "0%", not "+0%".
export function signedPct(change: number, digits = 0): string {
  return `${signed(change * 100, digits)}%`;
}

// A multiplier, with no space after the sign: "×1.54".
export function multiplier(v: number, digits = 2): string {
  return `×${decimal(v, digits)}`;
}

// Prestige, at one decimal everywhere. Floored rather than rounded, so a
// figure never reads past a milestone it has not reached: 69.96 is "69.9",
// not "70.0". The epsilon keeps a float such as 70.3 × 10 = 702.99… whole.
export function prestigeFigure(v: number): string {
  return decimal(prestigeShown(v), 1);
}
// The value a prestige figure shows, for a delta built from what is shown.
export function prestigeShown(v: number): number {
  return Math.floor(v * 10 + 1e-9) / 10;
}

// Satisfaction, and every 0–100 score that makes it up, whole everywhere.
// Floored for the same reason as prestige: 54.6 is under the dock's warning
// line, so it reads "54".
export function satisfactionFigure(v: number): string {
  return decimal(satisfactionShown(v));
}
// The value a satisfaction figure shows, for a delta built from what is
// shown: "averaged 80, against 73 (+7)" always adds up.
export function satisfactionShown(v: number): number {
  return Math.floor(v + 1e-9);
}

// A compact duration, for chips, buttons and map labels: "8w". Prose says
// weeks.
export function weeksShort(n: number): string {
  return `${Math.round(n)}w`;
}

// A duration in prose: whole years as years ("3 years"), anything else in
// weeks ("26 weeks", "78 weeks").
export function weeksProse(n: number): string {
  const years = n / WEEKS_PER_YEAR;
  if (Number.isInteger(years) && years > 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${Math.round(n)} week${Math.round(n) === 1 ? '' : 's'}`;
}

// A compact count out of a total, tight: "5/9". Prose says "5 of 9".
export function fraction(n: number, of: number): string {
  return `${count(n)}/${count(of)}`;
}

// The half of the college year a week falls in.
export function termName(week: number): string {
  return week <= WEEKS_PER_YEAR / 2 ? 'Fall Term' : 'Spring Term';
}

// The game date, one form wherever a moment is dated: the dock, the title
// screen, the letters. "Year 9 · Fall Term · Week 2".
export function gameDate(year: number, week: number): string {
  return `Year ${year} · ${termName(week)} · Week ${week}`;
}

// The same, from a week counted from the founding (Year 1's first is 1).
export function gameDateOfWeek(absoluteWeek: number): string {
  return gameDate(Math.floor((absoluteWeek - 1) / WEEKS_PER_YEAR) + 1, ((absoluteWeek - 1) % WEEKS_PER_YEAR) + 1);
}

// A real calendar day, for the one place the game names one (a save's
// date): "September 27, 2026", whatever the browser's locale.
const CALENDAR = new Intl.DateTimeFormat(LOCALE, { year: 'numeric', month: 'long', day: 'numeric' });
export function calendarDate(ms: number): string {
  return CALENDAR.format(new Date(ms));
}

// 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st.
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// "Prof. Ada Okafor" → "Okafor".
export function surnameOf(name: string): string {
  const parts = name.replace(/^(Dr|Prof|Professor)\.?\s+/, '').split(' ');
  return parts[parts.length - 1];
}
