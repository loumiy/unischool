import type { GameState, PendingCatalogueEvent } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import type { CatalogueChoice, EffectKey } from '../../data/eventCatalogueTypes';
import { toneOf, type Effect } from '../../data/effectTypes';
import { STATUE_ID, eventCampaign, fill, namedDamage, repairsOf, scaledEffects, statuePledgeable } from './catalogue';
import { wornLine } from '../estate/paths';
import { money, moneyShort, pct, signed, signedMoney } from '../../format';
import { clampDrawRate, debtOutstanding, drawRate } from '../finance/treasury';
import { constructionFrozen } from '../finance/distress';
import { LIBRARY_TIER1_ID, nextLibraryFloor } from '../../data/facilitiesData';
import { festivalEffects } from '../../data/downtownData';
import { honorsPhrase, tradePhrase } from '../../data/boardQuestionData';
import { annualGiving } from '../alumni/giving';
import { facultyPay } from '../finance/financeSystem';

// What an answer to a catalogue event does, an effect per lever, in the
// sums the college will actually pay (Plan 32; drawn as chips since Plan
// 125 A, components/EventChoices.tsx). Kept here, apart from the component,
// so a test can read it.

const other = (words: string, tone: Effect['tone'] = 'plain'): Effect => ({ kind: 'other', words, tone });

