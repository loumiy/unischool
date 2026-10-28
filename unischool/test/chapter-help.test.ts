// ---------------------------------------------------------------------
// The second course's help while the first is still written (Plan 118E,
// I7: "Start a program's second course" sent a player to a course that
// still needed ENGL 101, four weeks from done). While no program's first
// course is taught and one is still being written, the help says to wait
// and how long; once it is taught, the chapter's own words return.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { teachingCollege } from './fixtures/teaching';
import { objectiveHelp } from '../src/state/chapters';
import { CHAPTER_COPY } from '../src/data/chapterData';
import { housedPrograms } from '../src/data/openingData';
import { programById } from '../src/data/techData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('chapter help tests');

{
  const s = teachingCollege('Help');
  const entries = housedPrograms(s).map((id) => s.tech.find((t) => t.id === programById(id)?.entryCourseId)!).filter(Boolean);
  assert(entries.length > 0, 'the college houses a program');
  for (const t of entries) { t.status = 'available'; delete s.developing[t.id]; }
  const first = entries[0];
  first.status = 'developing';
  s.developing[first.id] = 4;
  const code = first.name.split(' · ')[0];
  const help = objectiveHelp(s, 'next-course', 'develop-second-course')!;
  assert(help.text.startsWith(`${code} is still being written`) && help.text.includes('4 weeks'), `while ${code} is written, the help says to wait, and how long (${help.text})`);
  assert(help.door === 'curriculum', 'and its Show me opens the Curriculum');

  first.status = 'done';
  delete s.developing[first.id];
  assert(objectiveHelp(s, 'next-course', 'develop-second-course') === CHAPTER_COPY['next-course'].help!['develop-second-course'], 'once it is taught, the chapter\'s own help returns');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
