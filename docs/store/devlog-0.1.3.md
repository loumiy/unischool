# Devlog draft — UniSchool 0.1.3

*A draft for the itch.io devlog, for the owner to edit and post with the
0.1.3 upload. It covers everything merged since the 0.1.2 build
(`4f5b83e`): Plans 106–108, the Treasury board, the Faculty table and
plot, the lab news on the map, and the F5 and S2 bugs. The radial
curriculum (Plan 105) came and went in between and isn't in the build.
The full list is in [`changelog.md`](changelog.md). Nothing here claims
more than the build does.*

---

## UniSchool 0.1.3: the first five years as chapters, and admissions day

Thank you to everyone who has played 0.1.2, and especially to the players
who wrote in on the form and to Stephen at Indie Game Booster, who played
it for half an hour and wrote it all down. The same thing came up again
and again: the walkthrough was too wordy, and once it ended, you were on
your own. You'd built some programs, a team and a few clubs, and prestige
kept falling, with nothing to say why. This update is mostly about that.
Your saves come with you: a 0.1.2 college opens in 0.1.3.

### Chapters instead of a walkthrough

The walkthrough is now short. It ends once your first program is
founded. After that, the first five years run as chapters, one or two a
season: the next course, somewhere to sleep, seats for everyone, paying
for it, the first summer, and on through your standing, your faculty, a
hall of your own, campus life and the promises you make to students, up
to running the college and the long game.

Each chapter has a few objectives, and they tick themselves when you meet
them. If you know what you're doing, that line in the NEXT bar is all
you'll see. If you don't, click the chapter (or press J) and the bar
opens: what the system is, how to work it, why it matters, and a *Show
me* that points at the button. Milestones live in there too now.

In a guided run, a tab opens when the chapter that explains it begins,
so the game doesn't hand you fifteen systems in the first year. Later
systems, the teams, research, the alumni, capital projects and the
specialization, get side chapters of their own when they come within
reach. Every briefing you've read can be read again from the Guide, and
each tab has a Guide button that takes you to its chapter.

If you'd rather go without, Settings has *Objectives*: Guided, Brief or
Off.

Your three founding professors, Dr. Bennett, Dr. Iyer and Dr. Okafor, now
start on the payroll, and the first program can be any of the three on
offer.

### Admissions day

The summer's admissions used to be a card in the inbox: two sliders and
some numbers. Now they get a page of their own. You still set the price
first, without knowing who it'll draw. Then the applicants rain in as a
cloud on a GPA by SAT plot, coloured by what draws them: high achievers,
athletes, the price-sensitive and the rest. The admit rate is a line
across the cloud: everyone above it gets an offer. Money, mood and your
tightest need update beside it as you move it, and when you send the
offers, the class pours into the hall's seats.

It's the same two decisions as before, and nothing in the simulation
changed for it. It's just much nicer to look at.

What did change: a young college's applicants now get better as it
grows. Before, the strong share of the pool sat still from prestige 30 to
70, so you saw the same cloud year after year. Now, at a fair price, it
climbs.

### Prestige you can read

Prestige now moves from the start. A new college opens at 32 and climbs
faster over its first five years, a little of it week by week, so you
see it move before your first summer. History › Prestige shows it at a
glance: the figure, which way it's going, and a meter for each pillar,
filled as far as you've earned it. The detail is still there, under
*Details*.

Crowding is gone. Running short of beds or meals used to cost prestige
and applicants as well as satisfaction, and it was hard to tell which
was which. Now it only costs satisfaction, which reaches next year's
pool by word of mouth. Class seats count as part of the academic need,
and the Students tab names them when they're the problem.

### The Treasury and the Faculty, redrawn

The Treasury opens on one board: the year's revenue and expenses on the
left, each saying what drives it; your cash over the years in the
middle; and the levers on the right (tuition, the endowment draw,
maintenance) with what a year at those rates comes to. The endowment and
the buildings have views of their own.

The Faculty tab has a Cards / Table / Plot switch. The table reads a big
faculty in two screens and sorts by any column. The plot puts every
professor at their teaching and research, with your faculty's medians
across it and the market's candidates as rings, so a hire who'd lift the
department stands out.

And when a lab publishes a paper, wins a grant or makes a breakthrough,
the news now rises over it on the map.

### Fixes

- **A hall that refused every program.** Late in a run, a hall holding
  three programs of one school only offered that school's programs, and
  once there were none left, its empty slots were dead. Such a hall now
  takes the college's offers, and when you've founded the whole catalog,
  the "+" says so. Thank you for the report.
- **The Research Park didn't appear** after choosing the research
  specialization until every lab had finished a project, and nothing said
  so. It now opens with the choice, like the other specializations'
  buildings.
- **NEXT asked for a library you'd already built.** It now asks for one
  only if one would help, and otherwise points you to the teaching.
- The admit-rate slider now stays where you put it, the Students tab and
  new venues unlock the moment they should, and the Curriculum keeps a
  program open until its courses are done.

### What's next

The playtest runs to mid-December, and I'm reading everything. If a
chapter told you too much, too little, or the wrong thing, I'd really
like to know, and the form in the menu is the quickest way to tell me.

*The full list of changes is in the changelog.*
