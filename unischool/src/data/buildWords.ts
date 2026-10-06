// The build menu's strip while a building is held (Plan 34, from v2's
// treasury.json's holding words). "Cancel", not "Put it down", which
// read as "place it" (Plan 95Q, the second review's B3-10).
export const BUILD_WORDS = {
  holding: 'Placing: {building} · {cost} · {pay}',
  holdingKeys: 'Click open ground to break ground · R turns it · Esc cancels',
  putDown: 'Cancel',
  pay: {
    cash: 'paid in cash',
    loan: 'part borrowed',
    gift: 'paid from gifts',
    endowment: 'half from the endowment',
    none: 'not affordable yet',
  },
  // A greyed tile's reason on its face (Plan 95Q, the second review's
  // B3-10), as a loan line is shown: the shortfall, then which of loanFor's
  // conditions (finance/treasury.ts's loanBar) stopped a loan.
  short: '{short} short',
  noLoan: {
    frozen: 'the board has frozen borrowing',
    noCash: 'with no cash in hand, the college cannot borrow',
    room: 'the college can borrow up to {room}',
    noRoom: 'the college has no borrowing room left',
  },
  constructionFrozen: 'construction frozen',
} as const;
