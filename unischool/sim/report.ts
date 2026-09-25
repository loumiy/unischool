// ---------------------------------------------------------------------
// The report (Plan 63, the rebuild's fourth layer): where the numbers sit.
// Plays the four archetypes (sim/harness/archetypes.ts) and the guided
// player (sim/harness/guided.ts) for fifty years on three seeds and prints
// their trajectories — the median across seeds at years 10, 25 and 50 —
// with the change from the committed baseline (sim/baseline.json), which is
// main's numbers once a branch that moved them lands.
//
//   npm run sim               the report, diffed against the baseline
//   npm run sim -- --save     and write this run as the new baseline
//
// Measures, never fails: the checks are test/archetypes.test.ts and
// test/guided.test.ts. Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { foundGame, playYears, type Player } from './harness/game';
import { ARCHETYPES, createArchetype, type ArchetypeRecord, type ArchetypeYear } from './harness/archetypes';
import { createGuidedPlayer } from './harness/guided';
import { weeklyNet } from '../src/systems/finance/financeSystem';
import { playerRank } from '../src/systems/rivals/rivalsSystem';
import { totalEnrolled } from '../src/state/types';

const SEEDS = [12345, 4242, 777];
const YEARS = 50;
const AT = [10, 25, 50];
const BASELINE = 'sim/baseline.json';
const save = process.argv.includes('--save');

// The figures reported, each read off a year's row.
const FIGURES = ['rank', 'prestige', 'enrolled', 'cash', 'satisfaction', 'courses', 'schools', 'teams'] as const;
type Figure = (typeof FIGURES)[number];
type Summary = Record<string, number>;   // `${figure}@${year}` and the run-wide figures

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];

// The guided player records its own rows; the report reads the same few
// figures off the state each year, as an archetype does.
function guidedAsArchetype(): Player & { record: ArchetypeRecord } {
  const guided = createGuidedPlayer();
  const record: ArchetypeRecord = { years: [], weeksInRed: 0, minCash: Infinity };
  let lastYear = 0;
  return {
    name: 'Guided',
    record,
    answer: guided.answer,
    act(g) {
      const s = g.s;
      if (s.finance.cash < 0) record.weeksInRed += 1;
      record.minCash = Math.min(record.minCash, s.finance.cash);
      if (s.clock.year !== lastYear) {
        lastYear = s.clock.year;
        record.years.push({
          year: s.clock.year, cash: s.finance.cash, net: weeklyNet(s), enrolled: totalEnrolled(s.students),
          prestige: s.self.reputation, rank: playerRank(s), satisfaction: s.students.satisfaction,
          schools: Object.keys(guided.record.schools).length, programs: 0,
          courses: s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length,
          buildings: Object.keys(s.placements).length, faculty: s.faculty.length, teams: s.orgs.teams.length,
        });
      }
      guided.act(g);
    },
  };
}

const players: Array<{ name: string; make: () => Player & { record: ArchetypeRecord } }> = [
  ...ARCHETYPES.map((name) => ({ name, make: () => createArchetype(name) })),
  { name: 'Guided', make: guidedAsArchetype },
];

const report: Record<string, Summary> = {};
for (const { name, make } of players) {
  const runs: ArchetypeRecord[] = [];
  for (const seed of SEEDS) {
    const player = make();
    playYears(foundGame({ seed }), player, YEARS);
    runs.push(player.record);
  }
  const summary: Summary = {};
  for (const year of AT) {
    for (const figure of FIGURES) {
      const values = runs.map((r) => r.years.find((y) => y.year === year)?.[figure as keyof ArchetypeYear] as number | undefined).filter((v): v is number => v !== undefined);
      if (values.length > 0) summary[`${figure}@${year}`] = median(values);
    }
  }
  summary.weeksInRed = median(runs.map((r) => r.weeksInRed));
  summary.minCash = median(runs.map((r) => r.minCash));
  report[name] = summary;
}

const baseline: Record<string, Summary> | null = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
const show = (figure: Figure | 'weeksInRed' | 'minCash', v: number) => (
  figure === 'cash' || figure === 'minCash' ? `$${(v / 1e6).toFixed(1)}M`
    : figure === 'prestige' || figure === 'satisfaction' ? v.toFixed(1)
      : Math.round(v).toLocaleString());
const change = (name: string, key: string, figure: Figure | 'weeksInRed' | 'minCash', v: number) => {
  const was = baseline?.[name]?.[key];
  if (was === undefined || Math.abs(was - v) < 1e-9) return '';
  const d = v - was;
  return ` (${d > 0 ? '+' : '−'}${show(figure, Math.abs(d))})`;
};

console.log(`The report: ${players.length} players, seeds ${SEEDS.join(', ')}, ${YEARS} years; medians across seeds${baseline ? `, change from ${BASELINE}` : ''}.`);
for (const { name } of players) {
  const summary = report[name];
  console.log(`\n${name}`);
  for (const figure of FIGURES) {
    const cells = AT.map((year) => {
      const key = `${figure}@${year}`;
      const v = summary[key];
      return v === undefined ? `Y${year} -` : `Y${year} ${show(figure, v)}${change(name, key, figure, v)}`;
    });
    console.log(`  ${figure.padEnd(13)} ${cells.join('   ')}`);
  }
  console.log(`  ${'in the red'.padEnd(13)} ${show('weeksInRed', summary.weeksInRed)} weeks${change(name, 'weeksInRed', 'weeksInRed', summary.weeksInRed)}; lowest cash ${show('minCash', summary.minCash)}${change(name, 'minCash', 'minCash', summary.minCash)}`);
}

if (save) {
  writeFileSync(BASELINE, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nWrote ${BASELINE}.`);
}
