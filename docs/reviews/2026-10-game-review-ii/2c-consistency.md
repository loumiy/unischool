# Appendix to area 2: UI consistency against the register

Plan 86, area 2. Commit read: `4062bfb`. The fonts, sizes, weights, colors, buttons, close controls, headings, numbers, dates, words and spacing were checked against the register as Plan 76H and 76E rewrote it (`docs/architecture/ui-shell.md`, sections "The register" and "Numbers") and against Plan 47's glossary (`docs/plans/47-one-voice.md` §2, Plan 76F). The screen gallery (`data/gallery.md`) is the view of what a player sees. One reader (a model) did the audit; the October review's scripts were working files and were not kept, so the counts below were taken again with `grep` over `src/styles.css` and the components, and are cruder than October's parsed ones where they differ.

- **Paths.** `src/…` is relative to `unischool/`.
- **Severity:** *major*, a player will notice it and be hurt by it; *minor*, noticeable but harmless; *polish*, a clean-up.
- **Not counted:** the map's drawings and the portraits (art), the debug panel, and text inside a drawn SVG (the register sizes it in the drawing's units).

---

### 1. The register on `HEAD`

The October review's main complaint about the register (2c §1c: no type scale, no spacing scale, no number rule, no button, close, heading or tooltip rule) is answered. The register now states:

| # | Rule | Where |
|---|---|---|
| R1 | Three faces: display (Bricolage 800) for titles, figures, chips and buttons; sans (Archivo 400–700) for prose; mono (Azeret) for the funds counter and its weekly net alone. | "Tokens" |
| R2 | A type scale `--text-2xs…xl` (10–17 px) and four display sizes `--text-2xl…5xl` (22, 26, 32, 44 px), all times the text-size setting. Nothing below 10 px. | "Tokens" |
| R3 | A spacing scale `--space-2…32` (2, 4, 6, 8, 12, 16, 24, 32 px) and two insets, "adopted as rules are touched". | "Tokens" |
| R4 | Outline and offset on anything pressable; one primary (secondary-fill) action per card. | "The two rules" |
| R5 | State is a chip, never a colored card. | "The two rules" |
| R6 | One button base and four roles: primary, cream, quiet, destructive. Asking before a loss is `ConfirmButton`, armed label "Confirm — ‹what is lost›". | "Buttons" |
| R7 | One close control: the round ✕, and the "Close ✕" pill on a full-bleed tab. | "The close control" |
| R8 | Six heading levels: screen, dialog, panel, section head, eyebrow, dateline. Sentence case; capitals for eyebrows and chips only. | "Headings" |
| R9 | Money by surface (`money` in sentences, `moneyShort` on tiles and chips), one precision per figure, true minus, "Nw", one game date "Year 9 · Fall term · Week 2" for the dock and every dated letter; "the log keeps its compact 'Y9W2' stamp". | "Numbers" |
| G | Plan 47's glossary: one name per thing ("program slot", "course slot", "the guide", "the standings", "Spring term", "left unanswered" for a default, …). | Plan 47 §2 |

### 2. Counts

| Measure | October | `HEAD` | Detail |
|---|---|---|---|
| Font sizes | 17 declared (9 off the scale) | **11 tokens, 4 literals** | 424 of 428 `font-size` declarations use a token. The four literals are SVG text (two 10 px, the career chart's 8 px band label, the satisfaction dial's 17 px) and one `calc(26px × scale)`. |
| Font weights | 5 | 5 | 400 ×8, 500 ×6, 600 ×63, 700 ×71, 800 ×170. |
| Faces | 3 (+2 in the share card) | 3 (+2) | Mono is now the funds counter's alone, as R1 says. The share card's fonts were left (Plan 76H skipped F2). |
| Spacing values | 30 px values | **25 px values; 16% on tokens** | 1,008 margin, padding and gap declarations; 166 use a `--space` token. The most used literals are 8 (128), 6 (121), **10 (103)**, 4 (97), 2 (58), 12 (57), **14 (55)**, **3 (39)**, 16 (36), **5 (30)**, **7 (25)** and **18 (15)**: the bold ones are off the scale. |
| Corner radii | 9 literal radii in 22 declarations | 21 declarations with a literal radius | The register calls a literal radius a departure. |
| `!important` | (many, on `.modal button`) | 20 | None on buttons; `.modal p`'s margins, as Plan 76H noted. |
| Buttons with no class | 46 of 213 | 36 | A bare button in `.modal-actions` is primary by rule, so most are deliberate. |

