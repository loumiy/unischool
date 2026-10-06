import type { Action } from '../state/actions';
import type { GameState, SpeedUpKind } from '../state/types';
import { SPEED_UP_WORDS } from '../data/speedUpData';
import { picksFor } from '../data/trainingData';
import { landmarksCounted } from '../data/researchParkData';
import { speedUpDone, speedUpPrice, speedUpRefusal, speedUpsFor } from '../systems/prestige/speedUps';
import { money } from '../format';
import ConfirmButton from './ConfirmButton';

// What money buys to fill the specialization's share sooner (Plan 95X, the
// second review's B4-10), on the specialization's own panel: each purchase
// its specialization opens, what it does, and its price. Spent for the year
// or for good, it says so in place of the button; refused, the button is off
// and says why. Nothing before the specialization is chosen, and nothing
// without `act` (a read-only view).
export default function SpeedUpOffers({ s, act }: { s: GameState; act?: (a: Action) => void }) {
  const kinds = speedUpsFor(s);
  if (!act || kinds.length === 0) return null;
  const W = SPEED_UP_WORDS;
  const figure = (kind: SpeedUpKind) => (kind === 'class' ? picksFor(s.faculty.length) : kind === 'wing' ? landmarksCounted(s) : 0);
  return (
    <div className="speed-ups" aria-label={W.head}>
      <p className="speed-ups-head">{W.head}</p>
      {kinds.map((kind) => {
        const price = money(speedUpPrice(s, kind));
        const refusal = speedUpRefusal(s, kind);
        const done = speedUpDone(s, kind);
        return (
          <div className="speed-up" key={kind}>
            <p className="speed-up-text">
              <strong>{W.name[kind]}.</strong> {W.what(kind, figure(kind))} {W.ceiling}
            </p>
            {done ? (
              <span className="speed-up-done">{W.done[kind]}</span>
            ) : (
              <ConfirmButton
                className="btn-speed-up"
                label={W.buy(price)}
                armedLabel={W.armed(price)}
                disabled={refusal !== null}
                title={refusal ?? undefined}
                onConfirm={() => act({ type: 'BUY_SPEED_UP', buy: kind })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
