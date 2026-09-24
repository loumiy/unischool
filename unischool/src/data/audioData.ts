// The sound of the place (Plan 34, from v2's content/audio.json): four
// themes the music switches between on the college's fortunes, the effects
// new log lines cue by topic, and the levels of the campus's ambience.
// Everything is synthesised at run time (components/audio/engine.ts); no
// recordings ship. A theme is a key, a tempo, a progression of scale
// degrees and two voices; an effect is a handful of enveloped oscillators
// or a burst of filtered noise. The levels are v2's, to be tuned by ear.

import type { LogTopic } from '../state/types';

export const THEME_IDS = ['founding', 'growth', 'distress', 'ceremonial'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  root: number; // MIDI note of the tonic
  scale: string;
  bpm: number;
  progression: number[]; // scale degrees, one chord every two bars
  pad: { wave: Wave; gain: number; cutoff: number; attack: number };
  arp: { wave: Wave; gain: number; octave: number; decay: number };
  pattern: number[]; // eight eighths: a chord tone (0–3), or −1 for a rest
  bass: boolean;
  // So fifty years of one theme do not wear: a B section's progression,
  // played every fourth phrase, and a second arpeggio pattern, played every
  // other phrase.
  progressionB?: number[];
  patternB?: number[];
}

export interface VoiceDef {
  wave: Wave | 'noise';
  freq: number; // Hz; for noise, the band's centre
  to?: number; // a pitch drop, Hz
  attack: number;
  decay: number;
  gain: number;
  delay?: number;
}

export interface SfxDef {
  id: string;
  voices: VoiceDef[];
}

interface AudioFile {
  scales: Record<string, number[]>;
  themes: ThemeDef[];
  sfx: SfxDef[];
  // A log topic to the effect its new lines play.
  cues: Partial<Record<LogTopic, string>>;
  ambience: {
    crowd: { gain: number; fullAt: number; summer: number };
    wind: { gain: number };
    birds: { perSecond: number; gain: number };
    roar: { gain: number };
  };
  words: Record<'sound' | 'mute' | 'unmute' | 'master' | 'music' | 'ambience' | 'sfx' | 'hint', string>;
}

