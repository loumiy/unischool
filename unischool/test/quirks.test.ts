// Faculty quirks (src/data/quirkData.ts): picked from a professor's id, not
// the shared stream; they move potentials, pay and the students' morale.

import { QUIRKS, QUIRK_MORALE_CAP, QUIRK_SHARE, quirkById, quirkForId } from '../src/data/quirkData';
import { generateCandidate } from '../src/data/facultyData';
import { createInitialState } from '../src/state/actions';
import { facultyMorale } from '../src/systems/satisfaction/satisfactionSystem';
import { bindScriptStream } from '../src/engine/random';

bindScriptStream(2929);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('quirks tests');

{
  assert(QUIRKS.length === 40 && new Set(QUIRKS.map((q) => q.id)).size === 40, 'forty quirks, each its own');
  assert(QUIRKS.every((q) => q.line.length > 0 && Object.keys(q.effects).length > 0), 'each with a line and an effect');
  const ids = Array.from({ length: 4000 }, (_, i) => `id${i}x${(i * 7919) % 104729}`);
  const share = ids.filter((id) => quirkForId(id) !== undefined).length / ids.length;
  assert(Math.abs(share - QUIRK_SHARE) < 0.05, `about ${QUIRK_SHARE * 100}% of professors have one (${(share * 100).toFixed(1)}%)`);
  assert(ids.every((id) => quirkForId(id) === quirkForId(id)), 'and the same id always has the same one');
  const seen = new Set(ids.map((id) => quirkForId(id)?.id).filter(Boolean));
  assert(seen.size === QUIRKS.length, 'every quirk turns up');
}

{
  let withQuirk = 0;
  let without = 0;
  for (let i = 0; i < 200; i++) {
    const c = generateCandidate('History');
    if (c.quirk) withQuirk += 1; else without += 1;
    if (c.quirk) assert(c.teachingPotential >= 0 && c.teachingPotential <= 100 && c.researchPotential >= 0 && c.researchPotential <= 100, `${quirkById(c.quirk)!.name}: potentials stay in range`);
  }
  assert(withQuirk > 0 && without > 0, 'the market has professors with quirks and without');
}

{
  const s = createInitialState('Quirks');
  s.faculty = s.faculty.map((f) => ({ ...f, quirk: 'beloved-lecturer' }));
  const glad = facultyMorale(s);
  assert(glad > 0 && glad <= QUIRK_MORALE_CAP, `cheerful professors lift academic satisfaction a little (${glad.toFixed(2)})`);
  s.faculty = Array.from({ length: 200 }, (_, i) => ({ ...s.faculty[0], id: `x${i}`, quirk: 'harsh-grader' }));
  assert(facultyMorale(s) === -QUIRK_MORALE_CAP, 'and however many harsh graders, the dent is capped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
