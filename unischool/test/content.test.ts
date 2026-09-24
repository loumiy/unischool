// What the content tables mean, checked across every table: ids are unique,
// every id a row names exists, and every string a player reads is present
// and free of leftover template tokens. The types already check the shape;
// this checks the references between rows, so a content edit that breaks
// one fails here rather than in play.

import { initialTech, programs, CROSS_MAJOR_BRIDGES } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import { FACULTY_FIELDS } from '../src/data/facultyData';
import { FOUNDING_PROGRAMS } from '../src/data/foundingData';
import { RESEARCH_TOPICS } from '../src/data/researchTopics';
import { DECISION_EVENTS } from '../src/data/eventData';
import { AMBITIONS } from '../src/data/ambitionsData';
import { COURSE_DESCRIPTIONS } from '../src/data/courseDescriptions';
import { SPORTS } from '../src/data/studentLifeData';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) (seen.has(id) ? dupes : seen).add(id);
  return [...dupes];
}

// Text a player reads: present, trimmed, and with no template left in it.
const LEFTOVER = /\$\{|\{\{|\}\}|\bundefined\b|\bNaN\b|\bTODO\b|\bTBD\b|\bXXX\b|\bnull\b/;
function badText(text: string | undefined): boolean {
  return !text || text.trim() !== text || text.length === 0 || LEFTOVER.test(text);
}

console.log('content tests');

// ---- The catalogue: courses, halls, dorms, facilities ----
const catalogue = [...initialTech(), ...initialDorms(), ...initialFacilities()];
const byId = new Map(catalogue.map((t) => [t.id, t]));
const fields = new Set(FACULTY_FIELDS);

assert(duplicates(catalogue.map((t) => t.id)).length === 0, `catalogue ids are unique (${duplicates(catalogue.map((t) => t.id)).join(', ')})`);
{
  const missing = catalogue.flatMap((t) => t.prereqs.filter((p) => !byId.has(p)).map((p) => `${t.id} -> ${p}`));
  assert(missing.length === 0, `every prereq names a catalogue row (${missing.slice(0, 10).join(', ')})`);
  const selfish = catalogue.filter((t) => t.prereqs.includes(t.id)).map((t) => t.id);
  assert(selfish.length === 0, `no row is its own prereq (${selfish.join(', ')})`);
  const unstaffable = catalogue.filter((t) => t.requiresFaculty && !fields.has(t.requiresFaculty)).map((t) => `${t.id}: ${t.requiresFaculty}`);
  assert(unstaffable.length === 0, `every required faculty field exists (${unstaffable.join(', ')})`);
  const unnamed = catalogue.filter((t) => badText(t.name) || badText(t.description)).map((t) => t.id);
  assert(unnamed.length === 0, `every row has a clean name and description (${unnamed.slice(0, 10).join(', ')})`);
  const negative = catalogue.filter((t) => t.cost < 0 || t.duration < 0).map((t) => t.id);
  assert(negative.length === 0, `no negative cost or duration (${negative.join(', ')})`);
}

// The prereq graph has no cycle: a cycle is a set of rows nobody can build.
{
  const state = new Map<string, 'visiting' | 'done'>();
  const cycles: string[] = [];
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') { cycles.push([...path, id].join(' -> ')); return; }
    state.set(id, 'visiting');
    for (const p of byId.get(id)?.prereqs ?? []) visit(p, [...path, id]);
    state.set(id, 'done');
  };
  for (const t of catalogue) visit(t.id, []);
  assert(cycles.length === 0, `the prereq graph has no cycle (${cycles.slice(0, 3).join('; ')})`);
}

