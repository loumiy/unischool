import { forwardRef, useState } from 'react';
import type { GameState } from '../state/types';
import { TAB_LABELS, TAB_ORDER, type TabId } from './TabNav';
import BuildPopup from './BuildPopup';
import LogFeed from './LogStrip';
import ToolbarPopup from './ToolbarPopup';
import {
  FacultyIcon, CurriculumIcon, TreasuryIcon, AdmissionsIcon,
  StudentLifeIcon, HistoryIcon, AthleticsIcon, BuildIcon, LogIcon,
} from './icons';

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
}>(({ s, active, onChangeTab, placingId, onArmPlacement, pathTool, onSetPathTool }, ref) => {
  const [buildOpen, setBuildOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
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
        onClick={() => setBuildOpen((v) => !v)}
      >
        <BuildIcon />
        <span className="toolbar-build-label">Build</span>
      </button>

      {logOpen && (
        <ToolbarPopup title="Activity Log" onClose={() => setLogOpen(false)} className="log-popup">
          <LogFeed s={s} />
        </ToolbarPopup>
      )}

      {buildOpen && (
        <BuildPopup
          s={s}
          placingId={placingId}
          onArmPlacement={onArmPlacement}
          pathTool={pathTool}
          onSetPathTool={onSetPathTool}
          onClose={() => setBuildOpen(false)}
        />
      )}
    </div>
  );
});

export default Toolbar;
