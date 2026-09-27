// ---------------------------------------------------------------------
// One way to write a number (Plan 76E, src/format.ts, the register's
// "Numbers" in docs/architecture/ui-shell.md): the helpers read the same
// in a German browser as in an American one, each figure has one
// precision, and no player-facing money is built outside the helpers.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

// First, so the formatters below are built in a German browser.
import { GERMAN_BROWSER } from './fixtures/german-browser';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  calendarDate, count, decimal, fraction, gameDate, gameDateOfWeek, money, moneyShort, multiplier, pct,
  prestigeFigure, satisfactionFigure, signed, signedMoney, signedPct, weeksProse, weeksShort,
} from '../src/format';
import { WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
function reads(got: string, want: string, what: string): void {
  assert(got === want, `${what}: "${got}", want "${want}"`);
}

console.log('number format tests');

// ---- The browser is German: an unguarded call would show it ----
{
  reads((1234567).toLocaleString(), '1.234.567', `the fixture makes ${GERMAN_BROWSER} the default`);
}

// ---- The helpers read the same whatever the browser ----
{
  reads(money(1_234_567), '$1,234,567', 'money, long');
  reads(money(-5_000), '−$5,000', 'money, negative, a true minus');
  reads(money(-0.4), '$0', 'money that rounds to nothing');
  reads(moneyShort(2_700_000), '$2.7M', 'money, short, millions');
  reads(moneyShort(12_400_000), '$12M', 'money, short, tens of millions');
  reads(moneyShort(180_400), '$180k', 'money, short, thousands');
  reads(moneyShort(3_200_000_000), '$3.2B', 'money, short, billions');
  reads(moneyShort(-450_000), '−$450k', 'money, short, negative');
  reads(signedMoney(5_000), '+$5,000', 'a gain in money');
  reads(signedMoney(-5_000), '−$5,000', 'a loss in money');
  reads(signedMoney(0.2), '$0', 'no change in money');
  reads(count(12_234), '12,234', 'a count');
  reads(count(12_233.6), '12,234', 'a count is whole');
  reads(decimal(1234.56, 1), '1,234.6', 'a decimal');
  reads(decimal(-0.01, 1), '0.0', 'a decimal that rounds to zero is never "-0.0"');
  reads(pct(0.42), '42%', 'a percent');
  reads(pct(0.045, 1), '4.5%', 'a rate at one decimal');
  reads(signedPct(0.34), '+34%', 'a rise');
  reads(signedPct(-0.03), '−3%', 'a fall, a true minus');
  reads(signedPct(0.001), '0%', 'no move');
  reads(signed(-3), '−3', 'a signed figure, a true minus');
  reads(signed(2.46, 1), '+2.5', 'a signed figure at one decimal');
  reads(signed(0.2), '0', 'a signed figure that rounds to zero');
  reads(multiplier(1.5432), '×1.54', 'a multiplier');
  reads(fraction(5, 9), '5/9', 'a fraction, tight');
  reads(fraction(1200, 4500), '1,200/4,500', 'a fraction of large counts');
  reads(weeksShort(8), '8w', 'a compact duration');
  reads(weeksProse(26), '26 weeks', 'a duration in prose');
  reads(weeksProse(3 * WEEKS_PER_YEAR), '3 years', 'whole years in prose');
  reads(weeksProse(WEEKS_PER_YEAR), '1 year', 'one year in prose');
}

// ---- One precision per figure ----
{
  reads(prestigeFigure(68.14), '68.1', 'prestige, one decimal');
  reads(prestigeFigure(70), '70.0', 'prestige, whole, still one decimal');
  reads(prestigeFigure(69.96), '69.9', 'prestige never reads past an unmet milestone');
  reads(prestigeFigure(70.3), '70.3', 'prestige, a float that multiplies short');
  reads(prestigeFigure(1234.5), '1,234.5', 'prestige, separators');
  reads(satisfactionFigure(85), '85', 'satisfaction, whole');
  reads(satisfactionFigure(54.6), '54', 'satisfaction under the warning line reads under it');
}

// ---- The game date ----
{
  reads(gameDate(9, 2), 'Year 9 · Fall term · Week 2', 'the dock\'s date');
  reads(gameDate(9, 30), 'Year 9 · Spring term · Week 30', 'the spring term');
  reads(gameDateOfWeek(8 * WEEKS_PER_YEAR + 2), 'Year 9 · Fall term · Week 2', 'a date from a week count');
  reads(gameDateOfWeek(WEEKS_PER_YEAR), 'Year 1 · Spring term · Week 52', 'the year\'s last week');
  reads(calendarDate(Date.UTC(2026, 8, 15, 12)), 'September 15, 2026', 'a save\'s date, in English');
}

// ---- No player-facing money, count or date outside the helpers ----
// Every source file a player reads text from. The debug panel is for
// developers, and format.ts is where the helpers live.
const SRC = join(process.cwd(), 'src');
const EXEMPT = new Set(['format.ts', 'components/DebugPanel.tsx']);
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.tsx?$/.test(e.name) ? [path] : [];
  });
}

// Each rule, with a line it must catch and a line it must pass, so the scan
// cannot go quiet by matching nothing.
const RULES: Array<{ what: string; re: RegExp; catches: string; passes: string; tsxOnly?: boolean }> = [
  {
    what: 'a locale-dependent formatter (use count, decimal, money or calendarDate)',
    re: /\.toLocale(?:String|DateString|TimeString)\(|\.getFullYear\(\)/,
    catches: 'Tuition ${tuition.toLocaleString()}/yr',
    passes: 'Tuition ${money(tuition)}/yr',
  },
  {
    what: 'a dollar sign written by hand in a template (use money or moneyShort)',
    re: /\$\$\{/,
    catches: 'is launched: $${(target / 1e6).toFixed(1)}M',
    passes: 'is launched: ${money(target)}',
  },
  {
    what: 'a dollar sign written by hand before a JSX figure (use money or moneyShort)',
    re: />\s*\$\{/,
    // In a .ts file ">${" is a template writing markup (the report card).
    tsxOnly: true,
    catches: '<strong className="price">${count(tuition)}/yr</strong>',
    passes: '<strong className="price">{money(tuition)}/yr</strong>',
  },
  {
    what: 'a short money figure built by hand (use moneyShort)',
    // Not an SVG path's moveto: "…toFixed(1)}M${…".
    re: /toFixed\(\d\)\s*\}?\s*[MBk](?![\w$])/,
    catches: '${(target / 1e6).toFixed(1)}M over ${years} years',
    passes: '${moneyShort(target)} over ${years} years',
  },
];
{
  for (const rule of RULES) {
    assert(rule.re.test(rule.catches), `the scan for ${rule.what} catches its example`);
    assert(!rule.re.test(rule.passes), `the scan for ${rule.what} passes the helper`);
  }
  const files = sources(SRC).filter((f) => !EXEMPT.has(relative(SRC, f).replace(/\\/g, '/')));
  assert(files.length > 100, `the scan reads the source (${files.length} files)`);
  const hits = new Map(RULES.map((r) => [r, [] as string[]]));
  for (const file of files) {
    const tsx = file.endsWith('.tsx');
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      for (const rule of RULES.filter((r) => tsx || !r.tsxOnly)) {
        if (rule.re.test(line)) hits.get(rule)!.push(`${relative(SRC, file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
      }
    });
  }
  for (const [rule, found] of hits) {
    assert(found.length === 0, `no ${rule.what}; found:\n      ${found.join('\n      ')}`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
