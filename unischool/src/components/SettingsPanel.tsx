import { TEXT_SCALES, setSettings, useSettings } from '../settings';
import { useHotkeys } from './hotkeys';

// Settings (Plan 34, from v2's): text size, color vision and motion, and
// the sound (App.tsx passes SoundControls in).

const SCALE_LABELS: Record<number, string> = { 1: 'Standard', 1.15: 'Larger', 1.3: 'Largest' };

export default function SettingsPanel({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  const s = useSettings();
  useHotkeys((e) => { if (e.key === 'Escape') onClose(); });
  return (
    <div className="front-screen" role="dialog" aria-modal="true" aria-label="Settings">
      <section className="title-card settings">
        <div className="hall-head">
          <h2 className="hall-title">Settings</h2>
          <button type="button" className="toolbar-popup-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <fieldset className="settings-row">
          <legend>Text size</legend>
          {TEXT_SCALES.map((scale) => (
            <button key={scale} type="button" className={`startup-vern-btn ${s.textScale === scale ? 'active' : ''}`} aria-pressed={s.textScale === scale} onClick={() => setSettings({ textScale: scale })}>
              {SCALE_LABELS[scale]}
            </button>
          ))}
        </fieldset>
        <fieldset className="settings-row">
          <legend>Colors</legend>
          <button type="button" className={`startup-vern-btn ${s.vision === 'standard' ? 'active' : ''}`} aria-pressed={s.vision === 'standard'} onClick={() => setSettings({ vision: 'standard' })}>Standard</button>
          <button type="button" className={`startup-vern-btn ${s.vision === 'safe' ? 'active' : ''}`} aria-pressed={s.vision === 'safe'} onClick={() => setSettings({ vision: 'safe' })}>Color-vision safe</button>
          <p className="settings-note">Good and bad news in blue and orange rather than green and red.</p>
        </fieldset>
        <fieldset className="settings-row">
          <legend>Motion</legend>
          <button type="button" className={`startup-vern-btn ${s.motion === 'system' ? 'active' : ''}`} aria-pressed={s.motion === 'system'} onClick={() => setSettings({ motion: 'system' })}>As the system says</button>
          <button type="button" className={`startup-vern-btn ${s.motion === 'reduce' ? 'active' : ''}`} aria-pressed={s.motion === 'reduce'} onClick={() => setSettings({ motion: 'reduce' })}>Reduced</button>
          <p className="settings-note">Reduced stills the walkers, the counting numbers and the pulses.</p>
        </fieldset>
        {children}
        <p className="settings-note">Kept in this browser, apart from your run.</p>
      </section>
    </div>
  );
}
