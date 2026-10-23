# Playtest 1 — findings

*Filed weekly from the form, the page's comments and the statistics, under
the reviews' areas ([`README.md`](README.md), the triage rule). One line a
finding, with how many players said it and where it came from: `form`,
`comment` (the itch.io page), `reddit`, `live` (a session the owner
watched), `form` (the in-game feedback form), `discord`, `service` (a
playtesting service) or `stats`. Every reply read is
logged under *The replies* at the bottom, with its link, so a count can be
checked against what was said. A finding that loses a save or blocks a run is also
marked **0.1.x** and fixed in a patch.*

## The three questions

| Question | What the playtest found |
|---|---|
| How long is a first run, and where do people stop? | Half of the desktop runs stop before the first summer; of those past it, most reach year 10 (PostHog, 11 October, below). A run's length depends on the speed played: at mostly 1× the clock is near the design's 3.6 hours (year 35 at 119 minutes, year 20 at 83: about 2.5–3.5 hours to year 50); players who use 4× and 8× reach year 50 in about an hour (59 and 71 minutes). Played minutes are cumulative per run and count only the running clock; in real time the one full run in a single sitting took nearly 6 hours (re-checked 11 October). One player: 4+ hours in a first sitting, with a partner (R3). |
| Do players reach the specialization? | Every player who reached year 21 was offered it; 4 chose, all in years 21–24 (PostHog). |
| The opening, the summer and the Final Report | The opening: one player lost after the tutorial ends (R2); one who skimmed the walkthrough and missed that programs need their courses developed in the Curriculum (T1). The summer: T1 admitted 1% three years running into debt. |

## 1 · Aesthetics

- **The concept and the detail land.** "Extremely well thought of and so
  fun"; the university fits the city-builder theme; "I love all the
  details." Also "looks pretty good", "looked like a fun concept",
  "pretty damn awesome, idea and execution", and a five-star rating:
  "deeply impressed", and "the most fun and detailed simulation/city
  building game I played in a long long time". *18 players · reddit (R1,
  R3, R4, R8, R9, R12, R14, R16), comment (I1, I2, I3, I4), live (T1), form (F1, F2, F3, F4, F6,
  F7, F8), discord (D1), service (S1, S2).*
  F8, after a finished run at rank 1: "If I didn't know this was a
  playtest, I wouldn't have figured it out and thought it was a completed
  game"; best moment, turning schools distinguished and then founding the
  graduate programs, "to try and better the quality of the faculties";
  would play again, a game "that isn't too rigid but not completely free";
  would pay $10–15. F7: "quite fun", "thanks for the beautiful game", and
  "quite some fun" reading the course names.
  S2, a playtesting service's reviewer, about 30 minutes on 0.1.2: "I
  found this really soothing to play"; the music and audio "almost like a
  form of meditation"; loved the art style, "particularly the little
  people walking around the campus", and the changing seasons; placing
  the first building gave "old-school *The Sims* vibes" (with D1, the
  second to say so); "I'll definitely play more of it."
  S3, the same reviewer on a livestream about a week later (0.1.3, to
  year 6): the low-poly style cohesive across menus and game, the seasons
  and animations a highlight, the music "meditative" and "soothing", the
  hand-drawn circles around professors and the students' pathfinding;
  "a strong step up"; compared favourably to *Two Point University* as a
  more serious take on the genre, and worth recommending.
  R12, from the screenshot and the page: "It feels like a classic tycoon
  game right out the gate."
  The quotes worth reusing are collected in
  [`docs/store/quotes.md`](../../store/quotes.md).
  F2, after 1–2 hours: "I've been looking for exactly this type of game
  for a long time"; "I reeeally enjoyed playing and love the concept as
  well as the execution"; best moment "seeing the money amount
  increasing and being able to buy everything that the students would
  want"; would play again "every once in a while absolutely"; would pay
  $5–10.
  S1, after about three years of play: "I'd give it a nine out of ten. It
  feels one of a kind"; "I didn't stop because I was getting really
  engrossed. I'm getting addicted"; "I love how much micromanaging you can
  do: searching for teachers, planning courses, laying out the
  university". Liked the flavour text (lights on at night after the first
  students moved in; the brown line worn across the quad) and the
  buildings' progress bars.
  D1, a first look: "giving proper throwback to the original Sims vibes",
  and "really liked [the] visual style on the buildings/scene".
  F1, who finished a run: best moment "unlocking and expanding the
  campus"; would play again, "a good pathway for replay ability"; would
  pay $10–15.
  T1, a streamer who doesn't usually play these games: "this reminds me
  of games I used to play" and "I've spent money on Steam for games way
  worse than this"; past an hour, when the owner left, he kept playing.
  **A line for the store page:** "this feels like the football manager of
  universities" (R8, a Football Manager fan; the marketability memo had
  named FM players as the audience).
  (I1 and I2 are almost certainly R1's player under the itch.io name
  ALEXANDERGGA08, so they don't add a player.)

- **Let players switch architectures mid-run.** Today the architecture
  is picked at the founding and kept for the run; the owner is
  considering letting players switch, or mix styles as they build. One
  player: "Let them switch. More player freedom, more player enjoyment."
  If the number of styles grows, make picking one easy: pin favourites,
  search, or a random pick. *1 player · reddit (R6, R7).*
  **Decided: keep the choice as it is for now** (the owner, 10 October).
  A campus in one style looks better than a mix, and each style is a
  reason to play again: a player doesn't see the Gothic library until
  they found a Gothic college. Kept in mind under *Direction, not plan*
  in `BACKLOG.md`.

- **The camera hides what stands behind a building.** "Do you warrant I
  can be more free with the camera? I could not see the paths behind
  buildings." Playing in the Mission style, F7 also "found the towers not
  so nice." *1 player · form (F7).*
  The camera already turns (Q/E), tilts (Z/X), pans and zooms; the
  owner's reading (22 October) is that F7 didn't know how. **Decided: a
  chapter that has the player use every camera move.** *Looking around*
  opens once *The next course* is done and asks for a pan, a turn, a
  tilt and a zoom, by key, mouse or touch, all four required before
  *Somewhere to sleep* opens; Home is optional. (First built as a side
  chapter that stepped aside; in play it was passed over, so the owner
  made it a step of the chain.)

## 2 · UI and text

- **The walkthrough's words are too many, even on 0.1.2.** S2: the
  introduction was still text-heavy, "less so than I remember when I
  looked at it about a week ago", and "it's mainly the wordiness of the
  text that's difficult to follow. There were multiple times throughout
  where I had to read and re-read something just to understand what it
  was saying. It often felt like more words were being used than
  necessary." The tabs are fine; the descriptions and the tutorial
  paragraphs make them hard to take in at first. The long step headings
  ("Somewhere to Sleep, Somewhere to Eat") are a minor dislike. With D1,
  S1's board letter and F6's "UI is kinda hard to read", the most
  repeated finding of the playtest: the game is easier than its words
  make it look. *4 players · service (S2, S3), discord (D1), service
  (S1), form (F6).*
  S3, the same reviewer a week on (0.1.3): onboarding "noticeably
  improved", the next objective always in view, but the text still
  "hard to absorb large blocks while also learning mechanics", and its
  sentences "unnatural and hard to parse". Suggested: set flavour text
  apart from the essential instruction, and front-load less, bringing in
  context as the player progresses.
- **A year-end screen opens over whatever the player is reading.** S2
  was reading a menu (the Faculty screen) when the calendar reached the
  summer and the End of Year overview forced itself open, "quite jarring,
  particularly when it happened repeatedly while I was trying to read
  something else." *1 player · service (S2, again as S3).*
  On 0.1.3's stream it happened twice more: "sometimes you're reading in
  a menu and then … this year in review pops up and just takes over";
  "if you're not actually familiar with the menus it can be a little bit
  off." The reviewer assumed it was intentional.
- **The screens after the first course are text-heavy.** "After setting up
  an English literature course, the next few screens were quite
  overwhelmingly text heavy." Those are Plan 103's new steps (the next
  course, the needs, the residence and dining halls) on 0.1.1, or the
  board's letters on 0.1.0. A quick first impression, by the player's
  own account; with T1 skimming the walkthrough, the second hint that its
  cards are long. *1 player · discord (D1).*

- **The letters that stop the clock are too quiet.** The player didn't
  notice that time had stopped, or that something was waiting for him.
  *1 player · live (T1).*
- **The pennant split the college's name mid-word.** "Baltimoore
  College" showed as "Baltimoor / e College": the banner sizes the name
  by its total length and lets a word break. Plan 104 as K. *Owner, from
  S1's video.*
