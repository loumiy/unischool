// THE CHRONICLE's words (Plan 33, from v2's chronicle.json; V2 #53): the
// names an era may be given, by the kind of years it was, and the sentences
// that summarize it. systems/chronicle/chronicle.ts decides which apply.

// Plan 80C: an era is named for what the college did, not for its rank. A
// year's kind is its largest new thing, in the order of ERA_PRIORITY; rank
// names an era only at a real turn (reaching first, entering the top ten, a
// fall), and 'eventful' is a year of nothing new that answered one of the
// board's letters, and is named for it.
export type EraKind =
  | 'founding' | 'receivership' | 'troubles' | 'first' | 'school' | 'graduate' | 'topTen'
  | 'project' | 'titles' | 'prizes' | 'campaign' | 'fall' | 'building' | 'festival' | 'quiet' | 'eventful';

// Largest first: a year is the first of these it has, and an era the first
// of its years'.
export const ERA_PRIORITY: readonly EraKind[] = [
  'founding', 'receivership', 'troubles', 'first', 'school', 'graduate', 'topTen',
  'project', 'titles', 'prizes', 'campaign', 'fall', 'building', 'festival', 'eventful', 'quiet',
];

export const ERA_MIN_YEARS = 4;   // shorter runs fold into a neighbor
export const ERA_MAX = 9;         // no more eras than a chronicle can hold
export const ERA_MAX_YEARS = 12;  // a longer run is split where the most happened
export const BUILDING_BOOM = 2;   // buildings finished in a year that make it a building year
export const RANK_FALL = 5;       // places lost in three years that are a fall,
export const RANK_FALL_WITHIN = 25; // for a college that was in the top this many

// {school} is a school's subject ("Science"); {graduate} a graduate
// program's name and {degree} its degree; {project} a capital project or a
// grand landmark, without its "The"; {sport} the sport of a title.
export const ERA_NAMES: Readonly<Record<EraKind | 'schools', readonly string[]>> = {
  founding: ['The Founding', 'The First Years', 'The Charter Years'],
  receivership: ['The Interim Years', 'The Years Under the CFO'],
  troubles: ['The Hard Years', 'The Lean Years', 'The Hard Winters'],
  first: ['The Top of the Guide', 'First in the Guide'],
  school: ['The Years of the School of {school}', 'The Founding of the School of {school}'],
  // An era that founded more than one school.
  schools: ['The Years of the New Schools', 'The Schools of {school} and {school2}'],
  graduate: ['The First {degree}s', 'The Years of the {graduate}'],
  topTen: ['Into the Top Ten', 'The Top-Ten Years'],
  project: ['The {project} Years', 'The Building of the {project}'],
  titles: ['The Championship Years', 'The {sport} Years', 'The Title Years'],
  prizes: ['The Prize Years', 'The Laureate Years'],
  campaign: ['The Campaign Years', 'The Years of Asking', 'The {ordinal} Campaign'],
  fall: ['The Slide', 'The Fall', 'The Long Afternoon'],
  building: ['The Building of {building}', 'The Years of {building}', 'The Scaffolding Years', 'The Building Boom'],
  // A year of a headline gala (Plan 85H, the spring festival).
  festival: ['The Gala Years', 'The Festival Years', 'The Years of the Downtown'],
  quiet: ['The Quiet Years', 'The Middle Years', 'The Settled Years', 'The Long Peace', 'The Years of Routine', 'The Steady State'],
  eventful: ['{event} and After', 'The Years of {event}', 'After {event}'],
};

export const CHRONICLE_LINES = {
  span: 'Years {from} to {to}.',
  spanOne: 'Year {from}.',
  built: '{list} went up.',
  builtNone: 'Nothing new was built.',
  rank: 'The guide had the college {from} at the start and {to} at the end.',
  rankFlat: 'The guide had the college {to} at the end, about where it started.',
  money: 'Cash on hand {net} over the era, and the endowment went from {from} to {to}.',
  moneyPlain: 'Cash on hand {net} over the era.',
  classes: '{classes} graduated.',
  troubles: 'The college fell as far as {rung} on the board\'s scale, and spent terms in distress.',
  titles: 'The teams won {count} titles.',
  title: 'The teams won a title.',
  tags: 'The guidebooks started calling it {tags}.',
  rival: '{rival} became the rival.',
  kept: 'It kept its promise: {list}.',
  keptMany: 'It kept its promises: {list}.',
  missed: 'It missed its promise: {list}.',
  missedMany: 'It missed its promises: {list}.',
  weathered: 'It weathered {list}.',
  firsts: 'Firsts: {list}.',
  founded: 'It founded {list}.',
  graduate: '{list} taught its full degree for the first time.',
  graduates: '{list} taught their full degrees for the first time.',
  prize: 'Its faculty won a research prize.',
  prizes: 'Its faculty won {count} research prizes.',
  // The year the college chose its specialization (Plan 85D).
  specialized: 'In Year {year} it chose to specialize in {pillar}: {name}.',
  // The spring festival (Plan 85H).
  festivalHeld: 'It held the spring festival in {count} of these years{galas}.',
  festivalHeldOne: 'It held the spring festival once{galas}.',
  festivalGalas: ', {galas} of them as a headline gala',
  festivalGala: ', once as a headline gala',
  festivalGalaOnly: ', as a headline gala',
  festivalSkipped: 'The town went without its festival in {years}.',
} as const;

export const CHRONICLE_WORDS = {
  title: 'The chronicle',
  draft: 'The chronicle in draft: the college\'s years as the historians will divide them.',
  eras: 'The eras',
  rival: 'The rival',
  rivalNone: 'No rival yet.',
  sagaNamed: '{rival} became the rival in Year {year}.',
  sagaGames: 'The {sport} teams have met {count} times: {won} won, {lost} lost.',
  sagaGame: 'The {sport} teams have met once: {won} won, {lost} lost.',
  sagaStanding: 'In the guide the college stands {mine}, and {rival} {theirs}.',
  now: 'The historians will call these years {era}.',
  none: 'The first year has not closed yet: there is nothing for the historians to divide.',
} as const;
