// The map's art as the canvas painter calls it (Plan 83C): every component
// in the scene that reads a hook, registered with a plain function of its
// props and the painter's scope (canvasPaint.ts). The SVG map renders the
// same components through React, reading React's contexts; the canvas reads
// the same values from the providers in the tree, by name. The components
// under a registered one are walked as they are, so nothing here changes
// what is drawn, only who supplies the values.

import type { SchoolColors, GameState } from '../state/types';
import { registerArt, registerProvider, type ArtScope } from './canvasPaint';
import { BannerContext, CollegeNameContext, ColorsContext, CrowdContext, DevelopingContext, GatePartContext, PennantContext, VenueContext } from './mapOccasions';
import { StadiumFacade, stadiumFacadeArt, type StadiumFacadeProps } from './stadiumFacade';
import { Spectators, VenuePennants, spectatorsArt, venuePennantsArt, type PennantsProps, type SpectatorsProps } from './spectators';
import { SnowContext } from './seasons';
import BuildingMotif, { BuildingMass, BuildingMotifArt, Door, DoorSiteContext, EntranceSteps, InCollegeColors, InSnow, RoofFlag, buildingMassArt, doorArt, entranceStepsArt, roofFlagArt, sameMotif, type BuildingMassProps, type DoorProps, type EntranceStepsProps } from './buildingMotifs';
import type { Plot } from './facing';
import Landmark, { landmarkArt, type LandmarkProps } from './landmarks';
import { Lamp, lampArt } from './dressing';
import { Gazebo, RakedStand, gazeboArt, rakedStandArt, type GazeboProps, type RakedStandProps } from './groundMarkings';
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
  crowds: ReadonlyMap<string, number>;
  pennants: ReadonlySet<string>;
  venue: string | null;
  // The building being drawn, for its doors (Plan 122's follow-up).
  doorSite: Plot | null;
  // The half of the Triumphal Gate an entry draws, or null for all of it.
  gatePart: 'passage' | 'shell' | null;
}
// The values a scene without its providers reads (a test's); the map always
// wraps its scene in every provider.
const FALLBACK: Partial<Occasions> = { doorSite: null, pennants: new Set(), gatePart: null };
export function occasion<K extends keyof Occasions>(scope: ArtScope, name: K): Occasions[K] {
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
  registerProvider(PennantContext, 'pennants');
  registerProvider(VenueContext, 'venue');
  registerProvider(DoorSiteContext, 'doorSite');
  registerProvider(GatePartContext, 'gatePart');

  // The readers of occasions.
  registerArt(RoofFlag, (p: { at: Pt }, s) => roofFlagArt(p, occasion(s, 'colors')));
  registerArt(InCollegeColors, (p: { draw: (c: SchoolColors) => React.ReactNode }, s) => p.draw(occasion(s, 'colors')));
  registerArt(InSnow, (p: { draw: (snow: number) => React.ReactNode }, s) => p.draw(occasion(s, 'snow')));
  registerArt(BuildingMass, (p: BuildingMassProps, s) => buildingMassArt(p, occasion(s, 'snow')));
  registerArt(Door, (p: DoorProps, s) => doorArt(p, occasion(s, 'doorSite')));
  registerArt(EntranceSteps, (p: EntranceStepsProps, s) => entranceStepsArt(p, occasion(s, 'doorSite')));
  registerArt(Landmark, (p: LandmarkProps, s) => landmarkArt(p, occasion(s, 'developing'), occasion(s, 'collegeName'), occasion(s, 'snow'), occasion(s, 'gatePart')));
  registerArt(Gazebo, (p: GazeboProps, s) => gazeboArt(p, occasion(s, 'snow')));
  registerArt(Lamp, (p: { at: Pt }, s) => lampArt(p, occasion(s, 'banner')));
  registerArt(RakedStand, (p: RakedStandProps) => rakedStandArt(p));
  registerArt(Spectators, (p: SpectatorsProps, s) => spectatorsArt(p, occasion(s, 'crowds').get(occasion(s, 'venue') ?? '') ?? 0));
  registerArt(StadiumFacade, (p: StadiumFacadeProps, s) => stadiumFacadeArt(p, occasion(s, 'colors'), occasion(s, 'collegeName')));
  registerArt(VenuePennants, (p: PennantsProps, s) => venuePennantsArt(p, occasion(s, 'pennants').has(occasion(s, 'venue') ?? ''), occasion(s, 'colors')));

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
