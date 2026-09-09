import { useEffect } from 'react';
import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR, institutionName, totalEnrolled } from '../state/types';
import { weeklyNet } from '../systems/finance/financeSystem';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { SPEEDS, SANDBOX_SPEEDS, type Speed } from '../engine/useGame';
import DayTicker from './DayTicker';

// The playtest grant (see the "+$1B" button below): a round, memorable
// figure — not tuned to any particular shortfall — since its only job is
// to remove money as a constraint while iterating, not to model a real
// cash event.
const PLAYTEST_GRANT_AMOUNT = 1_000_000_000;

// Keys 1/2/3 set the speed directly to real/double/fast, without having to
// click the control-bar buttons — real and double are ordinary gameplay
// speeds so both hotkeys are live for every player, but '3' only does
// anything for a test university, matching the Fast button's own gating
// just below. Ignored while focus sits in a text control (the startup
// screen's school-name field, a future text input) so typing "3" into a
// name doesn't yank the clock into fast-forward.
function useSpeedHotkeys(setSpeed: (speed: Speed) => void, sandboxAllowed: boolean) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '1') setSpeed('real');
      else if (e.key === '2') setSpeed('double');
      else if (e.key === '3' && sandboxAllowed) setSpeed('fast');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSpeed, sandboxAllowed]);
}

const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', double: 'Play 2×', fast: 'Fast (sandbox)' };

// Below this, satisfaction is reported in the same alarmed red the funds
// figure already uses for negative cash. It is a DISPLAY threshold only —
// nothing mechanical happens here; satisfaction's real consequence is the
// continuous word-of-mouth curve in admissionsSystem.ts, which has no
// cliff. This just puts a number the player was previously never shown in
// front of them before the applicant pool starts shrinking.
const SATISFACTION_WARN = 55;

function termName(week: number): string {
  return week <= WEEKS_PER_YEAR / 2 ? 'Fall Term' : 'Spring Term';
}

// Playtesting controls (the sandbox speed, the +$1B grant, the fast-speed
// hotkey below, CurriculumTab.tsx's "Develop All" button) are only useful
// during development, not normal play — they stay reachable by naming the
// university "test" rather than being removed outright, so they're still
// there for anyone iterating on the game. Checked against the
// player-written half of the name only (see types.ts's University), so it
// keeps working whether the school is Test College or Test University.
// Exported so every playtest-only control shares this one gate rather than
// each re-deriving its own copy.
export function isTestUniversity(name: string): boolean {
  return name.trim().toLowerCase() === 'test';
}

// ---------------------------------------------------------------------
// C3 folded the old topbar (a masthead with the school's title and its
// headline stats, plus a control bar with speed/save/new-game) into the
// bottom Toolbar band instead — there is no more standalone status header
// component, just these two pieces Toolbar.tsx composes into its left and
// right zones. Save/New Game moved further still, into MainMenu.tsx's own
// top-right overlay, since they're run-level actions rather than anything
// that needs to sit beside the clock.
// ---------------------------------------------------------------------

// The bottom-left cluster: operating funds (now also the button that opens
// Treasury — there is no separate Treasury icon in the middle row any
// more) plus the handful of headline stats that used to sit in the old
// masthead. Rank/enrolled/prestige/satisfaction show their bare figure only
// now — no "of 350 beds" / "of 100" suffix — since each is read against
// context available on its own tab (Admissions, Student Life) rather than
// reconstructed here.
export function FundsAndStats({ s, onOpenTreasury, treasuryOpen }: {
  s: GameState; onOpenTreasury: () => void; treasuryOpen: boolean;
}) {
  const netWeekly = weeklyNet(s);
  const rank = s.hasEnteredRankings ? playerRank(s) : null;

  return (
    <>
      <button
        type="button"
        className={`toolbar-funds-btn ${treasuryOpen ? 'active' : ''}`}
        aria-expanded={treasuryOpen}
        aria-label="Open Treasury"
        title="Operating funds — opens Treasury"
        onClick={onOpenTreasury}
      >
        <span className={`stat-value ${s.finance.cash < 0 ? 'money-negative' : 'money'}`}>${Math.round(s.finance.cash).toLocaleString()}</span>
        <span className="toolbar-funds-net">{netWeekly >= 0 ? '+' : '-'}${Math.round(Math.abs(netWeekly)).toLocaleString()}/wk</span>
      </button>
      <div className="toolbar-stats">
        <div className="toolbar-stat">
          <span className="stat-label">Rank</span>
          <span className="stat-value">{rank ? `#${rank}` : '—'}</span>
        </div>
        <div className="toolbar-stat">
          <span className="stat-label">Enrolled</span>
          <span className="stat-value">{totalEnrolled(s.students).toLocaleString()}</span>
        </div>
        <div className="toolbar-stat">
          <span className="stat-label">Prestige</span>
          <span className="stat-value gold">{Math.round(s.self.reputation)}</span>
        </div>
        <div className="toolbar-stat">
          <span className="stat-label">Satisfaction</span>
          <span className={`stat-value ${s.students.satisfaction < SATISFACTION_WARN ? 'money-negative' : ''}`}>{Math.round(s.students.satisfaction)}</span>
        </div>
      </div>
    </>
  );
}

// The bottom-right cluster: speed/playtest controls, then the school's own
// identity and clock — prominent per the design ask, in place of the old
// masthead's h1 and "Office of the President" eyebrow (dropped; it named a
// role, not the school).
export function SchoolAndClock({ s, speed, setSpeed, act }: {
  s: GameState; speed: Speed; setSpeed: (speed: Speed) => void; act: (a: Action) => void;
}) {
  const showPlaytestControls = isTestUniversity(s.self.name);
  const visibleSpeeds = (Object.keys(SPEEDS) as Speed[]).filter(
    (sp) => showPlaytestControls || !SANDBOX_SPEEDS.includes(sp),
  );

  useSpeedHotkeys(setSpeed, showPlaytestControls);

  return (
    <>
      <div className="toolbar-speed">
        {showPlaytestControls && (
          <button
            className="grant-funds-btn"
            onClick={() => act({ type: 'GRANT_FUNDS', amount: PLAYTEST_GRANT_AMOUNT })}
            title="Playtest only — grants $1,000,000,000 to operating funds directly, no event behind it."
          >
            +$1B
          </button>
        )}
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
      </div>
      <div className="toolbar-school">
        <span className="toolbar-school-name">{institutionName(s.self)}</span>
        <span className="toolbar-clock">Year {s.clock.year} · {termName(s.clock.week)} · Week {s.clock.week}</span>
        <DayTicker s={s} speed={speed} />
      </div>
    </>
  );
}
