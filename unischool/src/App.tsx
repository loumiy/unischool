import { useState } from 'react';
import { useGame } from './engine/useGame';
import { useHotkeys } from './components/hotkeys';
import type { GameState } from './state/types';
import StartupScreen from './components/StartupScreen';
import MainMenu from './components/MainMenu';
import InterruptModal from './components/InterruptModal';
import { TAB_LABELS, type TabId } from './components/TabNav';
import CampusMap from './components/CampusMap';
import Toolbar from './components/Toolbar';
import LogTicker from './components/LogTicker';
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
// status header, bottom toolbar, and every tab's panel — floats ON TOP of
// it rather than sharing a bordered column with it. With no tab open the
// player is simply looking at the world, control bar over it; the map is
// the one screen the player always comes back to, and no view is ever more
// than one Escape away from it.
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
// C2 unifies what used to be three separate floating pieces — the tab nav,
// the build rail, and the log ticker — into one bottom Toolbar (see
// Toolbar.tsx), reclaiming the side rail's column entirely. C3 goes
// further and removes the topbar altogether: everything it used to show
// (the school's identity, the headline stats, speed/save controls) now
// lives either in that same bottom Toolbar or in the top-right corner
// overlays (MainMenu's hamburger, the map's own zoom/'?' pill — see
// CampusMap.tsx), so the map now only insets away from the toolbar
// (bottom), never from the top or a right-hand rail. The toolbar has a
// real, non-constant height — its content can wrap at narrower widths (see
// styles.css's media queries) — so a fixed CSS inset would either waste
// map area on a wide screen or, worse, leave a strip of tiles physically
// under an opaque panel — on screen but never clickable — on a narrower
// one. `useCssHeightVar` keeps `--toolbar-height` synced to its real
// rendered height, which is what .campus-map-canvas (see styles.css)
// insets its interactive area by, so every tile stays reachable at any
// viewport size. The log ticker C2 folded away is back as LogTicker.tsx —
// its own thin strip stacked above the toolbar rather than a fourth zone
// inside it, at a fixed (not measured) height, since one line of text never
// wraps the way the toolbar's own zones can.

// The three views with a letter of their own. Deliberately a SUBSET of
// TAB_ORDER rather than one key per tab: these are the three a player dips
// into and back out of constantly mid-run, and every extra letter claimed
// here is one the map can never use. Treasury already has a permanent
// on-screen figure that opens it, and Admissions/Athletics/History are
// places you go once a year rather than mid-week. Each key TOGGLES, exactly
// like clicking the same tab's toolbar icon twice.
const TAB_HOTKEYS: Record<string, TabId> = {
  c: 'curriculum',
  f: 'faculty',
  l: 'studentlife',
};

// Which tabs open as a FULL-BLEED screen rather than as a sheet floating
// over the map — the panel takes the whole viewport and the bottom dock
// (log ticker + toolbar) is laid over it (see TabOverlay.tsx, which draws
// both shapes, and styles.css, which layers them).
//
// Deliberately a short list rather than the default. Full bleed is for a
// view the player WORKS IN: a large canvas that wants every pixel and wants
// its own tools reachable without closing it first. Curriculum is that view
// — 421 courses across 42 majors is a map, and it was pinched into a
// centred card. Treasury, Admissions and History are read-and-leave pages
// where a full screen would only make a short page look empty, and where
// keeping the map visible around the edges is the reminder that you are one
// Escape away from it.
//
// Adding a tab here is the whole change: the tab components know nothing
// about which shape frames them.
const FULL_BLEED_TABS: readonly TabId[] = ['curriculum'];

