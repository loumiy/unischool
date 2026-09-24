// The catalogue, drawn (Plan 25): a hall dedicated to one school is drawn as
// that school's signature building and a mixed hall is not; research
// buildings look like their discipline. Drawing only, so what these pin is
// which look the map picks, and that the state never carries it.

import { createInitialState } from '../src/state/actions';
import { campusLayout } from '../src/components/campusLayout';
import { SCHOOL_SIGNATURES, labFeatureOf, materialOf, motifOf } from '../src/components/buildingSpec';
import { FOUNDERS_HALL_ID, initialTech, programById, programs } from '../src/data/techData';
import { schoolMark } from '../src/data/schoolPalette';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(2525);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
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

console.log('catalogue tests');

// ---- Every school has a signature, and they differ ----
{
  const schools = [...new Set(programs().map((p) => p.school))];
  const missing = schools.filter((school) => !SCHOOL_SIGNATURES[school]);
  assert(missing.length === 0, `every school has a signature building (${missing.join(', ')})`);
  const looks = Object.values(SCHOOL_SIGNATURES).map((sig) => `${sig.motif}/${sig.material}`);
  assert(new Set(looks).size === looks.length, 'and no two schools share one');
  assert(schools.every((school) => schoolMark(school) !== undefined), 'each is a school the palette knows');
}

// ---- A dedicated hall takes its school's look; a mixed one does not ----
function withHall(slots: (string | null)[]): GameState {
  const s = createInitialState('Catalogue');
  const hall = s.tech.find((t) => t.id === 'HALL-01')!;
  hall.status = 'done';
  s.placements[hall.id] = { row: 20, col: 20, w: 7, h: 5 };
  s.halls[hall.id] = slots.map((programId) => ({ programId }));
  return s;
}
{
  const sciences = programs().filter((p) => p.school === 'Science').slice(0, 6).map((p) => p.id);
  const s = withHall(sciences);
  const entry = campusLayout(s).byId.get('HALL-01')!;
  assert(motifOf(entry.t) === SCHOOL_SIGNATURES['Science'].motif, `a hall of six science programs is drawn as a science centre (${motifOf(entry.t)})`);
  assert(materialOf(entry.t, 'georgian') !== materialOf(s.tech.find((t) => t.id === 'HALL-01')!, 'georgian'), 'in its own material');
  assert(!('signature' in s.tech.find((t) => t.id === 'HALL-01')!), 'and the state never carries the look');

  const mixed = [...sciences.slice(0, 5), programs().find((p) => p.school === 'Business')!.id];
  const m = withHall(mixed);
  assert(motifOf(campusLayout(m).byId.get('HALL-01')!.t) === 'hall', 'a mixed hall stays the gabled hall');
  const unfilled = withHall([...sciences.slice(0, 5), null]);
  assert(motifOf(campusLayout(unfilled).byId.get('HALL-01')!.t) === 'hall', 'as does a hall with a slot still free');
  assert(programById(sciences[0])?.school === 'Science', 'the programs are science programs');
}
{
  const s = createInitialState('Catalogue');
  const founders = campusLayout(s).byId.get(FOUNDERS_HALL_ID);
  assert(founders !== undefined && motifOf(founders.t) === 'hall', 'Founders Hall keeps its clock tower whatever it holds');
}

// ---- Research buildings look like their discipline ----
{
  const labs = initialTech().filter((t) => t.facilityType === 'lab');
  const plain = labs.filter((t) => motifOf(t) === 'works' && labFeatureOf(t) === undefined).map((t) => t.id);
  assert(plain.length <= 1, `at most one lab is left a plain works building (${plain.join(', ')})`);
  assert(labFeatureOf(labs.find((t) => t.id === 'LAB-PHYS')!) === 'observatory', 'physics has its observatory');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
