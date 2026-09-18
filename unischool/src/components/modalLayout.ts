import type { PendingInterrupt, SummerPayload } from '../state/types';
import type { MilestonePayload } from '../data/eventData';

// ---------------------------------------------------------------------
// HOW WIDE AN INTERRUPT IS (Plan 16's PR E). One modal width used to serve
// every interrupt — 440px, sized for a decision event's three choices —
// and the September review found the summer decision and the fifty-row
// report jammed into it. Three widths now, chosen by what the interrupt
// IS rather than by how much it happens to contain:
//
//   narrow  a question with a short answer: a decision event, the charter,
//           a student demand, a research report, a single milestone
//   wide    a decision with a panel's worth of consequences beside it: the
//           summer's review, admissions and students beats, the athletic
//           director's three cards, a championship bracket, a burst of
//           milestones laid out as cards
//   page    a table to read: the summer's Standing beat and the first
//           rankings entry, where the top 50 is a real table with a
//           column for last year's rank
//
// A pure function of the interrupt, so the summer can change width between
// beats without the component knowing why, and so the rule is testable
// without a DOM (see test/modal-layout.test.ts).
// ---------------------------------------------------------------------

export type ModalWidth = 'narrow' | 'wide' | 'page';

export function modalWidth(interrupt: PendingInterrupt): ModalWidth {
  switch (interrupt.type) {
    case 'summer': {
      const beat = (interrupt.payload as SummerPayload | undefined)?.beat ?? 0;
      return beat === 1 ? 'page' : 'wide';
    }
    case 'rankings-entry':
    case 'annual-report':
      return 'page';
    case 'athletic-director':
    case 'championship':
      return 'wide';
    case 'milestone': {
      const entries = (interrupt.payload as MilestonePayload | undefined)?.entries ?? [];
      return entries.length > 1 ? 'wide' : 'narrow';
    }
    default:
      return 'narrow';
  }
}
