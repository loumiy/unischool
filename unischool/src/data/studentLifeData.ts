import { projectLift } from '../systems/estate/projects';
import { tagTeeth } from '../systems/identity/teeth';
import type {
  AthleticsBudgetTier, Buildable, Coach, FacilityType, GameState, GreekChapter, OrgPetition,
  StudentClub, StudentOrgBase, VarsityTeam,
} from '../state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../state/types';
import { weeksOfOpEx } from './moneyScale';
import { rollCoachName } from './facultyData';
import { makeRivalRng } from './rivalData';
import { random, newId } from '../engine/random';

// Student organisations (see docs/design/student-life.md), gated on campus
// the player has built:
//   1. Clubs form once a student center stands. A formation raises a petition
//      the player answers in the summer admissions digest; clubs never stop
//      the clock.
//   2. Greek chapters form the same way, but only after the player approves a
//      Hellenic Council (a declinable decision event in eventData.ts).
//   3. Varsity athletics grows out of clubs: a share of club formations are
//      sport clubs, which may petition to go varsity (eventData.ts's
//      'varsity-petition') and become VarsityTeam records in s.orgs.teams.
//
// Mechanically an organisation costs money (financeSystem.ts sums
// upkeepPerWeek) and lifts the `social` satisfaction attribute, flat per org
// (satisfactionSystem.ts). Both are read live off s.orgs every week, so
// disbanding removes the effect immediately. Membership is display-only;
// prestige is untouched.

// Tuning: cadence. These rolls raise petitions, never interrupts.

export const CLUB_FORMATION_WEEKLY_CHANCE = 0.05;
export const CHAPTER_FORMATION_WEEKLY_CHANCE = 0.02;
// Shared floor between any two formations, of either kind.
export const ORG_FORMATION_COOLDOWN_WEEKS = 6;
// The digest is a section of the admissions modal, so keep it short.
export const MAX_PETITIONS_PER_DIGEST = 4;

// Organisations a campus can sustain, read against total enrolled (not beds).
export const STUDENTS_PER_CLUB = 220;
export const STUDENTS_PER_CHAPTER = 900;
// Absolute caps keep a 40-year run's list readable.
export const MAX_ACTIVE_CLUBS = 24;
export const MAX_ACTIVE_CHAPTERS = 10;

// Tuning: money. Sized in weeks of opex (moneyScale.ts) and fixed in dollars
// when the organisation is approved. Re-deriving weekly would be circular
// (opex -> pricier clubs -> higher opex), so an old club's budget fades
// against a grown school's spending by design.
export const CLUB_UPKEEP_WEEKS_OF_OPEX = 0.0015;    // ~0.15% of one week's opex, every week (~$68/wk at founding scale)
export const CHAPTER_UPKEEP_WEEKS_OF_OPEX = 0.0060; // a chapter is a house, a staff liaison and an events budget: 4x a club

// Tuning: satisfaction. A flat `social` contribution per live organisation,
// capped in aggregate so student life cannot carry the attribute alone.
export const CLUB_SOCIAL_BONUS = 0.6;          // points added to `social` per approved club
export const CHAPTER_SOCIAL_BONUS = 2.5;       // significantly heavier per chapter — a chapter IS a social institution
export const CHAPTER_HOUSED_SOCIAL_BONUS = 1.5; // added on top once a chapter has its own house
// Added directly to s.students.capacity by eventData.ts's 'greek-housing'
// event (chapter houses have no Buildable effects). Well under a dorm rung.
export const CHAPTER_HOUSE_CAPACITY_BONUS = 40;
// Cap on the sum of all student-life sources: 30 x the 20% social weight = 6
// points of headline satisfaction at most. Clubs and housed chapters total
// ~40 uncapped, and a full athletics department ~59 more; the shared cap is
// deliberate, so athletics competes with clubs and Greek life for headroom
// rather than adding an independent source.
export const STUDENT_LIFE_SOCIAL_BONUS_CAP = 30;

// Transient stock nudges applied when the digest is answered, on top of the
// durable target contribution. Satisfaction drifts back toward its target, so
// these only matter near the summer funnel. Declining is felt more because
// approving already carries a durable source.
export const CLUB_APPROVAL_SATISFACTION_NUDGE = 1;
export const CLUB_DECLINE_SATISFACTION_HIT = 1.5;
export const CHAPTER_APPROVAL_SATISFACTION_NUDGE = 2;
export const CHAPTER_DECLINE_SATISFACTION_HIT = 3;

// Tuning: membership. Display only; nothing reads a member count. Derived,
// never stored: see orgMembership.
export const CLUB_FOUNDING_MEMBERS = 14;      // the size a new club starts at, before the per-org roll below
export const CHAPTER_FOUNDING_MEMBERS = 32;   // a chapter pledges a bigger founding class than a club draws
export const ORG_FOUNDING_MEMBERS_VARIATION = 0.4; // +/- share rolled once per organisation, so no two are identical
export const ORG_MEMBERSHIP_GROWTH_PER_YEAR = 0.045; // an established organisation keeps growing on its own
// How hard membership tracks enrollment: 1 = fixed share of the student body,
// 0 = never grows with the school. 0.5 means a school that quadruples doubles
// its clubs' rolls.
export const ORG_ENROLLMENT_TRACKING = 0.5;

// Shown on the Students tab before a council has been offered. Kept vague
// about the trigger (eventData.ts's HELLENIC_COUNCIL_MIN_CLUBS) on purpose.
export const HELLENIC_COUNCIL_HINT =
  'No Greek life on this campus. Once there is a real club scene, students may petition to charter a Hellenic Council — approving one is a deliberate choice, and a school can decline Greek life entirely.';

// Names: authored pools, drawn without repeating what the campus already has.
const CLUB_NAMES: readonly string[] = [
  'Chess Club', 'Debate Union', 'Astronomy Society', 'Outdoors Club', 'Film Society',
  'Robotics Club', 'Model United Nations', 'Jazz Ensemble', 'Chamber Orchestra', 'A Cappella Society',
  'Student Newspaper', 'Radio Station', 'Literary Review', 'Photography Club', 'Ceramics Guild',
  'Improv Troupe', 'Drama Society', 'Dance Collective', 'Ballroom Society', 'Marching Band',
  'Hiking Club', 'Climbing Club', 'Cycling Club', 'Rowing Club', 'Ultimate Frisbee Club',
  'Fencing Club', 'Table Tennis Club', 'Quiz Bowl Team', 'Mathematics Circle', 'Physics Society',
  'Chemistry Society', 'Biology Society', 'Geology Club', 'Ornithology Society', 'Beekeeping Club',
  'Gardening Collective', 'Environmental Coalition', 'Sustainability Council', 'Cycling Advocacy Group', 'Food Justice Network',
  'Volunteer Corps', 'Tutoring Collective', 'Mentorship Network', 'Interfaith Council', 'Philosophy Circle',
  'Classics Society', 'History Society', 'Archaeology Club', 'Linguistics Circle', 'Translation Workshop',
  'French Club', 'Spanish Club', 'German Club', 'Japanese Culture Club', 'Korean Culture Club',
  'Chinese Culture Club', 'South Asian Students Association', 'African Students Association', 'Latin American Students Association', 'Caribbean Students Association',
  'International Students Union', 'First-Generation Students Network', 'Veterans Association', 'Disability Advocacy Group', 'Pride Alliance',
  'Women in Engineering', 'Women in Science', 'Pre-Law Society', 'Pre-Medical Society', 'Entrepreneurship Club',
  'Investment Club', 'Consulting Group', 'Accounting Society', 'Marketing Association', 'Data Science Club',
  'Cybersecurity Club', 'Game Development Club', 'Board Games Society', 'Anime Society', 'Comics Collective',
  'Knitting Circle', 'Baking Club', 'Coffee Society', 'Tea Appreciation Society', 'Cooking Collective',
];

