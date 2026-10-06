import type { Pillar } from '../state/types';
import { decimal, pct } from '../format';
import { PILLARS, PILLAR_LABELS, PILLAR_WEIGHTS, SPECIALIZATION_TERM_WEIGHTS } from '../systems/prestige/prestigeSystem';

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

// The specialization half of the rule, a sentence.
export function pillarShareRule(): string {
  const worth = PILLARS.map((p, i) => `${decimal(specializationShareWorth(p), 1)}${i === 0 ? ' points of prestige' : ''} in ${pillarWord(p)}`);
  return `Each pillar holds a share only its own specialization fills, worth up to ${listed(worth)}, so without one no pillar reaches the top.`;
}

// The whole rule, two sentences: the blend, then the shares.
export function pillarRule(): string {
  return `Prestige is the blend of four pillars, ${pillarWeightsWords()}, the same for every college. ${pillarShareRule()}`;
}
