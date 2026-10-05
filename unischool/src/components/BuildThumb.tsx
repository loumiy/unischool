import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Buildable, Vernacular } from '../state/types';
import BuildingMotif, { drawnHeightOf, materialOf } from './buildingMotifs';
import { groundProps } from './groundMarkings';
import { motifOf } from './buildingSpec';
import { DEFAULT_CAMERA, currentCamera, polyPoints, setCamera } from './isoProjection';
import { depthOrder } from './depthSort';
import { castShadow } from './light';
import { orientedFootprint } from '../state/campusMap';

// The build menu's tiles show the building itself (Plan 94), drawn by the
// map's own BuildingMotif in the college's vernacular, under construction
// when it is going up. Always from the default camera, so a tile does not
// turn with the map, and each drawing is made once and kept as markup: a
// menu of thirty buildings costs thirty drawings a session, not one a render.

// CampusMap's inset, so the building sits in its footprint as on the map.
const INSET = 0.06;
// The smallest box a drawing is fitted to, in projected units: a statue
// stays a statue beside a hall rather than filling the tile.
const MIN_BOX = 70;

// What a tile's drawing depends on: a renovation or a venue's expansion
// redraws it.
export function thumbKey(t: Buildable, v: Vernacular): string {
  return [t.id, v, t.status === 'developing' ? 'dev' : '', t.tier ?? '', t.expansions ?? 0, t.floorsAdded ?? 0].join('|');
}

// The drawing as an element, for whichever camera is current. Pure, so the
// tests render every placeable through it (test/build-thumb.test.ts).
export function ThumbDrawing({ t, vernacular }: { t: Buildable; vernacular: Vernacular }) {
  const developing = t.status === 'developing';
  const fp = orientedFootprint(t, 0);
  const d = { col: INSET, row: INSET, w: fp.w - INSET * 2, h: fp.h - INSET * 2, facing: 0 as const };
  const grounds = motifOf(t) === 'grounds';
  const lift = drawnHeightOf(t, developing, vernacular);
  const props = grounds
    ? depthOrder(groundProps(t.facilityType, d.col, d.row, d.w, d.h, t.tier, developing && t.renovatingFrom === undefined, t.id, t.expansions ?? 0))
    : [];
  return (
    <svg className="campus-map-svg" xmlns="http://www.w3.org/2000/svg">
      <g>
        {!grounds && lift > 0 && <polygon className="campus-building-shadow" points={polyPoints(castShadow(d.col, d.row, d.w, d.h, lift))} />}
        <BuildingMotif t={t} p={d} material={materialOf(t, vernacular)} vernacular={vernacular} developing={developing} />
        {props.map((pr) => <g key={pr.key}>{pr.node}</g>)}
      </g>
    </svg>
  );
}

const drawn = new Map<string, string>();

// Draws one tile's building off screen at the default camera, fits the
// viewBox to what was drawn, and keeps the markup. The camera is swapped
// and put back inside this one synchronous call, so the map never renders
// at the thumbnail's camera (isoProjection.ts's setCamera). Runs from a
// timer, never inside a render, as flushSync requires.
function draw(t: Buildable, v: Vernacular): string {
  const key = thumbKey(t, v);
  const kept = drawn.get(key);
  if (kept !== undefined) return kept;
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden';
  document.body.appendChild(host);
  const root = createRoot(host);
  const was = currentCamera();
  setCamera(DEFAULT_CAMERA);
  let markup = '';
  try {
    flushSync(() => root.render(<ThumbDrawing t={t} vernacular={v} />));
    const svg = host.querySelector('svg');
    const g = svg?.querySelector('g');
    if (svg && g) {
      const b = g.getBBox();
      const w = Math.max(b.width, MIN_BOX);
      const h = Math.max(b.height, MIN_BOX * 0.6);
      const pad = Math.max(w, h) * 0.05;
      // Centred across, standing on the bottom edge of the box.
      const x = b.x + b.width / 2 - w / 2 - pad;
      const y = b.y + b.height - h - pad;
      svg.setAttribute('viewBox', `${x} ${y} ${w + pad * 2} ${h + pad * 2}`);
      svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
      svg.setAttribute('aria-hidden', 'true');
      markup = host.innerHTML;
    }
  } finally {
    setCamera(was);
    root.unmount();
    host.remove();
  }
  drawn.set(key, markup);
  return markup;
}

export default function BuildThumb({ t, vernacular }: { t: Buildable; vernacular: Vernacular }) {
  const key = thumbKey(t, vernacular);
  const [markup, setMarkup] = useState(() => drawn.get(key) ?? null);
  useEffect(() => {
    const kept = drawn.get(key);
    if (kept !== undefined) { setMarkup(kept); return; }
    const timer = window.setTimeout(() => setMarkup(draw(t, vernacular)), 0);
    return () => window.clearTimeout(timer);
    // `key` stands for t and vernacular.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <span className="build-thumb" dangerouslySetInnerHTML={{ __html: markup ?? '' }} />;
}
