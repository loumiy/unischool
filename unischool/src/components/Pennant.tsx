import { institutionName, type GameState } from '../state/types';
import { useSettings, type TextScale } from '../settings';

// The pennant: the school's name on a banner in its colors, hung from the
// map's top-left corner (Plan 90). The game keeps no calendar, so it carries
// no founding year (Plan 96D: "Est. Year 1" was always the same). A name of
// any length (COLLEGE_NAME_MAX) shows whole: the longer it is, the smaller
// its type, so it wraps to a few balanced lines and never clips.
// App.tsx hides it while a tab is open (tabs put their own title in that
// corner). Inert, so clicks fall through to the map, bar the name (for its
// title). The college is renamed once, in the charter's letter (Plan 80D,
// InboxTab.tsx's CharterAnswer); the pennant only shows the name.

// The sizes, largest first: the name's length each holds, and its share of
// --text-2xl (styles.css's .pennant-name rules, which these follow).
export const NAME_SIZES: readonly { size: string; maxLength: number; share: number }[] = [
  { size: 'full', maxLength: 12, share: 1 },
  { size: 'long', maxLength: 24, share: 0.82 },
  { size: 'longer', maxLength: 40, share: 0.7 },
  { size: 'longest', maxLength: Infinity, share: 0.6 },
];
// --text-2xl at the smallest text, and the name's line: the banner's 150px
// less its borders and padding (a phone's narrower banner is not sized for).
export const TEXT_2XL_PX = 22;
export const LINE_PX = 118;

// Each letter's advance in the display face at 800 (Bricolage Grotesque),
// in em, measured in the browser (Plan 104K); a letter not listed counts as
// one of the widest.
const ADVANCE_EM: Readonly<Record<string, number>> = {
  a: 0.58, b: 0.64, c: 0.56, d: 0.64, e: 0.58, f: 0.41, g: 0.6, h: 0.63, i: 0.28, j: 0.28, k: 0.6, l: 0.27, m: 0.95,
  n: 0.63, o: 0.6, p: 0.64, q: 0.64, r: 0.44, s: 0.55, t: 0.41, u: 0.62, v: 0.59, w: 0.9, x: 0.59, y: 0.6, z: 0.53,
  A: 0.71, B: 0.68, C: 0.68, D: 0.69, E: 0.62, F: 0.59, G: 0.72, H: 0.72, I: 0.29, J: 0.37, K: 0.69, L: 0.5, M: 0.95,
  N: 0.78, O: 0.72, P: 0.64, Q: 0.74, R: 0.68, S: 0.66, T: 0.6, U: 0.72, V: 0.69, W: 1.02, X: 0.72, Y: 0.67, Z: 0.58,
  "'": 0.2, '’': 0.2, '-': 0.35, '.': 0.25, '&': 0.74,
};
const UNLISTED_EM = 0.8;
export function wordEm(word: string): number {
  return [...word].reduce((em, c) => em + (ADVANCE_EM[c] ?? UNLISTED_EM), 0);
}

// The size a name takes (Plan 104K): the smaller of the one its length asks
// for and the largest at which its longest word fits the line at the
// player's text size. By length alone, "Baltimoore College" took the second
// size, at which the largest text set "Baltimoore" wider than the line. A
// word too wide even for the smallest size ("Wolverhampton" at the larger
// texts) sets the type to just fit it (`fitPx`), down to MIN_FIT_PX; only a
// word wider than that breaks.
export const MIN_FIT_PX = 11;
export function nameSize(name: string, textScale: TextScale | number = 1): { size: string; fitPx: number | null } {
  const byLength = NAME_SIZES.findIndex((n) => name.length <= n.maxLength);
  const widest = Math.max(0, ...name.split(/\s+/).map(wordEm));
  const fits = NAME_SIZES.findIndex((n) => widest * TEXT_2XL_PX * n.share * textScale <= LINE_PX);
  if (fits < 0) return { size: NAME_SIZES[NAME_SIZES.length - 1].size, fitPx: Math.max(MIN_FIT_PX, Math.floor((LINE_PX / widest) * 10) / 10) };
  return { size: NAME_SIZES[Math.max(byLength, fits)].size, fitPx: null };
}

export default function Pennant({ s }: { s: GameState }) {
  const name = institutionName(s.self);
  const { textScale } = useSettings();
  const { size, fitPx } = nameSize(name, textScale);
  return (
    <div className="pennant">
      <div className="pennant-body">
        <span className={`pennant-name ${size}`} style={fitPx !== null ? { fontSize: `${fitPx}px` } : undefined} title={name}>{name}</span>
      </div>
      <div className="pennant-tail" aria-hidden="true" />
    </div>
  );
}
