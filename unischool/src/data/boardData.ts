// The board's letters on the distress ladder (systems/finance/distress.ts),
// one for each step that matters. Shown as a note over the map
// (components/BoardLetter.tsx) that never stops the clock.

export interface BoardLetter {
  title: string;
  text: string;
}

export const BOARD_LETTERS: Readonly<Record<string, BoardLetter>> = {
  'enter-2': {
    title: 'Two terms in deficit',
    text: 'The college has spent more than it took in for two terms running. The board would like to see a surplus before it sees another building. Tuition, the payroll and the size of the catalogue are the usual places to look.',
  },
  'enter-3': {
    title: 'The board freezes construction',
    text: 'The college is out of cash. Until it has run two surplus terms with money in the bank, the board will approve no new construction and no borrowing. Teaching goes on as before, and so does the payroll.',
  },
  'enter-4': {
    title: 'Austerity',
    text: 'Three terms frozen, and no recovery in sight. The board is cutting maintenance to nothing, and will not let the listed tuition fall, until the books are in surplus again. The buildings will show it. The board regrets that, and has decided it is the cheaper regret.',
  },
  'enter-5': {
    title: 'An interim CFO',
    text: 'The board has appointed an interim chief financial officer for three years, who will set the endowment draw and the maintenance budget. The curriculum, the faculty and the campus remain the administration\'s to run. The college will remember this.',
  },
  'exit-4': {
    title: 'Austerity lifted',
    text: 'Two surplus terms with money in the bank. The board lifts its cuts: maintenance goes back to what the administration had set, and the tuition is the administration\'s again. The backlog the cuts left is still there to be paid.',
  },
  'exit-5': {
    title: 'The interim CFO departs',
    text: 'The interim CFO\'s three years are up. The draw and the maintenance budget are the administration\'s again, set where they were before the appointment. The board thanks her, and hopes not to need her again.',
  },
  recovered: {
    title: 'On a sound footing',
    text: 'The college is paying its way again, with reserves to cover a term. The board notes it with relief, and with its confidence.',
  },
};
