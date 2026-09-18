# UniSchool — Campus map assets, visual review, September 2026

*A visual review of every drawn asset on the campus map — the eleven motifs in each of the four vernaculars, the open-ground facilities, the trees and the construction states — as they stand at commit `2e178a9`. It is a review of the drawings, not of the systems behind them: the art style, the projection and the resolution are taken as given, and every proposal below is a refinement of what is drawn inside that style. The athletic venues get a section of their own, because they are the weakest set and are worth drawing again from scratch.*

**How this review was done.** Every placeable Buildable in the catalogue was rendered on its own, at 1.4 screen pixels per world unit (roughly three and a half times the zoom the game opens at), through the game's own `BuildingMotif`, `GroundMarking` and `groundProps` components via `react-dom/server`, in all four vernaculars — 41 cells per vernacular, 164 in all, including rotated footprints, a chapter house with letters, and open-ground and building sites under construction. The four committed campus renders (`docs/images/campus*.png`, the same year-31 Completionist campus in each vernacular) were cropped at native resolution to see how the assets sit together with trees, paths, shadows and each other. `buildingMotifs.tsx`, `buildingSpec.ts`, `groundMarkings.tsx`, `trees.tsx`, `pathways.tsx` and the map's render pass in `CampusMap.tsx` were read against the renders, so every defect below is tied to the code that draws it.

The npm registry was unreachable for the whole session, so the contact sheets were produced without the dev server; nothing here depends on that, but it is why no new screenshot is committed with this review.

---

## Executive summary

The map is in good shape as a *system*: one scale, one bay grid, one door catalogue, one lighting rule, one material set per vernacular, and it shows — a Georgian hall, a Gothic hall and a Mission hall are unmistakably three buildings of one campus each. The academic halls, the hospital, the Grand Quad and the four landmarks (cupola, spire, stair core, campanile) are the best things on the map and should be protected.

Four problems account for most of what looks unfinished:

1. **The athletic venues are the weakest set, and they are weak for one reason: none of them has a convincing raked stand.** The stadium reads as a flat-topped concrete tray with a field in it, the ball field's seating as five loose crates, the track's stand as a plank lying on the grass. Everything else about a venue — fences, floodlights, dugouts, a scoreboard, a press box — is missing too. Section 1 proposes each venue again from scratch.
2. **Every clear-span shed (rec centre, gym, athletics complex, arena, natatorium, film studio) is the same grey warehouse with a roof monitor that floats.** The raised strip along the ridge is drawn as a parallelogram nine units above the roof with no side faces, so it reads as a misregistered paler stripe rather than as a monitor. The six buildings also cannot be told apart at any zoom.
3. **Flat roofs are painted in pitched materials, and pitched vernaculars have too many flat roofs.** A Gothic pavilion wears a flat slate deck, a Mission pavilion and a Mission 1,000-bed hall wear a flat *clay tile* slab, and a Georgian 1,000-bed hall is a flat brown box. Slate and tile cannot be laid flat, and a six-storey residence hall in any of these three vernaculars would be pitched.
4. **The entrance parts misfire on small buildings.** The canopy over a pavilion or residence hall door reads as a white picnic table standing on the lawn; the Mission arcade is taller than the one-storey buildings it is applied to, so a small dining hall becomes a red slab on posts; and the Brutalist chapter house loses its Greek letters entirely because the pediment is gated on a door the recess entrance does not have.

Beneath those, a long tail of refinements — chimneys, a fly tower, dormers, a helipad, lab stacks, variety in the village, smaller roof plant on small roofs — would make the catalogue read as buildings rather than as well-proportioned boxes. Section 4 lists them per motif and Section 5 per vernacular. Section 6 sequences the work.

---

## 1. The athletic venues, from scratch

Everything in this section is about `groundMarkings.tsx` (the open-ground venues and `RakedStand`) and the `bowl` and `hangar` branches of `BuildingMass` in `buildingMotifs.tsx`.

### 1.1 The one shared problem: `RakedStand`

Every venue shares one piece of seating, and it does not read as seating from this camera. A `RakedStand` is a single quadrilateral (the rake) with `rows - 1` faint lines across it and, optionally, one vertical face. Three things follow:

