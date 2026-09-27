# Appendix to area 2: UI consistency against the register

Plan 73, area 2. Commit read: `58fa3fd`. The fonts, sizes, weights, colours, buttons, icons, capitalization, number and date formats and spacing were checked against `docs/architecture/ui-shell.md` and Plan 47, with the screen gallery as the view of what a player sees. The report follows unchanged except for heading levels. `2-ui-and-text.md` summarizes it.

Plan 73, area 2, "Consistency". This is a read-only audit. Commit read: `a520bbd` on `claude/plan-73-rqmosd`, working tree as found.

- **Paths.** `src/…` is relative to `/home/user/unischool/unischool/`. `docs/…` is relative to `/home/user/unischool/`.
- **Method.** The stylesheet was parsed into 5,845 declarations with selector and line (`cssparse.py`). The components and tabs were read with the TypeScript parser, not regexes (`jsxscan.cjs`, `numscan.cjs`, `glyphscan.cjs`, `headscan.cjs`). The button looks were computed from the parsed rules (`buttonlooks.py`). The scripts and their JSON output were working files and are not committed.
- **Screens checked.** Findings were checked against the captures in `node_modules/.tmp/gallery/` (the y8, founding, crisis, decision, milestone, rankings, summer and ad saves) and in `gallery-test/`.
- **Severity**, as Plan 73 defines it:
  - *major*: a player will notice it and be hurt by it.
  - *minor*: noticeable but harmless.
  - *polish*: a clean-up.
- **What is not counted as a departure:**
  - Map drawings, the startup facade and the faculty portraits. Plan 18 keeps their art "as drawn" (`docs/plans/18-the-look.md:44-49`).
  - The debug panel, which is for developers only.
  - The nationality flag emoji. They are authored in `src/data/facultyData.ts:446-500` but deliberately not rendered (`src/tabs/FacultyTab.tsx:56`).

---

### 1. The register: the rules found

#### 1a. `docs/architecture/ui-shell.md`

| # | Rule | Line |
|---|---|---|
| R1 | Every view except the map (Curriculum, Faculty, Research, **Student Life**, Athletics, **Enrollment**, History, Treasury) opens as a full-bleed screen. The map comes back through the home button at the head of the toolbar's icon row, the panel's own close button, or `Esc`. | 3-9 |
| R2 | Five tabs are gated by ladder milestones: Enrollment, Student Life, History, Research and Athletics. | 20-24 |
| R3 | There are four gears: Play (a 5,000 ms week), 2×, 4×, and a sandbox Fast. The dock shows "four round gears (pause, play, 2×, 4×)". Keys `1` `2` `3` are the speeds and `4` is sandbox. | 28-36, 63-64, 122 |
| R4 | Toasts last three seconds each, five at most. | 43-45 |
| R5 | The dock has four stat chips, each a glyph and a figure with the word in the tooltip, and a labelled tab row with the word under each glyph. The pennant is "one name in one face". | 61-70 |
| R6 | **Colours.** The school's two colours are the theme (`--school-primary`, `--school-secondary`, `--school-on-primary`, `--school-on-secondary`). "Everything else is fixed: a cream ground (`--cream`, `--cream-hi`, `--cream-lo`), one outline ink (`--outline`), one red for trouble." | 77-84 |
| R7 | **Two faces.** `--display` (Bricolage Grotesque at **800**) is for "titles, figures, chips and buttons". `--sans` (Archivo) is for prose. Both are self-hosted through `@fontsource` in `main.tsx`. "The old `--serif` and `--mono` names resolve to the display face." | 85-88 |
| R8 | **Hard offsets, not blurs.** `--shadow-1/2/3` are the outline ink offset by 2, 4 and 6 px. "Nothing in the register blurs." | 89-90 |
| R9 | The legacy names still resolve, but "new rules cite the new names". | 91-93 |
| R10 | **Rule 1: outline and offset on anything pressable.** A pressable thing has "2 px of the outline ink and `--shadow-1`". "A thing you cannot press sits flat — a panel is the outline with no shadow." "The secondary fill is reserved for the one primary action on a screen (Develop, Appoint, Commit, Continue)." | 98-102 |
| R11 | **Rule 2: state is a chip, never a coloured card.** A filled pill with a word in it, "on a card that stays cream". A card's own colour is only ever the school's. | 103-107 |
| R12 | **Keyboard.** `R` rotates "same as the ⟳ on its footprint ghost". Camera turning and tilting is "Keys only — the map's corner pill has zoom buttons and nothing for the camera". `C` `F` `L` open Curriculum, Faculty and **Student Life**. | 116-128 |

#### 1b. `docs/plans/47-one-voice.md`

| # | Rule | Line |
|---|---|---|
| V1 | **Verbs.** A read-only modal closes with **Continue** and a note with **Noted**. Dismiss, Understood and Resolve are gone as dismiss verbs. | 23-24 |
| V2 | **Dates.** Prose reads "Year N". The log and the charts keep their compact stamps. | 26-28 |
| V3 | **Durations and rates.** "Compact durations read 'Nw', rates '/wk', and prose says weeks." | 29 |
| V4 | **Case.** "Headings and buttons are sentence case." | 30-31 |
| V5 | **Confirmations.** "`ConfirmButton` is the one way the game asks before a loss": the first click arms it and says what is lost, the second acts, and blur or Escape disarms it. It guards a listed set of actions. | 32-47 |
| V6 | **Announcements.** Notes stack in one column. "A letter to the President" is kept apart from "From the board". | 48-56 |
| V7 | **Year 51.** The fiftieth summer's first step is labelled "Final report". | 61-62 |

#### 1c. What the register does not say, and the nearest rule used instead

The two register documents give **no type scale, no weights other than display 800, no spacing scale, no money, number or percent format, no icon rule, no close-control rule and no tooltip rule**. Where one of these areas is judged below, the nearest written rule is cited instead:

- **`src/styles.css` token block:**
  - Type scale `--text-2xs…2xl` = 10, 11, 12, 13, 14, 15, 17 and 24 px, each multiplied by `--text-scale` (lines 42-51).
  - Radii 4, 8, 10, 14, 16 and 20 px (lines 53-59).
  - Shadows (lines 61-64).
  - Semantic colours "in pairs: one tuned for the dark chrome, one for paper" (lines 66-75).
  - "spacing deliberately not tokenised" (line 40).
- **Plan 18, the Varsity direction the register cites:**
  - "Archivo at 500–700 for text" (`docs/plans/18-the-look.md:32-33`).
  - "Headline numbers are short, rounded" (line 32).
  - "every eyebrow the display face in the primary … the picked one the secondary fill" (lines 271-274).
