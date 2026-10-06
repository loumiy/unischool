// ---------------------------------------------------------------------
// The milestone and the choice (Plan 85D, systems/prestige/milestone.ts).
// What is worth pinning:
//
//   - the board's notice comes when the college first stands within reach
//     of the milestone, before it reaches it, as a board letter that names
//     the four specializations and what each lifts, and never stops the
//     clock;
//   - the choice is offered at the first summer at the milestone, raised at
//     that summer's close on the new year's first week (holding no week),
//     and a college below the milestone is never offered it;
//   - choosing lifts only that pillar's limit (and, for athletics, the team
//     ceiling and the big stage); the others' words say they stay;
//   - "not this year" leaves it open, and it comes back at the next
//     summer's close even below the milestone; once made it is permanent:
//     no second choice, and it is never raised again;
//   - a save round trip keeps it, mid-choice too; the version-88 fixture
//     migrates to none; the chronicle marks the year;
//   - the choice in prestige points (Plan 95F): each card's "up to" figure
//     is the pillar's weight times the share's points; its comparison line
//     is prestigeSystem's target on a copy with that share full, ranked by
//     the guide's own function; the strongest pillar is the best-ranked;
//     the intro is two sentences;
//   - the harness's rule: the strongest pillar (value, then rank on a
//     tie), or a fixed pick.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { ATHLETICS_COMPLEX_ID } from '../src/data/athleticsComplexData';
import { join } from 'node:path';
import type { Action } from '../src/state/actions';
import type { GameState, Pillar } from '../src/state/types';
import { exportSave, readSave, SAVE_VERSION } from '../src/state/persistence';
import { reduceInPlace } from '../src/engine/reducer';
import { defaultAnswer } from '../src/engine/defaultAnswers';
import {
  PILLARS, PILLAR_WEIGHTS, SPECIALIZATION_MILESTONE_RANK, SPECIALIZATION_NOTICE_PLACES, SPECIALIZATION_NOTICE_YEARS, SPECIALIZATION_PILLAR_RANK, SPECIALIZATION_PILLAR_YEAR, SPECIALIZATION_TERM_WEIGHTS,
  computePrestigeTarget, pillarBreakdown, pillarValue, prestigeBreakdown, specializationOf,
} from '../src/systems/prestige/prestigeSystem';
import {
  bestPillarStanding, collegeSpecialization, shareFullProjection, specializationOptions, strongestStanding, tickSpecialization, type SpecializationPayload,
} from '../src/systems/prestige/milestone';
import { decimal } from '../src/format';
import { pillarShareRule, specializationOfferRule, specializationShareWorth } from '../src/data/prestigeWords';
import { playerRank, rankBy, rankedList } from '../src/systems/rivals/rivalsSystem';
import { teamQualityCurve } from '../src/data/studentLifeData';
import { finalReport } from '../src/state/finalReport';
import { TAG_PHRASES } from '../src/data/reportData';
import { athleticsLifted } from '../src/systems/prestige/specialization';
import { SPECIALIZED_STAGE_SHARE, STAGE_EDGE, stageEdge } from '../src/systems/athletics/playoffs';
import { inboxItems } from '../src/systems/inbox/inbox';
import { BOARD_LETTERS } from '../src/data/boardData';
import { CHOICE_WORDS, SPECIALIZATION_CARDS, SPECIALIZATION_NOTICE_ID, opensLine, withShareFull } from '../src/data/specializationData';
import { chronicleOf } from '../src/systems/chronicle/chronicle';
import { answerAll, foundGame, type Player } from '../sim/harness/game';
import { chooseSpecialization, strongestOf, strongestPillar } from '../sim/harness/specialization';
import { brokenRules } from '../sim/harness/invariants';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('specialization choice tests');

