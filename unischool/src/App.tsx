import type { CampusTool } from './state/actions';
import { useEffect, useRef, useState } from 'react';
import { SPEEDS, useGame } from './engine/useGame';
import { openingHoldsClock } from './state/opening';
import { mapBackOutLive, mapControlsLive, useHotkeys, type ShellOverlays } from './components/hotkeys';
import type { GameState } from './state/types';
import StartupScreen from './components/StartupScreen';
import MainMenu from './components/MainMenu';
import TitleScreen from './components/TitleScreen';
import { applySettings } from './settings';
import HallOfFame from './components/HallOfFame';
import SettingsPanel from './components/SettingsPanel';
import Credits from './components/Credits';
import Pennant from './components/Pennant';
import DebugPanel from './components/DebugPanel';
import InterruptModal from './components/InterruptModal';
import { GATED_TABS, TAB_LABELS, tabAvailable, type TabId } from './components/TabNav';
import CampusMap from './components/CampusMap';
import { FOUNDERS_HALL_ID } from './data/techData';
import Toolbar from './components/Toolbar';
import LogTicker from './components/LogTicker';
import MilestoneNote from './components/MilestoneNote';
import BoardLetter from './components/BoardLetter';
import DemandNote from './components/DemandNote';
import EventPanel from './components/EventPanel';
import TabOverlay from './components/TabOverlay';
import { useCssHeightVar } from './components/useCssHeightVar';
import { applySchoolColors } from './components/theme';
import OpeningCoach from './components/OpeningCoach';
import type { OpeningStage } from './state/types';
import FacultyTab from './tabs/FacultyTab';
import CurriculumTab from './tabs/CurriculumTab';
import ResearchTab from './tabs/ResearchTab';
import TreasuryTab from './tabs/TreasuryTab';
import StudentsTab from './tabs/StudentsTab';
import HistoryTab from './tabs/HistoryTab';
import AthleticsTab from './tabs/AthleticsTab';
import { freshSeed } from './engine/random';
import './styles.css';

// The dashboard shell. The campus map fills the viewport behind everything
// and every piece of chrome floats over it. CampusMap renders as a sibling
// before `.app`; `.app` is pointer-events: none with only its direct
// children re-enabled, so clicks on empty chrome fall through to the map.
//
// Every tab is a full screen, left by Escape, its close button or the
// toolbar's home button. Build mode and an open tab share one slot: opening
// either closes the other. The shell owns what is open, so it also owns the
// Escape ladder (see below). Tab components know nothing about the overlay.
//
// The toolbar's height varies (its content wraps at narrow widths), so
// useCssHeightVar keeps `--toolbar-height` synced and .campus-map-canvas
// insets by it, keeping every tile reachable. LogTicker is a fixed-height
// strip above it.

// The three views with a letter of their own: the ones a player dips in and
// out of constantly. Every extra letter here is one the map can't use. Each
// key toggles, like clicking the tab's toolbar icon twice.
const TAB_HOTKEYS: Record<string, TabId> = {
  c: 'curriculum',
  f: 'faculty',
  l: 'students',
};

type Front = 'title' | 'hall' | 'settings' | 'credits';

