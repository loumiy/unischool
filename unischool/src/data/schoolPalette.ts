// ---------------------------------------------------------------------
// The school palette: one hue and one motif per degree-granting school, used
// wherever a program is drawn as belonging to a school before the school has
// a name (hall panel tiles, Curriculum rows). Mid-saturation hues that sit
// on parchment and stay distinct at row height; the motif keeps the grouping
// legible for colour-blind players and on tiles too small for a swatch. A
// school's name appears only once it is founded (docs/design/curriculum.md).
// ---------------------------------------------------------------------

export interface SchoolMark {
  hue: string;   // the school's colour, as a CSS colour
  motif: string; // one glyph, drawn beside or instead of the hue
}

const SCHOOL_MARKS: Record<string, SchoolMark> = {
  'Business': { hue: '#8b3a3a', motif: '◆' },
  'Engineering': { hue: '#a0522d', motif: '⚙' },
  'Arts & Media': { hue: '#7b4b7a', motif: '✦' },
  'Social Sciences & Humanities': { hue: '#5b7a3a', motif: '❧' },
  'Science': { hue: '#2f7a7a', motif: '⚗' },
  'Health Science': { hue: '#b5583f', motif: '✚' },
  'Computer Science': { hue: '#4a6a9a', motif: '▣' },
};

// Anything the table does not know: the ordinary brass, so an unmarked
// thing reads as unmarked rather than as a school.
const NO_MARK: SchoolMark = { hue: '#8a7a4a', motif: '·' };

export function schoolMark(school: string): SchoolMark {
  return SCHOOL_MARKS[school] ?? NO_MARK;
}
