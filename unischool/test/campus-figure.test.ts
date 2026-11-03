// ---------------------------------------------------------------------
// One campus figure (Plan 124F, the review's A5 trimmed): the Estate panel
// and the build menu show the same figure, the Campus standing out of 150,
// with beauty's inputs among its parts and no beauty figure of its own.
// Both scores stay in the model.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { teachingCollege } from './fixtures/teaching';
import EstatePanel from '../src/tabs/EstatePanel';
import CampusStanding, { campusParts } from '../src/components/CampusStanding';
import { beautyTerms, campusTerms } from '../src/systems/estate/beauty';
import { count } from '../src/format';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('campus figure tests');

const s = teachingCollege('Campus');
const figure = `${count(campusTerms(s).score)} of 150`;
const estate = renderToStaticMarkup(createElement(EstatePanel, { s, act: () => {} }));
assert(estate.includes(figure), `the Estate panel shows the Campus standing (${figure})`);
assert(!estate.includes('Campus beauty') && !estate.includes('of 100'), 'and no beauty figure');
for (const part of ['decoration', 'quads', 'paths to doors', 'buildings standing', 'greenery', 'landmarks', 'upkeep']) {
  assert(estate.includes(part), `with ${part} among its parts`);
}
const build = renderToStaticMarkup(createElement(CampusStanding, { s, compact: true }));
assert(build.includes(figure), 'the build menu shows the same figure');
assert(campusParts(s).every((p) => p.share >= 0 && p.share <= 1), 'every part is a share');
assert(typeof beautyTerms(s).score === 'number', 'beauty stays in the model');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
