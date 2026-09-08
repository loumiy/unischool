import type { Faculty } from '../state/types';
import { facultyQualityTier } from '../data/facultyData';

// Procedural faculty headshots. Same house rule as icons.tsx and
// CampusMap.tsx: no icon library, no external art, hand-rolled inline SVG —
// but unlike icons.tsx's toolbar glyphs (which inherit `currentColor` on
// purpose, since they sit inside a button that recolors itself), a headshot
// is illustrative content, so it hardcodes real colors the same way
// CampusMap.tsx's dorm/facility tiles do.
//
// Deterministic per faculty id, the same way CampusMap.tsx's hashTint picks
// a dorm's color from its id: a professor must render identically every
// time — on every re-render, on every tab switch, after a reload — without
// storing a single extra byte of "what they look like" in the save. A small
// hash of (salt + id) buckets each independent trait (skin tone, hairstyle,
// hair color, glasses, background tint) on its own, so they vary
// independently instead of all four moving together off one number.
//
// Hairstyle and garment ARE keyed off a real stored field (Faculty.gender —
// see types.ts) rather than another hashed bucket: unlike "what color is
// this person's hair", "does this person read as presenting masculine or
// feminine" isn't something a portrait should invent on its own separately
// from the person it's drawing — either it uses the one field the game
// already rolled for exactly this purpose, or it has no business varying
// the silhouette by anything gendered at all.

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
}

// One independent bucket per (salt, faculty). Salting the hash rather than
// reusing one number for every trait is what keeps skin tone, hairstyle,
// hair color, glasses and background from all swinging together off a
// single roll — two professors who happen to share a bucket on one trait
// are still very unlikely to share it on the other four.
function bucket(id: string, salt: string, count: number): number {
  return hash(`${salt}:${id}`) % count;
}

const SKIN_TONES = ['#f2c9a0', '#e0a878', '#c68642', '#8d5524', '#5c3a21'];

// Black / dark brown / light brown-blonde / gray-white. Gray is not just
// another equally-likely bucket — see grayChance below — so it is singled
// out rather than folded into a flat 4-way hash like every other trait.
const HAIR_COLORS = ['#1b1712', '#3b2314', '#8a5a2b'];
const GRAY_HAIR = '#c8c2b8';

// A senior professor is more likely to have gone gray — a small, deliberate
// nod rather than a hard rule (a Distinguished professor going gray 65% of
// the time still leaves plenty who haven't, same as real faculty). Reads
// facultyQualityTier rather than tenureWeeks directly since a CANDIDATE
// (tenureWeeks always 0) can still be senior-caliber the moment they're
// rolled, and the portrait should read that the same way a hire's does.
const GRAY_CHANCE_BY_TIER: Record<string, number> = {
  Distinguished: 0.65,
  Full: 0.4,
  Associate: 0.2,
  Assistant: 0.1,
  Adjunct: 0.08,
};

function hairColor(f: Faculty): string {
  const grayChance = GRAY_CHANCE_BY_TIER[facultyQualityTier(f)] ?? 0.1;
  const roll = bucket(f.id, 'hairGray', 100);
  if (roll < grayChance * 100) return GRAY_HAIR;
  return HAIR_COLORS[bucket(f.id, 'hairColor', HAIR_COLORS.length)];
}

// Muted parchment-family tints so a row of portraits reads as part of the
// same sheet as everything else on the panel, not a clashing sticker — see
// styles.css's --parchment/--gold/--brass-deep for the palette this pulls
// from and lightens/darkens off of.
const BACKGROUND_TINTS = ['#d7c9a3', '#c9b98f', '#b9c9a8', '#c2b6c4', '#c8b49a'];

// --- Hairstyles ---------------------------------------------------------
// Each is an SVG fragment string keyed to the head circle below (center
// 12,9.5 radius 4.6). A few need a piece drawn BEHIND the head (long hair
// framing the sides/back) as well as the usual cap on top, hence the
// {back, front} shape rather than one path.
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
  // Receding: a smaller cap pulled back from the forehead, pairs well with
  // gray on an older-reading professor.
  { front: 'M7.6 7.7a4.8 4.8 0 0 1 8.9-1.1c.5.9.7 1.9.5 2.9-1.3-1.4-2.9-1.6-3.9-1.4-.7.1-1.3.5-1.7 1-.5-.6-1.2-1-2-1.1-.9-.1-1.7.1-2.4.6.1-.3.3-.6.6-.9Z' },
];

