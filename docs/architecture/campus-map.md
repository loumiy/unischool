# The campus map

The map is the central interface and a **visual-only layer**: placement grants
nothing, gates nothing, and no system reads `placements`, `pathways` or
`trees`. The invariant sweep enforces it. Adjacency effects and any
economic or prestige feedback from the layout are deliberately deferred.

Buildings are modeled as data first and placed on a tile grid second. The grid
is drawn at an angle (2:1 dimetric — `src/components/isoProjection.ts`), and
each kind carries an architectural form
(`src/components/buildingMotifs.tsx`) — still only rendering.

## Footprints

**How big a footprint a Buildable gets is a placement rule, not data on the
Buildable** — it lives in `campusMap.ts`'s `footprintOf`, keyed on what the
Buildable already carries: its `kind` and `facilityType`, plus, for anything whose instances differ in SCALE rather than
in kind, a SIZE LADDER read off `effects.servesPopulation` (facilities) or
`effects.capacityBonus` (dorms). A 350-seat campus restaurant is 3x3 and the
16,000-seat market hall at the end of the same dining chain is 11x9; a 500-bed
residence hall is 9x4 and a 5,000-bed residential tower is 7x7 carried very
high. **Every footprint with a door on it is an ODD number of tiles across.**
A door is drawn at the centre of its front span, and on an even width that
centre is a tile SEAM — so the one square a student would walk through does
not exist, and a path can only ever reach the corner of two tiles. Open
ground keeps its even spans, because nothing enters a tennis court or a
running track through a drawn door. A `Placement` stores the footprint it was
built with, so this applies to new campuses only; an existing one keeps the
halls it has.

Everything is sized against a rough **15m to a tile**, which the football
stadium (a real one is about 220m by 180m — 15x12) pins down, so a library, a
pool, a hospital and a stadium stand in something like their real proportions
to each other. Size is purely geometric: a bigger building grants nothing and
costs nothing extra.

## Trees, and what draws over what

A new university does not open on a bare plate. `data/treeData.ts` seeds a
**founding woodland** at `createInitialState` — groves rather than an even
scatter, with a deliberate clearing around the middle where Founders Hall
already stands, so the map has *places* on it and siting a building is a
choice about ground. `GameState.trees` is one entry per wooded tile,
keyed by the same `pathTileKey()` `pathways` uses, and its value is a single
integer SEED: `components/trees.tsx` derives species, size and the tree's
offset within its own tile from it, so a wood is varied without storing
anything per tree and a given tree looks the same forever.

**Two rules, and the difference between them is the whole feature:**

- **Building FELLS.** The reducer's `PLACE_BUILDABLE` deletes every tree
  under the footprint it commits, in the same transaction, permanently. You
  cleared the ground to build there.
- **Paving only HIDES.** A path tile on a tree's tile stops it being drawn,
  and lifting the path brings it straight back. Nothing is deleted, so this
  is a pure *render-time* read of `pathways` in `CampusMap.tsx` — not a
  second piece of state to keep in step.

Trees draw in the **same depth-sorted pass as buildings**, not a layer of
their own: a tree in front of a hall paints over it and one behind it is
hidden by it, which a separate layer could never do. And, like `placements`
and `pathways`, `trees` is **read by no system** — the invariant sweep
enforces it.

**Flat ground is the exception to that pass, and has to be.** Painter's
order is the occlusion here, and one depth key per placement (the far corner
of its footprint) expresses a mass well enough — but it cannot express a
large FLAT plate. A 9x9 quad sorted on its far corner draws *after*, and so
over, a tree standing in front of its near corner but off to one side, whose
own depth is smaller. That is not a tuning problem; it is what a single sort
key cannot say about a big footprint.

So an open-ground facility (quad, pitch, ball field, courts, pool deck) is
split in two. Its **paint** has no height, can never legitimately occlude
anything, and is drawn in a pass of its own *under* every mass, needing no
depth at all. What genuinely **stands** on it — planting, hedges, a
fountain, a monument, a stand, an outfield fence — comes back from
`groundMarkings.ts`'s `groundProps` and joins the ordinary sorted pass, each
prop on the point it actually stands on, so a quad's own trees interleave
correctly with the woodland around them.
