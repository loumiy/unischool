// ---------------------------------------------------------------------
// The Curriculum tab's sections (Plan 80B, tabs/CurriculumTab.tsx's
// curriculumGroups): the seven schools draw their majors, and the graduate
// programs sit in four sections of their own after them — the doctorates
// and the MFA in the Graduate School, the MBA in the Graduate Business School, the
// JD in the Law School, the MD in the Medical School — in their home
// schools' colors. Only the tab's grouping moves: the discovery sections
// the rest of the game reads keep each program under its home school.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { foundGame } from '../sim/harness/game';
import { teachPillars } from './fixtures/teaching';
import { curriculumGroups, discoverySections, visibleCourseIds } from '../src/tabs/CurriculumTab';
import { graduatePrograms, programById } from '../src/data/techData';
import { schoolMark } from '../src/data/schoolPalette';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('curriculum sections tests');

// A college teaching its pillars (fixtures/teaching.ts): a new one has
// nothing housed (Plan 80D).
const g = foundGame({ seed: 12345 });
const s = teachPillars(g.s);
const GRADUATE = new Set(graduatePrograms().map((p) => p.id));

{
  const before = curriculumGroups(s);
  assert(before.length > 0, `a founded college has a school section (${before.map((x) => x.key).join(', ')})`);
  assert(before.every((grp) => grp.rows.every((row) => !GRADUATE.has(row.program.id))), 'and no graduate program before one is housed');
}

// Every graduate program housed, as their hosts would (the slots are
// written directly: the gates are not what this reads).
s.halls['TEST-HOST'] = graduatePrograms().map((p) => ({ programId: p.id }));

{
  const groups = curriculumGroups(s);
  const keys = groups.map((grp) => grp.key);
  const gradKeys = keys.filter((k) => ['Graduate School', 'Graduate Business School', 'Law School', 'Medical School'].includes(k));
  assert(gradKeys.join('|') === 'Graduate School|Graduate Business School|Law School|Medical School', `the four graduate sections, in order (${gradKeys.join(', ')})`);
  assert(keys.slice(-4).join('|') === gradKeys.join('|'), 'after every school');

  const rowsOf = (key: string) => groups.find((grp) => grp.key === key)?.rows.map((row) => row.program.id) ?? [];
  assert(rowsOf('Graduate School').sort().join(',') === ['PHDB', 'PHDC', 'PHDE', 'PHDH', 'PHDL', 'PHDS', 'MFAX'].sort().join(','), `the Graduate School holds the doctorates and the MFA (${rowsOf('Graduate School').join(', ')})`);
  assert(rowsOf('Graduate Business School').join(',') === 'MBAX', 'the Graduate Business School the MBA');
  assert(rowsOf('Law School').join(',') === 'LAWS', 'the Law School the JD');
  assert(rowsOf('Medical School').join(',') === 'MED', 'the Medical School the MD');
  for (const grp of groups) {
    if (grp.key.endsWith(' School')) continue;
    assert(grp.rows.every((row) => !GRADUATE.has(row.program.id)), `${grp.key} draws no graduate program`);
  }

  const mark = (key: string) => groups.find((grp) => grp.key === key)?.mark;
  assert(mark('Graduate Business School')?.hue === schoolMark('Business').hue, "the Graduate Business School is in Business's color");
  assert(mark('Law School')?.hue === schoolMark('Social Sciences & Humanities').hue, "the Law School in Social Sciences & Humanities' color");
  assert(mark('Medical School')?.hue === schoolMark('Health Science').hue, "the Medical School in Health Science's color");
  assert(mark('Graduate School')?.hue === undefined, "the Graduate School takes the college's colors, its rows their home schools'");
  assert(groups.filter((grp) => grp.key.endsWith(' School')).every((grp) => grp.founded && grp.heading === grp.key), 'each is named from the start');

  // Nothing drawn is lost or doubled: the tab draws every visible course once.
  const drawn = groups.flatMap((grp) => grp.rows.flatMap((row) => row.program.courseIds.filter((id) => row.revealed.has(id))));
  const visible = new Set(visibleCourseIds(s));
  assert(drawn.length === new Set(drawn).size, 'no course is drawn twice');
  assert(drawn.every((id) => visible.has(id)), 'every drawn course is visible');
  const gradVisible = [...visible].filter((id) => graduatePrograms().some((p) => programById(p.id)!.courseIds.includes(id)));
  assert(gradVisible.every((id) => drawn.includes(id)), `every visible graduate course is drawn (${gradVisible.length})`);

  // The discovery sections keep their home schools (the map's popover and
  // the curriculum badge read them).
  const home = discoverySections(s).find((sec) => sec.key === 'Social Sciences & Humanities');
  assert(!!home?.subgroups.some((sub) => sub.key === 'LAWS'), 'the discovery sections still hold the JD under Social Sciences & Humanities');
}

// One program housed: only its section.
s.halls['TEST-HOST'] = [{ programId: 'LAWS' }];
{
  const keys = curriculumGroups(s).map((grp) => grp.key);
  assert(keys.includes('Law School') && !keys.includes('Graduate School') && !keys.includes('Graduate Business School') && !keys.includes('Medical School'), `only the Law School with the JD alone (${keys.join(', ')})`);
}

console.log(`  ${failures === 0 ? '✓' : '✗'} ${checks - failures} of ${checks} checks passed`);
if (failures > 0) process.exit(1);
