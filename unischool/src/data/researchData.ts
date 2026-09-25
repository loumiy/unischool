import type { Faculty, GameState, InitiativeDepth } from '../state/types';
import { RESEARCH_TOPICS, isCrossDisciplinary, type ResearchTopic } from './researchTopics';
import { WEEKS_PER_YEAR } from '../state/types';
import { hostableFields, researchSchools } from './techData';
import { random } from '../engine/random';

// Research tuning and tables; systems/research/researchSystem.ts applies
// them each tick. Outputs never write prestige directly: breakthroughs,
// prizes and completions are counts feeding one capped input
// (prestigeSystem.ts's researchScore). Grants are cash. A prize writes only
// Faculty.acclaim, because facultySystem.ts recomputes teaching, research
// and salary every tick and would erase anything else.

// === Production ===

// Weekly points at research stat 100, no tenure, no honors. The scale is
// internal; what matters is its ratio to PUBLICATION_POINTS.
const RESEARCH_POINTS_PER_WEEK_AT_MAX = 1.0;

// Seniority premium on tenure (faculty are ageless), slower than the stat
// curve: output keeps climbing after the research stat plateaus.
const RESEARCH_SENIORITY_PREMIUM_MAX = 0.8;   // at full maturity, a senior produces 1.8x what the same stats produce on day one
const RESEARCH_SENIORITY_PLATEAU_YEARS = 12;
const RESEARCH_SENIORITY_PLATEAU_FRACTION = 0.95;
const RESEARCH_SENIORITY_RATE_PER_WEEK =
  1 - (1 - RESEARCH_SENIORITY_PLATEAU_FRACTION) ** (1 / (RESEARCH_SENIORITY_PLATEAU_YEARS * WEEKS_PER_YEAR));

// What one prize (Faculty.acclaim) is permanently worth to its winner's output.
export const ACCLAIM_RESEARCH_BONUS = 0.5;

// Teaching is deliberately absent, so the two stats mean different things.
export function facultyResearchOutput(f: Faculty): number {
  const seniority = 1 - (1 - RESEARCH_SENIORITY_RATE_PER_WEEK) ** f.tenureWeeks;
  return (
    RESEARCH_POINTS_PER_WEEK_AT_MAX *
    (f.research / 100) *
    (1 + RESEARCH_SENIORITY_PREMIUM_MAX * seniority) *
    (1 + ACCLAIM_RESEARCH_BONUS * f.acclaim)
  );
}

// Fields belonging to a school with at least one finished lab
// (techData.ts's researchSchools). The invariant: no lab, no research.
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

// 1 plus effects.researchRateBonus across finished Buildables, read live
// off s.tech. Campus-wide on purpose: shared equipment on top of each
// initiative's own facility and team.
export function researchRateMultiplier(s: GameState): number {
  const bonus = s.tech
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.effects?.researchRateBonus ?? 0), 0);
  return 1 + bonus;
}

// What the equipped roster could produce if fully committed. Not banked
// anywhere; a signal for cohorts.ts and the balance sim's rsch/wk column.
// Keep it a pure read of roster and facilities, not of running initiatives.
export function weeklyResearchPoints(s: GameState): number {
  const equipped = labEquippedFields(s);
  if (equipped.size === 0) return 0;
  const raw = s.faculty
    .filter((f) => equipped.has(f.field))
    .reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  return raw * researchRateMultiplier(s);
}

// === Grants ===
// Sized in weeks of opex, like the decision events, so a grant is neither a
// crisis in year 3 nor a rounding error in year 40.
const MIN_OPEX_SCALE = 45_000; // floor, matching eventData.ts, so a young school still produces sane figures
// Every running project draws grants independently, so each is small: a
// welcome cheque, not a funding round.
const GRANT_MIN_WEEKS = 0.4;
const GRANT_MAX_WEEKS = 1.2;

export function rollGrantAmount(s: GameState): number {
  const weeks = GRANT_MIN_WEEKS + random() * (GRANT_MAX_WEEKS - GRANT_MIN_WEEKS);
  return Math.round(Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * weeks);
}

// Grant funders and prize names are flavor only, authored per discipline
// (below). A prize's salary premium is facultyData.ts's
// ACCLAIM_SALARY_PREMIUM.

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

