# The text review

*22 October 2026, after Indie Game Booster's stream (S3). The owner asked:
do you see the sentence structure that confuses players, and do you know
how to fix it? Yes to both. This review names the patterns, shows them in
the game's own lines, rewrites the lines players stumbled on, and sets
rules for the rewrite.*

*Data: `npm run review:strings` on `05c4d93`. It found 8,500
player-facing strings and 59,276 words. The counts below cover the 1,907
strings of eight words or more, leaving out names and course titles.*

## What the players said

- S3 read the board's sweep letter aloud and said: "I just don't find
  that's natural English to read." The co-host agreed it "doesn't read as
  very human".
- S2, S1, D1 and F6 said the same thing in other words. That makes it the
  most repeated finding of the playtest.
- S3 also said the volume is a problem: "You try taking in so much that
  you take in nothing."

The players are right, and the cause is not any one sentence. The game's
text was written in a house style, and the same style runs through the
plans and the code comments. It packs several facts into one sentence, it
avoids the word "you", and it likes clever turns of phrase. Each habit is
harmless once. Repeated across 59,000 words, they add up to text that
sounds machine-written. A player who is also learning the game can't
unpack it.

## The patterns

### 1. The player is never "you"

Only 21 of the 1,907 strings (1.1%) say "you" or "your". The text calls
the player "the administration", "the President" or "the college"
instead.

> The curriculum, the faculty and the campus remain the administration's
> to run.

> The draw and the maintenance budget are the administration's again.

The player has to work out that "the administration" means them, in
every sentence. With no "you" to act, the sentences turn passive (11% of
strings), and the reader loses track of who does what:

> Research is commissioned there.

> It may be founded again from the offers.

> A standing building's style is changed from its panel.

**Fix:** talk to the player. "You run the curriculum." "You can found it
again later." "Change a building's style from its panel."

### 2. The colon reveal

13% of the strings put a colon in the middle of a sentence. The sentence
sets something up and pays it off after the colon, and it often adds a
second colon or a semicolon after that.

> The board suggests a standing sweep: keep half a year of expenses on
> hand and move the rest into the endowment each quarter, until the
> endowment is as strong as the guidebooks measure.

> The first class has walked, and the college has a year behind it:
> enough to see the year laid out, how content the students were and
> what they need, what the guidebooks make of it, and the clubs the
> students have started.

By the end of the second example the reader no longer knows which clause
was the main one. Readers spot this construction as machine-written more
readily than any other.

**Fix:** end the sentence where the colon is. Use a colon only before a
list, or after a label ("Cost: $2.5M").

### 3. Commas doing four jobs

One sentence holds a subject, a definition, a list and an exception, all
separated by commas:

> Prestige's target blends four pillars, academics, research, student
> life and athletics, with the endowment, less run-down buildings.

> Satisfaction, how content the students are out of 100, averaged 40
> this year: from now on it shows at the foot of the screen …

In the first example the reader can't tell where the list of pillars
ends. In the second, a definition sits between the subject and its verb.

**Fix:** one idea per sentence. Put a definition in a sentence of its
own, and put a list in brackets or bullets.

### 4. Possessive pile-ups

> History shows prestige's target and what makes up each pillar; the
> readout above gives each pillar's points now.

> A program moves from its hall's panel.

> Elm Hall is Social Sciences's hall now.

"Prestige's target", "its hall's panel" and "the Build menu's Paths tile"
each squeeze a phrase into a chain of nouns, and the reader has to unpack
it. 41 strings have two or more of these in a single sentence.

**Fix:** use the thing's name, or restructure. "Click the hall the
program is in." "The History tab shows where prestige is heading."

### 5. Words the game never explains

"In place of the offers" (which offers?). "The guidebooks." "The
readout above." "A standing sweep." "The draw." "The first class has
walked" (an American graduation idiom, and here it means the first year
is over, not that anyone graduated). Some of these are the game's own
terms of art. Some are one thing called by two or three names. A player
meets each of them cold.

**Fix:** name a thing the way its button or tab names it, and use the
same name every time. Define a term the first time it appears, or don't
use it. The string tool already has a glossary check (it caught the bare
"slots"); give it more words.

### 6. Aphorisms and see-saw sentences

The text reaches for the clever line:

