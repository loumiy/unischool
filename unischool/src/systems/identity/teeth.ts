import type { GameState } from '../../state/types';
import { tagById, type TagLever } from '../../data/tagData';

// What the identity tags a college holds do (Plan 31), summed by lever. Its
// own module, reading only the stored perception, so the systems the teeth
// reach (beauty, giving, attrition) can import it without importing the
// indicators, which read them back.
export function tagTeeth(s: GameState, lever: TagLever): number {
  return (s.identity?.tags ?? []).reduce((t, id) => {
    const teeth = tagById(id)?.teeth;
    return teeth && teeth.lever === lever ? t + teeth.amount : t;
  }, 0);
}