- **The far banks have no visible thickness.** A stand whose rake faces the camera (the stadium's west and north banks, the diamond's grandstand) is a flat pale plane; nothing says it is a wedge rather than a painted ramp. Its two triangular *end* faces — the side profile of the wedge, which is the one shape that says "raked seating" from any angle — are never drawn.
- **The seat rows are lines, not steps.** `stand-seat` strokes at 0.30–0.35 alpha vanish at map zoom and, close up, read as ruled paper. Real terraces read as alternating bands of light tread and shadowed riser.
- **There is no plinth, vomitory, rail or concourse.** A stand meets the ground and the field with a sharp edge and nothing else.

**Proposal — rebuild `RakedStand` as a stepped wedge.** Draw it as N tiers, each a thin box (tread top, lit; riser front, shaded) stacked back and up from the field edge, with the two end faces of the whole wedge closed as polygons in the wall tone. Give it an optional back wall, a top rail (one line in the trim colour) and a break every few tiers where a vomitory (a dark slot) cuts through. Keep the API (`outer`, `inner`, `bottomH`, `topH`, palette) so the four callers do not change, and add `endFaces: boolean` for banks whose ends are visible. Cost: about six polygons per tier; a stadium bank at eight tiers is fifty polygons, which is what one hall's windows cost.

### 1.2 The football stadium (`bowl`, 24x20)

**What it looks like.** A rectangular ring of pale concrete with a perfectly flat top and mitred corners, a red band around a small gridiron. At map scale it is the largest object on the map and reads as a tray. The far banks are brighter than the near banks' outer walls, which reverses the depth cue: the far side reads as the top of a solid box. There are no entrances, no floodlights, no press box, no scoreboard, and the four banks meet at the corners in a solid mitre, which is what makes it a box rather than a bowl.

**Proposal — draw it again as four stands, a concourse and a field:**

- **Four separate raked banks with open corners.** Inset each bank by its own depth at both ends (as now) *and* leave the corner triangles open, showing the concrete concourse below. Open corners are the single strongest "stadium, not box" signal from above.
- **Asymmetric seating.** A college stadium has a tall home side and a lower visitor side. Give the west (far-left) bank two tiers with a press box on top — a long low box in the trim colour with a dark glazing strip — and make the east bank two-thirds the height. A single upper deck stepped back over the lower one on the home side, with a shadowed soffit under it, reads as "stadium" from any distance.
- **Vomitories and a top rail** from the new `RakedStand`.
- **Floodlights.** Four masts at the corners of the concourse: a thin line in screen space with a small dark rectangle head, lifted well above the top rail (about 1.5x the stand height). They are the tallest things on any campus and are what makes a stadium recognisable at the zoom the game opens at.
- **A scoreboard** on the far (north) end: a dark rectangle on two posts standing on the concourse behind the end bank.
- **The interior.** Drop the red "track" band, or make it a narrow grey concourse: a football stadium has a running track only if it is a shared venue, and the red frame currently reads as a second track next to the real one on the multi-sport field. Add goalposts — two lifted `line`s and a crossbar at each goal line, in the trim colour — and a darker end zone with a midfield roundel.
- **Its construction state.** A 24x20 site as one hatched plate with four tiny poles reads as a deck; reuse `GroundSite`'s graded earth and hoarding (as the open-ground venues already do) with a stadium-sized post spacing, and raise the earthworks of the bowl (a low bank around the plate) in the last third of the build.

### 1.3 The multi-sport field (`grounds`, 20x11)

**What it looks like.** The best of the venues: a real stadium-shaped track with eight lanes and a correctly proportioned pitch. Two things let it down. The stand is a pale plank lying beside the track — its front wall is four units high and its end faces are not drawn, so it has no mass — and the track itself has no start or finish marks, so from above it reads as a red oval with rings rather than as a running track.

**Proposal:**

- Rebuild the stand with the new `RakedStand` (end faces on), stand it on a low concrete plinth one tile deep, and give it a small cover — a thin slab on posts over the back half of the seating — which is what a college track stand actually has and what makes it read as a building rather than a ramp.
- Mark the track: a finish line across all eight lanes at the end of the home straight, staggered start marks (eight short ticks stepping back round the first bend) and lane numbers are three pixels apiece; the finish line alone is enough at map zoom.
- Mark the D-zones at each end of the infield with a paler track tone and a long-jump runway (one thin pale strip with a sand pit at its end) in one of them, so the infield ends are not blank red.
- Goals on the pitch: two tiny white boxes (a `boxFaces` outline, two units high) at each end. Corner flags are below a pixel and should be skipped.
- Colour: the track is a flat `#b4714f`; a two-tone track (lane 1–4 slightly darker than 5–8, or a darker kerb ring) reads as a laid surface rather than as paint.

