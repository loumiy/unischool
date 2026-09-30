import type { Pillar } from '../state/types';

// ---------------------------------------------------------------------
// The words for specializations (Plan 85C): the ceilings a pillar stops at
// without one, and the tags that show a rival's. A ceiling is said as a
// "limit" to the player (Plan 47's glossary: ceiling → limit). The rules are in
// systems/prestige/prestigeSystem.ts (UNSPECIALIZED_CEILINGS, pillarCeiling)
// and systems/rivals/rivalsSystem.ts; the choice itself comes in Plan 85D.
// The word is "specialization", never "archetype" (Plan 47's glossary).
// ---------------------------------------------------------------------

// A pillar as a sentence names it.
export const PILLAR_WORDS: Readonly<Record<Pillar, string>> = {
  academics: 'academics',
  research: 'research',
  studentLife: 'student life',
  athletics: 'athletics',
};

// A rival's specialization as the guide's tag prints it, short, with the
// full words on hover.
export const SPECIALIZATION_TAGS: Readonly<Record<Pillar, string>> = {
  academics: 'Aca',
  research: 'Res',
  studentLife: 'Life',
  athletics: 'Ath',
};

export function specializedIn(pillar: Pillar): string {
  return `Specialized in ${PILLAR_WORDS[pillar]}`;
}

// The ceiling's line under a pillar's breakdown.
export const CEILING_LABEL = 'The limit without a specialization';

export function ceilingDetail(pillar: Pillar, ceiling: number, max: number): string {
  return `Without a specialization in ${PILLAR_WORDS[pillar]}, the pillar stands no higher than ${ceiling.toFixed(0)} of ${max}, however much it earns.`;
}

// The mark on a pillar's row while its ceiling holds it.
export const CEILING_TAG = 'At its limit';

// When the ceiling is what holds the pillar: its breakdown, and its row in
// History › Prestige.
export function ceilingHeld(pillar: Pillar, ceiling: number): string {
  return `Held at its limit of ${ceiling.toFixed(0)}. Only a specialization in ${PILLAR_WORDS[pillar]} would lift it.`;
}

// A program the unspecialized team ceiling holds (studentLifeData.ts's
// UNSPECIALIZED_TEAM_CEILING), on its card in the Athletics tab.
export function teamCeilingHeld(ceiling: number): string {
  return `Held at ${ceiling}: without a specialization in athletics, no program plays above it, however it is staffed, funded and recruited. A specialization would lift it.`;
}

// A rival leading a pillar, on its standings card.
export function ledBy(name: string, specialization: Pillar): string {
  return `Led by ${name}, ${specializedIn(specialization).toLowerCase()}`;
}
