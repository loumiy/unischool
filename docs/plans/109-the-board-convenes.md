# Plan 109 — The board convenes

*The owner's brief (22 October 2026): specialization should feel like a
bigger moment. "Right now it reads like just another email." A short email
that takes you to a full-screen pop-out; the choices four big panels with
distinct colours and iconography; the new buildings rendered as previews
in the panels; how the college is doing in each pillar shown for
reference.*

**Status: Landed (22 October 2026), one PR.** The owner approved a
three-screen mock-up (the letter, the page, the confirm step;
https://claude.ai/artifact/PHG9ur4ebEsrV4TqHjRQdY), drawn with the game's
own building art and a Guided save's real standings at the choice, and
asked for it built.

---

## 0. What stood

The choice was the stop's card in the inbox, as wide as a page: two
paragraphs, a line on the strongest pillar and where the rivals had gone,
and four cream cards side by side, each three lines and a "More" with the
rest, its choose button arming in place (Plan 85D; cut down in Plan 95F).
It read like any other letter.

## 1. The PR

- **The letter** (`SpecializationLetter`): the stop's card is narrow now.
  From the board, dated; *A specialization*; one sentence on where the
  college stands, by the route that brought the offer (Plan 95R, the
  intro's first sentence, now `CHOICE_WORDS.offer`); the four pillars'
  ranks in their colours; *Convene the board →* and *Not this year*.
- **The page** (`SpecializationPage`), over everything as the Final
  Report's and the summer's admissions are, but opened from the letter:
  `App.tsx` keeps whether it is open, against the offer's year, so an offer
  put off is a letter again next summer; `InterruptModal` shows it over the
  inbox, which still holds the stop. Close and Escape go back to the letter.
  - The board's room: dark walnut (`--board-room`), the pennant in the
    corner, *What will ‹the college› be known for?*, and the pillar rule
    under it (moved here from the letter) with what stays empty.
    *Not this year* and Close at its head, prestige and rank beside them.
  - **Four panels**, each in its pillar's colour: the History tab's
    pigments, lit a step for the page (`--pillar-*-lit`) and deep enough
    for cream text at 4.5:1; its glyph (the one History › Prestige uses,
    now `icons.tsx`'s `PILLAR_ICONS`) in a medallion; its name and what a
    college with it is known for; the strongest pillar tagged.
  - **What it builds, drawn** (`specializationPreview.tsx`), by the map's
    own art, fitted and kept as markup as the build menu's tiles are
    (`BuildThumb.tsx`'s `FittedDrawing`): the Faculty Training Institute,
    the Research Park and the Athletic Performance Complex finished on a
    plate of grass, in the college's vernacular, with *Capital project ·
    $30M*; for student life, the downtown's street where it is first
    dressed, full grown and dressed for a gala in the college's colours,
    shops and strings of lights from the ring beside the parcel on their
    own plate with the road along it.
  - **Where it stands**: the rank of 100 and the value of 150, a bar to 150
    whose last stretch (the share only that specialization fills, 150 less
    its points) is hatched, the top rival specialist marked on it and
    named, how many rivals have chosen it, and the share in points of
    prestige.
  - **Adds** and **Fills** (the card's face from Plan 95F), the rest of its
    detail (the share in the pillar's own points, every mechanic) behind a
    "?"; a standing Research Park's note (Plan 85F) under them; the
    comparison, prestige and rank were the share full today; *Choose
    ‹pillar›*.
  - **Choosing asks twice** (Plan 47): the panel lifts and is ringed, the
    others dim and go inert, and a bar in the pillar's colour holds the
    foot of the screen: *Specialize in ‹pillar›, for good?*, the warning
    and what comes first (the card's first mechanic), Back and Confirm.
    Escape backs out.
  - The panels drop in one at a time as the page opens, each landing a
    little past its place and settling; under reduced motion they
    are there at once. Two columns under 1100 px, one on a phone.
  - The letter does the page's work while it is read: the standings and
    each share full today are read once for the state and kept, and the
    four drawings are made one to a task and kept, so opening the page
    no longer stops the main thread for 100–150 ms as the panels start
    to fall (measured on the production build).
- **Words** in `specializationData.ts`'s `CHOICE_WORDS`: `intro` and the
  strongest line go (the letter has `offer`, the page the rule), as do
  More and the card's long lines, now behind the "?".
- **Tests**: `test/specialization-page.test.ts` (the letter, the page
  shut and open, each panel's figures and bar, the drawings and the
  downtown's slice for four names); `specialization-choice.test.ts`
  checks the offer, the question and the second ask in place of the
  intro; `modal-layout.test.ts` has the letter narrow.

## 2. Decided by the owner

| # | Question | Decided |
|---|---|---|
| 1 | A bigger moment how? | **A short letter, then a full-screen page.** |
| 2 | The choices? | **Four big panels, distinct colours and icons**, the new buildings drawn in them, the college's standing in each. |
| 3 | The mock-up? | **"It's great. Build it in the game."** |

## Left for the owner

- **The second ask is the page's own bar**, not `ConfirmButton`'s arm in
  place: the decision has the screen, and the bar says what is lost. Its
  button keeps the register's plain *Confirm* (the glossary test's), but
  it is the primary fill, not the armed pink.
- **The pillar colours are new tokens** beside History's, the same four
  pigments a step brighter; History's are left as they were.
- **[progression.md](../design/progression.md) says the milestone is the
  guide's top 20; the code's `SPECIALIZATION_MILESTONE_RANK` is 30.**
  Found while writing this, and left: not this plan's to settle.

## Rules

- No save version change, no rule or number moved: the page reads what
  the card read (`milestone.ts`), and `RESOLVE_SPECIALIZATION` is
  unchanged.
- `npm run build`, `npm run lint`, `npm test` and `npm run test:slow`;
  checked in the browser at 1440×900 and at phone width on a Guided save
  at the offer (Year 23, `npm run scenario -- --player Guided --year 40
  --modal specialization`), through Convene, Choose and Confirm.
