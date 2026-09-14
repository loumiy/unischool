import { forwardRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { TAB_LABELS, TAB_ORDER, type TabId } from './TabNav';
import BuildPopup, { visibleBuildableIds } from './BuildPopup';
import { FundsAndStats, SchoolAndClock } from './StatusHeader';
import type { Speed } from '../engine/useGame';
import { visibleCourseIds } from '../tabs/CurriculumTab';
import { neededFacultyFields } from '../systems/techtree/techSystem';
import {
  FacultyIcon, CurriculumIcon, AdmissionsIcon,
  StudentLifeIcon, HistoryIcon, AthleticsIcon, BuildIcon,
  ResearchIcon,
} from './icons';

// Which tab icons can carry the small red alert badge, and how each decides
// it has something unseen (see types.ts's SeenState). Curriculum and Faculty
// are the only two TAB_ORDER entries with a badge of their own — every other
// tab (Treasury, Admissions, Student Life, History, Athletics) has no
// "new content you haven't looked at yet" concept, so it's simply absent
// from this table rather than wired to an always-false check.
const TAB_ALERT: Partial<Record<TabId, (s: GameState) => boolean>> = {
  curriculum: (s) => visibleCourseIds(s).some((id) => !s.seen.courseIds[id]),
  faculty: (s) => {
    const needed = neededFacultyFields(s);
    return s.candidates.some((c) => needed.has(c.field) && !s.seen.candidateIds[c.id]);
  },
};

// C3: Treasury has no icon of its own here — the funds button in the left
// zone (see StatusHeader.tsx's FundsAndStats) is its one entry point now,
// so the middle cluster only needs the tabs that button doesn't cover.
const ICON_TAB_ORDER = TAB_ORDER.filter((id) => id !== 'treasury');

// Tab icons come from icons.tsx (no icon library is installed — see that
// file's own module comment for why these are hand-rolled inline SVG
// rather than a new dependency). TAB_LABELS (TabNav.tsx) still supplies the
// words, now as each button's aria-label/title instead of visible text, so
// the tab set stays just as legible to a screen reader or a hover as it was
// before.
const TAB_ICONS: Record<Exclude<TabId, 'treasury'>, () => React.JSX.Element> = {
  faculty: FacultyIcon,
  curriculum: CurriculumIcon,
  research: ResearchIcon,
  admissions: AdmissionsIcon,
  studentlife: StudentLifeIcon,
  history: HistoryIcon,
  athletics: AthleticsIcon,
};

// C2 first folded the tab nav, the build rail, and the log strip into one
// docked bottom band; C3 goes further and absorbs the old topbar into the
// same band (see StatusHeader.tsx's module comment) — funds/headline stats
// in the left zone, the tab icons + build in the middle, speed controls and
// the school's own identity/clock in the right zone. Save/New Game/Credits
// moved up into MainMenu.tsx's own top-right overlay instead. The log
// ticker lives just above this band now (see LogTicker.tsx/App.tsx) rather
// than inside it — this component knows nothing about it.
//
// The build popup is the one thing this band can still pop open above
// itself — see ToolbarPopup's own module comment for why it carries no
// dimming backdrop: the campus map has to stay visible and clickable
// around it, since siting a building is a map click made while the popup
// deciding what to build is still open (see BuildPopup.tsx).
const Toolbar = forwardRef<HTMLDivElement, {
  s: GameState;
  // Only threaded through to the build popup, which reports seen buildable
  // ids through it (see types.ts's SeenState) — nothing else in this band
  // dispatches; the Curriculum/Faculty tabs report their own seen ids
  // straight from App.tsx's overlay, not through here.
  act: (a: Action) => void;
  active: TabId | null;
  onChangeTab: (tab: TabId | null) => void;
  speed: Speed;
  setSpeed: (speed: Speed) => void;
  // Which placeable Buildable is currently picked up for siting, and the
  // active path tool, if any — both lifted all the way to App.tsx now that
  // the build popup (not just the map itself) can arm either one. See
  // App.tsx's module comment for the shared "only one of build-pickup and
  // path-tool is ever live" rule this enforces.
  placingId: string | null;
  onArmPlacement: (id: string | null) => void;
  pathTool: 'draw' | 'erase' | null;
  onSetPathTool: (mode: 'draw' | 'erase') => void;
}>(({ s, act, active, onChangeTab, speed, setSpeed, placingId, onArmPlacement, pathTool, onSetPathTool }, ref) => {
  const [buildOpen, setBuildOpen] = useState(false);
  // Shared by both ways the build popup can close (the toolbar's own Build
  // button toggling off, and the popup's own ✕/Escape — see BuildPopup's
  // onClose below): either one drops whatever path tool was still armed,
  // the same "turn it off" toggle a second click on its own tile does
  // (setPathTool(mode) with mode already active clears it — see App.tsx). A
  // path tool is the build popup's own control, so it shouldn't outlive the
  // popup that armed it.
  function closeBuild() {
    setBuildOpen(false);
    if (pathTool) onSetPathTool(pathTool);
  }

  return (
    <div className="toolbar" ref={ref}>
      <div className="toolbar-left">
        <FundsAndStats
          s={s}
          treasuryOpen={active === 'treasury'}
          onOpenTreasury={() => onChangeTab(active === 'treasury' ? null : 'treasury')}
        />
      </div>

      <nav className="toolbar-tabs">
        {ICON_TAB_ORDER.map((id) => {
          const Icon = TAB_ICONS[id];
          const isActive = active === id;
          // Suppressed while this tab is the active one — see the module
          // comment above: the tab's own effect marks its visible ids seen
          // essentially instantly, but checking isActive here too means the
          // badge can never even flash on for the one render before that
          // effect commits, which is what makes "already had it open when
          // new content unlocked" show no badge at all.
          const hasAlert = !isActive && (TAB_ALERT[id]?.(s) ?? false);
          return (
            <button
              key={id}
              type="button"
              className={`toolbar-icon-btn ${isActive ? 'active' : ''}`}
              aria-expanded={isActive}
              aria-label={TAB_LABELS[id]}
              title={TAB_LABELS[id]}
              onClick={() => onChangeTab(isActive ? null : id)}
            >
              <Icon />
              {hasAlert && <span className="alert-badge" aria-hidden="true">!</span>}
            </button>
          );
        })}

        <button
          type="button"
          className={`toolbar-icon-btn toolbar-build-btn ${buildOpen ? 'active' : ''}`}
          aria-expanded={buildOpen}
          aria-label={buildOpen ? 'Close build menu' : 'Open build menu'}
          title="Build"
          onClick={() => (buildOpen ? closeBuild() : setBuildOpen(true))}
        >
          <BuildIcon />
          <span className="toolbar-build-label">Build</span>
          {/* Stays lit for as long as ANY category tab holds an unseen tile,
              whether or not the popup is open — opening the popup at its
              default tab is not the same as switching to the tab the new
              building is actually in (see BuildPopup.tsx's own per-tab dot). */}
          {visibleBuildableIds(s).some((id) => !s.seen.buildableIds[id]) && (
            <span className="alert-badge" aria-hidden="true">!</span>
          )}
        </button>
      </nav>

      <div className="toolbar-right">
        <SchoolAndClock s={s} speed={speed} setSpeed={setSpeed} act={act} />
      </div>

      {buildOpen && (
        <BuildPopup
          s={s}
          act={act}
          placingId={placingId}
          onArmPlacement={onArmPlacement}
          pathTool={pathTool}
          onSetPathTool={onSetPathTool}
          onClose={closeBuild}
        />
      )}
    </div>
  );
});

export default Toolbar;
