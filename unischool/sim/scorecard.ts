// ---------------------------------------------------------------------
// THE SCORECARD, AS A REPORT (Plan 56; a gate from Plan 15's PR G until
// then).
//
// sim/reference.ts holds two kinds of band. TARGETS are hand-written —
// Plan 15 §6's table for the Balanced builder, and the plan's own
// sentences for the two controls. REFERENCE is generated: the envelope of
// the reference's runs (three seeds and a second founding name, Plan 49)
// at ±25%, written by `npm run sim -- --write-reference`.
//
// This plays every strategy on the default seed at the full fifty-year
// horizon and prints every figure outside its band, and every guardrail
// that does not hold. It no longer fails anything: the owner's rule since
// Plan 56 is that balance numbers are measured and reported, and only
// checks gate a merge. The harness that replaces this one (Plans 57–59)
// measures first and recommends numbers after.
//
// Run with `npm run scorecard`. Takes several minutes.
// ---------------------------------------------------------------------

import { play, playRun, STRATEGIES, DEFAULT_SIM_SEED, type Row } from './balanceSim';
import { bandsFor, describeFinding, findingsFor, REFERENCE_RUNS, type Finding } from './reference';

// The hand-written targets are judged across the reference's runs (seeds and
// founding names, sim/reference.ts's REFERENCE_RUNS), not at the default run
// alone: a figure is out only when it is out in most of them (Plan 49). One
// run is one draw of the dice and one draw of program offers; the Balanced
// builder once failed its pace on the default seed alone, and stalled for a
// decade on one founding name while every seed grew. The generated bands
// need no such rule: each is the envelope of those same runs.
const RUN_JUDGED = new Set(['Balanced builder', 'Overbuilder (beds ahead of demand)']);
const runLabel = (i: number) => {
  const key = REFERENCE_RUNS[i];
  return key.name ? `"${key.name}"` : key.seed ? `seed ${key.seed}` : 'the default run';
};

// Out in more than half the runs, by year and metric.
function mostlyOut(runs: Row[][], strategy: string): Finding[] {
  const counts = new Map<string, { finding: Finding; n: number }>();
  for (const rows of runs) {
    for (const finding of findingsFor(strategy, rows)) {
      const key = `${finding.year}|${finding.metric}`;
      const seen = counts.get(key);
      if (seen) seen.n += 1;
      else counts.set(key, { finding, n: 1 });
    }
  }
  return [...counts.values()].filter((c) => c.n * 2 > runs.length).map((c) => c.finding);
}

// The lower median: for a "no earlier than" gate, the stricter middle.
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

// The reference is written at forty years, so this reads the same horizon:
// a shorter run would silently skip the year-30 and year-40 bands, which
// are the two the late-game plans are about.
const YEARS = 50;

let findings = 0;
let strategiesWithoutBands = 0;

// The guardrails as gates (Plan 35; sim/guardrails.ts reports them across
// seeds): read here on the default seed, off the runs this suite plays.
const STOPS_PER_YEAR_MAX = 12; // v2's complaint was too many stops
const SATURATED = 95;          // satisfaction at or above this reads as maxed out
// A year at the ceiling is a good year; v2's saturation was decades of it.
// Two since Plan 36, whose size cost gave the Regional engine one year at 95
// (none before).
const SATURATED_YEARS_MAX = 2;
const IDLE = 'Idle (builds nothing)';
const BUILT_TO_FAIL = new Set(['Overbuilder (beds ahead of demand)']);
const finalRank = new Map<string, number>();

// The design's eras as gates (Plan 36): the Balanced builder builds through
// the build era rather than finishing it by Year 16. Read off the default
// seed, like the bands.
const PACED = 'Balanced builder';
const FIRST_PLACE_NO_EARLIER = 25;
const TWENTY_THOUSAND_NO_EARLIER = 20;
const BUILT_BETWEEN: [number, number] = [22, 38];
const FOUNDING_BLOCKED_MAX = 60;
// No founding name stalls it (Plan 49): on "Test" it once had 1,239
// students at Year 12 against 10,800 on "Test University", three offers
// standing that fit no hall it would build. Every run grows past this by
// Year 12 (the least of the runs so far: 5,920), and so does "Test",
// played to that year alone.
const GROWN_BY_YEAR_12 = 4_000;
const STALLED_NAMES = ['Test'];
function paceOf(rows: Row[]): { first: number; big: number; built: number; blocked: number } {
  const most = Math.max(...rows.map((r) => r.courses));
  return {
    first: rows.find((r) => r.rank === 1)?.year ?? Infinity,
    big: rows.find((r) => r.enrolled >= 20_000)?.year ?? Infinity,
    built: rows.find((r) => r.courses >= 0.8 * most)?.year ?? Infinity,
    blocked: rows.filter((r) => r.year <= 10).reduce((t, r) => t + r.blockedWeeks, 0),
  };
}
let gateFailures = 0;
function gate(ok: boolean, msg: string): void {
  if (ok) return;
  gateFailures += 1;
  console.log(`  ✗ guardrail: ${msg}`);
}

console.log('balance scorecard');
console.log(`  ${STRATEGIES.length} strategies, ${YEARS} years, seed ${DEFAULT_SIM_SEED}`);

