# Playtest 1 — the owner's pass

*Played before anyone else plays (Plan 97J, the rest of Plan 70L's list).
Tick each line; write what you find under it. Small findings are fixed
before publishing; larger ones go to the README's **Known issues** and
onto the itch.io page.*

Play it **where testers will**: the build uploaded to the itch.io page
(still in Draft, so only you can open it), in a browser you haven't played
in, or a private window. Then a phone or a tablet.

## Before you start

- [ ] The Release workflow ran green and its zip is uploaded to the page
      ([`itch-release.md`](../../store/itch-release.md)).
- [ ] The title screen shows `v0.1.0 · playtest`, and the Credits name the
      same build.
- [ ] The statistics question shows. Answer **Fine**. In PostHog,
      **Activity** shows `app_opened` within a minute.

## A full run, from the start

- [ ] **The first hour.** Found a college. Write down where you were unsure
      what to do next, and anything you skipped reading.
- [ ] **The first school.** Six programs in one building: the celebration,
      and the school on the map.
- [ ] **The first summer.** Review, Admissions (the price set blind, then
      the pool), Students. The year's events in PostHog: `year_reached`
      with year 1.
- [ ] **A save exported and re-imported.** **Menu → Download save**; close
      the tab; open the page again; **Load a save file**; the same college,
      the same week.
- [ ] **A reload.** Reload the page mid-year: **Continue** opens the same
      week.
- [ ] **A rank change.** The college enters the top 50, and moves in it.
- [ ] **The fifth summer.** The review offers **Back up this run** and asks
      once for feedback ("Five years in. Two minutes of feedback?").
      **Give feedback** opens the form in a new tab. Submit a test reply;
      in Tally's **Submissions**, the hidden fields hold the version and
      year 5.
- [ ] **Report a bug** (the menu): a file downloads, the form opens, and
      the menu says to attach it. Attach it to a test reply; it uploads.
- [ ] **The specialization.** The board's offer, the four cards, a choice.
- [ ] **The Final Report.** The grade, the six axes, the name; the feedback
      prompt shows once; **Copy summary** shows the line selected, to copy
      by hand (Chrome blocks the clipboard in itch.io's frame), or copies
      it (Firefox, Safari).
- [ ] **The Epilogue.** Continue past the report; the game runs on.
- [ ] **Play again.** **New game** from the menu: a new college, the old
      one in the Hall of fame.

A full run is three to four hours. To check the late moments sooner, load
one of these saves (on GitHub: open the file, then **Download raw file**;
in the game: **Load a save file** on the title screen):

| Save | Opens on |
|---|---|
| [`year-6-summer`](saves/year-6-summer.unischool.json) | Year 6's summer, its Review beat |
| [`year-34-specialization`](saves/year-34-specialization.unischool.json) | The board's specialization offer |
| [`year-50-final-report`](saves/year-50-final-report.unischool.json) | The fiftieth summer: the Final Report |

They are Blackmoor University, built by the harness's players. A loaded
save is a new run to the statistics, so PostHog will show these too.

## On other screens

- ~~**A phone**~~ — not supported for now (the owner's decision, 9
      October; see *Known issues* in `README.md`).
- [ ] **A tablet:** the same, with touch on the map (pan, pinch zoom).
- [ ] **Another browser:** if you played in Chrome, a few minutes in
      Safari or Firefox: sound starts on the first click, and a reload
      keeps the run.

## In PostHog afterwards

- [ ] The **Playtest 1** dashboard's charts show your run: the funnel's
      first steps, minutes for year 1, one returning player if you came
      back another day.
- [ ] Then keep your own play out: **Settings → Share anonymous play
      statistics → Off** in each browser you test in, or filter your
      install id (see the dashboard notes).

## Last

- [ ] The page's description and the AI form filled in
      ([`itch-page.md`](../../store/itch-page.md)).
- [ ] The README's **Known issues** list is current, and on the page.
- [ ] Publish the page (Visibility: Public), then post
      ([`recruiting.md`](recruiting.md)).
