import type { Faculty, GameState } from '../../state/types';
import { absoluteWeek } from '../../data/eventData';
import {
  CHEAPEST_OUTPUT_COST, RESEARCH_OUTPUTS, RESEARCH_OUTPUT_COOLDOWN_WEEKS,
  disciplineVocab, facultyResearchOutput, researchOutputWeeklyChance, researchingFaculty,
  rollGrantAmount, rollGrantFunder, rollPrizeName, rollProducingSchool, weeklyResearchPoints,
} from '../../data/researchData';
import type { ResearchOutputDef } from '../../data/researchData';

// ---------------------------------------------------------------------
// One ordinary pure tick function (see README's "Research"). Two things
// happen here, in this order:
//
//   1. PRODUCTION. Every faculty member in a school with a finished lab
//      adds their weekly output to the stock. All of the rules — who
//      counts, how seniority and honors weight them, what the campus's
//      finished labs multiply it by — live in data/researchData.ts; this
//      only banks the result.
//
//   2. OUTPUTS. A weighted draw across whatever the current stock can
//      afford, behind the same weekly-chance-plus-cooldown gate the
//      authored decision events use. Two of the three outputs are
//      SILENT — they write a log line and land in a system that already
//      exists, and the clock never stops. The third queues a
//      celebration.
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

// A grant: cash, silently. Routed straight into the operating account the
// same way an estate gift is — financeSystem.ts needs to know nothing
// about research for this to work, which is the point.
function awardGrant(s: GameState): void {
  const amount = rollGrantAmount(s);
  s.finance.cash += amount;
  s.research.grants += 1;
  s.research.grantIncome += amount;
  log(
    s,
    `Research grant: ${rollGrantFunder()} has awarded $${amount.toLocaleString()} to the university's laboratories.`,
    'good',
  );
}

// A breakthrough: prestige, silently, and ONLY through the capped input.
// Note what this does NOT do — it never touches s.self.reputation. It
// increments a monotone count that prestigeSystem.ts's researchScore
// reads as one clamped 0..1 input among seven, so a research-heavy school
// gains at most that input's own weight and still cannot outrun the
// curriculum-breadth term (see prestigeSystem.ts).
function awardBreakthrough(s: GameState): void {
  s.research.breakthroughs += 1;
  // Named by the discipline that produced it (see researchData.ts's
  // DISCIPLINE_VOCAB). Nothing branches on the word — the counter and the
  // prestige input are identical whoever did the work — but "a
  // breakthrough out of the university's labs" is the wrong sentence about
  // a history department, and the log is where the school's own character
  // is most often read.
  const vocab = disciplineVocab(rollProducingSchool(s));
  log(
    s,
    `A ${vocab.breakthrough} out of ${vocab.where} has been published and taken up widely — the school's academic standing is the better for it.`,
    'good',
  );
}

// The cheap, frequent rung. Silent in the same way a grant is: a line in
// the ticker and a counter moving, no interrupt, no decision. Its whole
// job is that a department with one facility and two professors sees its
// scholarship doing SOMETHING within a year or two, rather than waiting a
// decade for the first output it can afford.
function awardPublication(s: GameState): void {
  s.research.publications += 1;
  const vocab = disciplineVocab(rollProducingSchool(s));
  log(s, `A new ${vocab.publication} has come out of ${vocab.where}.`, 'info');
}

// Who wins the prize: a weighted draw across the faculty who are actually
// producing research, by how much they produce. So it usually — but not
// always — goes to a senior star in a well-equipped department, which is
// both plausible and a real reward for having retained them. Returns null
// if nobody qualifies, which can happen if the roster changed between the
// stock being banked and the output firing.
function pickLaureate(s: GameState): Faculty | null {
  const candidates = researchingFaculty(s);
  const total = candidates.reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  for (const f of candidates) {
    roll -= facultyResearchOutput(f);
    if (roll <= 0) return f;
  }
  return candidates[candidates.length - 1];
}

// A prize: the momentous one. The award lands immediately and permanently
// on the winner via the single new Faculty field; the celebration is
// queued for the next quiet week.
//
// Salary is NOT written here even though the prize raises it: salary is
// recomputed from stats + tenure + acclaim on every tick (see
// facultySystem.ts's growFaculty), so bumping acclaim IS the raise, and
// writing a figure here would only be overwritten next week.
function awardPrize(s: GameState): boolean {
  const winner = pickLaureate(s);
  if (winner === null) return false;

  winner.acclaim += 1;
  s.research.prizes += 1;
  const prizeName = rollPrizeName();
  s.research.pendingPrizes.push({
    facultyId: winner.id,
    facultyName: winner.name,
    field: winner.field,
    prizeName,
  });
  log(s, `${winner.name} (${winner.field}) has been awarded ${prizeName}.`, 'good');
  return true;
}

// The trigger model, deliberately identical in shape to
// eventSystem.ts's rollDecisionEvent: a global cooldown, then a weekly
// probability, then a weighted draw across everything eligible. What
// makes the outputs "weighted by accumulated research" is that the stock
// drives BOTH halves of the roll: the eligibility test (an output is only
// in the draw if the stock can pay its pointCost, so the mix shifts from
// grants-only to grants-and-breakthroughs to the occasional prize as the
// research base deepens) and the weekly chance itself. Neither needs a
// schedule of its own per output kind.
function rollResearchOutput(s: GameState): void {
  if (s.research.points < CHEAPEST_OUTPUT_COST) return;

  const week = absoluteWeek(s);
  if (s.research.lastOutputWeek > 0 && week - s.research.lastOutputWeek < RESEARCH_OUTPUT_COOLDOWN_WEEKS) return;
  // The chance itself rises with the banked stock (see researchData.ts's
  // researchOutputWeeklyChance) — a deep research base produces more
  // often, not just richer.
  if (Math.random() >= researchOutputWeeklyChance(s.research.points)) return;

  const affordable = RESEARCH_OUTPUTS.filter((o) => o.pointCost <= s.research.points);
  const chosen = weightedPick(affordable);
  if (!chosen) return;

  // The prize is the one output that can decline to happen (nobody is
  // producing research this week, so there is nobody to award it to). It
  // spends nothing and the week simply stays quiet, rather than falling
  // through to a second-choice output — the same rule the decision-event
  // draw follows, and for the same reason: silently substituting would
  // bias the mix.
  if (chosen.kind === 'prize' && !awardPrize(s)) return;
  if (chosen.kind === 'publication') awardPublication(s);
  if (chosen.kind === 'grant') awardGrant(s);
  if (chosen.kind === 'breakthrough') awardBreakthrough(s);

  s.research.points -= chosen.pointCost;
  s.research.lastOutputWeek = week;
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
  const produced = weeklyResearchPoints(s);
  s.research.points += produced;
  s.research.lifetimePoints += produced;

  rollResearchOutput(s);
}
