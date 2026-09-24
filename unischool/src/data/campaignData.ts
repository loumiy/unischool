import type { GameState } from '../state/types';
import { totalEnrolled } from '../state/types';
import { computeSatisfactionBreakdown } from '../systems/satisfaction/satisfactionSystem';

// Advancement campaigns (Plan 30, ported from v2's campaigns.json). Each is a
// multi-year ask of the alumni for one purpose, open once its condition
// holds. What it raises is restricted to its kind: endowment money goes into
// the endowment, building money into a fund that pays for buildings
// (systems/alumni/campaigns.ts). v2's aid campaign is left out: this game has
// no aid budget to restrict it to. v2's "three to a room" becomes a housing
// score under 70, this game's reading of the same complaint.

export type CampaignKind = 'building' | 'endowment';

export interface CampaignDef {
  id: string;
  kind: CampaignKind;
  title: string;
  years: number;
  when: (s: GameState) => boolean;
  whenText: string;
  // Memory clauses (data/alumniData.ts) whose classes give most to it.
  resonates: readonly string[];
  text: string;
  kept: string;
  missed: string;
}

function alumniCount(s: GameState): number {
  return (s.alumni ?? []).reduce((t, a) => t + a.size, 0);
}
function housingScore(s: GameState): number {
  return totalEnrolled(s.students) > 0 ? computeSatisfactionBreakdown(s).housing : 100;
}
function buildingsDone(s: GameState): number {
  return s.tech.filter((t) => t.kind !== 'course' && t.status === 'done').length;
}
function totalBacklog(s: GameState): number {
  return s.tech.reduce((t, b) => t + (b.backlog ?? 0), 0);
}

export const CAMPAIGNS: readonly CampaignDef[] = [
  {
    id: 'new-residence', kind: 'building', title: 'The Housing Campaign', years: 6,
    when: (s) => alumniCount(s) >= 300 && housingScore(s) < 70,
    whenText: 'three hundred alumni, and housing under 70',
    resonates: ['thinned'],
    text: 'The case for support writes itself, which the Development Office says is rare. Everyone being asked lived three to a room, and the letter says so in the first line.',
    kept: 'The Housing Campaign closed at its number. The beds it paid for are beds nobody had to share.',
    missed: 'The Housing Campaign closed short. What was raised is restricted and waiting; what was asked for was not all given.',
  },
  {
    id: 'teaching-chairs', kind: 'endowment', title: 'The Campaign for the Faculty', years: 8,
    when: (s) => alumniCount(s) >= 400 && s.faculty.length >= 3,
    whenText: 'four hundred alumni and a faculty',
    resonates: ['well-taught', 'under-taught'],
    text: 'A campaign for endowed chairs: money that pays a salary forever rather than a salary this year. The letters go to the classes who remember being taught, and to the ones who remember not being.',
    kept: 'The Campaign for the Faculty closed at its number, and the fund is larger by the whole of it.',
    missed: 'The Campaign for the Faculty closed short of the chairs it was named for.',
  },
  {
    id: 'library-wing', kind: 'building', title: 'The Library Campaign', years: 6,
    when: (s) => alumniCount(s) >= 350 && buildingsDone(s) >= 3,
    whenText: 'three hundred and fifty alumni and three buildings',
    resonates: ['building-years', 'well-taught', 'handsome'],
    text: 'A wing for the library, named for whoever gives most of it. The Development Office has drawn the building already, which it admits is putting the cart before the horse and says works every time.',
    kept: 'The Library Campaign closed at its number, and the wing has a name on it.',
    missed: 'The Library Campaign closed short. The drawing is still on the wall in the Development Office.',
  },
  {
    id: 'endowment-drive', kind: 'endowment', title: 'The Endowment Campaign', years: 8,
    when: (s) => alumniCount(s) >= 500 && s.finance.endowment < 90_000_000,
    whenText: 'five hundred alumni and an endowment under $90M',
    resonates: ['deficits', 'freeze', 'austerity', 'receivership'],
    text: 'The unglamorous campaign: no building, no plaque, nothing to photograph. The case is that the college has had four bad years in living memory and would like to stop having them.',
    kept: 'The Endowment Campaign closed at its number. Nothing is named for it and the college is steadier for it.',
    missed: 'The Endowment Campaign closed short of the number that would have steadied the fund.',
  },
  {
    id: 'quad-restoration', kind: 'building', title: 'The Restoration Campaign', years: 5,
    when: (s) => alumniCount(s) >= 300 && totalBacklog(s) >= 1_500_000,
    whenText: 'three hundred alumni and a $1.5M maintenance backlog',
    resonates: ['handsome', 'building-years'],
    text: 'A campaign to put the old buildings right, addressed to people whose photographs of the place have scaffolding in them. The Development Office has enclosed one of the photographs.',
    kept: 'The Restoration Campaign closed at its number, and the scaffolding is coming down.',
    missed: 'The Restoration Campaign closed short. The scaffolding stays where it is.',
  },
];

export function campaignById(id: string): CampaignDef | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

// How hard a campaign asks, against the annual fund: a class answers a
// campaign at this multiple of what it gives in an ordinary year.
export const CAMPAIGN_PULL = 3.2;
// A class whose memory is in the case for support gives this much more per
// clause that resonates.
export const CAMPAIGN_RESONANCE_PULL = 0.9;
// Asking cools the ledger: every class's warmth, a week.
export const CAMPAIGN_ASK_COOLING = 0.004;
// A campaign's target, of what the ledger is expected to give over its
// term when it launches: a number it can miss.
export const CAMPAIGN_TARGET_STRETCH = 0.9;
