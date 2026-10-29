// The build menu's strip while a building is held (Plan 34, from v2's
// treasury.json's holding words). "Cancel", not "Put it down", which
// read as "place it" (Plan 95Q, the second review's B3-10).
export const BUILD_WORDS = {
  holding: 'Placing: {building} · {cost} · {pay}',
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
    noCash: 'you can’t borrow with no cash in hand',
    room: 'you can borrow up to {room}',
    noRoom: 'you can’t borrow any more',
  },
  constructionFrozen: 'construction frozen',
  // Why the map's ghost is red when the ground is fine (Plan 104H): what
  // the building costs against what there is, the board's freeze, a field
  // with nobody to staff it, or a building not open yet.
  costs: 'Costs {cost} · you have {cash}',
  frozen: 'The board has frozen construction',
  needsFaculty: 'Needs a {field} professor with a free course slot',
  notOpen: '{building} isn’t open to build yet',
  // A bench, lamp or bed refused (the reducer's PLACE_DRESSING): off the
  // college's land, on a building, or on a quad's walks or centrepiece
  // (Plan 115H: its lawn takes them).
  dressingOffLand: 'Only on your college’s land',
  dressingOnBuilding: '{building} stands here',
  dressingOnQuad: 'Only on the lawn of {building}',
} as const;
