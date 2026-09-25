import type { Faculty } from '../state/types';
import { facultyQualityTier } from '../data/facultyData';

// The four fields a portrait reads, so professors and varsity coaches
// (tabs/AthleticsTab.tsx) share one drawing. The caller resolves `seniority`
// (see portraitOf) because the two compute it differently.
export interface Portrayed {
  id: string;         // every trait is a hash bucket off this, so the same person draws identically forever
  gender: 'male' | 'female';
  heritage: string;   // weights skin tone (see HERITAGE_SKIN_TONES)
  seniority: number;  // 0..1 — how likely to have gone gray
}

// A professor, as the portrait sees them.
export function portraitOf(f: Faculty): Portrayed {
  return {
    id: f.id,
    gender: f.gender,
    heritage: f.heritage,
    seniority: GRAY_CHANCE_BY_TIER[facultyQualityTier(f)] ?? GRAY_CHANCE_BY_TIER.Adjunct,
  };
}

// Procedural headshots in hand-rolled SVG with hardcoded colors (they are
// illustrative content, unlike icons.tsx's currentColor glyphs).
//
// Deterministic per id, with nothing stored in the save: each trait is its
// own salted hash bucket so traits vary independently. Hair/garment pools
// follow `gender` and skin tone is weighted by `heritage`, so a face never
// disagrees with the name the game rolled.

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
}

// One independent bucket per (salt, id).
function bucket(id: string, salt: string, count: number): number {
  return hash(`${salt}:${id}`) % count;
}

const SKIN_TONES = ['#f2c9a0', '#e0a878', '#c68642', '#8d5524', '#5c3a21'];

// Weighted spreads over SKIN_TONES indices per heritage (repeats bias the
// odds without collapsing a heritage to one tone). Keyed off `heritage`,
// never `nationality`, which is disproportionately American regardless of
// heritage (facultyData.ts's AMERICAN_NATIONALITY_CHANCE).
const HERITAGE_SKIN_TONES: Record<string, number[]> = {
  // The name pools are split finer than five swatches can distinguish.
  'Chinese': [0, 0, 1, 1, 2],
  'Korean': [0, 0, 1, 1, 2],
  'Japanese': [0, 0, 1, 1, 2],
  'South Asian': [1, 2, 2, 3, 3],
  'Anglo/Western European': [0, 0, 0, 1, 1],
  'Hispanic/Latin American': [0, 1, 1, 2, 2, 3],
  'Arabic/Middle Eastern': [0, 1, 1, 2, 2],
  'Slavic/Eastern European': [0, 0, 0, 1, 1],
  'West African': [2, 3, 3, 4, 4],
  'East African': [2, 3, 3, 4, 4],
};

function skinTone(f: Portrayed): string {
  const weights = HERITAGE_SKIN_TONES[f.heritage] ?? SKIN_TONES.map((_, i) => i);
  return SKIN_TONES[weights[bucket(f.id, 'skin', weights.length)]];
}

// Black / dark brown / light brown-blonde; gray is rolled separately by seniority.
const HAIR_COLORS = ['#1b1712', '#3b2314', '#8a5a2b'];
const GRAY_HAIR = '#c8c2b8';

// Chance of gray hair by tier. Keyed off facultyQualityTier rather than
// tenure so a senior-caliber candidate reads the same as a hire.
const GRAY_CHANCE_BY_TIER: Record<string, number> = {
  Distinguished: 0.65,
  Full: 0.4,
  Associate: 0.2,
  Assistant: 0.1,
  Adjunct: 0.08,
};

function hairColor(f: Portrayed): string {
  const grayChance = f.seniority;
  const roll = bucket(f.id, 'hairGray', 100);
  if (roll < grayChance * 100) return GRAY_HAIR;
  return HAIR_COLORS[bucket(f.id, 'hairColor', HAIR_COLORS.length)];
}

