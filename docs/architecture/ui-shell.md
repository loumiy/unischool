# The shell, the tabs, and the keyboard

The **campus map** holds the middle of the screen at all times. The build menu
opens over it, and every other view — Curriculum, Faculty, Research,
Students, Athletics, History, the Inbox, Treasury — opens as a dismissible
**full-bleed screen** on top of it: the tab takes the viewport and the dock
(log ticker + toolbar) lays over it. Every tab, the same way. The map is what a
player returns to, by the home button at the head of the toolbar's icon row,
the panel's own close button, or `Esc`.

That is a **layout fact, not a mechanical one**: no system reads the map, and
nothing gained authority over the sim by moving to the middle of the screen.

The layering is the crux — a dialog sits *above* the chrome because it stands
in front of the screen; a full-bleed tab *is* the screen, so it drops below and
reserves the dock's measured height instead of drawing under it.

## Tab gates

Two tabs open from milestones on the ladder (`data/ladderData.ts`, read by
`TabNav.tsx`'s `tabAvailable`): Research once a lab is finished, Athletics
with the first sport club. A milestone can also open a **section** of a tab
that is already open (its `sections`, read by `sectionAvailable`). Students
(the one tab that Enrollment and Student Life became) is open from the first
week with the satisfaction breakdown, the demands and the student body; its
guidebook, its clubs and chapters and last summer's funnel wait for the
first commencement (Plan 78B). History is open from the first week with
Prestige and the guide (Plans 78C and 80C); its record of the years (the Final Report's draft, the promises,
the chronicle, the charts and the table) waits for the first commencement,
and one note says so until then (Plan 78C). A section no milestone names is
somewhere a link can land: the tab scrolls to its `data-section`
(`sectionTarget.ts`). The Research tab lands on a lab the same way
(`data-lab`, from a lab's map panel: "lab:<id>", or "start:<id>" with its
project choices open; Plan 80B). A milestone is never undone, so a tab once open stays
open. The first time a gated tab
opens the activity log says so, unless its milestone's letter already
does.

## Time

Five gears: **Play** (a 5,000 ms week — a decision should feel like a
commitment), **2×**, **4×** and **8×**, the last two earned by the
administration's seats (`systems/delegation/seats.ts`'s `speedLock`), and a
sandbox **Fast** behind the playtest flag (`src/engine/useGame.ts`'s
`SPEEDS`). A gear is a speed, not a skip: the player
still watches the clock and can still intervene, and there is deliberately no
advance-to-next-event. Waiting to afford something is load-bearing in this
genre; the answer to *empty* waiting is to put something in the year, which is
what the curriculum on the map does, not a button that teleports past it.
Speed is purely how often the week-tick fires — the reducer advances exactly
one week per tick at every setting.

## The dock: ticker, toasts, the next step