const AUDIO: AudioFile = {
  "scales": {
    "major": [
      0,
      2,
      4,
      5,
      7,
      9,
      11
    ],
    "minor": [
      0,
      2,
      3,
      5,
      7,
      8,
      10
    ]
  },
  "themes": [
    {
      "id": "founding",
      "label": "A field and a charter",
      "root": 53,
      "scale": "major",
      "bpm": 70,
      "progression": [
        0,
        5,
        3,
        4
      ],
      "pad": {
        "wave": "triangle",
        "gain": 0.07,
        "cutoff": 1400,
        "attack": 1.6
      },
      "arp": {
        "wave": "sine",
        "gain": 0.05,
        "octave": 1,
        "decay": 0.9
      },
      "pattern": [
        0,
        -1,
        2,
        -1,
        1,
        -1,
        2,
        -1
      ],
      "bass": true,
      "progressionB": [
        3,
        4,
        1,
        4
      ],
      "patternB": [
        0,
        2,
        1,
        -1,
        2,
        -1,
        1,
        -1
      ]
    },
    {
      "id": "growth",
      "label": "Cranes on the skyline",
      "root": 50,
      "scale": "major",
      "bpm": 88,
      "progression": [
        0,
        4,
        5,
        3
      ],
      "pad": {
        "wave": "sawtooth",
        "gain": 0.035,
        "cutoff": 1100,
        "attack": 0.9
      },
      "arp": {
        "wave": "triangle",
        "gain": 0.05,
        "octave": 1,
        "decay": 0.45
      },
      "pattern": [
        0,
        1,
        2,
        1,
        3,
        2,
        1,
        2
      ],
      "bass": true,
      "progressionB": [
        5,
        3,
        0,
        4
      ],
      "patternB": [
        0,
        2,
        1,
        3,
        2,
        1,
        -1,
        2
      ]
    },
    {
      "id": "distress",
      "label": "The board in session",
      "root": 45,
      "scale": "minor",
      "bpm": 58,
      "progression": [
        0,
        5,
        3,
        4
      ],
      "pad": {
        "wave": "sawtooth",
        "gain": 0.03,
        "cutoff": 650,
        "attack": 2.2
      },
      "arp": {
        "wave": "sine",
        "gain": 0.04,
        "octave": 0,
        "decay": 1.4
      },
      "pattern": [
        0,
        -1,
        -1,
        -1,
        2,
        -1,
        -1,
        -1
      ],
      "bass": true,
      "progressionB": [
        3,
        4,
        5,
        4
      ],
      "patternB": [
        0,
        -1,
        1,
        -1,
        -1,
        2,
        -1,
        -1
      ]
    },
    {
      "id": "ceremonial",
      "label": "Caps and gowns",
      "root": 46,
      "scale": "major",
      "bpm": 64,
      "progression": [
        0,
        3,
        0,
        4,
        5,
        3,
        1,
        4
      ],
      "pad": {
        "wave": "triangle",
        "gain": 0.08,
        "cutoff": 1800,
        "attack": 1.2
      },
      "arp": {
        "wave": "sine",
        "gain": 0.06,
        "octave": 2,
        "decay": 2.2
      },
      "pattern": [
        0,
        -1,
        -1,
        1,
        -1,
        -1,
        2,
        -1
      ],
      "bass": true,
      "progressionB": [
        3,
        4,
        0,
        5,
        3,
        4,
        0,
        4
      ],
      "patternB": [
        0,
        -1,
        1,
        -1,
        2,
        -1,
        1,
        -1
      ]
    }
  ],
  "sfx": [
    {
      "id": "place",
      "voices": [
        {
          "wave": "sine",
          "freq": 140,
          "to": 55,
          "attack": 0.005,
          "decay": 0.22,
          "gain": 0.5
        },
        {
          "wave": "noise",
          "freq": 900,
          "attack": 0.002,
          "decay": 0.08,
          "gain": 0.25
        }
      ]
    },
    {
      "id": "complete",
      "voices": [
        {
          "wave": "sine",
          "freq": 659.25,
          "attack": 0.01,
          "decay": 0.6,
          "gain": 0.18
        },
        {
          "wave": "sine",
          "freq": 987.77,
          "attack": 0.01,
          "decay": 0.8,
          "gain": 0.14,
          "delay": 0.09
        }
      ]
    },
    {
      "id": "coin",
      "voices": [
        {
          "wave": "square",
          "freq": 1318.5,
          "attack": 0.002,
          "decay": 0.09,
          "gain": 0.05
        },
        {
          "wave": "square",
          "freq": 1975.5,
          "attack": 0.002,
          "decay": 0.28,
          "gain": 0.05,
          "delay": 0.07
        }
      ]
    },
    {
      "id": "tick",
      "voices": [
        {
          "wave": "sine",
          "freq": 1760,
          "attack": 0.001,
          "decay": 0.04,
          "gain": 0.06
        }
      ]
    },
    {
      "id": "yearTurn",
      "voices": [
        {
          "wave": "sine",
          "freq": 392,
          "attack": 0.004,
          "decay": 3.2,
          "gain": 0.18
        },
        {
          "wave": "sine",
          "freq": 784,
          "attack": 0.004,
          "decay": 2.2,
          "gain": 0.08
        },
        {
          "wave": "sine",
          "freq": 1082,
          "attack": 0.004,
          "decay": 1.4,
          "gain": 0.05
        },
        {
          "wave": "sine",
          "freq": 523.25,
          "attack": 0.004,
          "decay": 3.0,
          "gain": 0.12,
          "delay": 0.45
        }
      ]
    },
    {
      "id": "letter",
      "voices": [
        {
          "wave": "sine",
          "freq": 196,
          "attack": 0.01,
          "decay": 2.4,
          "gain": 0.2
        },
        {
          "wave": "sine",
          "freq": 233.08,
          "attack": 0.01,
          "decay": 2.0,
          "gain": 0.1,
          "delay": 0.3
        }
      ]
    },
    {
      "id": "cheer",
      "voices": [
        {
          "wave": "noise",
          "freq": 1100,
          "attack": 0.5,
          "decay": 1.8,
          "gain": 0.22
        }
      ]
    },
    {
      "id": "demolish",
      "voices": [
        {
          "wave": "noise",
          "freq": 380,
          "attack": 0.01,
          "decay": 0.9,
          "gain": 0.4
        },
        {
          "wave": "sine",
          "freq": 90,
          "to": 38,
          "attack": 0.01,
          "decay": 0.7,
          "gain": 0.35
        }
      ]
    },
    {
      "id": "click",
      "voices": [
        {
          "wave": "triangle",
          "freq": 880,
          "attack": 0.001,
          "decay": 0.05,
          "gain": 0.05
        }
      ]
    }
  ],
  "cues": {
    "building": "complete",
    "program": "complete",
    "milestone": "complete",
    "breakthrough": "complete",
    "demand-met": "complete",
    "course": "tick",
    "appointment": "tick",
    "departure": "tick",
    "research-started": "tick",
    "research-concluded": "tick",
    "candidate": "tick",
    "petition": "tick",
    "grant": "coin",
    "money": "coin",
    "prize": "cheer",
    "ambition": "letter",
    "demand-raised": "letter",
    "demand-failed": "letter",
    "research-reported": "letter",
    "admissions": "yearTurn"
  },
  "ambience": {
    "crowd": {
      "gain": 0.35,
      "fullAt": 6000,
      "summer": 0.35
    },
    "wind": {
      "gain": 0.25
    },
    "birds": {
      "perSecond": 0.35,
      "gain": 0.04
    },
    "roar": {
      "gain": 0.3
    }
  },
  "words": {
    "sound": "Sound",
    "mute": "Mute",
    "unmute": "Sound on",
    "master": "Volume",
    "music": "Music",
    "ambience": "Campus",
    "sfx": "Effects",
    "hint": "Music follows the college's fortunes; the campus sounds like however many live there. M mutes."
  }
};

