import { useSyncExternalStore } from 'react';
import type { PathSurface } from '../state/paving';
import type { Vernacular } from '../state/types';

// Two choices of the session's, not the run's, made in the build menu and
// read by the map as it acts (as plantingChoice.ts's species is): what the
// draw tool paves with, and, in a sandbox, which architecture the next
// building goes up in (null: the college's own).
function choice<T>(initial: T) {
  let current = initial;
  const listeners = new Set<() => void>();
  const get = () => current;
  const set = (next: T) => {
    current = next;
    for (const l of listeners) l();
  };
  const use = () => useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    get,
  );
  return { get, set, use };
}

const surface = choice<PathSurface>('paving');
export const pathSurface = surface.get;
export const setPathSurface = surface.set;
export const usePathSurface = surface.use;

const style = choice<Vernacular | null>(null);
export const buildStyle = style.get;
export const setBuildStyle = style.set;
export const useBuildStyle = style.use;
