import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Action } from '../state/actions';
import type { Buildable, Faculty, GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { quirkById } from '../data/quirkData';
import { facultyQualityTier } from '../data/facultyData';
import { candidateListingWeeks } from '../systems/administration/effects';
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
import { CAREER_WORDS } from '../data/careerWords';
import FacultyPerson from './FacultyPerson';
import { TRAINING_SLOTS, TRAINING_WORDS, instituteStands, trainingSlotsOff } from '../data/trainingData';
import { trainingOutcome, trainingUntil, whyNotTrain } from '../systems/faculty/training';
import { planTrainingCoverage } from '../systems/techtree/techSystem';
import { gradeFor } from '../data/courseQuality';

// ---------------------------------------------------------------------
// One person as a tile (Plan 84D): the Faculty tab's grid, the market and
// the department board all draw the same tile, so a candidate and a
// professor are compared like for like.
//
// The face, a staff ID card (Plan 90): a band with the field and the
// courses waiting in it, a portrait that reads, the name and rank,
// teaching and research as meters with their letters on the course-grade
// bands and where each is heading, and badges for a quirk, prizes and a
// retirement within the year. The foot carries pay, load or the listing's
// time left, More, and on the market Appoint.
//
// Opened (Plan 84E), the tile becomes the person (FacultyPerson.tsx): in
// place, across the grid's whole row, on a wide screen; full screen on a
// phone, where a row is too narrow to read a career in. The opened face
// carries Train and Dismiss (Plan 95G): what loses or spends something is
// done from the page that says what the person is.
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

// A stat as a short meter (Plan 90): the score the letter is read from,
// 0 to 100, filled in its grade's colour, the potential still to come as a
// paler run beyond it, and the letter beside it with the letter the
// potential reaches when that is higher: the hint of where this person is
// going. Three cells of the meters' grid.
const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
function StatMeter({ label, value, potential }: { label: string; value: number; potential: number }) {
  const now: Grade = letterOf(value);
  const then: Grade = letterOf(potential);
  const rising = then !== now && potential > value;
  const title = `${label} ${value} (${now})${rising ? `, growing toward ${potential} (${then})` : potential > value ? `, growing toward ${potential}` : ''}`;
  return (
    <div className="faculty-stat" title={title} style={{ '--stat-grade': `var(--grade-${now.toLowerCase()})` } as CSSProperties}>
      <span className="faculty-stat-label"><span className="faculty-stat-long">{label}</span><span className="faculty-stat-short" aria-hidden="true">{label[0]}</span></span>
      <span className="faculty-stat-track" aria-hidden="true">
        {potential > value && <span className="faculty-stat-headroom" style={{ width: pct(potential) }} />}
        <span className="faculty-stat-fill" style={{ width: pct(value) }} />
      </span>
      <span className="faculty-stat-grade">
        <span className="faculty-stat-letter" aria-label={`grade ${now}`}>{now}</span>
        {rising && <span className="faculty-stat-rise" aria-label={`rising to ${then}`}>→{then}</span>}
      </span>
    </div>
  );
}

// A phone, where the person opens full screen (styles.css's breakpoint).
const PHONE = '(max-width: 520px)';
function usePhone(): boolean {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(PHONE) : null;
  const [phone, setPhone] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const on = () => setPhone(query.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, [query]);
  return phone;
}

// Train and Dismiss (Plan 95G, the second review's B2-1): on the person
// page that More opens, not on the face, so a year-40 grid is not a wall
// of about 80 Dismiss buttons. Both keep their ask-first and their reasons.
export function FacultyActions(
  { s, act, f, commitment, load }:
  { s: GameState; act: (a: Action) => void; f: Faculty; commitment?: Commitment; load?: number },
) {
  const taught = coursesTaughtBy(s, f);
  const slots = effectiveCourseSlots(s, f);
  const held = load ?? taught.length;
  // The faculty training program (Plan 85E): where the institute stands, a
  // professor below an A can be sent for a term. A pick that would move one
  // of their courses asks first and names where it goes.
  const institute = instituteStands(s);
  const trainRefusal = institute ? whyNotTrain(s, f) : null;
  const outcome = institute && trainRefusal === null ? trainingOutcome(s, f) : null;
  // Planned only when a course would have to move: the plan reads every
  // colleague's load.
  const trainCoverage = outcome && held > Math.max(0, slots - TRAINING_SLOTS) ? planTrainingCoverage(s, f.id) : null;
  return (
    <>
      {institute && trainRefusal !== 'top-grade' && (
        outcome ? (
          <ConfirmButton
            className="btn-train"
            label={TRAINING_WORDS.train}
            title={TRAINING_WORDS.trainTitle(outcome.from, outcome.to, gradeFor(outcome.from), gradeFor(outcome.to), trainingUntil(outcome.untilWeek))}
            armedLabel={TRAINING_WORDS.trainArmed(trainCoverage?.shed[0]?.name.split(' · ')[0] ?? '')}
            warning={trainCoverage?.shed[0] && TRAINING_WORDS.trainWarning(
              f.name, trainCoverage.shed[0].name.split(' · ')[0],
              trainCoverage.covered[0]?.instructor.name ?? null, trainingUntil(outcome.untilWeek),
            )}
            needsConfirm={(trainCoverage?.shed.length ?? 0) > 0}
            onConfirm={() => act({ type: 'TRAIN_FACULTY', facultyId: f.id })}
          />
        ) : (
          <button
            type="button"
            className="btn-train"
            disabled
            title={trainRefusal === 'this-year' ? TRAINING_WORDS.whyNot.thisYear : TRAINING_WORDS.whyNot.noPicks(s.clock.year)}
          >
            {TRAINING_WORDS.train}
          </button>
        )
      )}
      {/* Dismissing someone orphans their courses (the reducer's
          FIRE_FACULTY) and leaves any research team one short, so it asks
          first and names the loss. Someone teaching nothing and on no
          project is dismissed on the first click. */}
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
    </>
  );
}

export default function FacultyTile(
  { s, act, f, isCandidate, commitment, waiting, load, onOpenCurriculum }:
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
    // The person's door to their field's courses.
    onOpenCurriculum?: (target: string) => void;
  },
) {
  const [open, setOpen] = useState(false);
  const phone = usePhone();
  const tileRef = useRef<HTMLLIElement>(null);
  // Opened in place, the person is brought into view.
  useEffect(() => {
    if (open && !phone) tileRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [open, phone]);
  const taught = isCandidate ? [] : coursesTaughtBy(s, f);
  const listingLeft = Math.max(0, candidateListingWeeks(s) - f.weeksListed);
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

  const atInstitute = !isCandidate && trainingSlotsOff(s, f) > 0;
  const timesTrained = f.career?.training?.length ?? (f.training ? 1 : 0);

  const toggle = () => setOpen((v) => !v);
  // The staff ID card (Plan 90): a band in the school's colour with the
  // field and the courses waiting in it, the portrait mounted upright, the
  // rank stamped, the stats as meters, and the pay, load and actions in a
  // strip at the foot. Train and Dismiss only when opened (Plan 95G).
  const faceOf = (withActions: boolean) => (
    <>
      <div className="faculty-tile-band">
        <span className="faculty-tile-field">{f.field}</span>
        {waits > 0 && (
          <span
            className="faculty-tile-waiting"
            title={[
              waiting!.unstaffed > 0 ? `${waiting!.unstaffed} ${f.field} ${waiting!.unstaffed === 1 ? 'course has' : 'courses have'} no instructor` : '',
              waiting!.open.length > 0 ? `${waiting!.open.length} ${waiting!.open.length === 1 ? 'is' : 'are'} open to develop` : '',
            ].filter(Boolean).join('; ')}
          >
            {waits} waiting
          </span>
        )}
      </div>

      <div className="faculty-tile-body">
        {/* The top opens the person, as the disclosure does. */}
        <button type="button" className="faculty-tile-top" onClick={toggle} aria-expanded={open} tabIndex={-1}>
          <span className="faculty-tile-mount"><FacultyPortrait f={portraitOf(f)} size={56} shape="square" /></span>
          <span className="faculty-tile-who">
            <span className="faculty-name">{f.name}</span>
            <span className="faculty-tile-rank">{facultyQualityTier(f)}</span>
          </span>
        </button>

        <div className="faculty-tile-stats">
          <StatMeter label="Teaching" value={f.teaching} potential={f.teachingPotential} />
          <StatMeter label="Research" value={f.research} potential={f.researchPotential} />
        </div>

        {(quirk || f.acclaim > 0 || retiring || commitment || f.training) && (
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
            {f.training && !isCandidate && (
              <span
                className={`faculty-badge trained${atInstitute ? ' training' : ''}`}
                title={atInstitute ? TRAINING_WORDS.inTraining(trainingUntil(f.training.untilWeek)) : TRAINING_WORDS.trainedBadgeTitle(timesTrained, f.training.points)}
              >
                {TRAINING_WORDS.trainedBadge}
              </span>
            )}
            {quirk && <span className="faculty-quirk" title={quirk.line}>{quirk.name}</span>}
          </div>
        )}
      </div>

      <div className="faculty-tile-foot">
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
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? `Show less about ${f.name}` : `Show more about ${f.name}`}
          >
            <DisclosureIcon open={open} /> {open ? 'Less' : 'More'}
          </button>
          {/* Train and Dismiss are on the person page, not the face (Plan
              95G, the second review's B2-1). Appoint stays: the market is
              where a candidate is compared and taken. */}
          {isCandidate
            ? <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}>Appoint</button>
            : withActions && <FacultyActions s={s} act={act} f={f} commitment={commitment} load={load} />}
        </div>
      </div>

    </>
  );

  const face = faceOf(false);
  const opened = faceOf(true);

  const className = `faculty-card faculty-tile${isCandidate ? ' listed' : ''}${commitment ? ' committed' : ''}`;
  const person = <FacultyPerson s={s} f={f} isCandidate={isCandidate} commitment={commitment} onOpenCurriculum={onOpenCurriculum} />;

  // A phone: the tile stays in the grid, and the person opens over the
  // whole screen, with its own Close. Escape closes it and nothing else.
  if (open && phone) {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    return (
      <li className={className} data-faculty={f.id}>
        {face}
        {createPortal(
          <div className="faculty-sheet" role="dialog" aria-modal="true" aria-label={f.name} onKeyDown={onKeyDown}>
            <div className="faculty-sheet-head">
              <span className="faculty-sheet-title">{f.name}</span>
              <button type="button" className="tab-overlay-close faculty-sheet-close" onClick={() => setOpen(false)} autoFocus>{CAREER_WORDS.close}</button>
            </div>
            <div className={`${className} faculty-sheet-body`}>
              {opened}
              {person}
            </div>
          </div>,
          document.body,
        )}
      </li>
    );
  }

  return (
    <li ref={tileRef} className={`${className}${open ? ' expanded' : ''}`} data-faculty={f.id}>
      {open ? (
        <>
          <div className="faculty-tile-face">{opened}</div>
          {person}
        </>
      ) : face}
    </li>
  );
}