const FIXTURES = join(process.cwd(), 'test/fixtures');
function launch(): GameState {
  const read = readSave(readFileSync(join(FIXTURES, 'save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  return read.state;
}

// Puts the college at `place` in the guide, between two rivals' overalls.
function standAt(s: GameState, place: number): void {
  const rivals = rankedList(s).filter((e) => !e.isPlayer);
  const above = rivals[place - 2]?.value ?? Infinity;
  const below = rivals[place - 1].value;
  s.self.reputation = Number.isFinite(above) ? (above + below) / 2 : below + 1;
}

// Puts the college at `place` in research's standing (Plan 95R's second
// route): the rivals above it raised over its value, the rest held to it
// (level, the college stands ahead). Then far down the guide overall, so
// only the pillar can bring the notice or the offer.
function researchAt(s: GameState, place: number, overall = 60): void {
  const v = pillarValue(s, 'research');
  const field = [...s.rivals].sort((a, b) => b.researchStanding - a.researchStanding);
  field.forEach((r, i) => { r.researchStanding = i < place - 1 ? Math.max(r.researchStanding, v + 1) : Math.min(r.researchStanding, v); });
  standAt(s, overall);
}

function act(s: GameState, a: Action): GameState {
  return reduceInPlace(s, a);
}

// Ticks to the summer's week and raises it, then answers the summer as the
// game's default does, never the choice: returns the state at the close.
function toSummer(s: GameState, keep?: (s: GameState) => void): GameState {
  for (let i = 0; i < 60 && s.pendingInterrupt?.type !== 'summer'; i += 1) {
    while (s.pendingInterrupt && s.pendingInterrupt.type !== 'summer') s = act(s, defaultAnswer(s)!);
    keep?.(s);
    s = act(s, { type: 'TICK' });
  }
  if (s.pendingInterrupt?.type !== 'summer') throw new Error('no summer came');
  return s;
}
function closeSummer(s: GameState): GameState {
  while (s.pendingInterrupt?.type === 'summer') s = act(s, defaultAnswer(s)!);
  return s;
}

// ---- The notice, before the milestone ----
{
  let s = launch();
  s.clock.week = 10;
  assert(specializationOf(s) === null && s.specialization === 'none' && s.specializationNotice === undefined, 'the launch fixture has no specialization and no notice');
  const place = SPECIALIZATION_MILESTONE_RANK + SPECIALIZATION_NOTICE_PLACES;
  // Out of reach: nothing.
  standAt(s, place + 3);
  s = act(s, { type: 'TICK' });
  assert(s.specializationNotice === undefined, `at #${playerRank(s)}, out of reach, no notice`);
  // Within reach, short of the milestone: the notice, and no offer.
  standAt(s, place);
  s = act(s, { type: 'TICK' });
  assert(playerRank(s) > SPECIALIZATION_MILESTONE_RANK, `the college stands short of the milestone (#${playerRank(s)})`);
  assert(s.specializationNotice === s.clock.year || s.specializationNotice === s.clock.year - 1, `within ${SPECIALIZATION_NOTICE_PLACES} places of it, the board's notice comes (${s.specializationNotice})`);
  assert(s.finance.distress?.letters.includes(SPECIALIZATION_NOTICE_ID) === true, 'as a board letter');
  assert(s.pendingInterrupt === null && s.specializationOffered === undefined, 'which stops nothing and offers nothing yet');
  const item = inboxItems(s).find((i) => i.ref === SPECIALIZATION_NOTICE_ID);
  assert(item !== undefined && item.from === 'From the board' && item.tier === 'letter', 'the inbox files it as the board\'s letter');
  const letter = BOARD_LETTERS[SPECIALIZATION_NOTICE_ID];
  assert(letter.text.includes(`top ${SPECIALIZATION_MILESTONE_RANK}`) && letter.text.includes(`from Year ${SPECIALIZATION_PILLAR_YEAR}, of the top ${SPECIALIZATION_PILLAR_RANK} in one of the four pillars`), `it names both routes ("${letter.text.slice(0, 160)}")`);
  for (const p of PILLARS) {
    const name = SPECIALIZATION_CARDS[p].name.replace(/^The /, 'the ');
    // What each opens, in points of prestige (Plan 95F), never the pillar's.
    assert(letter.text.includes(name) && letter.text.includes(decimal(specializationShareWorth(p), 1)), `it names ${name} and what it opens`);
  }
  assert(!/opens \d+ points/.test(letter.text), 'no share in the pillar\'s own points');
  assert(!/archetype|ceiling|limit/i.test(letter.text), 'in the glossary\'s words, and no limit it no longer has');
  // Once only.
  const letters = s.finance.distress!.letters.filter((l) => l === SPECIALIZATION_NOTICE_ID).length;
  s = act(s, { type: 'TICK' });
  assert(s.finance.distress!.letters.filter((l) => l === SPECIALIZATION_NOTICE_ID).length === letters, 'and it comes once');
  // Short of the milestone at the summer: no choice at its close.
  s = toSummer(s, (x) => standAt(x, place + 2));
  s = closeSummer(s);
  assert(s.specializationOffered === undefined && s.pendingInterrupt === null, `short of the milestone at the summer (#${playerRank(s)}), no choice is offered`);
}

// ---- The offer, exactly at the milestone, on the summer's week ----
{
  const s = launch();
  s.clock.week = 52;
  standAt(s, SPECIALIZATION_MILESTONE_RANK + 1);
  s.pendingInterrupt = { type: 'summer', payload: { beat: 0, tuition: s.finance.listedTuition, admitRate: s.students.admitRate } };
  tickSpecialization(s);
  assert(s.specializationOffered === undefined, `one place short (#${playerRank(s)}), no offer`);
  standAt(s, SPECIALIZATION_MILESTONE_RANK);
  tickSpecialization(s);
  assert(playerRank(s) === SPECIALIZATION_MILESTONE_RANK && s.specializationOffered === s.clock.year, `at #${SPECIALIZATION_MILESTONE_RANK} on the summer's week, the offer is made`);
  // Not on an ordinary week.
  const t = launch();
  t.clock.week = 30;
  standAt(t, 1);
  tickSpecialization(t);
  assert(t.specializationOffered === undefined && t.specializationNotice === t.clock.year, 'first in the guide mid-year: the notice, but the offer waits for the summer');
}

// ---- The second route: a pillar's top SPECIALIZATION_PILLAR_RANK, from Year SPECIALIZATION_PILLAR_YEAR (Plan 95R) ----
{
  // Too early: first in research, and neither notice nor offer.
  const early = launch();
  early.clock.year = SPECIALIZATION_PILLAR_YEAR - SPECIALIZATION_NOTICE_YEARS - 1;
  early.clock.week = 52;
  early.pendingInterrupt = { type: 'summer', payload: { beat: 0, tuition: early.finance.listedTuition, admitRate: early.students.admitRate } };
  researchAt(early, 1);
  tickSpecialization(early);
  assert(early.specializationNotice === undefined && early.specializationOffered === undefined, `#1 in research in Year ${early.clock.year}: no notice and no offer yet`);
  early.clock.year = SPECIALIZATION_PILLAR_YEAR - 1;
  tickSpecialization(early);
  assert(early.specializationNotice === early.clock.year && early.specializationOffered === undefined, `in Year ${early.clock.year}, the notice and still no offer`);

  // The notice, by the pillar alone.
  let s = launch();
  s.clock.year = SPECIALIZATION_PILLAR_YEAR - SPECIALIZATION_NOTICE_YEARS;
  s.clock.week = 10;
  researchAt(s, SPECIALIZATION_PILLAR_RANK + SPECIALIZATION_NOTICE_PLACES + 3);
  s = act(s, { type: 'TICK' });
  assert(s.specializationNotice === undefined, `at #${rankBy(s, 'researchStanding')} in research and #${playerRank(s)} overall, no notice`);
  researchAt(s, SPECIALIZATION_PILLAR_RANK + SPECIALIZATION_NOTICE_PLACES);
  s = act(s, { type: 'TICK' });
  assert(playerRank(s) > SPECIALIZATION_MILESTONE_RANK + SPECIALIZATION_NOTICE_PLACES, `the college stands far down the guide (#${playerRank(s)})`);
  assert(bestPillarStanding(s).pillar === 'research' && bestPillarStanding(s).rank <= SPECIALIZATION_PILLAR_RANK + SPECIALIZATION_NOTICE_PLACES, `and #${bestPillarStanding(s).rank} in research`);
  assert(s.specializationNotice !== undefined && s.finance.distress?.letters.includes(SPECIALIZATION_NOTICE_ID) === true, `within ${SPECIALIZATION_NOTICE_PLACES} places of a pillar's top ${SPECIALIZATION_PILLAR_RANK}, the board's notice comes`);
  assert(s.specializationOffered === undefined, 'and no offer yet');

  // The offer, by the pillar alone, on the summer's week.
  const t = launch();
  t.clock.year = SPECIALIZATION_PILLAR_YEAR;
  t.clock.week = 52;
  t.pendingInterrupt = { type: 'summer', payload: { beat: 0, tuition: t.finance.listedTuition, admitRate: t.students.admitRate } };
  researchAt(t, SPECIALIZATION_PILLAR_RANK + 1);
  tickSpecialization(t);
  assert(t.specializationOffered === undefined, `one place short in research (#${rankBy(t, 'researchStanding')}), no offer`);
  assert(t.specializationNotice !== undefined, 'but the notice');
  researchAt(t, SPECIALIZATION_PILLAR_RANK);
  tickSpecialization(t);
  assert(rankBy(t, 'researchStanding') === SPECIALIZATION_PILLAR_RANK && playerRank(t) > SPECIALIZATION_MILESTONE_RANK, `#${SPECIALIZATION_PILLAR_RANK} in research, #${playerRank(t)} overall`);
  assert(t.specializationOffered === t.clock.year, 'the offer is made');
  assert(t.log[0].message.includes(`#${SPECIALIZATION_PILLAR_RANK} in research`), `the log names the pillar ("${t.log[0].message}")`);

  // A save mid-year already in a pillar's top 10: offered at its next
  // summer, not at once.
  let u = launch();
  u.clock.year = SPECIALIZATION_PILLAR_YEAR;
  u.clock.week = 30;
  researchAt(u, 3);
  const read = readSave(exportSave(u).text);
  assert(!('refused' in read), 'the save loads');
  u = (read as { state: GameState }).state;
  u = act(u, { type: 'TICK' });
  assert(u.specializationOffered === undefined && u.pendingInterrupt?.type !== 'specialization', 'loaded mid-year in research\'s top 10: no offer at once');
  assert(u.specializationNotice !== undefined, 'the notice comes at once');
  const year = u.clock.year;
  u = toSummer(u, (x) => researchAt(x, 3));
  assert(u.specializationOffered === year, `the offer comes at the year's summer (Year ${u.specializationOffered})`);
  u = closeSummer(u);
  assert(u.pendingInterrupt?.type === 'specialization', 'and the choice at its close');
  // All four stay open whichever route: the choice takes athletics.
  u = act(u, { type: 'RESOLVE_SPECIALIZATION', pillar: 'athletics' });
  assert(specializationOf(u) === 'athletics', 'a college brought by research may choose athletics');
}

// ---- The words name both routes (Plan 95R) ----
{
  const s = launch();
  const rule = specializationOfferRule();
  assert(rule.includes(`top ${SPECIALIZATION_MILESTONE_RANK}`) && rule.includes(`from Year ${SPECIALIZATION_PILLAR_YEAR}, in the top ${SPECIALIZATION_PILLAR_RANK} of any one pillar`), `the rule names both routes ("${rule}")`);
  assert(collegeSpecialization(s).endsWith(rule), 'the status line says it');
}

// ---- The choice at the milestone summer; not this year; then for good ----
{
  let s = launch();
  s.clock.week = 40;
  // Well inside the milestone, so the field's summer drift cannot move it out.
  s = toSummer(s, (x) => standAt(x, SPECIALIZATION_MILESTONE_RANK - 6));
  const summerYear = s.clock.year;
  assert(s.specializationOffered === summerYear, `at the milestone on the summer's week (#${playerRank(s)}), the offer is made (${s.specializationOffered})`);
  assert(s.specializationNotice !== undefined, 'with the notice, if it had not come before');
  assert(s.pendingInterrupt?.type === 'summer', 'and the summer is answered first');
  s = closeSummer(s);
  assert(s.pendingInterrupt?.type === 'specialization', 'at the summer\'s close, the choice is raised');
  assert((s.pendingInterrupt?.payload as SpecializationPayload | undefined)?.year === summerYear, 'filed under the summer\'s year');
  assert(s.clock.year === summerYear + 1 && s.clock.week === 1, `on the new year's first week (Year ${s.clock.year}, week ${s.clock.week})`);
  assert(inboxItems(s)[0]?.tier === 'hold', 'held first in the inbox');
  // The clock waits on it.
  const held = act(structuredClone(s), { type: 'TICK' });
  assert(held.clock.week === 1, 'the clock waits for an answer');
  // The game's own default never chooses.
  assert(JSON.stringify(defaultAnswer(s)) === JSON.stringify({ type: 'RESOLVE_SPECIALIZATION', pillar: null }), 'the game\'s default puts it off');

  // Not this year: open, and back at the next summer's close, even below the milestone.
  s = act(s, { type: 'RESOLVE_SPECIALIZATION', pillar: null });
  assert(s.pendingInterrupt === null && specializationOf(s) === null && s.clock.week === 1, 'not this year: nothing chosen, and no week passes');
  s = toSummer(s, (x) => standAt(x, SPECIALIZATION_MILESTONE_RANK + 8));
  s = closeSummer(s);
  assert(s.pendingInterrupt?.type === 'specialization', `the next summer's close offers it again, even at #${playerRank(s)}`);

  // A mid-choice save round trip.
  const mid = readSave(exportSave(s).text);
  assert(!('refused' in mid) && mid.state.pendingInterrupt?.type === 'specialization', 'a save written mid-choice loads with the choice standing');

  // Choosing research opens only research's term.
  const before = pillarBreakdown(s, 'academics');
  const researchBefore = pillarBreakdown(s, 'research');
  s = act(s, { type: 'RESOLVE_SPECIALIZATION', pillar: 'research' });
  assert(s.specialization === 'research' && specializationOf(s) === 'research', 'research is chosen');
  assert(s.specializationYear === summerYear + 1, `in the year of the summer it closed (Year ${s.specializationYear})`);
  assert(s.pendingInterrupt === null && s.clock.week === 1, 'and the clock is free, with no week passed');
  const term = (x: GameState, p: Pillar) => pillarBreakdown(x, p).inputs.find((i) => i.key === 'specialization')!;
  assert(term(s, 'research').score > 0 && term(s, 'research').weight === SPECIALIZATION_TERM_WEIGHTS.research, `research's term opens (${term(s, 'research').score} of it)`);
  assert(pillarBreakdown(s, 'research').target > researchBefore.target, 'and research\'s target rises with it');
  for (const p of PILLARS.filter((x) => x !== 'research')) {
    assert(term(s, p).score === 0 && /specialized in research, so this stays empty/.test(term(s, p).detail), `${p}'s term stays empty, and says why`);
  }
  assert(Math.abs(pillarBreakdown(s, 'academics').target - before.target) < 1e-9, 'academics is where it was');
  assert(stageEdge(s, 'final') === STAGE_EDGE.final && !athleticsLifted(s), 'the teams keep their slowdown and the big stage');
  const research = pillarBreakdown(s, 'research');
  assert(research.ceiling === undefined && research.specialized !== undefined, 'research\'s breakdown has no cap, and says it is specialized');
  const rows = prestigeBreakdown(s).inputs;
  assert(/specialized in research/.test(rows.find((i) => i.key === 'research')!.detail), 'prestige\'s research row says so');
  assert(brokenRules(s).length === 0, `the rules hold (${brokenRules(s).join('; ')})`);

  // Permanent: no second choice, and never raised again.
  s = act(s, { type: 'RESOLVE_SPECIALIZATION', pillar: 'academics' });
  assert(s.specialization === 'research', 'a second answer changes nothing');
  s = toSummer(s, (x) => standAt(x, 1));
  s = closeSummer(s);
  assert(s.pendingInterrupt === null && s.specialization === 'research', 'no summer raises the choice again');

  // A save round trip.
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back) && back.state.specialization === 'research' && back.state.specializationYear === summerYear + 1, 'a save round trip keeps the specialization and its year');
  // The Final Report names the specialization first, in the card's words.
  const title = finalReport(s).title;
  assert(title.includes(': a college known first for what its laboratories find'), `the Final Report names the specialization first ("${title}")`);
  assert(!Object.values(TAG_PHRASES).some((p) => title.includes(`: ${p}`)), 'not a guidebook tag');
  // The chronicle marks the year.
  const said = chronicleOf(s).eras.flatMap((e) => e.lines).filter((l) => /chose to specialize in research/.test(l));
  assert(said.length === 1 && said[0].includes(`Year ${summerYear + 1}`), `the chronicle marks the year once (${said.join(' | ')})`);
}

// ---- A college that never specialized keeps the guidebooks' phrase ----
{
  const s = launch();
  s.identity = { tags: ['jock-school'], earning: {}, shedding: {} };
  const title = finalReport(s).title;
  assert(title.includes(`: ${TAG_PHRASES['jock-school']}`) && !/known first/.test(title), `unspecialized, the report keeps the tag's phrase ("${title}")`);
  s.specialization = 'academics';
  s.specializationYear = s.clock.year;
  const specialized = finalReport(s).title;
  assert(specialized.includes(': a college known first for its teaching') && !specialized.includes(TAG_PHRASES['jock-school']), `specialized, its specialization comes first ("${specialized}")`);
}

// ---- Athletics lifts the teams too ----
{
  const s = launch();
  s.specialization = 'athletics';
  s.specializationYear = s.clock.year - 3;
  // Its term reads the complex's deep runs (Plan 85G): one standing, with a title.
  s.tech.find((t) => t.id === ATHLETICS_COMPLEX_ID)!.status = 'done';
  s.orgs.complexRuns = [{ year: s.clock.year - 1, sport: 'soccer-m', finish: 'champion' }];
  const athletics = pillarBreakdown(s, 'athletics').inputs.find((i) => i.key === 'specialization')!;
  const academics = pillarBreakdown(s, 'academics').inputs.find((i) => i.key === 'specialization')!;
  assert(athletics.score > 0 && academics.score === 0, 'athletics opens only its own term');
  s.tech.find((t) => t.id === ATHLETICS_COMPLEX_ID)!.status = 'locked';
  assert(athleticsLifted(s) && teamQualityCurve(95, athleticsLifted(s)) === 95 && stageEdge(s, 'final') === Math.round(STAGE_EDGE.final * SPECIALIZED_STAGE_SHARE), 'and takes away the teams\' slowdown and shrinks the big stage to a quarter, without the complex');
}

// ---- A college that never reaches the milestone never specializes ----
{
  let s = launch();
  s.clock.week = 40;
  for (let year = 0; year < 2; year += 1) {
    s = toSummer(s, (x) => standAt(x, SPECIALIZATION_MILESTONE_RANK + 8));
    s = closeSummer(s);
  }
  assert(s.specializationOffered === undefined && specializationOf(s) === null && s.pendingInterrupt === null, 'short of the milestone, summer after summer, nothing is offered');
  // A sandbox run is never offered it.
  let box = launch();
  box.sandbox = true;
  box.clock.week = 40;
  box = toSummer(box, (x) => standAt(x, 1));
  assert(box.specializationOffered === undefined && box.specializationNotice === undefined, 'nor is a sandbox run');
}

// ---- The migration ----
{
  const raw = readFileSync(join(FIXTURES, 'save-v88.json'), 'utf8');
  const parsed = JSON.parse(raw) as { version: number; state: GameState };
  assert(parsed.version === 88 && !('specialization' in parsed.state), 'the version-88 fixture predates the college\'s specialization');
  const read = readSave(raw);
  assert(!('refused' in read), 'it loads');
  if (!('refused' in read)) {
    assert(read.state.specialization === 'none' && read.state.specializationYear === undefined && read.state.specializationOffered === undefined && read.state.specializationNotice === undefined,
      'with no specialization, no notice and no offer');
    assert(SAVE_VERSION >= 89, `at version 89 or later (${SAVE_VERSION})`);
  }
  // A bad value is none; a choice without its year takes the offer's.
  const bad = { ...parsed, version: SAVE_VERSION, state: { ...parsed.state, specialization: 'archery', specializationYear: 12 } };
  const reread = readSave(JSON.stringify(bad));
  assert(!('refused' in reread) && reread.state.specialization === 'none' && reread.state.specializationYear === undefined, 'a specialization that is not one is none, with no year');
  const yearless = { ...parsed, version: SAVE_VERSION, state: { ...parsed.state, specialization: 'research', specializationOffered: 7 } };
  const yl = readSave(JSON.stringify(yearless));
  assert(!('refused' in yl) && yl.state.specialization === 'research' && yl.state.specializationYear === 7, 'a choice with no year takes the offer\'s');
}

// ---- The choice in prestige points (Plan 95F, the second review's B2-3, B3-6) ----
{
  const s = launch();
  standAt(s, SPECIALIZATION_MILESTONE_RANK - 4);
  const reputation = s.self.reputation;
  for (const p of PILLARS) {
    // The "up to" figure: the pillar's weight times the share's points.
    const worth = PILLAR_WEIGHTS[p] * SPECIALIZATION_TERM_WEIGHTS[p];
    assert(Math.abs(specializationShareWorth(p) - worth) < 1e-12, `${p}'s share is worth its weight times its points (${specializationShareWorth(p)})`);
    assert(CHOICE_WORDS.worth(specializationShareWorth(p)) === `Up to ${decimal(worth, 1)} points of prestige`, `${p}'s card says "${CHOICE_WORDS.worth(specializationShareWorth(p))}"`);
    // The pillar's own points stay, in the detail.
    assert(opensLine(p, SPECIALIZATION_TERM_WEIGHTS[p]).includes(`${SPECIALIZATION_TERM_WEIGHTS[p]} of the pillar's 150 points`), `${p}'s detail keeps the pillar's points`);

    // The comparison line: prestigeSystem on the copy with that share full.
    const filled = withShareFull(s, p);
    const share = pillarBreakdown(filled, p).inputs.find((i) => i.key === 'specialization')!;
    assert(share.contribution === share.weight, `on the copy, ${p}'s share is full`);
    for (const q of PILLARS.filter((x) => x !== p)) {
      assert(pillarBreakdown(filled, q).inputs.find((i) => i.key === 'specialization')!.contribution === 0, `and ${q}'s stays empty`);
    }
    const lift = computePrestigeTarget(filled) - computePrestigeTarget(s);
    const full = shareFullProjection(s, p);
    assert(Math.abs(full.after - full.before - lift) < 1e-9 && full.before === reputation, `${p}: prestige ${full.before.toFixed(1)} → ${full.after.toFixed(1)} is prestigeSystem's target on the filled copy (+${lift.toFixed(2)})`);
    assert(lift <= worth + 1e-9 && (prestigeBreakdown(filled).held || Math.abs(lift - worth) < 1e-6), `${p}: the lift is the share's worth, or less under the teaching standard`);
    assert(full.rankBefore === playerRank(s) && full.rankAfter === playerRank({ ...s, self: { ...s.self, reputation: full.after } }), `${p}: the rank is the guide's (#${full.rankBefore} → #${full.rankAfter})`);
    assert(full.rankAfter <= full.rankBefore, `${p}: a full share never drops the rank`);
    assert(/^Full today: prestige [\d.]+ → [\d.]+, (#\d+ → #\d+|still #\d+)\.$/.test(CHOICE_WORDS.compare(full.before, full.after, full.rankBefore, full.rankAfter)), 'the line reads as the plan wrote it');
  }
  // Nothing touched the game's own state.
  assert(s.self.reputation === reputation && PILLARS.every((p) => pillarBreakdown(s, p).inputs.find((i) => i.key === 'specialization')!.contribution === 0), 'the state itself is untouched');

  // The strongest pillar, above the cards (B3-6): the best rank, and the
  // rivals in each.
  const options = specializationOptions(s);
  const strongest = strongestStanding(s);
  assert(strongest.rank === Math.min(...options.map((o) => o.rank)), `the strongest pillar is the best-ranked (${strongest.pillar}, #${strongest.rank})`);
  assert(PILLARS.reduce((n, p) => n + strongest.rivals[p], 0) === s.rivals.filter((r) => PILLARS.includes(r.specialization)).length, 'and every specialized rival is counted once');
  const line = CHOICE_WORDS.strongest(strongest.pillar, strongest.rank, strongest.rivals);
  assert(line.includes(`(#${strongest.rank})`) && PILLARS.every((p) => line.includes(`${strongest.rivals[p]}`)), `the line names it ("${line}")`);

  // The intro: two sentences, the second the rule's own.
  const intro = CHOICE_WORDS.intro(12, SPECIALIZATION_MILESTONE_RANK, { pillar: 'athletics', rank: 40 }, SPECIALIZATION_PILLAR_RANK, pillarShareRule());
  assert(intro.split(/(?<=\.)\s+/).length === 2 && intro.endsWith(pillarShareRule()) && intro.includes('#12 in the guide'), `the intro is two sentences ("${intro}")`);
  // By the pillar's route (Plan 95R): the pillar, not the guide.
  const byPillar = CHOICE_WORDS.intro(44, SPECIALIZATION_MILESTONE_RANK, { pillar: 'athletics', rank: 6 }, SPECIALIZATION_PILLAR_RANK, pillarShareRule());
  assert(byPillar.includes('#6 in athletics') && !byPillar.includes('#44') && byPillar.endsWith(pillarShareRule()), `by a pillar, the intro names it ("${byPillar}")`);
}

// ---- The harness's rule ----
{
  const s = launch();
  const options = specializationOptions(s);
  const top = Math.max(...options.map((o) => o.value));
  const pick = strongestPillar(s);
  const picked = options.find((o) => o.pillar === pick)!;
  assert(top - picked.value <= 0.5, `the strongest pillar has the highest value (${pick} at ${picked.value.toFixed(1)}, top ${top.toFixed(1)})`);
  assert(options.filter((o) => top - o.value <= 0.5).every((o) => o.rank >= picked.rank), 'and, level with another, the better rank');
  // Two pillars level at the top: the better rank wins. On the choice's own
  // figures (since Plan 85I every pillar ranks on its value, which a test
  // cannot set level by hand).
  const level = [
    { pillar: 'academics' as const, value: 120, rank: 9 },
    { pillar: 'research' as const, value: 131, rank: 7 },
    { pillar: 'studentLife' as const, value: 131.3, rank: 3 },
    { pillar: 'athletics' as const, value: 90, rank: 30 },
  ];
  assert(strongestOf(level) === 'studentLife', `level on value, the better rank is chosen (${strongestOf(level)})`);
  level[1].value = 132.3;
  assert(strongestOf(level) === 'research', 'a clear point higher, the higher value is');
  for (const p of PILLARS) assert(chooseSpecialization(s, p) === p, `a fixed pick of ${p} is ${p}`);

  // Through the harness's answer: a player's rule, else the strongest.
  const g = foundGame({ from: s, seed: 1 });
  g.s.pendingInterrupt = { type: 'specialization', payload: { year: g.s.clock.year } };
  g.s.specializationOffered = g.s.clock.year;
  const fixed: Player = { name: 'Fixed', act() {}, specialization: 'athletics' };
  answerAll(g, fixed);
  assert(g.s.specialization === 'athletics', `a player with a fixed pick chooses it (${g.s.specialization})`);
  const h = foundGame({ from: s, seed: 1 });
  h.s.pendingInterrupt = { type: 'specialization', payload: { year: h.s.clock.year } };
  h.s.specializationOffered = h.s.clock.year;
  answerAll(h, { name: 'Plain', act() {} });
  assert(h.s.specialization === pick, `a player with no rule chooses its strongest (${h.s.specialization})`);
}

if (failures > 0) {
  console.error(`  ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
