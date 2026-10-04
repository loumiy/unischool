import type { CohortId } from '../state/types';

// The eight cohorts' colors are tokens in styles.css (--cohort-1…8), in
// COHORTS order. Shared by the Students tab's enrollment bars and the summer
// admissions cards (Plan 90), so a cohort wears one colour everywhere.
export const COHORT_COLOR: Record<CohortId, string> = {
  highAchievers: 'var(--cohort-1)',
  preProfessional: 'var(--cohort-2)',
  researchOriented: 'var(--cohort-3)',
  social: 'var(--cohort-4)',
  artsFocused: 'var(--cohort-5)',
  priceSensitive: 'var(--cohort-6)',
  athletes: 'var(--cohort-7)',
  gradBound: 'var(--cohort-8)',
};
