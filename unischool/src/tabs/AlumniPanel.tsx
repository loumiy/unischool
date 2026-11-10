import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import type { Action } from '../state/actions';
import { firstClassYear, memoryLine } from '../systems/alumni/ledger';
import { annualGiving, canReunite, cutGivingDip, givingOf, reunionCost, warmthOf } from '../systems/alumni/giving';
import { count, moneyShort, pct } from '../format';

// The alumni ledger (Plan 30): every class the college has graduated, the
// line its four years earned and the warmth that line set, newest first.

const SHOWN = 12;

export default function AlumniPanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const classes = [...(s.alumni ?? [])].reverse();
  if (classes.length === 0) return null;
  const graduates = classes.reduce((t, a) => t + a.size, 0);
  // A program cut (Plan 95V) dips the year's giving.
  const dip = cutGivingDip(s);
  return (
    <section className="panel alumni-panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>The alumni</h2>
          <HelpHint text={'Each class leaves with a warmth toward your college, set by its four years: how happy it was, how well it was taught, and whether it lived through a building boom, a new school or a freeze.\n\nThe warmer a class, the more it gives. A reunion every fifth year nudges one class a little. Campaigns and events move them all.'} />
        </span>
        <span className="stat">{count(graduates)} graduates in {classes.length} {classes.length === 1 ? 'class' : 'classes'} · {moneyShort(annualGiving(s))} a year{dip > 0 && <>, {pct(dip)} less since a program was cut</>}</span>
      </div>
      <ul className="alumni-list">
        {classes.slice(0, SHOWN).map((a) => (
          <li key={a.classYear}>
            <span className="alumni-line">{memoryLine(a, firstClassYear(s.alumni, a.classYear))}</span>
            <span className="alumni-figures">
              {canReunite(s, a) && (
                <button type="button" className="panel-action small" onClick={() => act({ type: 'HOLD_REUNION', classYear: a.classYear })}>
                  {s.clock.year - a.classYear}-year reunion · {moneyShort(reunionCost(a))}
                </button>
              )}
              <span className="stat">{count(a.size)} · warmth {Math.round(warmthOf(a))} · {moneyShort(givingOf(a, s.clock.year))}/yr</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
