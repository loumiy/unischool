# Devlog draft — UniSchool 0.2.0

*A draft for the itch.io devlog, for the owner to edit and post with the
0.2.0 upload. It covers everything merged since the 0.1.4 build
(`d085c5a`): Plans 118–122, the follow-ups from Ginger Brooke's playtest,
research prizes by field and the birdsong. The full list is in
[`changelog.md`](changelog.md). Nothing here claims more than the build
does.*

---

## UniSchool 0.2.0

### Thank you

This is the biggest update since the playtest began, and almost all of
it comes from you.

Fonnesx found the bug that stopped the game after the Final Report, and
another player sent it through the form. That fix went out early as
0.1.4.1. One of you wrote to me about the report card's Access grade,
the teachers you had to swap by hand, and the title screen. Another asked for a way to paint paths that wasn't one
tile at a time. Another told me seven distinguished schools earned too
little. A comment on the page asked where the capital projects were,
and Stephen at Indie Game Booster sent a video of my students pacing in
front of Founders Hall. And Ginger Brooke played for two hours on video
and told me everything she couldn't find.

Thank you all. Your saves come with you: a 0.1.4 college opens in 0.2.0.

### Campus, in place of Access

The report card graded Access, which was half how many applicants you
admit and half how far your price sits below what your name could
charge. A winning college is selective and priced to its name, so it
failed Access by design. I failed it every run, and nobody was ever
told what it was.

It's gone. In its place is **Campus**, which grades what you spend most
of a run doing: the grounds. It looks at four things. The decorations
for the number of buildings, the quads, the paths that reach your
buildings' doors, and the buildings kept in repair. Each part is a
share, so a big campus doesn't win by being big. Buying everything and
setting it down anywhere earns about an F. The same campus laid out
with care earns an A.

So the grade is no surprise at Year 50, the build menu's top line now
shows your Campus standing and its weakest part.

### Deans who staff

Swapping teachers by hand was tedious, and it hurt your grade when you
fell behind. Now every Dean does it for you. Each week, a Dean puts the
best professor you've hired on each of the school's courses. They fill
an empty course from the staff you have, move in a free professor who
would teach it a band better, and swap two professors when the pair does
better. They never hire or dismiss. The Provost covers any school
without a Dean.

If you staff a course yourself, the Dean leaves it to you for a year,
and the course's panel says so.

### Paths by rectangle

Shift and drag has always laid a straight path, but only a hint said so.
Now Ctrl and drag (⌘ on a Mac) fills a whole rectangle. Right-click
deletes the same two ways. The shape follows your mouse and puts back
whatever it leaves, and it skips the ground under buildings.

### Championships you can win

A college not specialized in athletics, with twenty teams, full funding,
the best coaches and every venue expanded, won about one title a decade.
That was far too few. Now that department wins about one every two or
three years from the middle of a run. A college that specializes in
athletics still wins far more.

Expanding a venue used to cost the same at Year 40 as at Year 5, so
maxing out athletics late in a run cost nothing that mattered. Each
expansion now costs its old price or a few weeks of operating costs,
whichever is more.

### A second building

Seven distinguished schools used to earn one more office in Founders
Hall, and by then the offices weren't worth much. Now the board lets you
build a second specialization's building: the Faculty Training
Institute, the Research Park, the Athletic Performance Complex, or a
downtown district. It does its own work, without filling that pillar's
specialization share. A college now holds five offices instead of six.
If you already hold six, you keep them.

### Founding a school

A school is founded when six of its programs share one hall. Every
school has courses that need a laboratory, and a school's labs open only
once it's founded. Without that, no school can finish its curriculum,
and graduate programs, capital projects and research all wait. Ginger
played thirty-seven years without founding one, and nothing told her
why the late game never came. A new side chapter, *A school of its own*,
now asks for it, says what it opens, and names the school closest to
six.

### Ginger's notes

Ginger's video was full of small moments where the game got in her way,
and most of them are fixed.

- **Doors on tiles.** The Original Commons' door sat between two tiles,
  so a path couldn't line up with it, and the Student Center's too. Now
  every door
  on every building, in every style and every way it can face, is on a
  tile's centre, and each side's door is the one the students use. The
  three biggest dining halls gained a low buttery at the far end so
  their front doors could sit in the middle, and the Medical Center's
  entrance moved to the middle of its front. No building changed size,
  so your campus stays where it is.
- **You draw the path to the road.** A new game starts with a walk along
  the road, and the walkthrough now asks you to draw Founders Hall's
  path to it yourself, instead of the game laying it for you. It's the
  path tool taught on day one, where you'll use it all game.
- **Walks through the tabs.** A chapter would send you to the Students
  tab, the objective would tick the moment it opened, and you were left
  with a screen full of information and nothing pointing at any of it.
  Now the Treasury, Students,
  History and Faculty tabs each open with a short walk, one section at a
  time. Skip it if you like; the Guide button plays it again.
- **The objectives open from the bottom right**, where their chip is, and
  fold back there, so they get in the way less. The toasts moved to the
  bottom left.
- **A finished chapter waits for you.** When opening the Treasury
  finished *Paying for it*, the chapter used to vanish while you were
  still reading. Now it stays, marked done, until you leave the tab.
- ***The first summer* arrives with the summer**, not six weeks early as
  a warning that confused more than it helped.
- **The Curriculum's "All # with X" button is gone**, and so is "+80
  places" on each program row. Every course seats 80 more students; the
  course's own panel still says so.
- **"Welcome to Halifax College"**, not "Welcome to Halifax". And "The
  builders are out of" a new building is now "*Name* is complete."
- **No more stray highlighting** when you drag across the screen.

### Smaller things

- **The board's specialization offer comes every five years** if you
  say "Not now". One player was asked nineteen summers in a row.
- **Placing a building shows a hint bar** at the top of the map: click
  to build, R to rotate, Esc to cancel.
- ***Research* asks you to build a lab**, not just place one, since the
  Research tab opens only when it stands. While it goes up, the help says
  how long is left.
- **Capital projects you can find.** From Year 10, the build menu shows
  every project, greyed out until you can build it, with what opens it.
  The chapter waits until one can be begun.
- **The welcome says how long a run is.** Fifty years, the Final Report
  at the end of Year 50, and you can keep playing after it.
- **Student quality and the endowment** each have a sentence saying what
  they're for.
- **Research prizes** now come from each field's own ladder, from a
  society's medal to an international honor.
- **The campus sounds are birdsong.** The crowd, the wind and the stadium
  were looped noise, and could sound like static or waves.

### Fixes

- A chapter house you couldn't afford could only be refused, for good.
  Now you can say "Not yet", and the chapter asks again in half a year.
  Any choice you can't afford says how much you're short.
- The first students no longer pace between Founders Hall and the same
  two spots.
- Continuing past the Final Report works (the 0.1.4.1 fix).

### The title screen

The painting behind the title screen is gone. In its place is a campus
seen from above, turning slowly: your own college if you have one
underway, or a finished one if you're new to the game. The same view
stays behind you as you found a college, open the hall of fame, the
settings or the credits.

### What's next

The playtest runs to mid-December. If something in this update doesn't
work the way I've said, or a sentence trips you up, the **Report a bug**
button and the form in the menu are the quickest way to tell me.

*The full list of changes is in the changelog.*
