// The alumni ledger (src/systems/alumni/ledger.ts): a class is stamped at
// commencement with what its four years held, read off the history rows,
// and its warmth follows.

import { createInitialState } from '../src/state/actions';
import { className, classYears, firstClassYear, memoryFor, memoryLine, stampGraduatingClass, warmthFor } from '../src/systems/alumni/ledger';
import {
  GIVING_PER_ALUM, REUNION_WARMTH, REUNION_WARMTH_CAP, annualGiving, canReunite, givingOf, maturityOf, reunionCost,
} from '../src/systems/alumni/giving';
import { financeBreakdown } from '../src/systems/finance/financeSystem';
import { reducer } from '../src/engine/reducer';
import type { AlumniClass } from '../src/state/types';
import { CAMPAIGNS, campaignById } from '../src/data/campaignData';
import { advancementOf, classResponse, openCampaigns, tickCampaigns, yearlyResponse } from '../src/systems/alumni/campaigns';
import { bindScriptStream } from '../src/engine/random';
import type { GameState, YearSnapshot } from '../src/state/types';

bindScriptStream(3030);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('alumni tests');

function row(year: number, over: Partial<YearSnapshot> = {}): YearSnapshot {
  return {
    year, prestige: 60, rank: 50, enrolled: 1000, cash: 1e6, coursesDone: 10, programsEstablished: 1,
    satisfaction: 60, net: 1e5, applicants: 3000, admitRate: 0.4, incomingQuality: 55,
    satisfactionAverage: 60, coursesFinished: 2, attrition: 20, graduated: 200, worstRung: 0, schoolsFounded: 0,
    ...over,
  };
}
function withYears(rows: YearSnapshot[]): GameState {
  const s = createInitialState('Alumni');
  s.history = rows;
  return s;
}

{
  const happy = withYears([1, 2, 3, 4, 5].map((y) => row(y, { satisfactionAverage: 80 })));
  const c = classYears(happy, 5);
  assert(c.years.length === 4 && c.years[0].year === 2, 'a class\'s years are the four before commencement');
  const memory = memoryFor(happy, c);
  assert(memory.includes('happy'), `a happy four years is remembered (${memory.join(', ')})`);

  const grim = withYears([1, 2, 3, 4, 5].map((y) => row(y, { satisfactionAverage: 40, net: -1e5, worstRung: y === 4 ? 5 : 2 })));
  const gm = memoryFor(grim, classYears(grim, 5));
  assert(gm.includes('receivership') && gm.includes('unhappy') && gm.includes('deficits'), `and so is a grim one (${gm.join(', ')})`);
  assert(gm[0] === 'receivership', 'loudest first');
  assert(warmthFor(classYears(grim, 5), gm) < warmthFor(classYears(happy, 5), memory), 'and it is colder');

  const quiet = withYears([1, 2, 3, 4, 5].map((y) => row(y)));
  const qm = memoryFor(quiet, { ...classYears(quiet, 5), teaching: 50 });
  assert(qm.join() === 'quiet', `a class nothing happened to is quiet (${qm.join(', ')})`);
  assert(memoryLine({ classYear: 5, memory: ['happy', 'well-taught', 'building-years', 'deficits'] }, 1) === 'The class of Year 5: happy in it, well taught and there for the building years.', 'the line shows three clauses');
  // Plan 78F: a class is named by its year, never a bare number that reads
  // as a count, and the first the college graduated by what it is.
  assert(memoryLine({ classYear: 1, memory: ['quiet'] }, 1) === 'The first graduating class: unremarkable, and fond of it.', 'the first class is the first graduating class');
  assert(className(3, 1) === 'class of Year 3' && className(1, 1) === 'first graduating class', 'later classes are the class of Year N');
  assert(firstClassYear(undefined, 4) === 4 && firstClassYear([], 4) === 4, 'with no alumni yet, the class about to graduate is the first');
  assert(firstClassYear([{ classYear: 2 }, { classYear: 3 }], 5) === 2 && className(5, firstClassYear([{ classYear: 2 }], 5)) === 'class of Year 5', 'after it, the ledger\'s earliest class is the first');
  assert(className(2, firstClassYear([{ classYear: 2 }, { classYear: 3 }], 2)) === 'first graduating class', 'and a first class that graduated in Year 2 is still the first');

  const leaky = withYears([1, 2, 3, 4, 5].map((y) => row(y, { attrition: 80 })));
  assert(memoryFor(leaky, classYears(leaky, 5)).includes('thinned'), 'a college losing a twelfth a year thins its classes');

  const founded = withYears([1, 2, 3, 4, 5].map((y) => row(y, { schoolsFounded: y >= 3 ? 1 : 0, programsEstablished: y })));
  const fm = memoryFor(founded, classYears(founded, 5));
  assert(fm.includes('new-school') && fm.includes('first-of-program'), `a founding is remembered (${fm.join(', ')})`);

  stampGraduatingClass(happy, 250, 5);
  const stamped = happy.alumni![0];
  assert(stamped.classYear === 5 && stamped.size === 250 && stamped.warmth > 0 && stamped.warmth <= 100 && stamped.nudged === 0, 'commencement stamps the class');
  stampGraduatingClass(happy, 0, 6);
  assert(happy.alumni!.length === 1, 'a class of nobody is not a class');
}