### 1.4 The ball diamond (`grounds`, 14x14)

**What it looks like.** The field reads instantly — warning track, infield skin, grass inside the base paths — and is the best-drawn open ground on the map after the Grand Quad. The seating is the problem: five separate wedge-shaped concrete crates fanned behind the plate, each with its own heavy outer wall and flat pale rake, gaps between them wide enough to read as five buildings. The backstop is a faint grey arc nearly invisible against them. The pitcher's mound is a large pale disc and there are no bases, no home plate, no batter's boxes, no dugouts, no foul poles, no bullpens.

**Proposal:**

- **One grandstand, not five.** Keep the straight banks (the reason for them — an unbroken arc reads as an amphitheatre — is right) but make them one continuous structure: the five rakes sharing one back wall run as a single polyline, aisles drawn as dark slots *in* the rake rather than as gaps *between* stands, and the whole thing on a plinth. Give the centre bank a small press box and a roof (a thin slab on four posts over the back rows) — the covered grandstand behind home plate is the silhouette of a ballpark.
- **Dugouts.** Two low boxes (one storey, dark open front) along the first- and third-base lines just outside the foul lines, in the concrete tone. Cheap, and they are what says "baseball" rather than "a field with an arc on it" at map zoom.
- **The infield.** Three small pale squares at the bases and a pentagon at home; a smaller mound (0.030 of the short side rather than 0.045); batter's boxes as two thin outlines either side of the plate.
- **A real backstop.** Raise it to about a storey, draw it as a translucent dark mesh polygon (the existing class is right, its alpha is too low at 0.22 — try 0.45) with three pale posts.
- **Foul poles** at both ends of the outfield fence (two lifted lines in yellow — the one place on the map that colour is correct), and a **batter's eye and scoreboard** at centre field: a dark panel on the fence at the bisector, with a slightly taller board behind it.
- **Outfield mowing**: two or three concentric arcs of `ground-mow` between the infield and the warning track, the way the quad's lawn is striped.

### 1.5 The tennis courts (`grounds`, 12x4)

**What it looks like.** Six correctly sized courts on one tan slab. Accurate and flat: nothing stands up, the whole block is one colour, and there is no fence, which tennis courts always have.

**Proposal:**

- **A fence.** A translucent dark mesh band about 3 m high around the slab (the same treatment as the backstop above), with posts every tile and a gate on the path side. It is the one vertical thing the asset needs and it also gives the block a shadow.
- **Two-tone surface.** The court inside the lines in a blue-green hard-court colour and the run-off in the current tan (or the reverse: green surround, tan court — either is a real hard-court scheme). At map zoom the line work disappears and this two-tone is what says "tennis".
- **Nets with height.** Replace the heavy white centre line with a short dark vertical strip (a `WallBand`-style quad one unit high) between two posts, so the net stands rather than lies.
- Optional: a small bench or shade shelter between courts three and four.

### 1.6 The recreation pool (`grounds`, 7x4)

**What it looks like.** A beige deck with a blue rectangle and three lane lines bunched in the middle. The catalogue calls it "an indoor pool" (`facilitiesData.ts`, `POOL_ID`) and the map draws an open-air deck; one of the two should change. The drawing is the better half — an outdoor deck differentiates it from the natatorium — so the description should say outdoor.

**Proposal:**

- Lane ropes across the full width, evenly spaced (eight lanes, seven lines), in a translucent white; a pale coping ring around the water (one unit of `ground-deck` shade lighter than the deck) so the pool reads as sunk into the deck rather than painted on it; a darker deep-end half.
- Starting blocks: eight tiny pale boxes on the deck at one end.
- A row of deck furniture or a pool house: one small `RoofBox`-sized changing block in the corner in the concrete tone gives the plate a vertical element and a shadow.
- A low fence, as the courts.

### 1.7 The sheds: rec centre, gym, athletics complex, arena, natatorium, film studio (`hangar`)

