# UniSchool: the merged game, reviewed

*Written at the end of Phase N of the v2 merge ([Plan 35](../plans/35-balance-and-playtest.md)). It covers `main` after Plan 34, with Plan 35's fixes on top. It follows the shape of v2's release review so the merged game can be compared with both. Like [design review II](2026-09-design-review-ii.md), it reviews the design and the player's experience, not the code.*

## How it was tested

- **A new player's first hour.** A scripted browser session played from a clean browser as a first-timer:
  - founded Ashgrove College (Collegiate Gothic, navy and gold);
  - followed the walkthrough and placed the first buildings;
  - founded programs, hired, appointed a Provost, and answered every letter, note and summer;
  - opened every screen.

  It reached Year 5 (rank #55 to #48, 350 to 1,296 students) and took 132 screenshots. It is a script driving a real browser and reading every word, **not a person**. The migration plan asks for a person, and that is still owed.
- **The harness:**
  - `npm run sim`: ten strategies, fifty years.
  - `npm run guardrails`: the same on three seeds.
  - A decade-by-decade reading of the Balanced builder's income statement.
  - Probes that changed one thing on a copy of the game: running costs, course prices, the founding gift, the price a player charges, and the elite rivals' strength.
- **Plan 34's screens** were checked against a Year-50 save in the browser as they were built.

---

## The verdict in one paragraph

The merge worked. This is one game, not two stapled together:
- **v1** brings its campus, its catalogue, its summer and its economy.
- **v2** brings its ladder, its events, its alumni, its promises, its chronicle, its Final Report, its presentation and its sound.
- **The voice held across both:** the board's letters, the catalogue's events and the chronicle read as one institution talking about itself.

What the merge did not fix is the thing both games' reviews found: **a college that works has finished its game by Year 17**.
- Its catalogue is built by Year 15 and it takes first place by Year 17.
- It holds first place for every one of the last eleven years, because a leader at the prestige cap cannot be passed.

Phase N measured why, and found that the economy is a threshold system. It booms or it stalls, and a small change on either side flips it. Every cost lever that would slow the boom stalls the founding first. So this phase made the founding forgiving (a larger gift) and left the boom to a design decision, not a constant.

---

## 1. Is it intuitive for a new player?

**Mostly, and the merge helped.** v2's ladder of notes, the NEXT slot and the build menu that gets out of the way make the first years a straight line.
- The map grows visibly from the first week: cranes, walkers, paths.
- The numbers explain themselves on hover (Plan 34).
- Placing a building feels good: a footprint ghost, R to turn it, Escape to put it down, and "not enough clear ground" when it won't fit.

**Where the first hour went wrong, and what Plan 35 fixed:**
- **The week-5 board letter gave advice that could not be followed.**
  - It said Founders Hall had "exactly three rooms left" after the player had filled one.
  - It named programs never on offer.

  It now reads the rooms actually free, names only programs on offer, and says so when the hall can no longer be one school's.
- **Events expired unseen.** At four times speed an event's three weeks are four seconds. The clock now eases to normal speed when one arrives.
- **Saves were made once a year.** A closed tab lost up to fifty-one weeks. The game now saves at each term's turn and whenever the page is hidden.
- **The words contradicted the screens:**
  - "four beats" (the summer has three);
  - "three Deans" (the Deans are per founded school, and none exist until one is founded);
  - "350/175 beds" (it now reads 350 beds, 175 wanted).
- **The History tab graded the first year F,** and showed the chronicle twice. The draft Final Report now waits for Year 10.
- **The map's Help ran off the screen** and could not be closed. It now scrolls, and closes on Escape or a click elsewhere.

**Still open:**
- the milestone chip's "93%" never moves early and has no hover;
- milestone notes arrive weeks after the thing they celebrate;
- "Worth taking" lists D- and F-grade candidates;
- a locked speed key does nothing, silently;
- the tuition field reads "in line with your prestige" from $15k to $21k;
- some developer phrasing reaches the player ("a Buildable's cost", "the model's neutral mix");
- clipped labels in Faculty and the Build tray, and dining labels with no plate.

## 2. Is it immersive?

**The texture is the best either game has had:**
- the calendar;
- the board's letters and its ladder;
- the catalogue's events;
- the alumni who remember their years;
- the promises made at a decade's close;
- the chronicle naming the eras;
- the Final Report;
- the hall of fame.

Sound (Plan 34) gives the campus a crowd that grows with the roll, wind in the winter and a roar on game days. It has not been heard by a person yet.

**What breaks it:**
- **Nothing happens for two years.** Both first reviews say "A quiet year". The catalogue's events wait for Year 3 by design, which is the first thirty or forty minutes of play.
- **From Year 3 the Provost answers most events.** A seat is meant to take the routine off the desk, and it does. But a player who appoints one early (to unlock four times speed) sees few events.
- **Many panels explain the model rather than the story.** The Standing panel's "grading 78.3 … closes 20% of a gap upward" is honest and exact, and reads like a spreadsheet.

## 3. Is it easy to make meaningful progress?

**Early, yes; late, no, and for a measured reason.**

| Year | Students | Catalogue | Prestige | Operating margin |
| ---: | ---: | ---: | ---: | ---: |
| 5 | 1,280 | 20 | 68 | 26% |
| 10 | 6,057 | 113 | 71 | 35% |
| 15 | 25,280 | 364 | 101 | 11% |
| 20 | 29,200 | 365 | 130 | 1% |
| 50 | 33,520 | 419 | 150 | 2% |

The table is the Balanced builder on the default seed, on the old founding gift. It enters the top ten in Year 15 and takes first place in Year 17.

- **The build era pays for itself at once.** At prestige 50–70 a student costs far less to teach than they pay. Each course's seats repay its price within a year, and the catalogue goes from 20 courses to 364 in ten years. The design's eras put that building at Years 12–35.
- **First place is permanent once taken.**
  - The elite rivals close on a leader above prestige 100, but may never pass one.
  - A leader at the cap of 150 never falls.
  - Every strategy that reaches #1 holds it for the last eleven years of eleven.
- **Money stops mattering by Year 30.** A mature college's operating margin is 1–3%, which is honest. But the endowment the harness fills compounds to $17B, and research grants bring $13.9B over the run.

## 4. The numbers

### The late margin (V1-25), settled

**The late margin was never a margin.** The operating margin is 1–3% from Year 15 on. The headline 67% at Year 50 is the endowment's payout on a fund the harness filled.

The decision, written into [economy.md](../design/economy.md): the endowment is the reward for decades of surplus, and grows as a real one does. The scorecard now reads the operating margin.

### The economy is bistable

These probes each changed one thing on a copy of the game; none of them shipped.

| Change | Balanced builder |
| --- | --- |
| Running costs +10% at low prestige | 7 courses for ten years; #1 at Year 23 |
| Running costs +30% | 7 courses for twenty years |
| Charges 10% less than the script | stalled ten years; #1 at Year 32 |
| Charges 20% less | 8 courses for twenty years; rank 17 |
| Course prices ×3 | 14 courses for twenty years |
| Elite rivals +20 | #1 two to four years later; nothing else moves |

**The founding had no slack.** A player a tenth less efficient than the script stalled for a decade, which is the first hour. Plan 35 raised the founding gift from $1.4M to $3.0M:
- A player charging a tenth less now does not stall, and reaches #1 around Year 26.
- At 15% less the college still grows (rank 7) where it froze.
- The strong strategies are no faster.

### The guardrails, as gates

The scorecard now fails on three guardrails, all of which hold:
- **Stops:** more than twelve a year, for any strategy (they run 1.3–6).
- **Saturation:** any year at 95 satisfaction or above (none reach it).
- **The idle college:** outranking anything that tries, bar the Overbuilder.

The guardrails also report the pacing:
- the year of first place;
- the catalogue four-fifths built;
- founding weeks blocked by money;
- the last decade held.

## 5. What is still open, for the owner

1. **Slow the boom with a mechanism, not a constant.** The measurements say a cost that grows with size, not prestige alone, is what a threshold economy needs to have a middle. Candidates:
   - administration that grows with the roll;
   - sections whose cost rises as a catalogue spreads;
   - a founding era whose prices step up at named sizes.

   Each needs a design pass before a tuning pass.
2. **Make first place contestable in the defend era.** The no-leapfrog rule is what makes it permanent. Letting the elite band tie or pass a leader at the cap would give Years 35–50 a race. The player would then need something to spend on holding it, which is what Plan 33's capital projects could become.
3. **A person should play the first hour.** The script found the bugs; a person will find the feel.
4. **The mix needs ears.** The listening bench is in the debug panel.
5. **Give Years 1–2 something to do.** Both opening years are quiet by design (the catalogue's events wait for Year 3). A founding-era event or two, written for a college of 350, would carry the first forty minutes.
