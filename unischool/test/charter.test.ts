// ---------------------------------------------------------------------
// The charters (Plan 72E, Plan 78G, Plan 127): the first lab at work brings
// the Institute charter as a matter to decide in the inbox, "Become X
// Institute" (the default after four weeks) or "Keep the name X College",
// with no modal and drawing nothing from the run's stream; its letter
// carries the college's one rename (Plan 80D: the pennant renames nothing),
// taken while it waits and refused before and after. The first graduate
// program founded brings the University charter, "Become X University" or
// "Keep the name". A college founded as an Institute or a University gets
// the tellings D4 names. Old saves load (D5); the founding screen's name
// helpers read the three titles.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { reducer } from '../src/engine/reducer';
import { bindScriptStream, drawsSoFar } from '../src/engine/random';
import { tickEvents } from '../src/systems/events/eventSystem';
import { timeOutCatalogue } from '../src/systems/events/catalogueEngine';
import { INSTITUTE_CHARTER_INSTANCE, UNIVERSITY_CHARTER_INSTANCE, graduateProgramFounded } from '../src/systems/events/charter';
import { isCharterEvent } from '../src/data/eventCatalogue';
import { graduatePrograms } from '../src/data/techData';
import { eventById } from '../src/systems/events/catalogue';
import { answered, inboxItems } from '../src/systems/inbox/inbox';
import { readSave, SAVE_VERSION } from '../src/state/persistence';
import { createInitialState } from '../src/state/actions';
import { recordUnlocks } from '../src/state/unlocks';
import { bareSchoolName, institutionName, typedPrefixed, typedTitle, WEEKS_PER_YEAR, type GameState, type InstitutionTitle } from '../src/state/types';

bindScriptStream(7273);
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

console.log('charter tests');

const raw = readFileSync(join(process.cwd(), 'test/fixtures/save-v78-charter.json'), 'utf8');
const held = JSON.parse(raw) as { version: number; state: GameState };
// A version-103 save with the old charter letter waiting in the inbox.
const raw103 = readFileSync(join(process.cwd(), 'test/fixtures/save-v103.json'), 'utf8');

// The same college the week before the old modal, loaded at today's
// version: a lab at work, no charter yet.
function beforeCharter(title: InstitutionTitle = 'College'): GameState {
  const read = readSave(raw);
  if ('refused' in read) throw new Error(read.refused);
  const s = read.state;
  s.self.charters = { institute: false, university: title === 'University' };
  s.self.suffix = title;
  return s;
}
const waiting = (s: GameState) => s.catalogue?.pending.find((p) => p.instanceId === INSTITUTE_CHARTER_INSTANCE);
const waitingUniversity = (s: GameState) => s.catalogue?.pending.find((p) => p.instanceId === UNIVERSITY_CHARTER_INSTANCE);
// A graduate program housed in its host, as founding leaves it.
function foundGraduate(s: GameState): void {
  const hall = Object.keys(s.halls).find((id) => s.halls[id].some((x) => x.programId === null))!;
  const slot = s.halls[hall].findIndex((x) => x.programId === null);
  s.halls[hall][slot] = { programId: graduatePrograms()[0].id };
}
// A tick on a week nothing else holds: an earlier tick may have drawn a
// letter, answered before this one.
const quietTick = (s: GameState) => { s.pendingInterrupt = null; tickEvents(s); };
const labelsOf = (_s: GameState, p: { eventId: string; vars: Record<string, string> }) =>
  eventById(p.eventId)!.choices.map((c) => c.label.replace('{name}', p.vars.name).replace('{school}', p.vars.school));
const weeksOn = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) {
    s.clock.week += 1;
    if (s.clock.week > WEEKS_PER_YEAR) { s.clock.week = 1; s.clock.year += 1; }
  }
};

