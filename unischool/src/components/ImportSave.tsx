import { useRef, useState } from 'react';
import ConfirmButton from './ConfirmButton';
import { adoptSave, readSave, REFUSAL_TEXT } from '../state/persistence';
import type { GameState } from '../state/types';
import { institutionName } from '../state/types';

// "Load a save file" (Plan 70B): a file the player downloaded earlier, from
// this browser or another. The file goes through the same path as the boot
// load (persistence.ts's readSave: parse, migrate, sanitize). A refused file
// says why; an accepted one names itself and asks once before it replaces
// the run in this browser, then the page reloads onto it.
export default function ImportSave({ current, className = 'save-btn' }: { current: GameState; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<GameState | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    setPicked(null);
    setRefusal(null);
    if (!file) return;
    const read = readSave(await file.text());
    if ('refused' in read) setRefusal(REFUSAL_TEXT[read.refused]);
    else setPicked(read.state);
  }

  function adopt(state: GameState) {
    if (!adoptSave(state)) {
      setRefusal('This browser refused to store the save (storage may be full or turned off).');
      return;
    }
    window.location.reload();
  }

  return (
    <div className="import-save">
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      <button type="button" className={className} onClick={() => input.current?.click()}>Load a save file</button>
      {refusal && <p className="import-save-note" role="alert">{refusal}</p>}
      {picked && (
        <div className="import-save-note" role="status">
          <p>{institutionName(picked.self)}, Year {picked.clock.year}.</p>
          <ConfirmButton
            className="newgame-btn"
            label={`Continue ${institutionName(picked.self)}`}
            armedLabel={current.started ? `Confirm — replace ${institutionName(current.self)}` : 'Confirm'}
            warning={current.started ? `${institutionName(current.self)} is replaced in this browser. Download it first to keep it.` : undefined}
            needsConfirm={current.started}
            onConfirm={() => adopt(picked)}
          />
          <button type="button" className="save-btn" onClick={() => setPicked(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
