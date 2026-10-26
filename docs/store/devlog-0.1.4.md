# Devlog draft — UniSchool 0.1.4

*The itch.io devlog for 0.1.4, posted with the upload on 26 October
2026. Started by Plan 117A with the correction that has to open
it. The rest covers everything merged since the 0.1.3 build (`b1f2114`):
Plans 110–116, the tuition slider's new top, and the small fixes beside
them. Plan 117's store link stays dormant in this build, so it isn't
mentioned. The full list is in [`changelog.md`](changelog.md). Nothing
here claims more than the build does.*

---

## UniSchool 0.1.4

### First, a correction

This page's note on how the game is made said that no picture in
UniSchool comes from an image generator. That wasn't true. The painting behind the title screen and the
cover of this page are AI-generated. They are stand-ins, and an artist is
being commissioned to replace them. Everything on the campus map, and every
faculty portrait, is drawn by the game's own code.

And a credit put right: the 0.1.2 post thanked Alejandro Tóth in the same
breath as "a new painting of the quad". Alejandro composed the title theme.
He didn't make the painting.

### Thank you

Thank you to everyone who has played since 0.1.3. Two of you wrote in on
the form the day it went up. One finished a fifty-year run at rank 1 and
told me what they missed along the way. The other sent a long, careful
list, from the camera to the last empty decades. Stephen at Indie Game
Booster played 0.1.3 live on stream, read my text aloud, and was honest
about it. Thank you as well to everyone who replied to my second
r/playmygame post, and to the player who asked for Spanish. I've read it,
and I'm keeping it in mind.

Most of this update comes from you. Your saves come with you: a 0.1.3
college opens in 0.1.4.

### Plain words

Stephen read one of the board's letters aloud and said it wasn't natural
English. He was right, and he wasn't alone. Five players have now told
me the text is hard to read.

So I went through nearly all of it: the walkthrough, the chapters, the
NEXT line, the letters, the summer, the help, the tooltips and the
events. The game now talks to you. It keeps to one idea a sentence, and
the story is kept apart from the instructions. Each promise now says
what keeping it and missing it will do.

The buttons that ask twice now say what will happen, such as "Move
English (no classes for 4 weeks)". Red is only for what you can't undo.
On stream, a red Confirm was read as Cancel.

### The chapters, simpler

The objectives drawer was a wall of text. Now it's a list: the chapter,
a few lines on what it covers, and its objectives. If you're stuck on
one, click its (?) for how. Its *Show me* takes you to the place and
rings what to click. When Show me opens the build menu, it opens on the
right category with the building ringed.

There's a new chapter early on, *Looking around*. One of you couldn't
see the paths behind the buildings and didn't know the view could turn.
It can, and the chapter asks you to pan, turn, tilt and zoom once each.

Some chapters asked for too little and some for too much. *Promises* and
*The long game* are gone. Three chapters now ask you to teach a number
of courses, because it's easy to get busy building and forget the
curriculum. *Somewhere to sleep* asks for a path from the residence hall
to Founders Hall. When chapters are on, the chair's letters no longer
repeat what the objectives say.

Athletics waits until you need it. The tab and *The teams* now open with
your first varsity team. The chapter walks you through hiring the
Athletic Director, then each team's staff, then its venue. While a post
is empty, the tab shows !.

### A summer that waits

In 0.1.3 the summer took over the screen at week 52, whatever you were
doing. On stream, that happened in the middle of reading something. Now
the clock still stops, but the summer waits for you, at the top of the
Inbox and in a note above the clock. Finish what you're doing, then
press Play or Space to open it.

Your first summer is walked through, one control at a time: the price,
then the applicants, then the line, then the offers. Stephen never moved
the admit line, because its yellow dot didn't look like something to
drag. It has a proper handle now, turned along the line. The hall is
drawn as a room, and the class below it is a table. The calendar counts
the year's weeks from 1 to 52, as the chapters do. And the tuition
slider now ends at $60,000, since no college's standing supports more
than about $40,500.

### The board convenes

The specialization is the biggest choice in a run, and it used to arrive
like any other letter. Now the letter is short, and *Convene the board*
opens a page of its own. Each of the four pillars has its own panel and
colour. Each one draws what it would build for you, shows where you
stand and who leads, and says what choosing it adds. Choosing asks
twice.

There's also a new way to be offered one. From Year 20, a college whose
students were happy (satisfaction 85 or more in over half its years)
gets the offer too. Before, the happiest college could go a whole run
without it.

### The late years

One of you said the last ten or fifteen years were mostly empty. From
Year 25, the board now asks you one question a year. Should the college
grow? Will you take a gift that comes with a condition? Should you found
an honors college? Each "yes" lifts one pillar and costs another for
five years. If you say no, nothing changes.

The late game also stops less. A new matter now pauses the clock only
if it has two weeks or less to answer. One you haven't opened still
pauses in its last week, so you still see it before it decides itself.

### The young campus

The map now opens on your campus, not the middle of the land. A new
college opens close on Founders Hall, and the view widens as you build.
Home brings you back to it. Founders Hall gets a drive from the road to
its front door. While it stands alone, the students stay near it
instead of walking off to the road. Snow now falls on the newer roofs,
and the Arena finally has a front, with your college's colours.

### Fixes

- **A 0.1.2 save could stop 0.1.3.** A run saved on one of 0.1.2's
  walkthrough steps stopped the game on Continue. It now loads and plays
  on.
- **The athletics letters came early**, before their chapter. They now
  wait for it. A team you've named keeps its name when you appoint the
  Athletic Director.
- **The year in review's class line** now describes the class the summer
  records.
- **Moving a program** was one click for some programs and hidden for
  others. Every program now lists its moves the same way, one button for
  each hall with room.
- **The map's keys did nothing** while the objectives were open. They
  work now.
- The founding and title screens fit a 1280 × 720 laptop, *Send the
  offers* stays in view, and Enter founds your college.

### What's next

The playtest runs to mid-December, and I'm still reading everything.
Please tell me if a sentence still trips you up. If you remember where
it was, even better. The form in the menu is the quickest way to tell
me.

*The full list of changes is in the changelog.*
