import type { Rival } from '../state/types';
import { rivalColorsFor } from './schoolColors';

// ---------------------------------------------------------------------
// 99 fictional rival schools, so the player's institution makes a field of
// exactly 100 and the top 50 is the upper half (docs/design/progression.md).
// Reputation is the ranking metric; momentum is the hidden trend
// rivalsSystem.ts applies each year.
//
// Two bands: r1-r55 start at 45 or above, at or above a founding school (50,
// foundingData.ts's FOUNDING_PRESET); r56-r99 are a tail authored below it
// (see the note above them). Mascots are flavour only; the player names
// their own later.
// ---------------------------------------------------------------------

// A deterministic 0..1 hash of a string, used to derive rival stats from
// their ids so they are stable across reloads. FNV-1a, then Murmur3's
// finalizer: without the finalizer, short similar ids ('r1'..'r99') land
// almost on top of each other and every derived spread collapses.
export function hashUnit(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296; // 0..1
}

// A small local PRNG, seeded once and run independently of random(), so an
// event costs one draw on the global stream however many numbers it needs
// (rivalsSystem.ts's annual drift, systems/techtree/programOffers.ts).
export function makeRivalRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Athletic strength: reputation scaled down, times a per-school 0.6x-1.4x
// hash multiplier, so it loosely tracks academic standing but is independent
// per school. The scale keeps the seeded band short of 100, so the per-sport
// spread fits inside teamQuality's 0..100 without clamping into ties at the
// top. The annual drift (rivalsSystem.ts) may go a little above the seed
// ceiling.
const ATHLETIC_BASE_SCALE = 0.55;
const ATHLETIC_SEED_MIN = 10;
const ATHLETIC_SEED_MAX = 80;

export function athleticStrengthFor(reputation: number, id: string): number {
  const multiplier = 0.6 + hashUnit(id) * 0.8; // 0.6..1.4
  return Math.max(
    ATHLETIC_SEED_MIN,
    Math.min(ATHLETIC_SEED_MAX, Math.round(reputation * ATHLETIC_BASE_SCALE * multiplier)),
  );
}

// Research and social standing, derived like athleticStrength. Each axis
// hashes the id under its own salt, so the three are independent readings of
// the same school. Research uses a narrower band around reputation, because
// research and academic standing genuinely correlate.
const RESEARCH_SPREAD_MIN = 0.75;
const RESEARCH_SPREAD_RANGE = 0.5; // 0.75..1.25

// Social standing is wider, and partly borrows from athleticStrength: a
// sports school reads as a social school.
const SOCIAL_SPREAD_MIN = 0.55;
const SOCIAL_SPREAD_RANGE = 0.9;  // 0.55..1.45
const SOCIAL_ATHLETICS_SHARE = 0.35; // how much of the number the athletic program accounts for

// On the reputation/prestige scale (up to 150), not athleticStrength's, since
// the player's own drifting standings are read against these.
const STANDING_MIN = 5;
const STANDING_MAX = 150;

function clampStanding(v: number): number {
  return Math.max(STANDING_MIN, Math.min(STANDING_MAX, Math.round(v)));
}

export function researchStandingFor(reputation: number, id: string): number {
  return clampStanding(reputation * (RESEARCH_SPREAD_MIN + hashUnit(`${id}:research`) * RESEARCH_SPREAD_RANGE));
}

export function socialStandingFor(reputation: number, athleticStrength: number, id: string): number {
  const own = reputation * (SOCIAL_SPREAD_MIN + hashUnit(`${id}:social`) * SOCIAL_SPREAD_RANGE);
  return clampStanding(own * (1 - SOCIAL_ATHLETICS_SHARE) + athleticStrength * SOCIAL_ATHLETICS_SHARE);
}

// Starting momentum on the derived axes, spread off the id so the trends are
// independent of each other.
const STANDING_MOMENTUM_RANGE = 1.6; // -0.8 .. +0.8