**What they look like.** Six grey boxes with buttress piers, a rank of small square clerestory windows, two domestic doors, and a flat roof with a paler strip along the middle and a pale rooflight on the strip. They differ only in footprint. Two defects and one design gap:

- **The roof monitor floats.** The raised deck is drawn as a single parallelogram at `H + 9` with no side faces; from this camera its down-left and down-right edges do not meet the roof, so it reads as a paler stripe offset up and to the left of where it should be — a registration error rather than a monitor. Draw it as a `boxFaces` box (two visible faces plus top) and put the rooflight on its top.
- **The windows say "punched masonry".** A clear-span hall has a continuous clerestory band under the eaves, not a rank of small squares. Use the `ribbon` outline for the hangar's one rank (it is already implemented for Brutalism), or a run of tall narrow lights between the piers.
- **Nothing tells them apart.** An arena, a natatorium and a fitness centre are three different buildings.

**Proposal — one shed vocabulary, three silhouettes:**

- **Rec centre / gym / athletics complex (the fitness chain):** keep the pier-and-clerestory box, fix the monitor, add a glazed entrance bay (a short curtain-wall section around the door, reusing `CurtainWall`) and a canopy; the athletics complex, being the capstone, gets a second lower wing along one side.
- **Arena (11x9):** a barrel-vault roof — the long roof faces as two shallow curved sections (four or five facets across, shaded by `SLOPE`) rising to a ridge along the long axis — over a taller wall, with a glazed concourse (curtain wall) wrapping the ground floor of the two visible faces and a wide entrance. Nothing else on the campus is vaulted, so the arena becomes recognisable from anywhere.
- **Natatorium (7x5):** keep the curtain material but make it *act* like glass: a full-height glazed long face (`CurtainWall` from the plinth up) on one side with the pool visible as a blue band low in the glazing, a shallow monopitch roof falling toward the glazed side, and the monitor dropped. A tall thin flue or plant stack at the back corner is a real natatorium feature and separates it from the arena.
- **Film studio (LAB-FILM):** a blank sound stage wall (no clerestory — stages have no windows), one big roller door on the long face, and the ordinary monitor. It is meant to look industrial.

---

## 2. Defects (things that are wrong, not merely plain)

Ordered by how visible they are.

1. **Floating roof monitor on every `hangar`** — see 1.7. `buildingMotifs.tsx`, the `motif === 'hangar'` roof branch: the raised deck polygon has no side faces.
2. **Brutalist chapter houses have no letters.** `ChapterPediment` is rendered only when `glyphs && door`, and `door` is `null` whenever the entrance part is `recess`. A chapter house's letters are the one thing that says which house it is, and Brutalism loses them silently. Fix: when the entrance is a recess, cast the letters directly into the wall above the recess slab (a `<text>` in the wall's own shear, as the pediment already does) with no pediment.
3. **Mission arcade taller than the building it fronts.** `Arcade` uses `ARCADE_HEIGHT` (7.2 m) uncapped. On a one-storey pavilion (the founding dining hall, the health centre, the chapter house) the arcade rises above the eaves and the building becomes a red slab on posts. Clamp it the way `Canopy` clamps: `Math.min(ARCADE_HEIGHT, H - EAVES_COURSE - COPING)`, and on a one-storey building fall back to `canopy`.
4. **Flat roofs in a pitched material.** `brickBuff.roof` is `GOTHIC_SLATE` in Gothic and `CLAY_TILE` in Mission, and `brickDark.roof` is `CLAY_TILE` in Mission — so every Gothic pavilion, every Mission pavilion and the Mission 1,000-bed hall wear a flat roof painted as slate or tile. Either give those motifs a ridge in those vernaculars (section 5) or, in the motif, use the vernacular's deck colour whenever `ridge === 0` — a flat roof is a deck whatever the walls are.
5. **The quad tiers.** Not a drawing bug but a catalogue one worth knowing: `Campus Quad` (tier 1), `Second Quad` (no tier) and `Grand Quad & Gardens` (tier 2) — the first two draw identically, which is intended; the review's own sheet initially rendered the wrong one, which is a reminder that `tier` is only read by the quad.
6. **The rec pool is described as indoor and drawn outdoor** — see 1.6.
7. **The stadium's construction site** is a hatched deck rather than a site — see 1.2.
8. **The far banks of the stadium are lit brighter than the near banks' walls** (`fills(1.04)`/`fills(0.96)` against `fills(0.8)`/`fills(0.72)`), which reverses the depth cue — see 1.2.

