import type { DowntownState, FestivalScale, FestivalYear, GameState } from '../state/types';
import type { CatalogueEvent } from './eventCatalogueTypes';
import { AUTUMN_POINTS } from './speedUpData';

// ---------------------------------------------------------------------
// The downtown and the festival (Plan 85H): the student-life
// specialization's mechanic. Once a college specializes in student life, the
// town drawn beside the campus (components/ringLand.ts, Plan 81) grows into a
// downtown district over about ten years. The district meets part of the
// students' social, dining and housing needs (off-campus places,
// satisfactionSystem.ts), the college holds a festival each spring (a raised
// inbox matter, FESTIVAL_EVENT), and the town's goodwill rises and falls with
// the festivals and the town-and-gown events (eventCatalogue.ts, gated on
// the district). The student-life pillar's specialization term reads the
// festivals held over the last ten years, carried by the district's growth
// and the town's goodwill (downtownReading).
//
// The numbers, the reading and the words. The rules are
// systems/studentlife/downtown.ts's. Imports nothing but types, so
// specializationData.ts (which prestige reads) and satisfactionSystem.ts can
// read it without joining an import cycle. Every size here is a proposal of
// Plan 85H, for the owner's review.
// ---------------------------------------------------------------------

// The town's goodwill, 0 to 100: where it starts.
export const GOODWILL_START = 50;
export const GOODWILL_MAX = 100;

export function emptyDowntown(): DowntownState {
  return { growth: 0, goodwill: GOODWILL_START, festivals: [] };
}

// The district's growth: full after DISTRICT_YEARS_TO_FULL years at a goodwill
// of GOODWILL_START; faster as the town warms to the college and slower as it
// cools (half the pace with no goodwill at all, half again as fast at full).
export const DISTRICT_YEARS_TO_FULL = 10;
export function districtPace(goodwill: number): number {
  return 0.5 + Math.max(0, Math.min(GOODWILL_MAX, goodwill)) / 100;
}

// Off-campus life: the district meets this share of each of the students'
// social, dining and housing needs once it has grown in full, and as much
// of it as it has grown before then.
export const OFF_CAMPUS_SHARE = 0.15;

// The district as the map draws it: in steps as it grows (the map's cached
// art redraws only when the step changes).
export const DISTRICT_STEPS = 6;

// The festival: raised in the inbox at this week of the year (the Spring
// Term's fourth), with this many weeks to answer before the default.
export const FESTIVAL_WEEK = 30;
export const FESTIVAL_ANSWER_WEEKS = 6;
// The district is dressed for the festival for this many weeks from it
// (the map; districtFestive).
export const FESTIVAL_LIT_WEEKS = 3;

export const FESTIVAL_SCALES: readonly FestivalScale[] = ['weekend', 'fair', 'concert', 'gala'];

export interface FestivalTerms {
  // What it costs, as the catalog writes money: for a founding college,
  // scaled by the college's budget at play (catalogue.ts's priceScale; twelve
  // times at a large college, so a gala is about $6M).
  cost: number;
  // Satisfaction points, at once (the catalog's mood).
  mood: number;
  // Next summer's applicants: this share of last summer's pool, on top
  // (students.applicantLift).
  applicants: number;
  // The town's goodwill.
  goodwill: number;
  // What it counts toward the term (FESTIVAL_POINTS_FOR_FULL).
  points: number;
  // The alumni's gifts at the gala: this share of a year's annual giving,
  // to the endowment.
  gifts: number;
}

export const FESTIVAL: Readonly<Record<FestivalScale, FestivalTerms>> = {
  weekend: { cost: 50_000, mood: 1, applicants: 0.01, goodwill: 2, points: 0.4, gifts: 0 },
  fair: { cost: 125_000, mood: 2, applicants: 0.02, goodwill: 4, points: 0.7, gifts: 0 },
  concert: { cost: 250_000, mood: 3, applicants: 0.03, goodwill: 6, points: 1, gifts: 0 },
  gala: { cost: 500_000, mood: 4, applicants: 0.04, goodwill: 8, points: 1.2, gifts: 0.06 },
};

// A spring without a festival costs the town's goodwill.
export const SKIPPED_GOODWILL = -10;

// The term: festival points in the last FESTIVAL_WINDOW_YEARS springs, full at
// FESTIVAL_POINTS_FOR_FULL (ten springs of a festival with a headline act);
// carried half by the festivals alone, the rest as the district grows; and
// in full while the town's goodwill stands at GOODWILL_FOR_FULL or more,
// down to half at none. Nothing at all without a festival in the window.
// Tuned (Plan 85H) so the harness's student-life specialist, holding the
// festival every spring, fills it about ten years after the choice, as the
// other three fill.
export const FESTIVAL_WINDOW_YEARS = 10;
export const FESTIVAL_POINTS_FOR_FULL = 10;
export const GOODWILL_FOR_FULL = 60;