export function standingMomentumFor(id: string, axis: string): number {
  return Math.round((hashUnit(`${id}:${axis}:momentum`) - 0.5) * STANDING_MOMENTUM_RANGE * 100) / 100;
}

// A school's strength in one sport: athleticStrength plus a fixed swing in
// points from a hash of (id, sport). Derived rather than stored, since it is
// reproducible on every read. Additive, not multiplicative, so a mid-table
// department can be a genuine power in one sport. At +/-28 no sport's table
// opens with a tie and most sports have a different leader.
const SPORT_SPREAD_POINTS = 28;

export function sportStrengthFor(rival: Rival, sportId: string): number {
  const swing = (hashUnit(`${rival.id}:${sportId}`) * 2 - 1) * SPORT_SPREAD_POINTS;
  // The band teamQuality (studentLifeData.ts) produces, since the player's
  // per-sport number is a teamQuality.
  return Math.max(5, Math.min(100, Math.round(rival.athleticStrength + swing)));
}

export function initialRivals(): Rival[] {
  return baseRivals().map((r) => {
    const athleticStrength = athleticStrengthFor(r.reputation, r.id);
    return {
      ...r,
      // schoolColors.ts's rivalColorsFor, dealt off the id.
      colors: rivalColorsFor(r.id),
      athleticStrength,
      athleticMomentum: standingMomentumFor(r.id, 'athletic'),
      socialStanding: socialStandingFor(r.reputation, athleticStrength, r.id),
      researchStanding: researchStandingFor(r.reputation, r.id),
      socialMomentum: standingMomentumFor(r.id, 'social'),
      researchMomentum: standingMomentumFor(r.id, 'research'),
    };
  });
}

// The authored fields; everything omitted is derived in initialRivals.
export type AuthoredRival = Omit<Rival,
  'colors' | 'athleticStrength' | 'athleticMomentum' | 'socialStanding' | 'researchStanding' | 'socialMomentum' | 'researchMomentum'>;

