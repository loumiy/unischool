import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { GameState, LogEntry } from '../../state/types';
import { ambienceFor, cuesFor, linesSince, themeFor } from './director';
import { audio } from './engine';
import type { AudioSettings } from './settings';

// The glue between the state and the speaker (Plan 34, v2's). The engine
// starts on the first gesture anywhere on the page; after that every new
// state sets the theme and the ambience, and new log lines cue their
// effects. A loaded save or a new run is heard from where it stands, not
// replayed from its first week.

// More than this many new lines at once is a load, not a week.
const CATCH_UP = 60;

export function useAudioDirector(s: GameState | null): void {
  const heard = useRef<LogEntry | undefined>(undefined);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    audio.setTheme(themeFor(s));
    audio.setAmbience(ambienceFor(s));
    if (!s) return;
    const fresh = linesSince(s.log, heard.current);
    heard.current = s.log[0];
    if (fresh === null || fresh.length > CATCH_UP) return;
    for (const id of cuesFor(fresh)) audio.play(id);
  }, [s]);
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(audio.subscribe, audio.getSettings);
}
