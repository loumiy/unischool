import {
  sectionAt,
  AMBIENCE,
  chordNotes,
  midiToHz,
  sfxById,
  themeById,
  TITLE_MUSIC,
  type ThemeDef,
  type ThemeId,
  type VoiceDef,
} from '../../data/audioData';
import type { AmbienceLevels } from './director';
import {
  DEFAULT_AUDIO,
  loadAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from './settings';

// The synthesiser (Plan 34, v2's engine, unchanged but for its imports).
// One AudioContext, made on the player's first
// gesture (browsers refuse sound before one), four buses — master, and
// under it music, ambience and effects — and everything synthesised: the
// themes are scheduled a fraction of a second ahead from data/audioData.ts,
// the ambience is birdsong scheduled with the music, and an effect is a
// few enveloped oscillators. Where there is no Web Audio (tests, old browsers) every call is a no-op.
//
// One exception to "everything synthesised": the title screen plays a
// recorded theme (assets/title-theme.mp3), looped with a crossfade, and the
// synthesised music waits under it. If the recording can't be fetched or
// decoded, the title plays the founding theme as before.

// Vite emits the file and rewrites this to its built URL; elsewhere (the
// tests) it is only a string nobody fetches.
const TITLE_URL = new URL('../../assets/title-theme.mp3', import.meta.url).href;

type Listener = () => void;

const LOOKAHEAD_S = 0.25;
const SCHEDULE_MS = 60;
const FADE_S = 0.4;
const REST_S = 0.125;

type Ctx = AudioContext;

export class AudioEngine {
  private ctx: Ctx | null = null;
  private buses: { master: GainNode; music: GainNode; ambience: GainNode; sfx: GainNode } | null =
    null;
  // The synthesised themes' own level under the music bus, so the title's
  // recording can fade them out and back.
  private synth: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private settings: AudioSettings = { ...DEFAULT_AUDIO };
  private listeners = new Set<Listener>();

  // Music
  private theme: ThemeId = 'founding';
  private playing: ThemeDef | null = null;
  private step = 0; // eighths since the theme began
  private nextAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  // The title's recording
  private titleOn = false;
  private titleBytes: Promise<ArrayBuffer | null> | null = null;
  private titleBuffer: AudioBuffer | null = null;
  private titleFailed = false;
  private titleOut: GainNode | null = null; // this visit's level; replaced on each
  private titleSources: AudioBufferSourceNode[] = [];
  private titleNext = 0; // when the next pass begins

  // Ambience
  private birdsPerSecond = 0;
  private lastSfx = new Map<string, number>();

  constructor() {
    this.settings = loadAudioSettings();
  }

  get available(): boolean {
    return typeof globalThis.AudioContext === 'function';
  }

  get started(): boolean {
    return this.ctx !== null;
  }

  getSettings = (): AudioSettings => this.settings;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  setSettings(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    saveAudioSettings(this.settings);
    this.applyLevels();
    for (const l of this.listeners) l();
  }

  toggleMute(): void {
    this.setSettings({ muted: !this.settings.muted });
  }

  // The first gesture: make the context and start the loops. Safe to call
  // on every gesture; only the first does anything.
  unlock(): void {
    if (this.ctx || !this.available) {
      if (this.ctx?.state === 'suspended' && !document.hidden) void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const bus = () => {
      const g = ctx.createGain();
      g.connect(master);
      return g;
    };
    this.buses = { master, music: bus(), ambience: bus(), sfx: bus() };
    this.synth = ctx.createGain();
    this.synth.connect(this.buses.music);
    this.noise = makeNoise(ctx);
    this.applyLevels();
    if (this.titleOn) void this.startTitle();
    this.nextAt = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), SCHEDULE_MS);
    document.addEventListener('visibilitychange', this.onVisibility);
    for (const l of this.listeners) l();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.ctx?.close();
    this.ctx = null;
    this.buses = null;
    this.synth = null;
    this.titleOut = null;
    this.titleSources = [];
  }

  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  private applyLevels(): void {
    if (!this.ctx || !this.buses) return;
    const s = this.settings;
    const now = this.ctx.currentTime;
    const set = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, now, 0.08);
    set(this.buses.master, s.muted ? 0 : s.master);
    set(this.buses.music, s.music);
    set(this.buses.ambience, s.ambience);
    set(this.buses.sfx, s.sfx);
  }

  // ---------- music ----------

  setTheme(id: ThemeId): void {
    this.theme = id;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.buses) return;
    if (this.titleOut && this.titleBuffer && this.titleNext < ctx.currentTime + 1) this.titlePass(this.titleBuffer);
    while (this.nextAt < ctx.currentTime + LOOKAHEAD_S) {
      // On the title, the themes rest (the birds don't) and begin again
      // from their first phrase when the player leaves it.
      if (this.titleOn && !this.titleFailed) {
        this.step = 0;
        this.playing = null;
        this.nextAt += REST_S;
        this.maybeBird(this.nextAt, REST_S);
        continue;
      }
      // Themes change on a chord boundary, so a switch is a new phrase
      // rather than a cut: the old pad rings out under the new one.
      if (this.step % 16 === 0 && this.playing?.id !== this.theme) {
        this.playing = themeById(this.theme);
        this.step = 0;
      }
      const theme = this.playing ?? themeById(this.theme);
      this.playing = theme;
      const eighth = 60 / theme.bpm / 2;
      this.playStep(theme, this.step, this.nextAt, eighth);
      this.step += 1;
      this.nextAt += eighth;
      this.maybeBird(this.nextAt, eighth);
    }
  }

  private playStep(theme: ThemeDef, step: number, at: number, eighth: number): void {
    // The A and B sections and the second pattern.
    const now = sectionAt(theme, step);
    const chord = chordNotes(theme, now.degree);
    if (step % 16 === 0) {
      const length = eighth * 16;
      for (const note of chord.slice(0, 3)) this.pad(theme, midiToHz(note), at, length);
      if (theme.bass) this.pad(theme, midiToHz(chord[0]! - 12), at, length, 1.3);
    }
    const tone = now.tone;
    if (tone >= 0) {
      const note = chord[tone]! + 12 * theme.arp.octave;
      this.pluck(theme.arp.wave, midiToHz(note), at, theme.arp.decay, theme.arp.gain);
    }
  }

  private pad(theme: ThemeDef, hz: number, at: number, length: number, weight = 1): void {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = theme.pad.cutoff;
    const env = ctx.createGain();
    const peak = theme.pad.gain * weight;
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(peak, at + theme.pad.attack);
    env.gain.setValueAtTime(peak, at + length - FADE_S);
    env.gain.linearRampToValueAtTime(0, at + length + theme.pad.attack);
    filter.connect(env).connect(this.synth!);
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = theme.pad.wave;
      osc.frequency.value = hz;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + length + theme.pad.attack + 0.05);
    }
  }

  private pluck(wave: OscillatorType, hz: number, at: number, decay: number, gain: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = hz;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(env).connect(this.synth!);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }

  // ---------- the title's recording ----------

  // On the title screen or off it. The file is fetched the first time it is
  // asked for, before any gesture, so the recording is ready when sound is.
  setTitle(on: boolean): void {
    if (on === this.titleOn) return;
    this.titleOn = on;
    if (on && !this.titleBytes && this.available && typeof fetch === 'function') {
      this.titleBytes = fetch(TITLE_URL)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
    }
    if (!this.ctx) return;
    if (on) void this.startTitle();
    else this.stopTitle();
  }

  private async startTitle(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.buses || this.titleOut) return;
    if (!this.titleBuffer) {
      const bytes = await this.titleBytes;
      try {
        if (!bytes) throw new Error('no title music');
        // decodeAudioData detaches its argument; the copy keeps the bytes
        // for a context made later.
        this.titleBuffer = await ctx.decodeAudioData(bytes.slice(0));
      } catch {
        this.titleFailed = true;
        return;
      }
    }
    // Still on the title, in the same context, and not started meanwhile.
    if (!this.titleOn || this.ctx !== ctx || !this.buses || this.titleOut) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = TITLE_MUSIC.gain;
    out.connect(this.buses.music);
    this.titleOut = out;
    this.titleNext = now + 0.05;
    this.synth?.gain.setTargetAtTime(0, now, 0.3);
    this.titlePass(this.titleBuffer, true);
  }

  // One pass through the recording, overlapping the last by the crossfade:
  // the recording ends at full strength, so each pass fades out as the
  // next fades in.
  private titlePass(buffer: AudioBuffer, first = false): void {
    const ctx = this.ctx!;
    const xf = Math.min(TITLE_MUSIC.crossfade, buffer.duration / 4);
    const at = this.titleNext;
    const end = at + buffer.duration;
    const env = ctx.createGain();
    env.gain.setValueAtTime(first ? 1 : 0, at);
    if (!first) env.gain.linearRampToValueAtTime(1, at + xf);
    env.gain.setValueAtTime(1, end - xf);
    env.gain.linearRampToValueAtTime(0, end);
    env.connect(this.titleOut!);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(env);
    src.start(at);
    src.stop(end);
    src.onended = () => {
      this.titleSources = this.titleSources.filter((s) => s !== src);
    };
    this.titleSources.push(src);
    this.titleNext = end - xf;
  }

  // Off the title: the recording fades out and the themes fade back in.
  private stopTitle(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.synth?.gain.setTargetAtTime(1, now, 0.3);
    const out = this.titleOut;
    if (!out) return;
    out.gain.setTargetAtTime(0, now, TITLE_MUSIC.fadeOut / 4);
    for (const src of this.titleSources) src.stop(now + TITLE_MUSIC.fadeOut);
    this.titleSources = [];
    this.titleOut = null;
  }

  // ---------- ambience ----------

  setAmbience(a: AmbienceLevels): void {
    this.birdsPerSecond = a.birds;
  }

  private maybeBird(at: number, span: number): void {
    if (Math.random() > this.birdsPerSecond * span) return;
    const ctx = this.ctx!;
    const start = 2400 + Math.random() * 1800;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const t = at + i * 0.11;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(start * 1.35, t + 0.06);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(AMBIENCE.birds.gain, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(env).connect(this.buses!.ambience);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // ---------- effects ----------

  play(id: string): void {
    if (!this.ctx || !this.buses || this.settings.muted) return;
    const def = sfxById(id);
    if (!def) return;
    // The same effect twice inside a tenth of a second is one effect.
    const now = this.ctx.currentTime;
    if (now - (this.lastSfx.get(id) ?? -1) < 0.1) return;
    this.lastSfx.set(id, now);
    for (const v of def.voices) this.voice(v, this.buses.sfx);
  }

  private voice(v: VoiceDef, out: AudioNode): void {
    const ctx = this.ctx!;
    const at = ctx.currentTime + 0.01 + (v.delay ?? 0);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(v.gain, at + v.attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + v.attack + v.decay);
    env.connect(out);
    const end = at + v.attack + v.decay + 0.05;
    if (v.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = v.freq;
      band.Q.value = 0.9;
      src.connect(band).connect(env);
      src.start(at, Math.random());
      src.stop(end);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = v.wave;
    osc.frequency.setValueAtTime(v.freq, at);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, at + v.attack + v.decay);
    osc.connect(env);
    osc.start(at);
    osc.stop(end);
  }
}

// Two seconds of white noise, shared by every noise burst.
function makeNoise(ctx: Ctx): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export const audio = new AudioEngine();

