// ---------------------------------------------------------------------
// THE SHARE IMAGE (Plan 95Y, the second review's B6-1): public/og-image.jpg,
// the picture a link to the game unfurls with, retaken in one command.
//
//   npm run build && npx vite preview --port 4173 --strictPort   # in one shell
//   CAMPUS_URL=http://localhost:4173/ npm run share-image
//
// Three steps, each one of the repo's own tools (tools/README.md):
//   1. `scenario`: the Completionist plays to week 14 of year 32, the fall,
//      when the leaves have turned (seasons.ts) and before they fall;
//   2. `layout`: its buildings re-sited on the precinct plan;
//   3. `shot`: the campus alone (--bare), tilted two steps flatter so the
//      ring of land, the hills and the haze are in the frame, at the size
//      index.html's og:image tags declare (1200 by 630), drawn at 1600 by
//      840 and scaled down so the campus is sharp.
// Take it on the production build (`vite preview`): that is the build a
// visitor sees, and the canvas map it draws. The shot says which map drew.
//
// An argument overrides the out path, for a look before it is kept:
//   CAMPUS_URL=http://localhost:4173/ npm run share-image -- /tmp/og.jpg
// ---------------------------------------------------------------------
import { spawnSync } from 'node:child_process';

const out = process.argv[2] ?? 'public/og-image.jpg';
const save = 'node_modules/.tmp/share-image.json';
const laid = 'node_modules/.tmp/share-image-laid.json';
if (!process.env.CAMPUS_URL) console.warn('CAMPUS_URL is not set: shooting the dev server. Take the kept image on `vite preview`.');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npm', ['run', 'scenario', '--', '--player', 'Completionist', '--year', '32', '--week', '14',
  '--clear-modal', '--name', 'Blackmoor', '--colors', 'navy-gold', save]);
run('npm', ['run', 'layout', '--', save, laid]);
run('node', ['tools/shoot.mjs', laid, out, '--bare', '--size=1600,840', '--scale=0.75',
  '--tilt=-2', '--zoom=-2', '--pan=0,30', '--quality=88']);
