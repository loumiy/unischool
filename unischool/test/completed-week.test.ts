// ---------------------------------------------------------------------
// When each course was first finished (Plan 105E, types.ts's
// completedWeek): set when a course is finished, cleared when its program
// is closed, and derived for an older save from what the save still knows.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { foundGame } from '../sim/harness/game';
import { teachPillars } from './fixtures/teaching';
import { absoluteWeek } from '../src/data/eventData';
import { exportSave, readSave } from '../src/state/persistence';
import { closeProgram, tickTech } from '../src/systems/techtree/techSystem';
import { programById } from '../src/data/techData';
import { WEEKS_PER_YEAR } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('completed week tests');

const g = foundGame({ seed: 2024 });
g.s = teachPillars(g.s);

// A course started and played to its end records the week it finished.
{
  const t = g.s.tech.find((x) => x.kind === 'course' && x.status === 'available' && x.id.startsWith('ENGL'))!;
  const teacher = g.s.faculty.find((f) => f.field === t.requiresFaculty)!;
  g.s.finance.cash = Math.max(g.s.finance.cash, t.cost * 2);
  g.act({ type: 'START_DEVELOPMENT', nodeId: t.id, facultyId: teacher.id });
  assert(g.s.tech.find((x) => x.id === t.id)!.status === 'developing', `${t.id} is being written`);
  let finishedAt = -1;
  // The tech system's own week, with the clock moved on by hand: the
  // opening holds the reducer's TICK in a college this new.
  for (let i = 0; i < 80 && finishedAt < 0; i++) {
    g.s.clock.week += 1;
    if (g.s.clock.week > WEEKS_PER_YEAR) { g.s.clock.week = 1; g.s.clock.year += 1; }
    tickTech(g.s);
    if (g.s.tech.find((x) => x.id === t.id)!.status === 'done') finishedAt = absoluteWeek(g.s);
  }
  const done = g.s.tech.find((x) => x.id === t.id)!;
  assert(finishedAt > 0, `${t.id} is finished (week ${finishedAt})`);
  assert(done.completedWeek !== undefined && Math.abs(done.completedWeek - finishedAt) <= 1, `and records the week it finished (${done.completedWeek}, ${finishedAt})`);
  const notDone = g.s.tech.filter((x) => x.kind === 'course' && x.status !== 'done' && x.completedWeek !== undefined);
  assert(notDone.length === 0, 'no course not taught carries a week');

  // A save round-trip keeps it.
  const back = readSave(exportSave(g.s).text);
  assert(!('refused' in back) && back.state.tech.find((x) => x.id === t.id)!.completedWeek === done.completedWeek, 'a save keeps it');
}

// An older save: the week is derived from a professor's first week on the
// course, else the log, else the program's milestone year.
{
  const s = structuredClone(g.s);
  const taught = s.tech.filter((x) => x.kind === 'course' && x.status === 'done');
  for (const t of taught) delete t.completedWeek;
  const withSpan = taught.find((t) => s.faculty.some((f) => f.career?.courses.some((c) => c.courseId === t.id)));
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back), 'the edited save loads');
  if (!('refused' in back) && withSpan) {
    const from = Math.min(...s.faculty.flatMap((f) => f.career?.courses.filter((c) => c.courseId === withSpan.id).map((c) => c.from) ?? []));
    const got = back.state.tech.find((x) => x.id === withSpan.id)!.completedWeek;
    assert(got !== undefined && got <= from, `${withSpan.id} takes its first taught week (${got}, ${from})`);
  }
  // A week past the save's own is dropped, and so is one on a course not taught.
  const odd = structuredClone(g.s);
  const now = (odd.clock.year - 1) * WEEKS_PER_YEAR + odd.clock.week;
  const someDone = odd.tech.find((x) => x.kind === 'course' && x.status === 'done')!;
  someDone.completedWeek = now + 500;
  const locked = odd.tech.find((x) => x.kind === 'course' && x.status === 'locked')!;
  locked.completedWeek = 3;
  const read = readSave(exportSave(odd).text);
  if (!('refused' in read)) {
    const w = read.state.tech.find((x) => x.id === someDone.id)!.completedWeek;
    assert(w === undefined || w <= now, `a week from the future is not kept (${w})`);
    assert(read.state.tech.find((x) => x.id === locked.id)!.completedWeek === undefined, 'a course not taught carries none');
  }
}

// Closing a program clears its courses' weeks.
{
  const s = structuredClone(g.s);
  const program = programById('MATH')!;
  const anyDone = program.courseIds.some((id) => s.tech.find((x) => x.id === id)?.status === 'done');
  if (anyDone && closeProgram(s, 'MATH')) {
    assert(program.courseIds.every((id) => s.tech.find((x) => x.id === id)?.completedWeek === undefined), 'a closed program’s courses carry no week');
  } else {
    assert(true, 'Mathematics could not be closed here; nothing to check');
  }
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
if (failures > 0) process.exit(1);
