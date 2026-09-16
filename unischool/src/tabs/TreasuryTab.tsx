import type { ClassTuition, GameState } from '../state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../state/types';
import type { Action } from '../state/actions';
import { financeBreakdown, instructionCostPerStudent, endowmentCampaign } from '../systems/finance/financeSystem';
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

// Youngest first, the same order the Admissions tab lists the classes in
// and the same order reducer.ts advances them.
const CLASS_ORDER: ReadonlyArray<[keyof ClassTuition, string]> = [
  ['freshman', 'Fr'], ['sophomore', 'So'], ['junior', 'Jr'], ['senior', 'Sr'],
];

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

export default function TreasuryTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const flow = financeBreakdown(s);
  const annualNet = flow.net * WEEKS_PER_YEAR;
  const coursesDone = s.tech.filter((t) => t.kind === 'course' && t.status === 'done').length;
  const campaign = endowmentCampaign(s);

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
              note={`${totalEnrolled(s.students).toLocaleString()} enrolled across four classes, each at the price it was admitted under, less ${Math.round(s.admissions.scholarshipRate * 100)}% scholarships`}
              amount={flow.tuitionRevenue}
            />
            <StatementLine
              label="Reputation dividend"
              note={`donors and grants, scaling with prestige ${Math.round(s.self.reputation)}`}
              amount={flow.prestigeRevenue}
            />
            <StatementLine
              label="Endowment payout"
              note={`the endowment's annual spend rate on ${money(s.finance.endowment)}`}
              amount={flow.endowmentPayout}
            />
            <StatementLine
              label="Baseline funding"
              note={s.self.schoolType === 'public' ? 'state appropriations: a flat grant plus a per-student allocation' : 'none — private schools receive no appropriation'}
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
              note={`${s.students.capacity.toLocaleString()} beds — an empty one still costs, at half rate`}
              amount={flow.seatUpkeep}
            />
            <StatementLine
              label="Instruction"
              note={`${totalEnrolled(s.students).toLocaleString()} enrolled × ${money(instructionCostPerStudent(s))}/wk — rises with every course you offer (${coursesDone})`}
              amount={flow.instructionCost}
            />
            <StatementLine
              label="Academic upkeep"
              note={`running ${coursesDone} courses and the school buildings they sit in`}
              amount={flow.academicUpkeep}
            />
            <StatementLine
              label="Campus upkeep"
              note="libraries, dining, rec and labs, each carrying its own running cost"
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
          {money(annualNet)} a year at this rate. Money is the only throttle on starting development: a Buildable's cost is charged in full, up front, and you cannot start what you cannot pay for — so the wait for the next purchase is the pacing. Only an operating deficit can push cash negative, and that stalls expansion rather than ending the run.
        </p>
      </section>

      <div className="treasury-columns">
        <section className="panel">
          <div className="panel-head">
            <h2>Endowment Campaign</h2>
            <HelpHint align="end" text="A campaign converts cash into endowment at a donor match that scales with prestige. The endowment pays a fixed share of itself into income every year, and its size per student feeds prestige — so once the dorm chain and the curriculum are built out, this is what money is still for. Each campaign costs more than the last, and donors give a little less each time." />
          </div>
          {!campaign.available ? (
            <p className="empty-note">
              No donor underwrites a campaign for a school nobody has heard of yet. Build prestige first — {Math.round(s.self.reputation)} today.
            </p>
          ) : (
            <>
              <dl>
                <dt>Campaign</dt><dd>#{campaign.number}</dd>
                <dt>Cash committed</dt><dd>{money(campaign.cost)}</dd>
                <dt>Donor match</dt><dd>+{Math.round(campaign.match * 100)}%</dd>
                <dt>Raised into the endowment</dt><dd>{money(campaign.endowmentGain)}</dd>
                <dt>Adds to income</dt><dd>{money(campaign.annualPayout)}/yr, permanently</dd>
              </dl>
              <button
                disabled={!campaign.affordable}
                onClick={() => act({ type: 'LAUNCH_ENDOWMENT_CAMPAIGN' })}
              >
                {campaign.affordable ? `Launch campaign #${campaign.number}` : `Needs ${money(campaign.cost)} in cash`}
              </button>
            </>
          )}
        </section>

        <section className="panel">
          <h2>Balance & Policy</h2>
          <dl>
            <dt>Cash</dt><dd>{money(s.finance.cash)}</dd>
            <dt>Endowment</dt><dd>{money(s.finance.endowment)}</dd>
            <dt>Campaigns run</dt><dd>{s.finance.endowmentCampaigns}</dd>
            {/* Research grants are one-off arrivals, not a line of the weekly
                statement above — so they are reported here as a running
                total instead of being folded into an average that would
                misrepresent both the weeks a grant lands and the weeks it
                doesn't. See systems/research/researchSystem.ts. */}
            <dt>Research grants</dt>
            <dd>{money(s.research.grantIncome)} across {s.research.grants}</dd>
            {/* The listed price is what the next class will be quoted; the
                four below are what the classes on the books actually pay.
                They are equal until the player first moves the slider, and
                the gap that opens afterwards is the point — a school that
                has raised its price is collecting up to four prices at once,
                and this is the only screen that says so. See types.ts's
                tuitionByClass. */}
            <dt>Tuition, listed</dt><dd>${s.finance.listedTuition.toLocaleString()}/yr</dd>
            <dt>Tuition ceiling</dt><dd>${s.finance.tuitionCeiling.toLocaleString()}/yr</dd>
            <dt>Charged, by class</dt>
            <dd>
              {CLASS_ORDER.map(([key, label], i) => (
                <span key={key}>
                  {i > 0 && ' · '}
                  {label} ${s.finance.tuitionByClass[key].toLocaleString()}
                </span>
              ))}
            </dd>
            <dt>Scholarships</dt><dd>{Math.round(s.admissions.scholarshipRate * 100)}%</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
