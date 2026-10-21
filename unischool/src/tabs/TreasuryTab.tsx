import { useState } from 'react';
import AdvancementPanel from './AdvancementPanel';
import type { ClassTuition, GameState } from '../state/types';
import { WEEKS_PER_YEAR, coursesDone as countCoursesDone, standsOnCampus, totalEnrolled } from '../state/types';
import type { Action } from '../state/actions';
import {
  ENDOWMENT_ANNUAL_RETURN, financeBreakdown, instructionDetail, SECTION_SIZE, SECTION_COST,
  SCALE_FREE_BELOW, SERVICES_PER_STUDENT_PER_WEEK, marginalStudentCost, servicesMultiplier,
} from '../systems/finance/financeSystem';
import { marketRateMultiplier } from '../data/facultyData';
import HelpHint from '../components/HelpHint';
import Figure from '../components/Figure';
import { FIGURE_HINTS } from '../data/figureHints';
import { departmentPot } from '../data/studentLifeData';
import { count, decimal, money, moneyShort, multiplier, pct, prestigeFigure, weeksProse } from '../format';
import { instructionCapacity } from '../systems/techtree/instructionCapacity';
import { MultiChart } from '../components/MultiChart';
import { switchStyle } from '../components/segmentedSwitch';
import EstatePanel from './EstatePanel';
import EndowmentPanel from './EndowmentPanel';
import TreasuryCashChart from './TreasuryCashChart';
import { DRAW_RATE_MAX, DRAW_RATE_MIN, DRAW_RATE_STEP, debtOutstanding, drawRate } from '../systems/finance/treasury';
import { EXPENSE_LINES, INCOME_LINES, shownLines, type StatementLineSpec } from './treasuryStatement';
import {
  DRAW_RATE_PRUDENT, RUNG_AUSTERITY, RUNG_DEFICIT, RUNG_FREEZE, RUNG_NAMES, RUNG_RECEIVERSHIP, RUNG_SOUND, RUNG_TIGHT,
  boardHoldsBudget, distressOf,
} from '../systems/finance/distress';
import { MAINTENANCE_FUNDING_STEP, backlogInAYear, maintenanceFunding } from '../systems/estate/estate';
import { isPlaceableKind } from '../state/campusMap';
import { beyondNeedNote } from '../systems/estate/beyondNeed';
import { officesNote } from '../systems/administration/offices';
import { aidPerStudent, chairHolder, chairPays, fundIncome, fundsOf } from '../systems/alumni/funds';

// The Treasury, in three views. The operating budget is one board: the
// year's revenue and expenses down the left, built from financeBreakdown
// (the same breakdown the tick charges, so the two cannot drift) and read
// as a year at this week's rates; cash, the year's net and the board's
// ladder in the middle over cash across the years; and on the right the
// levers that move next year, with what they come to. The endowment and the
// estate each have a view of their own.

type View = 'budget' | 'endowment' | 'estate';
const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: 'budget', label: 'Operating budget' },
  { id: 'endowment', label: 'Endowment' },
  { id: 'estate', label: 'Buildings & grounds' },
];

// Youngest first, the same order the Students tab stacks the classes in
// and the same order reducer.ts advances them.
const CLASS_ORDER: ReadonlyArray<[keyof ClassTuition, string]> = [
  ['freshman', 'Fr'], ['sophomore', 'So'], ['junior', 'Jr'], ['senior', 'Sr'],
];

// A rate of money (the draw, the return) is read to one decimal, wherever
// it appears.
function rate(v: number): string {
  return pct(v, 1);
}

// One line of the budget, a year of it, with a bar against the column's
// largest line. Opened, it says what drives the figure, so the budget
// teaches the economy rather than just reporting it.
function BudgetLine({ label, note, amount, largest }: { label: string; note: string; amount: number; largest: number }) {
  return (
    <details className="budget-line">
      <summary>
        <span className="budget-line-label">{label}</span>
        <span className="budget-line-amount">{moneyShort(amount)}</span>
        <span className="budget-line-bar" aria-hidden="true">
          <span style={{ width: `${largest > 0 ? Math.max(1, (amount / largest) * 100) : 0}%` }} />
        </span>
      </summary>
      <p className="budget-line-note">{note}</p>
    </details>
  );
}

