// Identity tags (Plan 31, ported from v2's identity-tags.json): what the
// guidebooks say about the college, earned and shed from how it is run
// (systems/identity/tags.ts). Each shapes the applicant pool (`size`, a
// share of it; `quality`, points on the incoming class) and has small teeth
// on one lever. v2's "yield" teeth are pool size here: everyone admitted
// enrolls in this game.

export type TagLever = 'giving' | 'attrition' | 'studentCost' | 'athletics' | 'beauty' | 'satisfaction' | 'pool';

export interface TagDef {
  id: string;
  name: string;
  blurb: string;
  why: string;
  size: number;
  quality: number;
  teeth: { lever: TagLever; amount: number; line: string };
}

export const TAGS: readonly TagDef[] = [
  { id: 'research-powerhouse', name: 'Research Powerhouse', blurb: 'The papers come out faster than the undergraduates.', why: 'Your research is strong, and nearly as strong as your teaching.', size: 0.05, quality: 3, teeth: { lever: 'giving', amount: 0.1, line: 'Gifts follow the papers. Alumni give a tenth more each year.' } },
  { id: 'teaching-college', name: 'Teaching College', blurb: 'Small classes, and professors who know your name.', why: 'Your teaching is strong, and your research lags behind it.', size: 0, quality: 2, teeth: { lever: 'attrition', amount: -0.01, line: 'Students who are known by name stay. When they\'re unhappy, a point fewer leave each year.' } },
  { id: 'party-school', name: 'Party School', blurb: 'Thursday is the weekend.', why: 'Your students are happy, your intake isn\'t the strongest, and Greek life is busy.', size: 0.1, quality: -4, teeth: { lever: 'studentCost', amount: 400, line: 'You pay for the parties. Discipline and student life cost $400 more a student each year.' } },
  { id: 'jock-school', name: 'Jock School', blurb: 'The stadium is the biggest building on campus, and everyone knows the fight song.', why: 'Your teams and their venues are what you\'re known for.', size: 0.08, quality: -2, teeth: { lever: 'athletics', amount: 6, line: 'Recruits want to play here. Every team is six points stronger.' } },
  { id: 'artsy', name: 'Artsy', blurb: 'Studios open all night and a gallery in every stairwell.', why: 'Your arts programs, and the clubs that make music, theater and pictures.', size: -0.03, quality: 1, teeth: { lever: 'beauty', amount: 5, line: 'Studios and galleries everywhere. Campus beauty is five points higher.' } },
  { id: 'commuter', name: 'Commuter', blurb: 'Most of the students go home at five.', why: 'Too few beds, so most of your students go home at night.', size: 0.05, quality: -3, teeth: { lever: 'satisfaction', amount: -2, line: 'Nobody stays after five. Satisfaction is two points lower in every class.' } },
  { id: 'country-club', name: 'Country Club', blurb: 'Beautiful grounds, a long waiting list and a lot of sailing.', why: 'A steep price and a beautiful campus.', size: -0.05, quality: 2, teeth: { lever: 'giving', amount: 0.15, line: 'Old money writes checks. Giving is fifteen percent higher each year.' } },
  { id: 'pressure-cooker', name: 'Pressure Cooker', blurb: 'The library never closes, and nobody leaves it.', why: 'Very selective, and your students aren\'t happy about it.', size: -0.05, quality: 4, teeth: { lever: 'attrition', amount: 0.015, line: 'Not everyone lasts. Attrition is one and a half points higher a year.' } },
  { id: 'the-bargain', name: 'The Bargain', blurb: 'A good degree at a price a family can say out loud.', why: 'Your net price is well under the market\'s, and your class is respectable.', size: 0.12, quality: -1, teeth: { lever: 'pool', amount: 0.04, line: 'Families say yes. Four percent more apply.' } },
  { id: 'old-money', name: 'Old Money', blurb: 'Endowed before anyone alive was born, and dressed for it.', why: 'A large endowment, held a long time.', size: 0.06, quality: 3, teeth: { lever: 'pool', amount: 0.03, line: 'A name that opens doors. Three percent more apply.' } },
];

export function tagById(id: string): TagDef | undefined {
  return TAGS.find((t) => t.id === id);
}

// Two years over the earning line earns a tag, two under the shedding line
// sheds it; no college is more than three things.
export const TAG_EARN_AT = 0.6;
export const TAG_SHED_AT = 0.4;
export const TAG_YEARS = 2;
export const TAG_LIMIT = 3;
