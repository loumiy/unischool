import type { GameState, PendingCatalogueEvent } from '../state/types';
import { totalEnrolled } from '../state/types';
import type { CatalogueChoice, CatalogueEvent, EffectKey } from '../data/eventCatalogueTypes';
import { STATUE_ID, eventCampaign, fill, namedDamage, scaledEffects, statuePledgeable, wornLine } from '../systems/events/catalogue';
import { choiceCost } from '../systems/events/catalogueEngine';
import { money, moneyShort, pct, signed, signedMoney } from '../format';
import { clampDrawRate, debtOutstanding, drawRate } from '../systems/finance/treasury';
import { constructionFrozen } from '../systems/finance/distress';
import { LIBRARY_TIER1_ID, nextLibraryFloor } from '../data/facilitiesData';
import { promiseById } from '../data/promiseData';
import { promiseTitle } from '../systems/promises/promises';
import { festivalPhrases } from '../data/downtownData';
import { annualGiving } from '../systems/alumni/giving';
import { facultyPay } from '../systems/finance/financeSystem';

// An event's text and its answers (Plan 32), shared by the inbox's reading
// pane (InboxTab.tsx, Plan 77) and the board's letters, which are modal
// (InterruptModal.tsx's CatalogueLetterView). Each answer says what it
// does, in the sums the college will actually pay.

// What an answer does, a phrase per lever.
function effectPhrases(s: GameState, effects: CatalogueChoice['effects'], vars: Readonly<Record<string, string>>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(effects) as [EffectKey, number][]) {
    // The spring festival (Plan 85H): what its scale does, or what a spring
    // without one costs (0).
    if (k === 'festival') { out.push(...festivalPhrases(v, s.students.applicantPool, annualGiving(s), { signed, money: moneyShort })); continue; }
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
      // The charter (Plan 78G): the name, for good (Plan 80D: nothing renames
      // the college after it).
      case 'charter': out.push(v > 0 ? 'University from now on' : 'College for good'); break;
      case 'goodwill': out.push(`town goodwill ${signed(v)}`); break;
      // Plan 101C's effects that land where they say.
      case 'backlogOn': {
        const building = vars.building ?? 'the building';
        const owed = s.tech.reduce((t, b) => t + (b.backlog ?? 0), 0);
        const named = s.tech.find((t) => t.id === vars.buildingId && t.status === 'done');
        if (v > 0) out.push(`${money(named ? namedDamage(s, v, named) : v)} of repairs deferred on ${building}`);
        else if (owed > 0) out.push(`${money(Math.min(-v, owed))} of repairs done, ${building} first`);
        break;
      }
      case 'enrollmentSpread': {
        const n = Math.round((v / 2000) * totalEnrolled(s.students));
        if (n !== 0) out.push(`${signed(n)} ${Math.abs(n) === 1 ? 'student' : 'students'}, from every class`);
        break;
      }
      case 'drawRate': {
        const from = drawRate(s);
        const to = clampDrawRate(from + v);
        if (to !== from) out.push(`draw rate ${pct(from, 1)} to ${pct(to, 1)}`);
        break;
      }
      // The candidate the event named (Plan 101D), at this college's pay.
      case 'hire': if (vars.candidate) out.push(`appoints ${vars.candidate} (${vars.candidateField}), ${money(Math.round(facultyPay(s, Number(vars.candidateSalary) || 0)))}/yr`); break;
      // Plan 101E's campaigns, gifts and marks on the map.
      case 'campaign': { const def = eventCampaign(s); if (def) out.push(`launches ${def.title}`); break; }
      case 'statue': {
        const statue = s.tech.find((t) => t.id === STATUE_ID);
        if (statue && statuePledgeable(s)) out.push(`${money(statue.cost)} to the building fund for the statue, to place`);
        break;
      }
      case 'boosterGift': out.push(`${money(v)} to the athletics department this year`); break;
      case 'paveLine': { const n = wornLine(s).length; if (n > 0) out.push(`${n} tiles of path laid`); break; }
      case 'ivy': out.push(`ivy stays on ${vars.building ?? 'the building'}`); break;
      case 'sinkhole': out.push(`the hole fenced by ${vars.building ?? 'the building'}`); break;
      case 'libraryFloor': {
        const library = s.tech.find((t) => t.id === LIBRARY_TIER1_ID);
        if (library && library.status === 'done' && nextLibraryFloor(library) && !constructionFrozen(s)) out.push('the library\'s next floor goes up');
        break;
      }
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
