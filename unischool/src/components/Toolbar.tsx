import { forwardRef, useState } from 'react';
import type { Action } from '../state/actions';
import type { GameState } from '../state/types';
import { TAB_LABELS, TAB_ORDER, type TabId } from './TabNav';
import BuildPopup, { visibleBuildableIds } from './BuildPopup';
import LogFeed from './LogStrip';
import ToolbarPopup from './ToolbarPopup';
import { visibleCourseIds } from '../tabs/CurriculumTab';
import { neededFacultyFields } from '../systems/techtree/techSystem';
import {
  FacultyIcon, CurriculumIcon, TreasuryIcon, AdmissionsIcon,
  StudentLifeIcon, HistoryIcon, AthleticsIcon, BuildIcon, LogIcon,
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

// C2: the one cohesive bottom band. Tabs, the build menu, and the log used
// to be three separate floating pieces of chrome (TabNav in the topbar,
// BuildPanel as a permanent right-side rail, LogStrip as its own floating
// card) — this docks all three along the bottom edge instead, full width,
// as a single band. Forwards its ref so App.tsx can measure its real height
// with useCssHeightVar, exactly like the topbar: `.campus-map-canvas`
// insets its interactive area away from both, so a tile is never left on
// screen but unreachable under either.
//
// The build popup and the log popup (below) are the two things this band
// can pop open above itself. Neither is a TabOverlay: see ToolbarPopup's
// own module comment for why they carry no dimming backdrop — the campus
// map has to stay visible and clickable around them, especially the build
// popup, since siting a building is now a map click made while the popup
// deciding what to build is still open (see BuildPopup.tsx).
//
// Tab icons come from icons.tsx (no icon library is installed — see that
// file's own module comment for why these are hand-rolled inline SVG
// rather than a new dependency). TAB_LABELS (TabNav.tsx) still supplies the
// words, now as each button's aria-label/title instead of visible text, so
// the tab set stays just as legible to a screen reader or a hover as it was
// before.
const TAB_ICONS: Record<TabId, () => React.JSX.Element> = {
  faculty: FacultyIcon,
  curriculum: CurriculumIcon,
  treasury: TreasuryIcon,
  admissions: AdmissionsIcon,
  studentlife: StudentLifeIcon,
  history: HistoryIcon,
  athletics: AthleticsIcon,
};

const Toolbar = forwardRef<HTMLDivElement, {
  s: GameState;
  // Only threaded through to the build popup, which reports seen buildable
  // ids through it (see types.ts's SeenState) — nothing else in this band
  // dispatches; the Curriculum/Faculty tabs report their own seen ids
  // straight from App.tsx's overlay, not through here.
  act: (a: Action) => void;
  active: TabId | null;
  onChangeTab: (tab: TabId | null) => void;
  // Which placeable Buildable is currently picked up for siting, and the
  // active path tool, if any — both lifted all the way to App.tsx now that
  // the build popup (not just the map itself) can arm either one. See
  // App.tsx's module comment for the shared "only one of build-pickup and
  // path-tool is ever live" rule this enforces.
  placingId: string | null;
  onArmPlacement: (id: string | null) => void;
  pathTool: 'draw' | 'erase' | null;
  onSetPathTool: (mode: 'draw' | 'erase') => void;
}>(({ s, act, active, onChangeTab, placingId, onArmPlacement, pathTool, onSetPathTool }, ref) => {
  const [buildOpen, setBuildOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
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
  // Log entries are newest-first (see reducer.ts's s.log.unshift), so the
  // ticker's "latest line" is simply the first one.
  const latest = s.log[0];

  return (
    <div className="toolbar" ref={ref}>
      <div className="toolbar-log">
        <button
          type="button"
          className={`toolbar-icon-btn ${logOpen ? 'active' : ''}`}
          aria-expanded={logOpen}
          aria-label={logOpen ? 'Close activity log' : 'Open activity log'}
          title="Activity log"
          onClick={() => setLogOpen((v) => !v)}
        >
          <LogIcon />
        </button>
        <span className="toolbar-log-ticker">
          {latest ? <>Y{latest.year}W{latest.week} · {latest.message}</> : 'No activity yet.'}
        </span>
      </div>

      <nav className="toolbar-tabs">
        {TAB_ORDER.map((id) => {
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
      </nav>

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

      {logOpen && (
        <ToolbarPopup title="Activity Log" onClose={() => setLogOpen(false)} className="log-popup">
          <LogFeed s={s} />
        </ToolbarPopup>
      )}

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
