// ---------------------------------------------------------------------
// The briefings' numbers come from the game (Plan 114 PR A, the third
// review's C2-2): ten rules in the chapters and the walkthrough stated a
// figure the code no longer had. Every string the player reads in
// data/chapterData.ts and data/openingData.ts is parsed here, and a figure
// typed into its text fails unless it is on the allow-list below with its
// reason. A figure built from a constant sits inside `${}` and is never
// seen. So a retune can't leave a stale number in a briefing.
//
// Digits count anywhere. Number words count only next to a unit ("two
// weeks", "half a year"): "one idea" and "one at a time" are plain English.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

console.log('briefing numbers tests');
let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const FILES = ['src/data/chapterData.ts', 'src/data/openingData.ts'];

// Figures that are names, not quantities, each with its reason.
const ALLOWED: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /\bPress [1-4]\b/, why: 'a key on the keyboard' },
  { pattern: /\b[1248]×/, why: "a speed's own label (1×, 2×, 4×, 8×)" },
  { pattern: /\b(?:all|its) four years\b/, why: "a degree's four class years, freshman to senior" },
  { pattern: /\bout of 100\b|\/100\b/, why: "a score's scale" },
  { pattern: /\b(?:first|second|third|fourth)\b/, why: 'an order, not a count' },
];

const NUMBER_WORDS = '(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|a hundred|half|a dozen)';
const UNITS = '(?:weeks?|years?|courses?|students?|beds?|places?|percent|terms?|months?|days?|minutes?|hours?|steps?)';
const WORD_FIGURE = new RegExp(`\\b${NUMBER_WORDS}\\s+(?:an?\\s+)?${UNITS}\\b`, 'i');

// The text of a template outside its ${}: each literal part, joined by a
// marker that can't match a figure.
function templateText(node: ts.TemplateExpression): string {
  return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ⟨…⟩ ');
}

// Property names and ids are not text: a string with no space is skipped.
function readsAsText(text: string): boolean {
  return /\s/.test(text.trim()) && /[A-Za-z]/.test(text);
}

// A string in a key's place ({ 'run-at-double': … }) names, it doesn't say.
function isKey(node: ts.Node): boolean {
  const p = node.parent;
  return (ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p)) && p.name === node;
}

function figuresIn(text: string): string[] {
  let rest = text;
  for (const { pattern } of ALLOWED) rest = rest.replace(new RegExp(pattern.source, 'g'), ' ');
  const hits = [...rest.matchAll(/\d[\d,.]*/g)].map((m) => m[0]);
  const word = rest.match(WORD_FIGURE);
  if (word) hits.push(word[0]);
  return hits;
}

for (const file of FILES) {
  const path = join(process.cwd(), file);
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let strings = 0;
  const visit = (node: ts.Node) => {
    let text: string | null = null;
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isKey(node) && !ts.isImportDeclaration(node.parent)) text = node.text;
    else if (ts.isTemplateExpression(node)) text = templateText(node);
    if (text !== null && readsAsText(text)) {
      strings += 1;
      const hits = figuresIn(text);
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      assert(hits.length === 0, `${file}:${line} types ${hits.map((h) => `"${h}"`).join(', ')} into "${text.slice(0, 90)}${text.length > 90 ? '…' : ''}"`);
    }
    if (ts.isTemplateExpression(node)) {
      for (const span of node.templateSpans) visit(span.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert(strings > 20, `${file} has its text read (${strings} strings)`);
}

// The check catches what it should, and lets through what it should.
{
  assert(figuresIn('It costs two weeks of running costs.').length === 1, 'a number word before a unit is a figure');
  assert(figuresIn('finds someone within half a year').length === 1, '"half a year" is a figure');
  assert(figuresIn('At week 52 the clock stops.').length === 1, 'a digit is a figure');
  assert(figuresIn('Press 2 to run at double speed.').length === 0, 'a key is not');
  assert(figuresIn('One idea at a time, one band up.').length === 0, '"one" is not');
  assert(figuresIn('The walkthrough takes about five minutes.').length === 1 && figuresIn('each takes ten to fifteen weeks').length === 1, 'nor a duration in words');
}

if (failures > 0) {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`  ✓ all ${checks} checks passed`);
