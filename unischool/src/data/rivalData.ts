import type { Rival } from '../state/types';

// ---------------------------------------------------------------------
// ~55 fictionalized rival schools, so a top-50 ranking is a genuine
// competitive field (see docs/design/progression.md's "Rankings: the
// U.S. News report") — not just edging out four other names.
// Reputation is the ranking metric; momentum is the hidden trend
// tickRivals uses to keep the leaderboard alive over decades (see
// rivalsSystem.ts for the annual reroll + shock that actually applies
// it).
//
// Deliberately no rival starts below ~45: the player begins at 35-50
// depending on school type (see foundingData.ts), so the whole field
// starts ranked above a fresh university. Cracking the top 50 takes
// real early-game growth, not a first-week fluke — see rivalsSystem.ts
// and the PR notes for the exact resulting threshold.
// ---------------------------------------------------------------------

// Athletics V2's own ranking axis (see types.ts's Rival.athleticStrength and
// rivalsSystem.ts's athleticRank). DERIVED rather than hand-authored per
// school below — 55 more hand-picked numbers would be pure busywork with no
// signal a formula can't already give — but not a straight copy of
// reputation either: a deterministic hash of the school's own id seeds a
// wide (0.6x-1.4x) multiplier on reputation, so athletic strength loosely
// tracks academic standing (a bigger, better-resourced school fields a
// bigger program, on average) while staying genuinely independent per
// school — a reputable college can be an athletic minnow and a mid-table
// university can be a real power, same as real conferences. Deterministic
// off the id (not Math.random()) so it's stable across a run rather than
// reshuffling on every reload.
function hashUnit(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1_000_003;
  return h / 1_000_003; // 0..1
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
    { id: 'r1', name: 'Ashcombe University', reputation: 92, momentum: 0.2 },
    { id: 'r2', name: 'Northgate Institute', reputation: 85, momentum: 0.5 },
    { id: 'r3', name: 'Vale State', reputation: 71, momentum: -0.3 },
    { id: 'r4', name: 'Bellhaven College', reputation: 58, momentum: 0.8 },
    { id: 'r5', name: 'Portland Tech', reputation: 45, momentum: 1.1 },

    // --- elite tier ---
    { id: 'r6', name: 'Harrowgate University', reputation: 99, momentum: 0.1 },
    { id: 'r7', name: 'Kestrel Bay Institute of Technology', reputation: 97, momentum: -0.4 },
    { id: 'r8', name: 'University of Calderwood', reputation: 96, momentum: 0.3 },
    { id: 'r9', name: 'Marchmont University', reputation: 94, momentum: 0.6 },
    { id: 'r10', name: 'Ravensmoor Institute', reputation: 93, momentum: -0.2 },
    { id: 'r11', name: 'Ironwood University', reputation: 91, momentum: 0.4 },
    { id: 'r12', name: 'Sable Ridge College', reputation: 90, momentum: 0.9 },
    { id: 'r13', name: 'Amberfield University', reputation: 89, momentum: -0.6 },
    { id: 'r14', name: 'Cobalt Hills Institute of Technology', reputation: 88, momentum: 0.2 },
    { id: 'r15', name: 'University of Wrenfield', reputation: 87, momentum: 0.7 },

    // --- strong tier ---
    { id: 'r16', name: 'Thornbury State University', reputation: 86, momentum: -0.5 },
    { id: 'r17', name: 'Foxhollow University', reputation: 84, momentum: 0.3 },
    { id: 'r18', name: 'Larkspur College', reputation: 83, momentum: 1.2 },
    { id: 'r19', name: 'Millbrook Institute', reputation: 82, momentum: -0.1 },
    { id: 'r20', name: 'Windermere Falls University', reputation: 81, momentum: 0.5 },
    { id: 'r21', name: 'Graystone A&M University', reputation: 80, momentum: -0.8 },
    { id: 'r22', name: 'Elderglen College', reputation: 79, momentum: 0.4 },
    { id: 'r23', name: 'Silverpine University', reputation: 78, momentum: 0.1 },
    { id: 'r24', name: 'Hollowcrest Institute of Technology', reputation: 77, momentum: -0.3 },
    { id: 'r25', name: 'Briarcliff University', reputation: 76, momentum: 0.6 },

    // --- upper-mid tier ---
    { id: 'r26', name: 'Stonebridge State University', reputation: 75, momentum: 1.0 },
    { id: 'r27', name: 'Fenwick College', reputation: 74, momentum: -0.4 },
    { id: 'r28', name: 'Copperfield University', reputation: 73, momentum: 0.2 },
    { id: 'r29', name: 'University of Wychwood', reputation: 72, momentum: 0.5 },
    { id: 'r30', name: 'Dunmore Polytechnic', reputation: 70, momentum: -0.6 },
    { id: 'r31', name: 'Osprey Point University', reputation: 69, momentum: 0.3 },
    { id: 'r32', name: 'Thistledown College', reputation: 68, momentum: 0.8 },
    { id: 'r33', name: 'Redmere University', reputation: 67, momentum: -0.2 },
    { id: 'r34', name: 'Greywick Institute of Technology', reputation: 66, momentum: 0.4 },
    { id: 'r35', name: 'Ashford Hollow University', reputation: 65, momentum: -0.5 },

    // --- mid tier ---
    { id: 'r36', name: 'Blackthorn State University', reputation: 81, momentum: 0.7 },
    { id: 'r37', name: 'Cinderford College', reputation: 80, momentum: -0.1 },
    { id: 'r38', name: 'Oakmere University', reputation: 78, momentum: 0.9 },
    { id: 'r39', name: 'Pemberly Institute', reputation: 77, momentum: -0.3 },
    { id: 'r40', name: 'Rushbrook University', reputation: 76, momentum: 0.2 },
    { id: 'r41', name: 'Wintershall College', reputation: 75, momentum: 0.5 },
    { id: 'r42', name: 'Faircross State University', reputation: 74, momentum: -0.7 },
    { id: 'r43', name: 'Halloway University', reputation: 73, momentum: 0.3 },
    { id: 'r44', name: 'Ironmark Institute of Technology', reputation: 72, momentum: 0.6 },
    { id: 'r45', name: 'Quillfield College', reputation: 71, momentum: -0.2 },

    // --- the pack the player must first pass to crack the top 50 ---
    { id: 'r46', name: 'Sedgewick University', reputation: 70, momentum: 0.4 },
    { id: 'r47', name: 'Thackeray College', reputation: 69, momentum: -0.4 },
    { id: 'r48', name: 'Underbridge University', reputation: 68, momentum: 0.1 },
    { id: 'r49', name: 'Vesper Point State University', reputation: 67, momentum: 0.8 },
    { id: 'r50', name: 'Wrenmoor Institute', reputation: 66, momentum: -0.1 },
    { id: 'r51', name: 'Yewcastle College', reputation: 65, momentum: 0.3 },
    { id: 'r52', name: 'Zephyr Hills University', reputation: 64, momentum: -0.5 },
    { id: 'r53', name: 'Alderford State University', reputation: 63, momentum: 0.6 },
    { id: 'r54', name: 'Briskwater College', reputation: 62, momentum: 0.2 },
    { id: 'r55', name: 'Cragmoor University', reputation: 61, momentum: -0.3 },
  ];
}
