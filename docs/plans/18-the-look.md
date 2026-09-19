# Plan 18 — The look

*Planning document only — no gameplay code is changed by this file. Its job is
to take the decision that followed the September design review's §6 — that the
navy / parchment / brass register reads as an almanac but not as a game, and
that every tab is "a stack of parchment panels with a definition list in each"
— and the direction chosen from seven mocked-up alternatives, and turn it into
an ordered sequence of PRs that restyle the game without touching a single
rule of it.*

**Status: In progress.** PRs A and B have landed. Nothing here reads or
writes `GameState` except PR B, which adds one field to the university and
one to each rival. No PR in this plan moves a
number the economy depends on, so `npm run sim` is not part of its gate.

---

## 0. The direction: Varsity

Seven directions were mocked up on one canvas — the campus with its chrome,
the Curriculum tab, the summer admissions form, the Faculty board, and a
palette-and-type sheet for each — and one was chosen: **Varsity**. The
school's own colours, worn loud.

The premise is that the player's university has a colour pair the way it has
a vernacular, and that pair is the theme. A maroon-and-gold school gets a
maroon dock and gold chips; a green-and-white school gets a green one. Around
the pair, a fixed set: a cream ground, a navy outline ink, a quiet tint for
secondary chips, and one red for trouble. Everything you can press has a
3 px outline and a hard 4 px offset shadow; nothing blurs. Pills and chips
carry every label and state. The tab bar is labelled. Headline numbers are
short, rounded and sized like a scoreboard. Type is Bricolage Grotesque at
weight 800 for display and Archivo at 500–700 for text, self-hosted.

What it is not: a change to any screen's *information*. The department
board still draws its capacity meter on one scale; the curriculum still
has its forty-two rows; the summer form still asks the same two questions.
This plan changes how those things are drawn, and where a screen's shape
had already been faulted by the review (the 440 px modal, the unlabelled
icons, five button styles), the redraw takes the review's shape as well.

### What stays

- **The campus map's drawings.** The review called the map the most polished
  surface in the game, and every asset stays as drawn. The map's ground runs
  a step brighter and more saturated so it sits with the chrome; that is the
  whole of its change.
- **The startup facade** and the procedural portraits — both invent a shape
  rather than reach for a chart, and both keep it.
- **The seven school hues** (`schoolPalette.ts`). They were chosen to sit on
  parchment and they sit on cream just as well.
- **The shell's layout facts** (`docs/architecture/ui-shell.md`): the map in
  the middle, every tab a full-bleed screen, the dock laid over it, one
  Escape ladder. None of this moves.

### The map

| PR | Delivers | Depends on |
|---|---|---|
| 18A | The token layer and the dock: every colour, type, radius and shadow token re-pointed to the Varsity register; the two typefaces self-hosted; the toolbar, ticker, overlay, panel, modal and menu shells redrawn; the tab bar labelled | — |
| 18B | School colours: a pair picked at founding beside the vernacular, stored on `University`, written to the root's custom properties; rivals carry a pair too | A |
| 18C | The Curriculum tab: school cards as colour blocks, cells as outlined tiles with state chips, the drawer | A |
| 18D | The Faculty tab: the board's rows and meter, the cards with ringed portraits, the market as dashed cards | A |
| 18E | Interrupts: the modal as a cream card with a coloured header at the three widths Plan 16 gave it; the summer form; the milestone pennant; the annual report | A, B |
| 18F | The remaining tabs and popups: Research, Student Life, Athletics, Enrollment, History, Treasury, the build popup, the startup screen, the main menu | A |
| 18G | Docs: the register described once in `ui-shell.md`; the review's §6 reconciled; this plan closed | all |

Each PR is a screen or a shell, so each can be looked at on its own with
`npm run scenario` and the debug panel, which is how the mockups were judged
and how the PRs should be.

---

## 1. PR A — The token layer and the dock

The stylesheet already had a token block (eight type sizes, six radii, three
shadows, semantic colour in on-dark / on-light pairs) and 78 raw hex literals
beside it. The first PR does the mechanical thing: **re-point every token to
the new register and leave the old names in place**, so the whole game shifts
in one PR and the later PRs replace shapes rather than colours.

