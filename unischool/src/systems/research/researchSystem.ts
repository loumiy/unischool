import type { Faculty, GameState, Initiative } from '../../state/types';
import { INITIATIVE_HISTORY_LIMIT, WEEKS_PER_YEAR } from '../../state/types';
import {
  RESEARCH_OUTPUTS, article, awardChance, disciplineVocab, facilitySchool, facultyResearchOutput,
  initiativeDepth, initiativeOutputChance, initiativeWeeklyOutput, rollGrantAmount,
  rollGrantFunder, rollPrizeName, teamStrength,
} from '../../data/researchData';
import { researchTopic } from '../../data/researchTopics';
import type { ResearchOutputDef, ResearchOutputKind } from '../../data/researchData';

// ---------------------------------------------------------------------
// One ordinary pure tick function (see README's "Research"). It walks the
// running initiatives — one per research facility — and for each one, in
// this order:
//
//   1. PRODUCTION. The team's weekly output, from who is on it, how deep
//      they committed and what the campus has built. All of the rules live
//      in data/researchData.ts; this only applies them. A run whose whole
//      team has been dismissed is abandoned rather than left running on
//      nobody; one that lost SOME of its people carries on short-handed,
//      which shows in what it produces.
//
//   2. OUTPUTS. A weighted draw across publications, grants and
//      breakthroughs, behind the same weekly-chance gate the authored
//      decision events use. All three are SILENT — they write a log line
//      and land in a system that already exists, and the clock never stops.
//
//   3. CONCLUSION, when the weeks run out. The completion itself is worth
//      a credit in researchScore, and then the award is rolled — the one
//      thing that can only happen here, gated on the run having actually
//      banked a breakthrough. That queues a celebration.
//
// WHY THIS IS NOT AN EVENT. The decision-event table is for things the
// player RESOLVES: every entry is a prompt with choices and a cash cost.
// A grant and a breakthrough have no decision in them at all, and giving
// them one would turn research into the approve/deny stream the design
// deliberately refuses. What is reused is the CADENCE MACHINERY — the
// weekly chance, the global cooldown, the weighted draw, absoluteWeek —
// not the interrupt.
//
// WHY THE PRIZE IS QUEUED RATHER THAN FIRED. Exactly the reason
// techSystem.ts queues milestones: the week a prize lands may already
// belong to the summer admissions decision or the U.S. News report, and
// only one interrupt can be pending at a time. Firing it here would mean
// the single most momentous thing in a decade of research silently not
// happening. The AWARD itself (the badge, the salary and output premium)
// is applied here, the week it is won — the celebration is a report on
// something that already happened, like a milestone celebration, so a
// delayed modal never delays the effect.
// ---------------------------------------------------------------------

function log(s: GameState, message: string, kind: 'info' | 'good' | 'bad'): void {
  s.log.unshift({ year: s.clock.year, week: s.clock.week, message, kind });
}

// =====================================================================
// THE INITIATIVE LOOP — what replaced the stock.
//
// Scholarship used to be a bank: lab-equipped faculty trickled points into
// one campus-wide pool every week, and the pool occasionally bought an
// output. That produced research because the school OWNED A BUILDING, with
// no decision anywhere in it.
//
// Now the player commissions the work — a topic, a team, a depth, out of a
// specific facility — and this runs it. The randomness is all still here
// and does the same job; what changed is that it resolves something the
// player chose rather than resolving everything. Idle capacity produces
// nothing (decision 7): the way to produce is to start something.
// =====================================================================

const OUTPUT_KINDS_DURING_RUN: readonly ResearchOutputKind[] = ['publication', 'grant', 'breakthrough'];

// The during-run draw: the same weighted table the old bank used, minus
// the prize, which is now judged at conclusion instead (see concludeInitiative).
function rollDuringRunOutput(s: GameState, initiative: Initiative, participants: Faculty[]): void {
  const depth = initiativeDepth(initiative.depth);
  const output = initiativeWeeklyOutput(s, participants, depth);
  if (Math.random() >= initiativeOutputChance(output)) return;

  const eligible = RESEARCH_OUTPUTS.filter((o) => OUTPUT_KINDS_DURING_RUN.includes(o.kind));
  const chosen = weightedPick(eligible);
  if (!chosen) return;

  // The vocabulary of the school whose facility this work is running in —
  // not of whoever on campus happens to publish most (see
  // researchData.ts's facilitySchool for what that got wrong).
  const vocab = disciplineVocab(facilitySchool(initiative.labId));
  const topic = researchTopic(initiative.topicId);
  const where = topic ? `“${topic.name}”` : 'the project';

  if (chosen.kind === 'publication') {
    initiative.publications += 1;
    s.research.publications += 1;
    log(s, `${article(vocab.publication)} new ${vocab.publication} out of ${where}.`, 'info');
  } else if (chosen.kind === 'grant') {
    const amount = rollGrantAmount(s);
    // A strong team pulls more money in — the brief's "faculty research
    // strength improves outcomes", applied where it is most legible.
    const scaled = Math.round(amount * (0.7 + teamStrength(participants)));
    s.finance.cash += scaled;
    s.research.grants += 1;
    s.research.grantIncome += scaled;
    initiative.grantIncome += scaled;
    log(s, `${rollGrantFunder(vocab)} has awarded $${scaled.toLocaleString()} to ${where}.`, 'good');
  } else {
    initiative.breakthroughs += 1;
    s.research.breakthroughs += 1;
    log(s, `${article(vocab.breakthrough)} ${vocab.breakthrough} out of ${where} has been ${vocab.breakthroughTail}.`, 'good');
  }
}

