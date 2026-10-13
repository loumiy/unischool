// ---------------------------------------------------------------------
// Campaigns, gifts and things on the map (Plan 101E): a campaign event
// launches a real campaign, the donor's statue is pledged and asked for
// until placed, the booster club gives to the athletics pot, the worn line
// is paved, and the ivy and the sinkhole stand on the named building until
// its repairs are paid.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { STATUE_ID, applyEffects, eventById, eventCampaign, wornLine } from '../src/systems/events/catalogue';
import { tickEstate } from '../src/systems/estate/estate';
import { inboxItems } from '../src/systems/inbox/inbox';
import { departmentPot } from '../src/data/studentLifeData';
import { exportSave, readSave } from '../src/state/persistence';
import { pathTileKey } from '../src/state/campusMap';
import type { GameState } from '../src/state/types';

bindScriptStream(1050);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('event gifts tests');

function college(): GameState {
  const s = createInitialState('Gifts');
  s.clock.year = 30;
  return s;
}

// ---- A real campaign ----
{
  const s = college();
  s.alumni = Array.from({ length: 20 }, (_, i) => ({ classYear: 10 + i, size: 400, warmth: 70, quality: 60, nudged: 0, memory: [] } as unknown as NonNullable<GameState['alumni']>[number]));
  assert(eventCampaign(s) === undefined, 'without a VP of Advancement, no campaign');
  applyEffects(s, { campaign: 1 });
  assert(!s.advancement?.running, 'and the answer launches none');
  s.seats = [{ seatId: 'advancement', school: null, holder: 'A. Vice', internal: false, policy: 'thrifty', salary: 200_000, appointedYear: 20 }];
  const def = eventCampaign(s);
  assert(def?.kind === 'endowment', `with one, the endowment campaign the alumni answer best (${def?.id})`);
  applyEffects(s, { campaign: 1 });
  assert(s.advancement?.running?.campaignId === def?.id, 'the answer launches it');
  assert(eventCampaign(s) === undefined, 'and none while it runs');
  for (const id of ['annual-fund-drive', 'the-matching-challenge']) {
    assert(eventById(id)!.choices.some((c) => (c.effects.campaign ?? 0) > 0), `${id} has an answer that campaigns`);
  }
}

// ---- The donor's statue ----
{
  const s = college();
  const statue = s.tech.find((t) => t.id === STATUE_ID)!;
  const fund = s.advancement?.restrictedBuilding ?? 0;
  applyEffects(s, { statue: 1 });
  assert(s.advancement!.restrictedBuilding === fund + statue.cost && s.advancement!.statuePledged === true, 'its price goes into the building fund, pledged');
  assert(statue.status === 'available', 'and the statue can be built');
  assert(inboxItems(s).some((i) => i.kind === 'gift' && i.tier === 'decide'), 'the inbox asks for it to be placed');
  const read = readSave(exportSave(s).text);
  assert('state' in read && read.state.advancement?.statuePledged === true, 'the pledge saves');
  statue.status = 'developing';
  tickEstate(s);
  assert(!s.advancement!.statuePledged && !inboxItems(s).some((i) => i.kind === 'gift'), 'once it is going up, the ask is gone');
  const again = s.advancement!.restrictedBuilding;
  applyEffects(s, { statue: 1 });
  assert(s.advancement!.restrictedBuilding === again, 'a statue already going up is not pledged again');
}

// ---- The booster club ----
{
  const s = college();
  const cash = s.finance.cash;
  const before = departmentPot(s).pot;
  applyEffects(s, { boosterGift: 300_000 });
  assert(s.finance.cash === cash && departmentPot(s).pot === before + 300_000, 'the gift goes to this year\'s athletics pot, not cash');
  applyEffects(s, { boosterGift: 100_000 });
  assert(departmentPot(s).pot === before + 400_000, 'two gifts in a year add up');
  s.clock.year += 1;
  assert(departmentPot(s).pot === before, 'and next year it is spent');
  s.clock.year -= 1;
  const bad = JSON.parse(exportSave(s).text);
  bad.state.orgs.boosterGift = { year: 'soon', amount: 5 };
  const read = readSave(JSON.stringify(bad));
  assert('state' in read && read.state.orgs.boosterGift === undefined, 'a malformed gift is dropped on load');
  assert(eventById('the-booster-club')!.choices.every((c) => c.effects.cash === undefined), 'the booster club\'s gifts are no longer plain cash');
}

// ---- The worn line ----
{
  const raw = readFileSync('test/fixtures/save-v100.json', 'utf8');
  const read = readSave(raw);
  assert('state' in read, 'the fixture loads');
  if ('state' in read) {
    const s = read.state;
    const line = wornLine(s);
    assert(line.length > 0, `a built campus has a worn line (${line.length} tiles)`);
    applyEffects(s, { paveLine: 1 });
    assert(line.every((t) => s.pathways[pathTileKey(t)] === true), 'paving it lays every tile as path');
    assert(wornLine(s).every((t) => !line.some((u) => u.col === t.col && u.row === t.row)), 'and the walkers no longer wear it');
  }
}

// ---- Ivy and the sinkhole ----
{
  const s = college();
  const hall = s.tech.find((t) => t.kind === 'building' && t.status === 'done')!;
  applyEffects(s, { ivy: 1, sinkhole: 1 }, { buildingId: hall.id });
  assert(hall.ivy === true && hall.sinkhole === true, 'the named building takes the ivy and the hole');
  hall.backlog = 500_000;
  tickEstate(s);
  assert(hall.ivy === true && hall.sinkhole === true, 'while its repairs wait, they stay');
  delete hall.backlog;
  tickEstate(s);
  assert(!hall.ivy && !hall.sinkhole, 'paid off, they go');
  assert(eventById('ivy-structural')!.choices.find((c) => c.id === 'leave')!.effects.ivy === 1, 'leaving the ivy leaves it');
  assert(eventById('the-sinkhole')!.choices.find((c) => c.id === 'fence')!.effects.sinkhole === 1, 'fencing the hole leaves it');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
