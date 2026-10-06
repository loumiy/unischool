// ---------------------------------------------------------------------
// The glossary's last mile (Plan 95J, the second review's B2-5): the string
// table's checks for a bare "slots", "default" and "Spring Term"
// (tools/review/glossaryChecks.ts). Each rule catches the strings the
// review found, as written then, and passes the glossary's own words.
// `npm run review:strings` runs them over every player-facing string.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { glossaryHits } from '../tools/review/glossaryChecks';
import { CHOICE_WORDS } from '../src/data/specializationData';
import { TRAINING_WORDS } from '../src/data/trainingData';
import { DOWNTOWN_WORDS } from '../src/data/downtownData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('glossary checks tests');

const caught = (text: string, word: string) => glossaryHits(text).some((h) => h.rule.word.includes(word));
const clean = (text: string) => glossaryHits(text).length === 0;

// --- what the review found, as it read then -----------------------------
assert(caught('slots', 'slots'), 'the faculty tile\'s bare "slots" is caught');
assert(caught('{held}/{slots} slots', 'slots'), 'and with its figures beside it');
assert(caught('Move {program.name} to {hallDisplayName(s, moveH}, slot {move.slot + 1}: closed for {weeks} weeks', 'numbered'), 'the suggested move\'s "slot 2" is caught');
assert(caught('Nobody answered in time, so it took its default.', 'default'), '"took its default" is caught');
assert(caught('The next is decided in the inbox at the Spring Term\'s fourth week.', 'Spring Term'), '"the Spring Term" is caught');
assert(caught('Wins in the Fall Term count double.', 'Spring Term'), 'and "the Fall Term" with it');

// --- the glossary's own words pass ---------------------------------------
assert(clean('{held}/{slots} course slots'), '"course slots" passes');
assert(clean('Academic halls: six program slots each'), '"program slots" passes');
assert(clean('Move {program.name} to {hall}, program slot {slot + 1}'), '"program slot {n}" passes');
assert(clean('A slot a program leaves there can hold an office.'), 'Founders Hall\'s singular "slot" passes');
assert(clean('It was left unanswered, so it settled the way it does when nobody answers.'), '"left unanswered" passes');
assert(clean('The next is decided in the fourth week of the Spring term.'), '"Spring term" passes');
assert(clean('A spring festival, and a term of spring.'), 'the season and the word "term" pass');
assert(clean('Teaching {held} of the {slots} course slots they supply'), 'a placeholder named "slots" is not read as the word');

// --- the strings this plan rewrote ---------------------------------------
assert(clean(DOWNTOWN_WORDS.hintLast) && clean(DOWNTOWN_WORDS.lastFestival(undefined)), `the downtown's festival line passes (${DOWNTOWN_WORDS.hintLast})`);
// Armed labels follow "Confirm — ‹what is lost›" (the register's R6).
assert(CHOICE_WORDS.confirm.startsWith('Confirm — ') && /for good/.test(CHOICE_WORDS.confirm), `the specialization's armed label says what is lost (${CHOICE_WORDS.confirm})`);
const armed = TRAINING_WORDS.trainArmed('ECON 101');
assert(armed.startsWith('Confirm — ECON 101 '), `training's armed label names the course it costs (${armed})`);

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
