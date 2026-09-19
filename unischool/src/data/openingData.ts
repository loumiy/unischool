import type { GameState, OpeningStage } from '../state/types';

// ---------------------------------------------------------------------
// THE OPENING WALKTHROUGH'S COPY, one card per stage (see state/opening.ts
// for the stages and components/OpeningCoach.tsx for the card). `next`
// is the button's label where the step ends on a click; a step that ends
// on a reading has no button, only the instruction. `door` names what the
// coach offers to reopen if the player closed it — the build menu or the
// Curriculum — so a wander off the step is never a dead end.
// ---------------------------------------------------------------------
export interface OpeningStep {
  eyebrow: string;
  title: string;
  body: (s: GameState) => string;
  next?: string;
  door?: 'build' | 'curriculum';
}

export const OPENING_STEPS: Record<Exclude<OpeningStage, 'play'>, OpeningStep> = {
  welcome: {
    eyebrow: 'From the chair of the board',
    title: 'The doors open',
    body: (s) => `The ${s.self.name} board wishes you well. Three hundred and fifty students are on the books and five professors are on the payroll, and as of this morning there is not one building standing and not one course being taught. Both are yours to fix, and the clock will not run until you have. Two things first: a hall to teach in, and something to teach.`,
    next: 'Next',
  },
  'site-hall': {
    eyebrow: 'Step one',
    title: 'Raise Founders Hall',
    body: () => 'Every building comes from the Build menu at the foot of the screen. Click Founders Hall to pick it up, then click a clear stretch of ground to set it down — its footprint follows the pointer, and the ground is yours, so this one costs nothing. Every later building is placed the same way.',
    door: 'build',
  },
  classes: {
    eyebrow: 'Step two',
    title: 'A college needs classes',
    body: () => 'Founders Hall stands, and it holds the general-education core: six courses every degree this college will ever grant rests on. None of them exists yet. A course is DEVELOPED — paid for once, built over some weeks, and taught by one of your professors from then on. The Curriculum is where that happens.',
    next: 'Open the Curriculum',
  },
  'first-course': {
    eyebrow: 'Step three',
    title: 'Develop a course',
    body: () => 'Click any course in the General Education row. Its drawer says what it costs and how long it takes, lists every professor who could teach it with the grade each would earn, and has the Develop button. When nobody on the payroll teaches a department, the same drawer shows the market — appointing someone there is how a department starts.',
    door: 'curriculum',
  },
};
