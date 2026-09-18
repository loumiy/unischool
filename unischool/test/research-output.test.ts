// ---------------------------------------------------------------------
// Research that produces something (Plan 15's PR C — see researchData.ts's
// guaranteed-output block and researchSystem.ts). Publications are banked
// off output rather than rolled; a breakthrough is rolled once a year at
// a stated chance; a Funded Project always publishes; a run with papers
// alone logs and never stops the clock; the odds the offer states are the
// odds the run applies; output reaches the candidate market and the
// applicant pool; and research standing's breadth term divides by fields.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { tickResearch } from '../src/systems/research/researchSystem';
import { researchStandingBreakdown } from '../src/systems/prestige/prestigeSystem';
import { deriveCohortSignals, cohortDemandFactor, NEUTRAL_COHORT_SIGNALS } from '../src/systems/admissions/cohorts';
import { labFields, researchSchools } from '../src/data/techData';
import { RESEARCH_TOPICS } from '../src/data/researchTopics';
import {
  PUBLICATION_POINTS, annualBreakthroughChance, breakthroughRolls, initiativeDepth, initiativeOdds,
  initiativeOffers, initiativeWeeklyOutput, isBreakthroughRollWeek, labEquippedFields, researchableFields,
} from '../src/data/researchData';
import type { Faculty, GameState, InitiativeDepth } from '../src/state/types';

let seed = 4242;
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
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

// A lab with a two-scholar team on a project of the given depth, at week
// one. The team's research stat is high, so the weekly output is real.
function running(depth: InitiativeDepth, research = 80): { s: GameState; labId: string; team: Faculty[] } {
  const s = createInitialState('Output');
  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
  lab.status = 'done';
  s.self.universityCharterOffered = true;
  const field = labFields(lab.id)[0];
  const topic = RESEARCH_TOPICS.find((t) => t.fields.length === 1 && t.fields[0] === field)!;
  const def = initiativeDepth(depth);
  const team: Faculty[] = Array.from({ length: def.participants }, (_, i) => {
    const f = {
      id: `test-${i}`, name: `Professor ${i}`, field, teaching: 60, research,
      acclaim: 0, courseSlots: 3, salary: 100_000, tenureWeeks: 100,
    } as Faculty;
    s.faculty.push(f);
    return f;
  });
  s.research.initiatives[lab.id] = {
    labId: lab.id, topicId: topic.id, depth, participantIds: team.map((f) => f.id),
    weeksTotal: def.weeks, weeksRemaining: def.weeks,
    publications: 0, breakthroughs: 0, grantIncome: 0, banked: 0,
  };
  return { s, labId: lab.id, team };
}

// Never lands a grant, a breakthrough or an award: the deterministic half alone.
const never = () => 0.999;

console.log('research output tests');

// ---- publications are banked off output, deterministically ----
{
  Math.random = never;
  const { s, labId, team } = running('project');
  const weekly = initiativeWeeklyOutput(s, team, initiativeDepth('project'));
  assert(weekly > 0, `the team produces (${weekly.toFixed(2)} a week)`);
  const weeksToFirst = Math.ceil(PUBLICATION_POINTS / weekly);
  for (let w = 0; w < weeksToFirst - 1; w += 1) tickResearch(s);
  assert(s.research.initiatives[labId].publications === 0, `nothing published before ${weeksToFirst} weeks of banking`);
  assert(s.research.initiatives[labId].banked > 0, 'but output is banked toward it');
  tickResearch(s);
  assert(s.research.initiatives[labId].publications === 1, 'the first paper lands the week the bank fills');
  assert(s.research.publications === 1, 'and counts for the school');
  assert(s.research.initiatives[labId].banked < PUBLICATION_POINTS, 'with the remainder carried');
  Math.random = seededRandom;
}

// ---- the offer's expected publications are what the run delivers ----
{
  Math.random = never;
  const { s, labId, team } = running('project');
  const odds = initiativeOdds(s, initiativeDepth('project'), team);
  const initiative = s.research.initiatives[labId];
  while (s.research.initiatives[labId]) tickResearch(s);
  const delivered = s.research.completedInitiatives[0].publications;
  assert(
    Math.abs(delivered - odds.publications) <= 1,
    `a project delivers about the publications the offer promised (promised ${odds.publications.toFixed(1)}, delivered ${delivered})`,
  );
  assert(initiative.weeksTotal === 78, 'over its full run');
  Math.random = seededRandom;
}

// ---- a Funded Project always publishes something; a pilot publishes what it earned ----
{
  Math.random = never;
  const thin = running('project', 1);
  while (thin.s.research.initiatives[thin.labId]) tickResearch(thin.s);
  assert(thin.s.research.completedInitiatives[0].publications >= 1, 'the weakest team still concludes a project with a paper');

  const pilot = running('pilot', 1);
  while (pilot.s.research.initiatives[pilot.labId]) tickResearch(pilot.s);
  assert(pilot.s.research.completedInitiatives[0].publications === 0, 'a pilot with nothing banked publishes nothing');
  assert(pilot.s.research.pendingCompletions.length === 0, 'and queues no report');
  assert(pilot.s.log.some((l) => l.message.includes('has concluded')), 'but logs its ending');
  Math.random = seededRandom;
}

