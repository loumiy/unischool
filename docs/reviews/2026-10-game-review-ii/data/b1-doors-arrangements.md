# Doors and depth

Written by `npm run review:doors` (`tools/review/doorsAndDepth.ts`) over 75 saves: `big-classical`, `big-georgian`, `big-gothic`, `big-mission`, `big-modern`, `chapel-classical`, `chapel-georgian`, `chapel-gothic`, `chapel-mission`, `chapel-modern`, `chapel-turned-classical`, `chapel-turned-georgian`, `chapel-turned-gothic`, `chapel-turned-mission`, `chapel-turned-modern`, `cross-classical`, `cross-georgian`, `cross-gothic`, `cross-mission`, `cross-modern`, `crowded-classical`, `crowded-georgian`, `crowded-gothic`, `crowded-mission`, `crowded-modern`, `curve-classical`, `curve-georgian`, `curve-gothic`, `curve-mission`, `curve-modern`, `dead-end-classical`, `dead-end-georgian`, `dead-end-gothic`, `dead-end-mission`, `dead-end-modern`, `diagonal-classical`, `diagonal-georgian`, `diagonal-gothic`, `diagonal-mission`, `diagonal-modern`, `ground-classical`, `ground-georgian`, `ground-gothic`, `ground-mission`, `ground-modern`, `loop-classical`, `loop-georgian`, `loop-gothic`, `loop-mission`, `loop-modern`, `props-classical`, `props-georgian`, `props-gothic`, `props-mission`, `props-modern`, `specialized-classical`, `specialized-georgian`, `specialized-gothic`, `specialized-mission`, `specialized-modern`, `straight-classical`, `straight-georgian`, `straight-gothic`, `straight-mission`, `straight-modern`, `tee-classical`, `tee-georgian`, `tee-gothic`, `tee-mission`, `tee-modern`, `trees-classical`, `trees-georgian`, `trees-gothic`, `trees-mission`, `trees-modern`. Views are numbered by E presses from the opening view (0).

| Rule | Hits | Saves | Buildings | What it means |
|---|---|---|---|---|
| door-onto-ground | 45 | 10 | 7 | A drawn door opens onto open ground (a court, a pool, a quad, a garden); nothing hides it. |
| door-behind-mass | 115 | 15 | 13 | A door's tile is built over; the wall is hidden where it would be drawn, and walkers treat the door as shut. |
| door-under-tree | 40 | 5 | 5 | A tree stands on a drawn door's tile. |
| door-under-prop | 20 | 15 | 3 | A lamp, bench, the flag or a bike rack stands on a drawn door's tile. |
| door-onto-lawn | 1235 | 65 | 26 | A drawn door opens onto grass: no path. |
| door-on-seam | 220 | 50 | 7 | The wall is an even number of tiles long: its door is drawn on a tile seam. |
| door-unreachable | 0 | 0 | 0 | The door's tile has no way on foot to the road. |
| walled-in | 0 | 0 | 0 | Every door is shut. |
| prop-on-tree | 10 | 10 | 2 | The flag or a bike rack is placed on a tile with a tree, a lamp or a bench. |
| prop-behind | 185 | 60 | 9 | The flag or a rack stands on the +row side, which two of the four views do not face. |
| overhang | 37 | 11 | 7 | A building draws past its footprint over something painted before it: the attachment shows in front of what it should stand inside or behind. |
| depth-order | 0 | 0 | 0 | Two overlapping things are painted against depthSort.ts's relation. |

## How far each form draws past its footprint

The deepest point any building of the form draws in front of its footprint's near edges and beyond its side corners, in screen units at the opening zoom (a tile is 64 wide and 32 deep), over every save and view. Steps, porticos, pavilions and canopies are meant to stand proud of the wall; what matters is what stands on the tile they reach (the overhang rule below).

