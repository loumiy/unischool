import { useEffect } from 'react';

// Keeps a root CSS custom property synced to one element's REAL rendered
// height, via ResizeObserver. Used by the always-on floating chrome (the
// topbar in App.tsx, the siting tray and log strip — see their own
// callers) whose height isn't a constant: content wraps or grows, so a
// fixed CSS value would either waste map area or, worse, leave a strip of
// tiles physically under an opaque panel — on screen but never reachable.
// `.campus-map-canvas` (see styles.css) insets its interactive area by
// these variables instead of guessing a number.
export function useCssHeightVar(ref: React.RefObject<HTMLElement | null>, varName: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => document.documentElement.style.setProperty(varName, `${el.getBoundingClientRect().height}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, varName]);
}
