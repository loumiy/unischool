// Whether a placed building is on the map's screen (Plan 70H). CampusMap
// registers the reading; Toasts.tsx asks it, so a building finished where
// the player can see it is not announced twice. With no map mounted,
// nothing is on screen.

type Probe = (buildableId: string) => boolean;
let probe: Probe | null = null;

export function setMapProbe(next: Probe | null): void {
  probe = next;
}

export function onMapScreen(buildableId: string): boolean {
  return probe?.(buildableId) ?? false;
}