// Muted parchment-family tints (styles.css's --parchment/--gold/--brass-deep).
const BACKGROUND_TINTS = ['#d7c9a3', '#c9b98f', '#b9c9a8', '#c2b6c4', '#c8b49a'];

// --- Hairstyles ---------------------------------------------------------
// SVG paths keyed to the head circle (center 12,9.5, radius 4.6). `back`
// is drawn behind the head for long hair.
interface HairStyle { back?: string; front: string }

const MALE_HAIR: HairStyle[] = [
  // Bald/shaved: no shape at all.
  { front: '' },
  // Short crop: a simple cap hugging the top of the head.
  { front: 'M7.2 8.6a4.8 4.8 0 0 1 9.6 0c0 .5-.1.9-.2 1.3-1.5-1.7-3.4-1.9-4.6-1.9s-3.1.2-4.6 1.9c-.1-.4-.2-.8-.2-1.3Z' },
  // Side part: cap plus a short diagonal parting line.
  { front: 'M7.2 8.4a4.8 4.8 0 0 1 9.6.2c0 .5-.1.9-.2 1.3-1.4-1.6-3.1-1.9-4.3-1.9-.6 0-1.5.4-2.1 1.1M11 6.3l.4 2.7' },
  // Curly/coiled short hair: overlapping bumps along the top.
  { front: 'M7.3 8.7a1.5 1.5 0 1 1 2.4-1.6 1.5 1.5 0 1 1 2.6-1 1.5 1.5 0 1 1 2.6.9 1.5 1.5 0 1 1 2.4 1.6c.1.4.1.9 0 1.3-1.5-1.6-3.4-1.8-4.6-1.8s-3 .2-4.6 1.8c-.1-.4-.1-.9.2-1.2Z' },
  // Receding: a smaller cap pulled back from the forehead.
  { front: 'M7.6 7.7a4.8 4.8 0 0 1 8.9-1.1c.5.9.7 1.9.5 2.9-1.3-1.4-2.9-1.6-3.9-1.4-.7.1-1.3.5-1.7 1-.5-.6-1.2-1-2-1.1-.9-.1-1.7.1-2.4.6.1-.3.3-.6.6-.9Z' },
];

// Long hair's side strands, two mirrored curves (each side's x is 24 minus
// the other's). Keep them mirrored when editing.
const LONG_HAIR_STRANDS = 'M6.8 7.8 Q5.6 13 6.8 19 L8.6 19 Q7.6 13 8.4 7.8 Z M17.2 7.8 Q18.4 13 17.2 19 L15.4 19 Q16.4 13 15.6 7.8 Z';

const FEMALE_HAIR: HairStyle[] = [
  // Long straight: the shared side-strand shape behind a plain fringe.
  {
    back: LONG_HAIR_STRANDS,
    front: 'M7.2 8.6a4.8 4.8 0 0 1 9.6 0c0 .4-.1.8-.1 1.1-1.5-1.5-3.4-1.7-4.7-1.7s-3.2.2-4.7 1.7c0-.3-.1-.7-.1-1.1Z',
  },
  // Bun/tied-back: cap on top, small bun at the back-top.
  { front: 'M7.2 8.6a4.8 4.8 0 0 1 9.6 0c0 .5-.1.9-.2 1.3-1.5-1.7-3.4-1.9-4.6-1.9s-3.1.2-4.6 1.9c-.1-.4-.2-.8-.2-1.3ZM14.6 4.6a1.6 1.6 0 1 1 2 1.5 3 3 0 0 0-2-1.5Z' },
  // Bob: the long-straight fringe cap plus two mirrored jaw-level side panels.
  { front: 'M7.2 8.6a4.8 4.8 0 0 1 9.6 0c0 .4-.1.8-.1 1.1-1.5-1.5-3.4-1.7-4.7-1.7s-3.2.2-4.7 1.7c0-.3-.1-.7-.1-1.1Z M7.3 8.4Q6.3 11 7.6 13.3L9.2 13.3Q8.2 11 8.7 8.4Z M16.7 8.4Q17.7 11 16.4 13.3L14.8 13.3Q15.8 11 15.3 8.4Z' },
  // Curly/coiled long: the male curly cap plus the long side strands.
  {
    back: LONG_HAIR_STRANDS,
    front: 'M7.3 8.7a1.5 1.5 0 1 1 2.4-1.6 1.5 1.5 0 1 1 2.6-1 1.5 1.5 0 1 1 2.6.9 1.5 1.5 0 1 1 2.4 1.6c.1.4.1.9 0 1.3-1.5-1.6-3.4-1.8-4.6-1.8s-3 .2-4.6 1.8c-.1-.4-.1-.9.2-1.2Z',
  },
  // Pixie: a small, soft cap, rounder at the temples.
  { front: 'M7.4 8.9a4.6 4.6 0 0 1 9.2-.3c0 .5-.1.9-.3 1.3-1.4-1.5-3.1-1.7-4.3-1.7-1.1 0-2.7.2-4 1.5-.3-.3-.5-.5-.6-.8Z' },
];

