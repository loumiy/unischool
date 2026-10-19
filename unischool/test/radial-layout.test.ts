// ---------------------------------------------------------------------
// The radial curriculum's layout and drawn set (Plan 105A,
// systems/techtree/radialLayout.ts): every course has one fixed place, no
// two places overlap, only what the college has opened is drawn, and the
// drawing only grows as courses are taught.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { foundGame } from '../sim/harness/game';
import { teachPillars } from './fixtures/teaching';
import {
  bridgesFor, fitScale, NODE_RADIUS, radialDrawing, radialLayout, RADIAL,
} from '../src/systems/techtree/radialLayout';
import { CROSS_MAJOR_BRIDGES, discoverySchools, programById } from '../src/data/techData';
import { unlockAvailable } from '../src/systems/techtree/techSystem';
import { FOUNDERS_HALL_ID } from '../src/data/techData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('radial layout tests');

const layout = radialLayout();

// Every undergraduate course has a place; the graduate programs one node each.
{
  const majors = discoverySchools().flatMap((school) => school.majors);
  assert(layout.courses.size === majors.length * 10, `every undergraduate course placed (${layout.courses.size})`);
  assert(layout.schools.length === discoverySchools().length, 'a sector per school');
  const grads = [...layout.programs.values()].filter((p) => p.kind === 'graduate');
  assert(grads.length === discoverySchools().flatMap((x) => x.graduate).length, `a node per graduate program (${grads.length})`);
  assert(grads.every((p) => p.node && Math.abs(Math.hypot(p.node.x, p.node.y) - RADIAL.graduate) < 0.5), 'beyond the rim');
  assert(radialLayout() === layout, 'computed once');
}

// Tiers are rings: the entry course innermost, the capstone outermost.
{
  let ok = true;
  for (const c of layout.courses.values()) {
    const r = Math.hypot(c.x, c.y);
    const band = c.tier === 'entry' ? [RADIAL.entry, RADIAL.entry]
      : c.tier === 'core' ? [RADIAL.core - RADIAL.stagger, RADIAL.core + RADIAL.stagger]
        : c.tier === 'advanced' ? [RADIAL.advanced - RADIAL.stagger, RADIAL.advanced + RADIAL.stagger]
          : [RADIAL.capstone, RADIAL.capstone];
    if (r < band[0] - 0.5 || r > band[1] + 0.5) ok = false;
  }
  assert(ok, 'every course sits on its tier’s ring');
}

// No two nodes overlap.
{
  const all = [...layout.courses.values()];
  let worst = Infinity;
  let pair = '';
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      const gap = Math.hypot(a.x - b.x, a.y - b.y) - NODE_RADIUS[a.tier] - NODE_RADIUS[b.tier];
      if (gap < worst) { worst = gap; pair = `${a.id}/${b.id}`; }
    }
  }
  assert(worst > 1, `no two courses overlap (closest ${pair}, ${worst.toFixed(1)} apart)`);
}

// A new college draws nothing; a program's branch appears when it is housed.
{
  const g = foundGame({ seed: 4242 });
  const empty = radialDrawing(g.s);
  assert(empty.courses.size === 0, `a college with nothing housed draws no course (${empty.courses.size})`);
  assert(empty.schools.every((x) => !x.started && x.done === 0), 'and no school');

  const s = teachPillars(g.s);
  const drawn = radialDrawing(s);
  const locked = [...drawn.courses.keys()].filter((id) => s.tech.find((t) => t.id === id)?.status === 'locked');
  assert(locked.length === 0, `nothing locked is drawn (${locked.join(', ')})`);
  for (const id of drawn.courses.keys()) {
    const program = programById(layout.courses.get(id)!.programId)!;
    assert(s.halls[FOUNDERS_HALL_ID].some((slot) => slot?.programId === program.id), `${id}'s program is housed`);
  }
  const english = programById('ENGL')!;
  const englishDrawn = english.courseIds.filter((id) => drawn.courses.has(id));
  assert(englishDrawn.length >= 2, `a teaching program draws its taught courses (${englishDrawn.join(', ')})`);
  assert(drawn.lines.taught.length > 0, 'and lines to them');
  assert(!drawn.courses.has('ENGL310'), 'not its capstone yet');

  // Teaching a course never takes anything off the drawing.
  const before = new Set(drawn.courses.keys());
  const next = s.tech.find((t) => t.kind === 'course' && t.status === 'available' && t.id.startsWith('ENGL'))!;
  next.status = 'done';
  unlockAvailable(s);
  const after = radialDrawing(s);
  assert([...before].every((id) => after.courses.has(id)), 'the drawing only grows as courses are taught');
  assert(after.courses.get(next.id)?.state === 'done', `${next.id} is drawn taught`);
}

// The camera: a small drawing is scaled up, the full one fills the stage.
{
  assert(fitScale(RADIAL.entry) > fitScale(RADIAL.capstone), 'a smaller drawing is scaled up further');
  assert(fitScale(RADIAL.graduate) >= 1, 'the full drawing is never shrunk below the stage');
}

// Every bridge resolves to two places, and is drawn only between drawn courses.
{
  let missing = 0;
  for (const [to, froms] of Object.entries(CROSS_MAJOR_BRIDGES)) {
    for (const from of froms) if (!layout.courses.has(to) || !layout.courses.has(from)) missing += 1;
  }
  assert(missing === 0, `every cross-program prerequisite has two places (${missing} missing)`);
  const g = foundGame({ seed: 7 });
  const s = teachPillars(g.s);
  const drawing = radialDrawing(s);
  for (const program of layout.programs.values()) {
    const b = bridgesFor(program.id, drawing);
    for (const id of b.farEnds) assert(drawing.courses.has(id), `${program.id}'s bridge end ${id} is drawn`);
  }
  assert(bridgesFor(null, drawing).path === '', 'no program in focus, no bridges');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
