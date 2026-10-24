// ---------------------------------------------------------------------
// The board's question (Plan 116D, data/boardQuestionData.ts):
//   - raised once a year from Year 25, at week 20, drawing nothing from the
//     run's stream; never in a sandbox or before the matters chapter;
//   - the three questions in turn by year, one it cannot name skipped;
//   - a timeout takes the answer that changes nothing;
//   - each answer does what it says: the expansion's students and mood,
//     the gift's chair and closed program, the honors college's smaller,
//     stronger classes, and the trade between two pillars for five years;
//   - no pause on its arrival (six weeks to answer), one in its last week
//     unopened;
//   - a save round trip.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bindScriptStream } from '../src/engine/random';
import { reducer } from '../src/engine/reducer';
import type { GameState } from '../src/state/types';
import { totalEnrolled, WEEKS_PER_YEAR } from '../src/state/types';
import { exportSave, readSave } from '../src/state/persistence';
import {
  BOARD_QUESTIONS, BOARD_QUESTION_ANSWER_WEEKS, BOARD_QUESTION_FROM_YEAR, BOARD_QUESTION_INSTANCE, BOARD_QUESTION_WEEK,
  BOARD_STANDING_YEARS, BOARD_TRADE_PRESTIGE, CHAIR_GIFT, EXPANSION_EVENT, EXPANSION_MOOD, EXPANSION_SHARE, GIFT_EVENT,
  HONORS_CUT, HONORS_EVENT, HONORS_SUMMERS,
} from '../src/data/boardQuestionData';
import { catalogueOf, raiseBoardQuestion, resolveCatalogueEvent, timeOutCatalogue } from '../src/systems/events/catalogueEngine';
import { eventById, fill, scaledEffects } from '../src/systems/events/catalogue';
import { closeRefusal } from '../src/systems/techtree/techSystem';
import { isHoused } from '../src/systems/techtree/programOffers';
import { PILLAR_WEIGHTS, pillarBreakdown, pillarValue } from '../src/systems/prestige/prestigeSystem';
import { projectAdmissions, trailingYearSatisfaction } from '../src/systems/admissions/admissionsSystem';
import { deriveCohortSignals } from '../src/systems/admissions/cohorts';
import { intakeCeiling } from '../src/systems/techtree/instructionCapacity';
import { inboxItems } from '../src/systems/inbox/inbox';
import { unseenPause, type UnseenMemory } from '../src/systems/inbox/unseen';
import { MATTERS_CHAPTER } from '../src/systems/guidance/gates';
import { fundsOf } from '../src/systems/alumni/funds';
import { answerFor, leadPillar } from '../sim/harness/boardQuestion';

bindScriptStream(1160);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('board question tests');

// The launch fixture: a year-25 Guided run.
function launch(): GameState {
  const read = readSave(readFileSync(join(process.cwd(), 'test/fixtures/save-launch.json'), 'utf8'));
  if ('refused' in read) throw new Error(`the launch fixture is refused: ${read.refused}`);
  const s = read.state;
  s.pendingInterrupt = null;
  return s;
}
function at(year: number, week: number): GameState {
  const s = launch();
  s.clock.year = year;
  s.clock.week = week;
  return s;
}
const waiting = (s: GameState) => catalogueOf(s).pending.filter((p) => p.instanceId === BOARD_QUESTION_INSTANCE);
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// ---- Once a year, from Year 25, at week 20 ----
{
  assert(!raiseBoardQuestion(at(BOARD_QUESTION_FROM_YEAR - 1, 30)), 'never before Year 25');
  assert(!raiseBoardQuestion(at(BOARD_QUESTION_FROM_YEAR, BOARD_QUESTION_WEEK - 1)), 'nor before week 20');
  const s = at(BOARD_QUESTION_FROM_YEAR, BOARD_QUESTION_WEEK);
  const rng = s.rng;
  assert(raiseBoardQuestion(s), 'raised at week 20 of Year 25');
  assert(s.rng === rng, 'drawing nothing from the run\'s stream');
  assert(waiting(s).length === 1 && waiting(s)[0].eventId === EXPANSION_EVENT.id, 'Year 25 asks the first question, the expansion');
  assert(s.pendingInterrupt === null, 'in the inbox, the clock running');
  assert(!raiseBoardQuestion(s), 'once while it waits');
  resolveCatalogueEvent(s, BOARD_QUESTION_INSTANCE, 'decline');
  s.clock.week += 1;
  assert(!raiseBoardQuestion(s), 'and once a year, answered');
  const late = at(BOARD_QUESTION_FROM_YEAR, WEEKS_PER_YEAR - 1);
  assert(raiseBoardQuestion(late), 'a week 20 that passed under a stop raises it later in the year');
  assert(eventById(EXPANSION_EVENT.id) === EXPANSION_EVENT, 'eventById knows it');
  // Never drawn: weight 0, and no seat answers it.
  assert(BOARD_QUESTIONS.every((e) => e.weight === 0 && e.domain === 'board' && e.kind === 'inline'), 'raised, never drawn');
}

