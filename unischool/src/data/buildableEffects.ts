import type { Buildable, SatisfactionAttributes } from '../state/types';
import type { Effect, EffectKind } from './effectTypes';
import { AMENITIES } from './facilitiesData';
import { CHAPTER_HOUSE_CAPACITY_BONUS } from './studentLifeData';
import { isAcademicHall } from './techData';
import { count } from '../format';

// What a building gives, as chips (components/EffectChip.tsx, Plan 125 A):
// its beds, its program slots, the students it serves and the need that
// counts them, or the campus beauty a landmark adds. The build menu's tile
// keeps its own short line (BuildPopup.tsx's builtDetail); this is the same
// reading for places with room to draw it, such as a milestone's letter.

const NEED_KIND: Readonly<Record<keyof SatisfactionAttributes, EffectKind>> = {
  academic: 'study', social: 'social', basicNeeds: 'dining', health: 'health', housing: 'beds',
};
const NEED_SERVED: Readonly<Record<keyof SatisfactionAttributes, string>> = {
  academic: 'study places', social: 'students, social life', basicNeeds: 'students fed', health: 'students cared for', housing: 'beds',
};

export function buildableEffects(t: Buildable): Effect[] {
  if (t.kind === 'dorm') return [{ kind: 'beds', figure: count(t.effects?.capacityBonus ?? 0), words: 'beds', tone: 'gain' }];
  if (isAcademicHall(t)) return [{ kind: 'teaching', figure: String(t.slots), words: 'program slots', tone: 'gain' }];
  if (t.chapterHouse) return [{ kind: 'beds', figure: count(CHAPTER_HOUSE_CAPACITY_BONUS), words: 'beds', tone: 'gain' }];
  const out: Effect[] = [];
  const need = t.effects?.satisfactionAttribute;
  const flat = t.effects?.flatSatisfactionBonus;
  if (flat) out.push({ kind: 'social', figure: `+${flat}`, words: 'social life', tone: 'gain' });
  const serves = t.effects?.servesPopulation;
  if (serves) out.push({ kind: need ? NEED_KIND[need] : 'students', figure: count(serves), words: need ? NEED_SERVED[need] : 'students served', tone: 'gain' });
  const beauty = AMENITIES.find((a) => a.id === t.id)?.beauty;
  // A landmark's share of the beauty score is a fraction of a target
  // (systems/estate/beauty.ts), not a figure a player reads: the chip says which way.
  if (beauty) out.push({ kind: 'beauty', words: 'adds campus beauty', tone: 'gain' });
  return out;
}