- **A red Confirm read as Cancel.** Moving programs into Elm Hall, the
  reviewer thought the moves were under way and waited, then found none
  had started: "I never clicked Confirm … because that was red … I just
  saw the red and kind of assumed it was cancel." The co-host would have
  expected the move to start at the first click. *1 player · service
  (S3).*
- **The board's letters are hard to parse.** The sweep letter ("Money
  doing nothing … The board suggests a standing sweep …") read aloud:
  "I find this language kind of hard to digest … it's the structure of
  those sentences. I just don't find that's natural English to read",
  and the same of the year's opening line ("The first class [is]
  … and the college year behind it") and the *Standing* briefing ("The
  readout above gives each pillar's points now"). The hall-claim letter:
  "That's an awful lot of saying 'social science and humanities'." The
  most specific examples yet behind the wordy-text finding. *1 player ·
  service (S3).*
- **"Would not return this summer: dining, study space."** In the year
  in review, "Nine students would not return this summer … I'm not sure
  what that means." *1 player · service (S3).*
- **"Open the Treasury" met without the player noticing.** The chapter
  moved on to chapter 7 and the reviewer asked "am I missing key
  steps? … I didn't open that Treasury", then wondered whether the board
  letter's door had opened it for him. *1 player · service (S3).*
- **No sign of how long a move has left.** With programs in transit to
  Elm Hall: "do we have an indicator of how long is left to move?" He
  didn't find one on the map or the panel. *1 player · service (S3).*
- **The briefings' shape works; their length doesn't yet.** The co-host:
  "It's a lot of text. I quite like how it's broken up with what it is,
  how and why it matters. That's quite a nice way of presenting it." The
  objective chips along the foot: "a nice little touch … not intrusive."
  *1 player and a co-host · service (S3).*
- **The full-screen menus are a lot at first.** "Slightly overwhelming
  for new players, though visually impressive"; the UI outside the large
  info windows "clean and well-designed". *1 player · service (S3).*
- **The UI is hard to read at times.** "The game is somewhat confusing,
  the UI is kinda hard to read at times." *1 player · form (F6).*
- **The board's opening letter took two reads.** "350 students are on
  the books, nobody is on the payroll … Founders Hall hasn't been placed
  yet": S1 read it a couple of times ("Sorry, what?") before it made
  sense as no people, no courses, no building. *1 player · service (S1).*
  The owner's reading (16 October): "all three are yours to fix, in that
  order" asks the player to remember three tasks and an order, and the
  order isn't the one the walkthrough plays. The letter should welcome,
  then start with Founders Hall; programs, their teachers and courses
  come as the steps reach them. Plan 104 as L.
- **A need's score reads as a clock.** S1 took a need's "12" for a time
  of day. It is a score out of 100 at its floor (`ATTRIBUTE_SCORE_FLOOR`):
  the Students tab shows it as a bare number in a round, ticked dial, with
  no "/100", beside a bed count; the walkthrough's needs step says
  "Housing is at 12" the same way. Only the header's hover says "out of
  100". *1 player · service (S1).*
- **A grade that doesn't move when a better professor is appointed.** S1
  appointed Dr. Priya Iyer to Mathematics and it still showed a C. The
  grade is the instructor's teaching *now*, less a load penalty (up to −7
  at a full load) and an upper-tier penalty: Iyer starts at about 63, a B
  on Calculus alone, a C once she teaches two courses or a tier-2 course,
  and rises as she matures. Only the course drawer lists those factors;
  the chips say none of it. F2 asked what the grades mean too.
  *1 player · service (S1).*
  **Decided: no teaching overload** (the owner, 16 October, from S1's
  video: Iyer appointed as a B, her courses sinking to C as she took
  more). The load penalty goes; the course slots stay. Plan 104 as J.
- **What the grades and ranks on a teacher mean.** F2 didn't understand
  the letter grades (A, B, C) or the ranks (assistant, associate…), nor
  how they affect teaching, courses or students, and asked for each
  attribute and its effect to be explained. *1 player · form (F2).*
- **The walkthrough is skipped by players who don't read.** T1 skimmed
  it and was a little overwhelmed. *1 player · live (T1).*
- **Where a debt is paid off.** "Debts were quite confusing: where do I
  pay them off? I must have missed that. Not that it really impacted the
  game." *1 player · form (F7).*
- **"Fill from market" doesn't say where the teachers come from.** When
  teachers retired, F7 couldn't tell whether it would move the good
  teachers already on the payroll or hire from the market, so filled
  the slots by hand "to avoid getting a C teacher." *1 player · form
  (F7).*
- **The promises are hard to find again.** "I had trouble finding the
  promises I had made and was never sure where they were." From the runs
  before 0.1.3, which adds a *Promises* chapter. *1 player · form (F7).*
- **A decision waiting reads like the news.** F8 missed a few "to be
  decided" events "since it also works the same way as the news, but it
  could be because of user error too." With T1's quiet letters, the
  second player to miss something waiting on them. *1 player · form
  (F8).*

## 3 · Intuitive gameplay

- **The tutorial ends too soon.** After the first course (English) is
  created the tutorial's popup closes, and the player didn't know what to
  do next; they asked whether that was normal. It is (the walkthrough ends
  there), but the hand-off reads as the tutorial breaking. The owner's
  reply: maybe stretch the tutorial out longer. *1 player · reddit (R2).*

- **The program-moving step: which to move?** In *A hall of its own*,
  it was "unclear which courses were meant to be moved vs. others". The
  objective asks for any program moved into the new hall; nothing says
  which, or why one rather than another. *1 player · service (S3).*
  From the transcript: the briefing's line ("A program moves from its
  hall's panel: four weeks out of Founders Hall, twelve from anywhere
  else") "is not resonating with me"; *Go* brought him to the new hall's
  empty slots, which offer programs to found, and he took them for the
  way to move one ("this looks like it's founding newer courses"). The
  owner explained in chat (open Founders Hall, pick a program, move it).
  He'd first clicked a program the chapter didn't mean, and suggested the
  ones to move be highlighted, while doubting that would sit with the rest
  of the game. "I think this is broadly where I got stuck last time."
- **Rotating a building took a while to find.** "It took me a while to
  figure out how to rotate … you see the little icon in the corner for
  the rotating. I think I should be able to click that?" (It was: the ⟳
  on the ghost, or R.) *1 player · service (S3).* **Removed** (the
  owner, 22 October): the ⟳ was clickable in theory, not in practice, so
  it goes; R turns a building, and on a touch screen the placing bar's
  Rotate button does.

- **Where to found the next program.** A few months in, S2 wanted a
  third subject and couldn't remember where the eight program slots
  were; looked under Faculty for a while before remembering Founders
  Hall. The same seam as T1 and R2: programs live in a hall on the map.
  *1 player · service (S2).*
- **Walkers heading for the road before any path is laid.** When
  Founders Hall went down and the people walked towards the road, S2
  wasn't sure it wasn't a bug, with no paths placed yet. *1 player ·
  service (S2).*
- **How long is a run meant to be?** S2 was in year 3 at 20–25 minutes
  and asked whether players are expected to keep saves going for 50
  years. *1 player · service (S2).*
- **Programs on the map, courses in the Curriculum.** The most
  confusing part, in T1's words: a program is offered and placed in the
  map view, but its courses are developed in the Curriculum tab. He
  thought you just keep adding programs, and didn't realize they need
  developing further. This is the same seam as R2 (lost after the first
  course) from the other side. *2 players · live (T1), reddit (R2).*
- **Overwhelming at first, and the tutorial easy to miss.** "A little
  hard to figure things out (maybe there was a tutorial I skipped
  accidentally)": not a problem for them, but they expect it would be
  for a new player. With R2 and T1, the third player to find the start
  hard to read. *1 player (with a partner) · reddit (R9).*
  R18, from the post's video alone: "The game looks a little bit
  complicated but keep at it." The look of it says complex before anyone
  plays. *1 more · reddit (R18).*
