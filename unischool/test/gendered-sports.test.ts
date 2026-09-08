// ---------------------------------------------------------------------
// Gendered sports (see data/studentLifeData.ts's SPORT_PROFILES and the PR
// notes). Behavioral checks against the real data/reducer code — not a
// reimplementation — covering the three things the feature actually
// promises:
//   - the catalogue itself: three gender profiles, named consistently;
//   - a men-only sport can never roll a women's club, and vice versa;
//   - a two-gender sport's men's and women's programs are independent
//     lineages that can coexist and graduate on their own timelines, and
//     share one venue regardless of which gender's petition revealed it.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import {
  LEGACY_TWO_GENDER_SPORT_MIGRATION, SPORTS, promoteToVarsityTeam,
  rollClubPetition, sportById, sportClubsAwaitingVarsity, venueForCategory,
} from '../src/data/studentLifeData';
import type { GameState, StudentClub } from '../src/state/types';

// Deterministic PRNG, same construction as test/invariants.test.ts, so the
// formation-roll sweep below is reproducible.
let seed = 987654;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function fresh(): GameState {
  return createInitialState('Gendered Sports', 'private');
}

// A live StudentClub for a given SPORTS id, built by hand (like
// test/invariants.test.ts's staffField) rather than driven through the full
// petition/digest flow — the digest machinery is exercised elsewhere
// (studentLifeSystem.ts's own tick and the varsity-petition event); this
// file is about the sport/gender model itself.
function makeSportClub(id: string, sportId: string): StudentClub {
  const def = sportById(sportId)!;
  return {
    id, name: def.clubName, foundedYear: 1, foundingMembers: 14, foundingEnrolled: 350,
    upkeepPerWeek: 100, sport: sportId, varsityAsked: false,
  };
}

// ---- SPORTS catalogue shape ----
function testCatalogueShape(): void {
  assert(SPORTS.length === 14, `SPORTS has 14 gendered entries (got ${SPORTS.length})`);

  const oneGender = ['football', 'baseball', 'fieldHockey', 'softball'];
  for (const id of oneGender) {
    const def = sportById(id);
    assert(!!def, `one-gender sport keeps its bare id '${id}'`);
  }
  const menOnly = ['football', 'baseball'];
  for (const id of menOnly) {
    assert(sportById(id)?.gender === 'men', `${id} is men-only`);
  }
  const womenOnly = ['fieldHockey', 'softball'];
  for (const id of womenOnly) {
    assert(sportById(id)?.gender === 'women', `${id} is women-only`);
  }

  const twoGender = ['soccer', 'lacrosse', 'basketball', 'volleyball', 'swimming'];
  for (const key of twoGender) {
    const m = sportById(`${key}-m`);
    const w = sportById(`${key}-w`);
    assert(!!m && m.gender === 'men', `${key}-m exists and is men's`);
    assert(!!w && w.gender === 'women', `${key}-w exists and is women's`);
    assert(m!.venueCategory === w!.venueCategory, `${key}'s men's and women's lineages share one venue category`);
    assert(m!.clubName === w!.clubName.replace('Women', 'Men'), `${key}'s club names mirror each other`);
  }

  // Bare (one-gender) ids never appear for a two-gender sport's key.
  assert(sportById('soccer') === undefined, "'soccer' (no suffix) doesn't exist post-gendering");
}

// ---- NAMING (item's explicit rule) ----
function testNaming(): void {
  const football = sportById('football')!;
  assert(football.clubName === 'Football Club', `bare sport club name has no gender prefix (got '${football.clubName}')`);
  assert(football.teamName === 'Football Team', `bare sport TEAM name is "Football Team", not bare "Football" (got '${football.teamName}')`);

  const lacrosseM = sportById('lacrosse-m')!;
  assert(lacrosseM.clubName === "Men's Lacrosse Club", `two-gender club name is gendered (got '${lacrosseM.clubName}')`);
  assert(lacrosseM.teamName === "Men's Lacrosse Team", `two-gender team name is gendered + "Team" (got '${lacrosseM.teamName}')`);

  const lacrosseW = sportById('lacrosse-w')!;
  assert(lacrosseW.clubName === "Women's Lacrosse Club", `independent women's naming (got '${lacrosseW.clubName}')`);
  assert(lacrosseW.teamName === "Women's Lacrosse Team", `independent women's team naming (got '${lacrosseW.teamName}')`);
}

