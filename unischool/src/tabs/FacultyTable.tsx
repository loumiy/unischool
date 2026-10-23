import { Fragment, useState, type CSSProperties } from 'react';
import type { Action } from '../state/actions';
import type { Faculty, GameState } from '../state/types';
import { facultyQualityTier } from '../data/facultyData';
import { candidateListingWeeks } from '../systems/administration/effects';
import { effectiveCourseSlots } from '../systems/techtree/techSystem';
import { facultyPay } from '../systems/finance/financeSystem';
import { DisclosureIcon } from '../components/icons';
import FacultyPortrait, { portraitOf } from '../components/FacultyPortrait';
import { bandOf, facultyMedian, type FacultySort } from './facultySort';
import { yearsHere } from './facultyCareer';
import { FacultyActions, FacultyBadges, type Commitment } from './FacultyTile';
import FacultyPerson from './FacultyPerson';
import { money, moneyShort, weeksShort } from '../format';

// ---------------------------------------------------------------------
// The faculty as a table (the Faculty tab's Table layout): one row a
// person, so a year-40 faculty of ninety reads in two screens where the
// tiles take fourteen. The same people, sort and filters as the cards;
// a column's head sorts by it, and again reverses. More opens the person
// page under the row, Train and Dismiss with it, as a tile's does.
// ---------------------------------------------------------------------

// The columns that sort, and the order each names. The grid's sort
// (facultySort.ts) is the order; `reversed` turns it round.
interface Column { label: string; sort?: FacultySort; className?: string }

function columns(isCandidate: boolean): Column[] {
  return [
    { label: 'Name', sort: 'name' },
    { label: 'Department', className: 'faculty-col-field' },
    { label: 'Teaching', sort: 'teaching' },
    { label: 'Research', sort: 'research' },
    { label: isCandidate ? 'Would supply' : 'Course slots' },
    { label: isCandidate ? 'Asks' : 'Salary', sort: 'salary' },
    isCandidate ? { label: 'Listing' } : { label: 'Here', sort: 'here' },
    { label: 'Notes', className: 'faculty-col-notes' },
    { label: '' },
  ];
}

