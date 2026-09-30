import type { GameState, Pillar } from '../state/types';
import ConfirmButton from './ConfirmButton';
import { playerRank } from '../systems/rivals/rivalsSystem';
import { PILLAR_LABELS, SPECIALIZATION_MILESTONE_RANK } from '../systems/prestige/prestigeSystem';
import { specializationOptions } from '../systems/prestige/milestone';
import { CHOICE_WORDS, SPECIALIZATION_CARDS, opensLine } from '../data/specializationData';

// ---------------------------------------------------------------------
// The choice (Plan 85D, systems/prestige/milestone.ts): at the close of a
// summer at the milestone, the four specializations side by side. Each card
// says what it lifts now, what its mechanics are and which of them are
// still to come, where the college stands in its pillar and who is already
// specialized in it. Choosing asks twice (ConfirmButton, Plan 47): the
// choice is for good. "Not this year" leaves the offer standing. The words
// are in data/specializationData.ts.
// ---------------------------------------------------------------------

export default function SpecializationChoice({ s, onResolve }: { s: GameState; onResolve: (pillar: Pillar | null) => void }) {
  const W = CHOICE_WORDS;
  return (
    <>
      <h2>{W.title}</h2>
      <p>{W.intro(playerRank(s), SPECIALIZATION_MILESTONE_RANK)}</p>
      <div className="spec-cards">
        {specializationOptions(s).map((o) => {
          const card = SPECIALIZATION_CARDS[o.pillar];
          const ready = card.mechanics.filter((m) => m.ready);
          const coming = card.mechanics.filter((m) => !m.ready);
          return (
            <section key={o.pillar} className="spec-card" aria-label={card.name}>
              <header className="spec-card-head">
                <span className="spec-card-pillar">{PILLAR_LABELS[o.pillar]}</span>
                <h3>{card.name}</h3>
                <p className="spec-card-summary">{card.summary}</p>
              </header>
              <div className="spec-card-block">
                <h4>{W.now}</h4>
                <ul>
                  <li><strong>{opensLine(o.pillar, o.weight)}</strong></li>
                  {card.alsoNow && <li>{card.alsoNow}</li>}
                  {ready.map((m) => <li key={m.text}>{m.text}</li>)}
                </ul>
              </div>
              {coming.length > 0 && (
                <div className="spec-card-block spec-card-coming">
                  <h4>{W.coming}</h4>
                  <ul>{coming.map((m) => <li key={m.text}>{m.text}</li>)}</ul>
                  <p className="spec-card-note">{W.comingNote}</p>
                </div>
              )}
              <div className="spec-card-standing">
                <p className="spec-card-yours">{W.yours(o.value, o.rank)}</p>
                <p>
                  {W.rivals(o.rivals)}
                  {o.strongest && W.strongest(o.strongest.name, o.strongest.value)}
                </p>
              </div>
              <ConfirmButton
                className="btn-primary spec-card-choose"
                label={W.choose(card.name)}
                armedLabel={W.confirm}
                warning={W.warning(o.pillar)}
                onConfirm={() => onResolve(o.pillar)}
              />
            </section>
          );
        })}
      </div>
      <div className="spec-later">
        <button type="button" className="btn-quiet" onClick={() => onResolve(null)}>{W.later}</button>
        <span>{W.laterNote}</span>
      </div>
    </>
  );
}
