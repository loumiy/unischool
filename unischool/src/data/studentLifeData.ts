import type {
  AthleticsBudgetTier, Buildable, Coach, FacilityType, GameState, GreekChapter, OrgPetition,
  StudentClub, StudentOrgBase, VarsityTeam,
} from '../state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../state/types';
import { weeksOfOpEx } from './moneyScale';
import { rollCoachName } from './facultyData';

// ---------------------------------------------------------------------
// STUDENT ORGANISATIONS, AS DATA (see docs/design/student-life.md). Two
// layers, gated on campus the player has already built, and the second
// gated on a decision the player has already made:
//
//   1. CLUBS. Once a student center stands, students occasionally form
//      one. Deliberately the LIGHT beat: a club never stops the clock. A
//      formation raises a PETITION (a log line) and the player answers it
//      at the summer admissions boundary, in the digest that interrupt
//      already carries — approve some, decline the rest, one click.
//   2. GREEK CHAPTERS. Only after the player has explicitly approved a
//      Hellenic Council (an authored decision event, asked once, declinable
//      for the whole run — see eventData.ts). New chapters then form on the
//      same petition/digest path as clubs; what makes them consequential is
//      what happens to them AFTERWARDS, which is also authored as decision
//      events: a scandal (disband, permanently, or pay for a PR campaign)
//      and a one-time housing petition per chapter.
//   3. VARSITY ATHLETICS — a shallow v1 that GROWS OUT OF clubs rather than
//      adding a parallel sport simulation (no match sim, no schedules or
//      standings, no ranking axis — all explicitly deferred). A named share
//      of new club formations roll as SPORT clubs instead of ordinary
//      ones (see SPORT_CLUB_SHARE/SPORTS below); a sport club may petition,
//      once, to go varsity (an authored decision event — see eventData.ts's
//      'varsity-petition', modeled on the chapter housing petition). Going
//      varsity costs money, reveals (and, if needed, waits on) a shared
//      competition venue for the sport's category, and promotes the club to
//      a VarsityTeam record living alongside clubs/chapters in s.orgs.teams
//      — the same flat-per-org capped social contribution and weeks-of-opex
//      upkeep contract, plus a light auto-generated coach. See "VARSITY
//      ATHLETICS" further down this file for the tuning.
//
// WHAT AN ORGANISATION DOES, MECHANICALLY. Exactly two things, both read
// LIVE off s.orgs every week rather than applied once and remembered:
//
//   - It costs money. financeSystem.ts sums upkeepPerWeek across the live
//     lists as one more expense line, so disbanding a chapter removes its
//     cost the same week.
//   - It lifts the SOCIAL satisfaction attribute, flat per organisation
//     (the same shape the quad's flatSatisfactionBonus has — it does not
//     dilute as the campus grows). satisfactionSystem.ts adds it into the
//     satisfaction TARGET, which the stock then drifts toward, so a
//     disbanded chapter's loss is the removal of an ongoing source rather
//     than a one-week dent.
//
// Both key off "an organisation exists", FLAT PER ORG — never off member
// count. Membership below is display-and-flavour only and nothing reads
// it; coupling it to money or satisfaction is a deliberate later decision
// with its own playtest, not something to slip in here.
//
// Prestige is untouched, for the same reason the decision-event table
// leaves it alone: s.self.reputation is a slow-moving stock that drifts
// toward a computed target once a year (see prestigeSystem.ts), and
// student life is not one of that target's inputs.
// ---------------------------------------------------------------------

// =====================================================================
// TUNING — CADENCE. The shared "weekly chance, floored by a cooldown"
// machinery the decision events and research outputs already use. These
// rolls raise petitions; they never raise an interrupt, so nothing here
// competes with s.pendingInterrupt.
// =====================================================================

// Nothing forms before there is somewhere for it to meet.
export const CLUB_FORMATION_WEEKLY_CHANCE = 0.05;
export const CHAPTER_FORMATION_WEEKLY_CHANCE = 0.02;
// One shared floor between ANY two formations, of either kind, so a lucky
// month cannot hand the player a digest of nine petitions.
export const ORG_FORMATION_COOLDOWN_WEEKS = 6;
// And a hard ceiling on one summer's digest, for the same reason: the
// digest is a section of the admissions modal, not a screen of its own.
export const MAX_PETITIONS_PER_DIGEST = 4;

// How many organisations a campus of a given size can sustain. This is the
// "reveal on thresholds the loop already produces" rule (see
// docs/design/economy.mdpacing model) rather than a second scarcity: a
// bigger school simply has more student life in it, and a 350-student
// college supports one club, not twenty. Read against total ENROLLED, not
// bed capacity — most students are commuters, and a big commuter school is
// still a big school full of people who might start a club.
export const STUDENTS_PER_CLUB = 220;
export const STUDENTS_PER_CHAPTER = 900;
// Absolute caps on top, so a 40-year run ends with a list a player can
// still read rather than a hundred rows.
export const MAX_ACTIVE_CLUBS = 24;
export const MAX_ACTIVE_CHAPTERS = 10;

// =====================================================================
// TUNING — MONEY. Sized in weeks of operating cost (see moneyScale.ts) so
// the figures mean the same thing at every stage of a run, and FIXED IN
// DOLLARS at the moment the player approves the organisation.
//
// Fixed rather than re-derived weekly for a concrete reason: deriving a
// line of opex from opex is circular, and a lagged read of last week's
// figure would compound quietly (more clubs -> higher opex -> pricier
// clubs). The consequence is deliberate and worth naming — a club founded
// in year 8 keeps a year-8-sized budget, so it fades to noise against a
// mature school's spending, while a club founded in year 30 costs what a
// club at a big university costs. Clubs are meant to be low-stakes; that
// is the shape of it.
// =====================================================================
export const CLUB_UPKEEP_WEEKS_OF_OPEX = 0.0015;    // ~0.15% of one week's opex, every week (~$68/wk at founding scale)
export const CHAPTER_UPKEEP_WEEKS_OF_OPEX = 0.0060; // a chapter is a house, a staff liaison and an events budget: 4x a club

