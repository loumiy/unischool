import type { GameState } from '../state/types';
import type { Action } from '../state/actions';
import HelpHint from '../components/HelpHint';
import { money } from '../format';
import { DEANS_FOR_FASTEST, POLICY_RULE_NOTES, SEAT_SENIOR_YEARS } from '../data/seatData';
import { marketRateMultiplier } from '../data/facultyData';
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
    ? 'The year can run at up to eight times.'
    : fasterAllowed(s)
      ? `The year can run at four times; ${DEANS_FOR_FASTEST - deansAppointed(s)} more Dean${DEANS_FOR_FASTEST - deansAppointed(s) === 1 ? '' : 's'} would open eight.`
      : 'A Provost would let the year run at four times; with three Deans, eight.';
  return (
    <section className="panel administration">
      <div className="panel-head">
        <span className="panel-head-title">
          <h3>Administration</h3>
          <HelpHint text={`Each seat takes its domain's routine off your desk: when one of its events comes up, it answers by the policy you set and the log says so. Anything that would move more than four weeks of operating cost, or that the seat's choice cannot pay for, still comes to you, and so does anything that is the president's alone. A seat is for good: its salary, paid at the market rate prestige sets, is permanent. A professor of ${SEAT_SENIOR_YEARS} years can be promoted into a seat for less than an outside hire, and leaves the classroom to take it.`} />
        </span>
        <span className="stat">{money(seatPayroll(s))}/wk</span>
      </div>
      <p className="empty-note">{speeds}</p>
      <ul className="seat-list">
        {slots.map(({ def, school }) => {
          const seat = heldSeat(s, def.id, school);
          const title = seatTitle(def, school);
          const key = `${def.id}:${school ?? ''}`;
          if (seat) {
            return (
              <li key={key} className="seat held">
                <div className="seat-head">
                  <strong>{title}</strong>
                  <span>{seat.holder}</span>
                  <span className="stat">{seat.internal ? 'from the faculty' : 'from outside'} · {money(seat.salary * market)}/yr</span>
                </div>
                <div className="seat-policies" role="radiogroup" aria-label={`${title}'s policy`}>
                  {def.policies.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`panel-action small ${seat.policy === p.id ? 'on' : ''}`}
                      aria-pressed={seat.policy === p.id}
                      title={POLICY_RULE_NOTES[p.rule]}
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
              <p className="seat-blurb">{def.blurb}</p>
              <div className="seat-appoint">
                {candidates.map((f) => (
                  <button key={f.id} type="button" className="panel-action small" onClick={() => act({ type: 'APPOINT_SEAT', seatId: def.id, school, facultyId: f.id })}>
                    Promote {f.name} ({f.field}) · {money(def.internalSalary * market)}/yr
                  </button>
                ))}
                <button type="button" className="panel-action small" onClick={() => act({ type: 'APPOINT_SEAT', seatId: def.id, school })}>
                  Hire from outside · {money(def.outsideSalary * market)}/yr
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