- **Too much on screen during the walkthrough.** "The next action is
  clear in the walkthrough, but all the stats and menus are competing
  with it." The suggestion: keep the opening to hall → professor → first
  course, with the other tabs dimmed until those are done ("could help
  without cutting any depth"). Holding the clock during those steps was
  called "a good call". Today the walkthrough holds the clock but leaves
  every tab and the top bar live (the toolbar dims only for a board
  letter, `App.tsx`'s `holding`). In Plan 104 as F. *1 player · reddit
  (R10, R11).*

- **Past the walkthrough, the systems aren't introduced.** F2 (1–2
  hours, sent from year 12) saw the milestones and objectives in the
  bottom banner but often didn't know what to do to reach them, wasn't
  sure what athletics was for, and found research projects confusing.
  Asked for "a more comprehensive introduction" that brings in the main
  systems gradually, so a player knows what to prioritize and doesn't
  miss a feature for not knowing it exists. With R2, T1, R9 and D1, the
  fifth player to find the game hard to read, and the first to name the
  systems after the opening. *1 player · form (F2).*

- **The Students tab in week one shows a college failing.** The
  walkthrough's "Somewhere to sleep, somewhere to eat" opens it before
  anything is built, so every need reads low, and health's dormant dial
  ("–", "Not yet a need") reads as one more failure. **Decided** (the
  owner, 16 October): the tab opens after the first summer; the
  walkthrough has the player build one residence hall and one dining
  hall instead; health isn't shown until it's a need, so a college doing
  everything it can reads full marks. Plan 104 as M. *Owner, from S1's
  video.*
- **Prestige falls and the player can't tell why.** "I've established a
  bunch of programs, a sports team, some clubs, why is my prestige
  continuing to plummet? So I'm not entirely sure what it is that makes a
  'good' score." The same gap as S1's satisfaction: the number moves and
  the game doesn't say what moved it. "None of that really impacted my
  enjoyment." *1 player · form (F6).*
- **Why satisfaction falls in year two isn't said.** S1 couldn't find
  satisfaction at first, then couldn't work out why it kept dropping in
  year two with dining, academic and social all full and health "not yet
  a need". Housing, the worst crowding in the year's review, was the
  likely pull, and S1 was trying and failing to build more of it (7 ·
  Bugs). The causes are real (the
  second class arrives into the same beds and seats, expectations rise
  with prestige, health becomes a need past a population), but the game
  shows a trend arrow and the lowest need on hover, never the reason in
  words. *1 player · service (S1).*
- **The art gallery and the hospital look decorative.** F7 placed them
  "distractedly" thinking they were "just decorative / for stats, and not
  that I could have a course in them." *1 player · form (F7).*
- **Income swings as the acceptance rate moves.** Changing the share of
  applicants admitted made the weekly earnings "completely nonlinear: it
  became positive, negative, positive, etc. I really did not know why
  that was." *1 player · form (F7).*
- **Renovating every building by hand, with no stakes shown.** "Manually
  having to renovate all buildings was annoying, further the consequences
  were never expressed, though I presume it's bad for my reputation."
  *1 player · form (F7).*

## 4 · Strategy

- **Short of money for the first academic hall.** In year 5 the
  reviewer couldn't afford Elm Hall ($2.5M) and asked "is there anything
  I can do to earn more cash?", trying higher dining prices; "this is
  roughly where I got to last time. So I wonder if this is something I
  am doing wrong or maybe this is expected." Cash rose "quite a bit" soon
  after, and he built it. *1 player · service (S3).*

- **Finding a decent teacher, and waiting to add more classes,** were the
  most frustrating part of a full run. The faculty market and the pace of
  new courses (the second review's B4-5 and the catalogue's pacing).
  *1 player · form (F1).*

- **Admitting 1% three summers running put the college in debt,** and
  the player didn't connect the one to the other. Nothing in the summer
  stopped or warned him. *1 player · live (T1).*
  **Decided: no change** (the owner, 14 October). He wasn't reading or
  deciding with care, and a good strategy game should punish that. Once
  he worked out what had happened he fixed it, got money back above zero
  and made progress: the cause could be found and the hole climbed out
  of, which is what matters.

- **Searches that turn up only weak candidates.** S1 spent much of the
  session posting faculty searches and comparing candidates; several came
  back with only C, D and F candidates (FF, DF), so they searched again.
  At one point a search "seemed to stop" and they thought they were out
  of money, but weren't. With F1's "trying to find a decent teacher",
  the second player to find hiring slow. *2 players · service (S1), form
  (F1).*
  **Decided: the mechanics stay, the presentation changes** (the owner,
  16 October). A young college can't hire the best teachers, and the
  faculty should grow across the game; shown as letters, a weak early
  market reads as failure. Teaching becomes a number, so a 50 among 40s
  reads as a good hire. Plan 104 as G.

- **Every run starts the same.** After one full run, the most
  frustrating part of the second was "the beginning because it starts
  off exactly the same". The player still wants to replay: "I like
  seeing the different ways the university can develop and get its own
  unique culture." *1 player · form (F3).*

- **Two titles a year reads as a cap.** With eight teams at 100 quality,
  "the max seems to be two". There is no cap: every postseason round
  gives the college's opponent a stage edge (8, 20 and 35 points by
  round; for an athletics-specialized college a quarter of that, 2, 5
  and 9, less the Athletic Performance Complex's), so even a 100 team
  often loses a semifinal or final (`systems/athletics/playoffs.ts`).
  That is by design: the owner asked for about 25 to 40 titles by year 50
  for a specialist (Plan 85G's review, 1 October), against 50 to 80
  with no edge. What the player can't see is why: nothing says the
  stage favours the established powers. *1 player · form (F3).*

- **A program can't simply be chosen.** "That one cannot independently
  choose which faculty to establish" was the most frustrating part of a
  finished run. Programs come from a draw of three offers (one decline a
  year), not a free pick, unless a school's own hall offers its school
  (`systems/techtree/programOffers.ts`, Plan 78D). T1, who thought you
  just keep adding programs, met the same system from the other side.
  *1 player · form (F4).*

- **The last years are empty, and money stops mattering.** "I felt like
  the last years were mostly about getting all the courses, and little
  more"; "the last 10-15 years were mostly empty"; "money was kind of
  never a problem", and with research "an absurd amount of money … useful
  in the beginning, but at a certain point.." Little reason to replay
  "apart from choosing a track for the university." *1 player · form
  (F7).*
- **A scientist drawn by research is no better than the market.** "When
  scientists are attracted by research and I get the notification, I
  would expect them to be at least somewhat good; could you add a bonus
  for teachers attracted by research? … it just felt underwhelming." *1
  player · form (F7).*

## Asked for in play

- **An ordinance system "like in the SimCity series"**: standing policies
  for the college. *1 player · form (F1).*

- **More ways to make the campus its own.** More than benches and
  trees: decorative options, architectural styles, elements that carry
  the university's identity, so each campus feels personal. F7: the
  style is "only a decision made in the beginning.... beyond that, there
  are practically only paths and basic trees I can place"; "outdoor
  personalisation is needed." F8, who "likes to decorate", was excited by
  0.1.2's grounds. *2 players · form (F2, F7).*

- **Campuses as levels, and land bought by the plot.** F7: "Maybe you
  have the medical campus, then another, then another": specialised
  campuses that lengthen the game and shorten each run, perhaps with two
  specializations offered per level. And "a plot system where you have to
  pay for more plots", though "that may also prove problematic with the
  very big buildings". *1 player · form (F7).*

- **A skill tree** beside research and the specialization: invest in
  arts and culture to unlock cultural facilities or events, in finance
  for economic advantages, in research for efficiency, each branch
  opening further ones, so progress isn't mostly buying more buildings.
  The player knows it's a big feature. *1 player · form (F2).*

- **The people who run a university.** "Some aspects of the abstraction
  feel very 'gamey' … I wonder about the campus administrators,
  facilities staff, cooking staff, board of trustees, etc. There's just so
  much that goes into running a university. Not sure if all that is
  outside the scope of the game." *1 player · form (F6).*

- **Other languages.** "The absence of other languages" was named as a
  frustration. The game is English only. I4, in Spanish: "ojalá en
  español algún día" ("I hope it's in Spanish someday"). *2 players ·
  form (F4), comment (I4).*

- **Automated athletics hiring.** "A way to automate athletics hiring.
  Ex: Auto hire people with xx grade and/or xx potential with a minimum
  threshold of xx." *1 player · form (F5).*

- **Coaches with continuity, history and reputations.** "There should be
  a growing bonus for having the same coach. It seems odd that I can
  fire a champion coach the next year, hire a higher quality coach
  without any consequences", and "coaches should have history and
  reputations". *1 player · form (F3).*

- **Benches on a quad.** T1 tried to put benches on top of a quad, and
  enjoyed placing benches more than almost anything else. *1 player ·
  live (T1).*

- **Moving a building.** "Can we pick up and move structures?" Only in a
  sandbox today; in a normal run a building comes down and goes up again
  elsewhere (Founders Hall can't). *1 player · reddit (R15).*

## 7 · Bugs

- **NEXT asks for a library that stands.** In year 2, with a library
  already built, the line at the foot of the screen still told S2 to
  build one. The likely cause: the satisfaction hint names a building
  for whichever need is short (`nextStep.ts`'s `ATTRIBUTE_BUILD`,
  "a library would raise it" for academic) without asking whether it
  already stands, and academic satisfaction also reads the courses'
  quality. *1 player · service (S2).* **Fixed** (19–20 October, for
  0.1.3): the line reads academic's two parts; with no library it asks
  for one, with a library short of seats it asks for more seats (a story
  or another), and with the seats enough it says the teaching is what
  would raise it and opens the Faculty tab (`nextStep.ts`'s
  `academicRemedy`).

- **Placing one path square sends every walker to re-plan.** "Placing a
  single square of path causes all the people walking around to
  recalculate where they're going, even when the path is nowhere near
  them … This happens with every click when placing paths." Not a
  failure, an unnecessary calculation. *1 player · service (S2).*
  Still so on 0.1.3: "every time you place a path segment, they'll change
  where they're going … not really a big deal." (S3)

- **A red ghost with no reason.** S1 couldn't place buildings in several
  spots and never got a reason: more housing in year two, while housing
  was the worst-crowded need; buildings next to Elm Hall; benches in the
  park. The map says why only
  for ground, road access and walling off a building; money, a board
  freeze and an unavailable building turn the ghost red with no words
  (the map's own hint says "the ghost says why"). Worse, the ghost checks
  cash only while the click also tries a gift, loan or the endowment, so
  a spot can show red and still accept the building. Likely a bug
  (`CampusMap.tsx`, `preview.ok` against `placeById`). *1 player ·
  service (S1).*

- **No courses can be added in Walnut Hall** (0.1.2). "Cannot add
  courses once Walnut Hall is built. (Cannot click on the +course button
  even if courses are transferred into Walnut Hall)." The player stopped
  at year 38 and will play again "once the bugs are fixed". *1 player ·
  form (F5).* **0.1.x**
  The cause, reproduced: the "+" on an empty slot (`BuildingInfoPanel.tsx`'s
  `HallSlots`) offers a hall's programs. A hall holding three programs of
  one school is claimed by it, and a claimed hall offers only that
  school's unfounded programs, *in place of* the global draw (Plan 100).
  Late in a run a school usually has none left, so a claimed hall's free
  slots refuse every program, including the ones on offer that no other
  hall can take. Moving three of one school into Walnut Hall (moves in
  transit count) claims it and closes it at once. The panel says only
  "Nothing is on offer to found here." A second possibility, which the
  save would settle: by year 38 every program in the catalog is founded,
  and nothing says so.
  **Decided: a claimed hall whose school has nothing left to found takes
  the global offers** (the owner, 19 October), and when the whole catalog
  is founded the "+" says so.

- **The research specialization's building doesn't appear** (0.1.2).
  "Research specialization building doesn't appear upon specializing in
  it." *1 player · form (F5).* **0.1.x**
  The cause: the Research Park also waited on every standing lab having
  finished a research project (Plan 53), and until then it was absent from
  the build menu, not even listed closed; the choice's card never said so.
  The other specializations' buildings open with the choice. **Decided:
  drop the lab condition** (the owner, 18 October): the park opens with
  the research specialization.

- **A tower under renovation hides the church behind it from clicks.**
  "When renovating the tower, I could not access the church behind, which
  was only the case during the renovation." *1 player · form (F7).*
  The cause, traced (not yet reproduced in play): the scaffolding is
  drawn as one box over the tower's whole footprint, as tall as the tower
  and its spire plus 4% (`CampusMap.tsx`, `boxFaces(…, wallHeightOf(t) *
  1.04)`), while the Bell Tower's shaft is under half its 3×3 footprint
  wide and the Campanile's under a third. So the scaffold is a wall two
  to three times the tower's width and taller than the chapel's nave,
  and unlike the other site overlays (`.campus-site-frame`, `.campus-age`)
  it still takes clicks: a click on the chapel behind lands on the tower.
  Walking and the building's working are untouched. The smallest fix is
  `pointer-events: none` on `.campus-site-shell`; the better-looking one
  sizes the scaffold from the landmark's own volumes (`landmarkVolumes`).
  F7's other half, that renovating's consequences are never shown, is
  real too: the Estate tab's help and the building's "Condition" line
  speak only of wear, while condition also lowers the campus's beauty and
  prestige, and a large backlog brings events.
  **Left as it is** (the owner, 22 October).

- **Stairs drawn backwards** (the owner, 12 October, in a reply to R8).
  Traced and fixed by Plan 99E (13 October), shipped in 0.1.1. *Owner.*

- **On a phone, Founders Hall can't be built.** The player guessed the
  game wasn't meant for mobile and stopped. *1 player · reddit (R4).*
  The cause (the owner, 9 October): the tutorial's boxes cover the map,
  so there is nowhere to tap, and with a box closed the *Place* button
  is hard to find. **Decided: phones are not supported for now.** The
  owner won't give up any of the desktop game's quality for them, so this
  is not a `0.1.x` fix. It is listed under *Known issues* in `README.md`,
  and the itch.io page now says the game is for a computer.

## Asked for

Not findings about the game; counted here so the demand shows.

- **A Steam demo / Steam release.** "Would love a steam demo in the
  future", "Steam hope?", and "waiting for years with a theme like this
  on steam". *1 player, three times · reddit (R1, R5), comment (I1).*
- **A phone version.** "Plan for Android?" Phones are not supported for
  now (the owner, 9 October; see *On a phone, Founders Hall can't be
  built*). *1 player · reddit (R17).*

## The numbers

*Snapshots of the itch.io dashboard (Analytics), copied by hand. PostHog's
**Playtest 1** dashboard holds the rest (how far runs get, `year_reached`;
how often the form is opened, `feedback_opened`).*

| Date | Views | Browser plays | Ratings | Comments | Collections | 7-day impressions | CTR |
|---|---|---|---|---|---|---|---|
| 10 October | 230 | 113 | 1 (★★★★★) | 2 | 4 | 2,469 | 2.84% |
| 12 October | 389 | 209 | 1 (★★★★★) | 2 | 6 | 4,091 | 3.37% |
| 14 October | 548 | 304 | 1 (★★★★★) | 2 | 7 | 5,069 | 3.59% |
| 15 October | 615 | 341 | 1 (★★★★★) | 2 | 7 | 4,721 | 3.73% |
| 20 October | 865 | 501 | 2 (both ★★★★★) | 2 | 11 | 1,852 | 3.94% |
| 23 October | 1,042 | 609 | 2 (both ★★★★★) | 3 | 16 | 2,028 | 3.80% |

Where the 10 October views came from (top referrers): Google 18,
itch.io's front page 12, reddit.com 12 (and 8 more from the Reddit
Android app), then itch.io's browse pages: *new and popular* for web (10),
tycoon (6), city builder (4–5), strategy, simulation and management.
Plays started 8 October and peaked the next day (about 60).

On 12 October (top referrers, 30 days): Google 32, reddit.com 17 (and 8
from the Reddit Android app), itch.io's front page 15, *new and popular*
for web 14, **foundplay.io 11** (its free boost, from 11 October), and
itch.io's browse pages for management (11, plus 5 and 5), tycoon (8, 6,
4), city builder (5, 5), strategy, simulation and **college** (4).
Daily plays: about 20, 60, 40, 60 from 8 to 11 October, a second peak on
11 October (foundplay.io and the r/gamedevscreens post). PostHog saw 37
of the 209 plays, about one in six.

On 14 October (top referrers, 30 days; change since 12 October):
Google 38 (+6), **foundplay.io 30 (+19)**, reddit.com 24 (+7, and 8 from
the Reddit Android app, unchanged), itch.io's front page 21 (+6), then
itch.io's browse pages: *new and popular* for web 14, management 13 (and
6), tycoon 10, 8, 7 and 7, city builder 7, 7, 7 and 5, strategy 6, and
the studio page halifaxgames.itch.io 5. foundplay.io's free boost (10
plays from 368 sponsored views, a 2.7% play rate) made it the
second-largest outside source. The r/WebGames post (14 October) added at
most 7 Reddit visits by this snapshot.

