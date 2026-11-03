import type { GameState } from '../state/types';
import { CAMPUS_SCALE, beautyTerms, campusTerms } from '../systems/estate/beauty';
import { count, pct } from '../format';

// The campus as the player sees it (Plan 124F, the review's A5, trimmed):
// one figure, the Campus standing (Plan 119), which the Final Report grades
// and the rivals' campus axis reads, with its parts under it. Beauty
// (estate/beauty.ts) stays in the model, feeding applicants and prestige,
// but shows no figure of its own: its inputs are listed among the parts.
// The Estate panel and the build menu show the same figure.

export interface CampusPart {
  label: string;
  share: number; // 0–1
}

export function campusParts(s: GameState): CampusPart[] {
  const c = campusTerms(s);
  const b = beautyTerms(s);
  return [
    { label: 'decoration', share: c.decoration },
    { label: 'quads', share: c.quads },
    { label: 'paths to doors', share: c.paths },
    { label: 'buildings standing', share: c.assets },
    { label: 'greenery', share: b.greenery },
    { label: 'landmarks', share: b.landmarks },
    { label: 'upkeep', share: b.upkeep },
  ];
}

export const CAMPUS_HINT = 'Your Campus standing, out of 150, which the Final Report grades. Its parts: decorations for each building, quads, paths at the doors, how much of what you can build stands, and the trees, landmarks and upkeep. Applicants and prestige notice the trees, landmarks, upkeep and quads too.';

const partsLine = (parts: CampusPart[]) => parts.map((p) => `${p.label} ${pct(p.share)}`).join(', ');

// `compact`: the build menu's topline, the figure and its weakest part.
export default function CampusStanding({ s, compact = false }: { s: GameState; compact?: boolean }) {
  const score = campusTerms(s).score;
  const parts = campusParts(s);
  if (compact) {
    const weakest = parts.reduce((a, b) => (b.share < a.share ? b : a));
    return (
      <span className="stat" title={`${CAMPUS_HINT} Now: ${partsLine(parts)}.`}>
        campus {count(score)} of {CAMPUS_SCALE} · weakest: {weakest.label}
      </span>
    );
  }
  return (
    <>
      <dt title={CAMPUS_HINT}>Campus</dt>
      <dd>
        {count(score)} of {CAMPUS_SCALE}
        <span className="stat"> — {partsLine(parts)}</span>
      </dd>
    </>
  );
}
