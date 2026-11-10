// Identity tags (Plan 31, ported from v2's identity-tags.json): what the
// guidebooks say about the college, earned and shed from how it is run
// (systems/identity/tags.ts). Each shapes the applicant pool (`size`, a
// share of it; `quality`, points on the incoming class) and has small teeth
// on one lever. v2's "yield" teeth are pool size here: everyone admitted
// enrolls in this game.

import { money, signed, signedPct } from '../format';
import type { Effect } from './effectTypes';

export type TagLever = 'giving' | 'attrition' | 'studentCost' | 'athletics' | 'beauty' | 'satisfaction' | 'pool';

export interface TagDef {
  id: string;
  name: string;
  blurb: string;
  why: string;
  size: number;
  quality: number;
  // `line` is the lever in a sentence of flavor; its number is a chip
  // (tagEffects, Plan 125 A).
  teeth: { lever: TagLever; amount: number; line: string };
}

export const TAGS: readonly TagDef[] = [
  { id: 'research-powerhouse', name: 'Research Powerhouse', blurb: 'The papers come out faster than the undergraduates.', why: 'Your research is strong, and at least close to your teaching.', size: 0.05, quality: 3, teeth: { lever: 'giving', amount: 0.1, line: 'Gifts follow the papers.' } },
  { id: 'teaching-college', name: 'Teaching College', blurb: 'Small classes, and professors who know your name.', why: 'Your teaching is strong, and your research lags behind it.', size: 0, quality: 2, teeth: { lever: 'attrition', amount: -0.01, line: 'Students who are known by name stay.' } },
  { id: 'party-school', name: 'Party School', blurb: 'Thursday is the weekend.', why: 'Your students are happy, your intake isn\'t the strongest, and Greek life is busy.', size: 0.1, quality: -4, teeth: { lever: 'studentCost', amount: 400, line: 'You pay for the parties.' } },
  { id: 'jock-school', name: 'Jock School', blurb: 'The stadium is the biggest building on campus, and everyone knows the fight song.', why: 'Your teams and their venues are what you\'re known for.', size: 0.08, quality: -2, teeth: { lever: 'athletics', amount: 6, line: 'Recruits want to play here.' } },
  { id: 'artsy', name: 'Artsy', blurb: 'Studios open all night and a gallery in every stairwell.', why: 'Your arts programs, and the clubs that make music, theater and pictures.', size: -0.03, quality: 1, teeth: { lever: 'beauty', amount: 5, line: 'Studios and galleries everywhere.' } },
  { id: 'commuter', name: 'Commuter', blurb: 'Most of the students go home at five.', why: 'Too few beds, so most of your students go home at night.', size: 0.05, quality: -3, teeth: { lever: 'satisfaction', amount: -2, line: 'Nobody stays after five.' } },
  { id: 'country-club', name: 'Country Club', blurb: 'Beautiful grounds, a long waiting list and a lot of sailing.', why: 'A steep price and a beautiful campus.', size: -0.05, quality: 2, teeth: { lever: 'giving', amount: 0.15, line: 'Old money writes checks.' } },
  { id: 'pressure-cooker', name: 'Pressure Cooker', blurb: 'The library never closes, and nobody leaves it.', why: 'Very selective, and your students aren\'t happy about it.', size: -0.05, quality: 4, teeth: { lever: 'attrition', amount: 0.015, line: 'Not everyone lasts.' } },
  { id: 'the-bargain', name: 'The Bargain', blurb: 'A good degree at a price a family can say out loud.', why: 'Your net price is well under the market\'s, and your class is respectable.', size: 0.12, quality: -1, teeth: { lever: 'pool', amount: 0.04, line: 'Families say yes.' } },
  { id: 'old-money', name: 'Old Money', blurb: 'Endowed before anyone alive was born, and dressed for it.', why: 'A large endowment, held a long time.', size: 0.06, quality: 3, teeth: { lever: 'pool', amount: 0.03, line: 'A name that opens doors.' } },
];

// What a reputation does, as chips: the pool it draws (its size and a
// 'pool' lever are one figure, as tags.ts adds them), the class's
// quality, and its one lever.
export function tagEffects(t: TagDef): Effect[] {
  const out: Effect[] = [];
  const { lever, amount } = t.teeth;
  const pool = t.size + (lever === 'pool' ? amount : 0);
  if (pool) out.push({ kind: 'students', figure: signedPct(pool), words: 'applicants', tone: pool > 0 ? 'gain' : 'loss' });
  if (t.quality) out.push({ kind: 'quality', figure: signed(t.quality), words: 'incoming quality', tone: t.quality > 0 ? 'gain' : 'loss' });
  switch (lever) {
    case 'giving': out.push({ kind: 'alumni', figure: signedPct(amount), words: 'alumni giving', tone: amount > 0 ? 'gain' : 'loss' }); break;
    case 'attrition': out.push({ kind: 'students', figure: signed(amount * 100, 1).replace(/\.0$/, ''), words: `${Math.abs(amount * 100) === 1 ? 'point' : 'points'} of attrition a year`, tone: amount < 0 ? 'gain' : 'loss' }); break;
    case 'studentCost': out.push({ kind: 'money', figure: `${amount > 0 ? '−' : '+'}${money(Math.abs(amount))}`, words: 'a student each year', tone: amount > 0 ? 'loss' : 'gain' }); break;
    case 'athletics': out.push({ kind: 'athletics', figure: signed(amount), words: 'every team\'s strength', tone: amount > 0 ? 'gain' : 'loss' }); break;
    case 'beauty': out.push({ kind: 'beauty', figure: signed(amount), words: 'campus beauty', tone: amount > 0 ? 'gain' : 'loss' }); break;
    case 'satisfaction': out.push({ kind: 'satisfaction', figure: signed(amount), words: 'satisfaction', tone: amount > 0 ? 'gain' : 'loss' }); break;
    case 'pool': break;
  }
  return out;
}

export function tagById(id: string): TagDef | undefined {
  return TAGS.find((t) => t.id === id);
}

// Two years over the earning line earns a tag, two under the shedding line
// sheds it; no college is more than three things.
export const TAG_EARN_AT = 0.6;
export const TAG_SHED_AT = 0.4;
export const TAG_YEARS = 2;
export const TAG_LIMIT = 3;