// ---- The matter ----
{
  const s = beforeCharter();
  const name = institutionName(s.self);
  const log = s.log.length;
  const draws = drawsSoFar();
  tickEvents(s);
  assert(drawsSoFar() === draws, 'raising the charter draws nothing from the run\'s stream');
  assert(s.pendingInterrupt === null, 'with no modal');
  assert(s.self.charters.institute && waiting(s) !== undefined, 'the first lab brings the Institute charter, waiting in the inbox');
  assert(institutionName(s.self) === name && s.log.length === log, `and nothing is renamed or logged yet (${institutionName(s.self)})`);
  const item = inboxItems(s).find((i) => i.ref === INSTITUTE_CHARTER_INSTANCE);
  assert(item?.tier === 'decide' && item.subject === 'The charter' && item.from === 'The board' && item.weeksLeft === 4, `a matter to decide, "The charter", from the board, four weeks to answer (${item?.from}: ${item?.subject}, ${item?.weeksLeft})`);
  const e = eventById(waiting(s)!.eventId)!;
  const labels = labelsOf(s, waiting(s)!);
  assert(labels[0] === `Become ${s.self.name} Institute` && labels[1] === `Keep the name ${s.self.name} College` && e.default === 'institute', `two answers, the first the default (${labels.join(' / ')})`);
  assert(!/University/.test(e.text), 'the letter no longer offers University');
  // Written to "you", as every letter is (Plan 125 C, docs/design/voice.md;
  // it was "the President" until then).
  assert(/\byou\b/.test(e.text) && !/\bthe President\b/.test(e.text), 'written to "you", not to "the President"');
  tickEvents(s);
  assert(s.catalogue!.pending.filter((p) => isCharterEvent(p.eventId)).length === 1, 'raised once');
}

// ---- The default: Institute after four weeks ----
{
  const s = beforeCharter();
  tickEvents(s);
  const college = institutionName(s.self);
  weeksOn(s, 3);
  timeOutCatalogue(s);
  assert(s.self.suffix === 'College' && waiting(s) !== undefined, 'three weeks on it still waits');
  weeksOn(s, 1);
  timeOutCatalogue(s);
  assert(s.self.suffix === 'Institute' && waiting(s) === undefined, `four weeks on it takes its default: ${institutionName(s.self)}`);
  const line = s.log.find((l) => /granted a charter/.test(l.message));
  assert(line !== undefined && line.message.includes(`${college} is now ${institutionName(s.self)}`), `the log line: "${line?.message}"`);
  assert(answered(s)[0]?.message === `The charter — Nobody answered in time: Become ${s.self.name} Institute.`, `the Answered list keeps it: "${answered(s)[0]?.message}"`);
  assert(inboxItems(s).some((i) => i.tier === 'bulletin' && /granted a charter/.test(i.subject)), 'and the week\'s bulletins carry the rename');
  const again = s.log.length;
  tickEvents(s);
  assert(!s.log.slice(0, s.log.length - again).some((l) => /charter/.test(l.message)) && waiting(s) === undefined, 'once');
}

// ---- The answers, through the reducer ----
{
  const start = beforeCharter();
  tickEvents(start);
  const up = reducer(start, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'institute' });
  assert(up.self.suffix === 'Institute' && waiting(up) === undefined, `"Become X Institute" renames at once (${institutionName(up.self)})`);

  const name = institutionName(start.self);
  const kept = reducer(start, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'college' });
  assert(institutionName(kept.self) === name && kept.self.name === start.self.name && kept.self.suffix === 'College', `keeping the name leaves it, and the pennant, alone (${institutionName(kept.self)})`);
  assert(waiting(kept) === undefined && kept.self.charters.institute, 'the matter is settled and the charter granted');
  assert(kept.log.some((l) => l.message === `Your first laboratory is open, and the board has granted a charter. ${name} keeps its name.`), 'the log says so');
  assert(answered(kept)[0]?.message === `The charter — Answered: Keep the name ${start.self.name} College.`, `the Answered list keeps the choice: "${answered(kept)[0]?.message}"`);
  const later = structuredClone(kept);
  tickEvents(later);
  assert(waiting(later) === undefined && later.self.suffix === 'College', 'and it is not offered again');
  assert(reducer(kept, { type: 'RENAME_COLLEGE', name: kept.self.name, suffix: 'Institute' }) === kept, 'nothing renames the college after the charter is settled');
  assert(reducer(kept, { type: 'RENAME_COLLEGE', name: 'Ashgrove', suffix: 'College' }) === kept, 'not even its name');
  assert(recordUnlocks(structuredClone(kept)).includes('secondEmpire'), 'a college that kept its name still earns the charter\'s architecture (D3)');

  // A rename while it waits: the answers follow the new name.
  const moved = reducer(start, { type: 'RENAME_COLLEGE', name: 'Ashgrove', suffix: 'College' });
  assert(waiting(moved)?.vars.name === 'Ashgrove', 'a rename while it waits renames its answers');
}

