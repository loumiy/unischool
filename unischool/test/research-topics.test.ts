// ---------------------------------------------------------------------
// The research topic catalogue (src/data/researchTopics.ts).
//
// Authored content, so the failures worth guarding against are authoring
// failures: a field nobody wrote topics for, a typo'd field name that
// silently makes a topic unstaffable, a duplicated id that shadows another
// row through researchTopic(), and — the one this pass exists for — a
// topic no facility can ever host, which is content the player pays for in
// file size and never sees.
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
import { labFields, researchSchools } from '../src/data/techData';

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
const ALL_FIELDS = new Set<string>(FACULTY_FIELDS);

// Which facilities could host a topic: those whose own field it names, and
// then, if it restricts itself, only the ones it lists.
function hosts(topic: { fields: readonly string[]; labs?: readonly string[] }): string[] {
  return LAB_IDS.filter((id) => (
    labFields(id).some((f) => topic.fields.includes(f)) && (!topic.labs || topic.labs.includes(id))
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

// --- and every topic that COULD be reached, is ------------------------
{
  // Work has to happen somewhere, so what a facility can be offered is
  // bounded by the eleven fields that have one. Two different things follow,
  // and only one of them is a defect:
  //
  //   - An INTERDISCIPLINARY topic naming no equipped field is unreachable
  //     and always will be, since nothing about the campus can change which
  //     fields it names. That is a defect, and six of them existed before
  //     this pass.
  //   - A DEPARTMENTAL topic in an unequipped field is reserve content: the
  //     day the catalogue gives that field a facility, its six topics are
  //     already written. Six per field is the plan's target for exactly that
  //     reason, so this is deliberate rather than dead.
  const cross = RESEARCH_TOPICS.filter(isCrossDisciplinary);
  const unreachableCross = cross.filter((t) => hosts(t).length === 0);
  assert(
    unreachableCross.length === 0,
    `every interdisciplinary topic has a facility that can host it — ${unreachableCross.length} do not` +
    (unreachableCross.length ? `, e.g. "${unreachableCross[0].name}" (${unreachableCross[0].fields.join(' + ')})` : ''),
  );

  const equippedDepartmental = RESEARCH_TOPICS
    .filter((t) => !isCrossDisciplinary(t) && EQUIPPED.has(t.fields[0]));
  const stranded = equippedDepartmental.filter((t) => hosts(t).length === 0);
  assert(
    stranded.length === 0,
    `every departmental topic in a field that HAS a facility can be hosted — ${stranded.length} cannot` +
    (stranded.length ? `, e.g. "${stranded[0].name}" (restricted to ${stranded[0].labs?.join(', ')})` : ''),
  );

  const reserve = RESEARCH_TOPICS.filter((t) => hosts(t).length === 0);
  console.log(`  · ${RESEARCH_TOPICS.length - reserve.length} topics are reachable today; ${reserve.length} are departmental work in fields with no facility yet`);

  // A restriction that names a facility which could not host the topic
  // anyway is a typo, not a restriction.
  for (const t of RESEARCH_TOPICS) {
    if (!t.labs) continue;
    for (const id of t.labs) {
      assert(LAB_IDS.includes(id), `${t.id} restricts itself to a facility that exists ("${id}")`);
      assert(
        labFields(id).some((f) => t.fields.includes(f)),
        `${t.id}'s restriction to ${id} names a facility whose field it actually uses`,
      );
    }
  }
}

// --- no department is locked out of research entirely -----------------
{
  // Only eleven fields have a facility, so the other eighteen can never
  // LEAD. They must still be able to take part, which is what the
  // interdisciplinary table is for — a field that appears in no reachable
  // topic is a department that can never do research at all.
  for (const field of FACULTY_FIELDS) {
    const reachable = RESEARCH_TOPICS.filter((t) => t.fields.includes(field) && hosts(t).length > 0);
    assert(reachable.length > 0, `${field} appears in at least one topic some facility can host`);
  }
  const led = [...EQUIPPED].sort();
  console.log(`  · ${led.length} fields can lead work; the other ${FACULTY_FIELDS.length - led.length} join it`);
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
