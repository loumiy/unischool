# Doors and depth

Written by `npm run review:doors` (`tools/review/doorsAndDepth.ts`) over 3 saves: `natural50`, `guided50`, `all`. Views are numbered by E presses from the opening view (0).

| Rule | Hits | Saves | Buildings | What it means |
|---|---|---|---|---|
| door-onto-ground | 22 | 3 | 17 | A drawn door opens onto open ground (a court, a pool, a quad, a garden); nothing hides it. |
| door-behind-mass | 0 | 0 | 0 | A door's tile is built over; the wall is hidden where it would be drawn, and walkers treat the door as shut. |
| door-under-tree | 20 | 3 | 20 | A tree stands on a drawn door's tile. |
| door-under-prop | 3 | 2 | 3 | A lamp, bench, the flag or a bike rack stands on a drawn door's tile. |
| door-onto-lawn | 814 | 3 | 75 | A drawn door opens onto grass: no path. |
| door-on-seam | 88 | 3 | 15 | The wall is an even number of tiles long: its door is drawn on a tile seam. |
| door-unreachable | 0 | 0 | 0 | The door's tile has no way on foot to the road. |
| walled-in | 0 | 0 | 0 | Every door is shut. |
| prop-on-tree | 1 | 1 | 1 | The flag or a bike rack is placed on a tile with a tree, a lamp or a bench. |
| prop-behind | 65 | 3 | 22 | The flag or a rack stands on the +row side, which two of the four views do not face. |
| overhang | 15 | 3 | 8 | A building draws past its footprint over something painted before it: the attachment shows in front of what it should stand inside or behind. |
| depth-order | 0 | 0 | 0 | Two overlapping things are painted against depthSort.ts's relation. |

## How far each form draws past its footprint

The deepest point any building of the form draws in front of its footprint's near edges and beyond its side corners, in screen units at the opening zoom (a tile is 64 wide and 32 deep), over every save and view. Steps, porticos, pavilions and canopies are meant to stand proud of the wall; what matters is what stands on the tile they reach (the overhang rule below).

| Form | Buildings | Front (max) | Side (max) | Under construction, front (max) |
|---|---|---|---|---|
| block | 7 | 13 | 0 | — |
| bowl | 1 | 0 | 0 | — |
| chapel | 1 | 0 | 0 | — |
| hall | 8 | 21 | 0 | — |
| hangar | 10 | 13 | 4 | — |
| landmark | 2 | 0 | 0 | — |
| pavilion | 25 | 13 | 0 | — |
| portico | 6 | 6 | 3 | — |
| residential | 8 | 16 | 0 | — |
| tower | 4 | 0 | 0 | — |
| village | 2 | 0 | 0 | — |
| works | 6 | 13 | 0 | — |

## door-onto-ground (22)

