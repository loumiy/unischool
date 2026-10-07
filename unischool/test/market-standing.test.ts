// The market follows standing (Plan 84B): a candidate's potentials are
// drawn around a center that rises with the college's standing, teaching
// with prestige and research mostly with research standing. The pool's
// mean potential rises with standing, the spread stays wide with rare
// standouts, the draw takes the stream's draws as the flat roll did, and
// the founding market is unchanged. Plan 96H: the early market's top is
// wider, and a candidate's current stats start at their own fraction of
// the potential, so the year-1 market meets the owner's targets.
//
// Not part of the game: nothing imports it. Run with `npm test`.

import {
  FOUNDING_STANDING, foundingCandidates, generateCandidate, initialCandidatePool, marketCenters, potentialAround,
  startFractionFor, type MarketStanding,
} from '../src/data/facultyData';
import { gradeFor } from '../src/data/courseQuality';
import { FOUNDING_MARKET } from '../src/data/foundingData';
import { bindScriptStream, drawsSoFar } from '../src/engine/random';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('market standing tests');

// The founding professors' teaching and research, summed, as main had them
// before the market followed standing.
const FOUNDING_SUM = 372;

const N = 2000;
function pool(standing: MarketStanding, seed = 8400): { teaching: number[]; research: number[] } {
  bindScriptStream(seed);
  const teaching: number[] = [];
  const research: number[] = [];
  for (let i = 0; i < N; i++) {
    const c = generateCandidate('History', [], standing);
    teaching.push(c.teachingPotential);
    research.push(c.researchPotential);
  }
  return { teaching, research };
}
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const share = (a: number[], f: (v: number) => boolean) => a.filter(f).length / a.length;

// The centers: about 50 at founding standing, toward 80 at the top.
const at = marketCenters(FOUNDING_STANDING);
const top = marketCenters({ prestige: 150, research: 150 });
assert(Math.abs(at.teaching - 50) < 1e-9 && Math.abs(at.research - 50) < 1e-9, `50 at founding standing (${at.teaching}, ${at.research})`);
assert(Math.abs(top.teaching - 80) < 1e-9 && Math.abs(top.research - 80) < 1e-9, `80 at the top (${top.teaching}, ${top.research})`);
// Teaching follows prestige alone; research mostly research standing.
const famous = marketCenters({ prestige: 150, research: 18 });
const scholarly = marketCenters({ prestige: 50, research: 150 });
assert(famous.teaching === 80 && scholarly.teaching === 50, 'teaching follows prestige, not research standing');
assert(scholarly.research > famous.research && famous.research > at.research, `research follows research standing more than prestige (${scholarly.research} > ${famous.research} > ${at.research})`);

// The pool's mean potential rises with standing.
const standings: MarketStanding[] = [FOUNDING_STANDING, { prestige: 75, research: 45 }, { prestige: 100, research: 80 }, { prestige: 125, research: 115 }, { prestige: 150, research: 150 }];
const pools = standings.map((st) => pool(st));
const tMeans = pools.map((p) => mean(p.teaching));
const rMeans = pools.map((p) => mean(p.research));
assert(tMeans.every((m, i) => i === 0 || m > tMeans[i - 1]! + 2), `the mean teaching potential rises with standing (${tMeans.map((m) => m.toFixed(1)).join(' → ')})`);
assert(rMeans.every((m, i) => i === 0 || m > rMeans[i - 1]! + 2), `the mean research potential rises with standing (${rMeans.map((m) => m.toFixed(1)).join(' → ')})`);
assert(Math.abs(tMeans[0]! - 55) < 3 && Math.abs(tMeans[4]! - 80) < 3, `about 55 at founding (the wider top, Plan 96H) and 80 at the top, quirks and all (${tMeans[0]!.toFixed(1)}, ${tMeans[4]!.toFixed(1)})`);

