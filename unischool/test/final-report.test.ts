// The Final Report (Plan 33, state/finalReport.ts): each standing graded
// over the arc, a mark, a title built from the tags and the weakest
// standing, and the money's verdict.

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { composeTitle, finalReport, gradeAxes, satisfactionLeads, titleTag } from '../src/state/finalReport';
import { reportGrade } from '../src/data/reportData';
import { STANDINGS } from '../src/systems/rivals/rivalsSystem';
import type { GameState, YearSnapshot } from '../src/state/types';

bindScriptStream(3337);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('final report tests');

// Fifty rows whose six values run from `from` to `to` (on the 0–150 scale).
function run(from: number, to: number, over: Partial<Record<string, [number, number]>> = {}): GameState {
  const s = createInitialState('Report');
  s.history = Array.from({ length: 50 }, (_, i) => {
    const at = (a: number, b: number) => a + ((b - a) * i) / 49;
    const values = Object.fromEntries(STANDINGS.map(({ axis }) => {
      const [a, b] = over[axis] ?? [from, to];
      return [axis, at(a, b)];
    }));
    return { year: i + 1, rank: 10, standingValues: values } as unknown as YearSnapshot;
  });
  s.clock.year = 50;
  return s;
}

// ---- Grading the arc ----
{
  assert(reportGrade(75) === 'A' && reportGrade(74.9) === 'B' && reportGrade(48) === 'C' && reportGrade(10) === 'F', 'v2\'s bands');
  const flat = gradeAxes(run(90, 90));
  assert(flat.length === 6 && flat.every((a) => Math.abs(a.mean - (a.axis === 'athletics' ? 90 : 60)) < 0.1 && a.first === a.last), 'a college that stood still reads the same first and last (90 of 150 is 60 of 100; athletics already runs to 100)');
  const climb = gradeAxes(run(30, 120));
  const coast = gradeAxes(run(120, 120));
  assert(climb[0].last > climb[0].first, 'the last decade and the first are read apart');
  assert(climb[0].score < coast[0].score, 'ending at the top from the bottom scores less than holding it throughout');
  const rose = gradeAxes(run(30, 90))[0];
  const stayed = gradeAxes(run(60, 60))[0];
  assert(Math.abs(rose.mean - stayed.mean) < 0.5 && rose.score > stayed.score, `at the same average, a college that rose outscores one that stood still (${rose.score} against ${stayed.score})`);
}

// ---- The title ----
{
  const s = run(100, 120, { athleticStrength: [10, 20] });
  const title = composeTitle(s, gradeAxes(s));
  assert(title.startsWith('Report') && title.includes('never fielded a team anyone feared'), `the weakest standing is named when it lags ("${title}")`);
  s.identity = { tags: ['jock-school'], earning: {}, shedding: {} };
  const tagged = composeTitle(s, gradeAxes(s));
  assert(tagged.includes('an athletics school') && !tagged.includes('never fielded a team'), `never the weakness the tag itself claims ("${tagged}")`);
  const good = run(120, 130);
  assert(composeTitle(good, gradeAxes(good)).endsWith('with no glaring weakness'), 'a college with no weak standing is a good one');
}

