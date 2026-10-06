import type { SatisfactionAttributes } from '../state/types';

// The need a facility's capacity counts toward, as the build menu and the
// building panel name it (Plan 76C): "fitness" and "recreation" alone never
// said whether the gym was health or social.
export const NEED_WORD: Readonly<Record<keyof SatisfactionAttributes, string>> = {
  academic: 'academic',
  social: 'social life',
  basicNeeds: 'basic needs',
  health: 'health',
  housing: 'housing',
};

// A need as space the college keeps (Plan 80F): the building panel's "Dining:
// 5,400 places for 3,900 students" and the Treasury's space beyond need.
// The academic need's space is "academic", as the need is named, not "study"
// (Plan 95Q, the second review's B3-10).
export const NEED_SPACE: Readonly<Record<keyof SatisfactionAttributes, string>> = {
  academic: 'Academic space',
  social: 'Social space',
  basicNeeds: 'Dining',
  health: 'Health',
  housing: 'Housing',
};
