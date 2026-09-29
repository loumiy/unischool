// The map's art as the canvas painter calls it (Plan 83C): every component
// in the scene that reads a hook, registered with a plain function of its
// props and the painter's scope (canvasPaint.ts). The SVG map renders the
// same components through React, reading React's contexts; the canvas reads
// the same values from the providers in the tree, by name. The components
// under a registered one are walked as they are, so nothing here changes
// what is drawn, only who supplies the values.

import type { SchoolColors, GameState } from '../state/types';
import { registerArt, registerProvider, type ArtScope } from './canvasPaint';
import { BannerContext, CollegeNameContext, ColorsContext, CrowdContext, DevelopingContext, VenueContext } from './mapOccasions';
import { SnowContext } from './seasons';
import BuildingMotif, { BuildingMass, BuildingMotifArt, RoofFlag, buildingMassArt, roofFlagArt, sameMotif, type BuildingMassProps } from './buildingMotifs';
import Landmark, { landmarkArt, type LandmarkProps } from './landmarks';
import { Lamp, lampArt } from './dressing';
import { RakedStand, rakedStandArt, type RakedStandProps } from './groundMarkings';
import PathwayLayer, { buildPathGeometry, pathwayArt } from './pathways';
import { RingBack, RingBackArt, RingFront, RingFrontArt, RingGround, RingGroundArt, RingSprites, RingSpritesArt } from './Surroundings';
import Tree, { TreeArt, TreeBody, TreeBodyArt } from './trees';
import type { Camera, Pt } from './isoProjection';
import type { Pathways } from '../state/types';

// The occasions, by the names the providers set them under.
export interface Occasions {
  colors: SchoolColors;
  snow: number;
  banner: SchoolColors | null;
  collegeName: string;
  developing: GameState['developing'];
  crowds: ReadonlySet<string>;
  venue: string | null;
}
// The values a scene without its providers reads (a test's); the map always
// wraps its scene in every provider.
const FALLBACK: Partial<Occasions> = {};
function occasion<K extends keyof Occasions>(scope: ArtScope, name: K): Occasions[K] {
  if (name in scope.values) return scope.values[name] as Occasions[K];
  if (!(name in FALLBACK)) throw new Error(`canvasArt: no ${name} in the scene (wrap it in its provider)`);
  return FALLBACK[name] as Occasions[K];
}

let registered = false;
// Registers the art, once.
export function registerMapArt(defaults: Partial<Occasions> = {}): void {
  Object.assign(FALLBACK, defaults);
  if (registered) return;
  registered = true;

  registerProvider(ColorsContext, 'colors');
  registerProvider(SnowContext, 'snow');
  registerProvider(BannerContext, 'banner');
  registerProvider(CollegeNameContext, 'collegeName');
  registerProvider(DevelopingContext, 'developing');
  registerProvider(CrowdContext, 'crowds');
  registerProvider(VenueContext, 'venue');

  // The readers of occasions.
  registerArt(RoofFlag, (p: { at: Pt }, s) => roofFlagArt(p, occasion(s, 'colors')));
  registerArt(BuildingMass, (p: BuildingMassProps, s) => buildingMassArt(p, occasion(s, 'snow')));
  registerArt(Landmark, (p: LandmarkProps, s) => landmarkArt(p, occasion(s, 'developing'), occasion(s, 'collegeName')));
  registerArt(Lamp, (p: { at: Pt }, s) => lampArt(p, occasion(s, 'banner')));
  registerArt(RakedStand, (p: RakedStandProps, s) => {
    const venue = occasion(s, 'venue');
    return rakedStandArt(p, occasion(s, 'crowds').has(venue ?? ''));
  });

  // A memo, kept from paint to paint.
  registerArt(PathwayLayer, (p: { pathways: Pathways; camera: Camera }, s) => (
    pathwayArt(s.keep('paths', [p.pathways, p.camera], () => buildPathGeometry(p.pathways)))
  ));

  // The memoised components: their own functions, kept while their props
  // are.
  registerArt(BuildingMotif, BuildingMotifArt, sameMotif);
  registerArt(Tree, TreeArt, true);
  registerArt(TreeBody, TreeBodyArt, true);
  registerArt(RingBack, RingBackArt, true);
  registerArt(RingFront, RingFrontArt, true);
  registerArt(RingGround, RingGroundArt, true);
  registerArt(RingSprites, RingSpritesArt, true);
}