// =====================================================================
// TUNING — SATISFACTION. A flat contribution to the `social` attribute per
// live organisation, capped in aggregate so student life can never carry
// the attribute on its own — the student center, rec center and quad are
// still what a school builds for social capacity, and clubs are what grows
// inside them.
// =====================================================================
export const CLUB_SOCIAL_BONUS = 0.6;          // points added to `social` per approved club
export const CHAPTER_SOCIAL_BONUS = 2.5;       // significantly heavier per chapter — a chapter IS a social institution
export const CHAPTER_HOUSED_SOCIAL_BONUS = 1.5; // added on top once a chapter has its own house
// A chapter house is real student housing, not just a meeting place — see
// eventData.ts's 'greek-housing' event, which adds this directly to
// s.students.capacity the same way a dorm's capacityBonus effect would
// (chapter houses aren't Buildables with effects of their own, so this is
// applied by hand rather than live-read). Sized well under a dorm rung: a
// real fraternity/sorority house, not a small residence hall.
export const CHAPTER_HOUSE_CAPACITY_BONUS = 40;
// The ceiling on the sum of all of the above. Sized so a full club scene
// AND a full row of housed chapters still bumps against it (they total
// ~40 uncapped), but nothing short of that does — and so that student life
// at its absolute maximum is worth 30 x the 20% social weight = 6 points of
// headline satisfaction. Real, and nowhere near enough to substitute for
// building the social facilities the attribute is mostly scored on.
//
// A full varsity athletics department (all eighteen SPORTS teams active,
// high investment) adds a further 18 x 2.2 x 1.5 = ~59.4 uncapped — twice
// this whole ceiling on its own, and up from ~46.2 when there were fourteen
// teams (itself up from nine before gendering split the two-gender sports
// into independent men's and women's lineages). So a school running clubs,
// Greek life AND athletics at once clears this ceiling several times over. The
// cap is left UNCHANGED rather than raised to "make room" for athletics:
// the point of a shared aggregate cap is exactly that a school cannot stack
// every student-life lever to keep climbing past it, and athletics is
// meant to compete with clubs/Greek life for headroom under it, not add a
// fourth independent one.
export const STUDENT_LIFE_SOCIAL_BONUS_CAP = 30;

// The transient stock nudges the digest applies at the moment of the
// decision, on top of the durable target contribution above. Same
// construction as the decision-event table's dents: satisfaction drifts
// back toward its facilities-derived target at SATISFACTION_DRIFT_RATE a
// week, so the teeth are timing near the summer funnel, not permanence.
// Declining is the one that has to be felt, because approving already has
// a durable source attached and declining has nothing.
export const CLUB_APPROVAL_SATISFACTION_NUDGE = 1;
export const CLUB_DECLINE_SATISFACTION_HIT = 1.5;
export const CHAPTER_APPROVAL_SATISFACTION_NUDGE = 2;
export const CHAPTER_DECLINE_SATISFACTION_HIT = 3;

// =====================================================================
// TUNING — MEMBERSHIP. Display and flavour only: nothing in the game reads
// a member count. It exists so the Student Life tab reads like a campus
// rather than a ledger — an old club is visibly bigger than a young one at
// the same enrollment, which a flat "3% of the student body" model could
// never show.
//
// DERIVED, never stored: membership is a pure function of the three
// founding facts on the record plus today's enrollment (see orgMembership
// below), so it can never drift out of step with the school and costs
// nothing per week to keep current. No history and no trend line — a
// current number is enough (the top-bar sparklines were removed for
// exactly this reason).
// =====================================================================
export const CLUB_FOUNDING_MEMBERS = 14;      // the size a new club starts at, before the per-org roll below
export const CHAPTER_FOUNDING_MEMBERS = 32;   // a chapter pledges a bigger founding class than a club draws
export const ORG_FOUNDING_MEMBERS_VARIATION = 0.4; // +/- share rolled once per organisation, so no two are identical
export const ORG_MEMBERSHIP_GROWTH_PER_YEAR = 0.045; // an established organisation keeps growing on its own
// How hard membership tracks total enrollment. 1 would make every club a
// fixed share of the student body (and erase the point of the model); 0
// would leave a club at a 20x bigger school exactly as big as the day it
// opened. Half-power is "loosely": a school that quadruples doubles its
// clubs' rolls.
export const ORG_ENROLLMENT_TRACKING = 0.5;

// The line the Student Life tab shows where Greek chapters would be, at a
// school that has not been asked about a council yet. Kept here rather than
// in the component so the tab never has to restate a rule the data owns —
// the threshold itself is the decision event's (see eventData.ts's
// HELLENIC_COUNCIL_MIN_CLUBS), and this is deliberately vague about it for
// the same reason no other event advertises its trigger.
export const HELLENIC_COUNCIL_HINT =
  'No Greek life on this campus. Once there is a real club scene, students may petition to charter a Hellenic Council — approving one is a deliberate choice, and a school can decline Greek life entirely.';

// =====================================================================
// NAMES. Authored pools, drawn without repeating what the campus already
// has — a run sees a few dozen clubs across forty years, so the list is
// long enough that a school never founds the same society twice.
// =====================================================================
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

// Chapter names are drawn as three-letter combinations rather than
// authored one by one: the pool is effectively unlimited, which matters
// because a chapter list should never run out of names the way a club list
// eventually would.
const GREEK_LETTERS: readonly string[] = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
  'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon',
  'Phi', 'Chi', 'Psi', 'Omega',
];

// The same twenty-four, as the letters themselves. A chapter has always been
// named out of the list above and has always been WRITTEN in English words,
// which is fine in a list of organisations and wrong on a building: what goes
// over a chapter house's door is ΑΒΓ.
//
// Indexed against GREEK_LETTERS rather than paired with it entry by entry, so
// the two can never drift into disagreeing about which letter is which.
const GREEK_GLYPHS = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';

// A chapter's name in its own alphabet. Exported because a save that predates
// the stored field is carried forward by deriving it from the name the save
// does have (see state/persistence.ts) rather than by a transform migration:
// the name IS the letters, so nothing is being invented.
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
  return items[Math.floor(Math.random() * items.length)];
}

// =====================================================================
// VARSITY ATHLETICS — see the top-of-file note. Everything here is the
// shared model; the petition itself (cost, prompt, choices) is authored as
// a decision event in eventData.ts, the same split CLUB_UPKEEP_WEEKS_OF_OPEX
// (here) vs. GREEK_HOUSE_BUILD_COST_WEEKS (there) already follows.
// =====================================================================

