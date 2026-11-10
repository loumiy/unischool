import type { ReactNode } from 'react';
import { effectText, type Effect, type EffectKind } from '../data/effectTypes';
import {
  AlumniIcon, AthleticsIcon, BuildIcon, ClockIcon, CurriculumIcon, DebtIcon, DiningIcon, EndowmentIcon, FacultyIcon,
  HealthIcon, HousingIcon, LibraryIcon, MoneyIcon, PrestigeIcon, QuadIcon, QualityIcon, ResearchIcon, SatisfactionIcon,
  StudentLifeIcon, StudentsIcon, TownIcon, TreeIcon,
} from './icons';

// What something does, drawn (Plan 125 A, docs/design/voice.md): an icon for
// the kind, the figure, a word or two, green for a gain and red for a loss,
// and a small clock on what wears off. The sign is always in the figure, so
// the colour-safe palette and a screen reader lose nothing; the whole phrase
// is the chip's title.

const ICONS: Partial<Record<EffectKind, () => ReactNode>> = {
  money: MoneyIcon, weekly: MoneyIcon, endowment: EndowmentIcon, debt: DebtIcon, repairs: BuildIcon,
  satisfaction: SatisfactionIcon, alumni: AlumniIcon, quality: QualityIcon, students: StudentsIcon, goodwill: TownIcon,
  social: StudentLifeIcon, beds: HousingIcon, dining: DiningIcon, health: HealthIcon, study: LibraryIcon, beauty: QuadIcon,
  prestige: PrestigeIcon, teaching: CurriculumIcon, research: ResearchIcon, athletics: AthleticsIcon, faculty: FacultyIcon,
  trees: TreeIcon, time: ClockIcon,
};

export function EffectChip({ effect }: { effect: Effect }) {
  const Icon = ICONS[effect.kind];
  return (
    <span className={`effect-chip ${effect.tone}`} title={effectText(effect)}>
      {Icon && <span className="effect-chip-icon" aria-hidden="true"><Icon /></span>}
      {effect.figure && <span className="effect-chip-figure">{effect.figure}</span>}
      {effect.words && <span className="effect-chip-words">{effect.words}</span>}
      {effect.fades && (
        <span className="effect-chip-fades" role="img" aria-label="for a while"><ClockIcon /></span>
      )}
    </span>
  );
}

// A row of them. `none` is what the row says when nothing changes.
export default function EffectChips({ effects, none, className }: { effects: readonly Effect[]; none?: string; className?: string }) {
  if (effects.length === 0 && !none) return null;
  return (
    <span className={`effect-chips${className ? ` ${className}` : ''}`}>
      {effects.length === 0
        ? <span className="effect-chip plain"><span className="effect-chip-words">{none}</span></span>
        : effects.map((e, i) => <EffectChip key={i} effect={e} />)}
    </span>
  );
}