// The festival's index in its effect ('festival' in the catalog's levers):
// 0 is none, 1 to 4 the scales.
export function festivalScaleOf(index: number): FestivalScale | 'none' {
  return FESTIVAL_SCALES[index - 1] ?? 'none';
}

// The college the downtown grows for: specialized in student life
// (s.specialization read directly: specialization.ts is a systems module).
export function downtownWorks(s: GameState): boolean {
  return s.specialization === 'studentLife';
}

// How far the district has grown, 0 to 1; nothing at another college.
export function districtGrowth(s: GameState): number {
  return downtownWorks(s) ? Math.max(0, Math.min(1, s.downtown?.growth ?? 0)) : 0;
}

// The share of each need the district meets.
export function offCampusShare(s: GameState): number {
  return OFF_CAMPUS_SHARE * districtGrowth(s);
}

// The map's step, 0 (the plain town) to DISTRICT_STEPS.
export function districtStep(s: GameState): number {
  const g = districtGrowth(s);
  return g <= 0 ? 0 : Math.min(DISTRICT_STEPS, Math.ceil(g * DISTRICT_STEPS - 1e-9));
}

// How the map dresses the district (Plan 85H; split in two by Plan 95C, the
// second review's B1-7). The map has no night, so the district has no light
// of its own: no glowing bulbs, no pools of light on the street.
// - The festival's weeks: from the week of a festival held, for
//   FESTIVAL_LIT_WEEKS, the district is dressed for it, with bunting on its
//   strings and a crowd on its pavements as large as the festival. The
//   festival's scale, or null.
// - The snow weeks (`snow`, the map's season, at WINTER_LIT_SNOW or
//   deeper): the shop windows and signs are warm, a lit interior on a grey
//   day.
export const WINTER_LIT_SNOW = 0.5;
export function districtFestive(s: GameState): FestivalScale | null {
  if (districtStep(s) === 0) return null;
  const f = festivalHeld(s, s.clock.year);
  if (f === undefined || f.scale === 'none' || f.week === undefined) return null;
  return s.clock.week >= f.week && s.clock.week < f.week + FESTIVAL_LIT_WEEKS ? f.scale : null;
}
export function districtWinterLit(s: GameState, snow: number): boolean {
  return districtStep(s) > 0 && snow >= WINTER_LIT_SNOW;
}

export function goodwillOf(s: GameState): number {
  return Math.max(0, Math.min(GOODWILL_MAX, s.downtown?.goodwill ?? GOODWILL_START));
}

// The festivals in the window: the last FESTIVAL_WINDOW_YEARS springs, this
// year's among them once it has been decided (before then, last year's and
// the nine before).
export function festivalsInWindow(s: GameState): FestivalYear[] {
  const festivals = s.downtown?.festivals ?? [];
  const decided = festivals.some((f) => f.year === s.clock.year);
  const to = decided ? s.clock.year : s.clock.year - 1;
  return festivals.filter((f) => f.year <= to && f.year > to - FESTIVAL_WINDOW_YEARS);
}

// The autumn festivals bought (Plan 95X, speedUpData.ts) in the last
// FESTIVAL_WINDOW_YEARS years, this year's among them.
export function autumnsInWindow(s: GameState): number {
  return (s.bought?.autumn ?? []).filter((y) => y <= s.clock.year && y > s.clock.year - FESTIVAL_WINDOW_YEARS).length;
}

export function festivalPoints(s: GameState): number {
  return festivalsInWindow(s).reduce((sum, f) => sum + (f.scale === 'none' ? 0 : FESTIVAL[f.scale].points), 0)
    + autumnsInWindow(s) * AUTUMN_POINTS;
}

export function festivalHeld(s: GameState, year: number): FestivalYear | undefined {
  return (s.downtown?.festivals ?? []).find((f) => f.year === year);
}

// The three parts of the reading, each 0 to 1.
export function festivalShare(s: GameState): number {
  return Math.min(1, festivalPoints(s) / FESTIVAL_POINTS_FOR_FULL);
}
export function growthFactor(s: GameState): number {
  return 0.5 + 0.5 * districtGrowth(s);
}
export function goodwillFactor(s: GameState): number {
  return 0.5 + 0.5 * Math.min(1, goodwillOf(s) / GOODWILL_FOR_FULL);
}

// The term's reading (specializationData.ts's SPECIALIZATION_READINGS), 0 to
// 1: nothing without a festival in the window.
export function downtownReading(s: GameState): number {
  if (!downtownWorks(s)) return 0;
  return Math.min(1, festivalShare(s) * growthFactor(s) * goodwillFactor(s));
}

