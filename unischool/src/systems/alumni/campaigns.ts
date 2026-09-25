import type { AlumniClass, GameState } from '../../state/types';
import { WEEKS_PER_YEAR } from '../../state/types';
import {
  CAMPAIGNS, CAMPAIGN_ASK_COOLING, CAMPAIGN_PULL, CAMPAIGN_RESONANCE_PULL, CAMPAIGN_TARGET_STRETCH, campaignById,
  type CampaignDef,
} from '../../data/campaignData';
import { givingOf } from './giving';
import { heldSeat } from '../delegation/seats';
import { inTitleYear } from '../../data/studentLifeData';

// ADVANCEMENT (Plan 30, from v2's campaigns.ts). A campaign is the ledger's
// payoff: a multi-year ask whose weekly take is each class's answer, by
// the warmth its four years earned and whether the case is about them. It
// needs a VP of Advancement (Plan 28) to run it, one at a time, and asking
// cools the ledger a little: a campaign spends warmth, it does not earn it.
// It replaces this game's endowment campaign.

export function advancementOf(s: GameState) {
  return s.advancement ?? { running: null, closed: [], restrictedBuilding: 0 };
}

export function resonanceOf(a: AlumniClass, def: CampaignDef): number {
  const hits = def.resonates.filter((id) => a.memory.includes(id)).length;
  return 1 + hits * CAMPAIGN_RESONANCE_PULL;
}

// A class's answer to this year's ask: what it gives the annual fund, times
// the campaign's pull and its resonance.
export function classResponse(a: AlumniClass, def: CampaignDef, year: number): number {
  return Math.round(givingOf(a, year) * CAMPAIGN_PULL * resonanceOf(a, def));
}

// A title year lifts what everyone gives: championships sell campaigns (the
// endowment campaign's lift, Plan 21, carried over).
export const CAMPAIGN_TITLE_LIFT = 0.25;

export function yearlyResponse(s: GameState, def: CampaignDef): number {
  const base = (s.alumni ?? []).reduce((t, a) => t + classResponse(a, def, s.clock.year), 0);
  return inTitleYear(s) ? Math.round(base * (1 + CAMPAIGN_TITLE_LIFT)) : base;
}

export function hasAdvancementOffice(s: GameState): boolean {
  return heldSeat(s, 'advancement', null) !== undefined;
}

// The campaigns open now: their condition holds, none is running, and a VP
// of Advancement is in the seat. One already closed is not offered again.
export function openCampaigns(s: GameState): CampaignDef[] {
  const adv = advancementOf(s);
  if (!hasAdvancementOffice(s) || adv.running) return [];
  const done = new Set(adv.closed.map((c) => c.campaignId));
  return CAMPAIGNS.filter((c) => !done.has(c.id) && c.when(s) && yearlyResponse(s, c) > 0);
}

export function launchCampaign(s: GameState, id: string): boolean {
  const def = openCampaigns(s).find((c) => c.id === id);
  if (!def) return false;
  const target = Math.round((yearlyResponse(s, def) * def.years * CAMPAIGN_TARGET_STRETCH) / 100_000) * 100_000;
  s.advancement = { ...advancementOf(s), running: { campaignId: id, startedYear: s.clock.year, dueYear: s.clock.year + def.years, raised: 0, target } };
  s.log.unshift({ year: s.clock.year, week: s.clock.week, kind: 'info', topic: 'money', message: `${def.title} is launched: $${(target / 1e6).toFixed(1)}M over ${def.years} years.` });
  return true;
}

// Weekly: the classes answer, the money goes where it was raised for, the
// ledger cools, and a campaign whose term is up closes.
export function tickCampaigns(s: GameState): void {
  const adv = s.advancement;
  const running = adv?.running;
  if (!adv || !running) return;
  const def = campaignById(running.campaignId);
  if (!def) { adv.running = null; return; }
  const week = yearlyResponse(s, def) / WEEKS_PER_YEAR;
  running.raised += week;
  if (def.kind === 'endowment') s.finance.endowment += week;
  else adv.restrictedBuilding += week;
  for (const a of s.alumni ?? []) a.warmth = Math.max(0, a.warmth - CAMPAIGN_ASK_COOLING);
  if (s.clock.year >= running.dueYear) {
    const met = running.raised >= running.target;
    adv.closed.push({ campaignId: def.id, year: s.clock.year, raised: Math.round(running.raised), met });
    adv.running = null;
    s.log.unshift({ year: s.clock.year, week: s.clock.week, kind: met ? 'good' : 'bad', topic: 'money', message: met ? def.kept : def.missed });
  }
}
