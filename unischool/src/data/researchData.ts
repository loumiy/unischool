import type { Faculty, GameState, InitiativeDepth } from '../state/types';
import { RESEARCH_TOPICS, isCrossDisciplinary, type ResearchTopic } from './researchTopics';
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
// It is campus-wide rather than per-school on purpose: a research library
// serves whoever is using it, and an initiative is already tied to its own
// facility and its own team, which is what keeps schools distinct. This is
// shared equipment on top of that.
export function researchRateMultiplier(s: GameState): number {
  const bonus = s.tech
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.effects?.researchRateBonus ?? 0), 0);
  return 1 + bonus;
}

// The campus's research CAPACITY: what the equipped roster could be
// producing, if it were all committed. Nothing banks this any more — the
// stock it used to feed is gone (see README's "Research"), and what a run
// actually produces is initiativeWeeklyOutput on the initiatives that are
// actually running. This survives as a SIGNAL: the admissions funnel reads
// it for applicant appeal (cohorts.ts), and the balance sim prints it as
// its rsch/wk column. Keep it a pure read of the roster and the facilities,
// not of what happens to be commissioned this week.
export function weeklyResearchPoints(s: GameState): number {
  const equipped = labEquippedFields(s);
  if (equipped.size === 0) return 0;
  const raw = s.faculty
    .filter((f) => equipped.has(f.field))
    .reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  return raw * researchRateMultiplier(s);
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
  { kind: 'publication', pointCost: 90, weight: 26 },
  { kind: 'grant', pointCost: 300, weight: 6 },
  // Weighted against the award gate as much as against the log. A run
  // that banks no breakthrough can never end in a prize however strong its
  // team (see awardChance), so pushing this too low does not make awards
  // rare — it makes them impossible, which is a different and worse thing.
  { kind: 'breakthrough', pointCost: 750, weight: 5 },
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
// Sized DOWN from the 1.2-3.0 the single-stock model used, for the same
// reason the output odds came down: grants used to be rare campus-wide
// because one bank fed them, and are now drawn by every running project
// independently. A grant is a welcome cheque, not a funding round.
const GRANT_MIN_WEEKS = 0.4;
const GRANT_MAX_WEEKS = 1.2;

export function rollGrantAmount(s: GameState): number {
  const weeks = GRANT_MIN_WEEKS + Math.random() * (GRANT_MAX_WEEKS - GRANT_MIN_WEEKS);
  return Math.round(Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * weeks);
}

// Grant funders and prize names are FLAVOR ONLY — nothing branches on
// which one is drawn — but a log line that names a body reads as an event
// rather than as a number appearing in the balance, and naming the WRONG
// body reads as a bug. Both tables are authored per discipline; see "What
// the work is called" below.

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

export function rollGrantFunder(vocab: DisciplineVocab): string {
  return pick([...SHARED_FUNDERS, ...vocab.funders]);
}

export function rollPrizeName(vocab: DisciplineVocab): string {
  return pick([...SHARED_PRIZES, ...vocab.prizes]);
}

// =====================================================================
// WHAT THE WORK IS CALLED, by the discipline that did it.
//
// One shared table over one shared mechanism — the same rule the graduate
// programs follow. Nothing branches on these: a publication costs the same
// points and moves the same counter whoever produced it. What changes is
// the WORDS, because "a breakthrough out of the university's labs" is
// simply the wrong sentence about a history department, and a system that
// can only describe scholarship as laboratory science is one that quietly
// tells four schools their work does not count.
//
// Three things are named, not one. The first pass did only the outputs,
// which left a monograph out of the Humanities Research Institute funded
// by a defense research agency and rewarded with an award for Scientific
// Achievement — the sentence around the word was still wrong. Funders and
// prize names are authored per discipline for the same reason the output
// nouns are.
//
// Each discipline's funders and prizes are drawn from a SHARED neutral
// pool plus its own additions, rather than a complete list each. A trust
// or a federal research council funds anybody; the National Science
// Foundation does not fund a film. That keeps the authored content to the
// part that actually differs, and means a new school needs a couple of
// lines rather than a full table.
// =====================================================================

// Fictional, like every other institution the game names (see
// facultyData.ts's universities).
const SHARED_FUNDERS: readonly string[] = [
  'the Kellner Foundation',
  'a federal research council',
  'the Marchmont Trust',
  'the Halvorsen Endowment',
];

// Discipline-neutral prize names. One is drawn per award purely so two
// prizes in one run don't read as the same trophy handed out twice.
const SHARED_PRIZES: readonly string[] = [
  'the Halvorsen Prize',
  'the Marchmont Medal',
  'the Ravensmoor Prize',
  'the International Prize for Advancement of Knowledge',
];

export interface DisciplineVocab {
  publication: string;             // the cheap, frequent output
  breakthrough: string;            // the rare, prestigious one
  /** How the rare one reached the world, finishing the sentence
   *  "<An> <breakthrough> out of <topic> has been ___." A film is not
   *  published and a monograph is not screened, so the VERB is authored
   *  per discipline exactly as the noun is — getting the noun right and
   *  then publishing it anyway only moves where the sentence is wrong. */
  breakthroughTail: string;
  funders: readonly string[];      // added to SHARED_FUNDERS for this discipline
  prizes: readonly string[];       // added to SHARED_PRIZES for this discipline
}

// "A acclaimed work" is what authoring the noun alone gets you. The
// article has to follow whatever word the table happens to supply, so it
// is computed rather than baked into the log template.
export function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? 'An' : 'A';
}

