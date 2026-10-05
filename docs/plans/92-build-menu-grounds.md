# Plan 92 — The build menu opens on Grounds

*Planning document only. Its job is to record two small asks from the owner
(October 2026) about the build menu.*

**Status: Landed.** One PR.

**As implemented:**
- The build menu opened on its first building tab, Academic, which is the
  second tab. It now opens on Grounds, the first (`BuildPopup.tsx`'s
  `initialBuildTab`). The exception is a guided founding while Founders Hall
  still waits for its ground: the walkthrough tells the player to pick the
  hall up from the menu, so the menu opens on the tab that holds it.
  `test/build-tab.test.ts` covers both cases.
- The Build button's bulldozer is now a hammer and a wrench crossed
  (`icons.tsx`'s `BuildIcon`). The menu's fallback tab and tile glyph is the
  same icon, so those change with it.
