// ---------------------------------------------------------------------
// The Curriculum's head and its lighter cells (Plan 125H, the interface
// review's S-1). Pinned:
//
//   - the committee draws its earned seats and one stub for the next
//     ("next at prestige 70"), whatever the number still to earn, and no
//     stub once every step is passed; the sentence under them is gone;
//   - the head has no ring: the count of courses developed, said once;
//   - the filters are folded behind one button until it is pressed or a
//     filter is set;
//   - a course still ahead has no foot in its program's row when the row's
//     Develop line says the same price and teacher; they stay in its title.
//     With nobody to teach it the cell says so, and a price or teacher the
//     row does not say stays. In the filters' worklist, where a cell has
//     no row, the foot stays.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { teachPillars } from './fixtures/teaching';
import { foundGame } from '../sim/harness/game';
import CurriculumTab, { CourseCell, aheadFoot, committeeSeatRow } from '../src/tabs/CurriculumTab';
import {
  COMMITTEE_PRESTIGE_STEPS, COURSE_DEVELOPMENT_SLOTS, committeeSeats, coursesInDevelopment, eligibleInstructors, startDevelopment,
} from '../src/systems/techtree/techSystem';
import { moneyShort, surnameOf } from '../src/format';
import { projectedQuality } from '../src/systems/faculty/facultyAssignment';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('curriculum head tests');

const act = () => {};
const college = () => teachPillars(foundGame({ seed: 12345 }).s);
const countOf = (html: string, what: string) => html.split(what).length - 1;

// ---- The committee: the earned seats and one stub ----
{
  const s = college();
  s.self.reputation = 40;
  const row = committeeSeatRow(s);
  const stubs = row.filter((seat) => seat.kind === 'next');
  assert(row.length === COURSE_DEVELOPMENT_SLOTS + 1, `a young college draws its four seats and one stub (${row.length})`);
  assert(stubs.length === 1 && stubs[0].kind === 'next' && stubs[0].at === COMMITTEE_PRESTIGE_STEPS[0], 'the stub names the first step');
  assert(row[row.length - 1].kind === 'next', 'and comes last');
  assert(row.slice(0, -1).every((seat) => seat.kind === 'free'), 'with nothing being written, every earned seat is free');

  // A course being written takes the first seat.
  const next = s.tech.find((t) => t.kind === 'course' && t.status === 'available' && eligibleInstructors(s, t).length > 0)!;
  s.finance.cash = Math.max(s.finance.cash, next.cost * 2);
  startDevelopment(s, next, eligibleInstructors(s, next)[0].id);
  const writing = committeeSeatRow(s);
  assert(coursesInDevelopment(s).length === 1 && writing[0].kind === 'busy' && writing[0].course.id === next.id, 'a course being written takes the first seat');
  assert(writing.length === row.length && writing.filter((seat) => seat.kind === 'free').length === COURSE_DEVELOPMENT_SLOTS - 1, 'and the others stay free');

  // Each step earned moves the stub on; the row grows by one seat, never by
  // the seats still locked.
  COMMITTEE_PRESTIGE_STEPS.forEach((step, i) => {
    s.self.reputation = step;
    const at = committeeSeatRow(s);
    const stub = at.find((seat) => seat.kind === 'next');
    const after = COMMITTEE_PRESTIGE_STEPS[i + 1];
    assert(at.filter((seat) => seat.kind !== 'next').length === committeeSeats(s), `at prestige ${step} every earned seat is drawn`);
    assert(after === undefined ? stub === undefined : stub?.kind === 'next' && stub.at === after, after === undefined ? 'and no stub once every step is passed' : `and one stub, for ${after}`);
    assert(at.length <= committeeSeats(s) + 1, 'never more than one box past the earned seats');
  });

  // As drawn.
  s.self.reputation = 40;
  const html = renderToStaticMarkup(createElement(CurriculumTab, { s, act }));
  assert(countOf(html, 'committee-seat locked') === 1, `the tab draws one locked seat (${countOf(html, 'committee-seat locked')})`);
  assert(html.includes(`next at prestige ${COMMITTEE_PRESTIGE_STEPS[0]}`), 'reading "next at prestige 70"');
  assert(!html.includes('One more at a time') && !html.includes('committee-note'), 'and no sentence under the seats');
  s.self.reputation = 100;
  assert(countOf(renderToStaticMarkup(createElement(CurriculumTab, { s, act })), 'committee-seat locked') === 0, 'and none at prestige 100');
}

