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
// Flavour (events, names, course descriptions) is measured
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

// ---------------------------------------------------------------------
// The voice's counts (Plan 125 F, docs/design/voice.md): habits that are
// fine once and a giveaway when every line has them. Each is counted over
// the screens it names and held to voice-baseline.json the same way: a
// count may fall, and the test fails when one rises.
//
//   everywhere      an em dash; British usage the spelling list misses
//   the events      "would like"; a trailing ", which …" aside; a letter
//                   that opens "The … has …"
//   the courses     a description built on a list of three or more; "real"
//                   as an intensifier; the most lines that open on one verb
// ---------------------------------------------------------------------

export type VoiceScope = 'all' | 'events' | 'courses';
export interface VoiceRule {
  id: string;
  scope: VoiceScope;
  says: string;
  test: (text: string) => boolean;
}

export const EVENT_SCREEN = 'Events (catalogue)';
export const COURSE_SCREEN = 'Course descriptions';
// Screens nobody reads as prose: name pools, the developer's panel, audio labels.
export const UNREAD_SCREENS: ReadonlySet<string> = new Set(['Names (people, rivals, mascots)', 'Debug panel (developer only)', 'Audio (not read)']);

// Usage, not spelling (strings.ts's BRITISH list has the spellings): a
// collective noun with a plural verb, and words an American college does
// not use.
const BRITISH_USAGE = /\b(?:Grounds|Facilities|The press|the press|The team|the team|The staff|the staff) (?:have|are|were)\b|\bleavers?\b|\bcosted\b|\b(?:two|three|four|five)-yearly\b|\bporters?\b|\blecture theat(?:er|re)s?\b|\bFire Officer\b|\bat the weekend\b|\bin future\b|\bfortnight/;

export const VOICE_RULES: readonly VoiceRule[] = [
  { id: 'em dash', scope: 'all', says: 'a period, a comma or brackets', test: (t) => /\u2014/.test(t) },
  { id: 'British usage', scope: 'all', says: 'the American word, and a singular verb for an office', test: (t) => BRITISH_USAGE.test(blank(t)) },
  { id: 'events: "would like"', scope: 'events', says: 'say what they want', test: (t) => /\bwould like\b/i.test(t) },
  { id: 'events: trailing ", which"', scope: 'events', says: 'end the sentence, or make the aside its own', test: (t) => /, which\b/.test(t) },
  { id: 'events: opens "The … has"', scope: 'events', says: 'start somewhere else', test: (t) => words(t) >= 12 && /^The\b[^.?!]*?\b(?:has|have)\b/.test(sentences(t)[0] ?? '') },
  { id: 'courses: built on a list', scope: 'courses', says: 'say the one thing the course is about', test: (t) => /\w,\s[^.]*?,\s(?:and|or)\s/.test(t) || /\w,\s[^,.]+\s(?:and|or)\s[^,.]+(?:,|\.)/.test(t) && (t.match(/,/g) ?? []).length >= 2 },
  { id: 'courses: "real"', scope: 'courses', says: 'drop it', test: (t) => /\breal\b/i.test(t) },
];

const inScope = (scope: VoiceScope, screen: string) => (scope === 'events' ? screen === EVENT_SCREEN
  : scope === 'courses' ? screen === COURSE_SCREEN : !UNREAD_SCREENS.has(screen));

// How many course descriptions open on the most used verb.
export const TOP_VERB = 'courses: most lines on one opening verb';

export function voiceTotals(rows: ReadonlyArray<{ screen: string; text: string }>): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(VOICE_RULES.map((r) => [r.id, 0]));
  const verbs = new Map<string, number>();
  for (const r of rows) {
    for (const rule of VOICE_RULES) if (inScope(rule.scope, r.screen) && rule.test(r.text)) totals[rule.id] += 1;
    if (r.screen === COURSE_SCREEN) {
      const verb = r.text.match(/^[A-Z][a-z]+/)?.[0];
      if (verb) verbs.set(verb, (verbs.get(verb) ?? 0) + 1);
    }
  }
  totals[TOP_VERB] = Math.max(0, ...verbs.values());
  return totals;
}

export function voiceHits(text: string, scope: VoiceScope): VoiceRule[] {
  return VOICE_RULES.filter((r) => r.scope === scope && r.test(text));
}
