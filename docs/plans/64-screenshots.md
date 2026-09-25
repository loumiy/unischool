# Plan 64 — The screenshots

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answer

The owner asked for every screenshot in `docs/images` and the README to be
taken again, **in a few different school colours**: not every picture in
every colour, but the colours mixed across the pictures there are, to show
the choice exists.

## 1. The PR

- **Every image re-shot** on the game as it stands after Plans 59–63: a
  year-50 Completionist run (`--build-all`), laid out by `tools/layout.ts`.
  - The five campus images, one per architecture.
  - Seven tabs. The old Student Life and Enrollment shots become one
    `tab-students.png`, since the toolbar has one Students tab.
  - The summer admissions card.
- **Colours mixed**, one pair per picture across all eight:
  - *Campus images:* Georgian in navy and gold, Gothic in crimson and silver,
    Classical in forest and gold, Mission in maroon and gold, Modern in purple
    and gold.
  - *Tabs:* maroon, royal blue, forest, navy and orange, black, purple and
    crimson.
  - *Summer card:* royal blue.
- **The README:**
  - A new section, *Five architectures, eight colours*, shows the four other
    campus images.
  - The interfaces table has the seven current tabs.
  - The hero's description matches the campus it shows.
- **The tools, brought up to date:**
  - *`scenario`:*
    - `--colors <pair id>`.
    - `--build-all` now stands only the landmark the run chose, finishes what
      is still going up, and grows every venue to its last stage.
    - `--clear-modal` also clears the board's letters.
  - *`layout`:*
    - The south court now holds the capital projects and the landmark, where
      the South Quad and Halls 7–13 stood before Plan 59.
    - The library closes the Grand Quad's south side.
    - The overflow strip leaves a tile round each building.
    - The woodland is seeded on a bound stream.
  - *`shot`:*
    - Knows the Students tab and the Treasury's funds-figure entry.
    - Continues past the title screen, and closes a panel a pan's release
      opened.
    - `--press=<selector>` opens a collapsed school for its picture.
- `tools/README.md` gives the commands that made every image.

**As implemented:** `pngquant` (quality 70–95) keeps the folder at 5.5 MB,
about what it was before.