// --- Garment (shoulders/collar) -----------------------------------------
const SHIRT_COLORS = ['#f5f2e8', '#7a97b0', '#4a4a52', '#2f3e5c'];
const BLOUSE_COLORS = ['#f6ede0', '#7a3b46', '#3f6b63', '#2f3e5c'];

// Same-hue shade for the collar fold.
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

export default function FacultyPortrait({ f, size = 24 }: { f: Portrayed; size?: number }) {
  const skin = skinTone(f);
  const hair = hairColor(f);
  const bg = BACKGROUND_TINTS[bucket(f.id, 'bg', BACKGROUND_TINTS.length)];
  const wearsGlasses = bucket(f.id, 'glasses', 3) === 0; // ~1 in 3

  const hairPool = f.gender === 'male' ? MALE_HAIR : FEMALE_HAIR;
  const style = hairPool[bucket(f.id, 'hairStyle', hairPool.length)];

  const garmentPool = f.gender === 'male' ? SHIRT_COLORS : BLOUSE_COLORS;
  const garment = garmentPool[bucket(f.id, 'garment', garmentPool.length)];
  const collarShade = darken(garment, 20);
  const clipId = `portrait-clip-${f.id}`;

  return (
    <svg className="faculty-portrait" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="12" fill={bg} />
      <g clipPath={`url(#${clipId})`}>
        {style.back && <path d={style.back} fill={hair} />}
        {/* Shoulders: wider than the frame, cropped by the clip path. */}
        <path d="M0 24 L0 18.5 Q12 12.5 24 18.5 L24 24 Z" fill={garment} />
        {/* Neck, drawn before the collar so the collar overlaps it. */}
        <rect x="10.3" y="13" width="3.4" height="4" fill={skin} />
        {/* Collar: pointed flaps for a shirt, a soft scoop for a blouse;
            both reach past the neck's edges (10.3/13.7) to overlap it. */}
        {f.gender === 'male'
          ? (
            <path
              d="M8.8 15.6 L12 18.6 L11 15.3 Z M15.2 15.6 L12 18.6 L13 15.3 Z"
              fill={collarShade}
            />
          )
          : <path d="M8.9 15.8 Q12 18.6 15.1 15.8 L15.1 17.6 Q12 20.1 8.9 17.6 Z" fill={collarShade} />}
        {/* Head */}
        <circle cx="12" cy="9.5" r="4.6" fill={skin} />
        <path d={style.front} fill={hair} />
        {wearsGlasses && (
          <path
            d="M9.05 10.1a0.95 0.95 0 1 0 1.9 0 0.95 0.95 0 1 0-1.9 0ZM13.05 10.1a0.95 0.95 0 1 0 1.9 0 0.95 0.95 0 1 0-1.9 0ZM10.95 10.1h1.1"
            fill="none"
            stroke="#3a342c"
            strokeWidth="0.55"
          />
        )}
      </g>
    </svg>
  );
}
