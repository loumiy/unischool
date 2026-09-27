import { useState } from 'react';
import type { GameState, PendingCatalogueEvent } from '../state/types';
import { totalEnrolled } from '../state/types';
import type { Action } from '../state/actions';
import type { CatalogueChoice, CatalogueEvent, EffectKey } from '../data/eventCatalogueTypes';
import { absoluteWeek } from '../data/eventData';
import { eventById, eventText, fill, scaledEffects } from '../systems/events/catalogue';
import { catalogueOf, choiceCost } from '../systems/events/catalogueEngine';
import { money } from '../format';
import { debtOutstanding } from '../systems/finance/treasury';
import { promiseById } from '../data/promiseData';
import { promiseTitle } from '../systems/promises/promises';

// THE PANEL (Plan 32): the catalog's inline events, waiting over the map
// while the clock runs. Each shows its weeks left and what each answer
// does, in the sums the college will actually pay; one left alone takes
// its default when its weeks run out. The board's letters are modal
// (InterruptModal.tsx's CatalogueLetterView) and share the choice list.

const DOMAIN_LABEL: Record<CatalogueEvent['domain'], string> = {
  board: 'The President',
  academic: 'Academic affairs',
  students: 'Student life',
  estate: 'The estate',
  advancement: 'Advancement',
};

const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);

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
        if (moved > 0) out.push(`endowment ${v < 0 ? '−' : '+'}${money(moved)}`);
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

export default function EventPanel({ s, act }: { s: GameState; act: (a: Action) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const waiting = catalogueOf(s).pending
    .map((p) => ({ p, e: eventById(p.eventId) }))
    .filter((x): x is { p: PendingCatalogueEvent; e: CatalogueEvent } => x.e !== undefined && x.e.kind === 'inline');
  if (waiting.length === 0 || s.pendingInterrupt) return null;
  const shown = waiting.find((x) => x.p.instanceId === open) ?? waiting[0];
  const week = absoluteWeek(s);
  return (
    <aside className="event-panel" aria-label="Events waiting for an answer">
      {waiting.map(({ p, e }) => {
        const weeksLeft = Math.max(0, e.timeoutWeeks - (week - p.firedWeek));
        const text = fill(eventText(e, p), p.vars);
        const expanded = p.instanceId === shown.p.instanceId;
        return (
          <section key={p.instanceId} className={`event-card${expanded ? ' is-open' : ''}`}>
            <button type="button" className="event-card-head" aria-expanded={expanded} onClick={() => setOpen(p.instanceId)}>
              <span className="letter-eyebrow">
                {DOMAIN_LABEL[e.domain]} · {weeksLeft === 1 ? '1 week' : `${weeksLeft} weeks`} to answer
              </span>
              {!expanded && <span className="event-card-teaser">{text.split('\n')[0]}</span>}
            </button>
            {expanded && (
              <>
                <CatalogueText text={text} className="milestone-note-text" />
                <CatalogueChoices
                  s={s}
                  p={p}
                  e={e}
                  onChoose={(choiceId) => act({ type: 'RESOLVE_CATALOGUE_EVENT', instanceId: p.instanceId, choiceId })}
                />
              </>
            )}
          </section>
        );
      })}
    </aside>
  );
}