// Share of new CLUB formations that roll as a sport club instead of an
// ordinary one — NOT a second formation stream (see studentLifeSystem.ts's
// tickStudentLife, which is unchanged): the same weekly club roll just
// sometimes draws from SPORTS below instead of CLUB_NAMES. Kept well under
// half so a run's club scene still reads as chess/debate/a cappella with
// sport clubs mixed in, not the other way around — see the PR notes for
// whether this crowds out non-sport clubs in practice.
export const SPORT_CLUB_SHARE = 0.3;

// GENDER. A sport is now one of three profiles — this table IS the named
// classification the PR notes ask for, not a scatter of `sport === 'x'`
// checks: every read that cares (the formation roll, the varsity petition,
// migration) goes through SPORTS below, which is GENERATED from this table,
// never authored twice.
//
//   MEN-ONLY: Football, Baseball — no women's varsity lineage in this model.
//   WOMEN-ONLY: Field Hockey, Softball — the mirror image; note Softball is
//     its own sport here, not "women's Baseball" (that's how it works in the
//     real NCAA too — different rules, different ball, different season).
//   TWO-GENDER: everything else (Soccer, Lacrosse, Basketball, Volleyball,
//     Swim & Dive) — a men's AND a women's lineage, each with its own club,
//     its own varsity petition, and its own team, sharing only the venue
//     category.
//
// A one-gender sport's id is the bare sport key ('football') — there is
// only ever one lineage, so there is nothing to disambiguate. A two-gender
// sport's id gets a suffix per lineage ('soccer-m' / 'soccer-w'), which is
// what makes a men's and a women's club/team of the same sport two
// independent records rather than one shared one: see the STATE SHAPE note
// below.
export type SportGender = 'men' | 'women';

interface SportProfile {
  key: string;                 // base id; the WHOLE id for a one-gender sport
  label: string;                // bare sport name, e.g. 'Soccer', 'Swim & Dive'
  venueCategory: FacilityType;  // shared across every gender of this sport
  genders: readonly SportGender[]; // which lineages this sport fields
}

const GENDER_LABEL: Record<SportGender, string> = { men: "Men's", women: "Women's" };

const SPORT_PROFILES: readonly SportProfile[] = [
  { key: 'soccer', label: 'Soccer', venueCategory: 'athleticsField', genders: ['men', 'women'] },
  { key: 'lacrosse', label: 'Lacrosse', venueCategory: 'athleticsField', genders: ['men', 'women'] },
  { key: 'fieldHockey', label: 'Field Hockey', venueCategory: 'athleticsField', genders: ['women'] },
  { key: 'basketball', label: 'Basketball', venueCategory: 'athleticsArena', genders: ['men', 'women'] },
  { key: 'volleyball', label: 'Volleyball', venueCategory: 'athleticsArena', genders: ['men', 'women'] },
  { key: 'baseball', label: 'Baseball', venueCategory: 'athleticsDiamond', genders: ['men'] },
  { key: 'softball', label: 'Softball', venueCategory: 'athleticsDiamond', genders: ['women'] },
  { key: 'swimming', label: 'Swim & Dive', venueCategory: 'athleticsNatatorium', genders: ['men', 'women'] },
  { key: 'football', label: 'Football', venueCategory: 'footballStadium', genders: ['men'] },
  // --- added in Plan 08's PR 2A, both onto venues that already stand ---
  //
  // TRACK & FIELD runs on the multi-sport field, which already has a track
  // drawn on it: components/groundMarkings.tsx renders a regulation eight-lane
  // 400m stadium oval there, at real proportions, and has since Plan 04's 4C.
  // The sport was waiting on nothing.
  { key: 'track', label: 'Track & Field', venueCategory: 'athleticsField', genders: ['men', 'women'] },
  // ICE HOCKEY shares the arena, and this is a NAMED CALL rather than an
  // obvious one. A real arena converts between hardwood and ice, which is
  // exactly the "shared among varsity teams in one category" model
  // docs/design/student-life.md describes — and the alternative, an
  // `athleticsIceRink` facility type, costs a Buildable, a footprint, a
  // ground marking, a build-rail entry and a map asset for one sport.
  //
  // The cost of the call, stated so a playtest knows to look for it: the
  // arena is now the venue for SIX programs (basketball and volleyball in
  // both genders, plus hockey in both), which is a lot of load on one
  // building. If that reads as thin, the fix is a rink, not a retreat from
  // sharing.
  { key: 'iceHockey', label: 'Ice Hockey', venueCategory: 'athleticsArena', genders: ['men', 'women'] },
  //
  // GOLF IS DECLINED and ROWING DEFERRED — see docs/design/student-life.md.
  // A course is a footprint larger than the campus the game draws; a lake is
  // TERRAIN, and the map has no terrain concept at all (campusData.ts is a
  // tile grid of placements, and the only water in the game is drawn
  // ornamentally inside two ground markings). Water on the map is a
  // campus-map plan, not an athletics one.
];

function sportId(profile: SportProfile, gender: SportGender): string {
  return profile.genders.length > 1 ? `${profile.key}-${gender === 'men' ? 'm' : 'w'}` : profile.key;
}

// NAMING (the item's explicit rule, applied uniformly): a two-gender sport
// reads "Men's Lacrosse Club" -> "Men's Lacrosse Team", independently for
// "Women's Lacrosse"; a one-gender sport carries no gender prefix at all —
// "Football Club" -> "Football Team". This also changes the varsity name
// itself: `teamName` used to be the bare sport ("Football"); it is now the
// full "... Team" string a promoted team is actually named (see
// promoteToVarsityTeam below, which names a team from THIS field rather
// than inheriting the club's own name) — so the displayed varsity name
// gains "Team" across the board, gendered sport and bare sport alike.
function sportDisplayName(profile: SportProfile, gender: SportGender): string {
  return profile.genders.length > 1 ? `${GENDER_LABEL[gender]} ${profile.label}` : profile.label;
}

// The sport -> required-venue-category mapping (item 3's "shared across
// sports"). `clubName` is what the club-formation roll and the Clubs list
// show before varsity; `teamName` is the full display name a promoted team
// is actually given (see promoteToVarsityTeam). `venueCategory` is a
// FacilityType (facilitiesData.ts) — the SECOND lineage to reach varsity in
// the same category, of EITHER gender, finds its venue already revealed (or
// built) and pays only the varsity cost, never a second building: a men's
// and a women's soccer team share one field, exactly as two different
// sports in the same category always have. Football is deliberately alone
// in its category: the football stadium is the pinnacle venue, gated
// behind football's own petition and nothing else.
export interface SportDefinition {
  id: string;
  gender: SportGender;
  clubName: string;
  teamName: string;
  venueCategory: FacilityType;
}