On 15 October: Google 40, **reddit.com 38 (+14 since 14 October, and 10
from the Android app, +2)**, foundplay.io 35, itch.io's front page 24,
then the browse pages (management 14, *new and popular* for web 14,
tycoon 12, 9, 9 and 7, city builder 8, 7 and 7). The r/WebGames post
brought about 16 visits in its first day. Daily plays were tapering:
about 60 on 11 and 12 October, 50 on 13, 40 on 14, and the 7-day
impressions fell for the first time (5,069 to 4,721).

Later on 15 October, by domain: itch.io itself 338, reddit.com 44 (+6),
Google 40, foundplay.io 35, the Reddit Android app 10, Bing 1, and the
first visit from **chatgpt.com** (1). ChatGPT finds pages by searching the
web live, through an index like Bing's, so someone asked it something the
itch.io page answers, probably about a university or campus management
game.

On 20 October (30 days): 865 views, 501 browser plays, a **second
rating**, five stars (I3), 11 collections (+4 since
15 October), and the first **2 downloads** (18 October; the game has no
download, so probably the itch.io app). The 7-day impressions fell from
4,721 to 1,852: itch.io's *new and popular* lift has run out, though the
click-through rate still rose (3.94%). Daily plays fell to about 20 by 17
October, then rose to about 35 and 55 on 18 and 19 October, the days
after 0.1.2 went up with its devlog. Referrers: Google 60 (+20 since
15 October), reddit.com 56 (+12, and 11 from the Android app),
**foundplay.io 47 (+12; its weekly email counts 31 plays this week, up
from 12)**, itch.io's front page 29, then the browse pages (tycoon 17,
13, 9 and 9; *new and popular* for web 14; management 14; city builder
10 and 10; **college 10**, new), and the studio page 13. By domain: itch.io itself 447, reddit.com 64 (+20 since
15 October), Google 60, foundplay.io 47, the Reddit Android app 11, a new
source, **aigamehub.app** (7; not reachable from this repo's tools, so
what it lists and how isn't known), out.reddit.com 2, Bing 2 and ChatGPT
1.

On 23 October (30 days): views passed a thousand (1,042), with 609
browser plays, 16 collections (+5 since 20 October), a third comment (I4)
and still 2 downloads. The 7-day impressions rose again, from 1,852 to
2,028, at a 3.80% click-through rate. Daily views held at about 40 to 70
since 15 October, and browser plays at about 20 to 55, with a peak near
55 on 19 October after 0.1.2. Referrers: Google 75 (+15 since 20 October),
reddit.com 71 (+15, and 11 from the Android app; the owner's second
r/playmygame post went up on 22 October), foundplay.io 48 (+1, so its
boost has run its course), itch.io's front page 36, then the browse
pages (tycoon for web 26, management for web 18, **college 17**, up from
10, free tycoon for web 15, tycoon 14, *new and popular* for web 14, city
builder 11 and 10, *new and popular* tycoon 9, *new and popular* free web
8, and **school 8**, a new tag page), the studio page 14 and itch.io
collections 11. Two outside sources are new or growing: **DuckDuckGo 9**,
the first search engine after Google to send more than a couple of
visits, and aigamehub.app 8 (+1 since 20 October). The one file
download is still the 0.1.2 web build, twice.

### PostHog, 11 October

*Only players who allow statistics, and whose ad blocker lets them
through: 31 of itch.io's 113 browser plays. The owner's own sessions are
likely among them (the internal cohort is empty): one on 7 October, before
launch, and one on 8 October with 13 opens and 3 feedback links. They are
left out of the counts below. Small numbers; read them as a direction.*

- **Who:** 29 players. 6 on a phone or tablet: none reached a first
  summer. 5 started the Sandbox first; 4 of them never started a real run.
- **Where desktop runs stop** (19 players who founded a normal run):

  | Reached | Players | Played minutes when they got there |
  |---|---|---|
  | Founded a college | 19 | — |
  | The first summer (year 1) | 9 | 2–4 |
  | Year 5 | 8 | 11–21 |
  | Year 10 | 8 | 22–43 |
  | Year 20 | 5 | 33–83 |
  | Year 30 | 3 | 44–97 |
  | Year 50 | 1 | 59 |

  *Played minutes count from the founding, cumulatively, with the clock
  running and the tab on screen (`analytics.ts`, `notePlaying`; checked
  against each run's yearly values, which only rise, by 2–4 minutes a
  year). Pauses and reading are not in them, and a run continued from a
  downloaded save starts again from 0.*

  **By speed** (the runs past year 10, weeks played at each speed):

  | Player's speed | Runs | Pace | Year 50 |
  |---|---|---|---|
  | Mostly 1× | 4 | 3.1–4.1 minutes a year | about 2.5–3.5 hours, projected |
  | Mostly 2× | 1 | 2.8 minutes a year | about 2.3 hours, projected |
  | Much of it at 4× and 8× | 3 | 1.2–1.5 minutes a year | 59 and 71 minutes, reached |

  **Real time is far longer than played time.** PostHog's funnel shows
  the wall-clock time between steps (its "median time" per step, 30 → 40
  1h 28m and 40 → 50 1h 07m, is the median of these two players' gaps).
  The two runs that reached year 50:

  | Player | Year 1 → 50, wall clock | Played minutes | Clock running |
  |---|---|---|---|
  | One sitting, 11 October | 5h 51m (11:09 to 17:00 UTC) | 71 | about a fifth of the time |
  | Over three days, 8–10 October | 28h 46m, with a night away | 59 | — |

  The one-sitting run's decades took 50, 38, 94, 94 and 75 minutes of real
  time. So about four fifths of a session is spent with the clock stopped:
  reading, deciding, building, or away with the game open. Even at 4× and
  8×, a full run was about six hours at the desk (and R3 played 4+ hours).

  **How much to read into the early stops** (the owner, 13 October): many
  itch.io visitors open a game to look around with no plan to sit down
  for a long run, so the stops before the first summer are mostly
  browsing, not a fault. The tutorial still gets work (R2), on what
  players said rather than this number. Step-by-step events for the
  opening would tell browsing (stops spread out) from a stuck step
  (stops piled at one place). With 13 October's players: 14 of 30 desktop
  founders stopped before the first summer; 14 of the 16 past it reached
  year 10.

  The 10 who stopped before the first summer had played under a minute
  of running clock, over 20 seconds to 6 minutes on the page: they left
  during the founding and the walkthrough. Past the first summer, 8 of 9
  reached year 10.
- **The specialization:** offered to the 4 players who reached year 21;
  all 4 chose (years 21, 21, 21, 24).
- **The rest:** 7 feedback links followed by 4 players, 18 saves
  downloaded by 5, 1 Final Report finished and shared.

### Tally, 11 October

The form: 9 visits, 2 started, 0 submitted. It is one page of nine
questions, six of them typed answers.

## Patches shipped

| Version | Date | What it fixed |
|---|---|---|
| `0.1.1` (`f57916d`) | 13 October | Plans 98–103, before most of these findings: halls claimed by three, events that do what they say, save slots, and a longer opening (the next course, the needs, a residence and a dining hall). |
| `0.1.3` (`b1f2114`) | 21 October | Plans 106–108: the first five years as chapters with objectives, the owner's notes after them, admissions day as a page of its own; the Treasury and the Faculty redrawn; the claimed hall's offers and the Research Park (F5), and NEXT's library hint (S2). |
| `0.1.2` (`4f5b83e`) | 16 October | Plan 104, bar B: develop the next course from the hall (T1, R2); a skip that asks first (R9); the opening measured; a quieter screen for the first three steps (R10–R11); teaching as numbers, not letters (S1, F1, F2); a reason for every refused placement, and the ghost agreeing with the click (S1); needs out of 100 and what pulls satisfaction down (S1); no teaching overload (S1); the pennant (S1); the welcome letter (S1); the Students tab and satisfaction after the first summer (S1). |

## The replies

*Every reply read, in the order it arrived, with the owner's answer where
there was one. The R-numbers are what the findings above cite. Quotes are
trimmed, not edited.*

### Reddit, r/CityBuilders — [the post](https://www.reddit.com/r/CityBuilders/comments/1x0wcob/) (8 October)

- **R1** · AlexanderGGA · [link](https://www.reddit.com/r/CityBuilders/comments/1x0wcob/comment/pes4mad/)
  — "Looks pretty good for me! Would love a steam demo in the future to
  try it out."

### Reddit, r/itchio — [the post](https://www.reddit.com/r/itchio/comments/1x0r7o0/) (8 October)

- **R2** · ComfortablePenguin1 · [link](https://www.reddit.com/r/itchio/comments/1x0r7o0/comment/pesdpo5/)
  — "In the tutorial, after I created my English class, the tutorial popup
  disappeared. Is it normal? Following this, I was a bit confused about
  what I should do next."
  *Owner:* "That is normal. Good to know that it's confusing. Maybe I can
  stretch out the tutorial a bit longer."
- **R3** · Careless-Flower6059 · [link](https://www.reddit.com/r/itchio/comments/1x0r7o0/comment/pesuop3/)
  — "I played your game yesterday with my gf for like 4+ hours, I think
  it's extremely well thought of and so fun. The university idea fits the
  city building theme so well, and I love all the details and everything.
  Looking to write a longer review but just wanted to say I'll definitely
  be playing this game for a while." (Says a longer review may follow.)
  *Owner:* "Thanks so much! I've had the idea in my head for a long time.
  Two Point Campus exists, but I've always wanted a different version."

### Reddit, r/playmygame — [the post](https://www.reddit.com/r/playmygame/comments/1x1jple/)

- **R4** · rlorenzo · [link](https://www.reddit.com/r/playmygame/comments/1x1jple/comment/peu1nh6/)
  — "I'm guessing this wasn't meant to be played on mobile? I can't build
  the founder's hall. Looked like a fun concept."
- **R5** · AlexanderGGA (the same player as R1) — "Steam hope?"

### Reddit, r/gamedevscreens — [the thread](https://www.reddit.com/r/gamedevscreens/comments/1x1wntb/comment/pexhs5f/?context=1)

*The owner's post, "How many architectural styles is too many?", with a
sheet of the styles (Collegiate Gothic, Classical, Mission, Modern, Tudor,
Italianate, and more): "Should I narrow this down?" (9 October).*

- **R6** · mebjammin — "If you're happy making them someone will be
  happy to use them. If you're adding a lot I'd make a way to pin
  favorite styles/search styles/randomly select a style just to make it
  user friendly."
  *Owner:* "The way I have it set up now is you select a style at the
  start and you're stuck with it, but I am considering letting players
  switch and/or mix and match styles as they build."
- **R7** · mebjammin (the same player as R6) — "Let then switch. More
  player freedom more player enjoyment."

### Reddit, a reply to the owner's comment (17 October)

*The owner's comment, posted three days earlier: "I'm working on a
university tycoon game! I have a free playtest available here (playable
in browser)", linking the itch.io page with a screenshot of the Faculty
tab (60 views, 2 upvotes when read). The thread's link wasn't kept.*

- **R12** · CrunchyTuna_games — "This looks super cool. What a great
  concept. It feels like a classic tycoon game right out the gate."

### Reddit, r/playmygame — the owner's second post (22 October)

*"I'm building a university management tycoon and looking for
feedback!", with a video of a grown campus, the itch.io link and "going
on Steam in the next few weeks" (5 upvotes, 8 comments when read, 23
October). From the owner's screenshots; the thread's link wasn't kept.*

- **R13** · Best-Cheetah-4422 — "hey! sent you a DM about playing!!"
  Likely a creator or service offer; not feedback.
- **R14** · Anxious-Drink3453 — "Very good! When work and university give
  me some time, I'm going to explore it completely!" They also linked a
  web game of their own (YonaZakkart, one of the two new itch.io
  followers on 23 October).
- **R15** · HiveReddit3 — "can we pick up and move structures?"
  *Owner:* "Only in sandbox mode. Otherwise, you can move most structures
  (except Founders Hall) by demolishing and rebuilding."
- **R16** · Aware_Roll5610 — "Nice work for a solo developer!"
- **R17** · Lifesimloverr — "Nice, plan for Android?"
- **R18** · jaunty_mellifluous — "The game looks a little bit complicated
  but keep at it." From the video, without playing.

### Reddit, a chat message

- **R8** · Careless-Flower6059 (the same player as R3) · 9 October —
  "I really really enjoyed your game to the point where I think it's the
  most fun and detailed simulation/city building game I played in a long
  long time. I'm a huge football manager fan and this feels like the
  football manager of universities basically."
  *Owner* (12 October): thanks; names what still needs work (stairs
  drawn backwards, subtle animations on menus and pop-ups, tuning the
  fifty years to the right mix of challenge and enjoyment) and asks them
  to fill in the feedback form.

### foundplay.io — the owner's post (11 October)

- No replies logged yet.

### Discord — a playtesting server (14 October)

*Someone posted an offer of free playtesting; the owner joined their
Discord. A fuller review may follow.*

- **D1** · nostalgicbear — "Just had a quick glance at this. Its giving
  proper throughback to the original Sims vibes 😬 I've just very quickly
  gone through part of the onboarding. I'll gather some proper thoughts
  later. Have you had any feedback so far?"
  *Owner (lou2429):* a lot of menus, a bit overwhelming at first, so the
  intro phase will be slowed down to layer things in one at a time.
  *D1:* "That was one of my first impressions initially. After setting up
  an English literature course, the next few screens were quite
  overwhelmingly text heavy, but that was just a very quick impression,
  and not one to give much weight to yet. Also really liked visual style
  on the buildings/scene initially."

### The feedback form

- **F1** · 14 October, 06:46 UTC · 0.1.1 (build `f57916d`, itch.io),
  sent from year 50 week 52, rank 14. PostHog (install id matched): first
  seen 13 October on 0.1.0, then 0.1.1; three runs, specialized in year
  21, one Final Report finished, 74 played minutes to year 45, on a
  laptop.
  - *How long:* 4+ hours.
  - *A moment you didn't know what to do next?* "It was pretty simple."
  - *Best moment:* "Unlocking and expanding the campus."
  - *Most frustrating:* "Either trying to find a decent teacher or
    waiting to add in more classes."
  - *Play again?* "Yes, I think there is a good pathway for replay
    ability."
  - *Would pay:* $10–15.
  - *Anything else:* "You should add in an ordinance system like in the
    sim city series."

- **F2** · 15 October, 20:30 UTC · 0.1.1 (build `f57916d`, itch.io),
  sent from year 12 week 1, rank 55. No install id (statistics probably turned off),
  so no PostHog run to match. Left an email for updates (kept in
  Tally, not here).
  - *How long:* 1–2 hours.
  - *A moment you didn't know what to do next?* Enjoyed it, but found the
    learning curve hard for lack of guidance at the start. The milestones
    and objectives in the bottom banner didn't say what to actually do to
    reach them. Unsure what athletics was for; research projects somewhat
    confusing. Didn't understand the teachers' grades (A, B, C) or ranks
    (assistant, associate), or how they affect teaching, courses and
    students. Wanted "a more comprehensive introduction or tutorial at the
    start of the game, gradually introducing its main mechanics", to know
    what to prioritize and not miss features. "(but don't misunderstand
    me, I reeeally enjoyed playing and love the concept as well as the
    execution, just had some trouble)"
  - *Best moment:* "Seeing the money amount increasing and being able to
    buy everything that the students would want to have the maximum
    satisfaction."
  - *Most frustrating:* being somewhat lost in those parts; "besides
    that, no frustration at all."
  - *Play again?* "Yes, maybe not everyday but every once in a while
    absolutely."
  - *Would pay:* $5–10.
  - *Anything else:* "I've been looking for exactly this type of game for
    a long time." The game feels "quite general": wants more
    customization and personality (decorations, architectural styles,
    the university's identity), and a skill tree to complement research
    and specialization (arts and culture, finance, research, branches
    unlocking further branches), so progress isn't only buying buildings.
    "These are just ideas … I really like the concept behind the game."

### Reddit, r/WebGames — [the owner's post](https://www.reddit.com/r/WebGames/s/j0w5eKdcbi) (14 October)

- **R10** · No-Giraffe-3838 — "350 students and zero professors is an
  alarmingly believable university simulator lol. holding the clock during
  the first building/hiring steps is a good call though, theres a lot of
  menus to take in at the start."
  *Owner:* "It gets fairly complex, so I tried slowly layering in
  features, but it still seems a bit overwhelming for new players at the
  start."
- **R11** · No-Giraffe-3838 (the same player as R10) — "maybe keep the
  opening focused on just the hall > professor > first course, with the
  other tabs dimmed until those are done. the next action is clear in the
  walkthrough, but all the stats and menus are competing with it. could
  help without cutting any depth."

### Reddit, a message from a composer (14 October)

*A musician the owner is talking to about commissioning the background
music; they played to hear what the game needs. Weigh the praise with
that in mind.*

- **R9** — "We tried the game with my girlfriend! We loved the detail and
  the many things you have to pay attention to, we already want to build
  a new university. One problem I realised, for us it wasn't a problem
  though, but I can imagine that it is overwhelming for a new player
  because it was a little hard to figure things out (maybe there was a
  tutorial I skipped accidentally)."

- **F3** · 17 October, 02:53 UTC · 0.1.2 (build `4f5b83e`, itch.io),
  sent from year 34 week 11, rank 30. The same install as **F1**, back
  for a second college: on 0.1.2 one run, 68 played minutes to year 30
  (PostHog, by install id), after F1's finished run on 0.1.1.
  - *How long:* 4+ hours.
  - *A moment you didn't know what to do next?* "N/A"
  - *Best moment:* "Dominating in the athletics with 22-0 seasons."
  - *Most frustrating:* "after playing it once, it is the beginning
    because it starts off exactly the same."
  - *Play again?* "yes. I like seeing the different ways the university
    can develop and get it's own unique culture."
  - *Would pay:* $10–15.
  - *Anything else:* "So for my second university I made an athletic
    focused school. (1) For coaches there should be a growing bonus for
    having the same coach. it seems odd that I can fire a champion coach
    the next year, hire a higher quality coach without any consequences
    (2) Is the amount of championships you can win in a year capped a 2?
    I have had 8 100 quality teams and the max seems to be two. (3)
    coaches should have history and reputations."

- **F4** · 18 October, 11:21 UTC · 0.1.2 (build `4f5b83e`, itch.io),
  sent from year 50 week 52, rank 53: a finished run. No install id
  (statistics probably off), so no PostHog run to match.
  - *How long:* 1–2 hours.
  - *A moment you didn't know what to do next?* "-"
  - *Best moment:* "opening of a medical school"
  - *Most frustrating:* "That one cannot independently choose which
    faculty to establish" and "the absence of other languages"
  - *Play again?* "+"
  - *Would pay:* $5–10.
- **F5** · 18 October, 22:24 UTC · 0.1.2 (build `4f5b83e`, itch.io),
  sent from year 38 week 19, rank 38. No install id.
  - *How long:* 4+ hours.
  - *A moment you didn't know what to do next? / Best moment:* "I want
    to report 2 bugs"
  - *Most frustrating:* "The bugs"
  - *Play again?* "Yes, once the bugs are fixed"
  - *Would pay:* under $5.
  - *Anything broken?* "Bug #1: Cannot add courses once Walnut Hall is
    built. (Cannot click on the +course button even if courses are
    transferred into Walnut Hall) Bug #2: Research specialization
    building doesn't appear upon specializing in it."
  - *Anything else:* "Suggestion: A way to automate athletics hiring Ex:
    Auto hire people with xx grade and/or xx potential with a minimum
    threshold of xx."

- **F6** · 19 October, 19:10 UTC · 0.1.2 (build `4f5b83e`, itch.io),
  sent from year 5 week 52, rank 72. PostHog (install id matched): one
  run on a laptop, first seen 18 October; finished the walkthrough
  without skipping, and played on after the form to year 10 (25 played
  minutes).
  - *How long:* 30–60 min.
  - *A moment you didn't know what to do next?* "I would say a handful of
    mechanics are somewhat counterintuitive. It's a fun game, but when
    you're first thrust into the game, it takes some time I would say to
    get acclimated to what the player is supposed to do. I am not sure if
    thats a problem or not. Its kinda fun to [mess] around and build
    whatever kind of school you want and just see how it goes. But I found
    myself wondering okay, ive established a bunch of programs, a sports
    team, some clubs, why is my prestige continuing to plummet? So Im not
    entirely sure what it is that makes a "good" score. The game is fun
    tho, none of that really impacted my enjoyment."
  - *Best moment:* "I like being able to design a campus and seeing the
    summaries at the end of a year."
  - *Most frustrating:* "The game is somewhat confusing, the UI is kinda
    hard to read at times, and i think some aspects of the abstraction
    feel very "gamey", I suppose. I wonder about the campus
    administrators, facilities staff, cooking staff, board of trustees,
    etc. There's just so much that goes into running a university. Not
    sure if all that is outside the scope of the game. Either way, I had a
    good time."
  - *Play again?* "Yes. I like watching my school grow and its a solid
    little management game. It's working for me on the fun level. I dont
    think it is like the most encompassing college simulation but it
    doesnt have to be."
  - *Would pay:* under $5. "I would pay under $5 if some more was built
    out. For as it is, I would prefer that it stay free."

- **F7** · 21 October, 22:05 UTC · 0.1.3 (build `b1f2114`, itch.io),
  sent from year 1 week 2, rank 75: a new college, so the answers are
  about the runs before it ("I played a while ago (10d)"). The install id
  has no PostHog events (statistics probably off), so no run to match.
  - *How long:* 1–2 hours.
  - *A moment you didn't know what to do next?* "I played a while ago
    (10d) and remember getting lost in the beginning, though after
    restarting I managed. Debts were quite confusing: where do I pay them
    off? I must have missed that. Not that it really impacted the game."
  - *Best moment:* "Overall, the game was quite fun."
  - *Most frustrating:* "See Q2. Also, when all of a sudden some teachers
    retired, the button that says "fill from market" is confusing: since I
    was accumulating good teachers, would that mean it assigns to first
    the best teachers I already pay, or directly from the market? I found
    myself filling the slots manually to avoid getting a C teacher."
  - *Play again?* "Well, apart from choosing a a track for the
    university, there really is little reason. What I found sad is the
    little amount of costomisation. See the last Q."
  - *Would pay:* under $5.
  - *Anything else:* "While I like the idea of the style of the campus,
    that is only a decision made in the beginning.... beyond that, there
    are practically only paths and basic trees I can place. Also, playing
    with the mission style I found the towers not so nice. When I placed
    the art gallery and the hospital, I had distractedly thought that they
    were just decorative / for stats, and not that I could have a course
    in them. I felt like the last years were mostly about getting all the
    courses, and little more. Also, money was kind of never a problem. I
    had trouble finding the promises I had made and was never sure where
    they were. Also, when changing how much % of the applicants I would
    accept, somehow my earning / week was completely nonlinear: it became
    positive, negative, positive, etc. I really did not know why that was.
    Since I was focusing on research though, I had an absurd amount of
    money. I mean, it is useful in the beginning, but at a certain point..
    I don't know how you approached the rendering, but do you warrant I
    can be more free with the camera? I could not see the paths behind
    buildings... Also, when renovating the tower, I could not access the
    church behind, which was only the case during the renovation. Manually
    having to renovate all buildings was annoying, further the
    consequences were never expressed, though I presume it's bad for my
    reputation. I would maybe like a plot system where you have to pay for
    more plots, that would maybe make it more organised. However That may
    also prove problematic with the very big buildings... I would suggest
    levels: Maybe you have the medical campus, then another, then
    another... I saw you put a lot of effort with the course names and had
    quite some fun reading them. Having specialised campuses could make
    the game quite longer, and maybe shorten a bit the individual runs
    since the last 10 -15 years were mostly empty. This could connect
    nicely with choosing a specialisation; maybe you only have 2 opetions
    per level? maybe none at all? idk. In any event, outdoor
    personalisation is needed. When scientists are attracted by research
    and I get the notification, I would expect them to be at least
    somewhat good; could you add a bonus for teachers attracted by
    research? Idk, it just felt underwhelming... Thanks for the beautiful
    game! I hope I could help! I saw your last update with the better
    student stats and it looked quite nice. I was lucky to find the game
    when it had just released!"

- **F8** · 21 October, 15:25 UTC · 0.1.2 (build `4f5b83e`, itch.io),
  sent from year 50 week 52, rank 1: a finished run. PostHog (install id
  matched): first seen 11 October on 0.1.0, then 0.1.1 and 0.1.2; four
  runs, one specialization, one Final Report finished, 144 played
  minutes to year 50.
  - *How long:* 4+ hours.
  - *A moment you didn't know what to do next?* "No, it was pretty clear"
  - *Best moment:* "When turning the school into distinguished schools and
    later the graduate school programs, it was fun to try and better the
    quality of the faculties."
  - *Most frustrating:* "I think missing a few "to be decided" events
    since it also works the same way as the news, but it could be because
    of user error too."
  - *Play again?* "Yes, I like management games like this, especially
    ones where it isn't too rigid but not completely free that it left me
    clueless as well."
  - *Would pay:* $10–15.
  - *Anything else:* "I played since the first or two days since being
    published and the newest update makes me very excited as someone who
    likes to decorate. If I didn't know this was a playtest, I wouldn't
    have figured it out and thought it was a completed game."

### We Playtest Games — a service's unsolicited playtest (16 October)

- **S1** · posted on Reddit by u/WePlaytestGames, who runs a playtesting
  service, about their tester "Misthios". Not asked for; the full notes
  sit behind a sign-up on their platform, so the comment doubles as a
  pitch. [The session video](https://www.youtube.com/watch?v=zv1kn2uAHVs);
  [the breakdown](https://app.weplaytestgames.com/transcript/04a2a26d-f482-4d87-aaf4-a476c910ab98).
  The owner shared the breakdown as a PDF (an AI-generated transcript and
  three takeaways), 16 October; what follows is from it. Version not
  known. Played about three in-game years, recording with the sound down.
  - Founded Baltimore in royal blue and gold; skipped the walkthrough's
    English and took Mathematics, appointing Dr. Priya Iyer "because they
    felt it's important to start a college with good people".
  - Liked the intro music enough to "vibe with it" before turning it down
    to record. (The recorded title theme went to `main` on 15 October; on
    the itch.io build the title still plays the synthesised theme.)
  - The opening: read the board's first letter twice; found the three
    founding candidates "all look the same", thought English wouldn't
    draw students, and took Mathematics instead of the walkthrough's
    pick. Placed Founders Hall, the residence and dining halls (kept the
    residence hall away from the classrooms), rotated with L.
  - Satisfaction: couldn't find it at first; then 62, with housing and
    dining at 12, which "read like a time of day". In year two, with
    dining, academic and social full, couldn't tell what pulled it down.
  - Mathematics showed a C with Iyer appointed "and nothing changed at
    64"; "it didn't really matter, so I moved on."
  - Placement: tried and failed to add housing in year two, to build next
    to Elm Hall, and to put benches in the park ("Sad").
  - Money: the first year ran low; didn't want to borrow. Waiting on 2.5
    million for Elm Hall: "I don't like that I can only wait for the
    money", though a course could be developed meanwhile.
  - Hiring: searches returning only C, D and F candidates, searched again
    and again; wants at least a B; a search "seemed to stop" as if out of
    money.
  - Year one review: six courses, four programs, six buildings,
    satisfaction averaged 55, graded 33. Allowed fraternities and
    sororities. Placed athletics fields by the student center.
  - The service's takeaways: clear feedback on placement (invalid-spot
    indicators and the reason); show what pulls satisfaction down and
    label need values; explain how professor grades relate to program
    grades, and fewer searches that turn up only weak candidates.
  - Close: nine out of ten, "one of a kind", "getting addicted"; would
    answer follow-up questions on the service's platform.

### Indie Game Booster — the free playtest (20 October)

*The playtesting service the owner applied to on 15 October
(`recruiting.md`); Stephen posted his notes in their Discord, tagging the
owner as "one of the OG members of the server". About 30 minutes on
0.1.2; his recording caught the wrong monitor, so there is no video.*

- **S2** · Stephen, Indie Game Booster.
  - *Art and visuals:* loved the art style, "particularly the little
    people walking around the campus"; placing the first building gave
    "old-school *The Sims* vibes"; the changing seasons "a nice touch";
    the menus neat, though the buttons' roundness can look unsightly
    ("very much a personal preference").
  - *UI and menus:* the introduction "a bit text-heavy. Less so than I
    remember when I looked at it about a week ago, but still quite
    heavy … There were multiple times throughout where I had to read and
    re-read something just to understand what it was saying. It often
    felt like more words were being used than necessary." The tabs fine,
    the descriptions and tutorial paragraphs heavy; long step headings
    ("Somewhere to Sleep, Somewhere to Eat") a minor dislike. The End of
    Year overview forcing itself open while reading the Faculty screen,
    "quite jarring". Couldn't remember where to add a third subject;
    looked under Faculty before remembering Founders Hall. Buildings,
    what they do, satisfaction and upgrades (Meadow Hall's beds) "mostly
    intuitive".
  - *Gameplay:* "I found this really soothing to play." Walkers heading
    for the road with no paths laid looked like a bug. In year 2 NEXT
    still asked for a library already built. After founding a subject,
    appointing faculty and upgrading a few times "it becomes almost
    second nature … My playtest was around 30 minutes, and I felt like I
    had a good grasp of the game by that point." Year 3 at 20–25 minutes;
    asked how many years a typical playthrough runs.
  - *Bug (an unnecessary calculation):* one square of path makes every
    walker re-plan, wherever it is, on every click.
  - *Audio:* "I really liked the music … mellow and satisfying … It was
    almost like a form of meditation playing this."
  - *Overall:* "I really enjoyed this. It's a very soothing, relaxing game
    to play." The one criticism: the amount and wordiness of the text;
    "the underlying game is easy to understand once you've used to
    navigating the menus a few times, but the initial presentation made
    it almost feel a bit more complicated than it is." "I'll definitely
    play more of it." "Hopefully you don't introduce loads of natural
    disasters like SimCity and stress me out!"

### Indie Game Booster — the livestream (received 22 October)

*The same service, playing on a livestream, about a week after S2; the
owner pasted the stream's notes, a summary in the service's words rather
than quotes. Most likely 0.1.3 (the objectives at the foot of the screen
are its chapters). Reached year 6. Counted as S2's player, not a new
one.*

- **S3** · Indie Game Booster, live.
  - *First impressions and onboarding:* onboarding "noticeably improved"
    since the playthrough a week before. The tutorial's structure is
    clear: the next objective always visible at the bottom of the UI, a
    single click to get there. Text volume still a concern, "hard to
    absorb large blocks while also learning mechanics"; suggestions:
    distinguish flavour text from essential instruction more clearly, and
    front-load less, bringing in context as the player progresses. The
    full-screen menus "slightly overwhelming for new players, though
    visually impressive". A red "confirm" button was mistaken for a
    cancel. The program-moving step confused: "unclear which courses were
    meant to be moved vs. others".
  - *Visuals and feel:* the art style praised throughout, low-poly and
    cohesive across the menus and the game; the seasonal changes and
    animations a highlight; the music "meditative" and "soothing",
    atmospheric enough for background audio; the hand-drawn-style circles
    around professors and the students' pathfinding appreciated; the UI
    outside the large info windows "clean and well-designed".
  - *Overall verdict:* "a strong step up" from the week before. The
    tutorial's language and sentence structure "still feels unnatural and
    hard to parse", worth revisiting "if collective feedback echoes this,
    not just one opinion". Only reached year 6 of about 50, so hadn't seen
    a campus at scale. Compared favourably to *Two Point University* as a
    more serious take on the genre. Worth recommending; several viewers
    likely to try it.
  - *Next step, theirs:* "Review tutorial text for sentence clarity and
    text volume."
  - *From the stream's transcript* (an automatic transcript, garbled in
    places; the owner was in the chat): Founders Hall placed close to the
    road this time; the briefing's shape liked by the co-host; the year in
    review interrupting twice; the admissions page "very smooth … that's
    definitely new"; the sweep letter and the *Standing* briefing read aloud as
    hard English; "Open the Treasury" met without noticing; the path
    re-planning still there; the objective chips "not intrusive"; short of
    $2.5M for Elm Hall in year 5; the move-a-program step, with the
    owner's help in chat; the red Confirm; no sign of a move's weeks left;
    the hall-claim letter's repeated "social science and humanities". The
    pace "not dragging … quite nice to take it in at a slow pace". A
    viewer would leave the stream on in the background for the music. The
    co-host noted the game is "very American-centric" about universities,
    though "it broadly translates".

### Live — Twitch, a streamer the owner found (13 October)

- **T1** · @dea066 on Twitch, a small channel with no viewers, asked by
  the owner to play. Not the target audience, by the owner's read. He
  played at least an hour on stream, with the owner watching and asking
  questions in chat. The owner's notes:
  - a little overwhelmed; not big on reading the walkthrough;
  - "This reminds me of games I used to play";
  - wanted to put benches on top of a quad; really likes placing
    benches;
  - the clock-stopping letters are too subtle: he didn't realize time
    had stopped and there was something he had to do;
  - set admissions to 1% three summers in a row, and is now in debt;
  - "I've spent money on Steam for games way worse than this";
  - asked what was most confusing: going from developing programs in
    the map view to developing courses in the Curriculum. He thought you
    just keep adding programs, not realizing they need developing more;
  - after about an hour the owner said they had to go, and he said he
    was going to keep playing. Even without fully understanding what to
    do, he was hooked.

### itch.io — the page's comments and ratings

- **I1** · ALEXANDERGGA08 · comment, 10 October — "This is pretty damn
  awesome, idea and execution so far it's good, love it, waiting for
  years with a theme like this on steam, hope you make it!"
  *Owner (Halifax Games):* "Thanks for playing!"
- **I2** · ALEXANDERGGA08 · rating, 10 October — ★★★★★, "Wow, deeply
  impressed by this game, tried it and it's wow!"
- **I3** · Joje :D · rating, about 20 October — ★★★★★, no review. A new
  player, the page's second rating; both are five stars.
- **I4** · YonaZakkart (the same player as R14) · comment, 22 October —
  "Está muy bueno, demasiado, ojalá en español algún día (^w^)": "It's
  really good, very much so. I hope it's in Spanish someday." Not yet
  answered.
