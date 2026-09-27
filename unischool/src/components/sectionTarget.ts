import { useEffect } from 'react';
import type { TabSection } from '../data/ladderData';

// A tab's named sections (ladderData.ts's TabSection) as places a link can
// land (Plan 78C): the section's element carries `data-section`, and a tab
// handed that section as its target scrolls to it, then clears the target so
// the same link works twice (App.tsx's overlay).
export function sectionAnchor(id: TabSection): { 'data-section': TabSection } {
  return { 'data-section': id };
}

export function useSectionTarget(target: string | undefined, onTargetConsumed?: () => void): void {
  useEffect(() => {
    if (!target) return;
    window.setTimeout(() => document.querySelector(`[data-section="${CSS.escape(target)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
    onTargetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
}
