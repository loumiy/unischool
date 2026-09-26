import { speedLock } from '../systems/delegation/seats';
import { useEffect, useId, useRef } from 'react';
import type { GameState } from '../state/types';
import { WEEKS_PER_YEAR, totalEnrolled } from '../state/types';
import {
  RankIcon, StudentsIcon, PrestigeIcon, SatisfactionIcon,
  PauseIcon, PlayIcon, DoubleSpeedIcon, QuadSpeedIcon, OctoSpeedIcon,
} from './icons';
import { weeklyNet } from '../systems/finance/financeSystem';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { SPEEDS, SANDBOX_SPEEDS, type Speed } from '../engine/useGame';
import DayTicker from './DayTicker';
import AnimatedNumber from './AnimatedNumber';
import { FigureBox } from './Figure';
import { FIGURE_HINTS } from '../data/figureHints';
import { isActivationTarget, useHotkeys } from './hotkeys';
import { playtestEnabled } from './playtest';
import { money } from '../format';

// 1/2/3 set real/double/quad; 4 sets the sandbox speed under the playtest
// flag only. Space toggles pause, resuming the last running speed rather than
// always `real`. The typing guard lives in useHotkeys (hotkeys.ts).
function useSpeedHotkeys(speed: Speed, setSpeed: (speed: Speed) => void, sandboxAllowed: boolean, locked: (speed: Speed) => boolean, live: boolean) {
  const resumeSpeedRef = useRef<Speed>('real');
  useEffect(() => {
    if (speed !== 'paused') resumeSpeedRef.current = speed;
  }, [speed]);

  useHotkeys((e) => {
    if (e.key === '1') setSpeed('real');
    else if (e.key === '2') setSpeed('double');
    else if (e.key === '3' && !locked('quad')) setSpeed('quad');
    else if (e.key === '4' && !locked('octo')) setSpeed('octo');
    else if (e.key === '5' && sandboxAllowed) setSpeed('fast');
    else if (e.key === ' ') {
      // A Tab-focused button's native Space click wins. preventDefault stops
      // the page scrolling.
      if (isActivationTarget(e.target)) return;
      e.preventDefault();
      setSpeed(speed === 'paused' ? resumeSpeedRef.current : 'paused');
    }
  }, live);
}

// The ordinary gears are glyphs (icons.tsx), with the word as label and
// title. The sandbox gear keeps its word so it looks like the odd one out.
const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', double: '2×', quad: '4×', octo: '8×', fast: 'Fast (sandbox)' };
const SPEED_ICONS: Partial<Record<Speed, () => React.JSX.Element>> = {
  paused: PauseIcon, real: PlayIcon, double: DoubleSpeedIcon, quad: QuadSpeedIcon, octo: OctoSpeedIcon,
};
const SPEED_HINTS: Record<Speed, string> = {
  paused: 'Pause (Space)', real: 'Play (1)', double: 'Double speed (2)', quad: 'Quadruple speed (3)',
  octo: 'Eight times speed (4)', fast: 'Playtesting only — not intended for normal play (5)',
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
  const fundsHint = useId();

  return (
    <>
      <button
        type="button"
        className={`toolbar-funds-btn figure-box ${treasuryOpen ? 'active' : ''}`}
        aria-expanded={treasuryOpen}
        aria-label="Treasury"
        aria-describedby={fundsHint}
        onClick={onOpenTreasury}
      >
        {/* Money ticks to its new value. Rank does not animate: it is an
            ordinal, and counting through places would be misleading. */}
        <span className={`stat-value ${s.finance.cash < 0 ? 'money-negative' : 'money'}`}>
          <AnimatedNumber value={s.finance.cash} format={money} />
        </span>
        <span className="toolbar-funds-net">{netWeekly >= 0 ? '+' : '−'}{money(Math.abs(netWeekly))}/wk</span>
        <span className="figure-hint above" role="tooltip" id={fundsHint}>{FIGURE_HINTS.funds}</span>
      </button>
      <div className="toolbar-stats">
        <FigureBox className="toolbar-stat" above hint={FIGURE_HINTS.rank(s.rivals.length + 1)}>
          <RankIcon />
          <span className="stat-label">Rank</span>
          <span className="stat-value">#{rank}</span>
        </FigureBox>
        <FigureBox className="toolbar-stat" above hint={FIGURE_HINTS.enrolled}>
          <StudentsIcon />
          <span className="stat-label">Enrolled</span>
          <span className="stat-value"><AnimatedNumber value={totalEnrolled(s.students)} /></span>
        </FigureBox>
        <FigureBox className="toolbar-stat" above hint={FIGURE_HINTS.prestige}>
          <PrestigeIcon />
          <span className="stat-label">Prestige</span>
          <span className="stat-value gold"><AnimatedNumber value={s.self.reputation} /></span>
        </FigureBox>
        <FigureBox className="toolbar-stat" above hint={FIGURE_HINTS.satisfaction}>
          <SatisfactionIcon />
          <span className="stat-label">Satisfaction</span>
          <span className={`stat-value ${s.students.satisfaction < SATISFACTION_WARN ? 'money-negative' : ''}`}>
            <AnimatedNumber value={s.students.satisfaction} />
          </span>
        </FigureBox>
      </div>
    </>
  );
}

// Right: the clock, and the speed controls.
export function SchoolAndClock({ s, speed, setSpeed, keysLive, weekProgress }: {
  s: GameState; speed: Speed; setSpeed: (speed: Speed) => void;
  // False while a front screen covers the game (App.tsx).
  keysLive: boolean;
  // The live fraction of the week, for DayTicker.tsx.
  weekProgress: () => number;
}) {
  // The sandbox speed's gate (playtest.ts).
  const showPlaytestControls = playtestEnabled();
  const visibleSpeeds = (Object.keys(SPEEDS) as Speed[]).filter(
    (sp) => showPlaytestControls || !SANDBOX_SPEEDS.includes(sp),
  );

  // The top speeds are earned by the administration's seats.
  const lockOf = (sp: Speed) => speedLock(s, sp);
  useSpeedHotkeys(speed, setSpeed, showPlaytestControls, (sp) => lockOf(sp) !== null, keysLive);

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
            const lock = lockOf(sp);
            return (
              <button
                key={sp}
                className={[
                  speed === sp ? 'active' : '',
                  SANDBOX_SPEEDS.includes(sp) ? 'sandbox' : '',
                  lock ? 'locked' : '',
                ].join(' ').trim()}
                disabled={lock !== null}
                aria-pressed={speed === sp}
                aria-label={SPEED_LABELS[sp]}
                onClick={() => setSpeed(sp)}
                title={lock ?? SPEED_HINTS[sp]}
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