The **log ticker** is one line, the newest log entry, directly above the
toolbar. Above it a **toast stack** shows the things that never stop the clock
— a course or building finished, a program founded, a petition, a paper, a
candidate in a short field, a project concluded without a report — six
seconds each, four at most (`Toasts.tsx`), each a button that opens the tab
it is about; an **arrival** (a matter or a letter reaching the inbox) carries
an Open button and stays eight seconds (in year one a founding note or a
milestone stays until opened or dismissed, Plan 78B), and none arrives while
the inbox is open. With Settings' "Pause when a matter arrives" on (the
default), a matter's arrival also pauses the clock and stays until it is
opened or dismissed; whatever the setting, a matter's final week, unopened,
pauses the clock once and the Inbox button pulses red (Plan 78E,
`systems/inbox/unseen.ts`; see
[interrupts.md](interrupts.md)'s "What does not stop the clock"). And at the
right end of the ticker line runs the **next step**: during the scripted first
year the latest letter's ask until it is done, and between letters a
satisfaction need under 50 (Plan 78B); afterwards a waiting letter's
ask — unless it has nothing to do this week, when it gives way (Plan 58) —
then the highest-value thing on offer: a program gone dark that the payroll or
the market can staff, ahead even of a letter (Plan 60); a program that can move to its
school's hall (Plan 55: the line opens the hall the program is in, its tile
open on the move, Plan 78D), or the next hall to site when a school has no hall
to move to; a hall with a free program slot while programs are offered (an offer's
own school's hall first), a claimed hall's room for its own school's programs
(Plan 78D), or the next hall when nothing on offer has one; a
program one course from established; a satisfaction attribute under 50; an
idle lab —
recomputed from state on every render (`src/systems/guidance/nextStep.ts`). A
reading, never a queue: nothing is ticked off, and the line goes quiet when
nothing is on offer. The log on the left says what just happened; the step on
the right says what to do about it.

## The inbox

Everything addressed to the president that does not stop the clock is in one
tab (Plan 77, `InboxTab.tsx`), laid out like a mail client: a list on the
left, every item collapsed to its sender, subject and a line of preview and
grouped by tier (to decide, letters, bulletins), with a search and filters,
and on the right a reading pane that shows the selected item whole, with its
answers. A row to decide carries a navy rule down its edge, red in its last
week, and its weeks left where a letter has its date ("Final week" in the
last, in the list and the reading pane alike); an unread letter has a
gold dot and a bold subject. Opening a letter reads it. A letter (a
milestone's, a founding note) leaves the inbox a year after it arrives,
read or not (Plan 80D, `inbox.ts`'s `LETTER_WEEKS`), as a bulletin leaves
after a term. The toolbar's Inbox
button counts only what wants an answer, the stop included, and `I` opens
it; the "To decide" filter counts the matters alone (Plan 78E). Nothing floats
over the map any more: the event panel and the note stack it replaced both
stepped aside whenever a tab was open.

What stops the clock is answered here too. A pending interrupt is pinned first
under **The clock waits** and shown in the reading pane in its modal card; the
shell opens the inbox on it, shuts every other way off it (the toolbar's other
buttons are disabled and Close gives way to "Answer to go on"), and once it is
answered returns the player to the view they were on, or opens the build menu
when a letter was answered with "Continue and open Build" (Plan 78B). Only the
Final Report's page still stands in front of the screen.

The **toolbar** itself is three zones in one band. The left zone stacks the
funds figure with its weekly net over four stat chips (rank, enrolled,
prestige, satisfaction). Each chip is its word over its figure, in the
display face at `--text-2xs` over `--text-md`; on a phone the word is hidden
and the glyph stands in for it, as the chips were before (Plan 78C). The word
takes the glyph's place rather than joining it, so the left zone is no wider
than it was: the band still fits one row at 1440 with every tab open, and
at 1280 once History, Research and Athletics are all open it wraps the clock
to a second line, as it did before.
Each chip keeps its sentence as a tooltip: satisfaction's names the lowest of
the five needs and its figure (Plan 78B), and rank's says that the rank
follows prestige, which rises at the summer by at most its step, read from
`prestigeSystem.ts` (Plan 78C). Three chips are doors, like the funds figure:
prestige opens History › Prestige (its breakdown and nothing else), rank
opens History › the guide (the guide's table, the top fifty and, below them,
the college's own row with its neighbors; Plan 80C), satisfaction opens
Students › the satisfaction breakdown, each a button named with its figure
("Prestige 51.5 — open History, Prestige"). The map is `data/statChips.ts`'s
`chipDoor`; enrolled is a figure only. The right zone stacks the clock over
five round gears (pause, play, 2×, 4×, 8×), with the **committee chip**
beside the gears (Plan 80E): "Committee 3 of 4", the courses the curriculum
committee is writing of the most it can write at once, drawn as the stat
chips are, and on a phone as the curriculum glyph beside "3/4". It is
flagged with the tabs' alert badge and a border in the school's second
color while the committee has room and some course could start now
(`techSystem.ts`'s `committeeStatus`), its sentence says which, and it is a
door to the Curriculum's committee panel (the `curriculum.committee`
section, "Committee 3 of 4 — open Curriculum, Committee"). It sits on the
gears' row because the row has room there: beside the stat chips it pushed
the band to two rows at 1440 and the chips past a phone's edge. Between the
zones, in one row at every width, is the labelled tab row — the word under
each glyph — and Build. The two side zones stack precisely so that row
always fits. On a phone the band folds to its figures while a tab or a
popup is open, and the tabs scroll beside Build (Plan 76I). The school's
name is not in the band: it hangs as a **pennant**
in the map's top-left corner in the school's colours (`Pennant.tsx`), one
name in one face, withheld while a tab is open because the tab's own title
takes that corner. It renames nothing (Plan 80D): the college's one rename
is a field in the charter's letter, in the inbox's reading pane
(`InboxTab.tsx`'s `CharterAnswer`).

## The register

Every screen is drawn from one small vocabulary (Plan 18, the *Varsity*
direction), held as custom properties at the top of `src/styles.css`. The
parts built from it (buttons, the close control, segmented choices, headings,
tooltips, the warning note) are drawn once, in the block "The register's
parts" near the top of the same file; a component's own rule keeps only its
geometry.

### Tokens

- **The school's two colors are the theme.** `--school-primary` and
  `--school-secondary` (with `--school-on-primary` and `--school-on-secondary`
  for what reads on each) are written to the root by `components/theme.ts`
  from the pair the player picked at founding (`data/schoolColors.ts`), so
  the dock, the pennant, the modal bands, the meters and the primary buttons
  all change with the school. The map's colors context defaults to the same
  founding pair.
- **The fixed palette.** A cream ground (`--cream`, `--cream-hi`,
  `--cream-lo`), one outline ink (`--outline`), `--ink-muted` for secondary
  text and `--parchment-line` for rules and disabled edges. The signals come
  in pairs, one for the dark chrome and one for paper: good (`--ok-on-*`),
  bad (`--bad-on-*`), warning (`--warn-on-*`), and the danger set
  (`--danger-ink`, `--danger-bg`, `--danger-line`) for armed confirmations.
  The course grades have their own ink and ground (`--grade-a…f`,
  `--grade-*-bg`), and the Enrollment cohort bar its eight pigments
  (`--cohort-1…8`). The color-vision-safe setting (Plan 34) moves the good
  and bad signals to blue and orange, and the grades with them.
- **Illustration, not chrome.** The hall of fame's frames are wood and brass
  (`--frame-*`), and the map's drawings keep their own literal colors; the
  palette above is for the interface.
- **Three faces.** `--display` (Bricolage Grotesque at 800) for titles,
  figures, chips and buttons; `--sans` (Archivo, loaded 400–700) for prose
  and detail lines; and `--mono` (Azeret Mono) for the dock's funds counter
  and its weekly net alone, so the digits hold their columns as it ticks.
  Every other figure is the display face with tabular numerals. All three
  are self-hosted through `@fontsource` imports in `main.tsx`. The display
  face has no italic, so it is never slanted; a difference is marked by
  weight, color or opacity.
- **Type scale**, each size times the player's text size (Plan 34):
  `--text-2xs` to `--text-xl` (10, 11, 12, 13, 14, 15 and 17 px) for text,
  and four display sizes, `--text-2xl` to `--text-5xl` (22, 26, 32 and
  44 px), for headline figures and titles. `body` is `--text-base` and
  controls inherit it, so the text-size setting reaches everything. Nothing
  is set below 10 px. (Text inside a drawn SVG, a chart's ticks or a dial's
  figure, is sized in the drawing's own units.)
- **Spacing**: `--space-2` to `--space-32` (2, 4, 6, 8, 12, 16, 24 and
  32 px). Two insets: `--inset-panel` (16 px) for a panel, a note or a
  popup, and `--inset-card` (8 by 12 px) for a card inside one. Dialogs use
  24 px, the founding card 32. The scale is adopted as rules are touched;
  px throughout, no em or rem.
- **Corners**: `--radius-xs` to `--radius-xl` and `--radius-pill`; a
  literal radius is a departure.
- **Hard offsets, not blurs.** `--shadow-1/2/3` are the outline ink offset
  by 2, 4 and 6 px. Nothing in the register blurs.
- The parchment-era names (`--navy`, `--gold`, `--gold-dim`, `--parchment*`,
  `--ink*`) still exist and resolve into the register, so a rule that cites
  one is not wrong, only old; new rules cite the new names. The `--serif`
  alias is gone.

### The two rules

Two rules hold across every screen, and they are the ones a new panel should
be checked against:

1. **Outline and offset on anything pressable.** A button, a tile you can
   pick, a card that opens: 2 px of the outline ink and `--shadow-1`. A thing
   you cannot press sits flat — a panel is the outline with no shadow, a
   reading is a line. The secondary fill is reserved for **the one primary
   action on a card** (Develop on a program's row, Appoint on a candidate,
   Commit on a lab's proposal, Continue in a dialog): one per row, dialog or
   drawer, never two on the same card.
2. **State is a chip, never a colored card.** Over, short, listed, done,
   champion, full, deficit: a filled pill with a word in it, on a card that
   stays cream. The card's own color is only ever the school's (a group
   header on the Curriculum tab, a committed scholar's left rule) — a red
   card would say the whole thing is wrong when one word is. A warning in
   prose is the warning note: red words beside a red rule on the card's own
   ground.

### Buttons

One base: 2 px of the outline ink, `--shadow-1`, a pill corner, the display
face at 800, and **sentence case** (no button is put into capitals by CSS).
The fill says the role:

| Role | Fill | For |
| --- | --- | --- |
| Primary (`.btn-primary`, a dialog's `.modal-actions` button) | the school's secondary | the card's one primary action |
| Cream (`.btn`, `.menu-btn`, `.panel-action`, …) | `--cream-hi`, the secondary on hover | everything else that acts |
| Quiet (`.btn-quiet`) | none, the same outline and offset | the lesser choice beside a primary: Cancel, skip, decline, Put it down, New game |
| Destructive (`.btn-danger`) | none, a red outline | dismissing, releasing, demolishing, calling off, winding up |

Disabled is faded and flat, whatever the role; a pale edge alone never means
"quiet". A dialog's action row is `.modal-actions`: its bare buttons take the
primary fill, and a classed button in it (a skip, a decline) keeps its own
role, so no rule needs `!important`. Choice cards (a decision's choices, the
athletic director's candidates, an instructor, a research offer) are cards
with the same outline and offset, the label in the display face and the
detail in the sans. A **segmented choice** (`.segmented`) is a row of cream
pills with the picked one in the secondary fill: the Faculty views, the
build categories, the athletics subsidy, the settings, the tree species, a
seat's policy. An arrow (→) sits on a button only when it changes screen
("Open in Curriculum →").

**Asking before a loss** is `ConfirmButton` (Plan 47), everywhere: the first
click arms it and the armed label reads "Confirm — ‹what is lost›" ("Confirm
— release; the post stays open", "Confirm — English closes 8 weeks"); armed,
any button turns pink with the red outline; blur or Escape disarms it. A
button that loses something only sometimes asks only then (`needsConfirm`):
Found asks only when another school's program would take a claimed hall's
program slot ("Confirm — this takes one of the six program slots Science
needs", Plan 78D).

### The close control

A **round ✕** (`.close-btn`, 26 px) closes a panel, a popup, a drawer or a
toast; a full-bleed tab has the **"Close ✕" pill**
(`.tab-overlay-close`) instead, the one close with a word. One glyph,
`icons.tsx`'s `CloseIcon`; the multiplication sign is never a close.

### Headings

| Level | Size | For |
| --- | --- | --- |
| Screen title (`.heading-screen`) | `--text-4xl` | a full-bleed tab's title, the founding card; the three moments' inverted modal bands |
| Dialog title (`.heading-dialog`) | `--text-3xl` | a modal's band, the opening walkthrough's card, the subject in the inbox's reading pane |
| Panel title (`.heading-panel`) | `--text-xl` | a panel on a tab, a popup, the building panel, the course drawer, a front-screen card |
| Section head (`.section-head`) | `--text-md` | a section inside a panel or a dialog |
| Eyebrow (`.eyebrow`) | `--text-xs`, capitals | a label of three words or fewer above what it names |
| Dateline (`.dateline`) | `--text-sm` | a longer line above a title: a letter's "From the chair of the board · Week 1", the founding card's tagline |

All are the display face at 800. Titles and section heads are sentence case;
capitals are for eyebrows and chips only, never for a title or a proper
name. The game's own name on the title screen and the Final Report's page
title are the one hero size, `--text-5xl`.

### Floating layers

Named elevations: a **dialog** (a modal, the founding card, a front-screen
card) sits at `--elevation-dialog` (`--shadow-3`); a **popup** (the build and
log popups, the main menu, the building panel, the course drawer, the touch
bar) at `--elevation-popup` (`--shadow-2`); a **note** (the opening
walkthrough's card, a toast, a tooltip) at
`--elevation-note` (`--shadow-1`). One tooltip look (`.tooltip`): the cream
card with the outline, at the note's height, in the sans at `--text-sm`.

### Icons

`components/icons.tsx` holds every recurring glyph as a 24-unit line icon in
`currentColor`, sized by CSS: the dock and the build menu's icons, and the
controls — close, disclosure (a chevron), rename, release, remove, the
camera's turn (an arc round the ground, apart from the building's ⟳), the
map tools, and one set of status marks (done, pending, failed) for the
ladder, the promises and a course's prerequisites. The Students tab and the
dock's enrolled figure share the three-head icon.

### What this replaces

Plans 18 and 22 are left as written. Plan 18's "every remaining literal hex
is a token" now holds for the Enrollment cohort bar too (`--cohort-1…8`);
Plan 18 retired the mono, and the register brings it back for the funds
counter alone (Plan 76, default 2). Plan 22's list of `format.ts` helpers
names a `signedMoney` that no longer exists; the number rules are Plan 76E's.

## Numbers

Every figure a player reads goes through `src/format.ts`, under one
`Intl.NumberFormat('en-US')`: the game's text is English, so a German
browser reads "$1,234,567" and "4.5%" like any other. Nothing
player-facing calls `toLocaleString()` or writes a "$" by hand;
`test/number-format.test.ts` holds both.

- **Money, by surface.** `money` ("$1,234,567") where a sum is read
  exactly: sentences, tooltips, the Treasury's statement, a ledger's
  `<dl>`, the dock's funds and weekly net. `moneyShort` ("$2.7M", "$180k")
  where prices are compared at a glance: tiles, cards, rows, chips,
  buttons, salary tags, table cells and chart axes. The chronicle and the
  final report look back over fifty years and speak in round sums, so they
  take the short form too.
- **One precision per figure.** Prestige reads one decimal everywhere, the
  dock included, floored (`prestigeFigure`), so 69.96 is "69.9" and never
  passes a milestone it has not met. Satisfaction and its 0–100 attribute
  scores read whole, floored the same way (`satisfactionFigure`). A delta
  is built from the figures as shown, so "80, against 73" says "+7".
- **Counts** (`count`) are whole, with separators. **Fractions** are
  tight, "5/9" and "72/100" (`fraction`); a sentence says "5 of 9".
- **Percentages** (`pct`) are whole points. A rate of money (the draw, the
  endowment's return, a loan's interest) reads one decimal, "4.5%",
  wherever it appears.
- **Signs.** A hand-built signed figure goes through `signed`,
  `signedPct` or `signedMoney`: a true minus (−), a plus for a gain, and
  no sign on a change that rounds to zero.
- **Multipliers** read "×1.54", with no space (`multiplier`).
- **Durations.** Chips, buttons and map labels say "8w" (`weeksShort`),
  derived from the constant that sets them; prose says weeks, or whole
  years (`weeksProse`). Rates read "/wk" and "/yr", with no space.
- **The game date** has one form, "Year 9 · Fall term · Week 2"
  (`gameDate`): the dock, the title screen and every dated letter. The log
  keeps its compact "Y9W2" stamp. The one real date, a set-aside save's,
  is written in English (`calendarDate`); the Hall of fame's plaques carry
  game years only.
- **A warning on a chip.** A stat chip is cream, so its warning takes the
  paper red, `--bad-on-light` (`.stat-warn`), not the band's
  `--bad-on-dark`.

## Keyboard

The map is the screen the player spends the most time on and the one where the
mouse is most often already busy — holding a path stroke down, or carrying a
picked-up building toward its spot — so most of the game is reachable without
it.

| Key | Does |
| --- | --- |
| `W` `A` `S` `D`, arrows | Pan the camera. Held keys glide; two at once give a diagonal. |
| Middle mouse drag | Pan too, in every mode — including mid-stroke under a path tool, where the left button is busy painting. |
| Scroll / pinch, `+` `−` | Zoom. |
| `Space` | Pause, or resume at whatever speed was last running. |
| `1` `2` `3` `4` | Play, 2×, 4×, 8× (4× and 8× once the seats have earned them). (`5` is sandbox fast — see `playtestEnabled`.) |
| `P` | Arm the path tool. Left button draws, right button erases; a ghost tile marks the square under the cursor. |
| `Q` `E` | Turn the campus view a quarter turn; `Z` `X` tilt it flatter or steeper; `Home` returns to the opening view. On a touch screen the same moves are buttons in the map's folding "Map tools" pill (Plans 70F and 70G): zoom, turn, tilt and the opening view (Plan 80H took away the quad names' `N` and `Aa`). |
| `R` | Rotate the picked-up building 90°, same as the ⟳ on its footprint ghost. |
| `Esc` | One ladder, top down: the activity-log popup, then the build menu, then the open view; on the map, back out of the path tool, then a picked-up building, then an open info panel. |
| `Enter` | Dismiss the interrupt on screen (every type with a plain "continue", the summer's Review beat and a letter included — not its Admissions or Students beats, which are real choices). |
| `C` `F` `L` `I` | Open (or close) Curriculum, Faculty, Students, the Inbox. |

The plumbing is one module, `src/components/hotkeys.ts`: it owns the window
listener, the "not while the player is typing" guard, the rule that a key held
with Ctrl/Meta/Alt belongs to the browser, and which device the player is
currently driving with. That last one is what keeps `Space` honest: a focused
button answers `Space` natively, so the game must stand aside for a player who
tabbed to one — but a button that was *clicked* is focused too, which is how
`Space` came to re-click a tab icon instead of pausing. The modality is settled
by the interaction that chose the device (a pointer press, or `Tab`) rather
than by the key being arbitrated, because `:focus-visible` alone flips true on
that very keypress.

**The opening walkthrough drives the shell for the first minute.** A founding
from the startup screen opens with `s.events.opening.stage` at `'welcome'` and
the clock held (see [interrupts.md](interrupts.md)); `App.tsx` acts once on
each transition into a stage — opens the build menu for the hall, closes it,
drops the pickup and opens Founders Hall's panel when the hall stands (where
the first professor is appointed and the first program founded, Plan 80D),
starts the clock when the walk ends — through the same `setBuildOpen` and
`inspectHall` every other caller uses, so the one-slot rule holds. The card is
`OpeningCoach.tsx`, pinned top-right beside the main menu and the map tools,
with no backdrop so the screen under it stays workable (Plan 78F: top-center
it covered the hall the player had just set down, and top-left is the
building panel's). On a phone it spans the width at the top, and drops to the
foot, over the dock, while the hall's panel holds the top. The control each
step needs carries `.opening-target` (the Build button, the hall's tile,
Founders Hall's first free program slot in its panel on the map, English
among the offers, and the Found button). A skipped walk that left the hall
unsited keeps the Build button and the hall's tile rung while the clock
waits for it.

**The build menu's "!"** has one meaning, "something new to build here": a
category holds a tile the player has not seen, because the category has not
been opened since the tile appeared (`s.seen.buildableIds`). Opening the
category marks its tiles seen and clears it; the toolbar's Build button
carries the same mark while any category does. The menu's help says so
(Plan 78F). Its first tab is **Grounds** (the path and tree tools, the quads
and monuments; "Campus tools" until Plan 80B, its id kept); the rest are
categories (`facilitiesData.ts`'s `FACILITY_CATEGORY_OF`), and the gym, pool
and tennis courts sit under **Health** with the health chain, where their
capacity goes (Plan 80B).

What each key MEANS stays with the component that owns the thing it does —
speed on `StatusHeader.tsx`, pan/draw/rotate on `CampusMap.tsx`, the tab
letters and the whole `Esc` ladder on `App.tsx`, `Enter` on
`InterruptModal.tsx`. `App.tsx` owns `Esc` because it is the only place that
can see every rung, and it gates the map's keyboard off while something is on
top of it, so only one layer is ever listening.

**The build menu is not "on top" in that sense, and it is the one place the
gate is not a single switch.** It has no backdrop: the map stays visible and
clickable underneath it, and it is where the map's own tools are reached from
— a building is picked up in there and deliberately survives the menu staying
open, the path tool is armed in there and is deliberately dropped when it
closes. Working the map with the menu up is the main line, not an edge case.

So **the build menu takes exactly one key from the map, and it is `Esc`** —
because `App.tsx` owns one `Esc` ladder and two handlers answering the same
key is what arbitration exists to prevent. `hotkeys.ts` answers the question
twice: `mapBackOutLive` for `Esc`, and `mapControlsLive` for everything else
the map does (pan, `R`, `P`), which the menu leaves alone. Folding those
together produced the same bug three times — `R`, `P` and `W`/`A`/`S`/`D` each
went dead for exactly the stretch in which a player reaches for them. A tab,
the log popup and an interrupt still silence both.
