// ---------------------------------------------------------------------
// The plain-words check (Plan 111 PR G, tools/review/plainChecks.ts): the text
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
import { PLAIN_RULES, TOP_VERB, VOICE_RULES, plainHits, voiceHits, voiceTotals } from '../tools/review/plainChecks';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('text check tests');

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

// ---- The voice's habits are caught (Plan 125 F, docs/design/voice.md) ----
{
  const hit = (text: string, scope: 'all' | 'events' | 'courses', id: string) => voiceHits(text, scope).some((r) => r.id === id);
  assert(hit('Save failed \u2014 this browser is refusing to store the game.', 'all', 'em dash'), 'an em dash');
  assert(hit('Grounds have asked for a second mower.', 'all', 'British usage'), 'an office with a plural verb');
  assert(hit('The returns are good, the leavers are few.', 'all', 'British usage'), 'a British word');
  assert(!hit('Facilities has asked for a second mower.', 'all', 'British usage'), 'an office with a singular verb passes');
  assert(hit('Facilities would like it noted that they said so first.', 'events', 'events: "would like"'), '"would like"');
  assert(hit('The contractor is being very calm about it, which is worse.', 'events', 'events: trailing ", which"'), 'a trailing which');
  assert(hit('The bank has written about the operating account, and the letter runs to a second page.', 'events', 'events: opens "The … has"'), 'the events\' stock opening');
  assert(!hit('Your bank wrote on Tuesday about the operating account, and the letter runs to a second page.', 'events', 'events: opens "The … has"'), 'another opening passes');
  assert(hit('Covers notation, scales, and harmony, the building blocks of Western music.', 'courses', 'courses: built on a list'), 'a course built on a list');
  assert(hit('Gives a robot senses and plans on real hardware.', 'courses', 'courses: "real"'), '"real" as an intensifier');
  const totals = voiceTotals([
    { screen: 'Course descriptions', text: 'Covers one thing.' }, { screen: 'Course descriptions', text: 'Covers another.' },
    { screen: 'Course descriptions', text: 'Builds a third.' }, { screen: 'Names (people, rivals, mascots)', text: 'A \u2014 B' },
  ]);
  assert(totals[TOP_VERB] === 2, 'the most used opening verb is counted');
  assert(totals['em dash'] === 0, 'a name pool is not read');
  assert(VOICE_RULES.length === 7, 'seven voice rules');
}

// ---- The counts do not rise ----
{
  const run = spawnSync('npm', ['run', 'review:plain'], { encoding: 'utf8', cwd: process.cwd() });
  if (run.status !== 0) console.error(run.stdout, run.stderr);
  assert(run.status === 0, 'no count rises past tools/review/plain-baseline.json or voice-baseline.json');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
