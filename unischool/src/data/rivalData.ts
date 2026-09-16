import type { Rival } from '../state/types';

// ---------------------------------------------------------------------
// 99 fictionalized rival schools, so the player's own institution makes a
// field of exactly 100 and a top-50 ranking is the upper HALF of a real
// one (see docs/design/progression.md's "Rankings: the U.S. News
// report") — not just edging out four other names.
// Reputation is the ranking metric; momentum is the hidden trend
// tickRivals uses to keep the leaderboard alive over decades (see
// rivalsSystem.ts for the annual reroll + shock that actually applies
// it).
//
// TWO BANDS, and the split is load-bearing rather than tidy. The first 55
// (r1-r55) span 45 to 99 and none of them starts below ~45: the player
// begins at 35-50 depending on school type (see schoolTypeData.ts), so
// that whole band starts ranked above a fresh university, and cracking the
// top 50 means passing the same handful of schools it has always meant.
// The other 44 (r56-r99) are the TAIL, authored deliberately BELOW that
// floor — see the block comment above them for why the field had to grow
// downward and what the tail buys.
//
// Every school also carries a MASCOT. Nothing mechanical reads it: it is
// what lets a standings row read as a sports page rather than a
// spreadsheet, and what a per-sport table names alongside the school
// (see systems/rivals/rivalsSystem.ts). The player names their own at the
// athletic-director interrupt rather than at founding.
// ---------------------------------------------------------------------

// Athletics V2's own ranking axis (see types.ts's Rival.athleticStrength and
// rivalsSystem.ts's athleticRank). DERIVED rather than hand-authored per
// school below — 99 more hand-picked numbers would be pure busywork with no
// signal a formula can't already give — but not a straight copy of
// reputation either: a deterministic hash of the school's own id seeds a
// wide (0.6x-1.4x) multiplier on reputation, so athletic strength loosely
// tracks academic standing (a bigger, better-resourced school fields a
// bigger program, on average) while staying genuinely independent per
// school — a reputable college can be an athletic minnow and a mid-table
// university can be a real power, same as real conferences. Deterministic
// off the id (not Math.random()) so it's stable across a run rather than
// reshuffling on every reload.
// FNV-1a over the string, then Murmur3's finalizer to avalanche it.
//
// THE FINALIZER IS THE POINT, and this function did not have one. It used
// to be `h = (h * 31 + c) % 1_000_003`, which for inputs as short and as
// similar as 'r1'..'r99' does not disperse at all: r1..r9 all landed within
// 0.000008 of each other and r10..r99 within 0.00026, so the "wide
// (0.6x-1.4x) multiplier" the block below claims was, in practice, a band
// of 0.603 to 0.689. Every rival's athletic strength was therefore about
// 0.65x its reputation — a near-exact copy of the academic axis, which is
// precisely the coupling athleticStrengthFor exists to break.
//
// A plain multiply-and-mod leaves adjacent inputs adjacent; the xor-shift/
// multiply finalizer is what turns a one-character difference into an
// unrelated output. Fixed here rather than left for the per-sport split to
// inherit (see the plan's PR 1C, which hashes id-plus-sport through this
// same function and would have given all 100 schools the same profile).
//
// CONSEQUENCE, stated plainly: every rival's athleticStrength in a NEW game
// changes. A save keeps the value it stored — athleticStrength is state,
// derived once at founding — so no run in progress is disturbed.
function hashUnit(id: string): number {
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

// A small local PRNG, seeded once and then run independently of
// Math.random — see systems/rivals/rivalsSystem.ts's annual drift for the
// one caller and the reason it exists.
export function makeRivalRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function athleticStrengthFor(reputation: number, id: string): number {
  const multiplier = 0.6 + hashUnit(id) * 0.8; // 0.6..1.4
  return Math.max(10, Math.min(100, Math.round(reputation * multiplier)));
}

export function initialRivals(): Rival[] {
  return baseRivals().map((r) => ({ ...r, athleticStrength: athleticStrengthFor(r.reputation, r.id) }));
}

function baseRivals(): Array<Omit<Rival, 'athleticStrength'>> {
  return [
    // --- original five ---
    { id: 'r1', name: 'Ashcombe University', mascot: 'Owls', reputation: 92, momentum: 0.2 },
    { id: 'r2', name: 'Northgate Institute', mascot: 'Engineers', reputation: 85, momentum: 0.5 },
    { id: 'r3', name: 'Vale State', mascot: 'Longhorns', reputation: 71, momentum: -0.3 },
    { id: 'r4', name: 'Bellhaven College', mascot: 'Herons', reputation: 58, momentum: 0.8 },
    { id: 'r5', name: 'Portland Tech', mascot: 'Pioneers', reputation: 45, momentum: 1.1 },

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
    { id: 'r42', name: 'Faircross State University', mascot: 'Crusaders', reputation: 74, momentum: -0.7 },
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

    // --- THE TAIL: the field BELOW a founding school ---------------------
    // Forty-four schools authored beneath the block above's ~45 floor, and
    // that placement is the whole point rather than an aesthetic choice
    // (see docs/plans/07-athletics-rivals.md's section 0). Growing the
    // field from 56 schools to 100 would otherwise change what rank 50
    // MEANS — six schools to pass instead of fifty — and silently retune
    // the mid-game reveal docs/design/progression.md describes into a
    // late-game one. Authored below the old floor, the 50th school by
    // reputation is the same school it has always been, so the top-50
    // entry threshold costs exactly the prestige it did before and not one
    // constant moves.
    //
    // What they buy is the other half: a field the player is INSIDE from
    // week one. A private school opens at 50 (schoolTypeData.ts's
    // BASE_STARTING_REPUTATION 40 + 10) ranked above the whole tail; a
    // public opens at 35 with a dozen of these directly above it to pass
    // in its first decade. That is what makes an always-visible rank
    // readout (see components/StatusHeader.tsx) a motivating number rather
    // than a floor — "#56 of 56" is not a standing, it is the bottom.
    //
    // Small colleges, community colleges and technical institutes by name,
    // because that is what a field below a founding university is made of.
    { id: 'r56', name: 'Pinehurst College', mascot: 'Quakers', reputation: 44, momentum: 0.5 },
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
    { id: 'r80', name: 'Nightingale College', mascot: 'Nightingales', reputation: 26, momentum: 0.7 },
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