// ---- The one rename, in the charter's letter (Plan 80D) ----
{
  const plain = createInitialState('Hollis');
  assert(reducer(plain, { type: 'RENAME_COLLEGE', name: 'Ashgrove', suffix: 'College' }) === plain, 'before the charter, nothing renames the college');

  // The letter's answer with a new name typed, as the inbox sends it: the
  // rename, then the answer.
  const s = beforeCharter();
  tickEvents(s);
  const renamed = reducer(s, { type: 'RENAME_COLLEGE', name: '  Ashgrove University ', suffix: 'College' });
  assert(renamed.self.name === 'Ashgrove' && renamed.self.suffix === 'College', `while it waits, a rename drops a typed suffix; the answer decides it (${institutionName(renamed.self)})`);
  assert(/is renamed Ashgrove College/.test(renamed.log[0]?.message ?? ''), 'and says so in the log');
  assert(reducer(s, { type: 'RENAME_COLLEGE', name: '   ', suffix: 'College' }) === s, 'an empty name is refused');
  assert(reducer(s, { type: 'RENAME_COLLEGE', name: s.self.name, suffix: 'College' }) === s, 'as is no change at all');
  const long = reducer(s, { type: 'RENAME_COLLEGE', name: 'X'.repeat(90), suffix: 'College' });
  assert(long.self.name.length === 60, 'a name is cut at the founding screen\'s length');
  assert(reducer(s, { type: 'RENAME_COLLEGE', name: 'Ashgrove', suffix: 'University' }).self.suffix === 'College', 'a rename cannot take a title the letter does not open');
  const up = reducer(renamed, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'institute' });
  assert(institutionName(up.self) === 'Ashgrove Institute', `the answer carves the new name (${institutionName(up.self)})`);
  assert(reducer(up, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'Institute' }) === up, 'and it is the last rename the college gets');
  // The University letter has no name field, and opens no rename (D2).
  foundGraduate(up);
  quietTick(up);
  assert(waitingUniversity(up) !== undefined && reducer(up, { type: 'RENAME_COLLEGE', name: 'Hollis', suffix: 'Institute' }) === up, 'nor does the University charter open one');
}

// ---- The University charter (Plan 127, D1) ----
{
  const s = beforeCharter();
  tickEvents(s);
  foundGraduate(s);
  assert(graduateProgramFounded(s), 'a graduate program housed counts as founded');
  const draws = drawsSoFar();
  tickEvents(s);
  assert(waitingUniversity(s) === undefined && !s.self.charters.university, 'it waits while the Institute charter waits');
  const kept = reducer(s, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'college' });
  quietTick(kept);
  assert(drawsSoFar() === draws, 'raising it draws nothing from the run\'s stream');
  const p = waitingUniversity(kept);
  assert(p !== undefined && kept.self.charters.university, `the first graduate program brings the University charter, waiting in the inbox (${kept.pendingInterrupt?.type ?? 'no modal'})`);
  const item = inboxItems(kept).find((i) => i.ref === UNIVERSITY_CHARTER_INSTANCE);
  assert(item?.subject === 'The university charter' && item.from === 'The board' && item.weeksLeft === 4, `"The university charter", from the board (${item?.subject})`);
  const labels = labelsOf(kept, p!);
  assert(labels[0] === `Become ${kept.self.name} University` && labels[1] === `Keep the name ${kept.self.name} College` && eventById(p!.eventId)!.default === 'university', `two answers, University the default (${labels.join(' / ')})`);
  quietTick(kept);
  assert(kept.catalogue!.pending.filter((x) => x.instanceId === UNIVERSITY_CHARTER_INSTANCE).length === 1, 'raised once');

  const timed = structuredClone(kept);
  weeksOn(timed, 4);
  timeOutCatalogue(timed);
  assert(timed.self.suffix === 'University' && waitingUniversity(timed) === undefined, `four weeks on it takes its default (${institutionName(timed.self)})`);
  assert(timed.log.some((l) => l.message === `Your first graduate program has begun, and the board has granted a university charter. ${kept.self.name} College is now ${kept.self.name} University.`), 'with its own log line');

  const stays = reducer(kept, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: UNIVERSITY_CHARTER_INSTANCE, choiceId: 'keep' });
  assert(stays.self.suffix === 'College' && waitingUniversity(stays) === undefined, 'keeping the name keeps it');
  quietTick(stays);
  assert(waitingUniversity(stays) === undefined, 'and it is not offered again');

  // An Institute is offered University too, and may keep its name.
  const inst = reducer(s, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'institute' });
  quietTick(inst);
  assert(labelsOf(inst, waitingUniversity(inst)!)[1] === `Keep the name ${inst.self.name} Institute`, 'an Institute may keep its name');
  const instUp = reducer(inst, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: UNIVERSITY_CHARTER_INSTANCE, choiceId: 'university' });
  assert(instUp.self.suffix === 'University', 'or become a University');

  // No graduate program, no letter.
  const none = beforeCharter();
  tickEvents(none);
  const settled = reducer(none, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'institute' });
  quietTick(settled);
  assert(waitingUniversity(settled) === undefined && !settled.self.charters.university, 'a lab alone brings no University charter');
}

