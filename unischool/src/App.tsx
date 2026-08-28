import { useState } from 'react';
import { useGame } from './engine/useGame';
import type { GameState } from './state/types';
import StartupScreen from './components/StartupScreen';
import StatusHeader from './components/StatusHeader';
import InterruptModal from './components/InterruptModal';
import TabNav, { type TabId } from './components/TabNav';
import CampusTab from './tabs/CampusTab';
import FacultyTab from './tabs/FacultyTab';
import CurriculumTab from './tabs/CurriculumTab';
import TreasuryTab from './tabs/TreasuryTab';
import AdmissionsTab from './tabs/AdmissionsTab';
import AthleticsTab from './tabs/AthleticsTab';
import './styles.css';

// The dashboard shell: the persistent header/status bar and interrupt
// modal render above every tab (see StatusHeader.tsx/InterruptModal.tsx);
// each tab's own content is a self-contained component under src/tabs/.
export default function App() {
  const { state, act, speed, setSpeed } = useGame();
  const s: GameState = state;
  const [tab, setTab] = useState<TabId>('campus');

  if (!s.started) {
    return <StartupScreen onStart={(name, schoolType) => act({ type: 'START_GAME', name, schoolType })} />;
  }

  return (
    <div className="app">
      <StatusHeader s={s} speed={speed} setSpeed={setSpeed} act={act} />

      {s.gameOver && <div className="gameover">Game Over — <button onClick={() => act({ type: 'RESET' })}>Restart</button></div>}

      <InterruptModal s={s} act={act} />

      <TabNav active={tab} onChange={setTab} />

      {tab === 'campus' && <CampusTab s={s} act={act} />}
      {tab === 'faculty' && <FacultyTab s={s} act={act} />}
      {tab === 'curriculum' && <CurriculumTab s={s} act={act} />}
      {tab === 'treasury' && <TreasuryTab s={s} />}
      {tab === 'admissions' && <AdmissionsTab s={s} />}
      {tab === 'athletics' && <AthleticsTab />}
    </div>
  );
}
