import { AMBIENCE, CUES, type ThemeId } from '../../data/audioData';
import { WEEKS_PER_YEAR, type GameState, type LogEntry, type LogTopic } from '../../state/types';
import { playerRank } from '../../systems/rivals/rivalsSystem';
import { RUNG_FREEZE, distressOf } from '../../systems/finance/distress';
import { winterDepth } from '../../state/winter';

// What the college sounds like, read off the state (Plan 34, v2's director
// rewritten for this game's). Pure: the engine plays whatever these say,
// and these say it from a snapshot, so the tests can check what the game
// sounds like without a speaker. Nothing adaptive beyond state switching.

// The music: the founding theme for the first years, the distress
// undertone once the board has frozen construction, the ceremonial theme
// for the last few years and the Final Report, and growth between.
export const FOUNDING_UNTIL = 3;
export const CEREMONIAL_FROM = 46;

export function themeFor(s: GameState | null): ThemeId {
  if (!s) return 'founding';
  if (s.ending) return 'ceremonial';
  if (distressOf(s).rung >= RUNG_FREEZE) return 'distress';
  if (s.clock.year >= CEREMONIAL_FROM) return 'ceremonial';
  if (s.clock.year <= FOUNDING_UNTIL) return 'founding';
  return 'growth';
}

export interface AmbienceLevels {
  birds: number; // chirps a second
}

// How deep into winter the week is: the catalog's own reading
// (state/winter.ts), deepest at the turn of the terms.
export { winterDepth };

// The campus: birds, fewer in the autumn and none in the deep of winter.
// (The crowd's murmur, the winter wind and the stadium's roar were looped
// noise, and late in a big college's game they read as static; gone.)
export function ambienceFor(s: GameState | null): AmbienceLevels {
  if (!s) return { birds: 0.2 };
  const winter = winterDepth(s.clock.week);
  const autumn = s.clock.week <= WEEKS_PER_YEAR / 2 ? 0.5 : 1;
  return { birds: AMBIENCE.birds.perSecond * (1 - winter) * autumn };
}

// Topics that play nothing, on purpose, each with its reason (Plan 70H: a
// test holds every topic to a cue or a line here, so a new one cannot be
// silent by accident). Empty for now: every topic has a sound.
export const SILENT_TOPICS: Partial<Record<LogTopic, string>> = {};

// Where bad news on a topic sounds different from good (Plan 70H): a game
// lost, and money going the wrong way.
const BAD_NEWS: Partial<Record<LogTopic, string>> = { team: 'loss', money: 'alarm' };

// The effects new log lines cue, each named once: a week that finishes a
// building, a course and a hire plays the three, not the bell three times.
// A team's win is a cheer and its loss a loss; its venue's news is the
// building's own line.
export function cuesFor(lines: readonly LogEntry[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    if (!l.topic || (l.topic === 'team' && l.kind === 'info')) continue;
    // A school distinguished is the fanfare, with its banner (Toasts.tsx).
    const id = l.topic === 'milestone' && l.subject?.startsWith('school-distinguished:') ? 'fanfare'
      : l.kind === 'bad' ? (BAD_NEWS[l.topic] ?? CUES[l.topic]) : CUES[l.topic];
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

// What changed between two weeks that no log line says (Plan 70H): ground
// broken or a building pulled down, the rank moving, cash going into the
// red, the board's letters, a title won, and the Final Report.
export function stateCues(before: GameState, after: GameState): string[] {
  const out: string[] = [];
  const placed = (s: GameState) => Object.keys(s.placements).length;
  if (placed(after) > placed(before)) out.push('place');
  else if (placed(after) < placed(before)) out.push('demolish');
  const [was, now] = [playerRank(before), playerRank(after)];
  if (now < was) out.push('rankUp');
  else if (now > was) out.push('rankDown');
  if (before.finance.cash >= 0 && after.finance.cash < 0) out.push('alarm');
  else if (distressOf(after).rung > distressOf(before).rung) out.push('alarm');
  if (after.orgs.titles.length > before.orgs.titles.length) out.push('fanfare');
  if (!before.ending && after.ending) out.push('fanfare');
  return [...new Set(out)];
}

// The log's lines newer than the last one heard. The log is newest first
// and capped, and the reducer clones the state, so the last heard is found
// by its year, week and words; a log that no longer holds it (a load, a new
// run) is heard from where it stands.
const sameLine = (a: LogEntry, b: LogEntry) => a.year === b.year && a.week === b.week && a.message === b.message;
export function linesSince(log: readonly LogEntry[], heard: LogEntry | undefined): LogEntry[] | null {
  if (heard === undefined) return null;
  const i = log.findIndex((l) => sameLine(l, heard));
  return i < 0 ? null : log.slice(0, i);
}
