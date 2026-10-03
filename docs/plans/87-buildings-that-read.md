# Plan 87 — Buildings that read as what they are

*Planning document only. Its job is to turn the owner's asset review (October
2026) into the changes that make each building look like what it is.*

**Status: Landed.** One PR, the nine streams merged into it.

**As implemented:**
- **Every stream landed as planned**; the departures are recorded here.
- **A (the Business School):** the hospital split and the weathering
  volumes (`weatherVolumes.ts`) now ask `isHospital`, so the Business School
  and the Athletic Performance Complex no longer weather on hospital boxes.
  The Business School is a podium with a ticker band, a glazed atrium and a
  ten-storey tower (its drawn storeys rose from 5 to 10). Its roof plant,
  first a plain box, became a louvred screen with fans. The merge then gave
  that `PlantScreen` to every flat roof's generic plant, and `RoofBox` went.
- **C (the sports sheds):** the Athletics Complex is now the *Sports &
  Recreation Complex*; a save still carrying the old name takes the new one
  on load (`refreshAuthoredText`).
- **D (the dining halls):** Harborview Market (11x7) became a market hall,
  so that the three largest halls do not repeat. The 5x4 hall is two
  storeys now.
- **E (the signature halls):** Health and Computer Science had to differ
  in material as well as feature, because `catalogue.test.ts` compares
  motif and material.
- **F (the library):** the library draws in its own file,
  `libraryMotif.tsx`.
- **G (towers and civic buildings):** the Campanile rose to 74 m on a
  narrower footprint and the Bell Tower dropped to 26 m. The Museum stands
  back from a forecourt inside its plot.
- **H (towers, glass and the Georgian roofline):** glass whose contrast
  with its wall falls below a threshold is swapped for pale reflected
  glass on every building, which also lights up Tudor's ground-floor
  windows. The Georgian roofline corners became an eaves balustrade with
  urns, and `EndPavilion` is unused.
- **I (style slips and labs):** LAB-NEUR is exempted from the invariant-
  material rule (`VERNACULAR_WALL_LABS`) so that it wears the set's wall.
- **Checks:**
  - Every placeable in all nine vernaculars at azimuths 45, 135, 225 and
    315 (4,032 cells).
  - Year-50 campuses in five vernaculars, at four views and two pitches, on
    the canvas map: the canvas drew everything.
  - Each stream also checked the SVG fallback, both footprint orientations
    and three pitches.
  - `docs/assets` regenerated with the fixed sheet.