export function effectsOf(s: GameState, effects: CatalogueChoice['effects'], vars: Readonly<Record<string, string>>): Effect[] {
  const out: Effect[] = [];
  for (const [k, v] of Object.entries(effects) as [EffectKey, number][]) {
    // The spring festival (Plan 85H): what its scale does, or what a spring
    // without one costs (0).
    if (k === 'festival') { out.push(...festivalEffects(v, s.students.applicantPool, annualGiving(s), { signed, money: moneyShort })); continue; }
    if (!v) continue;
    switch (k) {
      case 'cash': out.push({ kind: 'money', figure: signedMoney(v), tone: toneOf(v) }); break;
      case 'endowment': {
        // A draw stops at what the fund holds (catalogue.ts floors it at 0).
        const moved = v < 0 ? Math.min(-v, Math.max(0, s.finance.endowment)) : v;
        if (moved > 0) out.push({ kind: 'endowment', figure: signedMoney(v < 0 ? -moved : moved), words: 'endowment', tone: toneOf(v) });
        break;
      }
      case 'debt': {
        // Repays what is owed; the rest comes back as cash (catalogue.ts).
        const owed = debtOutstanding(s);
        if (v > 0) out.push({ kind: 'debt', figure: money(v), words: 'borrowed', tone: 'loss' });
        else if (owed >= -v) out.push({ kind: 'debt', figure: money(-v), words: 'of debt repaid', tone: 'gain' });
        else if (owed > 0) out.push({ kind: 'debt', figure: money(owed), words: 'owed repaid, the rest to cash', tone: 'gain' });
        else out.push({ kind: 'money', figure: signedMoney(-v), tone: 'gain' });
        break;
      }
      case 'backlog': {
        // Repairs done stop at the backlog there is (catalogue.ts's spreadBacklog).
        const owed = s.tech.reduce((t, b) => t + (b.backlog ?? 0), 0);
        if (v > 0) out.push({ kind: 'repairs', figure: money(v), words: 'of repairs deferred', tone: 'loss' });
        else if (owed > 0) out.push({ kind: 'repairs', figure: money(Math.min(-v, owed)), words: 'of repairs done', tone: 'gain' });
        break;
      }
      // A bump to this week's figure, which then drifts back toward what
      // the campus offers.
      case 'mood': out.push({ kind: 'satisfaction', figure: signed(v), words: 'satisfaction', tone: toneOf(v), fades: true }); break;
      case 'warmth': out.push({ kind: 'alumni', figure: signed(v), words: 'alumni warmth', tone: toneOf(v) }); break;
      case 'quality': out.push({ kind: 'quality', figure: signed(v), words: 'incoming quality', tone: toneOf(v) }); break;
      case 'enrollment': {
        const n = Math.round((v / 2000) * totalEnrolled(s.students));
        if (n !== 0) out.push({ kind: 'students', figure: signed(n), words: Math.abs(n) === 1 ? 'freshman' : 'freshmen', tone: toneOf(n) });
        break;
      }
      case 'trees': out.push(v > 0 ? { kind: 'trees', figure: String(v), words: 'trees planted', tone: 'gain' } : { kind: 'trees', figure: String(-v), words: 'trees felled', tone: 'loss' }); break;
      case 'replant': out.push({ kind: 'trees', figure: String(v), words: 'trees planted', tone: 'gain' }); break;
      case 'departs': out.push({ kind: 'faculty', words: `${vars.faculty ?? 'they'} leaves`, tone: 'loss' }); break;
      case 'buildingFund': out.push({ kind: 'money', figure: money(v), words: 'to the building fund', tone: 'gain' }); break;
      case 'historic': out.push(other(`${vars.building ?? 'the building'} declared historic`)); break;
      // The charter (Plan 78G): the name, for good (Plan 80D: nothing renames
      // the college after it).
      case 'charter': out.push(other(v > 0 ? 'University from now on' : 'College for good')); break;
      case 'goodwill': out.push({ kind: 'goodwill', figure: signed(v), words: 'town goodwill', tone: toneOf(v) }); break;
      // Plan 101C's effects that land where they say.
      case 'backlogOn': {
        const building = vars.building ?? 'the building';
        const owed = s.tech.reduce((t, b) => t + (b.backlog ?? 0), 0);
        const named = s.tech.find((t) => t.id === vars.buildingId && t.status === 'done');
        if (v > 0) out.push({ kind: 'repairs', figure: money(named ? namedDamage(s, v, named) : v), words: `of repairs deferred on ${building}`, tone: 'loss' });
        else if (owed > 0) out.push({ kind: 'repairs', figure: money(Math.min(-v, owed)), words: `of repairs done, ${building} first`, tone: 'gain' });
        break;
      }
      case 'enrollmentSpread': {
        const n = Math.round((v / 2000) * totalEnrolled(s.students));
        if (n !== 0) out.push({ kind: 'students', figure: signed(n), words: `${Math.abs(n) === 1 ? 'student' : 'students'}, across all four years`, tone: toneOf(n) });
        break;
      }
      case 'drawRate': {
        const from = drawRate(s);
        const to = clampDrawRate(from + v);
        if (to !== from) out.push({ kind: 'endowment', figure: `${pct(from, 1)} to ${pct(to, 1)}`, words: 'draw rate', tone: 'plain' });
        break;
      }
      // The candidate the event named (Plan 101D), at this college's pay.
      case 'hire': if (vars.candidate) out.push({ kind: 'faculty', words: `appoints ${vars.candidate} (${vars.candidateField}), ${money(Math.round(facultyPay(s, Number(vars.candidateSalary) || 0)))}/yr`, tone: 'plain' }); break;
      // Plan 101E's campaigns, gifts and marks on the map.
      case 'campaign': { const def = eventCampaign(s); if (def) out.push(other(`launches ${def.title}`)); break; }
      case 'statue': {
        const statue = s.tech.find((t) => t.id === STATUE_ID);
        if (statue && statuePledgeable(s)) out.push({ kind: 'money', figure: money(statue.cost), words: 'to the building fund for the statue, which you then place', tone: 'gain' });
        break;
      }
      case 'boosterGift': out.push({ kind: 'athletics', figure: money(v), words: 'to the athletics department this year', tone: 'gain' }); break;
      case 'closeProgram': out.push(other(`${vars.program ?? 'the program'} closes, its courses ended`, 'loss')); break;
      // The board's honors college (Plan 116D).
      case 'honors': out.push({ kind: 'quality', words: honorsPhrase(v), tone: 'plain' }); break;
      case 'repairGift': {
        const repairs = repairsOf(s, v);
        if (repairs > 0) out.push({ kind: 'repairs', figure: money(repairs), words: 'of repairs done', tone: 'gain' });
        if (v - repairs > 0) out.push({ kind: 'money', figure: money(v - repairs), words: 'to the building fund', tone: 'gain' });
        break;
      }
      case 'paveLine': { const n = wornLine(s).length; if (n > 0) out.push(other(`${n} tiles of path laid`, 'gain')); break; }
      case 'ivy': out.push(other(`ivy stays on ${vars.building ?? 'the building'}`)); break;
      case 'sinkhole': out.push(other(`the hole fenced by ${vars.building ?? 'the building'}`)); break;
      case 'libraryFloor': {
        const library = s.tech.find((t) => t.id === LIBRARY_TIER1_ID);
        if (library && library.status === 'done' && nextLibraryFloor(library) && !constructionFrozen(s)) out.push({ kind: 'study', words: 'the library\'s next floor goes up', tone: 'gain' });
        break;
      }
    }
  }
  return out;
}

// Everything one answer does: its levers at the event's scale, then a named
// fund, a mascot and the board's trade between pillars where it has them.
export function choiceEffects(s: GameState, c: CatalogueChoice, p: PendingCatalogueEvent): Effect[] {
  return [
    ...effectsOf(s, scaledEffects(c.effects, p.scale), p.vars),
    // A named fund (Plan 101F).
    ...(c.fund ? [other(`endows ${fill(c.fund.name, p.vars).replace(/^The /, 'the ')}`, 'gain')] : []),
    ...(c.mascot && !s.self.mascot ? [other(`the ${c.mascot} it is`)] : []),
    // The board's trade between two pillars (Plan 116D).
    ...(c.standing ? [{ kind: 'prestige', words: tradePhrase(c.standing), tone: 'plain' } as Effect] : []),
  ];
}
