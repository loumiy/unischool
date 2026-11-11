import type { GameState, PendingCatalogueEvent } from '../state/types';
import type { CatalogueEvent } from '../data/eventCatalogueTypes';
import { fill } from '../systems/events/catalogue';
import { choiceCost } from '../systems/events/catalogueEngine';
import { choiceEffects } from '../systems/events/choiceEffects';
import EffectChips from './EffectChip';

// An event's text and its answers (Plan 32), shared by the inbox's reading
// pane (InboxTab.tsx, Plan 77) and the board's letters, which are modal
// (InterruptModal.tsx's CatalogueLetterView). Each answer says what it
// does, in the sums the college will actually pay, as chips
// (systems/events/choiceEffects.ts, Plan 125 A).

// v2's texts break into paragraphs on a blank line.
export function CatalogueText({ text, className }: { text: string; className: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((para, i) => <p key={i} className={className}>{para}</p>)}
    </>
  );
}

export function CatalogueChoices({ s, p, e, onChoose }: {
  s: GameState;
  p: PendingCatalogueEvent;
  e: CatalogueEvent;
  onChoose: (choiceId: string) => void;
}) {
  // Only an inline event is ever left unanswered: a letter waits.
  const marksDefault = e.kind === 'inline';
  return (
    <div className="event-choices">
      {e.choices.map((c) => {
        const cost = choiceCost(e, c.id, p.scale);
        const affordable = c.id === e.default || cost <= Math.max(0, s.finance.cash);
        return (
          <button key={c.id} type="button" className="event-choice" disabled={!affordable} onClick={() => onChoose(c.id)}>
            <span className="event-choice-label">
              {fill(c.label, p.vars)}
              {marksDefault && c.id === e.default && <span className="event-choice-cost">if nobody answers</span>}
            </span>
            <span className="event-choice-detail">
              <EffectChips effects={choiceEffects(s, c, p)} none="No change" />
              {!affordable && <span className="event-choice-short">You can&apos;t afford this.</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
