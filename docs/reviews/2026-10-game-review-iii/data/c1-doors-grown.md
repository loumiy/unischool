# Doors and depth

Written by `npm run review:doors` (`tools/review/doorsAndDepth.ts`) over 4 saves: `all`, `research-park`, `year-40-done`, `guided-y20-clear`. Views are numbered by E presses from the opening view (0).

| Rule | Hits | Saves | Buildings | What it means |
|---|---|---|---|---|
| door-onto-ground | 38 | 4 | 14 | A drawn door opens onto open ground (a court, a pool, a quad, a garden); nothing hides it. |
| door-behind-mass | 0 | 0 | 0 | A door's tile is built over; the wall is hidden where it would be drawn, and walkers treat the door as shut. |
| door-under-tree | 26 | 4 | 15 | A tree stands on a drawn door's tile. |
| door-under-prop | 5 | 2 | 3 | A lamp, bench, the flag or a bike rack stands on a drawn door's tile. |
| door-onto-lawn | 1020 | 4 | 70 | A drawn door opens onto grass: no path. |
| door-on-seam | 106 | 4 | 15 | The wall is an even number of tiles long: its door is drawn on a tile seam. |
| door-unreachable | 0 | 0 | 0 | The door's tile has no way on foot to the road. |
| walled-in | 0 | 0 | 0 | Every door is shut. |
| prop-on-tree | 4 | 4 | 2 | The flag or a bike rack is placed on a tile with a tree, a lamp or a bench. |
| prop-behind | 89 | 4 | 23 | The flag or a rack stands on the +row side, which two of the four views do not face. |
| overhang | 12 | 4 | 6 | A building draws past its footprint over something painted before it: the attachment shows in front of what it should stand inside or behind. |
| depth-order | 0 | 0 | 0 | Two overlapping things are painted against depthSort.ts's relation. |

## How far each form draws past its footprint

The deepest point any building of the form draws in front of its footprint's near edges and beyond its side corners, in screen units at the opening zoom (a tile is 64 wide and 32 deep), over every save and view. Steps, porticos, pavilions and canopies are meant to stand proud of the wall; what matters is what stands on the tile they reach (the overhang rule below).

| Form | Buildings | Front (max) | Side (max) | Under construction, front (max) |
|---|---|---|---|---|
| block | 7 | 11 | 0 | — |
| bowl | 1 | 0 | 0 | — |
| chapel | 1 | 0 | 0 | — |
| hall | 9 | 26 | 3 | — |
| hangar | 10 | 11 | 9 | — |
| landmark | 2 | 0 | 0 | — |
| pavilion | 19 | 11 | 0 | — |
| portico | 6 | 36 | 0 | — |
| residential | 8 | 12 | 0 | — |
| tower | 4 | 11 | 0 | 0 |
| village | 2 | 0 | 0 | — |
| works | 6 | 10 | 0 | — |

