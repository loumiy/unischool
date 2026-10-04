import type { Action } from '../state/actions';
import type { GameState, HallSlot } from '../state/types';
import { WEEKS_PER_YEAR } from '../state/types';
import ConfirmButton from './ConfirmButton';
import {
  MAX_OFFICES, OFFICE_BUDGET_SHARE, OFFICE_CLOSING_WEEKS, OFFICE_DOMAINS, OFFICES, officeDef, officeDomain, officeName,
} from '../data/officeData';
import { seatDef } from '../data/seatData';
import { MIN_OPEX_SCALE } from '../data/moneyScale';
import {
  heldOffices, nextOfficeMilestone, officeAllowance, officeHeld, officePrice, officeSeatFilled, openOfficeRefusal,
} from '../systems/administration/offices';
import { admissionsRange, candidateListingWeeks, candidatePoolTarget, demandCooldownWeeks } from '../systems/administration/effects';
import { charterRefusal, charterWait, foundTeamCost } from '../systems/administration/officeActions';
import { rankForecast } from '../systems/administration/forecast';
import { committeeSeats } from '../systems/techtree/techSystem';
import { count, moneyShort, prestigeFigure, weeksShort } from '../format';

// ---------------------------------------------------------------------
// Founders Hall's offices on its panel (Plan 89F, the owner's mockup):
// an office tile in the college's own colours (a program tile wears its
// school's), opened like a program tile; the offices on offer behind the
// empty slot's Programs | Offices switch, grouped by domain; and the row
// of six that says how many the college may hold and what opens the next.
// ---------------------------------------------------------------------

// What an office's staff costs a year at today's operating cost.
function yearlyCost(s: GameState): number {
  return OFFICE_BUDGET_SHARE * Math.max(s.finance.weeklyOpEx, MIN_OPEX_SCALE) * WEEKS_PER_YEAR;
}

function seatTitle(officeId: string): string {
  const def = officeDef(officeId);
  return (def && seatDef(def.seatId)?.title) ?? 'its seat';
}

// What the office is doing this year, in a line, where there is something
// to say beyond its blurb.
export function officeStatusLine(s: GameState, officeId: string): string | null {
  switch (officeId) {
    case 'admissions': {
      const pool = s.students.lastFunnel?.applicants;
      const range = pool ? admissionsRange(s, pool) : null;
      return range ? `At last year's pool, a range of ${count(range.low)}–${count(range.high)}; the summer shows it at the price you set.` : 'The summer shows its range at the price you set.';
    }
    case 'curriculum': return `The committee writes ${committeeSeats(s)} courses at once, one of them this office's.`;
    case 'faculty-recruitment': return `The market holds up to ${candidatePoolTarget(s)}, each listed ${candidateListingWeeks(s)} weeks.`;
    case 'student-activities': {
      const refusal = charterRefusal(s);
      return refusal === null ? 'A club can be chartered now, from the Students tab.' : charterWait(s) > 0 ? refusal : `No charter now: ${refusal}`;
    }
    case 'athletics-development': return `A sport club whose venue stands can go varsity from the Students tab, for ${moneyShort(foundTeamCost(s))}.`;
    case 'counseling': return `Demands come at most every ${weeksShort(demandCooldownWeeks(s))}.`;
    case 'institutional-research': {
      const f = rankForecast(s);
      return f ? `Graded today: ${prestigeFigure(f.prestige)}, #${f.rank} in the guide (#${f.now} now).` : 'Its forecast opens with the spring term.';
    }
    default: return null;
  }
}

