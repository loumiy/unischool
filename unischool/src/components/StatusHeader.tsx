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
import { isSandbox } from '../systems/sandbox/sandbox';
import { SPEEDS, SANDBOX_SPEEDS, type Speed } from '../engine/useGame';
import DayTicker from './DayTicker';
import AnimatedNumber from './AnimatedNumber';
import { PRESTIGE_TREND, SATISFACTION_TREND, TrendArrow } from './TrendFigure';
import { prestigeWeeklyChange } from '../systems/prestige/prestigeSystem';
import { satisfactionDrag, satisfactionWeeklyChange } from '../systems/satisfaction/satisfactionSystem';
import { FigureBox } from './Figure';
import { FIGURE_HINTS, satisfactionHint } from '../data/figureHints';
import { isActivationTarget, isKey, useHotkeys } from './hotkeys';
import { playtestEnabled } from './playtest';
import { TERM_LENGTH, count, gameDate, money, prestigeFigure, satisfactionFigure, signedMoney, termSeason, weekOfTerm } from '../format';
import { STAT_CHIP_WORDS, chipDoor, type StatChip } from '../data/statChips';
import { tabAvailable } from './TabNav';
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
    if (isKey(e, 'speed1')) setSpeed('real');
    else if (isKey(e, 'speed2')) setSpeed('double');
    else if (isKey(e, 'speed3')) tryLocked('quad');
    else if (isKey(e, 'speed4')) tryLocked('octo');
    else if (isKey(e, 'speed5') && sandboxAllowed) setSpeed('fast');
    else if (isKey(e, 'pause')) {
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

export function FundsAndStats({ s, onOpenTreasury, treasuryOpen, onOpenSection, quiet = false }: {
  s: GameState; onOpenTreasury: () => void; treasuryOpen: boolean;
  // A chip's door (data/statChips.ts): the tab, and the section to land on.
  onOpenSection: (tab: TabId, section: TabSection) => void;
  // The walkthrough's first three steps (Plan 104F): the figures dimmed,
  // still readable, and their doors shut with the tabs they open.
  quiet?: boolean;
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
    const d = quiet ? null : chipDoor(chip, figure);
    if (d && !tabAvailable(s, d.tab)) return undefined;
    return d ? { name: d.name, onOpen: () => onOpenSection(d.tab, d.section) } : undefined;
  };
  // The word over the figure on a wide screen; on a phone the glyph stands
  // in for it (styles.css).
  const word = (chip: StatChip) => <span className="stat-label">{STAT_CHIP_WORDS[chip]}</span>;

  return (
    <>
      <button
        type="button"
        className={`toolbar-funds-btn figure-box ${treasuryOpen ? 'active' : ''}${quiet ? ' quiet' : ''}`}
        aria-expanded={treasuryOpen}
        aria-label="Treasury"
        aria-describedby={fundsHint}
        disabled={quiet}
        onClick={onOpenTreasury}
      >
        {/* Money ticks to its new value. Rank does not animate: it is an
            ordinal, and counting through places would be misleading. */}
        {isSandbox(s) ? (
          // A sandbox run's funds never run out (systems/sandbox).
          <span className="stat-value money" aria-label="Unlimited funds">∞</span>
        ) : (
          <span className={`stat-value ${s.finance.cash < 0 ? 'money-negative' : 'money'}`}>
            <AnimatedNumber value={s.finance.cash} format={money} />
          </span>
        )}
        <span className="toolbar-funds-net">{signedMoney(netWeekly)}/wk</span>
        <span className="figure-hint above" role="tooltip" id={fundsHint}>{FIGURE_HINTS.funds}</span>
      </button>
      <div className={`toolbar-stats${quiet ? ' quiet' : ''}`}>
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
          <span className="stat-value gold">
            <AnimatedNumber value={s.self.reputation} format={prestigeFigure} />
            {/* Which way it is moving (Plan 98B). */}
            <TrendArrow change={prestigeWeeklyChange(s)} {...PRESTIGE_TREND} />
          </span>
        </FigureBox>
        {/* Satisfaction waits for the first summer, with the Students tab
            (Plan 104M): the review introduces it as the year's average. */}
        {tabAvailable(s, 'students') && <FigureBox className="toolbar-stat" above hint={satisfactionHint(s, satisfactionDrag(s))} door={door('satisfaction', satisfactionFigure(s.students.satisfaction))}>
          <SatisfactionIcon />
          {word('satisfaction')}
          {/* The warning is the paper red: the chip is cream, and the dock's
              own red is tuned for the dark band. */}
          <span className={`stat-value ${s.students.satisfaction < SATISFACTION_WARN ? 'stat-warn' : ''}`}>
            <AnimatedNumber value={s.students.satisfaction} format={satisfactionFigure} />
            <TrendArrow change={satisfactionWeeklyChange(s)} {...SATISFACTION_TREND} />
          </span>
        </FigureBox>}
      </div>
    </>
  );
}

// Right: the clock, and the speed controls.
export function SchoolAndClock({ s, speed, setSpeed, keysLive, weekProgress, summerWaiting = false }: {
  s: GameState; speed: Speed; setSpeed: (speed: Speed) => void;
  // False while a front screen covers the game (App.tsx).
  keysLive: boolean;
  // The live fraction of the week, for DayTicker.tsx.
  weekProgress: () => number;
  // The summer waits to be opened (Plan 112C).
  summerWaiting?: boolean;
}) {
  // The sandbox speed's gate (playtest.ts); a sandbox run has it too.
  const showPlaytestControls = playtestEnabled() || isSandbox(s);
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

  // Two rows, clock above gears, with the calendar page beside both
  // (styles.css's .toolbar-right). The page carries the whole date for a
  // screen reader; the year, days and year bar beside it are drawn only.
  // The page counts the term's weeks, not the year's: "Spring, week 38"
  // read as a calendar's September.
  const date = gameDate(s.clock.year, s.clock.week);
  const termWeek = weekOfTerm(s.clock.week);
  return (
    <>
      <div className="toolbar-calendar" role="img" aria-label={date} title={date}>
        <span className="toolbar-calendar-term">{termSeason(s.clock.week)}</span>
        <span className="toolbar-calendar-week">{termWeek}</span>
        <span className="toolbar-calendar-word">Week</span>
      </div>
      <div className="toolbar-school" aria-hidden="true">
        <span className="toolbar-clock">Year {s.clock.year}</span>
        <div className="toolbar-days">
          <DayTicker s={s} speed={speed} weekProgress={weekProgress} />
          {/* The college year, Fall then Spring: each term's half fills
              as its weeks pass, so the bar runs from the year's first
              week of classes to its summer, not January to December. */}
          <div className="year-bar" title={`${termSeason(s.clock.week)} term, week ${termWeek} of ${TERM_LENGTH}`}>
            {(['Fall', 'Spring'] as const).map((term, i) => {
              const filled = Math.max(0, Math.min(TERM_LENGTH, s.clock.week - i * TERM_LENGTH));
              return (
                <span key={term} className="year-bar-term">
                  <span style={{ width: `${(filled / TERM_LENGTH) * 100}%` }} />
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="toolbar-speed">
        <div className="speeds">
          {visibleSpeeds.map((sp) => {
            const Icon = SPEED_ICONS[sp];
            const lock = lockOf(sp);
            // The summer waiting (Plan 112C): Play is rung, and any gear
            // opens the summer (App.tsx), so each says so.
            const summer = summerWaiting && sp !== 'paused' && lock === null;
            return (
              <button
                key={sp}
                className={[
                  speed === sp ? 'active' : '',
                  SANDBOX_SPEEDS.includes(sp) ? 'sandbox' : '',
                  lock ? 'locked' : '',
                  summer && sp === 'real' ? 'opening-target summer-play' : '',
                ].join(' ').trim()}
                disabled={lock !== null}
                aria-pressed={speed === sp}
                aria-label={summer ? `${SPEED_LABELS[sp]}, opens the summer` : SPEED_LABELS[sp]}
                onClick={() => setSpeed(sp)}
                title={lock ?? (summer ? 'The summer is here. Open it to start the clock again.' : SPEED_HINTS[sp])}
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
