import type { GameState } from './types';
import { totalEnrolled } from './types';

// The founder's numbers on the final report, derived from the record:
//   students taught  every graduating class plus those still enrolled
//   faculty served   everyone who ever held a chair (University.facultyServed)
//   prizes           the research tally's count
//   titles           championships won (orgs.titles)
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
