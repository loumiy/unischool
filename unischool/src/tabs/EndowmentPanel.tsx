import type { GameState } from '../state/types';
import ConfirmButton from '../components/ConfirmButton';
import type { Action } from '../state/actions';
import HelpHint from '../components/HelpHint';
import { money, moneyShort, pct, weeksShort } from '../format';
import {
  BORROWING_SHARE, DRAW_RATE_MAX, DRAW_RATE_MIN, DRAW_RATE_STEP, LOAN_RATE, LOAN_YEARS,
  borrowingRoom, debtOutstanding, debtService, drawRate, transferOffers,
} from '../systems/finance/treasury';
import { ENDOWMENT_ANNUAL_RETURN as ENDOWMENT_RETURN } from '../systems/finance/financeSystem';
import { DRAW_RATE_PRUDENT, boardHoldsBudget } from '../systems/finance/distress';
import { SWEEP_STEPS, fullMarkEndowment, sweepWeeksOf } from '../systems/finance/sweep';
import { FINANCIAL_FULL_PER_STUDENT } from '../systems/rivals/rivalsSystem';

// The endowment's levers (systems/finance/treasury.ts): the draw rate, cash
// moved into it by hand, and the standing sweep of idle cash (sweep.ts,
// Plan 70D).

// A rate of money (the return, the draw, a loan's interest) is read to one
// decimal, wherever it appears.
function rate(v: number): string {
  return pct(v, 1);
}

export default function EndowmentPanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const draw = drawRate(s);
  const setDraw = (value: number) => act({ type: 'SET_DRAW_RATE', rate: value });
  const offers = transferOffers(s);
  const growth = ENDOWMENT_RETURN - draw;
  const held = boardHoldsBudget(s);
  const sweep = sweepWeeksOf(s);
  return (
    <section className="panel endowment-panel">
      <div className="panel-head">
        <h2>The endowment</h2>
        <HelpHint align="end" text={`The endowment earns about ${rate(ENDOWMENT_RETURN)} a year and pays its draw into your income every week. Draw less and it grows faster. Draw more and you get more income now, but less later. Above ${rate(DRAW_RATE_PRUDENT)}, the draw takes most of the return. Then the fund grows little or shrinks, and next year's draw shrinks with it. Cash you move in stays in. It pays out only at the draw rate, or to cover half a capital project. If you can't pay for a building in cash, you can borrow for it. You can borrow up to ${pct(BORROWING_SHARE)} of the endowment, repaid weekly over ${LOAN_YEARS} years at ${rate(LOAN_RATE)}.`} />
      </div>
      {/* What the fund is, in a sentence (Plan 118G, F10: "parts of
          endowment could be confusing"). */}
      <p className="budget-line-note">Money the college keeps invested. Each week it pays part of what it earns into your income, and it can pay half of a capital project.</p>
      <div className="treasury-dial">
        <span>Draw rate</span>
        <button type="button" className="panel-action small" aria-label="Draw less" disabled={held || draw <= DRAW_RATE_MIN} onClick={() => setDraw(draw - DRAW_RATE_STEP)}>−</button>
        <strong>{rate(draw)}</strong>
        <button type="button" className="panel-action small" aria-label="Draw more" disabled={held || draw >= DRAW_RATE_MAX} onClick={() => setDraw(draw + DRAW_RATE_STEP)}>+</button>
      </div>
      <dl>
        <dt>Endowment</dt><dd>{money(s.finance.endowment)}</dd>
        <dt>Pays out</dt><dd>{money(s.finance.endowment * draw)}/yr</dd>
        <dt>Borrowed</dt>
        <dd>
          {debtOutstanding(s) > 0 ? `${money(debtOutstanding(s))}, ${money(debtService(s))}/wk` : 'nothing'}
          <span className="stat"> — room for {money(borrowingRoom(s))} more</span>
        </dd>
        <dt>Grows</dt>
        <dd>
          {growth >= 0 ? `${rate(growth)} a year, before gifts` : `shrinks ${rate(-growth)} a year`}
        </dd>
      </dl>
      <div className="treasury-transfer">
        <span>Move cash in</span>
        {offers.length === 0
          ? <span className="stat">not with {money(s.finance.cash)} on hand</span>
          : offers.map((amount) => (
            <ConfirmButton
              key={amount}
              className="panel-action small"
              label={moneyShort(amount)}
              armedLabel={`Move ${moneyShort(amount)} to the endowment for good`}
              tone="commit"
              warning="Permanent."
              onConfirm={() => act({ type: 'MOVE_TO_ENDOWMENT', amount })}
            />
          ))}
      </div>
      <div className="treasury-transfer treasury-sweep" role="group" aria-label="Standing sweep">
        <span>Standing sweep</span>
        {[null, ...SWEEP_STEPS].map((weeks) => (
          <button
            key={weeks ?? 'off'}
            type="button"
            className={`panel-action small${sweep === weeks ? ' active' : ''}`}
            aria-pressed={sweep === weeks}
            title={weeks === null ? 'Leave cash where it is.' : `Each quarter, keep ${weeks} weeks of expenses in cash and move the rest into the endowment. It stops once the endowment reaches full marks.`}
            onClick={() => act({ type: 'SET_SWEEP', weeks })}
          >
            {weeks === null ? 'Off' : `Keep ${weeksShort(weeks)}`}
          </button>
        ))}
        <HelpHint align="end" text={`Cash earns nothing, and the guide ignores it when it rates your finances. It looks at your endowment per student instead. Full marks take ${money(FINANCIAL_FULL_PER_STUDENT)} a student, which is ${money(fullMarkEndowment(s))} for you today. A standing sweep moves the cash above your reserve into the endowment at the end of each quarter. It stops once the endowment reaches that figure.`} />
      </div>
    </section>
  );
}
