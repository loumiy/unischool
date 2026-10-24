import type { Buildable, GameState } from '../state/types';
import type { Financing } from '../systems/finance/treasury';
import { borrowingRoom, financingFor, loanBar } from '../systems/finance/treasury';
import { constructionFrozen } from '../systems/finance/distress';
import { canStartDevelopment, hasFreeFacultySlot } from '../systems/techtree/techSystem';
import { awaitsSite, isLand } from '../state/campusMap';
import { dressingBlocker } from '../state/dressing';
import { BUILD_WORDS } from '../data/buildWords';
import { moneyShort } from '../format';

// Why a building can't go up, in one set of words for the build menu's
// tiles and the map's ghost (Plan 104H): S1 met a red ghost with no reason
// for money, a freeze or a building not open, and a ghost that checked cash
// only while the click would also take a gift, a loan or the endowment.

// How a building would be paid for, as the click pays (finance/treasury.ts's
// financingFor: gifts, cash, half from the endowment, then a loan); null
// when nothing will. Founders Hall waiting for its ground costs nothing.
export function buildFinancing(s: GameState, t: Buildable): Financing | null {
  if (t.status === 'done') return awaitsSite(s, t) ? 'cash' : null;
  return financingFor((f) => canStartDevelopment(s, t, undefined, f));
}

// Which of loanFor's conditions stopped a loan for a building the cash
// cannot cover (finance/treasury.ts's loanBar), in words; nothing when a
// loan is offered or none is needed.
export function noLoanReason(s: GameState, cost: number): string | undefined {
  const bar = loanBar(s, cost);
  if (bar === null) return undefined;
  if (bar !== 'room') return BUILD_WORDS.noLoan[bar];
  const room = borrowingRoom(s);
  return room > 0 ? BUILD_WORDS.noLoan.room.replace('{room}', moneyShort(room)) : BUILD_WORDS.noLoan.noRoom;
}

// A greyed tile's reason, short, for its face: "$2.1M short · the college
// can borrow up to $1.4M", or the board's freeze.
export function greyedReason(s: GameState, cost: number): string | undefined {
  if (constructionFrozen(s)) return BUILD_WORDS.constructionFrozen;
  const shortfall = cost - s.finance.cash;
  if (shortfall <= 0) return undefined;
  const short = BUILD_WORDS.short.replace('{short}', moneyShort(Math.ceil(shortfall)));
  const why = noLoanReason(s, cost);
  return why ? `${short} · ${why}` : short;
}

// Why the building can't be started however good the ground: null when the
// click would place it. The map's ghost says this when the site is fine.
export function startRefusal(s: GameState, t: Buildable): string | null {
  if (buildFinancing(s, t) !== null) return null;
  if (t.status !== 'available') return BUILD_WORDS.notOpen.replace('{building}', t.name);
  if (constructionFrozen(s)) return BUILD_WORDS.frozen;
  if (t.requiresFaculty && !hasFreeFacultySlot(s, t.requiresFaculty)) return BUILD_WORDS.needsFaculty.replace('{field}', t.requiresFaculty);
  const costs = BUILD_WORDS.costs.replace('{cost}', moneyShort(t.cost)).replace('{cash}', moneyShort(Math.max(0, s.finance.cash)));
  const why = noLoanReason(s, t.cost);
  return why ? `${costs} · ${why}` : costs;
}

// How the ghost says it would be paid, when not in cash ("part borrowed").
export function paidWords(financing: Financing | null): string | null {
  return financing === null || financing === 'cash' ? null : BUILD_WORDS.pay[financing];
}

// Why a bench, lamp or bed can't be set on a tile: the reducer's
// PLACE_DRESSING gate, in words.
export function dressingRefusal(s: GameState, row: number, col: number): string | null {
  if (!isLand(row, col)) return BUILD_WORDS.dressingOffLand;
  const occupant = dressingBlocker(s, row, col);
  if (occupant === undefined) return null;
  const t = s.tech.find((x) => x.id === occupant);
  const name = t?.name ?? 'A building';
  // A quad's walks and centrepiece (Plan 115H). The Grand Quad has no lawn
  // to dress, so it reads as any other building.
  if (t?.facilityType === 'quad' && (t.tier ?? 1) < 2) return BUILD_WORDS.dressingOnQuad.replace('{building}', name);
  return BUILD_WORDS.dressingOnBuilding.replace('{building}', name);
}
