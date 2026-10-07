import type { CampusTool } from './state/actions';
import { MILESTONES } from './data/ladderData';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { SPEEDS, useGame } from './engine/useGame';
import { openingHoldsClock } from './state/opening';
import { mapBackOutLive, mapControlsLive, useHotkeys, type ShellOverlays } from './components/hotkeys';
import type { GameState } from './state/types';
import { institutionName } from './state/types';
import StartupScreen from './components/StartupScreen';
import MainMenu from './components/MainMenu';
import TouchTitles from './components/TouchTitles';
import Toasts from './components/Toasts';
import TitleScreen from './components/TitleScreen';
import { applySettings, getSettings } from './settings';
import HallOfFame from './components/HallOfFame';
import SettingsPanel from './components/SettingsPanel';
import Credits from './components/Credits';
import Pennant from './components/Pennant';
import SoundControls from './components/audio/SoundControls';
import { useAudioDirector } from './components/audio/useAudio';
import { audio } from './components/audio/engine';
import InterruptModal from './components/InterruptModal';
import { GATED_TABS, TAB_LABELS, tabAvailable, type TabId } from './components/TabNav';
import CampusMap from './components/CampusMap';
import { FOUNDERS_HALL_ID } from './data/techData';
import Toolbar from './components/Toolbar';
import LogTicker from './components/LogTicker';
import InboxTab from './components/InboxTab';
import { finalReportUp, inboxBadge, inboxItems, INTERRUPT_ITEM_ID } from './systems/inbox/inbox';
import { forgetOpened, keepOpened, readOpened, unseenPause, type UnseenMemory } from './systems/inbox/unseen';
import TabOverlay from './components/TabOverlay';
import { useCssHeightVar } from './components/useCssHeightVar';
import { applySchoolColors } from './components/theme';
import OpeningCoach from './components/OpeningCoach';
import type { OpeningStage } from './state/types';
import FacultyTab, { FACULTY_VIEW_START, MARKET_TARGET, type FacultyViewMemory } from './tabs/FacultyTab';
import CurriculumTab from './tabs/CurriculumTab';
import ResearchTab from './tabs/ResearchTab';
import TreasuryTab from './tabs/TreasuryTab';
import StudentsTab from './tabs/StudentsTab';
import HistoryTab, { HISTORY_VIEW_START, type HistoryView } from './tabs/HistoryTab';
import AthleticsTab from './tabs/AthleticsTab';
import { freshSeed } from './engine/random';
import { noteTab } from './analytics/analytics';
import './styles.css';

// The playtest panel is in development builds only (Plan 70C): the public
// bundle does not contain it.
const DebugPanel = import.meta.env.DEV ? lazy(() => import('./components/DebugPanel')) : null;

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

// The four views with a letter of their own: the ones a player dips in and
// out of constantly. Every extra letter here is one the map can't use. Each
// key toggles, like clicking the tab's toolbar icon twice.
const TAB_HOTKEYS: Record<string, TabId> = {
  c: 'curriculum',
  f: 'faculty',
  l: 'students',
  i: 'inbox',
};

// 'found': the startup screen, founding a college (the run in progress, if
// any, is kept until its doors open).
type Front = 'title' | 'hall' | 'settings' | 'credits' | 'found';

const LADDER_TABS: ReadonlySet<TabId> = new Set(MILESTONES.flatMap((m) => m.tabs));

