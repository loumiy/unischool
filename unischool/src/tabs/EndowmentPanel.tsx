import type { GameState } from '../state/types';
import ConfirmButton from '../components/ConfirmButton';
import type { Action } from '../state/actions';
import HelpHint from '../components/HelpHint';
import { money, moneyShort } from '../format';
import {
  BORROWING_SHARE, DRAW_RATE_MAX, DRAW_RATE_MIN, DRAW_RATE_STEP, LOAN_RATE, LOAN_YEARS,
  borrowingRoom, debtOutstanding, debtService, drawRate, transferOffers,
} from '../systems/finance/treasury';
import { ENDOWMENT_ANNUAL_RETURN as ENDOWMENT_RETURN } from '../systems/finance/financeSystem';
import { DRAW_RATE_PRUDENT, boardHoldsBudget } from '../systems/finance/distress';

// The endowment's two levers (systems/finance/treasury.ts): the draw rate,
// and cash moved into it by hand.

function rate(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export default function EndowmentPanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const draw = drawRate(s);
  const setDraw = (value: number) => act({ type: 'SET_DRAW_RATE', rate: value });
  const offers = transferOffers(s);
  const growth = ENDOWMENT_RETURN - draw;
  const held = boardHoldsBudget(s);
  return (
    <section className="panel endowment-panel">
      <div className="panel-head">
        <h2>The endowment</h2>
        <HelpHint align="end" text={`The endowment earns about ${rate(ENDOWMENT_RETURN)} a year and pays its draw into income every week. Draw less and it grows faster; draw more and income rises now at the cost of later. Above ${rate(DRAW_RATE_PRUDENT)} the board starts to worry. Cash moved in stays in: it pays out only at the draw rate. A building the cash cannot cover can be borrowed for, against up to ${BORROWING_SHARE * 100}% of the endowment, repaid weekly over ${LOAN_YEARS} years at ${LOAN_RATE * 100}%.`} />
      </div>
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
          {draw > DRAW_RATE_PRUDENT && <span className="stat"> — more than the board thinks prudent</span>}
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
              armedLabel={`Confirm — move ${moneyShort(amount)}`}
              warning="The endowment is one way: it pays out its draw, but the principal does not come back to cash."
              onConfirm={() => act({ type: 'MOVE_TO_ENDOWMENT', amount })}
            />
          ))}
      </div>
    </section>
  );
}
