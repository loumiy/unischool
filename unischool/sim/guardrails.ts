// The guardrails UniSchool v2 measured, read on this game. Report-only: it
// prints figures and a flag per guardrail, changes nothing and fails
// nothing. Phase N of the merge turns the ones that matter into gates once
// the merged economy's bands exist.
//
//   npm run guardrails                 # every strategy, three seeds, 50 years
//   npm run guardrails -- 20 Balanced  # 20 years, strategies whose name contains "Balanced"
//
// Each strategy is played on the default seed and the reference's extra
// seeds, so a figure reads as a range across seeds rather than one draw.

import { play, STRATEGIES, DEFAULT_SIM_SEED, type Row, type EventTally } from './balanceSim';
import { REFERENCE_EXTRA_SEEDS } from './reference';

const years = Number(process.argv[2] ?? 50);
const filter = process.argv[3];
const SEEDS = [DEFAULT_SIM_SEED, ...REFERENCE_EXTRA_SEEDS];

// Where a figure starts to read as a problem. Deliberately loose: these flag
// a run worth looking at, they do not judge it.
const STOPS_PER_YEAR_HIGH = 12; // more than one stop a month on average
const TOP_EVENT_SHARE_HIGH = 0.25; // one event is over a quarter of all fired
const SATURATED = 95; // satisfaction at or above this reads as maxed out

interface Reading {
  seed: number;
  rows: Row[];
  tally: EventTally;
}

const range = (xs: number[], digits = 0) => {
  const lo = Math.min(...xs), hi = Math.max(...xs);
  return lo === hi ? lo.toFixed(digits) : `${lo.toFixed(digits)}–${hi.toFixed(digits)}`;
};
const flag = (bad: boolean) => (bad ? '  ← look' : '');

const strategies = STRATEGIES.filter((s) => !s.name.startsWith('Probe') && (!filter || s.name.includes(filter)));
const readings = new Map<string, Reading[]>();
for (const strategy of strategies) {
  readings.set(strategy.name, SEEDS.map((seed) => {
    const { rows, tally } = play(strategy, years, undefined, seed);
    return { seed, rows, tally };
  }));
}

console.log(`guardrails: ${strategies.length} strategies, ${years} years, seeds ${SEEDS.join(', ')}\n`);

// 1. Stops per year: every interrupt the run answered, the summer counted
// once. The player's complaint about v2 was too many; v1's summer is one.
console.log('1. stops per year (every modal answered, the summer once)');
for (const [name, rs] of readings) {
  const perYear = rs.map((r) => Object.values(r.tally.modals).reduce((a, b) => a + b, 0) / years);
  console.log(`   ${name.padEnd(40)} ${range(perYear, 1).padStart(9)}${flag(Math.max(...perYear) > STOPS_PER_YEAR_HIGH)}`);
}

// 2. Event variety: how many distinct decision events a run sees, and how
// much of the total the most repeated one takes.
console.log('\n2. event variety (distinct events; the most repeated one and its share)');
for (const [name, rs] of readings) {
  const parts = rs.map((r) => {
    const counts = Object.entries(r.tally.eventFireCounts);
    const total = counts.reduce((a, [, n]) => a + n, 0);
    const [topId, topN] = counts.sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];
    return { distinct: counts.length, topId, share: total > 0 ? topN / total : 0 };
  });
  const worst = parts.reduce((a, b) => (b.share > a.share ? b : a));
  console.log(`   ${name.padEnd(40)} ${range(parts.map((p) => p.distinct)).padStart(7)} distinct; top ${worst.topId} at ${(worst.share * 100).toFixed(0)}%${flag(worst.share > TOP_EVENT_SHARE_HIGH)}`);
}

// 3. Saturation: whether satisfaction runs into its ceiling, where spending
// more on students stops buying anything.
console.log(`\n3. saturation (years with satisfaction at or above ${SATURATED}; the highest seen)`);
for (const [name, rs] of readings) {
  const saturatedYears = rs.map((r) => r.rows.filter((row) => row.satisfaction >= SATURATED).length);
  const peak = Math.max(...rs.flatMap((r) => r.rows.map((row) => row.satisfaction)));
  console.log(`   ${name.padEnd(40)} ${range(saturatedYears).padStart(7)} years; peak ${peak.toFixed(0)}${flag(Math.max(...saturatedYears) > 0)}`);
}

// 4. The idle school must not win: its final rank against every strategy
// that builds, seed by seed.
const idle = readings.get('Idle (builds nothing)');
if (idle) {
  console.log('\n4. the idle school does not win (final rank, lower is better)');
  for (const [i, seed] of SEEDS.entries()) {
    const idleRank = idle[i].rows.at(-1)?.rank ?? NaN;
    const beaten = [...readings].filter(([n, rs]) => n !== 'Idle (builds nothing)' && (rs[i].rows.at(-1)?.rank ?? Infinity) > idleRank).map(([n]) => n);
    console.log(`   seed ${String(seed).padEnd(6)} idle ranks ${idleRank}; strategies it outranks: ${beaten.length ? beaten.join(', ') : 'none'}${flag(beaten.length > 0)}`);
  }
}

// 5. Spread across seeds: how much of a strategy's outcome is the dice.
console.log(`\n5. spread across seeds at year ${years} (prestige; cash in $M)`);
for (const [name, rs] of readings) {
  const last = rs.map((r) => r.rows.at(-1)).filter((r): r is Row => r !== undefined);
  console.log(`   ${name.padEnd(40)} prestige ${range(last.map((r) => r.prestige)).padStart(9)}   cash ${range(last.map((r) => r.cash / 1e6))}`);
}

// 6. Pacing (Plan 35): when a strategy first leads the field, when its
// catalogue is four-fifths built, how long money held it in the founding
// decade, and how much of the last decade it spent at the top. The design's
// eras (docs/design/progression.md) put the building at years 12–35.
const PACE_FOUNDING = 10;
const PACE_LAST_DECADE = 10;
console.log('\n6. pacing (first year at #1; catalogue 80% built; weeks blocked by money in years 1–10; years at #1 in the last decade)');
for (const [name, rs] of readings) {
  const at = (p: (row: Row) => boolean) => rs.map((r) => r.rows.find(p)?.year ?? Infinity);
  const firstTop = at((row) => row.rank === 1);
  const built = rs.map((r) => {
    const most = Math.max(...r.rows.map((row) => row.courses));
    return r.rows.find((row) => row.courses >= 0.8 * most)?.year ?? Infinity;
  });
  const blocked = rs.map((r) => r.rows.filter((row) => row.year <= PACE_FOUNDING).reduce((t, row) => t + row.blockedWeeks, 0));
  const held = rs.map((r) => r.rows.filter((row) => row.year > years - PACE_LAST_DECADE && row.rank === 1).length);
  const yr = (xs: number[]) => (xs.every((x) => x === Infinity) ? 'never' : range(xs.map((x) => (x === Infinity ? years + 1 : x))));
  console.log(`   ${name.padEnd(40)} #1 ${yr(firstTop).padStart(7)}   built ${yr(built).padStart(7)}   blocked ${range(blocked).padStart(7)}   held ${range(held)}/${PACE_LAST_DECADE}${flag(Math.min(...firstTop) < 12)}`);
}
