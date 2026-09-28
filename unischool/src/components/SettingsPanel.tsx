import { TEXT_SCALES, setSettings, useSettings } from '../settings';
import { useHotkeys } from './hotkeys';
import { CloseIcon } from './icons';

// Settings (Plan 34, from v2's): text size, color vision and motion, the
// pause when a matter arrives (Plan 78E), the seasons on the map (Plan
// 74I), and the sound (App.tsx passes SoundControls in).

const SCALE_LABELS: Record<number, string> = { 1: 'Standard', 1.15: 'Larger', 1.3: 'Largest' };

export default function SettingsPanel({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  const s = useSettings();
  useHotkeys((e) => { if (e.key === 'Escape') onClose(); });
  return (
    <div className="front-screen" role="dialog" aria-modal="true" aria-label="Settings">
      <section className="title-card settings">
        <div className="hall-head">
          <h2 className="hall-title">Settings</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        <fieldset className="settings-row segmented">
          <legend>Text size</legend>
          {TEXT_SCALES.map((scale) => (
            <button key={scale} type="button" className={s.textScale === scale ? 'active' : undefined} aria-pressed={s.textScale === scale} onClick={() => setSettings({ textScale: scale })}>
              {SCALE_LABELS[scale]}
            </button>
          ))}
        </fieldset>
        <fieldset className="settings-row segmented">
          <legend>Colors</legend>
          <button type="button" className={s.vision === 'standard' ? 'active' : undefined} aria-pressed={s.vision === 'standard'} onClick={() => setSettings({ vision: 'standard' })}>Standard</button>
          <button type="button" className={s.vision === 'safe' ? 'active' : undefined} aria-pressed={s.vision === 'safe'} onClick={() => setSettings({ vision: 'safe' })}>Color-vision safe</button>
          <p className="settings-note">Good and bad news in blue and orange rather than green and red.</p>
        </fieldset>
        <fieldset className="settings-row segmented">
          <legend>Motion</legend>
          <button type="button" className={s.motion === 'system' ? 'active' : undefined} aria-pressed={s.motion === 'system'} onClick={() => setSettings({ motion: 'system' })}>Match the device setting</button>
          <button type="button" className={s.motion === 'reduce' ? 'active' : undefined} aria-pressed={s.motion === 'reduce'} onClick={() => setSettings({ motion: 'reduce' })}>Reduced</button>
          <p className="settings-note">Reduced stills the walkers, the counting numbers and the pulses.</p>
        </fieldset>
        <fieldset className="settings-row segmented">
          <legend>Pause when a matter arrives</legend>
          <button type="button" className={s.pauseOnArrival ? 'active' : undefined} aria-pressed={s.pauseOnArrival} onClick={() => setSettings({ pauseOnArrival: true })}>On</button>
          <button type="button" className={s.pauseOnArrival ? undefined : 'active'} aria-pressed={!s.pauseOnArrival} onClick={() => setSettings({ pauseOnArrival: false })}>Off</button>
          <p className="settings-note">The clock stops for each new matter to decide. Either way, a matter not yet opened stops it once in its final week.</p>
        </fieldset>
        <fieldset className="settings-row segmented">
          <legend>Seasons</legend>
          <button type="button" className={s.seasons ? 'active' : undefined} aria-pressed={s.seasons} onClick={() => setSettings({ seasons: true })}>Through the year</button>
          <button type="button" className={!s.seasons ? 'active' : undefined} aria-pressed={!s.seasons} onClick={() => setSettings({ seasons: false })}>Always summer</button>
          <p className="settings-note">Autumn leaves and winter snow on the campus, or its summer green all year.</p>
        </fieldset>
        {children}
        <p className="settings-note">Kept in this browser, apart from your run.</p>
      </section>
    </div>
  );
}
