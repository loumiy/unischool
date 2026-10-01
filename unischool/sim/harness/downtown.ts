// ---------------------------------------------------------------------
// The harness's student-life specialist (Plan 85H). Once a college
// specializes in student life, every player, unless it says otherwise
// (Player.downtown), answers what the downtown asks of it at the top of each
// week (game.ts's playWeek), before its own moves:
//
//   the festival   held each spring at the largest scale the week's net
//                  covers in FESTIVAL_NET_WEEKS weeks with the guided
//                  player's reserve kept; at the least a modest weekend,
//                  never none
//   town and gown  each town-and-gown event answered for the town's goodwill
//                  and the students' mood together, the cheaper of two
//                  alike, among the answers the reserve allows
//
// The downtown's off-campus places need no move: the satisfaction model
// counts them (satisfactionSystem.ts's offCampusPlaces), so every player's
// plain sense builds that much less, and a residence hall waits until the
// beds and the downtown's are nearly full (moves.ts's buildDorm).
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import type { CatalogueEvent } from '../../src/data/eventCatalogueTypes';
import { FESTIVAL_EVENT, downtownWorks } from '../../src/data/downtownData';
import { catalogueOf, choiceCost } from '../../src/systems/events/catalogueEngine';
import { eventById } from '../../src/systems/events/catalogue';
import { weeklyNet } from '../../src/systems/finance/financeSystem';
import type { Game } from './game';
import { reserveOf } from './guided';

// The festival's cost, at most this many weeks of the week's net.
export const FESTIVAL_NET_WEEKS = 2;

// The town-and-gown events: the catalog's, gated on the downtown.
export function isTownEvent(e: CatalogueEvent): boolean {
  return e.when.downtownAtLeast !== undefined;
}

// The festival's answer: the largest scale the money allows, the modest
// weekend at the least.
export function festivalChoice(g: Game, scale: number): string {
  const s = g.s;
  const reserve = reserveOf(s);
  const budget = Math.max(0, weeklyNet(s)) * FESTIVAL_NET_WEEKS;
  const held = FESTIVAL_EVENT.choices.filter((c) => c.id !== 'none');
  const fits = held.filter((c) => {
    const cost = choiceCost(FESTIVAL_EVENT, c.id, scale);
    return cost <= budget && s.finance.cash - cost >= reserve;
  });
  return (fits[fits.length - 1] ?? held[0]).id;
}

// A town-and-gown event's answer: the most goodwill and mood together, the
// cheaper of two alike, among those the reserve allows; the default if none.
export function townChoice(g: Game, e: CatalogueEvent, scale: number): string {
  const s = g.s;
  const reserve = reserveOf(s);
  const worth = (id: string) => {
    const c = e.choices.find((x) => x.id === id)!;
    return (c.effects.goodwill ?? 0) + (c.effects.mood ?? 0);
  };
  const open = e.choices.filter((c) => c.id === e.default || s.finance.cash - choiceCost(e, c.id, scale) >= reserve);
  const best = [...open].sort((a, b) => worth(b.id) - worth(a.id) || choiceCost(e, a.id, scale) - choiceCost(e, b.id, scale))[0];
  return best?.id ?? e.default;
}

// Answers the downtown's matters for a college specialized in student life.
// Returns how many it answered.
export function runDowntown(g: Game): number {
  if (!downtownWorks(g.s)) return 0;
  let answered = 0;
  // An answer replaces the list (catalogueEngine.ts), so this walk is safe.
  for (const p of catalogueOf(g.s).pending) {
    const e = eventById(p.eventId);
    if (!e) continue;
    const choiceId = e.id === FESTIVAL_EVENT.id ? festivalChoice(g, p.scale) : isTownEvent(e) ? townChoice(g, e, p.scale) : null;
    if (choiceId === null) continue;
    g.act({ type: 'RESOLVE_CATALOGUE_EVENT', instanceId: p.instanceId, choiceId });
    answered += 1;
  }
  return answered;
}