export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s: GameState = state;
  // null = looking at the map itself, with nothing open over it.
  const [overlay, setOverlay] = useState<TabId | null>(null);
  // Which placeable Buildable (building/dorm/facility) is currently picked
  // up for siting, if any, and which path-drawing tool (if any) is active —
  // the two pieces of CampusMap's transient UI state that have to live here
  // rather than inside CampusMap itself, since C2's build popup (Toolbar.tsx
  // -> BuildPopup.tsx) can now arm either one too, not just the map itself.
  // Placement is how a placeable Buildable starts (see PLACE_BUILDABLE), and
  // BuildPopup's "site →" row is where that pickup can be armed from; the
  // draw/erase path buttons living in that same popup are the other half.
  // This is the nearest shared ancestor of every component that needs
  // either one.
  const [placingId, setPlacingIdState] = useState<string | null>(null);
  const [pathTool, setPathToolState] = useState<'draw' | 'erase' | null>(null);
  const toolbarRef = useCssHeightVar('--toolbar-height');

  // C / F / L open the three views that get opened most (see TAB_HOTKEYS).
  // Held back while an interrupt is pending: that modal is the one thing in
  // the game the player must answer before anything else, and opening a tab
  // underneath it would put a panel behind a dialog that already covers it.
  useHotkeys((e) => {
    if (s.pendingInterrupt) return;
    const tab = TAB_HOTKEYS[e.key.toLowerCase()];
    if (!tab) return;
    setOverlay((cur) => (cur === tab ? null : tab));
  }, s.started);

  // The map's own keys (W/A/S/D and the arrows to pan, P for the path tool,
  // R to rotate, Escape to back out) answer only while the player is
  // actually looking at the map. With a tab open over it or an interrupt
  // halting the clock, the keyboard belongs to what's on top — Escape
  // closes the overlay rather than dropping a path tool behind it, and
  // panning a map nobody can see is just a camera that has moved by the
  // time they come back to it.
  const mapHotkeysEnabled = overlay === null && s.pendingInterrupt === null;

  // Picking up a building for siting and drawing/erasing a path are two
  // different jobs for the same click on the same grid, so exactly one is
  // ever live — see CampusMap.tsx's own (pre-C2) version of this rule.
  // Arming a placement always drops whatever path tool was active, and
  // engaging a path tool always drops whatever was picked up for siting.
  function setPlacingId(id: string | null) {
    setPlacingIdState(id);
    if (id !== null) setPathToolState(null);
  }
  function setPathTool(mode: 'draw' | 'erase') {
    setPathToolState((cur) => (cur === mode ? null : mode));
    setPlacingIdState(null);
  }

  if (!s.started) {
    return <StartupScreen onStart={(name, schoolType) => act({ type: 'START_GAME', name, schoolType })} />;
  }

  return (
    <>
      <CampusMap
        s={s}
        act={act}
        selectedId={placingId}
        onSelect={setPlacingId}
        pathTool={pathTool}
        onSetPathTool={setPathTool}
        hotkeysEnabled={mapHotkeysEnabled}
      />
      <MainMenu act={act} />

      <div className="app">
        <LogTicker s={s} />
        <Toolbar
          ref={toolbarRef}
          s={s}
          act={act}
          active={overlay}
          onChangeTab={setOverlay}
          speed={speed}
          setSpeed={setSpeed}
          placingId={placingId}
          onArmPlacement={setPlacingId}
          pathTool={pathTool}
          onSetPathTool={setPathTool}
        />

        {overlay && (
          <TabOverlay
            title={TAB_LABELS[overlay]}
            onClose={() => setOverlay(null)}
            fullBleed={FULL_BLEED_TABS.includes(overlay)}
          >
            {overlay === 'faculty' && <FacultyTab s={s} act={act} />}
            {overlay === 'curriculum' && <CurriculumTab s={s} act={act} />}
            {overlay === 'treasury' && <TreasuryTab s={s} act={act} />}
            {overlay === 'admissions' && <AdmissionsTab s={s} />}
            {overlay === 'studentlife' && <StudentLifeTab s={s} />}
            {overlay === 'athletics' && <AthleticsTab s={s} act={act} />}
            {overlay === 'history' && <HistoryTab s={s} />}
          </TabOverlay>
        )}

        <InterruptModal s={s} act={act} />
      </div>
    </>
  );
}
