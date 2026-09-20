// ---------------------------------------------------------------------
// The research topic catalogue (src/data/researchTopics.ts).
//
// Authored content, so the failures worth guarding against are authoring
// failures: a field nobody wrote topics for, a typo'd field name that
// silently makes a topic unstaffable, a duplicated id that shadows another
// row through researchTopic(), and — the one this pass exists for — a
// topic no facility can ever host, which is content the player pays for in
// file size and never sees. Since Plan 20's PR B that last check covers
// every topic: a school's facility hosts the departments the school
// teaches but has not equipped, so there is no reserve content any more.
//
// The pool-size checks are the point of the PR stated as a number: a
// facility that can only ever be offered two project names will show the
// same two for a decade, and "the names repeat" is not something a unit
// test notices unless somebody writes down how much variety is enough.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { RESEARCH_TOPICS, isCrossDisciplinary, researchTopic } from '../src/data/researchTopics';
import { FACULTY_FIELDS } from '../src/data/facultyData';
import { hostableFields, labFields, researchSchools } from '../src/data/techData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const LAB_IDS = researchSchools().flatMap((school) => school.labIds);
const EQUIPPED = new Set(LAB_IDS.flatMap((id) => labFields(id)));
const HOSTED = new Set(LAB_IDS.flatMap((id) => hostableFields(id)));
const ALL_FIELDS = new Set<string>(FACULTY_FIELDS);

// Which facilities could host a topic: those hosting a field it names —
// their own field, or a field their school teaches that has no facility
// of its own (Plan 20's PR B) — and then, if it restricts itself, only
// the ones it lists.
function hosts(topic: { fields: readonly string[]; labs?: readonly string[] }): string[] {
  return LAB_IDS.filter((id) => (
    hostableFields(id).some((f) => topic.fields.includes(f)) && (!topic.labs || topic.labs.includes(id))
  ));
}

console.log('research topic tests');

// --- the table is well formed ----------------------------------------
{
  const ids = RESEARCH_TOPICS.map((t) => t.id);
  const names = RESEARCH_TOPICS.map((t) => t.name);
  assert(new Set(ids).size === ids.length, `no duplicate topic ids (${ids.length - new Set(ids).size} repeated)`);
  assert(new Set(names).size === names.length, `no duplicate topic names (${names.length - new Set(names).size} repeated)`);

  for (const t of RESEARCH_TOPICS) {
    assert(t.name.trim().length > 0, `${t.id} has a name`);
    assert(t.fields.length >= 1 && t.fields.length <= 3, `${t.id} names one to three fields`);
    assert(new Set(t.fields).size === t.fields.length, `${t.id} does not name the same field twice`);
    for (const f of t.fields) {
      assert(ALL_FIELDS.has(f), `${t.id} names a real faculty field ("${f}")`);
    }
    assert(researchTopic(t.id) === t, `${t.id} is findable by id`);
  }
}

// --- every department has something to work on ------------------------
{
  const MIN_PER_FIELD = 6;
  for (const field of FACULTY_FIELDS) {
    const own = RESEARCH_TOPICS.filter((t) => !isCrossDisciplinary(t) && t.fields[0] === field);
    assert(own.length >= MIN_PER_FIELD, `${field} has at least ${MIN_PER_FIELD} departmental topics (has ${own.length})`);
  }
  const cross = RESEARCH_TOPICS.filter(isCrossDisciplinary);
  assert(cross.length >= 50, `the interdisciplinary set is at least 50 topics (is ${cross.length})`);
  console.log(`  · ${RESEARCH_TOPICS.length} topics: ${RESEARCH_TOPICS.length - cross.length} departmental, ${cross.length} interdisciplinary`);
}

// --- and every topic is reachable ---------------------------------------
{
  // Work has to happen somewhere. Only eleven fields have a facility of
  // their own, and until Plan 20's PR B only those eleven could be offered
  // anything: 108 of the 176 departmental topics were "reserve content",
  // written for the day their field got a building, and the suite printed
  // the gap on every run. Every school now has a facility, so the day
  // arrived in every school and in no field — and the hosting rule
  // (techData.ts's hostableFields) lets a school's building host the
  // departments the school teaches but has not equipped. Which makes this
  // the invariant the module comment always claimed: EVERY topic, of either
  // kind, has a facility that can host it.
  const cross = RESEARCH_TOPICS.filter(isCrossDisciplinary);
  const unreachableCross = cross.filter((t) => hosts(t).length === 0);
  assert(
    unreachableCross.length === 0,
    `every interdisciplinary topic has a facility that can host it — ${unreachableCross.length} do not` +
    (unreachableCross.length ? `, e.g. "${unreachableCross[0].name}" (${unreachableCross[0].fields.join(' + ')})` : ''),
  );

  const departmental = RESEARCH_TOPICS.filter((t) => !isCrossDisciplinary(t));
  const stranded = departmental.filter((t) => hosts(t).length === 0);
  assert(
    stranded.length === 0,
    `every departmental topic is offerable at at least one facility — ${stranded.length} are not` +
    (stranded.length ? `, e.g. "${stranded[0].name}" (${stranded[0].fields[0]}${stranded[0].labs ? `, restricted to ${stranded[0].labs.join(', ')}` : ''})` : ''),
  );
  assert(
    HOSTED.size === FACULTY_FIELDS.length,
    `every faculty field is hosted somewhere (${HOSTED.size} of ${FACULTY_FIELDS.length})`,
  );
  console.log(`  · ${RESEARCH_TOPICS.length - stranded.length - unreachableCross.length} of ${RESEARCH_TOPICS.length} topics are reachable`);

  // A restriction that names a facility which could not host the topic
  // anyway is a typo, not a restriction.
  for (const t of RESEARCH_TOPICS) {
    if (!t.labs) continue;
    for (const id of t.labs) {
      assert(LAB_IDS.includes(id), `${t.id} restricts itself to a facility that exists ("${id}")`);
      assert(
        hostableFields(id).some((f) => t.fields.includes(f)),
        `${t.id}'s restriction to ${id} names a facility that hosts a field it actually uses`,
      );
    }
  }
}

