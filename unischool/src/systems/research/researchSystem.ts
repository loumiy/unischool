import type { Faculty, GameState, Initiative, PrizeAward } from '../../state/types';
import { INITIATIVE_HISTORY_LIMIT, WEEKS_PER_YEAR } from '../../state/types';
import {
  GRANT_PER_PUBLICATION_CHANCE, PUBLICATION_POINTS, annualBreakthroughChance, article, awardChance,
  disciplineVocab, facilitySchool, facultyResearchOutput, initiativeDepth, initiativeWeeklyOutput,
  isBreakthroughRollWeek, rollGrantAmount, rollGrantFunder, rollPrizeName, teamStrength,
} from '../../data/researchData';
import { researchTopic } from '../../data/researchTopics';
import { generateCandidate } from '../../data/facultyData';

// ---------------------------------------------------------------------
// One ordinary pure tick function (see docs/design/research.md). It walks
// the running initiatives — one per research facility — and for each one,
// in this order:
//
//   1. PRODUCTION. The team's weekly output, from who is on it, how deep
//      they committed and what the campus has built. All of the rules live
//      in data/researchData.ts; this only applies them. A run whose whole
//      team has been dismissed is abandoned rather than left running on
//      nobody; one that lost SOME of its people carries on short-handed,
//      which shows in what it produces.
//
//   2. OUTPUTS (Plan 15's PR C — see researchData.ts's guaranteed-output
//      block). Publications are BANKED: the week's output goes toward the
//      next paper, and every PUBLICATION_POINTS of it publishes one, with
//      a grant riding on one paper in five. A breakthrough is ROLLED once
//      a year, at each anniversary and at the end, at a stated chance. All
//      three are SILENT — a log line, landing in a system that already
//      exists — and the clock never stops for them.
//
//   3. CONCLUSION, when the weeks run out. A Funded Project or deeper that
//      somehow banked nothing publishes its concluding paper; the
//      completion itself is worth a credit in researchScore; and then the
//      award is rolled — the one thing that can only happen here, gated on
//      the run having actually banked a breakthrough. A run that produced
//      a breakthrough or an award queues a report; a run that produced
//      papers alone LOGS, and never stops the clock — the review's cut.
//
//   4. OUTPUT REACHES SOMEWHERE. A breakthrough, and every fourth paper,
//      brings a scholar in the field onto the candidate market — "a
//      physicist saw your paper" — and the applicant funnel's research-
//      oriented cohort reads the same tally (cohorts.ts). Small, and the
//      difference between research being a system and being a number.
//
// WHY THIS IS NOT AN EVENT. The decision-event table is for things the
// player RESOLVES: every entry is a prompt with choices and a cash cost.
// A grant and a breakthrough have no decision in them at all, and giving
// them one would turn research into the approve/deny stream the design
// deliberately refuses. Nothing here is an interrupt but the report, and
// the report only for a run that produced a breakthrough or an award.
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
// Research used to be a bank: lab-equipped faculty trickled points into
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

// Every fourth paper out of one project brings a candidate in its field
// onto the market; every breakthrough brings one at once.
const PUBLICATIONS_PER_CANDIDATE_PULL = 4;

// Somebody in the field saw the work. Lands in the standing market the
// same way facultySystem.ts's weekly arrivals do — a listing to appoint or
// let lapse — so a school whose labs are producing has a market that
// notices. The field is one of the team's, drawn from whoever is on it.
function pullCandidate(s: GameState, participants: Faculty[], why: string): void {
  const who = pickFrom(participants);
  if (!who) return;
  const candidate = generateCandidate(who.field, [...s.faculty, ...s.candidates].map((f) => f.name));
  s.candidates.unshift(candidate);
  log(s, `${candidate.name} (${candidate.field}) saw ${why} and is on the market.`, 'info');
}

function publish(s: GameState, initiative: Initiative, participants: Faculty[]): void {
  const vocab = disciplineVocab(facilitySchool(initiative.labId));
  const topic = researchTopic(initiative.topicId);
  const where = topic ? `“${topic.name}”` : 'the project';

  initiative.publications += 1;
  s.research.publications += 1;
  log(s, `${article(vocab.publication)} new ${vocab.publication} out of ${where}.`, 'info');

  // A grant rides on the paper: a strong team pulls more money in — the
  // brief's "faculty research strength improves outcomes", applied where
  // it is most legible.
  if (Math.random() < GRANT_PER_PUBLICATION_CHANCE) {
    const amount = rollGrantAmount(s);
    const scaled = Math.round(amount * (0.7 + teamStrength(participants)));
    s.finance.cash += scaled;
    s.research.grants += 1;
    s.research.grantIncome += scaled;
    initiative.grantIncome += scaled;
    log(s, `${rollGrantFunder(vocab)} has awarded $${scaled.toLocaleString()} to ${where}.`, 'good');
  }

  if (initiative.publications % PUBLICATIONS_PER_CANDIDATE_PULL === 0) {
    pullCandidate(s, participants, `the ${vocab.publication}s out of ${where}`);
  }
}

