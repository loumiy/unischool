// ---------------------------------------------------------------------
// Words that don't repeat (Plan 70I): the second and third tellings of the
// short-cooldown catalogue events (data/eventVariants.ts), the game results
// and completions (data/logWords.ts), and the founding years' notes
// (data/foundingNotes.ts). Every telling names the same placeholders as its
// first, none is empty or a copy of another, and the picks never repeat the
// telling before.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { EVENT_VARIANTS } from '../src/data/eventVariants';
import { COMPLETION_LINES, GAME_LINES, pickLine } from '../src/data/logWords';
import { FOUNDING_NOTES } from '../src/data/foundingNotes';
import { eventTexts, pickTelling } from '../src/systems/events/catalogue';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const holes = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(',');

function sameShape(group: readonly string[], what: string): void {
  assert(group.length === 3, `${what}: three tellings`);
  assert(group.every((t) => t.trim().length > 10), `${what}: none empty`);
  assert(new Set(group).size === group.length, `${what}: none a copy of another`);
  assert(group.every((t) => holes(t) === holes(group[0])), `${what}: every telling names the same placeholders (${group.map(holes).join(' / ')})`);
}

// ---- The catalogue ----
{
  const short = EVENT_CATALOGUE.filter((e) => e.cooldownYears <= 5);
  assert(short.length > 0, 'there are short-cooldown events');
  for (const e of short) sameShape(eventTexts(e), e.id);
  const known = new Set(EVENT_CATALOGUE.map((e) => e.id));
  assert(Object.keys(EVENT_VARIANTS).every((id) => known.has(id)), 'every variant belongs to an event in the catalogue');
  // The pick: a hash, never the one before.
  const e = short[0];
  let last: number | undefined;
  const seen = new Set<number>();
  for (let year = 1; year <= 50; year += 1) {
    const i = pickTelling(e, year, last);
    assert(i !== last, `${e.id}: year ${year} does not repeat the telling before`);
    assert(pickTelling(e, year, last) === i, `${e.id}: the pick is the same every time it is asked`);
    seen.add(i);
    last = i;
  }
  assert(seen.size === 3, 'over fifty firings, all three tellings are read');
}

// ---- Games and completions ----
{
  for (const [occasion, outcomes] of Object.entries(GAME_LINES)) {
    for (const [outcome, lines] of Object.entries(outcomes)) sameShape(lines, `${occasion} ${outcome}`);
  }
  for (const [kind, lines] of Object.entries(COMPLETION_LINES)) sameShape(lines, `${kind} completion`);
  let last = -1;
  for (let year = 1; year <= 50; year += 1) {
    const i = pickLine('team-1:rivalry:won', year, 3);
    assert(i !== last, `a result's telling never repeats the year before's (year ${year})`);
    last = i;
  }
}

// ---- The founding years' notes ----
{
  assert(holes(FOUNDING_NOTES.firstProgram.text) === 'program', 'the first program\'s note names the program');
  assert(holes(FOUNDING_NOTES.firstResidence.text) === 'dorm', 'the first residence\'s note names the residence');
}

console.log(`content variants: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