// An office in its slot: closed it reads its title and chip; opened, its
// facts, what it is doing, and the close.
export function OfficeTile({ slot, s, act, open, onToggle }: {
  slot: HallSlot; s: GameState; act?: (a: Action) => void; open: boolean; onToggle: () => void;
}) {
  const office = slot.office!;
  const def = officeDef(office.id);
  const domain = def ? officeDomain(def.domain) : undefined;
  const seated = officeSeatFilled(s, office.id);
  if (office.closingWeeks !== undefined) {
    return (
      <div className="hall-slot housed office closing" title={`${def?.title ?? office.id} is closing: the slot is dark for ${office.closingWeeks} more weeks`}>
        <div className="program-tile">
          <span className="hall-slot-motif office-motif" aria-hidden="true">{domain?.motif}</span>
          <span className="hall-slot-name">{def?.title ?? office.id}</span>
          <span className="program-tile-meta"><span className="program-tile-transit">closing · {weeksShort(office.closingWeeks)}</span></span>
        </div>
      </div>
    );
  }
  const status = officeStatusLine(s, office.id);
  return (
    <div className={`hall-slot housed office${open ? ' open' : ''}`}>
      <button type="button" className="program-tile" aria-expanded={open} onClick={onToggle} title={def?.blurb}>
        <span className="hall-slot-motif office-motif" aria-hidden="true">{domain?.motif}</span>
        <span className="hall-slot-name">{def?.title ?? office.id}</span>
        <span className="program-tile-meta">
          <span className="office-chip">office</span>
          {seated && <span className="office-seat on" title={`${seatTitle(office.id)} seated: half again as effective`}>+50%</span>}
        </span>
      </button>
      {open && def && (
        <div className="program-summary">
          <dl className="program-summary-facts">
            <div><dt>Domain</dt><dd>{domain?.label}</dd></div>
            <div><dt>Seat</dt><dd>{seatTitle(office.id)} · {seated ? 'seated' : 'not seated'}</dd></div>
            <div><dt>Costs</dt><dd>{moneyShort(yearlyCost(s))} a year</dd></div>
            <div><dt>Since</dt><dd>Year {office.openedYear}</dd></div>
          </dl>
          <p className="building-info-line program-summary-next">
            {def.blurb}{seated ? ` With the ${seatTitle(office.id)} seated, half again as much.` : ` Half again as much with a ${seatTitle(office.id)}.`}
          </p>
          {status && <p className="building-info-line program-summary-next">{status}</p>}
          {act && (
            <ConfirmButton
              className="building-info-jump office-close"
              label={`Close office · slot dark ${weeksShort(OFFICE_CLOSING_WEEKS)}`}
              armedLabel={`Confirm — the slot does nothing for ${OFFICE_CLOSING_WEEKS} weeks, and its price is not returned`}
              onConfirm={() => act({ type: 'CLOSE_OFFICE', officeId: office.id })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// The six squares: held, free and locked, and what opens the next.
export function AllowanceRow({ s }: { s: GameState }) {
  const allowance = officeAllowance(s);
  const held = heldOffices(s).length;
  const next = nextOfficeMilestone(s);
  const progress = next?.progress?.(s);
  const nextLine = next
    ? ` · next: ${next.name}${progress ? ` (${progress.unit === 'prestige' ? prestigeFigure(progress.value) : count(Math.floor(progress.value))} of ${count(progress.target)})` : ''}`
    : '';
  return (
    <div className="office-allowance" title="Offices the college may hold: one for each of six milestones">
      <span>Offices</span>
      {Array.from({ length: MAX_OFFICES }, (_, i) => (
        <i key={i} className={i < held ? 'held' : i < allowance ? 'free' : 'locked'} aria-hidden="true" />
      ))}
      <span>{held} held{allowance > held ? `, ${allowance - held} free` : ''}{nextLine}</span>
    </div>
  );
}

// The offices on offer for an empty slot, by domain, and the one picked
// with its confirm.
export function OfficeOffers({ s, act, slot, picked, onPick, onOpened }: {
  s: GameState; act?: (a: Action) => void; slot: number; picked: string | null;
  onPick: (officeId: string | null) => void; onOpened: () => void;
}) {
  const room = officeAllowance(s) - heldOffices(s).length;
  const heldAt = (id: string) => heldOffices(s).find((o) => o.id === id)?.slot;
  return (
    <>
      <h4 className="hall-offer-head">Offices for slot {slot + 1} · {room > 0 ? `${room} more allowed` : 'none more allowed yet'}</h4>
      {OFFICE_DOMAINS.map((d) => (
        <div key={d.id}>
          <p className="office-group">{d.motif} {d.label}</p>
          <div className="hall-offer-tiles">
            {OFFICES.filter((o) => o.domain === d.id).map((o) => {
              if (officeHeld(s, o.id)) {
                return (
                  <button key={o.id} type="button" className="hall-offer-tile office-tile" disabled>
                    <span className="hall-offer-code">{d.motif} Held · slot {(heldAt(o.id) ?? 0) + 1}</span>
                    <span className="hall-offer-name">{o.title}</span>
                    <span className="hall-offer-meta">{o.blurb}</span>
                  </button>
                );
              }
              const selected = picked === o.id;
              const seated = officeSeatFilled(s, o.id);
              const refusal = openOfficeRefusal(s, o.id, slot);
              return (
                <div key={o.id} className="hall-offer-choice">
                  <button type="button" className={`hall-offer-tile office-tile${selected ? ' selected' : ''}`} aria-pressed={selected}
                    onClick={() => onPick(selected ? null : o.id)}>
                    <span className="hall-offer-code">{d.motif} {seatTitle(o.id)} {seated ? 'seated · +50%' : '· not seated'}</span>
                    <span className="hall-offer-name">{o.title}</span>
                    <span className="hall-offer-meta">{o.blurb}<br />{moneyShort(officePrice(s, o.id))} to open · {moneyShort(yearlyCost(s))} a year</span>
                  </button>
                  {selected && (
                    <div className="office-confirm">
                      <p className="building-info-line">
                        <b>Open {officeName(o.id)} in slot {slot + 1}?</b> {moneyShort(officePrice(s, o.id))} now and {moneyShort(yearlyCost(s))} a year, rising with the college's budget.
                        Closing it later leaves the slot dark for {OFFICE_CLOSING_WEEKS} weeks.
                      </p>
                      {refusal && <p className="building-info-line building-info-construction">{refusal}</p>}
                      <button type="button" className="building-info-jump" disabled={refusal !== null || !act}
                        onClick={() => { act?.({ type: 'OPEN_OFFICE', officeId: o.id, slot }); onOpened(); }}>
                        Open office · {moneyShort(officePrice(s, o.id))}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