// ---- Never in a sandbox, nor before the matters chapter ----
{
  const sandbox = at(BOARD_QUESTION_FROM_YEAR, BOARD_QUESTION_WEEK);
  sandbox.sandbox = true;
  assert(!raiseBoardQuestion(sandbox), 'never in a sandbox');
  const guided = at(BOARD_QUESTION_FROM_YEAR, BOARD_QUESTION_WEEK);
  guided.guidance = { opened: {}, done: {}, met: [], marked: [], gated: true };
  assert(!raiseBoardQuestion(guided), 'never before the matters chapter opens');
  guided.guidance.opened[MATTERS_CHAPTER] = 1;
  assert(raiseBoardQuestion(guided), 'and from it');
}

// ---- In turn, skipping one it cannot name ----
{
  const turn = BOARD_QUESTIONS.map((_, i) => {
    const s = at(BOARD_QUESTION_FROM_YEAR + i, BOARD_QUESTION_WEEK);
    raiseBoardQuestion(s);
    return waiting(s)[0]?.eventId;
  });
  assert(JSON.stringify(turn) === JSON.stringify(BOARD_QUESTIONS.map((e) => e.id)), `in turn by year (${turn.join(', ')})`);
  const again = at(BOARD_QUESTION_FROM_YEAR + BOARD_QUESTIONS.length, BOARD_QUESTION_WEEK);
  raiseBoardQuestion(again);
  assert(waiting(again)[0]?.eventId === BOARD_QUESTIONS[0].id, 'and round again');
  // A college with no program it could close is not asked for one.
  const one = at(BOARD_QUESTION_FROM_YEAR + 1, BOARD_QUESTION_WEEK);
  const keep = Object.values(one.halls).flat().find((x) => x.programId !== null)!.programId;
  for (const hall of Object.values(one.halls)) for (const slot of hall) if (slot.programId !== keep) slot.programId = null;
  raiseBoardQuestion(one);
  assert(waiting(one)[0]?.eventId === HONORS_EVENT.id, 'the gift with no program to close gives way to the next question');
}

// ---- A timeout changes nothing ----
{
  for (const [i, e] of BOARD_QUESTIONS.entries()) {
    const s = at(BOARD_QUESTION_FROM_YEAR + i, BOARD_QUESTION_WEEK);
    raiseBoardQuestion(s);
    const before = structuredClone(s);
    s.clock.week += BOARD_QUESTION_ANSWER_WEEKS - 1;
    timeOutCatalogue(s);
    assert(waiting(s).length === 1, `${e.id}: it waits its six weeks`);
    s.clock.week += 1;
    timeOutCatalogue(s);
    assert(waiting(s).length === 0 && catalogueOf(s).lastAnswer?.[e.id]?.choiceId === e.default, `${e.id}: then takes its default`);
    assert(e.choices.find((c) => c.id === e.default)!.effects && Object.keys(e.choices.find((c) => c.id === e.default)!.effects).length === 0, `${e.id}: a default with no effects`);
    assert(totalEnrolled(s.students) === totalEnrolled(before.students) && s.students.satisfaction === before.students.satisfaction
      && s.finance.endowment === before.finance.endowment && s.boardAnswers === undefined && s.students.honorsSummers === undefined
      && JSON.stringify(s.halls) === JSON.stringify(before.halls), `${e.id}: and nothing changes`);
  }
}

