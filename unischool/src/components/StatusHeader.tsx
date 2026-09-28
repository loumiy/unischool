import { speedLock } from '../systems/delegation/seats';
import { useEffect, useId, useRef, useState } from 'react';
import type { GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
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
import { FIGURE_HINTS, satisfactionHint } from '../data/figureHints';
import { isActivationTarget, useHotkeys } from './hotkeys';
import { playtestEnabled } from './playtest';
import { count, gameDate, money, prestigeFigure, satisfactionFigure, signedMoney } from '../format';
import { STAT_CHIP_WORDS, chipDoor, type StatChip } from '../data/statChips';
import type { TabSection } from '../data/ladderData';
import type { TabId } from './TabNav';

// 1/2/3 set real/double/quad; 4 sets the sandbox speed under the playtest
// flag only. Space toggles pause, resuming the last running speed rather than
// always `real`. The typing guard lives in useHotkeys (hotkeys.ts).
// A locked speed's key says why instead of doing nothing (Plan 70E):
// `lockOf` gives the reason, and `onLocked` shows it.
function useSpeedHotkeys(
  speed: Speed, setSpeed: (speed: Speed) => void, sandboxAllowed: boolean,
  lockOf: (speed: Speed) => string | null, onLocked: (reason: string) => void, live: boolean,
) {
  const tryLocked = (sp: Speed) => {
    const lock = lockOf(sp);
    if (lock) onLocked(lock);
    else setSpeed(sp);
  };
  const resumeSpeedRef = useRef<Speed>('real');
  useEffect(() => {
    if (speed !== 'paused') resumeSpeedRef.current = speed;
  }, [speed]);

  useHotkeys((e) => {
    if (e.key === '1') setSpeed('real');
    else if (e.key === '2') setSpeed('double');
    else if (e.key === '3') tryLocked('quad');
    else if (e.key === '4') tryLocked('octo');
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

const LOCKED_NOTE_MS = 3500;

// The ordinary gears are glyphs (icons.tsx), with the word as label and
// title. The sandbox gear keeps its word so it looks like the odd one out.
const SPEED_LABELS: Record<Speed, string> = { paused: 'Paused', real: 'Play', double: '2×', quad: '4×', octo: '8×', fast: 'Fast (sandbox)' };
const SPEED_ICONS: Partial<Record<Speed, () => React.JSX.Element>> = {
  paused: PauseIcon, real: PlayIcon, double: DoubleSpeedIcon, quad: QuadSpeedIcon, octo: OctoSpeedIcon,
};
const SPEED_HINTS: Record<Speed, string> = {
  paused: 'Pause (Space)', real: 'Play (1)', double: 'Game speed 2× (2)', quad: 'Game speed 4× (3)',
  octo: 'Game speed 8× (4)', fast: 'Fastest, for the sandbox (5)',
};

// Display threshold only: below it satisfaction shows in red. Its mechanical
// effect is admissionsSystem.ts's continuous word-of-mouth curve.
const SATISFACTION_WARN = 55;

// The two halves of the bottom Toolbar band (Toolbar.tsx composes them).
// Left: operating funds (also the Treasury button) and the headline stats,
// each a word over its figure; rank, prestige and satisfaction open where
// they are explained (Plan 78C, data/statChips.ts).
// The rank's move, for a moment after it changes (Plan 70H): 'rank-up' or
// 'rank-down', a flash on the pill; the ordinal itself does not count
// through places. The first reading is where the run stands, not a move.
const RANK_FLASH_MS = 1_600;
function useRankFlash(rank: number): string {
  const [flash, setFlash] = useState('');
  const last = useRef<number | null>(null);
  useEffect(() => {
    const was = last.current;
    last.current = rank;
    if (was === null || was === rank) return;
    setFlash(rank < was ? 'rank-up' : 'rank-down');
    const timer = window.setTimeout(() => setFlash(''), RANK_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [rank]);
  return flash;
}

export function FundsAndStats({ s, onOpenTreasury, treasuryOpen, onOpenSection }: {
  s: GameState; onOpenTreasury: () => void; treasuryOpen: boolean;
  // A chip's door (data/statChips.ts): the tab, and the section to land on.
  onOpenSection: (tab: TabId, section: TabSection) => void;
}) {
  const netWeekly = weeklyNet(s);
  // Shown from week one: the field is 100 schools, with many below a founding
  // school, so the rank is worth reading early. Being published in the top
  // 50 is still the event (rivalsSystem.ts's TOP_50_CUTOFF).
  const rank = playerRank(s);
  const fundsHint = useId();
  const rankFlash = useRankFlash(rank);
  // A chip that has a door is a button named with its figure (Plan 78C).
  const door = (chip: StatChip, figure: string) => {
    const d = chipDoor(chip, figure);
    return d ? { name: d.name, onOpen: () => onOpenSection(d.tab, d.section) } : undefined;
  };
  // The word over the figure on a wide screen; on a phone the glyph stands
  // in for it (styles.css).
  const word = (chip: StatChip) => <span className="stat-label">{STAT_CHIP_WORDS[chip]}</span>;

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
        <span className="toolbar-funds-net">{signedMoney(netWeekly)}/wk</span>
        <span className="figure-hint above" role="tooltip" id={fundsHint}>{FIGURE_HINTS.funds}</span>
      </button>
      <div className="toolbar-stats">
        <FigureBox className={`toolbar-stat ${rankFlash}`} above hint={FIGURE_HINTS.rank(s.rivals.length + 1)} door={door('rank', `#${rank}`)}>
          <RankIcon />
          {word('rank')}
          <span className="stat-value">#{rank}</span>
        </FigureBox>
        <FigureBox className="toolbar-stat" above hint={FIGURE_HINTS.enrolled} door={door('enrolled', count(totalEnrolled(s.students)))}>
          <StudentsIcon />
          {word('enrolled')}
          <span className="stat-value"><AnimatedNumber value={totalEnrolled(s.students)} /></span>
        </FigureBox>
        <FigureBox className="toolbar-stat" above hint={FIGURE_HINTS.prestige} door={door('prestige', prestigeFigure(s.self.reputation))}>
          <PrestigeIcon />
          {word('prestige')}
          <span className="stat-value gold"><AnimatedNumber value={s.self.reputation} format={prestigeFigure} /></span>
        </FigureBox>
        <FigureBox className="toolbar-stat" above hint={satisfactionHint(s)} door={door('satisfaction', satisfactionFigure(s.students.satisfaction))}>
          <SatisfactionIcon />
          {word('satisfaction')}
          {/* The warning is the paper red: the chip is cream, and the dock's
              own red is tuned for the dark band. */}
          <span className={`stat-value ${s.students.satisfaction < SATISFACTION_WARN ? 'stat-warn' : ''}`}>
            <AnimatedNumber value={s.students.satisfaction} format={satisfactionFigure} />
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
  // Why a locked speed's key did nothing, shown for a few seconds.
  const [lockedNote, setLockedNote] = useState<string | null>(null);
  useEffect(() => {
    if (!lockedNote) return;
    const id = setTimeout(() => setLockedNote(null), LOCKED_NOTE_MS);
    return () => clearTimeout(id);
  }, [lockedNote]);
  useSpeedHotkeys(speed, setSpeed, showPlaytestControls, lockOf, setLockedNote, keysLive);

  // Two rows, clock above gears (styles.css's .toolbar-right).
  return (
    <>
      <div className="toolbar-school">
        <span className="toolbar-clock">{gameDate(s.clock.year, s.clock.week)}</span>
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
        {lockedNote && <span className="speed-locked-note" role="status">{lockedNote}</span>}
      </div>
    </>
  );
}
