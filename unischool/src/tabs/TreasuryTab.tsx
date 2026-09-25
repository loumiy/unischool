import AdvancementPanel from './AdvancementPanel';
import type { ClassTuition, GameState } from '../state/types';
import { WEEKS_PER_YEAR, coursesDone as countCoursesDone, totalEnrolled } from '../state/types';
import type { Action } from '../state/actions';
import {
  financeBreakdown, instructionDetail, SECTION_SIZE, SECTION_COST,
  SCALE_FREE_BELOW, SERVICES_PER_STUDENT_PER_WEEK, marginalStudentCost, servicesMultiplier,
} from '../systems/finance/financeSystem';
import { marketRateMultiplier } from '../data/facultyData';
import HelpHint from '../components/HelpHint';
import Figure from '../components/Figure';
import { FIGURE_HINTS } from '../data/figureHints';
import { HOME_DATES_PER_SEASON } from '../systems/athletics/gate';
import { money, moneyShort } from '../format';
import { instructionCapacity } from '../systems/techtree/instructionCapacity';
import { MultiChart } from '../components/MultiChart';
import EstatePanel from './EstatePanel';
import EndowmentPanel from './EndowmentPanel';
import { debtOutstanding, drawRate } from '../systems/finance/treasury';
import { RUNG_AUSTERITY, RUNG_FREEZE, RUNG_NAMES, RUNG_RECEIVERSHIP, distressOf } from '../systems/finance/distress';

// The Treasury: a weekly income statement built from financeBreakdown, the
// same breakdown the tick charges, so the two cannot drift. Figures are per
// week; the annualized footer is just x WEEKS_PER_YEAR.

