// Identity tags (Plan 31, ported from v2's identity-tags.json): what the
// guidebooks say about the college, earned and shed from how it is run
// (systems/identity/tags.ts). Each shapes the applicant pool (`size`, a
// share of it; `quality`, points on the incoming class) and has small teeth
// on one lever. v2's "yield" teeth are pool size here: everyone admitted
// enrols in this game.

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
  { id: 'research-powerhouse', name: 'Research Powerhouse', blurb: 'The papers come out faster than the undergraduates.', why: 'The research is strong, and stronger than the teaching.', size: 0.05, quality: 3, teeth: { lever: 'giving', amount: 0.1, line: 'Grants and gifts follow the papers: a tenth more giving each year.' } },
  { id: 'teaching-college', name: 'Teaching College', blurb: 'Small classes, and professors who know your name.', why: 'The teaching is strong, and stronger than the research.', size: 0, quality: 2, teeth: { lever: 'attrition', amount: -0.01, line: 'Students who are known by name stay: one point less attrition a year.' } },
  { id: 'party-school', name: 'Party School', blurb: 'Thursday is the weekend.', why: 'The students are happy, and the classes they arrive in are not the most demanding.', size: 0.1, quality: -4, teeth: { lever: 'studentCost', amount: 400, line: 'The college pays for the parties: $400 a student a year more on discipline and student life.' } },
  { id: 'jock-school', name: 'Jock School', blurb: 'The stadium is the biggest building on campus, and everyone knows the fight song.', why: 'The teams and their venues are what the college is known for.', size: 0.08, quality: -2, teeth: { lever: 'athletics', amount: 6, line: 'Recruits want to play here: every team six points stronger.' } },
  { id: 'artsy', name: 'Artsy', blurb: 'Studios open all night and a gallery in every stairwell.', why: 'The arts: their programs, their buildings, their share of the campus.', size: -0.03, quality: 1, teeth: { lever: 'beauty', amount: 5, line: 'Studios and galleries everywhere: five points of campus beauty.' } },
  { id: 'commuter', name: 'Commuter', blurb: 'Most of the students go home at five.', why: 'Too few beds for the students: most of them go home at night.', size: 0.05, quality: -3, teeth: { lever: 'satisfaction', amount: -2, line: 'Nobody stays after five: two points off every class\'s satisfaction.' } },
  { id: 'country-club', name: 'Country Club', blurb: 'Beautiful grounds, a long waiting list, and a lot of sailing.', why: 'A dear sticker, little aid, and a beautiful campus.', size: -0.05, quality: 2, teeth: { lever: 'giving', amount: 0.15, line: 'Old boys write cheques: fifteen per cent more giving each year.' } },
  { id: 'pressure-cooker', name: 'Pressure Cooker', blurb: 'The library never closes, and nobody leaves it.', why: 'Very selective, and the students are not happy about it.', size: -0.05, quality: 4, teeth: { lever: 'attrition', amount: 0.015, line: 'Not everyone lasts: one and a half points more attrition a year.' } },
  { id: 'the-bargain', name: 'The Bargain', blurb: 'A good degree at a price a family can say out loud.', why: 'A net price well under the market\'s, for a respectable class.', size: 0.12, quality: -1, teeth: { lever: 'pool', amount: 0.04, line: 'Families say yes: four per cent more apply.' } },
  { id: 'old-money', name: 'Old Money', blurb: 'Endowed before anyone alive was born, and dressed for it.', why: 'A large endowment, held a long time.', size: 0.06, quality: 3, teeth: { lever: 'pool', amount: 0.03, line: 'A name that opens doors: three per cent more apply.' } },
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
