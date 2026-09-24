import type { GameState } from '../state/types';
import StudentLifeTab from './StudentLifeTab';
import EnrollmentTab from './EnrollmentTab';
import IdentityPanel from './IdentityPanel';

// The Students tab (Plan 29, V1-33): what used to be Student Life and
// Enrollment, on one screen. What students think comes first, since it
// explains the headline; who they are and how they came follows.
export default function StudentsTab({ s }: { s: GameState }) {
  return (
    <div className="students-tab">
      <div className="tab-content"><IdentityPanel s={s} /></div>
      <StudentLifeTab s={s} />
      <EnrollmentTab s={s} />
    </div>
  );
}
