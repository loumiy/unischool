import { TEXT_SCALES, setSettings, useSettings } from '../settings';
import { useHotkeys } from './hotkeys';
import { CloseIcon } from './icons';
import { switchStyle } from './segmentedSwitch';

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
        <fieldset className="settings-row">
          <legend>Text size</legend>
          <span className="segmented switch" style={switchStyle(TEXT_SCALES.length, TEXT_SCALES.indexOf(s.textScale))}>
            {TEXT_SCALES.map((scale) => (
              <button key={scale} type="button" className={s.textScale === scale ? 'active' : undefined} aria-pressed={s.textScale === scale} onClick={() => setSettings({ textScale: scale })}>
                {SCALE_LABELS[scale]}
              </button>
            ))}
          </span>
        </fieldset>
        <fieldset className="settings-row">
          <legend>Colors</legend>
          <span className="segmented switch" style={switchStyle(2, s.vision === 'safe' ? 1 : 0)}>
            <button type="button" className={s.vision === 'standard' ? 'active' : undefined} aria-pressed={s.vision === 'standard'} onClick={() => setSettings({ vision: 'standard' })}>Standard</button>
            <button type="button" className={s.vision === 'safe' ? 'active' : undefined} aria-pressed={s.vision === 'safe'} onClick={() => setSettings({ vision: 'safe' })}>Color-vision safe</button>
          </span>
          <p className="settings-note">Good and bad news in blue and orange rather than green and red.</p>
        </fieldset>
        <fieldset className="settings-row">
          <legend>Motion</legend>
          <span className="segmented switch" style={switchStyle(2, s.motion === 'reduce' ? 1 : 0)}>
            <button type="button" className={s.motion === 'system' ? 'active' : undefined} aria-pressed={s.motion === 'system'} onClick={() => setSettings({ motion: 'system' })}>Match the device setting</button>
            <button type="button" className={s.motion === 'reduce' ? 'active' : undefined} aria-pressed={s.motion === 'reduce'} onClick={() => setSettings({ motion: 'reduce' })}>Reduced</button>
          </span>
          <p className="settings-note">Reduced stills the walkers, the counting numbers and the pulses.</p>
        </fieldset>
        <fieldset className="settings-row">
          <legend>Pause when a matter arrives</legend>
          <span className="segmented switch" style={switchStyle(2, s.pauseOnArrival ? 0 : 1)}>
            <button type="button" className={s.pauseOnArrival ? 'active' : undefined} aria-pressed={s.pauseOnArrival} onClick={() => setSettings({ pauseOnArrival: true })}>On</button>
            <button type="button" className={s.pauseOnArrival ? undefined : 'active'} aria-pressed={!s.pauseOnArrival} onClick={() => setSettings({ pauseOnArrival: false })}>Off</button>
          </span>
          <p className="settings-note">The clock stops for each new matter to decide. Either way, a matter not yet opened stops it once in its final week.</p>
        </fieldset>
        <fieldset className="settings-row">
          <legend>Seasons</legend>
          <span className="segmented switch" style={switchStyle(2, s.seasons ? 0 : 1)}>
            <button type="button" className={s.seasons ? 'active' : undefined} aria-pressed={s.seasons} onClick={() => setSettings({ seasons: true })}>Through the year</button>
            <button type="button" className={!s.seasons ? 'active' : undefined} aria-pressed={!s.seasons} onClick={() => setSettings({ seasons: false })}>Always summer</button>
          </span>
          <p className="settings-note">Autumn leaves and winter snow on the campus, or its summer green all year.</p>
        </fieldset>
        {children}
        <p className="settings-note">Kept in this browser, apart from your run.</p>
      </section>
    </div>
  );
}