- **Plan 22B:** one formatter file. Every amount goes through `money`, with one short form `moneyShort`, and negative money is written "−$5,000" (`docs/plans/22-foundations.md:123-146`).
- **Consistency review:** American spelling and straight quotes (`docs/reviews/2026-09-consistency-review.md:141-142`). Q13 asked for "one date format … sentence case" and one close-control convention (lines 107 and 253-256).

---

### 2. Counts

| Measure | Count | Detail |
|---|---|---|
| **Distinct font sizes** | **17 declared** | 388 `font-size` declarations use 28 distinct raw values. The 8 token sizes (10, 11, 12, 13, 14, 15, 17, 24 px) are joined by 9 off-scale sizes: 9, 22, 26, 28, 32, 34 and 44 px, `clamp(34px,5vw,56px)` and `1.4em`. Unsized text adds 3 browser defaults: 16 px body text, about 13.3 px buttons and 18.7 px h3. The share card adds 10 more sizes (19 to 120). 13 declarations write a token's size by hand, 4 of them unscaled. `--text-2xl` (24 px) is used once. |
| **Distinct font weights** | **5** | 400 ×6, 500 ×6, 600 ×55, 700 ×68, 800 ×191. The display face is set at 700 in 8 rules. Archivo is asked for at 800 in at least 8 rules, but only 400–700 is loaded. |
| **Font faces** | **3 in the UI, 2 more in the share card** | Bricolage, Archivo and **Azeret Mono** (9 rules). The report card uses Georgia/Times and Helvetica/Arial. |
| **Distinct colours outside tokens (chrome)** | **43** (+2) | 32 in `styles.css` (46 declarations), 8 in `EnrollmentTab.tsx`, 3 in `reportCard.ts`, plus 2 in a context default (`mapOccasions.ts:17`). Not counted, as sanctioned art: 177 distinct literals in 201 CSS map declarations, plus about 150 literal occurrences in the TSX art files. The `:root` block also holds 11 tokens that the register's palette does not mention (see §5). |
| **Distinct button styles** | **39 surfaces in 14 families** | There are 213 button elements, 46 of them with no class, in about 80 class combinations. 122 CSS rules define a button surface. 56 of them are complete (fill, border and corner), and those give 39 distinct looks by fill × border × corner × shadow × face × weight × case. |
| **Distinct spacing values** | **30 px values** (+4) | 826 margin, padding and gap declarations use −24, −4, −1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 48, 64 and 68 px. Also `0`, `auto`, `0.6rem`, `1.9em` and two `var()`/`calc()` values. 117 declarations sit on odd values (1, 3, 5, 7, 9, 11 px). |
| Also | | 18 radius forms: 6 tokens, `50%`, and 9 literal radii in 22 declarations. 8 border widths. 60 uppercase label rules in 39 distinct face, weight, size, tracking and colour combinations, with 7 letter-spacings. 3 tooltip looks. 3 elevations on floating layers. |

---

### 3. The five departures a player would most notice (ranked)

1. **Money is written two ways for the same kind of figure, sometimes on the same card (N1).**
   - A build tile reads "$3,000,000 · 26w", while a Curriculum course reads "$2.7M · 24w".
   - A build tile that needs a loan shows its cost in the long form and its loan in the short form ("borrow $…M").
   - On the Athletics tab a coach's salary is written "$…k/yr" in the team row but "$85,400/yr" in the market below.
   - Why it matters: prices and salaries are the figures a player compares most.
2. **The low-satisfaction reading in the dock almost disappears (C1).**
   - Below 55 it turns `--bad-on-dark` pink, but on a cream chip. That is a 1.57:1 contrast, or 1.42:1 in colour-vision-safe mode.
   - Why it matters: the warning goes pale at the very moment it should shout.
3. **Prestige and satisfaction are shown at two precisions at once (N4).**
   - The dock rounds prestige to "68" while the ticker shows "68.1/70.0". Satisfaction reads "85" in the dock and "85.0" on the Students tab.
   - Why it matters: at 69.5 the dock says 70 while the 70.0 milestone is still unmet.
4. **Buttons that look disabled or unstyled (B2, B3, B11).**
   - New game, Wind up, Put it down, the Settings options and the import's Continue all wear the pale "disabled" outline with no offset. "Wind up" also wraps onto two lines.
   - "Show the rest of the market (38)" is a browser-default grey box.
   - Why it matters: a player cannot tell which controls work.
5. **Headings and titles have no shared hierarchy (S2, S3, K4).**
   - On one tab (Faculty), "FACULTY" is a 13 px capital eyebrow while "Departments" and "Administration" are unstyled browser-bold h3s.
   - Across the game, the title of whatever is open ranges from 13 px capitals (Build) to 15 px (Settings) to 32 px (tabs) to 44 px (title screen).
   - Why it matters: the same kind of heading looks different depending on the screen.

Close behind: the dock's cash figure is the only prominent text in a third, monospace face (F1).

---

### 4. Departures

#### 4.1 Fonts

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| F1 | The dock's funds figure and weekly net use a **third face, Azeret Mono**. So do trophy years, priority ranks and the crash detail. The token comment says the mono is "used only for the cash counter", which is untrue. | `src/styles.css:183, 288, 2573, 2582, 150` (debug 209-232); `src/styles.css:77-79`; `src/main.tsx:3-8` | R7 (ui-shell.md:85-88): two faces, and `--mono` resolves to the display face. Plan 18:95-97 retired the monospace because Bricolage already has tabular figures. | minor | Owner's call. Either point `--mono` back to `--display` (the body already sets `tabular-nums`), or amend R7 to three faces and keep mono for the funds alone. |
| F2 | The **shareable report card** is drawn in Georgia/Times and Helvetica/Arial, at weight 700, with serif italics and the only curly quotes in the game. It uses its own cream `#fbf6ea` and muted `#5b6477` instead of `--cream #f7f2e8` and `--ink-muted #5a5f6b`. | `src/state/reportCard.ts:18-22, 87, 102-130, 126` | R7 faces; R6 colours; straight quotes (review:142) | minor | Embed the two self-hosted woff2 files as `@font-face` data URIs inside the SVG (the reason given at `reportCard.ts:10-11` then no longer holds). Use the token hexes, straight quotes and weight 800. |
| F3 | Some buttons are forced into the prose face: choice cards with `!important`, and pills and tiles that inherit Archivo. | `src/styles.css:1953` (.event-choice), `2137` (.ad-candidate); inherit/sans at `1121` (.next-up-door), `1145` (.row-action-secondary), `1299` (.offer), `1322` (.offer-add), `427` (.course-cell), `1430` (.instructor-option) | R7: display for buttons | polish | Set the label span in `--display` 800 and leave the detail line in `--sans`. `.event-choice-label` (1957) already does this. |
| F4 | Eyebrows and micro-labels use Archivo at 800, a weight that is not loaded, so it renders as 700. Neighbouring eyebrows use the display face. | `src/styles.css:170, 1170, 1408, 1441, 2019, 2144, 2202, 2388` (containers set no face, so these inherit `body` Archivo) | R7; Plan 18:271-273 ("every eyebrow the display face") | polish | One `.eyebrow` class in `--display` 800. |
| F5 | The legacy alias `var(--serif)` is still used in new rules. | `src/styles.css:747, 761, 992, 1020, 2242, 2250` | R9: new rules cite new names | polish | Use `var(--display)`. |
| F6 | A faux italic of the display face: Bricolage ships no italic, so the browser slants it. This affects the "1 program of a school not yet founded" group headers and the quad names. | `src/styles.css:1159` (.school-group-unnamed), `761` | R7 | polish | Drop the italic and mark the difference with opacity or colour. |

