# Plan 41 — Labs at work

*Planning document only. Its job is to turn the owner's request into a PR.*

**Status: In progress.**

---

## 0. The request

The owner asked for labs to show on the map when research is under way,
with a small symbol or animation, the way the academic halls show their
programs. There should be no text: symbols or a progress wheel, whatever
looks right.

Until now a lab looked the same whether it was busy or idle. The only
place to see its research was the Research tab.

## 1. The mark

- **Where:** over any placed facility hosting a research project
  (`s.research.initiatives`, keyed by facility id), at the height the
  hall's pips use. Nothing is drawn over an idle lab.
- **What:**
  - a dark disc, the pips' plate;
  - a ring that fills clockwise from the top as the project runs
    (`1 − weeksRemaining / weeksTotal`), in the lab's school colour, taken
    from its `schoolGate`. A facility with no school uses gold.
  - inside the ring, an atom: a nucleus in the school's colour, a tilted
    orbit, and an electron running round it, which says the lab is at
    work.
- **No visible text.** Hovering shows the same kind of tooltip the pips
  have: the project's name and the weeks it has left. Clicking the mark
  opens the lab's panel.
- **Motion:**
  - the electron runs on an SVG `animateMotion`, which follows the tilted
    ellipse and costs nothing to re-render;
  - under reduced motion (the setting or the system's) it is drawn resting
    on its orbit instead;
  - the ring moves only when a week passes.
