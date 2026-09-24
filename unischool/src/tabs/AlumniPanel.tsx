import type { GameState } from '../state/types';
import HelpHint from '../components/HelpHint';
import { memoryLine } from '../systems/alumni/ledger';

// The alumni ledger (Plan 30): every class the college has graduated, the
// line its four years earned and the warmth that line set, newest first.

const SHOWN = 12;

export default function AlumniPanel({ s }: { s: GameState }) {
  const classes = [...(s.alumni ?? [])].reverse();
  if (classes.length === 0) return null;
  const graduates = classes.reduce((t, a) => t + a.size, 0);
  return (
    <section className="panel alumni-panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <h2>The Alumni</h2>
          <HelpHint text="Each class is stamped at commencement with what its four years held: how happy it was, how well taught, whether it lived through a building boom, a new school, or a freeze. That sets its warmth for good, and warmth is what the college is given back. A reunion can nudge it a little, never much." />
        </span>
        <span className="stat">{graduates.toLocaleString()} graduates in {classes.length} {classes.length === 1 ? 'class' : 'classes'}</span>
      </div>
      <ul className="alumni-list">
        {classes.slice(0, SHOWN).map((a) => (
          <li key={a.classYear}>
            <span className="alumni-line">{memoryLine(a)}</span>
            <span className="stat">{a.size.toLocaleString()} · warmth {Math.round(a.warmth + a.nudged)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