#### 4.2 Sizes and weights

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| S1 | **There is no display tier in the scale.** Every headline size is a one-off: 44, 34, 32 (twice), 28, 26, 22 (five times) and `clamp(34px,5vw,56px)`. The only large token, `--text-2xl`, is used once. | `src/styles.css:140, 1890, 1037, 2239, 2001, 1896, 183, 1158, 1907, 2023, 2549, 2721` | The token scale (`styles.css:42-51`); the register is silent | minor | Add display tokens (for example 22, 26, 32, 44) and route these through them. |
| S2 | **The title of "the open thing" comes in 7 sizes and 3 treatments.** | Build and log popups 13 px capitals (`src/styles.css:366`); Settings, Hall of fame and Credits 15 px (`2434`, `160`); building panel 17 px (`564`); modal band 26 px (`1896`) or 34 px inverted (`1890`); tab 32 px (`1037`); founding card 32 px (`2239`); title screen 44 px (`140`) | R7 (titles in display); no size rule | minor | Three title levels (screen, dialog, panel), one style each. |
| S3 | **Headings no rule reaches** fall back to browser bold: "Departments" and "Administration" on the Faculty tab, beside the tab's own "FACULTY" eyebrow. The History addendum h4 does the same. | `src/tabs/FacultyTab.tsx:700`, `src/tabs/AdministrationPanel.tsx:31`, `src/tabs/HistoryTab.tsx:220`. There is no `.panel h3` rule; `.panel h2` is at `src/styles.css:339`. | R7 | minor | Style `.panel-head-title h3` like `.panel h2`, or make them h2. |
| S4 | **Unsized text gets the browser's 16 px**, which is off the scale (`--text-base` is 13 px) and ignores the player's text-size setting. Example: the Treasury's Balance and Advancement figures and the Students "Effect on satisfaction" figures render at about 16 px, next to 13 px statement lines. Buttons with no size (for example "Show the rest of the market", "Found another college") get about 13.3 px. | `body` has no size (`src/styles.css:92`); `.panel dt/dd` (`1481-1482`); `src/settings.ts:86` sets only `--text-scale`; `.coach-market-toggle` (`2223`), `.new-college-btn` (`2735`) | The scale "times the player's text size" (`styles.css:42`, Plan 34) | minor | Add `body { font-size: var(--text-base) }` (or md) and `button, input, select { font-size: inherit }`, then review the panels. |
| S5 | Sizes that bypass the scale: 9 px, below the smallest token, three times; token sizes rewritten as `calc(Npx*scale)` nine times; unscaled raw px four times, plus the clamp. | 9 px at `src/styles.css:1451, 2019, 2374`; calc duplicates at `1228, 1278, 1282, 1325, 1441` (10), `714` (13), `2027` (17), `2028` (14), `2029` (12); raw px at `1510` (17), `1807-1808` (10), `2554` (13); clamp at `2721` | Token scale | polish | Use the tokens. |
| S6 | The display face at **700** instead of 800. This includes the dock's tab labels, whose Build label beside them is 800, and "Close ✕". | `src/styles.css:195, 314, 318, 747, 992, 1039, 1063, 2250, 2312` | R7 ("Bricolage … at 800") | polish | 800. |
| S7 | **Section eyebrows that play the same role** use 3 sizes and 3 trackings. Overall there are 60 uppercase rules in 39 combinations, with 7 letter-spacings from 0.02 to 0.09 em. | `.panel h2` 13 px/0.08 (`src/styles.css:339`); `.statement-col h3` 12/0.08 (`1855`); `.consequence-panel h3` 12/0.06 (`1989`); `.offer-commit h4` 11/0.09 (`1318`); `.course-drawer-section h4` 11/0.09 (`1413`) | Plan 18:271-273 (one eyebrow) | polish | One `.eyebrow` and one `.section-head`. |

#### 4.3 Colours

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| C1 | **The low-satisfaction chip uses the on-dark red on a cream chip**, a contrast of 1.57:1 (1.42:1 in colour-vision-safe mode). The cash class `money-negative` is reused for satisfaction. It can be seen in the crisis capture ("35"). | `src/components/StatusHeader.tsx:145` + `src/styles.css:185` (`--bad-on-dark #ffb0a6`) on `.toolbar-stat { background: var(--cream) }` (`291-292`) | Semantic colours come "in pairs: one … dark chrome, one for paper" (`styles.css:66`); R6 | **major** | `.toolbar-stat .stat-value.money-negative { color: var(--bad-on-light) }` (5.9:1), or a red chip. Rename the class. |
| C2 | The Enrollment cohort bar uses **8 parchment-era pigments hard-coded in the component**. Its comment cites "parchment" and `--brass-deep`. | `src/tabs/EnrollmentTab.tsx:22-32` (used at `88`, `131`) | R6; Plan 18:271-273 ("every remaining literal hex … is a token") | minor | A `--cohort-1…8` token set, or derive the colours from the school hues. |
| C3 | The grade chips A–D use 8 literals, and the colour-vision-safe versions use 8 more. Only `.grade-f` uses tokens. `#2f6b42` nearly duplicates `--green #1f6b3a`. | `src/styles.css:1363-1366`, `129-132`; `1367` | R6 | minor | `--grade-a…d` tokens, overridden under `[data-vision='safe']` the way `122-127` does. |
| C4 | **State shown as a coloured card.** The Treasury's "Net weekly" bar turns into a pink card when negative. Warning notes are pink boxes, and they come in 3 different border treatments. | `.statement-net.negative` `src/styles.css:1869`; `.offer-warning` `1327`; `.course-drawer-warning` `1423`; `.faculty-dismiss-warning` `1467`; `.stall-note` `1476` | R11 (rule 2: "state is a chip, never a coloured card") | minor | Keep the card cream and put a red chip ("Deficit", "Warning") next to the text. At least use one warning-note style. |
| C5 | **Blurred shadows**: the map's refusal tooltip, the Build button on phones, and a dead blur fallback on the final page. | `src/styles.css:714` (`0 2px 6px`), `2754` (`-10px 0 10px`), `2720` (fallback `0 12px 40px`) | R8 ("nothing … blurs") | polish | Use a hard offset, and a mask gradient for the phone fade. Drop the fallback. |
| C6 | White and alpha literals where tokens exist: pure `#fff` (3 places), white alphas on the dock (4), outline-ink and black alphas (5), near-cream literals (2), and `#fff6ec`. | `#fff` at `src/styles.css:329, 2559, 2801`; white alphas at `194, 286, 298, 316`; ink and black alphas at `477, 1101, 1876, 2547, 2720`; near-cream at `136, 2242`; `#fff6ec` at `714` | R6 | polish | Use `color-mix()` of `--outline`, `--school-on-primary` or `--cream-hi`. |
| C7 | The Hall of fame frame uses a wood-and-brass palette of 6 literals. | `src/styles.css:2436-2443` | R6 | polish | Tokenise it, or name it in the register as illustration. |
| C8 | The school-colours context has a default pair that matches neither the stylesheet default nor `FOUNDING_COLORS`. | `src/components/mapOccasions.ts:17` vs `src/styles.css:4-5`, `src/data/schoolColors.ts:31` | R6 | polish | Default it to `FOUNDING_COLORS`. |

