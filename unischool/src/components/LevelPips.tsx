import type { Buildable, GameState } from '../state/types';
import { extensionMax, isExtendable } from '../systems/estate/estate';

// A building's level, where it has one to raise (Plan 96D): the stories a
// residence, a dining hall or the library has, out of the most it can
// take; or a chain's step (the Student Center, then its Union Expansion),
// out of the chain's top tier. Null for anything that has no level.
export interface BuildingLevel { level: number; of: number; label: string }

// The highest tier its facility type reaches in the data.
function maxTierOf(s: GameState, t: Buildable): number {
  return s.tech.reduce((max, other) => (other.facilityType === t.facilityType && other.tier !== undefined
    ? Math.max(max, other.tier) : max), t.tier ?? 0);
}

export function buildingLevel(s: GameState, t: Buildable): BuildingLevel | null {
  if (isExtendable(t)) {
    const of = 1 + extensionMax(t);
    const level = 1 + (t.floorsAdded ?? 0);
    return { level, of, label: `Story ${level} of ${of}` };
  }
  if (t.tier === undefined) return null;
  const of = maxTierOf(s, t);
  if (of < 2) return null;
  return { level: t.tier, of, label: `Level ${t.tier} of ${of}` };
}

// The level as pips, filled up to it.
export default function LevelPips({ level }: { level: BuildingLevel }) {
  return (
    <span className="level-pips" role="img" aria-label={level.label} title={level.label}>
      {Array.from({ length: level.of }, (_, i) => <i key={i} className={i < level.level ? 'on' : undefined} />)}
    </span>
  );
}