// ---- The expansion ----
{
  const s = at(BOARD_QUESTION_FROM_YEAR, BOARD_QUESTION_WEEK);
  raiseBoardQuestion(s);
  const before = structuredClone(s);
  const pillars = { academics: pillarValue(s, 'academics'), studentLife: pillarValue(s, 'studentLife') };
  assert(resolveCatalogueEvent(s, BOARD_QUESTION_INSTANCE, 'grow'), 'the expansion is answered');
  const added = totalEnrolled(s.students) - totalEnrolled(before.students);
  assert(Math.abs(added - EXPANSION_SHARE * totalEnrolled(before.students)) <= 1, `${EXPANSION_SHARE * 100}% more students (+${added})`);
  assert((['freshman', 'sophomore', 'junior', 'senior'] as const).every((k) => s.students.classes[k] > before.students.classes[k]), 'in every class');
  assert(near(s.students.satisfaction, Math.max(0, before.students.satisfaction + EXPANSION_MOOD)), `satisfaction falls ${-EXPANSION_MOOD} points`);
  assert(s.boardAnswers?.length === 1 && s.boardAnswers[0].year === s.clock.year, 'the trade is recorded');
  const term = pillarBreakdown(s, 'academics').inputs.find((i) => i.key === 'board');
  assert(term !== undefined && near(term.contribution, BOARD_TRADE_PRESTIGE / PILLAR_WEIGHTS.academics), 'academics gains the board\'s term');
  const cost = pillarBreakdown(s, 'studentLife').inputs.find((i) => i.key === 'board');
  assert(cost !== undefined && cost.penalty === true && near(cost.contribution, -BOARD_TRADE_PRESTIGE / PILLAR_WEIGHTS.studentLife), 'student life loses as much prestige');
  // The pillars read the trade alone at once, the students and their mood
  // aside (satisfaction is read on the year's average).
  const trade = pillarValue(s, 'academics') - pillars.academics;
  assert(trade > 0 && pillarValue(s, 'studentLife') < pillars.studentLife, `academics up, student life down (${trade.toFixed(1)})`);
  // For five years.
  s.clock.year += BOARD_STANDING_YEARS - 1;
  assert(pillarBreakdown(s, 'academics').inputs.some((i) => i.key === 'board'), `still counted in its ${BOARD_STANDING_YEARS}th year`);
  s.clock.year += 1;
  assert(!pillarBreakdown(s, 'academics').inputs.some((i) => i.key === 'board') && !pillarBreakdown(s, 'studentLife').inputs.some((i) => i.key === 'board'), 'and gone after');
}

// ---- The conditional gift ----
{
  const s = at(BOARD_QUESTION_FROM_YEAR + 1, BOARD_QUESTION_WEEK);
  raiseBoardQuestion(s);
  const p = waiting(s)[0];
  assert(p.eventId === GIFT_EVENT.id && p.vars.programId !== '' && closeRefusal(s, p.vars.programId) === null, `it names a program the college could close (${p.vars.program})`);
  const text = fill(GIFT_EVENT.text, p.vars);
  assert(!/\{\w+\}/.test(text) && !/\{\w+\}/.test(fill(GIFT_EVENT.choices[0].label, p.vars)), 'and fills every name it says');
  const gift = scaledEffects(GIFT_EVENT.choices[0].effects, p.scale).endowment!;
  assert(gift > 0 && near(gift / p.scale, CHAIR_GIFT, CHAIR_GIFT * 0.05) && text.includes(p.vars.gift), `the gift it names is the one it gives (${p.vars.gift})`);
  const before = structuredClone(s);
  assert(resolveCatalogueEvent(s, BOARD_QUESTION_INSTANCE, 'accept'), 'the gift is taken');
  assert(!isHoused(s, p.vars.programId), 'the program is closed');
  assert(near(s.finance.endowment - before.finance.endowment, gift), 'the endowment takes the gift');
  const chair = fundsOf(s).find((f) => f.name === `The ${p.vars.donor} Chair`);
  assert(chair !== undefined && chair.purpose === 'chair' && chair.holderId !== undefined, 'a named chair, and a professor holds it');
  assert(s.boardAnswers?.[0].prestige.research === BOARD_TRADE_PRESTIGE && s.boardAnswers[0].prestige.academics === -BOARD_TRADE_PRESTIGE, 'research for academics');
}

