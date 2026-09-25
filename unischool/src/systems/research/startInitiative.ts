import type { GameState } from '../../state/types';
import type { Action } from '../../state/actions';
import { initiativeDepth, initiativeFundingCost } from '../../data/researchData';
import { researchTopic } from '../../data/researchTopics';
import type { Faculty } from '../../state/types';
import { isCommitted, planCommitmentCoverage } from '../techtree/techSystem';

// Commissioning research. The gate is strict: the facility finished and
// free, the topic real, the team the right size and covering every field,
// nobody already committed, and funding paid in full up front.
//
// The team's excess teaching is cleared as FIRE_FACULTY clears it; the UI
// names the affected courses before this is dispatched.
export function startInitiative(s: GameState, action: Extract<Action, { type: 'START_INITIATIVE' }>): void {
  const lab = s.tech.find((t) => t.id === action.labId);
  if (!lab || lab.facilityType !== 'lab' || lab.status !== 'done') return;
  if (s.research.initiatives[action.labId]) return;
  // One lab at a time on a topic (researchData.ts's initiativeOffers).
  if (Object.values(s.research.initiatives).some((i) => i.topicId === action.topicId)) return;

  const topic = researchTopic(action.topicId);
  const depth = initiativeDepth(action.depth);
  if (!topic || action.facultyIds.length !== depth.participants) return;
  if (depth.requiresCrossDisciplinary && topic.fields.length < 2) return;

  const team = action.facultyIds.map((id) => s.faculty.find((f) => f.id === id));
  if (team.some((f) => f === undefined)) return;
  const participants = team as Faculty[];
  if (participants.some((f) => isCommitted(s, f.id))) return;
  // Every field the topic names must be on the team.
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

  // Only the excess teaching moves: a commitment costs two course slots
  // (techSystem.ts's RESEARCH_COMMITMENT_SLOTS), shed lowest tier first.
  // Uses the same function ResearchTab warns with, so the warning and the
  // outcome cannot drift. Must run after the initiative is recorded above
  // (see coursesShedByCommitment).
  const coverage = planCommitmentCoverage(s, action.facultyIds);
  for (const course of coverage.shed) delete s.courseFaculty[course.id];
  for (const { course, instructor } of coverage.covered) s.courseFaculty[course.id] = instructor.id;

  // Courses absorbed by colleagues and courses left uncovered are reported separately.
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
    message: `"${topic.name}" has begun at ${lab.name}.${consequence}`,
    kind: orphaned.length > 0 ? 'info' : 'good',
    topic: 'research-started',
    subject: lab.id,
  });
}
