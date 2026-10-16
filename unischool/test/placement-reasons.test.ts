// ---------------------------------------------------------------------
// Every refused placement says why (Plan 104H). S1 met a red ghost with no
// words for money, for the board's freeze and for a building not open, and
// a ghost that read cash only while the click also took a gift, a loan or
// half from the endowment. The map and the build menu now read one module
// (components/buildReasons.ts). Pinned:
//
//   - each refusal's words: what it costs against what there is (with why
//     no loan), the freeze, a field with nobody free, a building not open;
//   - the ghost is green exactly where a click would place: for cash, a
//     gift, a loan and the endowment, the reducer's PLACE_BUILDABLE with
//     the financing buildFinancing names starts the building, and where it
//     names none the reducer refuses every way of paying;
//   - a green ghost paid any way but cash says how;
//   - a bench refused on a building or off the land says why.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import type { Buildable, GameState } from '../src/state/types';
import type { Financing } from '../src/systems/finance/treasury';
import { createInitialState, createPreStartState } from '../src/state/actions';
import { reducer } from '../src/engine/reducer';
import { firstFreeSpot, footprintOf } from '../src/state/campusMap';
import { buildFinancing, dressingRefusal, paidWords, startRefusal } from '../src/components/buildReasons';
import { BUILD_WORDS } from '../src/data/buildWords';
import { FOUNDERS_HALL_ID } from '../src/data/techData';
import { RUNG_FREEZE } from '../src/systems/finance/distress';

import { FOUNDING_VERNACULAR } from '../src/data/foundingData';
import { FOUNDING_COLORS, schoolColorsOf } from '../src/data/schoolColors';
import { teachPillars } from './fixtures/teaching';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('placement reasons tests');

const fresh = () => teachPillars(createInitialState('Reasons'));
// A plain facility, opened (treasury.test.ts's way): no professor, no project.
const plainHall = (s: GameState) => {
  const t = s.tech.find((x) => x.kind === 'facility' && x.cost >= 1_000_000 && !x.requiresFaculty && !x.project && !(x.id in s.placements))!;
  t.status = 'available';
  return t;
};

// Places with the financing the ghost names (or each way, when it names
// none) through the reducer, as the click does. True when it started.
const FLAGS: Record<Financing, object> = { cash: {}, loan: { borrow: true }, gift: { gift: true }, endowment: { endowment: true } };
function clickPlaces(s: GameState, t: Buildable, financing: Financing): boolean {
  const spot = firstFreeSpot(s, t, footprintOf(t))!;
  const next = reducer(s, { type: 'PLACE_BUILDABLE', buildableId: t.id, row: spot.row, col: spot.col, facing: 0, ...FLAGS[financing] });
  return t.id in next.placements && !(t.id in s.placements);
}
function agrees(s: GameState, t: Buildable, label: string): void {
  const f = buildFinancing(s, t);
  if (f !== null) {
    assert(clickPlaces(s, t, f) && startRefusal(s, t) === null, `${label}: green (${f}), and the click places it`);
  } else {
    const any = (['cash', 'gift', 'endowment', 'loan'] as const).some((way) => clickPlaces(s, t, way));
    assert(!any && startRefusal(s, t) !== null, `${label}: red with words (${startRefusal(s, t)}), and no click places it`);
  }
}

// Cash in hand: green, no note.
{
  const s = fresh();
  const t = plainHall(s);
  s.finance.cash = t.cost + 1;
  assert(buildFinancing(s, t) === 'cash' && paidWords('cash') === null, 'enough cash: paid in cash, no note');
  agrees(s, t, 'cash');
}

// Building gifts cover it: green, "paid from gifts".
{
  const s = fresh();
  const t = plainHall(s);
  s.finance.cash = 10;
  s.advancement = { running: null, closed: [], restrictedBuilding: t.cost + 1 };
  assert(buildFinancing(s, t) === 'gift' && paidWords('gift') === BUILD_WORDS.pay.gift, `gifts cover it: the ghost says "${BUILD_WORDS.pay.gift}"`);
  agrees(s, t, 'gift');
}

