import type { GameState } from '../state/types';
import StudentLifeTab from './StudentLifeTab';
import EnrollmentTab from './EnrollmentTab';
import IdentityPanel from './IdentityPanel';
import { MultiChart } from '../components/MultiChart';
import { sectionAvailable } from '../components/TabNav';
import { count } from '../format';

// The Students tab (Plan 29, V1-33): what used to be Student Life and
// Enrollment, on one screen. What students think comes first, since it
// explains the headline; who they are and how they came follows; the
// classes that have left close it (Plan 34). Open from the first week (Plan
// 78B): the guidebooks, the clubs and last summer's funnel wait for the
// first commencement (ladderData.ts's sections).
export default function StudentsTab({ s }: { s: GameState }) {
  const classes = s.alumni ?? [];
  return (
    <div className="students-tab">
      {sectionAvailable(s, 'students.guidebook') && <div className="tab-content"><IdentityPanel s={s} /></div>}
      <StudentLifeTab s={s} clubs={sectionAvailable(s, 'students.clubs')} />
      <EnrollmentTab s={s} funnel={sectionAvailable(s, 'students.funnel')} />
      {classes.length >= 2 && (
        <div className="tab-content">
          <section className="panel">
            <h2>The classes over the years</h2>
            <div className="history-charts">
              <MultiChart
                title="Each class as it graduated"
                xLabel="Class of"
                yMin={0}
                series={[{ name: 'Graduates', points: classes.map((a) => ({ x: a.classYear, y: a.size })), format: (v) => count(v) }]}
              />
              <MultiChart
                title="Satisfaction as they left"
                xLabel="Class of"
                yMin={0}
                yMax={100}
                series={[{ name: 'Satisfaction', points: classes.map((a) => ({ x: a.classYear, y: a.satisfaction })) }]}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
