// ---------------------------------------------------------------------
// A lab's news (components/labNews.ts): the floats a week's research lines
// raise over the labs on the map. A paper, a grant with its amount and a
// breakthrough each rise over their lab, in the order they landed; a lab
// not on the map, other news and a catch-up raise nothing, and one lab
// raises a few at most.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { tickResearch } from '../src/systems/research/researchSystem';
import { PUBLICATION_POINTS } from '../src/data/researchData';
import { LAB_NEWS_MOST, labNewsIn } from '../src/components/labNews';
import type { Faculty, LogEntry } from '../src/state/types';

bindScriptStream(4141);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const LAB = 'LAB-1';
const line = (message: string, over: Partial<LogEntry> = {}): LogEntry => ({ year: 5, week: 3, message, kind: 'good', subject: LAB, ...over });
const onMap = (id: string) => id === LAB;

// Newest first, as the log keeps them: the paper landed, then its grant.
const week = [
  line('Granted.', { topic: 'grant', amount: 1_250_000 }),
  line('A new paper.', { topic: 'publication', kind: 'info' }),
];
const news = labNewsIn(week, onMap);
assert(news.length === 2, 'a paper and its grant are two floats');
assert(news[0].kind === 'paper' && news[0].order === 0, 'the paper rises first');
assert(news[1].kind === 'grant' && news[1].order === 1, 'and its grant after');
assert(news[1].text === '+$1.3M', `a grant shows its amount (${news[1].text})`);
assert(labNewsIn([line('Granted.', { topic: 'grant' })], onMap)[0]?.text === 'Grant', 'a grant without one (an old save) says so');
assert(labNewsIn([line('Big.', { topic: 'breakthrough' })], onMap)[0]?.kind === 'breakthrough', 'a breakthrough rises');
assert(labNewsIn(week, () => false).length === 0, 'a lab not on the map raises nothing');
assert(labNewsIn([line('Built.', { topic: 'building' })], onMap).length === 0, 'other news raises nothing');
const burst = Array.from({ length: LAB_NEWS_MOST + 2 }, () => line('A new paper.', { topic: 'publication' }));
assert(labNewsIn(burst, onMap).length === LAB_NEWS_MOST, 'one lab raises a few at most');
const busy = ['LAB-A', 'LAB-B', 'LAB-C', 'LAB-D', 'LAB-E', 'LAB-F', 'LAB-G'].map((subject) => line('A new paper.', { topic: 'publication', subject }));
assert(labNewsIn(busy, () => true).length === busy.length, 'a busy week across many labs raises each');
assert(labNewsIn([...week, line('A new paper.', { topic: 'publication', week: 2 })], onMap).length === 0, 'a catch-up raises nothing');

// The research tick's grant line carries what was awarded.
const s = createInitialState('Lab News');
s.faculty.push({
  id: 'test-0', name: 'Professor 0', field: 'Economics', teaching: 60, research: 80,
  acclaim: 0, courseSlots: 3, salary: 100_000, tenureWeeks: 100,
} as Faculty);
let granted: LogEntry | undefined;
for (let i = 0; i < 50 && !granted; i += 1) {
  s.log = [];
  s.research.initiatives = { [LAB]: {
    labId: LAB, topicId: '', depth: 'project', participantIds: ['test-0'], weeksRemaining: 10, weeksTotal: 20,
    banked: PUBLICATION_POINTS * 20, publications: 0, breakthroughs: 0, grantIncome: 0,
  } as never };
  tickResearch(s);
  granted = s.log.find((l) => l.topic === 'grant');
}
assert(granted !== undefined && typeof granted.amount === 'number' && granted.amount > 0, 'a grant line carries its amount');

console.log(`lab-news: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
