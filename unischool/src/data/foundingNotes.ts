// The founding years' notes (Plan 70I): the first two years had little of
// their own to say, so a moment the college reaches early is marked with a
// letter in the inbox (Plan 77), read off its state. Content, not
// mechanics: it asks for nothing and changes nothing. {dorm} is filled by
// systems/inbox/foundingNote.ts. (The first program's note went in Plan
// 80D: every program is chosen now, the first included.)

// How long after its moment a note arrives unread, in weeks.
export const FOUNDING_NOTE_WEEKS = 10;

export const FOUNDING_NOTES = {
  firstResidence: {
    title: 'Somebody lives here now',
    text: 'The first students have moved into {dorm}. Until this week the college emptied at five o\'clock; now there is a light on at midnight, a kitchen schedule, and a complaint about the showers, which the business office has pinned up as the first of its kind.',
  },
} as const;
