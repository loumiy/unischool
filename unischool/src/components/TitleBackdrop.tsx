import { useEffect, useState } from 'react';
import CampusMap from './CampusMap';
import { readSave } from '../state/persistence';
import type { GameState } from '../state/types';
import { PITCHES } from './isoProjection';

// MOCKUP (TitleScreen.tsx's ?title=live): the campus behind the title when
// there is no run to show. A finished campus shipped with the game
// (assets/demo-campus.json: a Completionist's year 32, its buildings laid
// out on tools/layout.ts's precinct plan), drawn by the real map with
// nothing bound: no clicks, no keys, only the walkers walking. Loaded on
// its own, so the game's first paint does not wait on it.
//
// ?orbit (with ?title=live): the plan view, straight down, turning slowly.
// Straight down nothing has height, so turning the camera is turning a flat
// picture: the map is drawn once and the stylesheet spins it
// (.title-backdrop-orbit), at no cost a frame.
const noop = () => {};

export default function TitleBackdrop() {
  const orbit = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('orbit');
  const [demo, setDemo] = useState<GameState | null>(null);
  useEffect(() => {
    let live = true;
    void import('../assets/demo-campus.json?raw').then(({ default: raw }) => {
      const read = readSave(raw);
      if (live && 'state' in read) setDemo(read.state);
    });
    return () => { live = false; };
  }, []);
  if (!demo) return null;
  return (
    <div className={`title-backdrop${orbit ? ' title-backdrop-orbit' : ''}`} inert aria-hidden="true">
      <CampusMap
        s={demo}
        act={noop}
        selectedId={null}
        onSelect={noop}
        pathTool={null}
        onSetPathTool={noop}
        backOutEnabled={false}
        controlsEnabled={false}
        onOpenCurriculum={noop}
        gait={1}
        startPitch={orbit ? PITCHES.length - 1 : undefined}
      />
    </div>
  );
}