---

## 3. Cross-cutting refinements

These touch several motifs at once and are cheaper done once.

- **The canopy (`Canopy`).** A slab in pure trim white on two posts, standing clear of the wall, reads as a picnic table on the lawn on every pavilion and residence hall in Georgian, Gothic and Mission. Make the slab thinner (`CANOPY_SLAB * 0.6`), tint it a shade below the trim with a dark soffit, attach its back edge to the wall, and give it a small cast shadow on the ground. In Gothic, a pitched hood (a tiny gable in the roof tone) instead of a slab would suit the set.
- **Roof plant scales with the footprint.** `RoofBox` units are placed as fractions of the roof, so a 3x3 dining hall carries two units that cover a third of its roof. Cap each unit at a real size (about 4 m by 3 m via `across`) and draw one unit on footprints under 4 tiles.
- **Rooflights on `portico`** are six rectangles each a fifth of the roof. Halve them, or replace with a single central lantern (a low glazed box) on the library and a fly tower on the performing arts centre (section 4).
- **Steps** are drawn as pale treads only; the risers take `stone.trim` shades and read fine, but the flight ends flush with the lawn. A one-unit dark line at the bottom tread's foot would seat it.
- **Cast shadows** are correct in direction but a single flat rhombus; every mass gets the same shadow whatever its shape, so a tower and a shed of the same footprint cast identical shadows. Not worth changing now — noted so nobody "fixes" it into something inconsistent.
- **Windows** are flat pale quads with no reveal. A one-pixel darker line along each pane's head and one jamb (the two edges away from the light) would give every window on the campus depth for two extra `line`s per pane; at the game's default zoom this is invisible, so it belongs behind a zoom threshold if it is done at all.

---

## 4. Refinements by motif

### `hall` (academic halls)

Good. The vocabulary — plinth, courses, cornice, parapet, hipped roof, end pavilions, centre bay, portico, tower — reads as a Georgian hall and the Gothic, Brutalist and Mission versions are three different buildings on the same plan.

- **Chimneys.** A Georgian or Gothic hall has two or four chimney stacks on the ridge or at the end pavilions; nothing on the campus has one. A stack is a `boxFaces` box in the wall tone with a trim cap — four polygons — and it is one of the strongest period signals available at any zoom.
- **The end pavilion copings are too bright.** At map scale every Georgian hall shows four glaring white blocks at its corners. Take the coping down to the cornice's tone (`shade(trim, 0.9)`) and halve `COPING_OVERHANG`.
- **The clock tower's drum is a plain box** though the comment calls it colonnaded. Four thin shafts at the drum's corners in `towerStone` (as `Portico` draws them) would make it a cupola rather than a hat box.
- **The Gothic roof** is a bare dark pyramid on a hall that size; two or three small dormers on each long slope (a tiny gabled box in the wall tone with one lancet) break it up and are the most Gothic thing a roof can carry.
- **Mission eaves.** The set's own note says deep eaves are its other signature, but `HippedRoof` is drawn on the footprint with no overhang. Extend the Mission roof by `COPING_OVERHANG * 2` on every side and draw the shadow band under it (a dark `WallBand` at the head of the wall).

### `residential` (350 / 500 / 1,000 beds)

- **The 1,000-bed hall is a flat box in every pitched vernacular.** `residentialRidgeMetres` returns 0 at six storeys in Georgian, Gothic and Mission. A six-storey Georgian or Gothic hall would carry a shallow hip; give it the hall's own `2.2 m` (Georgian), `6.5 m` (Gothic) and `3.0 m` (Mission), and reserve the flat roof for Brutalism. If it stays flat, it needs a parapet band and rooftop plant so it is not a slab.
- **Doorways.** The residential door with a canopy is fine once the canopy is fixed (section 3); a second door on the long face of the 1,000-bed hall would break a 100 m wall.
- **Bays.** The window grid is perfectly regular. Real halls have a stair bay: skip the middle rank's windows in the bay over the door (the door bay already reserves the ground floor) and put a tall stair window there instead.