| Form | Buildings | Front (max) | Side (max) | Under construction, front (max) |
|---|---|---|---|---|
| block | 2 | 13 | 0 | — |
| bowl | 1 | 0 | 0 | — |
| chapel | 1 | 0 | 0 | — |
| hall | 5 | 21 | 9 | — |
| hangar | 1 | 12 | 4 | — |
| pavilion | 7 | 13 | 9 | — |
| portico | 2 | 13 | 9 | — |
| residential | 3 | 16 | 6 | — |
| tower | 1 | 0 | 0 | — |
| village | 1 | 0 | 0 | — |
| works | 5 | 13 | 0 | — |

## door-onto-ground (45)

- **Watson School of Business** (`HALL-01`) at 58,73: south door opens onto Grand Quad & Gardens. Views 0, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 65,67: east door opens onto Grand Quad & Gardens. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Hollis School of Science** (`HALL-03`) at 65,79: west door opens onto Grand Quad & Gardens. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Library** (`LIB-T1`) at 70,74: north door opens onto Grand Quad & Gardens. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Watson School of Business** (`HALL-01`) at 58,53: south door opens onto Tennis Courts. Views 0, 3; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 55,64: east door opens onto Swimming Pool. Views 0, 1; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **Lakeside House** (`DORM-02`) at 67,52: south door opens onto Campus Quad. Views 0, 3; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **The Chapel** (`AMENITY-CHAPEL`) at 66,68: south door opens onto The Japanese Garden. Views 0, 3; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **Humanities Research Institute** (`LAB-HIST`) at 73,60: south door opens onto The Founder's Statue. Views 0, 3; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).

## door-behind-mass (115)