// ---------------------------------------------------------------------
// The words (Plan 47's glossary: *the downtown* is the district, *the
// festival* the spring festival, *goodwill* the town's; off-campus places
// are *downtown*).
// ---------------------------------------------------------------------

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => (Math.abs(x - Math.round(x)) < 0.05 ? `${Math.round(x)}` : x.toFixed(1));

export const FESTIVAL_NAMES: Readonly<Record<FestivalScale | 'none', string>> = {
  weekend: 'a modest weekend',
  fair: 'a street fair',
  concert: 'a festival with a headline act',
  gala: 'a headline gala',
  none: 'no festival',
};

const SCORING = `${FESTIVAL_NAMES.weekend} counts ${FESTIVAL.weekend.points}, ${FESTIVAL_NAMES.fair} ${FESTIVAL.fair.points}, ${FESTIVAL_NAMES.concert} ${FESTIVAL.concert.points} and ${FESTIVAL_NAMES.gala} ${FESTIVAL.gala.points}`;

export function festivalsSummary(s: GameState): string {
  const held = festivalsInWindow(s).filter((f) => f.scale !== 'none');
  const galas = held.filter((f) => f.scale === 'gala').length;
  const n = held.length;
  return `${n === 0 ? 'no festival' : n === 1 ? 'one festival' : `${n} festivals`}${galas > 0 ? ` (${galas === n ? (n === 1 ? 'a gala' : 'all galas') : `${galas} of them ${galas === 1 ? 'a gala' : 'galas'}`})` : ''}`;
}

export const DOWNTOWN_WORDS = {
  // The student-life pillar's specialization term, as its row reads.
  termEmpty: (year: string) =>
    `The college is specialized in student life${year}, but no spring festival has been held in the last ${FESTIVAL_WINDOW_YEARS} years, so this stays empty. Hold the festival each spring: each counts by its scale (${SCORING}), ${FESTIVAL_POINTS_FOR_FULL} points in the last ${FESTIVAL_WINDOW_YEARS} years fill it, and the downtown's growth and the town's goodwill carry it the rest of the way.`,
  termReading: (year: string, s: GameState, full: boolean) =>
    `The college is specialized in student life${year}: ${festivalsSummary(s)} in the last ${FESTIVAL_WINDOW_YEARS} years, ${num(festivalPoints(s))} of the ${FESTIVAL_POINTS_FOR_FULL} points that fill it (${SCORING}). The downtown has grown ${pct(districtGrowth(s))} of the way, which carries half the share at first and all of it once grown, and the town's goodwill stands at ${Math.round(goodwillOf(s))}, in full from ${GOODWILL_FOR_FULL}. ${full ? 'The share is full.' : 'It fills as all three rise.'}`,

  // The choice's card (specializationData.ts's SPECIALIZATION_CARDS).
  fills: `filling as the college holds its spring festival, full at ${FESTIVAL_POINTS_FOR_FULL} points of festivals in the last ${FESTIVAL_WINDOW_YEARS} years (${FESTIVAL_NAMES.concert} counts 1), carried by the downtown's growth and the town's goodwill`,
  cardDistrict: `The town beside the campus grows into a downtown district over about ${DISTRICT_YEARS_TO_FULL} years, drawn on the map, and meets up to ${pct(OFF_CAMPUS_SHARE)} of the students' social, dining and housing needs as it grows.`,
  cardFestival: 'A festival each spring, from a modest weekend to a headline gala: satisfaction, the next summer\'s applicants and, at the gala, the alumni\'s gifts. A spring without one costs the town\'s goodwill.',
  cardTown: 'Town-and-gown events from a lively downtown, trading money, the students\' mood and the town\'s goodwill.',

  // Where the needs are shown.
  offCampus: 'Downtown, off campus',
  offCampusBeds: (beds: string) => `${beds} downtown`,
  offCampusHint: `The downtown district's places: it meets up to ${pct(OFF_CAMPUS_SHARE)} of the need once grown in full, and as much of that as it has grown before then. It costs the college nothing to keep.`,

  // The Students tab's panel.
  head: 'The downtown',
  panelHelp: `The town beside the campus, growing into a downtown district while the college is specialized in student life. It meets part of the students' social, dining and housing needs, up to ${pct(OFF_CAMPUS_SHARE)} of each once grown in full. It grows faster the warmer the town's goodwill. Each spring the college decides how large a festival to hold; the festivals of the last ${FESTIVAL_WINDOW_YEARS} years fill student life's specialization share, carried by the district's growth and the town's goodwill.`,
  growth: 'Grown',
  goodwill: 'The town\'s goodwill',
  festivals: (s: GameState) => `${festivalsSummary(s)} in the last ${FESTIVAL_WINDOW_YEARS} years, ${num(festivalPoints(s))} of the ${FESTIVAL_POINTS_FOR_FULL} points`,
  lastFestival: (f: FestivalYear | undefined) => (f
    ? f.scale === 'none' ? `Year ${f.year}: no festival, and the town noticed` : `Year ${f.year}: ${FESTIVAL_NAMES[f.scale]}`
    : 'None yet: the first is decided in the Spring term'),
  places: (social: string, dining: string, beds: string) => `${social} social places, ${dining} meals and ${beds} beds`,
  offCampusLabel: 'Off campus',
  lastLabel: 'Last festival',
  festivalsLabel: 'Festivals',
  hintGrowth: `How far the town beside the campus has grown into a downtown district: full after about ${DISTRICT_YEARS_TO_FULL} years at a goodwill of ${GOODWILL_START}, faster the warmer the town.` as `${string}.`,
  hintGoodwill: `The town's goodwill toward the college, 0 to 100: each festival raises it, a spring without one costs ${-SKIPPED_GOODWILL}, and the town-and-gown events trade it; student life's specialization share reads it in full from ${GOODWILL_FOR_FULL}.` as `${string}.`,
  hintFestivals: `The spring festivals of the last ${FESTIVAL_WINDOW_YEARS} years, each counted by its scale (${SCORING}): ${FESTIVAL_POINTS_FOR_FULL} points fill student life's specialization share.` as `${string}.`,
  hintOffCampus: `What the downtown meets of the students' needs, up to ${pct(OFF_CAMPUS_SHARE)} of each once grown in full: places the college does not have to build or keep.` as `${string}.`,
  hintLast: 'The latest spring festival and its scale; the next is decided in the inbox at the fourth week of the Spring term.' as `${string}.`,
};

