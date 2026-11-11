import type { GameState } from '../state/types';
import { prestigeFigure } from '../format';
import { PILLAR_LABELS, PILLARS, PRESTIGE_MAX, prestigeByPillar, type Pillar } from '../systems/prestige/prestigeSystem';

// ---------------------------------------------------------------------
// Prestige as four pillar bars (Plan 124K, the review by subtraction's card
// 7): at the head of each tab that feeds a pillar (Curriculum, Research,
// Students, Athletics), one bar of prestige stacked by pillar on the
// prestige scale, the tab's own pillar lit and the others faded, with a
// ghost tick where the summer is taking it, so the lag its rise cap makes
// is seen. Its line names the direction, not the target (Plan 126 F). The parts are prestigeSystem.ts's prestigeByPillar. The band's
// prestige chip stays as it is (the owner, on the mock-ups).
// ---------------------------------------------------------------------

// The target is not a figure here either (Plan 126 F: History hides it,
// Plan 98B), so the line says which way the summer is taking it, as
// History's arrow does, and the bar's tick shows how far.
export function pillarHeadLine(part: number, current: number, target: number): string {
  const gap = target - current;
  const way = gap >= 0.05 ? 'rising' : gap <= -0.05 ? 'falling' : 'steady';
  return `${prestigeFigure(part)} of your ${prestigeFigure(current)} prestige · ${way}`;
}

// The bar alone: the four parts stacked from the left, `lit` full and the
// rest faded, the target as a tick. Without `lit`, all four are full: the
// summer review's, which splits `of` (the prestige the summer steps to)
// and fills in from the left as the review opens.
export function PillarBar({ s, lit, of, label }: { s: GameState; lit?: Pillar; of?: number; label: string }) {
  const { parts, target } = prestigeByPillar(s, of);
  const at = (v: number) => `${Math.max(0, Math.min(1, v / PRESTIGE_MAX)) * 100}%`;
  return (
    <span className={`pillar-bar${of !== undefined ? ' filling' : ''}`} role="img" aria-label={label}>
      <span className="pillar-bar-fill">
        {PILLARS.map((p) => (
          <span
            key={p}
            className={`pillar-bar-part pillar-${p}${lit && lit !== p ? ' faded' : ''}`}
            style={{ width: at(parts[p]) }}
            title={`${PILLAR_LABELS[p]}: ${prestigeFigure(parts[p])}`}
          />
        ))}
      </span>
      <span className="pillar-bar-target" style={{ left: at(target) }} aria-hidden="true" />
    </span>
  );
}

// The summer review's line under its bar: each pillar's part, in order.
export function pillarPartsLine(s: GameState, of: number): string {
  const { parts } = prestigeByPillar(s, of);
  return PILLARS.map((p) => `${PILLAR_LABELS[p]} ${prestigeFigure(parts[p])}`).join(' · ');
}

export default function PillarHead({ s, pillar }: { s: GameState; pillar: Pillar }) {
  const { parts, current, target } = prestigeByPillar(s);
  const line = pillarHeadLine(parts[pillar], current, target);
  return (
    <span className={`pillar-head pillar-${pillar}`}>
      <span className="pillar-head-label">{PILLAR_LABELS[pillar]}</span>
      <PillarBar s={s} lit={pillar} label={`${PILLAR_LABELS[pillar]}: ${line}`} />
      <span className="pillar-head-line">{line}</span>
    </span>
  );
}