#### 4.4 Buttons

The 14 families, each with example rules:

1. **Secondary-fill pill with offset:** `.modal button` 1899, `.opening-coach-actions button` 2492, `.row-action-develop` 1137, `.course-drawer-action` 1453, `.facility-commit` 1330, `.faculty-card-foot .appoint` 1581.
2. **Big primary, 3 px and `--shadow-2`:** `.title-primary` 156, `.startup-begin-btn` 2273.
3. **Cream pill with offset:** `.save-btn` 240, `.panel-action` 349, `.building-info-jump` 569, `.facility-start` 1267, `.tab-overlay-close` 1038.
4. **Cream pill, flat:** `.relocate-slot` 639, `.map-touch-bar button` 688, `.dept-action` 1644, `.next-up-door` 1121, `.species-chip` 2694, `.report-card-actions button` 2729, pennant form 2561, `.new-college-btn` 2735.
5. **Clear outline pill, flat:** `.course-drawer-appoint` 1461, `.course-drawer-close` 1400, `.curriculum-chip` 1062, `.row-action-secondary` 1145, `.build-cat-tab` 492.
6. **Clear outline pill in capitals (segmented):** 1714, 2089.
7. **Pale-outline "quiet":** `.newgame-btn` 244, `.facility-cancel` 1269, `.startup-vern-btn` 2254, `.startup-color-btn` 2263, `.build-tile` 509, `.hall-slot` 576, `.hall-offer-tile` 590, `.instructor-option` 1428, and the dashed `.letter-skip` 2424, `.ad-decline` 2160, `.course-cell` 427, `.offer-add` 1322, `.building-info-jump.quiet` 600.
8. **Flat choice cards:** `.event-choice` 1951, `.ad-candidate` 2134.
9. **Round icon buttons:** outlined 368, 565, 385, 2553; 3 px with offset 645; borderless 2793, 659; dock gears 192.
10. **Dock:** `.toolbar-icon-btn` 311, `.toolbar-build-btn` 321, `.toolbar-funds-btn` 284.
11. **Text links:** underlined 1072, 1131, 1499, 1655; dotted 2521; plain 1167, 1223, 1287, 1584.
12. **Destructive:** solid red 601, pink when armed 2701 and 1470, red outline 1578 and 2125.
13. **Browser default:** 2223.
14. **Hall-of-fame frame:** 2436.

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| B1 | **Pressables with no offset.** About 22 button rules draw the outline but no `--shadow-1`. The decision-event choice cards and the athletic-director candidates are forced flat with `box-shadow: none !important`, and gain a shadow only on hover. | `src/styles.css:492, 639, 688, 1062, 1121, 1145, 1171, 1243, 1322, 1400, 1461, 1578, 1644, 1714, 2089, 2125, 2561, 2694, 2729`; round closes `368, 565, 385`; `1951-1953`, `2134-2137` (decision capture) | R10 (rule 1: "2 px of the outline ink and `--shadow-1`") | minor | Put the offset in one shared button base. Scope `.modal button` to the modal's action row so the `!important` overrides can go. |
| B2 | **"Quiet" buttons look disabled.** They have a pale `--parchment-line` border, muted text and no offset. This affects New game in the menu, "Discard it", the import's **Continue**, the build menu's "Put it down", research "Wind up", every Settings option, Mute, the founding vernacular and colour picks, and the letters' "skip" links. | `.newgame-btn` `src/styles.css:244` used at `src/components/MainMenu.tsx:73-74`, `TitleScreen.tsx:49`, `ImportSave.tsx:48-49`, `BuildPopup.tsx:710`; `.facility-cancel` `1269` (`ResearchTab.tsx:86-88`); `.startup-vern-btn` `2254` (`SettingsPanel.tsx:22-36`, `audio/SoundControls.tsx:22`); `.startup-color-btn` `2263`; `.letter-skip` `2424`, `.ad-decline` `2160` (y8 main-menu and settings captures) | R10 | minor | Keep the outline ink and the offset. Make "quiet" a transparent fill, not a pale border. Rename `.newgame-btn`. |
| B3 | **A button with no surface at all.** "Show the rest of the market (38)" has only a margin rule, so it renders as the browser's default button. | `src/tabs/AthleticsTab.tsx:200`; `src/styles.css:2223` (y8 Athletics capture) | R10 | minor | `className="panel-action"`. |
| B4 | **The secondary fill is spent on many actions per screen.** `.modal button` makes every modal button secondary, which is why five `!important` overrides exist. Each Curriculum row has a secondary "Develop …", and the offer door is secondary too (two show at once in the founding capture). Every candidate's Appoint and every department's Appoint are secondary. | `src/styles.css:1899`, overrides at `1951-1953, 2134-2137, 2155, 2160, 2424`; `1137`, `1126`; `1581`, `1649` | R10 ("reserved for the one primary action on a screen"). The register is ambiguous here, since its own examples, Develop and Appoint, are per row. | minor | Decide between one per screen (row actions become cream pills) and "one per card", then amend R10. |
| B5 | **Some buttons render in capitals** through CSS while most are sentence case: "BOTH / ROSTER / MARKET", "EXPAND ALL", "SHOW EVERY FIELD (2 MORE)", "LOW / MEDIUM / HIGH", and the build categories. | `src/styles.css:1714, 2089, 496` (y8 Faculty, Athletics and build captures) | V4 (Plan 47:30: buttons in sentence case) | minor | Drop `text-transform` on buttons and keep capitals for chips and eyebrows. |
| B6 | **Three looks for a segmented control.** In some, the picked option is ink-filled. In Settings and the founding card, it gets the outline and offset while its siblings go pale. In others it gets the secondary fill. | Ink-filled `src/styles.css:1718, 2092, 498`; offset `2258`; secondary `2605, 2615, 317` | Plan 18:273-274 ("the picked one the secondary fill") | minor | One `.segmented` component. |
| B7 | **Three looks for a destructive button.** | Solid red `.building-info-jump.danger` `src/styles.css:601`; pale pink when armed `2701`, `1470`; red outline `1578` (Dismiss), `2125` (coach ✕) | R6 ("one red"); no button rule | polish | A red outline at rest and pink when armed, everywhere. |
| B8 | **Close controls come in 6 looks with 2 glyphs:** a "Close ✕" pill with offset (tabs), a round outlined ✕, a round outlined × (quad panel), a borderless × (toasts), a flat ✕ pill (course drawer), "Not now ✕" with a 10 px corner (research), and the map-tools ×. | `src/components/TabOverlay.tsx:20` / `src/styles.css:1038`; `ToolbarPopup.tsx:22`, `SettingsPanel.tsx:17`, `Credits.tsx:11`, `HallOfFame.tsx:42`, `BuildingInfoPanel.tsx:607` (`368/565`); `QuadPanel.tsx:22`; `Toasts.tsx:102` (`2793`); `CurriculumTab.tsx:581` (`1400`); `ResearchTab.tsx:166` (`1243`); `CampusMap.tsx:1792` | The review's Q13 asked for one close convention (review:107); Plan 47 did not settle it | polish | A round ✕ for panels, and the "Close" pill only for full-bleed tabs. One glyph, ✕. |
| B9 | **Confirmations built by hand**, outside `ConfirmButton`. Faculty Dismiss disarms on blur but not on Escape. "Found another college / Stay" disarms on neither. The armed labels also vary: most read "Confirm — …", but there are also "Release", "Move to slot N", "Move X — dark N weeks" and a bare "Confirm". | `src/tabs/FacultyTab.tsx:74, 151-160`; `src/components/ReportCardActions.tsx:51-60`; `src/tabs/AthleticsTab.tsx:82`; `src/components/BuildingInfoPanel.tsx:225, 279`; `src/components/ImportSave.tsx:51` | V5 (Plan 47:32-36: "the one way", "says what is lost", blur or Escape disarms) | minor | Use `ConfirmButton`, always armed as "Confirm — ‹what is lost›". |
| B10 | Outline and corner variants: 3 px outlines on the big buttons, the menu disc and the picked colour; a 3 px secondary border on Build; literal 10 px corners. | `src/styles.css:156, 2273, 645, 2266, 321`; `1171, 1243` | R10 (2 px); radius tokens (`styles.css:53-59`) | polish | 2 px and the radius tokens. |
| B11 | **"Wind up" wraps onto two lines** in narrow research cards (3 of 7 cards in the crisis capture). The review records this as fixed. | `.facility-cancel` has no `white-space: nowrap`: `src/styles.css:1264-1269`; review `docs/reviews/2026-09-consistency-review.md:99` | Regression of a fixed review item | minor | `white-space: nowrap`. |