// The lab sciences, engineering and health — the schools whose work the
// original single vocabulary was written for, so this is what it says.
const DEFAULT_VOCAB: DisciplineVocab = {
  publication: 'paper',
  breakthrough: 'breakthrough',
  breakthroughTail: 'published and taken up widely',
  funders: ['the National Science Foundation', 'an industrial research consortium'],
  prizes: ['the Kellner Award for Scientific Achievement'],
};

const DISCIPLINE_VOCAB: Record<string, DisciplineVocab> = {
  'Social Sciences & Humanities': {
    publication: 'monograph',
    breakthrough: 'landmark work of scholarship',
    breakthroughTail: 'published to wide acclaim',
    funders: ['the National Endowment for the Humanities', 'the Ravensmoor Library Fellowship'],
    prizes: ['the Ashcombe Prize for Historical Scholarship'],
  },
  'Business': {
    publication: 'case study',
    breakthrough: 'influential study',
    breakthroughTail: 'published and widely cited',
    funders: ['a central bank research office', 'the Institute for Economic Research'],
    prizes: ['the Ashcombe Medal in Economic Sciences'],
  },
  'Arts & Media': {
    publication: 'exhibited work',
    breakthrough: 'acclaimed work',
    breakthroughTail: 'shown and widely praised',
    funders: ['the National Arts Council', 'the Delacourt Film Fund'],
    prizes: ['the Delacourt Award for Artistic Achievement'],
  },
  'Computer Science': {
    publication: 'paper',
    breakthrough: 'breakthrough',
    breakthroughTail: 'published and taken up widely',
    funders: ['the National Science Foundation', 'a technology research consortium'],
    prizes: ['the Vance Prize in Computing'],
  },
  'Engineering': {
    publication: 'paper',
    breakthrough: 'breakthrough',
    breakthroughTail: 'published and put into practice',
    funders: ['a defense research agency', 'an industrial research consortium'],
    prizes: ['the Kellner Award for Scientific Achievement'],
  },
  'Health Science': {
    publication: 'paper',
    breakthrough: 'clinical breakthrough',
    breakthroughTail: 'published and taken into the clinic',
    funders: ['the Institute of Health Sciences', 'a medical research charity'],
    prizes: ['the Kellner Award for Medicine'],
  },
};

export function disciplineVocab(schoolName: string | null): DisciplineVocab {
  return (schoolName && DISCIPLINE_VOCAB[schoolName]) || DEFAULT_VOCAB;
}

// WHICH SCHOOL AN OUTPUT CAME OUT OF: the one whose facility the work is
// running in. Nothing else would be right — an initiative IS a topic, a
// team and a facility, and the facility is the half of that with a school.
//
// This replaced a campus-wide weighted draw across everyone producing
// scholarship. That was the correct reading under the old model, where
// production genuinely was the whole equipped roster trickling into one
// pool and no output belonged to anybody in particular. Against
// initiatives it is simply wrong, and visibly so: a project in the
// Humanities Research Institute logged "a new paper" whenever the campus
// also ran physics labs, because the draw landed on a physicist who had
// nothing to do with it.
//
// Returns null for a facility that belongs to no school, which cannot
// happen with the seeded catalogue but keeps this total — the caller
// falls back to DEFAULT_VOCAB.
export function facilitySchool(labId: string): string | null {
  for (const school of researchSchools()) {
    if (school.labIds.includes(labId)) return school.schoolName;
  }
  return null;
}

