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
import { departmentPot } from '../data/studentLifeData';
import { count, decimal, money, moneyShort, multiplier, pct, prestigeFigure } from '../format';
import { instructionCapacity } from '../systems/techtree/instructionCapacity';
import { MultiChart } from '../components/MultiChart';
import EstatePanel from './EstatePanel';
import EndowmentPanel from './EndowmentPanel';
import { debtOutstanding, drawRate } from '../systems/finance/treasury';
import { EXPENSE_LINES, INCOME_LINES, shownLines, type StatementLineSpec } from './treasuryStatement';
import { RUNG_AUSTERITY, RUNG_FREEZE, RUNG_NAMES, RUNG_RECEIVERSHIP, distressOf } from '../systems/finance/distress';
import { beyondNeedNote } from '../systems/estate/beyondNeed';

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
  const scholarshipTeams = departmentPot(s).programs.filter((p) => p.band === 'flagship' && p.team.scholarships !== 'none').length;
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
      ? `every section is full and ${count(teaching.overflow)} students are in overflow — the catalog is smaller than the college`
      : teaching.fill >= 0.85
        ? `sections are running ${pct(teaching.fill)} full`
        : `sections are running ${pct(teaching.fill)} full — the catalog is bigger than the college`;

  // What drives each line's figure, so the statement teaches the economy
  // rather than just reporting it. Which lines show is treasuryStatement.ts's.
  const notes: Record<StatementLineSpec['key'], string> = {
    tuitionRevenue: `${count(totalEnrolled(s.students))} enrolled across four classes, each at the price it was admitted under`,
    prestigeRevenue: `donors and grants, scaling with prestige ${prestigeFigure(s.self.reputation)}`,
    annualFund: `what ${(s.alumni?.length ?? 0)} graduated class${(s.alumni?.length ?? 0) === 1 ? '' : 'es'} give, by their warmth and years out`,
    endowmentPayout: `a ${pct(drawRate(s), 1)} draw on ${money(s.finance.endowment)}`,
    athleticsSurplus: `${money(flow.gateRevenue)}/wk at the gate over ${HOME_DATES_PER_SEASON} home dates a season, into the department's fund first; this is what was left once every program took its cost`,
    weeklySalaries: `${s.faculty.length} on the roster at ${multiplier(marketRate)} market rate for prestige ${prestigeFigure(s.self.reputation)}; salaries rise with tenure`,
    seatUpkeep: `${count(s.students.capacity)} beds — an empty one still costs, at half rate`,
    instructionCost: `${count(teaching.courses)} courses in ${count(teaching.sections)} sections of ${SECTION_SIZE}, at ${money(SECTION_COST)} a section; ${sectionsNote}`,
    servicesCost: `${count(totalEnrolled(s.students))} enrolled × ${money(SERVICES_PER_STUDENT_PER_WEEK)}/wk — advising, registrar, IT, grounds${services > 1 ? ` — ${multiplier(services)} for crowding` : ''}`,
    scaleCost: `the administration ${count(totalEnrolled(s.students))} students need, ${decimal(Math.log2(totalEnrolled(s.students) / SCALE_FREE_BELOW), 1)} doublings past ${count(SCALE_FREE_BELOW)} — each doubling costs every student more`,
    academicUpkeep: `running ${coursesDone} courses and the teaching buildings they sit in`,
    facilityUpkeep: 'libraries, dining, rec and labs, each carrying its own running cost',
    beyondNeedUpkeep: beyondNeedNote(s),
    studentLifeUpkeep: `${s.orgs.clubs.length} clubs, ${s.orgs.chapters.length} chapters and ${s.orgs.teams.length} varsity programs with their coaches and Athletic Director, at the ${s.orgs.athleticsBudget} subsidy level`,
    athleticsSubsidy: `what the programs took from the ${s.orgs.athleticsBudget} subsidy beyond their own gate — the department's cost to the college`,
    athleticScholarships: `the scholarship budgets of ${scholarshipTeams} flagship${scholarshipTeams === 1 ? '' : 's'}, set on the Athletics tab: what their recruiting costs`,
    administration: `${s.seats?.length ?? 0} seat${(s.seats?.length ?? 0) === 1 ? '' : 's'}, for good — ${pct(flow.administration / (flow.administration + flow.weeklySalaries))} of the payroll`,
    debtService: `${s.finance.loans?.length ?? 0} building loan${(s.finance.loans?.length ?? 0) === 1 ? '' : 's'}, ${money(debtOutstanding(s))} still owed`,
  };

  return (
    <div className="tab-content">
      <section className="panel">
        <div className="panel-head">
          <h2>Weekly income statement</h2>
          <HelpHint align="end" text="Every figure here is per week, and is exactly what the college pays or collects each week. Tuition is set once a year, at the summer admissions decision." />
        </div>

        <div className="income-statement">
          <div className="statement-col">
            <h3>Income</h3>
            {shownLines(INCOME_LINES, flow).map((l) => (
              <StatementLine key={l.key} label={l.label} note={notes[l.key]} amount={flow[l.key]} />
            ))}
            <div className="statement-total">
              <span>Total income</span>
              <span className="statement-line-amount">{money(flow.totalIncome)}</span>
            </div>
          </div>

          <div className="statement-col">
            <h3>Expenses</h3>
            {shownLines(EXPENSE_LINES, flow).map((l) => (
              <StatementLine key={l.key} label={l.label} note={notes[l.key]} amount={flow[l.key]} />
            ))}
            <div className="statement-total">
              <span>Total expenses</span>
              <span className="statement-line-amount">{money(flow.totalExpenses)}</span>
            </div>
          </div>
        </div>

        <div className="statement-net">
          <span>Net weekly{flow.net < 0 && <span className="state-chip bad">Deficit</span>}</span>
          <span className="statement-line-amount">{money(flow.net)}</span>
        </div>
        <p className="empty-note">
          {money(annualNet)} a year at this rate. Nothing starts until it is paid for: a building or a course is paid for in full, up front, when it starts. Cash pays for most of it; a building can also be paid for by a campaign's building fund, by a loan for the shortfall, or, for a capital project, half from the endowment — so cash sets how fast the college grows. An operating deficit, or a matter left unanswered, can push cash negative. A deficit never closes the college: it walks the college down the board's scale (tight, deficit, a construction freeze, austerity and, at the bottom, an interim CFO), a term at a time, and back up as the books recover.
        </p>
      </section>

      <div className="treasury-columns">
        <AdvancementPanel s={s} act={act} />

        <section className="panel">
          <h2>Balance</h2>
          <dl>
            <Figure label="Cash" value={money(s.finance.cash)} hint={FIGURE_HINTS.cash} />
            <Figure
              label="The board"
              hint={FIGURE_HINTS.board}
              value={<>
                {RUNG_NAMES[distress.rung]}
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
        // size, at today's prestige, catalog and price, against what they
        // pay. Where the lines cross, growing stops paying.
        // Up to the most the catalog can seat: past it the class is held
        // to the room (instructionCapacity.ts), whatever it would cost.
        const now = totalEnrolled(s.students);
        const top = Math.max(now, instructionCapacity(s), 2_000);
        // A thousand short of it: the next thousand are the reading.
        const last = Math.max(1_000, top - 1_000);
        const sizes = Array.from({ length: 21 }, (_, i) => Math.round((last / 20) * i));
        return (
          <section className="panel">
            <h2>The cost of being large</h2>
            <MultiChart
              title="What the next student costs a year, by size"
              xLabel="Students"
              yMin={0}
              series={[
                { name: 'Costs', points: sizes.map((n) => ({ x: n, y: marginalStudentCost(s, 1_000, undefined, n) * WEEKS_PER_YEAR })), format: moneyShort },
                { name: 'Pays', points: sizes.map((n) => ({ x: n, y: s.finance.listedTuition })), format: moneyShort },
              ]}
              note={`At today's prestige, catalog and listed price. Every doubling past ${count(SCALE_FREE_BELOW)} students adds to what each one costs to administer; where the lines cross, the next student costs more than they pay. The college has ${count(now)}.`}
            />
          </section>
        );
      })()}
      {s.history.length >= 2 && (
        <section className="panel">
          <h2>Over the years</h2>
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
