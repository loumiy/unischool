import type { GameState } from '../state/types';
import StudentLifeTab from './StudentLifeTab';
import EnrollmentTab from './EnrollmentTab';
import IdentityPanel from './IdentityPanel';
import { MultiChart } from '../components/MultiChart';

// The Students tab (Plan 29, V1-33): what used to be Student Life and
// Enrollment, on one screen. What students think comes first, since it
// explains the headline; who they are and how they came follows; the
// classes that have left close it (Plan 34).
export default function StudentsTab({ s }: { s: GameState }) {
  const classes = s.alumni ?? [];
  return (
    <div className="students-tab">
      <div className="tab-content"><IdentityPanel s={s} /></div>
      <StudentLifeTab s={s} />
      <EnrollmentTab s={s} />
      {classes.length >= 2 && (
        <div className="tab-content">
          <section className="panel">
            <h2>The classes over the years</h2>
            <div className="history-charts">
              <MultiChart
                title="Each class as it graduated"
                xLabel="Class of"
                yMin={0}
                series={[{ name: 'Graduates', points: classes.map((a) => ({ x: a.classYear, y: a.size })), format: (v) => Math.round(v).toLocaleString() }]}
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
