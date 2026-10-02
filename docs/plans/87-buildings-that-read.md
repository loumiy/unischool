# Plan 87 — Buildings that read as what they are

*Planning document only. Its job is to turn the owner's asset review (October
2026) into the changes that make each building look like what it is.*

**Status: Proposed.**

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