> {N} courses is a curriculum, and a curriculum outgrows one building.

> At this size the college is a small town, and a town gets sick.

> The board regrets that, and has decided it is the cheaper regret.

> … low enough to be felt and high enough to be believed.

> … so that the next bad year is an inconvenience rather than an event.

> … not the largest college, not the richest, the one whose graduates
> say they were taught.

One of these in a letter is charming. Dozens across the game make a tic,
and readers recognise this tic as AI writing: the balanced "X rather than
Y", the "not A, not B, but C", the closing epigram. In an instruction it
is worse, because the rule hides inside a riddle. "A curriculum outgrows
one building" means "you can now build an academic hall".

**Fix:** no aphorisms in instructions. At most one in a piece of flavour,
and only if it is the best line in it.

### 7. Lists of three by habit

> a team, a topic and a budget

> publications, grants and, now and then, a breakthrough

> a department, a venue and a season

A rough count finds a three-item list in 22% of the strings. A list
should hold what matters, whether that is two items or four, not three
because three sounds finished.

### 8. The rule and its exceptions in one breath

> A program moves from its hall's panel: four weeks out of Founders Hall,
> twelve from anywhere else.

The player needs to know where to click. The numbers matter less, and
they arrive in the same breath, so neither sticks. S3 read this line and
said "that's not resonating with me", then took the empty slots for the
way to move a program.

**Fix:** what to do first, in the button's own words. Numbers and
exceptions go in a second sentence, a tooltip or the panel itself.

### 9. Flavour and instruction share the same space

A letter opens with mood and then carries the one thing the player must
do in its last clause, at the same weight. S3's co-host put it this way:
"It's hard to know what's flavour text and what's information you
actually need to learn the game."

**Fix:** keep them apart. One line of flavour (italic, safe to skip),
then the instruction, set off as its own line. The chapter briefings
already have a what / how / why shape, which the co-host praised. Tighten
the "what" and keep the shape.

## The lines players stumbled on, rewritten

These rewrites show the direction. Each one has been checked against what
the game does.

**The sweep letter** (`boardData.ts`), read aloud on the stream:

> *Before:* The college has held more than a year of its expenses in cash
> for a year now. Cash earns nothing, and the guidebooks do not count it:
> they read a college's strength in its endowment. The board suggests a
> standing sweep: keep half a year of expenses on hand and move the rest
> into the endowment each quarter, until the endowment is as strong as
> the guidebooks measure. The Treasury can set it, or change it later.

> *After:* You've had more than a year's expenses sitting in cash for a
> year now. Cash earns nothing, and the guidebooks ignore it when they
> rate your finances. They look at the endowment. The board suggests an
> automatic sweep. Every quarter, keep six months of expenses in cash and
> move the rest into the endowment. It stops once the endowment gets full
> marks. You can change it any time in the Treasury.

**After the first summer** (`ladderData.ts`):

> *Before:* The first class has walked, and the college has a year behind
> it: enough to see the year laid out, how content the students were and
> what they need, what the guidebooks make of it, and the clubs the
> students have started.

> *After:* Your first year is over. The Students tab is open now. It shows
> how happy your students are, what they need, what the guidebooks say
> about you, and the clubs students have started. History keeps a record
> of each year.

**The *Standing* briefing** (`chapterData.ts`):

> *Before:* Prestige is the college's name in the world, and satisfaction
> is how content its students are. Each drifts week by week toward a
> target. Prestige's target blends four pillars, academics, research,
> student life and athletics, with the endowment, less run-down
> buildings; both figures move slowly.

> *After:* Prestige is your college's reputation. Satisfaction is how
> happy your students are. Neither one jumps: each moves a little every
> week toward a target. Prestige's target comes from four pillars
> (academics, research, student life and athletics), plus your endowment,
> minus run-down buildings.

**A hall claimed** (`eventData.ts`, "A school takes shape"):

> *Before:* Social Sciences has three of six in Elm Hall. Elm Hall is
> Social Sciences's hall now: it offers every Social Sciences program the
> college can found, in place of the offers, until none is left. Three
> more Social Sciences programs there found the School of Social
> Sciences.

