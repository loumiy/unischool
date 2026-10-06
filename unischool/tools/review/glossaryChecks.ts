// ---------------------------------------------------------------------
// The glossary's last mile (Plan 95J, the second review's B2-5): the words
// Plan 47's glossary settled that the newer screens had drifted from, as
// checks the string table runs on every player-facing string, so they stay
// caught. Each hit is a defect, not a judgment: the glossary names the word.
//
//   - a bare "slots", or a numbered "slot 2": the word means three things,
//     so it is always "course slot" or "program slot" (Plan 76J);
//   - "default" for an unanswered matter: it is "left unanswered";
//   - "Spring Term" or "Fall Term": the clock's terms are "Spring term" and
//     "Fall term".
//
// Founders Hall's own "slot", which holds a program or an office, is said
// in the singular ("its slot", "a slot it leaves") and is not caught.
//
// Kept apart from strings.ts so a test can read the rules without the
// TypeScript parser. Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

export interface GlossaryRule {
  word: string;     // what the check is called in the report
  says: string;     // what the glossary says instead
  test: (text: string) => string | null;   // the matched words, or null
}

// The text with every {…} placeholder blanked, as strings.ts's bare().
const blank = (text: string) => text.replace(/\{[^}]*\}?/g, ' ').replace(/\s+/g, ' ').trim();
const first = (re: RegExp) => (text: string) => text.match(re)?.[0] ?? null;

export const GLOSSARY_RULES: readonly GlossaryRule[] = [
  {
    word: 'bare "slots"',
    says: '"course slots" or "program slots"',
    test: (text) => first(/\b(?<!(?:course|program) )slots\b/i)(blank(text)),
  },
  {
    // A numbered slot is always a hall's: "program slot 2". Read on the
    // raw text, since the number is a placeholder.
    word: 'numbered "slot"',
    says: '"program slot {n}"',
    test: (text) => first(/\b(?<!(?:course|program) )slot (?:\{|\d)/i)(text),
  },
  {
    word: '"default"',
    says: '"left unanswered"',
    test: (text) => first(/\bdefault(?:s|ed)?\b/i)(blank(text)),
  },
  {
    word: '"Spring Term" or "Fall Term"',
    says: '"Spring term", "Fall term"',
    test: (text) => first(/\b(?:Spring|Fall) Term\b/)(blank(text)),
  },
];

// Every rule a string breaks, with the words that broke it.
export function glossaryHits(text: string): Array<{ rule: GlossaryRule; match: string }> {
  const out: Array<{ rule: GlossaryRule; match: string }> = [];
  for (const rule of GLOSSARY_RULES) {
    const match = rule.test(text);
    if (match !== null) out.push({ rule, match });
  }
  return out;
}