// ---- A men-only sport never rolls a women's club (and vice versa) ----
// Structurally guaranteed (there is only ever one SPORTS entry for a
// one-gender sport), but swept here against the REAL formation roll rather
// than trusted from the catalogue shape alone.
function testFormationNeverCrossesGender(): void {
  const s = fresh();
  const drawn = new Set<string>();
  for (let i = 0; i < 4000; i += 1) {
    s.orgs.clubs = []; // keep every roll a fresh draw, not blocked by "name taken"
    const petition = rollClubPetition(s);
    if (petition?.sport) drawn.add(petition.sport);
  }
  assert(drawn.size > 0, 'the sweep actually drew at least one sport club');
  for (const id of drawn) {
    assert(SPORTS.some((sp) => sp.id === id), `every drawn sport id is a real SPORTS entry (got '${id}')`);
  }
  assert(!drawn.has('football-w'), "a men-only sport's id never grows a '-w' variant");
  assert(!drawn.has('baseball-w'), "baseball never rolls a women's variant");
  assert(!drawn.has('fieldHockey-m'), "a women-only sport's id never grows a '-m' variant");
  assert(!drawn.has('softball-m'), "softball never rolls a men's variant");
}

// ---- Two independent lineages: coexist, graduate independently, share a venue ----
function testIndependentLineages(): void {
  const s = fresh();
  const menClub = makeSportClub('club-soccer-m', 'soccer-m');
  s.orgs.clubs.push(menClub);

  const menTeam = promoteToVarsityTeam(s, menClub, {
    sport: 'soccer-m', name: sportById('soccer-m')!.teamName, venueCategory: 'athleticsField',
    coachName: 'Coach A', coachBaseSalary: 1000, upkeepPerWeek: 500, status: 'awaitingVenue',
  });
  assert(menTeam.name === "Men's Soccer Team", `promoted team is named from the sport's teamName (got '${menTeam.name}')`);
  assert(s.orgs.clubs.find((c) => c.id === menClub.id) === undefined, 'the promoted club is removed from s.orgs.clubs');

  // The women's lineage was never touched — it must still be formable and
  // petitionable, exactly as any other not-yet-fielded sport is.
  const womenClub = makeSportClub('club-soccer-w', 'soccer-w');
  s.orgs.clubs.push(womenClub);
  assert(
    sportClubsAwaitingVarsity(s).some((c) => c.id === womenClub.id),
    "women's soccer club is eligible to petition even though men's soccer is already varsity",
  );

  // Venue sharing: finish the shared field, promote the women's club — it
  // should go straight to 'active', the same "second team in a category"
  // rule a same-sport pair always got, now proven across genders.
  const field = s.tech.find((t) => t.facilityType === 'athleticsField')!;
  field.status = 'done';
  const womenTeam = promoteToVarsityTeam(s, womenClub, {
    sport: 'soccer-w', name: sportById('soccer-w')!.teamName, venueCategory: 'athleticsField',
    coachName: 'Coach B', coachBaseSalary: 1000, upkeepPerWeek: 500,
    status: venueForCategory(s, 'athleticsField')?.status === 'done' ? 'active' : 'awaitingVenue',
  });
  assert(womenTeam.status === 'active', "women's team goes active immediately: the men's field already stands");
  assert(womenTeam.name === "Women's Soccer Team", `women's team keeps its own name (got '${womenTeam.name}')`);
  assert(womenTeam.venueCategory === menTeam.venueCategory, "men's and women's teams share the same venueCategory");

  // Both records survive independently in s.orgs.teams — a graduated
  // lineage never merges with or overwrites its sibling.
  assert(s.orgs.teams.length === 2, `both gendered teams are live, independent records (got ${s.orgs.teams.length})`);
  assert(s.orgs.teams.some((t) => t.sport === 'soccer-m') && s.orgs.teams.some((t) => t.sport === 'soccer-w'),
    'both soccer-m and soccer-w teams exist side by side');
}

// ---- Migration map sanity ----
function testLegacyMigrationMap(): void {
  const twoGenderKeys = ['soccer', 'lacrosse', 'basketball', 'volleyball', 'swimming'];
  for (const key of twoGenderKeys) {
    assert(LEGACY_TWO_GENDER_SPORT_MIGRATION[key] === `${key}-m`, `${key} migrates to its men's id by default`);
  }
  for (const key of ['football', 'baseball', 'fieldHockey', 'softball']) {
    assert(LEGACY_TWO_GENDER_SPORT_MIGRATION[key] === undefined, `${key} (one-gender) has no migration entry — its id never moved`);
  }
}

console.log('gendered-sports tests');
testCatalogueShape();
testNaming();
testFormationNeverCrossesGender();
testIndependentLineages();
testLegacyMigrationMap();

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
