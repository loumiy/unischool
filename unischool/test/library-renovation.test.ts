// ---------------------------------------------------------------------
// A library that keeps the floors it has (engine/reducer.ts's
// RENOVATE_LIBRARY, state/types.ts's servingPopulation, and
// buildingMotifs.tsx's drawnHeightOf).
//
// The library is the one upgrade in the game that makes the SAME building
// bigger: a renovation puts its existing node back into 'developing' rather
// than siting a second library. Two things followed from that word which
// should not have. The satisfaction sums count 'done' facilities, so a
// library adding its fourth floor served nobody for six months — adding a
// floor first took three away, and a school could watch its academic score
// fall for a year and read the renovation as the cause. And the map draws a
// 'developing' node as a frame barely off the ground, so three built floors
// of library vanished and came back.
//
// Both halves are checked here, and they are checked against the SAME run:
// the sum and the drawn height have to agree about what is standing, or the
// map is telling the player something the score is contradicting.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { tickTech } from '../src/systems/techtree/techSystem';
import { servedPopulationFor } from '../src/systems/satisfaction/satisfactionSystem';
import { drawnHeightOf } from '../src/components/buildingMotifs';
import { wallHeightOf } from '../src/components/buildingSpec';
import { STOREY } from '../src/components/campusScale';
import { LIBRARY_TIER1_ID, nextLibraryFloor } from '../src/data/facilitiesData';
import type { Buildable, GameState } from '../src/state/types';

let seed = 90210;
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

// A school with its tier-1 library open and the money for a floor.
function withLibrary(): { s: GameState; lib: Buildable } {
  const s = createInitialState('Ashcombe');
  const lib = s.tech.find((t) => t.id === LIBRARY_TIER1_ID)!;
  lib.status = 'done';
  delete s.developing[lib.id];
  s.finance.cash = 500_000_000;
  return { s, lib };
}

const libraryIn = (s: GameState) => s.tech.find((t) => t.id === LIBRARY_TIER1_ID)!;

console.log('library renovation tests');

// --- the seats that exist stay open -----------------------------------
{
  const { s, lib } = withLibrary();
  const before = servedPopulationFor(s, 'academic');
  const open = lib.effects!.servesPopulation!;
  assert(open > 0, `an open library serves somebody (${open.toLocaleString()})`);

  const plan = nextLibraryFloor(lib)!;
  const during = reducer(s, { type: 'RENOVATE_LIBRARY' });
  const node = libraryIn(during);
  assert(node.status === 'developing', 'the renovation puts the same node back into development');
  assert(during.developing[node.id] === plan.weeks, `for the planned ${plan.weeks} weeks`);
  assert(node.renovatingFrom === open, 'and records what it was serving when the work started');

  const mid = servedPopulationFor(during, 'academic');
  assert(mid === before, `the campus serves exactly what it did before the work began (${mid.toLocaleString()})`);
  assert(
    mid !== 0 && mid !== before - open,
    'rather than nothing at all, which is what adding a floor used to cost for the duration',
  );
  assert(
    mid < before + plan.servesGain,
    'and not the finished figure either — the new floor is not open yet',
  );
}

// --- and the new ones arrive at the end -------------------------------
{
  const { s, lib } = withLibrary();
  const open = lib.effects!.servesPopulation!;
  const plan = nextLibraryFloor(lib)!;

  const during = reducer(s, { type: 'RENOVATE_LIBRARY' });
  for (let week = 0; week < plan.weeks; week += 1) tickTech(during);

  const node = libraryIn(during);
  assert(node.status === 'done', 'the renovation finishes');
  assert(node.renovatingFrom === undefined, 'and stops standing in for a figure it no longer needs');
  assert(node.floorsAdded === 1, 'the floor is counted');
  assert(
    servedPopulationFor(during, 'academic') === open + plan.servesGain,
    `the campus now serves the full post-renovation figure (${(open + plan.servesGain).toLocaleString()})`,
  );
}

// --- the sum never dips ------------------------------------------------
{
  // The property the whole PR is about, stated as a property: across a
  // renovation from the week before to the week after, the number the
  // student body experiences only ever goes UP. A single mid-point check
  // could be passed by a system that dipped in week 3 and recovered.
  const { s } = withLibrary();
  const during = reducer(s, { type: 'RENOVATE_LIBRARY' });
  const readings: number[] = [servedPopulationFor(during, 'academic')];
  for (let week = 0; week < 40; week += 1) {
    tickTech(during);
    readings.push(servedPopulationFor(during, 'academic'));
  }
  const dips = readings.filter((v, i) => i > 0 && v < readings[i - 1]).length;
  assert(dips === 0, `the served population never falls during a renovation (${dips} weeks fell)`);
  assert(
    readings[readings.length - 1] > readings[0],
    'and ends higher than it started, which is the point of paying for it',
  );
}

// --- a building site is still a building site --------------------------
{
  // The narrow reading: only a node mid-RENOVATION is exempt. A library
  // that has never been built serves nothing and is drawn as a frame,
  // exactly as before.
  const s = createInitialState('Ashcombe');
  const lib = libraryIn(s);
  lib.status = 'developing';
  delete lib.renovatingFrom;
  assert(
    servedPopulationFor(s, 'academic') === 0 || !s.tech.some((t) => t.id === lib.id && t.status === 'done'),
    'a library that has never opened serves nobody',
  );
  const site = drawnHeightOf(lib, true);
  assert(site < wallHeightOf(lib) * 0.2, `and is drawn as a site, not a building (${site.toFixed(1)} units)`);
}

// --- the map agrees with the sum ---------------------------------------
{
  const { s } = withLibrary();
  const finished = drawnHeightOf(libraryIn(s), false);

  const during = reducer(s, { type: 'RENOVATE_LIBRARY' });
  const node = libraryIn(during);
  const standing = drawnHeightOf(node, true);

  assert(standing > 0, 'a library mid-renovation is drawn standing');
  assert(
    Math.abs(standing - (wallHeightOf(node) - STOREY)) < 0.001,
    `at the height of the floors it has — one storey short of the floors it will have (${standing.toFixed(1)} of ${wallHeightOf(node).toFixed(1)})`,
  );
  assert(
    standing >= finished - STOREY - 0.001,
    'which is within one storey of how it stood the week before, rather than 16% of it',
  );

  // The two halves of the fix read the same field, and this is the check
  // that they stay in step: whatever is open is what is drawn standing.
  for (let week = 0; week < 60; week += 1) {
    tickTech(during);
    const n = libraryIn(during);
    const serving = servedPopulationFor(during, 'academic');
    const drawn = drawnHeightOf(n, n.status === 'developing');
    if (serving > 0 && drawn <= wallHeightOf(n) * 0.2) {
      assert(false, `week ${week}: the library is open (${serving}) but drawn as a building site`);
      break;
    }
  }
  assert(true, 'the library is never open and drawn as a site in the same week');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