// ---- a run with papers alone logs and never stops the clock ----
{
  Math.random = never;
  const { s, labId } = running('program');
  while (s.research.initiatives[labId]) tickResearch(s);
  const done = s.research.completedInitiatives[0];
  assert(done.publications > 1 && done.breakthroughs === 0, `a program that only published (${done.publications} papers, no breakthrough)`);
  assert(s.research.pendingCompletions.length === 0, 'does not report — the review\'s cut');
  assert(s.log.some((l) => l.message.includes('has concluded') && l.message.includes('publications')), 'it logs what it produced');
  Math.random = seededRandom;
}

// ---- a breakthrough is rolled once a year, and a run that lands one reports ----
{
  assert(breakthroughRolls(26) === 1 && breakthroughRolls(78) === 2 && breakthroughRolls(156) === 3 && breakthroughRolls(260) === 5, 'one roll per started year');
  assert(isBreakthroughRollWeek(78, 26) && !isBreakthroughRollWeek(78, 25) && isBreakthroughRollWeek(78, 0), 'at each anniversary and at the end');

  // Always lands: every roll is a breakthrough, so the count is the rolls.
  Math.random = () => 0;
  const { s, labId } = running('program');
  let rolls = 0;
  while (s.research.initiatives[labId]) {
    const before = s.research.initiatives[labId].breakthroughs;
    tickResearch(s);
    const after = s.research.initiatives[labId]?.breakthroughs ?? s.research.completedInitiatives[0].breakthroughs;
    if (after > before) rolls += 1;
  }
  assert(rolls === 3, `a three-year program rolls three times (${rolls})`);
  assert(s.research.pendingCompletions.length === 1, 'and a run with a breakthrough reports');
  Math.random = seededRandom;
}

// ---- the odds: stated before the commitment, off the same functions ----
{
  const { s, team } = running('program');
  const strong = initiativeOdds(s, initiativeDepth('program'), team);
  const weak = initiativeOdds(s, initiativeDepth('program'), team.map((f) => ({ ...f, research: 20 })));
  assert(strong.publications > weak.publications, 'a stronger team expects more papers');
  assert(strong.breakthroughChance > weak.breakthroughChance, 'and a better breakthrough chance');
  assert(strong.awardChance > weak.awardChance, 'and a better award chance');
  assert(strong.rolls === 3, 'over three rolls');
  assert(near(strong.breakthroughChance, 1 - (1 - strong.annualBreakthroughChance) ** 3), 'the run chance is at-least-one over the rolls');
  const pilot = initiativeOdds(s, initiativeDepth('pilot'), team.slice(0, 1));
  const landmark = initiativeOdds(s, initiativeDepth('landmark'), team.concat(team));
  assert(pilot.breakthroughChance < strong.breakthroughChance && strong.breakthroughChance < landmark.breakthroughChance, 'deeper is likelier');
  assert(annualBreakthroughChance('landmark', 1.4) <= 0.85, 'and capped');

  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
  const offers = initiativeOffers(s, lab.id);
  assert(offers.every((o) => o.odds !== undefined), 'every offer carries its odds');
}

// ---- output reaches somewhere: the market, and the pool ----
{
  Math.random = () => 0;
  const { s, labId } = running('project');
  const before = s.candidates.length;
  // The first tick of the run is not a roll week; the anniversary is.
  while (s.research.initiatives[labId] && s.research.initiatives[labId].breakthroughs === 0) tickResearch(s);
  assert(s.candidates.length > before, 'a breakthrough brings a scholar in the field onto the market');
  assert(s.log.some((l) => l.message.includes('is on the market')), 'and says so');
  Math.random = seededRandom;

  const signals = deriveCohortSignals(s);
  assert(signals.researchOutput > 0, 'the applicant funnel reads what the labs produced');
  const pulled = cohortDemandFactor({ ...NEUTRAL_COHORT_SIGNALS, researchOutput: 3 }, 20_000, 20_000);
  const neutral = cohortDemandFactor(NEUTRAL_COHORT_SIGNALS, 20_000, 20_000);
  assert(pulled > neutral, 'and the research-oriented cohort is pulled by it');
}

// ---- research standing's breadth divides by fields, not schools ----
{
  const s = createInitialState('Breadth');
  const fields = researchableFields();
  const schools = researchSchools().filter((school) => school.fields.length > 0);
  assert(fields.length > schools.length, `there are more researchable fields (${fields.length}) than schools with labs (${schools.length})`);
  const lab = s.tech.find((t) => t.kind === 'facility' && t.facilityType === 'lab')!;
  lab.status = 'done';
  const equipped = labEquippedFields(s).size;
  const breadth = researchStandingBreakdown(s).inputs.find((i) => i.key === 'breadth')!;
  assert(near(breadth.score, equipped / fields.length), `one lab reads ${equipped} of ${fields.length} fields (${breadth.score.toFixed(3)})`);
  assert(breadth.score < 0.5, 'and is nowhere near pinned');
}

console.log(`research output: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