export function rollGrantFunder(vocab: DisciplineVocab): string {
  return pick([...SHARED_FUNDERS, ...vocab.funders]);
}

export function rollPrizeName(vocab: DisciplineVocab): string {
  return pick([...SHARED_PRIZES, ...vocab.prizes]);
}

// === What the work is called, by discipline ===
// Words only; nothing branches on them. Each discipline adds its own
// funders and prizes to shared neutral pools.

// Fictional, like every other institution the game names (see
// facultyData.ts's universities).
const SHARED_FUNDERS: readonly string[] = [
  'the Kellner Foundation',
  'a federal research council',
  'the Marchmont Trust',
  'the Halvorsen Endowment',
];

// Discipline-neutral prize names.
const SHARED_PRIZES: readonly string[] = [
  'the Halvorsen Prize',
  'the Marchmont Medal',
  'the Ravensmoor Prize',
  'the International Prize for Advancement of Knowledge',
];

export interface DisciplineVocab {
  publication: string;             // the cheap, frequent output
  breakthrough: string;            // the rare, prestigious one
  /** Finishes "<An> <breakthrough> out of <topic> has been ___." Authored
   *  per discipline: a film is not published. */
  breakthroughTail: string;
  funders: readonly string[];      // added to SHARED_FUNDERS for this discipline
  prizes: readonly string[];       // added to SHARED_PRIZES for this discipline
}

// "An acclaimed work", not "A acclaimed work".
export function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? 'An' : 'A';
}

// The lab sciences' vocabulary, used when no discipline entry applies.
const DEFAULT_VOCAB: DisciplineVocab = {
  publication: 'paper',
  breakthrough: 'breakthrough',
  breakthroughTail: 'published and taken up widely',
  funders: ['the National Science Foundation', 'an industrial research consortium'],
  prizes: ['the Kellner Award for Scientific Achievement'],
};

// "Scholarship" here is deliberate: it is the Humanities' own word for the
// work, not a name for the research system.
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
    funders: ['a defence research agency', 'an industrial research consortium'],
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

// The school whose facility the work runs in. Null for a facility in no
// school (not possible in the seeded catalogue); callers fall back to
// DEFAULT_VOCAB.
export function facilitySchool(labId: string): string | null {
  for (const school of researchSchools()) {
    if (school.labIds.includes(labId)) return school.schoolName;
  }
  return null;
}

// === Initiatives: player-directed research ===
// The lab is the slot: initiatives are keyed by facility id, so "one per
// facility" is a property of the data shape, and the number of concurrent
// projects is the number of facilities built.

export interface InitiativeDepthDef {
  key: InitiativeDepth;
  name: string;
  participants: number;
  weeks: number;
  /** Up-front funding, in weeks of operating cost. */
  fundingWeeks: number;
  /** Multiplier on weekly output, and on how often an output lands. */
  intensity: number;
  /** Requires a cross-disciplinary topic. Landmark only. */
  requiresCrossDisciplinary?: true;
  blurb: string;
}