- **The Original Commons** (`DINING-01`) at 2,17: west door opens onto Campus Quad. Views 2, 3; natural50.
- **Lakeside House** (`DORM-02`) at 6,17: west door opens onto Campus Quad. Views 2, 3; natural50.
- **Lakeside House** (`DORM-02`) at 7,17: west door opens onto Campus Quad. Views 2, 3; natural50.
- **Chemical Engineering Labs** (`LAB-CHEN`) at 9,9: north door opens onto Campus Quad. Views 1, 2; natural50.
- **Civil Engineering Labs** (`LAB-CIVE`) at 9,15: north door opens onto Campus Quad. Views 1, 2; natural50.
- **Student Center** (`SCTR-T1`) at 2,29: west door opens onto Campus Quad. Views 2, 3; guided50.
- **Student Center** (`SCTR-T1`) at 3,29: west door opens onto Campus Quad. Views 2, 3; guided50.
- **Union Square Eatery** (`DININGHALL-02`) at 2,54: west door opens onto Grand Quad & Gardens. Views 2, 3; guided50.
- **Riverside House** (`DORM-03`) at 7,29: west door opens onto Campus Quad. Views 2, 3; guided50.
- **Riverside House** (`DORM-03`) at 8,29: west door opens onto Campus Quad. Views 2, 3; guided50.
- **Experimental Economics Lab** (`LAB-ECON`) at 6,54: west door opens onto Grand Quad & Gardens. Views 2, 3; guided50.
- **Summit House** (`DORM-06`) at 13,54: west door opens onto Grand Quad & Gardens. Views 2, 3; guided50.
- **Vanguard House** (`DORM-07`) at 13,43: north door opens onto Grand Quad & Gardens. Views 1, 2; guided50.
- **Library** (`LIB-T1`) at 3,17: west door opens onto Campus Quad. Views 2, 3; all.
- **Student Center** (`SCTR-T1`) at 2,45: west door opens onto Grand Quad & Gardens. Views 2, 3; all.
- **Student Center** (`SCTR-T1`) at 3,45: west door opens onto Grand Quad & Gardens. Views 2, 3; all.
- **Watson School of Business** (`HALL-01`) at 8,45: west door opens onto Grand Quad & Gardens. Views 2, 3; all.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 9,17: west door opens onto Campus Quad. Views 2, 3; all.
- **The Grand Table** (`DININGHALL-04`) at 13,33: east door opens onto Grand Quad & Gardens. Views 0, 1; all.
- **Art Gallery** (`ART-GALLERY`) at 13,45: west door opens onto Grand Quad & Gardens. Views 2, 3; all.
- **Chemistry Labs** (`LAB-CHEM`) at 13,36: north door opens onto Grand Quad & Gardens. Views 1, 2; all.
- **University Clinic** (`HLTH-T2`) at 13,42: north door opens onto Grand Quad & Gardens. Views 1, 2; all.

## door-under-tree (20)

- **Sato School of Arts & Media** (`HALL-01`) at 0,52: a tree stands on the north door's tile. Views 1, 2; natural50.
- **Aerospace Engineering Labs** (`LAB-AERO`) at 11,24: a tree stands on the east door's tile. Views 0, 1; natural50.
- **Computing Research Center** (`LAB-COMP`) at 11,24: a tree stands on the west door's tile. Views 2, 3; natural50.
- **Old Well Commons** (`DININGHALL-05`) at 15,99: a tree stands on the east door's tile. Views 0, 1; natural50.
- **Tau Delta Lambda House** (`chapter-house:cymmoubtqjac`) at 13,89: a tree stands on the north door's tile. Views 1, 2; natural50.
- **Summit House** (`DORM-06`) at 17,105: a tree stands on the north door's tile. Views 1, 2; natural50.
- **Herrera School of Engineering** (`HALL-04`) at 3,110: a tree stands on the west door's tile. Views 2, 3; guided50.
- **Murray School of Computer Science** (`HALL-05`) at 11,90: a tree stands on the south door's tile. Views 0, 3; guided50.
- **Hillcrest House** (`DORM-04`) at 9,86: a tree stands on the east door's tile. Views 0, 1; guided50.
- **The Business School** (`PROJ-BUSINESS`) at 30,120: a tree stands on the south door's tile. Views 0, 3; guided50.
- **Arena** (`ATH-ARENA`) at 35,31: a tree stands on the west door's tile. Views 2, 3; guided50.
- **Field House** (`ATH-FIELDHOUSE`) at 36,43: a tree stands on the west door's tile. Views 2, 3; guided50.
- **The Research Park** (`PROJ-RESEARCH-PARK`) at 39,53: a tree stands on the west door's tile. Views 2, 3; guided50.
- **The University Museum** (`PROJ-MUSEUM`) at 44,73: a tree stands on the south door's tile. Views 0, 3; guided50.
- **Beacon Tower** (`DORM-13`) at 39,26: a tree stands on the south door's tile. Views 0, 3; guided50.
- **Aurora Tower** (`DORM-15`) at 39,26: a tree stands on the north door's tile. Views 1, 2; guided50.
- **Lakeside House** (`DORM-02`) at 3,88: a tree stands on the east door's tile. Views 0, 1; all.
- **Student Union Expansion** (`SCTR-T2`) at 3,88: a tree stands on the west door's tile. Views 2, 3; all.
- **Hollis School of Science** (`HALL-03`) at 11,90: a tree stands on the north door's tile. Views 1, 2; all.
- **Medical Center** (`HLTH-T3`) at 33,24: a tree stands on the east door's tile. Views 0, 1; all.

