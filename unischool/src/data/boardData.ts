// The board's letters on the distress ladder (systems/finance/distress.ts),
// one for each step that matters, and on idle cash (sweep.ts). Shown as a
// letter in the inbox (components/InboxTab.tsx, Plan 77) that never stops
// the clock.

import { SPECIALIZATION_NOTICE_ID, specializationNotice } from './specializationData';
import { pillarShareRule, specializationOfferRule } from './prestigeWords';

export interface BoardLetter {
  title: string;
  text: string;
  // Who signs it, when not the board: the alumni's letter on a program cut
  // (Plan 95V, systems/athletics/cut.ts).
  from?: string;
}

export const BOARD_LETTERS: Readonly<Record<string, BoardLetter>> = {
  'enter-2': {
    title: 'Two terms in deficit',
    text: "You've spent more than you've taken in for two terms in a row. The board is worried. If the money runs out, it will stop all new building. To turn it around, look at tuition, salaries and how many courses you offer.",
  },
  'enter-3': {
    title: 'The board freezes construction',
    text: "You've run out of cash. The board will approve no new building and no borrowing until you've had two surplus terms in a row with money in the bank. Teaching and salaries carry on as before.",
  },
  'enter-4': {
    title: 'Austerity',
    text: "Three terms frozen, and no recovery in sight. The board is cutting maintenance to nothing, and won't let you lower tuition. This lasts until you've had two surplus terms in a row with money in the bank. The buildings will show it. The board is sorry about that, but it can't pay to keep them up.",
  },
  'enter-5': {
    title: 'An interim CFO',
    text: 'The board has appointed an interim chief financial officer for three years. She will set the endowment draw and the maintenance budget. You still run the curriculum, the faculty and the campus. The college will remember this.',
  },
  'exit-4': {
    title: 'Austerity lifted',
    text: 'Two surplus terms with money in the bank. The board lifts its cuts. Maintenance goes back to what you had set, and tuition is yours to set again. The repair backlog the cuts left behind still has to be paid.',
  },
  'exit-5': {
    title: 'The interim CFO departs',
    text: "The interim CFO's three years are up. The draw and the maintenance budget are yours again, back where you had them before the board's cuts. The board thanks her, and hopes not to need her again.",
  },
  // Idle cash (systems/finance/sweep.ts, Plan 70D): not the distress
  // ladder's, but the board's all the same. The letter's button sets the
  // standing sweep.
  'idle-cash': {
    title: 'Money doing nothing',
    text: "You've had more than a year's expenses sitting in cash for a year now. Cash earns nothing, and the guidebooks ignore it when they rate your finances. They look at the endowment. The board suggests a standing sweep. Every quarter, keep six months of expenses in cash and move the rest into the endowment. It stops once the endowment gets full marks. You can change it any time in the Treasury.",
  },
  'idle-cash-again': {
    title: 'Still doing nothing',
    text: "Your cash has piled up again, and it still earns nothing. The board suggests a standing sweep into the endowment once more. It won't bring it up again for ten years.",
  },
  // The milestone's notice (Plan 85D, systems/prestige/milestone.ts): the
  // college has come within reach of the specialization's milestone.
  [SPECIALIZATION_NOTICE_ID]: specializationNotice(specializationOfferRule(), pillarShareRule()),
  recovered: {
    title: 'On a sound footing',
    text: 'Your college is paying its way again, with enough cash to cover a term. The board is relieved, and would like it to stay that way.',
  },
};
