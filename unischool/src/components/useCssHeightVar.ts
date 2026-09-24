import { useCallback, useEffect, useState } from 'react';

// Keeps a root CSS custom property synced to one element's rendered height
// via ResizeObserver, so `.campus-map-canvas` (styles.css) can inset its
// interactive area by the real height of wrapping floating chrome.
//
// Returns a callback ref backed by state, not a useRef: the toolbar is not
// mounted on App's first render (StartupScreen renders instead), and a
// useRef object's `.current` changing never re-runs an effect.
export function useCssHeightVar(varName: string): (el: HTMLElement | null) => void {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const ref = useCallback((el: HTMLElement | null) => setNode(el), []);

  useEffect(() => {
    if (!node) return;
    const sync = () => document.documentElement.style.setProperty(varName, `${node.getBoundingClientRect().height}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, varName]);

  return ref;
}