// ---- Programs ----
const programList = programs();
const programIds = new Set(programList.map((p) => p.id));
assert(duplicates(programList.map((p) => p.id)).length === 0, 'program ids are unique');
for (const p of programList) {
  const unknown = p.courseIds.filter((id) => byId.get(id)?.kind !== 'course');
  assert(unknown.length === 0, `${p.id}: every course id is a course in the catalogue (${unknown.join(', ')})`);
  assert(p.courseIds.includes(p.entryCourseId), `${p.id}: its entry course is one of its courses`);
  assert(p.field === null || fields.has(p.field), `${p.id}: its faculty field exists (${p.field})`);
  assert(!badText(p.name), `${p.id}: has a clean name`);
}
{
  const unknown = FOUNDING_PROGRAMS.filter((id) => !programIds.has(id));
  assert(unknown.length === 0, `every founding program exists (${unknown.join(', ')})`);
  const bridges = Object.entries(CROSS_MAJOR_BRIDGES).flatMap(([course, needs]) =>
    [course, ...needs].filter((id) => !byId.has(id)).map((id) => `${course}: ${id}`));
  assert(bridges.length === 0, `every cross-major bridge names catalogue rows (${bridges.join(', ')})`);
}

// ---- Course descriptions ----
{
  const orphans = Object.keys(COURSE_DESCRIPTIONS).filter((id) => byId.get(id)?.kind !== 'course');
  assert(orphans.length === 0, `every course description belongs to a course (${orphans.slice(0, 10).join(', ')})`);
  const bad = Object.entries(COURSE_DESCRIPTIONS).filter(([, text]) => badText(text)).map(([id]) => id);
  assert(bad.length === 0, `every course description is clean (${bad.slice(0, 10).join(', ')})`);
}

// ---- Research topics ----
{
  const ids = RESEARCH_TOPICS.map((t) => t.id);
  assert(duplicates(ids).length === 0, `research topic ids are unique (${duplicates(ids).join(', ')})`);
  const badFields = RESEARCH_TOPICS.flatMap((t) => t.fields.filter((f) => !fields.has(f)).map((f) => `${t.id}: ${f}`));
  assert(badFields.length === 0, `every topic's fields exist (${badFields.slice(0, 10).join(', ')})`);
  const badLabs = RESEARCH_TOPICS.flatMap((t) => (t.labs ?? []).filter((l) => !byId.has(l)).map((l) => `${t.id}: ${l}`));
  assert(badLabs.length === 0, `every topic's labs are catalogue rows (${badLabs.slice(0, 10).join(', ')})`);
  const unnamed = RESEARCH_TOPICS.filter((t) => badText(t.name)).map((t) => t.id);
  assert(unnamed.length === 0, `every topic has a clean name (${unnamed.join(', ')})`);
}

// ---- Decision events, ambitions, sports ----
{
  const ids = DECISION_EVENTS.map((e) => e.id);
  assert(duplicates(ids).length === 0, `decision event ids are unique (${duplicates(ids).join(', ')})`);
  for (const e of DECISION_EVENTS) {
    assert(!badText(e.title), `${e.id}: has a clean title`);
    assert(e.choices.length > 0, `${e.id}: offers at least one choice`);
    assert(duplicates(e.choices.map((c) => c.id)).length === 0, `${e.id}: its choice ids are unique`);
    assert(e.choices.every((c) => !badText(c.label)), `${e.id}: every choice has a clean label`);
    // Weight 0 is allowed: those events are fired directly, never drawn.
    assert(e.weight >= 0, `${e.id}: has a weight that is not negative`);
  }
  const ambitionIds = AMBITIONS.map((a) => a.id);
  assert(duplicates(ambitionIds).length === 0, `ambition ids are unique (${duplicates(ambitionIds).join(', ')})`);
  assert(AMBITIONS.every((a) => !badText(a.name) && !badText(a.line)), 'every ambition has a clean name and line');
  const sportIds = SPORTS.map((s) => s.id);
  assert(duplicates(sportIds).length === 0, `sport ids are unique (${duplicates(sportIds).join(', ')})`);
  assert(SPORTS.every((s) => !badText(s.teamName) && !badText(s.clubName)), 'every sport has clean team and club names');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