// Youngest first, the same order the Students tab stacks the classes in
// and the same order reducer.ts advances them.
const CLASS_ORDER: ReadonlyArray<[keyof ClassTuition, string]> = [
  ['freshman', 'Fr'], ['sophomore', 'So'], ['junior', 'Jr'], ['senior', 'Sr'],
];

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
  const coursesDone = countCoursesDone(s);
  const distress = distressOf(s);
  const teaching = instructionDetail(s);
  const marketRate = marketRateMultiplier(s.self.reputation);
  const services = servicesMultiplier(s);
  // Says how the sections are running, so the cost model is readable.
  const sectionsNote = teaching.courses === 0
    ? 'no course is offered yet'
    : teaching.overflow > 0
      ? `every section is full and ${teaching.overflow.toLocaleString()} students are in overflow — the catalogue is smaller than the college`
      : teaching.fill >= 0.85
        ? `sections are running ${Math.round(teaching.fill * 100)}% full`
        : `sections are running ${Math.round(teaching.fill * 100)}% full — the catalogue is bigger than the college`;

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
              note={`${totalEnrolled(s.students).toLocaleString()} enrolled across four classes, each at the price it was admitted under`}
              amount={flow.tuitionRevenue}
            />
            <StatementLine
              label="Prestige dividend"
              note={`donors and grants, scaling with prestige ${Math.round(s.self.reputation)}`}
              amount={flow.prestigeRevenue}
            />
            {flow.annualFund > 0 && (
              <StatementLine
                label="Annual fund"
                note={`what ${(s.alumni?.length ?? 0)} graduated class${(s.alumni?.length ?? 0) === 1 ? '' : 'es'} give, by their warmth and years out`}
                amount={flow.annualFund}
              />
            )}
            <StatementLine
              label="Endowment payout"
              note={`a ${(drawRate(s) * 100).toFixed(1)}% draw on ${money(s.finance.endowment)}`}
              amount={flow.endowmentPayout}
            />
            {(flow.athleticsSurplus > 0 || flow.gateRevenue > 0) && (
              <StatementLine
                label="Athletics surplus"
                note={`${money(flow.gateRevenue)}/wk at the gate over ${HOME_DATES_PER_SEASON} home dates a season, into the department's pot first; this is what was left once every program drew its cost`}
                amount={flow.athleticsSurplus}
              />
            )}
            <div className="statement-total">
              <span>Total income</span>
              <span className="statement-line-amount">{money(flow.totalIncome)}</span>
            </div>
          </div>

          <div className="statement-col">
            <h3>Expenses</h3>
            <StatementLine
              label="Faculty salaries"
              note={`${s.faculty.length} on the roster at ×${marketRate.toFixed(2)} market rate for prestige ${Math.round(s.self.reputation)}; salaries rise with tenure`}
              amount={flow.weeklySalaries}
            />
            <StatementLine
              label="Housing upkeep"
              note={`${s.students.capacity.toLocaleString()} beds — an empty one still costs, at half rate`}
              amount={flow.seatUpkeep}
            />
            <StatementLine
              label="Instruction"
              note={`${teaching.courses.toLocaleString()} courses in ${teaching.sections.toLocaleString()} sections of ${SECTION_SIZE}, at ${money(SECTION_COST)} a section; ${sectionsNote}`}
              amount={flow.instructionCost}
            />
            <StatementLine
              label="Services"
              note={`${totalEnrolled(s.students).toLocaleString()} enrolled × ${money(SERVICES_PER_STUDENT_PER_WEEK)}/wk — advising, registrar, IT, grounds${services > 1 ? ` — ×${services.toFixed(2)} for crowding` : ''}`}
              amount={flow.servicesCost}
            />
            {flow.scaleCost > 0 && (
              <StatementLine
                label="Being large"
                note={`the administration ${totalEnrolled(s.students).toLocaleString()} students need, ${Math.log2(totalEnrolled(s.students) / SCALE_FREE_BELOW).toFixed(1)} doublings past ${SCALE_FREE_BELOW.toLocaleString()} — each doubling costs every student more`}
                amount={flow.scaleCost}
              />
            )}
            <StatementLine
              label="Academic upkeep"
              note={`running ${coursesDone} courses and the teaching buildings they sit in`}
              amount={flow.academicUpkeep}
            />
            <StatementLine
              label="Campus upkeep"
              note="libraries, dining, rec and labs, each carrying its own running cost"
              amount={flow.facilityUpkeep}
            />
            {flow.athleticsSubsidy > 0 && (
              <StatementLine
                label="Athletics subsidy"
                note={`what the programs drew from the ${s.orgs.athleticsBudget} tier's subsidy beyond their own gate — the department's cost to the college`}
                amount={flow.athleticsSubsidy}
              />
            )}
            {flow.administration > 0 && (
              <StatementLine
                label="Administration"
                note={`${s.seats?.length ?? 0} seat${(s.seats?.length ?? 0) === 1 ? '' : 's'}, for good — ${Math.round((flow.administration / (flow.administration + flow.weeklySalaries)) * 100)}% of the payroll`}
                amount={flow.administration}
              />
            )}
            {flow.debtService > 0 && (
              <StatementLine
                label="Loan repayments"
                note={`${s.finance.loans?.length ?? 0} building loan${(s.finance.loans?.length ?? 0) === 1 ? '' : 's'}, ${money(debtOutstanding(s))} still owed`}
                amount={flow.debtService}
              />
            )}
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
          {money(annualNet)} a year at this rate. Money is the only throttle on starting anything: a building or a course is paid for in full, up front, when it starts. Cash pays for most of it; a building can also be paid for by a campaign's building fund, by a loan for the shortfall, or, for a capital project, half from the endowment — so the wait for the next purchase is the pacing. Only an operating deficit can push cash negative. That never ends the run: it walks the college down the board's ladder (tight, deficit, a construction freeze, austerity, and at the bottom an interim CFO), a term at a time, and back up as the books recover.
        </p>
      </section>

      <div className="treasury-columns">
        <AdvancementPanel s={s} act={act} />

        <section className="panel">
          <h2>Balance & Policy</h2>
          <dl>
            <Figure label="Cash" value={money(s.finance.cash)} hint={FIGURE_HINTS.cash} />
            <Figure
              label="The board"
              hint={FIGURE_HINTS.board}
              value={<>
                {RUNG_NAMES[distress.rung]}, confidence {Math.round(distress.confidence)}
                {distress.rung === RUNG_RECEIVERSHIP && <span className="stat"> — the interim CFO sets the draw and the maintenance, {distress.receivershipTermsLeft === 1 ? 'one term' : `${distress.receivershipTermsLeft} terms`} left</span>}
                {distress.rung === RUNG_AUSTERITY && <span className="stat"> — no construction, no maintenance, and tuition may rise but not fall</span>}
                {distress.rung === RUNG_FREEZE && <span className="stat"> — no construction or borrowing until two surplus terms</span>}
              </>}
            />
            <Figure label="Endowment" value={money(s.finance.endowment)} hint={FIGURE_HINTS.endowment} />
            {/* Grants are one-off arrivals, so they show as a running total
                rather than a weekly line (see researchSystem.ts). */}
            <Figure label="Research grants" value={`${money(s.research.grantIncome)} across ${s.research.grants}`} hint={FIGURE_HINTS.grants} />
            <Figure label="Tuition, listed" value={`${money(s.finance.listedTuition)}/yr`} hint={FIGURE_HINTS.listedTuition} />
            {/* Each class on the books pays its own locked price, so after a
                price move up to four prices are collected at once (types.ts's
                tuitionByClass). */}
            <Figure
              label="Charged, by class"
              hint={FIGURE_HINTS.chargedByClass}
              value={CLASS_ORDER.map(([key, label], i) => (
                <span key={key}>
                  {i > 0 && ' · '}
                  {label} {money(s.finance.tuitionByClass[key])}
                </span>
              ))}
            />
          </dl>
        </section>
      </div>
      {totalEnrolled(s.students) > 0 && (() => {
        // The break (Plan 36): what one more student costs a year at each
        // size, at today's prestige, catalogue and price, against what they
        // pay. Where the lines cross, growing stops paying.
        // Up to the most the catalogue can seat: past it the class is held
        // to the room (instructionCapacity.ts), whatever it would cost.
        const now = totalEnrolled(s.students);
        const top = Math.max(now, instructionCapacity(s), 2_000);
        // A thousand short of it: the next thousand are the reading.
        const last = Math.max(1_000, top - 1_000);
        const sizes = Array.from({ length: 21 }, (_, i) => Math.round((last / 20) * i));
        return (
          <section className="panel">
            <h2>The Cost of Being Large</h2>
            <MultiChart
              title="What the next student costs a year, by size"
              xLabel="Students"
              yMin={0}
              series={[
                { name: 'Costs', points: sizes.map((n) => ({ x: n, y: marginalStudentCost(s, 1_000, undefined, n) * WEEKS_PER_YEAR })), format: moneyShort },
                { name: 'Pays', points: sizes.map((n) => ({ x: n, y: s.finance.listedTuition })), format: moneyShort },
              ]}
              note={`At today's prestige, catalogue and listed price. Every doubling past ${SCALE_FREE_BELOW.toLocaleString()} students adds to what each one costs to administer; where the lines cross, the next student costs more than they pay. The college has ${now.toLocaleString()}.`}
            />
          </section>
        );
      })()}
      {s.history.length >= 2 && (
        <section className="panel">
          <h2>Over the Years</h2>
          <MultiChart
            title="The endowment and the year's net"
            series={[
              { name: 'Endowment', points: s.history.filter((h) => h.endowment !== undefined).map((h) => ({ x: h.year, y: h.endowment! })), format: moneyShort },
              { name: 'Net', points: s.history.map((h) => ({ x: h.year, y: h.net })), format: moneyShort },
            ]}
            note="Read each summer. The net is the year's change in cash on hand, so a year that built something big reads low."
          />
        </section>
      )}
      <EndowmentPanel s={s} act={act} />
      <EstatePanel s={s} act={act} />
    </div>
  );
}
