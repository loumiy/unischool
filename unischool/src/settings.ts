import { useSyncExternalStore } from 'react';

// THE PLAYER'S SETTINGS (Plan 34, from v2's; V2 #52): text size, a
// color-vision-safe set of signal colors, and reduced motion beside the
// operating system's own; whether a matter arriving pauses the clock
// (Plan 78E, on unless turned off), and whether the news does (Plan 95T,
// off unless turned on); and the seasons on the map (Plan 74I) on or off. Per-browser conveniences, kept outside the save
// in their own key and read defensively: a browser that refuses storage
// plays at the defaults. Sound keeps its own store (audio/, PR G).

export const TEXT_SCALES = [1, 1.15, 1.3] as const;
export type TextScale = (typeof TEXT_SCALES)[number];
export type ColourVision = 'standard' | 'safe';
export type Motion = 'system' | 'reduce';

export interface GameSettings {
  textScale: TextScale;
  vision: ColourVision;
  motion: Motion;
  // Pause the clock when a matter to decide arrives (Plan 78E). A browser
  // that kept its settings before the key existed reads it as on.
  pauseOnArrival: boolean;
  // Pause the clock when a celebration or a research report arrives (Plan
  // 95T): the news that once stopped it, for the player who wants the stop.
  pauseForNews: boolean;
  // Off holds the map in its summer palette all year (seasons.ts is kept,
  // only not applied): for a player who finds the winter white too much,
  // and for tools/timelapseShoot.mjs, where it strobes once a year.
  seasons: boolean;
  // Anonymous play statistics (Plan 97E, analytics/analytics.ts): asked once,
  // on the title screen, before anything is sent; then on or off here.
  stats: StatsConsent;
  // The feedback form's two prompts (Plan 97F, feedback.ts): after the fifth
  // summer and on the Final Report, each once. Off, neither shows.
  feedbackPrompts: boolean;
}

export type StatsConsent = 'unasked' | 'on' | 'off';

export const DEFAULT_SETTINGS: GameSettings = { textScale: 1, vision: 'standard', motion: 'system', pauseOnArrival: true, pauseForNews: false, seasons: true, stats: 'unasked', feedbackPrompts: true };

export const SETTINGS_KEY = 'unischool.settings.v1';

export function normaliseSettings(raw: unknown): GameSettings {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    textScale: TEXT_SCALES.includes(o.textScale as TextScale) ? (o.textScale as TextScale) : DEFAULT_SETTINGS.textScale,
    vision: o.vision === 'safe' ? 'safe' : 'standard',
    motion: o.motion === 'reduce' ? 'reduce' : 'system',
    pauseOnArrival: o.pauseOnArrival !== false,
    pauseForNews: o.pauseForNews === true,
    seasons: o.seasons !== false,
    stats: o.stats === 'on' || o.stats === 'off' ? o.stats : 'unasked',
    feedbackPrompts: o.feedbackPrompts !== false,
  };
}

function load(): GameSettings {
  try {
    const text = globalThis.localStorage?.getItem(SETTINGS_KEY);
    return normaliseSettings(text ? JSON.parse(text) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let current: GameSettings = load();
const listeners = new Set<() => void>();

// For a module outside React that follows the settings (analytics.ts).
export function onSettings(l: () => void): () => void {
  return subscribe(l);
}

export function getSettings(): GameSettings {
  return current;
}

export function setSettings(patch: Partial<GameSettings>): void {
  current = normaliseSettings({ ...current, ...patch });
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // The settings last the session.
  }
  applySettings(current);
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSettings(): GameSettings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

// Whether motion should be kept to a minimum: the setting, or the
// operating system's preference.
export function reducedMotion(): boolean {
  if (current.motion === 'reduce') return true;
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

// Onto the page: the text scale multiplies every --text-* token, the
// color-vision set swaps the signal colors, and data-motion quiets every
// animation (styles.css).
export function applySettings(s: GameSettings = current): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--text-scale', String(s.textScale));
  root.dataset.vision = s.vision;
  root.dataset.motion = s.motion;
}
