import type { GameState, HallSlot } from '../../state/types';
import { FOUNDERS_HALL_ID } from '../../data/techData';
import {
  MAX_OFFICES, OFFICE_BUDGET_SHARE, OFFICE_CLOSING_WEEKS, OFFICE_SEAT_BONUS, officeDef,
} from '../../data/officeData';
import { MIN_OPEX_SCALE, weeksOfOpEx } from '../../data/moneyScale';

// ---------------------------------------------------------------------
// THE ADMINISTRATION'S OFFICES (Plan 89). An office takes one slot of
// Founders Hall that no program holds. It is held once, opened for a price
// in weeks of operating cost, and draws a share of the operating cost every
// week it is open. Closing one leaves its slot dark for
// OFFICE_CLOSING_WEEKS, still held and still counted against the
// allowance, so a swap always costs the dark term.
//
// The allowance is the number of the six milestones of Plan 89 §3 the
// college has reached (PR 89D). What each office does is read at its hook
// through officeStrength (PR 89E).
// ---------------------------------------------------------------------

// A slot with neither a program nor an office: what founding, relocation
// and opening an office need.
export function slotFree(slot: HallSlot): boolean {
  return slot.programId === null && slot.office === undefined;
}

function foundersSlots(s: GameState): HallSlot[] {
  return s.halls[FOUNDERS_HALL_ID] ?? [];
}

// Every office the college holds, open or closing, with its slot.
export function heldOffices(s: GameState): { id: string; slot: number; closingWeeks?: number }[] {
  return foundersSlots(s).flatMap((slot, i) => (slot.office
    ? [{ id: slot.office.id, slot: i, closingWeeks: slot.office.closingWeeks }]
    : []));
}

export function officeHeld(s: GameState, officeId: string): boolean {
  return heldOffices(s).some((o) => o.id === officeId);
}

// Open, and not closing: the office is working.
export function officeOpen(s: GameState, officeId: string): boolean {
  return heldOffices(s).some((o) => o.id === officeId && o.closingWeeks === undefined);
}

// How many offices the college may hold. Until PR 89D's milestones land,
// every one of them.
export function officeAllowance(_s: GameState): number {
  return MAX_OFFICES;
}

// The seat an office names is filled (seatData.ts; read off s.seats rather
// than delegation/seats.ts, which would join this module to the event
// tables).
function seatFilled(s: GameState, seatId: string): boolean {
  return (s.seats ?? []).some((x) => x.seatId === seatId && x.school === null);
}

export function officeSeatFilled(s: GameState, officeId: string): boolean {
  const def = officeDef(officeId);
  return def !== undefined && seatFilled(s, def.seatId);
}

// How strongly an office works: 0 when it is not open, 1 when it is, and
// OFFICE_SEAT_BONUS while its seat is filled. Every effect scales its
// lever by this (PR 89E).
export function officeStrength(s: GameState, officeId: string): number {
  if (!officeOpen(s, officeId)) return 0;
  return officeSeatFilled(s, officeId) ? OFFICE_SEAT_BONUS : 1;
}

export function officePrice(s: GameState, officeId: string): number {
  const def = officeDef(officeId);
  return def ? weeksOfOpEx(s, def.priceWeeks) : 0;
}

// What the open offices draw, a week: each a share of last week's
// operating cost (the floor of moneyScale.ts for a college too young to
// have one). Closing offices draw nothing.
export function officeBudget(s: GameState): number {
  const open = heldOffices(s).filter((o) => o.closingWeeks === undefined).length;
  return open * OFFICE_BUDGET_SHARE * Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE);
}

// Why an office cannot open in a slot now, or null if it can. Said to the
// player as is.
export function openOfficeRefusal(s: GameState, officeId: string, slot: number): string | null {
  const def = officeDef(officeId);
  if (!def) return 'No such office.';
  const slots = foundersSlots(s);
  if (slot < 0 || slot >= slots.length) return 'No such slot in Founders Hall.';
  if (!slotFree(slots[slot])) return 'That slot is taken.';
  if (officeHeld(s, officeId)) return `The college has ${def.title} already.`;
  if (heldOffices(s).length >= officeAllowance(s)) {
    return officeAllowance(s) === 0
      ? 'The college may not hold an office yet.'
      : `The college holds every office it may: ${officeAllowance(s)}.`;
  }
  if (s.finance.cash < officePrice(s, officeId)) return 'Not enough cash.';
  return null;
}

export function openOffice(s: GameState, officeId: string, slot: number): boolean {
  if (openOfficeRefusal(s, officeId, slot) !== null) return false;
  const def = officeDef(officeId)!;
  const price = officePrice(s, officeId);
  s.finance.cash -= price;
  foundersSlots(s)[slot] = { programId: null, office: { id: officeId, openedYear: s.clock.year } };
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'good',
    message: `The ${def.title} opens in Founders Hall.`,
  });
  return true;
}

export function closeOfficeRefusal(s: GameState, officeId: string): string | null {
  const held = heldOffices(s).find((o) => o.id === officeId);
  if (!held) return 'The college has no such office.';
  if (held.closingWeeks !== undefined) return 'It is closing already.';
  return null;
}

export function closeOffice(s: GameState, officeId: string): boolean {
  if (closeOfficeRefusal(s, officeId) !== null) return false;
  const slot = foundersSlots(s).find((x) => x.office?.id === officeId)!;
  slot.office!.closingWeeks = OFFICE_CLOSING_WEEKS;
  s.log.unshift({
    year: s.clock.year, week: s.clock.week, kind: 'info',
    message: `The ${officeDef(officeId)?.title ?? officeId} is closing: its slot in Founders Hall is dark for ${OFFICE_CLOSING_WEEKS} weeks.`,
  });
  return true;
}

// One week of every closing office; a closed office leaves its slot free.
export function tickOffices(s: GameState): void {
  const slots = s.halls[FOUNDERS_HALL_ID];
  if (!slots) return;
  slots.forEach((slot, i) => {
    const closing = slot.office?.closingWeeks;
    if (closing === undefined) return;
    if (closing <= 1) {
      const title = officeDef(slot.office!.id)?.title ?? slot.office!.id;
      slots[i] = { programId: null };
      s.log.unshift({
        year: s.clock.year, week: s.clock.week, kind: 'info',
        message: `The ${title} has closed; its slot in Founders Hall is free.`,
      });
    } else {
      slot.office!.closingWeeks = closing - 1;
    }
  });
}

// The Treasury's note on the Offices line.
export function officesNote(s: GameState): string {
  const open = heldOffices(s).filter((o) => o.closingWeeks === undefined);
  const titles = open.map((o) => officeDef(o.id)?.title ?? o.id);
  return `${open.length} office${open.length === 1 ? '' : 's'} in Founders Hall (${titles.join(', ')}), each staffed at ${(OFFICE_BUDGET_SHARE * 100).toFixed(1)}% of the week's operating cost`;
}
