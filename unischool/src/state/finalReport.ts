import type { GameState } from './types';
import { totalEnrolled } from './types';

// ---------------------------------------------------------------------
// THE FOUNDER'S NUMBERS (Plan 17's PR C): the four figures a founder would
// want on the final report, read off the record. Pure, like the legacy
// and the year in review — nothing here is stored.
//
//   students taught  every graduating class on the books plus the body
//                    still enrolled; a student is counted once, the year
//                    they leave or, if they have not, today
//   faculty served   everyone who ever held a chair (University.facultyServed)
//   prizes           the research tally's own count
//   titles           the championships won (orgs.titles)
// ---------------------------------------------------------------------
export interface FounderFigures {
  studentsTaught: number;
  facultyServed: number;
  prizes: number;
  titles: number;
}

export function founderFigures(s: GameState): FounderFigures {
  return {
    studentsTaught: s.history.reduce((sum, h) => sum + h.graduated, 0) + totalEnrolled(s.students),
    facultyServed: s.self.facultyServed,
    prizes: s.research.prizes,
    titles: s.orgs.titles.length,
  };
}
