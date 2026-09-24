import type { GameState } from './types';
import type { Action } from './actions';
import { fellTrees } from '../data/treeData';
import { awaitsSite, canPlace, footprintOf, orientedFootprint, placementFor } from './campusMap';
import { settleOpening } from './opening';
import { canStartDevelopment, startDevelopment } from '../systems/techtree/techSystem';

export function placeBuildable(s: GameState, action: Extract<Action, { type: 'PLACE_BUILDABLE' }>): void {
  // The unified build-and-site action for placeable kinds (building/
  // dorm/facility — see types.ts's PLACEABLE_KINDS). A course never
  // dispatches this — it isn't a place, and it starts through
  // START_DEVELOPMENT instead, unchanged.
  //
  // Two shapes, branching on the node's CURRENT status (canPlace admits
  // both — see its own comment):
  //   - 'available': the ordinary path. The gate is exactly
  //     canStartDevelopment's — the same affordability/faculty/status
  //     check a course's START_DEVELOPMENT uses, reused rather than
  //     forked — combined with campusMap.ts's canPlace, which adds "not
  //     already sited, and its footprint lands on clear tiles". Passing
  //     both charges the cost, starts the countdown (startDevelopment —
  //     identical to a course's: same duration, same tickTech
  //     decrement, same finish -> 'done' + applied effects), and writes
  //     the chosen location into s.placements in the SAME transaction,
  //     so a developing placeable is never without a location and its
  //     tiles are reserved from week one.
  //   - 'done': Founders Hall in a guided founding (campusMap.ts's
  //     awaitsSite). Nothing to build and nothing to pay: this only
  //     records where it stands.
  //
  // The BASE footprint comes from the Buildable's kind, not from the
  // action (see campusMap.ts's footprintOf); `action.rotated` says
  // whether the player turned that footprint 90 degrees before setting
  // it down. What's stored is the already-oriented footprint — there is
  // no separate orientation field (see types.ts's Placement).
  const node = s.tech.find((t) => t.id === action.buildableId);
  if (node) {
    // A 'done' node is sited at its base footprint; nothing offers
    // rotation for it (see CampusMap.tsx).
    const fp = node.status === 'done' ? footprintOf(node) : orientedFootprint(node, action.rotated);
    if (canPlace(s, node, action.row, action.col, fp)) {
      // Clearing the ground is part of committing a site: every tree
      // under the footprint is felled, permanently (see
      // data/treeData.ts). Done here, in the same transaction as the
      // placement, for both branches. Paving over a tree, by
      // contrast, deletes nothing: that is a render-time read of
      // `pathways` (see CampusMap.tsx), which is what lets lifting the
      // path bring the tree back.
      const placement = placementFor(action.row, action.col, fp);
      if (node.status === 'done') {
        if (awaitsSite(s, node)) {
          s.placements[node.id] = placement;
          fellTrees(s.trees, placement);
        }
      } else if (canStartDevelopment(s, node)) {
        s.placements[node.id] = placement;
        fellTrees(s.trees, placement);
        startDevelopment(s, node);
      }
      settleOpening(s); // the walkthrough's first step ends on Founders Hall standing
    }
  }
}