export const SCALES: Readonly<Record<string, number[]>> = AUDIO.scales;
export const THEMES: readonly ThemeDef[] = AUDIO.themes;
export const SFX: readonly SfxDef[] = AUDIO.sfx;
export const CUES = AUDIO.cues;
export const AMBIENCE = AUDIO.ambience;
export const AUDIO_WORDS = AUDIO.words;

export function themeById(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id)!;
}

export function sfxById(id: string): SfxDef | undefined {
  return SFX.find((s) => s.id === id);
}

// What plays at a given eighth of a theme: the phrase is one pass through
// the progression; the third of every four phrases is the B section, and
// every other phrase takes the second arpeggio pattern.
export function sectionAt(theme: ThemeDef, step: number): { degree: number; tone: number; phrase: number; b: boolean } {
  const bar = Math.floor(step / 8);
  const chords = Math.floor(bar / 2);
  const phrase = Math.floor(chords / theme.progression.length);
  const b = theme.progressionB !== undefined && phrase % 4 === 2;
  const progression = b ? theme.progressionB! : theme.progression;
  const degree = progression[chords % progression.length];
  const pattern = theme.patternB && phrase % 2 === 1 ? theme.patternB : theme.pattern;
  return { degree, tone: pattern[step % 8], phrase, b };
}

// The MIDI notes of a theme's chord on a scale degree: a triad from the
// scale, and its seventh, for the arpeggio to reach.
export function chordNotes(theme: ThemeDef, degree: number): number[] {
  const scale = SCALES[theme.scale];
  return [0, 2, 4, 6].map((step) => {
    const i = degree + step;
    return theme.root + scale[i % 7] + 12 * Math.floor(i / 7);
  });
}

export function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// What is wrong with the file, if anything (v2 checked it at load; here the
// content test does, test/audio.test.ts).
export function audioProblems(): string[] {
  const out: string[] = [];
  for (const id of THEME_IDS) if (!THEMES.some((t) => t.id === id)) out.push(`no ${id} theme`);
  if (new Set(THEMES.map((t) => t.id)).size !== THEMES.length) out.push('a theme twice');
  for (const t of THEMES) {
    const at = `theme ${t.id}`;
    if (SCALES[t.scale]?.length !== 7) out.push(`${at}: no seven-note scale "${t.scale}"`);
    if (t.progression.length === 0) out.push(`${at}: no chords`);
    for (const p of [t.progression, t.progressionB ?? []]) if (p.some((d) => d < 0 || d > 6)) out.push(`${at}: a degree is 0–6`);
    for (const p of [t.pattern, t.patternB ?? t.pattern]) {
      if (p.length !== 8) out.push(`${at}: a pattern is eight eighths`);
      if (p.some((n) => n < -1 || n > 3)) out.push(`${at}: a step is −1 to 3`);
    }
    if (t.bpm < 30 || t.bpm > 200) out.push(`${at}: a tempo a person could play`);
  }
  if (new Set(SFX.map((s) => s.id)).size !== SFX.length) out.push('an effect twice');
  for (const s of SFX) if (s.voices.some((v) => v.gain <= 0 || v.gain > 1)) out.push(`effect ${s.id}: gain 0–1`);
  for (const [topic, id] of Object.entries(CUES)) if (!sfxById(id)) out.push(`cue ${topic}: no effect "${id}"`);
  return out;
}
