import type { Buildable, GameState } from './types';
import { standsOnCampus } from './types';
import { isPlaceableKind } from './campusMap';
import { FOUNDERS_HALL_ID, initialTech } from '../data/techData';
import { initialDorms } from '../data/campusData';
import { initialFacilities } from '../data/facilitiesData';
import { unlockAvailable } from '../systems/techtree/techSystem';
import { endowmentHalf } from '../systems/estate/projects';
import { extensionGain } from '../systems/estate/estate';
import { money } from '../format';

// Calling off and pulling down (Plan 39).
//
// A building under construction can be called off: its cost comes back to
// where it was paid from (the building fund, the endowment's half, or cash,
// less whatever is still owed on its loan, which is settled), its site is
// cleared, and it is in the catalogue again. The trees its siting felled
// stay felled.
//
// A standing building can be demolished: free, with nothing back. Its site
// is cleared and it is in the catalogue again as it first was, so building
// it again costs what it costs and starts it new. What it granted once is
// taken back where that can be counted (a dorm's beds, its storeys'
// included); what it opened stays open, since nothing available ever
// re-locks (techSystem.ts).

// A building whose first construction is under way. A library renovation
// (RENOVATE_LIBRARY) also reads 'developing', over a standing building, and
// is not a construction to call off.
export function canCancelConstruction(s: GameState, t: Buildable): boolean {
  return isPlaceableKind(t) && t.status === 'developing' && t.renovatingFrom === undefined
    && s.developing[t.id] !== undefined && t.id !== FOUNDERS_HALL_ID;
}

export function cancelConstruction(s: GameState, id: string): void {
  const t = s.tech.find((x) => x.id === id);
  if (!t || !canCancelConstruction(s, t)) return;
  if (t.financing === 'gift' && s.advancement) {
    s.advancement.restrictedBuilding += t.cost;
  } else if (t.financing === 'endowment') {
    s.finance.endowment += endowmentHalf(t);
    s.finance.cash += t.cost - endowmentHalf(t);
  } else {
    s.finance.cash += t.cost;
    // The loan taken for this construction is settled out of the refund: the
    // college is left as if it had never borrowed, less the interest already
    // paid. Only when it was borrowed for: an earlier building of the same
    // id, demolished with its loan still running, keeps its own.
    if (t.financing === 'loan') {
      const loans = s.finance.loans ?? [];
      const mine = loans.filter((x) => x.buildingId === id);
      const settled = mine[mine.length - 1];
      if (settled) {
        s.finance.cash -= settled.balance;
        const rest = loans.filter((x) => x !== settled);
        if (rest.length > 0) s.finance.loans = rest;
        else delete s.finance.loans;
      }
    }
  }
  delete t.financing;
  delete s.developing[id];
  delete s.placements[id];
  t.status = 'available';
  // A called-off landmark reopens the other two.
  unlockAvailable(s);
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `Construction of ${t.name} has been called off; ${money(t.cost)} returned.`,
    kind: 'info',
    subject: id,
  });
}

// Why a standing building cannot come down, or null when it can.
export function demolitionBlock(s: GameState, t: Buildable): string | null {
  if (!isPlaceableKind(t) || t.status !== 'done' || !s.placements[t.id]) return 'It is not standing.';
  if (t.id === FOUNDERS_HALL_ID) return 'Founders Hall is where the college began, and stays.';
  if (t.chapterHouse) return 'It belongs to its chapter.';
  if (t.historic) return 'It has been declared historic.';
  const slots = s.halls[t.id];
  if (slots?.some((slot) => slot.programId !== null)) return 'Its programs must be moved out first.';
  if (s.research.initiatives[t.id]) return 'A research project is under way in it.';
  if (!templateOf(t.id)) return 'It cannot be built again.';
  return null;
}

export function demolish(s: GameState, id: string): void {
  const index = s.tech.findIndex((x) => x.id === id);
  const t = s.tech[index];
  const fresh = t ? templateOf(id) : undefined;
  if (!t || !fresh || demolitionBlock(s, t) !== null) return;
  // Beds from any building (a residence hall, the Graduate College), and a
  // residence hall's added storeys.
  const storeyBeds = t.kind === 'dorm' ? (t.floorsAdded ?? 0) * extensionGain(t) : 0;
  s.students.capacity = Math.max(0, s.students.capacity - (t.effects?.capacityBonus ?? 0) - storeyBeds);
  // A venue's teams wait for another venue of their sport, as a load would
  // have them do (persistence.ts's sanitizeTeams).
  if (t.facilityType && !s.tech.some((o) => o !== t && o.facilityType === t.facilityType && standsOnCampus(o))) {
    for (const team of s.orgs.teams) if (team.status === 'active' && team.venueCategory === t.facilityType) team.status = 'awaitingVenue';
  }
  delete s.placements[id];
  delete s.halls[id];
  s.tech[index] = { ...fresh, status: 'available' };
  unlockAvailable(s);
  s.log.unshift({
    year: s.clock.year,
    week: s.clock.week,
    message: `${t.name} has been demolished.`,
    kind: 'info',
    subject: id,
  });
}

// The catalogue's own entry for a building, as it stood before anything
// was built, a fresh copy each time. Chapter houses are made at runtime and
// have none.
let templates: Map<string, Buildable> | null = null;
function templateOf(id: string): Buildable | undefined {
  templates ??= new Map([...initialTech(), ...initialDorms(), ...initialFacilities()].map((x) => [x.id, x]));
  const t = templates.get(id);
  return t ? structuredClone(t) : undefined;
}