// GENERATED from SPORT_PROFILES, one entry per (sport, fielded gender) —
// 4 one-gender sports + 7 two-gender sports x 2 lineages = 18 entries,
// up from the pre-gendering 9. See the STATE SHAPE note above
// promoteToVarsityTeam: a gendered SPORTS id, not a `gender` field on
// StudentClub/VarsityTeam, is what keeps a men's and a women's program of
// the same sport two independent records.
export const SPORTS: readonly SportDefinition[] = SPORT_PROFILES.flatMap((profile) =>
  profile.genders.map((gender) => {
    const name = sportDisplayName(profile, gender);
    return {
      id: sportId(profile, gender),
      gender,
      clubName: `${name} Club`,
      teamName: `${name} Team`,
      venueCategory: profile.venueCategory,
    };
  }),
);

// Every pre-gendering (bare) SPORTS id that MOVED when its sport split into
// two lineages, mapped to the id an existing club/team on it migrates to.
// Derived from SPORT_PROFILES rather than authored a second time, so it can
// never drift from SPORTS itself. A one-gender sport's id didn't move (it
// was already a single lineage), so it has no entry here — see
// persistence.ts's v24 -> v25 migration, the only reader.
//
// The default gender an existing program migrates to is MEN'S: see that
// migration's own comment for why (the honest reading of an existing
// "Soccer" program is that it was implicitly one squad, and this preserves
// it rather than inventing a second one) and for the visible rename this
// causes.
export const LEGACY_TWO_GENDER_SPORT_MIGRATION: Readonly<Record<string, string>> = Object.fromEntries(
  SPORT_PROFILES.filter((p) => p.genders.length > 1).map((p) => [p.key, sportId(p, 'men')]),
);

export function sportById(id: string | null | undefined): SportDefinition | undefined {
  return SPORTS.find((sp) => sp.id === id);
}

// The venue Buildable serving a category — always exactly one, whatever its
// status (facilitiesData.ts seeds all five 'locked' from the start; see
// Buildable.athleticsVenueReveal). Undefined is defensive only; it can't
// happen against the real seed data, the same "unreachable for real seed
// data" caveat BuildingInfoPanel.tsx's BuildingHallInfo already carries.
export function venueForCategory(s: GameState, category: FacilityType): Buildable | undefined {
  return s.tech.find((t) => t.kind === 'facility' && t.facilityType === category);
}

// The one athletics-wide recruiting & scholarship budget dial (item 4,
// Athletics V2's replacement for the old flat "investment" tier). NOT
// per-team: the social multiplier scales every active team's flat
// contribution together, and the upkeep multiplier scales the whole
// program's running cost (coaching staff included) together, so the player
// turns one dial for the department rather than budgeting sport by sport.
// `qualityBonus` is the new half (see teamQuality below): a bigger budget
// buys better recruits on top of whatever the coaching staff itself is
// worth, the "recruiting" a shallow model without an athlete roster of its
// own can actually represent.
export const ATHLETICS_BUDGET_ORDER: readonly AthleticsBudgetTier[] = ['low', 'medium', 'high'];
export const DEFAULT_ATHLETICS_BUDGET: AthleticsBudgetTier = 'medium';
export const ATHLETICS_BUDGET_TIERS: Record<AthleticsBudgetTier, { socialMultiplier: number; upkeepMultiplier: number; qualityBonus: number }> = {
  low: { socialMultiplier: 0.6, upkeepMultiplier: 0.75, qualityBonus: 0 },
  medium: { socialMultiplier: 1.0, upkeepMultiplier: 1.0, qualityBonus: 8 },
  high: { socialMultiplier: 1.5, upkeepMultiplier: 1.4, qualityBonus: 18 },
};

// The flat per-team social contribution, same shape as CLUB/CHAPTER_SOCIAL_
// BONUS above — an 'awaitingVenue' team contributes nothing yet (there is no
// program to be proud of until it can actually compete), which is also why
// this cannot be gamed by petitioning and stalling on the venue. Sized
// between a club's and a chapter's: a varsity team is a bigger deal than a
// chess club but a campus can have at most eighteen of them (one per SPORTS
// entry — up from nine before gendering split five sports into independent
// men's/women's lineages), against up to ten housed chapters, so per-team
// it can afford to sit close to a chapter's own weight.
export const TEAM_SOCIAL_BONUS = 2.2;

// =====================================================================
// COACHING STAFF (Athletics V2): a standing hiring pool mirroring
// facultyData.ts's own market — generateCandidate/grownStat/facultySalary/
// rollCandidateField/candidateArrivalsThisWeek — the SAME mechanism, kept
// deliberately separate (its own pool, its own field vocabulary) rather
// than folded into s.candidates, per the design ask. One `quality` stat
// instead of Faculty's teaching/research split: a coach is evaluated on one
// thing, not two.
// =====================================================================

export const TRAINER_FIELD = 'strength-conditioning';

// The athletic director's own `field`. Marks a ROLE rather than a sport, the
// same way TRAINER_FIELD marks a discipline — and deliberately NOT one of
// allCoachFields() below, so the standing market never lists a director. An
// AD is not hired off the board; they are offered, once, in an interrupt of
// their own (see systems/events/eventSystem.ts).
export const AD_FIELD = 'athletic-director';

// Coach candidate fields: one per SPORTS entry (a head/assistant coach
// candidate) plus TRAINER_FIELD (a strength & conditioning candidate,
// hireable as any team's trainer regardless of sport). Computed once and
// memoized like facultyData.ts's own candidateListingWeights — SPORTS is a
// fixed seed, not state.
let coachFields: readonly string[] | null = null;
function allCoachFields(): readonly string[] {
  if (!coachFields) coachFields = [...SPORTS.map((sp) => sp.id), TRAINER_FIELD];
  return coachFields;
}

// A new listing's field: uniform across every sport plus TRAINER_FIELD —
// unlike facultyData.ts's demand-weighted rollCandidateField, athletics has
// no curriculum-sized signal for "how many courses need this field" to
// weight against, so every field is an equally likely listing. A simpler
// market than faculty's, matching the shallower depth this whole feature
// asks for.
export function rollCoachField(): string {
  const fields = allCoachFields();
  return fields[Math.floor(Math.random() * fields.length)];
}

