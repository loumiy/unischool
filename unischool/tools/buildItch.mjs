// ---------------------------------------------------------------------
// THE ITCH.IO WEB BUILD (Plan 97D). itch.io serves an HTML game from a
// sub-path of its own domain, inside an iframe on the game's page, so the
// bundle must load from relative paths. This builds the game with
// `base: './'` and VITE_PLATFORM=itch into dist-itch/, then zips it as
// release/unischool-<version>-itch-web.zip with index.html at the root:
// the file to upload, ticked "This file will be played in the browser"
// (docs/store/itch-release.md).
//
//   npm run build:itch
//
// VITE_POSTHOG_KEY comes from the environment, as for any production
// build (the release workflow's repository secret, or
// .env.production.local on one's own machine); without it the build
// sends no statistics. The Vercel build (`npm run build`) is untouched and
// keeps `base: '/'`.
//
// It fails if the zip would break itch.io's limits: 1,000 files, 500 MB
// unzipped. The game is far below both (some 40 files, 3 MB).
// ---------------------------------------------------------------------

import { build } from 'vite';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist-itch');
const RELEASE = join(ROOT, 'release');
const MAX_FILES = 1000;
const MAX_BYTES = 500 * 1024 * 1024;

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
process.env.VITE_PLATFORM = 'itch';

await build({ root: ROOT, base: './', logLevel: 'warn', build: { outDir: OUT, emptyOutDir: true } });

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(OUT).sort();
const bytes = files.reduce((t, f) => t + statSync(f).size, 0);
if (!files.some((f) => relative(OUT, f) === 'index.html')) throw new Error('dist-itch/ has no index.html at its root');
if (files.length > MAX_FILES) throw new Error(`dist-itch/ holds ${files.length} files; itch.io takes at most ${MAX_FILES}`);
if (bytes > MAX_BYTES) throw new Error(`dist-itch/ is ${(bytes / 1e6).toFixed(1)} MB; itch.io takes at most 500 MB`);
const absolute = readFileSync(join(OUT, 'index.html'), 'utf8').match(/(?:src|href)="\/(?!\/)[^"]*"/g);
if (absolute) throw new Error(`index.html still loads from absolute paths, which break under itch.io's sub-path: ${absolute.join(', ')}`);

// A zip, written here so the build needs no zip tool on the machine (the
// release workflow runs on three systems). Deflated entries, a central
// directory, no extras.
function zip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  // 1980-01-01, the format's epoch: the same build zips to the same bytes.
  const time = 0;
  const date = (0 << 9) | (1 << 5) | 1;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, packed);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt16LE(0x0800, 8);
    head.writeUInt16LE(8, 10);
    head.writeUInt16LE(time, 12);
    head.writeUInt16LE(date, 14);
    head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(packed.length, 20);
    head.writeUInt32LE(data.length, 24);
    head.writeUInt16LE(nameBuf.length, 28);
    head.writeUInt32LE(offset, 42);
    central.push(head, nameBuf);
    offset += local.length + nameBuf.length + packed.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, dir, end]);
}

mkdirSync(RELEASE, { recursive: true });
const name = `unischool-${version}-itch-web.zip`;
const archive = zip(files.map((f) => ({ name: relative(OUT, f).split('\\').join('/'), data: readFileSync(f) })));
writeFileSync(join(RELEASE, name), archive);
console.log(`release/${name}: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB unzipped, ${(archive.length / 1e6).toFixed(1)} MB zipped`);
