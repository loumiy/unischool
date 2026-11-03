# Pass C — The juice pass

*Plan 123 §3, pass C: when the player does each core thing, what does the game do back?*

**Build read:** `5d06ae4`, a production build (`vite preview`, 1440×900).
**Saves:** the scripted Guided player's saves (`guided-y6`), and new scenario saves
(`npm run scenario`): `y7w18` (one week before the Health & Counseling Center
finishes), `summer`, `specialization`, `championship` plus `ch-w46` (the week before a
title), `crisis`, `first-milestone`, `final-report` (year 50) and `founding`. All are in
`unischool/node_modules/.tmp/rv/saves/`.

## Method and limits

- Each verb was recorded with `tools/review/juice.mjs`. That gives screen change,
  a filmstrip, DOM mutations and the sound voices that started. A copy at
  `node_modules/.tmp/rvc/juice2.mjs` adds `drag=` (to pan the map and paint paths) and
  `shot=`. Verbs I could not set up (open a program, a chapter done, a deficit, a regular
  win) were scored from the code: `director.ts` (`cuesFor`, `stateCues`), `Toasts.tsx`,
  `CampusMap.tsx`, `mapCanvas.ts` and the `@keyframes` in `styles.css`.
- **Frame times.** A headless screenshot takes 300 to 600 ms. So a filmstrip's "200 ms"
  label is the 200 ms *mark*, not when the frame was taken. Each report.json has the
  real time (`at`), and the timings below use it.
- **Sound.** I can't hear. I judged sound from the voices started and the cue
  definitions in `audioData.ts`. The music is always running (triangle and sawtooth
  voices), so I separated effects by their shape: `place` is a sine plus noise, `fanfare`
  is squares plus noise, `complete` and `rankUp` are sine pairs. In the founding and
  ceremonial themes the arpeggio is also a sine, so I read those years from the code.
  A 'nothing' baseline (the y6 save, paused) shows 0.0% screen change over 5 s. Walkers
  stop while the clock is paused.
