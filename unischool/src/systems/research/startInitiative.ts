import type { GameState } from '../../state/types';
import type { Action } from '../../state/actions';
import { initiativeDepth, initiativeFundingCost } from '../../data/researchData';
import { researchTopic } from '../../data/researchTopics';
import type { Faculty } from '../../state/types';
import { isCommitted, planCommitmentCoverage } from '../techtree/techSystem';

// Commissioning research. The gate is deliberately strict, because
// this is the most expensive commitment in the game: the facility must
// be finished and free, the topic real, the team the right size, every
// field the topic names covered, nobody already committed elsewhere,
// and the funding payable in full up front — the same "charge at the
// moment of the decision" rule every Buildable follows, so research
// borrows the pacing model rather than inventing a second one.
//
// And then it takes the team's teaching. Their assignments are cleared
// exactly as FIRE_FACULTY clears them, because the consequence is the
// same: those courses have no instructor until somebody else takes
// them. That is the cost decision 2 chose, and it is why the UI names
// the affected courses before this is dispatched.
export function startInitiative(s: GameState, action: Extract<Action, { type: 'START_INITIATIVE' }>): void {
  const lab = s.tech.find((t) => t.id === action.labId);
  if (!lab || lab.facilityType !== 'lab' || lab.status !== 'done') return;
  if (s.research.initiatives[action.labId]) return;

  const topic = researchTopic(action.topicId);
  const depth = initiativeDepth(action.depth);
  if (!topic || action.facultyIds.length !== depth.participants) return;
  if (depth.requiresCrossDisciplinary && topic.fields.length < 2) return;

  const team = action.facultyIds.map((id) => s.faculty.find((f) => f.id === id));
  if (team.some((f) => f === undefined)) return;
  const participants = team as Faculty[];
  if (participants.some((f) => isCommitted(s, f.id))) return;
  // Every field the topic names must actually be on the team — the
  // whole point of a cross-disciplinary topic.
  if (!topic.fields.every((field) => participants.some((f) => f.field === field))) return;

  const cost = initiativeFundingCost(s, depth);
  if (s.finance.cash < cost) return;
  s.finance.cash -= cost;

  s.research.initiatives[action.labId] = {
    labId: action.labId,
    topicId: topic.id,
    depth: depth.key,
    participantIds: participants.map((f) => f.id),
    weeksTotal: depth.weeks,
    weeksRemaining: depth.weeks,
    publications: 0,
    breakthroughs: 0,
    grantIncome: 0,
    banked: 0,
  };

  // Only the EXCESS teaching moves. A commitment costs two course
  // slots (see techSystem.ts's RESEARCH_COMMITMENT_SLOTS), so each
  // member keeps what their reduced load still covers and sheds the
  // rest, lowest tier first — the star keeps the capstone. The shed
  // set is computed by the same function ResearchTab warns with, so
  // what the player was told and what happens cannot drift apart.
  //
  // Written BEFORE the initiative is recorded would be wrong: the team
  // is committed as of the line above, and this reads the world as it
  // now is except for the one thing it must not (see
  // coursesShedByCommitment's own note on why it does not call
  // effectiveCourseSlots).
  const coverage = planCommitmentCoverage(s, action.facultyIds);
  for (const course of coverage.shed) delete s.courseFaculty[course.id];
  for (const { course, instructor } of coverage.covered) s.courseFaculty[course.id] = instructor.id;

  // Two different facts, reported as two: a department that absorbed
  // the load is not the same news as a course nobody can teach, and
  // the player can act on each (hire, or reassign, or leave it).
  const { covered, orphaned } = coverage;
  const moved = `${covered.length} of its team's ${coverage.shed.length} courses moved to colleagues`;
  const open = `${orphaned.length} ${orphaned.length === 1 ? 'course is' : 'courses are'} without an instructor`;
  const consequence = covered.length > 0 && orphaned.length > 0
    ? ` ${moved}; ${open}.`
    : covered.length > 0
      ? ` ${moved}.`
      : orphaned.length > 0
        ? ` ${open} while its team is committed.`
        : '';
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `“${topic.name}” has begun at ${lab.name}.${consequence}`,
    kind: orphaned.length > 0 ? 'info' : 'good',
    topic: 'research-started',
    subject: lab.id,
  });
}
