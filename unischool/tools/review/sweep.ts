// ---------------------------------------------------------------------
// THE BUG SWEEP (Plan 73, area 7). Plays harness games over many seeds,
// players and college names, odd names included, and checks two things
// the tests check over fewer:
//   - the invariants (sim/harness/invariants.ts) after every week;
//   - a save round trip at the start of every year: the state written as
//     the browser writes it, read back through the whole load path
//     (persistence.ts's readSave: parse, migrate, sanitize), must come
//     back as it went in, and pass the invariants itself.
// A run that throws is reported with the week it threw in.
//
//   npm run review:sweep -- --players Natural,Completionist --seeds 1-10 --years 50
//   npm run review:sweep -- --names "X,O'Brien College" --seeds 7 --years 20
//
// Prints one line a run and a summary; exits non-zero if anything broke.
// ---------------------------------------------------------------------
import { foundGame, playWeek } from '../../sim/harness/game';
import { playerNamed } from '../../sim/harness/archetypes';
import { brokenRules } from '../../sim/harness/invariants';
import { SAVE_VERSION, readSave } from '../../src/state/persistence';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};
const range = (spec: string): number[] => spec.split(',').flatMap((part) => {
  const [a, b] = part.split('-').map(Number);
  return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, k) => a + k);
});
const players = flag('players', 'Natural,Guided,Completionist,Selective,Lean,Idle').split(',');
const seeds = range(flag('seeds', '1-5'));
// Odd names by default: one letter, an apostrophe, an ampersand and a
// ligature, non-Latin scripts, and one far longer than the field expects.
const names = flag('names', `X|O'Brien College|Ælfric & Sons|北京大学|جامعة النور|${'Longname'.repeat(8)}`).split(flag('sep', '|'));
const years = Number(flag('years', '30'));

// The first path at which two JSON values differ, for a round trip that
// did not come back whole.
function firstDifference(a: unknown, b: unknown, path = 's'): string | null {
  if (Object.is(a, b)) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: ${JSON.stringify(a)?.slice(0, 60)} → ${JSON.stringify(b)?.slice(0, 60)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array against object`;
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  for (const k of keys) {
    const d = firstDifference((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

let failures = 0;
let runs = 0;
for (const who of players) {
  for (const seed of seeds) {
    const name = names[(seed + players.indexOf(who)) % names.length];
    const player = playerNamed(who);
    if (!player) throw new Error(`no player ${who}`);
    const problems: string[] = [];
    const t0 = Date.now();
    let lastYear = 0;
    try {
      const g = foundGame({ seed, name });
      while (g.s.clock.year <= years && problems.length < 5) {
        playWeek(g, player);
        for (const rule of brokenRules(g.s)) problems.push(`y${g.s.clock.year}w${g.s.clock.week} invariant: ${rule}`);
        if (g.s.clock.year !== lastYear) {
          lastYear = g.s.clock.year;
          const before = JSON.parse(JSON.stringify(g.s));
          const read = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: g.s }));
          if ('refused' in read) problems.push(`y${lastYear} save refused: ${read.refused}`);
          else {
            const diff = firstDifference(before, JSON.parse(JSON.stringify(read.state)));
            if (diff) problems.push(`y${lastYear} round trip changed ${diff}`);
            for (const rule of brokenRules(read.state)) problems.push(`y${lastYear} after reload, invariant: ${rule}`);
          }
        }
      }
    } catch (e) {
      problems.push(`threw in year ${lastYear}: ${String(e).split('\n')[0]}`);
    }
    runs += 1;
    if (problems.length) failures += 1;
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${who} seed ${seed} "${name.slice(0, 24)}" ${Math.round((Date.now() - t0) / 1000)}s${problems.length ? `\n  ${[...new Set(problems)].slice(0, 5).join('\n  ')}` : ''}`);
  }
}
console.log(`${runs} runs, ${failures} with problems`);
process.exit(failures ? 1 : 0);