### `village`

Ten identical gabled boxes in three ranks plus one long house, no windows, no doors, no trees, on a plain lawn with two barely visible walks. At map scale it is a storage-unit lot.

- Vary the houses: alternate the ridge direction between ranks, vary heights (two and three storeys) and footprints slightly, and turn two of them into L-shapes by butting a short wing onto the end.
- Give each a door (the `residential` family, no canopy) and one rank of small windows on the long face; at this size a 2 px pane is legible and the comment's "sub-pixel" concern only holds at the default zoom.
- Plant it: four to six trees from `TreeAt` around the green (the quad already does this through `groundProps`; the village draws everything in the motif and would need the same split), and a hedge line along the plot edge.
- Draw the walks as a connected network (a loop around the green with spurs to each door) in the path fill, rather than two disconnected strips.
- Chimneys, as the halls.

### `tower`

Reads as an apartment tower over a podium. The podium's shopfront is a rank of small squares near the ground rather than glazing; run a `CurtainWall` along the podium's two visible faces from the plinth to the first floor and put the doors in it. The plant room on the roof is drawn in the wall tint and reads as a hat; use the roof tone and add a second, smaller box.

### `portico` (library, research library, performing arts centre, gallery, LAB-HIST)

- **The performing arts centre is indistinguishable from the library.** Give it a fly tower: a blank box in the wall tone, one and a half storeys above the roof, over the back third of the footprint. It is the one silhouette that says "theatre" and it separates the campus's two largest civic buildings.
- The library's rooflights: see section 3. A central lantern on the library and a barrel-vaulted reading-room roof on the research library would separate the two library rungs as well.
- The colonnade's columns are correct; each colonnade is drawn at `span * 0.9`, centred, so the two stop short of the shared corner and do not meet. Run both to the corner and share the corner column.

### `pavilion` (student centre, dining, health tier 1 and 2, grocery, chapter house, LAB-ECON)

- **Georgian dining halls and the union should be pitched.** A refectory is a hall with a roof; `GEORGIAN_RIDGE_METRES` lists only `hall` and `village`. Add `pavilion: 2.0` in Georgian, `5.0` in Gothic and `3.0` in Mission (which also fixes the flat slate and flat tile in section 2). Brutalism stays flat.
- **The largest dining hall (11x9, three storeys)** is the size of the hospital and reads as a parking structure. It wants a different form from the 3x3 café: a tall single-storey hall (a clear-span volume, the `hangar` height rule) with a glazed front, or a two-part massing (servery block plus hall) like the hospital's slab-and-wing. A size-ladder in the motif — the same way the block splits above `BLOCK_SPLIT_MIN_TILES` — would let the big rungs read as halls.
- **The health chain has no sign until the hospital.** A small red cross on the clinic's and the counselling centre's entrance face (the `RedCross` component at half size) ties the chain together.
- **The grocery** is the one pavilion with a *shopfront* door family; give its front a shopfront band (the tower's podium glazing) rather than the domestic rank of windows.
- Roof plant: see section 3.

### `block` (hospital, LAB-COMP)

The hospital is the best-drawn large building on the map. Two additions: a **helipad** on the slab roof (a pale circle with an "H", which the code comment already imagines) and an **ambulance canopy** — a longer, deeper version of the fixed canopy — over the wing's entrance. LAB-COMP is fine as a plainer box; a row of louvred plant along one roof edge would say "data centre".

### `works` (labs)

Fine as deliberately dull boxes. One **exhaust stack** — a thin tall box in the deck tone with a dark cap, at the back corner — is the universal lab signal and costs four polygons.

### `grounds` (quads)

The Grand Quad is the best-looking thing on the campus. Two notes: the tier-1 monument is small enough to vanish at map zoom (double its shaft width and cap); and the quad's mowing stripes run one way across all four lawn panels — running them perpendicular in alternate panels is how a groundskeeper actually mows a quad, and it reads as care.

### Construction states

The building site (hatched deck, four poles, a lift rail) is adequate. Two cheap improvements: a **tower crane** on any site over 5 tiles (a mast and a jib as three `line`s in screen space, in the scaffold-pole tone) — sites are visible for months and a crane is the one thing that says "building" from any distance — and a **hoarding** around the plate as `GroundSite` already draws, so building and ground sites share one language.

---

## 5. Refinements by vernacular

### Georgian

Complete and consistent. Wants chimneys (halls, residences, village), pitched refectories, quieter end-pavilion copings, and the 1,000-bed hall's hip. The cupola's drum wants its columns.

### Collegiate Gothic

The silhouette is right and the spire is excellent. Wants dormers on the hall roofs, chimneys, pitched pavilions (a flat slate roof is a contradiction), the 1,000-bed hall's roof, and a hood rather than a slab canopy. The porch's buttresses are hard to see; deepen `BUTTRESS_PLAN` a little and give the set-off a darker top. Lancet windows on the white clinic look odd; `pavilion` varies "lightly" by design, and the clinic (`clinical` material) is the one pavilion that should not vary at all — consider excluding `clinical` walls from `paneShapeOf`.

### Brutalist

The stacked hall is the most convincing thing in the set. Wants its chapter letters back (section 2); the recess slab is fine. The ribbons on the residence halls sit high in their rank, so the top band nearly touches the slab edge; lowering `RIBBON_DROP` a little for `residential` would give the top storey a soffit. The village as flat-roofed boxes is right for the set but wants the same variety as the others.

### Mission

The loudest set from a distance, as intended, and the campanile and arcades are good. Wants the arcade clamp (section 2), deep eaves (section 4, `hall`), pitched pavilions, a pitched 1,000-bed hall, and the arcade's lean-to roof drawn as a shallow *sloped* tile face rather than a flat red slab (one polygon from the arcade's outer edge, lifted, to the wall). The arcade's piers are the wall colour; in the reference campuses they are the trim (whitewashed) against ochre or cream walls.

