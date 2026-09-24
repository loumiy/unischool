import type { GameState } from '../state/types';
import { LADDER_TIERS, MILESTONES, type Milestone } from '../data/ladderData';
import { milestoneReached } from '../systems/ladder/ladderSystem';

function progressLine(s: GameState, m: Milestone): string {
  if (!m.progress) return m.condition;
  const p = m.progress(s);
  const value = p.unit === 'prestige' ? p.value.toFixed(0) : Math.floor(p.value).toLocaleString();
  return `${value} of ${p.target.toLocaleString()} ${p.unit}`;
}

// The ladder: every milestone by tier, reached (with its year) or ahead
// (with its progress), and what each opens.
export default function LadderPanel({ s }: { s: GameState }) {
  return (
    <div className="ladder">
      {LADDER_TIERS.map((tier) => (
        <section key={tier} className="ladder-tier">
          <h3>{tier}</h3>
          <ul>
            {MILESTONES.filter((m) => m.tier === tier).map((m) => {
              const reached = milestoneReached(s, m.id);
              return (
                <li key={m.id} className={`ladder-rung ${reached ? 'reached' : 'ahead'}${m.side ? ' side' : ''}`}>
                  <div className="ladder-rung-head">
                    <span className="ladder-rung-mark" aria-hidden="true">{reached ? '✓' : '○'}</span>
                    <span className="ladder-rung-name">{m.name}</span>
                    <span className="ladder-rung-state">
                      {reached ? `Year ${s.ladder.reached[m.id]}` : progressLine(s, m)}
                    </span>
                  </div>
                  <p className="ladder-rung-opens">{m.opens.join(' · ')}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
