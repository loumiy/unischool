import type { Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { researchSchools } from './techData';

// ---------------------------------------------------------------------
// RESEARCH, AS AUTHORED DATA — the tuning and the output table.
// systems/research/researchSystem.ts is one ordinary pure tick function
// that reads what is here; the same split eventData.ts/eventSystem.ts
// already use.
//
// WHAT RESEARCH IS. Faculty in a school that has finished a lab produce
// research points every week, weighted by how good and how senior they
// are. Those points accumulate into a stock, and every so often the stock
// converts into one of three outputs:
//
//   GRANT        -> cash, sized in weeks of opex so it scales across a run
//                   spanning four orders of magnitude of budget.
//   BREAKTHROUGH -> a durable count that feeds ONE CAPPED PRESTIGE INPUT
//                   (prestigeSystem.ts's researchScore). Never a direct
//                   nudge to s.self.reputation — see below.
//   PRIZE        -> the momentous one: a named faculty member gains a
//                   permanent honor, a permanent research and salary
//                   premium, and a heavier share of that same prestige
//                   input.
//
// WHAT RESEARCH IS NOT. It is deliberately NOT a second stream of
// approve/deny decisions on top of the authored decision events. Grants
// and breakthroughs resolve SILENTLY — a log line, and the effect lands
// in a system that already exists (cash in financeSystem's balance, a
// prestige input in prestigeSystem's target). Only a prize stops the
// clock, and a prize costs years of accumulated research to reach. The
// mid-game stays a build-and-price game with research running quietly
// underneath it.
//
// WHAT AN OUTPUT MAY AND MAY NOT TOUCH — the same rule the decision-event
// table lives under, and the load-bearing one here:
//   - Prestige is NEVER written directly. s.self.reputation is a
//     slow-moving stock that drifts toward a computed target once a year
//     (see prestigeSystem.ts), and a breakthrough that added a point to
//     it would be exactly the completion-bonus flow that model exists to
//     forbid. A breakthrough therefore increments a COUNT, and that count
//     is one clamped input to the target, weighted like every other one:
//     it can contribute at most its own share and can never substitute
//     for curriculum breadth.
//   - Cash is fair game, because cash is a stock the player spends: a
//     grant is the same kind of thing an estate gift already is.
//   - A prize writes ONE new field on ONE Faculty (acclaim), which the
//     salary and research-output formulas read. It does not write
//     teaching, research or salary, because facultySystem.ts recomputes
//     all three from potential + tenure every single tick and would erase
//     the award the following week.
// ---------------------------------------------------------------------

// =====================================================================
// PRODUCTION — who researches, and how much
// =====================================================================

// Points a faculty member with a research stat of 100, no tenure and no
// honors produces in a week. The whole scale is arbitrary and internal;
// what matters is its ratio to the output costs below. Set so a mature
// lab-equipped department of ~12 produces roughly 500-700 points between
// outputs, i.e. a grant is regularly affordable, a breakthrough often is,
// and a prize takes years of banking.
const RESEARCH_POINTS_PER_WEEK_AT_MAX = 1.0;

// Seniority premium. "Senior faculty produce more" is the point of the
// weighting, and tenure is the game's only measure of seniority (faculty
// are ageless — see README's "Faculty"). Same exponential-approach shape
// as every other tenure curve in the game, deliberately slower than the
// stat curve: a professor's research OUTPUT keeps climbing on reputation,
// students and standing collaborations long after their research STAT has
// plateaued.
const RESEARCH_SENIORITY_PREMIUM_MAX = 0.8;   // at full maturity, a senior produces 1.8x what the same stats produce on day one
const RESEARCH_SENIORITY_PLATEAU_YEARS = 12;
const RESEARCH_SENIORITY_PLATEAU_FRACTION = 0.95;
const RESEARCH_SENIORITY_RATE_PER_WEEK =
  1 - (1 - RESEARCH_SENIORITY_PLATEAU_FRACTION) ** (1 / (RESEARCH_SENIORITY_PLATEAU_YEARS * WEEKS_PER_YEAR));

// What one prize is permanently worth to its winner's own output. Reads
// Faculty.acclaim, which is the only reason that field exists on the type
// (see types.ts).
export const ACCLAIM_RESEARCH_BONUS = 0.5;

// The quality half of the weighting: the research stat itself, normalized.
// Teaching is deliberately absent — a great lecturer who publishes nothing
// contributes nothing here, which is what makes the two stats mean
// different things when the player is choosing between two candidates.
export function facultyResearchOutput(f: Faculty): number {
  const seniority = 1 - (1 - RESEARCH_SENIORITY_RATE_PER_WEEK) ** f.tenureWeeks;
  return (
    RESEARCH_POINTS_PER_WEEK_AT_MAX *
    (f.research / 100) *
    (1 + RESEARCH_SENIORITY_PREMIUM_MAX * seniority) *
    (1 + ACCLAIM_RESEARCH_BONUS * f.acclaim)
  );
}

// Every faculty field that currently has a lab to work in: a field
// belonging to at least one school with at least one FINISHED lab (see
// techData.ts's researchSchools). This is the gate the whole feature
// hangs off, and it is the one invariant that must survive any later
// refactor: no lab, no research.
//
// Labs are themselves gated on their school's building (authored in
// techData.ts's lab prereqs), so the full chain is school building ->
// lab -> research, and a school that has built nothing contributes
// exactly zero however many professors it employs.
export function labEquippedFields(s: GameState): Set<string> {
  const fields = new Set<string>();
  for (const school of researchSchools()) {
    const hasLab = school.labIds.some(
      (id) => s.tech.find((t) => t.id === id)?.status === 'done',
    );
    if (!hasLab) continue;
    for (const field of school.fields) fields.add(field);
  }
  return fields;
}

// The campus-wide multiplier on output: 1 plus the sum of
// effects.researchRateBonus across every FINISHED Buildable that carries
// one (today the labs themselves and the research library). Live-read off
// s.tech, the same contract satisfactionSystem/financeSystem use for
// their own effect reads — nothing is ever mutated into state when a lab
// finishes.
//
// It is campus-wide rather than per-school on purpose: research points
// are one aggregate stock (see types.ts's ResearchState), so a second,
// per-school multiplier would need a per-school ledger to apply to. The
// gate above is what keeps schools distinct; this is shared equipment.
export function researchRateMultiplier(s: GameState): number {
  const bonus = s.tech
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.effects?.researchRateBonus ?? 0), 0);
  return 1 + bonus;
}

