// ---------------------------------------------------------------------
// The guided player's report (Plan 58): how the intended line of play goes
// for a player who does only what the game tells it, across the seeds and
// names the harness judges, and the numbers the owner could hold it to.
// Measures, never fails: the checks are test/guided.test.ts.
//
//   npm run guided                  three seeds and two names, fifty years
//   npm run guided -- 30            thirty years
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { foundGame, playYears } from './harness/game';
import { createGuidedPlayer, type GuidedRecord } from './harness/guided';
import { OPENING_LETTERS } from '../src/data/eventData';

const years = Number(process.argv[2] ?? 50);
const RUNS = [{ seed: 12345 }, { seed: 4242 }, { seed: 777 }, { seed: 12345, name: 'Harrow College' }, { seed: 12345, name: 'Test' }];

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
const worst = (xs: number[]) => Math.max(...xs);
const at = (r: GuidedRecord, year: number) => r.years.find((y) => y.year === year);
const fmt = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? 'never' : `Y${n}`);

const records: Array<{ label: string; r: GuidedRecord }> = [];
for (const run of RUNS) {
  const label = run.name ? `"${run.name}"` : `seed ${run.seed}`;
  const player = createGuidedPlayer();
  playYears(foundGame(run), player, years);
  const r = player.record;
  records.push({ label, r });
  const lettersDone = Math.max(...Object.values(r.done).map(([y]) => y));
  const schools = Object.values(r.schools);
  const firstOne = r.years.find((y) => y.rank === 1)?.year;
  console.log(`\n${label}`);
  console.log(`  letters: ${Object.keys(r.done).length} of ${OPENING_LETTERS.length} asks done, the last in ${fmt(lettersDone)}`);
  console.log(`  schools: ${schools.length} founded, the last in ${fmt(schools.length ? Math.max(...schools) : null)}; Founders Hall empty ${fmt(r.foundersEmpty)}`);
  console.log(`  first #1 ${fmt(firstOne)}; rank ${[10, 20, 35, years].map((y) => `Y${y} #${at(r, y)?.rank ?? '-'}`).join(', ')}`);
  console.log(`  students ${[10, 20, 35, years].map((y) => `Y${y} ${at(r, y)?.enrolled.toLocaleString() ?? '-'}`).join(', ')}`);
  console.log(`  the line: ${Object.entries(r.asked).map(([k, n]) => `${k} ${r.carried[k] ?? 0}/${n}`).join(', ')} (carried/asked weeks); silent ${r.quiet}, saving ${r.saving}`);
}

const pick = (f: (r: GuidedRecord) => number) => records.map(({ r }) => f(r));
const lastLetter = pick((r) => Math.max(...Object.values(r.done).map(([y]) => y)));
const allSchools = pick((r) => (Object.keys(r.schools).length === 7 ? Math.max(...Object.values(r.schools)) : Infinity));
const empty = pick((r) => r.foundersEmpty ?? Infinity);
const firstOne = pick((r) => r.years.find((y) => y.rank === 1)?.year ?? Infinity);

console.log(`\nAcross ${records.length} runs (median, worst):`);
console.log(`  every letter's ask done       ${fmt(median(lastLetter))}, ${fmt(worst(lastLetter))}`);
console.log(`  all seven schools founded     ${fmt(median(allSchools))}, ${fmt(worst(allSchools))}`);
console.log(`  Founders Hall empty           ${fmt(median(empty))}, ${fmt(worst(empty))}`);
console.log(`  first #1                      ${fmt(median(firstOne))}, ${fmt(worst(firstOne))}`);
console.log('\nA number held as a check should sit past the worst run with room: the worst plus about half again.');
