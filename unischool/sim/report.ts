// ---------------------------------------------------------------------
// The report (Plan 63, the rebuild's fourth layer): where the numbers sit.
// Plays the four archetypes (sim/harness/archetypes.ts), the guided player
// (sim/harness/guided.ts) and its specialized variants (Plan 85I, below)
// for fifty years on three seeds and prints their trajectories — the median
// across seeds at years 10, 25 and 50 — with the change from the committed
// baseline (sim/baseline.json), which is main's numbers once a branch that
// moved them lands. Each run's specialization (Plan 85D: which pillar the
// player chose at the milestone, by its rule, and the year), when it first
// stood in the top 20, the top 10 and first, and its own pillar's margin
// over the next school are printed under its player, not diffed.
//
// The specialized variants (Plan 85I) are the guided player with a fixed
// pick at the milestone (harness/specialization.ts, Plan 85D's hook): one
// per pillar, and one that never specializes, to measure what a college
// reaches without one. Everything but the pick is the guided player's own.
//
//   npm run sim                         the report, diffed against the baseline
//   npm run sim -- --save               and write this run as the new baseline
//   npm run sim -- --players "^Guided,"  only the players whose names match
//                                        (a regular expression; never saved)
//   npm run sim -- --seeds 1,2,3,4,5    other seeds (never saved)
//   npm run sim -- --from-runs --save   the last run's rows, read back and
//                                        saved without playing again (Plan
//                                        95: a full run takes an hour on a
//                                        busy machine)
//
// Each run is a process of its own (the harness binds one random stream per
// process), as many at once as the machine has cores (SIM_JOBS to change
// it). Every run's rows land in node_modules/.tmp/report-runs.json.
//
// Measures, never fails: the checks are test/archetypes.test.ts and
// test/guided.test.ts. Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { foundGame, playYears, type Player } from './harness/game';
import { ARCHETYPES, createArchetype, type ArchetypeRecord, type ArchetypeYear } from './harness/archetypes';
import { createGuidedPlayer } from './harness/guided';
import type { SpecializationRule } from './harness/specialization';
import { weeklyNet } from '../src/systems/finance/financeSystem';
import { pillarColumns, playerRank, rankBy, rankedListBy, type StandingAxis } from '../src/systems/rivals/rivalsSystem';
import { PILLARS, PILLAR_LABELS, endowmentScore, pillarValue, specializationOf } from '../src/systems/prestige/prestigeSystem';
import { specializationTerm } from '../src/data/specializationData';
import type { GameState, Pillar } from '../src/state/types';
import { totalEnrolled } from '../src/state/types';
import { OFFICE_MILESTONES } from '../src/data/ladderData';
import { FOUNDERS_HALL_ID } from '../src/data/techData';

const argv = process.argv.slice(2);
const arg = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

const SEEDS = arg('--seeds')?.split(',').map(Number) ?? [12345, 4242, 777];
const YEARS = 50;
const AT = [10, 25, 50];
const BASELINE = 'sim/baseline.json';
const RUNS_OUT = 'node_modules/.tmp/report-runs.json';

// The figures reported, each read off a year's row: the archetypes' own,
// and (Plan 85I) the college's rank in each pillar's standings.
const FIGURES = [
  'rank', 'prestige', 'enrolled', 'cash', 'satisfaction', 'courses', 'schools', 'teams',
  'academicsRank', 'researchRank', 'studentLifeRank', 'athleticsRank',
] as const;
type Figure = (typeof FIGURES)[number];
type Summary = Record<string, number>;   // `${figure}@${year}` and the run-wide figures

// The pillars' standings, by the axis each ranks on.
const PILLAR_AXES: Readonly<Record<Pillar, StandingAxis>> = {
  academics: 'academics', research: 'researchStanding', studentLife: 'socialStanding', athletics: 'athleticStrength',
};

// What the report reads off a year beyond the archetypes' row (Plan 85I).
export interface PillarYear {
  year: number;
  // The college's rank in each pillar, and its value on the prestige scale
  // with the best other school's (pillarColumns: the guide's columns).
  ranks: Record<Pillar, number>;
  values: Record<Pillar, number>;
  bestOther: Record<Pillar, number>;
  // Each pillar's value as prestige reads it (pillarValue): for research and
  // student life the stocks above drift toward these.
  targets: Record<Pillar, number>;
  // The best other school's prestige; its specialization's term, 0 to 1
  // (0 without one); the endowment's share of its 8 points; the titles won.
  leader: number;
  term: number;
  endowment: number;
  titles: number;
}

function pillarYear(s: GameState): PillarYear {
  const columns = pillarColumns(s);
  const mine = columns.get('self')!;
  const others = [...columns].filter(([key]) => key !== 'self').map(([, v]) => v);
  const ranks = {} as Record<Pillar, number>;
  const values = {} as Record<Pillar, number>;
  const bestOther = {} as Record<Pillar, number>;
  const targets = {} as Record<Pillar, number>;
  PILLARS.forEach((p, i) => {
    ranks[p] = rankBy(s, PILLAR_AXES[p]);
    values[p] = mine[i];
    bestOther[p] = Math.max(...others.map((v) => v[i]));
    targets[p] = pillarValue(s, p);
  });
  const chosen = specializationOf(s);
  return {
    year: s.clock.year, ranks, values, bestOther, targets,
    leader: rankedListBy(s, 'reputation').find((e) => !e.isPlayer)!.value,
    term: chosen ? specializationTerm(s, chosen).score : 0,
    endowment: endowmentScore(s),
    titles: s.orgs.titles.length,
  };
}

