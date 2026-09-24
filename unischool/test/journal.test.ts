// The journal (Plan 33): what the chronicle and the Final Report read and
// the capped log cannot keep. The six standing values ride on each history
// row; tags earned and shed, the rival's first year, the letters answered
// and each year's inline answers are kept by their own systems.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { captureYearSnapshot } from '../src/state/history';
import { STANDINGS, standingValue } from '../src/systems/rivals/rivalsSystem';
import { tagIndicators, turnPerception } from '../src/systems/identity/tags';
import { checkRivalStanding } from '../src/systems/rivals/collegeRival';
import { resolveCatalogueEvent } from '../src/systems/events/catalogueEngine';
import { priceScale, rollVars } from '../src/systems/events/catalogue';
import { EVENT_CATALOGUE } from '../src/data/eventCatalogue';
import { TAGS, TAG_SHED_AT, TAG_YEARS } from '../src/data/tagData';
import { loadGame, saveGame } from '../src/state/persistence';
import { SPORTS } from '../src/data/studentLifeData';
import type { GameState, VarsityTeam } from '../src/state/types';

bindScriptStream(3333);
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('journal tests');

function fresh(): GameState {
  const s = createInitialState('Journal');
  s.pendingInterrupt = null;
  s.clock.year = 6;
  return s;
}

// ---- The six standings' values, per year ----
{
  const s = fresh();
  const row = captureYearSnapshot(s, { attrition: 0, satisfactionAverage: 60, graduated: 0 });
  assert(row.standingValues !== undefined && STANDINGS.every(({ axis }) => typeof row.standingValues![axis] === 'number'), 'each year keeps the college\'s value on all six');
  assert(Math.abs(row.standingValues!.reputation - s.self.reputation) < 0.01, 'academics is its prestige');
  assert(Math.abs(row.standingValues!.access - standingValue(s, 'access')) < 0.01, 'and the read axes are read');
}

// ---- Tags earned and shed ----
{
  const s = fresh();
  // A tag the founding college reads below its line, held two years under it.
  const ind = tagIndicators(s);
  const tag = TAGS.find((x) => ind[x.id] < TAG_SHED_AT)!.id;
  s.identity = { tags: [tag], earning: {}, shedding: { [tag]: TAG_YEARS - 1 } };
  turnPerception(s);
  assert(!s.identity!.tags.includes(tag), `${tag} is shed`);
  assert(s.identity!.log?.some((e) => e.id === tag && !e.earned && e.year === s.clock.year) === true, 'and written down with its year');
  const kept = s.identity!.log?.length ?? 0;
  s.clock.year += 1;
  turnPerception(s);
  assert((s.identity!.log?.length ?? 0) >= kept, 'and the record is never shortened');
}

// ---- The rival's first year ----
{
  const s = fresh();
  const team = { id: 'team-1', sport: SPORTS[0].id, status: 'active', headCoach: null, assistantCoach: null, trainer: null } as unknown as VarsityTeam;
  s.orgs.teams = [team];
  s.orgs.teamOrder = [team.id];
  checkRivalStanding(s);
  const first = s.rivalStanding;
  assert(first !== undefined && first.since === s.clock.year, 'the rival is named with the year');
  s.clock.year += 4;
  checkRivalStanding(s);
  assert(s.rivalStanding!.since === first!.since, 'and keeps it while it is the same school');
}

// ---- Letters and answers ----
{
  const s = fresh();
  const letter = EVENT_CATALOGUE.find((e) => e.kind === 'seismic')!;
  const inline = EVENT_CATALOGUE.filter((e) => e.kind === 'inline').slice(0, 3);
  s.catalogue = { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  const put = (id: string, n: number) => {
    const p = { instanceId: `j-${n}`, eventId: id, firedWeek: 1, vars: rollVars(s), scale: priceScale(s) };
    s.catalogue!.pending.push(p);
    return p.instanceId;
  };
  s.finance.cash = 1e9;
  resolveCatalogueEvent(s, put(letter.id, 0), letter.default, 'player');
  resolveCatalogueEvent(s, put(inline[0].id, 1), inline[0].default, 'player');
  resolveCatalogueEvent(s, put(inline[1].id, 2), inline[1].default, 'timeout');
  resolveCatalogueEvent(s, put(inline[2].id, 3), inline[2].default, 'timeout');
  assert(s.catalogue.letters?.length === 1 && s.catalogue.letters[0].eventId === letter.id && s.catalogue.letters[0].year === s.clock.year, 'a letter answered is kept, with the answer and the year');
  const row = s.catalogue.answered?.[0];
  assert(row !== undefined && row.year === s.clock.year && row.player === 1 && row.timeout === 2 && row.seat === 0, 'inline answers are counted by who gave them');
  s.clock.year += 1;
  resolveCatalogueEvent(s, put(inline[0].id, 4), inline[0].default, 'timeout');
  assert(s.catalogue.answered?.length === 2, 'a year to a row');

  saveGame(s);
  const back = loadGame()!;
  assert(back.catalogue?.letters?.length === 1 && back.catalogue.answered?.length === 2, 'the journal saves');
  (s.catalogue as unknown as { letters: unknown }).letters = [{ eventId: 3 }];
  saveGame(s);
  assert(loadGame()!.catalogue?.letters === undefined, 'and a malformed entry is dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
