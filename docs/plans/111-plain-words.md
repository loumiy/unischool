# Plan 111 — Plain words

*The owner's brief (22 October 2026), after Indie Game Booster's stream
(S3): "I really need to work on the text. There are too many dense
paragraphs, and the sentence structure is often confusing and screams
AI-generated." The diagnosis is in [the text
review](../reviews/2026-10-text-review.md). This plan does the rewrite.*

**Status: In progress.** PR A is under way.

---

## 0. Why

Five players have said the text is hard to read: S1, S2, S3, D1 and F6.
It is the most repeated finding of the playtest. S3 read a board letter
aloud and said it wasn't natural English.

The review found nine habits behind it, counted across the game's 8,500
strings:
- the player is almost never "you";
- colons in the middle of sentences;
- commas doing four jobs at once;
- chains of possessives;
- terms the game never explains;
- aphorisms and see-saw sentences;
- lists of three by habit;
- a rule and its exceptions in one breath;
- flavour and instruction at the same weight.

## 1. The rules

Every PR below follows the review's ten rules. In short:

1. Talk to the player: "you" and "your college".
2. One idea per sentence. Keep instructions under about 20 words.
3. The action first, in the button's own words. The reason second.
4. Active voice, with someone doing the action.
5. One name for each thing, matching the UI.
6. Numbers and exceptions go in a second sentence, a tooltip or the
   panel.
7. No aphorisms in instructions.
8. Flavour and instruction on separate lines.
9. Lists hold what matters.
10. Read it aloud.

Flavour (letters from the board, events, promises) keeps its voice, but
says "you" and loses the tics.

Rewriting the words never changes a rule. If a rewrite finds that a line
was wrong about the game, the PR fixes the words to match the code and
notes it.

## 2. The PRs

### A. The first hour

What a new player reads in their first hour, from the founding to year 3:

- **The walkthrough** (`openingData.ts`): the welcome, the two steps, the
  skip, and the campus figures.
- **The chapters from *The next course* to *A hall of its own***
  (`chapterData.ts`): every objective and briefing. The briefings keep
  their what / how / why shape, which S3's co-host liked. "What" shrinks
  to two or three short sentences, each lever is one instruction, and
  each "why" is one plain clause.
- **The drawer's own words**: the mode notes and "opens when" lines.
- **The NEXT line** (`nextStep.ts`, `seating.ts`, `establish.ts`): it is
  read more than any other line in the game. Each one is an instruction,
  or a short status line with its instruction after it.
- **The opening letters** (`eventData.ts`'s `OPENING_LETTERS`): the
  doors open, a hall of its own, somewhere to sleep, summer is coming,
  moving in, and a school takes shape.
- **The founding milestones' letters** (`ladderData.ts`, the Founding
  tier), including "The first class has walked", which S3 read aloud.

Tests that pin a string are updated to the new words. Tests that pin a
behaviour stay as they are.

### B. The rest of the chapters, and the letters

- The chapters from *Campus life* on, including the side chapters.
- The board's letters (`boardData.ts`), the sweep letter among them.
- The milestone letters after the Founding tier.
- The school and specialization notices.

### C. The summer

- The year in review: "N students will not return this summer — dining,
  study space" becomes a sentence that says why.
- The admissions page, the report card lines and the summer's log lines.

### D. Help paragraphs and tooltips

- The campus map's help (294 words in one hint), the build menu's (213),
  the Faculty tab's (102), the seats' (101) and the Students tab's.
- The figure hints (`figureHints.ts`).

Each long paragraph becomes a few short lines or a short list. Keys go in
a list of their own.

### E. Buttons that ask first

- `ConfirmButton`'s armed labels say what happens, not what closes:
  "Move English (4 weeks without classes)", not "Confirm — English
  closes 4 weeks".
- Red is kept for losses that can't be undone: closing a program,
  demolishing a building, dismissing someone. A move or a purchase arms
  in the ordinary button colour. (S3 read a red Confirm as Cancel.)

### F. Flavour

- The events catalogue (14,276 words) and the promises (2,109).
- They keep their wit, but lose the see-saw sentences ("X rather than
  Y", "not A, not B, but C") and the closing epigrams, except where an
  epigram is the best line in the piece.
- Where a choice in an event has a consequence, the consequence is said
  plainly.

### G. A text check

- `review:strings` gains a lint for the instruction screens. It flags:
  - a mid-sentence colon or semicolon;
  - a sentence over about 20 words;
  - a chain of possessives;
  - a passive with no one doing the action;
  - a string with no "you" where the player is the one acting.
- A test prints the worst twenty and the totals. It fails only if the
  totals rise past where PR F leaves them, so the rewrite stays done.

## 3. Order

A first, because it is what every new player reads and what the
playtest's players struggled with. B and C come next, while the voice is
fresh. D and E are independent and can land in either order. F is the
largest and least urgent. G comes last, so its thresholds reflect the
rewritten text.
