// ---------------------------------------------------------------------
// The pillar rule, said once (Plan 95E, the second review's B2-4,
// src/data/prestigeWords.ts): every sentence that states the four pillars'
// weights or their specialization shares is built from prestigeSystem.ts's
// PILLAR_WEIGHTS and SPECIALIZATION_TERM_WEIGHTS, and no file in src/ but
// prestigeSystem.ts types the weights by hand, so a retune cannot leave a
// stale figure behind. A pillar's part is a "share" in the player's words.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pct } from '../src/format';
import { PILLARS, PILLAR_LABELS, PILLAR_WEIGHTS, SPECIALIZATION_TERM_WEIGHTS } from '../src/systems/prestige/prestigeSystem';
import { pillarRule, pillarShareRule, pillarWeightsWords, pillarWorthWords, specializationOfferRule, specializationShareWorth } from '../src/data/prestigeWords';
import { specializationStatus } from '../src/data/specializationData';
import { FIGURE_HINTS } from '../src/data/figureHints';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('pillar rule tests');

// ---- The rule reads the weights ----
{
  const words = pillarWeightsWords();
  for (const p of PILLARS) {
    assert(words.includes(`${PILLAR_LABELS[p].toLowerCase()} ${pct(PILLAR_WEIGHTS[p])}`), `the blend names ${p} at its weight ("${words}")`);
    assert(Math.abs(specializationShareWorth(p) - SPECIALIZATION_TERM_WEIGHTS[p] * PILLAR_WEIGHTS[p]) < 1e-9, `${p}'s share is its points of the pillar at the pillar's weight`);
  }
  const share = pillarShareRule();
  assert(/^Each pillar holds a share only its own specialization fills/.test(share) && share.endsWith('.'), `the share rule is one sentence ("${share}")`);
  assert(!/\bterm\b/.test(share) && !/\bterm\b/.test(pillarRule()), 'and says "share", never "term"');
  assert(pillarRule().includes(words) && pillarRule().includes(share), 'the whole rule is the blend and the shares');
  // One pillar at its weight, for the lab's build tile (Plan 95Q, B3-7).
  assert(pillarWorthWords('research') === `research, ${pct(PILLAR_WEIGHTS.research)} of prestige`, `one pillar reads its weight ("${pillarWorthWords('research')}")`);
}

// ---- The hints say what the guide ranks by (B2-2) ----
{
  const rank = FIGURE_HINTS.rank(100);
  assert(rank.startsWith('Of 100 colleges, by prestige') && !rank.includes('academic ranking'), `the Rank hint ranks by prestige ("${rank}")`);
  assert(FIGURE_HINTS.prestige.includes(pillarWeightsWords()), `the Prestige hint names the four pillars at their weights ("${FIGURE_HINTS.prestige}")`);
}

// ---- The status line says "share" ----
{
  const lines = [
    specializationStatus('academics', 30, false, specializationOfferRule(), 150),
    specializationStatus(null, undefined, true, specializationOfferRule(), 150),
    specializationStatus(null, undefined, false, specializationOfferRule(), 150),
  ];
  for (const line of lines) assert(!/\bterm\b/.test(line), `the status line says "share" ("${line}")`);
}

// ---- No file types the weights by hand ----
// Every source file under src/ but prestigeSystem.ts, where the weights are
// set. A pillar named beside its weight ("academics 35%") and the weights
// in a row ("35%, 25%, 25% and 15%") are both caught.
const SRC = join(process.cwd(), 'src');
const HOME = 'systems/prestige/prestigeSystem.ts';
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.tsx?$/.test(e.name) ? [path] : [];
  });
}
const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RULES: RegExp[] = [
  ...PILLARS.map((p) => new RegExp(`\\b${escape(PILLAR_LABELS[p].toLowerCase())}\\W{0,3}${escape(pct(PILLAR_WEIGHTS[p]))}`, 'i')),
  new RegExp(PILLARS.map((p) => escape(pct(PILLAR_WEIGHTS[p]))).join('\\W{1,3}(?:and\\s+)?')),
];
{
  // Each rule catches what it is for, so the scan cannot go quiet.
  const typed = `${PILLARS.map((p) => `${PILLAR_LABELS[p].toLowerCase()} ${pct(PILLAR_WEIGHTS[p])}`).join(', ')}`;
  const bare = `${PILLARS.slice(0, -1).map((p) => pct(PILLAR_WEIGHTS[p])).join(', ')} and ${pct(PILLAR_WEIGHTS[PILLARS[PILLARS.length - 1]])}`;
  assert(RULES.slice(0, -1).every((re) => re.test(typed)), `the pillar rules catch "${typed}"`);
  assert(RULES[RULES.length - 1].test(bare), `the row rule catches "${bare}"`);
  const files = sources(SRC);
  assert(files.length > 100 && files.some((f) => relative(SRC, f) === HOME), `the scan reads src/ (${files.length} files)`);
  const typedByHand: string[] = [];
  for (const file of files) {
    const rel = relative(SRC, file);
    if (rel === HOME) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (RULES.some((re) => re.test(line))) typedByHand.push(`${rel}:${i + 1} ("${line.trim().slice(0, 80)}")`);
    });
  }
  assert(typedByHand.length === 0, `no file types the pillar weights by hand; build them with prestigeWords.ts:\n    ${typedByHand.join('\n    ')}`);
  // When the choice is offered (Plan 95R): the two routes are said in
  // prestigeWords.ts alone, so no string keeps one route's old figure.
  const offerByHand = files.filter((f) => relative(SRC, f) !== 'data/prestigeWords.ts' && /stands in the guide's top \$\{/.test(readFileSync(f, 'utf8')));
  assert(offerByHand.length === 0, `no file says when the choice is offered by hand; use specializationOfferRule: ${offerByHand.map((f) => relative(SRC, f)).join(', ')}`);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