The new tokens, and what the old names now mean:

| Token | Value | Old names that resolve to it |
|---|---|---|
| `--school-primary` | `#7b1e2b` until PR B writes it | `--navy`, `--gold-dim`, `--brass-deep` |
| `--school-secondary` | `#f2c14e` until PR B writes it | `--gold` |
| `--school-on-primary` | `#f7f2e8` | `--ink-hi` |
| `--cream` / `--cream-hi` / `--cream-lo` | `#f7f2e8` / `#fffdf8` / `#e4ddd0` | `--parchment`, and the panel/card whites |
| `--outline` | `#1b2a4a` | the new border everywhere; `--ink` |
| `--ink-muted` | `#5a5f6b` | itself |
| `--display` | Bricolage Grotesque Variable | `--serif`, `--mono` |
| `--sans` | Archivo | the body |

Two of those deserve a word. `--mono` resolving to a grotesque is deliberate:
the monospace was there for tabular figures, and Bricolage has them
(`font-variant-numeric: tabular-nums` is set on the body). And `--navy-line`
and `--ink-lo`, the dark chrome's two quieter tones, are mixed from the
school primary with `color-mix()` rather than fixed, so a green school's
dock gets a green hairline without PR B knowing about hairlines.

The shadows become hard offsets in the outline colour. The radii step up
(4 / 8 / 10 / 14 / 16). The focus ring is the school secondary, 3 px.

**The dock.** The toolbar band takes the school primary with the secondary
as its top rule. The funds figure is the display face at weight 800; the
four headline stats become cream tiles with the figure over its label, the
scoreboard the mockup drew. The tab buttons carry their label beside the
icon at viewports 1400 px and wider — the review asked for labels "at
≥1280 px", and at 1280 the labelled row does not fit beside the funds and
the clock without wrapping the band to two lines, so the threshold sits
where the band stays one line — and the active tab is a secondary-filled
pill. The ticker becomes a cream strip. The build button is the one cream
control in the band, so it reads as the primary action.

**The shells.** The tab overlay is a cream screen with a display-face title
and a chip for close. A panel is a cream-white card with a 2 px outline and
no shadow. The modal is a cream card with a 3 px outline and the hard
shadow; its buttons are the secondary fill. The main-menu button and the
map's corner pills take the same outline-and-offset. The startup card
follows the panel.

**Fonts.** `@fontsource-variable/bricolage-grotesque` and `@fontsource/archivo`
(400–700), imported from `main.tsx` so Vite bundles the woff2 files; the
game never reaches for a font over the network. System fallbacks stay in
every stack.

**What this PR does not do.** It does not touch a tab's own classes beyond
what the re-pointed tokens do to them. Every tab therefore lands in a
half-state after A — cream and outlined where it used tokens, parchment-era
literal hex where it did not — and that is intended: PRs C–F each take one
screen and finish it, and the literal hexes are the list of what each one
has to replace.

**As implemented:** the school-colour tokens carry the mockup's maroon and
gold as defaults so the game has a look before PR B exists; PR B replaces the
defaults with the founding pick rather than adding new tokens.

**As implemented, second pass:** the dock as first landed was three rows
tall at 1600px — the next-step line across the top, the funds and the four
scoreboard tiles, then the tabs — because the mockup had been drawn with
short tab labels and a rounded money figure and the game has neither. The
band is one row now, by moving things out of it rather than shrinking them:
the school's name hangs as the mockup's **pennant** in the map's top-left
corner (`Pennant.tsx`, withheld while a tab is open), and the next step
rides at the right end of the log ticker, which was already one line of
guidance-shaped text. Inside the band the four stats are chips with a glyph
and a figure (the word in the tooltip and as hidden text), the gears are four
round glyphs, and the tab labels sit *under* the glyphs at 10px, the tab-bar
shape, which is what lets eight labelled tabs fit at 1600px; below that the
glyphs go alone, and below 1440px the funds figure steps down and sheds its
net so the row holds at 1280.

