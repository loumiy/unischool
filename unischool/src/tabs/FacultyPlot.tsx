import { Fragment, useState, type CSSProperties } from 'react';
import type { Action } from '../state/actions';
import type { Faculty, GameState } from '../state/types';
import { facultyQualityTier } from '../data/facultyData';
import { candidateListingWeeks } from '../systems/administration/effects';
import { effectiveCourseSlots } from '../systems/techtree/techSystem';
import { facultyPay } from '../systems/finance/financeSystem';
import { DisclosureIcon } from '../components/icons';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import { GRADE_LINES, facultyMedian, inScope, retiringSoon, teachingRank } from './facultySort';
import { GRADE_A } from '../data/courseQuality';
import { FacultyActions, StatMeter, type Commitment } from './FacultyTile';
import FacultyPerson from './FacultyPerson';
import Figure from '../components/Figure';
import { FIGURE_HINTS } from '../data/figureHints';
import { moneyShort, weeksShort } from '../format';

// ---------------------------------------------------------------------
// The faculty as a plot (the Faculty tab's Plot layout): every professor a
// dot at their teaching across and research up, out of 100, with a line
// to where each is heading. The faculty's medians cross the plot, so the
// four corners read as who is above both, who teaches, who researches and
// who is below both; the course grades' lines run under them. The market
// rides on the same axes as rings, so a candidate is judged where they
// would stand. A dot picked opens a card beside the plot that reads them
// against the faculty, and from it the person page.
// ---------------------------------------------------------------------

// Positions are percentages of the square, so it scales to any width.
const across = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
const up = (v: number) => `${100 - Math.max(0, Math.min(100, v))}%`;

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0';
}

// One dot: a professor filled, a retirement within the year in the school's
// second colour, a candidate as a ring; the other set, when it is context, paler.
function Dot({ f, isCandidate, faded, picked, onPick }: { f: Faculty; isCandidate: boolean; faded: boolean; picked: boolean; onPick: () => void }) {
  const kind = isCandidate ? 'cand' : retiringSoon(f) ? 'retiring' : 'prof';
  const label = `${isCandidate ? 'Candidate ' : ''}${f.name}, ${f.field}: teaching ${Math.round(f.teaching)}, research ${Math.round(f.research)}`;
  return (
    <button
      type="button"
      className={`faculty-dot ${kind}${faded ? ' faded' : ''}${picked ? ' picked' : ''}`}
      style={{ left: across(f.teaching), top: up(f.research) }}
      title={label}
      aria-label={label}
      aria-pressed={picked}
      onClick={onPick}
    />
  );
}

