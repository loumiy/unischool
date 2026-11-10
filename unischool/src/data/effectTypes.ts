// One thing a choice, a building, a reputation or a quirk does, as the
// interface draws it (components/EffectChip.tsx, Plan 125 A): an icon for
// its kind, a signed figure, a word or two, and green or red for which way
// it goes. The numbers the game used to write into sentences ("Satisfaction
// drops 3 points, and recovers over the following weeks.") are these, so a
// sentence beside them is free to be a sentence (docs/design/voice.md).

export type EffectKind =
  | 'money' | 'weekly' | 'endowment' | 'debt' | 'repairs'
  | 'satisfaction' | 'alumni' | 'quality' | 'students' | 'goodwill'
  | 'social' | 'beds' | 'dining' | 'health' | 'study' | 'beauty'
  | 'prestige' | 'teaching' | 'research' | 'athletics' | 'faculty'
  | 'trees' | 'time' | 'other';

export type EffectTone = 'gain' | 'loss' | 'plain';

export interface Effect {
  kind: EffectKind;
  // The number, already formatted and signed where it has a sign: "−$900,000", "+2".
  figure?: string;
  // What the number is of, or the whole effect where there is no number.
  words?: string;
  tone: EffectTone;
  // It wears off: a bump to satisfaction that drifts back over the weeks.
  fades?: boolean;
}

// An effect as a phrase, for a title, a log line or a screen reader:
// "−$900,000", "+2 satisfaction, for a while".
export function effectText(e: Effect): string {
  const said = [e.figure, e.words].filter(Boolean).join(' ');
  return e.fades ? `${said}, for a while` : said;
}

// Which way a signed number goes, where up is good.
export const toneOf = (v: number): EffectTone => (v > 0 ? 'gain' : v < 0 ? 'loss' : 'plain');