// ---- The annual fund ----
{
  const cls = (over: Partial<AlumniClass> = {}): AlumniClass => ({ classYear: 5, size: 1000, satisfaction: 70, quality: 50, memory: ['happy'], warmth: 50, nudged: 0, ...over });
  assert(maturityOf(0) < maturityOf(10) && maturityOf(20) === 1 && maturityOf(40) === 1, 'a class gives more as it comes into its own, then holds');
  assert(givingOf(cls(), 25) === 1000 * GIVING_PER_ALUM, 'an established, neutral class of a thousand gives the base rate each');
  assert(givingOf(cls({ warmth: 100 }), 25) === 2 * givingOf(cls(), 25), 'a devoted one twice that');
  assert(givingOf(cls({ warmth: 0 }), 25) === 0, 'a cold one nothing');
  assert(givingOf(cls(), 6) === 0 && givingOf(cls(), 7) > 0, 'and nobody in the year after they leave');
  const s = createInitialState('Fund');
  s.clock.year = 30;
  const before = financeBreakdown(s).totalIncome;
  s.alumni = [cls(), cls({ classYear: 10 })];
  assert(Math.abs(financeBreakdown(s).annualFund - annualGiving(s) / 52) < 1e-6 && financeBreakdown(s).totalIncome > before, 'the fund is an income line');
}

// ---- Reunions ----
{
  let s = createInitialState('Reunions');
  s.pendingInterrupt = null;
  s.finance.cash = 1e8;
  s.alumni = [{ classYear: 5, size: 1000, satisfaction: 70, quality: 50, memory: ['happy'], warmth: 50, nudged: 0 }];
  s.clock.year = 9;
  assert(!canReunite(s, s.alumni[0]), 'no reunion in an off year');
  s.clock.year = 10;
  assert(canReunite(s, s.alumni[0]), 'one at five years');
  s = reducer(s, { type: 'HOLD_REUNION', classYear: 5 });
  assert(s.alumni![0].nudged === REUNION_WARMTH && s.finance.cash === 1e8 - reunionCost(s.alumni![0]), 'it costs by the head and warms the class');
  s = reducer(s, { type: 'HOLD_REUNION', classYear: 5 });
  assert(s.alumni![0].nudged === REUNION_WARMTH, 'once a reunion year');
  for (const year of [15, 20, 25, 30]) {
    s.clock.year = year;
    s = reducer(s, { type: 'HOLD_REUNION', classYear: 5 });
  }
  assert(s.alumni![0].nudged === REUNION_WARMTH_CAP, `and never more than ${REUNION_WARMTH_CAP} in all`);
}

// ---- Campaigns ----
{
  let s = createInitialState('Campaigns');
  s.pendingInterrupt = null;
  s.finance.cash = 1e8;
  s.clock.year = 30;
  s.alumni = Array.from({ length: 20 }, (_, i) => ({ classYear: 5 + i, size: 800, satisfaction: 65, quality: 55, memory: i % 2 === 0 ? ['deficits'] : ['happy'], warmth: 60, nudged: 0 }));
  s.finance.endowment = 10_000_000;
  assert(CAMPAIGNS.length === 5 && CAMPAIGNS.every((c) => c.years > 0 && c.resonates.length > 0), 'five campaigns, each with a term and a case');
  assert(openCampaigns(s).length === 0, 'no campaign without a VP of Advancement');
  s = reducer(s, { type: 'APPOINT_SEAT', seatId: 'advancement', school: null });
  const open = openCampaigns(s).map((c) => c.id);
  assert(open.includes('endowment-drive'), `with one, the endowment drive opens for a college under $90M (${open.join(', ')})`);
  const drive = campaignById('endowment-drive')!;
  const moved = s.alumni![0];
  const unmoved = s.alumni![1];
  assert(classResponse(moved, drive, 30) > classResponse({ ...unmoved, memory: moved.memory.filter(() => false) }, drive, 30), 'a class whose memory is the case gives more');
  s = reducer(s, { type: 'LAUNCH_CAMPAIGN', id: 'endowment-drive' });
  const running = advancementOf(s).running!;
  assert(running && running.target > 0 && running.target < yearlyResponse(s, drive) * drive.years, 'launched, with a target short of everything the ledger could give');
  assert(openCampaigns(s).length === 0, 'one at a time');
  const endowment = s.finance.endowment;
  const warmth = s.alumni![0].warmth;
  tickCampaigns(s);
  assert(s.finance.endowment > endowment, 'endowment money goes into the endowment');
  assert(s.alumni![0].warmth < warmth, 'and asking cools the ledger');
  s.clock.year = running.dueYear;
  tickCampaigns(s);
  const closed = advancementOf(s).closed[0];
  assert(advancementOf(s).running === null && closed.campaignId === 'endowment-drive' && closed.met === false, 'a campaign closes at its term, short if it came up short');
  assert(!openCampaigns(s).some((c) => c.id === 'endowment-drive'), 'and is not run twice');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
