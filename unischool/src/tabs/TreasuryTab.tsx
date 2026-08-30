import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';

// Finance detail. Cash, prestige, and the weekly trend already live in the
// persistent header — this is the fuller picture: endowment, weekly
// operating expense, and the tuition rate itself (set once a year, only at
// the summer admissions decision — see InterruptModal.tsx).
export default function TreasuryTab({ s }: { s: GameState }) {
  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <h2>Treasury</h2>
          <HelpHint align="end" text="Tuition is set once a year, at the summer admissions decision." />
        </div>
        <dl>
          <dt>Cash</dt><dd>${Math.round(s.finance.cash).toLocaleString()}</dd>
          <dt>Endowment</dt><dd>${Math.round(s.finance.endowment).toLocaleString()}</dd>
          <dt>Weekly OpEx</dt><dd>${Math.round(s.finance.weeklyOpEx).toLocaleString()}</dd>
          <dt>Tuition</dt><dd>${s.finance.tuitionPerStudent.toLocaleString()}/yr</dd>
        </dl>
      </section>
    </div>
  );
}