// This week's research production. Pure — the tick applies it, and the
// Faculty tab renders it, so what the player is shown is exactly what
// accumulates.
export function weeklyResearchPoints(s: GameState): number {
  const equipped = labEquippedFields(s);
  if (equipped.size === 0) return 0;
  const raw = s.faculty
    .filter((f) => equipped.has(f.field))
    .reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  return raw * researchRateMultiplier(s);
}

// The subset of the roster currently producing anything — what the
// Faculty tab counts, and what the prize is drawn from.
export function researchingFaculty(s: GameState): Faculty[] {
  const equipped = labEquippedFields(s);
  return s.faculty.filter((f) => equipped.has(f.field));
}

// =====================================================================
// CADENCE — how often an output lands
//
// Deliberately the same two-dial trigger model as the authored decision
// events (see eventData.ts): a per-week probability floored by a global
// cooldown, then a weighted draw across whatever is eligible. No second
// scheduler, and the frequency stays a one-line dial.
//
// The weekly chance is not flat: it scales with the BANKED STOCK, between
// the two bounds below. That is the second half of "weighted by
// accumulated research" — the first half is which outputs the stock can
// afford at all (see pointCost below). A school that has just built its
// first lab produces something roughly every 47 weeks and it is always a
// grant; a mature research university with a deep bank produces every ~21
// weeks and can draw the whole table. Without the scaling, frequency
// would be constant the moment the cheapest output became affordable and
// only the MIX would respond to investment, which reads as "research
// happens at a fixed rate regardless of how much you put into it".
//
// Both bounds are deliberately low. Even at full tilt that is ~2.5 outputs
// a year against two fixed annual interrupts and roughly one decision
// event — and two of the three are SILENT, so what the player is actually
// stopped for is a prize roughly once every seven years at maximum
// research output, and never at all before the labs are deep.
// =====================================================================

