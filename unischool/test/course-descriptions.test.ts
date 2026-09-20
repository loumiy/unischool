// ---------------------------------------------------------------------
// The course descriptions (src/data/courseDescriptions.ts).
//
// Authored content, so the checks are authoring checks: every key names a
// real undergraduate course, every sentence follows the two rules the
// table's header states (one sentence in the entry courses' register; it
// says something the title does not), and — the progress bar for Plan
// 20's PRs E and F — how many courses are still on the template fallback,
// which may only ever go down. FALLBACK_CEILING is that number as of the
// last PR to land; a PR that authors descriptions lowers it, and a PR that
// adds a course without one cannot land.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { COURSE_DESCRIPTIONS } from '../src/data/courseDescriptions';
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

// How many undergraduate courses were still described by a template when
// the last PR landed. 336 is where Plan 20's PR D starts: the 42 entry
// courses have always been authored, and every tier-2 and tier-3 course
// is on the fallback.
const FALLBACK_CEILING = 0;

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
    assert(/^[A-Z]/.test(text) && text.endsWith('.'), `${id} is a capitalised sentence ending in a full stop`);
    // One sentence: no full stop followed by a space and a capital inside
    // it. Abbreviations and initials are allowed a stop before a lower-case
    // continuation ("e.g. the"), which the catalogue does not use anyway.
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

// --- the fallback count, which only goes down -------------------------
{
  const onFallback = courses.filter((t) => !(t.id in COURSE_DESCRIPTIONS));
  console.log(`  · ${courses.length - onFallback.length} of ${courses.length} undergraduate courses have an authored description; ${onFallback.length} are on the template fallback`);
  assert(
    onFallback.length <= FALLBACK_CEILING,
    `the fallback count only goes down — ${onFallback.length} courses are on it, the ceiling is ${FALLBACK_CEILING}: ${onFallback.slice(0, 8).map((t) => t.id).join(', ')}${onFallback.length > 8 ? ', …' : ''}`,
  );
  // And the seed really does read the table: an authored course carries
  // its sentence, verbatim.
  for (const t of courses) {
    const authored = COURSE_DESCRIPTIONS[t.id];
    if (authored !== undefined) assert(t.description === authored, `${t.id}'s Buildable carries its authored description`);
  }
  // Every entry course has always been authored; that never regresses.
  const entries = courses.filter((t) => t.id.endsWith('101'));
  assert(entries.every((t) => t.id in COURSE_DESCRIPTIONS), 'every entry course has an authored description');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