const FEMALE_HAIR: HairStyle[] = [
  // Long straight: framed behind the head down past the shoulders.
  {
    back: 'M6.6 9a5.4 5.4 0 0 1 10.8 0c0 3.4-.5 7-1.4 9.6h-1.4c.5-2.6.8-5.6.6-7.8-1.2 1-2.8 1.4-4.4 1.4s-3.2-.4-4.4-1.4c-.2 2.2.1 5.2.6 7.8H6.2c-.9-2.6-1.4-6.2 0-9.6Z',
    front: 'M7.2 8.6a4.8 4.8 0 0 1 9.6 0c0 .4-.1.8-.1 1.1-1.5-1.5-3.4-1.7-4.7-1.7s-3.2.2-4.7 1.7c0-.3-.1-.7-.1-1.1Z',
  },
  // Bun/tied-back: cap on top, small bun at the back-top.
  { front: 'M7.2 8.6a4.8 4.8 0 0 1 9.6 0c0 .5-.1.9-.2 1.3-1.5-1.7-3.4-1.9-4.6-1.9s-3.1.2-4.6 1.9c-.1-.4-.2-.8-.2-1.3ZM14.6 4.6a1.6 1.6 0 1 1 2 1.5 3 3 0 0 0-2-1.5Z' },
  // Bob: fuller cap that comes down to jaw level on both sides.
  { front: 'M6.9 12.4c-.3-1.3-.4-2.6-.1-3.8a5.2 5.2 0 0 1 10.4 0c.3 1.2.2 2.5-.1 3.8-.3-1-.9-1.7-1.4-2.1-1.3-1-2.8-1.2-3.7-1.2s-2.4.2-3.7 1.2c-.5.4-1.1 1.1-1.4 2.1Z' },
  // Curly/coiled long: a wide bumpy silhouette behind the head.
  {
    back: 'M6.2 10.6a1.7 1.7 0 1 1 2.6-2 1.7 1.7 0 1 1 2.9-1.3 1.7 1.7 0 1 1 3-.1 1.7 1.7 0 1 1 3 1.2 1.7 1.7 0 1 1 2.7 1.9c.4 2.6.1 5.7-.6 8.3h-1.4c.6-2.6.9-5.5.5-7.7-1.3 1-2.9 1.4-4.5 1.4s-3.3-.4-4.6-1.4c-.4 2.2-.1 5.1.5 7.7H8c-.7-2.6-1-5.7-.6-8.3-.4-.4-.8-.8-1.2-1.3Z',
    front: '',
  },
  // Pixie: a small, soft cap — shorter coverage than the bob, similar
  // silhouette weight to the male short crop but rounder at the temples.
  { front: 'M7.4 8.9a4.6 4.6 0 0 1 9.2-.3c0 .5-.1.9-.3 1.3-1.4-1.5-3.1-1.7-4.3-1.7-1.1 0-2.7.2-4 1.5-.3-.3-.5-.5-.6-.8Z' },
];

// --- Garment (shoulders/collar) -----------------------------------------
const SHIRT_COLORS = ['#f5f2e8', '#7a97b0', '#4a4a52', '#2f3e5c'];
const BLOUSE_COLORS = ['#f6ede0', '#7a3b46', '#3f6b63', '#2f3e5c'];

// Slightly darkens a hex color, for the collar fold's shadow line — a
// same-hue shade reads as fabric folding, rather than a mismatched trim.
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

export default function FacultyPortrait({ f, size = 24 }: { f: Faculty; size?: number }) {
  const skin = SKIN_TONES[bucket(f.id, 'skin', SKIN_TONES.length)];
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
        {/* Shoulders: a wide "hill" wider than the frame, cropped by the
            clip path above so the garment reads as extending past the
            photo's edge — the same effect a real headshot crop has. */}
        <path d="M0 24 L0 18.5 Q12 12.5 24 18.5 L24 24 Z" fill={garment} />
        {/* Collar: two triangular flaps at the neckline, a shade darker than
            the garment, each with real width at the shoulder line so they
            read as a fold rather than converging into one thin arrow. A
            collared shirt's flaps come to points; a blouse's neckline is a
            single soft scoop instead. */}
        {f.gender === 'male'
          ? (
            <path
              d="M9.3 15.6 L12 18.3 L11.2 15.3 Z M14.7 15.6 L12 18.3 L12.8 15.3 Z"
              fill={collarShade}
            />
          )
          : <path d="M9.4 16 Q12 18.1 14.6 16 L14.6 17.2 Q12 19.1 9.4 17.2 Z" fill={collarShade} />}
        {/* Neck */}
        <rect x="10.3" y="13" width="3.4" height="4" fill={skin} />
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
