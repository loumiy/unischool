import type { GameState, OpeningStage } from '../state/types';
import { programById } from './techData';
import { FOUNDING_PROGRAMS } from './foundingData';

// ---------------------------------------------------------------------
// The opening walkthrough's copy, one card per stage (state/opening.ts,
// components/OpeningCoach.tsx). `next` labels the button where a step ends
// on a click; a step that ends on a reading has none. `door` names what the
// coach offers to reopen (the build menu or Founders Hall's panel) if the
// player wanders off the step.
// ---------------------------------------------------------------------
export interface OpeningStep {
  eyebrow: string;
  title: string;
  body: (s: GameState) => string;
  next?: string;
  door?: 'build' | 'hall';
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const foundingNames = () => list(FOUNDING_PROGRAMS.map((id) => programById(id)?.name ?? id));

export const OPENING_STEPS: Record<Exclude<OpeningStage, 'play'>, OpeningStep> = {
  welcome: {
    eyebrow: 'From the chair of the board',
    title: 'The doors open',
    body: (s) => `The ${s.self.name} board wishes you well. Three hundred and fifty students are on the books, five professors are on the payroll teaching ${foundingNames()}, and as of this morning the one building they teach in has not been set down on its ground. That is yours to fix, and so is what comes after it; the clock will not run until you have. Two things first: where the college stands, and what it teaches next.`,
    next: 'Next',
  },
  'site-hall': {
    eyebrow: 'Step one',
    title: 'Raise Founders Hall',
    body: () => 'Every building comes from the build menu at the foot of the screen. Click Founders Hall to pick it up, then click a clear stretch of ground to set it down — its footprint follows the pointer, and the ground is yours, so this one costs nothing. Every later building is placed the same way.',
    door: 'build',
  },
  teaching: {
    eyebrow: 'Step two',
    title: 'The college already teaches',
    body: () => `Founders Hall stands, and inside it ${foundingNames()} are being taught: three programs, two courses each, and a professor on every one. A program is a row of nine courses; each is developed — paid for once, built over some weeks, and taught by one of your professors from then on — and the next of each row is ready to start. The Curriculum is where you see all of that.`,
    next: 'Next',
  },
  found: {
    eyebrow: 'Step three',
    title: 'Found a fourth program',
    body: (s) => `Founders Hall has three rooms still empty. A program is founded into a room from the hall's own panel on the map: ${s.programOffers.length > 1 ? `${s.programOffers.length} programs are on offer` : s.programOffers.length === 1 ? 'one program is on offer' : 'programs are offered three at a time'}, and founding one starts its first course with the professor you pick. When nobody on the payroll teaches that field, the panel shows the market — appointing someone there is how a department starts. Its panel is open: click a ringed room, and choose.`,
    door: 'hall',
  },
};
