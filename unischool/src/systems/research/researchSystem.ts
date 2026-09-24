import type { Faculty, GameState, Initiative, LogTopic, PrizeAward } from '../../state/types';
import { INITIATIVE_HISTORY_LIMIT, WEEKS_PER_YEAR } from '../../state/types';
import {
  GRANT_PER_PUBLICATION_CHANCE, PUBLICATION_POINTS, annualBreakthroughChance, article, awardChance,
  disciplineVocab, facilitySchool, facultyResearchOutput, initiativeDepth, initiativeWeeklyOutput,
  isBreakthroughRollWeek, rollGrantAmount, rollGrantFunder, rollPrizeName, teamStrength,
} from '../../data/researchData';
import { researchTopic } from '../../data/researchTopics';
import { generateCandidate } from '../../data/facultyData';
import { money } from '../../format';
import { random } from '../../engine/random';

// The research tick (docs/design/research.md). Each running initiative, one
// per research facility, in order:
//   1. Production: the team's weekly output (rules in researchData.ts). A
//      run with no team left is abandoned; a partial team carries on.
//   2. Outputs: output is banked, and every PUBLICATION_POINTS publishes a
//      paper, with a chance of a grant; a breakthrough is rolled once a year.
//      These only log and never stop the clock.
//   3. Conclusion: the award roll, gated on a banked breakthrough. Only a
//      run with a breakthrough or award queues a report.
//   4. Breakthroughs and every fourth paper bring a scholar in the field onto
//      the candidate market; cohorts.ts reads the same tally.
// Nothing here is a decision event: grants and breakthroughs have no choice
// in them. Reports are queued, not fired, because only one interrupt can be
// pending; an award's effects apply the week it is won.

function log(s: GameState, message: string, kind: 'info' | 'good' | 'bad', topic?: LogTopic, subject?: string): void {
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind, topic, subject });
}

// The player commissions each run (topic, team, depth, facility); idle
// capacity produces nothing.

// Every fourth paper out of one project brings a candidate in its field
// onto the market; every breakthrough brings one at once.
const PUBLICATIONS_PER_CANDIDATE_PULL = 4;

// Somebody in the field saw the work: a listing in the standing market, in
// the field of a team member.
function pullCandidate(s: GameState, participants: Faculty[], why: string): void {
  const who = pickFrom(participants);
  if (!who) return;
  const candidate = generateCandidate(who.field, [...s.faculty, ...s.candidates].map((f) => f.name));
  s.candidates.unshift(candidate);
  log(s, `${candidate.name} (${candidate.field}) saw ${why} and is on the market.`, 'info', 'candidate', candidate.id);
}

function publish(s: GameState, initiative: Initiative, participants: Faculty[]): void {
  const vocab = disciplineVocab(facilitySchool(initiative.labId));
  const topic = researchTopic(initiative.topicId);
  const where = topic ? `“${topic.name}”` : 'the project';

  initiative.publications += 1;
  s.research.publications += 1;
  log(s, `${article(vocab.publication)} new ${vocab.publication} out of ${where}.`, 'info', 'publication', initiative.labId);

  // A grant rides on the paper, scaled by team strength.
  if (random() < GRANT_PER_PUBLICATION_CHANCE) {
    const amount = rollGrantAmount(s);
    const scaled = Math.round(amount * (0.7 + teamStrength(participants)));
    s.finance.cash += scaled;
    s.research.grants += 1;
    s.research.grantIncome += scaled;
    initiative.grantIncome += scaled;
    log(s, `${rollGrantFunder(vocab)} has awarded ${money(scaled)} to ${where}.`, 'good', 'grant', initiative.labId);
  }

  if (initiative.publications % PUBLICATIONS_PER_CANDIDATE_PULL === 0) {
    pullCandidate(s, participants, `the ${vocab.publication}s out of ${where}`);
  }
}

function rollBreakthrough(s: GameState, initiative: Initiative, participants: Faculty[]): void {
  if (random() >= annualBreakthroughChance(initiative.depth, teamStrength(participants))) return;
  const vocab = disciplineVocab(facilitySchool(initiative.labId));
  const topic = researchTopic(initiative.topicId);
  const where = topic ? `“${topic.name}”` : 'the project';
  initiative.breakthroughs += 1;
  s.research.breakthroughs += 1;
  log(s, `${article(vocab.breakthrough)} ${vocab.breakthrough} out of ${where} has been ${vocab.breakthroughTail}.`, 'good', 'breakthrough', initiative.labId);
  pullCandidate(s, participants, `the ${vocab.breakthrough} out of ${where}`);
}

// Deterministic, so the offer's "expected N publications" is kept.
function produce(s: GameState, initiative: Initiative, participants: Faculty[]): void {
  const depth = initiativeDepth(initiative.depth);
  const output = initiativeWeeklyOutput(s, participants, depth);
  initiative.banked += output;
  while (initiative.banked >= PUBLICATION_POINTS) {
    initiative.banked -= PUBLICATION_POINTS;
    publish(s, initiative, participants);
  }
}