// Coaches skew disproportionately to the gender of the sport they coach
// (item 1's explicit ask) — COACH_GENDER_MATCH_CHANCE of a men's-sport
// listing rolls male, and the mirror for women's; a strength &
// conditioning trainer's field carries no sport gender to skew toward, so
// it stays a flat coin flip.
const COACH_GENDER_MATCH_CHANCE = 0.82;

function rollCoachGender(field: string): 'male' | 'female' {
  const sportGender = sportById(field)?.gender;
  if (!sportGender) return Math.random() < 0.5 ? 'male' : 'female'; // TRAINER_FIELD
  const matchGender = sportGender === 'men' ? 'male' : 'female';
  const otherGender = matchGender === 'male' ? 'female' : 'male';
  return Math.random() < COACH_GENDER_MATCH_CHANCE ? matchGender : otherGender;
}

// Quality/salary curves — deliberately simpler than facultyData.ts's
// exponential-approach growth (this feature's whole premise is a lighter
// model than faculty), but the SAME shape: starts at a fraction of a rolled
// ceiling and closes the gap linearly over a plateau window, rather than
// jumping straight to the ceiling at hire.
const COACH_POTENTIAL_MIN = 45;
const COACH_POTENTIAL_RANGE = 45; // rolls 45..90 — a fresh candidate is never a lock for the very top of the market
const COACH_STARTING_POTENTIAL_FRACTION = 0.55;
const COACH_GROWTH_PLATEAU_YEARS = 6;

export function grownCoachQuality(potential: number, tenureWeeks: number): number {
  const start = potential * COACH_STARTING_POTENTIAL_FRACTION;
  const tenureYears = tenureWeeks / WEEKS_PER_YEAR;
  const grownFraction = Math.min(1, tenureYears / COACH_GROWTH_PLATEAU_YEARS);
  return Math.round(start + (potential - start) * grownFraction);
}

// A flat-dollar curve, mirroring facultyData.ts's facultySalary shape
// exactly (skill-linked base, tenure premium on top) rather than this
// file's own weeksOfOpEx-scaled org-upkeep convention — a coach is a
// PERSON on a salary, like a faculty hire, not an organisation's running
// cost line. Simpler than facultySalary by one axis (one `quality` stat,
// not teaching+research), same as the rest of this coaching-staff model.
const COACH_SALARY_BASE = 35_000;
const COACH_SALARY_PER_QUALITY_POINT = 900; // applied to CURRENT (grown) quality
const COACH_SALARY_TENURE_PREMIUM_MAX = 0.5; // up to +50% over the base, at full tenure

export function coachSalaryFor(quality: number, tenureWeeks: number): number {
  const skillBase = COACH_SALARY_BASE + quality * COACH_SALARY_PER_QUALITY_POINT;
  const tenureYears = tenureWeeks / WEEKS_PER_YEAR;
  const tenurePremium = Math.min(1, tenureYears / COACH_GROWTH_PLATEAU_YEARS);
  return Math.round(skillBase * (1 + COACH_SALARY_TENURE_PREMIUM_MAX * tenurePremium));
}

// One freshly-rolled hireable coach candidate, fresh (tenureWeeks 0,
// weeksListed 0) — the coaching-staff mirror of facultyData.ts's own
// generateCandidate.
export function generateCoachCandidate(field: string): Coach {
  const qualityPotential = COACH_POTENTIAL_MIN + Math.round(Math.random() * COACH_POTENTIAL_RANGE);
  const quality = grownCoachQuality(qualityPotential, 0);
  const gender = rollCoachGender(field);
  const rolled = rollCoachName(gender);
  return {
    id: crypto.randomUUID(),
    name: rolled.name,
    gender,
    heritage: rolled.origin,
    field,
    quality,
    qualityPotential,
    tenureWeeks: 0,
    weeksListed: 0,
    salary: coachSalaryFor(quality, 0),
  };
}

// =====================================================================
// THE ATHLETIC DIRECTOR'S OFFER (see systems/events/eventSystem.ts's
// fireAthleticDirectorOffer). Three candidates, rolled once at fire time and
// carried in the interrupt's payload — the pattern eventData.ts's
// 'visiting-scholar' already uses and explains: rolled once so the person
// described is exactly the person hired, because "two rolls would be two
// different people, one of them fictional".
//
// "SALARY THE ONLY REAL DIFFERENTIATOR" is the design ask, and reading it
// correctly is what makes the choice a choice. A faculty hire trades teaching
// against research; an AD has ONE stat, so the only question three cards can
// pose is how much of the department's budget goes to the person running it.
// So the three are a cheap one, a middling one and an expensive one, with
// salary tracking quality closely — and the modal says so in a line rather
// than implying a tradeoff that is not there.
//
// The bands overlap slightly at the edges so the cheap card is not *always*
// the worst: a thrifty director who is genuinely good turns up often enough
// that reading the numbers beats reading the position.
// =====================================================================
const AD_TIERS: ReadonlyArray<{ min: number; range: number }> = [
  { min: 48, range: 14 }, // 48..62 — the bargain
  { min: 58, range: 16 }, // 58..74 — the safe hire
  { min: 70, range: 20 }, // 70..90 — the expensive one
];

// An AD's salary curve is the coaching one with a premium on top: they run
// the department rather than a team, and the whole point of the three cards
// is that the difference between them is money.
const AD_SALARY_PREMIUM = 1.6;

export function adSalaryFor(quality: number): number {
  return Math.round(coachSalaryFor(quality, 0) * AD_SALARY_PREMIUM);
}

// The three, cheapest first — which is also the order the modal shows them,
// so the money reads left to right.
export function rollAthleticDirectorCandidates(): Coach[] {
  return AD_TIERS.map((tier) => {
    const quality = tier.min + Math.round(Math.random() * tier.range);
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    const rolled = rollCoachName(gender);
    return {
      id: crypto.randomUUID(),
      name: rolled.name,
      gender,
      heritage: rolled.origin,
      field: AD_FIELD,
      quality,
      // An AD arrives finished. Unlike a coach they have no growth curve in
      // this model — there is one of them, they are hired once, and a second
      // appreciating-asset arc would be machinery nothing reads.
      qualityPotential: quality,
      tenureWeeks: 0,
      weeksListed: 0,
      salary: adSalaryFor(quality),
    };
  });
}

