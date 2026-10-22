# Probes, review III area 1

Written by `npm run review:probe` on `b1f2114`. Saves: `all` is a Completionist year-51 run with `--build-all` (seed 12345), `research-park` and `year-40-done` are the shared scenario bank's, `frame-00NN` are `timelapse.ts` frames of a Guided run (years 3, 5, 10), `guided-y20-clear` the bank's.

## catalogue
```
82 placeables

| Motif | Varies by vernacular | Count | Ids |
|---|---|---:|---|
| pavilion | yes | 14 | LAB-ECON, DINING-01, DININGHALL-02, DININGHALL-03, DININGHALL-04, DININGHALL-05, DININGHALL-06, DININGHALL-07, DININGHALL-08, GROCERY-01, SCTR-T1, SCTR-T2, HLTH-T1, HLTH-T2 |
| hangar | no | 10 | LAB-MECH, LAB-CIVE, LAB-AERO, LAB-FILM, REC-T1, GYM, REC-T2, ATH-ARENA, ATH-NATATORIUM, ATH-FIELDHOUSE |
| grounds | no | 10 | POOL, TENNIS-COURTS, ATH-FIELD, ATH-DIAMOND, QUAD-T1, QUAD-T2, AMENITY-STATUE, AMENITY-GAZEBO, AMENITY-FOUNTAIN, AMENITY-GARDEN |
| hall | yes | 9 | BLDG-GENSTUDIES, HALL-01, HALL-02, HALL-03, HALL-04, HALL-05, HALL-06, HALL-07, PROJ-TRAINING |
| residential | yes | 8 | DORM-01, DORM-02, DORM-03, DORM-04, DORM-06, DORM-08, DORM-09, PROJ-GRADUATE |
| block | no | 7 | LAB-NEUR, LAB-COMP, DORM-05, DORM-07, HLTH-T3, PROJ-BUSINESS, PROJ-ATHLETICS-COMPLEX |
| works | no | 6 | LAB-ELEC, LAB-CHEN, LAB-BIOL, LAB-CHEM, LAB-PHYS, PROJ-RESEARCH-PARK |
| portico | yes | 6 | LAB-HIST, LIB-T1, ART-GALLERY, PROJ-ARTS, PROJ-LAW, PROJ-MUSEUM |
| tower | no | 4 | DORM-12, DORM-13, DORM-14, DORM-15 |
| landmark | no | 4 | AMENITY-BELLTOWER, LANDMARK-CAMPANILE, LANDMARK-DOME, LANDMARK-GATE |
| village | yes | 2 | DORM-10, DORM-11 |
| bowl | no | 1 | ATH-STADIUM |
| chapel | yes | 1 | AMENITY-CHAPEL |

georgian: walls #bd6b48 36, #bb9468 13, #d8cdb4 7, #eef1f2 7, #6d4b3c 6, #93a9b4 3; entrances canopy 49, portico 9, none 8, colonnade 6

gothic: walls #8a8b86 35, #b8975f 13, #cbc5b0 8, #eef1f2 7, #585448 6, #93a9b4 3; entrances canopy 49, porch 11, none 8, colonnade 4

classical: walls #d6cfbb 35, #9e5a48 13, #c9a86a 8, #eef1f2 7, #6e3f36 6, #93a9b4 3; entrances portico 58, none 8, colonnade 6

mission: walls #e3d6b6 36, #b98763 13, #d4b276 7, #eef1f2 7, #5f5347 6, #93a9b4 3; entrances archway 35, arcade 29, none 8

modern: walls #b0a992 21, #dcd9cf 15, #b5623f 13, #5f7d8c 7, #eef1f2 7, #4d4f52 6, #93a9b4 3; entrances canopy 64, none 8
```

## vernacular (repeats only; every render-wall line read 0%)
```
## all.json: year 51, georgian
buildings (open ground left out): 75; restyled by the vernacular: 41 (55%), 49% of their footprint area
wearing the vernacular's surface (Plan 74E: its massing, or its windows, entrance and crest): 72 (96%), 85% of their footprint area
distinct looks: 67; drawn more than once:
  5× pavilion|#6d4b3c|||||3x3: chapter-house:5zsun5zxesod chapter-house:etyt81pllnal chapter-house:fv52aup56lf9 chapter-house:i3o80n24yvkt chapter-house:3icssywzzvoq
  4× tower|#bd6b48|||||7x7: DORM-12 DORM-13 DORM-14 DORM-15
  2× village|#6d4b3c|||||11x10: DORM-10 DORM-11
## research-park.json: year 40, georgian
buildings (open ground left out): 62; restyled by the vernacular: 31 (50%), 45% of their footprint area
wearing the vernacular's surface (Plan 74E: its massing, or its windows, entrance and crest): 61 (98%), 84% of their footprint area
distinct looks: 58; drawn more than once:
  4× tower|#bd6b48|||||7x7: DORM-12 DORM-13 DORM-14 DORM-15
  2× village|#6d4b3c|||||11x10: DORM-10 DORM-11
## year-40-done.json: year 41, georgian
buildings (open ground left out): 67; restyled by the vernacular: 38 (57%), 52% of their footprint area
wearing the vernacular's surface (Plan 74E: its massing, or its windows, entrance and crest): 64 (96%), 83% of their footprint area
distinct looks: 63; drawn more than once:
  4× pavilion|#6d4b3c|||||3x3: chapter-house:5zsun5zxesod chapter-house:etyt81pllnal chapter-house:fv52aup56lf9 chapter-house:i3o80n24yvkt
  2× village|#6d4b3c|||||11x10: DORM-10 DORM-11
```

## weather
```
all.json: year 51; buildings by weathering band 0..4: 11 / 8 / 66 / 0 / 0 of 85
year-40-done.json: year 41; buildings by weathering band 0..4: 7 / 34 / 36 / 0 / 0 of 77
research-park.json: year 40; buildings by weathering band 0..4: 7 / 27 / 34 / 0 / 0 of 68
```
