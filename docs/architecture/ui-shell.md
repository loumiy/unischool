# The shell, the tabs, and the keyboard

The **campus map** holds the middle of the screen at all times. The build menu
opens over it, and every other view — Curriculum, Faculty, Research, Student
Life, Athletics, Admissions, History, Treasury — opens as a dismissible
**full-bleed screen** on top of it: the tab takes the viewport and the dock
(log ticker + toolbar) lays over it. Every tab, the same way. The map is what a
player returns to, by the home button at the head of the toolbar's icon row,
the panel's own close button, or `Esc`.

That is a **layout fact, not a mechanical one**: no system reads the map, and
nothing gained authority over the sim by moving to the middle of the screen.

The layering is the crux — a dialog sits *above* the chrome because it stands
in front of the screen; a full-bleed tab *is* the screen, so it drops below and
reserves the dock's measured height instead of drawing under it.

## Tab gates

Three tabs are gated on the thing they are about existing (see `TabNav.tsx`'s
`TAB_GATES`): Research appears once a lab is finished, Athletics once a varsity
team exists, History in year 2. Each gate is the same condition the system
behind it already hangs off, and the first time one opens the activity log says
so.

## Keyboard

The map is the screen the player spends the most time on and the one where the
mouse is most often already busy — holding a path stroke down, or carrying a
picked-up building toward its spot — so most of the game is reachable without
it.

| Key | Does |
| --- | --- |
| `W` `A` `S` `D`, arrows | Pan the camera. Held keys glide; two at once give a diagonal. |
| Middle mouse drag | Pan too, in every mode — including mid-stroke under a path tool, where the left button is busy painting. |
| Scroll / pinch, `+` `−` | Zoom. |
| `Space` | Pause, or resume at whatever speed was last running. |
| `1` `2` | Play, play at 2×. (`3` is sandbox fast — see `isTestUniversity`.) |
| `P` | Arm the path tool. Left button draws, right button erases; a ghost tile marks the square under the cursor. |
| `R` | Rotate the picked-up building 90°, same as the ⟳ on its footprint ghost. |
| `Esc` | One ladder, top down: the activity-log popup, then the build menu, then the open view; on the map, back out of the path tool, then a picked-up building, then an open info panel. |
| `Enter` | Dismiss the interrupt on screen (every type with a plain "continue" — not the admissions form or the charter offer, which are real choices). |
| `C` `F` `L` | Open (or close) Curriculum, Faculty, Student Life. |

The plumbing is one module, `src/components/hotkeys.ts`: it owns the window
listener, the "not while the player is typing" guard, the rule that a key held
with Ctrl/Meta/Alt belongs to the browser, and which device the player is
currently driving with. That last one is what keeps `Space` honest: a focused
button answers `Space` natively, so the game must stand aside for a player who
tabbed to one — but a button that was *clicked* is focused too, which is how
`Space` came to re-click a tab icon instead of pausing. The modality is settled
by the interaction that chose the device (a pointer press, or `Tab`) rather
than by the key being arbitrated, because `:focus-visible` alone flips true on
that very keypress.

What each key MEANS stays with the component that owns the thing it does —
speed on `StatusHeader.tsx`, pan/draw/rotate on `CampusMap.tsx`, the tab
letters and the whole `Esc` ladder on `App.tsx`, `Enter` on
`InterruptModal.tsx`. `App.tsx` owns `Esc` because it is the only place that
can see every rung, and it gates the map's keyboard off while something is on
top of it, so only one layer is ever listening.

**The build menu is not "on top" in that sense, and it is the one place the
gate is not a single switch.** It has no backdrop: the map stays visible and
clickable underneath it, and it is where the map's own tools are reached from
— a building is picked up in there and deliberately survives the menu staying
open, the path tool is armed in there and is deliberately dropped when it
closes. Working the map with the menu up is the main line, not an edge case.

So **the build menu takes exactly one key from the map, and it is `Esc`** —
because `App.tsx` owns one `Esc` ladder and two handlers answering the same
key is what arbitration exists to prevent. `hotkeys.ts` answers the question
twice: `mapBackOutLive` for `Esc`, and `mapControlsLive` for everything else
the map does (pan, `R`, `P`), which the menu leaves alone. Folding those
together produced the same bug three times — `R`, `P` and `W`/`A`/`S`/`D` each
went dead for exactly the stretch in which a player reaches for them. A tab,
the log popup and an interrupt still silence both.