// ---- Founded under an unlocked title (Plan 127, D4) ----
{
  const inst = beforeCharter('Institute');
  quietTick(inst);
  const p = waiting(inst)!;
  const e = eventById(p.eventId)!;
  assert(e.choices.length === 1 && labelsOf(inst, p)[0] === `Keep the name ${inst.self.name} Institute`, `founded as an Institute, the letter only keeps the name (${labelsOf(inst, p).join(' / ')})`);
  const moved = reducer(inst, { type: 'RENAME_COLLEGE', name: 'Ashgrove', suffix: 'Institute' });
  assert(institutionName(moved.self) === 'Ashgrove Institute', 'and still carries the rename');
  weeksOn(inst, 4);
  timeOutCatalogue(inst);
  assert(inst.self.suffix === 'Institute' && waiting(inst) === undefined, 'its default keeps the name');
  foundGraduate(inst);
  quietTick(inst);
  assert(waitingUniversity(inst) !== undefined, 'the University letter comes as usual');

  const uni = beforeCharter('University');
  tickEvents(uni);
  const q = waiting(uni)!;
  const labels = labelsOf(uni, q);
  assert(labels[0] === `Keep the name ${uni.self.name} University` && labels[1] === `Become ${uni.self.name} Institute` && eventById(q.eventId)!.default === 'university', `founded as a University: keep it, or Institute (${labels.join(' / ')})`);
  const asInst = reducer(uni, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'institute' });
  assert(asInst.self.suffix === 'Institute', 'it may become an Institute');
  const kept = reducer(uni, { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: INSTITUTE_CHARTER_INSTANCE, choiceId: 'university' });
  foundGraduate(kept);
  quietTick(kept);
  assert(waitingUniversity(kept) === undefined && kept.self.suffix === 'University', 'and no University letter comes');

  const founded = createInitialState('Hollis', undefined, undefined, false, 1, false, 'University');
  assert(institutionName(founded.self) === 'Hollis University' && founded.self.charters.university && !founded.self.charters.institute, 'a college founded a University opens under it, its University charter spent');
  assert(institutionName(createInitialState('Hollis').self) === 'Hollis College', 'with no title chosen, a College');
}