- `__campusMap` is undefined after Continue in the preview build. My guess is that
  the title backdrop's map unmounts and clears it. Because of this, `npm run clip
  --focus` fails ("no building matching"), so I panned by hand with a drag. This is a
  tooling bug for pass B/E, not a game bug.

## The scorecard

Scores are 0 to 3 for each beat. Channels: **Mo** motion, **N** number, **S** sound,
**Ma** map, **T** text (text scores at most 1).

| Verb | Anticipation | Action | Reaction | Aftermath | Evidence |
|---|---|---|---|---|---|
| **Found the college** (name → Open the doors → place Founders Hall) | **3** Ma: a live elevation redraws for each style and colour | **2** S: `place` thud when the hall goes down; Open the doors has only the click | **1** a hard cut to woods under a 70-word letter (T); then the hall pops in at full size, and two text panels open at once | **3** Ma: the hall stands, with the name on the pennant | `img/c-found.png` |
| **Place a building** | **2** Ma: a yellow footprint ghost (no silhouette), cost on the card, a refused ghost gives its reason | **3** S `place` at about 100 ms; N: cash counts down 1.36M→1.11M; Ma: the plot appears at once | **2** the dust puff is too faint to see (screen change 30.1→30.2%); the Build panel reopens over the bottom 45% of the map | **3** Ma: graded plot, hoarding, scaffold stages, a progress bar | `img/c-place.png`, juice `place` |
| **Paint a path** | **2** a hint bar and a tile highlight | **2** Mo/Ma: paving follows the drag live; S: none (no paving cue) | **1** nothing settles or sounds on release | **3** Ma: walkers take it; desire lines wear the lawn | juice `path` |
| **A building finishes** | **3** Ma: scaffold → frame → shell, and a progress bar | **2** S `complete`, which is the same chime as a course, a program or a milestone | **2** Ma: an instant swap, then a gold ring for about 1.5 s (2.9% screen change). The building does not rise or settle; a toast only if off screen | **3** Ma: the building stands; walkers use its doors | `img/c-complete.png`, juice `complete` |
| **Open a program** (code) | **1** T: slot lists | **1** click | **2** S `complete`, a toast (T) | **2** Ma: a pip fills on the hall's roof | `Toasts.tsx:60`, `audioData` cues |
| **Develop a course** | **2** N: $990k and weeks on the button, the shortfall in red | **1** no cue; the list re-scrolls under the cursor | **2** N: cash counts 1.36M→374k; the committee slot fills | **1** a bar in the tab; nothing on the map. Done = `tick` and a ticker line | juice `course` |
| **Hire a professor** | **2** N: stat bars on the card | **2** S `tick` at 122 ms | **1** the card vanishes and the grid reflows; 27→28 on payroll; a ticker line (T) | **1** a row in the Faculty list; nothing on the map | `img/c-hire.png`, juice `hire` |
| **Set tuition and admit** (summer) | **3** a slider, "families expect", the line you drag | **2** Mo: Lock starts the rain at once; S: none | **3** Mo: the applicants rain in (1.5 s), the admit line draws, the class pours into the hall's seats (1.9 s) | **2** N: on Open Year N, enrolled counts 1,516→2,640 with the `yearTurn` chime and a rank toast. Ma: no new students arrive on the map | `img/c-reveal.png`, `img/c-offers.png` |
| **A team wins / a title** | **1** T: a postseason line | **2** S: `fanfare` (`director.ts:83`) | **1** a hard cut to a full-screen inbox page of text, which stops the clock | **1** T/N: a count in Athletics. The map has no pennant or trophy; venues fill only in home-game weeks | `img/c-title.png` |
| **A chapter or milestone done** | **2** N: the chip counts up ("280/350") | **0** a chapter has no cue | **1** T: the chip's text changes. A milestone gets `complete` and a letter slip; a school distinguished gets the banner and `fanfare` (3, but see C-7) | **1** T: the drawer | `LogTicker.tsx`, `Toasts.tsx` |
| **A bad event** (deficit, a loss) | **1** N: weekly net, the shortfall in red | **2** S: `alarm` or `loss` | **2** Mo/N: the money pulses red once and stays red; a toast (T) | **2** S: the distress theme once construction freezes; Ma: frozen sites. Nothing else on the map changes | `Toasts.tsx:68`, `styles.css:4506` |
| **The specialization** | **3** Mo: the board's walnut room, four panels rise one after another (~200 ms), an "armed" bar to confirm | **1** no cue on Confirm | **0** a silent hard cut to a corner of the map; a ticker line | **1** a capital project appears in Build later | `img/c-specialization.png` |
| **The Final Report** | **2** S: the ceremonial theme from year 46; "Open the Final Report" — but the summer card's copy is the same as every year's | **1** click | **1** the whole report appears at once as static text (no motion or count in `FinalReportView.tsx`); `fanfare` plays only when the 50th admissions resolve (`resolveAdmissions.ts:79`), after the report has been read | **2** the hall of fame keeps a portrait of the campus | `img/c-final.png` |

**Juice coverage: 32 of 52 verb×beat cells score ≥ 2 = 62%.** The strong verbs are the
physical ones: placing, building, the admissions reveal. The weak ones are the
once-a-game moments (specialization, title, Final Report) and the most frequent
spending verbs (course, hire). Of these 13 verbs, the three biggest choices in a run
get the least feedback.

## Findings

**C-1. The specialization, a once-a-game choice, lands on nothing.**
*Now:* Confirm cuts, with no sound, to whatever corner of the map was last framed.
Screen change is 95% at once and then flat for 5 s, with no effect voices. The only
reaction is a ticker line ("Your college now specializes in research…").
`img/c-specialization.png`. Before it, the anticipation is the best ceremony in the
game.
*Proposed:* on Confirm, ease the camera to where the pillar's capital project will
stand. Stake the plot in the pillar's colour (the existing graded-ground look) and play
`fanfare`. Drop the ticker line and the follow-up letter, because the staked plot says
the same thing.
*Net:* +1 camera move, +1 cue (reused), −1 line, −1 letter.

**C-2. A title never reaches the map.**
*Now:* a national title plays `fanfare`, then stops the clock on a full-screen inbox
page of text (`img/c-title.png`: score lines, "+1.6 to where it is heading"). After that
it is only a number in Athletics and in the Final Report. Nothing in `CampusMap.tsx` or
`mapCanvas.ts` reads `orgs.titles`. Crowds appear only in home-game weeks
(`mapOccasions.ts`).
*Proposed:* the aftermath goes on the map. Hang a pennant in the school's colours on the
venue for each title (stacking for the eleven a strong run wins), and fill that venue
with a crowd in the week the title is won. Show the title as a banner over the map, as
"school distinguished" already does, instead of a clock-stopping page. Keep the bracket
in the log.
*Net:* −1 stopping surface (about 40 words), +1 permanent map mark; one cohesive signal
("banner over the map = a big win").

**C-3. The founding hides its own payoff.**
*Now:* naming and styling the college shows a live elevation, the game's best
anticipation. "Open the doors" then cuts to a camera on bare woods under a 70-word
letter ("The doors open"). When the player places Founders Hall, it pops in at full size,
and two text panels open in the same frame ("Step two: Choose the first program" and
"Where programs begin"). See `img/c-found.png`. The building the player just designed is
never celebrated.
*Proposed:* cut the letter. Open on the empty plot with the ghost already in hand. On
placement, let the hall rise into its footprint (about 400 ms, the same easing as the
completion ring) with `place` and then `complete`. Hold the next step until that has
played, then show one panel, not two.
*Net:* −1 letter (about 70 words), −1 panel, +1 motion.

**C-4. The summer reveal stops before the map.**
*Now:* the rain and the pour into the hall are the best motion in the game. Keep them
(`img/c-reveal.png`, `img/c-offers.png`). After that comes a text page (Students). On
"Open Year N", enrolled counts up with `yearTurn` and a rank toast, but the map is the
same as before: the new class never arrives, and walkers scale with enrollment only
slowly (`Walkers.tsx`). Lock and Send play no effect.
*Proposed:* on Open Year N, start the walkers at the gates and residence doors in
proportion to the class, so the first minute of the year looks busier. Play a soft
`tick` as the seats fill (the class is the year's biggest number and it is silent).
Fold the Students beat's one line ("one new organisation") into the ticker.
*Net:* −1 summer beat, +1 map reaction, +1 cue.

**C-5. One chime means everything.**
*Now:* `complete` plays for building, program, milestone, breakthrough and demand-met.
`tick` plays for nine topics. `letter` plays for six (`audioData.ts` cues). Months of
waiting for a hall sound the same as a letter that a milestone was reached. Course
start, Lock the price, Send the offers, Confirm specialization and paving have no cue,
but every button press has `click`.
*Proposed (one signal, one meaning):* give the building its own completion cue. That is
the one thing the player watched get built. Let `complete` mean "a choice paid off"
(program, course written). Make `tick` silent for background topics (departure,
candidate, petition, publication, training), so the cues that remain carry meaning.
*Net:* −5 cue mappings, +1 effect.

**C-6. The spending verbs are silent and land in a list.**
*Now:* a $990k course: cash counts down (good), there is no sound, and the list
re-scrolls under the pointer (`img` not kept; juice `course`, 39% screen change from
the scroll alone). A hire: the card blinks out and the grid reflows (`img/c-hire.png`).
Neither shows anywhere outside its tab.
*Proposed:* small, in proportion. Use one `coin`-family "spend" cue for any committed
cost. The card or the course chip moves into its destination (the dept row, the
committee slot) over 200 ms instead of vanishing. Keep the list from scrolling on commit.
No map juice: these are frequent and should stay quiet.
*Net:* 0 surfaces, +1 cue, +1 motion, −1 jarring scroll.

**C-7. Reduced motion hides the school banner (bug).**
*Now:* `.school-banner` runs `banner-in 4.5s … both`, and its last keyframe is
`opacity: 0` (`styles.css:4456–4467`). The blanket reduced-motion rule
(`styles.css:210–223`) shortens the animation to 0.01 ms, so the banner sits at
opacity 0 for its 4.5 s. The comment at `styles.css:4414` says the banner "appears
without moving", but it doesn't appear at all. The rank pill's flash (`rank-up`/`down`)
also ends transparent, though the number and the toast still carry that information.
Everything else keeps its information: AnimatedNumber snaps, the canvas ring is drawn
still (`mapCanvas.ts:1028`), lab news is held still, the admissions animations commit
in one step, and the specialization panels use `animation: none`. The dust puff is
skipped (`CampusMap.tsx:1367`), but the plot itself remains.
*Proposed:* `:root[data-motion='reduce'] .school-banner { animation: none; }` plus the
media query, so the banner shows still for its 4.5 s, like `.spec-panel`.
*Net:* 0.

**C-8. After placing, the Build panel covers what was just built.**
*Now:* the panel shrinks to a "Placing…" bar while the ghost is out. On the click it
reopens to full height, covering the bottom 45% of the map, in the same frame the plot
appears (`img/c-place.png`). The dust puff (`CampusMap.tsx:1359–1375`, 900 ms) is too
small and pale to show at normal zoom: screen change stays at 30.1→30.2% from the
0 mark to the 400 mark.
*Proposed:* keep the panel down for about 1 s after a placement (or until the pointer
returns to it), so the plot, the dust and the `place` thud read as one beat. Size the
puff to the footprint, with a minimum size on screen.
*Net:* 0 surfaces, aftermath made visible.

**C-9. The Final Report arrives as a wall.**
*Now:* the 50-year verdict appears at once as static text with six grades
(`img/c-final.png`). `FinalReportView.tsx` has no motion and no AnimatedNumber.
`fanfare` fires when the 50th admissions resolve, after the report has been read. The
summer card above it uses the same words as every year ("The summer is here…").
*Proposed:* open the report over the campus as it stands (the hall of fame's portrait
already exists). Stamp the six grades in one by one (GradeMark, `tick` each), and count
up "Students taught". End on the final grade with `fanfare`, moving that cue from
resolve to the reveal. Drop the summer card's generic copy for year 50.
*Net:* −1 card text, +1 sequence. This is the loudest moment in the run, in proportion
to its weight.

**C-10. The map doesn't show a good year from a bad one.**
*Now:* what the map shows of the college's state is crowd size (enrollment), sites
(construction), frozen sites and the distress theme (deep distress), and seasons. Cash,
satisfaction, rank and titles don't reach it.
*Proposed (with pass E):* pick two cheap tells and no more. Flower beds and banner
lamps go dark in a deficit year (the commencement lamps already carry colours). Walkers
gather at the quads only while satisfaction is high. Either one lets a tab figure leave
the screen.
*Net:* +2 map tells, a candidate −1 figure each (pass E to confirm).

**C-11. Chapters end in text only.**
*Now:* when a chapter is met, the chip swaps its words. No cue, no motion. A milestone
gets `complete` and a letter slip.
*Proposed:* if chapters stay (pass B may thin them), use `tick` and a check-mark
stroke on the chip. Don't add a celebration: chapters are scaffolding, not achievements.
*Net:* +1 small motion, 0 surfaces.

### Over-juice

- **The admissions animations can't be skipped:** 1.5 s rain + 1.9 s flow + 0.7 s
  settle (`AdmissionsPage.tsx:51–54`). That is about 4 s each summer, or about 3.5 min
  over a run. Proportion is right for the year's central choice, but a click should
  finish the animation (as reduced motion does).
- No 'same pop on everything' found. Every toast slides in the same way, but they are
  rare by design (`Toasts.tsx` header). The `click` is quiet (gain 0.025). Nothing else
  blocks input.
- The reverse problem is the real one: celebration is **out of proportion downward**.
  The three choices that end chapters of a run (specialization, title, Final Report)
  get less than a $150k gazebo.

## The ambient campus

Walkers follow real routes and open the doors they pass. Desire lines wear the lawn.
Trees turn in autumn (y7w18). Crowds fill venues in home-game weeks, the lamps carry the
colours at commencement, and birds thin out in autumn and stop in deep winter. Watching
the campus is rewarding while it grows (the year-50 save is a dense, legible town). But
it is the same campus in a good year and a bad one (C-10). And it stops completely when
paused, so the screen a player most often pauses on (a tab or a decision) is always the
still one.

## Keep (scores of 3)

- **The admissions reveal:** the applicants rain in, the admit line draws, the class
  pours into the seats. It is the best motion in the game.
- **Construction:** graded plot → hoarding → scaffold → shell → building, with a
  progress bar, then the gold ring (which stays drawn under reduced motion).
- **The `place` thud plus cash counting down:** an instant, physical action.
- **The founding elevation** that redraws for each style and colour, and the
  **specialization room's** staggered panels: anticipation done right. The payoff
  after each is what's missing (C-1, C-3).
- **AnimatedNumber's discipline:** it tweens only, and snaps under reduced motion.
- **The school-distinguished banner over the map, with `fanfare`:** the model for C-2
  (once C-7 is fixed).

## Filmstrips

In `img/`: `c-found.png`, `c-place.png`, `c-complete.png` (a crop: site → ring →
building), `c-hire.png` (before and after), `c-reveal.png`, `c-offers.png`,
`c-specialization.png`, `c-title.png` (a screenshot), `c-final.png` (a screenshot).
Raw strips and report.json for every verb are in
`unischool/node_modules/.tmp/juice/<name>/` (found, found-style, found-next,
found-hall, place, place-ghost, path, complete, course, hire, reveal, offers, openyear,
title, spec-open, spec-choose, spec-confirm, final, nothing). The PNGs in `img/` were reduced to
256 colours.