> *After:* Elm Hall now belongs to Social Sciences. Its empty slots offer
> only Social Sciences programs until you've founded them all. You have
> 3 of the 6 you need. Found 3 more in Elm Hall to create the School of
> Social Sciences.

**Moving a program** (the *A hall of its own* briefing):

> *Before:* A program moves from its hall's panel: four weeks out of
> Founders Hall, twelve from anywhere else.

> *After:* To move a program, click the hall it's in, pick the program,
> and choose **Move to …**. It stops teaching while it moves: 4 weeks
> from Founders Hall, 12 from any other hall.

**The red Confirm** (`BuildingInfoPanel.tsx`). This is partly a colour
problem and partly a words problem. The armed button reads "Confirm —
English closes 4 weeks". "Closes" sounds like a warning, so a red button
that says it reads like a way out.

> *After:* **Move English (4 weeks without classes)**, and keep the red
> for actions that lose something for good.

**Students who leave** (the year in review, and the log):

> *Before:* 9 students will not return this summer — dining, study space

> *After:* 9 students won't come back next year. They wanted more dining
> and study space.

**The first deficit letter** (`boardData.ts`). This one is close already.
It needs "you", and the rule needs to stop hiding behind a figure of
speech:

> *Before:* The college has spent more than it took in for two terms
> running. The board would like to see a surplus before it sees another
> building. Tuition, the payroll and the size of the catalog are the
> usual places to look.

> *After:* You've spent more than you've taken in for two terms in a row.
> The board is worried. If the money runs out, it will stop all new
> building. To turn it around, look at tuition, salaries and how many
> courses you offer.

## What already works

These lines need no rewrite. They show the target:

- **The walkthrough's placing step.** "Click Founders Hall to pick it
  up, then click anywhere on the map to set it down." It uses
  imperatives, the buttons' own names and one idea per sentence. The
  players got through the opening.
- **The briefings' what / how / why shape.** The co-host liked it.
- **The objective chips.** "Not intrusive", in S3's words.
- **Short labels and figures.** Most strings are labels, and they are
  fine.

## The rules

These are for the rewrite and for any new text. Instructions follow all
of them. Flavour follows 1, 4 and 7.

1. **Talk to the player.** "You" and "your college". The board can keep
   its voice and still say "you".
2. **One idea per sentence.** An instruction stays under about 20
   words. Split at every colon and semicolon.
3. **The action first, in the button's words.** "Click **Founders
   Hall**, then **Move to …**." The why comes in the next sentence.
4. **Active voice, with someone doing the action.**
5. **One name for each thing**, matching the UI. No term goes undefined.
6. **Numbers and exceptions go second**: a following sentence, a
   tooltip, or the panel.
7. **No aphorisms in instructions**, and at most one in a piece of
   flavour. No "X rather than Y" or "not A, but B" in instructions.
8. **Keep flavour and instruction apart.** One line of flavour, then
   the instruction on its own line.
9. **Lists hold what matters**, not three items by habit.
10. **Read it aloud.** If a streamer would stumble, rewrite it.

## The work, in order

Ordered by what a new player meets first and what they need in order to
play:

1. **The first hour:** the walkthrough, the chapters' objectives and
   briefings (2,567 words), and the NEXT line (394).
2. **Letters:** the board's (410 words), the milestones' (816), and the
   hall and school letters in `eventData.ts`.
3. **The summer:** the year in review and admissions.
4. **Help paragraphs:** the campus map (294 words in one hint), the build
   menu (213), the Faculty tab (102), the seats (101) and the Students
   tab.
5. **Buttons that ask first:** the `ConfirmButton` labels, and red kept
   for losses that can't be undone.
6. **Flavour:** the events catalogue (14,276 words) and the promises
   (2,109). Trim the tics; keep the wit where it lands.

**A text check in the tests.** `review:strings` already reads every
string. A lint for the instruction screens could flag:
- a mid-sentence colon or semicolon;
- a sentence over about 20 words;
- a chain of possessives;
- a passive with no one doing the action.

It wouldn't fail the build at first. It would print the worst offenders,
so the rewrite can be measured and stay done.

One caution: this is the owner's game and voice. The rewrite should make
the text plain, not bland. The board, the Registrar and the Provost can
keep their dry humour in the flavour lines, as long as the instruction
next to them reads like a person telling you what to do.