// ---- Saves ----
{
  assert(held.version === 78 && held.state.pendingInterrupt?.type === 'charter', 'the fixture is a version-78 save held at the old modal');
  const read = readSave(raw);
  if ('refused' in read) {
    assert(false, `it loads (refused: ${read.refused})`);
  } else {
    const s = read.state;
    assert(s.pendingInterrupt === null && s.self.suffix === 'University' && s.self.charters.institute && s.self.charters.university, 'it loads chartered, with no modal, both letters spent');
    const week = (y: number, w: number) => y * 52 + w;
    assert(week(s.clock.year, s.clock.week) === week(held.state.clock.year, held.state.clock.week) + 1, 'a week on, as answering it was');
    assert(/university charter/.test(s.log[0]?.message ?? ''), 'with the charter in the log');
    tickEvents(s);
    assert(waiting(s) === undefined && s.self.suffix === 'University', 'and a college chartered before the matter is never asked');
    foundGraduate(s);
    quietTick(s);
    assert(waitingUniversity(s) === undefined, 'nor given a University letter (D5)');
  }

  // Version 103, the old letter waiting: answered with its default (D5).
  const v103 = JSON.parse(raw103) as { version: number; state: GameState & { self: { universityCharterOffered?: boolean } } };
  assert(v103.version === 103 && v103.state.catalogue!.pending.some((p) => p.eventId === 'university-charter') && v103.state.self.suffix === 'College', 'the fixture is a version-103 save with the old charter waiting');
  const r103 = readSave(raw103);
  if ('refused' in r103) {
    assert(false, `it loads (refused: ${r103.refused})`);
  } else {
    const s = r103.state;
    assert(s.self.suffix === 'University' && s.self.charters.institute && s.self.charters.university, `the held letter takes its default, University (${institutionName(s.self)})`);
    assert(!s.catalogue!.pending.some((p) => p.eventId === 'university-charter') && !('universityCharterOffered' in s.self), 'and leaves nothing of the old charter behind');
    assert(/is now .* University/.test(s.log[0]?.message ?? ''), `with the grant in the log (${s.log[0]?.message})`);
    assert(s.catalogue!.lastAnswer?.['charter-university']?.choiceId === 'university', 'its answer remembered under the letter that now asks it');
  }

  // Version 103, the old charter answered "Keep the name": it has had the
  // Institute letter, and may still have the University letter (D5).
  const keptOld = JSON.parse(raw103) as typeof v103;
  keptOld.state.catalogue!.pending = keptOld.state.catalogue!.pending.filter((p) => p.eventId !== 'university-charter');
  keptOld.state.catalogue!.lastAnswer = { ...keptOld.state.catalogue!.lastAnswer, 'university-charter': { choiceId: 'college', year: 7 } };
  const rKept = readSave(JSON.stringify(keptOld));
  if ('refused' in rKept) {
    assert(false, `a kept-College save loads (refused: ${rKept.refused})`);
  } else {
    const s = rKept.state;
    assert(s.self.suffix === 'College' && s.self.charters.institute && !s.self.charters.university, 'a college that kept College has had the Institute letter, not the University one');
    tickEvents(s);
    assert(waiting(s) === undefined, 'so it is not asked again with its lab');
    foundGraduate(s);
    quietTick(s);
    assert(waitingUniversity(s) !== undefined, 'and gets the University letter at its first graduate program');
  }

  // Version 103, the old charter taken: University, both letters spent.
  const tookOld = JSON.parse(raw103) as typeof v103;
  tookOld.state.catalogue!.pending = tookOld.state.catalogue!.pending.filter((p) => p.eventId !== 'university-charter');
  tookOld.state.self.suffix = 'University';
  const rTook = readSave(JSON.stringify(tookOld));
  assert(!('refused' in rTook) && rTook.state.self.suffix === 'University' && rTook.state.self.charters.university, 'a college that took University keeps it, with no letter to come');

  // A save from before this change, written the week before the charter:
  // it loads, and the charter comes as the matter.
  const before = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: beforeCharter() }));
  if ('refused' in before) {
    assert(false, `a save before the charter loads (refused: ${before.refused})`);
  } else {
    tickEvents(before.state);
    assert(waiting(before.state) !== undefined && before.state.self.suffix === 'College', 'a save from before the charter loads and is asked');
    // And one saved with the matter waiting keeps it.
    const again = readSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: before.state }));
    assert(!('refused' in again) && waiting(again.state) !== undefined, 'a save with the charter waiting keeps it');
  }
}

// ---- The founding screen's name helpers ----
{
  assert(typedTitle('Harwick University') === 'University' && typedTitle('  harwick institute ') === 'Institute' && typedTitle('Harwick College') === 'College', 'a typed title is read');
  assert(typedTitle('Harwick') === null && typedTitle('University') === null && typedTitle('Universityville') === null, 'nothing else is');
  assert(bareSchoolName('Harwick Institute') === 'Harwick' && bareSchoolName('Harwick University') === 'Harwick', 'a typed title is dropped from the name');
  assert(typedPrefixed('University of Ashford') && typedPrefixed(' college of the Holy Cross') && typedPrefixed('Institute of Ashford'), 'a name opening "University of", "Institute of" or "College of" gets its own caption');
  assert(!typedPrefixed('Ashford') && !typedPrefixed('University of') && !typedPrefixed('Ashford University'), 'nothing else does');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