### 3. What became of the October departures

| October | What | `HEAD` |
|---|---|---|
| §3.1, N1 | Money two ways for one kind of figure | **Fixed.** `format.ts` holds `money` and `moneyShort`; build tiles, salary tags and chips are short, statements long; `test/number-format.test.ts` scans `src/` for a hand-written "$" or `toLocaleString`. Faculty tiles read "$285k/yr", the person page "$285,397/yr" in its sentence. |
| §3.2, C1 | Low-satisfaction chip pink on cream | **Fixed.** `.stat-warn`, `--bad-on-light` (5.9:1; 5.5:1 in safe mode). |
| §3.3, N4 | Prestige and satisfaction at two precisions | **Fixed.** Prestige reads one decimal, floored, everywhere ("44.1" in the dock, "44.1/55.0" in the ticker); satisfaction whole. |
| §3.4, B2/B3/B11 | Quiet buttons that look disabled; a grey browser box | **Fixed.** `.btn-quiet` keeps the outline and offset; "Show the rest of the market" has a surface. |
| §3.5, S2/S3/K4 | No heading hierarchy | **Fixed.** The six levels are in `styles.css`; every full-bleed tab uses the 32 px screen title; the Faculty tab's panels are panel titles. |
| F1 | Mono beyond the funds | **Fixed** (funds counter only). See §4, D9 for how it now reads. |
| §4.4 | Close controls in six looks | **Fixed.** `.close-btn` with `CloseIcon`, and the tab's "Close ✕" pill. |
| §4.4 | Confirmations built by hand | **Fixed** for the October list (Dismiss, New game, the coach release, program moves, the import), each "Confirm — …". **Two new ones depart** (§4, D1). |
| §4.6 | Capitalization | **Fixed** for the October list (Build groups, "Basic needs", "Fall term"). One new departure (§4, D6). |
| §4.7 | Numbers, money and dates | **Fixed**, with one new departure in the inbox (§4, D5). |
| §4.8 | No spacing scale | **Partly fixed.** The scale exists; 84% of spacing declarations are still literals, 7 of them off-scale values in common use (§2). Plan 76H chose to adopt it "as rules are touched". |
| §5 | The register stale on tabs, gears, toasts, mono, palette, camera, `L` | **Fixed.** Each is in the register as the code has it, and the inbox, the arrivals, the dock's fold and the committee chip have been added since. One glossary entry is stale (§5). |

### 4. Departures on `HEAD`

Most are in the screens Plans 77, 84 and 85 added, and are small. They are ranked by how much a player would notice them.

