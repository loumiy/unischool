import type { SatisfactionAttributes } from '../../state/types';

// What a next-step line or a letter's ask asks for, as data (Plan 58). The
// UI reads only the words; the guided player (sim/harness/guided.ts) acts on
// this, so what the player is told and what the harness does are one
// reading, and a line that asks for something impossible shows up there.
export type StepIntent =
  // Found a program on offer in this hall (the named one, if given).
  | { kind: 'found'; hallId: string; programId?: string }
  | { kind: 'move'; programId: string; hallId: string; slot: number }
  // Site any of these.
  | { kind: 'site'; buildableIds: string[] }
  | { kind: 'develop'; courseId: string }
  | { kind: 'build-for'; attribute: keyof SatisfactionAttributes }
  | { kind: 'research'; labId: string }
  // Staff a dark program's courses from the payroll and the market (Plan 60).
  | { kind: 'restaff'; school: string | null }
  // Set the standing sweep into the endowment, as the board asked (Plan 70D).
  | { kind: 'sweep'; weeks: number }
  // Nothing to do but let the weeks pass.
  | { kind: 'wait' };
