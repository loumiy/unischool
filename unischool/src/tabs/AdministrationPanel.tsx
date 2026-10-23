import ConfirmButton from '../components/ConfirmButton';
import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import HelpHint from '../components/HelpHint';
import { moneyShort } from '../format';
import { DEANS_FOR_FASTEST, POLICY_RULE_NOTES, SEAT_SENIOR_YEARS } from '../data/seatData';
import { marketRateMultiplier } from '../data/facultyData';
import { coursesTaughtBy } from '../systems/faculty/facultyAssignment';
import {
  deansAppointed, fastestAllowed, fasterAllowed, heldSeat, seatCandidates, seatPayroll, seatSlots, seatTitle,
} from '../systems/delegation/seats';

// The org chart (Plan 28): every seat the college could fill, who holds
// it and by what policy they answer, and who could take the vacant ones.
// The seats and their rules are systems/delegation/seats.ts's.

const SHORTLIST = 3;

export default function AdministrationPanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const market = marketRateMultiplier(s.self.reputation);
  const slots = seatSlots(s);
  const speeds = fastestAllowed(s)
    ? 'Game speed goes up to 8×.'
    : fasterAllowed(s)
      ? `Game speed goes up to 4×. Appoint ${DEANS_FOR_FASTEST - deansAppointed(s)} more Dean${DEANS_FOR_FASTEST - deansAppointed(s) === 1 ? '' : 's'} to open 8×.`
      : `Appoint a Provost to open game speed 4×. A Provost and the Deans of ${DEANS_FOR_FASTEST} founded schools open 8×.`;
  return (
    <section className="panel administration">
      <div className="panel-head">
        <span className="panel-head-title">
          <h3>Administration</h3>
          <HelpHint text={`Each seat handles the routine matters in its area for you. When one comes up, the seat answers by its policy and logs the answer. Some matters still come to you: anything costing more than four weeks of operating costs, anything the seat's choice can't pay for, and the board's own matters. A seat is for good, and so is its salary. Prestige sets the market rate it's paid at. Promoting a professor of ${SEAT_SENIOR_YEARS} years costs less than hiring from outside. They leave the classroom to take the seat.`} />
        </span>
        <span className="stat">{moneyShort(seatPayroll(s))}/wk</span>
      </div>
      <p className="empty-note">{speeds}</p>
      <ul className="seat-list">
        {slots.map(({ def, school }, i) => {
          // A seat's description once, on its first slot: every Dean's is the same.
          const firstOfKind = slots.findIndex((slot) => slot.def.id === def.id) === i;
          const seat = heldSeat(s, def.id, school);
          const title = seatTitle(def, school);
          const key = `${def.id}:${school ?? ''}`;
          if (seat) {
            return (
              <li key={key} className="seat held">
                <div className="seat-head">
                  <strong>{title}</strong>
                  <span>{seat.holder}</span>
                  <span className="stat">{seat.internal ? 'from the faculty' : 'from outside'} · {moneyShort(seat.salary * market)}/yr</span>
                </div>
                <div className="seat-policies" role="radiogroup" aria-label={`${title}'s policy`}>
                  {def.policies.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`panel-action small ${seat.policy === p.id ? 'on' : ''}`}
                      role="radio"
                      aria-checked={seat.policy === p.id}
                      title={p.note ?? POLICY_RULE_NOTES[p.rule]}
                      onClick={() => act({ type: 'SET_SEAT_POLICY', seatId: def.id, school, policy: p.id })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          }
          const candidates = seatCandidates(s, def.id, school).slice(0, SHORTLIST);
          return (
            <li key={key} className="seat vacant">
              <div className="seat-head">
                <strong>{title}</strong>
                <span className="stat">vacant</span>
              </div>
              {firstOfKind && <p className="seat-blurb">{def.blurb}</p>}
              <div className="seat-appoint">
                {candidates.map((f) => {
                  const taught = coursesTaughtBy(s, f);
                  return (
                    <ConfirmButton
                      key={f.id}
                      className="panel-action small"
                      label={`Promote ${f.name} (${f.field}) · ${moneyShort(def.internalSalary * market)}/yr`}
                      armedLabel={`Confirm — ${f.name} leaves the classroom for good`}
                      warning={<>A seat is for good, and {f.name} leaves the classroom{taught.length > 0 ? <>: {taught.map((c) => c.name.split(' · ')[0]).join(', ')} will be left without an instructor</> : ''}.</>}
                      onConfirm={() => act({ type: 'APPOINT_SEAT', seatId: def.id, school, facultyId: f.id })}
                    />
                  );
                })}
                <ConfirmButton
                  className="panel-action small"
                  label={`Hire from outside · ${moneyShort(def.outsideSalary * market)}/yr`}
                  armedLabel="Confirm — a salary for good"
                  warning="Permanent."
                  onConfirm={() => act({ type: 'APPOINT_SEAT', seatId: def.id, school })}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