| # | Departure | Where | Rule | Severity |
|---|---|---|---|---|
| D1 | **Two armed labels break the confirm rule.** The specialization's is "Confirm: this is for good", which says nothing about what is lost: the other three pillars' shares, for good. The training pick's is "Confirm: {course} moves". Both use a colon where every other armed label uses "Confirm — ". The specialization's should name the loss: "Confirm — research, student life and athletics stay empty for good". | `data/specializationData.ts` (`CHOICE_WORDS.confirm`), `data/trainingData.ts` (`trainArmed`) | R6 | minor |
| D2 | **A bare "slots" on every faculty tile.** The tile's load chip reads "9/10 slots", and the suggested move's tooltip reads "Move … to Hall, slot 2". The glossary says a professor's capacity is always "course slot" and a hall's "program slot", never a bare "slot", because the word means three things (Plan 76J). The tile's own tooltip says "course slots". | `tabs/FacultyTile.tsx:209`; `components/BuildingInfoPanel.tsx:282` | G | minor |
| D3 | **Fifty Dismiss buttons on the grid's face.** Every tile on the faculty grid carries its destructive Dismiss (`.btn-danger`) beside More, so a year-40 grid has 79 of them in a 293-control screen. The register reserves a card's face for its one primary action; a loss that needs two clicks still belongs inside the person page, where the other actions are. | `tabs/FacultyTile.tsx:255-262` | R4 (one primary per card), load | minor |
| D4 | **A fifth button role.** Train (`.btn-train`) is a cream button with a school-primary outline and ink: neither primary, cream, quiet nor destructive. | `styles.css:1963-1965` | R6 | polish |
| D5 | **The inbox stamps letters "Y31W1".** The list pane builds its own compact stamp (`InboxTab.tsx:55-58`, outside `format.ts`) on letters and bulletins alike, and a milestone row reads "Y3". The register keeps "Y9W2" for the log only and gives "every dated letter" the long form; the reading pane does use it ("arrived Year 31 · Fall term · Week 1"), so one letter carries two dates. | `components/InboxTab.tsx:55-58, 210, 226` | R9 | polish |
| D6 | **"Spring Term" capitalized.** The downtown's help and empty line say "the Spring Term's fourth week"; the glossary and the dock say "Spring term". | `data/downtownData.ts:231, 240` | G (case) | polish |
| D7 | **"took its default".** The Answered pane says "Nobody answered in time, so it took its default." The glossary's word for a default is "left unanswered". | `components/InboxTab.tsx:464` | G | polish |
| D8 | **"Answer to go on" looks like a button.** While a stop waits, the tab's Close pill becomes a dashed-outline pill with the same shape, size and place, but it does nothing. A thing you cannot press sits flat. | `components/TabOverlay.tsx`, the held state | R4 | polish |
| D9 | **The funds figure spaces its commas.** In Azeret Mono every glyph has the same advance, so "$41,657,506" reads "$41 , 657 , 506" in the dock at both sizes (the gallery's every capture). The register chose mono so the digits hold their columns; a tabular-figure display face would do that without the gaps. | dock, `.funds` | R1 | polish |
| D10 | **Seven rankings or six standings.** History's standings help says "Seven rankings, one field" (prestige, the four pillars, access, financial strength). The Final Report charts "The six standings" (it leaves prestige out), and Plan 47's glossary still says "Its six lists are the standings (six rankings, one field)". A player who reads both counts differently. | `tabs/StandingsPanel.tsx:32`; `data/reportData.ts:104, 112`; Plan 47 §2 | G | polish |
| D11 | **"Distinguished" names a professor's rank and a program's stage.** The tile's rank line reads DISTINGUISHED / FULL / ASSOCIATE (`facultyQualityTier`), and "distinguished" is the glossary's word for a program's (and a school's) top stage. The person page's Recognition then says "Taught in Political Science, a distinguished program", under a professor whose rank is also Distinguished. | `tabs/FacultyTile.tsx:150` | G | polish |
| D12 | **Spacing literals.** As §2: 10, 14, 3, 5, 7 and 18 px are the six most common off-scale values. New rules from Plans 84 and 85 add more (`.faculty-tile` 6 and 10 px gaps, `.faculty-tile-top` 10 px). | `styles.css` | R3 | polish |

**Clean on the new screens.** The inbox follows the register throughout: its filters are the segmented control, its reading pane's actions are a `.modal-actions` row, its back button is quiet, its subject is a dialog title and its labels are eyebrows. The specialization's four cards each have one primary action (Choose) and an eyebrow over a panel title. The Faculty grid's tiles are pressable cards with outline and offset, state on chips (Retiring, N waiting, Trained), and teaching and research as the course grades' own chips. The person page's chart text is SVG and is the one 8 px label in the stylesheet.

### 5. The register is stale here

- **Plan 47's glossary** says the standings are "six lists" and "six rankings, one field"; since Plan 85 the History tab shows seven (D10).
- **The register's "Two rules"** list Develop, Appoint, Commit and Continue as the primary actions; Choose (the specialization) and Train are new card actions it does not place, and Train has its own look (D4).
- **The register's tab list** names "the Inbox" among the full-bleed screens, but not that a stop turns its Close into "Answer to go on" (D8). The inbox section of the register describes it in prose ("Close gives way to …"), not as a control.
