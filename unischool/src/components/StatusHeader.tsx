import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { weeklyNet } from '../systems/finance/financeSystem';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { SPEEDS, SANDBOX_SPEEDS, type Speed } from '../engine/useGame';

const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', fast: 'Fast (sandbox)' };

function termName(week: number): string {
  return week <= WEEKS_PER_YEAR / 2 ? 'Fall Term' : 'Spring Term';
}

// The persistent header/status bar: the handful of state values that stay
// meaningful no matter which tab is open (clock, cash, prestige, current
// rank) plus the speed/auto-develop controls, all visible across every tab
// rather than scoped to one. Standing among peers is otherwise a mid-game
// reveal (see README's "Rankings") — the rank stat stays a dash until
// s.hasEnteredRankings fires, so this header doesn't spoil that.
export default function StatusHeader({ s, speed, setSpeed, act }: {
  s: GameState;
  speed: Speed;
  setSpeed: (speed: Speed) => void;
  act: (a: Action) => void;
}) {
  const netWeekly = weeklyNet(s);
  const rank = s.hasEnteredRankings ? playerRank(s) : null;

  return (
    <>
      <header className="masthead">
        <div className="masthead-id">
          <div className="eyebrow">Office of the President</div>
          <h1>{s.self.name}</h1>
        </div>
        <div className="masthead-stats">
          <div className="stat-block">
            <div className="stat-label">Academic Year</div>
            <div className="stat-value">Year {s.clock.year}</div>
            <div className="stat-sub">{termName(s.clock.week)} · Week {s.clock.week}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Operating Funds</div>
            <div className={`stat-value ${s.finance.cash < 0 ? 'money-negative' : 'money'}`}>${Math.round(s.finance.cash).toLocaleString()}</div>
            <div className="stat-sub">{netWeekly >= 0 ? '+' : '-'}${Math.round(Math.abs(netWeekly)).toLocaleString()}/wk</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Prestige</div>
            <div className="stat-value gold">{Math.round(s.self.reputation)}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">National Rank</div>
            <div className="stat-value">{rank ? `#${rank}` : '—'}</div>
            <div className="stat-sub">{rank ? `of ${s.rivals.length + 1}` : 'Unranked'}</div>
          </div>
        </div>
      </header>

      <div className="controlbar">
        <div className="speeds">
          {(Object.keys(SPEEDS) as Speed[]).map((sp) => (
            <button
              key={sp}
              className={[
                speed === sp ? 'active' : '',
                SANDBOX_SPEEDS.includes(sp) ? 'sandbox' : '',
              ].join(' ').trim()}
              onClick={() => setSpeed(sp)}
              title={SANDBOX_SPEEDS.includes(sp) ? 'Playtesting only — not intended for normal play' : undefined}
            >
              {SPEED_LABELS[sp]}
            </button>
          ))}
        </div>
        <div className="controlbar-right">
          <button
            className={`auto-develop-toggle ${s.autoDevelop ? 'on' : ''}`}
            onClick={() => act({ type: 'TOGGLE_AUTO_DEVELOP' })}
            title="Playtesting only: auto-starts available courses as slots free up. Never touches buildings, dorms, or facilities — those stay a deliberate, manual decision."
          >
            auto-develop courses: {s.autoDevelop ? 'on' : 'off'}
          </button>
          {/* Scaffolding: proves the interrupt pause/resume cycle. Remove once a real interrupt exists. */}
          <button className="debug-interrupt-btn" onClick={() => act({ type: 'DEBUG_TRIGGER_TEST_INTERRUPT' })}>
            debug: trigger interrupt
          </button>
        </div>
      </div>
    </>
  );
}