---

## 6. Sequencing

Each row is one PR-sized piece of work; the first three are the ones that change the map most for the least code.

| # | Work | Touches | Why first |
|---|------|---------|-----------|
| 1 | `RakedStand` as a stepped wedge with end faces, vomitories and a rail | `groundMarkings.tsx` | Every venue inherits it; fixes the tray, the crates and the plank at once |
| 2 | Fix the four defects: floating monitor, Brutalist letters, arcade clamp, flat roofs in pitched materials | `buildingMotifs.tsx`, `buildingSpec.ts` | Visible on every campus; each is a few lines |
| 3 | The stadium from scratch: open corners, asymmetric decks, press box, floodlights, scoreboard, goalposts, interior | `buildingMotifs.tsx` (`bowl`), `groundMarkings.tsx` | The largest object on the map |
| 4 | The three shed silhouettes (fitness box, vaulted arena, glazed natatorium) and the studio | `buildingMotifs.tsx` (`hangar`) | Six identical buildings become four kinds |
| 5 | Diamond grandstand, dugouts, backstop, bases; field stand, track marks, goals; courts fence and two-tone; pool lanes, coping, blocks | `groundMarkings.tsx` | The rest of the athletic set |
| 6 | Canopy redraw, roof-plant size cap, rooflight size | `buildingMotifs.tsx` | Cross-cutting, small |
| 7 | Chimneys, dormers, fly tower, helipad, lab stack, tower drum columns, clinic crosses | `buildingMotifs.tsx`, `buildingSpec.ts` | Per-motif signals |
| 8 | Pitched pavilions and 1,000-bed halls per vernacular; Mission eaves and arcade roof | `buildingSpec.ts` tables, `buildingMotifs.tsx` | Vernacular tables mostly |
| 9 | Village variety, planting and walks | `buildingMotifs.tsx` (`village`) | The one motif that needs a re-layout |
| 10 | Cranes and hoardings on building sites; stadium earthworks | `buildingMotifs.tsx`, `groundMarkings.tsx` | Polish |

Every item keeps the existing palette discipline (`test/building-spec.test.ts`'s distance and spread checks) — nothing above adds a wall colour, and the only new hues are the diamond's yellow foul poles and the courts' hard-court surface, both ground paint rather than materials.

**Verifying it.** Art has to be looked at, as `tools/README.md` says. The contact-sheet approach used for this review — every Buildable rendered alone in every vernacular through `react-dom/server`, then screenshotted per cell — is worth adding beside `shoot.mjs` as a tool, because it is the only way to see every motif at once without playing a campus that contains them all, and it needs no dev server.
