import { gradeFor } from '../data/courseQuality';

// A letter grade circled in pen (Plan 90D): a hand-drawn ring in the
// grade's ink (--grade-a … --grade-f, which follow the color-vision-safe
// set), a little off the square, with the letter inside. The ring and its
// tilt are seeded from the letter, so a B always looks like every other B.
// The label reads "grade B", so the letter never reads as part of a count
// beside it (Plan 78F). The run's report card marks keep the letters;
// teaching and course quality are numbers (ScoreMark, below).

// Open loops in a 34-unit box, each overrunning its start like a quick pen
// stroke.
const RINGS = [
  'M27 9c-4-5-14-6-19-1-5 5-4 15 2 19 6 4 15 2 18-4 2-5 0-10-4-13',
  'M28 10c-4-6-15-7-20-1-5 5-3 15 3 18 7 4 16 1 18-6 1-4-1-8-4-10',
  'M24 6c-6-3-15-1-18 6-3 7 1 15 9 16 8 1 14-5 13-12-1-5-5-8-10-9',
];
const TILTS = [-8, 5, -3, 7, -5];

function seed(letter: string): number {
  let h = 7;
  for (const ch of letter) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h;
}

export default function GradeMark({ grade, title, size = 'sm' }: { grade: string; title?: string; size?: 'sm' | 'lg' }) {
  const h = seed(grade);
  return (
    <span
      className={`grade-mark ${size} mark-${grade.toLowerCase()}`}
      role="img"
      aria-label={`grade ${grade}`}
      title={title}
      style={{ ['--mark-tilt' as string]: `${TILTS[h % TILTS.length]}deg` }}
    >
      <svg viewBox="0 0 34 34" aria-hidden="true"><path d={RINGS[h % RINGS.length]} /></svg>
      <span className="grade-mark-letter" aria-hidden="true">{grade}</span>
    </span>
  );
}

// A score out of 100 circled in pen (Plan 104G): teaching, research and a
// course's or program's quality are numbers, not letters, so a 50 among
// 40s reads as the good hire it is. The ring keeps the band's ink and its
// seed (courseQuality.ts's gradeFor: 78, 62, 44 and 30), so the colour steps
// are the letters' own; only the words change. `plain` drops the band's
// ink, for a number that should not carry a verdict (a candidate's teaching
// is read against the college's median, FacultyTile.tsx).
export function ScoreMark({ score, title, size = 'sm', plain = false }: { score: number; title?: string; size?: 'sm' | 'lg'; plain?: boolean }) {
  const band = gradeFor(score);
  const h = seed(band);
  const n = Math.round(score);
  return (
    <span
      className={`grade-mark score ${size} ${plain ? 'mark-plain' : `mark-${band.toLowerCase()}`}`}
      role="img"
      aria-label={`${n} out of 100`}
      title={title}
      style={{ ['--mark-tilt' as string]: `${TILTS[h % TILTS.length]}deg` }}
    >
      <svg viewBox="0 0 34 34" aria-hidden="true"><path d={RINGS[h % RINGS.length]} /></svg>
      <span className="grade-mark-letter" aria-hidden="true">{n}</span>
    </span>
  );
}
