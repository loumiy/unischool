// The dock's stat chips (StatusHeader.tsx): each one's word, shown over its
// figure on a wide screen, and where a click on it leads (Plan 78C). A chip
// with a door is a button, and its door is a section of a tab
// (ladderData.ts's TabSection) that no milestone holds back, so the click
// lands from the first week. The funds figure is the dock's other door, to
// the Treasury, and stays where it is. The committee chip (Plan 80E) counts
// the courses the curriculum committee is writing of the most it can.

import { TAB_LABELS, type TabId } from '../components/TabNav';
import { tabOfSection, type TabSection } from './ladderData';

export type StatChip = 'rank' | 'enrolled' | 'prestige' | 'satisfaction' | 'committee';

// In the dock's order: the four figures in the left zone, then the
// committee on the gears' row (StatusHeader.tsx's CommitteeChip).
export const STAT_CHIPS: readonly StatChip[] = ['rank', 'enrolled', 'prestige', 'satisfaction', 'committee'];

export const STAT_CHIP_WORDS: Record<StatChip, string> = {
  rank: 'Rank',
  enrolled: 'Enrolled',
  prestige: 'Prestige',
  satisfaction: 'Satisfaction',
  committee: 'Committee',
};

// The heading of each section a chip opens: the panel's own title, and the
// second half of the chip's accessible name.
export const SECTION_HEADINGS = {
  'history.prestige': 'Prestige',
  'history.rankings': 'The guide',
  'students.breakdown': 'Satisfaction breakdown',
  'curriculum.committee': 'Committee',
} as const satisfies Partial<Record<TabSection, string>>;
type ChipSection = keyof typeof SECTION_HEADINGS;

// Prestige opens its own breakdown and nothing else; rank opens the guide's
// table it is a place in (Plan 80C); satisfaction opens the five needs it is
// made of; the committee opens its own panel at the head of the Curriculum.
// Enrolled has no door yet.
const STAT_CHIP_SECTIONS: Partial<Record<StatChip, ChipSection>> = {
  rank: 'history.rankings',
  prestige: 'history.prestige',
  satisfaction: 'students.breakdown',
  committee: 'curriculum.committee',
};

export interface ChipDoor {
  tab: TabId;
  section: TabSection;
  // The button's accessible name: "Prestige 51.5 — open History, Prestige".
  name: string;
}

// Where a chip leads, named with the figure it shows; null for a chip that
// is only a figure.
export function chipDoor(chip: StatChip, figure: string): ChipDoor | null {
  const section = STAT_CHIP_SECTIONS[chip];
  if (!section) return null;
  const tab = tabOfSection(section);
  return { tab, section, name: `${STAT_CHIP_WORDS[chip]} ${figure} — open ${TAB_LABELS[tab]}, ${SECTION_HEADINGS[section]}` };
}