// =====================================================================
// MASCOTS. The player names theirs in the same modal that hires the athletic
// director — the first moment the question has an answer, since there is now
// something that wears the name.
//
// NOT AT FOUNDING, and that is a decision this plan took from the startup
// screen's own backlog entry rather than an accident of sequencing: the
// founding screen would ask before the player has any reason to care, before
// a single building stands, and typically a decade before a varsity team
// exists.
//
// The list is a starting point, not a constraint — the modal offers a roll
// and a free text field, because a mascot somebody typed is worth more than
// one they accepted. Drawn to sit beside rivalData.ts's own ninety-nine
// without reusing them.
// =====================================================================
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

// A cap, because the name goes in standings rows and championship banners and
// has to fit beside a school's own name.
export const MASCOT_MAX_LENGTH = 24;

export function rollMascotSuggestion(): string {
  return MASCOT_SUGGESTIONS[Math.floor(Math.random() * MASCOT_SUGGESTIONS.length)];
}

// Coach candidates arrive already staggered across the listing window, the
// exact same reasoning facultyData.ts's initialCandidatePool uses — a pool
// seeded flat would empty and refill in synchronized waves instead of
// churning smoothly.
//
// SIZED AGAINST THE NUMBER OF FIELDS, and worth reading as flow rather than
// stock. rollCoachField draws uniformly across every SPORTS id plus
// TRAINER_FIELD, so the pool spreads itself over 19 fields now rather than
// 15 — but what a waiting vacancy actually experiences is the THROUGHPUT:
// with listings living COACH_CANDIDATE_LISTING_WEEKS, a target of 18 turns
// over ~1.5 listings a week, so a given field sees roughly four candidates a
// year and a vacancy waits a season rather than forever.
//
// STILL 18, and not for want of wanting it bigger. At 18 listings over 19
// fields a given role's list is usually empty or a single name, and a market
// of 44 would read far better on the one-pool screen this PR builds.
//
// What blocks it is not the number but what the number is wired to. The pool
// is seeded and refilled straight off Math.random, so its SIZE decides how
// many times the game rolls a die — and sim/balanceSim.ts seeds Math.random
// to make a forty-year run reproducible. Raising 18 to 44 generates 26 more
// candidates at founding and doubles the weekly arrivals, which moves the
// whole stream and lands test/balance-regression.test.ts somewhere new.
//
// Measured, that movement is not a balance effect: across eight seeds the
// raise trends the same way 7 times out of 8 either side, and the OLD size
// fails worse at the seed it fails. The fix is to give the market a generator
// of its own, the way rivalsSystem.ts's annual drift already has one, after
// which this number is free to tune. That is a change to the balance harness's
// relationship with the game and is flagged for the repository owner rather
// than taken here — see the plan's PR 2B note.
export const COACH_CANDIDATE_POOL_TARGET = 18;
export const COACH_CANDIDATE_LISTING_WEEKS = 12;
const COACH_CANDIDATE_ARRIVALS_PER_WEEK_MAX = 3;

export function initialCoachCandidatePool(): Coach[] {
  const pool: Coach[] = [];
  for (let i = 0; i < COACH_CANDIDATE_POOL_TARGET; i += 1) {
    const candidate = generateCoachCandidate(rollCoachField());
    candidate.weeksListed = Math.floor(Math.random() * COACH_CANDIDATE_LISTING_WEEKS);
    pool.push(candidate);
  }
  return pool;
}

export function coachCandidateArrivalsThisWeek(poolSize: number): number {
  return Math.max(0, Math.min(COACH_CANDIDATE_POOL_TARGET - poolSize, COACH_CANDIDATE_ARRIVALS_PER_WEEK_MAX));
}

// Every hired coach across every team, in one flat list — what
// systems/athletics/athleticsSystem.ts grows week over week, and what
// financeSystem.ts's varsityTeamUpkeep (below) sums salary from.
export function assignedCoaches(s: GameState): Coach[] {
  const staff: Coach[] = [];
  for (const t of s.orgs.teams) {
    if (t.headCoach) staff.push(t.headCoach);
    if (t.assistantCoach) staff.push(t.assistantCoach);
    if (t.trainer) staff.push(t.trainer);
  }
  return staff;
}

// A team's quality (item 4's "team quality value (based on above)"): the
// coaching staff's own weighted average — head coach counted heaviest,
// matching real programs' own hierarchy — plus the budget tier's recruiting
// bonus on top. A vacant role scores at COACH_VACANCY_QUALITY rather than 0:
// an unstaffed slot is a real, felt gap, not an instant-fail state, the
// same floor-not-crater philosophy satisfactionSystem.ts's ATTRIBUTE_SCORE_
// FLOOR already uses.
const COACH_VACANCY_QUALITY = 15;
const HEAD_COACH_WEIGHT = 0.5;
const ASSISTANT_COACH_WEIGHT = 0.25;
const TRAINER_WEIGHT = 0.25;

// What the athletic director is worth to every team at once. A SECOND
// department-wide lever beside the budget tier's qualityBonus, and a
// different kind of one: the budget is money, the director is a person, and a
// school can be good at one and bad at the other.
//
// Scaled well under the budget's own top bonus (18) so the AD is a real
// contribution rather than the whole department — a brilliant director cannot
// carry teams with nobody coaching them, which is the thing PR 2E's shortage
// interrupts exist to keep visible.
const AD_QUALITY_SHARE = 0.12; // a 90-quality director is worth ~11 to every team

export function athleticDirectorBonus(s: GameState): number {
  const ad = s.orgs.athleticDirector;
  return ad ? ad.quality * AD_QUALITY_SHARE : 0;
}

export function teamQuality(team: VarsityTeam, s: GameState): number {
  const weighted =
    (team.headCoach?.quality ?? COACH_VACANCY_QUALITY) * HEAD_COACH_WEIGHT
    + (team.assistantCoach?.quality ?? COACH_VACANCY_QUALITY) * ASSISTANT_COACH_WEIGHT
    + (team.trainer?.quality ?? COACH_VACANCY_QUALITY) * TRAINER_WEIGHT;
  const budgetBonus = ATHLETICS_BUDGET_TIERS[s.orgs.athleticsBudget].qualityBonus;
  return Math.max(0, Math.min(100, Math.round(weighted + budgetBonus + athleticDirectorBonus(s))));
}

