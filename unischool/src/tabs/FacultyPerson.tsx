import type { Faculty, GameState, YearMark } from '../state/types';
import { institutionName } from '../state/types';
import { quirkById } from '../data/quirkData';
import { PUBLICATION_POINTS, facultyResearchOutput, labEquippedFields } from '../data/researchData';
import { GRADE_A, GRADE_B } from '../data/courseQuality';
import { CAREER_WORDS as W, quirkExplained } from '../data/careerWords';
import { facultyPay } from '../systems/finance/financeSystem';
import {
  courseTimeline, isFounder, joinedLine, recognitions, researchLines, statSeries, trainingLines, yearOfWeek, yearsHere,
} from './facultyCareer';
import { instituteStands, trainingSlotsOff } from '../data/trainingData';
import { trainingUntil } from '../systems/faculty/training';
import { yearsLeft } from './facultySort';
import type { Commitment } from './FacultyTile';
import { money, weeksShort } from '../format';

// ---------------------------------------------------------------------
// The person, expanded (Plan 84E): what a tile opens into, in place on a
// wide screen and full screen on a phone (FacultyTile.tsx). Read off the
// career record (Plan 84C) through tabs/facultyCareer.ts; the words are
// data/careerWords.ts's. A candidate has no history here, and says so.
// ---------------------------------------------------------------------

// The most course rows the timeline draws; the rest are named under it.
const TIMELINE_ROWS = 14;

function Timeline({ s, f }: { s: GameState; f: Faculty }) {
  const t = courseTimeline(s, f);
  if (!t || t.rows.length === 0) return <p className="empty-note">{W.noCourses}</p>;
  const total = t.end - t.start + 1;
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / total) * 100))}%`;
  const shown = t.rows.slice(0, TIMELINE_ROWS);
  const rest = t.rows.slice(TIMELINE_ROWS);
  return (
    <div className="career-timeline">
      <div className="career-axis" aria-hidden="true">
        <span>{W.year(yearOfWeek(t.start))}</span>
        <span>{W.year(yearOfWeek(t.end))}</span>
      </div>
      <ul className="career-rows">
        {shown.map((row) => (
          <li key={row.courseId} className="career-row">
            <span className="career-row-label" title={`${row.code} · ${row.name}`}>
              <span className="career-row-code">{row.code}</span> {row.name}
            </span>
            <span className="career-row-track">
              {row.spans.map((sp) => (
                <span
                  key={sp.from}
                  className={`career-bar${row.now && sp === row.spans[row.spans.length - 1] ? ' now' : ''}`}
                  style={{ left: pct(sp.from - t.start), width: `max(3px, ${pct(sp.to - sp.from + 1)})` }}
                  title={W.courseSpan(yearOfWeek(sp.from), yearOfWeek(sp.to))}
                />
              ))}
            </span>
            <span className="career-row-when">
              {row.now
                ? W.courseSince(yearOfWeek(row.spans[0].from))
                : W.courseSpan(yearOfWeek(row.spans[0].from), yearOfWeek(row.spans[row.spans.length - 1].to))}
            </span>
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <p className="career-more">{W.moreCourses(rest.length)}: {rest.map((r) => r.code).join(', ')}.</p>
      )}
    </div>
  );
}

// Teaching and research at each year's end and today, with the A and B
// bands marked. The scale runs to 100 from a floor under the lowest mark,
// so a career's growth fills the height.
function GrowthChart({ marks }: { marks: YearMark[] }) {
  if (marks.length < 2) return <p className="empty-note">{W.chartTooShort}</p>;
  const w = 280;
  const h = 84;
  const pad = 4;
  const labels = 12; // room at the right for the band letters
  const first = marks[0][0];
  const span = Math.max(1, marks[marks.length - 1][0] - first);
  const lowest = Math.min(...marks.map((m) => Math.min(m[1], m[2])));
  const floor = Math.max(0, Math.min(GRADE_B - 10, Math.floor((lowest - 5) / 10) * 10));
  const x = (year: number) => pad + ((year - first) / span) * (w - pad * 2 - labels);
  const y = (v: number) => pad + (1 - (Math.max(floor, Math.min(100, v)) - floor) / (100 - floor)) * (h - pad * 2);
  const line = (i: 1 | 2) => marks.map((m) => `${x(m[0]).toFixed(1)},${y(m[i]).toFixed(1)}`).join(' ');
  const last = marks[marks.length - 1];
  return (
    <figure className="career-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Teaching ${marks[0][1]} to ${last[1]}, research ${marks[0][2]} to ${last[2]}, Years ${first} to ${last[0]}`}>
        <line className="career-band" x1={pad} x2={w - pad - labels} y1={y(GRADE_A)} y2={y(GRADE_A)} />
        <line className="career-band" x1={pad} x2={w - pad - labels} y1={y(GRADE_B)} y2={y(GRADE_B)} />
        <text className="career-band-label" x={w - pad} y={y(GRADE_A) + 3} textAnchor="end">A</text>
        <text className="career-band-label" x={w - pad} y={y(GRADE_B) + 3} textAnchor="end">B</text>
        <polyline className="career-line research" points={line(2)} />
        <polyline className="career-line teaching" points={line(1)} />
      </svg>
      <figcaption>
        <span className="career-key teaching">{W.chartLegend.teaching}</span>
        <span className="career-key research">{W.chartLegend.research}</span>
        <span className="career-chart-years">{W.courseSpan(first, last[0])}</span>
      </figcaption>
      <p className="career-chart-note">{W.chartNote}</p>
    </figure>
  );
}