// One run's record: the archetypes' rows, the pillars' and the pick.
export interface RunRecord {
  player: string;
  seed: number;
  record: ArchetypeRecord;
  pillars: PillarYear[];
  pick: Pillar | null;
  pickYear: number | null;
  // The office milestones' years (Plan 89G), by id, and the offices held
  // at the end, each with the year it opened.
  officeMilestones?: Record<string, number>;
  offices?: Array<{ id: string; year: number }>;
  seconds: number;
}

// The guided player records its own rows; the report reads the same few
// figures off the state each year, as an archetype does.
function guidedAsArchetype(name: string, specialization?: SpecializationRule): Player & { record: ArchetypeRecord } {
  const guided = createGuidedPlayer();
  const record: ArchetypeRecord = { years: [], weeksInRed: 0, minCash: Infinity };
  let lastYear = 0;
  return {
    name,
    record,
    specialization,
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

// The specialized variants (Plan 85I): the guided player held to each pillar,
// and to none.
const VARIANTS: ReadonlyArray<[string, SpecializationRule]> = [
  ['Guided, academics', 'academics'],
  ['Guided, research', 'research'],
  ['Guided, student life', 'studentLife'],
  ['Guided, athletics', 'athletics'],
  ['Guided, unspecialized', 'never'],
];

const ALL_PLAYERS: Array<{ name: string; make: () => Player & { record: ArchetypeRecord } }> = [
  ...ARCHETYPES.map((name) => ({ name, make: () => createArchetype(name) })),
  { name: 'Guided', make: () => guidedAsArchetype('Guided') },
  ...VARIANTS.map(([name, rule]) => ({ name, make: () => guidedAsArchetype(name, rule) })),
];

// One run, in this process.
function playRun(name: string, seed: number): RunRecord {
  const entry = ALL_PLAYERS.find((p) => p.name === name);
  if (!entry) throw new Error(`no player "${name}"`);
  const t0 = Date.now();
  const player = entry.make();
  const pillars: PillarYear[] = [];
  const act = player.act.bind(player);
  let lastYear = 0;
  // The pillars, read at the moment the player's own row is: the top of
  // the year's first week, before it acts.
  player.act = (g) => {
    if (g.s.clock.year !== lastYear) {
      lastYear = g.s.clock.year;
      pillars.push(pillarYear(g.s));
    }
    act(g);
  };
  const g = foundGame({ seed });
  playYears(g, player, YEARS);
  return {
    player: name, seed, record: player.record, pillars,
    pick: specializationOf(g.s), pickYear: g.s.specializationYear ?? null,
    officeMilestones: Object.fromEntries(OFFICE_MILESTONES.filter((m) => g.s.ladder.reached[m.id] !== undefined).map((m) => [m.id, g.s.ladder.reached[m.id]])),
    offices: (g.s.halls[FOUNDERS_HALL_ID] ?? []).flatMap((slot) => (slot.office ? [{ id: slot.office.id, year: slot.office.openedYear }] : [])),
    seconds: (Date.now() - t0) / 1000,
  };
}

// Every run, a process each, as many at once as there are cores.
async function playAll(names: string[]): Promise<RunRecord[]> {
  const jobs = names.flatMap((name) => SEEDS.map((seed) => ({ name, seed })));
  const results = new Map<string, RunRecord>();
  const jobsAtOnce = Math.max(1, Math.min(Number(process.env.SIM_JOBS) || availableParallelism(), jobs.length));
  const run = (job: (typeof jobs)[number]) => new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [process.argv[1], '--run', job.name, String(job.seed)], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`${job.name} on seed ${job.seed} failed (exit ${code})`));
      else { results.set(`${job.name}@${job.seed}`, JSON.parse(out) as RunRecord); resolve(); }
    });
  });
  const queue = [...jobs];
  await Promise.all(Array.from({ length: jobsAtOnce }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await run(job);
  }));
  return jobs.map((j) => results.get(`${j.name}@${j.seed}`)!);
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];

function figureOf(run: RunRecord, figure: Figure, year: number): number | undefined {
  if (figure !== 'rank' && figure.endsWith('Rank')) {
    return run.pillars.find((y) => y.year === year)?.ranks[figure.slice(0, -4) as Pillar];
  }
  return run.record.years.find((y) => y.year === year)?.[figure as keyof ArchetypeYear] as number | undefined;
}