for (const strategy of STRATEGIES) {
  const { rows, tally } = play(strategy, YEARS);
  // The other runs, played when a judgment needs them.
  let others: Row[][] | null = null;
  const allRuns = (): Row[][] => {
    others ??= REFERENCE_RUNS.slice(1).map((key) => playRun(strategy, YEARS, key).rows);
    return [rows, ...others];
  };
  const stops = Object.values(tally.modals).reduce((a, b) => a + b, 0) / YEARS;
  gate(stops <= STOPS_PER_YEAR_MAX, `${strategy.name} stops ${stops.toFixed(1)} times a year (at most ${STOPS_PER_YEAR_MAX})`);
  const saturated = rows.filter((r) => r.satisfaction >= SATURATED).length;
  gate(saturated <= SATURATED_YEARS_MAX, `${strategy.name} has ${saturated} years at or above ${SATURATED} satisfaction (at most ${SATURATED_YEARS_MAX})`);
  finalRank.set(strategy.name, rows[rows.length - 1].rank);
  if (strategy.name === PACED) {
    // The pace is the median run's, figure by figure (Plan 49).
    const paces = allRuns().map(paceOf);
    const first = median(paces.map((p) => p.first));
    const big = median(paces.map((p) => p.big));
    const built = median(paces.map((p) => p.built));
    const blocked = median(paces.map((p) => p.blocked));
    gate(first >= FIRST_PLACE_NO_EARLIER, `${PACED} reaches first place in Year ${first} (no earlier than ${FIRST_PLACE_NO_EARLIER})`);
    gate(big >= TWENTY_THOUSAND_NO_EARLIER, `${PACED} reaches 20,000 students in Year ${big} (no earlier than ${TWENTY_THOUSAND_NO_EARLIER})`);
    gate(built >= BUILT_BETWEEN[0] && built <= BUILT_BETWEEN[1], `${PACED} builds four-fifths of its catalog by Year ${built} (Years ${BUILT_BETWEEN[0]}–${BUILT_BETWEEN[1]})`);
    gate(blocked <= FOUNDING_BLOCKED_MAX, `${PACED} is blocked by money ${blocked} weeks in its founding decade (at most ${FOUNDING_BLOCKED_MAX})`);
    const fmtYear = (y: number) => (Number.isFinite(y) ? `Y${y}` : 'never');
    console.log(`  · ${PACED}'s pace, the median of ${paces.length} runs: first place ${fmtYear(first)}, 20,000 students ${fmtYear(big)}, catalog four-fifths built ${fmtYear(built)}, ${blocked} founding weeks blocked`);
    console.log(`    (each run: ${paces.map((p, i) => `${runLabel(i)} ${fmtYear(p.first)}/${fmtYear(p.big)}/${fmtYear(p.built)}`).join(', ')})`);
    // Growth under every name.
    const grown: [string, number][] = [
      ...allRuns().map((r, i): [string, number] => [runLabel(i), r.find((x) => x.year === 12)?.enrolled ?? 0]),
      ...STALLED_NAMES.map((name): [string, number] => [`"${name}"`, playRun(strategy, 12, { name }).rows.find((x) => x.year === 12)?.enrolled ?? 0]),
    ];
    for (const [label, enrolled] of grown) {
      gate(enrolled >= GROWN_BY_YEAR_12, `${PACED} has ${enrolled.toLocaleString()} students at Year 12 on ${label} (at least ${GROWN_BY_YEAR_12.toLocaleString()})`);
    }
    console.log(`    students at Year 12: ${grown.map(([label, n]) => `${label} ${n.toLocaleString()}`).join(', ')}`);
  }
  if (!bandsFor(strategy.name)) {
    strategiesWithoutBands += 1;
    console.log(`  · ${strategy.name}: no bands recorded — run \`npm run sim -- --write-reference\``);
    continue;
  }
  let out = findingsFor(strategy.name, rows);
  if (out.length > 0 && RUN_JUDGED.has(strategy.name)) {
    const runs = allRuns();
    const mostly = mostlyOut(runs, strategy.name);
    if (mostly.length < out.length) {
      console.log(`  · ${strategy.name}: ${out.length} out of band on the default run, ${mostly.length} in most of ${runs.length} runs`);
      for (const finding of out) console.log(`      ${describeFinding(finding)}${mostly.some((m) => m.year === finding.year && m.metric === finding.metric) ? '' : ' (inside in most runs)'}`);
    }
    out = mostly;
  }
  findings += out.length;
  if (out.length === 0) {
    console.log(`  ✓ ${strategy.name}: every sampled figure inside its band`);
    continue;
  }
  console.log(`  · ${strategy.name}: ${out.length} out of band`);
  for (const finding of out) console.log(`      ${describeFinding(finding)}`);
}

// A strategy with no bands at all is worth saying twice, because it is the
// one state this file can reach that is a mistake rather than a finding: a
// strategy added without re-recording the reference is not being measured.
if (strategiesWithoutBands > 0) {
  console.log(`\n  ${strategiesWithoutBands} strategy(ies) are not measured at all.`);
}

if (findings === 0) {
  console.log('  ✓ nothing out of band');
} else {
  console.log(`\n  ${findings} figure(s) out of band.`);
}

// The idle college outranks nothing that tries, bar the one built to fail.
const idleRank = finalRank.get(IDLE);
if (idleRank !== undefined) {
  const beaten = [...finalRank].filter(([name, rank]) => name !== IDLE && !BUILT_TO_FAIL.has(name) && rank > idleRank).map(([name]) => name);
  gate(beaten.length === 0, `the idle college (#${idleRank}) outranks ${beaten.join(', ')}`);
}
if (gateFailures === 0) console.log('  ✓ the guardrails hold: stops, saturation, the idle college, and the pace');

// Reported, never failed (Plan 56).
console.log(`\n  ${findings} figure(s) out of band, ${gateFailures} guardrail(s) not holding, ${strategiesWithoutBands} strategy(ies) unmeasured.`);
