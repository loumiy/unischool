# Bugs the passes hit

*Hunting bugs is not this review's job (Plan 123 §7). These are the ones the five passes ran into, each checked against the code by the review's lead.*

| Id | Severity | What | Where | Fix |
|---|---|---|---|---|
| **R-1** | **major (live in 0.2.0)** | On desktop, *Looking around* requires turning and tilting the view, but the turn, tilt and home buttons are drawn only for touch (`touchUi`). A player who doesn't guess Q/E and Z/X never opens *Somewhere to sleep*, *Seats* or *Paying for it*. The skimmer's run reached year 2 with 254 of 350 students and satisfaction 29. Real players kept the chapter open 150 weeks on average. | `components/CampusMap.tsx:2756`; `state/chapters.ts:128-141` | Show the buttons on every device, or drop the chapter from the chain (card 1). Either is an hour. |
| R-2 | minor | The map tools' tooltip promises "zoom, turn, tilt and help", but desktop shows only zoom. | `CampusMap.tsx:2740` | Goes with R-1. |
| R-3 | minor (accessibility) | Under reduced motion, the school-distinguished banner stays invisible for its 4.5 s: the blanket rule shortens `banner-in` to 0.01 ms, and its last keyframe is `opacity: 0`. | `styles.css:208-223, 4452-4467` | `animation: none` on `.school-banner` under both reduced-motion selectors, as `.spec-panel` has. |
| R-4 | polish | Committing a course re-scrolls the Curriculum list under the pointer. | `tabs/CurriculumTab.tsx` (pass C, juice `course`) | Keep the scroll position on commit. |
| R-5 | polish | The Build panel reopens over 45% of the map in the frame a building is placed, hiding the dust and the plot. | `components/BuildPopup.tsx`, `CampusMap.tsx:1359-1375` | Hold it down about a second after a placement (card 4). |
| T-1 | tooling | `window.__campusMap` is undefined after Continue in the preview build, so `npm run clip -- --focus` fails ("no building matching"). The title backdrop's map probably clears it when it unmounts. | `tools/clip.mjs`, `tools/mapReview.mjs` | Set the handle on the live map's mount, not only the first. |
| T-2 | tooling (fixed in this review) | `drive.mjs`'s silent mode missed the walkthrough's prose. | `tools/review/drive.mjs` | Fixed: `.opening-coach p` added. |