## door-under-prop (3)

- **Cascade House** (`DORM-05`) at 6,115: a bike rack stands on the north door's tile. Views 1, 2; guided50.
- **Summit House** (`DORM-06`) at 17,18: a bike rack stands on the north door's tile. Views 1, 2; all.
- **The Business School** (`PROJ-BUSINESS`) at 29,71: a bike rack stands on the north door's tile. Views 1, 2; all.

## door-onto-lawn (814)

- **Reddy School of Computer Science** (`BLDG-GENSTUDIES`) at 65,62: south door opens onto grass. Views 0, 3; natural50.
- **Reddy School of Computer Science** (`BLDG-GENSTUDIES`) at 59,62: north door opens onto grass. Views 1, 2; natural50.
- **Reddy School of Computer Science** (`BLDG-GENSTUDIES`) at 62,66: east door opens onto grass. Views 0, 1; natural50.
- **Reddy School of Computer Science** (`BLDG-GENSTUDIES`) at 62,58: west door opens onto grass. Views 2, 3; natural50.
- **Library** (`LIB-T1`) at 6,4: south door opens onto grass. Views 0, 3; natural50.
- **Library** (`LIB-T1`) at 0,4: north door opens onto grass. Views 1, 2; natural50.
- **Library** (`LIB-T1`) at 3,8: east door opens onto grass. Views 0, 1; natural50.
- **Library** (`LIB-T1`) at 3,0: west door opens onto grass. Views 2, 3; natural50.
- **The Original Commons** (`DINING-01`) at 4,19: south door opens onto grass. Views 0, 3; natural50.
- **The Original Commons** (`DINING-01`) at 0,19: north door opens onto grass. Views 1, 2; natural50.
- **The Original Commons** (`DINING-01`) at 2,21: east door opens onto grass. Views 0, 1; natural50.
- **Meadow House** (`DORM-01`) at 4,25: south door opens onto grass. Views 0, 3; natural50.
- **Meadow House** (`DORM-01`) at 0,25: north door opens onto grass. Views 1, 2; natural50.
- **Meadow House** (`DORM-01`) at 2,29: east door opens onto grass. Views 0, 1; natural50.
- **Meadow House** (`DORM-01`) at 2,21: west door opens onto grass. Views 2, 3; natural50.
- **Student Center** (`SCTR-T1`) at 5,32: south door opens onto grass. Views 0, 3; natural50.
- **Student Center** (`SCTR-T1`) at 0,32: north door opens onto grass. Views 1, 2; natural50.
- **Student Center** (`SCTR-T1`) at 2,35: east door opens onto grass. Views 0, 1; natural50.
- **Student Center** (`SCTR-T1`) at 3,35: east door opens onto grass. Views 0, 1; natural50.
- **Student Center** (`SCTR-T1`) at 2,29: west door opens onto grass. Views 2, 3; natural50.
- **Student Center** (`SCTR-T1`) at 3,29: west door opens onto grass. Views 2, 3; natural50.
- **Union Square Eatery** (`DININGHALL-02`) at 4,45: south door opens onto grass. Views 0, 3; natural50.
- **Union Square Eatery** (`DININGHALL-02`) at 0,45: north door opens onto grass. Views 1, 2; natural50.
- **Union Square Eatery** (`DININGHALL-02`) at 2,48: east door opens onto grass. Views 0, 1; natural50.
- **Union Square Eatery** (`DININGHALL-02`) at 2,42: west door opens onto grass. Views 2, 3; natural50.
- **Sato School of Arts & Media** (`HALL-01`) at 6,52: south door opens onto grass. Views 0, 3; natural50.
- **Sato School of Arts & Media** (`HALL-01`) at 0,52: north door opens onto grass. Views 1, 2; natural50.
- **Sato School of Arts & Media** (`HALL-01`) at 3,56: east door opens onto grass. Views 0, 1; natural50.
- **Sato School of Arts & Media** (`HALL-01`) at 3,48: west door opens onto grass. Views 2, 3; natural50.
- **Media Production Studio** (`LAB-FILM`) at 4,59: south door opens onto grass. Views 0, 3; natural50.
- **Media Production Studio** (`LAB-FILM`) at 0,59: north door opens onto grass. Views 1, 2; natural50.
- **Media Production Studio** (`LAB-FILM`) at 2,62: east door opens onto grass. Views 0, 1; natural50.
- **Media Production Studio** (`LAB-FILM`) at 2,56: west door opens onto grass. Views 2, 3; natural50.
- **Oak Hall** (`HALL-02`) at 6,81: south door opens onto grass. Views 0, 3; natural50.
- **Oak Hall** (`HALL-02`) at 0,81: north door opens onto grass. Views 1, 2; natural50.
- **Oak Hall** (`HALL-02`) at 3,85: east door opens onto grass. Views 0, 1; natural50.
- **Oak Hall** (`HALL-02`) at 3,77: west door opens onto grass. Views 2, 3; natural50.
- **Art Gallery** (`ART-GALLERY`) at 4,88: south door opens onto grass. Views 0, 3; natural50.
- **Art Gallery** (`ART-GALLERY`) at 0,88: north door opens onto grass. Views 1, 2; natural50.
- **Art Gallery** (`ART-GALLERY`) at 2,91: east door opens onto grass. Views 0, 1; natural50.
- **Art Gallery** (`ART-GALLERY`) at 2,85: west door opens onto grass. Views 2, 3; natural50.
- **Linden Hall** (`HALL-03`) at 6,95: south door opens onto grass. Views 0, 3; natural50.
- **Linden Hall** (`HALL-03`) at 0,95: north door opens onto grass. Views 1, 2; natural50.
- **Linden Hall** (`HALL-03`) at 3,99: east door opens onto grass. Views 0, 1; natural50.
- **Linden Hall** (`HALL-03`) at 3,91: west door opens onto grass. Views 2, 3; natural50.
- **Biology Labs** (`LAB-BIOL`) at 4,102: south door opens onto grass. Views 0, 3; natural50.
- **Biology Labs** (`LAB-BIOL`) at 0,102: north door opens onto grass. Views 1, 2; natural50.
- **Biology Labs** (`LAB-BIOL`) at 2,105: east door opens onto grass. Views 0, 1; natural50.
- **Biology Labs** (`LAB-BIOL`) at 2,99: west door opens onto grass. Views 2, 3; natural50.
- **Health & Counseling Center** (`HLTH-T1`) at 4,107: south door opens onto grass. Views 0, 3; natural50.
- **Health & Counseling Center** (`HLTH-T1`) at 0,107: north door opens onto grass. Views 1, 2; natural50.
- **Health & Counseling Center** (`HLTH-T1`) at 2,109: east door opens onto grass. Views 0, 1; natural50.
- **Health & Counseling Center** (`HLTH-T1`) at 2,105: west door opens onto grass. Views 2, 3; natural50.
- **Lakeside House** (`DORM-02`) at 9,22: south door opens onto grass. Views 0, 3; natural50.
- **Lakeside House** (`DORM-02`) at 4,22: north door opens onto grass. Views 1, 2; natural50.
- **Lakeside House** (`DORM-02`) at 6,27: east door opens onto grass. Views 0, 1; natural50.
- **Lakeside House** (`DORM-02`) at 7,27: east door opens onto grass. Views 0, 1; natural50.
- **Humanities Research Institute** (`LAB-HIST`) at 4,119: south door opens onto grass. Views 0, 3; natural50.
- **Humanities Research Institute** (`LAB-HIST`) at 0,119: north door opens onto grass. Views 1, 2; natural50.
- **Humanities Research Institute** (`LAB-HIST`) at 2,122: east door opens onto grass. Views 0, 1; natural50.
- **Humanities Research Institute** (`LAB-HIST`) at 2,116: west door opens onto grass. Views 2, 3; natural50.
- **Chemistry Labs** (`LAB-CHEM`) at 8,38: south door opens onto grass. Views 0, 3; natural50.
- **Chemistry Labs** (`LAB-CHEM`) at 4,38: north door opens onto grass. Views 1, 2; natural50.
- **Chemistry Labs** (`LAB-CHEM`) at 6,41: east door opens onto grass. Views 0, 1; natural50.
- **Chemistry Labs** (`LAB-CHEM`) at 6,35: west door opens onto grass. Views 2, 3; natural50.
- **Physics Labs** (`LAB-PHYS`) at 8,44: south door opens onto grass. Views 0, 3; natural50.
- **Physics Labs** (`LAB-PHYS`) at 4,44: north door opens onto grass. Views 1, 2; natural50.
- **Physics Labs** (`LAB-PHYS`) at 6,47: east door opens onto grass. Views 0, 1; natural50.
- **Physics Labs** (`LAB-PHYS`) at 6,41: west door opens onto grass. Views 2, 3; natural50.
- **Pi Rho Nu House** (`chapter-house:8905kiod4h2g`) at 8,58: south door opens onto grass. Views 0, 3; natural50.
- **Pi Rho Nu House** (`chapter-house:8905kiod4h2g`) at 4,58: north door opens onto grass. Views 1, 2; natural50.
- **Pi Rho Nu House** (`chapter-house:8905kiod4h2g`) at 6,60: east door opens onto grass. Views 0, 1; natural50.
- **Pi Rho Nu House** (`chapter-house:8905kiod4h2g`) at 6,56: west door opens onto grass. Views 2, 3; natural50.
- **Commons Cafeteria** (`DININGHALL-03`) at 9,88: south door opens onto grass. Views 0, 3; natural50.
- **Commons Cafeteria** (`DININGHALL-03`) at 4,88: north door opens onto grass. Views 1, 2; natural50.
- **Commons Cafeteria** (`DININGHALL-03`) at 6,91: east door opens onto grass. Views 0, 1; natural50.
- **Commons Cafeteria** (`DININGHALL-03`) at 7,91: east door opens onto grass. Views 0, 1; natural50.
- **Commons Cafeteria** (`DININGHALL-03`) at 6,85: west door opens onto grass. Views 2, 3; natural50.
- **Commons Cafeteria** (`DININGHALL-03`) at 7,85: west door opens onto grass. Views 2, 3; natural50.
- **Gym & Fitness Center** (`GYM`) at 10,102: south door opens onto grass. Views 0, 3; natural50.
- …and 734 more in doors.json.

