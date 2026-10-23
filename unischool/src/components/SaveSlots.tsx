import { useState } from 'react';
import ConfirmButton from './ConfirmButton';
import { adoptSave, refusalText } from '../state/persistence';
import { deleteSlot, listSlots, readSlot, saveToSlot, type SlotInfo } from '../state/slots';
import type { GameState } from '../state/types';
import { institutionName } from '../state/types';
import { flush } from '../analytics/analytics';
import { calendarDate } from '../format';

// ---------------------------------------------------------------------
// The save slots (Plan 98D): three places to keep a run, beside the
// autosave. In the game's menu each can be saved into, loaded and deleted;
// on the title screen (`canSave` false) only loaded. Every loss asks first
// (ConfirmButton, Plan 47): saving over a slot, loading over a started run,
// deleting. Loading adopts the slot's run as an imported file is adopted,
// and the page reloads onto it.
// ---------------------------------------------------------------------

const STORAGE_FULL = 'Not saved. This browser\'s storage is full. Delete a slot, or click Download save to keep the run as a file.';


export default function SaveSlots({ current, canSave, className = 'menu-btn' }: {
  current: GameState; canSave: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<(SlotInfo | null)[]>(listSlots);
  const [note, setNote] = useState<string | null>(null);
  const refresh = () => setSlots(listSlots());
  const here = institutionName(current.self);

  function save(id: number) {
    const outcome = saveToSlot(id, current);
    setNote(outcome === 'saved' ? `Saved to slot ${id}.` : STORAGE_FULL);
    refresh();
  }

  function load(id: number) {
    const read = readSlot(id);
    if ('refused' in read) {
      setNote(read.refused === 'empty' ? `Slot ${id} is empty.` : refusalText({ refused: read.refused }));
      refresh();
      return;
    }
    if (!adoptSave(read.state)) {
      setNote('This browser refused to store the run (storage may be full or turned off).');
      return;
    }
    flush();
    window.location.reload();
  }

  function remove(id: number) {
    deleteSlot(id);
    setNote(`Slot ${id} deleted.`);
    refresh();
  }

  if (!open) {
    return (
      <button type="button" className={className} onClick={() => { refresh(); setNote(null); setOpen(true); }}>
        Save slots…
      </button>
    );
  }

  return (
    <div className="save-slots" role="group" aria-label="Save slots">
      <ul className="save-slots-list">
        {slots.map((slot, i) => {
          const id = i + 1;
          return (
            <li key={id} className="save-slot">
              <div className="save-slot-what">
                <span className="save-slot-id">Slot {id}</span>
                {slot
                  ? <span>{slot.collegeName}, Year {slot.year} <span className="save-slot-when">· {calendarDate(slot.savedAt)}</span></span>
                  : <span className="save-slot-empty">Empty</span>}
              </div>
              <div className="save-slot-actions">
                {canSave && (
                  <ConfirmButton
                    className={className}
                    label="Save here"
                    armedLabel={slot ? `Confirm — replace ${slot.collegeName}` : 'Save here'}
                    needsConfirm={slot !== null}
                    onConfirm={() => save(id)}
                  />
                )}
                {slot && (
                  <ConfirmButton
                    className={className}
                    label="Load"
                    armedLabel={`Confirm — replace ${here}`}
                    warning={current.started ? `${here} is replaced in this browser. Save it to a slot first to keep it.` : undefined}
                    needsConfirm={current.started}
                    onConfirm={() => load(id)}
                  />
                )}
                {slot && canSave && (
                  <ConfirmButton
                    className={`${className} btn-quiet`}
                    label="Delete"
                    armedLabel="Confirm — delete"
                    onConfirm={() => remove(id)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {note && <p className="import-save-note" role="status">{note}</p>}
      <button type="button" className={`${className} btn-quiet`} onClick={() => setOpen(false)}>Close slots</button>
    </div>
  );
}