- **University Clinic** (`HLTH-T2`) at 53,50: west door opens into Medical Center's wall. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Meridian Tower** (`DORM-12`) at 66,47: east door opens into Overlook Village's wall. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Lakeside House** (`DORM-02`) at 53,59: east door opens into Riverside House's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Lakeside House** (`DORM-02`) at 54,59: east door opens into Riverside House's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`) at 53,68: east door opens into Hillcrest House's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`) at 54,68: east door opens into Hillcrest House's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`) at 53,58: west door opens into Lakeside House's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`) at 54,58: west door opens into Lakeside House's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`) at 53,67: west door opens into Riverside House's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`) at 54,67: west door opens into Riverside House's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Biology Labs** (`LAB-BIOL`) at 58,55: east door opens into Chemistry Labs's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Chemistry Labs** (`LAB-CHEM`) at 58,60: east door opens into Physics Labs's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Chemistry Labs** (`LAB-CHEM`) at 58,54: west door opens into Biology Labs's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Physics Labs** (`LAB-PHYS`) at 58,65: east door opens into Mechanical Engineering Labs's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Physics Labs** (`LAB-PHYS`) at 58,59: west door opens into Chemistry Labs's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Mechanical Engineering Labs** (`LAB-MECH`) at 58,70: east door opens into Electrical Engineering Labs's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Mechanical Engineering Labs** (`LAB-MECH`) at 58,64: west door opens into Physics Labs's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Electrical Engineering Labs** (`LAB-ELEC`) at 58,69: west door opens into Mechanical Engineering Labs's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Watson School of Business** (`HALL-01`) at 68,57: east door opens into Library's wall. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`) at 68,56: west door opens into Watson School of Business's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`) at 69,56: west door opens into Watson School of Business's wall. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Watson School of Business** (`HALL-01`) at 55,57: east door opens into Romero School of Social Sciences & Humanities's wall. Views 0, 1; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 55,56: west door opens into Watson School of Business's wall. Views 2, 3; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).

## door-under-tree (40)

- **Watson School of Business** (`HALL-01`) at 57,53: a tree stands on the south door's tile. Views 0, 3; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Watson School of Business** (`HALL-01`) at 54,57: a tree stands on the east door's tile. Views 0, 1; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 57,65: a tree stands on the south door's tile. Views 0, 3; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 54,69: a tree stands on the east door's tile. Views 0, 1; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Meridian Tower** (`DORM-12`) at 61,55: a tree stands on the north door's tile. Views 1, 2; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Meridian Tower** (`DORM-12`) at 65,59: a tree stands on the east door's tile. Views 0, 1; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Biology Labs** (`LAB-BIOL`) at 63,66: a tree stands on the north door's tile. Views 1, 2; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Union Square Eatery** (`DININGHALL-02`) at 71,69: a tree stands on the east door's tile. Views 0, 1; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).

## door-under-prop (20)

- **The Grand Table** (`DININGHALL-04`) at 63,59: a bike rack stands on the north door's tile. Views 1, 2; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Founders Hall** (`BLDG-GENSTUDIES`) at 59,58: a lamp stands on the south door's tile. Views 0, 3; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Founders Hall** (`BLDG-GENSTUDIES`) at 56,62: a bench stands on the east door's tile. Views 0, 1; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Riverside House** (`DORM-03`) at 63,63: a bike rack stands on the north door's tile. Views 1, 2; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).

## door-onto-lawn (1235)

- **Medical Center** (`HLTH-T3`) at 62,45: south door opens onto grass. Views 0, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Medical Center** (`HLTH-T3`) at 56,51: east door opens onto grass. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Medical Center** (`HLTH-T3`) at 56,39: west door opens onto grass. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **University Clinic** (`HLTH-T2`) at 56,53: south door opens onto grass. Views 0, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **University Clinic** (`HLTH-T2`) at 53,56: east door opens onto grass. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Meridian Tower** (`DORM-12`) at 70,43: south door opens onto grass. Views 0, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Meridian Tower** (`DORM-12`) at 62,43: north door opens onto grass. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Meridian Tower** (`DORM-12`) at 66,39: west door opens onto grass. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Watson School of Business** (`HALL-01`) at 52,73: north door opens onto grass. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Watson School of Business** (`HALL-01`) at 55,77: east door opens onto grass. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Watson School of Business** (`HALL-01`) at 55,69: west door opens onto grass. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 69,64: south door opens onto grass. Views 0, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 61,64: north door opens onto grass. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 65,61: west door opens onto grass. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Hollis School of Science** (`HALL-03`) at 69,82: south door opens onto grass. Views 0, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Hollis School of Science** (`HALL-03`) at 61,82: north door opens onto grass. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Hollis School of Science** (`HALL-03`) at 65,85: east door opens onto grass. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Library** (`LIB-T1`) at 77,74: south door opens onto grass. Views 0, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Library** (`LIB-T1`) at 73,79: east door opens onto grass. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Library** (`LIB-T1`) at 74,79: east door opens onto grass. Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Library** (`LIB-T1`) at 73,69: west door opens onto grass. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Library** (`LIB-T1`) at 74,69: west door opens onto grass. Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Watson School of Business** (`HALL-01`) at 57,58: north door opens onto grass. Views 1, 2; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Watson School of Business** (`HALL-01`) at 60,62: east door opens onto grass. Views 0, 1; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Watson School of Business** (`HALL-01`) at 60,54: west door opens onto grass. Views 2, 3; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 57,68: north door opens onto grass. Views 1, 2; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 60,72: east door opens onto grass. Views 0, 1; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 60,64: west door opens onto grass. Views 2, 3; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **The Grand Table** (`DININGHALL-04`) at 69,59: south door opens onto grass. Views 0, 3; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **The Grand Table** (`DININGHALL-04`) at 66,55: west door opens onto grass. Views 2, 3; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Physics Labs** (`LAB-PHYS`) at 67,66: south door opens onto grass. Views 0, 3; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Physics Labs** (`LAB-PHYS`) at 65,69: east door opens onto grass. Views 0, 1; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Health & Counseling Center** (`HLTH-T1`) at 57,67: south door opens onto grass. Views 0, 3; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Health & Counseling Center** (`HLTH-T1`) at 53,67: north door opens onto grass. Views 1, 2; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Health & Counseling Center** (`HLTH-T1`) at 55,69: east door opens onto grass. Views 0, 1; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Health & Counseling Center** (`HLTH-T1`) at 55,65: west door opens onto grass. Views 2, 3; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Lakeside House** (`DORM-02`) at 51,54: north door opens onto grass. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Lakeside House** (`DORM-02`) at 53,49: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Lakeside House** (`DORM-02`) at 54,49: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`) at 51,63: north door opens onto grass. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`) at 51,72: north door opens onto grass. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`) at 53,77: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`) at 54,77: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Biology Labs** (`LAB-BIOL`) at 58,49: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Electrical Engineering Labs** (`LAB-ELEC`) at 58,75: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Watson School of Business** (`HALL-01`) at 71,53: south door opens onto grass. Views 0, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Watson School of Business** (`HALL-01`) at 68,49: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`) at 68,66: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`) at 69,66: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Commons Cafeteria** (`DININGHALL-03`) at 70,70: south door opens onto grass. Views 0, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Commons Cafeteria** (`DININGHALL-03`) at 67,73: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Commons Cafeteria** (`DININGHALL-03`) at 68,73: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Commons Cafeteria** (`DININGHALL-03`) at 67,67: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Commons Cafeteria** (`DININGHALL-03`) at 68,67: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`) at 75,70: south door opens onto grass. Views 0, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`) at 70,70: north door opens onto grass. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`) at 72,73: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`) at 73,73: east door opens onto grass. Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`) at 72,67: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`) at 73,67: west door opens onto grass. Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Watson School of Business** (`HALL-01`) at 61,53: south door opens onto grass. Views 0, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Watson School of Business** (`HALL-01`) at 55,53: north door opens onto grass. Views 1, 2; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Watson School of Business** (`HALL-01`) at 58,57: east door opens onto grass. Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Watson School of Business** (`HALL-01`) at 58,49: west door opens onto grass. Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 63,65: south door opens onto grass. Views 0, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 57,65: north door opens onto grass. Views 1, 2; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 60,69: east door opens onto grass. Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 60,61: west door opens onto grass. Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Library** (`LIB-T1`) at 72,70: south door opens onto grass. Views 0, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Library** (`LIB-T1`) at 65,70: north door opens onto grass. Views 1, 2; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Library** (`LIB-T1`) at 68,75: east door opens onto grass. Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Library** (`LIB-T1`) at 69,75: east door opens onto grass. Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Library** (`LIB-T1`) at 68,65: west door opens onto grass. Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Library** (`LIB-T1`) at 69,65: west door opens onto grass. Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`) at 54,46: south door opens onto grass. Views 0, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`) at 49,46: north door opens onto grass. Views 1, 2; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`) at 51,51: east door opens onto grass. Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`) at 52,51: east door opens onto grass. Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`) at 51,41: west door opens onto grass. Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`) at 52,41: west door opens onto grass. Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- …and 167 more in doors.json.

## door-on-seam (220)

- **Library** (`LIB-T1`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 0, 1; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Library** (`LIB-T1`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 2, 3; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Commons Cafeteria** (`DININGHALL-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Commons Cafeteria** (`DININGHALL-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Student Center** (`SCTR-T1`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Library** (`LIB-T1`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (diagonal-classical, diagonal-georgian, diagonal-gothic, diagonal-mission, diagonal-modern).
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (diagonal-classical, diagonal-georgian, diagonal-gothic, diagonal-mission, diagonal-modern).
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **Library** (`LIB-T1`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 0, 1; 5 saves (loop-classical, loop-georgian, loop-gothic, loop-mission, loop-modern).
- **Library** (`LIB-T1`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 2, 3; 5 saves (loop-classical, loop-georgian, loop-gothic, loop-mission, loop-modern).
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Riverside House** (`DORM-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Riverside House** (`DORM-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **The Research Park** (`PROJ-RESEARCH-PARK`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (works, 13x8). Views 0, 1; 5 saves (specialized-classical, specialized-georgian, specialized-gothic, specialized-mission, specialized-modern).
- **The Research Park** (`PROJ-RESEARCH-PARK`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (works, 13x8). Views 2, 3; 5 saves (specialized-classical, specialized-georgian, specialized-gothic, specialized-mission, specialized-modern).
- **Library** (`LIB-T1`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 0, 1; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Library** (`LIB-T1`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (portico, 9x6). Views 2, 3; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Riverside House** (`DORM-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Riverside House** (`DORM-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Hillcrest House** (`DORM-04`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Hillcrest House** (`DORM-04`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Commons Cafeteria** (`DININGHALL-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Commons Cafeteria** (`DININGHALL-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Commons Cafeteria** (`DININGHALL-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; 5 saves (tee-classical, tee-georgian, tee-gothic, tee-mission, tee-modern).
- **Commons Cafeteria** (`DININGHALL-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; 5 saves (tee-classical, tee-georgian, tee-gothic, tee-mission, tee-modern).
- **Student Center** (`SCTR-T1`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; 5 saves (tee-classical, tee-georgian, tee-gothic, tee-mission, tee-modern).
- **Student Center** (`SCTR-T1`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; 5 saves (tee-classical, tee-georgian, tee-gothic, tee-mission, tee-modern).

## prop-on-tree (10)

- **Founders Hall** (`BLDG-GENSTUDIES`) at 59,55: the flag stands on a tile with a lamp. Views 0, 1, 2, 3; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 57,66: the bike rack stands on a tile with a tree. Views 0, 1, 2, 3; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).

## prop-behind (185)

- **Meridian Tower** (`DORM-12`) at 70,44: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Overlook Village** (`DORM-10`) at 73,53: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 69,65: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Hollis School of Science** (`HALL-03`) at 69,83: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (big-classical, big-georgian, big-gothic, big-mission, big-modern).
- **Watson School of Business** (`HALL-01`) at 63,59: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 63,69: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (cross-classical, cross-georgian, cross-gothic, cross-mission, cross-modern).
- **Lakeside House** (`DORM-02`) at 56,55: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Riverside House** (`DORM-03`) at 56,64: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Hillcrest House** (`DORM-04`) at 56,73: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Watson School of Business** (`HALL-01`) at 71,54: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Watson School of Business** (`HALL-01`) at 61,54: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 63,66: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Lakeside House** (`DORM-02`) at 54,47: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (curve-classical, curve-georgian, curve-gothic, curve-mission, curve-modern).
- **Watson School of Business** (`HALL-01`) at 57,59: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (dead-end-classical, dead-end-georgian, dead-end-gothic, dead-end-mission, dead-end-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 70,71: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (dead-end-classical, dead-end-georgian, dead-end-gothic, dead-end-mission, dead-end-modern).
- **Watson School of Business** (`HALL-01`) at 54,60: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (diagonal-classical, diagonal-georgian, diagonal-gothic, diagonal-mission, diagonal-modern).
- **Hollis School of Science** (`HALL-03`) at 63,52: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (diagonal-classical, diagonal-georgian, diagonal-gothic, diagonal-mission, diagonal-modern).
- **Lakeside House** (`DORM-02`) at 60,71: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (diagonal-classical, diagonal-georgian, diagonal-gothic, diagonal-mission, diagonal-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 58,61: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (ground-classical, ground-georgian, ground-gothic, ground-mission, ground-modern).
- **Watson School of Business** (`HALL-01`) at 57,64: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (loop-classical, loop-georgian, loop-gothic, loop-mission, loop-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 67,55: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (loop-classical, loop-georgian, loop-gothic, loop-mission, loop-modern).
- **Hollis School of Science** (`HALL-03`) at 67,73: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (loop-classical, loop-georgian, loop-gothic, loop-mission, loop-modern).
- **Founders Hall** (`BLDG-GENSTUDIES`) at 59,55: the flag stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Founders Hall** (`BLDG-GENSTUDIES`) at 59,59: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Lakeside House** (`DORM-02`) at 66,56: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Riverside House** (`DORM-03`) at 66,71: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Watson School of Business** (`HALL-01`) at 74,54: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (props-classical, props-georgian, props-gothic, props-mission, props-modern).
- **Watson School of Business** (`HALL-01`) at 63,54: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 63,63: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Lakeside House** (`DORM-02`) at 68,54: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Riverside House** (`DORM-03`) at 68,64: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Hillcrest House** (`DORM-04`) at 68,74: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (straight-classical, straight-georgian, straight-gothic, straight-mission, straight-modern).
- **Watson School of Business** (`HALL-01`) at 60,58: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (tee-classical, tee-georgian, tee-gothic, tee-mission, tee-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 60,70: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (tee-classical, tee-georgian, tee-gothic, tee-mission, tee-modern).
- **Watson School of Business** (`HALL-01`) at 57,54: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 57,66: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).
- **Meridian Tower** (`DORM-12`) at 69,56: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; 5 saves (trees-classical, trees-georgian, trees-gothic, trees-mission, trees-modern).

## overhang (37)

- **University Clinic** (`HLTH-T2`) at 55,50: draws 9 px in front of and 9 px beside its footprint, over Medical Center, which is painted before it. Views 0; big-mission.
- **University Clinic** (`HLTH-T2`) at 51,50: draws 9 px in front of and 9 px beside its footprint, over Medical Center, which is painted before it. Views 1; big-mission.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 62,64: draws 9 px in front of and 9 px beside its footprint, over a lamp, which is painted before it. Views 0; cross-mission.
- **Watson School of Business** (`HALL-01`) at 62,62: draws 9 px in front of and 9 px beside its footprint, over a lamp, which is painted before it. Views 3; cross-mission.
- **Mechanical Engineering Labs** (`LAB-MECH`) at 59,64: draws 6 px in front of and 4 px beside its footprint, over Physics Labs, which is painted before it. Views 0; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Mechanical Engineering Labs** (`LAB-MECH`) at 57,64: draws 6 px in front of and 4 px beside its footprint, over Physics Labs, which is painted before it. Views 1; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Mechanical Engineering Labs** (`LAB-MECH`) at 57,70: draws 2 px in front of and 4 px beside its footprint, over Electrical Engineering Labs, which is painted before it. Views 2; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Mechanical Engineering Labs** (`LAB-MECH`) at 59,70: draws 6 px in front of and 4 px beside its footprint, over Electrical Engineering Labs, which is painted before it. Views 3; 5 saves (crowded-classical, crowded-georgian, crowded-gothic, crowded-mission, crowded-modern).
- **Library** (`LIB-T1`) at 66,56: draws 9 px in front of and 9 px beside its footprint, over Watson School of Business, which is painted before it. Views 1; crowded-mission.
- **Watson School of Business** (`HALL-01`) at 66,57: draws 9 px in front of and 9 px beside its footprint, over Library, which is painted before it. Views 2; crowded-mission.
- **Watson School of Business** (`HALL-01`) at 70,57: draws 9 px in front of and 9 px beside its footprint, over Library, which is painted before it. Views 3; crowded-mission.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 57,56: draws 9 px in front of and 9 px beside its footprint, over Watson School of Business, which is painted before it. Views 0; ground-mission.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 53,56: draws 9 px in front of and 9 px beside its footprint, over Watson School of Business, which is painted before it. Views 1; ground-mission.
- **Watson School of Business** (`HALL-01`) at 53,57: draws 9 px in front of and 9 px beside its footprint, over Romero School of Social Sciences & Humanities, which is painted before it. Views 2; ground-mission.
- **Watson School of Business** (`HALL-01`) at 57,57: draws 9 px in front of and 9 px beside its footprint, over Romero School of Social Sciences & Humanities, which is painted before it. Views 3; ground-mission.
- **Founders Hall** (`BLDG-GENSTUDIES`) at 59,55: draws 9 px in front of and 9 px beside its footprint, over a lamp, the flag, which is painted before it. Views 2; props-mission.
- **Founders Hall** (`BLDG-GENSTUDIES`) at 53,55: draws 9 px in front of and 9 px beside its footprint, over a tree, which is painted before it. Views 3; props-mission.
- **Commons Cafeteria** (`DININGHALL-03`) at 60,58: draws 8 px in front of and 6 px beside its footprint, over a bike rack, which is painted before it. Views 3; tee-mission.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 57,68: draws 9 px in front of and 9 px beside its footprint, over a tree, which is painted before it. Views 1; trees-mission.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 52,69 57,62: draws 9 px in front of and 9 px beside its footprint, over a tree, which is painted before it. Views 2; trees-mission.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 56,69: draws 9 px in front of and 9 px beside its footprint, over a tree, which is painted before it. Views 3; trees-mission.
