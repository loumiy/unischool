// ---------------------------------------------------------------------
// A project belongs to its lab (src/data/researchData.ts's
// initiativeOffers, src/data/techData.ts's labFields).
//
// The bug this pins: offers used to be drawn from the whole SCHOOL's
// fields, so every lab in a school was handed the same pool and the
// Aerospace Engineering Lab could be offered "Acoustics of Performance
// Spaces". Nothing threw — the project ran, produced output and logged
// correctly. It just made no sense, which is the kind of wrong that only a
// test stating the rule outright will keep out.
//
// THE RULE: a facility may only be offered a topic that names one of ITS
// OWN fields. Checked exhaustively — every research facility, every depth
// tier, across a long sweep of offer epochs, because the topic a tier shows
// is a hash of (lab, depth, epoch) and one epoch proves nothing about the
// next.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { initiativeOffers } from '../src/data/researchData';
import { labFields, researchSchools } from '../src/data/techData';
import { RESEARCH_TOPICS, isCrossDisciplinary } from '../src/data/researchTopics';
import { WEEKS_PER_YEAR, type GameState } from '../src/state/types';

let seed = 90210;
Math.random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
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

// A campus with every research facility standing, which is the only state
// in which every lab's pool can be asked about at once.
function fullyEquipped(): GameState {
  const s = createInitialState('Ashcombe', 'private');
  for (const t of s.tech) {
    if (t.kind === 'facility' && t.facilityType === 'lab') t.status = 'done';
  }
  return s;
}

const LAB_IDS = researchSchools().flatMap((school) => school.labIds);

console.log('research offer tests');

// --- the mapping itself ----------------------------------------------
{
  assert(LAB_IDS.length > 0, 'the catalogue has research facilities at all');
  for (const id of LAB_IDS) {
    const fields = labFields(id);
    assert(fields.length > 0, `${id} knows what field its work is in`);
    assert(
      fields.every((f) => typeof f === 'string' && f.length > 0),
      `${id}'s fields are real field names`,
    );
  }
  assert(labFields('LAB-NOT-A-THING').length === 0, 'an id that names no facility has no fields, rather than throwing');

  // The distinction the fix turns on: a facility's fields are NOT its
  // school's. If these were the same thing there would be nothing to test.
  const school = researchSchools().find((sc) => sc.labIds.length > 0 && sc.fields.length > 1);
  assert(!!school, 'at least one school teaches more fields than one');
  assert(
    school!.labIds.some((id) => labFields(id).length < school!.fields.length),
    'and its facilities each speak for fewer fields than the school does',
  );
}

// --- the rule, over every lab, every tier, many epochs ----------------
{
  const s = fullyEquipped();
  let offersSeen = 0;
  let blocked = 0;
  const violations: string[] = [];

  // A long sweep: OFFER_EPOCH_WEEKS is 13, so stepping a week at a time
  // over 8 years turns the offer set over ~32 times.
  for (let week = 0; week < WEEKS_PER_YEAR * 8; week += 1) {
    s.clock.year = 1 + Math.floor(week / WEEKS_PER_YEAR);
    s.clock.week = 1 + (week % WEEKS_PER_YEAR);
    for (const labId of LAB_IDS) {
      const fields = new Set(labFields(labId));
      for (const offer of initiativeOffers(s, labId)) {
        if (offer.topic.id === 'none') { blocked += 1; continue; }
        offersSeen += 1;
        if (!offer.topic.fields.some((f) => fields.has(f))) {
          violations.push(`${labId} / ${offer.depth.key}: "${offer.topic.name}" (${offer.topic.fields.join(' + ')})`);
        }
      }
    }
  }

  assert(offersSeen > 0, `the sweep actually produced offers (${offersSeen} across ${LAB_IDS.length} facilities)`);
  assert(
    violations.length === 0,
    `every offered topic names its own facility's field — ${violations.length} did not, e.g. ${violations[0] ?? ''}`,
  );
  console.log(`  · swept ${offersSeen} offers over 8 years (${blocked} tiers with nothing to offer)`);
}

// --- and the pools are genuinely different per facility ---------------
{
  // The old behaviour's signature: two labs in the same school, offered the
  // same thing. Pick two facilities whose fields differ and assert neither
  // can ever be offered the other's departmental work.
  const pairs = LAB_IDS.flatMap((a) => LAB_IDS.map((b) => [a, b] as const))
    .filter(([a, b]) => a !== b && labFields(a).join() !== labFields(b).join());
  assert(pairs.length > 0, 'the catalogue has facilities in different fields to compare');

  const s = fullyEquipped();
  let crossContamination = 0;
  for (let epoch = 0; epoch < 40; epoch += 1) {
    s.clock.year = 1 + Math.floor(epoch / 4);
    s.clock.week = 1 + (epoch % 4) * 13;
    for (const [a, b] of pairs) {
      const bOnly = new Set(
        RESEARCH_TOPICS
          .filter((t) => !isCrossDisciplinary(t) && labFields(b).includes(t.fields[0]) && !labFields(a).includes(t.fields[0]))
          .map((t) => t.id),
      );
      for (const offer of initiativeOffers(s, a)) {
        if (bOnly.has(offer.topic.id)) crossContamination += 1;
      }
    }
  }
  assert(crossContamination === 0, `no facility is ever offered another field's departmental work (${crossContamination} cases)`);
}

// --- what narrowing the pool costs, stated out loud -------------------
{
  // Narrowing each facility to its own field has a consequence the plan
  // names: a topic whose fields no facility actually has can no longer be
  // offered anywhere. Under the old school-wide pool, a Philosophy + AI
  // topic was offerable at the Humanities Research Institute because the
  // SCHOOL taught philosophy; now no facility's field is Philosophy or AI,
  // so it is authored content nobody can reach.
  //
  // Reported here rather than asserted, because the fix is authoring and
  // not code: the catalogue is doubled in the next PR, where the invariant
  // "every topic is reachable somewhere" is pinned for good.
  const equippedFields = new Set(LAB_IDS.flatMap((id) => labFields(id)));
  const unreachable = RESEARCH_TOPICS.filter((t) => !t.fields.some((f) => equippedFields.has(f)));
  console.log(`  · ${equippedFields.size} fields have a facility; ${unreachable.length} of ${RESEARCH_TOPICS.length} topics name none of them`);
  for (const t of unreachable) console.log(`    - ${t.name} (${t.fields.join(' + ')})`);

  // What must hold today: every EQUIPPED field can still lead work, so no
  // facility is left standing with nothing to offer.
  for (const id of LAB_IDS) {
    const runnable = RESEARCH_TOPICS.filter((t) => t.fields.some((f) => labFields(id).includes(f)));
    assert(runnable.length > 0, `${id} has at least one topic it can run`);
  }
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