// The whole athletic department's standing (item 4's "scores & standings"),
// read against rivals' own athleticStrength (rivalData.ts/rivalsSystem.ts's
// athleticRank) the same way self.reputation is read against theirs. An
// 'awaitingVenue' team doesn't count — it can't compete yet, same as it
// contributes nothing to athleticsSocialBonus. A department with more
// active teams reads as a bigger deal than one carrying a single strong
// team (the same "breadth matters" shape curriculum breadth's own score
// uses), capped so fielding a handful of teams doesn't need all eighteen
// SPORTS entries to be taken seriously.
const ATHLETIC_BREADTH_FOR_FULL_CREDIT = 6;

export function athleticProgramStrength(s: GameState): number {
  const active = s.orgs.teams.filter((t) => t.status === 'active');
  if (active.length === 0) return 0;
  const avgQuality = active.reduce((sum, t) => sum + teamQuality(t, s), 0) / active.length;
  const breadth = Math.min(1, active.length / ATHLETIC_BREADTH_FOR_FULL_CREDIT);
  return Math.round(avgQuality * (0.7 + 0.3 * breadth));
}

// EVERY EMPTY CHAIR ON A TEAM THAT CAN ACTUALLY COMPETE, as {team, role}
// pairs — what the athletic director's own shortage event reads (see
// eventData.ts's 'ad-shortage').
//
// 'awaitingVenue' TEAMS ARE EXCLUDED, and that is a judgement about the
// director rather than a filter of convenience. A program with no venue
// cannot play, so its coaching quality changes nothing until the building
// finishes: a director who came to you asking to fill a chair on a team that
// cannot take the field would be a director worth replacing. The gap on such
// a team is the VENUE, and that is a build-rail decision the player is
// already looking at.
//
// It also removes something perverse the first version produced. A school
// that never builds athletics venues accumulates teams stuck awaiting them —
// nine of them, in one of sim/balanceSim.ts's strategies — and the event was
// happily selling it coaches for programs that would never play a match.
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

// The field a chair hires from: the team's own sport for the two coaching
// roles, strength & conditioning for a trainer. One place, so the shortage
// event and the hiring screen can never disagree about who is eligible.
export function fieldForChair(chair: VacantChair): string {
  return chair.role === 'trainer' ? TRAINER_FIELD : chair.team.sport;
}

export const CHAIR_LABEL: Record<VacantChair['role'], string> = {
  head: 'head coach',
  assistant: 'assistant coach',
  trainer: 'trainer',
};

// Put a coach straight into a chair. Used by the shortage event, which
// appoints outright rather than adding to the market — the money is already
// spent at that point, so "now go find them on the list" would be an errand
// rather than a choice (the same reasoning eventData.ts's 'visiting-scholar'
// gives for appointing its scholar directly).
export function seatCoach(team: VarsityTeam, role: VacantChair['role'], coach: Coach): void {
  if (role === 'head') team.headCoach = coach;
  else if (role === 'assistant') team.assistantCoach = coach;
  else team.trainer = coach;
}

// The pipeline's whole cadence, per item's explicit ask: a sport club
// petitions for varsity status on its own five-year mark, not whenever a
// shared random lottery happens to land on it (see eventData.ts's
// VARSITY_PETITION_WEEK for the "which week" half of that same ask).
export const VARSITY_PETITION_MIN_TENURE_YEARS = 5;

// A sport club eligible to be OFFERED the varsity petition: it plays a
// sport, has cleared VARSITY_PETITION_MIN_TENURE_YEARS since founding, and
// either has never been asked before or cleared the same tenure gate again
// since its last decline — a rejection cools the ask down, it doesn't shut
// it off (see StudentClub.varsityLastAskedYear).
export function sportClubsAwaitingVarsity(s: GameState): StudentClub[] {
  return s.orgs.clubs.filter((c) =>
    c.sport !== null
    && s.clock.year - c.foundedYear >= VARSITY_PETITION_MIN_TENURE_YEARS
    && (c.varsityLastAskedYear === null || s.clock.year - c.varsityLastAskedYear >= VARSITY_PETITION_MIN_TENURE_YEARS));
}

// Turns an approved club into a live VarsityTeam (item 2's "promotes the
// club to a varsity team record"). Keeps the SAME id as the club it came
// from — a straight promotion, not a new entity — and removes the club from
// s.orgs.clubs in the same move, which is what stops it drawing its old
// club-level social contribution twice (clubSocialBonus below only ever
// counts what is still in s.orgs.clubs).
//
// STATE SHAPE. A two-gender sport's men's and women's programs are two
// entirely separate StudentClub/VarsityTeam RECORDS, distinguished by a
// gendered SPORTS id (club.sport / team.sport — 'soccer-m' vs 'soccer-w'),
// not by a `gender` field alongside a shared bare sport id. That is what
// makes this promotion (and every other read in this file) completely
// untouched by gendering: `opts.sport` was always "the SPORTS id this
// petition is for," and it still is — it just now happens to resolve to a
// gendered entry. A women's soccer club forming after the men's team is
// already varsity looks, to every function here, exactly like any other
// not-yet-fielded sport: rollSportClub (below) only ever excludes an id
// once THAT id is varsity, and 'soccer-w' isn't 'soccer-m'.
//
// `opts.name` is the team's own display name (see SPORTS' `teamName`) —
// deliberately NOT `club.name` any more. Before gendering the two happened
// to read the same ("Soccer Club" stayed "Soccer Club" once promoted);
// now that team names gain "Team" and a men's/women's prefix uniformly
// (see the naming note above SPORTS), a promotion is the one moment a
// program's display name actually changes, same as a club's name never
// changing while it stays a club.
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
    // All three staff roles start vacant — hired from s.orgs.coachCandidates
    // through the Athletics tab (see types.ts's VarsityTeam), not
    // auto-generated the way a v1 team's coachName used to be.
    headCoach: null,
    assistantCoach: null,
    trainer: null,
    status: opts.status,
  };
  s.orgs.teams.push(team);
  return team;
}

// =====================================================================
// GATES AND CAPACITY
// =====================================================================

// The campus gate on the whole feature: clubs form once a student center
// stands. Read off the facilityType rather than a specific Buildable id so
// either tier satisfies it and a later retune of the facility chain can't
// silently close the gate.
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
  // The Greek gate, checked here as well as in every eligible() over in
  // eventData.ts: no chapter can form before the player approved a council.
  if (!s.orgs.hellenicCouncilApproved) return false;
  if (s.orgs.pendingPetitions.length >= MAX_PETITIONS_PER_DIGEST) return false;
  return s.orgs.chapters.length + pendingOf(s, 'chapter') < chapterCapacity(s);
}

