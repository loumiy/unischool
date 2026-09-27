import type { GameState, PendingCatalogueEvent } from '../state/types';
import { totalEnrolled } from '../state/types';
import type { CatalogueChoice, CatalogueEvent, EffectKey } from '../data/eventCatalogueTypes';
import { fill, scaledEffects } from '../systems/events/catalogue';
import { choiceCost } from '../systems/events/catalogueEngine';
import { money, signed, signedMoney } from '../format';
import { debtOutstanding } from '../systems/finance/treasury';
import { promiseById } from '../data/promiseData';
import { promiseTitle } from '../systems/promises/promises';

// An event's text and its answers (Plan 32), shared by the inbox's reading
// pane (InboxTab.tsx, Plan 77) and the board's letters, which are modal
// (InterruptModal.tsx's CatalogueLetterView). Each answer says what it
// does, in the sums the college will actually pay.

// What an answer does, a phrase per lever.
function effectPhrases(s: GameState, effects: CatalogueChoice['effects'], vars: Readonly<Record<string, string>>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(effects) as [EffectKey, number][]) {
    if (!v) continue;
    switch (k) {
      case 'cash': out.push(v < 0 ? `costs ${money(-v)}` : `brings ${money(v)}`); break;
      case 'endowment': {
        // A draw stops at what the fund holds (catalogue.ts floors it at 0).
        const moved = v < 0 ? Math.min(-v, Math.max(0, s.finance.endowment)) : v;
        if (moved > 0) out.push(`endowment ${signedMoney(v < 0 ? -moved : moved)}`);
        break;
      }
      case 'debt': {
        // Repays what is owed; the rest comes back as cash (catalogue.ts).
        const owed = debtOutstanding(s);
        out.push(v > 0 ? `borrows ${money(v)}` : owed >= -v ? `repays ${money(-v)} of debt` : owed > 0 ? `repays the ${money(owed)} owed, the rest to cash` : `brings ${money(-v)}`);
        break;
      }
      case 'backlog': {
        // Repairs done stop at the backlog there is (catalogue.ts's spreadBacklog).
        const owed = s.tech.reduce((t, b) => t + (b.backlog ?? 0), 0);
        if (v > 0) out.push(`${money(v)} of repairs deferred`);
        else if (owed > 0) out.push(`${money(Math.min(-v, owed))} of repairs done`);
        break;
      }
      case 'mood': out.push(`satisfaction ${signed(v)}`); break;
      case 'confidence': out.push(`board confidence ${signed(v)}`); break;
      case 'warmth': out.push(`alumni warmth ${signed(v)}`); break;
      case 'quality': out.push(`incoming quality ${signed(v)}`); break;
      case 'enrollment': {
        const n = Math.round((v / 2000) * totalEnrolled(s.students));
        if (n !== 0) out.push(`${signed(n)} ${Math.abs(n) === 1 ? 'freshman' : 'freshmen'}`);
        break;
      }
      case 'trees': out.push(v > 0 ? `${v} trees planted` : `${-v} trees felled`); break;
      case 'replant': out.push(`${v} trees planted`); break;
      case 'departs': out.push(`${vars.faculty ?? 'they'} leaves`); break;
      case 'buildingFund': out.push(`${money(v)} to the building fund`); break;
      case 'historic': out.push(`${vars.building ?? 'the building'} declared historic`); break;
    }
  }
  return out;
}

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
        const phrases = [
          ...effectPhrases(s, scaledEffects(c.effects, p.scale), p.vars),
          ...(c.promise ? [`promises: ${(() => { const d = promiseById(c.promise); return d ? promiseTitle(s, d) : c.promise; })()}`] : []),
          ...(c.mascot && !s.self.mascot ? [`the ${c.mascot} it is`] : []),
        ];
        return (
          <button key={c.id} type="button" className="event-choice" disabled={!affordable} onClick={() => onChoose(c.id)}>
            <span className="event-choice-label">
              {fill(c.label, p.vars)}
              {marksDefault && c.id === e.default && <span className="event-choice-cost">if nobody answers</span>}
            </span>
            <span className="event-choice-detail">
              {phrases.length > 0 ? phrases.join(' · ') : 'nothing to speak of'}
              {!affordable && ' — the college cannot cover this.'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
