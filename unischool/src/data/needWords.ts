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
