import { TEXT_SCALES, setSettings, useSettings } from '../settings';
import { SHORTCUTS, isKey, keyName, useHotkeys, type Shortcut, type ShortcutPlace } from './hotkeys';
import { CloseIcon } from './icons';
import { switchStyle } from './segmentedSwitch';
import { answerStats, statsAvailable } from '../analytics/analytics';
import { feedbackAvailable } from '../feedback';

// Settings (Plan 34, from v2's): text size, color vision and motion, the
// pause when a matter arrives (Plan 78E) and for the news (Plan 95T), the
// seasons on the map (Plan 74I), and the sound (App.tsx passes
// SoundControls in).

// The Keyboard section (Plan 98F), from hotkeys.ts's table: by place, and
// one line for the keys that share a meaning (W A S D and the arrows pan).
function shortcutRows(): { where: ShortcutPlace; lines: { keys: string[]; does: string }[] }[] {
  const out: { where: ShortcutPlace; lines: { keys: string[]; does: string }[] }[] = [];
  for (const { keys, does, where } of Object.values(SHORTCUTS) as Shortcut[]) {
    let group = out.find((g) => g.where === where);
    if (!group) out.push(group = { where, lines: [] });
    const line = group.lines.find((l) => l.does === does);
    if (line) line.keys.push(...keys.map(keyName));
    else group.lines.push({ keys: keys.map(keyName), does });
  }
  // Letters before the named keys: W A S D, then the arrows.
  const letter = (k: string) => (/^[A-Z0-9]$/.test(k) ? 0 : 1);
  for (const { lines } of out) for (const l of lines) l.keys.sort((a, b) => letter(a) - letter(b));
  return out;
}

const SCALE_LABELS: Record<number, string> = { 1: 'Standard', 1.15: 'Larger', 1.3: 'Largest' };

export default function SettingsPanel({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  const s = useSettings();
  useHotkeys((e) => { if (isKey(e, 'back')) onClose(); });
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
          <p className="settings-note">The clock stops for each new matter to decide.</p>
        </fieldset>
        <fieldset className="settings-row">
          <legend>Pause for news</legend>
          <span className="segmented switch" style={switchStyle(2, s.pauseForNews ? 0 : 1)}>
            <button type="button" className={s.pauseForNews ? 'active' : undefined} aria-pressed={s.pauseForNews} onClick={() => setSettings({ pauseForNews: true })}>On</button>
            <button type="button" className={s.pauseForNews ? undefined : 'active'} aria-pressed={!s.pauseForNews} onClick={() => setSettings({ pauseForNews: false })}>Off</button>
          </span>
          <p className="settings-note">The clock stops for each celebration and research report. Off, they wait in the inbox as letters.</p>
        </fieldset>
        <fieldset className="settings-row">
          <legend>Seasons</legend>
          <span className="segmented switch" style={switchStyle(2, s.seasons ? 0 : 1)}>
            <button type="button" className={s.seasons ? 'active' : undefined} aria-pressed={s.seasons} onClick={() => setSettings({ seasons: true })}>Through the year</button>
            <button type="button" className={!s.seasons ? 'active' : undefined} aria-pressed={!s.seasons} onClick={() => setSettings({ seasons: false })}>Always summer</button>
          </span>
          <p className="settings-note">Autumn leaves and winter snow on the campus, or its summer green all year.</p>
        </fieldset>
        {statsAvailable() && (
          <fieldset className="settings-row">
            <legend>Share anonymous play statistics</legend>
            <span className="segmented switch" style={switchStyle(2, s.stats === 'on' ? 0 : 1)}>
              <button type="button" className={s.stats === 'on' ? 'active' : undefined} aria-pressed={s.stats === 'on'} onClick={() => answerStats(true)}>On</button>
              <button type="button" className={s.stats === 'on' ? undefined : 'active'} aria-pressed={s.stats !== 'on'} onClick={() => answerStats(false)}>Off</button>
            </span>
            <p className="settings-note">How far runs get and how long they take, to help the playtest: no names and nothing you type.</p>
          </fieldset>
        )}
        {feedbackAvailable() && (
          <fieldset className="settings-row">
            <legend>Ask for feedback</legend>
            <span className="segmented switch" style={switchStyle(2, s.feedbackPrompts ? 0 : 1)}>
              <button type="button" className={s.feedbackPrompts ? 'active' : undefined} aria-pressed={s.feedbackPrompts} onClick={() => setSettings({ feedbackPrompts: true })}>On</button>
              <button type="button" className={s.feedbackPrompts ? undefined : 'active'} aria-pressed={!s.feedbackPrompts} onClick={() => setSettings({ feedbackPrompts: false })}>Off</button>
            </span>
            <p className="settings-note">Twice at most, once after five years and once at the Final Report. The menu's Send feedback is always there.</p>
          </fieldset>
        )}
        {children}
        <fieldset className="settings-row">
          <legend>Keyboard</legend>
          <dl className="settings-keys">
            {shortcutRows().map(({ where, lines }) => (
              <div key={where} className="settings-keys-group">
                <dt className="settings-keys-place">{where}</dt>
                {lines.map(({ keys, does }) => (
                  <dd key={does}>
                    <span className="settings-keys-caps">{keys.map((k) => <kbd key={k}>{k}</kbd>)}</span>
                    <span>{does}</span>
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </fieldset>
        <p className="settings-note">Kept in this browser, apart from your run.</p>
      </section>
    </div>
  );
}