// ---- The honors college ----
{
  const s = at(BOARD_QUESTION_FROM_YEAR + 2, BOARD_QUESTION_WEEK);
  raiseBoardQuestion(s);
  const preview = (x: GameState) => projectAdmissions(x.self.reputation, x.finance.listedTuition, x.students.capacity, trailingYearSatisfaction(x),
    deriveCohortSignals(x), x.students.admitRate, intakeCeiling(x).seatsLeft);
  const without = preview(s);
  assert(resolveCatalogueEvent(s, BOARD_QUESTION_INSTANCE, 'honors'), 'the honors college is founded');
  assert(s.students.honorsSummers === HONORS_SUMMERS, `for ${HONORS_SUMMERS} summers`);
  const honors = preview(s);
  assert(Math.abs(honors.enrolled - Math.round(without.enrolled * (1 - HONORS_CUT))) <= 1, `next summer's class is ${HONORS_CUT * 100}% smaller (${without.enrolled} to ${honors.enrolled})`);
  assert(honors.avgIncomingQuality >= without.avgIncomingQuality, `and no weaker (${without.avgIncomingQuality.toFixed(1)} to ${honors.avgIncomingQuality.toFixed(1)})`);
  assert(honors.honorsTurnedAway > 0 && without.honorsTurnedAway === 0, 'the preview says how many it turns away');
  // The summer spends one.
  s.clock.week = WEEKS_PER_YEAR;
  const next = reducer(s, { type: 'RESOLVE_ADMISSIONS', tuition: s.finance.listedTuition, admitRate: s.students.admitRate, approvedPetitionIds: [] });
  assert(next.students.honorsSummers === HONORS_SUMMERS - 1, 'each summer counts one off');
  assert(Math.abs(next.students.classes.freshman - honors.enrolled) <= 1, 'and enrolls the class the preview showed');
  assert(next.log.some((l) => /honors college/.test(l.message)), 'and says so');
}

// ---- The harness's answer: by the lead pillar ----
{
  const s = launch();
  const lead = leadPillar(s);
  for (const e of BOARD_QUESTIONS) {
    const id = answerFor(e, lead);
    const c = e.choices.find((x) => x.id === id)!;
    assert((c.standing?.[lead] ?? 0) >= 0, `${e.id}: never an answer that lowers the lead pillar (${lead})`);
  }
}

// ---- No pause on arrival, one in its last week ----
{
  const s = at(BOARD_QUESTION_FROM_YEAR, BOARD_QUESTION_WEEK);
  const step = (before: UnseenMemory | null) => unseenPause(before, { items: inboxItems(s), pauseOnArrival: true, pauseForNews: false, held: false, opened: new Set() });
  let memory = step(null).memory;
  raiseBoardQuestion(s);
  s.clock.week += 1; // the shell first sees it once the clock has turned
  const arrival = step(memory);
  assert(!arrival.pause, 'its arrival never pauses the clock: six weeks to answer');
  memory = arrival.memory;
  let pauses = 0;
  let finalWeek = false;
  for (let w = 1; w < BOARD_QUESTION_ANSWER_WEEKS; w += 1) {
    s.clock.week += 1;
    const out = step(memory);
    memory = out.memory;
    if (out.pause) { pauses += 1; finalWeek = out.reason === 'final-week'; }
  }
  assert(pauses === 1 && finalWeek, `unopened, it pauses once, in its last week (${pauses})`);
}

// ---- A save round trip ----
{
  const s = at(BOARD_QUESTION_FROM_YEAR + 2, BOARD_QUESTION_WEEK);
  raiseBoardQuestion(s);
  const back = readSave(exportSave(s).text);
  assert(!('refused' in back) && waiting(back.state).length === 1 && waiting(back.state)[0].eventId === HONORS_EVENT.id, 'a question waiting survives a save');
  resolveCatalogueEvent(s, BOARD_QUESTION_INSTANCE, 'honors');
  const after = readSave(exportSave(s).text);
  assert(!('refused' in after) && after.state.students.honorsSummers === HONORS_SUMMERS
    && JSON.stringify(after.state.boardAnswers) === JSON.stringify(s.boardAnswers)
    && after.state.catalogue?.lastAnswer?.[HONORS_EVENT.id]?.choiceId === 'honors', 'and so do its answer, the trade and the honors college');
  const bad = JSON.parse(exportSave(s).text) as { state: GameState };
  (bad.state.students as unknown as { honorsSummers: unknown }).honorsSummers = 'four';
  (bad.state as unknown as { boardAnswers: unknown }).boardAnswers = [{ year: 'x' }, ...s.boardAnswers!];
  const fixed = readSave(JSON.stringify(bad));
  assert(!('refused' in fixed) && fixed.state.students.honorsSummers === undefined && fixed.state.boardAnswers?.length === 1, 'a malformed one is dropped');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