// --- the hosting rule, stated ------------------------------------------
{
  // A facility hosts its own field, and the fields its school teaches that
  // have no facility of their own anywhere — never a field some OTHER
  // building is for. So the Neuroscience labs are not offered Biology's
  // work because the MD makes Biology a Health Science field, and neither
  // half of the two shared-field pairs is widened by the rule at all.
  for (const id of LAB_IDS) {
    const own = labFields(id);
    const hosted = hostableFields(id);
    assert(own.every((f) => hosted.includes(f)), `${id} still hosts its own field`);
    assert(
      hosted.every((f) => own.includes(f) || !EQUIPPED.has(f)),
      `${id} hosts no field that has a facility of its own elsewhere (${hosted.filter((f) => !own.includes(f) && EQUIPPED.has(f)).join(', ')})`,
    );
  }
  assert(hostableFields('LAB-NOT-A-THING').length === 0, 'an id that names no facility hosts nothing, rather than throwing');

  // The two that read worst, by name.
  assert(hostableFields('LAB-COMP').includes('Artificial Intelligence'), 'the Computing Research Center can run an AI project');
  assert(hostableFields('LAB-HIST').includes('English'), 'the Humanities Research Institute can run a project in English');
  // And the three departments that teach in two schools are hosted by both.
  assert(hostableFields('LAB-HIST').includes('English') && hostableFields('LAB-FILM').includes('English'), 'English is hosted by both the institute and the studio');
  assert(hostableFields('LAB-BIOL').includes('Mathematics') && hostableFields('LAB-COMP').includes('Mathematics'), 'Mathematics by both Science and Computer Science');
  assert(hostableFields('LAB-ECON').includes('Operations Research') && hostableFields('LAB-MECH').includes('Operations Research'), 'Operations Research by both Business and Engineering');

  const led = [...EQUIPPED].sort();
  console.log(`  · ${led.length} fields have a facility of their own; the other ${FACULTY_FIELDS.length - led.length} lead work in their school's building`);
}

// --- enough variety per facility that names stop repeating ------------
{
  // The complaint this PR answers, as a number. A facility draws one topic
  // per depth tier per quarter, so a pool of two means the same name comes
  // back around within the year.
  const MIN_DEPARTMENTAL = 4;   // the pilot tier draws from these alone
  const MIN_TOTAL = 8;
  for (const id of LAB_IDS) {
    const pool = RESEARCH_TOPICS.filter((t) => hosts(t).includes(id));
    const departmental = pool.filter((t) => !isCrossDisciplinary(t));
    assert(
      departmental.length >= MIN_DEPARTMENTAL,
      `${id} has at least ${MIN_DEPARTMENTAL} departmental topics to draw on (has ${departmental.length})`,
    );
    assert(pool.length >= MIN_TOTAL, `${id} has at least ${MIN_TOTAL} topics in total (has ${pool.length})`);
  }

  const sizes = LAB_IDS.map((id) => RESEARCH_TOPICS.filter((t) => hosts(t).includes(id)).length);
  console.log(`  · per-facility pools: ${Math.min(...sizes)}–${Math.max(...sizes)} topics`);
}

// --- the two pairs of twins stay apart --------------------------------
{
  // Physics is fielded by both the Physics Labs and the Aerospace
  // Engineering Lab; Chemistry by both the Chemistry Labs and the Chemical
  // Engineering Labs. The restriction exists so the pure and applied halves
  // do not read each other's project names — "Acoustics of Performance
  // Spaces in the Aerospace Engineering Lab" is the note that started this.
  const twins: Array<[string, string]> = [['LAB-PHYS', 'LAB-AERO'], ['LAB-CHMY', 'LAB-CHEM']];
  for (const [a, b] of twins) {
    assert(LAB_IDS.includes(a) && LAB_IDS.includes(b), `${a} and ${b} both exist`);
    assert(
      labFields(a).join() === labFields(b).join(),
      `${a} and ${b} really do share a field (${labFields(a).join()} / ${labFields(b).join()})`,
    );
    const aOnly = RESEARCH_TOPICS.filter((t) => hosts(t).includes(a) && !hosts(t).includes(b));
    const bOnly = RESEARCH_TOPICS.filter((t) => hosts(t).includes(b) && !hosts(t).includes(a));
    assert(aOnly.length >= 2, `${a} has work of its own that ${b} never sees (${aOnly.length})`);
    assert(bOnly.length >= 2, `${b} has work of its own that ${a} never sees (${bOnly.length})`);
  }

  const acoustics = researchTopic('X10');
  assert(!!acoustics && !hosts(acoustics).includes('LAB-AERO'), 'the aerospace lab is never offered the acoustics of performance spaces');
  assert(!!acoustics && hosts(acoustics).includes('LAB-PHYS'), 'and the physics labs still are');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
