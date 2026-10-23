// ---------------------------------------------------------------------
// Plain words (Plan 111 PR G): the text review's habits as checks the
// string table runs on the screens that instruct the player, so the
// rewrite can be measured and stays done
// (docs/reviews/2026-10-text-review.md).
//
//   - a colon in the middle of a sentence ("X: y …"), not after a label;
//   - a semicolon;
//   - a sentence over 25 words;
//   - two possessives in one sentence ("its hall's panel");
//   - a see-saw ("rather than", "not A, but B");
//   - a passive with nobody doing it ("is commissioned there").
//
// Unlike the glossary's checks these are judgments, not defects: a colon
// can be right. So they are counted, not forbidden, and the test fails
// only when a count rises past the committed baseline
// (plain-baseline.json, test/text-check.test.ts).
//
// Kept apart from strings.ts so a test can read the rules without the
// TypeScript parser. Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

export interface PlainRule {
  id: string;
  says: string;
  test: (text: string) => string | null;
}

// The text with every {…} placeholder as a word, so a template counts.
const blank = (text: string) => text.replace(/\{[^}]*\}?/g, 'X').replace(/\s+/g, ' ').trim();
const sentences = (text: string) => blank(text).split(/(?<=[.!?])\s+(?=[A-Z0-9"'‘“])/);
const words = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

export const LONG_SENTENCE = 25;

export const PLAIN_RULES: readonly PlainRule[] = [
  {
    id: 'mid-sentence colon',
    says: 'end the sentence; keep a colon for a list or a label',
    // A colon after at least three words, followed by a lower-case word: a
    // label ("Cost: $2M", "Tuition: the slider …") is one or two words.
    test: (text) => {
      for (const s of sentences(text)) {
        const m = s.match(/^(\S+(?:\s+\S+){2,}?):\s+([a-z]\S*)/);
        if (m) return `${m[1].split(/\s+/).slice(-2).join(' ')}: ${m[2]}`;
      }
      return null;
    },
  },
  {
    id: 'semicolon',
    says: 'two sentences',
    test: (text) => (/;\s/.test(blank(text)) ? ';' : null),
  },
  {
    id: 'long sentence',
    says: `under ${LONG_SENTENCE} words`,
    test: (text) => {
      const long = sentences(text).find((s) => words(s) > LONG_SENTENCE);
      return long ? `${words(long)} words` : null;
    },
  },
  {
    id: 'possessive chain',
    says: 'name the thing, or restructure',
    test: (text) => {
      const s = sentences(text).find((x) => (x.match(/\w['’]s\b/g) ?? []).filter((m) => !/^(it|that|there|what|who|he|she|here|let)['’]s$/i.test(m)).length >= 2);
      return s ? (s.match(/\w+['’]s\b[^.]*\w+['’]s\b/)?.[0].slice(0, 40) ?? 'two possessives') : null;
    },
  },
  {
    id: 'see-saw',
    says: 'say the one thing',
    test: (text) => blank(text).match(/\brather than\b|,\s*not\s+[a-z]+[^.]*?,\s*but\b|\bnot the \w+,\s*not the\b/i)?.[0] ?? null,
  },
  {
    id: 'passive, no one doing it',
    says: 'say who does it',
    test: (text) => {
      for (const s of sentences(text)) {
        const m = s.match(/\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+ed)\b(?![^.]*\bby\b)/);
        if (m && !/^(?:need|interest|tired|based|located|pleased|worried|closed|open|finished|done|limited|crowded|staffed|unstaffed|qualified|scheduled|required|allowed|expected|supposed|used|named|called|focused|specialized|established|founded|listed|locked|unlocked|paused|frozen|filled)$/.test(m[1])) return m[0];
      }
      return null;
    },
  },
];

// The screens that tell the player what to do (strings.ts's screen names).
// Flavour (events, promises, names, course descriptions) is measured
// apart: its rules are looser.
export const INSTRUCTION_SCREENS: ReadonlySet<string> = new Set([
  'Opening walkthrough', 'Objectives (chapters, their help, the Guide)', 'Next-step line', 'Board letters',
  'Ladder and milestone letters', 'Events (decision) and letters', 'Summer review', 'Admissions page (summer)',
  'Admissions', 'Help hints', 'Campus map', 'Build menu', 'Building panel', 'Faculty tab', 'Administration',
  'Students tab', 'Treasury tab', 'History tab', 'Standing (History tab)', 'Athletics tab', 'Curriculum tab',
  'Research tab', 'Inbox', 'Founders Hall offices', 'Modals (summer, events, letters)', 'Specialization (choice and notice)',
  'Specialization programs', 'Student demands', 'Alumni and campaigns', 'Settings',
]);

// Every rule a string breaks, with the words that broke it.
export function plainHits(text: string): Array<{ rule: PlainRule; match: string }> {
  const out: Array<{ rule: PlainRule; match: string }> = [];
  for (const rule of PLAIN_RULES) {
    const match = rule.test(text);
    if (match !== null) out.push({ rule, match });
  }
  return out;
}
