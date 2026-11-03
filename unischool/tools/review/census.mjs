// ---------------------------------------------------------------------
// THE CENSUS (Plan 123, pass A): what the game has, and what it serves.
//
//   npm run review:strings                 # first: the string table
//   npm run review:census                  # writes node_modules/.tmp/census/
//   npm run review:census -- --tabs data/tab-opens.json   # join PostHog tab opens
//
// A table, not a test. For every surface file (src/components, src/tabs):
// its size, the words it can show (from the string table), the player
// actions it dispatches, the GameState fields it reads and the systems it
// imports. For every player action (state/actions.ts): which surfaces
// dispatch it, so an action no surface dispatches is a mechanic only the
// harness can reach. For every GameState field: which surfaces read it, so
// a field no surface reads is state the player never sees (pass D's
// "hidden" edges start here). The reviewer adds the verdicts.
// ---------------------------------------------------------------------
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'node_modules/.tmp/census');
const args = process.argv.slice(2);
const tabsArg = args.includes('--tabs') ? args[args.indexOf('--tabs') + 1] : null;

const stringsPath = join(ROOT, 'node_modules/.tmp/strings/strings.json');
if (!existsSync(stringsPath)) { console.error('run `npm run review:strings` first'); process.exit(2); }
const strings = JSON.parse(readFileSync(stringsPath, 'utf8'));

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(join(dir, d.name)) : /\.(tsx?|mjs)$/.test(d.name) ? [join(dir, d.name)] : []);
const rel = (p) => relative(ROOT, p);

