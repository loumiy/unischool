import type { SchoolType } from '../state/types';

// ---------------------------------------------------------------------
// Private vs. public is the game's one starting fork (see README's
// "Startup and school type"). Everything the choice affects is a plain,
// tunable starting condition here — no behavior branches on schoolType
// anywhere else except where a system explicitly reads one of these
// fields off state. Archetypes (Harvard-like, ASU-like, ...) are meant
// to emerge from play, not from this table, so keep it to starting
// conditions only.
// ---------------------------------------------------------------------

// Shared baseline reputation both types start from before their own
// prestigeBonus/penalty is added.
export const BASE_STARTING_REPUTATION = 40;

export interface SchoolTypePreset {
  label: string;                  // shown on the startup screen
  description: string;            // one-line flavor/tradeoff text for the startup screen
  startingCash: number;
  prestigeBonus: number;          // added to BASE_STARTING_REPUTATION; negative allowed
  startingApplicantPool: number;
  tuitionCeiling: number;         // hard cap enforced on SET_TUITION
  baselineFundingPerWeek: number; // steady non-tuition income (e.g. state appropriations); 0 if none
}

export const SCHOOL_TYPE_PRESETS: Record<SchoolType, SchoolTypePreset> = {
  private: {
    label: 'Private',
    description: 'No state funding and a smaller applicant pool, but tuition is uncapped and you start with more prestige.',
    startingCash: 60_000,
    prestigeBonus: 10,
    startingApplicantPool: 150,
    tuitionCeiling: 60_000,
    baselineFundingPerWeek: 0,
  },
  public: {
    label: 'Public',
    description: 'A steady state appropriation and a much larger applicant pool, but tuition is capped and prestige starts lower.',
    startingCash: 40_000,
    prestigeBonus: -5,
    startingApplicantPool: 400,
    tuitionCeiling: 20_000,
    baselineFundingPerWeek: 4_000,
  },
};
