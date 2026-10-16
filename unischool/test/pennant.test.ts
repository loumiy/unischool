// ---------------------------------------------------------------------
// A name on the pennant never splits a word (Plan 104K). S1 named the
// college "Baltimoore" and, at the largest text, the banner broke it as
// "Baltimoor / e College": the size was picked by the whole name's length,
// and at that size the ten-letter word ran wider than the line. Pinned:
//
//   - over short names, long names, one long word and "Baltimoore
//     College", at every text size, the size chosen fits the longest word
//     on the banner's line; past the smallest size the type is set to fit
//     it, down to a floor only a nonsense word reaches;
//   - the size is never larger than the name's length asks for;
//   - the letter widths it reckons with match whole words measured in the
//     browser, and its sizes are the ones styles.css draws.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINE_PX, MIN_FIT_PX, NAME_SIZES, TEXT_2XL_PX, nameSize, wordEm } from '../src/components/Pennant';
import { TEXT_SCALES } from '../src/settings';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('pennant tests');

// Whole words set in the display face at 800, measured in Chromium (em).
const MEASURED: Record<string, number> = { Baltimoore: 5.384, Wolverhampton: 7.861, Massachusetts: 7.48 };
for (const [word, em] of Object.entries(MEASURED)) {
  assert(Math.abs(wordEm(word) - em) / em < 0.02, `${word} reckons ${wordEm(word).toFixed(3)}em, measured ${em}em`);
}

// The sizes the CSS draws.
const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');
for (const n of NAME_SIZES.slice(1)) {
  const m = new RegExp(`\\.pennant-name\\.${n.size} \\{ font-size: calc\\(var\\(--text-2xl\\) \\* ([\\d.]+)\\)`).exec(css);
  assert(m !== null && Number(m[1]) === n.share, `the ${n.size} size is ${n.share} of --text-2xl in styles.css (${m?.[1]})`);
}
assert(/--text-2xl: calc\(22px \* var\(--text-scale\)\)/.test(css) && TEXT_2XL_PX === 22, '--text-2xl is 22px at the smallest text');

const NAMES = [
  'Ely College', 'Baltimoore College', 'Wormwood College', 'Wolverhampton College', 'Massachusetts Polytechnic',
  'The College of Saint Augustine and All Souls', 'Mmmmmmmmmmmmmmmmmm College', 'Bay State University', 'Halifax College',
];
for (const name of NAMES) {
  const longest = name.split(' ').reduce((a, b) => (wordEm(b) > wordEm(a) ? b : a));
  for (const scale of TEXT_SCALES) {
    const { size, fitPx } = nameSize(name, scale);
    const i = NAME_SIZES.findIndex((n) => n.size === size);
    const px = fitPx ?? TEXT_2XL_PX * NAME_SIZES[i].share * scale;
    const width = wordEm(longest) * px;
    assert(width <= LINE_PX || fitPx === MIN_FIT_PX, `${name} at ${scale}×: ${size}${fitPx ? ` at ${fitPx}px` : ''}, "${longest}" ${width.toFixed(0)}px of ${LINE_PX}`);
    const byLength = NAME_SIZES.findIndex((n) => name.length <= n.maxLength);
    assert(i >= byLength || fitPx !== null, `${name} at ${scale}×: never larger than its length asks for`);
    assert(fitPx === null || size === 'longest', `${name} at ${scale}×: fitted only past the smallest size`);
    // No smaller than it needs: the next size up would not fit the word.
    if (i > byLength && fitPx === null) {
      const up = TEXT_2XL_PX * NAME_SIZES[i - 1].share * scale;
      assert(wordEm(longest) * up > LINE_PX, `${name} at ${scale}×: no smaller than the word needs`);
    }
  }
}
assert(nameSize('Baltimoore College', 1).size === 'long', 'Baltimoore College keeps its size at the smallest text');
assert(nameSize('Baltimoore College', 1.3).size !== 'long', `and takes a smaller one at the largest (${nameSize('Baltimoore College', 1.3).size})`);
assert(nameSize('Ely College', 1).size === 'full' && nameSize('Ely College', 1).fitPx === null, 'a short name takes the full size');
assert(nameSize('Wolverhampton College', 1.3).fitPx !== null, 'Wolverhampton at the largest text is fitted');
assert(nameSize('Mmmmmmmmmmmmmmmmmm College', 1).fitPx === MIN_FIT_PX, 'and a nonsense word stops at the floor');

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
