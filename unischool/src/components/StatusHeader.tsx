import { useEffect, useRef } from 'react';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../state/types';
import {
  RankIcon, StudentsIcon, PrestigeIcon, SatisfactionIcon,
  PauseIcon, PlayIcon, DoubleSpeedIcon, QuadSpeedIcon,
} from './icons';
import { weeklyNet } from '../systems/finance/financeSystem';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { SPEEDS, SANDBOX_SPEEDS, type Speed } from '../engine/useGame';
import DayTicker from './DayTicker';
import AnimatedNumber from './AnimatedNumber';
import { isActivationTarget, useHotkeys } from './hotkeys';
import { playtestEnabled } from './playtest';
import { money } from '../format';

// 1/2/3 set real/double/quad; 4 sets the sandbox speed under the playtest
// flag only. Space toggles pause, resuming the last running speed rather than
// always `real`. The typing guard lives in useHotkeys (hotkeys.ts).
function useSpeedHotkeys(speed: Speed, setSpeed: (speed: Speed) => void, sandboxAllowed: boolean) {
  const resumeSpeedRef = useRef<Speed>('real');
  useEffect(() => {
    if (speed !== 'paused') resumeSpeedRef.current = speed;
  }, [speed]);

  useHotkeys((e) => {
    if (e.key === '1') setSpeed('real');
    else if (e.key === '2') setSpeed('double');
    else if (e.key === '3') setSpeed('quad');
    else if (e.key === '4' && sandboxAllowed) setSpeed('fast');
    else if (e.key === ' ') {
      // A Tab-focused button's native Space click wins. preventDefault stops
      // the page scrolling.
      if (isActivationTarget(e.target)) return;
      e.preventDefault();
      setSpeed(speed === 'paused' ? resumeSpeedRef.current : 'paused');
    }
  });
}

// The ordinary gears are glyphs (icons.tsx), with the word as label and
// title. The sandbox gear keeps its word so it looks like the odd one out.
const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', double: '2×', quad: '4×', fast: 'Fast (sandbox)' };
const SPEED_ICONS: Partial<Record<Speed, () => React.JSX.Element>> = {
  paused: PauseIcon, real: PlayIcon, double: DoubleSpeedIcon, quad: QuadSpeedIcon,
};
const SPEED_HINTS: Record<Speed, string> = {
  paused: 'Pause (Space)', real: 'Play (1)', double: 'Double speed (2)', quad: 'Quadruple speed (3)',
  fast: 'Playtesting only — not intended for normal play (4)',
};

// Display threshold only: below it satisfaction shows in red. Its mechanical
// effect is admissionsSystem.ts's continuous word-of-mouth curve.
const SATISFACTION_WARN = 55;

function termName(week: number): string {
  return week <= WEEKS_PER_YEAR / 2 ? 'Fall Term' : 'Spring Term';
}

// The two halves of the bottom Toolbar band (Toolbar.tsx composes them).
// Left: operating funds (also the Treasury button) and the headline stats,
// bare figures only.
export function FundsAndStats({ s, onOpenTreasury, treasuryOpen }: {
  s: GameState; onOpenTreasury: () => void; treasuryOpen: boolean;
}) {
  const netWeekly = weeklyNet(s);
  // Shown from week one: the field is 100 schools, with many below a founding
  // school, so the rank is worth reading early. Being published in the top
  // 50 is still the event (rivalsSystem.ts's TOP_50_CUTOFF).
  const rank = playerRank(s);

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
        {/* Money ticks to its new value. Rank does not animate: it is an
            ordinal, and counting through places would be misleading. */}
        <span className={`stat-value ${s.finance.cash < 0 ? 'money-negative' : 'money'}`}>
          <AnimatedNumber value={s.finance.cash} format={money} />
        </span>
        <span className="toolbar-funds-net">{netWeekly >= 0 ? '+' : '−'}{money(Math.abs(netWeekly))}/wk</span>
      </button>
      <div className="toolbar-stats">
        <div className="toolbar-stat" title="Rank, of 100 schools">
          <RankIcon />
          <span className="stat-label">Rank</span>
          <span className="stat-value">#{rank}</span>
        </div>
        <div className="toolbar-stat" title="Enrolled">
          <StudentsIcon />
          <span className="stat-label">Enrolled</span>
          <span className="stat-value"><AnimatedNumber value={totalEnrolled(s.students)} /></span>
        </div>
        <div className="toolbar-stat" title="Prestige">
          <PrestigeIcon />
          <span className="stat-label">Prestige</span>
          <span className="stat-value gold"><AnimatedNumber value={s.self.reputation} /></span>
        </div>
        <div className="toolbar-stat" title="Satisfaction">
          <SatisfactionIcon />
          <span className="stat-label">Satisfaction</span>
          <span className={`stat-value ${s.students.satisfaction < SATISFACTION_WARN ? 'money-negative' : ''}`}>
            <AnimatedNumber value={s.students.satisfaction} />
          </span>
        </div>
      </div>
    </>
  );
}

// Right: the clock, and the speed controls.
export function SchoolAndClock({ s, speed, setSpeed, weekProgress }: {
  s: GameState; speed: Speed; setSpeed: (speed: Speed) => void;
  // The live fraction of the week, for DayTicker.tsx.
  weekProgress: () => number;
}) {
  // The sandbox speed's gate (playtest.ts).
  const showPlaytestControls = playtestEnabled(s);
  const visibleSpeeds = (Object.keys(SPEEDS) as Speed[]).filter(
    (sp) => showPlaytestControls || !SANDBOX_SPEEDS.includes(sp),
  );

  useSpeedHotkeys(speed, setSpeed, showPlaytestControls);

  // Two rows, clock above gears (styles.css's .toolbar-right).
  return (
    <>
      <div className="toolbar-school">
        <span className="toolbar-clock">Year {s.clock.year} · {termName(s.clock.week)} · Week {s.clock.week}</span>
        <DayTicker s={s} speed={speed} weekProgress={weekProgress} />
      </div>
      <div className="toolbar-speed">
        <div className="speeds">
          {visibleSpeeds.map((sp) => {
            const Icon = SPEED_ICONS[sp];
            return (
              <button
                key={sp}
                className={[
                  speed === sp ? 'active' : '',
                  SANDBOX_SPEEDS.includes(sp) ? 'sandbox' : '',
                ].join(' ').trim()}
                aria-pressed={speed === sp}
                aria-label={SPEED_LABELS[sp]}
                onClick={() => setSpeed(sp)}
                title={SPEED_HINTS[sp]}
              >
                {Icon ? <Icon /> : SPEED_LABELS[sp]}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