// The end of a run. The payoff is the completion itself (a credit in
// researchScore, sized by depth), and then the one thing that can only
// happen here: the award roll, gated on the work having actually produced
// a breakthrough.
function concludeInitiative(s: GameState, initiative: Initiative, cancelled: boolean): void {
  const participants = s.faculty.filter((f) => initiative.participantIds.includes(f.id));
  const topic = researchTopic(initiative.topicId);
  const name = topic?.name ?? 'the project';
  let award: string | null = null;

  if (!cancelled) {
    const strength = teamStrength(participants);
    if (Math.random() < awardChance(initiative.depth, strength, initiative.breakthroughs)) {
      // Drawn from the team that did the work, weighted by their own
      // output — so it usually, but not always, goes to the strongest
      // person on it.
      const winner = pickFrom(participants);
      if (winner) {
        winner.acclaim += 1;
        s.research.prizes += 1;
        // Named by the discipline that won it, same as every other log
        // line this run produced: an award for Scientific Achievement is
        // the wrong trophy for a five-year work of history.
        award = rollPrizeName(disciplineVocab(facilitySchool(initiative.labId)));
        s.research.pendingPrizes.push({
          facultyId: winner.id, facultyName: winner.name, field: winner.field, prizeName: award,
        });
        log(s, `${winner.name} has been awarded ${award} for “${name}”.`, 'good');
      }
    }
    log(s, `“${name}” has concluded after ${Math.round(initiative.weeksTotal / WEEKS_PER_YEAR * 10) / 10} years.`, 'good');
  }

  s.research.completedInitiatives.unshift({
    topicId: initiative.topicId,
    depth: initiative.depth,
    year: s.clock.year,
    facultyNames: participants.map((f) => f.name),
    publications: initiative.publications,
    breakthroughs: initiative.breakthroughs,
    grantIncome: initiative.grantIncome,
    award,
    ...(cancelled ? { cancelled: true as const } : {}),
  });
  s.research.completedInitiatives = s.research.completedInitiatives.slice(0, INITIATIVE_HISTORY_LIMIT);
  delete s.research.initiatives[initiative.labId];
}

// Exported so the reducer's CANCEL_INITIATIVE can end one the same way the
// tick does, rather than forking the bookkeeping.
export function endInitiative(s: GameState, labId: string, cancelled: boolean): void {
  const initiative = s.research.initiatives[labId];
  if (!initiative) return;
  concludeInitiative(s, initiative, cancelled);
}

function pickFrom(participants: Faculty[]): Faculty | null {
  const total = participants.reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  if (total <= 0) return participants[0] ?? null;
  let roll = Math.random() * total;
  for (const f of participants) {
    roll -= facultyResearchOutput(f);
    if (roll <= 0) return f;
  }
  return participants[participants.length - 1];
}

function weightedPick(outputs: readonly ResearchOutputDef[]): ResearchOutputDef | null {
  const total = outputs.reduce((sum, o) => sum + o.weight, 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  for (const output of outputs) {
    roll -= output.weight;
    if (roll <= 0) return output;
  }
  return outputs[outputs.length - 1];
}

export function tickResearch(s: GameState): void {
  // A facility whose initiative has lost its whole team — every
  // participant dismissed — cannot continue, and is ended rather than left
  // running on nobody. A team that lost SOME of its people carries on
  // short-handed, which is the honest outcome and shows in what it produces.
  for (const initiative of Object.values(s.research.initiatives)) {
    const participants = s.faculty.filter((f) => initiative.participantIds.includes(f.id));
    if (participants.length === 0) {
      const topic = researchTopic(initiative.topicId);
      log(s, `“${topic?.name ?? 'A project'}” has been abandoned — nobody is left on it.`, 'bad');
      concludeInitiative(s, initiative, true);
      continue;
    }

    // Production is tracked for display only; what the run actually
    // produces is the draw below (see researchData.ts's initiative block).
    s.research.lifetimePoints += initiativeWeeklyOutput(s, participants, initiativeDepth(initiative.depth));

    rollDuringRunOutput(s, initiative, participants);

    initiative.weeksRemaining -= 1;
    if (initiative.weeksRemaining <= 0) concludeInitiative(s, initiative, false);
  }
}
