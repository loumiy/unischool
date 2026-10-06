// ---------------------------------------------------------------------
// The harness's research park (Plan 85F). A college specialized in research
// builds the Research Park as it builds any capital project that opens
// (guided.ts's and archetypes.ts's own rules: the park opens only to such a
// college now, so no other player builds it), and once it stands every
// player specialized in research keeps Landmark Programs running, which is
// what the research pillar's specialization term reads
// (src/data/researchParkData.ts), unless it says otherwise
// (Player.landmarks). Before Plan 85F no harness player commissioned one:
// each took a lab's cheapest research project.
//
// The rule, at the top of each week (game.ts's playWeek), before the
// player's own moves fill an idle lab with something cheaper: while fewer
// than landmarksAtOnce run, each idle lab whose Landmark offer is open
// (a cross-disciplinary topic and a scholar free in each of its fields) takes
// it, if the funding leaves the research reserve the guided player keeps
// (guided.ts's RESEARCH_RESERVE_WEEKS). landmarksAtOnce is the most the
// term counts at once (researchParkData.ts's landmarksCounted, more with the
// park's second wing, Plan 95X): one more would cost eight more course slots for five years and fill nothing.
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import { depthOpen, initiativeOffers } from '../../src/data/researchData';
import { landmarksCounted, landmarksRunning } from '../../src/data/researchParkData';
import { specializationOf } from '../../src/systems/prestige/specialization';
import type { GameState } from '../../src/state/types';
import type { Game } from './game';
import { RESEARCH_RESERVE_WEEKS, reserveOf } from './guided';

export function landmarksAtOnce(s: GameState): number {
  return landmarksCounted(s);
}

// Starts what Landmark Programs it can. Returns how many it started.
export function commissionLandmarks(g: Game): number {
  if (specializationOf(g.s) !== 'research' || !depthOpen(g.s, 'landmark')) return 0;
  let started = 0;
  const labs = g.s.tech.filter((t) => t.facilityType === 'lab' && t.status === 'done');
  for (const lab of labs) {
    if (landmarksRunning(g.s) >= landmarksAtOnce(g.s)) break;
    if (g.s.research.initiatives[lab.id]) continue;
    const offer = initiativeOffers(g.s, lab.id).find((o) => o.depth.key === 'landmark' && !o.blockedReason);
    if (!offer || g.s.finance.cash - offer.fundingCost < reserveOf(g.s, RESEARCH_RESERVE_WEEKS)) continue;
    g.act({ type: 'START_INITIATIVE', labId: lab.id, topicId: offer.topic.id, depth: 'landmark', facultyIds: offer.suggested.map((f) => f.id) });
    if (g.s.research.initiatives[lab.id]) started += 1;
  }
  return started;
}