// A stat in a cell: the number in its band's ink (a candidate's teaching
// against the faculty's median instead, as on the tile), a short meter
// with the potential paler beyond it, and where it is heading.
function StatCell({ label, value, potential, median }: { label: string; value: number; potential: number; median?: number | null }) {
  const now = Math.round(value);
  const then = Math.round(potential);
  const against = median !== undefined && median !== null;
  const ink = against ? (now > median ? 'var(--warm-ink)' : 'var(--ink-muted)') : `var(--grade-${bandOf(value).toLowerCase()})`;
  return (
    <td className="faculty-cell-stat" style={{ '--stat-grade': ink } as CSSProperties}
      title={`${label} ${now} of 100${then > now ? `, growing toward ${then}` : ''}${against ? `; your faculty's median is ${median}` : ''}`}>
      <span className="faculty-stat-value">{now}</span>
      <span className="faculty-stat-track" aria-hidden="true">
        {then > now && <span className="faculty-stat-headroom" style={{ width: `${Math.min(100, then)}%` }} />}
        <span className="faculty-stat-fill" style={{ width: `${Math.max(0, Math.min(100, now))}%` }} />
      </span>
      <span className="faculty-stat-rise">{then > now ? `→ ${then}` : ''}</span>
    </td>
  );
}

export default function FacultyTable({ s, act, people, isCandidate, sort, setSort, commitments, loads, onOpenCurriculum }: {
  s: GameState; act: (a: Action) => void;
  // Already filtered and sorted by the tab.
  people: Faculty[];
  isCandidate: boolean;
  sort: FacultySort; setSort: (s: FacultySort) => void;
  commitments: ReadonlyMap<string, Commitment>;
  loads: ReadonlyMap<string, number>;
  onOpenCurriculum?: (target: string) => void;
}) {
  const [reversed, setReversed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const median = isCandidate ? facultyMedian(s.faculty) : undefined;
  const listingWeeks = candidateListingWeeks(s);
  const cols = columns(isCandidate);
  const rows = reversed ? [...people].reverse() : people;

  const sortBy = (id: FacultySort) => {
    if (id === sort) setReversed((r) => !r);
    else { setSort(id); setReversed(false); }
  };

  return (
    <div className="faculty-table-wrap">
      <table className="faculty-table">
        <thead>
          <tr>
            {cols.map((c, i) => {
              const on = c.sort !== undefined && c.sort === sort;
              // Names run A to Z; every other order starts at the top.
              const ascending = (c.sort === 'name') !== reversed;
              return (
                <th key={i} className={c.className} aria-sort={on ? (ascending ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? (
                    <button type="button" className={on ? 'on' : undefined} onClick={() => sortBy(c.sort!)}>
                      {c.label}{on && <span aria-hidden="true"> {ascending ? '↑' : '↓'}</span>}
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => {
            const commitment = isCandidate ? undefined : commitments.get(f.id);
            const slots = isCandidate ? f.courseSlots : effectiveCourseSlots(s, f);
            const held = isCandidate ? 0 : loads.get(f.id) ?? 0;
            const pay = facultyPay(s, f.salary);
            const listingLeft = Math.max(0, listingWeeks - f.weeksListed);
            const here = isCandidate ? 0 : yearsHere(s, f);
            const isOpen = open === f.id;
            const toggle = () => setOpen(isOpen ? null : f.id);
            return (
              <Fragment key={f.id}>
                <tr className={isOpen ? 'open' : undefined} data-faculty={f.id}>
                  <td>
                    <button type="button" className="faculty-row-who" onClick={toggle} tabIndex={-1}>
                      <span className="faculty-row-mount"><FacultyPortrait f={portraitOf(f)} size={32} shape="square" /></span>
                      <span className="faculty-tile-who">
                        <span className="faculty-name">{f.name}</span>
                        <span className="faculty-row-rank">{facultyQualityTier(f)}</span>
                      </span>
                    </button>
                  </td>
                  <td className="faculty-col-field">{f.field}</td>
                  <StatCell label="Teaching" value={f.teaching} potential={f.teachingPotential} median={median} />
                  <StatCell label="Research" value={f.research} potential={f.researchPotential} />
                  <td className="faculty-cell-mono">
                    {isCandidate ? (
                      <span title={`Would supply ${slots} course slots on appointment`}>{slots}</span>
                    ) : (
                      <span className={held >= slots ? 'faculty-card-load full' : 'faculty-card-load'} title={`Teaching ${held} of the ${slots} course slots they supply`}>
                        {held}/{slots}
                      </span>
                    )}
                  </td>
                  <td className="faculty-cell-mono" title={`${isCandidate ? 'Asks' : 'Salary'} ${money(f.salary)}. You pay ${money(pay)} at your market rate.`}>
                    {moneyShort(pay)}
                  </td>
                  <td className="faculty-cell-mono">
                    {isCandidate
                      ? <span className={listingLeft <= 2 ? 'candidate-expiry soon' : 'candidate-expiry'} title={`Withdraws from the market in ${weeksShort(listingLeft)}`}>{weeksShort(listingLeft)} left</span>
                      : `${here} ${here === 1 ? 'yr' : 'yrs'}`}
                  </td>
                  <td className="faculty-col-notes"><FacultyBadges s={s} f={f} isCandidate={isCandidate} commitment={commitment} /></td>
                  <td>
                    <div className="faculty-card-foot faculty-row-actions">
                      {isCandidate && <button type="button" className="appoint" onClick={() => act({ type: 'HIRE_FACULTY', facultyId: f.id })}>Appoint</button>}
                      <button
                        type="button"
                        className="faculty-expand-btn"
                        onClick={toggle}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Show less about ${f.name}` : `Show more about ${f.name}`}
                      >
                        <DisclosureIcon open={isOpen} /> {isOpen ? 'Less' : 'More'}
                      </button>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="faculty-row-person">
                    <td colSpan={cols.length}>
                      {!isCandidate && (
                        <div className="faculty-card-foot faculty-row-person-actions">
                          <FacultyActions s={s} act={act} f={f} commitment={commitment} load={held} />
                        </div>
                      )}
                      <FacultyPerson s={s} f={f} isCandidate={isCandidate} commitment={commitment} onOpenCurriculum={onOpenCurriculum} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
