// Walkers behind buildings (Plan 42, Walkers.tsx's coveringBuildings): a
// walker is cut by every building nearer the camera whose outline is over
// it, and by no building that is not; the one a walker was cut by used to
// be the first nearer building whose box came within twenty units, which
// could cover nothing and leave the building that did cover it unapplied.

import { MAX_CLIPS, coveringBuildings, silhouetteOf } from '../src/components/Walkers';
import { DEFAULT_CAMERA, cameraAxes, project, setCamera, VIEWS } from '../src/components/isoProjection';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('walker occlusion tests');

setCamera(DEFAULT_CAMERA);
const ax = () => cameraAxes();
const at = (col: number, row: number) => ({ pos: { col, row }, p: project(col, row) });

// ---- A walker behind a building is cut by it; one in front is not ----
{
  // At the opening view a building at a higher column than the walker is
  // the nearer of the two (depthSort.ts).
  const hall = silhouetteOf(20, 20, 6, 6, 60);
  const { sinA, cosA } = ax();
  const behind = at(19.5, 23);
  const front = at(26.5, 23);
  assert(coveringBuildings([hall], behind.p, behind.pos, sinA, cosA).length === 1, 'a walker just behind a building is cut by it');
  assert(coveringBuildings([hall], front.p, front.pos, sinA, cosA).length === 0, 'one just in front of it is not');
}

// ---- The building actually in front is the one applied ----
{
  const { sinA, cosA } = ax();
  // Find a spot just behind a tall building, where it covers the figure.
  const tall = silhouetteOf(30, 30, 5, 5, 120);
  let hidden: { col: number; row: number } | null = null;
  for (let c = 28; c < 36 && !hidden; c += 0.5) {
    for (let r = 28; r < 36 && !hidden; r += 0.5) {
      const inFoot = c >= 30 && c <= 35 && r >= 30 && r <= 35;
      if (inFoot) continue;
      const w = at(c, r);
      if (coveringBuildings([tall], w.p, w.pos, sinA, cosA).length === 1) hidden = { col: c, row: r };
    }
  }
  assert(hidden !== null, 'somewhere just behind a tall building, it hides the walker');
  if (hidden) {
    const w = at(hidden.col, hidden.row);
    // A decoy: nearer the camera than the walker, its box within twenty
    // units of the figure, but its outline nowhere over it. Listed first,
    // as the old test took the first it found.
    let decoy = null;
    for (let dc = -6; dc <= 6 && !decoy; dc++) {
      for (let dr = -6; dr <= 6 && !decoy; dr++) {
        const s = silhouetteOf(hidden.col + dc, hidden.row + dr, 1, 1, 4);
        const clearOfWalker = hidden.col < s.col || hidden.col > s.col + 1 || hidden.row < s.row || hidden.row > s.row + 1;
        const nearBox = w.p.x > s.minX - 20 && w.p.x < s.maxX + 20 && w.p.y > s.minY - 20 && w.p.y < s.maxY + 20;
        if (clearOfWalker && nearBox && coveringBuildings([s], w.p, w.pos, sinA, cosA).length === 0) {
          const nearer = (s.col >= hidden.col && sinA > 0) || (hidden.col >= s.col + s.w && sinA < 0) || (s.row >= hidden.row && cosA > 0) || (hidden.row >= s.row + s.h && cosA < 0);
          if (nearer) decoy = s;
        }
      }
    }
    assert(decoy !== null, 'a nearer building whose box is close but whose outline misses the walker exists');
    if (decoy) {
      const got = coveringBuildings([decoy, tall], w.p, w.pos, sinA, cosA);
      assert(got.length === 1 && got[0] === 1, `the walker is cut by the building over it, not the first nearer one (${JSON.stringify(got)})`);
    }
  }
}

// ---- Several at once, and in every view ----
{
  for (const azimuth of VIEWS) {
    setCamera({ ...DEFAULT_CAMERA, azimuth });
    const { sinA, cosA } = ax();
    const shapes = [silhouetteOf(10, 10, 4, 4, 200), silhouetteOf(10, 14, 4, 4, 200), silhouetteOf(14, 10, 4, 4, 200), silhouetteOf(14, 14, 4, 4, 200)];
    let most = 0;
    for (let c = 6; c < 22; c += 0.5) {
      for (let r = 6; r < 22; r += 0.5) {
        if (c > 10 && c < 18 && r > 10 && r < 18) continue;
        const w = at(c, r);
        const got = coveringBuildings(shapes, w.p, w.pos, sinA, cosA);
        most = Math.max(most, got.length);
        for (const i of got) {
          const s = shapes[i];
          const nearer = (s.col >= c && sinA > 0) || (c >= s.col + s.w && sinA < 0) || (s.row >= r && cosA > 0) || (r >= s.row + s.h && cosA < 0);
          if (!nearer) assert(false, `a building behind the walker never cuts it (view ${azimuth.toFixed(2)}, ${c},${r})`);
        }
      }
    }
    assert(most >= 2 && most <= MAX_CLIPS, `behind a block of tall buildings a walker can be cut by two at once (view ${azimuth.toFixed(2)}: ${most})`);
  }
  setCamera(DEFAULT_CAMERA);
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
