// ---------------------------------------------------------------------
// The course descriptions (src/data/courseDescriptions.ts).
//
// Authored content, so the checks are authoring checks: every key names a
// real undergraduate course, every sentence follows the two rules the
// table's header states (one sentence in the entry courses' register; it
// says something the title does not), and — the invariant Plan 20's PRs
// D–G built toward — that EVERY undergraduate course has one. While the
// table filled, this test printed how many courses were still on the
// template fallback and held the count to going down; the templates are
// gone now, so a course added without a description cannot land.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { COURSE_DESCRIPTIONS, GRADUATE_COURSE_DESCRIPTIONS } from '../src/data/courseDescriptions';
import { initialTech } from '../src/data/techData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('course description tests');

const courses = initialTech().filter((t) => t.kind === 'course' && t.graduateProgram === undefined);
const byId = new Map(courses.map((t) => [t.id, t]));
const titleOf = (id: string): string => byId.get(id)!.name.replace(/^[A-Z]+ \d+ · /, '');

// --- every key is a course, and every sentence is one sentence --------
{
  for (const [id, text] of Object.entries(COURSE_DESCRIPTIONS)) {
    assert(byId.has(id), `${id} names an undergraduate course`);
    if (!byId.has(id)) continue;
    const title = titleOf(id);
    assert(/^[A-Z]/.test(text) && text.endsWith('.'), `${id} is a capitalized sentence ending in a full stop`);
    // One sentence: no full stop followed by a space and a capital inside
    // it. Abbreviations and initials are allowed a stop before a lower-case
    // continuation ("e.g. the"), which the catalog does not use anyway.
    assert(!/\. [A-Z]/.test(text), `${id} is one sentence, not several`);
    assert(!/\b[A-Z]{4}\s?\d{3}\b/.test(text), `${id} names no course code`);
    assert(!/\bthis course\b/i.test(text), `${id} does not say "this course"`);
    assert(text.length >= 40, `${id} says enough to be a description (${text.length} chars)`);
    // It says something the title does not: the sentence with the title
    // and a stock lead-in removed still has substance in it.
    const stripped = text
      .replace(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
      .replace(/^(A|An|The)?\s*(study|survey|introduction|examination|exploration|overview|look)\s+(of|at|to|into)\b/i, '')
      .replace(/^(Studies|Surveys|Introduces|Examines|Explores|Covers|Looks at)\b/i, '')
      .replace(/[^a-z]/gi, '');
    assert(stripped.length >= 25, `${id} says something its title ("${title}") does not: "${text}"`);
  }
}

// --- every course in the catalog has an authored description --------
{
  const missing = courses.filter((t) => !(t.id in COURSE_DESCRIPTIONS));
  console.log(`  · ${courses.length - missing.length} of ${courses.length} undergraduate courses have an authored description`);
  assert(
    missing.length === 0,
    `every course in the catalog has an authored description — ${missing.length} do not: ${missing.slice(0, 8).map((t) => t.id).join(', ')}${missing.length > 8 ? ', …' : ''}`,
  );
  // And the seed really does read the table: every course's Buildable
  // carries its sentence, verbatim, and nothing generated.
  for (const t of courses) {
    assert(t.description === COURSE_DESCRIPTIONS[t.id], `${t.id}'s Buildable carries its authored description`);
  }
  assert(!courses.some((t) => /^(Builds on|A closer look at|Extends first-year|Applies .* fundamentals to|Advanced, capstone-level|A specialized deep dive|Capstone coursework in|Senior-level study of)/.test(t.description)),
    'no course carries one of the eight retired template sentences');
}

// --- the graduate courses (Plan 72C): the same rules, every one --------
{
  const grads = initialTech().filter((t) => t.kind === 'course' && t.graduateProgram !== undefined);
  const gradIds = new Set(grads.map((t) => t.id));
  const seen = new Set<string>();
  for (const [id, text] of Object.entries(GRADUATE_COURSE_DESCRIPTIONS)) {
    assert(gradIds.has(id), `${id} names a graduate course`);
    assert(/^[A-Z]/.test(text) && text.endsWith('.') && !/\. [A-Z]/.test(text), `${id} is one capitalized sentence`);
    assert(!/\b[A-Z]{2,4}\s?\d{3}\b/.test(text) && !/\bthis course\b/i.test(text), `${id} names no course code and does not say "this course"`);
    assert(text.length >= 60, `${id} says enough (${text.length} chars)`);
    assert(!seen.has(text), `${id} is not a copy of another`);
    seen.add(text);
  }
  const missing = grads.filter((t) => !(t.id in GRADUATE_COURSE_DESCRIPTIONS));
  console.log(`  · ${grads.length - missing.length} of ${grads.length} graduate courses have an authored description`);
  assert(missing.length === 0, `every graduate course has one — missing: ${missing.map((t) => t.id).join(', ')}`);
  for (const t of grads) {
    const authored = GRADUATE_COURSE_DESCRIPTIONS[t.id];
    // The entry course (no prereqs: its gate is dynamic) adds the gate.
    const entry = t.prereqs.length === 0;
    assert(entry ? t.description.startsWith(`${authored} Founds `) : t.description === authored,
      `${t.id}'s Buildable carries its sentence${entry ? ', then its gate' : ''}`);
    assert(!/coursework in .*, part of the/.test(t.description), `${t.id} no longer carries the generated line`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
