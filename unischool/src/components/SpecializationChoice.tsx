import { useState } from 'react';
import type { GameState, Pillar } from '../state/types';
import ConfirmButton from './ConfirmButton';
import { DisclosureIcon } from './icons';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { PILLAR_LABELS, SPECIALIZATION_MILESTONE_RANK } from '../systems/prestige/prestigeSystem';
import { shareFullProjection, specializationOptions, strongestStanding, type SpecializationOption } from '../systems/prestige/milestone';
import { pillarShareRule, specializationShareWorth } from '../data/prestigeWords';
import { CHOICE_WORDS, SPECIALIZATION_CARDS, choiceParkNote, opensLine } from '../data/specializationData';

// ---------------------------------------------------------------------
// The choice (Plan 85D, systems/prestige/milestone.ts): at the close of a
// summer at the milestone, the four specializations side by side. Plan 95F
// (the second review's B2-3 and B3-6) cut each card to three lines (what
// it is, what it adds now, how its share fills) under its share in points
// of prestige, and one line to compare: the college's prestige and rank
// were that share full today. The rest (the share in the pillar's own
// points and the long fill rule, the mechanics, a standing Research Park's
// note (Plan 85F), the college's place in the pillar and its rivals) is
// behind More, as on the faculty card. One line above the cards names the
// college's strongest pillar and where the rivals have gone. Choosing asks
// twice (ConfirmButton, Plan 47): the choice is for good. "Not this year"
// leaves the offer standing. The words are in data/specializationData.ts.
// ---------------------------------------------------------------------

export default function SpecializationChoice({ s, onResolve }: { s: GameState; onResolve: (pillar: Pillar | null) => void }) {
  const W = CHOICE_WORDS;
  const strongest = strongestStanding(s);
  return (
    <>
      <h2>{W.title}</h2>
      <p>{W.intro(playerRank(s), SPECIALIZATION_MILESTONE_RANK, pillarShareRule())}</p>
      <p className="spec-strongest">{W.strongest(strongest.pillar, strongest.rank, strongest.rivals)}</p>
      <div className="spec-cards">
        {specializationOptions(s).map((o) => (
          <SpecializationCardView key={o.pillar} s={s} o={o} onChoose={() => onResolve(o.pillar)} />
        ))}
      </div>
      <div className="spec-later">
        <button type="button" className="btn-quiet" onClick={() => onResolve(null)}>{W.later}</button>
        <span>{W.laterNote}</span>
      </div>
    </>
  );
}

function SpecializationCardView({ s, o, onChoose }: { s: GameState; o: SpecializationOption; onChoose: () => void }) {
  const W = CHOICE_WORDS;
  const [open, setOpen] = useState(false);
  const card = SPECIALIZATION_CARDS[o.pillar];
  const full = shareFullProjection(s, o.pillar);
  // A park that already stands (Plan 85F): what this choice makes of it.
  const park = choiceParkNote(s, o.pillar);
  return (
    <section className="spec-card" aria-label={card.name}>
      <header className="spec-card-head">
        <span className="spec-card-pillar">{PILLAR_LABELS[o.pillar]}</span>
        <h3>{card.name}</h3>
        <p className="spec-card-worth">{W.worth(specializationShareWorth(o.pillar))}</p>
      </header>
      <ul className="spec-card-lines">
        <li>{card.what}</li>
        <li>{card.adds}</li>
        <li>{card.fillsShort}</li>
      </ul>
      <button
        type="button"
        className="faculty-expand-btn spec-card-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={W.moreLabel(card.name, open)}
      >
        <DisclosureIcon open={open} /> {open ? W.less : W.more}
      </button>
      {open && (
        <div className="spec-card-more">
          <ul>
            <li>{opensLine(o.pillar, o.weight)}</li>
            {card.alsoNow && <li>{card.alsoNow}</li>}
            {card.mechanics.map((m) => <li key={m.text}>{m.text}</li>)}
            {park && <li className="spec-card-park">{park}</li>}
          </ul>
          <p className="spec-card-yours">{W.yours(o.value, o.rank)}</p>
          <p>
            {W.rivals(o.rivals)}
            {o.strongest && W.strongestRival(o.strongest.name, o.strongest.value)}
          </p>
        </div>
      )}
      <div className="spec-card-foot">
        <p className="spec-card-compare">{W.compare(full.before, full.after, full.rankBefore, full.rankAfter)}</p>
        <ConfirmButton
          className="btn-primary spec-card-choose"
          label={W.choose(card.name)}
          armedLabel={W.confirm}
          warning={W.warning(o.pillar)}
          onConfirm={onChoose}
        />
      </div>
    </section>
  );
}