// The elite band: the eleven schools authored at 87-99 (Ashcombe, r1, among them). Once the player is above
// ELITE_CLOSE_ABOVE_PRESTIGE they close on the leader (rivalsSystem.ts's
// eliteClosingStep). A fixed set of ids rather than a reputation reading, so
// membership does not change with drift; a test pins it to the table.
export const ELITE_RIVAL_IDS: ReadonlySet<string> = new Set(['r1', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15']);

export function baseRivals(): AuthoredRival[] {
  return [
    // --- original five ---
    { id: 'r1', name: 'Ashcombe University', mascot: 'Owls', reputation: 92, momentum: 0.2 },
    { id: 'r2', name: 'Northgate Institute', mascot: 'Engineers', reputation: 85, momentum: 0.5 },
    { id: 'r3', name: 'Vale State', mascot: 'Longhorns', reputation: 71, momentum: -0.3 },
    { id: 'r4', name: 'Bellhaven College', mascot: 'Herons', reputation: 58, momentum: 0.8 },
    { id: 'r5', name: 'Portside Tech', mascot: 'Pioneers', reputation: 45, momentum: 1.1 },

    // --- elite tier ---
    { id: 'r6', name: 'Harrowgate University', mascot: 'Ravens', reputation: 99, momentum: 0.1 },
    { id: 'r7', name: 'Kestrel Bay Institute of Technology', mascot: 'Kestrels', reputation: 97, momentum: -0.4 },
    { id: 'r8', name: 'University of Calderwood', mascot: 'Stags', reputation: 96, momentum: 0.3 },
    { id: 'r9', name: 'Marchmont University', mascot: 'Lions', reputation: 94, momentum: 0.6 },
    { id: 'r10', name: 'Ravensmoor Institute', mascot: 'Nighthawks', reputation: 93, momentum: -0.2 },
    { id: 'r11', name: 'Ironwood University', mascot: 'Ironmen', reputation: 91, momentum: 0.4 },
    { id: 'r12', name: 'Sable Ridge College', mascot: 'Panthers', reputation: 90, momentum: 0.9 },
    { id: 'r13', name: 'Amberfield University', mascot: 'Hornets', reputation: 89, momentum: -0.6 },
    { id: 'r14', name: 'Cobalt Hills Institute of Technology', mascot: 'Miners', reputation: 88, momentum: 0.2 },
    { id: 'r15', name: 'University of Wrenfield', mascot: 'Wrens', reputation: 87, momentum: 0.7 },

    // --- strong tier ---
    { id: 'r16', name: 'Thornbury State University', mascot: 'Bulldogs', reputation: 86, momentum: -0.5 },
    { id: 'r17', name: 'Foxhollow University', mascot: 'Foxes', reputation: 84, momentum: 0.3 },
    { id: 'r18', name: 'Larkspur College', mascot: 'Larks', reputation: 83, momentum: 1.2 },
    { id: 'r19', name: 'Millbrook Institute', mascot: 'Millers', reputation: 82, momentum: -0.1 },
    { id: 'r20', name: 'Windermere Falls University', mascot: 'Rapids', reputation: 81, momentum: 0.5 },
    { id: 'r21', name: 'Graystone A&M University', mascot: 'Aggies', reputation: 80, momentum: -0.8 },
    { id: 'r22', name: 'Elderglen College', mascot: 'Elk', reputation: 79, momentum: 0.4 },
    { id: 'r23', name: 'Silverpine University', mascot: 'Timberwolves', reputation: 78, momentum: 0.1 },
    { id: 'r24', name: 'Hollowcrest Institute of Technology', mascot: 'Voltmen', reputation: 77, momentum: -0.3 },
    { id: 'r25', name: 'Briarcliff University', mascot: 'Badgers', reputation: 76, momentum: 0.6 },

    // --- upper-mid tier ---
    { id: 'r26', name: 'Stonebridge State University', mascot: 'Masons', reputation: 75, momentum: 1.0 },
    { id: 'r27', name: 'Fenwick College', mascot: 'Otters', reputation: 74, momentum: -0.4 },
    { id: 'r28', name: 'Copperfield University', mascot: 'Colonels', reputation: 73, momentum: 0.2 },
    { id: 'r29', name: 'University of Wychwood', mascot: 'Druids', reputation: 72, momentum: 0.5 },
    { id: 'r30', name: 'Dunmore Polytechnic', mascot: 'Anvils', reputation: 70, momentum: -0.6 },
    { id: 'r31', name: 'Osprey Point University', mascot: 'Ospreys', reputation: 69, momentum: 0.3 },
    { id: 'r32', name: 'Thistledown College', mascot: 'Thistles', reputation: 68, momentum: 0.8 },
    { id: 'r33', name: 'Redmere University', mascot: 'Cardinals', reputation: 67, momentum: -0.2 },
    { id: 'r34', name: 'Greywick Institute of Technology', mascot: 'Machinists', reputation: 66, momentum: 0.4 },
    { id: 'r35', name: 'Ashford Hollow University', mascot: 'Greyhounds', reputation: 65, momentum: -0.5 },

    // --- mid tier ---
    { id: 'r36', name: 'Blackthorn State University', mascot: 'Blackbirds', reputation: 81, momentum: 0.7 },
    { id: 'r37', name: 'Cinderford College', mascot: 'Smiths', reputation: 80, momentum: -0.1 },
    { id: 'r38', name: 'Oakmere University', mascot: 'Oaks', reputation: 78, momentum: 0.9 },
    { id: 'r39', name: 'Pemberly Institute', mascot: 'Pilgrims', reputation: 77, momentum: -0.3 },
    { id: 'r40', name: 'Rushbrook University', mascot: 'Rivermen', reputation: 76, momentum: 0.2 },
    { id: 'r41', name: 'Wintershall College', mascot: 'Snow Leopards', reputation: 75, momentum: 0.5 },
    { id: 'r42', name: 'Faircross State University', mascot: 'Wardens', reputation: 74, momentum: -0.7 },
    { id: 'r43', name: 'Halloway University', mascot: 'Hawks', reputation: 73, momentum: 0.3 },
    { id: 'r44', name: 'Ironmark Institute of Technology', mascot: 'Forgers', reputation: 72, momentum: 0.6 },
    { id: 'r45', name: 'Quillfield College', mascot: 'Scribes', reputation: 71, momentum: -0.2 },

    // --- the pack the player must first pass to crack the top 50 ---
    { id: 'r46', name: 'Sedgewick University', mascot: 'Mariners', reputation: 70, momentum: 0.4 },
    { id: 'r47', name: 'Thackeray College', mascot: 'Rooks', reputation: 69, momentum: -0.4 },
    { id: 'r48', name: 'Underbridge University', mascot: 'Bridgemen', reputation: 68, momentum: 0.1 },
    { id: 'r49', name: 'Vesper Point State University', mascot: 'Nightjars', reputation: 67, momentum: 0.8 },
    { id: 'r50', name: 'Wrenmoor Institute', mascot: 'Moorhens', reputation: 66, momentum: -0.1 },
    { id: 'r51', name: 'Yewcastle College', mascot: 'Archers', reputation: 65, momentum: 0.3 },
    { id: 'r52', name: 'Zephyr Hills University', mascot: 'Zephyrs', reputation: 64, momentum: -0.5 },
    { id: 'r53', name: 'Alderford State University', mascot: 'Riverhawks', reputation: 63, momentum: 0.6 },
    { id: 'r54', name: 'Briskwater College', mascot: 'Kingfishers', reputation: 62, momentum: 0.2 },
    { id: 'r55', name: 'Cragmoor University', mascot: 'Mountaineers', reputation: 61, momentum: -0.3 },

    // --- The tail: the field below a founding school ---------------------
    // Authored below the ~45 floor so the 50th school by reputation is the
    // same as with a 56-school field, and the top-50 threshold is unchanged
    // (docs/plans/07-athletics-rivals.md, section 0). It gives a founding
    // school a meaningful mid-table rank from week one (StatusHeader.tsx),
    // and somewhere to fall to.
    { id: 'r56', name: 'Pinehurst College', mascot: 'Pilots', reputation: 44, momentum: 0.5 },
    { id: 'r57', name: 'Marlowe Community College', mascot: 'Mariners', reputation: 44, momentum: -0.2 },
    { id: 'r58', name: 'Ashbury State College', mascot: 'Sentinels', reputation: 43, momentum: 0.9 },
    { id: 'r59', name: 'Dunwich Technical Institute', mascot: 'Tinkers', reputation: 42, momentum: 0.3 },
    { id: 'r60', name: 'Harlan Valley College', mascot: 'Valleymen', reputation: 41, momentum: -0.6 },
    { id: 'r61', name: 'Westmarch College', mascot: 'Wardens', reputation: 41, momentum: 0.7 },
    { id: 'r62', name: 'Cobblestone State College', mascot: 'Cobblers', reputation: 40, momentum: 0.2 },
    { id: 'r63', name: 'Thornfield College', mascot: 'Brambles', reputation: 39, momentum: -0.4 },
    { id: 'r64', name: 'Ellsworth Technical College', mascot: 'Dynamos', reputation: 38, momentum: 1.0 },
    { id: 'r65', name: 'Nettlebrook College', mascot: 'Nettles', reputation: 38, momentum: 0.1 },
    { id: 'r66', name: 'Gravesend State College', mascot: 'Gravediggers', reputation: 37, momentum: -0.5 },
    { id: 'r67', name: 'Aldermere College', mascot: 'Alders', reputation: 36, momentum: 0.6 },
    { id: 'r68', name: 'Ferncliff College', mascot: 'Cliffhawks', reputation: 35, momentum: 0.3 },
    { id: 'r69', name: 'Brackwater Technical Institute', mascot: 'Dredgers', reputation: 35, momentum: -0.3 },
    { id: 'r70', name: 'Lowmoor State College', mascot: 'Moorcats', reputation: 34, momentum: 0.8 },
    { id: 'r71', name: 'Sandgate College', mascot: 'Sandpipers', reputation: 33, momentum: -0.1 },
    { id: 'r72', name: 'Kirkhaven College', mascot: 'Chanters', reputation: 32, momentum: 0.4 },
    { id: 'r73', name: 'Petersfield Technical College', mascot: 'Pistons', reputation: 32, momentum: 1.1 },
    { id: 'r74', name: 'Oldbridge State College', mascot: 'Spans', reputation: 31, momentum: -0.7 },
    { id: 'r75', name: 'Hazelmere College', mascot: 'Hazels', reputation: 30, momentum: 0.2 },
    { id: 'r76', name: 'Duncastle College', mascot: 'Keepers', reputation: 29, momentum: 0.9 },
    { id: 'r77', name: 'Willowmere Technical Institute', mascot: 'Willows', reputation: 29, momentum: -0.2 },
    { id: 'r78', name: 'Barrowfield College', mascot: 'Barrowmen', reputation: 28, momentum: 0.5 },
    { id: 'r79', name: 'Crestmill State College', mascot: 'Millhands', reputation: 27, momentum: -0.4 },
    { id: 'r80', name: 'Nightjar College', mascot: 'Nightjars', reputation: 26, momentum: 0.7 },
    { id: 'r81', name: 'Stillwater Technical College', mascot: 'Stillmen', reputation: 26, momentum: 0.1 },
    { id: 'r82', name: 'Ashen Green College', mascot: 'Cinders', reputation: 25, momentum: -0.6 },
    { id: 'r83', name: 'Meadowbank College', mascot: 'Meadowlarks', reputation: 24, momentum: 0.3 },
    { id: 'r84', name: 'Fallowden State College', mascot: 'Harriers', reputation: 23, momentum: 1.2 },
    { id: 'r85', name: 'Rookwood College', mascot: 'Rookery', reputation: 23, momentum: -0.1 },
    { id: 'r86', name: "Tanner's Ford College", mascot: 'Tanners', reputation: 22, momentum: 0.6 },
    { id: 'r87', name: 'Selby Point College', mascot: 'Lighthouses', reputation: 21, momentum: -0.3 },
    { id: 'r88', name: 'Ironbark Technical College', mascot: 'Barkmen', reputation: 20, momentum: 0.4 },
    { id: 'r89', name: 'Glassmoor College', mascot: 'Glassblowers', reputation: 20, momentum: 0.8 },
    { id: 'r90', name: 'Hartsend College', mascot: 'Harts', reputation: 19, momentum: -0.5 },
    { id: 'r91', name: "Peddler's Cross College", mascot: 'Peddlers', reputation: 18, momentum: 0.2 },
    { id: 'r92', name: 'Winnow Hill College', mascot: 'Winnowers', reputation: 17, momentum: 0.5 },
    { id: 'r93', name: 'Draycott College', mascot: 'Draymen', reputation: 17, momentum: -0.2 },
    { id: 'r94', name: 'Saltmarsh Technical College', mascot: 'Saltmen', reputation: 16, momentum: 0.9 },
    { id: 'r95', name: 'Coldharbour College', mascot: 'Harbourmen', reputation: 15, momentum: 0.1 },
    { id: 'r96', name: 'Mirebeck College', mascot: 'Mirelarks', reputation: 14, momentum: -0.4 },
    { id: 'r97', name: 'Tallow Creek College', mascot: 'Chandlers', reputation: 14, momentum: 0.7 },
    { id: 'r98', name: 'Hollowford College', mascot: 'Hollowmen', reputation: 13, momentum: 0.3 },
    { id: 'r99', name: 'Ravensgate Community College', mascot: 'Gatekeepers', reputation: 12, momentum: 0.6 },
  ];
}