// ---- The path, read (Plan 95U, the second review's B4-7) ----
{
  // Access names what it measures, not the college's size.
  const closed = run(100, 120, { access: [10, 20] });
  const title = composeTitle(closed, gradeAxes(closed));
  assert(title.endsWith('that stayed hard to get into') && !title.includes('opened its doors'), `a weak access standing is a college hard to get into ("${title}")`);
}
{
  // Satisfaction that leads the field for most of the arc lifts the
  // experience axis; a year or two of it, or a merely good one, does not.
  const withSatisfaction = (s: GameState, at: (i: number) => number) => {
    s.history.forEach((h, i) => { h.satisfactionAverage = at(i); });
    return s;
  };
  const experience = (s: GameState) => gradeAxes(s).find((a) => a.axis === 'experience')!;
  const plain = experience(run(60, 60));
  const happy = run(60, 60);
  const happiest = withSatisfaction(happy, () => 90);
  assert(satisfactionLeads(happiest), 'satisfaction at 90 every year leads the field');
  const led = experience(happiest);
  assert(led.score > plain.score + 10, `the experience axis reads it (${led.score} against ${plain.score})`);
  assert(gradeAxes(happiest).filter((a) => a.axis !== 'experience').every((a, i) => a.score === gradeAxes(run(60, 60)).filter((b) => b.axis !== 'experience')[i].score), 'and no other axis');
  const brief = withSatisfaction(run(60, 60), (i) => (i < 20 ? 90 : 70));
  assert(!satisfactionLeads(brief) && experience(brief).score === plain.score, 'twenty years of it of fifty is not most of the arc');
  const good = withSatisfaction(run(60, 60), () => 80);
  assert(!satisfactionLeads(good) && experience(good).score === plain.score, 'good satisfaction is not leading satisfaction');
}
{
  // An earned tag names the college before one its standing implies.
  const s = run(100, 120, { athleticStrength: [10, 20] });
  s.identity = { tags: ['party-school', 'jock-school'], earning: {}, shedding: {} };
  assert(composeTitle(s, gradeAxes(s)).includes('a party school'), 'with no record behind either, the guidebooks\' first tag');
  s.orgs.titles = [{ sport: 'Football', year: 30 }];
  const champions = composeTitle(s, gradeAxes(s));
  assert(champions.includes('an athletics school') && !champions.includes('party'), `a title earns the athletics tag before the party one ("${champions}")`);
  s.identity = { tags: ['party-school'], earning: {}, shedding: {} };
  assert(composeTitle(s, gradeAxes(s)).includes('an athletics school'), 'even before the guidebooks catch up');
  s.orgs.titles = [];
  s.history.forEach((h, i) => { h.standings = { athleticStrength: i === 40 ? 8 : 40 }; });
  assert(titleTag(s, gradeAxes(s)) === 'jock-school', 'a year in the athletics top ten earns it too');
  s.history.forEach((h) => { h.standings = { athleticStrength: 40 }; });
  s.orgs.lastSeason = { Football: { year: 49, sport: 'Football', seed: 3, finish: 'semifinal', beaten: [], lostTo: 'X', champion: 'X', championMascot: 'X' } };
  assert(titleTag(s, gradeAxes(s)) === 'jock-school', 'and so does a final four');
  s.orgs.lastSeason = {};

  const r = run(100, 120);
  r.identity = { tags: ['country-club'], earning: {}, shedding: {} };
  assert(titleTag(r, gradeAxes(r)) === 'country-club', 'an implied tag stands when nothing is earned');
  r.research.prizes = 2;
  assert(titleTag(r, gradeAxes(r)) === 'research-powerhouse', 'research prizes earn the research tag before a country club');
  r.research.prizes = 0;
  r.history.forEach((h) => { h.standings = { academics: 4 }; });
  assert(titleTag(r, gradeAxes(r)) === 'teaching-college', 'the academics top ten earns the teaching tag');
  r.history.forEach((h) => { h.standings = { financial: 2 }; });
  assert(titleTag(r, gradeAxes(r)) === 'old-money', 'and financial strength\'s, the old-money one');
  const strong = run(100, 120, { researchStanding: [130, 140] });
  strong.history.forEach((h) => { h.standings = { academics: 4, researchStanding: 3 }; });
  strong.identity = { tags: [], earning: {}, shedding: {} };
  assert(titleTag(strong, gradeAxes(strong)) === 'research-powerhouse', 'of two earned tags the guidebooks missed, the one on the stronger standing');
}

// ---- The whole report ----
{
  const s = run(90, 120);
  s.promises = { active: [], settled: [{ id: 'debt-free', year: 20, kept: true }, { id: 'loyal-alumni', year: 30, kept: false }], declined: [{ id: 'sound-estate', year: 12 }], offer: null };
  s.finance.endowment = 50_000_000;
  const r = finalReport(s);
  assert(r.axes.length === 6 && ['A', 'B', 'C', 'D', 'F'].includes(r.mark), 'six grades and a mark');
  assert(r.kept.length === 1 && r.missed.length === 1 && r.declined === 1, 'the promises, kept, missed and declined');
  assert(r.finances[0].startsWith('It left its successors far richer'), `the money's verdict (${r.finances[0]})`);
  assert(r.finances[r.finances.length - 1] === 'It ends owing nothing.', 'and the debt');
  assert(r.rank >= 1 && r.total === s.rivals.length + 1, 'the guide\'s last word');
  assert(JSON.stringify(JSON.parse(JSON.stringify(r))) === JSON.stringify(r), 'plain JSON, so it saves');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