// Six months, eighteen months, three years, five. Each participant also
// gives up course slots (techSystem.ts's RESEARCH_COMMITMENT_SLOTS).
export const INITIATIVE_DEPTHS: readonly InitiativeDepthDef[] = [
  {
    key: 'pilot', name: 'Pilot Study', participants: 1, weeks: 26, fundingWeeks: 0.4, intensity: 1,
    blurb: 'One scholar, six months. Publications, and a grant now and then.',
  },
  {
    key: 'project', name: 'Funded Project', participants: 2, weeks: 78, fundingWeeks: 1.0, intensity: 1.35,
    blurb: 'Two scholars, eighteen months. Regular grants, and a real chance of a breakthrough.',
  },
  {
    key: 'program', name: 'Major Program', participants: 3, weeks: 156, fundingWeeks: 2.2, intensity: 1.8,
    blurb: 'Three scholars, three years. Breakthroughs likely; an award is possible.',
  },
  {
    key: 'landmark', name: 'Landmark Program', participants: 4, weeks: 260, fundingWeeks: 4.0, intensity: 2.4,
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

// A team's strength, 0..1.4: mean research stat plus acclaim. Drives grant
// size, breakthrough and award odds.
export function teamStrength(participants: readonly Faculty[]): number {
  if (participants.length === 0) return 0;
  // The research stat (0..100), not facultyResearchOutput, which is points
  // per week (~1-4) and would make every team's strength about 0.02.
  const mean = participants.reduce((sum, f) => sum + f.research, 0) / participants.length;
  const acclaim = participants.reduce((sum, f) => sum + f.acclaim, 0);
  return Math.min(1.4, mean / 100 + ACCLAIM_TEAM_STRENGTH_BONUS * acclaim);
}

// A prize already won makes its winner better at winning the next one.
const ACCLAIM_TEAM_STRENGTH_BONUS = 0.08;

// A team drawn from several fields produces more than the same people
// apart, rewarding a broad university.
const INTERDISCIPLINARY_BONUS_PER_EXTRA_FIELD = 0.18;

export function interdisciplinaryBonus(participants: readonly Faculty[]): number {
  const fields = new Set(participants.map((f) => f.field));
  return 1 + INTERDISCIPLINARY_BONUS_PER_EXTRA_FIELD * Math.max(0, fields.size - 1);
}

// One week of an initiative's output.
export function initiativeWeeklyOutput(
  s: GameState, participants: readonly Faculty[], depth: InitiativeDepthDef,
): number {
  const raw = participants.reduce((sum, f) => sum + facultyResearchOutput(f), 0);
  return raw * depth.intensity * interdisciplinaryBonus(participants) * researchRateMultiplier(s);
}

// The award, rolled only at conclusion and only if the run produced a
// breakthrough, on depth and team strength. Tuned for three to five awards
// in forty years at a strong school. The sim reads lower (one or two)
// because it rarely commissions Landmark Programs, so these are not fitted
// to the sim's number.
const AWARD_BASE_BY_DEPTH: Record<InitiativeDepth, number> = {
  pilot: 0.015, project: 0.07, program: 0.2, landmark: 0.45,
};
// Kept small so team matters: at 0.15 a strong team roughly doubles a weak
// one's odds at the same depth.
const AWARD_TEAM_FLOOR = 0.15;

export function awardChance(depth: InitiativeDepth, strength: number, breakthroughs: number): number {
  if (breakthroughs <= 0) return 0;
  const depthBase = AWARD_BASE_BY_DEPTH[depth];
  // Each breakthrough past the first helps, with diminishing returns.
  const breakthroughFactor = 1 + 0.35 * Math.log2(breakthroughs + 1);
  return Math.min(0.85, depthBase * (AWARD_TEAM_FLOOR + strength) * breakthroughFactor);
}

// Completion credit in researchScore's units (prestigeSystem.ts), separate
// from whatever the run produced.
export const INITIATIVE_COMPLETION_CREDIT: Record<InitiativeDepth, number> = {
  pilot: 0.3, project: 1, program: 2.5, landmark: 6,
};

// === Guaranteed output (applied in researchSystem.ts) ===
// Publications are banked: every PUBLICATION_POINTS of output publishes
// one, so the offer's expected count is output times length. A breakthrough
// is rolled at each anniversary and at conclusion. Grants ride on
// publications.
export const PUBLICATION_POINTS = 90;            // banked output per paper
export const GRANT_PER_PUBLICATION_CHANCE = 0.2; // a grant rides on roughly one paper in five

// Per-roll breakthrough chance by depth, before team strength. Sized so a
// Funded Project with an ordinary team lands one roughly every other run,
// a Major Program most runs, and a pilot study rarely.
const BREAKTHROUGH_BASE_BY_DEPTH: Record<InitiativeDepth, number> = {
  pilot: 0.04, project: 0.14, program: 0.26, landmark: 0.36,
};
const BREAKTHROUGH_TEAM_FLOOR = 0.5;
const BREAKTHROUGH_CHANCE_CAP = 0.85;

export function annualBreakthroughChance(depth: InitiativeDepth, strength: number): number {
  return Math.min(BREAKTHROUGH_CHANCE_CAP, BREAKTHROUGH_BASE_BY_DEPTH[depth] * (BREAKTHROUGH_TEAM_FLOOR + strength));
}

// How many rolls a run of this length gets: one per started year.
export function breakthroughRolls(weeks: number): number {
  return Math.max(1, Math.ceil(weeks / WEEKS_PER_YEAR));
}

// Whether this week is a roll: an anniversary of the start, or the end.
export function isBreakthroughRollWeek(weeksTotal: number, weeksRemaining: number): boolean {
  const elapsed = weeksTotal - weeksRemaining;
  return weeksRemaining <= 0 || (elapsed > 0 && elapsed % WEEKS_PER_YEAR === 0);
}

// What this team at this depth should expect, from the same functions the
// tick applies, so the offer cannot promise odds the run does not give.
export interface InitiativeOdds {
  publications: number;        // expected papers over the run
  annualBreakthroughChance: number;
  rolls: number;               // breakthrough rolls over the run
  breakthroughChance: number;  // at least one breakthrough, over the run
  awardChance: number;         // an award at conclusion, over the run
}

export function initiativeOdds(
  s: GameState, depth: InitiativeDepthDef, participants: readonly Faculty[],
): InitiativeOdds {
  const weekly = initiativeWeeklyOutput(s, participants, depth);
  const strength = teamStrength(participants);
  const annual = annualBreakthroughChance(depth.key, strength);
  const rolls = breakthroughRolls(depth.weeks);
  const atLeastOne = 1 - (1 - annual) ** rolls;
  const banked = (weekly * depth.weeks) / PUBLICATION_POINTS;
  return {
    publications: depth.key === 'pilot' ? banked : Math.max(1, banked),
    annualBreakthroughChance: annual,
    rolls,
    breakthroughChance: atLeastOne,
    // Priced at one breakthrough: the common case, and an honest floor for
    // a run that lands more.
    awardChance: atLeastOne * awardChance(depth.key, strength, 1),
  };
}

// Every field any lab-holding school covers: the denominator of
// prestigeSystem.ts's research breadth term.
export function researchableFields(): string[] {
  const fields = new Set<string>();
  for (const school of researchSchools()) for (const field of school.fields) fields.add(field);
  return [...fields];
}

// === Offers at a vacant facility ===
// Derived, never stored: a deterministic function of facility id and a
// quarterly epoch, so offers are stable across renders and turn over.

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
  /** The bet at the suggested team's strength (see initiativeOdds). */
  odds: InitiativeOdds;
  /** Why this option cannot be taken, if it cannot. */
  blockedReason?: string;
}

// Rostered faculty in the field not already on an initiative. Not filtered
// on teaching load: joining costs course slots but does not require free ones.
export function availableScholars(s: GameState, field: string): Faculty[] {
  return s.faculty
    .filter((f) => f.field === field)
    .filter((f) => !Object.values(s.research.initiatives).some((i) => i.participantIds.includes(f.id)))
    .sort((a, b) => facultyResearchOutput(b) - facultyResearchOutput(a) || a.id.localeCompare(b.id));
}

// One option per depth tier, each with a topic this facility can run: one
// naming a field the facility hosts (its own, or its school's unequipped
// fields: techData.ts's hostableFields), and, if the topic names facilities
// (ResearchTopic.labs), this one among them. The pool is derived from the
// id so a caller cannot pass the wrong fields. An unknown id yields four
// blocked tiers.
export function initiativeOffers(s: GameState, labId: string): InitiativeOffer[] {
  const epoch = Math.floor((s.clock.year * WEEKS_PER_YEAR + s.clock.week) / OFFER_EPOCH_WEEKS);
  const fieldSet = new Set(hostableFields(labId));

  const runnable = RESEARCH_TOPICS.filter((topic) => (
    topic.fields.some((f) => fieldSet.has(f)) && (!topic.labs || topic.labs.includes(labId))
  ));

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
        odds: initiativeOdds(s, depth, []),
        blockedReason: depth.requiresCrossDisciplinary
          ? 'No interdisciplinary topic this facility can lead'
          : 'No topic available for this facility',
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
    return {
      depth, topic, suggested, fundingCost: initiativeFundingCost(s, depth),
      odds: initiativeOdds(s, depth, suggested.slice(0, depth.participants)), blockedReason,
    } satisfies InitiativeOffer;
  });
}
