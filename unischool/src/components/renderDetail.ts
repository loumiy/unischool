// How much of the map to draw right now: everything, or a DRAFT.
//
// Turning or tilting the camera changes every polygon on the map, so each
// frame of a camera move is a full React re-render of the scene — and a
// built-out campus is some seventeen thousand SVG nodes, most of them
// windows, doors, trim and tree crowns that nobody can follow while the view
// is swinging round. Building and committing that many elements costs more
// per frame than the screen refreshes, so while the camera is IN MOTION the
// motifs draw their masses and roofs and skip the detail, and the frame the
// motion ends on is drawn in full.
//
// A module-wide flag, like the camera in isoProjection.ts and for the same
// reason: the detail helpers in buildingMotifs.tsx and trees.tsx have no
// other reason to take a parameter, and CampusMap sets it before the render
// that reads it and hands it to its memoised children as a prop so they know
// to redraw. Nothing outside CampusMap may set it.
let draft = false;

export function setDraft(on: boolean): void {
  draft = on;
}

export function isDraft(): boolean {
  return draft;
}
