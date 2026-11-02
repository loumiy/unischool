import { useEffect, useState } from 'react';
import CampusMap from './CampusMap';
import { readSave } from '../state/persistence';
import type { GameState } from '../state/types';
import { PITCHES } from './isoProjection';

// MOCKUP (TitleScreen.tsx's ?title=live): the campus behind the title and
// every screen reached from it (founding a college, the hall of fame, the
// settings, the credits), so they share one backdrop. The run's own campus
// when one is underway; otherwise a finished campus shipped with the game
// (assets/demo-campus.json: a Completionist's year 32, its buildings laid
// out on tools/layout.ts's precinct plan), loaded on its own so the game's
// first paint does not wait on it. Drawn by the real map with nothing
// bound: no clicks, no keys, only the walkers walking.
//
// A layer of its own over the game (styles.css's .title-backdrop), not a
// gap in the title: a panel or a menu left open in the game stays hidden
// under it.
//
// The plan view, straight down, turning slowly: the default on this branch
// (no ?title=), or ?orbit. Straight down nothing has height, so turning the
// camera is turning a flat picture: the map is drawn once and the
// stylesheet spins it (.title-backdrop-orbit), at no cost a frame.
const noop = () => {};
// How far out the plan view opens, against the framed campus.
const ORBIT_ZOOM = 0.55;

export default function TitleBackdrop({ run }: { run: GameState | null }) {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const orbit = !!q && (q.has('orbit') || !q.has('title'));
  const [demo, setDemo] = useState<GameState | null>(null);
  useEffect(() => {
    if (run) return;
    let live = true;
    void import('../assets/demo-campus.json?raw').then(({ default: raw }) => {
      const read = readSave(raw);
      if (live && 'state' in read) setDemo(read.state);
    });
    return () => { live = false; };
  }, [run]);
  const shown = run ?? demo;
  if (!shown) return null;
  return (
    <div className={`title-backdrop${orbit ? ' title-backdrop-orbit' : ''}`} inert aria-hidden="true">
      <CampusMap
        s={shown}
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
        zoomScale={orbit ? ORBIT_ZOOM : undefined}
      />
    </div>
  );
}
