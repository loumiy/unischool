import type { Action } from '../state/actions';
import type { Buildable, GameState } from '../state/types';
import { curriculumGroups } from '../data/techData';

// A small grid of squares, one per course in the group, colored by status —
// the "how far along is this major" tile from the curriculum overview.
function CourseTile({ label, courses }: { label: string; courses: Buildable[] }) {
  const done = courses.filter((c) => c.status === 'done').length;
  return (
    <div className="course-tile" title={`${label}: ${done}/${courses.length} done`}>
      <div className="course-tile-grid">
        {courses.map((c) => (
          <span key={c.id} className={`course-sq ${c.status}`} title={`${c.name} · ${c.status}`} />
        ))}
      </div>
      <div className="course-tile-label">{label}</div>
    </div>
  );
}

// The curriculum: the school/major progress grid plus courses currently
// available to develop. Courses share the development-slot pool with
// buildings (see the Campus tab, which owns buying more slots) — the
// develop buttons here are disabled by the same slot/cash/faculty rules.
export default function CurriculumTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const courses = s.tech.filter((t) => t.kind === 'course');
  const doneCourses = courses.filter((t) => t.status === 'done').length;
  const availableCourses = s.tech.filter((t) => t.status === 'available' && t.kind === 'course');
  const slotsUsed = Object.keys(s.developing).length;
  const catalogPct = Math.round((doneCourses / courses.length) * 100);
  const hasFaculty = (field: string) => s.faculty.some((f) => f.field === field);

  return (
    <div className="tab-content">
      <section className="panel curriculum-panel">
        <div className="panel-head">
          <h2>The Curriculum</h2>
          <span className="stat">{doneCourses}/{courses.length} done · {catalogPct}%</span>
        </div>

        <div className="curriculum-scroll">
          {curriculumGroups().map((school) => {
            const schoolCourses = school.groups.flatMap((g) => g.courseIds);
            const schoolDone = schoolCourses.filter((id) => s.tech.find((t) => t.id === id)?.status === 'done').length;
            return (
              <div key={school.name} className="school-group">
                <div className="school-head">
                  <h3>{school.name}</h3>
                  <span className="stat">{schoolDone}/{schoolCourses.length}</span>
                </div>
                <div className="tile-row">
                  {school.groups.map((group) => (
                    <CourseTile
                      key={group.label}
                      label={group.label}
                      courses={group.courseIds.map((id) => s.tech.find((t) => t.id === id)!).filter(Boolean)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="available-head">
          <h3>Available to Develop ({availableCourses.length})</h3>
          <span className="stat">{slotsUsed}/{s.slots} slots used</span>
        </div>
        {s.finance.cash < 0 && (
          <p className="stall-note">Cash is negative — new development is stalled until it recovers.</p>
        )}
        <ul className="available-list">
          {availableCourses.map((t) => {
            const missingFaculty = !!(t.requiresFaculty && !hasFaculty(t.requiresFaculty));
            const disabledReason = s.finance.cash < 0
              ? 'Cash is negative — expansion is stalled until it recovers.'
              : missingFaculty
                ? `Requires a ${t.requiresFaculty} faculty member on the roster.`
                : slotsUsed >= s.slots
                  ? 'All development slots are busy — commission more on the Campus tab.'
                  : undefined;
            return (
              <li key={t.id} className="available-item">
                <div className="available-item-main">
                  <span>{t.name}</span>
                  {t.requiresFaculty && <span className="requires-faculty-tag">needs {t.requiresFaculty}</span>}
                </div>
                <div className="available-item-meta">
                  <span className="stat">{t.cost > 0 ? `$${t.cost.toLocaleString()} · ` : ''}{t.duration}w</span>
                  <button
                    disabled={slotsUsed >= s.slots || s.finance.cash < 0 || missingFaculty}
                    title={disabledReason}
                    onClick={() => act({ type: 'START_DEVELOPMENT', nodeId: t.id })}
                  >
                    develop →
                  </button>
                </div>
              </li>
            );
          })}
          {availableCourses.length === 0 && <li className="empty-note">No courses currently available to develop.</li>}
        </ul>
      </section>
    </div>
  );
}
