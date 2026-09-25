// ---------------------------------------------------------------------
// The curriculum graph, checked as a graph. Every other test in this
// directory drives the reducer or reads source text; this one takes
// initialTech()'s ~440 Buildables as the directed graph they actually are
// and asserts the properties that make a climb a climb:
//
//   - every prereq id resolves to a real node (a typo'd bridge is
//     otherwise invisible until a player never sees a course unlock)
//   - the graph is acyclic, so nothing is unreachable by construction
//   - every node is REACHABLE from the founding state — walk forward from
//     what starts 'available'/'done' and everything must eventually open
//   - a course's prereqs never point UP the tier climb: a tier-2 course may
//     lean on tier-1 or tier-2 work, never on a tier-3 capstone (see
//     techData.ts's CROSS_MAJOR_BRIDGES note on why an inverted bridge
//     would hold a whole major behind another school's endgame)
//   - no authored BRIDGE (techData.ts's CROSS_MAJOR_BRIDGES) is already
//     implied by the backbone it sits on — a tier-3 course already
//     requires its own major's whole tier-2 quartet, and each of those
//     requires the major's tier-1 course, so a bridge naming any of them
//     is noise rather than a cross-discipline requirement
//   - no authored bridge names a course with a LAB or a SCHOOL GATE in its
//     own prereq closure (Plan 20's PR A) — the tier rule above looks at
//     the target and not at what stands behind it, which is how a
//     chemical engineering capstone came to require a founded School of
//     Science and a $700,000 lab, with nothing in the tooltip saying so
//   - no two courses share a title, because the Curriculum tab shows a
//     title without its code in several places
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { CROSS_MAJOR_BRIDGES, initialTech } from '../src/data/techData';
import { initialDorms } from '../src/data/campusData';
import { initialFacilities } from '../src/data/facilitiesData';
import type { Buildable } from '../src/state/types';

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const nodes: Buildable[] = [...initialTech(), ...initialDorms(), ...initialFacilities()];
const byId = new Map(nodes.map((n) => [n.id, n]));

// Course tier, read back off the course number the same way techData.ts's
// NUMS/TIERS assign it. Graduate courses (5xx/7xx) sit above tier 3.
function tierOf(t: Buildable): number | null {
  if (t.kind !== 'course') return null;
  const num = Number(t.id.replace(/^[A-Z]+/, ''));
  if (!Number.isFinite(num)) return null;
  if (num >= 500) return 4;
  if (num >= 200) return 3;
  if (num >= 110) return 2;
  return 1;
}

// =====================================================================
// 1. Every prereq resolves.
// =====================================================================
{
  const dangling: string[] = [];
  for (const n of nodes) {
    for (const p of n.prereqs) if (!byId.has(p)) dangling.push(`${n.id} -> ${p}`);
  }
  assert(dangling.length === 0, `every prereq id names a real Buildable (dangling: ${dangling.join(', ')})`);
  assert(byId.size === nodes.length, 'no two Buildables share an id');
}

// =====================================================================
// 2. Acyclic, and everything is reachable from the founding state.
// =====================================================================
{
  // A forward walk: start from what opens at founding, then repeatedly
  // admit any node whose prereqs are all already admitted. Anything left
  // over is either in a cycle or gated behind one.
  const open = new Set<string>();
  for (const n of nodes) if (n.status === 'available' || n.status === 'done') open.add(n.id);

  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (open.has(n.id)) continue;
      if (n.prereqs.every((p) => open.has(p))) { open.add(n.id); grew = true; }
    }
  }

  const stranded = nodes.filter((n) => !open.has(n.id)).map((n) => n.id);
  assert(stranded.length === 0, `every Buildable is reachable from the founding state (stranded: ${stranded.join(', ')})`);
}

// =====================================================================
// 3. Prereqs never point UP the tier climb.
// =====================================================================
{
  const inverted: string[] = [];
  for (const n of nodes) {
    const tier = tierOf(n);
    if (tier === null) continue;
    for (const p of n.prereqs) {
      const prereqTier = tierOf(byId.get(p)!);
      if (prereqTier !== null && prereqTier > tier) inverted.push(`${n.id} (T${tier}) -> ${p} (T${prereqTier})`);
    }
  }
  assert(inverted.length === 0, `no course requires a course from a higher tier (inverted: ${inverted.join(', ')})`);
}