- **The owner's second look** (after the PR went up):
  - **J:** the Recreation Center, the Gym and the Sports & Recreation
    Complex drawn again, so each reads at the map's own zoom.
    - The Complex is a court hall with its basketball courts seen through
      a glass wall, and an outdoor court in front.
    - The Gym is a two-storey glass box, with cardio machines over a
      weights floor and a dumbbell sign.
    - The Rec Center's climbing wall rises as a glazed tower above a roof
      deck.
    - The interiors are clipped to their panes in JS (`clipConvex`), so
      the canvas can draw them.
  - **K:** the Grand Quad laid out as a formal court.
    - A perimeter walk, cross walks and a fountain plaza, with hedged lawn
      panels whose beds and trees stay off every walk.
    - Walkers now keep to the walks there, since the panels are blocked
      (the owner's call).
    - The Campus Quad's trees came off its walks.
    - The beds and hedges follow the seasons.
  - **L:** Modern's Founders Hall raises a concrete carillon with a clock
    and bells in place of the stair-core block.
    - Brise-soleil fins and a folded-plate roof terrace are its own.
    - Every Modern hall stands on pilotis.
    - The founding screen draws the carillon.
- **Left:**
  - Cast shadows and label heights still read the main box for the taller
    parts: the Field House vault, the Engineering wing and the domes.

---

## 0. The brief

The owner asked for a review of every building asset against what the
building is meant to be. The owner then asked for every recommended fix, with
two rules:

- **Recognizable, not geometry.** An added feature must read as the thing it
  is. A dome, a stack, a terrace with tables or a climbing wall does. A cube
  stacked on a roof does not.
- **Every rotation.** Each change is checked at all four views (azimuths 45,
  135, 225 and 315), at the low and the opening pitch, with the footprint in
  both orientations, and on the canvas map as well as the SVG fallback.

## 1. The findings and their fixes

| # | Finding | Fix |
|---|---|---|
| 1 | The Business School draws as the hospital: any large `block` splits into the ward slab, with a red cross and a helipad | Only the Medical Center splits. The Business School gets a look of its own: a glazed atrium and a lit ticker band |
| 2 | The Research Park is a blank render shed; the Graduate College is the dorm drawing at 11×9 | The park as lab pavilions round a court, joined by a glazed link, with a sign at the gate. The Graduate College as a courtyard range with a corner tower |
| 3 | The Recreation Center, the Gym, the Athletics Complex and the Field House share one shed; the Natatorium is a flat box | Each gets its own look: a glazed corner with a climbing wall for the Rec Center; clerestories and a running track behind glass for the Gym; a long barrel roof for the Field House; a canopy and pitch-side stand for the Athletics Complex. The Natatorium gets a barrel roof with lanes behind its glazing. |
| 4 | Every dining hall is one low hipped shed with an awning, scaled up | Large halls become a refectory: a double-height hall with tall arched windows and a lantern. Mid sizes add a terrace with tables and umbrellas. Small cafés keep the awning. |
| 5 | The Science, Engineering, Health and Computer Science halls are boxes with roof units, and Science and Engineering are near twins | Science: fume-hood stacks and a rooftop greenhouse. Engineering: a high-bay wing with a roller door. Health: an entrance canopy and a clinic sign. Computer Science: a glazed atrium and solar panels. All wear the vernacular's wall. |
| 6 | The Library is a flat box with skylights in every vernacular but Gothic | A raised reading room with tall windows and front steps. Classical and Georgian: a rotunda. Gothic: a tower. Modern: a glazed reading room on pilotis. Mission: a tiled roof and a belfry. |
| 7 | The Campanile is a larger Bell Tower | The Campanile 2–3× taller and slender, with an open arcaded belfry and a spire. The Bell Tower squat, with a cupola. |
| 8 | Residence towers are office towers in every set, four alike; some long Modern and Art Deco faces show no windows | Punched windows in the vernacular's wall, balconies and a crown that varies by tower. The window pass fixed on dark faces. |
| 9 | Modern and Art Deco business halls wear Greek temple fronts; the Modern Training Institute wears a Georgian cupola | Entrances by vernacular: a cantilevered canopy in Modern, a stepped fluted portal in Art Deco. A rooflight in place of the cupola where the roof is flat. |
| 10 | Electrical Engineering, Experimental Economics and Chemical Engineering have no sign of their own; Neuroscience ignores the vernacular | A transformer yard with insulators; a portico and a ticker board; a pipe rack with distillation columns; the vernacular's wall on Neuroscience |
| — | The Georgian hall's corner caps read as floating brackets | A balustrade along the eaves, or dormers |
| — | The Law School and the Museum are both a flat slab with skylights | Law: a tall pedimented portico with steps. Museum: a top-lit gallery wing and sculpture on the forecourt. |
| — | The Great Dome is the same in every set | A tiled drum in Mission and a ribbed lantern in Gothic |
| — | `tools/sheet.tsx` drops a building's id and expansions, so the sheets and the asset gallery miss the garden, the statue and the venue stands | Pass both, as the map does. Regenerate `docs/assets`. |

## 2. The work

The work is split by building, so the pieces can be drawn side by side. One
PR collects them.

| Stream | Buildings |
|---|---|
| A | The Business School and the hospital split; the sheet tool |
| B | The Research Park and the Graduate College |
| C | The Recreation Center, the Gym, the Athletics Complex, the Field House, the Natatorium |
| D | The dining halls |
| E | The school signature halls |
| F | The Library |
| G | The Campanile and the Bell Tower; the Law School, the Museum, the Great Dome |
| H | The residence towers, dark faces, and the Georgian corner caps |
| I | The style slips and the labs |

## 3. What this plan does not do

- Change what any building does, costs or unlocks. The Athletics Complex's
  name is the one data change, if stream C renames it.
- Change footprints, so no save moves.
