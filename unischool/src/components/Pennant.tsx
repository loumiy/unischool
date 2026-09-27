import { useState } from 'react';
import { COLLEGE_NAME_MAX, institutionName, type GameState } from '../state/types';
import type { Action } from '../state/actions';
import { RenameIcon } from './icons';

// The pennant: the school's name in its colors, hung from the map's
// top-left corner. One line, one size; a long name wraps rather than
// shrinks. App.tsx hides it while a tab is open (tabs put their own title in
// that corner). Inert, so clicks fall through to the map, bar its one
// button: renaming the college (Plan 72E), which is also where College
// becomes University once chartered, or goes back.
export default function Pennant({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="pennant">
      <div className="pennant-body">
        <span className="pennant-name">{institutionName(s.self)}</span>
        {!editing && (
          <button type="button" className="pennant-rename" aria-label="Rename the college" title="Rename the college" onClick={() => setEditing(true)}><RenameIcon /></button>
        )}
      </div>
      {editing && <RenameForm s={s} act={act} onDone={() => setEditing(false)} />}
      <div className="pennant-tail" aria-hidden="true" />
    </div>
  );
}

function RenameForm({ s, act, onDone }: { s: GameState; act: (a: Action) => void; onDone: () => void }) {
  const [name, setName] = useState(s.self.name);
  const [suffix, setSuffix] = useState<'College' | 'University'>(s.self.suffix === 'University' ? 'University' : 'College');
  const chartered = s.self.universityCharterOffered;
  const save = () => {
    if (name.trim() !== '') act({ type: 'RENAME_COLLEGE', name, suffix });
    onDone();
  };
  return (
    <form
      className="pennant-form"
      onSubmit={(e) => { e.preventDefault(); save(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onDone(); } }}
    >
      <label className="pennant-form-label">
        Name
        <input
          type="text" value={name} maxLength={COLLEGE_NAME_MAX} autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="pennant-form-suffix segmented" role="radiogroup" aria-label="College or University">
        {(['College', 'University'] as const).map((x) => (
          <button
            key={x} type="button" role="radio" aria-checked={suffix === x}
            className={suffix === x ? 'is-on' : ''}
            disabled={x === 'University' && !chartered}
            title={x === 'University' && !chartered ? 'The trustees grant a university charter once a lab is at work.' : undefined}
            onClick={() => setSuffix(x)}
          >{x}</button>
        ))}
      </div>
      <div className="pennant-form-actions">
        <button type="submit" className="primary" disabled={name.trim() === ''}>Rename</button>
        <button type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}