## 2. PR B — School colours

`University` gains `colors: { primary: string; secondary: string }`, picked on
the startup screen from an authored list of pairs (eight to twelve, each a
real collegiate pairing with a name — "Maroon and gold", "Navy and white",
"Green and gold" — so the picker reads as choosing an identity rather than a
hex value), shown beside the vernacular picker with the facade previewing
the banner in the chosen pair. `SAVE_VERSION` bumps.

`App.tsx` writes the pair to the root element's custom properties whenever
`s.self.colors` changes, which is once per run. Nothing else in the game
reads the colours: they are presentation, and the one place they might
become mechanical — a rival's pair in the annual report and the playoff
bracket — is authored data on `Rival` in the same PR, unread until PR E
draws the bracket in both schools' colours.

The authored pairs must pass the contrast check the mockups were built to:
cream text on the primary at 4.5:1, primary text on the secondary at 4.5:1.
A pair that fails is not offered.

**As implemented:** ten pairs, and the rule is pinned by
`test/school-colors.test.ts` rather than checked by hand ("Burnt orange and
cream" and "Slate and copper" failed it and were dropped). Rivals' pairs are
not authored: they are dealt off the rival's id by `rivalColorsFor`, the way
the rival table already derives its athletic strength and two standings —
ninety-nine hand-picked pairs would have been a table of arithmetic nobody
keeps consistent. The facade previews the pair as two banners hung from the
band at either end of the wall rather than by recolouring the banner text,
which is engraved stone and stays stone; and the startup screen applies the
pick to the stylesheet's root as the player moves between pairs, so the
card's own chrome previews the theme too.

## 3. PR C — The Curriculum tab

The school level becomes seven colour blocks in their `schoolPalette` hues,
each with its motif at 30 px, the school's standing as a chip, a chunky
progress pill and its count; the block with something ready carries the
outline and offset. The lane level's cells become outlined tiles: filled in
the school hue when offered, cream with the hue's outline while developing,
cream-white with the outline and offset when ready, red-outlined when
blocked, dashed when locked, and the secondary fill on the chip that says
why. The drawer follows the panel. The `Develop N` button is the secondary
fill with the outline and offset, the one primary action on the screen.

## 4. PR D — The Faculty tab

The "what next" strip becomes a row of pills, each led by a chip naming the
verb (TAKE, SEARCH, OVER). The board's divisions are chips in the division's
own school hue; a row is an outlined rounded row, its meter 14 px with
rounded ends and a pinned marker, its state a filled chip. The expanded
department is an outlined card with the offset; the people inside are cards
with the portrait in a ring of the school primary, the rank as a chip, two
chunky bars, and salary and load as pills. A listing is the same card with
a dashed outline and a secondary chip that says "on the market".

## 5. PR E — Interrupts

The modal keeps Plan 16's three widths and takes the cream card with a
coloured header band: the school primary, the secondary as its rule, the
title in the display face, the one number that matters as a cream tile at
the header's right (the pool on the summer form, the rank on the report).
Sliders are 10 px with the primary as accent. The cohort squares become
pills with the count in a filled bead. Projections become three navy tiles.
The milestone modal becomes the pennant moment the mockup promised: the
school's two colours, big type, one line. The annual report's table is a
table.

## 6. PR F — Everything else

Research, Student Life, Athletics, Enrollment, History and Treasury each get
one pass replacing their remaining literal hexes with tokens and their
panels' inner shapes with the card anatomy (eyebrow, name, chip, number).
The build popup's category tabs become chips and its tiles take the outline.
The startup screen's card follows the panel and gains PR B's picker. The
main menu popup follows the panel.

## 7. PR G — Docs

`ui-shell.md` gains a short section, *The register*, saying what the tokens
are and the two rules that hold across every screen (outline and offset on
anything pressable; state as a chip, never a coloured card). The review's
§6 is left as it was written — it is a record — and `BACKLOG.md`'s
"Art and presentation" line is rewritten to say what is still open after
this plan, which is the map reading the simulation and nothing about chrome.