#### 4.5 Icons

The icon set is `src/components/icons.tsx`: 32 hand-drawn SVG line icons (24×24, `currentColor`, sized by CSS). They serve only the dock, the gears and the build menu. Everything else uses Unicode glyphs.

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| I1 | **Two icon systems.** Unicode glyphs stand in as icons for close, disclosure, camera, rename, status, stars, rank moves, swap, footnotes and the seven school marks. One SVG icon is drawn inline outside `icons.tsx` and passes its own width and height, against that file's stated convention. | `✕ ×` (B8); `▸ ▾` `BuildPopup.tsx:484`, `FacultyTab.tsx:146, 421`, `CurriculumTab.tsx:887, 950`; `⟲ ⟳ ⤓ ⤒ ⌂` `CampusMap.tsx:1814-1818`, `1724`; `✎` `Pennant.tsx:18`; `✓ ✗ ○ ● ◐` (I5); `★` `FacultyTab.tsx:95`; `⇄` `CurriculumTab.tsx:389`; `†` `EnrollmentTab.tsx:73, 153`; school marks `◆ ⚙ ✦ ❧ ⚗ ✚ ▣` `src/data/schoolPalette.ts:16-22`; inline SVG `CampusMap.tsx:1793-1798` vs `icons.tsx:1-5` | No written rule; `icons.tsx:1-5` convention | minor | Move the recurring glyphs (close, disclosure, rotate, rename, check) into `icons.tsx`. |
| I2 | **One glyph, several meanings.** ✕ closes, but also removes a scholar and releases a coach. × closes, but also multiplies and counts. → means "go" on buttons and "becomes" in figures. A house means "back to the map" (the SVG) and "back to the opening view" (⌂), and the Housing icon is nearly the Home icon. ⟳ turns a building and also turns the camera. | ✕ at `src/tabs/ResearchTab.tsx:53`, `AthleticsTab.tsx:79-81`; × at `TreasuryTab.tsx:113`, `HistoryTab.tsx:69`, `BuildPopup.tsx:472`; → at `InterruptModal.tsx:275, 416, 479, 501`, `ResearchTab.tsx:163` vs `HistoryTab.tsx:54, 112, 128`, `state/yearInReview.ts:197`; house at `Toolbar.tsx:93` vs `CampusMap.tsx:1818`, `icons.tsx:9-17` vs `138-146`; ⟳ at `CampusMap.tsx:1724` vs `1815` | R12 (⟳ is the building's rotate) | minor | Reserve ✕ for close, give release and remove their own icon, and use a distinct glyph for the camera turn. |
| I3 | **One icon, several tools.** The eraser serves both "Erase path" and "Fell trees". The path pen serves "Draw path", "Lamps" and "Benches". The Students **tab** uses the heart from the old "Student Life" name, and the heart is shared by two build categories. Meanwhile the dock's Enrolled chip uses a two-person glyph that is almost the Faculty tab's. | `src/components/BuildPopup.tsx:580, 605`; `569, 630, 641`; `Toolbar.tsx:34`; `BuildPopup.tsx:225, 233`; `icons.tsx:19-28` vs `276-285` | R5 ("a glyph and a figure") | minor | Give fell, lamps and benches their own glyphs, and give the Students tab `StudentsIcon`. |
| I4 | A → sits on some forward buttons ("Set tuition for the year →", "Set the policy →", "Start research →", "Open in Curriculum →", "Appoint →") but not on others ("Continue", "Develop …", "Appoint", "Launch", "Place"). | `src/components/InterruptModal.tsx:275, 416, 479, 501`; `ResearchTab.tsx:163`; `BuildingInfoPanel.tsx:139`; `CurriculumTab.tsx:1201` | No written rule | polish | Use → only when a button changes screen. |
| I5 | **Three sets of status marks, and two sets of rank arrows.** | ✓/✗ at `src/tabs/CurriculumTab.tsx:635, 644`; ✓/○ at `LadderPanel.tsx:26`; ●/○/◐ at `PromisesPanel.tsx:26, 55`; ▲▼ at `InterruptModal.tsx:592, 702` vs ↑↓ at `AthleticsTab.tsx:311-312` | No written rule | polish | One done / pending / failed set. |

#### 4.6 Capitalization

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| K1 | **Buttons that start lower-case:** "choose…", "all N with X → …", "another", "waiting on {field} ×", "▸ more / ▾ less", "show ▸ / hide ▾", "{field} short · N waiting". | `src/tabs/CurriculumTab.tsx:850, 852, 1063, 1196`; `src/components/InterruptModal.tsx:960, 1015`; `src/tabs/FacultyTab.tsx:146`; `src/components/BuildPopup.tsx:484` | V4 (buttons in sentence case) | polish | Capitalize the first word. |
| K2 | **Title Case on the coach-hire buttons**: "Hire — Head Coach", "Men's Swim & Dive Team · Head Coach". A second table labels the same roles "head coach", and the same tab's help text says "a head or assistant coach". | `ROLE_LABEL` `src/tabs/AthleticsTab.tsx:48`, used at `191-192`; `CHAIR_LABEL` `src/data/studentLifeData.ts:844-847`; help `AthleticsTab.tsx:148, 222` | V4 | minor | One role table, lower-case in running text: "Hire as head coach". |
| K3 | **The same name written two ways.** "The Curriculum" (crumb) vs "The curriculum" (heading). "The Final Report" (heading, History panel, log) vs the step label "Final report". "An athletic director" (modal title) vs "Athletic Director" 14 times elsewhere. | `src/tabs/CurriculumTab.tsx:1381` vs `1386`; `src/data/reportData.ts:89, 102-103`, `src/systems/admissions/resolveAdmissions.ts:81` vs `src/components/InterruptModal.tsx:431`; `InterruptModal.tsx:979` vs `AthleticsTab.tsx:233, 239`, `src/engine/reducer.ts:597-607` | V4; V7 ("Final report") | minor | Pick one form per name. |
| K4 | **CSS puts headings and buttons into capitals** although their source text is sentence case. One screen therefore shows three cases: the tab title ("Treasury"), panel headings in capitals ("WEEKLY INCOME STATEMENT", "HARWICK COLLEGE TERRIERS"), and modal titles in sentence case. | 60 `text-transform: uppercase` rules, for example `src/styles.css:339` (`.panel h2`), `366`, `2311` (summer steps), `1714`, `2089` | V4 (headings in sentence case) vs Plan 18's capital chips and eyebrows; the register is ambiguous | minor | Keep capitals for chips and eyebrows of three words or fewer; never for panel headings or proper names. |
| K5 | "Fall Term" / "Spring Term" in Title Case in the clock. | `src/components/StatusHeader.tsx:73` | V4 | polish | "Fall term". |
| K6 | A column header abbreviated to "Satisf.". | `src/tabs/HistoryTab.tsx:242` | Sentence case, one voice | polish | "Satisfaction", or an icon. |
| K7 | **Spelling (voice).** "3 organisations petitioning" on the summer review, followed by "NEW STUDENT ORGANIZATIONS" on the next step. A History chart labelled "Catalogue" where everywhere else says "catalog". Also "organisational behavior", 24 course descriptions beginning "Analyses", and "grey" twice. | `src/state/yearInReview.ts:163`; `src/tabs/HistoryTab.tsx:361`; `src/data/facultyData.ts:553`; `src/data/courseDescriptions.ts` (for example 20, 54, 63); `src/data/eventVariants.ts:35, 120` | "American throughout" (review:141) | minor | "organizations", "Catalog", "Analyzes", "gray". |

#### 4.7 Numbers, money and dates

**Helpers** (`src/format.ts`):

- `money` → "$1,234,567" or "−$5,000".
- `moneyShort` → "$180k", "$4.0M", "$12M", "$3.2B".
- `pct` → "42%"; `signedPct` → "+34%" or "−3%"; `ordinal`.
- There is no date helper. Plan 22 listed `signedMoney`, which no longer exists.

Use in `src/`: `money` 149 calls, `moneyShort` 31, `pct` 22, `signedPct` 2. There are 136 `toLocaleString()` calls, none with a locale.

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| N1 | **Two money formats for the same kinds of amount, sometimes side by side:** <ul><li>A build tile's cost uses `money` ("$3,000,000 · 26w") while its own loan note uses `moneyShort` ("borrow $1.2M").</li><li>Curriculum course costs use `moneyShort` ("$2.7M · 24w", "$920k · 12w").</li><li>On the Athletics tab, a coach's salary uses `moneyShort` in the team row but `money` for market candidates and the AD.</li><li>Faculty cards use `moneyShort` ("$…k/yr") while the AD modal and appointment lines use `money` ("$143,840/yr").</li></ul> | `src/components/BuildPopup.tsx:455` vs `457`; `src/tabs/CurriculumTab.tsx:366, 849, 1180`; `src/tabs/AthleticsTab.tsx:77` vs `176, 234`; `src/tabs/FacultyTab.tsx:128, 313, 317, 532, 536` vs `src/components/InterruptModal.tsx:998, 1093, 1103`, `src/systems/faculty/appointments.ts:19` (captures: y8 build menu, y8 and founding Curriculum, y8 Athletics, ad modal) | Plan 22:139-146 (one formatter, with the short form for scans and axes); the register is silent | **major** | Write a rule and apply it by surface: `money` in sentences and ledgers, `moneyShort` on every tile, card, chip and salary tag. |
| N2 | **Money that bypasses the helpers.** The admissions tuition line uses `${tuition.toLocaleString()}/yr`. A campaign log line uses `$${(target/1e6).toFixed(1)}M`, which prints "$0.4M" where the helper would print "$400k", and "$12.0M" where it would print "$12M". | `src/components/InterruptModal.tsx:262`; `src/systems/alumni/campaigns.ts:61` | Plan 22:139-142 ("All of them go through `money`") | minor | `money()` or `moneyShort()`. |
| N3 | **Separators follow the browser's locale.** `money()` calls `toLocaleString()` with no locale, but `moneyShort` uses `toFixed`. In de-DE the dock would read "$1.234.567" next to "$1.2M", in fr-FR "$1 234 567", in en-IN "$12,34,567". The title screen's save date uses `toLocaleDateString()`. | `src/format.ts:7`, plus 136 other calls; `src/components/TitleScreen.tsx:40` | Plan 22 (one formatter); the game's text is English only | minor | One `Intl.NumberFormat('en-US')` in `format.ts`, and a `count()` helper for plain counts. |
| N4 | **Prestige and satisfaction at two precisions.** <ul><li>The dock rounds (`Math.round` in `AnimatedNumber`).</li><li>The ticker's milestone shows one decimal ("68.1/70.0"), as do the milestone modal ("56.0"), History and the year in review.</li><li>Students shows "Satisfaction today 85.0" while the dock shows 85.</li><li>The satisfaction effects use two decimals ("0.00").</li><li>At 69.5 the dock reads 70 while the 70.0 milestone is unmet.</li></ul> | `src/components/StatusHeader.tsx:140, 146` + `src/components/AnimatedNumber.tsx:67`; `src/components/LogTicker.tsx:26`; `InterruptModal.tsx:782`; `src/tabs/HistoryTab.tsx:108`; `src/state/yearInReview.ts:197, 202`; `src/tabs/StudentLifeTab.tsx:86, 66` | Plan 18:32 (headline numbers short and rounded) vs one decimal elsewhere; no written rule | **major** | One precision per quantity. For prestige, one decimal everywhere, or floor it in the dock so it never overstates. |
| N5 | **Rounded parts that do not add up:** "Satisfaction averaged 80 this year, against 73 last year (+6)". | `src/state/yearInReview.ts:144-149` (summer review capture) | No written rule | minor | Compute the delta from the rounded values. |
| N6 | **Three fraction forms.** Spaced "65 / 378", "5 / 9", "13 / 15"; tight "1/9", "6/22", "5/6 slots", "68.1/70.0"; and "N of M". The same reading (a program's courses done of total) is "5 / 9" on Curriculum and "1/9" in the hall panel. | Spaced at `src/tabs/CurriculumTab.tsx:466, 894, 955, 1397`, `StudentLifeTab.tsx:181, 289, 381, 399`, `HistoryTab.tsx:365`; tight at `src/components/BuildingInfoPanel.tsx:184`, `FacultyTab.tsx:136, 426`, `LogTicker.tsx:29` | No written rule | polish | One form. |
| N7 | **Percentages at mixed precision.** The Endowment help says "earns about 5.5% … Above 5.0% … at 5%" in one sentence, and the Treasury reads "a 4.0% draw". About 25 player-facing percentages are built inline instead of with `pct`. | `src/tabs/EndowmentPanel.tsx:19-21, 34`; `src/tabs/TreasuryTab.tsx:93`; inline at, for example, `InterruptModal.tsx:337, 345, 546`, `HistoryTab.tsx:89, 109, 259`, `TreasuryTab.tsx:60-61, 158`, `FacultyTab.tsx:579`, `AthleticsTab.tsx:385`, `ResearchTab.tsx:200-201`, `src/systems/admissions/resolveAdmissions.ts:198`, `src/components/BuildPopup.tsx:419` | Plan 22 (one `pct`) | polish | `pct(v, digits)` with one rule. |
| N8 | **Two minus signs.** The helpers write a true minus (−), but hand-built signed figures write a hyphen: "-3.0", "-0.50", "(-3)". | `src/format.ts:7, 20, 44` vs `src/components/InterruptModal.tsx:778`, `src/tabs/StudentLifeTab.tsx:66`, `src/tabs/CurriculumTab.tsx:384` | Plan 22:127-130 (a real minus sign) | polish | `signed(n, digits)` in `format.ts`. |
| N9 | **Multipliers** written "×1.54" in one place and "× 1.00" in another. | `src/tabs/TreasuryTab.tsx:113`, `src/tabs/ResearchTab.tsx:82` vs `src/tabs/HistoryTab.tsx:69` | No written rule | polish | "×1.54". |
| N10 | **The game date written three ways.** The dock says "Year 9 · Fall Term · Week 2", the title screen "Year 9, week 2", and the chair's letter "Year 9 · Week 2". The Hall of fame appends a calendar year to game years: "Years 1–50 · 2026". | `src/components/StatusHeader.tsx:183`; `src/components/TitleScreen.tsx:56`; `src/components/InterruptModal.tsx:1048`; `src/components/HallOfFame.tsx:22` | The review's Q13 "one date format" (review:255) → V2 | minor | One `gameDate()` helper in `format.ts`. |
| N11 | **Compact durations not written "Nw":** <ul><li>"Keep 8 wk" (Endowment sweep).</li><li>The research depth chip "PILOT STUDY · 26 WEEKS", or "1.5 yr".</li><li>"Renovate · $53,497, eight weeks": the "eight" is hard-coded against `RENOVATION_WEEKS = 8`, one line after "4 weeks dark".</li><li>"Add a story · $X, N weeks" and "Move to … · N weeks".</li><li>The log line "has concluded after 0.5 years".</li></ul> | `src/tabs/EndowmentPanel.tsx:82`; `src/tabs/ResearchTab.tsx:28, 78`; `src/components/BuildingInfoPanel.tsx:547` (`src/systems/estate/estate.ts:23`), `363`, `521`, `221`; `src/systems/research/researchSystem.ts:128` (captures: y8 Founders Hall panel, crisis Research, crisis map) | V3 (Plan 47:29) | minor | "Nw" on chips and buttons, derived from the constants; "weeks" in prose. |
| N12 | **A rate written with a space**: "2.6 /wk", where every other rate is "/wk". | `src/tabs/ResearchTab.tsx:112` | V3 | polish | "2.6/wk". |

#### 4.8 Spacing

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| P1 | **There is no spacing scale.** 826 declarations use 30 px values. 117 of them sit on odd values. Some values are used once only: 26, 30, 36, 64, 68 and −24 px. | For example 26 px at `src/styles.css:1812`; 30 px at `2414`; 36 px at `2237`; 64 px at `2718`; 68 px at `1035`; −24 px at `1886`; 11 px at `1121, 1338, 2091, 2103` | None: `styles.css:40` says "spacing deliberately not tokenised", and the register is silent | polish | A 2/4/6/8/12/16/24/32 px scale as tokens, adopted gradually. |
| P2 | **Card insets.** Top-level cream cards use 9 different paddings, and inner cards about 10. | `.panel` 16/18 `src/styles.css:338`; `.title-card` 24/28 `138`; `.startup-card` 32/36 `2237`; `.modal` 0/24/20 `1880`; `.building-info-panel` 10/14/12 `561`; `.main-menu-popup` 10 `653`; `.milestone-note` 14/16 `2410`; `.opening-coach` 14/20/16 `2485`; `.final-page-inner` 40/48/48 `2719`. Inner cards, for example `.offer` 10/12 `1299`, `.record` 9/11 `1338`, `.team-card` 9/11 `2103`, `.cohort-card` 8/3 `2016`, `.ad-candidate` 12/8 `2135` | None | polish | Two insets: one for panels, one for inner cards. |
| P3 | **em and rem in a px sheet.** | `.trophy` gap 0.6rem `src/styles.css:2572`; `.ladder-rung-opens` margin 1.9em `2543` | None | polish | Use px from the scale. |

#### 4.9 Floating layers and tooltips

| ID | What | Where | Rule it departs from | Sev. | Suggested fix |
|---|---|---|---|---|---|
| O1 | **Three tooltip looks**: a cream box with outline and offset, a dark ink bubble, and a red bubble with a blur, a literal 6 px corner and a literal 13 px size. | Cream box at `src/styles.css:389-392, 2651-2655, 2675-2678`; ink bubble at `2033-2036`; red bubble at `713-714` | R8; no tooltip rule | polish | One tooltip style. |
| O2 | **Floating layers sit at three heights with no rule.** Modals, the founding card and the opening coach use `--shadow-3`. Popups, the building panel, the drawer and the touch bar use `--shadow-2`. Map notes, toasts and tooltips use `--shadow-1`. So the opening coach and the notes over the map, which are the same kind of card, float at different heights. | `--shadow-3` at `src/styles.css:1881, 138, 2237, 2487`; `--shadow-2` at `358, 560, 653, 685, 1392`; `--shadow-1` at `2411, 2788, 392` | R10 ("a thing you cannot press sits flat"); `styles.css:61` ("only pressable things sit off the page"); nothing said about floating layers | polish | Name the elevations in the register: dialog = 3, popup = 2, note or toast = 1. |

**What complies.**

- The dismiss verbs follow V1: Continue on 9 read-only modals, Noted on 4 notes, and no remaining "Dismiss", "Understood" or "Resolve" labels.
- Prose dates read "Year N", and the log keeps its "Y9W1" stamps (V2).
- Most static headings and buttons in the components are sentence case.
- `ConfirmButton` guards every action Plan 47 lists: `BuildingInfoPanel.tsx:221-279, 531-580`, `EndowmentPanel.tsx:61`, `AthleticsTab.tsx:79`, `AdministrationPanel.tsx:82-95`, `ResearchTab.tsx:86`, `MainMenu.tsx:73`, `TitleScreen.tsx:59`.
- Inline `style` props carry no literal colours. They pass data only: widths, and school hues from `schoolPalette.ts`.

---

### 5. The register is stale here

Places where `ui-shell.md` or a cited plan no longer matches the code. The code is probably right in each case, so the doc should change.

1. **The tabs.** ui-shell.md:3-6 lists eight views, including "Student Life" and "Enrollment". The code has seven tabs, with a single **Students** tab (`src/components/TabNav.tsx:13-21`).
2. **The gated tabs.** ui-shell.md:20-24 says "Five tabs open from milestones". There are four gated tabs: Students, History, Research and Athletics (`src/components/TabNav.tsx:22-27`).
3. **The gears and speed keys.** ui-shell.md:28-30, 63-64 and 122 describe "four gears" with keys `1` `2` `3` and `4` for sandbox. The code has **five visible gears**, adding 8×. 4× and 8× are locked by the administration's seats. The keys are `1`–`4`, with `5` for the sandbox (`src/engine/useGame.ts:23`, `src/components/StatusHeader.tsx:40-44, 57-65`).
4. **Toasts.** ui-shell.md:43-45 says "three seconds each, five at most". The code uses **6 s and at most 4** (`src/components/Toasts.tsx:18, 22`).
5. **The faces.** ui-shell.md:85-88 says "Two faces … `--mono` resolve[s] to the display face". The code defines `--mono` as **Azeret Mono**, and `main.tsx` calls it "the three faces of the register" (`src/styles.css:79`, `src/main.tsx:3-8`). The code comment "The mono is used only for the cash counter" (`src/styles.css:77`) is itself stale, since mono is also used at `150`, `288`, `2573` and `2582`.
6. **The palette.** ui-shell.md:83-84 says everything else is "cream …, one outline ink, one red". The tokens also hold a green (`--green`, `--ok-on-light`), an amber (`--warn-*`), a dark-chrome pink (`--bad-on-dark`), `--ink-muted`, `--parchment-line`, and a three-part danger set (`src/styles.css:22-27, 66-75`). The grade chips add four more colour pairs (`1363-1366`).
7. **Camera buttons.** ui-shell.md:124 says "Keys only — the map's corner pill has zoom buttons and nothing for the camera". Touch players get turn, tilt, home and quad-names buttons (Plans 70F and 70G), and the corner pill is now a folding "Map tools" toggle (`src/components/CampusMap.tsx:1783-1826`).
8. **The `L` key.** ui-shell.md:128 says `C` `F` `L` open "Student Life". `L` opens **Students**; the map's own help text says so (`src/components/CampusMap.tsx:1805`).
9. **Plan 18's claim about hexes.** Plan 18:271-273 says "every remaining literal hex in those sections is a token now". That holds for the CSS only: the Enrollment cohort colours are still eight literals in the component. The component's comment still cites "parchment" and `--brass-deep`, which now resolves to the school primary (`src/tabs/EnrollmentTab.tsx:22-32`, `src/styles.css:20`).
10. **Plan 22's helper list.** Plan 22:123-124 lists `signedMoney` in `format.ts`. It is gone; `format.ts` now holds `money`, `pct`, `signedPct`, `ordinal`, `surnameOf` and `moneyShort`.
11. **The review's "Wind up" fix.** The consistency review §3 (review:99) records the research card's "Wind up" wrapping as fixed. It wraps again (B11).
12. **Gaps rather than staleness.** The register gives no type scale, weight rule beyond 800, spacing scale, number, money or percent format, icon rule, close-control rule, tooltip rule or elevation rule for floating layers. Most of §4.2, 4.5, 4.7, 4.8 and 4.9 exists because nothing written decides it. Plan 47 settled "one date format" and case, but not number, money or duration formats beyond "Nw" and "/wk".
