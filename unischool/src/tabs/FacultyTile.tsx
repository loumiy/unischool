import { useState } from 'react';
import type { Action } from '../state/actions';
import type { Buildable, Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { quirkById } from '../data/quirkData';
import { facultyQualityTier, CANDIDATE_LISTING_WEEKS } from '../data/facultyData';
import { PUBLICATION_POINTS, facultyResearchOutput, labEquippedFields } from '../data/researchData';
import type { Grade } from '../data/courseQuality';
import { effectiveCourseSlots } from '../systems/techtree/techSystem';
import { careerWeeks } from '../systems/faculty/facultySystem';
import { facultyPay } from '../systems/finance/financeSystem';
import { coursesTaughtBy, projectedQuality } from '../systems/faculty/facultyAssignment';
import ConfirmButton from '../components/ConfirmButton';
import { DisclosureIcon } from '../components/icons';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import { GradeChip } from './CurriculumTab';
import { letterOf, retiringSoon } from './facultySort';
import { money, moneyShort, weeksShort } from '../format';

// ---------------------------------------------------------------------
// One person as a tile (Plan 84D): the Faculty tab's grid, the market and
// the department board all draw the same tile, so a candidate and a
// professor are compared like for like.
//
// The face: a portrait that reads, the name and field, teaching and
// research as letters on the course-grade bands with where each is
// heading, and badges for a quirk, prizes, a retirement within the year
// and the courses waiting in their field. The foot carries pay, load or
// the listing's time left, and the action. Everything else is behind the
// disclosure.
// ---------------------------------------------------------------------

// What somebody is committed to, flattened from the running initiatives.
export interface Commitment {
  topic: string;
  labName: string;
  weeksRemaining: number;
  weeksTotal: number;
}

// The courses waiting in a field: offered with nobody teaching them, and
// open but not yet developed (hiringNext.ts's waitingCourses).
export interface FieldWaiting {
  unstaffed: number;
  open: Buildable[];
}

export function waitingCount(w: FieldWaiting | undefined): number {
  return w ? w.unstaffed + w.open.length : 0;
}

// A stat as its letter, with the letter its potential reaches when that is
// higher: the hint of where this person is going.
function StatGrade({ label, value, potential }: { label: string; value: number; potential: number }) {
  const now: Grade = letterOf(value);
  const then: Grade = letterOf(potential);
  const rising = then !== now && potential > value;
  return (
    <span className="faculty-stat" title={`${label} ${value} (${now})${rising ? `, growing toward ${potential} (${then})` : potential > value ? `, growing toward ${potential}` : ''}`}>
      <span className="faculty-stat-label"><span className="faculty-stat-long">{label}</span><span className="faculty-stat-short" aria-hidden="true">{label[0]}</span></span>
      <GradeChip grade={now} />
      {rising && <span className="faculty-stat-rise" aria-label={`rising to ${then}`}>→{then}</span>}
    </span>
  );
}

export default function FacultyTile(
  { s, act, f, isCandidate, commitment, waiting, load }:
  {
    s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean;
    // Their research commitment, if any: a committed scholar teaches two
    // courses fewer, so it shows on the tile.
    commitment?: Commitment;
    // The courses waiting in their field (FacultyTab.tsx's waitingByField).
    waiting?: FieldWaiting;
    // Courses they hold now (facultyAssignment.ts's facultyLoads), read once
    // for the grid.
    load?: number;
  },
) {
  const [open, setOpen] = useState(false);
  const taught = isCandidate ? [] : coursesTaughtBy(s, f);
  const listingLeft = Math.max(0, CANDIDATE_LISTING_WEEKS - f.weeksListed);
  const researches = !isCandidate && labEquippedFields(s).has(f.field);
  const slots = isCandidate ? f.courseSlots : effectiveCourseSlots(s, f);
  const held = isCandidate ? 0 : (load ?? taught.length);
  const firstWaiting = waiting?.open[0];
  const projected = isCandidate && firstWaiting ? projectedQuality(s, firstWaiting, f) : null;
  // Every tile shows what this school pays, listing or roster: the market
  // rate is applied at payroll (financeSystem.ts's facultyPay).
  const pay = facultyPay(s, f.salary);
  const quirk = quirkById(f.quirk);
  const retiring = !isCandidate && retiringSoon(f);
  const retiresIn = careerWeeks(f.id) - f.tenureWeeks;
  // The courses waiting in their field, where they could take one: a
  // candidate always could, a professor only with a course slot free.
  const waits = isCandidate || held < slots ? waitingCount(waiting) : 0;

  return (
    <li className={`faculty-card faculty-tile${isCandidate ? ' listed' : ''}${commitment ? ' committed' : ''}`} data-faculty={f.id}>
      <div className="faculty-tile-top">
        <FacultyPortrait f={portraitOf(f)} size={56} />
        <div className="faculty-tile-who">
          <span className="faculty-name">{f.name}</span>
          <span className="faculty-tile-field">{f.field}</span>
          <span className="faculty-tile-rank">{facultyQualityTier(f)}</span>
        </div>
      </div>

      <div className="faculty-tile-stats">
        <StatGrade label="Teaching" value={f.teaching} potential={f.teachingPotential} />
        <StatGrade label="Research" value={f.research} potential={f.researchPotential} />
      </div>

      {(quirk || f.acclaim > 0 || retiring || waits > 0 || commitment) && (
        <div className="faculty-badges">
          {/* The prize badge: permanent (see types.ts's Faculty.acclaim). */}
          {f.acclaim > 0 && (
            <span className="faculty-acclaim" title={`${f.acclaim} research ${f.acclaim === 1 ? 'prize' : 'prizes'}`}>
              ★{f.acclaim > 1 ? ` ${f.acclaim}` : ''}
            </span>
          )}
          {retiring && (
            <span className="faculty-badge retiring" title={`Retires in ${weeksShort(Math.max(0, retiresIn))}, after ${Math.round(careerWeeks(f.id) / WEEKS_PER_YEAR)} years`}>
              Retiring
            </span>
          )}
          {commitment && (
            <span className="faculty-badge project" title={`On ${commitment.topic} at ${commitment.labName}, ${weeksShort(commitment.weeksRemaining)} left: two course slots fewer until it ends`}>
              On a project
            </span>
          )}
          {waits > 0 && (
            <span
              className="faculty-badge waiting"
              title={[
                waiting!.unstaffed > 0 ? `${waiting!.unstaffed} ${f.field} ${waiting!.unstaffed === 1 ? 'course has' : 'courses have'} no instructor` : '',
                waiting!.open.length > 0 ? `${waiting!.open.length} ${waiting!.open.length === 1 ? 'is' : 'are'} open to develop` : '',
              ].filter(Boolean).join('; ')}
            >
              {waits} waiting
            </span>
          )}
          {quirk && <span className="faculty-quirk" title={quirk.line}>{quirk.name}</span>}
        </div>
      )}

      <div className="faculty-card-foot faculty-tile-facts">
        <span className="faculty-card-salary" title={`${isCandidate ? 'Asks' : 'Salary'} ${money(f.salary)}; the college pays ${money(pay)} at its market rate`}>{moneyShort(pay)}/yr</span>
        {isCandidate ? (
          <span className={listingLeft <= 2 ? 'candidate-expiry soon' : 'candidate-expiry'} title={`Withdraws from the market in ${weeksShort(listingLeft)}`}>{weeksShort(listingLeft)} left</span>
        ) : (
          <span
            className={held >= slots ? 'faculty-card-load full' : 'faculty-card-load'}
            title={`Teaching ${held} of the ${slots} course slots they supply${commitment ? ' while committed to a project' : ''}`}
          >
            {held}/{slots} slots
          </span>
        )}
        {projected && firstWaiting && (
          <GradeChip grade={projected.grade} title={`Would earn a ${projected.grade} on ${firstWaiting.name}`} />
        )}
      </div>

      <div className="faculty-card-foot faculty-tile-actions">
        <button
          type="button"
          className="faculty-expand-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? `Show less about ${f.name}` : `Show more about ${f.name}`}
        >
          <DisclosureIcon open={open} /> {open ? 'Less' : 'More'}
        </button>
        {isCandidate ? (
          <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}>Appoint</button>
        ) : (
          // Dismissing someone orphans their courses (the reducer's
          // FIRE_FACULTY) and leaves any research team one short, so it
          // asks first and names the loss. Someone teaching nothing and
          // on no project is dismissed on the first click.
          <ConfirmButton
            className="btn-danger"
            label="Dismiss"
            armedLabel={taught.length > 0
              ? `Confirm — ${taught.length} ${taught.length === 1 ? 'course' : 'courses'} left unstaffed`
              : `Confirm — the ${commitment?.topic ?? 'research'} team one short`}
            warning={<>
              {taught.length > 0 && <>
                {f.name} teaches {taught.map((c) => c.name.split(' · ')[0]).join(', ')}, which will be left without an instructor.
              </>}
              {taught.length > 0 && commitment && ' '}
              {commitment && <>{taught.length > 0 ? 'The' : `${f.name} is on a research project; the`} team on {commitment.topic} carries on one short.</>}
            </>}
            needsConfirm={taught.length > 0 || !!commitment}
            onConfirm={() => act({ type: 'FIRE_FACULTY', facultyId: f.id })}
          />
        )}
      </div>

      {open && (
        <div className="faculty-card-detail">
          <p className="faculty-bio">{f.bio}{quirk && <> <em>{quirk.line}</em></>}</p>
          {commitment && (
            <p className="faculty-commitment">
              On <strong>{commitment.topic}</strong> at {commitment.labName}
              <span className="faculty-commitment-left"> · {weeksShort(commitment.weeksRemaining)} left</span>
            </p>
          )}
          <dl>
            <dt>Nationality</dt><dd>{f.nationality}</dd>
            <dt>Teaching</dt><dd>{f.teaching} <span className="outcome-note">(→ {f.teachingPotential})</span></dd>
            <dt>Research</dt><dd>{f.research} <span className="outcome-note">(→ {f.researchPotential})</span></dd>
            <dt>Salary</dt><dd>{money(f.salary)}/yr <span className="outcome-note">({money(pay)} paid, at the college's market rate)</span></dd>
            <dt>Course slots</dt><dd>{f.courseSlots}</dd>
            {!isCandidate && <><dt>Tenure</dt><dd>{Math.floor(f.tenureWeeks / WEEKS_PER_YEAR)} years</dd></>}
            {f.acclaim > 0 && <><dt>Prizes won</dt><dd>{f.acclaim}</dd></>}
            {/* Research output: roster only, since a candidate produces nothing yet. */}
            {!isCandidate && (
              <>
                <dt>Scholarly output</dt>
                <dd>
                  {researches
                    ? `${facultyResearchOutput(f).toFixed(2)} a week, of the ${PUBLICATION_POINTS} a paper takes`
                    : `none — no research facility in ${f.field}'s school`}
                </dd>
              </>
            )}
          </dl>
          {!isCandidate && (
            <div className="faculty-courses">
              <span className="stat">Courses taught</span>
              {taught.length > 0 ? (
                <ul className="faculty-courses-list">
                  {taught.map((t) => <li key={t.id}>{t.name}{t.status === 'developing' ? ' — in development' : ''}</li>)}
                </ul>
              ) : (
                <p className="empty-note">No {f.field} courses currently offered.</p>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
