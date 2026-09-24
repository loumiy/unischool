import type { GameState } from './types';
import type { Action } from './actions';
import { fellTrees } from '../data/treeData';
import { awaitsSite, canPlace, footprintOf, orientedFootprint, placementFor } from './campusMap';
import { settleOpening } from './opening';
import { canStartDevelopment, startDevelopment } from '../systems/techtree/techSystem';

export function placeBuildable(s: GameState, action: Extract<Action, { type: 'PLACE_BUILDABLE' }>): void {
  // Build and site a placeable Buildable in one action (courses use
  // START_DEVELOPMENT). An 'available' node must pass canStartDevelopment
  // and canPlace; it is charged, started and sited in the same transaction,
  // so its tiles are reserved from week one. A 'done' node is Founders Hall
  // in a guided founding (awaitsSite): free, it only records where it stands.
  // The stored footprint is already oriented; there is no orientation field.
  const node = s.tech.find((t) => t.id === action.buildableId);
  if (node) {
    // A 'done' node is sited unrotated; nothing offers rotation for it.
    const fp = node.status === 'done' ? footprintOf(node) : orientedFootprint(node, action.rotated);
    if (canPlace(s, node, action.row, action.col, fp)) {
      // Siting fells every tree under the footprint, permanently. Paths do
      // not: paving only hides a tree at render time.
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
        // One grand landmark to a college: the other two close for good
        // (techSystem.ts's landmarkChosen keeps them closed).
        if (node.facilityType === 'landmark') {
          for (const other of s.tech) if (other.facilityType === 'landmark' && other.id !== node.id && other.status === 'available') other.status = 'locked';
        }
      }
      settleOpening(s); // the walkthrough's first step ends on Founders Hall standing
    }
  }
}
