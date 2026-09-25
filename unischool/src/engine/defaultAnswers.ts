import type { Action } from '../state/actions';
import type { Coach, GameState, SummerPayload } from '../state/types';
import { SUMMER_LAST_BEAT } from '../state/types';
import { findDecisionEvent, offeredChoices } from '../data/eventData';
import type { DecisionEventContext } from '../data/eventData';
import { eventById } from '../systems/events/catalogue';
import { catalogueOf } from '../systems/events/catalogueEngine';

// ---------------------------------------------------------------------
// How a modal is answered when nobody is looking. The balance harness
// (sim/balanceSim.ts) and the debug panel's Jump (DebugPanel.tsx) both
// fast-forward through a run, and both ask here so their runs match.
// Returns an action rather than mutating: the reducer stays the one
// interpreter.
//
// The policy:
//   - summer          keep last year's price and admit rate, recognize every
//                     petition (the most expensive answer, so the harness's
//                     opex is an upper bound). One beat per call.
//   - decision-event  the first affordable choice (in every authored entry,
//                     "deal with it properly, and pay"); else a free one
//   - athletic dir.   the middle candidate of three that differ only in salary
//   - charter         accept
//   - letter          read it and carry on; never "I know the way"
//   - catalog-letter its default, as an unanswered inline event takes
//   - everything else read and dismiss
//
// A new interrupt type falls into `default` and is silently dismissed, so
// the harness never exercises it. Add the case here when you add the
// interrupt.
// ---------------------------------------------------------------------

// The summer's answer is a strategy, not a default: a caller with a policy
// passes it; one without gets last year's numbers, the payload's opening
// position.
export interface AdmissionsPolicy {
  tuition: number;
  admitRate: number;
}

export function defaultAnswer(s: GameState, admissions?: AdmissionsPolicy): Action | null {
  const pending = s.pendingInterrupt;
  if (!pending) return null;

  switch (pending.type) {
    // The summer, beat by beat (see types.ts's SummerPayload): walked one
    // beat per call, like a player, so the third beat's decision rides the
    // payload into the fourth, which commits it and recognizes every petition.
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
      return { type: 'RESOLVE_RESEARCH_REPORT' };

    case 'charter':
      return { type: 'RESOLVE_CHARTER', accept: true };

    case 'championship':
      return { type: 'RESOLVE_CHAMPIONSHIP' };

    case 'letter':
      // Read and put down, never skipped: a fast-forward should see the
      // opening the way a first-time player does, four letters and all.
      return { type: 'RESOLVE_LETTER', skipAll: false };

    case 'first-sport-club': {
      // The suggestion the beat itself rolled.
      const payload = pending.payload as { mascotSuggestion?: string } | undefined;
      return { type: 'RESOLVE_MASCOT', mascot: payload?.mascotSuggestion ?? '' };
    }

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
      // The choices actually put to the player (the reducer accepts no other).
      const offered = offeredChoices(s, event, payload.ctx);
      const affordable = offered.find((c) => c.cost(s, payload.ctx) <= s.finance.cash);
      const choice = affordable ?? offered.find((c) => c.cost(s, payload.ctx) <= 0);
      if (!choice) return { type: 'RESOLVE_DECISION_EVENT', eventId: '', choiceId: '', ctx: {} };
      return { type: 'RESOLVE_DECISION_EVENT', eventId: event.id, choiceId: choice.id, ctx: payload.ctx };
    }

    case 'catalogue-letter': {
      // A letter from the catalog takes its default, as an inline event
      // does when its weeks run out.
      const payload = pending.payload as { instanceId?: string } | undefined;
      const waiting = catalogueOf(s).pending.find((p) => p.instanceId === payload?.instanceId);
      const event = waiting ? eventById(waiting.eventId) : undefined;
      return { type: 'RESOLVE_CATALOGUE_EVENT', instanceId: payload?.instanceId ?? '', choiceId: event?.default ?? '' };
    }

    default:
      // The annual report, the rankings-entry reveal, and anything new:
      // read and leave.
      return { type: 'RESOLVE_REPORT' };
  }
}