function rollBreakthrough(s: GameState, initiative: Initiative, participants: Faculty[]): void {
  if (Math.random() >= annualBreakthroughChance(initiative.depth, teamStrength(participants))) return;
  const vocab = disciplineVocab(facilitySchool(initiative.labId));
  const topic = researchTopic(initiative.topicId);
  const where = topic ? `“${topic.name}”` : 'the project';
  initiative.breakthroughs += 1;
  s.research.breakthroughs += 1;
  log(s, `${article(vocab.breakthrough)} ${vocab.breakthrough} out of ${where} has been ${vocab.breakthroughTail}.`, 'good');
  pullCandidate(s, participants, `the ${vocab.breakthrough} out of ${where}`);
}

// The week's production: banked toward the next paper, and every
// PUBLICATION_POINTS publishes one. Deterministic in the output, so the
// offer's "expected N publications" is a promise the run keeps.
function produce(s: GameState, initiative: Initiative, participants: Faculty[]): void {
  const depth = initiativeDepth(initiative.depth);
  const output = initiativeWeeklyOutput(s, participants, depth);
  // Tracked for display only (the Faculty tab's long arc).
  s.research.lifetimePoints += output;
  initiative.banked += output;
  while (initiative.banked >= PUBLICATION_POINTS) {
    initiative.banked -= PUBLICATION_POINTS;
    publish(s, initiative, participants);
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
  let award: PrizeAward | null = null;

  if (!cancelled) {
    // A FUNDED PROJECT OR DEEPER ALWAYS PUBLISHES SOMETHING: eighteen
    // months of two scholars produces a paper however thin the team, and
    // the concluding paper is it. A pilot publishes what it earned.
    if (initiative.depth !== 'pilot' && initiative.publications === 0) publish(s, initiative, participants);

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
        const prizeName = rollPrizeName(disciplineVocab(facilitySchool(initiative.labId)));
        award = { facultyId: winner.id, facultyName: winner.name, field: winner.field, prizeName };
        log(s, `${winner.name} has been awarded ${prizeName} for “${name}”.`, 'good');
      }
    }
    const papers = initiative.publications;
    log(
      s,
      `“${name}” has concluded after ${Math.round(initiative.weeksTotal / WEEKS_PER_YEAR * 10) / 10} years: `
        + `${papers} ${papers === 1 ? 'publication' : 'publications'}, `
        + `${initiative.breakthroughs} ${initiative.breakthroughs === 1 ? 'breakthrough' : 'breakthroughs'}.`,
      'good',
    );

    // THE COMPLETION IS THE EVENT, and the award is one of its results.
    // Queued rather than raised here for the same reason a prize used to
    // be: the week a five-year programme ends may already belong to summer
    // admissions or the U.S. News report, and only one interrupt can be
    // pending at a time. The award's own EFFECTS have already applied
    // above, so a delayed report never delays anything mechanical.
    //
    // A CANCELLED project queues nothing. Winding one up early is the
    // player's own action and already logs; a modal confirming what they
    // just did is noise.
    //
    // NOR DOES A RUN THAT PRODUCED PAPERS ALONE (Plan 15's PR C, the
    // September 2026 review's cut-list item). The most frequent interrupt
    // in the game was a project concluding with nothing to say — a quarter
    // of every modal in a forty-year run. A modal is a thing the game
    // spends the player's attention on, so a run reports only when it did
    // something worth stopping for: a breakthrough, or an award. Papers
    // are logged (above) and appear in the Research tab's history, and
    // Plan 16's toasts will surface the line when they exist.
    const notable = award !== null || initiative.breakthroughs > 0;
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

    produce(s, initiative, participants);

    initiative.weeksRemaining -= 1;
    // One breakthrough roll a year: at each anniversary, and at the end.
    if (isBreakthroughRollWeek(initiative.weeksTotal, initiative.weeksRemaining)) {
      rollBreakthrough(s, initiative, participants);
    }
    if (initiative.weeksRemaining <= 0) concludeInitiative(s, initiative, false);
  }
}