// What the rung the college stands on means, and what moves it
// (finance/distress.ts).
function rungNote(s: GameState): string {
  const d = distressOf(s);
  switch (d.rung) {
    case RUNG_SOUND: return 'The books are sound. Cash under a term\'s expenses would make them Tight.';
    case RUNG_TIGHT: return 'Cash is under a term\'s expenses. Two deficit terms in a row put the college on Deficit.';
    case RUNG_DEFICIT: return 'Two deficit terms in a row. If cash reaches zero, construction and borrowing freeze.';
    case RUNG_FREEZE: return 'No construction or borrowing until two surplus terms. Three terms frozen bring austerity.';
    case RUNG_AUSTERITY: return 'No construction, no maintenance, and tuition may rise but not fall. Three terms of austerity bring an interim CFO.';
    default: return `The interim CFO sets the draw and the maintenance, ${d.receivershipTermsLeft === 1 ? 'one term' : `${d.receivershipTermsLeft} terms`} left.`;
  }
}

export default function TreasuryTab({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [view, setView] = useState<View>('budget');
  const weeksToSummer = WEEKS_PER_YEAR - s.clock.week;
  return (
    <div className="tab-content treasury">
      <div className="treasury-bar">
        <p className="dateline">
          Year {s.clock.year} · {weeksToSummer === 0 ? 'Summer admissions this week' : `Summer admissions in ${weeksProse(weeksToSummer)}`}
        </p>
        <span className="segmented switch" style={switchStyle(VIEWS.length, VIEWS.findIndex((v) => v.id === view))}>
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={view === v.id ? 'on' : undefined} aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </span>
      </div>
      {view === 'budget' && <BudgetView s={s} act={act} />}
      {view === 'endowment' && <EndowmentView s={s} act={act} />}
      {view === 'estate' && <EstatePanel s={s} act={act} />}
    </div>
  );
}

function BudgetView({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const flow = financeBreakdown(s);
  const year = (weekly: number) => weekly * WEEKS_PER_YEAR;
  const scholarshipTeams = departmentPot(s).programs.filter((p) => p.band === 'flagship' && p.team.scholarships !== 'none').length;
  const annualNet = year(flow.net);
  const coursesDone = countCoursesDone(s);
  const distress = distressOf(s);
  const held = boardHoldsBudget(s);
  const teaching = instructionDetail(s);
  const marketRate = marketRateMultiplier(s.self.reputation);
  const services = servicesMultiplier(s);
  // Says how the sections are running, so the cost model is readable.
  const sectionsNote = teaching.courses === 0
    ? 'no course is offered yet'
    : teaching.overflow > 0
      ? `every section is full and ${count(teaching.overflow)} students are in overflow`
      : `sections are running ${pct(teaching.fill)} full`;

  // What drives each line's figure. Which lines show is treasuryStatement.ts's.
  const notes: Record<StatementLineSpec['key'], string> = {
    tuitionRevenue: `${count(totalEnrolled(s.students))} enrolled across four classes, each at the price it was admitted under`,
    prestigeRevenue: `donors and grants, scaling with prestige ${prestigeFigure(s.self.reputation)}`,
    annualFund: `what ${(s.alumni?.length ?? 0)} graduated class${(s.alumni?.length ?? 0) === 1 ? '' : 'es'} give, by their warmth and years out`,
    endowmentPayout: `a ${rate(drawRate(s))} draw on ${money(s.finance.endowment)}`,
    athleticsSurplus: `${money(flow.gateRevenue)}/wk at the gate`,
    weeklySalaries: `${s.faculty.length} on the roster at ${multiplier(marketRate)} market rate for prestige ${prestigeFigure(s.self.reputation)}; salaries rise with tenure`,
    seatUpkeep: `${count(s.students.capacity)} beds`,
    instructionCost: `${count(teaching.courses)} courses in ${count(teaching.sections)} sections of ${SECTION_SIZE}, at ${money(SECTION_COST)} a section a week; ${sectionsNote}`,
    servicesCost: `${count(totalEnrolled(s.students))} enrolled × ${money(SERVICES_PER_STUDENT_PER_WEEK)}/wk — advising, registrar, IT, grounds${services > 1 ? ` — ${multiplier(services)} with the classrooms full` : ''}`,
    scaleCost: `the administration ${count(totalEnrolled(s.students))} students need, ${decimal(Math.log2(totalEnrolled(s.students) / SCALE_FREE_BELOW), 1)} doublings past ${count(SCALE_FREE_BELOW)}`,
    academicUpkeep: `running ${coursesDone} courses and the teaching buildings they sit in`,
    facilityUpkeep: 'libraries, dining, rec and labs',
    beyondNeedUpkeep: beyondNeedNote(s),
    studentLifeUpkeep: `${s.orgs.clubs.length} clubs, ${s.orgs.chapters.length} chapters and ${s.orgs.teams.length} varsity programs with their coaches and Athletic Director, at the ${s.orgs.athleticsBudget} subsidy level`,
    athleticsSubsidy: `what the programs took from the ${s.orgs.athleticsBudget} subsidy beyond their own gate`,
    athleticScholarships: `the scholarship budgets of ${scholarshipTeams} flagship${scholarshipTeams === 1 ? '' : 's'}`,
    scholarshipAid: `the scholarship funds' share of the payout, ${money(aidPerStudent(s))} a student off the price`,
    administration: `${s.seats?.length ?? 0} seat${(s.seats?.length ?? 0) === 1 ? '' : 's'} · ${pct(flow.administration / (flow.administration + flow.weeklySalaries))} of payroll`,
    offices: officesNote(s),
    debtService: `${s.finance.loans?.length ?? 0} building loan${(s.finance.loans?.length ?? 0) === 1 ? '' : 's'}, ${money(debtOutstanding(s))} still owed`,
  };
  const income = shownLines(INCOME_LINES, flow);
  const expenses = shownLines(EXPENSE_LINES, flow);
  const largestOf = (lines: StatementLineSpec[]) => Math.max(0, ...lines.map((l) => flow[l.key]));

  // The levers. The draw and the maintenance move at once; the board holds
  // both under austerity and receivership.
  const draw = drawRate(s);
  const funding = maintenanceFunding(s);
  const backlogNow = s.tech
    .filter((t) => isPlaceableKind(t) && standsOnCampus(t))
    .reduce((sum, t) => sum + (t.backlog ?? 0), 0);
  const backlogNext = backlogInAYear(s);

  return (
    <>
      <section className="treasury-board">
        <div className="treasury-ledger">
          <h3 className="eyebrow income">Revenue · {moneyShort(year(flow.totalIncome))}</h3>
          {income.map((l) => (
            <BudgetLine key={l.key} label={l.label} note={notes[l.key]} amount={year(flow[l.key])} largest={year(largestOf(income))} />
          ))}
          {/* Grants are one-off arrivals, so they stand outside the year's
              rates (see researchSystem.ts). */}
          {s.research.grants > 0 && (
            <p className="budget-line-note">
              Research grants arrive one at a time: {money(s.research.grantIncome)} from {count(s.research.grants)} so far.
            </p>
          )}
          <h3 className="eyebrow expense">Expenses · {moneyShort(year(flow.totalExpenses))}</h3>
          {expenses.map((l) => (
            <BudgetLine key={l.key} label={l.label} note={notes[l.key]} amount={year(flow[l.key])} largest={year(largestOf(expenses))} />
          ))}
          <p className="budget-line-note">A year at this week&apos;s rates. Open a line to see what drives it.</p>
        </div>

        <div className="treasury-center">
          <div className="treasury-kpis">
            <div className="treasury-kpi">
              <span className="eyebrow">Cash on hand <HelpHint text={FIGURE_HINTS.cash} /></span>
              <strong className={s.finance.cash < 0 ? 'bad' : undefined}>{moneyShort(s.finance.cash)}</strong>
            </div>
            <div className="treasury-kpi">
              <span className="eyebrow">Operating {annualNet < 0 ? 'deficit' : 'surplus'}</span>
              <strong className={annualNet < 0 ? 'bad' : 'good'}>{annualNet > 0 ? '+' : ''}{moneyShort(annualNet)}</strong>
              <span className="stat">{money(flow.net)} a week</span>
            </div>
            <div className="treasury-kpi">
              <span className="eyebrow">The board <HelpHint align="end" text={`${FIGURE_HINTS.board} ${rungNote(s)}`} /></span>
              <strong className={distress.rung >= RUNG_DEFICIT ? 'bad' : undefined}>{RUNG_NAMES[distress.rung]}</strong>
              <span className="stat">rung {distress.rung} of {RUNG_RECEIVERSHIP}</span>
            </div>
          </div>
          <h3 className="eyebrow">Cash, Year {s.history[0]?.year ?? 1} to now</h3>
          <TreasuryCashChart s={s} />
          <p className="empty-note">
            A building or a course is paid for in full when it starts, so cash sets how fast the college grows.
            <HelpHint align="end" text="A building can also be paid from a campaign's building fund, by a loan for the shortfall, or, for a capital project, half from the endowment. A deficit never closes the college: it walks down the board's scale (tight, deficit, a construction freeze, austerity, an interim CFO) a term at a time, and back up as the books recover." />
          </p>
        </div>

        <aside className="treasury-levers" aria-label="Levers">
          <h3 className="eyebrow">Levers for next year</h3>
          <div className="lever">
            <div className="lever-head">
              <span>Listed tuition</span>
              <strong>{money(s.finance.listedTuition)}</strong>
            </div>
            <p className="lever-note">
              Set at the summer admissions decision. Each class pays the price it was admitted under:{' '}
              {CLASS_ORDER.map(([key, label], i) => (
                <span key={key}>{i > 0 && ' · '}{label} {moneyShort(s.finance.tuitionByClass[key])}</span>
              ))}.
            </p>
          </div>
          <div className="lever">
            <label className="lever-head" htmlFor="lever-draw">
              <span>Endowment draw</span>
              <strong>{rate(draw)}</strong>
            </label>
            <input
              id="lever-draw" type="range" min={DRAW_RATE_MIN} max={DRAW_RATE_MAX} step={DRAW_RATE_STEP} value={draw}
              disabled={held} onChange={(e) => act({ type: 'SET_DRAW_RATE', rate: Number(e.target.value) })}
            />
            <p className="lever-note">
              Pays {moneyShort(s.finance.endowment * draw)} a year into income.{' '}
              {draw > DRAW_RATE_PRUDENT
                ? `Above ${rate(DRAW_RATE_PRUDENT)} it takes most of the ${rate(ENDOWMENT_ANNUAL_RETURN)} return, and next year's draw shrinks with the fund.`
                : `The fund keeps ${rate(ENDOWMENT_ANNUAL_RETURN - draw)} of its return a year to grow.`}
            </p>
          </div>
          <div className="lever">
            <label className="lever-head" htmlFor="lever-maintenance">
              <span>Maintenance funding</span>
              <strong>{pct(funding)} of need</strong>
            </label>
            <input
              id="lever-maintenance" type="range" min={0} max={1} step={MAINTENANCE_FUNDING_STEP} value={funding}
              disabled={held} onChange={(e) => act({ type: 'SET_MAINTENANCE_FUNDING', level: Number(e.target.value) })}
            />
            <p className="lever-note">
              {funding >= 1
                ? 'Every building\'s upkeep is paid, and any backlog is paid down.'
                : 'The unpaid upkeep becomes backlog, which compounds and wears the buildings down.'}
            </p>
          </div>
          {held && <p className="lever-note">The board holds the draw and the maintenance until the books recover.</p>}
          <div className="treasury-projection">
            <span className="stat">A year from now, at these rates</span>
            <strong className={annualNet < 0 ? 'bad' : 'good'}>
              {annualNet > 0 ? '+' : ''}{moneyShort(annualNet)} {annualNet < 0 ? 'deficit' : 'surplus'}
            </strong>
            <span className="stat">
              {backlogNext > backlogNow + 1
                ? `Backlog grows to ${moneyShort(backlogNext)}.`
                : backlogNow > 0 ? `Backlog falls to ${moneyShort(backlogNext)}.` : 'No backlog.'}
            </span>
          </div>
        </aside>
      </section>

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
    </>
  );
}

function EndowmentView({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const funds = fundsOf(s);
  return (
    <>
      <div className="treasury-columns">
        <EndowmentPanel s={s} act={act} />
        <AdvancementPanel s={s} act={act} />
      </div>
      {/* The named funds (Plan 101F): each with its principal and what it
          paid its purpose this year. */}
      {funds.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Named funds</h2>
            <HelpHint align="end" text="Gifts given for a purpose. Each is part of the endowment, and its share of the draw goes to its purpose: aid for a scholarship, its holder's salary for a chair." />
          </div>
          <dl>
            {funds.map((f) => (
              <Figure
                key={f.id}
                label={`${f.name}, ${money(f.principal)}`}
                hint={f.purpose === 'scholarship'
                  ? 'A scholarship fund: its share of the draw comes off students\' prices as aid.'
                  : 'A named chair: its share of the draw pays its holder\'s salary.'}
                value={f.purpose === 'scholarship'
                  ? `${money(fundIncome(s, f))}/yr in aid`
                  : `${money(chairPays(s, f))}/yr of ${chairHolder(s, f)?.name ?? 'its holder'}'s salary`}
              />
            ))}
          </dl>
        </section>
      )}
      {s.history.length >= 2 && (
        <section className="panel">
          <h2>Over the years</h2>
          <MultiChart
            title="The endowment and the year's net"
            series={[
              { name: 'Endowment', points: s.history.filter((h) => h.endowment !== undefined).map((h) => ({ x: h.year, y: h.endowment! })), format: moneyShort },
              { name: 'Net', points: s.history.map((h) => ({ x: h.year, y: h.net })), format: moneyShort },
            ]}
            note="Read each summer."
          />
        </section>
      )}
    </>
  );
}
