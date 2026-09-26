// The founding years' notes (Plan 70I): the first two years had little of
// their own to say, so two moments the college reaches early are marked
// with a note over the map, read off its state. Content, not mechanics:
// they ask for nothing and change nothing. {program} and {dorm} are filled
// by components/FoundingNotes.tsx.

// How long a note stays up after its moment, in weeks.
export const FOUNDING_NOTE_WEEKS = 10;

export const FOUNDING_NOTES = {
  firstProgram: {
    title: 'A program of its own',
    text: '{program} is the first program the college has chosen rather than been founded with. The founders\' three were the charter; this one is a decision, and the faculty have noticed. There is an argument in the common room about what it says the college is for, which the Dean regards as a healthy sign.',
  },
  firstResidence: {
    title: 'Somebody lives here now',
    text: 'The first students have moved into {dorm}. Until this week the college emptied at five o\'clock; now there is a light on at midnight, a rota for the kitchen, and a complaint about the showers, which the Bursar has pinned up in the office as the first of its kind.',
  },
} as const;
