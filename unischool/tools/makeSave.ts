// ---------------------------------------------------------------------
// A CAMPUS TO LOOK AT. Plays sim/balanceSim.ts forward for a few decades
// and writes the resulting GameState out as a save payload, so the browser
// can load a mature campus instead of the one building a fresh game opens
// with.
//
// This exists because the vernaculars (see components/buildingSpec.ts) are
// ART, and art has to be looked at. Plan 07's PR G found four defects this
// way that every test in the suite passed straight through — a stylesheet
// rule silently overriding the vernacular's own colours, a roof too dark to
// show its own facets, a parapet gutter drawn on a building with no parapet,
// and a ridge that sounded deep in metres and came out flat on screen.
//
// Not part of the game: nothing in src/ imports it.
//
//   npm run shot:save -- /tmp/save.json 22 gothic
// ---------------------------------------------------------------------
import { writeFileSync } from 'node:fs';
import { play, STRATEGIES } from '../sim/balanceSim';
import { SAVE_VERSION } from '../src/state/persistence';
import type { GameState, Vernacular } from '../src/state/types';

const [outPath, yearsArg, vernArg] = process.argv.slice(2);
if (!outPath) throw new Error('usage: makeSave <out.json> [years] [vernacular]');
const years = Number(yearsArg ?? 22);

// Completionist, because it is the only strategy that builds essentially the
// whole catalogue — which is the point here: a screenshot wants every motif
// on the map, not a representative economy.
const strategy = STRATEGIES.find((s) => s.name === 'Completionist (build everything)');
if (!strategy) throw new Error('fixture: the Completionist strategy exists');

let last: GameState | null = null;
play(strategy, years, (s) => { last = s; });
if (!last) throw new Error('the sim produced no state');
const state = last as GameState;

state.self.name = 'Blackmoor';
if (vernArg) state.self.vernacular = vernArg as Vernacular;

// A loaded save opens whatever modal it was holding, and a modal backdrop
// swallows the clicks the screenshot driver needs for zoom and pan. None of
// this is state the picture is about, so it is cleared rather than dismissed.
state.pendingInterrupt = null;
state.events.pendingDemand = null;
state.events.activeDemand = null;

writeFileSync(outPath, JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), state }));
const placed = Object.keys(state.placements ?? {}).length;
console.log(
  `${outPath}: year ${state.clock.year}, ${placed} placed buildings, `
  + `vernacular ${state.self.vernacular}, prestige ${state.self.reputation.toFixed(0)}`,
);
