import { forwardRef } from 'react';
import type { Action, CampusTool } from '../state/actions';
import type { GameState } from '../state/types';
import { TAB_LABELS, TAB_ORDER, tabAvailable, type TabId } from './TabNav';
import BuildPopup, { visibleBuildableIds } from './BuildPopup';
import { FundsAndStats, SchoolAndClock } from './StatusHeader';
import type { Speed } from '../engine/useGame';
import { visibleCourseIds } from '../tabs/CurriculumTab';
import {
  FacultyIcon, CurriculumIcon, EnrollmentIcon,
  StudentLifeIcon, HistoryIcon, AthleticsIcon, BuildIcon,
  ResearchIcon, HomeIcon,
} from './icons';

// Tabs whose icon can carry the red alert badge, and how each decides it has
// something unseen (see types.ts's SeenState). Only Curriculum has one;
// Faculty deliberately has none, since hiring is prompted where the shortage
// is felt (a course that will not start).
const TAB_ALERT: Partial<Record<TabId, (s: GameState) => boolean>> = {
  curriculum: (s) => visibleCourseIds(s).some((id) => !s.seen.courseIds[id]),
};

// Treasury has no icon: the funds button (StatusHeader.tsx's FundsAndStats)
// is its entry point. The row is also filtered per render by tabAvailable
// (TabNav.tsx's TAB_GATES).
const ICON_TAB_ORDER = TAB_ORDER.filter((id) => id !== 'treasury');

// Hand-rolled SVG icons (see icons.tsx); TAB_LABELS supplies each button's
// visible word, aria-label and title.
const TAB_ICONS: Record<Exclude<TabId, 'treasury'>, () => React.JSX.Element> = {
  faculty: FacultyIcon,
  curriculum: CurriculumIcon,
  research: ResearchIcon,
  enrollment: EnrollmentIcon,
  studentlife: StudentLifeIcon,
  history: HistoryIcon,
  athletics: AthleticsIcon,
};

// The docked bottom band: funds and headline stats on the left, Home, tab
// icons and Build in the middle, speed controls and the school's clock on
// the right. The build popup opens above it with no dimming backdrop,
// because siting is a map click made while the popup is open.
const Toolbar = forwardRef<HTMLDivElement, {
  s: GameState;
  // Only threaded to the build popup, which reports seen buildable ids.
  act: (a: Action) => void;
  active: TabId | null;
  onChangeTab: (tab: TabId | null) => void;
  // Build mode and an open tab share one slot, owned by App.tsx.
  buildOpen: boolean;
  onSetBuildOpen: (open: boolean) => void;
  speed: Speed;
  setSpeed: (speed: Speed) => void;
  // The live fraction of the current week for the clock's day squares
  // (StatusHeader.tsx's SchoolAndClock), read through a getter so this band
  // does not re-render as it moves.
  weekProgress: () => number;
  // The picked-up Buildable and the active path tool, owned by App.tsx (only
  // one is ever live).
  placingId: string | null;
  onArmPlacement: (id: string | null) => void;
  pathTool: CampusTool | null;
  onSetPathTool: (mode: CampusTool) => void;
}>(({ s, act, active, onChangeTab, buildOpen, onSetBuildOpen, speed, setSpeed, weekProgress, placingId, onArmPlacement, pathTool, onSetPathTool }, ref) => {

  // The opening walkthrough rings the Build button while its step is to site
  // the hall and the menu is closed (see state/opening.ts, .opening-target).
  const stage = s.events.opening.stage;
  const ringBuild = stage === 'site-hall' && !buildOpen;

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
        {/* Home leads the row: always in the same place, and active when
            nothing (tab or build popup) is open over the map. */}
        <button
          type="button"
          className={`toolbar-icon-btn ${active === null && !buildOpen ? 'active' : ''}`}
          aria-label="Campus map"
          title="Campus map"
          onClick={() => { onChangeTab(null); onSetBuildOpen(false); }}
        >
          <HomeIcon />
          <span className="toolbar-tab-label">Campus</span>
        </button>

        {ICON_TAB_ORDER.filter((id) => tabAvailable(s, id)).map((id) => {
          const Icon = TAB_ICONS[id];
          const isActive = active === id;
          // Suppressed on the active tab, so the badge never flashes for the
          // render before the tab marks its ids seen.
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
              {/* The word under the glyph, at every width: several icons look alike. */}
              <span className="toolbar-tab-label">{TAB_LABELS[id]}</span>
              {hasAlert && <span className="alert-badge" aria-hidden="true">!</span>}
            </button>
          );
        })}

        <button
          type="button"
          className={`toolbar-icon-btn toolbar-build-btn ${buildOpen ? 'active' : ''} ${ringBuild ? 'opening-target' : ''}`}
          aria-expanded={buildOpen}
          aria-label={buildOpen ? 'Close build menu' : 'Open build menu'}
          title="Build"
          onClick={() => onSetBuildOpen(!buildOpen)}
        >
          <BuildIcon />
          <span className="toolbar-build-label">Build</span>
          {/* Lit while any build category holds an unseen tile, open or not
              (see BuildPopup.tsx's per-tab dot). */}
          {visibleBuildableIds(s).some((id) => !s.seen.buildableIds[id]) && (
            <span className="alert-badge" aria-hidden="true">!</span>
          )}
        </button>
      </nav>

      <div className="toolbar-right">
        <SchoolAndClock s={s} speed={speed} setSpeed={setSpeed} weekProgress={weekProgress} />
      </div>

      {buildOpen && (
        <BuildPopup
          s={s}
          act={act}
          placingId={placingId}
          onArmPlacement={onArmPlacement}
          pathTool={pathTool}
          onSetPathTool={onSetPathTool}
          onClose={() => onSetBuildOpen(false)}
        />
      )}
    </div>
  );
});

export default Toolbar;