// =====================================================================
// 4. No authored bridge is already implied by the backbone under it.
//
// Scoped to CROSS_MAJOR_BRIDGES rather than to every prereq: the backbone
// itself is deliberately explicit (a tier-2 course names its tier-1 course
// AND its school building even though the building already requires that
// course), and rewriting that is not this test's business. A BRIDGE is
// different — its whole justification is adding a requirement the backbone
// does not already make, so one that is reachable from the node's other
// prereqs is simply noise in the tooltip.
//
// "Reachable" here deliberately does NOT walk through a school BUILDING's
// own prereqs. A building requires every tier-1 course in its school, so
// walking through one would make every tier-1 course in a school implied
// by every tier-2 course in it — which would condemn a bridge like
// "Historical Anthropology needs Introduction to Anthropology" as
// redundant. It is not: the building gate is a BREADTH requirement (this
// school has an entry row), the bridge is a SUBJECT one (this course
// builds on that one), and only the second survives if the first is ever
// retuned. What this check is actually for is a bridge repeating the
// COURSE climb under it — a tier-3 course naming one of its own major's
// tier-2 quartet, say — and that is caught without the detour.
// =====================================================================
{
  const reachableFrom = (start: string[]): Set<string> => {
    const seen = new Set<string>();
    const stack = [...start];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const node = byId.get(id);
      if (node?.kind === 'building') continue; // see the note above — a breadth gate, not a subject chain
      for (const p of node?.prereqs ?? []) stack.push(p);
    }
    return seen;
  };

  const redundant: string[] = [];
  const unknown: string[] = [];
  for (const [id, bridges] of Object.entries(CROSS_MAJOR_BRIDGES)) {
    const node = byId.get(id);
    if (!node) { unknown.push(id); continue; }
    for (const bridge of bridges) {
      const backbone = node.prereqs.filter((p) => !bridges.includes(p));
      if (reachableFrom(backbone).has(bridge)) redundant.push(`${id} -> ${bridge}`);
    }
  }
  assert(unknown.length === 0, `every bridged course id exists (unknown: ${unknown.join(', ')})`);
  assert(redundant.length === 0, `no bridge repeats what the backbone already requires (redundant: ${redundant.join(', ')})`);
}

// =====================================================================
// 5. No bridge hides a school behind a capstone.
//
// Check 3 forbids a bridge pointing UP the tier climb; it says nothing
// about what sits BEHIND the target. A tier-3 capstone in a lab-gated
// major requires its lab, and the lab carries a schoolGate — so a bridge
// to such a capstone, legal by tier, makes the bridged course wait on
// another school being FOUNDED and equipped, which no tooltip says. This
// walks every bridge target's full closure (through facilities as well as
// courses) and refuses any lab or school gate in it. It is the test that
// would have caught CHEN220 -> CHEM210.
// =====================================================================
{
  const closureOf = (start: string): Set<string> => {
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const p of byId.get(id)?.prereqs ?? []) stack.push(p);
    }
    return seen;
  };

  const hidden: string[] = [];
  for (const [id, bridges] of Object.entries(CROSS_MAJOR_BRIDGES)) {
    for (const bridge of bridges) {
      for (const behind of closureOf(bridge)) {
        const node = byId.get(behind);
        if (!node) continue;
        if (node.facilityType === 'lab') hidden.push(`${id} -> ${bridge} (behind it: ${behind}, a lab)`);
        else if (node.schoolGate) hidden.push(`${id} -> ${bridge} (behind it: ${behind}, gated on ${node.schoolGate})`);
      }
    }
  }
  assert(hidden.length === 0, `no bridge names a course with a lab or a school gate in its closure (hidden: ${hidden.join('; ')})`);
}

// =====================================================================
// 6. No two courses share a title.
// =====================================================================
{
  const titles = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.kind !== 'course') continue;
    const title = n.name.replace(/^[A-Z]+ \d+ · /, '');
    titles.set(title, [...(titles.get(title) ?? []), n.id]);
  }
  const shared = [...titles.entries()].filter(([, ids]) => ids.length > 1).map(([title, ids]) => `"${title}" (${ids.join(', ')})`);
  assert(shared.length === 0, `no two courses share a title (shared: ${shared.join('; ')})`);
}

console.log('curriculum-graph tests');
if (failures === 0) console.log(`  ✓ all ${checks} checks passed`);
else { console.error(`  ${failures} of ${checks} checks FAILED`); process.exit(1); }
