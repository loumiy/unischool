# Playtest 1 — findings

*Filed weekly from the form, the page's comments and the statistics, under
the reviews' areas ([`README.md`](README.md), the triage rule). One line a
finding, with how many players said it and where it came from: `form`,
`comment` (the itch.io page), `reddit`, `live` (a session the owner
watched), `form` (the in-game feedback form), `discord` or `stats`. Every reply read is
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
  building game I played in a long long time". *3 players · reddit (R1,
  R3, R4, R8, R9), comment (I1, I2), live (T1), form (F1), discord (D1).*
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

## 2 · UI and text

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
- **The walkthrough is skipped by players who don't read.** T1 skimmed
  it and was a little overwhelmed. *1 player · live (T1).*

## 3 · Intuitive gameplay

- **The tutorial ends too soon.** After the first course (English) is
  created the tutorial's popup closes, and the player didn't know what to
  do next; they asked whether that was normal. It is (the walkthrough ends
  there), but the hand-off reads as the tutorial breaking. The owner's
  reply: maybe stretch the tutorial out longer. *1 player · reddit (R2).*

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
- **Too much on screen during the walkthrough.** "The next action is
  clear in the walkthrough, but all the stats and menus are competing
  with it." The suggestion: keep the opening to hall → professor → first
  course, with the other tabs dimmed until those are done ("could help
  without cutting any depth"). Holding the clock during those steps was
  called "a good call". Today the walkthrough holds the clock but leaves
  every tab and the top bar live (the toolbar dims only for a board
  letter, `App.tsx`'s `holding`). In Plan 104 as F. *1 player · reddit
  (R10, R11).*

## 4 · Strategy

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

## Asked for in play

- **An ordinance system "like in the SimCity series"**: standing policies
  for the college. *1 player · form (F1).*

- **Benches on a quad.** T1 tried to put benches on top of a quad, and
  enjoyed placing benches more than almost anything else. *1 player ·
  live (T1).*

## 7 · Bugs

- **Stairs drawn backwards** (the owner, 12 October, in a reply to R8).
  Not yet traced in the code. *Owner.*

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

## The numbers

*Snapshots of the itch.io dashboard (Analytics), copied by hand. PostHog's
**Playtest 1** dashboard holds the rest (how far runs get, `year_reached`;
how often the form is opened, `feedback_opened`).*

| Date | Views | Browser plays | Ratings | Comments | Collections | 7-day impressions | CTR |
|---|---|---|---|---|---|---|---|
| 10 October | 230 | 113 | 1 (★★★★★) | 2 | 4 | 2,469 | 2.84% |
| 12 October | 389 | 209 | 1 (★★★★★) | 2 | 6 | 4,091 | 3.37% |
| 14 October | 548 | 304 | 1 (★★★★★) | 2 | 7 | 5,069 | 3.59% |

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