// =====================================================================
// PETITIONS — what a formation rolls about itself
// =====================================================================

function rollFoundingMembers(base: number): number {
  const spread = 1 - ORG_FOUNDING_MEMBERS_VARIATION + Math.random() * (2 * ORG_FOUNDING_MEMBERS_VARIATION);
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

// Three letters, never repeating a name the campus already carries. The
// combination space is 24^3, so the retry loop below effectively always
// succeeds on its first pass; the bound is there so it can never spin.
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
  // A named share of formations draw a sport instead of an ordinary club
  // name (see SPORT_CLUB_SHARE) — one shared roll, not a second stream. If
  // the sport draw comes up empty (every sport already fielded or already
  // varsity), this falls straight back to an ordinary club rather than
  // wasting the week's formation.
  const sportDef = Math.random() < SPORT_CLUB_SHARE ? rollSportClub(s) : null;
  const name = sportDef?.clubName ?? nextClubName(s);
  if (name === null) return null;
  return {
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
    kind: 'chapter',
    name,
    greekKind: Math.random() < 0.5 ? 'fraternity' : 'sorority',
    foundedYear: s.clock.year,
    foundingMembers: rollFoundingMembers(CHAPTER_FOUNDING_MEMBERS),
    foundingEnrolled: Math.max(1, totalEnrolled(s.students)),
    upkeepPerWeek: weeksOfOpEx(s, CHAPTER_UPKEEP_WEEKS_OF_OPEX),
  };
}

// Turns an approved petition into a live organisation, pushed onto the
// slice the two consuming systems read. Everything mechanical about the
// organisation was already rolled when the petition was raised, so
// approving is a move rather than a second roll — the figure shown in the
// digest is the figure charged, the same contract the decision-event table
// follows.
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

// Current membership. Pure, derived, and the only place the model lives:
// the founding roll, its own compounding growth, and a damped response to
// how much the school itself has grown since. Capped at the enrolled class,
// because a society cannot have more members than the campus has students.
export function orgMembership(org: StudentOrgBase, s: GameState): number {
  const ageYears = Math.max(0, s.clock.year - org.foundedYear);
  const grown = org.foundingMembers * (1 + ORG_MEMBERSHIP_GROWTH_PER_YEAR) ** ageYears;
  const enrolled = Math.max(0, totalEnrolled(s.students));
  const scale = (Math.max(enrolled, 1) / Math.max(org.foundingEnrolled, 1)) ** ORG_ENROLLMENT_TRACKING;
  return Math.max(1, Math.min(enrolled, Math.round(grown * scale)));
}

// The weekly operating cost of every live organisation. financeSystem.ts
// sums this as one more expense line — live off the slice, so disbanding a
// chapter removes its cost the same week and nothing static is baked
// anywhere.
export function studentOrgUpkeep(s: GameState): number {
  const clubs = s.orgs.clubs.reduce((sum, c) => sum + c.upkeepPerWeek, 0);
  const chapters = s.orgs.chapters.reduce((sum, c) => sum + c.upkeepPerWeek, 0);
  return clubs + chapters + varsityTeamUpkeep(s);
}

// Every varsity team's running cost: its own program upkeep (fixed at
// grant, like a club's) plus its coaching staff's live, tenure-appreciating
// salaries (annual figures, converted to a weekly line the same way
// financeSystem.ts converts every other salary) — both scaled by the ONE
// budget-lever multiplier (item 4), and both charged from the week the team
// goes varsity regardless of whether it is still 'awaitingVenue' (staff are
// on payroll and a program is running long before the shared venue itself
// is finished). Live-read every week, like the rest of this file, so
// disbanding a team removes its cost the same week — see the PR notes on
// what disbanding is chosen to do to its venue.
export function varsityTeamUpkeep(s: GameState): number {
  const tier = ATHLETICS_BUDGET_TIERS[s.orgs.athleticsBudget];
  // The athletic director is department overhead, not a team's cost, so they
  // are added once outside the per-team sum — but they ARE scaled by the same
  // budget multiplier, because the lever is the whole department's.
  const directorWeekly = (s.orgs.athleticDirector?.salary ?? 0) / WEEKS_PER_YEAR;
  return s.orgs.teams.reduce((sum, t) => {
    const staffAnnualSalary = (t.headCoach?.salary ?? 0) + (t.assistantCoach?.salary ?? 0) + (t.trainer?.salary ?? 0);
    return sum + (t.upkeepPerWeek + staffAnnualSalary / WEEKS_PER_YEAR) * tier.upkeepMultiplier;
  }, directorWeekly * tier.upkeepMultiplier);
}

// The flat contribution live ACTIVE varsity teams make to the `social`
// satisfaction attribute, scaled by the budget lever's social multiplier —
// the athletics half of studentLifeSocialBonus below. An 'awaitingVenue'
// team contributes nothing (see TEAM_SOCIAL_BONUS).
export function athleticsSocialBonus(s: GameState): number {
  const tier = ATHLETICS_BUDGET_TIERS[s.orgs.athleticsBudget];
  const activeTeams = s.orgs.teams.filter((t) => t.status === 'active').length;
  return activeTeams * TEAM_SOCIAL_BONUS * tier.socialMultiplier;
}

// The flat contribution live clubs make to the `social` satisfaction
// attribute, and the same for chapters. Split so the Student Life tab can
// report each source separately without a second copy of either formula.
export function clubSocialBonus(s: GameState): number {
  return s.orgs.clubs.length * CLUB_SOCIAL_BONUS;
}

export function greekSocialBonus(s: GameState): number {
  return s.orgs.chapters.reduce(
    (sum, c) => sum + CHAPTER_SOCIAL_BONUS + (c.housed ? CHAPTER_HOUSED_SOCIAL_BONUS : 0),
    0,
  );
}

// What satisfactionSystem.ts actually adds to the attribute: the three
// sources above (clubs, Greek chapters, varsity athletics), capped in
// aggregate — athletics reaches satisfaction only through this same capped
// social contribution, never prestige directly (see the PR notes' flag on
// where athletics wants prestige and can't have it yet).
export function studentLifeSocialBonus(s: GameState): number {
  return Math.min(
    clubSocialBonus(s) + greekSocialBonus(s) + athleticsSocialBonus(s),
    STUDENT_LIFE_SOCIAL_BONUS_CAP,
  );
}