// ---- Player actions ----
const actionsSrc = readFileSync(join(SRC, 'state/actions.ts'), 'utf8');
const unionStart = actionsSrc.indexOf('export type Action =');
const union = actionsSrc.slice(unionStart, actionsSrc.indexOf(';\n\n', unionStart) + 1);
const actions = [...union.matchAll(/\{\s*type:\s*'([A-Z_]+)'/g)].map((m) => m[1]);

// ---- GameState's top-level fields ----
const typesSrc = readFileSync(join(SRC, 'state/types.ts'), 'utf8');
const gsStart = typesSrc.indexOf('export interface GameState {');
let depth = 0, i = typesSrc.indexOf('{', gsStart), end = i;
for (; i < typesSrc.length; i++) { if (typesSrc[i] === '{') depth++; else if (typesSrc[i] === '}') { depth--; if (depth === 0) { end = i; break; } } }
const gsBody = typesSrc.slice(typesSrc.indexOf('{', gsStart) + 1, end);
// Only lines at the interface's own depth.
const fields = [];
{ let d = 0; for (const line of gsBody.split('\n')) {
  if (d === 0) { const m = line.match(/^\s{2}(?:readonly\s+)?([a-zA-Z_]\w*)\??:/); if (m) fields.push(m[1]); }
  for (const ch of line.replace(/\/\/.*$/, '')) { if (ch === '{' || ch === '(' || ch === '[') d++; else if (ch === '}' || ch === ')' || ch === ']') d--; }
} }

// ---- Surfaces ----
const surfaceFiles = [...walk(join(SRC, 'components')), ...walk(join(SRC, 'tabs')), join(SRC, 'App.tsx')]
  .filter((f) => !/\/(audio|icons?)\//.test(f) || f.endsWith('.tsx'));
const wordsByFile = new Map();
const screensByFile = new Map();
for (const s of strings) {
  wordsByFile.set(s.file, (wordsByFile.get(s.file) ?? 0) + s.words);
  if (!screensByFile.has(s.file)) screensByFile.set(s.file, new Set());
  screensByFile.get(s.file).add(s.screen);
}
const fieldRe = new RegExp(`\\b(?:s|state|game|gs)\\??\\.(${fields.join('|')})\\b`, 'g');
const surfaces = surfaceFiles.map((f) => {
  const src = readFileSync(f, 'utf8');
  const r = rel(f);
  const dispatched = [...new Set([...src.matchAll(/type:\s*'([A-Z_]+)'/g)].map((m) => m[1]).filter((a) => actions.includes(a)))];
  const reads = [...new Set([...src.matchAll(fieldRe)].map((m) => m[1]))];
  const systems = [...new Set([...src.matchAll(/from '\.\.\/systems\/([a-z]+)/g)].map((m) => m[1]))];
  return { file: r, lines: src.split('\n').length, words: wordsByFile.get(r) ?? 0, screens: [...(screensByFile.get(r) ?? [])], dispatched, reads, systems };
});

// Who dispatches each action, counting any src file (data, hooks), and the harness.
const allSrc = walk(SRC).map((f) => ({ r: rel(f), src: readFileSync(f, 'utf8') }));
const simSrc = existsSync(join(ROOT, 'sim')) ? walk(join(ROOT, 'sim')).map((f) => ({ r: rel(f), src: readFileSync(f, 'utf8') })) : [];
const actionRows = actions.map((a) => {
  const re = new RegExp(`type:\\s*'${a}'`);
  const ui = surfaces.filter((s) => s.dispatched.includes(a)).map((s) => s.file);
  const other = allSrc.filter((f) => re.test(f.src) && !ui.includes(f.r) && !/state\/actions\.ts|engine\/reducer\.ts/.test(f.r)).map((f) => f.r);
  const sim = simSrc.filter((f) => re.test(f.src)).length;
  return { action: a, ui, other, simFiles: sim };
});
const fieldRows = fields.map((fld) => ({ field: fld, readBy: surfaces.filter((s) => s.reads.includes(fld)).map((s) => s.file) }));

// Strings in files no surface or data file imports? Flag screens whose
// files the string table lists but that the game no longer reaches is the
// reviewer's job; here, only the words per screen.
const screens = new Map();
for (const s of strings) { const e = screens.get(s.screen) ?? { strings: 0, words: 0 }; e.strings++; e.words += s.words; screens.set(s.screen, e); }

let tabOpens = null;
if (tabsArg) tabOpens = JSON.parse(readFileSync(tabsArg, 'utf8'));

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'census.json'), JSON.stringify({ actions: actionRows, fields: fieldRows, surfaces, screens: Object.fromEntries(screens), tabOpens }, null, 1));

const md = [];
md.push('# The census', '', 'Written by `npm run review:census` (`tools/review/census.mjs`). Every row is in `census.json`.', '');
md.push('## Totals', '');
md.push(`- Surface files (components, tabs, App): ${surfaces.length}, ${surfaces.reduce((a, s) => a + s.lines, 0).toLocaleString()} lines`);
md.push(`- Player-facing words in the string table: ${strings.reduce((a, s) => a + s.words, 0).toLocaleString()} in ${strings.length.toLocaleString()} strings`);
md.push(`- Player actions: ${actions.length}; dispatched by a surface: ${actionRows.filter((a) => a.ui.length).length}`);
md.push(`- GameState fields: ${fields.length}; read by a surface: ${fieldRows.filter((f) => f.readBy.length).length}`, '');
md.push('## Actions no surface dispatches', '', 'A mechanic the player cannot reach from the interface, or reaches only through another file (a hook, a data table).', '', '| Action | Other src files | Harness files |', '|---|---|---|');
for (const a of actionRows.filter((a) => !a.ui.length)) md.push(`| \`${a.action}\` | ${a.other.map((f) => `\`${f}\``).join(', ') || '—'} | ${a.simFiles} |`);
md.push('', '## Actions by how many surfaces dispatch them', '', '| Action | Surfaces |', '|---|---|');
for (const a of [...actionRows].filter((a) => a.ui.length).sort((x, y) => y.ui.length - x.ui.length)) md.push(`| \`${a.action}\` | ${a.ui.map((f) => f.replace(/^src\/(components|tabs)\//, '')).join(', ')} |`);
md.push('', '## GameState fields no surface reads', '', 'State the player never sees directly (it may still reach them through a derived figure).', '');
md.push(fieldRows.filter((f) => !f.readBy.length).map((f) => `\`${f.field}\``).join(', ') || '—');
md.push('', '## Surfaces, largest first by words', '', '| File | Lines | Words | Screens | Actions | Fields read | Systems |', '|---|---|---|---|---|---|---|');
for (const s of [...surfaces].sort((a, b) => b.words - a.words)) md.push(`| \`${s.file.replace(/^src\//, '')}\` | ${s.lines} | ${s.words} | ${s.screens.join(', ')} | ${s.dispatched.length} | ${s.reads.length} | ${s.systems.join(', ')} |`);
md.push('', '## Screens by words (from the string table)', '', '| Screen | Strings | Words |', '|---|---|---|');
for (const [k, v] of [...screens].sort((a, b) => b[1].words - a[1].words)) md.push(`| ${k} | ${v.strings} | ${v.words.toLocaleString()} |`);
if (tabOpens) { md.push('', '## Tab opens (PostHog)', '', '```json', JSON.stringify(tabOpens, null, 1), '```'); }
writeFileSync(join(OUT, 'census.md'), md.join('\n') + '\n');
console.log(`census: ${surfaces.length} surfaces, ${actions.length} actions (${actionRows.filter((a) => !a.ui.length).length} with no surface), ${fields.length} fields (${fieldRows.filter((f) => !f.readBy.length).length} unread) → ${rel(OUT)}/census.md`);
