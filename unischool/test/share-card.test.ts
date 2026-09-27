// ---------------------------------------------------------------------
// The shareable report card (Plan 70J, state/reportCard.ts): one finished
// run drawn as SVG from its hall entry. It draws for a year-50 save with
// every grade band, escapes what the player named, reads for a run hung
// before the card existed, and its text, in order, is pinned here.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createInitialState } from '../src/state/actions';
import { bindScriptStream } from '../src/engine/random';
import { finalReport } from '../src/state/finalReport';
import { hallEntryFor, type HallEntry } from '../src/state/hall';
import { REPORT_GRADES } from '../src/data/reportData';
import { CARD_HEIGHT, CARD_WIDTH, cardTitle, chronicleLine, rankLine, reportCardSummary, reportCardSvg, wrap } from '../src/state/reportCard';

bindScriptStream(7071);

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

// The card's words, in the order it draws them.
const textOf = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
const wellFormed = (svg: string) =>
  svg.startsWith('<svg ') && svg.endsWith('</svg>')
  && (svg.match(/<text\b/g) ?? []).length === (svg.match(/<\/text>/g) ?? []).length
  && !/[<>&](?![a-z/!]|amp;|lt;|gt;|quot;)/.test(svg.replace(/<[^>]*>/g, ''));

console.log('report card tests');

{
  // A year-50 save, as the Final Report hangs it.
  const s = createInitialState('Blackmoor');
  s.clock.year = 50;
  const report = finalReport(s);
  const entry = hallEntryFor(s, report, 1_000);
  assert(entry.markScore === report.markScore && entry.rank === report.rank && entry.total === report.total, 'the entry keeps the score and the rank for the card');
  for (const band of REPORT_GRADES) {
    const graded: HallEntry = { ...entry, mark: band.letter, grades: entry.grades.map((g) => ({ ...g, grade: band.letter })) };
    const svg = reportCardSvg(graded, 'unischool.example');
    const words = textOf(svg);
    assert(wellFormed(svg), `grade ${band.letter}: the card is well formed`);
    assert(svg.includes(`width="${CARD_WIDTH}" height="${CARD_HEIGHT}"`), `grade ${band.letter}: at the card's size`);
    // Seven at least: the crest's initial may be the same letter.
    assert(words.filter((w) => w === band.letter).length >= 7, `grade ${band.letter}: the mark and all six grades are drawn`);
    assert(words.includes(entry.college) && words.includes(rankLine(entry)), `grade ${band.letter}: with the name and the rank`);
    assert(svg.includes(entry.colors.primary) && svg.includes(entry.colors.secondary), `grade ${band.letter}: in the college's colors`);
  }
  const summary = reportCardSummary(entry, 'https://unischool.example');
  assert(summary.startsWith(`${entry.college} — ${entry.mark} · ${Math.round(report.markScore)}, #${report.rank} of ${report.total} after fifty years.`), `the summary line (${summary})`);
  assert(summary.endsWith('UniSchool https://unischool.example') && !summary.includes('\n'), 'one line, with the site');
}

{
  // The text, pinned: a fixed entry, not one the game grades, so the
  // snapshot moves only when the card does.
  const entry: HallEntry = {
    id: 'x', college: 'Blackmoor & Vale College', name: 'Blackmoor & Vale', suffix: 'College', vernacular: 'collegiate-gothic' as HallEntry['vernacular'],
    colors: { primary: '#123456', secondary: '#abcdef' } as HallEntry['colors'],
    title: 'A research powerhouse that never quite learned to teach, and a stadium that outgrew the library',
    mark: 'B',
    grades: [
      { label: 'Academics', grade: 'A' }, { label: 'Research', grade: 'A' }, { label: 'Experience', grade: 'B' },
      { label: 'Athletics', grade: 'C' }, { label: 'Access', grade: 'D' }, { label: 'Finance', grade: 'F' },
    ],
    eras: [
      { name: 'The founding', from: 1, to: 10, lines: ['Four halls on a hill.'] },
      { name: 'The long climb', from: 11, to: 50, lines: ['The rankings came round.', 'By the fiftieth year, <nobody> asked where Blackmoor was.'] },
    ],
    year: 50, finishedAt: 0, markScore: 67.6, rank: 4, total: 100,
  };
  const svg = reportCardSvg(entry, 'unischool.example');
  assert(wellFormed(svg), 'the pinned card is well formed, with its ampersand and angle brackets escaped');
  const expected = [
    'B',
    'B',
    'The grade · 68',
    '#4 of 100 after fifty years',
    'Blackmoor &amp; Vale College',
    'A research powerhouse that never quite learned to teach,',
    'and a stadium that outgrew the library',
    'A', 'Academics', 'A', 'Research', 'B', 'Experience',
    'C', 'Athletics', 'D', 'Access', 'F', 'Finance',
    '“By the fiftieth year, &lt;nobody&gt; asked where Blackmoor was.”',
    'UniSchool · unischool.example',
  ];
  const got = textOf(svg);
  assert(JSON.stringify(got) === JSON.stringify(expected), `the card's text, in order:\n    ${got.join('\n    ')}`);
  assert(chronicleLine(entry) === entry.eras[1].lines[1], 'the chronicle line is the last era\'s last');
  assert(cardTitle({ ...entry, title: 'Blackmoor & Vale College: a teaching college' }) === 'A teaching college', 'the title drops the name the card already carries');

  // A run hung before the card: no score, no rank.
  const legacy: HallEntry = { ...entry, markScore: undefined, rank: undefined, total: undefined, year: 50 };
  const old = textOf(reportCardSvg(legacy, ''));
  assert(!old.some((w) => w.startsWith('The grade ·')) && old.includes('After fifty years'), 'an older entry draws without the score and the rank');
  assert(old[old.length - 1] === 'UniSchool', 'and without a site, the footer is the name alone');
  assert(reportCardSummary(legacy, 'site') === 'Blackmoor & Vale College — B after fifty years. UniSchool site', 'and its summary too');
  assert(chronicleLine({ ...entry, eras: [{ name: 'x', from: 1, to: 50, lines: [] }] }) === '', 'no chronicle, no quote');
}

{
  const lines = wrap('one two three four five six seven eight', 9, 2);
  assert(lines.length === 2 && lines[0] === 'one two' && lines[1].endsWith('…'), `wrap cuts at the last line with an ellipsis (${lines.join(' / ')})`);
  assert(wrap('short', 20, 2).join('|') === 'short', 'and leaves a short line alone');
  assert(wrap('', 20, 2).length === 0, 'and an empty one empty');
}

if (failures === 0) {
  console.log(`  ✓ all ${checks} checks passed`);
  process.exit(0);
} else {
  console.error(`\n${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
