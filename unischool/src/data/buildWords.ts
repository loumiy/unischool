// The build menu's strip while a building is held (Plan 34, from v2's
// treasury.json's holding words).
export const BUILD_WORDS = {
  holding: 'Placing: {building} · {cost} · {pay}',
  holdingKeys: 'Click open ground to break ground · R turns it · Esc puts it down',
  putDown: 'Put it down',
  pay: {
    cash: 'paid in cash',
    loan: 'part borrowed',
    gift: 'paid from gifts',
    endowment: 'half from the endowment',
    none: 'not affordable yet',
  },
} as const;
