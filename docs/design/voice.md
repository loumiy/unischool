# The voice

One narrator writes everything a player reads. This page says who that is,
where the jokes go, and how often each trick may be used. The checks in
`unischool/tools/review/plainChecks.ts` count most of it, and
`npm run review:plain` prints the counts.

## Who is talking

Your chief of staff. They have been at the college longer than you have,
they like you, and they tell you the truth. They find the institution
funnier than you do, and they are fond of it anyway.

That gives three qualities, in this order:

1. **Candor.** Say what happens and what it costs. "You can't search for an
   Athletic Director yourself, so this one may mean waiting."
2. **Friendliness.** Talk to the player as "you", with contractions, in
   American English. One idea to a sentence.
3. **Wry humor.** A dry aside about how colleges work. It is a sprinkle:
   most lines have none.

## Where jokes go

| Slot | Jokes? |
|---|---|
| An instruction (what to click, what a rule is, what a number means) | Never |
| A chapter or panel title, an empty state | One dry line is welcome |
| A letter or an event | Yes, in the telling. The choices under it stay plain |
| Flavor (a quirk, a blurb, a course description, a reputation) | Yes |
| Anything grave (a fire, an outbreak, a death, a breach) | No |

A number never sits inside a joke. Effects, costs, capacities and durations
are drawn as chips beside the line (`components/EffectChip.tsx`), which
leaves the sentence free to be a sentence.

## Who the joke is on

The institution: its committees, offices, memos, budgets and rituals. Never
a student, and never a named person. Fond, not contemptuous: "The office,
on the evidence, is not" is right, and "nobody knows anything" is wrong.

Real names are fine where the text only refers to something (a course that
reads Kant or follows the FAA's rules). They stay out of anything the game
invents a story about: rivals, funders, trophies, events and quirks.

## How often

Any trick used on every line stops being a trick. These are ceilings.

**Events** (the letters in `data/eventCatalogue.ts` and `eventVariants.ts`):

- A deadpan last line on about one letter in three.
- One comic device to a letter: the last line, a trailing ", which…" aside,
  an exact number, or a document described by its manners. Not all four.
- "Would like" and the trailing ", which" at most 15 times each across the
  catalogue.
- No more than half the letters open with "The … has …".
- A joke is told once. If two events share one, the better telling keeps it.

**Courses** (`data/courseDescriptions.ts`):

- One sentence or two. No more than half are built on a list.
- No more than 12 lines open on the same verb.
- About one line in seven has a wink, and every school has some.
- "Real" is not an intensifier.

**Everywhere:**

- No em dashes and no semicolons. A colon only after a label or before a
  list.
- A list holds what matters, which is not always three things.
- "For good", "now" and "somewhere to…" are fine once in a letter and wear
  thin as a habit.

## The lines to measure against

- "Has a feud with a rival department that predates the rival department."
- "The hours are posted every term. The office, on the evidence, is not."
- "A good degree at a price a family can say out loud."
- "The Curriculum Committee has met eleven times on whether freshmen should
  take a writing course, and has approved the minutes of all eleven meetings
  and nothing else."
- "The Communications Office has chosen a window."
- "The board thanks her, and hopes not to need her again."

The rules for instructions (the action first, in the button's own words;
numbers second) are in the text review,
[`reviews/2026-10-text-review.md`](../reviews/2026-10-text-review.md), and
still hold.
