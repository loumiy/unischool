// ---------------------------------------------------------------------
// The harness's faculty training (Plan 85E). A college specialized in
// academics builds the Faculty Training Institute as it builds any capital
// project that opens (guided.ts's and archetypes.ts's own rules), and every
// player spends the year's training picks as soon as they are there
// (game.ts's playWeek), unless it says otherwise (Player.trains).
//
// The pick: the untrained professor below A with the highest teaching
// potential, the roster's order on a tie; when every professor below A has
// been trained, the same among those trained before (not twice in a year).
// The untrained first is what the academics pillar's term reads, and a
// high-potential professor is most often a recent hire, who stays longest
// and keeps the share up. (Trying the lowest potential first, the
// professors who would never reach an A unaided, was measured in Plan 85E:
// they are older, retire sooner and take their training with them, so the
// term filled more slowly and the strong players reached first place a
// year later.)
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { Faculty, GameState } from '../../src/state/types';
import { isTrained } from '../../src/data/trainingData';
import { picksLeft, whyNotTrain } from '../../src/systems/faculty/training';
import type { Game } from './game';

export function trainingPick(s: GameState): Faculty | undefined {
  const open = s.faculty.filter((f) => whyNotTrain(s, f) === null);
  const best = (list: Faculty[]) => list.reduce<Faculty | undefined>((b, f) => (b === undefined || f.teachingPotential > b.teachingPotential ? f : b), undefined);
  return best(open.filter((f) => !isTrained(f))) ?? best(open);
}

// Spends every pick left this year. Returns how many it spent.
export function useTrainingPicks(g: Game): number {
  let spent = 0;
  while (picksLeft(g.s) > 0) {
    const pick = trainingPick(g.s);
    if (!pick) break;
    const before = picksLeft(g.s);
    g.act({ type: 'TRAIN_FACULTY', facultyId: pick.id });
    if (picksLeft(g.s) >= before) break;
    spent += 1;
  }
  return spent;
}