// The end of a run: a completion credit in researchScore (sized by depth),
// then the award roll, gated on a breakthrough.
function concludeInitiative(s: GameState, initiative: Initiative, cancelled: boolean): void {
  const participants = s.faculty.filter((f) => initiative.participantIds.includes(f.id));
  const topic = researchTopic(initiative.topicId);
  const name = topic?.name ?? 'the project';
  let award: PrizeAward | null = null;

  if (!cancelled) {
    // A Funded Project or deeper always publishes at least one paper.
    if (initiative.depth !== 'pilot' && initiative.publications === 0) publish(s, initiative, participants);

    const strength = teamStrength(participants);
    if (random() < awardChance(initiative.depth, strength, initiative.breakthroughs)) {
      // Weighted by output, so usually the strongest team member.
      const winner = pickFrom(participants);
      if (winner) {
        winner.acclaim += 1;
        s.research.prizes += 1;
        // Named for the facility's discipline.
        const prizeName = rollPrizeName(disciplineVocab(facilitySchool(initiative.labId)));
        award = { facultyId: winner.id, facultyName: winner.name, field: winner.field, prizeName };
        log(s, `${winner.name} has been awarded ${prizeName} for “${name}”.`, 'good', 'prize', winner.id);
      }
    }
    const papers = initiative.publications;
    // The log carries a papers-only run; a run getting a report is not
    // announced on top of it.
    const notable = award !== null || initiative.breakthroughs > 0;
    log(
      s,
      `“${name}” has concluded after ${Math.round(initiative.weeksTotal / WEEKS_PER_YEAR * 10) / 10} years: `
        + `${papers} ${papers === 1 ? 'publication' : 'publications'}, `
        + `${initiative.breakthroughs} ${initiative.breakthroughs === 1 ? 'breakthrough' : 'breakthroughs'}.`,
      'good',
      notable ? 'research-reported' : 'research-concluded',
      initiative.labId,
    );

    // Queued rather than raised, since only one interrupt can be pending;
    // the award's effects have already applied. A cancelled run or a run
    // with papers alone queues nothing, so the modal is kept for a
    // breakthrough or an award.
    if (notable) s.research.pendingCompletions.push({
      topicId: initiative.topicId,
      topicName: name,
      labId: initiative.labId,
      labName: s.tech.find((t) => t.id === initiative.labId)?.name ?? 'the facility',
      depth: initiative.depth,
      years: Math.round((initiative.weeksTotal / WEEKS_PER_YEAR) * 10) / 10,
      facultyNames: participants.map((f) => f.name),
      publications: initiative.publications,
      breakthroughs: initiative.breakthroughs,
      grantIncome: initiative.grantIncome,
      award,
    });
  }

  s.research.completedInitiatives.unshift({
    topicId: initiative.topicId,
    depth: initiative.depth,
    year: s.clock.year,
    facultyNames: participants.map((f) => f.name),
    publications: initiative.publications,
    breakthroughs: initiative.breakthroughs,
    grantIncome: initiative.grantIncome,
    award: award?.prizeName ?? null,
    ...(cancelled ? { cancelled: true as const } : {}),
  });
  s.research.completedInitiatives = s.research.completedInitiatives.slice(0, INITIATIVE_HISTORY_LIMIT);
  delete s.research.initiatives[initiative.labId];
}

// Shared with the reducer's CANCEL_INITIATIVE.
export function endInitiative(s: GameState, labId: string, cancelled: boolean): void {
  const initiative = s.research.initiatives[labId];
  if (!initiative) return;
  concludeInitiative(s, initiative, cancelled);
}

function pickFrom(participants: Faculty[]): Faculty | null {
  const total = participants.reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  if (total <= 0) return participants[0] ?? null;
  let roll = random() * total;
  for (const f of participants) {
    roll -= facultyResearchOutput(f);
    if (roll <= 0) return f;
  }
  return participants[participants.length - 1];
}

export function tickResearch(s: GameState): void {
  // A run whose whole team was dismissed is ended; a partial team carries on.
  for (const initiative of Object.values(s.research.initiatives)) {
    const participants = s.faculty.filter((f) => initiative.participantIds.includes(f.id));
    if (participants.length === 0) {
      const topic = researchTopic(initiative.topicId);
      log(s, `“${topic?.name ?? 'A project'}” has been abandoned — nobody is left on it.`, 'bad', 'research-concluded', initiative.labId);
      concludeInitiative(s, initiative, true);
      continue;
    }

    produce(s, initiative, participants);

    initiative.weeksRemaining -= 1;
    // One breakthrough roll a year: at each anniversary, and at the end.
    if (isBreakthroughRollWeek(initiative.weeksTotal, initiative.weeksRemaining)) {
      rollBreakthrough(s, initiative, participants);
    }
    if (initiative.weeksRemaining <= 0) concludeInitiative(s, initiative, false);
  }
}
