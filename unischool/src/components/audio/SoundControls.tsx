import { AUDIO_WORDS } from '../../data/audioData';
import { audio } from './engine';
import type { AudioSettings } from './settings';
import { useAudioSettings } from './useAudio';

// The sound settings (Plan 34, v2's), in the settings screen: a mute and the four
// levels. Changing one also wakes the engine, since the click that moved
// it is the gesture the browser wanted.

const LEVELS: { key: keyof Omit<AudioSettings, 'muted'>; label: string }[] = [
  { key: 'master', label: AUDIO_WORDS.master },
  { key: 'music', label: AUDIO_WORDS.music },
  { key: 'ambience', label: AUDIO_WORDS.ambience },
  { key: 'sfx', label: AUDIO_WORDS.sfx },
];

export default function SoundControls() {
  const s = useAudioSettings();
  return (
    <fieldset className="sound-controls">
      <legend>{AUDIO_WORDS.sound}</legend>
      <button
        type="button"
        className={`startup-vern-btn sound-mute ${s.muted ? 'active muted' : ''}`}
        aria-pressed={s.muted}
        onClick={() => {
          audio.unlock();
          audio.toggleMute();
        }}
        title={AUDIO_WORDS.hint}
      >
        {s.muted ? AUDIO_WORDS.unmute : AUDIO_WORDS.mute}
      </button>
      {LEVELS.map(({ key, label }) => (
        <label key={key} className="sound-level">
          <span>{label}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(s[key] * 100)}
            disabled={s.muted}
            aria-label={label}
            onChange={(e) => {
              audio.unlock();
              audio.setSettings({ [key]: Number(e.target.value) / 100 });
            }}
          />
          <span className="sound-level-value">{Math.round(s[key] * 100)}</span>
        </label>
      ))}
    </fieldset>
  );
}