// =====================================================================
// INITIATIVES — player-directed scholarship.
//
// THE LAB IS THE SLOT. Each research facility hosts one initiative at a
// time, and the record is keyed by the facility's own id, so "one per
// lab" is an invariant of the data shape rather than a rule some system
// has to remember. A facility is vacant exactly when it has no key.
//
// That constraint is doing real work. Before it, research was something a
// campus did because it owned a building; now the number of things a
// university can pursue at once is the number of places it has built to
// pursue them in, which makes "should we build another facility" a
// question with an obvious, countable answer. It also scales itself:
// thirteen facilities exist across the catalogue, so a young school runs
// one project and a mature one runs a dozen, with no separate tuning.
//
// WHAT THE RANDOMNESS DOES NOW. All of it is kept — grants, breakthroughs
// and publications still arrive on a weighted draw behind a cooldown, the
// same two-dial machinery the decision events use. What changed is which
// end the player touches: they choose the area, the people and the depth,
// and the dice resolve that rather than resolving everything.
// =====================================================================

export interface InitiativeDepthDef {
  key: InitiativeDepth;
  name: string;
  participants: number;
  weeks: number;
  /** Up-front funding, in weeks of operating cost — the same scaling device
   *  grants and the decision-event table use, so the figure stays sane
   *  across four orders of magnitude of budget. */
  fundingWeeks: number;
  /** Multiplier on weekly output, and on how often an output lands. */
  intensity: number;
  /** Requires a cross-disciplinary topic. Landmark only. */
  requiresCrossDisciplinary?: true;
  blurb: string;
}

// Durations against WEEKS_PER_YEAR: six months, a year and a half, three
// years, five. A Landmark Program costs four people's entire teaching load
// for five years (see techSystem.ts's committed-faculty rule), which is
// the real price of it — the money is the smaller half.
export const INITIATIVE_DEPTHS: readonly InitiativeDepthDef[] = [
  {
    key: 'pilot', name: 'Pilot Study', participants: 1, weeks: 26, fundingWeeks: 0.5, intensity: 1,
    blurb: 'One scholar, six months. Publications, and a grant now and then.',
  },
  {
    key: 'project', name: 'Funded Project', participants: 2, weeks: 78, fundingWeeks: 1.6, intensity: 1.35,
    blurb: 'Two scholars, eighteen months. Regular grants, and a real chance of a breakthrough.',
  },
  {
    key: 'program', name: 'Major Program', participants: 3, weeks: 156, fundingWeeks: 4, intensity: 1.8,
    blurb: 'Three scholars, three years. Breakthroughs likely; an award is possible.',
  },
  {
    key: 'landmark', name: 'Landmark Program', participants: 4, weeks: 260, fundingWeeks: 9, intensity: 2.4,
    requiresCrossDisciplinary: true,
    blurb: 'Four scholars across disciplines, five years. The work prizes are given for.',
  },
];

export function initiativeDepth(key: InitiativeDepth): InitiativeDepthDef {
  return INITIATIVE_DEPTHS.find((d) => d.key === key) ?? INITIATIVE_DEPTHS[0];
}

export function initiativeFundingCost(s: GameState, depth: InitiativeDepthDef): number {
  return Math.round(Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * depth.fundingWeeks);
}

// A team's combined strength, 0..1-ish: mean research stat plus the
// acclaim its members already carry. What drives both how much the work
// produces and how likely it is to end in an award.
export function teamStrength(participants: readonly Faculty[]): number {
  if (participants.length === 0) return 0;
  // The RESEARCH STAT, not facultyResearchOutput. They are different
  // scales and confusing them is silent: output is points per week (a
  // small number, ~1-4), so dividing it by 100 produced a "strength" of
  // about 0.02 for every team ever assembled — which made the grant
  // scaling and the award roll into constants and quietly deleted the
  // one thing the brief asked for, that stronger faculty get better
  // outcomes. The stat is already 0..100 and is what "how good are these
  // scholars" means.
  const mean = participants.reduce((sum, f) => sum + f.research, 0) / participants.length;
  const acclaim = participants.reduce((sum, f) => sum + f.acclaim, 0);
  return Math.min(1.4, mean / 100 + ACCLAIM_TEAM_STRENGTH_BONUS * acclaim);
}

// A prize already won makes its winner better at winning the next one.
const ACCLAIM_TEAM_STRENGTH_BONUS = 0.08;

// THE INTERDISCIPLINARY BONUS, and the reason breadth pays off twice. A
// team drawn from several departments produces meaningfully more than the
// same people would apart — which is what makes a wide university worth
// building, rather than a deep one worth drilling.
const INTERDISCIPLINARY_BONUS_PER_EXTRA_FIELD = 0.18;

