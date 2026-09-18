import type { Action } from '../state/actions';
import type { Coach, GameState, SummerPayload } from '../state/types';
import { SUMMER_LAST_BEAT } from '../state/types';
import { findDecisionEvent } from '../data/eventData';
import type { DecisionEventContext } from '../data/eventData';

// ---------------------------------------------------------------------
// HOW A MODAL IS ANSWERED WHEN NOBODY IS LOOKING.
//
// Two callers fast-forward through a run without a player: the balance
// harness (sim/balanceSim.ts, forty years in a few seconds) and the debug
// panel's Jump (see components/DebugPanel.tsx, "advance five years"). Both
// have to answer whatever stops the clock on the way, and before this
// module they answered differently — which would have made the panel's
// five-year jump a different run from the harness's five years, and a
// trajectory the developer was looking at one the sim had never measured.
//
// So the default answer to every interrupt lives here, once, and both ask
// for it. It returns an ACTION rather than mutating anything: the reducer
// stays the one interpreter, and the caller keeps whatever bookkeeping it
// does around the dispatch (the harness's tallies, the panel's count).
//
// The policy, and every entry is deliberate:
//
//   - summer          read the review and the standing, keep last year's
//                     price and admit rate, recognise every petition — the
//                     most expensive answer available, which makes the
//                     harness's opex figures an upper bound. One beat per
//                     call, four calls a summer.
//   - decision-event  the first AFFORDABLE choice, which in every authored
//                     entry is the "deal with it properly, and pay" option;
//                     a free one if the money isn't there
//   - athletic dir.   the middle candidate, the neutral reading of three
//                     that differ only in salary
//   - charter         accept; it costs nothing and renames the school
//   - everything else read and dismiss
//
// A NEW INTERRUPT TYPE lands in the `default` branch, which dismisses it
// with RESOLVE_REPORT. That is a real hazard and worth naming: the athletic
// director's offer spent a release being silently dismissed that way by a
// harness that did not know it existed, so the feature never ran at all in
// any measured trajectory. Add the case here when you add the interrupt.
// ---------------------------------------------------------------------

// The summer decision is the one interrupt whose answer is a STRATEGY
// rather than a default: what to charge and how much of the pool to take
// is the whole game. A caller that has a policy passes it; one that
// doesn't gets last year's numbers back, unchanged, which is what the
// interrupt's own payload offers as its opening position.
export interface AdmissionsPolicy {
  tuition: number;
  admitRate: number;
}

export function defaultAnswer(s: GameState, admissions?: AdmissionsPolicy): Action | null {
  const pending = s.pendingInterrupt;
  if (!pending) return null;

  switch (pending.type) {
    // THE SUMMER, beat by beat (see types.ts's SummerPayload). Review and
    // Standing are read and continued; the Admissions beat is left with the
    // policy as its decision; the Students beat commits the policy and
    // recognises every petition. Walked one beat per call rather than
    // answered in one action, so a fast-forward exercises the same four
    // steps a player takes — including the payload carrying the decision
    // from the third beat to the fourth.
    case 'summer': {
      const payload = pending.payload as Partial<SummerPayload> | undefined;
      const beat = payload?.beat ?? 0;
      const policy: AdmissionsPolicy = {
        tuition: admissions?.tuition ?? payload?.decision?.tuition ?? payload?.tuition ?? s.finance.listedTuition,
        admitRate: admissions?.admitRate ?? payload?.decision?.admitRate ?? payload?.admitRate ?? s.students.admitRate,
      };
      if (beat < SUMMER_LAST_BEAT) {
        return beat === SUMMER_LAST_BEAT - 1
          ? { type: 'RESOLVE_SUMMER_BEAT', decision: policy }
          : { type: 'RESOLVE_SUMMER_BEAT' };
      }
      return {
        type: 'RESOLVE_ADMISSIONS',
        ...policy,
        approvedPetitionIds: s.orgs.pendingPetitions.map((p) => p.id),
      };
    }

    case 'milestone':
      return { type: 'RESOLVE_MILESTONE' };

    case 'research-complete':
      // The completion report, which carries the award if the work won one.
      return { type: 'RESOLVE_RESEARCH_REPORT' };

    case 'demand':
      // A demand is answered by BUILDING the thing before the deadline;
      // the modal itself is only an acknowledgement.
      return { type: 'RESOLVE_DEMAND' };

    case 'charter':
      return { type: 'RESOLVE_CHARTER', accept: true };

    case 'championship':
      return { type: 'RESOLVE_CHAMPIONSHIP' };

    case 'athletic-director': {
      const payload = pending.payload as { candidates?: Coach[]; mascotSuggestion?: string } | undefined;
      const candidates = payload?.candidates ?? [];
      const middle = candidates[Math.floor(candidates.length / 2)] ?? null;
      return {
        type: 'RESOLVE_ATHLETIC_DIRECTOR',
        candidate: middle,
        // The mascot the interrupt itself suggested, rolled when the offer
        // was made — so nobody has to invent one, and no extra die is cast.
        mascot: payload?.mascotSuggestion ?? '',
      };
    }

    case 'decision-event': {
      const payload = pending.payload as { eventId: string; ctx: DecisionEventContext } | undefined;
      const event = payload ? findDecisionEvent(payload.eventId) : undefined;
      if (!event || !payload) {
        // An event id the table no longer has. Clearing the interrupt with
        // an empty resolve is what the reducer does with an unrecognised
        // choice anyway, and it can never wedge the clock.
        return { type: 'RESOLVE_DECISION_EVENT', eventId: '', choiceId: '', ctx: {} };
      }
      const affordable = event.choices.find((c) => c.cost(s, payload.ctx) <= s.finance.cash);
      const choice = affordable ?? event.choices.find((c) => c.cost(s, payload.ctx) <= 0);
      if (!choice) return { type: 'RESOLVE_DECISION_EVENT', eventId: '', choiceId: '', ctx: {} };
      return { type: 'RESOLVE_DECISION_EVENT', eventId: event.id, choiceId: choice.id, ctx: payload.ctx };
    }

    default:
      // The annual report, the rankings-entry reveal, and anything new:
      // read and leave.
      return { type: 'RESOLVE_REPORT' };
  }
}