// Wide at every stage, within [30, 100], and rarely a standout early.
const early = pools[0]!;
assert(early.teaching.every((v) => v >= 30 && v <= 100) && pools[4]!.teaching.every((v) => v >= 30 && v <= 100), 'every potential in [30, 100]');
assert(share(early.teaching, (v) => v <= 40) > 0.08 && share(early.teaching, (v) => v >= 60) > 0.08, 'the spread is wide at founding');
// The year-1 market (Plan 96H's targets): about one in ten an A-tier
// potential, one in five a B; current stats mostly C, D and F, an A rare.
{
  bindScriptStream(9600);
  const year1 = Array.from({ length: 10_000 }, () => generateCandidate('History', [], { prestige: 42, research: 18 }));
  const at = (pick: (c: typeof year1[number]) => number, g: string) => year1.filter((c) => gradeFor(pick(c)) === g).length / year1.length;
  const potA = at((c) => c.teachingPotential, 'A'); const potB = at((c) => c.teachingPotential, 'B');
  const curA = at((c) => c.teaching, 'A'); const curB = at((c) => c.teaching, 'B'); const curC = at((c) => c.teaching, 'C');
  const p = (x: number) => `${(x * 100).toFixed(1)}%`;
  assert(potA > 0.08 && potA < 0.13, `about one in ten has an A-tier teaching potential (${p(potA)})`);
  assert(potB > 0.16 && potB < 0.25, `and about one in five a B (${p(potB)})`);
  assert(curA > 0.002 && curA < 0.02, `an A-tier teacher today is rare, but there (${p(curA)})`);
  assert(curB > 0.03 && curB < 0.08 && curC > 0.15 && curC < 0.25, `a few B and a fifth C today (${p(curB)}, ${p(curC)})`);
  assert(year1.every((c) => c.teaching <= c.teachingPotential && c.research <= c.researchPotential), 'nobody arrives above their potential');
  assert(year1.every((c) => c.startFraction >= 0.4 && c.startFraction <= 1 && c.startFraction === startFractionFor(c.id)), 'each start is in [0.4, 1], from the id');
}
assert(share(pools[4]!.teaching, (v) => v >= 75) > 0.4, 'and common at the top');
// The inverse spread: monotone, centered, the standouts above the body.
const offsets = [0, 0.25, 0.5, 0.75, 0.96, 0.97, 0.985, 0.9999].map((u) => potentialAround(50, u) - 50);
assert(offsets.every((o, i) => i === 0 || o >= offsets[i - 1]!), `the spread rises with the draw (${offsets.join(', ')})`);
assert(offsets[0] === -20 && offsets[2] === 0 && offsets[7]! >= 39, 'from −20 through the center to a standout 40 above');

// A candidate takes the same draws whatever the standing, so the stream is
// where the flat roll left it.
const drawsAt = (standing: MarketStanding) => {
  bindScriptStream(99);
  const before = drawsSoFar();
  generateCandidate('Chemistry', [], standing);
  return drawsSoFar() - before;
};
assert(drawsAt(FOUNDING_STANDING) === drawsAt({ prestige: 150, research: 150 }), 'a candidate takes the same draws at any standing');

// The founding market (Plan 80D) is unchanged: its professors are written,
// with the stats their record gives them, and lead the opening pool.
const founding = foundingCandidates();
assert(founding.length === FOUNDING_MARKET.length && founding.every((f, i) => f.teachingPotential === FOUNDING_MARKET[i]!.teachingPotential && f.researchPotential === FOUNDING_MARKET[i]!.researchPotential), 'the founding professors keep their written potentials');
const sum = founding.reduce((a, f) => a + f.teaching + f.research, 0);
assert(sum === FOUNDING_SUM, `and their stats (a sum of ${sum}, as before)`);
bindScriptStream(1);
const opening = initialCandidatePool();
assert(founding.every((f, i) => opening[i]!.id === f.id && opening[i]!.teaching === f.teaching), 'they lead the opening pool');

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
