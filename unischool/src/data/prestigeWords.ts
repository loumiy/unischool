import type { Pillar } from '../state/types';
import { decimal, pct } from '../format';
import { EARLY_FADE_YEAR, PILLARS, PILLAR_LABELS, PILLAR_WEIGHTS, PRESTIGE_FALL_RATE, riseRateIn, SATISFACTION_LEADS_AT, SPECIALIZATION_MILESTONE_RANK, SPECIALIZATION_PILLAR_RANK, SPECIALIZATION_PILLAR_YEAR, SPECIALIZATION_TERM_WEIGHTS } from '../systems/prestige/prestigeSystem';

// ---------------------------------------------------------------------
// The pillar rule, said once (Plan 95E, the second review's B2-4): prestige
// is the four pillars' blend, and each pillar holds a share only its own
// specialization fills. Every sentence that states it is built here, from
// prestigeSystem.ts's PILLAR_WEIGHTS and SPECIALIZATION_TERM_WEIGHTS, so a
// retune cannot leave a stale figure behind; text that only mentions the
// rule points to History › Prestige (PILLAR_RULE_HOME) instead. No help
// text types the weights by hand (test/pillar-rule.test.ts). A pillar's
// part is a "share" in the player's words; "term" is the calendar's.
// ---------------------------------------------------------------------

// Where the rule is said in full, for text that only mentions it.
export const PILLAR_RULE_HOME = 'History › Prestige';

function pillarWord(pillar: Pillar): string {
  return PILLAR_LABELS[pillar].toLowerCase();
}

// "a, b, c and d".
function listed(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// The points of prestige a pillar's specialization share is worth in full:
// its points of the pillar, at the pillar's weight in prestige.
export function specializationShareWorth(pillar: Pillar): number {
  return SPECIALIZATION_TERM_WEIGHTS[pillar] * PILLAR_WEIGHTS[pillar];
}

// The four weights, each after its pillar: "academics N%, research N%,
// student life N% and athletics N%".
export function pillarWeightsWords(): string {
  return listed(PILLARS.map((p) => `${pillarWord(p)} ${pct(PILLAR_WEIGHTS[p])}`));
}

// One pillar at its weight, "research, N% of prestige" (Plan 95Q: the
// lab's build tile).
export function pillarWorthWords(pillar: Pillar): string {
  return `${pillarWord(pillar)}, ${pct(PILLAR_WEIGHTS[pillar])} of prestige`;
}

// The specialization half of the rule, a sentence.
export function pillarShareRule(): string {
  const worth = PILLARS.map((p, i) => `${decimal(specializationShareWorth(p), 1)}${i === 0 ? ' points of prestige' : ''} in ${pillarWord(p)}`);
  return `Each pillar holds a share only its own specialization fills, worth up to ${listed(worth)}, so without one no pillar reaches the top.`;
}

// The whole rule, two sentences: the blend, then the shares.
export function pillarRule(): string {
  return `Prestige is the blend of four pillars, ${pillarWeightsWords()}, the same for every college. ${pillarShareRule()}`;
}

// How prestige moves, in three sentences (Plan 114B, the third review's
// C2-6): the glance's Details and History's help both read it, so the two
// cannot drift apart. The first two stay split, as Plan 111 left them. The
// third is the era's: while a summer still closes more of the gap than a fall
// does, the early weekly climb; from then on, the fall.
export function summerRule(year: number): string {
  const era = riseRateIn(year) >= PRESTIGE_FALL_RATE
    ? `Until year ${EARLY_FADE_YEAR} it also climbs a little every week.`
    : 'It falls faster than it climbs.';
  return `Prestige is graded each summer. It moves toward that grade. ${era}`;
}

// When the board offers the choice (Plan 95R, the second review's B4-2;
// Plan 116C, the third review's C4-6): the three routes, from
// prestigeSystem.ts's constants. The two later routes, each a phrase, for
// the lines that name the one that brought the offer.
export function pillarRouteWords(): string {
  return `a top-${SPECIALIZATION_PILLAR_RANK} place in any one pillar`;
}

// "Over half" is the rule as satisfactionLeads counts it. `whose` is the
// reader's: "your years", or the college's, "its years".
export function satisfactionRouteWords(whose: 'your' | 'its' = 'your'): string {
  return `keeping student satisfaction at ${SATISFACTION_LEADS_AT} or more for over half ${whose} years`;
}

// The same route, met, as a sentence: the log's line and the board's letter.
export function satisfactionRecordWords(whose: 'your' | "your college's" = 'your'): string {
  return `Student satisfaction has been ${SATISFACTION_LEADS_AT} or more in over half ${whose} years.`;
}

// The rule, a sentence a route (Plan 111's rules 2 and 6: no sentence
// carries the rule and its exceptions together). Both later routes start
// at Year SPECIALIZATION_PILLAR_YEAR, so one sentence says so.
export function specializationOfferRule(): string {
  return `The board offers you a specialization the first summer your college is in the guide's top ${SPECIALIZATION_MILESTONE_RANK}. From Year ${SPECIALIZATION_PILLAR_YEAR}, two more things bring the offer. One is ${pillarRouteWords()}. The other is ${satisfactionRouteWords()}.`;
}