export function interdisciplinaryBonus(participants: readonly Faculty[]): number {
  const fields = new Set(participants.map((f) => f.field));
  return 1 + INTERDISCIPLINARY_BONUS_PER_EXTRA_FIELD * Math.max(0, fields.size - 1);
}

// One week of an initiative's output. Everything that shapes it is
// something the player chose: who is on it, how deep they committed, what
// the campus has built.
export function initiativeWeeklyOutput(
  s: GameState, participants: readonly Faculty[], depth: InitiativeDepthDef,
): number {
  const raw = participants.reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  return raw * depth.intensity * interdisciplinaryBonus(participants) * researchRateMultiplier(s);
}

// How likely an output lands this week. Rises with what the project is
// actually producing, floored by the same global cooldown the decision
// events use, so a deep well-staffed program is eventful and a lone pilot
// study is quiet without either needing a schedule of its own.
// TUNED AGAINST THE WHOLE CAMPUS, not one project. These read as modest
// per-initiative odds and they have to: a mature university runs a dozen
// facilities at once for decades, so the campus-wide rate is this number
// times thirteen times two thousand weeks. The first pass used a rate that
// felt right for a single project and produced grant income worth a fifth
// of the university's lifetime operating cost — a second economy, which is
// exactly what README's "Research" says grants must never become.
const INITIATIVE_OUTPUT_CHANCE_MIN = 0.005;
const INITIATIVE_OUTPUT_CHANCE_MAX = 0.034;
const INITIATIVE_OUTPUT_FULL_RATE = 40; // weekly output at which the chance tops out

export function initiativeOutputChance(weeklyOutput: number): number {
  const t = Math.min(1, weeklyOutput / INITIATIVE_OUTPUT_FULL_RATE);
  return INITIATIVE_OUTPUT_CHANCE_MIN + (INITIATIVE_OUTPUT_CHANCE_MAX - INITIATIVE_OUTPUT_CHANCE_MIN) * t;
}

// THE AWARD, at conclusion and nowhere else.
//
// Moved out of the output table entirely: a prize is no longer a weighted
// draw against a bank, it is what a finished piece of work is judged to
// have been. Gated on the run having produced at least one breakthrough —
// no breakthrough, no award, however strong the team — then rolled on team
// strength and depth with real noise on top, so a Landmark Program with a
// distinguished team has a genuine chance and a pilot study essentially
// never does.
//
// The point of the move is the story: a Nobel now arrives attached to a
// named topic, a named team and five years, rather than to a counter
// crossing a threshold.
// Tuned for roughly three to five awards across a forty-year run at a
// strong school. The sim reads lower than that (one or two) and is
// expected to: its heuristic refuses to thin a department, so it almost
// never commissions the Landmark Programs that are where awards actually
// come from. A player chasing prestige commissions them deliberately, so
// the honest target sits above what the harness measures — which is why
// these are nudged rather than fitted to the sim's own number.
const AWARD_BASE_BY_DEPTH: Record<InitiativeDepth, number> = {
  pilot: 0.015, project: 0.07, program: 0.2, landmark: 0.45,
};
// How much of the roll the TEAM accounts for. The offset is deliberately
// small: at 0.45 the depth tier swamped everybody, and a mediocre landmark
// team came out barely behind a distinguished one, which makes the choice
// of who to commit not matter. At 0.15 a strong team roughly doubles a
// weak one's odds at the same depth, which is the point.
const AWARD_TEAM_FLOOR = 0.15;

export function awardChance(depth: InitiativeDepth, strength: number, breakthroughs: number): number {
  if (breakthroughs <= 0) return 0;
  const depthBase = AWARD_BASE_BY_DEPTH[depth];
  // Each breakthrough past the first helps, with diminishing returns.
  const breakthroughFactor = 1 + 0.35 * Math.log2(breakthroughs + 1);
  return Math.min(0.85, depthBase * (AWARD_TEAM_FLOOR + strength) * breakthroughFactor);
}

// What finishing one is worth to the school's standing, in the same
// credits researchScore counts breakthroughs and prizes in (see
// prestigeSystem.ts). Finishing a five-year program is an achievement in
// itself, separate from whatever it happened to produce along the way.
export const INITIATIVE_COMPLETION_CREDIT: Record<InitiativeDepth, number> = {
  pilot: 0.3, project: 1, program: 2.5, landmark: 6,
};

