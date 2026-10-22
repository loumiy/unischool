# Doors and depth

Written by `npm run review:doors` (`tools/review/doorsAndDepth.ts`) over 102 saves: `big-classical`, `big-georgian`, `big-gothic`, `big-mission`, `big-modern`, `chapel-classical`, `chapel-georgian`, `chapel-gothic`, `chapel-mission`, `chapel-modern`, `chapel-turned-classical`, `chapel-turned-georgian`, `chapel-turned-gothic`, `chapel-turned-mission`, `chapel-turned-modern`, `cross-classical`, `cross-georgian`, `cross-gothic`, `cross-mission`, `cross-modern`, `crowded-classical`, `crowded-georgian`, `crowded-gothic`, `crowded-mission`, `crowded-modern`, `curve-classical`, `curve-georgian`, `curve-gothic`, `curve-mission`, `curve-modern`, `dead-end-classical`, `dead-end-georgian`, `dead-end-gothic`, `dead-end-mission`, `dead-end-modern`, `diagonal-classical`, `diagonal-georgian`, `diagonal-gothic`, `diagonal-mission`, `diagonal-modern`, `ground-classical`, `ground-georgian`, `ground-gothic`, `ground-mission`, `ground-modern`, `loop-classical`, `loop-georgian`, `loop-gothic`, `loop-mission`, `loop-modern`, `props-classical`, `props-georgian`, `props-gothic`, `props-mission`, `props-modern`, `specialized-classical`, `specialized-georgian`, `specialized-gothic`, `specialized-mission`, `specialized-modern`, `straight-classical`, `straight-georgian`, `straight-gothic`, `straight-mission`, `straight-modern`, `tee-classical`, `tee-georgian`, `tee-gothic`, `tee-mission`, `tee-modern`, `trees-classical`, `trees-georgian`, `trees-gothic`, `trees-mission`, `trees-modern`, `p87-centre-artDeco`, `p87-centre-classical`, `p87-centre-georgian`, `p87-centre-gothic`, `p87-centre-italianate`, `p87-centre-mission`, `p87-centre-modern`, `p87-centre-secondEmpire`, `p87-centre-tudor`, `p87-civic-artDeco`, `p87-civic-classical`, `p87-civic-georgian`, `p87-civic-gothic`, `p87-civic-italianate`, `p87-civic-mission`, `p87-civic-modern`, `p87-civic-secondEmpire`, `p87-civic-tudor`, `p87-sport-artDeco`, `p87-sport-classical`, `p87-sport-georgian`, `p87-sport-gothic`, `p87-sport-italianate`, `p87-sport-mission`, `p87-sport-modern`, `p87-sport-secondEmpire`, `p87-sport-tudor`. Views are numbered by E presses from the opening view (0).

| Rule | Hits | Saves | Buildings | What it means |
|---|---|---|---|---|
| door-onto-ground | 45 | 10 | 7 | A drawn door opens onto open ground (a court, a pool, a quad, a garden); nothing hides it. |
| door-behind-mass | 115 | 15 | 13 | A door's tile is built over; the wall is hidden where it would be drawn, and walkers treat the door as shut. |
| door-under-tree | 40 | 5 | 5 | A tree stands on a drawn door's tile. |
| door-under-prop | 20 | 15 | 3 | A lamp, bench, the flag or a bike rack stands on a drawn door's tile. |
| door-onto-lawn | 1874 | 92 | 41 | A drawn door opens onto grass: no path. |
| door-on-seam | 346 | 77 | 12 | The wall is an even number of tiles long: its door is drawn on a tile seam. |
| door-unreachable | 0 | 0 | 0 | The door's tile has no way on foot to the road. |
| walled-in | 0 | 0 | 0 | Every door is shut. |
| prop-on-tree | 10 | 10 | 2 | The flag or a bike rack is placed on a tile with a tree, a lamp or a bench. |
| prop-behind | 221 | 69 | 12 | The flag or a rack stands on the +row side, which two of the four views do not face. |
| overhang | 41 | 13 | 6 | A building draws past its footprint over something painted before it: the attachment shows in front of what it should stand inside or behind. |
| depth-order | 0 | 0 | 0 | Two overlapping things are painted against depthSort.ts's relation. |

## How far each form draws past its footprint

The deepest point any building of the form draws in front of its footprint's near edges and beyond its side corners, in screen units at the opening zoom (a tile is 64 wide and 32 deep), over every save and view. Steps, porticos, pavilions and canopies are meant to stand proud of the wall; what matters is what stands on the tile they reach (the overhang rule below).

| Form | Buildings | Front (max) | Side (max) | Under construction, front (max) |
|---|---|---|---|---|
| block | 3 | 11 | 0 | — |
| bowl | 1 | 0 | 0 | — |
| chapel | 1 | 0 | 0 | — |
| hall | 5 | 26 | 10 | — |
| hangar | 7 | 11 | 9 | — |
| landmark | 2 | 0 | 0 | — |
| pavilion | 9 | 17 | 10 | — |
| portico | 4 | 36 | 10 | — |
| residential | 4 | 17 | 6 | — |
| tower | 4 | 11 | 0 | — |
| village | 1 | 0 | 0 | — |
| works | 5 | 11 | 0 | — |