export default function FacultyPerson(
  { s, f, isCandidate, commitment, onOpenCurriculum }:
  { s: GameState; f: Faculty; isCandidate: boolean; commitment?: Commitment; onOpenCurriculum?: (target: string) => void },
) {
  const college = institutionName(s.self);
  const quirk = quirkById(f.quirk);
  const joined = isCandidate ? null : joinedLine(college, f);
  const researches = !isCandidate && labEquippedFields(s).has(f.field);
  const research = researchLines(f);
  const honors = recognitions(s, f);
  const here = yearsHere(s, f);
  // Training (Plan 85E): shown once there is any, or an institute to give it.
  const trainings = trainingLines(f);
  const showTraining = !isCandidate && (trainings.length > 0 || instituteStands(s));

  return (
    <div className="faculty-person">
      {joined ? (
        <p className="faculty-person-joined">
          <strong>{joined}</strong> {W.yearsHere(here)} {W.retires(yearsLeft(f))}
          {isFounder(f) && <span className="outcome-note"> {W.foundingNote}</span>}
        </p>
      ) : (
        <p className="faculty-person-joined candidate">{W.candidate(f.name, college)}</p>
      )}

      <section className="faculty-person-section">
        <h5>{W.headings.person}</h5>
        <dl className="faculty-person-facts">
          <dt>{W.bioLabel}</dt>
          <dd>{f.bio} <span className="faculty-person-note">{W.bioNote}</span></dd>
          <dt>{W.nationalityLabel}</dt>
          <dd>{f.nationality}. <span className="faculty-person-note">{W.nationalityNote}</span></dd>
          <dt>{W.quirkLabel}</dt>
          <dd>
            {quirk
              ? <><strong>{quirk.name}.</strong> {quirk.line} <span className="faculty-person-note">{quirkExplained(quirk.effects)}</span></>
              : W.noQuirk}
          </dd>
          <dt>{W.payLabel}</dt>
          <dd>{money(facultyPay(s, f.salary))}/yr <span className="faculty-person-note">{W.payNote(money(f.salary))}</span></dd>
          <dt>{W.slotsLabel}</dt>
          <dd>{f.courseSlots}</dd>
          {!isCandidate && (
            <>
              <dt>{W.outputLabel}</dt>
              <dd>{researches ? W.output(facultyResearchOutput(f).toFixed(2), PUBLICATION_POINTS) : W.noOutput(f.field)}</dd>
            </>
          )}
        </dl>
      </section>

      {!isCandidate && (
        <>
          <section className="faculty-person-section">
            <h5>{W.headings.courses}</h5>
            <Timeline s={s} f={f} />
            {onOpenCurriculum && (
              <button type="button" className="course-drawer-door" onClick={() => onOpenCurriculum(`field:${f.field}`)}>
                {W.toCurriculum(f.field)}
              </button>
            )}
          </section>

          <section className="faculty-person-section">
            <h5>{W.headings.research}</h5>
            {commitment && <p className="faculty-commitment">{W.onProject(commitment.topic, weeksShort(commitment.weeksRemaining))}</p>}
            {research.length > 0 ? (
              <ul className="career-list">
                {research.map((r, i) => (
                  <li key={i} className={r.cancelled ? 'cancelled' : undefined}>
                    <strong>{r.topic}</strong> — {W.projectLine(r.depth, r.years, r.year)}: {r.outcome}
                  </li>
                ))}
              </ul>
            ) : !commitment && <p className="empty-note">{W.noResearch}</p>}
          </section>

          <section className="faculty-person-section">
            <h5>{W.headings.recognition}</h5>
            {honors.length > 0 ? (
              <ul className="career-list">
                {honors.map((h, i) => <li key={i} className={`honor ${h.kind}`}>{h.text}</li>)}
              </ul>
            ) : <p className="empty-note">{W.noRecognition}</p>}
          </section>

          {showTraining && (
            <section className="faculty-person-section">
              <h5>{W.headings.training}</h5>
              {f.training && trainingSlotsOff(s, f) > 0 && <p className="faculty-commitment">{W.trainingNow(trainingUntil(f.training.untilWeek))}</p>}
              {trainings.length > 0 ? (
                <ul className="career-list">
                  {trainings.map((line, i) => <li key={i} className="honor training">{line}</li>)}
                </ul>
              ) : <p className="empty-note">{W.notTrained}</p>}
              {f.training && trainings.length > 1 && <p className="faculty-person-note">{W.trainingPoints(f.training.points)}</p>}
            </section>
          )}

          <section className="faculty-person-section">
            <h5>{W.headings.growth}</h5>
            <GrowthChart marks={statSeries(s, f)} />
          </section>
        </>
      )}
    </div>
  );
}
