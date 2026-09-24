// Identity tags (src/systems/identity/tags.ts): earned after two years over
// the line, shed after two under, three at most, each with small teeth.

import { createInitialState } from '../src/state/actions';
import { TAGS, TAG_LIMIT } from '../src/data/tagData';
import { hasTag, tagPoolFactor, tagQualityShift, turnPerception, tagIndicators } from '../src/systems/identity/tags';
import { tagTeeth } from '../src/systems/identity/teeth';
import { campusBeauty, beautyTerms } from '../src/systems/estate/beauty';
import { bindScriptStream } from '../src/engine/random';
import type { GameState } from '../src/state/types';

bindScriptStream(3131);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('tags tests');

{
  assert(TAGS.length === 10 && new Set(TAGS.map((t) => t.id)).size === 10, 'ten tags');
  const s = createInitialState('Tags');
  s.clock.year = 1;
  assert(Object.values(tagIndicators(s)).every((v) => v === 0), 'a college in its first years is known for nothing');
}

// A commuter college: far fewer beds than a third of its students.
function commuter(): GameState {
  const s = createInitialState('Commuter');
  s.clock.year = 10;
  s.students.classes = { freshman: 3000, sophomore: 3000, junior: 3000, senior: 3000 };
  s.students.capacity = 100;
  return s;
}
{
  const s = commuter();
  assert(tagIndicators(s).commuter >= 0.6, `a college with no beds reads as a commuter college (${tagIndicators(s).commuter})`);
  turnPerception(s);
  assert(!hasTag(s, 'commuter') && s.identity!.earning.commuter === 1, 'one year over the line is not yet a reputation');
  turnPerception(s);
  assert(hasTag(s, 'commuter'), 'two is');
  assert(tagTeeth(s, 'satisfaction') === -2, 'and it has teeth: two points off satisfaction');
  const pool = tagPoolFactor(s);
  assert(Math.abs(pool - 1.05) < 1e-9 && tagQualityShift(s) === -3, 'and shapes the pool');
  s.students.capacity = 1e6;
  turnPerception(s);
  assert(hasTag(s, 'commuter'), 'a year under the line does not shed it');
  turnPerception(s);
  assert(!hasTag(s, 'commuter'), 'two do');
}
{
  const s = commuter();
  s.identity = { tags: ['artsy', 'old-money', 'jock-school'], earning: {}, shedding: {} };
  const artsy = beautyTerms(s).score;
  assert(campusBeauty(s) === Math.min(100, artsy + 5), 'an Artsy college is five points handsomer');
  turnPerception(s);
  assert(s.identity!.tags.length === TAG_LIMIT && !hasTag(s, 'commuter'), `no more than ${TAG_LIMIT} at once`);
  turnPerception(s);
  assert(!hasTag(s, 'artsy') && hasTag(s, 'commuter'), 'a reputation the college no longer earns is shed, and makes room');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
