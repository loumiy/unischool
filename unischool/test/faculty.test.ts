// ---------------------------------------------------------------------
// Faculty semantics conformance (see README's "Faculty" and the alignment
// roadmap's PR G). The design: faculty are NAMED INDIVIDUALS with LIGHTWEIGHT
// attributes — no life/personality simulation — and retention (tenure) is the
// lever: stats grow toward a rolled ceiling and salary rises with them. These
// checks pin that shape down, and guard that the dead `morale` field stays
// gone (no silently-unread faculty state).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { grownStat, facultySalary } from '../src/data/facultyData';
import type { Faculty } from '../src/state/types';

let seed = 12345;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const s = createInitialState('FacultyAudit', 'private');

// ---- Faculty (and candidates) are individuals ----
function checkIndividuals(people: Faculty[], label: string): void {
  assert(people.length > 0, `${label}: roster/pool is non-empty`);
  const ids = new Set<string>();
  let allNamed = true;
  let allFielded = true;
  for (const f of people) {
    if (!f.id) { ids.add('__missing__'); }
    else ids.add(f.id);
    if (typeof f.name !== 'string' || f.name.length === 0) allNamed = false;
    if (typeof f.field !== 'string' || f.field.length === 0) allFielded = false;
  }
  assert(ids.size === people.length, `${label}: every member has a unique id`);
  assert(allNamed, `${label}: every member has a name`);
  assert(allFielded, `${label}: every member has a field`);
}

checkIndividuals(s.faculty, 'founding roster');
checkIndividuals(s.candidates, 'candidate pool');

// ---- No silently-unread faculty state: `morale` is gone ----
function checkNoMorale(people: Faculty[], label: string): void {
  const hasMorale = people.some((f) => 'morale' in (f as unknown as Record<string, unknown>));
  assert(!hasMorale, `${label}: no member carries the removed \`morale\` field`);
}
checkNoMorale(s.faculty, 'founding roster');
checkNoMorale(s.candidates, 'candidate pool');

// ---- Retention is the lever: stats grow toward potential, salary rises ----

// grownStat approaches the rolled ceiling with tenure and never exceeds it.
assert(grownStat(80, 0) < grownStat(80, 208), 'grownStat: a stat rises with tenure');
assert(grownStat(80, 208) <= 80, 'grownStat: never exceeds the rolled potential');
assert(grownStat(80, 1_000_000) <= 80, 'grownStat: plateaus at (never past) the potential');

// Salary rises with tenure (the seniority premium) and with acclaim (a prize),
// at fixed stats — so a long-retained or honored hire costs more.
assert(facultySalary(72, 65, 0) < facultySalary(72, 65, 208), 'facultySalary: rises with tenure at fixed stats');
assert(facultySalary(72, 65, 100, 0) < facultySalary(72, 65, 100, 2), 'facultySalary: rises with acclaim (a won prize)');
// And with the stats themselves.
assert(facultySalary(60, 60, 100) < facultySalary(90, 90, 100), 'facultySalary: rises with teaching/research');

console.log('faculty-conformance tests');
if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
