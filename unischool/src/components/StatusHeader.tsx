import { useState } from 'react';
import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import { weeklyNet } from '../systems/finance/financeSystem';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { SPEEDS, SANDBOX_SPEEDS, type Speed } from '../engine/useGame';
import Sparkline from './Sparkline';

const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', fast: 'Fast (sandbox)' };

// Below this, satisfaction is reported in the same alarmed red the header
// already uses for negative cash. It is a DISPLAY threshold only — nothing
// mechanical happens here; satisfaction's real consequence is the
// continuous word-of-mouth curve in admissionsSystem.ts, which has no
// cliff. This just puts a number the player was previously never shown in
// front of them before the applicant pool starts shrinking.
const SATISFACTION_WARN = 55;

function termName(week: number): string {
  return week <= WEEKS_PER_YEAR / 2 ? 'Fall Term' : 'Spring Term';
}

// Playtesting controls (the sandbox speed, the debug interrupt trigger) are
// only useful during development, not normal play — they stay reachable by
// naming the university "test" rather than being removed outright, so
// they're still there for anyone iterating on the game.
function isTestUniversity(name: string): boolean {
  return name.trim().toLowerCase() === 'test';
}

// The save affordances, sitting in the persistent control bar next to the
// speed buttons — the run-level controls belong together, and unlike the
// playtesting buttons beside them these are for every player.
//
// The autosave already fires once a year at the summer admissions boundary
// (see reducer.ts), so "Save" is not the only thing standing between the
// player and a lost run; it is how they shorten the gap since last summer
// before closing the tab. Its confirmation is the log line the action
// writes, in the ticker under the map.
//
// "New Game" erases the save, so it asks first — inline, as a second click
// on the same button, rather than a browser confirm() dialog that would
// look nothing like the rest of the chrome. The armed state times out on
// nothing and clears on Cancel; the only way through is a deliberate
// second click.
function SaveControls({ act }: { act: (a: Action) => void }) {
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);

  if (confirmingNewGame) {
    return (
      <>
        <span className="newgame-confirm-label">Erase this run and start over?</span>
        <button className="newgame-btn armed" onClick={() => act({ type: 'RESET' })}>
          Erase & start over
        </button>
        <button className="newgame-btn" onClick={() => setConfirmingNewGame(false)}>
          Cancel
        </button>
      </>
    );
  }

  return (
    <>
      <button
        className="save-btn"
        onClick={() => act({ type: 'SAVE_GAME' })}
        title="Write the run to this browser now. The game also saves itself every summer, at admissions."
      >
        Save
      </button>
      <button
        className="newgame-btn"
        onClick={() => setConfirmingNewGame(true)}
        title="Erase the saved run and found a new university."
      >
        New Game
      </button>
    </>
  );
}

// The persistent header/status bar: the handful of state values that stay
// meaningful no matter which tab is open (clock, cash, prestige, current
// rank, enrollment, satisfaction) plus the speed controls, all visible
// across every tab rather than scoped to one. Standing among peers
// is otherwise a mid-game reveal (see README's "Rankings") — the rank stat
// stays a dash until s.hasEnteredRankings fires, so this header doesn't
// spoil that.
//
// Enrollment and satisfaction earn their place by that same rule: enrolled
// students drive tuition revenue and are the scale the whole institution is
// measured in, and satisfaction is the input to next summer's applicant
// pool (see admissionsSystem.ts's word of mouth). Satisfaction in
// particular used to be visible only inside the Admissions tab, so a
// player could watch it bleed away for years without ever opening the one
// screen that showed it.
//
// The two sparklines under prestige and enrollment read straight off
// s.history (see state/history.ts) — the same numbers, with the shape of
// the last few decades behind them. They draw nothing until a second year
// has been filed, so a fresh school shows a clean header.
export default function StatusHeader({ s, speed, setSpeed, act }: {
  s: GameState;
  speed: Speed;
  setSpeed: (speed: Speed) => void;
  act: (a: Action) => void;
}) {
  const netWeekly = weeklyNet(s);
  const rank = s.hasEnteredRankings ? playerRank(s) : null;
  const prestigeSeries = s.history.map((h) => h.prestige);
  const enrolledSeries = s.history.map((h) => h.enrolled);
  const showPlaytestControls = isTestUniversity(s.self.name);
  const visibleSpeeds = (Object.keys(SPEEDS) as Speed[]).filter(
    (sp) => showPlaytestControls || !SANDBOX_SPEEDS.includes(sp),
  );

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
            <Sparkline values={prestigeSeries} title={`Prestige over ${prestigeSeries.length} years`} />
          </div>
          <div className="stat-block">
            <div className="stat-label">National Rank</div>
            <div className="stat-value">{rank ? `#${rank}` : '—'}</div>
            <div className="stat-sub">{rank ? `of ${s.rivals.length + 1}` : 'Unranked'}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">Enrolled</div>
            <div className="stat-value">{s.students.enrolled.toLocaleString()}</div>
            <div className="stat-sub">of {s.students.capacity.toLocaleString()} beds</div>
            <Sparkline values={enrolledSeries} title={`Enrollment over ${enrolledSeries.length} years`} />
          </div>
          <div className="stat-block">
            <div className="stat-label">Satisfaction</div>
            <div className={`stat-value ${s.students.satisfaction < SATISFACTION_WARN ? 'money-negative' : ''}`}>{Math.round(s.students.satisfaction)}</div>
            <div className="stat-sub">of 100</div>
          </div>
        </div>
      </header>

      <div className="controlbar">
        <div className="speeds">
          {visibleSpeeds.map((sp) => (
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
          {showPlaytestControls && (
            /* Scaffolding: proves the interrupt pause/resume cycle. Remove once a real interrupt exists. */
            <button className="debug-interrupt-btn" onClick={() => act({ type: 'DEBUG_TRIGGER_TEST_INTERRUPT' })}>
              debug: trigger interrupt
            </button>
          )}
          <SaveControls act={act} />
        </div>
      </div>
    </>
  );
}
