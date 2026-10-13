// ---------------------------------------------------------------------
// Plan 99D: door signs. A plate's text is the building's name, cut with an
// ellipsis to SIGN_MAX_CHARS: every catalogue name and the longest name a
// donor gives fits the rule. A building with a front door the camera sees
// gets a plate; one with no door (open ground, the stadium, the village,
// the landmarks) never does.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import type { ReactElement } from 'react';
import { createInitialState } from '../src/state/actions';
import { NAME_POOLS } from '../src/data/facultyData';
import { milestoneSchools } from '../src/data/techData';
import { footprintOf } from '../src/state/campusMap';
import DoorSign, { SIGN_MAX_CHARS, signText } from '../src/components/doorSign';
import { doorOf } from '../src/components/buildingSpec';
import { PITCHES, VIEWS, setCamera } from '../src/components/isoProjection';
import type { Facing } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) { failures += 1; console.log(`  ✗ ${msg}`); }
}

console.log('door sign tests');

const fits = (name: string) => {
  const out = signText(name);
  return out.length <= SIGN_MAX_CHARS && (out === name.trim() || (out.endsWith('…') && name.startsWith(out.slice(0, -1))));
};

const s = createInitialState('Signs');
const bad = s.tech.filter((t) => !fits(t.name)).map((t) => t.name);
assert(bad.length === 0, `every catalogue name fits its plate (${bad.join('; ')})`);
assert(signText('Founders Hall') === 'Founders Hall', 'a short name is kept whole');

// The longest a donor's name can be: the longest surname, and the longest
// school or venue it is put to.
const surname = NAME_POOLS.flatMap((p) => [...p.last]).sort((a, b) => b.length - a.length)[0]!;
const school = milestoneSchools().map((m) => m.schoolName).sort((a, b) => b.length - a.length)[0]!;
const longest = [`${surname} School of ${school}`, `${surname} Aquatic Center`].sort((a, b) => b.length - a.length)[0]!;
assert(fits(longest), `the longest donor name is cut to fit ("${longest}" → "${signText(longest)}")`);

// Which buildings get one, from the default view: those with a front door
// facing the camera.
setCamera({ azimuth: VIEWS[0]!, pitch: PITCHES[3]! });
const plates = (facing: Facing) => s.tech.filter((t) => {
  const fp = footprintOf(t);
  const p = { col: 10, row: 10, w: fp.w, h: fp.h, facing };
  return (DoorSign({ t, p, label: t.name }) as ReactElement | null) !== null;
});
const doorless = s.tech.filter((t) => !doorOf(t));
assert(doorless.length > 0 && doorless.every((t) => DoorSign({ t, p: { col: 0, row: 0, w: 6, h: 6, facing: 0 }, label: t.name }) === null), 'a building with no door gets no plate');
const seen = new Set<string>();
for (const f of [0, 1, 2, 3] as Facing[]) for (const t of plates(f)) seen.add(t.id);
assert(seen.size > 20, `buildings with doors get plates, whichever way they face (${seen.size})`);
// A front that faces away is not signed.
const away = ([0, 1, 2, 3] as Facing[]).map((f) => plates(f).length);
assert(Math.min(...away) < Math.max(...away), `fewer plates when fronts face away (${away.join(', ')})`);

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