// Chapter names are three-letter combinations, so the pool never runs out.
const GREEK_LETTERS: readonly string[] = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
  'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon',
  'Phi', 'Chi', 'Psi', 'Omega',
];

// The same letters as glyphs, for a chapter house's door. Indexed against
// GREEK_LETTERS so the two can never disagree.
const GREEK_GLYPHS = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';

// A chapter's name in its own alphabet. Exported so persistence.ts can derive
// the field for saves that predate it.
export function glyphsFor(name: string): string {
  return name
    .split(' ')
    .map((word) => {
      const i = GREEK_LETTERS.indexOf(word);
      return i === -1 ? '' : GREEK_GLYPHS[i];
    })
    .join('');
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

// Varsity athletics. The petition itself is authored in eventData.ts.

// Share of club formations that roll as a sport club: the same weekly roll,
// drawing from SPORTS instead of CLUB_NAMES. Kept well under half.
export const SPORT_CLUB_SHARE = 0.3;

// A sport is men-only, women-only or two-gender. SPORTS is generated from
// SPORT_PROFILES, so every read goes through one table. A one-gender sport's
// id is the bare key ('football'); a two-gender sport gets one id per lineage
// ('soccer-m' / 'soccer-w'), making men's and women's programs independent
// records that share only the venue category.
export type SportGender = 'men' | 'women';

// Each sport has a scale: revenue sports (football, basketball) are expensive
// to staff and fund and their titles move the needle; Olympic sports are
// cheap with a modest payoff. This lets a department be a football power or a
// school with many small-sport banners.
//
// `costToCompete` is annual dollars, fixed rather than a share of opex, so a
// big school cannot fund every program as a flagship without deciding to.
export type SportScale = 'revenue' | 'olympic';

export interface SportEconomics {
  scale: SportScale;
  costToCompete: number;    // $/yr a program draws from the pot to be fully funded
  salaryMultiplier: number; // on coachSalaryFor, for a coach whose field is this sport
  payoffMultiplier: number; // on what a title is worth: campus-life standing, the applicant cohort
  ticketPrice: number;      // $ a seat at a home date (systems/athletics/gate.ts)
  breadthWeight: number;    // what fielding it counts for toward athletic standing's breadth credit
}

// Sized to the coaching payroll (~$300k a program a year), not opex: a revenue
// program spends about its coaching cost again on recruiting and travel, an
// Olympic one less than half.
const OLYMPIC_SPORT: SportEconomics = { scale: 'olympic', costToCompete: 120_000, salaryMultiplier: 1.0, payoffMultiplier: 0.8, ticketPrice: 10, breadthWeight: 1 };
const REVENUE_SPORT: SportEconomics = { scale: 'revenue', costToCompete: 450_000, salaryMultiplier: 1.8, payoffMultiplier: 1.5, ticketPrice: 20, breadthWeight: 1.5 };
// Football is the most expensive program, matching the stadium.
const FOOTBALL: SportEconomics = { scale: 'revenue', costToCompete: 1_200_000, salaryMultiplier: 2.5, payoffMultiplier: 2.0, ticketPrice: 25, breadthWeight: 2 };

interface SportProfile {
  key: string;                 // base id; the WHOLE id for a one-gender sport
  label: string;                // bare sport name, e.g. 'Soccer', 'Swim & Dive'
  venueCategory: FacilityType;  // shared across every gender of this sport
  genders: readonly SportGender[]; // which lineages this sport fields
  economics: SportEconomics;    // its scale (see SportEconomics above)
}

const GENDER_LABEL: Record<SportGender, string> = { men: "Men's", women: "Women's" };

const SPORT_PROFILES: readonly SportProfile[] = [
  { key: 'soccer', label: 'Soccer', venueCategory: 'athleticsField', genders: ['men', 'women'], economics: OLYMPIC_SPORT },
  { key: 'lacrosse', label: 'Lacrosse', venueCategory: 'athleticsField', genders: ['men', 'women'], economics: OLYMPIC_SPORT },
  { key: 'fieldHockey', label: 'Field Hockey', venueCategory: 'athleticsField', genders: ['women'], economics: OLYMPIC_SPORT },
  { key: 'basketball', label: 'Basketball', venueCategory: 'athleticsArena', genders: ['men', 'women'], economics: REVENUE_SPORT },
  { key: 'volleyball', label: 'Volleyball', venueCategory: 'athleticsArena', genders: ['men', 'women'], economics: OLYMPIC_SPORT },
  { key: 'baseball', label: 'Baseball', venueCategory: 'athleticsDiamond', genders: ['men'], economics: OLYMPIC_SPORT },
  { key: 'softball', label: 'Softball', venueCategory: 'athleticsDiamond', genders: ['women'], economics: OLYMPIC_SPORT },
  { key: 'swimming', label: 'Swim & Dive', venueCategory: 'athleticsNatatorium', genders: ['men', 'women'], economics: OLYMPIC_SPORT },
  { key: 'football', label: 'Football', venueCategory: 'footballStadium', genders: ['men'], economics: FOOTBALL },
  { key: 'track', label: 'Track & Field', venueCategory: 'athleticsField', genders: ['men', 'women'], economics: OLYMPIC_SPORT },
// Ice hockey shares the arena (as real arenas convert between hardwood and
// ice) rather than getting its own rink facility. That puts six programs on
// the arena; if that reads as thin, the fix is a rink.
  { key: 'iceHockey', label: 'Ice Hockey', venueCategory: 'athleticsArena', genders: ['men', 'women'], economics: OLYMPIC_SPORT },
// Water polo gives the natatorium four programs instead of two.
  { key: 'waterPolo', label: 'Water Polo', venueCategory: 'athleticsNatatorium', genders: ['men', 'women'], economics: OLYMPIC_SPORT },
// Golf is declined and rowing deferred (docs/design/student-life.md): the map
// has no terrain for a course or a lake.
];

function sportId(profile: SportProfile, gender: SportGender): string {
  return profile.genders.length > 1 ? `${profile.key}-${gender === 'men' ? 'm' : 'w'}` : profile.key;
}

// A two-gender sport is prefixed "Men's"/"Women's"; a one-gender sport has no
// prefix. The team name ("... Team") is what promoteToVarsityTeam names a
// promoted team.
function sportDisplayName(profile: SportProfile, gender: SportGender): string {
  return profile.genders.length > 1 ? `${GENDER_LABEL[gender]} ${profile.label}` : profile.label;
}

// `clubName` is shown before varsity, `teamName` after promotion. Lineages
// sharing a venueCategory share one venue: the second to go varsity pays only
// the varsity cost. Football is alone in its category.
export interface SportDefinition {
  id: string;
  gender: SportGender;
  clubName: string;
  teamName: string;
  venueCategory: FacilityType;
  economics: SportEconomics;
}

// One entry per (sport, fielded gender): 18 in all.
export const SPORTS: readonly SportDefinition[] = SPORT_PROFILES.flatMap((profile) =>
  profile.genders.map((gender) => {
    const name = sportDisplayName(profile, gender);
    return {
      id: sportId(profile, gender),
      gender,
      clubName: `${name} Club`,
      teamName: `${name} Team`,
      venueCategory: profile.venueCategory,
      economics: profile.economics,
    };
  }),
);

export function sportById(id: string | null | undefined): SportDefinition | undefined {
  return SPORTS.find((sp) => sp.id === id);
}

// A sport's scale, by id. A field that is not a sport (a trainer's, the
// director's) reads as an Olympic sport's: the base row, no multiplier.
export function sportEconomics(sportId: string | null | undefined): SportEconomics {
  return sportById(sportId)?.economics ?? OLYMPIC_SPORT;
}

// The venue Buildable for a category: always exactly one in the seed data
// (see Buildable.athleticsVenueReveal); undefined is defensive only.
export function venueForCategory(s: GameState, category: FacilityType): Buildable | undefined {
  return s.tech.find((t) => t.kind === 'facility' && t.facilityType === category);
}

// The department-wide budget tier. Scales every active team's social
// contribution and the whole department's upkeep, and sets the institutional
// subsidy half of the pot (see departmentPot). Subsidies are fixed dollars,
// never a share of opex, so a huge school does not fund every program without
// a decision.
export const ATHLETICS_BUDGET_ORDER: readonly AthleticsBudgetTier[] = ['low', 'medium', 'high'];
export const DEFAULT_ATHLETICS_BUDGET: AthleticsBudgetTier = 'medium';
export const ATHLETICS_BUDGET_TIERS: Record<AthleticsBudgetTier, { socialMultiplier: number; upkeepMultiplier: number; subsidyPerYear: number }> = {
  low: { socialMultiplier: 0.6, upkeepMultiplier: 0.75, subsidyPerYear: 300_000 },
  medium: { socialMultiplier: 1.0, upkeepMultiplier: 1.0, subsidyPerYear: 750_000 },
  high: { socialMultiplier: 1.5, upkeepMultiplier: 1.4, subsidyPerYear: 1_500_000 },
};

// Flat per active team; an 'awaitingVenue' team contributes nothing, so
// petitioning and stalling on the venue cannot be gamed. Sized between a club
// and a chapter.
export const TEAM_SOCIAL_BONUS = 2.2;

// Coaching staff: a hiring pool mirroring facultyData.ts's market, kept
// separate (own pool, own fields). A coach has one `quality` stat.

export const TRAINER_FIELD = 'strength-conditioning';

// The athletic director's field. Deliberately not in allCoachFields(): a
// director is offered once in an interrupt (eventSystem.ts), never listed.
export const AD_FIELD = 'athletic-director';

// One field per SPORTS entry plus TRAINER_FIELD. Memoized; SPORTS is static.
let coachFields: readonly string[] | null = null;
function allCoachFields(): readonly string[] {
  if (!coachFields) coachFields = [...SPORTS.map((sp) => sp.id), TRAINER_FIELD];
  return coachFields;
}

// Uniform across fields: athletics has no demand signal to weight by.
export function rollCoachField(roll: () => number = random): string {
  const fields = allCoachFields();
  return fields[Math.floor(roll() * fields.length)];
}

// Coaches mostly match the gender of the sport they coach; trainers are a
// coin flip.
const COACH_GENDER_MATCH_CHANCE = 0.95;

function rollCoachGender(field: string, roll: () => number): 'male' | 'female' {
  const sportGender = sportById(field)?.gender;
  if (!sportGender) return roll() < 0.5 ? 'male' : 'female'; // TRAINER_FIELD
  const matchGender = sportGender === 'men' ? 'male' : 'female';
  const otherGender = matchGender === 'male' ? 'female' : 'male';
  return roll() < COACH_GENDER_MATCH_CHANCE ? matchGender : otherGender;
}

// Quality starts at a fraction of a rolled ceiling and closes the gap linearly
// over a plateau window. Scarcity is in quality, not existence: journeymen
// are common, the elite band (75..90) is rare.
export type CoachBand = 'journeyman' | 'solid' | 'elite';
const COACH_BANDS: ReadonlyArray<{ band: CoachBand; min: number; range: number; share: number }> = [
  { band: 'journeyman', min: 45, range: 17, share: 0.65 }, // 45..62
  { band: 'solid', min: 60, range: 18, share: 0.28 },      // 60..78
  { band: 'elite', min: 75, range: 15, share: 0.07 },      // 75..90
];
export function rollCoachBand(roll: () => number): CoachBand {
  let r = roll();
  for (const b of COACH_BANDS) {
    r -= b.share;
    if (r < 0) return b.band;
  }
  return 'journeyman';
}
export function rollCoachPotential(roll: () => number, band: CoachBand = rollCoachBand(roll)): number {
  const b = COACH_BANDS.find((x) => x.band === band)!;
  return b.min + Math.round(roll() * b.range);
}
const COACH_STARTING_POTENTIAL_FRACTION = 0.55;
const COACH_GROWTH_PLATEAU_YEARS = 6;

// Prospects are young, cheap and start low with a long climb; veterans start
// near their ceiling, cost more, plateau quickly and retire at
// COACH_RETIREMENT_AGE (athleticsSystem.ts's growCoach).
//
// The card shows a scouted range, not the true ceiling: SCOUT_RANGE_WIDTH
// wide, off-centre by up to half its width, narrowed by a better athletic
// director.
const VETERAN_SHARE = 0.35;
const PROSPECT_AGE_MIN = 28;
const PROSPECT_AGE_RANGE = 10;   // 28..38
const VETERAN_AGE_MIN = 45;
const VETERAN_AGE_RANGE = 13;    // 45..58
const VETERAN_STARTING_FRACTION = 0.9;
const VETERAN_PLATEAU_YEARS = 2;
export const COACH_RETIREMENT_AGE = 65;
const SCOUT_RANGE_WIDTH = 24;
const SCOUT_RANGE_PER_AD_POINT = 0.2; // a 90 director scouts to within 6 points
const SCOUT_RANGE_MIN = 4;

export interface CoachProfile {
  age: number;
  startQuality: number;
  plateauYears: number;
  scouted: [number, number];
  veteran: boolean;
}

// Defaults for a coach saved without these fields: a known-ceiling prospect
// of forty.
export function coachProfile(c: Coach): CoachProfile {
  const plateauYears = c.plateauYears ?? COACH_GROWTH_PLATEAU_YEARS;
  return {
    age: c.age ?? 40,
    startQuality: c.startQuality ?? c.qualityPotential * COACH_STARTING_POTENTIAL_FRACTION,
    plateauYears,
    scouted: c.scouted ?? [c.qualityPotential, c.qualityPotential],
    veteran: plateauYears <= VETERAN_PLATEAU_YEARS,
  };
}

export function scoutRangeWidth(adQuality: number): number {
  return Math.max(SCOUT_RANGE_MIN, SCOUT_RANGE_WIDTH - SCOUT_RANGE_PER_AD_POINT * adQuality);
}

// Half the plateau in, the card prints the ceiling instead of the range.
export function ceilingResolved(c: Coach): boolean {
  return c.tenureWeeks >= (coachProfile(c).plateauYears * WEEKS_PER_YEAR) / 2;
}

export function grownCoachQuality(potential: number, tenureWeeks: number, startQuality?: number, plateauYears: number = COACH_GROWTH_PLATEAU_YEARS): number {
  const start = startQuality ?? potential * COACH_STARTING_POTENTIAL_FRACTION;
  const tenureYears = tenureWeeks / WEEKS_PER_YEAR;
  const grownFraction = Math.min(1, tenureYears / plateauYears);
  return Math.round(start + (potential - start) * grownFraction);
}

export function grownQualityOf(c: Coach): number {
  const p = coachProfile(c);
  return grownCoachQuality(c.qualityPotential, c.tenureWeeks, p.startQuality, p.plateauYears);
}

// Flat dollars like facultySalary (skill base plus tenure premium), not
// weeksOfOpEx: a coach is a person on a salary.
const COACH_SALARY_BASE = 35_000;
const COACH_SALARY_PER_QUALITY_POINT = 900; // applied to CURRENT (grown) quality
const COACH_SALARY_TENURE_PREMIUM_MAX = 0.5; // up to +50% over the base, at full tenure

// `field` (a SPORTS id, TRAINER_FIELD or AD_FIELD) applies the sport's
// salaryMultiplier; trainers and directors read the base row.
export function coachSalaryFor(quality: number, tenureWeeks: number, field?: string): number {
  const skillBase = COACH_SALARY_BASE + quality * COACH_SALARY_PER_QUALITY_POINT;
  const tenureYears = tenureWeeks / WEEKS_PER_YEAR;
  const tenurePremium = Math.min(1, tenureYears / COACH_GROWTH_PLATEAU_YEARS);
  return Math.round(skillBase * (1 + COACH_SALARY_TENURE_PREMIUM_MAX * tenurePremium) * sportEconomics(field).salaryMultiplier);
}

// Every name the department uses (chairs, market, director), for
// rollCoachName to avoid. A fresh Set, so callers can add as they mint.
export function coachNamesInUse(s: GameState): Set<string> {
  const used = new Set<string>();
  for (const c of assignedCoaches(s)) used.add(c.name);
  for (const c of s.orgs.coachCandidates) used.add(c.name);
  if (s.orgs.athleticDirector) used.add(s.orgs.athleticDirector.name);
  return used;
}

const NO_NAMES: ReadonlySet<string> = new Set();

// One freshly rolled candidate. `roll` is the market's local generator or the
// global stream; `band` pins the quality band (the floor lists journeymen).
export function generateCoachCandidate(
  field: string,
  existingNames: ReadonlySet<string> = NO_NAMES,
  roll: () => number = random,
  band?: CoachBand,
  // The director's quality, for how well the ceiling is scouted; 0 if none.
  adQuality: number = 0,
): Coach {
  const qualityPotential = rollCoachPotential(roll, band);
  const veteran = roll() < VETERAN_SHARE;
  const age = veteran
    ? VETERAN_AGE_MIN + Math.floor(roll() * (VETERAN_AGE_RANGE + 1))
    : PROSPECT_AGE_MIN + Math.floor(roll() * (PROSPECT_AGE_RANGE + 1));
  const startQuality = Math.round(qualityPotential * (veteran ? VETERAN_STARTING_FRACTION : COACH_STARTING_POTENTIAL_FRACTION));
  const plateauYears = veteran ? VETERAN_PLATEAU_YEARS : COACH_GROWTH_PLATEAU_YEARS;
  const width = scoutRangeWidth(adQuality);
  const centre = qualityPotential + (roll() - 0.5) * width;
  const scouted: [number, number] = [Math.max(1, Math.round(centre - width / 2)), Math.min(100, Math.round(centre + width / 2))];
  const quality = grownCoachQuality(qualityPotential, 0, startQuality, plateauYears);
  const gender = rollCoachGender(field, roll);
  const rolled = rollCoachName(gender, existingNames, roll);
  return {
    id: newId(),
    name: rolled.name,
    gender,
    heritage: rolled.origin,
    field,
    quality,
    qualityPotential,
    age,
    startQuality,
    plateauYears,
    scouted,
    tenureWeeks: 0,
    weeksListed: 0,
    salary: coachSalaryFor(quality, 0, field),
  };
}

// The athletic director's offer (eventSystem.ts's fireAthleticDirectorOffer):
// three candidates rolled once at fire time and carried in the payload, so the
// person described is the person hired. An AD has one stat, so the choice is
// how much to pay: cheap, middling, expensive. The bands overlap slightly so
// the cheap card is not always the worst.
const AD_TIERS: ReadonlyArray<{ min: number; range: number }> = [
  { min: 48, range: 14 }, // 48..62 — the bargain
  { min: 58, range: 16 }, // 58..74 — the safe hire
  { min: 70, range: 20 }, // 70..90 — the expensive one
];

// The coaching salary curve with a premium: the three cards differ by money.
const AD_SALARY_PREMIUM = 1.6;

export function adSalaryFor(quality: number): number {
  return Math.round(coachSalaryFor(quality, 0) * AD_SALARY_PREMIUM);
}

// Cheapest first, matching the modal's order. Names are kept clear of the
// department's and of each other.
export function rollAthleticDirectorCandidates(existingNames: ReadonlySet<string> = NO_NAMES): Coach[] {
  const used = new Set(existingNames);
  return AD_TIERS.map((tier) => {
    const quality = tier.min + Math.round(random() * tier.range);
    const gender = random() < 0.5 ? 'male' : 'female';
    const rolled = rollCoachName(gender, used);
    used.add(rolled.name);
    return {
      id: newId(),
      name: rolled.name,
      gender,
      heritage: rolled.origin,
      field: AD_FIELD,
      quality,
      // An AD arrives finished: no growth curve.
      qualityPotential: quality,
      age: 45 + Math.floor(random() * 14),
      startQuality: quality,
      plateauYears: VETERAN_PLATEAU_YEARS,
      scouted: [quality, quality],
      tenureWeeks: 0,
      weeksListed: 0,
      salary: adSalaryFor(quality),
    };
  });
}

// Mascots are named in the modal that hires the athletic director, the first
// moment something wears the name. The modal also takes free text. Chosen not
// to overlap rivalData.ts's names.
const MASCOT_SUGGESTIONS: readonly string[] = [
  'Badgers', 'Bobcats', 'Bulldogs', 'Cardinals', 'Cougars', 'Coyotes',
  'Eagles', 'Falcons', 'Foxes', 'Grizzlies', 'Hawks', 'Herons',
  'Ibises', 'Jackals', 'Kestrels', 'Lynx', 'Magpies', 'Mustangs',
  'Ospreys', 'Otters', 'Owls', 'Panthers', 'Pumas', 'Ravens',
  'Stags', 'Storks', 'Terriers', 'Thunderbirds', 'Timberwolves', 'Wolverines',
  'Anchors', 'Anvils', 'Argonauts', 'Blacksmiths', 'Cartographers', 'Chancellors',
  'Comets', 'Explorers', 'Founders', 'Lamplighters', 'Mariners', 'Miners',
  'Pioneers', 'Prospectors', 'Quarriers', 'Scholars', 'Sentinels', 'Surveyors',
  'Tempest', 'Wardens',
];

// Fits beside the school name in standings rows and banners.
export const MASCOT_MAX_LENGTH = 24;

// The modal's reroll passes Math.random so a suggestion does not move the
// game's seeded stream.
export function rollMascotSuggestion(roll: () => number = random): string {
  return MASCOT_SUGGESTIONS[Math.floor(roll() * MASCOT_SUGGESTIONS.length)];
}

// The market runs on its own generator: one global draw a week seeds a local
// PRNG for everything minted that week (see marketRng), so the pool size,
// arrival cap and floor can be tuned without shifting a seeded run.
export const COACH_CANDIDATE_POOL_TARGET = 44;
export const COACH_CANDIDATE_LISTING_WEEKS = 12;
const COACH_CANDIDATE_ARRIVALS_PER_WEEK_MAX = 5;

export function marketRng(): () => number {
  return makeRivalRng(Math.floor(random() * 4294967296));
}

export function initialCoachCandidatePool(): Coach[] {
  const roll = marketRng();
  const pool: Coach[] = [];
  const used = new Set<string>(); // no department yet — the pool is only kept clear of itself
  for (let i = 0; i < COACH_CANDIDATE_POOL_TARGET; i += 1) {
    const candidate = generateCoachCandidate(rollCoachField(roll), used, roll);
    used.add(candidate.name);
    candidate.weeksListed = Math.floor(roll() * COACH_CANDIDATE_LISTING_WEEKS);
    pool.push(candidate);
  }
  return pool;
}

export function coachCandidateArrivalsThisWeek(poolSize: number): number {
  return Math.max(0, Math.min(COACH_CANDIDATE_POOL_TARGET - poolSize, COACH_CANDIDATE_ARRIVALS_PER_WEEK_MAX));
}

// The floor: every open chair on an active team has at least one listing in
// its field. Returns the uncovered fields, which the tick fills with a
// journeyman each.
export function uncoveredChairFields(s: GameState): string[] {
  const listed = new Set(s.orgs.coachCandidates.map((c) => c.field));
  const fields = new Set<string>();
  for (const chair of vacantChairs(s)) {
    const field = fieldForChair(chair);
    if (!listed.has(field)) fields.add(field);
  }
  return [...fields];
}

// Every hired coach across every team: what athleticsSystem.ts grows and
// varsityTeamUpkeep sums.
export function assignedCoaches(s: GameState): Coach[] {
  const staff: Coach[] = [];
  for (const t of s.orgs.teams) {
    if (t.headCoach) staff.push(t.headCoach);
    if (t.assistantCoach) staff.push(t.assistantCoach);
    if (t.trainer) staff.push(t.trainer);
  }
  return staff;
}

// Team quality weights the head coach heaviest. A vacant role scores
// COACH_VACANCY_QUALITY rather than 0: a felt gap, not an instant fail.
const COACH_VACANCY_QUALITY = 15;
const HEAD_COACH_WEIGHT = 0.5;
const ASSISTANT_COACH_WEIGHT = 0.25;
const TRAINER_WEIGHT = 0.25;

// The athletic director's contribution to every team: a person-shaped lever
// beside the money. Kept small so a director cannot carry unstaffed teams.
const AD_QUALITY_SHARE = 0.08; // a 90-quality director is worth ~7 to every team

export function athleticDirectorBonus(s: GameState): number {
  const ad = s.orgs.athleticDirector;
  return ad ? ad.quality * AD_QUALITY_SHARE : 0;
}

// Staff quality before money: the three chairs weighted plus the director.
// The gate (gate.ts) reads this, not teamQuality, so the pot's earned half
// does not depend on the pot. The ceiling is exact: three 90 chairs, fully
// funded, with a 90 director = 82.8 + 10 + 7.2 = 100, so every coaching point
// counts all the way up.
const COACHING_SHARE = 0.92;

// The field house: a non-competition building that lifts every program.
export const FIELD_HOUSE_ID = 'ATH-FIELDHOUSE';
const FIELD_HOUSE_QUALITY_LIFT = 3;

export function fieldHouseLift(s: GameState): number {
  return s.tech.some((t) => t.id === FIELD_HOUSE_ID && t.status === 'done') ? FIELD_HOUSE_QUALITY_LIFT : 0;
}

export function coachingQuality(team: VarsityTeam, s: GameState): number {
  const weighted =
    (team.headCoach?.quality ?? COACH_VACANCY_QUALITY) * HEAD_COACH_WEIGHT
    + (team.assistantCoach?.quality ?? COACH_VACANCY_QUALITY) * ASSISTANT_COACH_WEIGHT
    + (team.trainer?.quality ?? COACH_VACANCY_QUALITY) * TRAINER_WEIGHT;
  return Math.max(0, Math.min(100, weighted * COACHING_SHARE + athleticDirectorBonus(s) + fieldHouseLift(s)));
}

// A fully funded program gets FUNDED_QUALITY_BONUS on top of its staff. Below
// the line a program is underfunded, not unfunded: a proportional penalty, so
// the cut line is a gradient rather than a cliff.
const FUNDED_QUALITY_BONUS = 10;
const UNDERFUNDING_PENALTY = 0.15; // a program drawing nothing runs at 85% of what its staff is worth

export function teamQuality(team: VarsityTeam, s: GameState): number {
  const funded = fundedFractionFor(s, team);
  const quality = (coachingQuality(team, s) + FUNDED_QUALITY_BONUS * funded) * (1 - UNDERFUNDING_PENALTY * (1 - funded));
  return Math.max(0, Math.min(100, Math.round(quality)));
}

// The priority list and the pot. Programs sit in one ordered list
// (s.orgs.teamOrder). Funding is a queue: each active program draws its
// sport's costToCompete off the pot in list order until the pot runs out.
// Flagship / competitive / developmental just name which side of the funded
// line a program sits on. Target: about a quarter of programs fully funded at
// mid-game.
//
//   pot = institutional subsidy (budget tier) + what athletics earned (gate.ts)
//
// Surplus spills into general income (financeSystem.ts). The brakes on this
// feedback loop: the gate saturates, and subsidy and costs are fixed dollars.
// 'awaitingVenue' teams sit out of the queue.
export type ProgramBand = 'flagship' | 'competitive' | 'developmental';

export interface ProgramFunding {
  team: VarsityTeam;
  cost: number;   // $/yr the program draws when fully funded
  drawn: number;  // $/yr it actually drew, in list order
  funded: number; // drawn / cost, 0..1
  band: ProgramBand;
}

export interface DepartmentPot {
  subsidy: number;   // $/yr, the tier's
  earned: number;    // $/yr, the gate
  pot: number;       // subsidy + earned
  programs: ProgramFunding[]; // in list order; 'awaitingVenue' teams are not here
  drawn: number;     // what the programs took between them
  surplus: number;   // pot - drawn: what spills into general income
  fundedLine: number; // programs[0..fundedLine) are fully funded; the line is drawn under that index
}

export const BAND_LABEL: Record<ProgramBand, string> = {
  flagship: 'flagship',
  competitive: 'competitive',
  developmental: 'developmental',
};

// The list as it should be read: the stored order, with ids of teams that
// are gone dropped and teams the list does not know appended in the order
// they were promoted. Pure; the stored array is never written here.
export function orderedTeams(s: GameState): VarsityTeam[] {
  const byId = new Map(s.orgs.teams.map((t) => [t.id, t]));
  const out: VarsityTeam[] = [];
  const seen = new Set<string>();
  for (const id of s.orgs.teamOrder ?? []) {
    const team = byId.get(id);
    if (team && !seen.has(id)) { out.push(team); seen.add(id); }
  }
  for (const team of s.orgs.teams) if (!seen.has(team.id)) out.push(team);
  return out;
}

// Read through a registered reader to avoid an import cycle with gate.ts
// (which imports this module). Zero until registered.
let gateReader: ((s: GameState) => number) | null = null;
export function registerGateReader(reader: (s: GameState) => number): void {
  gateReader = reader;
}

export function departmentPot(s: GameState): DepartmentPot {
  const subsidy = ATHLETICS_BUDGET_TIERS[s.orgs.athleticsBudget].subsidyPerYear;
  const earned = gateReader ? gateReader(s) : 0;
  const pot = subsidy + earned;
  let remaining = pot;
  const programs: ProgramFunding[] = [];
  let fundedLine = 0;
  for (const team of orderedTeams(s)) {
    if (team.status !== 'active') continue;
    const cost = sportEconomics(team.sport).costToCompete;
    const drawn = Math.max(0, Math.min(remaining, cost));
    remaining -= drawn;
    const funded = cost > 0 ? drawn / cost : 1;
    const band: ProgramBand = funded >= 0.999 ? 'flagship' : funded > 0 ? 'competitive' : 'developmental';
    if (band === 'flagship') fundedLine = programs.length + 1;
    programs.push({ team, cost, drawn, funded, band });
  }
  return { subsidy, earned, pot, programs, drawn: pot - remaining, surplus: remaining, fundedLine };
}

export function fundedFractionFor(s: GameState, team: VarsityTeam): number {
  if (team.status !== 'active') return 0;
  return departmentPot(s).programs.find((p) => p.team.id === team.id)?.funded ?? 0;
}

// Program reputation, per sport: decaying title history, sustained quality
// and flagship status. It gates elite coaching candidates, so better programs
// attract better coaches; eventData.ts's 'coach-poached' keeps that loop in
// check.
const REPUTATION_TITLE_DECAY = 0.75;
const REPUTATION_TITLE_WINDOW_YEARS = 10;
const REPUTATION_QUALITY_FLOOR = 70; // sustained quality counts from here up
export const ELITE_MARKET_REPUTATION = 0.4; // an elite candidate lists for a fielded sport only above this

export function programReputation(s: GameState, sportId: string): number {
  let titles = 0;
  for (const t of s.orgs.titles) {
    const age = s.clock.year - t.year;
    if (t.sport !== sportId || age < 0 || age >= REPUTATION_TITLE_WINDOW_YEARS) continue;
    titles += REPUTATION_TITLE_DECAY ** age;
  }
  const team = s.orgs.teams.find((t) => t.sport === sportId && t.status === 'active');
  const quality = team ? Math.max(0, teamQuality(team, s) - REPUTATION_QUALITY_FLOOR) / (100 - REPUTATION_QUALITY_FLOOR) : 0;
  const flagship = team && fundedFractionFor(s, team) >= 0.999 ? 1 : 0;
  return Math.max(0, Math.min(1, 0.5 * Math.min(1, titles) + 0.3 * quality + 0.2 * flagship));
}

// An elite candidate lists for a trainer or an unfielded sport always; for a
// fielded sport only once its program has a reputation.
export function eliteWouldList(s: GameState, field: string): boolean {
  if (!sportById(field)) return true;
  if (!s.orgs.teams.some((t) => t.sport === field && t.status === 'active')) return true;
  return programReputation(s, field) >= ELITE_MARKET_REPUTATION;
}

// A program dragged below the funded line may lose its head coach, so
// reordering is a commitment rather than a free dial. Applied on the reorder.
export const DEMOTED_HEAD_COACH_LEAVES_CHANCE = 0.5;

export function applyTeamOrder(s: GameState, order: string[]): string[] {
  const before = new Map(departmentPot(s).programs.map((p) => [p.team.id, p.funded]));
  s.orgs.teamOrder = order.filter((id) => s.orgs.teams.some((t) => t.id === id));
  const after = departmentPot(s);
  const left: string[] = [];
  for (const p of after.programs) {
    const was = before.get(p.team.id) ?? 0;
    if (was >= 0.999 && p.funded < 0.999 && p.team.headCoach && random() < DEMOTED_HEAD_COACH_LEAVES_CHANCE) {
      left.push(`${p.team.headCoach.name} (${p.team.name})`);
      p.team.headCoach = null;
    }
  }
  return left;
}

// The department's standing, read against rivals' athleticStrength
// (rivalsSystem.ts's athleticRank). Only active teams count. Breadth is
// weighted by each sport's breadthWeight and is full at eight.
const ATHLETIC_BREADTH_FOR_FULL_CREDIT = 8;

export function athleticBreadth(s: GameState): number {
  const active = s.orgs.teams.filter((t) => t.status === 'active');
  return active.reduce((sum, t) => sum + sportEconomics(t.sport).breadthWeight, 0);
}

export function athleticProgramStrength(s: GameState): number {
  const active = s.orgs.teams.filter((t) => t.status === 'active');
  if (active.length === 0) return 0;
  const avgQuality = active.reduce((sum, t) => sum + teamQuality(t, s), 0) / active.length;
  const breadth = Math.min(1, athleticBreadth(s) / ATHLETIC_BREADTH_FOR_FULL_CREDIT);
  // Recruits want to play at a Jock School (an identity tag's teeth, Plan 31).
  // A championship stadium lifts every program (Plan 33, estate/projects.ts).
  return Math.min(100, Math.round(avgQuality * (0.7 + 0.3 * breadth)) + tagTeeth(s, 'athletics') + projectLift(s, 'athletics'));
}

// Every empty chair on an active team, for eventData.ts's 'ad-shortage'.
// 'awaitingVenue' teams are excluded: their gap is the venue, and coaching
// changes nothing until it is built.
export interface VacantChair {
  team: VarsityTeam;
  role: 'head' | 'assistant' | 'trainer';
}

export function vacantChairs(s: GameState): VacantChair[] {
  const out: VacantChair[] = [];
  for (const team of s.orgs.teams) {
    if (team.status !== 'active') continue;
    if (!team.headCoach) out.push({ team, role: 'head' });
    if (!team.assistantCoach) out.push({ team, role: 'assistant' });
    if (!team.trainer) out.push({ team, role: 'trainer' });
  }
  return out;
}

// The field a chair hires from. One place, so the shortage event and the
// hiring screen agree.
export function fieldForChair(chair: VacantChair): string {
  return chair.role === 'trainer' ? TRAINER_FIELD : chair.team.sport;
}

export const CHAIR_LABEL: Record<VacantChair['role'], string> = {
  head: 'head coach',
  assistant: 'assistant coach',
  trainer: 'trainer',
};

// Seat a coach directly. Used by the shortage event, where the money is
// already spent.
export function seatCoach(team: VarsityTeam, role: VacantChair['role'], coach: Coach): void {
  if (role === 'head') team.headCoach = coach;
  else if (role === 'assistant') team.assistantCoach = coach;
  else team.trainer = coach;
}

// A sport club petitions for varsity on its own tenure mark rather than by
// lottery (see eventData.ts's VARSITY_PETITION_WEEK). Kept short so the first
// varsity team lands in a narrow window across runs.
export const VARSITY_PETITION_MIN_TENURE_YEARS = 3;

// Pity timer: if a student centre has stood this long and no sport club has
// ever formed, the next club formation is one.
export const SPORT_CLUB_PITY_YEARS = 2;

export function sportClubEverFormed(s: GameState): boolean {
  return s.orgs.clubs.some((c) => c.sport !== null)
    || s.orgs.teams.length > 0
    || s.orgs.pendingPetitions.some((p) => p.sport);
}

function sportClubOverdue(s: GameState): boolean {
  if (s.orgs.studentCenterWeek <= 0 || sportClubEverFormed(s)) return false;
  const weeks = (s.clock.year - 1) * WEEKS_PER_YEAR + s.clock.week - s.orgs.studentCenterWeek;
  return weeks >= SPORT_CLUB_PITY_YEARS * WEEKS_PER_YEAR;
}

// The year a sport club may first petition to go varsity, shown on the
// Student Life and Athletics tabs.
export function varsityEligibleYear(club: StudentClub): number {
  const from = club.varsityLastAskedYear ?? club.foundedYear;
  return from + VARSITY_PETITION_MIN_TENURE_YEARS;
}

// Sport clubs eligible for the varsity petition: past the tenure gate since
// founding and since any last decline.
export function sportClubsAwaitingVarsity(s: GameState): StudentClub[] {
  return s.orgs.clubs.filter((c) =>
    c.sport !== null
    && s.clock.year - c.foundedYear >= VARSITY_PETITION_MIN_TENURE_YEARS
    && (c.varsityLastAskedYear === null || s.clock.year - c.varsityLastAskedYear >= VARSITY_PETITION_MIN_TENURE_YEARS));
}

// Promote an approved club to a VarsityTeam with the same id, removing it from
// s.orgs.clubs so its club-level social bonus is not counted twice.
// Men's and women's programs are separate records distinguished by a gendered
// SPORTS id, not a gender field. `opts.name` is the team name from SPORTS, so
// a promotion is the one moment a program's display name changes.
export function promoteToVarsityTeam(s: GameState, club: StudentClub, opts: {
  sport: string;
  name: string;
  venueCategory: FacilityType;
  upkeepPerWeek: number;
  status: VarsityTeam['status'];
}): VarsityTeam {
  s.orgs.clubs = s.orgs.clubs.filter((c) => c.id !== club.id);
  const team: VarsityTeam = {
    id: club.id,
    name: opts.name,
    foundedYear: club.foundedYear,
    foundingMembers: club.foundingMembers,
    foundingEnrolled: club.foundingEnrolled,
    upkeepPerWeek: opts.upkeepPerWeek,
    sport: opts.sport,
    venueCategory: opts.venueCategory,
    // Staff start vacant and are hired through the Athletics tab.
    headCoach: null,
    assistantCoach: null,
    trainer: null,
    status: opts.status,
  };
  s.orgs.teams.push(team);
  // New programs join the end of the priority list.
  if (!s.orgs.teamOrder) s.orgs.teamOrder = [];
  s.orgs.teamOrder.push(team.id);
  return team;
}

// =====================================================================
// GATES AND CAPACITY
// =====================================================================

// Read off facilityType so either tier satisfies the gate.
export function hasStudentCenter(s: GameState): boolean {
  return s.tech.some((t) => t.status === 'done' && t.facilityType === 'studentCenter');
}

export function clubCapacity(s: GameState): number {
  return Math.min(MAX_ACTIVE_CLUBS, Math.floor(totalEnrolled(s.students) / STUDENTS_PER_CLUB));
}

export function chapterCapacity(s: GameState): number {
  return Math.min(MAX_ACTIVE_CHAPTERS, Math.floor(totalEnrolled(s.students) / STUDENTS_PER_CHAPTER));
}

// Petitions count against the cap too — otherwise a campus at its limit
// would keep raising petitions the player can never usefully approve.
function pendingOf(s: GameState, kind: OrgPetition['kind']): number {
  return s.orgs.pendingPetitions.filter((p) => p.kind === kind).length;
}

export function canFormClub(s: GameState): boolean {
  if (!hasStudentCenter(s)) return false;
  if (s.orgs.pendingPetitions.length >= MAX_PETITIONS_PER_DIGEST) return false;
  return s.orgs.clubs.length + pendingOf(s, 'club') < clubCapacity(s);
}

export function canFormChapter(s: GameState): boolean {
  // No chapter can form before the player approved a council.
  if (!s.orgs.hellenicCouncilApproved) return false;
  if (s.orgs.pendingPetitions.length >= MAX_PETITIONS_PER_DIGEST) return false;
  return s.orgs.chapters.length + pendingOf(s, 'chapter') < chapterCapacity(s);
}

// =====================================================================
// PETITIONS — what a formation rolls about itself
// =====================================================================

function rollFoundingMembers(base: number): number {
  const spread = 1 - ORG_FOUNDING_MEMBERS_VARIATION + random() * (2 * ORG_FOUNDING_MEMBERS_VARIATION);
  return Math.max(1, Math.round(base * spread));
}

function takenNames(s: GameState): Set<string> {
  return new Set([
    ...s.orgs.clubs.map((c) => c.name),
    ...s.orgs.chapters.map((c) => c.name),
    ...s.orgs.pendingPetitions.map((p) => p.name),
  ]);
}

function nextClubName(s: GameState): string | null {
  const taken = takenNames(s);
  const free = CLUB_NAMES.filter((n) => !taken.has(n));
  return free.length === 0 ? null : pick(free);
}

// A sport not already fielded as a club and not already varsity — so the
// roll can never hand out a second "Soccer Club" while the first is still a
// club, or after it has already been promoted to a team (see SPORTS above).
function rollSportClub(s: GameState): SportDefinition | null {
  const taken = takenNames(s);
  const varsitySports = new Set(s.orgs.teams.map((t) => t.sport));
  const free = SPORTS.filter((sp) => !taken.has(sp.clubName) && !varsitySports.has(sp.id));
  return free.length === 0 ? null : pick(free);
}

// The combination space is 24^3; the bound only guarantees termination.
const CHAPTER_NAME_ATTEMPTS = 24;
function nextChapterName(s: GameState): string | null {
  const taken = takenNames(s);
  for (let i = 0; i < CHAPTER_NAME_ATTEMPTS; i += 1) {
    const name = `${pick(GREEK_LETTERS)} ${pick(GREEK_LETTERS)} ${pick(GREEK_LETTERS)}`;
    if (!taken.has(name)) return name;
  }
  return null;
}

export function rollClubPetition(s: GameState): OrgPetition | null {
  // If the sport draw comes up empty, fall back to an ordinary club.
  const sportDef = sportClubOverdue(s) || random() < SPORT_CLUB_SHARE ? rollSportClub(s) : null;
  const name = sportDef?.clubName ?? nextClubName(s);
  if (name === null) return null;
  return {
    id: newId(),
    kind: 'club',
    name,
    sport: sportDef?.id ?? null,
    foundedYear: s.clock.year,
    foundingMembers: rollFoundingMembers(CLUB_FOUNDING_MEMBERS),
    foundingEnrolled: Math.max(1, totalEnrolled(s.students)),
    upkeepPerWeek: weeksOfOpEx(s, CLUB_UPKEEP_WEEKS_OF_OPEX),
  };
}

export function rollChapterPetition(s: GameState): OrgPetition | null {
  const name = nextChapterName(s);
  if (name === null) return null;
  return {
    id: newId(),
    kind: 'chapter',
    name,
    greekKind: random() < 0.5 ? 'fraternity' : 'sorority',
    foundedYear: s.clock.year,
    foundingMembers: rollFoundingMembers(CHAPTER_FOUNDING_MEMBERS),
    foundingEnrolled: Math.max(1, totalEnrolled(s.students)),
    upkeepPerWeek: weeksOfOpEx(s, CHAPTER_UPKEEP_WEEKS_OF_OPEX),
  };
}

// Everything was rolled when the petition was raised, so the figure shown in
// the digest is the figure charged.
export function activatePetition(s: GameState, petition: OrgPetition): void {
  const base: StudentOrgBase = {
    id: petition.id,
    name: petition.name,
    foundedYear: petition.foundedYear,
    foundingMembers: petition.foundingMembers,
    foundingEnrolled: petition.foundingEnrolled,
    upkeepPerWeek: petition.upkeepPerWeek,
  };
  if (petition.kind === 'club') {
    const club: StudentClub = { ...base, sport: petition.sport ?? null, varsityLastAskedYear: null };
    s.orgs.clubs.push(club);
  } else {
    const chapter: GreekChapter = {
      ...base,
      kind: petition.greekKind ?? 'fraternity',
      glyphs: glyphsFor(base.name),
      housed: false,
      housingAsked: false,
    };
    s.orgs.chapters.push(chapter);
  }
}

// =====================================================================
// DERIVED READINGS
// =====================================================================

// Membership: the founding roll, compounding growth, and a damped response to
// enrollment growth since founding. Capped at total enrollment.
export function orgMembership(org: StudentOrgBase, s: GameState): number {
  const ageYears = Math.max(0, s.clock.year - org.foundedYear);
  const grown = org.foundingMembers * (1 + ORG_MEMBERSHIP_GROWTH_PER_YEAR) ** ageYears;
  const enrolled = Math.max(0, totalEnrolled(s.students));
  const scale = (Math.max(enrolled, 1) / Math.max(org.foundingEnrolled, 1)) ** ORG_ENROLLMENT_TRACKING;
  return Math.max(1, Math.min(enrolled, Math.round(grown * scale)));
}

// Weekly cost of every live organisation, summed by financeSystem.ts.
export function studentOrgUpkeep(s: GameState): number {
  const clubs = s.orgs.clubs.reduce((sum, c) => sum + c.upkeepPerWeek, 0);
  const chapters = s.orgs.chapters.reduce((sum, c) => sum + c.upkeepPerWeek, 0);
  return clubs + chapters + varsityTeamUpkeep(s);
}

// Each team's fixed program upkeep plus its staff's annual salaries converted
// to weekly, scaled by the budget tier. Charged from the week a team goes
// varsity, even while awaiting its venue.
export function varsityTeamUpkeep(s: GameState): number {
  const tier = ATHLETICS_BUDGET_TIERS[s.orgs.athleticsBudget];
  // The director is department overhead, added once but scaled by the same tier.
  const directorWeekly = (s.orgs.athleticDirector?.salary ?? 0) / WEEKS_PER_YEAR;
  return s.orgs.teams.reduce((sum, t) => {
    const staffAnnualSalary = (t.headCoach?.salary ?? 0) + (t.assistantCoach?.salary ?? 0) + (t.trainer?.salary ?? 0);
    return sum + (t.upkeepPerWeek + staffAnnualSalary / WEEKS_PER_YEAR) * tier.upkeepMultiplier;
  }, directorWeekly * tier.upkeepMultiplier);
}

// Whether the school won a national title this year or last. Donor events and
// the endowment campaign read this.
export function inTitleYear(s: GameState): boolean {
  return s.orgs.titles.some((t) => t.year === s.clock.year || t.year === s.clock.year - 1);
}

// The athletics half of studentLifeSocialBonus. Active teams only.
export function athleticsSocialBonus(s: GameState): number {
  const tier = ATHLETICS_BUDGET_TIERS[s.orgs.athleticsBudget];
  const activeTeams = s.orgs.teams.filter((t) => t.status === 'active').length;
  return activeTeams * TEAM_SOCIAL_BONUS * tier.socialMultiplier;
}

// Split per source so the Students tab can report each one.
export function clubSocialBonus(s: GameState): number {
  return s.orgs.clubs.length * CLUB_SOCIAL_BONUS;
}

export function greekSocialBonus(s: GameState): number {
  return s.orgs.chapters.reduce(
    (sum, c) => sum + CHAPTER_SOCIAL_BONUS + (c.housed ? CHAPTER_HOUSED_SOCIAL_BONUS : 0),
    0,
  );
}

// What satisfactionSystem.ts adds: all three sources, capped in aggregate.
// Athletics also feeds campus-life standing (prestigeSystem.ts's
// computeSocialTarget), but none of this touches academic standing.
export function studentLifeSocialBonus(s: GameState): number {
  return Math.min(
    clubSocialBonus(s) + greekSocialBonus(s) + athleticsSocialBonus(s),
    STUDENT_LIFE_SOCIAL_BONUS_CAP,
  );
}
