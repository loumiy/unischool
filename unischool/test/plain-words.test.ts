// ---------------------------------------------------------------------
// Plain words (Plan 111 PR G, tools/review/plainChecks.ts): the text
// review's habits, counted on the screens that instruct.
//
// What is pinned: each rule catches the review's own "before" lines and
// lets their rewrites through; and the counts across the game's strings
// do not rise past tools/review/plain-baseline.json. A rise means new text
// slipped back into the old habits: rewrite it, or save a new baseline if
// the rise is deliberate (`npm run review:plain -- --plain-save`).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { spawnSync } from 'node:child_process';
import { PLAIN_RULES, plainHits } from '../tools/review/plainChecks';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('plain words tests');

const breaks = (text: string, id: string) => plainHits(text).some((h) => h.rule.id === id);
const clean = (text: string) => plainHits(text).length === 0;

// ---- The review's before lines are caught ----
{
  assert(breaks('The board suggests a standing sweep: keep half a year of expenses on hand and move the rest into the endowment each quarter.', 'mid-sentence colon'), 'the sweep letter\'s colon reveal');
  assert(breaks('History shows prestige\'s target and what makes up each pillar; the readout above gives each pillar\'s points now.', 'semicolon'), 'a semicolon');
  assert(breaks('History shows prestige\'s target and what makes up each pillar, and the readout above gives each pillar\'s points now.', 'possessive chain'), 'a possessive chain');
  assert(breaks('Her proposal is a reserve, so that the next bad year is an inconvenience rather than an event.', 'see-saw'), 'a see-saw');
  assert(breaks('Research is commissioned there.', 'passive, no one doing it'), 'a passive with nobody doing it');
  assert(breaks('A facility serves a fixed number of students, and each need grows with enrollment, so a bigger class raises the bar for campus life, beds or no beds, and every bed widens the pool.', 'long sentence'), 'a long sentence');
}

// ---- Their rewrites pass ----
{
  for (const text of [
    "You've had more than a year's expenses sitting in cash for a year now.",
    'The board suggests an automatic sweep. Every quarter, keep six months of expenses in cash and move the rest into the endowment.',
    "Prestige is your college's reputation. Satisfaction is how happy your students are.",
    'Elm Hall now belongs to Social Sciences. Its empty slots offer only Social Sciences programs until you\'ve founded them all.',
    'Tuition: the slider shows whether a price fits your college\'s standing.',
    'Cost: $2.5M',
  ]) assert(clean(text), `a plain line passes (${text}): ${plainHits(text).map((h) => h.rule.id).join(', ')}`);
  assert(PLAIN_RULES.length === 6, 'six rules');
}

// ---- The counts do not rise ----
{
  const run = spawnSync('npm', ['run', 'review:plain'], { encoding: 'utf8', cwd: process.cwd() });
  if (run.status !== 0) console.error(run.stdout, run.stderr);
  assert(run.status === 0, 'no plain-words count rises past tools/review/plain-baseline.json');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