## door-on-seam (88)

- **Student Center** (`SCTR-T1`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; natural50.
- **Student Center** (`SCTR-T1`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; natural50.
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; natural50.
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; natural50.
- **Commons Cafeteria** (`DININGHALL-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; natural50.
- **Commons Cafeteria** (`DININGHALL-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; natural50.
- **Riverside House** (`DORM-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; natural50.
- **Riverside House** (`DORM-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; natural50.
- **Hillcrest House** (`DORM-04`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; natural50.
- **Hillcrest House** (`DORM-04`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; natural50.
- **Old Well Commons** (`DININGHALL-05`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 7x6). Views 0, 1; natural50.
- **Old Well Commons** (`DININGHALL-05`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 7x6). Views 2, 3; natural50.
- **Cascade House** (`DORM-05`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; natural50.
- **Cascade House** (`DORM-05`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; natural50.
- **The Business School** (`PROJ-BUSINESS`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (block, 9x8). Views 0, 1; natural50.
- **The Business School** (`PROJ-BUSINESS`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (block, 9x8). Views 2, 3; natural50.
- **The Law School** (`PROJ-LAW`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 0, 1; natural50.
- **The Law School** (`PROJ-LAW`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 2, 3; natural50.
- **Campus Grocery Store** (`GROCERY-01`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; natural50.
- **Campus Grocery Store** (`GROCERY-01`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; natural50.
- **Field House** (`ATH-FIELDHOUSE`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (hangar, 9x6). Views 0, 1; natural50.
- **Field House** (`ATH-FIELDHOUSE`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (hangar, 9x6). Views 2, 3; natural50.
- **The Research Park** (`PROJ-RESEARCH-PARK`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (works, 13x8). Views 0, 1; natural50.
- **The Research Park** (`PROJ-RESEARCH-PARK`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (works, 13x8). Views 2, 3; natural50.
- **The University Museum** (`PROJ-MUSEUM`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 0, 1; natural50.
- **The University Museum** (`PROJ-MUSEUM`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 2, 3; natural50.
- **Waterside Commons** (`DININGHALL-06`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 9x6). Views 0, 1; natural50.
- **Waterside Commons** (`DININGHALL-06`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 9x6). Views 2, 3; natural50.
- **Student Center** (`SCTR-T1`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; guided50.
- **Student Center** (`SCTR-T1`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; guided50.
- **Recreation Center** (`REC-T1`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (hangar, 5x4). Views 0, 1; guided50.
- **Recreation Center** (`REC-T1`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (hangar, 5x4). Views 2, 3; guided50.
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; guided50.
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; guided50.
- **Commons Cafeteria** (`DININGHALL-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; guided50.
- **Commons Cafeteria** (`DININGHALL-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; guided50.
- **Riverside House** (`DORM-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; guided50.
- **Riverside House** (`DORM-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; guided50.
- **Hillcrest House** (`DORM-04`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; guided50.
- **Hillcrest House** (`DORM-04`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; guided50.
- **Cascade House** (`DORM-05`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; guided50.
- **Cascade House** (`DORM-05`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; guided50.
- **Old Well Commons** (`DININGHALL-05`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 7x6). Views 0, 1; guided50.
- **Old Well Commons** (`DININGHALL-05`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 7x6). Views 2, 3; guided50.
- **Campus Grocery Store** (`GROCERY-01`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; guided50.
- **Campus Grocery Store** (`GROCERY-01`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; guided50.
- **The Business School** (`PROJ-BUSINESS`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (block, 9x8). Views 0, 1; guided50.
- **The Business School** (`PROJ-BUSINESS`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (block, 9x8). Views 2, 3; guided50.
- **Waterside Commons** (`DININGHALL-06`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 9x6). Views 0, 1; guided50.
- **Waterside Commons** (`DININGHALL-06`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 9x6). Views 2, 3; guided50.
- **The Law School** (`PROJ-LAW`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 0, 1; guided50.
- **The Law School** (`PROJ-LAW`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 2, 3; guided50.
- **Field House** (`ATH-FIELDHOUSE`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (hangar, 9x6). Views 0, 1; guided50.
- **Field House** (`ATH-FIELDHOUSE`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (hangar, 9x6). Views 2, 3; guided50.
- **The Research Park** (`PROJ-RESEARCH-PARK`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (works, 13x8). Views 0, 1; guided50.
- **The Research Park** (`PROJ-RESEARCH-PARK`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (works, 13x8). Views 2, 3; guided50.
- **The University Museum** (`PROJ-MUSEUM`): east wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 0, 1; guided50.
- **The University Museum** (`PROJ-MUSEUM`): west wall is 8 tiles long: its door is drawn on the seam between two tiles (portico, 11x8). Views 2, 3; guided50.
- **Student Center** (`SCTR-T1`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; all.
- **Student Center** (`SCTR-T1`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; all.
- **Recreation Center** (`REC-T1`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (hangar, 5x4). Views 0, 1; all.
- **Recreation Center** (`REC-T1`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (hangar, 5x4). Views 2, 3; all.
- **Lakeside House** (`DORM-02`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; all.
- **Lakeside House** (`DORM-02`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; all.
- **O'Brien Field House** (`ATH-FIELDHOUSE`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (hangar, 9x6). Views 0, 1; all.
- **O'Brien Field House** (`ATH-FIELDHOUSE`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (hangar, 9x6). Views 2, 3; all.
- **Commons Cafeteria** (`DININGHALL-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; all.
- **Commons Cafeteria** (`DININGHALL-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; all.
- **Riverside House** (`DORM-03`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; all.
- **Riverside House** (`DORM-03`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; all.
- **Hillcrest House** (`DORM-04`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; all.
- **Hillcrest House** (`DORM-04`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; all.
- **Cascade House** (`DORM-05`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 0, 1; all.
- **Cascade House** (`DORM-05`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (a residence, 9x4). Views 2, 3; all.
- **Old Well Commons** (`DININGHALL-05`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 7x6). Views 0, 1; all.
- **Old Well Commons** (`DININGHALL-05`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 7x6). Views 2, 3; all.
- **Waterside Commons** (`DININGHALL-06`): east wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 9x6). Views 0, 1; all.
- **Waterside Commons** (`DININGHALL-06`): west wall is 6 tiles long: its door is drawn on the seam between two tiles (pavilion, 9x6). Views 2, 3; all.
- **Campus Grocery Store** (`GROCERY-01`): east wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 0, 1; all.
- **Campus Grocery Store** (`GROCERY-01`): west wall is 4 tiles long: its door is drawn on the seam between two tiles (pavilion, 5x4). Views 2, 3; all.
- …and 8 more in doors.json.

## prop-on-tree (1)

- **Sterling House** (`DORM-08`) at 29,53: the bike rack stands on a tile with a tree. Views 0, 1, 2, 3; all.

## prop-behind (65)

- **Reddy School of Computer Science** (`BLDG-GENSTUDIES`) at 65,59: the flag stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Reddy School of Computer Science** (`BLDG-GENSTUDIES`) at 65,63: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Meadow House** (`DORM-01`) at 4,26: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Sato School of Arts & Media** (`HALL-01`) at 6,53: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Oak Hall** (`HALL-02`) at 6,82: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Linden Hall** (`HALL-03`) at 6,96: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Lakeside House** (`DORM-02`) at 9,23: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Saleh School of Health Science** (`HALL-04`) at 10,121: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Sanchez School of Business** (`HALL-05`) at 12,52: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Silva School of Engineering** (`HALL-06`) at 12,96: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Riverside House** (`DORM-03`) at 15,83: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Hillcrest House** (`DORM-04`) at 17,51: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Cascade House** (`DORM-05`) at 20,61: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Summit House** (`DORM-06`) at 23,106: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Vanguard House** (`DORM-07`) at 23,118: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Sterling House** (`DORM-08`) at 35,117: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Crestline House** (`DORM-09`) at 37,76: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Overlook Village** (`DORM-10`) at 43,105: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **Ridgeline Village** (`DORM-11`) at 45,17: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; natural50.
- **McKenzie School of Science** (`BLDG-GENSTUDIES`) at 65,59: the flag stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **McKenzie School of Science** (`BLDG-GENSTUDIES`) at 65,63: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Meadow House** (`DORM-01`) at 4,5: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Ruiz School of Social Sciences & Humanities** (`HALL-01`) at 6,65: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Lakeside House** (`DORM-02`) at 5,74: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Oak Hall** (`HALL-02`) at 6,83: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Mensah School of Arts & Media** (`HALL-03`) at 6,101: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Herrera School of Engineering** (`HALL-04`) at 6,115: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Riverside House** (`DORM-03`) at 10,35: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Murray School of Computer Science** (`HALL-05`) at 11,91: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Hillcrest House** (`DORM-04`) at 11,82: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Sycamore Hall** (`HALL-06`) at 12,99: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Cascade House** (`DORM-05`) at 11,116: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Summit House** (`DORM-06`) at 16,61: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Vanguard House** (`DORM-07`) at 19,44: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Sterling House** (`DORM-08`) at 21,73: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Crestline House** (`DORM-09`) at 21,114: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Overlook Village** (`DORM-10`) at 27,56: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Ridgeline Village** (`DORM-11`) at 30,38: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Meridian Tower** (`DORM-12`) at 29,112: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Beacon Tower** (`DORM-13`) at 39,27: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Horizon Tower** (`DORM-14`) at 46,5: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Aurora Tower** (`DORM-15`) at 47,27: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; guided50.
- **Founders Hall** (`BLDG-GENSTUDIES`) at 65,59: the flag stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Founders Hall** (`BLDG-GENSTUDIES`) at 65,63: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Meadow House** (`DORM-01`) at 4,5: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Lakeside House** (`DORM-02`) at 5,84: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Watson School of Business** (`HALL-01`) at 11,50: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Romero School of Social Sciences & Humanities** (`HALL-02`) at 12,22: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Riverside House** (`DORM-03`) at 12,117: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Hillcrest House** (`DORM-04`) at 16,82: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Hollis School of Science** (`HALL-03`) at 17,91: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Cascade House** (`DORM-05`) at 17,18: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Maple Hall** (`HALL-04`) at 21,105: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Summit House** (`DORM-06`) at 23,19: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Shaw School of Engineering** (`HALL-05`) at 22,29: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Vanguard House** (`DORM-07`) at 25,7: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Sycamore Hall** (`HALL-06`) at 25,37: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Sterling House** (`DORM-08`) at 29,53: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Crestline House** (`DORM-09`) at 29,71: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Overlook Village** (`DORM-10`) at 36,7: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Ridgeline Village** (`DORM-11`) at 42,83: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Meridian Tower** (`DORM-12`) at 41,93: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Beacon Tower** (`DORM-13`) at 44,5: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Horizon Tower** (`DORM-14`) at 46,59: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.
- **Aurora Tower** (`DORM-15`) at 46,67: the bike rack stands on the +row side, behind the building in two views. Views 1, 2; all.

## overhang (15)

- **Art Gallery** (`ART-GALLERY`) at 0,90: draws 6 px in front of and 3 px beside its footprint, over a tree, which is painted before it. Views 0; natural50.
- **Aerospace Engineering Labs** (`LAB-AERO`) at 9,23: draws 12 px in front of and 4 px beside its footprint, over a bike rack, which is painted before it. Views 0; natural50.
- **Media Production Studio** (`LAB-FILM`) at 1,56: draws 2 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 1; natural50.
- **Aerospace Engineering Labs** (`LAB-AERO`) at 10,18: draws 12 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 1; natural50.
- **Mechanical Engineering Labs** (`LAB-MECH`) at 8,111: draws 9 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 2; natural50.
- **Civil Engineering Labs** (`LAB-CIVE`) at 10,18: draws 9 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 2; natural50.
- **Media Production Studio** (`LAB-FILM`) at 3,62: draws 2 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 3; natural50.
- **Media Production Studio** (`LAB-FILM`) at 4,5: draws 2 px in front of and 4 px beside its footprint, over a bike rack, which is painted before it. Views 0; guided50.
- **Shayo Aquatic Center** (`ATH-NATATORIUM`) at 13,102: draws 2 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 0; guided50.
- **Mechanical Engineering Labs** (`LAB-MECH`) at 13,31: draws 12 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 0; guided50.
- **Arena** (`ATH-ARENA`) at 39,31: draws 2 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 0; guided50.
- **Shayo Aquatic Center** (`ATH-NATATORIUM`) at 8,103: draws 2 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 3; guided50.
- **Art Gallery** (`ART-GALLERY`) at 11,50: draws 6 px in front of and 3 px beside its footprint, over a bike rack, which is painted before it. Views 0; all.
- **Civil Engineering Labs** (`LAB-CIVE`) at 22,29: draws 12 px in front of and 4 px beside its footprint, over a bike rack, which is painted before it. Views 0; all.
- **O'Brien Field House** (`ATH-FIELDHOUSE`) at 7,120: draws 13 px in front of and 4 px beside its footprint, over a tree, which is painted before it. Views 1; all.
