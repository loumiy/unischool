// ---------------------------------------------------------------------
// A full residence (Plan 72G, components/residenceFill.ts): the students
// who want a bed, at the housing standard, take beds oldest residence
// first; a residence whose every bed is taken is full and marked. Short of
// beds, every one is; with room, the newest are not; a residence going up
// holds nobody.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { fullResidences } from '../src/components/residenceFill';
import { expectedRatio } from '../src/systems/satisfaction/satisfactionSystem';
import type { GameState } from '../src/state/types';

bindScriptStream(7275);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('full residence tests');

// Three residences standing, opened in years 1, 3 and 5, and one going up.
function college(enrolled: number): GameState {
  const s = createInitialState('Beds');
  const dorms = s.tech.filter((t) => t.kind === 'dorm').slice(0, 4);
  dorms.forEach((t, i) => { t.status = i < 3 ? 'done' : 'developing'; t.builtYear = 1 + 2 * i; });
  const per = enrolled / 4;
  s.students.classes = { freshman: per, sophomore: per, junior: per, senior: per };
  return s;
}

const s0 = college(1000);
const dorms = s0.tech.filter((t) => t.kind === 'dorm').slice(0, 4);
const beds = dorms.map((t) => t.effects?.capacityBonus ?? 0);
const want = (s: GameState, n: number) => n * expectedRatio(s, 'housing');
// Enough students to fill the first two and not the third.
const two = Math.ceil((beds[0] + beds[1] + beds[2] / 2) / expectedRatio(s0, 'housing'));

{
  const s = college(two);
  const full = fullResidences(s);
  assert(full.has(dorms[0].id) && full.has(dorms[1].id), `the two oldest fill first (${Math.round(want(s, two))} want beds; ${beds.slice(0, 3).join(' + ')})`);
  assert(!full.has(dorms[2].id), 'the newest has room');
  assert(!full.has(dorms[3].id), 'a residence going up holds nobody');
}
{
  const s = college(two * 10);
  const full = fullResidences(s);
  assert(dorms.slice(0, 3).every((t) => full.has(t.id)) && !full.has(dorms[3].id), 'short of beds, every standing residence is full');
}
{
  const s = college(0);
  assert(fullResidences(s).size === 0, 'an empty college fills nothing');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
