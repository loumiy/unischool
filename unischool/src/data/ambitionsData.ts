import type { GameState } from '../state/types';
import { SEMICENTENNIAL_YEAR, WEEKS_PER_YEAR, totalEnrolled } from '../state/types';
import { GENED_BUILDING_ID, graduatePrograms, isAcademicHall, milestoneSchools } from './techData';
import { schoolFoundedKey } from '../systems/techtree/schools';
import { playerRank } from '../systems/rivals/rivalsSystem';

// ---------------------------------------------------------------------
// AMBITIONS (Plan 17's PR A): the named achievements a founder might set
// out to reach, each with a line and a detector. A RECORD, like
// milestones without the prestige — none of these gates anything, none
// grants anything, and none stops the clock (the milestone celebrations
// already cover the ones worth stopping for). The September review's H1
// asked for the objectives and their consequences to be clear: these are
// the objectives, and the legacy (state/legacy.ts) is the consequence.
//
// Every detector is a READING of state the game already keeps — a
// milestone key, a rank, a count on the research tally, the roster of
// teams — never a parallel tally of its own. That is what makes the list
// cheap to extend and impossible to get out of step with the game: an
// ambition is true exactly when the thing it names is true.
//
// Two are read at the fiftieth summer only, on the week the summer
// interrupt holds the clock: *Never in the red* is a claim about a whole
// run and can only be made once the run is whole, and *Fifty years* IS
// the fiftieth summer. Both use SEMICENTENNIAL_YEAR (types.ts), the one
// place the run's length lives.
//
// Ordered as a founder would list them: the campus, the schools, the
// table, the work, the students, the money, the whole thing.
// ---------------------------------------------------------------------

export interface Ambition {
  id: string;
  name: string;
  // One line under the name on the History tab's panel: what reaching it
  // means, in the game's own terms.
  line: string;
  reached(s: GameState): boolean;
}

function hasMilestoneWith(s: GameState, prefix: string): boolean {
  return Object.keys(s.milestones).some((key) => key.startsWith(prefix) && s.milestones[key]);
}

// Held at the fiftieth summer: the week the summer interrupt stops the
// clock on year fifty, which is the last week the run's record is still
// the run's alone. Ambitions are detected weekly (see ambitionsSystem.ts),
// so this reads true for exactly one detection pass.
function atTheFiftiethSummer(s: GameState): boolean {
  return s.clock.year === SEMICENTENNIAL_YEAR && s.clock.week === WEEKS_PER_YEAR;
}

export const AMBITIONS: readonly Ambition[] = [
  {
    id: 'hall',
    name: 'A hall of your own',
    line: 'The first academic hall beyond Founders Hall stands.',
    reached: (s) => s.tech.some((t) => isAcademicHall(t) && t.id !== GENED_BUILDING_ID && t.status === 'done'),
  },
  {
    id: 'school-founded',
    name: 'A school founded',
    line: 'Six programs of one school in one hall — the first school with a name.',
    reached: (s) => hasMilestoneWith(s, 'school-founded:'),
  },
  {
    id: 'every-school',
    name: 'Every school founded',
    line: 'Each of the seven schools has a hall of its own.',
    reached: (s) => {
      const schools = milestoneSchools().filter((school) => school.majors.length > 0);
      return schools.length > 0 && schools.every((school) => s.milestones[schoolFoundedKey(school.schoolName)]);
    },
  },
  {
    id: 'top-fifty',
    name: 'In the top fifty',
    line: 'On the U.S. News list at all.',
    reached: (s) => playerRank(s) <= 50,
  },
  {
    id: 'top-ten',
    name: 'In the top ten',
    line: 'Among the ten schools the field measures itself against.',
    reached: (s) => playerRank(s) <= 10,
  },
  {
    id: 'first',
    name: 'First in the nation',
    line: 'The top of the academic table.',
    reached: (s) => playerRank(s) === 1,
  },
  {
    id: 'program-distinguished',
    name: 'A distinguished program',
    line: 'Every course of one major complete.',
    reached: (s) => hasMilestoneWith(s, 'program-distinguished:'),
  },
  {
    id: 'school-distinguished',
    name: 'A distinguished school',
    line: 'Every program of one school distinguished.',
    reached: (s) => hasMilestoneWith(s, 'school-distinguished:'),
  },
  {
    id: 'university',
    name: 'A university',
    line: 'The charter taken: a college no longer.',
    reached: (s) => s.self.suffix === 'University',
  },
  {
    id: 'laboratory',
    name: 'A laboratory',
    line: 'The first research facility finished.',
    reached: (s) => s.tech.some((t) => t.facilityType === 'lab' && t.status === 'done'),
  },
  {
    id: 'landmark',
    name: 'A landmark program concluded',
    line: 'A five-year research programme carried to its end.',
    reached: (s) => s.research.completedInitiatives.some((done) => done.depth === 'landmark' && !done.cancelled),
  },
  {
    id: 'prize',
    name: 'A prize',
    line: 'A member of the faculty honoured for their research.',
    reached: (s) => s.research.prizes >= 1,
  },
  {
    id: 'professional-school',
    name: 'A professional school',
    line: 'Medicine, law, or another professional program founded on top of the schools beneath it.',
    reached: (s) => graduatePrograms().some(
      (program) => program.type === 'professional' && s.milestones[`grad-program-complete:${program.id}`],
    ),
  },
  {
    id: 'title',
    name: 'A national title',
    line: 'A varsity team wins the bracket.',
    reached: (s) => s.orgs.titles.length >= 1,
  },
  {
    id: 'every-sport-title',
    name: 'A title in every sport fielded',
    line: 'Each varsity program the school runs has won at least once.',
    reached: (s) => {
      const fielded = s.orgs.teams.filter((team) => team.status === 'active');
      if (fielded.length === 0) return false;
      const won = new Set(s.orgs.titles.map((title) => title.sport));
      return fielded.every((team) => won.has(team.sport));
    },
  },
  {
    id: 'ten-thousand',
    name: 'Ten thousand students',
    line: 'An enrolled body of ten thousand.',
    reached: (s) => totalEnrolled(s.students) >= 10_000,
  },
  {
    id: 'never-in-red',
    name: 'Never in the red',
    line: 'Fifty years without a week below zero. Judged at the fiftieth summer.',
    reached: (s) => atTheFiftiethSummer(s) && s.finance.weeksInTheRed === 0 && s.finance.cash >= 0,
  },
  {
    id: 'billion',
    name: 'A billion in the endowment',
    line: 'The endowment stands at a thousand million.',
    reached: (s) => s.finance.endowment >= 1_000_000_000,
  },
  {
    id: 'catalogue',
    name: 'The whole catalogue',
    line: 'Every course in the game developed.',
    reached: (s) => {
      const courses = s.tech.filter((t) => t.kind === 'course');
      return courses.length > 0 && courses.every((t) => t.status === 'done');
    },
  },
  {
    id: 'fifty-years',
    name: 'Fifty years',
    line: 'The fiftieth summer: the final report is filed and the record sealed.',
    reached: (s) => atTheFiftiethSummer(s),
  },
];

export function ambitionById(id: string): Ambition | undefined {
  return AMBITIONS.find((a) => a.id === id);
}

// The record, in authored order, with the year each was reached or null.
// What the History tab's panel and the final report both render.
export interface AmbitionEntry extends Ambition {
  year: number | null;
}

export function ambitionEntries(s: GameState): AmbitionEntry[] {
  return AMBITIONS.map((a) => ({ ...a, year: s.ambitions[a.id] ?? null }));
}
