import type { GameState, SchoolColors, Vernacular } from './types';
import { institutionName } from './types';
import type { FinalReport } from './finalReport';
import { chronicleOf } from '../systems/chronicle/chronicle';

// THE HALL OF FAME (Plan 33, V2 #56, V1-35): finished runs, hung on the
// title screen as framed portraits with plaques. Kept in its own storage
// key beside the save, so starting a new run never takes one down, a dozen
// at most, newest first. The portrait is the college's own facade, in its
// architecture and colors (StartupScreen.tsx draws it). Nothing unlocks.

export const HALL_KEY = 'unischool.hall';
export const HALL_MAX = 12;

export interface HallEntry {
  id: string;
  college: string;       // the full name
  name: string;          // what the facade carves, with the suffix
  suffix: string;        // 'College' or 'University'
  vernacular: Vernacular;
  colors: SchoolColors;
  title: string;
  mark: string;
  grades: { label: string; grade: string }[];
  eras: { name: string; from: number; to: number; lines: string[] }[];
  year: number;          // the year the report was written
  finishedAt: number;    // epoch milliseconds
}

export function readHall(): HallEntry[] {
  try {
    const raw = localStorage.getItem(HALL_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((e): e is HallEntry => typeof e === 'object' && e !== null && typeof e.id === 'string' && typeof e.title === 'string' && Array.isArray(e.grades) && Array.isArray(e.eras))
      : [];
  } catch {
    return [];
  }
}

// Hangs the run once: the same college's report is not hung twice.
export function hangInHall(s: GameState, report: FinalReport, now = Date.now()): boolean {
  const id = `${institutionName(s.self)}|${report.year}|${report.title}|${report.markScore}`;
  const hall = readHall();
  if (hall.some((e) => e.id === id)) return false;
  const entry: HallEntry = {
    id,
    college: report.college,
    name: s.self.name,
    suffix: s.self.suffix,
    vernacular: s.self.vernacular,
    colors: s.self.colors,
    title: report.title,
    mark: report.mark,
    grades: report.axes.map((a) => ({ label: a.label, grade: a.grade })),
    eras: chronicleOf(s).eras.map((e) => ({ name: e.name, from: e.from, to: e.to, lines: e.lines })),
    year: report.year,
    finishedAt: now,
  };
  try {
    localStorage.setItem(HALL_KEY, JSON.stringify([entry, ...hall].slice(0, HALL_MAX)));
    return true;
  } catch {
    return false;
  }
}