// A loan for the shortfall: green, where the cash-only ghost was red.
{
  const s = fresh();
  const t = plainHall(s);
  s.finance.endowment = 50_000_000;
  s.finance.cash = Math.round(t.cost / 2);
  assert(buildFinancing(s, t) === 'loan' && paidWords('loan') === BUILD_WORDS.pay.loan, `short of cash with room to borrow: green, "${BUILD_WORDS.pay.loan}"`);
  agrees(s, t, 'loan');
}

// Short, and no loan: red, with the cost, the cash, and why no loan.
{
  const s = fresh();
  const t = plainHall(s);
  s.finance.endowment = 0;
  s.finance.cash = 1_400_000;
  t.cost = 2_100_000;
  const why = startRefusal(s, t);
  assert(why !== null && why.startsWith('Costs $2.1M · you have $1.4M'), `short: "${why}"`);
  assert(why !== null && why.includes('borrow'), 'and why there is no loan');
  agrees(s, t, 'short');
}

// The board's freeze: red, said.
{
  const s = fresh();
  const t = plainHall(s);
  s.finance.cash = t.cost * 10;
  s.finance.distress = { ...(s.finance.distress ?? {}), rung: RUNG_FREEZE } as GameState['finance']['distress'];
  const frozen = startRefusal(s, t);
  assert(frozen === BUILD_WORDS.frozen, `frozen: "${frozen}"`);
  agrees(s, t, 'frozen');
}

// A building that needs a professor in a field with nobody free.
{
  const s = fresh();
  const lab = s.tech.find((t) => t.kind !== 'course' && t.requiresFaculty && !s.faculty.some((f) => f.field === t.requiresFaculty));
  if (lab) {
    lab.status = 'available';
    s.finance.cash = lab.cost * 10;
    const why = startRefusal(s, lab);
    assert(why === BUILD_WORDS.needsFaculty.replace('{field}', lab.requiresFaculty!), `a ${lab.requiresFaculty} building with nobody to staff it: "${why}"`);
    agrees(s, lab, 'faculty');
  }
}

// A building not open: red, said.
{
  const s = fresh();
  const t = s.tech.find((x) => x.kind !== 'course' && x.status === 'locked')!;
  s.finance.cash = t.cost * 10;
  assert(startRefusal(s, t) === BUILD_WORDS.notOpen.replace('{building}', t.name), `not open: "${startRefusal(s, t)}"`);
}

// Founders Hall waiting for its ground (a guided founding): free, green.
{
  const s = reducer(createPreStartState(), { type: 'START_GAME', name: 'Unsited', vernacular: FOUNDING_VERNACULAR, colors: schoolColorsOf(FOUNDING_COLORS), guided: true });
  const hall = s.tech.find((t) => t.id === FOUNDERS_HALL_ID)!;
  assert(!(FOUNDERS_HALL_ID in s.placements) && buildFinancing(s, hall) === 'cash' && startRefusal(s, hall) === null, 'Founders Hall waiting for its ground is green, for nothing');
  agrees(s, hall, 'Founders Hall');
}

// A bench on a building, and off the land.
{
  const s = fresh();
  const at = s.placements[FOUNDERS_HALL_ID];
  assert(dressingRefusal(s, at.row, at.col) === BUILD_WORDS.dressingOnBuilding.replace('{building}', 'Founders Hall'), `on Founders Hall: "${dressingRefusal(s, at.row, at.col)}"`);
  assert(dressingRefusal(s, -5, -5) === BUILD_WORDS.dressingOffLand, 'off the land, said');
  const open = firstFreeSpot(s, plainHall(s), { w: 1, h: 1 })!;
  assert(dressingRefusal(s, open.row, open.col) === null, 'on open ground, nothing to say');
}

console.log(failures === 0 ? `  ✓ all ${checks} checks passed` : `  ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