export default function FacultyPlot({ s, act, people, isCandidate, scope, commitments, loads, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void;
  // The view's people, already filtered by the tab: the faculty, or the
  // market. The other set can be shown beside them.
  people: Faculty[];
  isCandidate: boolean;
  // The field or division the view is narrowed to (facultySort.ts's inScope).
  scope: string | null;
  commitments: ReadonlyMap<string, Commitment>;
  loads: ReadonlyMap<string, number>;
  onOpenCurriculum?: (target: string) => void;
}) {
  // On the faculty the market is shown to compare against; on the market
  // the faculty is, paler, as the field the candidates would join. In the
  // fields the view is narrowed to, so a department's plot holds its own.
  const [showOthers, setShowOthers] = useState(true);
  // Every line at once is a thicket on a big market; the picked person's
  // is always drawn.
  const [showHeading, setShowHeading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [personOpen, setPersonOpen] = useState(false);
  const others = showOthers ? (isCandidate ? s.faculty : s.candidates).filter((f) => inScope(scope, f.field)) : [];

  const medT = facultyMedian(s.faculty);
  const medR = facultyMedian(s.faculty, 'research');

  // The picked person, wherever they are now: a candidate appointed stays
  // picked, on the faculty.
  const pickedCandidate = picked ? s.candidates.find((f) => f.id === picked) : undefined;
  const pickedProfessor = picked ? s.faculty.find((f) => f.id === picked) : undefined;
  const sel = pickedCandidate ?? pickedProfessor;
  const selIsCandidate = pickedCandidate !== undefined;
  const pick = (id: string) => {
    if (id !== picked) setPersonOpen(false);
    setPicked(id);
  };

  // The lines to where each is heading: in one SVG under the dots, its
  // box 100 by 100 so the ends are the stats themselves.
  const heading = [...others, ...people].filter((f) => (showHeading || f.id === picked)
    && (f.teachingPotential > f.teaching + 1 || f.researchPotential > f.research + 1));
  const othersAreCandidates = !isCandidate;

  return (
    <div className="faculty-plot-wrap">
      <div className="faculty-plot-tools dept-tools">
        <label className="dept-tool dept-tool-check">
          <input type="checkbox" checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} />
          {isCandidate ? `Show the faculty (${s.faculty.length})` : `Show the market (${s.candidates.length})`}
        </label>
        <label className="dept-tool dept-tool-check">
          <input type="checkbox" checked={showHeading} onChange={(e) => setShowHeading(e.target.checked)} />
          Show where each is heading
        </label>
        {medT !== null && medR !== null && (
          <span className="faculty-plot-medians">Your faculty’s medians: teaching <strong>{medT}</strong> · research <strong>{medR}</strong></span>
        )}
      </div>

      <div className="faculty-plot">
        <figure className="faculty-plot-figure">
          <div className="faculty-plot-y-label" aria-hidden="true">Research →</div>
          <div className="faculty-plot-area">
            {GRADE_LINES.map((g) => (
              <Fragment key={g.value}>
                <span className={`faculty-plot-grade across${g.value === GRADE_A ? ' top' : ''}`} style={{ left: across(g.value) }}><span>{g.label}</span></span>
                <span className="faculty-plot-grade up" style={{ top: up(g.value) }}><span>{g.value}</span></span>
              </Fragment>
            ))}
            {medT !== null && <span className="faculty-plot-median across" style={{ left: across(medT) }} title={`Your faculty's median teaching, ${medT}`} />}
            {medR !== null && <span className="faculty-plot-median up" style={{ top: up(medR) }} title={`Your faculty's median research, ${medR}`} />}
            <span className="faculty-plot-corner top right">Above both medians</span>
            <span className="faculty-plot-corner top left">Scholars</span>
            <span className="faculty-plot-corner bottom right">Teachers</span>
            <span className="faculty-plot-corner bottom left">Below both</span>
            <svg className="faculty-plot-heading" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {heading.map((f) => (
                <line
                  key={f.id}
                  className={`${s.candidates.includes(f) ? 'cand' : 'prof'}${f.id === picked ? ' picked' : ''}`}
                  x1={f.teaching} y1={100 - f.research} x2={f.teachingPotential} y2={100 - f.researchPotential}
                />
              ))}
            </svg>
            {others.map((f) => (
              <Dot key={f.id} f={f} isCandidate={othersAreCandidates} faded={!othersAreCandidates} picked={f.id === picked} onPick={() => pick(f.id)} />
            ))}
            {people.map((f) => (
              <Dot key={f.id} f={f} isCandidate={isCandidate} faded={false} picked={f.id === picked} onPick={() => pick(f.id)} />
            ))}
          </div>
          <figcaption className="faculty-plot-x-label">Teaching →</figcaption>
        </figure>

        {sel ? (
          <PickedCard
            s={s} act={act} f={sel} isCandidate={selIsCandidate} medT={medT} medR={medR}
            commitment={selIsCandidate ? undefined : commitments.get(sel.id)}
            load={selIsCandidate ? 0 : loads.get(sel.id) ?? 0}
            personOpen={personOpen} onTogglePerson={() => setPersonOpen((v) => !v)}
          />
        ) : (
          <aside className="faculty-plot-card empty">
            <p>Pick a dot to read them against your faculty: where they stand in their department, and what they cost.</p>
            <ul className="faculty-plot-key">
              <li><span className="faculty-dot prof" aria-hidden="true" /> On the faculty</li>
              <li><span className="faculty-dot retiring" aria-hidden="true" /> Retiring within the year</li>
              <li><span className="faculty-dot cand" aria-hidden="true" /> On the market</li>
              <li><span className="faculty-plot-key-line" aria-hidden="true" /> Growing toward their potential</li>
              <li><span className="faculty-plot-key-median" aria-hidden="true" /> Your faculty’s medians</li>
            </ul>
          </aside>
        )}
      </div>

      {sel && personOpen && (
        <div className="faculty-plot-person">
          {!selIsCandidate && (
            <div className="faculty-card-foot faculty-row-person-actions">
              <FacultyActions s={s} act={act} f={sel} commitment={commitments.get(sel.id)} load={loads.get(sel.id) ?? 0} />
            </div>
          )}
          <FacultyPerson s={s} f={sel} isCandidate={selIsCandidate} commitment={selIsCandidate ? undefined : commitments.get(sel.id)} onOpenCurriculum={onOpenCurriculum} />
        </div>
      )}
    </div>
  );
}