// =====================================================================
// WHAT IS ON OFFER AT A VACANT FACILITY.
//
// Derived, never stored. Offers are a deterministic function of the
// facility's id and a slowly-turning epoch, so they are STABLE across
// renders (a list that reshuffled every repaint would be unusable) and
// they TURN OVER every few months, which is what makes "what came up this
// time" a small piece of texture rather than a fixed menu. No state, no
// migration, nothing to keep in sync.
//
// A topic is eligible when the university can actually staff it: somebody
// free in every field it names, and at least one of those fields taught by
// the facility's own school — a physics lab does not host a monograph on
// Shakespeare.
// =====================================================================

const OFFER_EPOCH_WEEKS = 13; // offers turn over each quarter

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface InitiativeOffer {
  depth: InitiativeDepthDef;
  topic: ResearchTopic;
  /** The strongest eligible person per required field, in field order —
   *  what the picker pre-fills, and what a one-click start commits. */
  suggested: Faculty[];
  fundingCost: number;
  /** Why this option cannot be taken, if it cannot. */
  blockedReason?: string;
}

// Everyone who could join an initiative right now: on the roster, in the
// field, and not already committed elsewhere. Deliberately NOT filtered on
// teaching load — joining costs them their courses, it does not require
// them to be free of any first.
export function availableScholars(s: GameState, field: string): Faculty[] {
  return s.faculty
    .filter((f) => f.field === field)
    .filter((f) => !Object.values(s.research.initiatives).some((i) => i.participantIds.includes(f.id)))
    .sort((a, b) => facultyResearchOutput(b) - facultyResearchOutput(a) || a.id.localeCompare(b.id));
}

// The offer set for one vacant facility: one option per depth tier, each
// carrying a topic drawn from what this school could actually run.
export function initiativeOffers(s: GameState, labId: string, schoolFields: readonly string[]): InitiativeOffer[] {
  const epoch = Math.floor((s.clock.year * WEEKS_PER_YEAR + s.clock.week) / OFFER_EPOCH_WEEKS);
  const fieldSet = new Set(schoolFields);

  const runnable = RESEARCH_TOPICS.filter((topic) => topic.fields.some((f) => fieldSet.has(f)));

  return INITIATIVE_DEPTHS.map((depth, depthIndex) => {
    const pool = runnable.filter((topic) => {
      if (depth.requiresCrossDisciplinary && !isCrossDisciplinary(topic)) return false;
      // A team of N cannot cover more than N fields.
      return topic.fields.length <= depth.participants;
    });
    const topic = pool.length === 0
      ? null
      : pool[hashString(`${labId}:${depth.key}:${epoch}`) % pool.length];

    if (!topic) {
      return {
        depth,
        topic: { id: 'none', name: '—', fields: [] },
        suggested: [],
        fundingCost: initiativeFundingCost(s, depth),
        blockedReason: depth.requiresCrossDisciplinary
          ? 'No interdisciplinary topic this school can lead'
          : 'No topic available for this school',
      } satisfies InitiativeOffer;
    }

    // One scholar per required field, strongest first; then fill the rest
    // of the team from whichever of those fields still has people, so a
    // four-person landmark on a two-field topic is staffable.
    const used = new Set<string>();
    const suggested: Faculty[] = [];
    for (const field of topic.fields) {
      const pick = availableScholars(s, field).find((f) => !used.has(f.id));
      if (pick) { used.add(pick.id); suggested.push(pick); }
    }
    if (suggested.length === topic.fields.length) {
      const extras = topic.fields
        .flatMap((field) => availableScholars(s, field))
        .filter((f) => !used.has(f.id))
        .sort((a, b) => facultyResearchOutput(b) - facultyResearchOutput(a));
      for (const extra of extras) {
        if (suggested.length >= depth.participants) break;
        used.add(extra.id);
        suggested.push(extra);
      }
    }

    const missing = topic.fields.filter((field) => !suggested.some((f) => f.field === field));
    const blockedReason = missing.length > 0
      ? `No ${missing.join(' or ')} scholar free`
      : suggested.length < depth.participants
        ? `Needs ${depth.participants} scholars; ${suggested.length} free`
        : s.finance.cash < initiativeFundingCost(s, depth)
          ? 'Not enough cash for the up-front funding'
          : undefined;

    // Unused, but kept in signature order for the caller's convenience.
    void depthIndex;
    return { depth, topic, suggested, fundingCost: initiativeFundingCost(s, depth), blockedReason } satisfies InitiativeOffer;
  });
}
