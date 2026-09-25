// THE CHRONICLE's words (Plan 33, from v2's chronicle.json; V2 #53): the
// names an era may be given, by the kind of years it was, and the sentences
// that summarise it. systems/chronicle/chronicle.ts decides which apply.

export type EraKind =
  | 'founding' | 'building' | 'troubles' | 'receivership' | 'rise' | 'decline'
  | 'campaign' | 'rivalry' | 'golden' | 'quiet' | 'eventful';

export const ERA_MIN_YEARS = 4;   // shorter runs fold into a neighbour
export const ERA_MAX = 9;         // no more eras than a chronicle can hold
export const ERA_MAX_YEARS = 12;  // a longer run is split where the most happened

export const ERA_NAMES: Readonly<Record<EraKind, readonly string[]>> = {
  founding: ['The Founding', 'The First Years', 'The Charter Years'],
  building: ['The Building of {building}', 'The Scaffolding Years', 'The Years of {building}'],
  troubles: ['The Troubles', 'The Lean Years', 'The Hard Winters'],
  receivership: ['The Interim Years', 'The Years Under the CFO'],
  rise: ['The Climb', 'The Rise', 'The Ascent'],
  decline: ['The Slide', 'The Long Afternoon', 'The Slow Decline'],
  campaign: ['The {ordinal} Campaign', 'The Campaign Years'],
  rivalry: ['The {rival} Years', 'The Rivalry'],
  golden: ['The Golden Age', 'The High Tide', 'The Good Years'],
  quiet: ['The Quiet Years', 'The Middle Years', 'The Settled Years', 'The Long Peace', 'The Years of Routine', 'The Steady State'],
  eventful: ['{event} and After', 'The Years of {event}', 'After {event}'],
};

export const CHRONICLE_LINES = {
  span: 'Years {from} to {to}.',
  spanOne: 'Year {from}.',
  built: '{list} went up.',
  builtNone: 'Nothing new was built.',
  rank: 'The guide had the college {from} at the start and {to} at the end.',
  rankFlat: 'The guide had the college {to} throughout, give or take.',
  money: 'The books closed {net} over the era, and the endowment went from {from} to {to}.',
  moneyPlain: 'The books closed {net} over the era.',
  classes: '{classes} graduated.',
  troubles: 'The board climbed to {rung} and the college spent terms in distress.',
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
} as const;

export const CHRONICLE_WORDS = {
  title: 'The chronicle',
  draft: 'The chronicle in draft: the college\'s years as the historians will divide them.',
  eras: 'The eras',
  rival: 'The rival',
  rivalNone: 'No rival yet.',
  sagaNamed: '{rival} became the rival in Year {year}.',
  sagaGames: 'The teams have met {count} times: {won} won, {lost} lost.',
  sagaGame: 'The teams have met once: {won} won, {lost} lost.',
  sagaStanding: 'In the rankings the college stands {mine}, and {rival} {theirs}.',
  now: 'The historians will call these years {era}.',
  none: 'The first year has not closed yet: there is nothing for the historians to divide.',
} as const;