export const RESEARCH_OUTPUT_COOLDOWN_WEEKS = 14;         // minimum quiet stretch between ANY two research outputs
const RESEARCH_OUTPUT_WEEKLY_CHANCE_MIN = 0.03;           // a school scraping past the cheapest output
const RESEARCH_OUTPUT_WEEKLY_CHANCE_MAX = 0.15;           // a school with a deep bank
const RESEARCH_POINTS_FOR_MAX_CHANCE = 3_500;

export function researchOutputWeeklyChance(points: number): number {
  const depth = Math.max(0, Math.min(1, points / RESEARCH_POINTS_FOR_MAX_CHANCE));
  return RESEARCH_OUTPUT_WEEKLY_CHANCE_MIN +
    (RESEARCH_OUTPUT_WEEKLY_CHANCE_MAX - RESEARCH_OUTPUT_WEEKLY_CHANCE_MIN) * depth;
}

// The three outputs. `pointCost` is the accumulated research an output
// SPENDS when it fires — which is how "weighted by accumulated research"
// is expressed: a school with a thin research base can only ever afford
// grants, one that has been investing for a decade unlocks breakthroughs,
// and a prize needs years of banked work on top of that. `weight` sets
// the mix among whatever is currently affordable.
export type ResearchOutputKind = 'publication' | 'grant' | 'breakthrough' | 'prize';

export interface ResearchOutputDef {
  kind: ResearchOutputKind;
  pointCost: number;
  weight: number;
}

export const RESEARCH_OUTPUTS: readonly ResearchOutputDef[] = [
  // The bottom rung, and the reason it exists: the other three all cost
  // enough that a young department's first decade of scholarship was a
  // long silence broken by a grant. A cheap, frequent output gives a
  // school something to show from its first year of having a facility at
  // all — and gives the humanities an output that reads right, since a
  // monograph is what that work actually produces and "a breakthrough" is
  // not (see DISCIPLINE_VOCAB).
  { kind: 'publication', pointCost: 90, weight: 22 },
  { kind: 'grant', pointCost: 300, weight: 10 },
  { kind: 'breakthrough', pointCost: 750, weight: 6 },
  // Rare twice over: it is the most expensive output AND the least likely
  // of the three even once affordable. Both dials matter — the cost keeps
  // it out of the early game entirely, the weight keeps it from becoming
  // routine in the late game, when points are plentiful.
  { kind: 'prize', pointCost: 4_000, weight: 1 },
];

export const CHEAPEST_OUTPUT_COST = Math.min(...RESEARCH_OUTPUTS.map((o) => o.pointCost));

// =====================================================================
// GRANTS — cash, sized in weeks of operating cost
//
// The same scaling device the decision-event table uses, and for the same
// reason: a flat dollar figure would be a crisis in year 3 and a rounding
// error in year 40. Sized at the low end of the event table's gift range
// (an estate gift is 2-5 weeks) so grants read as a real but ordinary
// income line rather than a second economy — see the PR notes for what
// they actually came to as a share of income across the sim runs.
// =====================================================================
const MIN_OPEX_SCALE = 45_000; // floor, matching eventData.ts, so a young school still produces sane figures
const GRANT_MIN_WEEKS = 1.2;
const GRANT_MAX_WEEKS = 3.0;

export function rollGrantAmount(s: GameState): number {
  const weeks = GRANT_MIN_WEEKS + Math.random() * (GRANT_MAX_WEEKS - GRANT_MIN_WEEKS);
  return Math.round(Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * weeks);
}

// The funders a grant can come from. Flavor only — nothing branches on
// which one it is — but a log line that names a body reads as an event
// rather than as a number appearing in the balance.
const GRANT_FUNDERS: readonly string[] = [
  'the National Science Foundation',
  'the Kellner Foundation',
  'a federal research council',
  'the Marchmont Trust',
  'a defense research agency',
  'the Institute of Health Sciences',
  'an industrial research consortium',
];