function summarize(runs: RunRecord[]): Summary {
  const summary: Summary = {};
  for (const year of AT) {
    for (const figure of FIGURES) {
      const values = runs.map((r) => figureOf(r, figure, year)).filter((v): v is number => v !== undefined);
      if (values.length > 0) summary[`${figure}@${year}`] = median(values);
    }
  }
  summary.weeksInRed = median(runs.map((r) => r.record.weeksInRed));
  summary.minCash = median(runs.map((r) => r.record.minCash));
  return summary;
}

// The first year (its first week) the college stood at `place` or better.
const firstAt = (run: RunRecord, place: number) => run.record.years.find((y) => y.rank <= place)?.year;
const bestRank = (run: RunRecord) => Math.min(...run.record.years.map((y) => y.rank));
const reached = (run: RunRecord, place: number) => {
  const year = firstAt(run, place);
  return year !== undefined ? `Y${year}` : place === 1 ? `never, best ${bestRank(run)}` : 'never';
};

// Its own pillar at year 50 against the best other school (Plan 85I's "a
// clear margin"); without a specialization, its best-ranked pillar.
function ownPillar(run: RunRecord): string {
  const y50 = run.pillars.find((y) => y.year === YEARS);
  if (!y50) return '-';
  const p = run.pick ?? [...PILLARS].sort((a, b) => y50.ranks[a] - y50.ranks[b])[0];
  const margin = y50.values[p] - y50.bestOther[p];
  return `${PILLAR_LABELS[p].toLowerCase()} #${y50.ranks[p]} at ${y50.values[p].toFixed(1)}, ${margin >= 0 ? 'ahead by' : 'behind by'} ${Math.abs(margin).toFixed(1)}`;
}

async function main(): Promise<void> {
  const only = arg('--players');
  const players = only !== undefined ? ALL_PLAYERS.filter((p) => new RegExp(only, 'i').test(p.name)) : ALL_PLAYERS;
  const partial = only !== undefined || arg('--seeds') !== undefined;
  const save = argv.includes('--save');
  if (save && partial) throw new Error('--save writes the whole report: drop --players and --seeds');

  const t0 = Date.now();
  const fromRuns = argv.includes('--from-runs');
  if (fromRuns && partial) throw new Error('--from-runs reads the whole last run: drop --players and --seeds');
  const runs: RunRecord[] = fromRuns ? JSON.parse(readFileSync(RUNS_OUT, 'utf8')) : await playAll(players.map((p) => p.name));
  mkdirSync('node_modules/.tmp', { recursive: true });
  if (!fromRuns) writeFileSync(RUNS_OUT, JSON.stringify(runs));
  const report: Record<string, Summary> = {};
  for (const { name } of players) report[name] = summarize(runs.filter((r) => r.player === name));

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
    const mine = runs.filter((r) => r.player === name);
    const perSeed = (f: (r: RunRecord) => string) => mine.map((r) => `${f(r)} on seed ${r.seed}`).join('; ');
    console.log(`\n${name}`);
    for (const figure of FIGURES) {
      const cells = AT.map((year) => {
        const key = `${figure}@${year}`;
        const v = summary[key];
        return v === undefined ? `Y${year} -` : `Y${year} ${show(figure, v)}${change(name, key, figure, v)}`;
      });
      console.log(`  ${figure.padEnd(15)} ${cells.join('   ')}`);
    }
    console.log(`  ${'in the red'.padEnd(15)} ${show('weeksInRed', summary.weeksInRed)} weeks${change(name, 'weeksInRed', 'weeksInRed', summary.weeksInRed)}; lowest cash ${show('minCash', summary.minCash)}${change(name, 'minCash', 'minCash', summary.minCash)}`);
    console.log(`  ${'specialized'.padEnd(15)} ${perSeed((r) => (r.pick ? `${PILLAR_LABELS[r.pick].toLowerCase()} in Y${r.pickYear}` : 'none'))}`);
    console.log(`  ${'first reached'.padEnd(15)} top 20 ${mine.map((r) => reached(r, 20)).join(', ')}; top 10 ${mine.map((r) => reached(r, 10)).join(', ')}; first ${mine.map((r) => reached(r, 1)).join('; ')}`);
    console.log(`  ${'own pillar Y50'.padEnd(15)} ${perSeed(ownPillar)}`);
    // The office milestones' years, and the offices held at the end (Plan 89G).
    console.log(`  ${'office rungs'.padEnd(15)} ${perSeed((r) => OFFICE_MILESTONES.map((m) => (r.officeMilestones?.[m.id] !== undefined ? `Y${r.officeMilestones[m.id]}` : '—')).join(' '))}`);
    console.log(`  ${'offices Y50'.padEnd(15)} ${perSeed((r) => (r.offices?.length ? r.offices.map((o) => `${o.id} Y${o.year}`).join(', ') : 'none'))}`);
  }
  console.log(`\n${runs.length} runs in ${((Date.now() - t0) / 60000).toFixed(1)} min; every run's rows are in ${RUNS_OUT}.`);

  if (save) {
    writeFileSync(BASELINE, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nWrote ${BASELINE}.`);
  }
}

if (argv[0] === '--run') {
  process.stdout.write(JSON.stringify(playRun(argv[1], Number(argv[2]))));
} else {
  await main();
}
