// ---------------------------------------------------------------------
// Named funds (Plan 101F): an answer's gift to the endowment endows a fund
// for a purpose. A scholarship's share of the draw is student aid, spent on
// the students and read off the price; a chair's pays its holder's salary.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { eventById } from '../src/systems/events/catalogue';
import { fire, resolveCatalogueEvent } from '../src/systems/events/catalogueEngine';
import { aidPerStudent, chairHolder, chairPays, chairsHeldBy, endowFund, fundIncome, fundShare, fundsOf, netTuition, scholarshipAid } from '../src/systems/alumni/funds';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { drawRate } from '../src/systems/finance/treasury';
import { appointFaculty, careerWeeks } from '../src/systems/faculty/facultySystem';
import { generateCandidate } from '../src/data/facultyData';
import { absoluteWeek } from '../src/data/eventData';
import { exportSave, readSave } from '../src/state/persistence';
import { WEEKS_PER_YEAR, totalEnrolled, type GameState } from '../src/state/types';

bindScriptStream(1060);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));

console.log('event funds tests');

function college(): GameState {
  const s = createInitialState('Funds');
  s.clock.year = 30;
  s.finance.cash = 50_000_000;
  s.finance.endowment = 40_000_000;
  s.catalogue = { pending: [], lastFired: {}, lastInlineWeek: 0, lastSeismicWeek: 0 };
  return s;
}

// ---- A scholarship ----
{
  const s = college();
  const e = eventById('tuition-letter')!;
  const p = fire(s, e);
  const endowment = s.finance.endowment;
  assert(resolveCatalogueEvent(s, p.instanceId, 'aid'), 'the hardship fund is endowed');
  const fund = fundsOf(s)[0];
  const gift = s.finance.endowment - endowment;
  assert(fund?.name === 'The Hardship Fund' && fund.purpose === 'scholarship' && fund.principal === gift && gift > 0, `its principal is the gift to the endowment (${fund?.principal} of ${gift})`);
  assert(near(fundIncome(s, fund!), fund!.principal * drawRate(s)), 'it pays its share of the draw');
  assert(near(scholarshipAid(s), fundIncome(s, fund!)), 'all of it to aid');
  const flow = financeBreakdown(s);
  assert(near(flow.scholarshipAid, scholarshipAid(s) / WEEKS_PER_YEAR), 'the statement spends it on aid each week');
  assert(near(aidPerStudent(s), scholarshipAid(s) / totalEnrolled(s.students)), 'spread over the students');
  assert(near(netTuition(s, s.finance.listedTuition), Math.max(0, s.finance.listedTuition - aidPerStudent(s))), 'and applicants read the price net of it');
  // The endowment below the funds' principal: they pay out in proportion.
  s.finance.endowment = fund!.principal / 2;
  assert(near(fundShare(s), 0.5) && near(fundIncome(s, fund!), fund!.principal * 0.5 * drawRate(s)), 'an endowment below the funds pays them in proportion');
}

// ---- A chair ----
{
  const s = college();
  const field = 'Biology';
  const hire = (tenure: number) => {
    const f = generateCandidate(field, s.faculty.map((x) => x.name));
    appointFaculty(s, f);
    f.tenureWeeks = tenure;
    return f;
  };
  const founder = hire(0);
  founder.tenureWeeks = absoluteWeek(s) - WEEKS_PER_YEAR;
  const strong = hire(5 * WEEKS_PER_YEAR);
  strong.teaching = 90; strong.research = 90;
  const weak = hire(5 * WEEKS_PER_YEAR);
  weak.teaching = 20; weak.research = 20;
  const e = eventById('founding-faculty-last')!;
  for (let i = 0; i < 8; i++) hire(5 * WEEKS_PER_YEAR).teaching = 10;
  const inNotice = founder.tenureWeeks >= careerWeeks(founder.id) - WEEKS_PER_YEAR && founder.tenureWeeks < careerWeeks(founder.id);
  const p = fire(s, e);
  p.vars.faculty = founder.name;
  p.vars.facultyId = founder.id;
  assert(resolveCatalogueEvent(s, p.instanceId, 'chair'), `the chair is endowed (the founder ${inNotice ? 'is' : 'is not'} in their notice)`);
  const chair = fundsOf(s).find((f) => f.purpose === 'chair')!;
  assert(chair?.name === `The ${founder.name} Chair` && chair.field === field, `named for the professor, in their field (${chair?.name})`);
  assert(chairHolder(s, chair)?.id === strong.id, 'held by the strongest professor in the field, not the one retiring');
  assert(chairsHeldBy(s, strong.id).length === 1, 'and their page says so');
  assert(chairPays(s, chair) > 0 && chairPays(s, chair) <= fundIncome(s, chair), 'it pays toward their salary');
  assert(scholarshipAid(s) === 0, 'a chair is not aid');
  // The holder leaves: the chair passes on, by the same rule.
  s.faculty = s.faculty.filter((f) => f.id !== strong.id);
  const next = chairHolder(s, chair);
  assert(next !== undefined && next.field === field && next.id !== strong.id, `it passes to the next in the field (${next?.name})`);
}

// ---- Nothing given, nothing endowed ----
{
  const s = college();
  assert(endowFund(s, 'scholarship', 'The Empty Fund', 0) === undefined && fundsOf(s).length === 0, 'no gift, no fund');
}

// ---- Saved ----
{
  const s = college();
  endowFund(s, 'scholarship', 'The Kept Fund', 500_000);
  s.advancement!.funds!.push({ id: 'bad', name: 'Bad', purpose: 'statue' as never, principal: 1, year: 1 });
  const read = readSave(exportSave(s).text);
  assert('state' in read, 'it saves and loads');
  if ('state' in read) {
    const funds = read.state.advancement?.funds ?? [];
    assert(funds.length === 1 && funds[0].name === 'The Kept Fund', 'the fund is kept, a malformed one dropped');
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
