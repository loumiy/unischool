# Releasing on itch.io

*How a build gets from this repository to the itch.io page (Plan 97D).
Everything here happens in a browser: GitHub builds the files, and you
upload them on itch.io's website. Nothing has to be installed.*

## 1. Get the files from GitHub

The **Release** workflow (`.github/workflows/release.yml`) builds the
itch.io web zip. It runs:

- **by hand:** the repository's **Actions** tab → **Release** → **Run
  workflow** → pick the branch (normally `main`) → **Run workflow**;
- **on a version tag:** pushing a tag such as `v0.1.0` (PR J tags the
  first).

When the run finishes (a few minutes), open it and scroll to
**Artifacts**. Download **unischool-<version>-itch-web**. It arrives as a
zip with `index.html` at its root: **that file is the one to upload, as it
is.** Don't unzip it. (Safari may unzip downloads by itself: if a folder
arrives instead, turn off Safari's *Open "safe" files after downloading*,
or download in another browser.)

*Before 8 October the workflow attached the game's own zip, which GitHub
then zipped again; itch.io, finding a zip and no `index.html`, refused it.
A run from before then holds `itch-web`: upload the zip inside it.*

What the build uses:

- **`VITE_POSTHOG_KEY`**, the repository secret: the play statistics
  ([`analytics.md`](../architecture/analytics.md)). Without it the build
  works and sends nothing.
- **`ITCH_PAGE_URL`**, a repository *variable* (Settings → Secrets and
  variables → Actions → **Variables** tab), optional: the page's address,
  such as `https://halifaxgames.itch.io/unischool`. The report card's
  *Copy summary* names it. Until it is set, the line names no address,
  since the frame's own address on itch.io's servers is no use to anyone.

Before the zip, the workflow runs `npm run check` and plays the game in an
itch.io-style frame in Chrome (`npm run itch:frame -- --check`). A red run
uploads nothing.

## 2. The project page, the first time

On itch.io: **Dashboard → Create new project**.

| Field | Value |
|---|---|
| Title | UniSchool |
| Project URL | `unischool` (the page becomes `halifaxgames.itch.io/unischool`) |
| Short description | from `itch-page.md` (PR I) |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | In development |
| Pricing | No payments |

## 3. Upload the build

Under **Uploads**:

1. **Upload files** → choose `unischool-<version>-itch-web.zip`.
2. Tick **This file will be played in the browser**.
3. Under **Embed options**:
   - **Viewport dimensions:** 1440 × 900;
   - leave **Mobile friendly** unticked (phones aren't supported: the
     owner's decision, 9 October 2026);
   - tick **Fullscreen button**;
   - leave **Automatically start on page load** unticked: the player's
     first click is what lets the game's sound start;
   - leave **Enable scrollbars** unticked;
   - **SharedArrayBuffer support:** leave off (the game doesn't use it).
4. **Save**.

A new version replaces the old: upload the new zip, tick *played in the
browser* on it, and delete the old upload. Players' saves are kept: itch.io
serves every version from the same address, so the browser keeps the run.
The game opens saves from every earlier version (the migration tests make
sure of it).

## 4. Check it on the page

Open the page in a private window and play a few minutes:

- the title screen shows the version line (`v0.1.0 · playtest`) and asks
  about statistics;
- a new college starts; the clock runs; sound plays after the first click;
- **Menu → Download save** gives a file;
- reload the page: **Continue** opens the same college;
- Chrome won't let a game in itch.io's frame write the clipboard, so
  *Copy summary* (Hall of fame, Final Report) shows the line selected,
  with "Press Ctrl+C". That is expected.

## Storage on itch.io

Every itch.io HTML game is served from the same domain, so they share one
browser storage. Every key UniSchool keeps starts `unischool.`, and a test
(`test/storage-keys.test.ts`) keeps it so. Browsers may still clear a
frame's storage: Safari after seven days without a visit, and a private
window when it closes. So every fifth summer the year's review offers
**Back up this run**, and the page's description says to keep a save
file (PR I).

## The command line, for later

itch.io's `butler` tool uploads from a terminal or a CI job:

```
butler push unischool-0.1.0-itch-web.zip halifaxgames/unischool:html5 --userversion 0.1.0
```

It needs an API key from itch.io (Settings → API keys). The key is the
owner's: it is never put in this repository or in a GitHub secret, so CI
never uploads by itself (Plan 97D).
