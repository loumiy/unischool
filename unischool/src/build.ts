// Which build this is (Plan 97B): the game's version, the commit it was
// built from, its edition and the platform it was built for. Feedback from
// a playtest that ships fixes means nothing without them, so the title
// screen, the Credits, the crash screen, the bug report and an exported
// save all say which build made them.
//
// vite.config.ts defines __APP_VERSION__ (package.json's version) and
// __BUILD_ID__ (the short commit, or "local"). Headless callers (the
// harness and the tests, bundled for Node) have no defines and no
// import.meta.env, and read "dev", "local" and the defaults, as
// devBuild.ts does. The editions and platforms are build flags, never
// settings: VITE_EDITION and VITE_PLATFORM.

declare const __APP_VERSION__: string | undefined;
declare const __BUILD_ID__: string | undefined;

export const EDITIONS = ['full', 'demo'] as const;
export type Edition = (typeof EDITIONS)[number];
export const PLATFORMS = ['web', 'itch', 'desktop'] as const;
export type Platform = (typeof PLATFORMS)[number];

const env = (import.meta as ImportMeta & { env?: { VITE_EDITION?: string; VITE_PLATFORM?: string } }).env;

function oneOf<T extends string>(list: readonly T[], value: string | undefined, fallback: T): T {
  return (list as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
}

export const VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'local';
export const EDITION: Edition = oneOf(EDITIONS, env?.VITE_EDITION, 'full');
export const PLATFORM: Platform = oneOf(PLATFORMS, env?.VITE_PLATFORM, 'web');

// The stamp an exported save and a bug report carry.
export interface BuildStamp {
  version: string;
  build: string;
  edition: Edition;
  platform: Platform;
}

export const BUILD_STAMP: BuildStamp = { version: VERSION, build: BUILD_ID, edition: EDITION, platform: PLATFORM };

// What a build is called where a player sees it: "playtest" until 1.0.0,
// which is reserved for launch, and "demo" for the demo edition.
export function buildChannel(version: string = VERSION, edition: Edition = EDITION): string | null {
  if (edition === 'demo') return 'demo';
  return version.startsWith('0.') ? 'playtest' : null;
}

// The title screen's quiet line: "v0.1.0 · playtest".
export function versionLine(version: string = VERSION, edition: Edition = EDITION): string {
  const channel = buildChannel(version, edition);
  return channel ? `v${version} · ${channel}` : `v${version}`;
}

// The line the Credits and the crash screen show, with the commit:
// "Version 0.1.0 (a1b2c3d), playtest".
export function buildLine(stamp: BuildStamp = BUILD_STAMP): string {
  const channel = buildChannel(stamp.version, stamp.edition);
  return `Version ${stamp.version} (${stamp.build})${channel ? `, ${channel}` : ''}`;
}
