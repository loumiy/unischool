// ---------------------------------------------------------------------
// How a research project ends (src/systems/research/researchSystem.ts's
// concludeInitiative, the queue it files onto, and the quiet-week slot in
// systems/events/eventSystem.ts that reports it).
//
// The shape being pinned: the COMPLETION is the interrupt, and the award —
// which can only be won at conclusion — is one field inside it. It used to
// be the other way round, a prize interrupt with the work itself passing as
// a log line, so the checks here are mostly "the report exists, carries
// everything, and is raised exactly once".
//
// The cancelled case is the one worth a test of its own: winding a project
// up early is the player's own action and must NOT produce a modal telling
// them what they just did.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { endInitiative, tickResearch } from '../src/systems/research/researchSystem';
import { tickEvents } from '../src/systems/events/eventSystem';
import { labFields } from '../src/data/techData';
import { RESEARCH_TOPICS } from '../src/data/researchTopics';
import type { Faculty, GameState, InitiativeReport } from '../src/state/types';

// Read through a call so TypeScript does not narrow the interrupt to what
// the test last assigned: the system under test sets it.
function interruptType(g: GameState): string | undefined {
  return g.pendingInterrupt?.type;
}

let seed = 24680;
const seededRandom = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
Math.random = seededRandom;
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

// A campus with a finished lab and a team on a project that is one week
// from ending. `weeksRemaining: 1` rather than 0 so the tick itself is what
// concludes it, which is the path the game actually takes.
function aboutToFinish(opts: { breakthroughs?: number } = {}): {
  s: GameState; labId: string; labName: string; team: Faculty[]; topicName: string;
} {
  const s = createInitialState('Ashcombe');
  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
  lab.status = 'done';
  // The charter offer fires on the first quiet week after any lab finishes
  // and outranks a research report (see eventSystem.ts's tickEvents), so it
  // is answered up front rather than left to shadow the checks below.
  s.self.universityCharterOffered = true;
  const field = labFields(lab.id)[0];
  const topic = RESEARCH_TOPICS.find((t) => t.fields.length === 1 && t.fields[0] === field)!;

  const team: Faculty[] = [0, 1].map((i) => {
    const f = {
      id: `test-${i}`, name: `Professor ${i}`, field, teaching: 60, research: 80,
      acclaim: 0, courseSlots: 3, salary: 100_000, tenureWeeks: 100,
    } as Faculty;
    s.faculty.push(f);
    return f;
  });

  s.research.initiatives[lab.id] = {
    labId: lab.id,
    topicId: topic.id,
    depth: 'project',
    participantIds: team.map((f) => f.id),
    weeksTotal: 78,
    weeksRemaining: 1,
    publications: 3,
    breakthroughs: opts.breakthroughs ?? 1,
    grantIncome: 4_200_000,
    banked: 0,
  };
  return { s, labId: lab.id, labName: lab.name, team, topicName: topic.name };
}

console.log('research completion tests');

// --- a concluded project files one report -----------------------------
{
  const { s, labId, labName, team, topicName } = aboutToFinish();
  tickResearch(s);

  assert(s.research.initiatives[labId] === undefined, 'the facility is free again');
  assert(s.research.completedInitiatives.length === 1, 'the project is in the history');
  assert(s.research.pendingCompletions.length === 1, 'and exactly one report is queued');

  const report = s.research.pendingCompletions[0];
  assert(report.topicName === topicName, 'the report names the topic');
  assert(report.labId === labId && report.labName === labName, 'and the facility it ran in');
  assert(report.years === 1.5, `and how long it took (${report.years} years for a 78-week project)`);
  assert(
    report.facultyNames.join() === team.map((f) => f.name).join(),
    'and who did it, by name, captured rather than looked up later',
  );
  assert(report.publications === 3, 'it carries the publications');
  assert(report.breakthroughs === 1, 'the breakthroughs');
  assert(report.grantIncome === 4_200_000, 'and the grant money the work pulled in');
  assert(report.depth === 'project', 'and how deep a commitment it was');
}

// --- a cancelled project files none -----------------------------------
{
  const { s, labId } = aboutToFinish();
  endInitiative(s, labId, true);

  assert(s.research.initiatives[labId] === undefined, 'cancelling frees the facility');
  assert(s.research.completedInitiatives.length === 1, 'and still records what happened');
  assert(s.research.completedInitiatives[0].cancelled === true, 'marked as cancelled');
  assert(
    s.research.pendingCompletions.length === 0,
    'but queues no report — a modal confirming what the player just did is noise',
  );
}

// --- the award rides inside the report --------------------------------
{
  // Force the award roll: with Math.random pinned at 0 every chance check
  // passes, which is the only way to make a rare outcome testable without
  // reaching into the odds themselves.
  Math.random = () => 0;
  const { s, team } = aboutToFinish({ breakthroughs: 3 });
  const prizesBefore = s.research.prizes;
  tickResearch(s);
  Math.random = seededRandom;

  const report = s.research.pendingCompletions[0];
  assert(!!report?.award, 'a project that produced breakthroughs can conclude with an award');
  assert(s.research.prizes === prizesBefore + 1, 'the prize is counted');
  const winner = s.faculty.find((f) => f.id === report.award!.facultyId)!;
  assert(!!winner && team.some((f) => f.id === winner.id), 'the winner is somebody who did the work');
  assert(winner.acclaim === 1, 'and their acclaim applied AT CONCLUSION, not when the report is read');
  assert(
    report.award!.prizeName.length > 0 && report.award!.field === winner.field,
    'the report carries the prize name and the field it was won in',
  );
  assert(
    s.research.completedInitiatives[0].award === report.award!.prizeName,
    'and the history records the same prize',
  );
}

// --- the quiet week raises it, once, and one at a time ----------------
{
  const { s, labId } = aboutToFinish();
  tickResearch(s);
  // A second project, concluded the same week: two reports queued.
  const secondLab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab' && t.id !== labId)!;
  secondLab.status = 'done';
  s.research.pendingCompletions.push({ ...s.research.pendingCompletions[0], labId: secondLab.id, labName: secondLab.name });
  assert(s.research.pendingCompletions.length === 2, 'two projects ended in the same week');

  s.pendingInterrupt = null;
  tickEvents(s);
  assert(interruptType(s) === 'research-complete', 'the next quiet week reports one of them');
  const raised = (s.pendingInterrupt!.payload as { report: InitiativeReport }).report;
  assert(raised.labId === labId, 'the one that has been waiting longest');
  assert(s.research.pendingCompletions.length === 1, 'and the other stays queued rather than sharing the modal');

  const after = reducer(s, { type: 'RESOLVE_RESEARCH_REPORT' });
  assert(after.pendingInterrupt === null, 'reading it clears the interrupt');

  after.pendingInterrupt = null;
  tickEvents(after);
  assert(interruptType(after) === 'research-complete', 'the next quiet week reports the second');
  assert(after.research.pendingCompletions.length === 0, 'and the queue is empty');
}

// --- nothing is raised when nothing has concluded ---------------------
{
  const { s } = aboutToFinish();
  s.pendingInterrupt = null;
  s.research.pendingCompletions = [];
  tickEvents(s);
  assert(
    interruptType(s) !== 'research-complete',
    'an empty queue never raises a report',
  );
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
