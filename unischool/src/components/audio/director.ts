import { AMBIENCE, CUES, type ThemeId } from '../../data/audioData';
import { WEEKS_PER_YEAR, totalEnrolled, type GameState, type LogEntry } from '../../state/types';
import { RUNG_FREEZE, distressOf } from '../../systems/finance/distress';
import { OCCASIONS } from '../../systems/athletics/season';
import { PLAYOFF_WEEK } from '../../systems/athletics/playoffs';

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
  crowd: number; // 0–1 of the crowd's gain: how many live here
  wind: number; // 0–1: how deep the winter is
  birds: number; // chirps a second
  roar: boolean; // a game this week
}

// How deep into winter the week is, 0 to 1: this game's winter runs from
// week 44 to week 8 and is deepest at the turn of the year (as the
// catalogue's winter condition reads it).
export function winterDepth(week: number): number {
  const fromNewYear = week <= WEEKS_PER_YEAR / 2 ? week : week - WEEKS_PER_YEAR;
  return Math.max(0, 1 - Math.abs(fromNewYear) / 9);
}

// A game on this week: one of the season's dated occasions, or the
// postseason, once the college has a varsity team.
export function gameWeek(s: GameState): boolean {
  const dated = OCCASIONS.some((o) => o.week === s.clock.week) || s.clock.week === PLAYOFF_WEEK;
  return dated && s.orgs.teams.some((t) => t.status === 'active');
}

// The campus: a murmur that scales with the roll (and thins over the
// summer, when the students are away), wind with the winter, birds when it
// is not, and a stadium's roar on a game week.
export function ambienceFor(s: GameState | null): AmbienceLevels {
  if (!s) return { crowd: 0, wind: 0.3, birds: 0.2, roar: false };
  const away = s.pendingInterrupt?.type === 'summer' ? AMBIENCE.crowd.summer : 1;
  const winter = winterDepth(s.clock.week);
  const autumn = s.clock.week <= WEEKS_PER_YEAR / 2 ? 0.5 : 1;
  return {
    crowd: Math.min(1, totalEnrolled(s.students) / AMBIENCE.crowd.fullAt) * away,
    wind: winter,
    birds: AMBIENCE.birds.perSecond * (1 - winter) * autumn,
    roar: gameWeek(s),
  };
}

// The effects new log lines cue, each named once: a week that finishes a
// building, a course and a hire plays the three, not the bell three times.
// A team's good news is a cheer.
export function cuesFor(lines: readonly LogEntry[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    const id = l.topic === 'team' ? (l.kind === 'good' ? 'cheer' : undefined) : l.topic ? CUES[l.topic] : undefined;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
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