// =====================================================================
// PRIZES — the one momentous output
//
// Fictional, like every other institution the game names (see
// facultyData.ts's universities). One is drawn per award purely so two
// prizes in one run don't read as the same trophy handed out twice.
// =====================================================================
const PRIZE_NAMES: readonly string[] = [
  'the Halvorsen Prize',
  'the Marchmont Medal',
  'the Ravensmoor Prize',
  'the Kellner Award for Scientific Achievement',
  'the International Prize for Advancement of Knowledge',
];

// What a prize permanently buys its winner, beyond the badge:
//   - research output: ACCLAIM_RESEARCH_BONUS, above.
//   - salary: facultyData.ts's ACCLAIM_SALARY_PREMIUM, which lives with
//     the rest of the salary curve so there is one file to read to know
//     what a hire costs. A laureate is instantly the most expensive
//     person on the payroll and stays that way — the cost side of an
//     award whose other effects are all upside.
//   - prestige: a heavier share of the same capped research input a
//     breakthrough feeds (see prestigeSystem.ts's researchScore). Never a
//     direct write.

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollGrantFunder(): string {
  return pick(GRANT_FUNDERS);
}

export function rollPrizeName(): string {
  return pick(PRIZE_NAMES);
}

// =====================================================================
// WHAT THE WORK IS CALLED, by the discipline that did it.
//
// One shared table over one shared mechanism — the same rule the graduate
// programs follow. Nothing branches on these: a publication costs the same
// points and moves the same counter whoever produced it. What changes is
// the word, because "a breakthrough out of the university's labs" is
// simply the wrong sentence about a history department, and a system that
// can only describe scholarship as laboratory science is one that quietly
// tells four schools their work does not count.
// =====================================================================
interface DisciplineVocab {
  publication: string;   // the cheap, frequent output
  breakthrough: string;  // the rare, prestigious one
  where: string;         // where it came out of, for the log line
}

const DEFAULT_VOCAB: DisciplineVocab = {
  publication: 'paper',
  breakthrough: 'breakthrough',
  where: 'the university\'s laboratories',
};

const DISCIPLINE_VOCAB: Record<string, DisciplineVocab> = {
  'Social Sciences & Humanities': {
    publication: 'monograph',
    breakthrough: 'landmark work of scholarship',
    where: 'the Humanities Research Institute',
  },
  'Business': {
    publication: 'case study',
    breakthrough: 'influential study',
    where: 'the university\'s economists',
  },
  'Arts & Media': {
    publication: 'exhibited work',
    breakthrough: 'acclaimed work',
    where: 'the university\'s studios',
  },
  'Computer Science': {
    publication: 'paper',
    breakthrough: 'breakthrough',
    where: 'the Computing Research Center',
  },
};

export function disciplineVocab(schoolName: string | null): DisciplineVocab {
  return (schoolName && DISCIPLINE_VOCAB[schoolName]) || DEFAULT_VOCAB;
}

// Which school an output came out of: a weighted draw across the faculty
// actually producing scholarship, by how much they produce, then the
// school their field teaches in. So the vocabulary tracks where the work
// is really happening — a campus whose only facility is the Humanities
// Research Institute describes its output as monographs, and one running
// labs everywhere mostly says papers, without either being a special case.
//
// Returns null when nobody is producing, which is the same "nothing
// happened this week" the prize draw already handles.
export function rollProducingSchool(s: GameState): string | null {
  const producing = researchingFaculty(s);
  const total = producing.reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  let winner = producing[producing.length - 1];
  for (const f of producing) {
    roll -= facultyResearchOutput(f);
    if (roll <= 0) { winner = f; break; }
  }

  const equipped = labEquippedFields(s);
  for (const school of researchSchools()) {
    if (!school.fields.includes(winner.field)) continue;
    if (!school.labIds.some((id) => s.tech.find((t) => t.id === id)?.status === 'done')) continue;
    if (!equipped.has(winner.field)) continue;
    return school.schoolName;
  }
  return null;
}