// The picked person's card: their stats, against the faculty's medians,
// their place in their department, and what they cost.
function PickedCard({ s, act, f, isCandidate, medT, medR, commitment, load, personOpen, onTogglePerson }: {
  s: GameState; act: (a: Action) => void; f: Faculty; isCandidate: boolean;
  medT: number | null; medR: number | null; commitment?: Commitment; load: number;
  personOpen: boolean; onTogglePerson: () => void;
}) {
  const { rank, of } = teachingRank(f, s.faculty);
  const t = Math.round(f.teaching);
  const r = Math.round(f.research);
  const slots = isCandidate ? f.courseSlots : effectiveCourseSlots(s, f);
  const listingLeft = Math.max(0, candidateListingWeeks(s) - f.weeksListed);
  const tone = (d: number): CSSProperties => ({ color: d > 0 ? 'var(--ok-on-light)' : d < 0 ? 'var(--bad-on-light)' : undefined });
  return (
    <aside className={`faculty-plot-card${isCandidate ? ' listed' : ''}`} aria-live="polite">
      <div className="faculty-tile-band">
        <span className="faculty-tile-field">{f.field}</span>
        <span>{isCandidate ? 'On the market' : retiringSoon(f) ? 'Retiring' : commitment ? 'On a project' : 'On the faculty'}</span>
      </div>
      <div className="faculty-tile-body">
        <div className="faculty-tile-top">
          <span className="faculty-tile-mount"><FacultyPortrait f={portraitOf(f)} size={56} shape="square" /></span>
          <span className="faculty-tile-who">
            <span className="faculty-name">{f.name}</span>
            <span className="faculty-tile-rank">{facultyQualityTier(f)}</span>
          </span>
        </div>
        <div className="faculty-tile-stats">
          <StatMeter label="Teaching" value={f.teaching} potential={f.teachingPotential} median={isCandidate ? medT : undefined} />
          <StatMeter label="Research" value={f.research} potential={f.researchPotential} />
        </div>
        <dl className="faculty-plot-facts">
          {medT !== null && <Figure label={`Teaching against your median (${medT})`} value={<span style={tone(t - medT)}>{signed(t - medT)}</span>} hint={FIGURE_HINTS.plotTeaching} />}
          {medR !== null && <Figure label={`Research against your median (${medR})`} value={<span style={tone(r - medR)}>{signed(r - medR)}</span>} hint={FIGURE_HINTS.plotResearch} />}
          <Figure label={`${isCandidate ? 'Would rank' : 'Ranks'} in ${f.field}, for teaching`} value={of === 1 ? 'the only one' : `${ordinal(rank)} of ${of}`} hint={FIGURE_HINTS.plotRank} />
          <Figure label={isCandidate ? 'Asks' : 'Salary'} value={`${moneyShort(facultyPay(s, f.salary))}/yr`} className="mono" hint={FIGURE_HINTS.plotPay} />
          {isCandidate
            ? <Figure label="Withdraws in" value={weeksShort(listingLeft)} className="mono" hint={FIGURE_HINTS.plotListing} />
            : <Figure label="Course slots in use" value={`${load}/${slots}`} className="mono" hint={FIGURE_HINTS.plotLoad} />}
        </dl>
      </div>
      <div className="faculty-tile-foot">
        <div className="faculty-card-foot faculty-tile-actions">
          <button type="button" className="faculty-expand-btn" onClick={onTogglePerson} aria-expanded={personOpen}>
            <DisclosureIcon open={personOpen} /> {personOpen ? 'Less' : 'More'}
          </button>
          {isCandidate && <button className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}>Appoint</button>}
        </div>
      </div>
    </aside>
  );
}
