import { hashUnit } from './rivalData';

// ---------------------------------------------------------------------
// Lines the log says often (Plan 70I, "words that don't repeat"): a game's
// result, and a building, a course or a program finished. Three tellings of
// each, picked by a hash of what the line is about and the year, never the
// run's stream, and never last year's telling of the same thing.
//
// Placeholders: {team} {them} {trophy} {streak} {series} {record} for games
// ({streak} is empty, or a phrase with its own leading space or dash);
// {name} and {hall} for completions. An upset's lead-in is prefixed in code,
// so every game telling reads after a colon.
// ---------------------------------------------------------------------

export const GAME_LINES = {
  rivalry: {
    won: [
      '{team} beat {them} for {trophy}{streak}. The series stands {series}.',
      '{team} took {trophy} from {them}{streak}, and the series stands {series}.',
      '{trophy} stays with {team}, who beat {them}{streak}. The series stands {series}.',
    ],
    lost: [
      '{team} lost {trophy} to {them}{streak}. The series stands {series}.',
      '{them} beat {team} for {trophy}{streak}. The series stands {series}.',
      '{trophy} went to {them}{streak}; {team} could not hold them. The series stands {series}.',
    ],
  },
  opener: {
    won: [
      '{team} opens the season with a win over {them}.',
      '{team} beat {them} in the season opener.',
      '{team} opened the year by beating {them}.',
    ],
    lost: [
      '{team} opens the season with a loss to {them}.',
      '{them} beat {team} in the season opener.',
      '{team} started the year with a defeat to {them}.',
    ],
  },
  homecoming: {
    won: [
      '{team} beat {them} before the homecoming crowd. {record} on the year.',
      '{team} beat {them} at homecoming, and the alumni stayed late. {record} on the year.',
      'Homecoming belonged to {team}, winners over {them}. {record} on the year.',
    ],
    lost: [
      '{team} lost to {them} in front of the homecoming crowd. {record} on the year.',
      '{them} spoiled homecoming, beating {team}. {record} on the year.',
      '{team} fell to {them} at homecoming, and the alumni went home quietly. {record} on the year.',
    ],
  },
} as const;

export const UPSET_LEAD = {
  rivalry: 'An upset: ',
  opener: 'An upset to open the season: ',
  homecoming: 'An upset on homecoming weekend: ',
} as const;

export const COMPLETION_LINES = {
  building: ['Built: {name}.', '{name} is finished, and open.', 'The builders are out of {name}.'],
  course: ['Developed: {name}.', '{name} is written and on the schedule.', 'A new course: {name}.'],
  program: ['Founded {name} in {hall}.', '{name} has a home in {hall}.', '{hall} takes in a new program: {name}.'],
} as const;

// Which of `n` tellings the line about `key` reads in `year`: a hash of the
// two, stepped on when it would repeat the year before's (worked back from
// year 1, so the rule holds without remembering anything).
export function pickLine(key: string, year: number, n: number): number {
  if (n <= 1) return 0;
  let last = -1;
  let pick = 0;
  for (let y = Math.max(1, year - 60); y <= year; y += 1) {
    pick = Math.floor(hashUnit(`${key}:${y}`) * n) % n;
    if (pick === last) pick = (pick + 1) % n;
    last = pick;
  }
  return pick;
}

export function fillLine(template: string, vars: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, k: string) => vars[k] ?? whole);
}