export default function App() {
  const { state, act, speed, setSpeed, weekProgress, exportRun } = useGame();
  const s: GameState = state;
  // null = looking at the map. A tab plus an optional target inside it (e.g.
  // a school in the Curriculum), so there is one source of truth for what is
  // open. The tab consumes and clears the target, so the same link works
  // twice.
  const [overlay, setOverlay] = useState<{ tab: TabId; target?: string } | null>(null);
  // The front screens (Plan 34): the title the game opens on, and the hall,
  // the settings and the credits, reachable from it and from the menu. The
  // clock is paused while one is up.
  const [front, setFrontState] = useState<Front | null>('title');
  const [frontBack, setFrontBack] = useState<Front | null>(null);
  function setFront(next: Front | null) {
    setFrontBack(next === 'title' || next === null ? null : front);
    setFrontState(next);
    if (next !== null) setSpeed('paused');
  }
  const closeFront = () => setFrontState(frontBack);
  // The player's settings onto the page, once (settings.ts).
  useEffect(() => { applySettings(); }, []);
  // The Curriculum tab's "Found in <hall>": closes the tab and opens that
  // hall's panel on the map. Consumed and cleared by the map.
  const [inspectTarget, setInspectTarget] = useState<string | null>(null);
  // Which building's panel the map has open (reported by CampusMap), so the
  // opening walkthrough's card can tell whether its door is open.
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  // The picked-up Buildable and the active path tool live here, not in
  // CampusMap, because the build popup (BuildPopup.tsx) can arm either.
  const [placingId, setPlacingIdState] = useState<string | null>(null);
  const [pathTool, setPathToolState] = useState<CampusTool | null>(null);
  // The build popup and `overlay` are two states of one slot, so both live
  // here.
  const [buildOpen, setBuildOpenState] = useState(false);
  // The activity-log popup: the innermost thing the shell can open, so
  // Escape has to see it.
  const [logOpen, setLogOpen] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);
  const toolbarRef = useCssHeightVar('--toolbar-height');

  // C / F / L (see TAB_HOTKEYS). Held back while an interrupt is pending,
  // since that modal must be answered first.
  useHotkeys((e) => {
    if (s.pendingInterrupt) return;
    const tab = TAB_HOTKEYS[e.key.toLowerCase()];
    if (!tab) return;
    // openTab refuses an unavailable tab, so a letter can't route to a gated
    // view.
    openTab(overlay?.tab === tab ? null : tab);
  }, s.started);

  // A gate opening is news: the first time each gated tab (TabNav.tsx's
  // TAB_GATES) is found open, the log says so. The first render of a run
  // seeds this silently, so a resumed save doesn't announce views it has had
  // for years. The ref holds reported ids rather than a flag because under
  // StrictMode this effect runs twice before `s` updates.
  const reportedGates = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!s.started) return;
    const firstPass = reportedGates.current === null;
    const reported = reportedGates.current ?? new Set<string>();
    reportedGates.current = reported;
    for (const id of GATED_TABS) {
      if (!tabAvailable(s, id) || s.seen.tabIds[id] || reported.has(id)) continue;
      reported.add(id);
      act({ type: 'NOTE_TAB_AVAILABLE', id, label: TAB_LABELS[id], announce: !firstPass });
    }
  });

  // A tab whose gate closes again (the last varsity team disbands) closes
  // with it.
  useEffect(() => {
    if (overlay && !tabAvailable(s, overlay.tab)) setOverlay(null);
  }, [overlay, s]);

  // The school's colours are the theme (see theme.ts), applied once the run
  // exists. The startup screen applies its own live pick before this.
  useEffect(() => {
    if (s.started) applySchoolColors(s.self.colors);
  }, [s.started, s.self.colors]);

  // The map's keys answer only while the player is looking at the map. The
  // build popup has no backdrop and is where the map's tools live, so it
  // takes only Escape from the map; panning, R and P keep working under it.
  // See hotkeys.ts, which owns both rules.
  const overlays: ShellOverlays = {
    overlayOpen: overlay !== null,
    buildOpen,
    logOpen: logOpen || ladderOpen,
    interrupted: s.pendingInterrupt !== null,
  };
  const mapBackOutEnabled = mapBackOutLive(overlays);
  const mapControlsEnabled = mapControlsLive(overlays);

  // Picking up a building and drawing a path are two jobs for the same
  // click, so exactly one is ever live: arming either drops the other.
  function setPlacingId(id: string | null) {
    setPlacingIdState(id);
    if (id !== null) setPathToolState(null);
  }
  function setPathTool(mode: CampusTool) {
    setPathToolState((cur) => (cur === mode ? null : mode));
    setPlacingIdState(null);
  }

  // Closing the build popup drops its path tool, but not a picked-up
  // building: collapsing the popup to see the ground is part of siting.
  function closeBuild() {
    setBuildOpenState(false);
    setPathToolState(null);
  }

  // The one slot: opening a tab closes the build popup, and vice versa.
  // Opening a tab also drops a picked-up building, so an armed ghost can't
  // survive behind a screen and site something by accident later.
  function openTab(tab: TabId | null, target?: string) {
    if (tab !== null && !tabAvailable(s, tab)) return;
    setOverlay(tab === null ? null : { tab, target });
    if (tab !== null) {
      closeBuild();
      setPlacingIdState(null);
    }
  }
  function inspectHall(hallId: string) {
    openTab(null);
    setInspectTarget(hallId);
  }
  function setBuildOpen(open: boolean) {
    if (!open) {
      closeBuild();
      return;
    }
    setBuildOpenState(true);
    setOverlay(null);
  }

  // The opening walkthrough drives the shell (see state/opening.ts). Each
  // transition into a stage acts once: 'site-hall' opens the build menu,
  // 'teaching' closes it and drops the pickup, 'found' opens the
  // Curriculum, and 'play' starts the clock (the game opens paused). On
  // mount, a save resumed mid-walk acts on the door-opening stages but not
  // on 'play'. The ref holds the last stage acted on so StrictMode's double
  // effect can't act twice.
  const stage: OpeningStage = s.events.opening.stage;
  const actedStage = useRef<OpeningStage | null>(null);
  useEffect(() => {
    if (!s.started) return;
    const prev = actedStage.current;
    if (prev === stage) return;
    actedStage.current = stage;
    if (stage === 'site-hall') setBuildOpen(true);
    else if (stage === 'teaching') { closeBuild(); setPlacingIdState(null); }
    else if (stage === 'found') openTab('curriculum');
    else if (stage === 'play' && prev !== null) setSpeed('real');
  }, [s.started, stage]);

  // One Escape ladder, top down, for the whole shell: the milestones and log popups, the
  // build menu, an open tab. Below that is the map's own back-out, handled
  // in CampusMap, whose Escape is enabled exactly when this handler has
  // nothing to close. An interrupt outranks all of it.
  useHotkeys((e) => {
    if (e.key !== 'Escape' || s.pendingInterrupt) return;
    if (ladderOpen) setLadderOpen(false);
    else if (logOpen) setLogOpen(false);
    // A building in hand is put down before the menu closes (Plan 34).
    else if (buildOpen && placingId) setPlacingIdState(null);
    else if (buildOpen) closeBuild();
    else if (overlay) openTab(null);
  }, s.started);

  const frontScreen = front === 'title' ? (
    <TitleScreen
      s={s}
      onContinue={() => setFrontState(null)}
      onNewCollege={() => { if (s.started) act({ type: 'RESET' }); setFrontState(null); }}
      onHall={() => setFront('hall')}
      onSettings={() => setFront('settings')}
      onCredits={() => setFront('credits')}
    />
  ) : front === 'hall' ? <HallOfFame onClose={closeFront} />
    : front === 'settings' ? <SettingsPanel onClose={closeFront} />
      : front === 'credits' ? <Credits onClose={closeFront} />
        : null;

  if (!s.started) {
    // On this screen the debug panel offers Load alone (see DebugPanel.tsx).
    return (
      <>
        {frontScreen ?? <StartupScreen onStart={(name, vernacular, colors) => act({ type: 'START_GAME', name, vernacular, colors, guided: true, seed: freshSeed() })} />}
        <DebugPanel s={s} act={act} exportRun={exportRun} />
      </>
    );
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
        backOutEnabled={mapBackOutEnabled}
        controlsEnabled={mapControlsEnabled}
        onOpenCurriculum={(sectionKey) => openTab('curriculum', sectionKey)}
        inspectTarget={inspectTarget}
        onInspectTargetConsumed={() => setInspectTarget(null)}
        onInspectedChange={setInspectedId}
        gait={!s.started || speed === 'paused' || s.pendingInterrupt || openingHoldsClock(s) ? 0 : SPEEDS.real / SPEEDS[speed]}
      />
      <MainMenu act={act} onHall={() => setFront('hall')} onSettings={() => setFront('settings')} onTitle={() => setFront('title')} />
      {frontScreen}
      {/* The school's pennant (Pennant.tsx); the tab's title takes that
          corner while a tab is open. */}
      {!overlay && <Pennant s={s} />}
      {/* Behind the playtest flag (see DebugPanel.tsx). Outside the one-slot
          rule: it stays open while you look at something else. */}
      <DebugPanel s={s} act={act} exportRun={exportRun} />

      <div className="app">
        {/* What waits on the map: the notes and the event panel step aside
            while a tab is open, and the ticker's NEXT points back to them
            (Plan 34: one notification system, V1-34). */}
        {!overlay && (
          <>
            <MilestoneNote s={s} act={act} />
            <BoardLetter s={s} act={act} />
            <DemandNote s={s} act={act} />
            <EventPanel s={s} act={act} />
          </>
        )}
        <LogTicker
          s={s}
          open={logOpen}
          onSetOpen={(o) => { setLogOpen(o); if (o) setLadderOpen(false); }}
          ladderOpen={ladderOpen}
          onSetLadderOpen={(o) => { setLadderOpen(o); if (o) setLogOpen(false); }}
          onGo={(go) => { if (go === 'build') setBuildOpen(true); else if (go === 'campus') openTab(null); else openTab(go); }}
          mapHidden={overlay !== null}
        />
        <Toolbar
          ref={toolbarRef}
          s={s}
          act={act}
          active={overlay?.tab ?? null}
          onChangeTab={openTab}
          buildOpen={buildOpen}
          onSetBuildOpen={setBuildOpen}
          speed={speed}
          setSpeed={setSpeed}
          weekProgress={weekProgress}
          placingId={placingId}
          onArmPlacement={setPlacingId}
          pathTool={pathTool}
          onSetPathTool={setPathTool}
        />

        {overlay && (
          <TabOverlay title={TAB_LABELS[overlay.tab]} onClose={() => openTab(null)}>
            {overlay.tab === 'faculty' && (
              <FacultyTab
                s={s}
                act={act}
                target={overlay.target}
                onTargetConsumed={() => setOverlay((cur) => (cur ? { tab: cur.tab } : cur))}
                onOpenCurriculum={(target) => openTab('curriculum', target)}
              />
            )}
            {overlay.tab === 'curriculum' && (
              <CurriculumTab
                s={s}
                act={act}
                target={overlay.target}
                onTargetConsumed={() => setOverlay((cur) => (cur ? { tab: cur.tab } : cur))}
                onInspectHall={inspectHall}
                onOpenFaculty={(field) => openTab('faculty', field)}
              />
            )}
            {overlay.tab === 'research' && <ResearchTab s={s} act={act} />}
            {overlay.tab === 'treasury' && <TreasuryTab s={s} act={act} />}
            {overlay.tab === 'students' && <StudentsTab s={s} />}
            {overlay.tab === 'athletics' && <AthleticsTab s={s} act={act} />}
            {overlay.tab === 'history' && <HistoryTab s={s} act={act} />}
          </TabOverlay>
        )}

        <InterruptModal s={s} act={act} />
        {/* The walkthrough's card (OpeningCoach.tsx); renders nothing once
            the stage is 'play'. Opens doors through the same setters, so the
            one-slot rule holds. */}
        <OpeningCoach
          s={s}
          act={act}
          buildOpen={buildOpen}
          hallOpen={overlay === null && inspectedId === FOUNDERS_HALL_ID}
          onOpenBuild={() => setBuildOpen(true)}
          onOpenHall={() => inspectHall(FOUNDERS_HALL_ID)}
        />
      </div>
    </>
  );
}
