import { useState } from 'react';
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
import FacultyTab from './tabs/FacultyTab';
import CurriculumTab from './tabs/CurriculumTab';
import TreasuryTab from './tabs/TreasuryTab';
import AdmissionsTab from './tabs/AdmissionsTab';
import AthleticsTab from './tabs/AthleticsTab';
import './styles.css';

// The dashboard shell, built around the campus map as the central
// interface: the map holds the middle of the screen at all times, the
// build panel sits in the side rail beside it, and the log runs underneath.
// Every OTHER view (Faculty, Curriculum, Treasury, Admissions, Athletics)
// pops up as a dismissible overlay ON TOP of the map rather than replacing
// it — so the map is the one screen the player always comes back to, and
// no view is ever more than one Escape away from it.
//
// The tab components themselves are untouched by this: they still read
// their slice of GameState and dispatch actions exactly as before, and know
// nothing about being rendered in an overlay.
export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s: GameState = state;
  // null = looking at the map itself, with nothing open over it.
  const [overlay, setOverlay] = useState<TabId | null>(null);

  if (!s.started) {
    return <StartupScreen onStart={(name, schoolType) => act({ type: 'START_GAME', name, schoolType })} />;
  }

  return (
    <div className="app">
      <StatusHeader s={s} speed={speed} setSpeed={setSpeed} act={act} />

      {s.gameOver && <div className="gameover">Game Over — <button onClick={() => act({ type: 'RESET' })}>Restart</button></div>}

      <InterruptModal s={s} act={act} />

      <TabNav active={overlay} onChange={setOverlay} />

      <main className="game-surface">
        <div className="map-column">
          <CampusMap s={s} act={act} />
          <LogStrip s={s} />
        </div>

        <BuildPanel s={s} act={act} />

        {overlay && (
          <TabOverlay title={TAB_LABELS[overlay]} onClose={() => setOverlay(null)}>
            {overlay === 'faculty' && <FacultyTab s={s} act={act} />}
            {overlay === 'curriculum' && <CurriculumTab s={s} act={act} />}
            {overlay === 'treasury' && <TreasuryTab s={s} />}
            {overlay === 'admissions' && <AdmissionsTab s={s} />}
            {overlay === 'athletics' && <AthleticsTab />}
          </TabOverlay>
        )}
      </main>
    </div>
  );
}
