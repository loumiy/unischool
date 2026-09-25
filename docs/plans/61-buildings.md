# Plan 61 — Buildings

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner's playthrough notes, the buildings half. No new questions; the
default accepted in Plan 59 stands: the stadium's second deck is one more
expansion, priced as the next step, with about 60% more seats. Screenshots
went to the owner as the work went.

## 1. The PR

| Note | Change |
|---|---|
| Georgian: blocks on two roof corners of Founders Hall, one wrapping, which splits when the camera turns (the Social Sciences hall too) | **An L at all four corners**, wrapping each (`cornerPavilions`). Each L is two boxes that only touch, and all eight are painted in depth order (`depthSort.ts`), so no view splits a corner. |
| Georgian library: a column in front of each door; the stairs face backward | **A colonnade always has an even number of columns** (`colonnadeColumns`), so the door is in a bay; **no entrance steps behind a colonnade**. |
| Arts & Media looks like the library; Business like a hospital | A signature that shares a motif carries a **feature** (`buildingSpec.ts`'s `SignatureFeature`): **Arts & Media is a brick studio under a sawtooth north-light roof** (teeth in depth order, each face drawn only when it faces the camera); **Business is an exchange**: a six-column giant order under a pediment roofed back to the wall, and a dome. Both work in all five vernaculars. |
| Multi-sport field, second upgrade: stands on the track | **One longer covered grandstand** and **a scoreboard standing in the far corner**; the bleacher across the field is gone. |
| Baseball diamond: outfield blocks askew; the first stand covers home plate; the full stands should sit back; the bases too large | **The seating stands back from the plate** along the bisector, clear of home at every stage; **the dugouts sit between each foul line and its wing**; **the batter's eye and scoreboard are square to the bisector**, on the fence arc; **smaller bases**; the bullpen strips are gone. |
| Football stadium: corners open at the second upgrade; one more tier | **Mitred corner seating closes the bowl** (the visitors' side raised to match), and **a third expansion adds a second deck all round**, with its own mitred corners and a pale fascia marking the tier (`ATH-STADIUM` cap 3; the deck adds 60% to the full bowl's seats). |

**Tests:** `building-spec.test.ts` (every school's hall looks different,
none as the library); `venue-stages.test.ts` (one grandstand and a
scoreboard; the stadium's second deck, its price and seats; the plate stand
clear of home plate).

**As implemented:**

- No save change: the stadium's third expansion is a new cap on an existing
  count.
- Buildings were checked in a standalone renderer (every building from the
  four views, server-rendered to SVG) rather than on the map, where the one
  wanted is rarely in frame; it lives outside the repository.
