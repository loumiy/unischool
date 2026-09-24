import type { PendingInterrupt, SummerPayload } from '../state/types';
import type { MilestonePayload } from '../data/eventData';

// ---------------------------------------------------------------------
// How wide an interrupt is, chosen by what it is rather than how much it
// contains:
//   narrow  a question with a short answer (decision event, charter, demand)
//   wide    a decision with a panel of consequences beside it
//   page    a table to read (the Standing beat, the rankings)
// A pure function of the interrupt, so the summer can change width between
// beats and the rule is testable without a DOM (test/modal-layout.test.ts).
// ---------------------------------------------------------------------

export type ModalWidth = 'narrow' | 'wide' | 'page';

export function modalWidth(interrupt: PendingInterrupt): ModalWidth {
  switch (interrupt.type) {
    case 'summer': {
      const payload = interrupt.payload as SummerPayload | undefined;
      const beat = payload?.beat ?? 0;
      // The fiftieth summer's first beat is the final report: a page.
      if (beat === 0 && payload?.final) return 'page';
      return beat === 1 ? 'page' : 'wide';
    }
    case 'rankings-entry':
    case 'annual-report':
      return 'page';
    case 'athletic-director':
    case 'championship':
      return 'wide';
    case 'first-sport-club':
      return 'narrow';
    case 'milestone': {
      const entries = (interrupt.payload as MilestonePayload | undefined)?.entries ?? [];
      return entries.length > 1 ? 'wide' : 'narrow';
    }
    default:
      return 'narrow';
  }
}
