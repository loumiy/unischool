// ---------------------------------------------------------------------
// The text made true, outside the events (Plan 76C): where a line of flavor
// promised an effect, the effect is what the line says.
//   - a tag's attrition point is applied at the summer, as the preview
//     shows it (the review's G7-4);
//   - a Jock School's six points reach every team;
//   - a renovation can be paid from the building fund a campaign raised;
//   - a promise's title names the sum it is judged on;
//   - "A hall of its own" quotes the hall's own price and weeks (G7-14).
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { foundGame, playUntil, playYears } from '../sim/harness/game';
import { createGuidedPlayer } from '../sim/harness/guided';
import { reducer } from '../src/engine/reducer';
import { resolveAdmissions } from '../src/systems/admissions/resolveAdmissions';
import { attritionRate } from '../src/systems/admissions/admissionsSystem';
import { summerAttrition } from '../src/systems/admissions/consequences';
import { teamQuality } from '../src/data/studentLifeData';
import { renovationCost } from '../src/systems/estate/estate';
import { goalMet, promiseTitle } from '../src/systems/promises/promises';
import { promiseById } from '../src/data/promiseData';
import { OPENING_LETTERS } from '../src/data/eventData';
import { money, moneyShort } from '../src/format';
import type { GameState } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('text made true tests');

const clone = (s: GameState): GameState => structuredClone(s);

// ---- The attrition point, at the summer ----
{
  const g = foundGame({ seed: 12345 });
  const player = createGuidedPlayer();
  playYears(g, player, 3);
  playUntil(g, player, 2, (s) => s.pendingInterrupt?.type === 'summer');
  assert(g.s.pendingInterrupt?.type === 'summer', 'the guided college reaches a summer');
  // An unhappy year, so there is attrition for the tag to move.
  g.s.students.satisfactionYearSum = 40 * 52;
  g.s.students.satisfactionYearWeeks = 52;
  const staying = (tags: string[]) => {
    const s = clone(g.s);
    s.identity = { tags, earning: {}, shedding: {} };
    const preview = summerAttrition(s);
    const rising = s.students.classes.freshman;
    resolveAdmissions(s, { type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [] });
    return { preview, kept: s.students.classes.sophomore / rising };
  };
  const plain = staying([]);
  const cooker = staying(['pressure-cooker']);
  const teaching = staying(['teaching-college']);
  assert(Math.abs(plain.preview - attritionRate(40)) < 1e-9, `the plain preview is the rate (${plain.preview})`);
  assert(Math.abs((1 - cooker.kept) - cooker.preview) < 0.002, `a Pressure Cooker's summer loses what its preview says (${(1 - cooker.kept).toFixed(4)} against ${cooker.preview.toFixed(4)})`);
  assert(Math.abs((1 - teaching.kept) - teaching.preview) < 0.002, `a Teaching College's summer keeps what its preview says (${(1 - teaching.kept).toFixed(4)} against ${teaching.preview.toFixed(4)})`);
  assert(cooker.kept < plain.kept && teaching.kept > plain.kept, 'the tags move the summer, not only the preview');
}

// ---- A college a dozen years on ----
const g = foundGame({ seed: 4242 });
playYears(g, createGuidedPlayer(), 12);

// ---- A Jock School's teams ----
{
  const s = clone(g.s);
  const team = s.orgs.teams[0];
  assert(team !== undefined, `the college has a varsity program by year 12 (${s.orgs.teams.length})`);
  if (team) {
    s.identity = { tags: [], earning: {}, shedding: {} };
    const before = teamQuality(team, s);
    s.identity = { tags: ['jock-school'], earning: {}, shedding: {} };
    const after = teamQuality(team, s);
    assert(after === Math.min(100, before + 6), `a Jock School team plays six points stronger (${before} to ${after})`);
  }
}

// ---- The building fund pays for a renovation ----
{
  const s = clone(g.s);
  const b = s.tech.find((t) => t.kind !== 'course' && t.status === 'done' && t.id.startsWith('DORM'))
    ?? s.tech.find((t) => t.kind === 'building' && t.status === 'done')!;
  b.backlog = 2_000_000;
  const cost = renovationCost(b);
  s.finance.cash = 0;
  s.advancement = { running: null, closed: [], restrictedBuilding: cost + 1000 };
  const after = reducer(s, { type: 'RENOVATE_BUILDING', id: b.id });
  const done = after.tech.find((t) => t.id === b.id)!;
  assert((done.renovationWeeks ?? 0) > 0, `${b.name} is renovated with no cash, from the building fund`);
  assert(after.advancement!.restrictedBuilding === 1000 && after.finance.cash === 0, 'the fund pays, and the cash is untouched');
  const short = clone(s);
  short.advancement = { running: null, closed: [], restrictedBuilding: cost / 2 };
  short.finance.cash = cost / 2 - 1;
  assert((reducer(short, { type: 'RENOVATE_BUILDING', id: b.id }).tech.find((t) => t.id === b.id)!.renovationWeeks ?? 0) === 0, 'the fund and the cash together must cover it');
}

// ---- A promise's title is its goal ----
{
  const s = clone(g.s);
  const def = promiseById('endowment-centennial')!;
  const title = promiseTitle(s, def, 2);
  assert(title.includes(moneyShort(200_000_000)), `the title names the sum at its scale ("${title}")`);
  s.finance.endowment = 190_000_000;
  assert(!goalMet(s, def, 2), 'short of that sum, the promise is not kept');
  s.finance.endowment = 210_000_000;
  assert(goalMet(s, def, 2), 'past it, it is');
  const reserve = promiseById('weather-the-storm')!;
  assert(promiseTitle(s, reserve).includes('eight years') && reserve.years === 8, `a term in a title is the promise's own ("${promiseTitle(s, reserve)}")`);
}

// ---- The first hall's letter ----
{
  const s = clone(g.s);
  const letter = OPENING_LETTERS.find((l) => l.id === 'a-hall-of-its-own')!;
  const hall = s.tech.find((t) => t.kind === 'building' && t.id.startsWith('HALL'))!;
  const body = letter.body(s);
  assert(body.includes(money(hall.cost)) && body.includes(`${hall.duration} weeks`), `the letter quotes ${hall.name}'s own price and weeks (${money(hall.cost)}, ${hall.duration} weeks)`);
}

console.log(`  ${failures === 0 ? '✓' : '✗'} ${checks - failures} of ${checks} checks passed`);
if (failures > 0) process.exit(1);
