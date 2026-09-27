import type { HallEntry } from './hall';

// ---------------------------------------------------------------------
// The report card (Plan 70J): one finished run on a single card, drawn as
// SVG from its hall entry, so the Final Report and the Hall of Fame draw the
// same card. The browser renders it to a PNG (components/reportCardFile.ts);
// nothing is uploaded. Pure: the test snapshots its text.
//
// It holds the college's name, a crest in its colors, the report's title,
// the mark and the six grades, the final rank, and one line of the
// chronicle. The fonts are the system's, since an image cannot load the
// page's own.
// ---------------------------------------------------------------------

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const INK = '#1b2a4a';
const MUTED = '#5b6477';
const CREAM = '#fbf6ea';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Words to lines of at most `width` characters, at most `most` lines, the
// last cut with an ellipsis if the words ran out of room.
export function wrap(text: string, width: number, most: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= most) return lines;
  const kept = lines.slice(0, most);
  kept[most - 1] = `${kept[most - 1].replace(/[\s,;:.]+$/, '')}…`;
  return kept;
}

// The chronicle's last word on the run: the final line of its last era.
export function chronicleLine(entry: HallEntry): string {
  for (let i = entry.eras.length - 1; i >= 0; i -= 1) {
    const lines = entry.eras[i].lines;
    if (lines.length > 0) return lines[lines.length - 1];
  }
  return '';
}

export function rankLine(entry: HallEntry): string {
  const years = entry.year >= 50 ? 'fifty years' : `${entry.year} years`;
  return entry.rank !== undefined ? `#${entry.rank} of ${entry.total ?? 100} after ${years}` : `After ${years}`;
}

// The report's title under the college's name, without the name again
// ("Blackmoor College: a teaching college…" reads "A teaching college…").
export function cardTitle(entry: HallEntry): string {
  const lead = `${entry.college}: `;
  if (!entry.title.startsWith(lead)) return entry.title;
  const rest = entry.title.slice(lead.length);
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

// The one line Copy summary puts on the clipboard.
export function reportCardSummary(entry: HallEntry, site: string): string {
  const score = entry.markScore !== undefined ? ` · ${Math.round(entry.markScore)}` : '';
  const rank = entry.rank !== undefined ? `, #${entry.rank} of ${entry.total ?? 100}` : '';
  const years = entry.year >= 50 ? 'fifty years' : `${entry.year} years`;
  return `${entry.college} — ${entry.mark}${score}${rank} after ${years}. UniSchool ${site}`.trim();
}

// A shield in the school's two colors, with the name's initial.
function crest(entry: HallEntry, x: number, y: number): string {
  const { primary, secondary } = entry.colors;
  const initial = escape((entry.name.trim()[0] ?? 'U').toUpperCase());
  const w = 150;
  const h = 180;
  const shield = `M${x} ${y} h${w} v${h * 0.55} q0 ${h * 0.35} -${w / 2} ${h * 0.45} q-${w / 2} -${h * 0.1} -${w / 2} -${h * 0.45} z`;
  return [
    `<path d="${shield}" fill="${primary}" stroke="${CREAM}" stroke-width="6"/>`,
    `<path d="M${x} ${y + h * 0.38} L${x + w / 2} ${y + h * 0.2} L${x + w} ${y + h * 0.38} v22 L${x + w / 2} ${y + h * 0.2 + 22} L${x} ${y + h * 0.38 + 22} z" fill="${secondary}"/>`,
    `<text x="${x + w / 2}" y="${y + h * 0.78}" text-anchor="middle" font-family="${SERIF}" font-size="72" font-weight="700" fill="${CREAM}">${initial}</text>`,
  ].join('');
}

export function reportCardSvg(entry: HallEntry, site: string): string {
  const { primary, secondary } = entry.colors;
  const band = 300;
  const left = band + 60;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">`);
  parts.push(`<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${CREAM}"/>`);
  parts.push(`<rect width="${band}" height="${CARD_HEIGHT}" fill="${primary}"/>`);
  parts.push(`<rect x="${band}" width="10" height="${CARD_HEIGHT}" fill="${secondary}"/>`);
  parts.push(crest(entry, (band - 150) / 2, 70));
  // The mark, big, under the crest.
  parts.push(`<text x="${band / 2}" y="420" text-anchor="middle" font-family="${SERIF}" font-size="120" font-weight="700" fill="${CREAM}">${escape(entry.mark)}</text>`);
  if (entry.markScore !== undefined) {
    parts.push(`<text x="${band / 2}" y="465" text-anchor="middle" font-family="${SANS}" font-size="26" fill="${CREAM}">The grade · ${Math.round(entry.markScore)}</text>`);
  }
  parts.push(`<text x="${band / 2}" y="560" text-anchor="middle" font-family="${SANS}" font-size="22" font-weight="700" fill="${CREAM}">${escape(rankLine(entry))}</text>`);

  // The name and the title.
  parts.push(`<text x="${left}" y="88" font-family="${SERIF}" font-size="48" font-weight="700" fill="${INK}">${escape(entry.college)}</text>`);
  wrap(cardTitle(entry), 56, 2).forEach((line, i) => {
    parts.push(`<text x="${left}" y="${138 + i * 34}" font-family="${SERIF}" font-size="28" font-style="italic" fill="${MUTED}">${escape(line)}</text>`);
  });

  // The six grades, two rows of three.
  entry.grades.slice(0, 6).forEach((g, i) => {
    const x = left + (i % 3) * 270;
    const y = 250 + Math.floor(i / 3) * 110;
    parts.push(`<rect x="${x}" y="${y}" width="72" height="72" rx="14" fill="${secondary}" stroke="${INK}" stroke-width="3"/>`);
    parts.push(`<text x="${x + 36}" y="${y + 50}" text-anchor="middle" font-family="${SERIF}" font-size="40" font-weight="700" fill="${INK}">${escape(g.grade)}</text>`);
    parts.push(`<text x="${x + 86}" y="${y + 43}" font-family="${SANS}" font-size="19" font-weight="700" fill="${INK}">${escape(g.label)}</text>`);
  });

  // One line of the chronicle.
  const said = chronicleLine(entry);
  if (said) {
    wrap(`“${said}”`, 70, 2).forEach((line, i) => {
      parts.push(`<text x="${left}" y="${500 + i * 30}" font-family="${SERIF}" font-size="23" font-style="italic" fill="${INK}">${escape(line)}</text>`);
    });
  }
  parts.push(`<text x="${left}" y="596" font-family="${SANS}" font-size="20" font-weight="700" fill="${MUTED}">UniSchool${site ? ` · ${escape(site)}` : ''}</text>`);
  parts.push('</svg>');
  return parts.join('');
}
