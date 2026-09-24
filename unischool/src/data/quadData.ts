// Quads (state/quads.ts): the open spaces the buildings enclose. What counts
// as one, in tiles at 9m a tile, and the names the college gives them.
// Ported from v2 and rescaled: this game's halls are 5 to 7 tiles deep and
// its parcel four times the size.

// Smaller is a light well; larger is the rest of the campus. 16 tiles is a
// 36m court, 900 is a 270m green.
export const QUAD_MIN_AREA = 16;
export const QUAD_MAX_AREA = 900;
// The share of a space's edge that must be wall (paving counting at
// QUAD_PATH_WEIGHT) for it to read as enclosed.
export const QUAD_MIN_ENCLOSURE = 0.55;
export const QUAD_PATH_WEIGHT = 0.6;
// A doorway is a gap at most this wide between two solid things, through a
// wall no deeper than QUAD_DOORWAY_DEPTH: the deepest hall. A court left open
// at the corners for a path is a court with doorways, not a bay off the
// campus.
export const QUAD_DOORWAY_WIDTH = 2;
export const QUAD_DOORWAY_DEPTH = 7;
// How much a green quad beats a paved one, in quality.
export const QUAD_GREEN_WEIGHT = 0.5;

// Given in turn, each to one quad, until the player renames them.
export const QUAD_NAMES: readonly string[] = [
  'The Old Quad', 'Founders Quad', 'The Green', 'North Quad', 'South Quad', 'The Cloister',
  'Chapel Green', 'The Yard', 'Library Court', 'The Lower Green', 'Alumni Quad', 'The Long Court',
  'East Court', 'West Green', 'The Commons', 'Fellows Garden', 'Scholars Walk', 'The Close',
];

// The longest name a player can give one.
export const QUAD_NAME_MAX = 40;
