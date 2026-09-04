import { useRef, useState } from 'react';
import { useGame } from './engine/useGame';
import type { GameState } from './state/types';
import StartupScreen from './components/StartupScreen';
import StatusHeader from './components/StatusHeader';
import InterruptModal from './components/InterruptModal';
import TabNav, { TAB_LABELS, type TabId } from './components/TabNav';
import CampusMap from './components/CampusMap';
import BuildPanel from './components/BuildPanel';
import LogStrip from './components/LogStrip';
import TabOverlay from './components/TabOverlay';
import { useCssHeightVar } from './components/useCssHeightVar';
import FacultyTab from './tabs/FacultyTab';
import CurriculumTab from './tabs/CurriculumTab';
import TreasuryTab from './tabs/TreasuryTab';
import AdmissionsTab from './tabs/AdmissionsTab';
import StudentLifeTab from './tabs/StudentLifeTab';
import HistoryTab from './tabs/HistoryTab';
import AthleticsTab from './tabs/AthleticsTab';
import './styles.css';

// The dashboard shell, built around the campus map as a full-viewport
// BACKGROUND: the map fills the whole screen behind everything, always
// present and never gated behind a tab, and every piece of chrome —
// status header, build rail, log ticker, and every tab's panel — floats
// ON TOP of it rather than sharing a bordered column with it. With no tab
// open the player is simply looking at the world, control bar over it; the
// map is the one screen the player always comes back to, and no view is
// ever more than one Escape away from it.
//
// CampusMap itself renders as a plain sibling BEFORE `.app` (see below,
// and styles.css) so the chrome layer's own box never sits between the
// player's cursor and the map — `.app` is pointer-events: none with only
// its direct children (the actual floating cards) re-enabled, so a click
// anywhere the chrome is visually empty falls straight through to the map.
//
// The tab components themselves are untouched by this: they still read
// their slice of GameState and dispatch actions exactly as before, and know
// nothing about being rendered in an overlay.
//
// The topbar and the log strip both have real, non-constant heights — the
// masthead's stat row wraps at moderate widths and wraps further as the
// viewport narrows (see styles.css's media queries) — so a fixed CSS inset
// would either waste map area on a wide screen or, worse, leave a strip of
// tiles physically under an opaque panel — on screen but never clickable —
// on a narrower one. `useCssHeightVar` keeps `--topbar-height` and
// `--log-strip-height` synced to their real rendered heights; the map's own
// bottom hint strip does the same for `--tray-height` in CampusMap.tsx.
// Together those three are what .campus-map-canvas (see styles.css) insets its
// interactive area by, so every tile stays reachable at any viewport size.
export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s: GameState = state;
  // null = looking at the map itself, with nothing open over it.
  const [overlay, setOverlay] = useState<TabId | null>(null);
  // Which placeable Buildable (building/dorm/facility) is currently picked
  // up for siting, if any — the ONE piece of CampusMap's transient UI state
  // that has to live here rather than inside CampusMap itself. Placement is
  // now how a placeable Buildable starts (see PLACE_BUILDABLE), and
  // BuildPanel's "site →" row is where that pickup can be armed from, so
  // this is the nearest shared ancestor of the two components that need it.
  const [placingId, setPlacingId] = useState<string | null>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const logStripRef = useRef<HTMLDivElement>(null);
  useCssHeightVar(topbarRef, '--topbar-height');
  useCssHeightVar(logStripRef, '--log-strip-height');

  if (!s.started) {
    return <StartupScreen onStart={(name, schoolType) => act({ type: 'START_GAME', name, schoolType })} />;
  }

  return (
    <>
      <CampusMap s={s} act={act} selectedId={placingId} onSelect={setPlacingId} />

      <div className="app">
        <div className="topbar" ref={topbarRef}>
          <StatusHeader s={s} speed={speed} setSpeed={setSpeed} act={act} />

          {/* Dead banner in practice: nothing sets gameOver any more (see
              README's "no hard insolvency game-over" — a shortfall stalls
              expansion instead). RESET now erases the save and returns to the
              startup screen, so the label follows it. */}
          {s.gameOver && <div className="gameover">Game Over — <button onClick={() => act({ type: 'RESET' })}>New Game</button></div>}

          <TabNav active={overlay} onChange={setOverlay} />
        </div>

        <BuildPanel s={s} placingId={placingId} onArmPlacement={setPlacingId} />
        <LogStrip ref={logStripRef} s={s} />

        {overlay && (
          <TabOverlay title={TAB_LABELS[overlay]} onClose={() => setOverlay(null)}>
            {overlay === 'faculty' && <FacultyTab s={s} act={act} />}
            {overlay === 'curriculum' && <CurriculumTab s={s} act={act} />}
            {overlay === 'treasury' && <TreasuryTab s={s} act={act} />}
            {overlay === 'admissions' && <AdmissionsTab s={s} />}
            {overlay === 'studentlife' && <StudentLifeTab s={s} act={act} />}
            {overlay === 'history' && <HistoryTab s={s} />}
            {overlay === 'athletics' && <AthleticsTab />}
          </TabOverlay>
        )}

        <InterruptModal s={s} act={act} />
      </div>
    </>
  );
}