// What an answer to the festival does, beyond its cost and mood: a phrase
// each (EventChoices.tsx, which passes its formatters). `pool` is last
// summer's applicants, `giving` a year's annual giving, for the gala.
export function festivalPhrases(
  index: number, pool: number, giving: number,
  f: { signed: (v: number) => string; money: (m: number) => string },
): string[] {
  const scale = festivalScaleOf(index);
  if (scale === 'none') return [`town goodwill ${f.signed(SKIPPED_GOODWILL)}`];
  const t = FESTIVAL[scale];
  const out = [`${f.signed(Math.round(pool * t.applicants))} applicants next summer`, `town goodwill ${f.signed(t.goodwill)}`];
  if (t.gifts > 0) out.push(`alumni gifts of about ${f.money(giving * t.gifts)} to the endowment`);
  return out;
}

// The festival, as the inbox raises it each spring (systems/studentlife/
// downtown.ts's raiseFestival): an inline matter like the charter, not
// drawn, answered by the President and by nobody else. The default, if
// nobody answers, is the modest weekend: the student government holds one
// whatever the administration decides.
export const FESTIVAL_EVENT: CatalogueEvent = {
  id: 'spring-festival',
  kind: 'inline',
  domain: 'students',
  from: 'The student government',
  weight: 0,
  cooldownYears: 0,
  when: {},
  title: 'The spring festival',
  text: 'The student government and the Downtown Merchants\' Association have begun planning this year\'s spring festival, and would like to know how large the college means it to be. A modest weekend on the quad costs little. A street fair runs the length of Main Street. A headline act fills the town\'s hotels for three nights. A headline gala does all of that and seats the alumni at dinner, where they are reliably generous.\n\nThe merchants have pointed out, more than once and in writing, that a spring without a festival is a spring the town remembers.',
  timeoutWeeks: FESTIVAL_ANSWER_WEEKS,
  choices: [
    { id: 'weekend', label: 'A modest weekend on the quad', effects: { cash: -FESTIVAL.weekend.cost, mood: FESTIVAL.weekend.mood, festival: 1 } },
    { id: 'fair', label: 'A street fair down Main Street', effects: { cash: -FESTIVAL.fair.cost, mood: FESTIVAL.fair.mood, festival: 2 } },
    { id: 'concert', label: 'A festival with a headline act', effects: { cash: -FESTIVAL.concert.cost, mood: FESTIVAL.concert.mood, festival: 3 } },
    { id: 'gala', label: 'A headline gala, the alumni invited', effects: { cash: -FESTIVAL.gala.cost, mood: FESTIVAL.gala.mood, festival: 4 } },
    { id: 'none', label: 'No festival this year', effects: { festival: 0 } },
  ],
  default: 'weekend',
};

// The one instance a spring ever has, so raising it draws nothing from the
// run's stream.
export const FESTIVAL_INSTANCE = 'spring-festival';
