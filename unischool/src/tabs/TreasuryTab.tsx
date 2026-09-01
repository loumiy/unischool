import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { financeBreakdown } from '../systems/finance/financeSystem';
import HelpHint from '../components/HelpHint';

// ---------------------------------------------------------------------
// The Treasury is where the economy explains itself. Money is the game's
// primary throttle (see README's "Pacing model: money is the throttle"),
// but every line of it used to be invisible: financeSystem.ts computed
// tuition revenue, the reputation dividend, baseline funding, salaries,
// seat upkeep and facility upkeep every single week, and the player was
// shown one lump "Weekly OpEx" and nothing at all on the income side.
//
// So this reads the same breakdown the tick actually charges (see
// financeBreakdown — one formula, no second copy to drift) and lays it out
// as a two-column income statement: what comes in, what goes out, and the
// net between them. That net IS the pacing: it's the answer to "how long
// until I can afford the next dorm", and now it's traceable to the four or
// five decisions that produced it.
//
// All figures are per week, the unit the sim runs on — the annualized
// footer is a x WEEKS_PER_YEAR convenience, not a second set of numbers.
// ---------------------------------------------------------------------

function money(v: number): string {
  return `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString()}`;
}

// One line of the statement. `note` carries what drives the figure, so the
// statement teaches the economy rather than just reporting it.
function StatementLine({ label, note, amount }: { label: string; note: string; amount: number }) {
  return (
    <div className="statement-line">
      <div className="statement-line-label">
        <span>{label}</span>
        <span className="statement-line-note">{note}</span>
      </div>
      <span className="statement-line-amount">{money(amount)}</span>
    </div>
  );
}

export default function TreasuryTab({ s }: { s: GameState }) {
  const flow = financeBreakdown(s);
  const annualNet = flow.net * WEEKS_PER_YEAR;

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <h2>Weekly Income Statement</h2>
          <HelpHint align="end" text="Every figure here is per week, and is exactly what the weekly tick charges or collects. Tuition is set once a year, at the summer admissions decision." />
        </div>

        <div className="income-statement">
          <div className="statement-col">
            <h3>Income</h3>
            <StatementLine
              label="Net tuition"
              note={`${s.students.enrolled.toLocaleString()} enrolled × $${s.finance.tuitionPerStudent.toLocaleString()}/yr less ${Math.round(s.admissions.financialAidRate * 100)}% aid`}
              amount={flow.tuitionRevenue}
            />
            <StatementLine
              label="Reputation dividend"
              note={`donors and grants, scaling with prestige ${Math.round(s.self.reputation)}`}
              amount={flow.prestigeRevenue}
            />
            <StatementLine
              label="Baseline funding"
              note={s.self.schoolType === 'public' ? 'state appropriations, fixed at founding' : 'none — private schools receive no appropriation'}
              amount={flow.baselineFunding}
            />
            <div className="statement-total">
              <span>Total income</span>
              <span className="statement-line-amount">{money(flow.totalIncome)}</span>
            </div>
          </div>

          <div className="statement-col">
            <h3>Expenses</h3>
            <StatementLine
              label="Faculty salaries"
              note={`${s.faculty.length} on the roster; salaries rise with tenure`}
              amount={flow.weeklySalaries}
            />
            <StatementLine
              label="Seat upkeep"
              note={`${s.students.capacity.toLocaleString()} beds — charged on capacity, not on who's in them`}
              amount={flow.seatUpkeep}
            />
            <StatementLine
              label="Facility upkeep"
              note="libraries, dining, rec, parking and labs, each carrying its own running cost"
              amount={flow.facilityUpkeep}
            />
            <div className="statement-total">
              <span>Total expenses</span>
              <span className="statement-line-amount">{money(flow.totalExpenses)}</span>
            </div>
          </div>
        </div>

        <div className={`statement-net ${flow.net < 0 ? 'negative' : ''}`}>
          <span>Net weekly</span>
          <span className="statement-line-amount">{money(flow.net)}</span>
        </div>
        <p className="empty-note">
          {money(annualNet)} a year at this rate. Money is the only throttle on starting development, and a Buildable's cost is charged up front — so committing eagerly is what pushes cash negative and stalls the next start, rather than ending the run.
        </p>
      </section>

      <section className="panel">
        <h2>Balance & Policy</h2>
        <dl>
          <dt>Cash</dt><dd>{money(s.finance.cash)}</dd>
          <dt>Endowment</dt><dd>{money(s.finance.endowment)}</dd>
          <dt>Tuition</dt><dd>${s.finance.tuitionPerStudent.toLocaleString()}/yr</dd>
          <dt>Tuition ceiling</dt><dd>${s.finance.tuitionCeiling.toLocaleString()}/yr</dd>
          <dt>Financial aid</dt><dd>{Math.round(s.admissions.financialAidRate * 100)}%</dd>
        </dl>
      </section>
    </div>
  );
}
