# Devlog draft · UniSchool 0.3.0

*A draft for the itch.io devlog, for the owner to edit and post with the
next upload. It covers everything merged since the 0.2.0 build
(`d956917`, 2 November): the late-game speed fix and the map fix (PR #445),
Plan 124 (subtraction, as decided), Plan 125 (the written content) and
Plan 126 (the interface review's first ten). Plan 123 was a review and
changed nothing in the game. The version number is a placeholder: rename
the file if the build ships as something else. Nothing here claims more
than the build does.*

---

## UniSchool 0.3.0

### Thank you

0.2.0 was the update where I added things. This one is mostly the
opposite. After it went up I went through the whole game asking what
each screen, line and sound was for, and took out what didn't earn its
place. What's left should be quieter, faster to read, and show more on
the campus itself.

One of you wrote through the form that the game got slow late in a run,
worse at high speed. You were right, and it was 0.2.0's fault. That's the
first fix below.

Your saves come with you: a 0.2.0 college opens in 0.3.0.

### Faster late in a run

0.2.0's Deans staff their schools every week, and the way they looked
for a better pair of professors was far too slow. With seven Deans, a
late game week took about ten times longer than it should. It's fixed:
the same save now runs a week in a tenth of the time. Closing a tab is
quicker too.

Also fixed: a busy building, most often Founders Hall or a dining hall,
could vanish from the map after you turned the camera, until you turned
it again.

### Promises are gone

Promises asked you to commit to a goal with a deadline, for a reward or
a penalty. They doubled what the report card and the standings already
asked of you. They're gone, with their offer
in the summer, their panel in History and their lines in the chronicle.

The Final Report's mark used to be 70% standings, 20% rank and 10%
promises. It's now standings and rank alone, in the same proportion.
A report you've already written keeps its grade, and a save with a
promise underway loads without it.

### A quieter first year

- **The camera's buttons show on every device.** Turn, tilt and home
  were keys only on a computer, though the tooltip said there were
  buttons. Now there are. *Looking around* has a **Skip**, and the map's
  help is a few lines and a list of keys, not a long paragraph.
- **An objective appears when you can do it.** "Develop a second course"
  waits until the first is taught, "Site an academic hall" until you
  can pay for one, and "Move a program" until a second hall stands. No
  more help explaining why you can't yet.
- **Less to read before year 2.** The year-1 chapters lost their
  explaining paragraphs, the summer review lost its lines about each
  pillar, and the Treasury lost the *Cost of being large* panel, which
  showed from year 1 when the cost doesn't matter until much later. The
  cost is still in the figures.
- **Founders Hall goes up as you found the college**, in the same
  construction stages as every other building, and its name appears
  when it stands.

### Prestige you can read

The top of Curriculum, Research, Students and Athletics now shows your
prestige as one bar split into its four parts, with that tab's part lit:
"18.1 of your 51.8 prestige · heading for 54.6". A small tick marks where
it's heading, so you can see the gap the summer's rise has to close. The
summer review ends with the same bar.

History and the objectives used to show a different number for the
same thing. Now every screen shows the same part for each pillar, and
the four add up to your prestige.

### The campus shows what's happening

- **A program goes dark** on the map while one of its courses has no
  teacher, and lights again when someone's appointed.
- **Students queue** at the dining halls and the clinics when those
  needs aren't met. The longer the shortfall, the longer the line.
- **Full stands are full of people**, drawn like the students on the
  paths, not coloured dots. A few times a year a crowd builds over the
  weeks, packs the stands, then thins out. When they're packed, a crowd
  gathers outside too. A title hangs a pennant on the venue the next
  year.
- **The football stadium has an outside**: arches, gates, banners and a
  cornice.
- **The marks over buildings hold their size** as you zoom, so they
  don't shrink to specks zoomed out or swell zoomed in.

### The big moments

- **The Final Report is staged.** At the end of Year 50 it opens over
  your campus, the grades stamp in one by one, and the final grade lands
  last.
- **A click or a key finishes the admissions animation.** It was about
  four seconds every summer, three and a half minutes a run.

### What a choice does, at a glance

- **Every letter has a subject.** The inbox, NEXT and the log used to
  show a letter's first sentence, cut off mid-word. Now each of the
  game's letters has a short title.
- **An answer's effects are chips:** an icon, the figure and a word or
  two, green or red, with a clock if it wears off. The same chips show
  what a reputation, a professor's quirk, an office or a facility does.
  Some of these were never shown before.
- **A milestone's letter shows** each building it opens, as the map
  draws it.
- **Money on a choice is short**, "$1.2M" rather than "$1,214,000".

### Lighter screens

- **Curriculum**: the committee is one line, with only the seats you
  have and when the next comes. The next *Develop* button says
  "+80 places" while you're short of room for students.
- **Research**: a lab is one line until you open it, and empty labs are
  listed first.
- **Faculty**: the top is three counts. The *what next* strip shows only
  when there's something to do.
- **Admissions**: *What this class does* sits right under the four
  figures, so the send button never covers it.
- **The build menu folds to a strip** while a paths or grounds tool is in
  hand, and after you place a building. Esc puts the tool away.
- **Toasts** wrap to two lines instead of cutting off, like ones merge,
  and over a tab the newest sits in the tab's header instead of covering
  the screen.
- **One campus figure.** The Estate panel and the build menu both show
  Campus out of 150, with its parts listed. The separate beauty score is
  gone.
- **Fewer badges.** The red ! on each build category is gone. "New" is a
  cream dot, and Athletics' "needs staff" has a mark of its own. Gold
  means fewer things.

### The words

Most of the game's writing was rewritten. Every letter now speaks to
you, and the vague answers say what they do. 342 of the 473 course
descriptions were rewritten so they no longer read alike, and the
professional schools got some of the dry humor the others had. The
offices each have a line of their own, a professor's bio is told five
ways, and long help became legends, keys and small tables.

A few names changed: the tabs' **Guide** button is now **Show me**, and
the top professor rank is **Chair**.

### Sounds and motion

- A professor leaving no longer plays the hiring sound, and a failed
  student demand sounds like a loss.
- Candidates, petitions and publications arrive quietly.
- The game has three ways for things to appear instead of seven, and the
  school banner holds still under reduced motion.

### Fixes

- Committing a course keeps your place in the Curriculum list.
- The build menu no longer springs back open the moment you place a
  building.

### What's next

The playtest runs to mid-December. If something here doesn't work the
way I've said, the **Report a bug** button and the form in the menu are
the quickest way to tell me.