export default function App() {
  const { state, act, speed, setSpeed, weekProgress, exportRun, elsewhere, resumed, continueHere, openHere } = useGame();
  const s: GameState = state;
  // null = looking at the map. A tab plus an optional target inside it (e.g.
  // a school in the Curriculum), so there is one source of truth for what is
  // open. The tab consumes and clears the target, so the same link works
  // twice.
  const [overlay, setOverlay] = useState<{ tab: TabId; target?: string } | null>(null);
  // The front screens (Plan 34): the title the game opens on, and the hall,
  // the settings and the credits, reachable from it and from the menu. The
  // clock is paused while one is up. "Open it here" (Plan 79B) comes back
  // past the title, into the game it opened.
  const [front, setFrontState] = useState<Front | null>(resumed ? null : 'title');
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
  // The program whose tile opens with that hall's panel (NEXT's move, Plan 78D).
  const [inspectProgram, setInspectProgram] = useState<string | null>(null);
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
  // The founding notes read this session: the one letter the save does not
  // mark (systems/inbox/foundingNote.ts). Everything else the inbox holds
  // is read off the state (Plan 77).
  const [foundingRead, setFoundingRead] = useState<ReadonlySet<string>>(new Set());
  const inbox = inboxItems(s, { read: foundingRead });
  // The matters the player has opened this session: shown in the inbox's
  // reading pane, or reached by an arrival's Open (Plan 78E). Not saved, but
  // kept for the page's session under the run, so a reload reads them back
  // (Plan 95AA, the second review's H7-4; unseen.ts's keepOpened).
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => (s.started ? readOpened(s.self.name) : new Set()));
  useEffect(() => { if (s.started) keepOpened(s.self.name, opened); }, [opened]);
  const markOpened = (id: string) => setOpened((cur) => (cur.has(id) ? cur : new Set([...cur, id])));
  // The Faculty tab's view, sort and filters last used, for the session
  // (Plan 95G): held here, so they outlive the tab, and not in the save.
  const [facultyMemory, setFacultyMemory] = useState<FacultyViewMemory>(FACULTY_VIEW_START);
  // History's view last used, the same way (Plan 95H).
  const [historyView, setHistoryView] = useState<HistoryView>(HISTORY_VIEW_START);
  // What the last snapshot held, for telling what arrived (see below).
  const unseen = useRef<{ run: GameState; memory: UnseenMemory } | null>(null);
  // A stop (an interrupt) is answered in the inbox (Plan 77): while one is
  // up, the inbox is the only view, opened on it, with no way out but an
  // answer. The Final Report keeps its own page.
  const holding = s.pendingInterrupt !== null && !finalReportUp(s);
  const toolbarRef = useCssHeightVar('--toolbar-height');

  // Sound (Plan 34): the director hears the run, not the title screen; M
  // mutes wherever the player is.
  useAudioDirector(s.started && front !== 'title' && front !== 'found' ? s : null);
  useHotkeys((e) => { if (e.key.toLowerCase() === 'm') audio.toggleMute(); });

  // A front screen covers the whole game, so nothing behind it answers a
  // key: no tab letters, no Escape ladder, no speed keys, no map keys, and
  // no modal or coach card drawn over it.
  const shellLive = s.started && front === null;

  // C / F / L / I (see TAB_HOTKEYS). Held back while an interrupt is pending,
  // since that modal must be answered first.
  useHotkeys((e) => {
    if (s.pendingInterrupt) return;
    const tab = TAB_HOTKEYS[e.key.toLowerCase()];
    if (!tab) return;
    // openTab refuses an unavailable tab, so a letter can't route to a gated
    // view.
    openTab(overlay?.tab === tab ? null : tab);
  }, shellLive);

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
      // A tab a ladder milestone opens is announced by that milestone's note,
      // so the log line would say it twice (Plan 47).
      act({ type: 'NOTE_TAB_AVAILABLE', id, label: TAB_LABELS[id], announce: !firstPass && !LADDER_TABS.has(id) });
    }
  });

  // A new run starts from a clean shell: nothing of the last run's open
  // tab, pickup, path tool, menus or reported gates survives New Game.
  useEffect(() => {
    if (s.started) return;
    setOverlay(null);
    setInspectTarget(null);
    setInspectedId(null);
    setPlacingIdState(null);
    setPathToolState(null);
    setBuildOpenState(false);
    setLogOpen(false);
    setLadderOpen(false);
    setFoundingRead(new Set());
    setOpened(new Set());
    forgetOpened();
    setFacultyMemory(FACULTY_VIEW_START);
    setHistoryView(HISTORY_VIEW_START);
    unseen.current = null;
    reportedGates.current = null;
    actedStage.current = null;
    buildAfterHold.current = false;
  }, [s.started]);

  // A tab whose gate closes again (the last varsity team disbands) closes
  // with it.
  useEffect(() => {
    if (overlay && !tabAvailable(s, overlay.tab)) setOverlay(null);
  }, [overlay, s]);

  // The school's colors are the theme (see theme.ts), applied once the run
  // exists. The startup screen applies its own live pick before this.
  useEffect(() => {
    // Not while founding, which previews its own pick; backing out of it
    // puts the run's colors back.
    if (s.started && front !== 'found') applySchoolColors(s.self.colors);
  }, [s.started, s.self.colors, front]);

  // The map's keys answer only while the player is looking at the map. The
  // build popup has no backdrop and is where the map's tools live, so it
  // takes only Escape from the map; panning, R and P keep working under it.
  // See hotkeys.ts, which owns both rules.
  const overlays: ShellOverlays = {
    overlayOpen: overlay !== null,
    buildOpen,
    logOpen: logOpen || ladderOpen,
    interrupted: s.pendingInterrupt !== null,
    frontUp: front !== null,
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
    if (holding && tab !== 'inbox') return;
    // A tab opened, for the play statistics (analytics.ts).
    if (tab !== null && overlay?.tab !== tab) noteTab(tab);
    setOverlay(tab === null ? null : { tab, target });
    if (tab !== null) {
      closeBuild();
      setPlacingIdState(null);
    }
  }
  // A tab has landed on its target: clear it, keeping the tab open.
  const clearTarget = () => setOverlay((cur) => (cur ? { tab: cur.tab } : cur));
  function inspectHall(hallId: string, programId?: string) {
    if (holding) return;
    openTab(null);
    setInspectProgram(programId ?? null);
    setInspectTarget(hallId);
  }
  function setBuildOpen(open: boolean) {
    if (!open) {
      closeBuild();
      return;
    }
    if (holding) return;
    setBuildOpenState(true);
    setOverlay(null);
    // The build menu and the log popups share the bottom-left corner.
    setLogOpen(false);
    setLadderOpen(false);
  }

  // The opening walkthrough drives the shell (see state/opening.ts). Each
  // transition into a stage acts once: 'site-hall' opens the build menu,
  // 'appoint' closes it, drops the pickup and opens Founders Hall's panel
  // (where the first professor is appointed and the first program founded),
  // 'found' opens the panel unless 'appoint' already has, and 'play' starts
  // the clock (the game opens paused). On mount, a save resumed mid-walk
  // acts on the door-opening stages but not on 'play'. The ref holds the
  // last stage acted on so StrictMode's double effect can't act twice.
  const stage: OpeningStage = s.events.opening.stage;
  const actedStage = useRef<OpeningStage | null>(null);
  useEffect(() => {
    if (!s.started) return;
    const prev = actedStage.current;
    if (prev === stage) return;
    actedStage.current = stage;
    if (stage === 'site-hall') setBuildOpen(true);
    // Appointing and founding happen in the hall's panel, so that is what
    // opens; the panel stays open from one step to the next.
    else if (stage === 'appoint' || (stage === 'found' && prev !== 'appoint')) {
      closeBuild();
      setPlacingIdState(null);
      inspectHall(FOUNDERS_HALL_ID);
    }
    else if (stage === 'play' && prev !== null) setSpeed('real');
  }, [s.started, stage]);

  // A stop opens the inbox on itself (Plan 77), and each new stop or summer
  // beat re-points it there; once answered, the player is put back where
  // they were. Not under a front screen: the stop waits for the game.
  const holdKey = holding
    ? `${s.pendingInterrupt!.type}:${(s.pendingInterrupt!.payload as { beat?: number } | undefined)?.beat ?? ''}`
    : null;
  const beforeHold = useRef<{ tab: TabId; target?: string } | null | undefined>(undefined);
  // A letter's "Continue and open Build" (Plan 78B): the build menu opens
  // once the stop is answered, in place of the view before it.
  const buildAfterHold = useRef(false);
  useEffect(() => {
    if (!shellLive) return;
    if (holdKey !== null) {
      if (beforeHold.current === undefined) beforeHold.current = overlay?.tab === 'inbox' ? null : overlay;
      setOverlay({ tab: 'inbox', target: INTERRUPT_ITEM_ID });
      closeBuild();
      setPlacingIdState(null);
      setLogOpen(false);
      setLadderOpen(false);
    } else if (beforeHold.current !== undefined) {
      const back = beforeHold.current;
      beforeHold.current = undefined;
      if (buildAfterHold.current) {
        buildAfterHold.current = false;
        setBuildOpen(true);
      } else setOverlay(back && tabAvailable(s, back.tab) ? { tab: back.tab } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdKey, shellLive]);

  // No decision passes unseen (Plan 78E, systems/inbox/unseen.ts): a new
  // matter pauses the clock while the setting is on, and a matter's final
  // week, unopened, pauses it once whatever the setting. The news pauses it
  // only while "Pause for news" is on (Plan 95T). The same as the
  // player pressing pause; a stop or the walkthrough already holds the
  // clock, and neither rule acts under them. The memory starts over with a
  // run (a load or a new game is not an arrival).
  const openedRef = useRef(opened);
  openedRef.current = opened;
  useEffect(() => {
    if (!s.started) return;
    const last = unseen.current;
    const sameRun = last !== null && last.run.self.name === s.self.name && last.run.clock.year <= s.clock.year;
    const out = unseenPause(sameRun ? last.memory : null, {
      items: inbox,
      pauseOnArrival: getSettings().pauseOnArrival,
      pauseForNews: getSettings().pauseForNews,
      held: s.pendingInterrupt !== null || openingHoldsClock(s),
      opened: openedRef.current,
    });
    unseen.current = { run: s, memory: out.memory };
    if (out.pause) setSpeed('paused');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

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
  }, shellLive);

  // A new college (the title screen, the hall of fame, the Final Report's
  // Found another college, Plan 70J): the startup screen.
  // The title screen's Sandbox founds one the same way, as a sandbox run
  // (systems/sandbox), without the walkthrough.
  const [foundSandbox, setFoundSandbox] = useState(false);
  // The run in progress is not erased here but when the new one's doors
  // open (START_GAME replaces it), so backing out of the startup screen
  // loses nothing.
  const newCollege = (sandbox = false) => { setFoundSandbox(sandbox); setFront('found'); };

  const frontPage = front === 'title' ? (
    <TitleScreen
      s={s}
      onContinue={() => { if (continueHere()) setFrontState(null); }}
      onNewCollege={() => newCollege()}
      onSandbox={() => newCollege(true)}
      onHall={() => setFront('hall')}
      onSettings={() => setFront('settings')}
      onCredits={() => setFront('credits')}
    />
  ) : front === 'hall' ? <HallOfFame onClose={closeFront} onNewCollege={() => newCollege()} running={s.started ? institutionName(s.self) : undefined} />
    : front === 'settings' ? <SettingsPanel onClose={closeFront}><SoundControls /></SettingsPanel>
      : front === 'credits' ? <Credits onClose={closeFront} />
        : null;
  // Reached from the title, the hall, the settings and the credits keep its
  // painted quad behind their cards (styles.css's .front-art), so the title
  // does not drop to a bare page; reached from the game, they cover the map
  // as before.
  const frontScreen = frontPage && front !== 'title' && frontBack === 'title'
    ? <div className="front-art">{frontPage}</div>
    : frontPage;

  if (!s.started || front === 'found') {
    // On this screen the debug panel offers Load alone (see DebugPanel.tsx).
    return (
      <>
        {front !== 'found' && frontScreen ? frontScreen : (
          <StartupScreen
            sandbox={foundSandbox}
            replacing={s.started ? institutionName(s.self) : undefined}
            onBack={() => setFront('title')}
            onStart={(name, vernacular, colors) => {
              act({ type: 'START_GAME', name, vernacular, colors, guided: !foundSandbox, seed: freshSeed(), sandbox: foundSandbox || undefined });
              setFrontState(null);
            }}
          />
        )}
        {DebugPanel && <Suspense fallback={null}><DebugPanel s={s} act={act} exportRun={exportRun} /></Suspense>}
      </>
    );
  }

  // A modal (the Final Report's page, or the walkthrough's welcome) makes
  // everything behind it inert: no clicks, no focus, nothing read out. Every
  // other stop is answered in the inbox, which the shell holds open.
  const modalUp = shellLive && (finalReportUp(s) || stage === 'welcome');

  return (
    <>
      <TouchTitles />
      <div className="shell" inert={modalUp}>
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
          onOpenResearch={tabAvailable(s, 'research') ? (target) => openTab('research', target) : undefined}
          inspectTarget={inspectTarget}
          inspectProgram={inspectProgram}
          onInspectTargetConsumed={() => { setInspectTarget(null); setInspectProgram(null); }}
          // A building's panel and the build menu are one at a time (Plan
          // 96C): opening a panel closes the menu, and the map closes its
          // panel when the menu opens.
          onInspectedChange={(id) => { setInspectedId(id); if (id !== null) closeBuild(); }}
          buildOpen={buildOpen}
          resting={overlay !== null}
          gait={!s.started || speed === 'paused' || s.pendingInterrupt || openingHoldsClock(s) ? 0 : SPEEDS.real / SPEEDS[speed]}
        />
        <MainMenu s={s} act={act} onNewCollege={() => newCollege()} onHall={() => setFront('hall')} onSettings={() => setFront('settings')} onTitle={() => setFront('title')} />
        {/* The week's small news (Plan 70H), a school's banner, and what
            arrives in the inbox (Plan 77), each with a way to open it. */}
        <Toasts s={shellLive ? s : null} inboxOpen={overlay?.tab === 'inbox'} onOpenInbox={(id) => { markOpened(id); openTab('inbox', id); }} opened={opened} />
        {/* The school's pennant (Pennant.tsx); the tab's title takes that
            corner while a tab is open. */}
        {!overlay && <Pennant s={s} />}

        {/* dock-folded: something is open over the map, so on a phone the
            dock folds to its figures (styles.css's phone rules); each of
            these has its own close, which unfolds it. */}
        <div className={`app${overlay || buildOpen || logOpen || ladderOpen ? ' dock-folded' : ''}`}>
          <LogTicker
            s={s}
            open={logOpen}
            onSetOpen={(o) => { setLogOpen(o); if (o) { setLadderOpen(false); closeBuild(); } }}
            ladderOpen={ladderOpen}
            onSetLadderOpen={(o) => { setLadderOpen(o); if (o) { setLogOpen(false); closeBuild(); } }}
            onGo={(go, hallId, programId) => {
            if (go === 'build') setBuildOpen(true);
            else if (go === 'campus') openTab(null);
            else if (go === 'hall') { if (hallId) inspectHall(hallId, programId); }
            else openTab(go);
          }}
            inboxOpen={overlay?.tab === 'inbox'}
            onOpenMarket={(field) => openTab('faculty', `${MARKET_TARGET}${field}`)}
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
            speedKeysLive={shellLive}
            weekProgress={weekProgress}
            placingId={placingId}
            onArmPlacement={setPlacingId}
            pathTool={pathTool}
            onSetPathTool={setPathTool}
            inbox={inboxBadge(inbox)}
            held={holding}
          />

          {overlay && (
            <TabOverlay
              title={TAB_LABELS[overlay.tab]}
              onClose={holding ? undefined : () => openTab(null)}
              split={overlay.tab === 'inbox'}
            >
              {overlay.tab === 'faculty' && (
                <FacultyTab
                  s={s}
                  act={act}
                  target={overlay.target}
                  onTargetConsumed={clearTarget}
                  onOpenCurriculum={(target) => openTab('curriculum', target)}
                  memory={facultyMemory}
                  onRemember={setFacultyMemory}
                />
              )}
              {overlay.tab === 'curriculum' && (
                <CurriculumTab
                  s={s}
                  act={act}
                  target={overlay.target}
                  onTargetConsumed={clearTarget}
                  onOpenFaculty={(field) => openTab('faculty', field)}
                />
              )}
              {overlay.tab === 'research' && (
                <ResearchTab s={s} act={act} target={overlay.target} onTargetConsumed={clearTarget} />
              )}
              {overlay.tab === 'treasury' && <TreasuryTab s={s} act={act} />}
              {overlay.tab === 'students' && (
                <StudentsTab s={s} act={act} target={overlay.target} onTargetConsumed={clearTarget} />
              )}
              {overlay.tab === 'athletics' && <AthleticsTab s={s} act={act} />}
              {overlay.tab === 'history' && (
                <HistoryTab
                  s={s} act={act} target={overlay.target} onTargetConsumed={clearTarget} view={historyView} onView={setHistoryView}
                  onOpenCurriculum={(target) => openTab('curriculum', target)}
                />
              )}
              {overlay.tab === 'inbox' && (
                <InboxTab
                  s={s}
                  act={act}
                  target={overlay.target}
                  onTargetConsumed={clearTarget}
                  read={foundingRead}
                  onRead={(id) => setFoundingRead((cur) => new Set([...cur, id]))}
                  onSeen={markOpened}
                  onOpenTab={(tab) => {
                    if (tab !== 'build') openTab(tab);
                    // During a stop the menu waits for the answer (above).
                    else if (holding) buildAfterHold.current = true;
                    else setBuildOpen(true);
                  }}
                  onShowOnMap={inspectHall}
                />
              )}
            </TabOverlay>
          )}

        </div>
      </div>

      {/* Two tabs on one save (Plan 79B): another tab has taken up the
          college, so this one is paused and saves nothing. Outside the
          shell, so it answers over the Final Report's page too. */}
      {elsewhere && front === null && (
        <div className="elsewhere-banner" role="alert">
          <p className="elsewhere-banner-text">
            This college is open in another tab.
            <span className="elsewhere-banner-note">This tab is paused and saves nothing.</span>
          </p>
          <button type="button" className="btn-primary" onClick={openHere}>Open it here</button>
        </div>
      )}
      {frontScreen}
      {/* Behind the playtest flag (see DebugPanel.tsx). Outside the one-slot
          rule: it stays open while you look at something else. */}
      {DebugPanel && <Suspense fallback={null}><DebugPanel s={s} act={act} exportRun={exportRun} /></Suspense>}

      {/* Outside .app's stacking context, so the backdrop covers the menu
          and the pennant too. Neither draws over a front screen: the modal
          waits, unanswered, for the player to come back to the game. */}
      {shellLive && <InterruptModal s={s} act={act} onNewCollege={newCollege} />}
      {/* The walkthrough's card (OpeningCoach.tsx); renders nothing once
          the stage is 'play'. Opens doors through the same setters, so the
          one-slot rule holds. */}
      {shellLive && <OpeningCoach
        s={s}
        act={act}
        buildOpen={buildOpen}
        hallOpen={overlay === null && inspectedId === FOUNDERS_HALL_ID}
        onOpenBuild={() => setBuildOpen(true)}
        onOpenHall={() => inspectHall(FOUNDERS_HALL_ID)}
      />}
    </>
  );
}
