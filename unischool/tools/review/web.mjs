// ---------------------------------------------------------------------
// THE WEB, A FIRST DRAFT (Plan 123, pass D): which systems feed which.
//
//   npm run review:web                     # writes node_modules/.tmp/web/
//
// Reads the imports between src/systems/<name>/ folders (and the weekly
// turn in engine/reducer.ts, which calls them), and which surfaces import
// each system. An import is not a causal edge, so this is only a draft for
// the reviewer to correct: they keep the edges where A really changes B,
// and mark each one seen, told or hidden. It also counts, per system, the
// surfaces that import it: a system with many edges but one surface is
// work the player may not see.
// ---------------------------------------------------------------------
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'node_modules/.tmp/web');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(join(dir, d.name)) : /\.tsx?$/.test(d.name) ? [join(dir, d.name)] : []);

const systems = readdirSync(join(SRC, 'systems'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const edges = new Map(); // "a>b" → count of import lines
const loc = {};
for (const sys of systems) {
  const files = walk(join(SRC, 'systems', sys)).filter((f) => !f.includes('.test.'));
  loc[sys] = files.reduce((a, f) => a + readFileSync(f, 'utf8').split('\n').length, 0);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/from '\.\.\/(?:\.\.\/systems\/)?([a-z]+)\//g)) {
      const to = m[1];
      if (to !== sys && systems.includes(to)) edges.set(`${to}>${sys}`, (edges.get(`${to}>${sys}`) ?? 0) + 1);
    }
  }
}
// Surfaces importing each system.
const surfaceFiles = [...walk(join(SRC, 'components')), ...walk(join(SRC, 'tabs')), join(SRC, 'App.tsx')];
const shownBy = Object.fromEntries(systems.map((s) => [s, []]));
for (const f of surfaceFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from '(?:\.\.\/)+systems\/([a-z]+)/g)) if (shownBy[m[1]] && !shownBy[m[1]].includes(f)) shownBy[m[1]].push(relative(SRC, f));
}
const degree = Object.fromEntries(systems.map((s) => [s, { in: 0, out: 0 }]));
for (const k of edges.keys()) { const [a, b] = k.split('>'); degree[a].out++; degree[b].in++; }

mkdirSync(OUT, { recursive: true });
const md = ['# The web, a first draft', '', 'Written by `npm run review:web` (`tools/review/web.mjs`). An edge `A → B` means a file in system B imports from system A (B reads A). Imports, not causes: the reviewer corrects this.', ''];
md.push('| System | Lines | Feeds (out) | Fed by (in) | Surfaces importing it |', '|---|---|---|---|---|');
for (const s of [...systems].sort((a, b) => (degree[a].in + degree[a].out) - (degree[b].in + degree[b].out))) {
  md.push(`| ${s} | ${loc[s]} | ${degree[s].out} | ${degree[s].in} | ${shownBy[s].length} |`);
}
md.push('', '## Edges', '', '```mermaid', 'graph LR');
for (const [k, n] of [...edges].sort()) { const [a, b] = k.split('>'); md.push(`  ${a} -->|${n}| ${b}`); }
md.push('```');
writeFileSync(join(OUT, 'web.md'), md.join('\n') + '\n');
writeFileSync(join(OUT, 'web.json'), JSON.stringify({ systems, loc, degree, edges: Object.fromEntries(edges), shownBy }, null, 1));
console.log(`web: ${systems.length} systems, ${edges.size} import edges → ${relative(ROOT, OUT)}/web.md`);