// ---- The head: no ring, the filters folded ----
{
  const s = college();
  const html = renderToStaticMarkup(createElement(CurriculumTab, { s, act }));
  assert(!html.includes('progress-ring'), 'the head has no ring');
  assert(/\d+\/\d+ developed/.test(html), 'and still counts the courses developed');
  assert(html.includes('curriculum-filter-toggle') && html.includes('aria-expanded="false"'), 'one Filter button, not pressed');
  assert(!html.includes('curriculum-search') && !html.includes('curriculum-chip'), 'the search and the toggles wait behind it');
}

// ---- The cells ----
{
  const s = college();
  const ahead = s.tech.find((t) => t.kind === 'course' && t.status === 'available' && eligibleInstructors(s, t).length > 0)!;
  s.finance.cash = Math.max(s.finance.cash, ahead.cost * 2);
  const best = eligibleInstructors(s, ahead)[0];
  const cell = (props: { rowSays?: string | null }, t = ahead) => renderToStaticMarkup(createElement(CourseCell, { s, t, selected: false, onSelect: () => {}, ...props }));

  const says = aheadFoot(s, ahead);
  assert(says === `${moneyShort(ahead.cost)} · ${surnameOf(best.name)} ${Math.round(projectedQuality(ahead, best).score)}`, `the foot as words (${says})`);
  const inRow = cell({ rowSays: says });
  assert(!inRow.includes('cell-next'), 'in a row whose Develop line says the same, a course still ahead has no foot');
  assert(inRow.includes(`${moneyShort(ahead.cost)}, `) && inRow.includes(`${best.name} would teach it at `), 'its title keeps the price and the teacher');
  const [code, name] = ahead.name.split(' · ');
  assert(inRow.includes(`>${code}<`) && inRow.includes(`>${name}<`), 'and it shows its code and name');

  // A foot that is not the row's stays: another teacher (a graduate row
  // taught by several people), or a row with no Develop line.
  const other = cell({ rowSays: `${moneyShort(ahead.cost)} · Someone 50` });
  assert(other.includes('cell-next') && other.includes(surnameOf(best.name)), 'a foot the row does not say stays');
  assert(cell({ rowSays: null }).includes('cell-next'), 'and so does every foot in a row with no Develop line');

  const listed = cell({});
  assert(listed.includes('cell-next') && listed.includes(moneyShort(ahead.cost)) && listed.includes(surnameOf(best.name)), 'in the worklist, with no row, the foot stays');

  // Nobody to teach it: the one foot a row's cell keeps.
  const field = ahead.requiresFaculty!;
  s.faculty = s.faculty.filter((f) => f.field !== field);
  const bare = cell({ rowSays: aheadFoot(s, ahead) });
  assert(eligibleInstructors(s, ahead).length === 0 && bare.includes('cell-next') && bare.includes('needs faculty'), 'with nobody to teach it, the cell says so');
  assert(!bare.includes(`>${moneyShort(ahead.cost)}`), 'without the price, which is the row\'s');

  // The tab's own rows are drawn that way.
  const tab = renderToStaticMarkup(createElement(CurriculumTab, { s: college(), act }));
  assert(countOf(tab, 'course-cell available') > 0, 'the tab draws courses still ahead');
  assert(countOf(tab, 'cell-next') === countOf(tab, 'cell-next">needs faculty<'), `and the only foot in its rows is "needs faculty" (${countOf(tab, 'cell-next')})`);
}

console.log(`  ${failures === 0 ? '✓' : '✗'} ${checks - failures} of ${checks} checks passed`);
if (failures > 0) process.exit(1);
