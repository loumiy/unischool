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
// NUMS/TIERS assign it. The gen-ed core is tier 1 whatever its numbering
// (GE110..GE160 are six entry courses, not a tier-2 quartet), and graduate
// courses (5xx/7xx) sit above tier 3.
function tierOf(t: Buildable): number | null {
  if (t.kind !== 'course') return null;
  if (t.id.startsWith('GE')) return 1;
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

console.log('curriculum-graph tests');
if (failures === 0) console.log(`  ✓ all ${checks} checks passed`);
else { console.error(`  ${failures} of ${checks} checks FAILED`); process.exit(1); }
