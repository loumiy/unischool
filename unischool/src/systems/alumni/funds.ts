import type { Faculty, GameState, NamedFund } from '../../state/types';
import { totalEnrolled } from '../../state/types';
import { drawRate } from '../finance/treasury';
import { marketRateMultiplier } from '../../data/facultyData';
import { money } from '../../format';

// NAMED FUNDS (Plan 101F). A gift given for a purpose: its principal is part
// of the endowment, and its share of the draw goes to that purpose rather
// than to the college's cash. A scholarship's income is student aid: it is
// spent on the students, and lowers the price the applicants read
// (admissions' net tuition). A chair's income pays its holder's salary,
// which the college would have paid anyway, so its money comes to the same:
// it is a name, and the professor who holds it.

export function fundsOf(s: GameState): readonly NamedFund[] {
  return s.advancement?.funds ?? [];
}

// The funds are part of the endowment, so when the endowment falls below
// their principal (a crash, a long draw) each pays out in proportion.
export function fundShare(s: GameState): number {
  const principal = fundsOf(s).reduce((t, f) => t + f.principal, 0);
  return principal > 0 ? Math.min(1, Math.max(0, s.finance.endowment) / principal) : 1;
}

// What a fund pays its purpose a year.
export function fundIncome(s: GameState, f: NamedFund): number {
  return f.principal * fundShare(s) * drawRate(s);
}

// The year's student aid from the scholarship funds.
export function scholarshipAid(s: GameState): number {
  return fundsOf(s).filter((f) => f.purpose === 'scholarship').reduce((t, f) => t + fundIncome(s, f), 0);
}

// The aid a student receives, on average: what an applicant reads off the
// price (admissions' net tuition), never below nothing.
export function aidPerStudent(s: GameState): number {
  const body = totalEnrolled(s.students);
  return body > 0 ? scholarshipAid(s) / body : 0;
}
export function netTuition(s: GameState, tuition: number): number {
  return Math.max(0, tuition - aidPerStudent(s));
}

// Who holds a chair: its first holder while on the roster, then the
// strongest professor in its field, then anyone; read, never stored, so a
// departure needs no bookkeeping.
export function chairHolder(s: GameState, f: NamedFund): Faculty | undefined {
  if (f.purpose !== 'chair') return undefined;
  const first = s.faculty.find((x) => x.id === f.holderId);
  if (first) return first;
  const strongest = (xs: readonly Faculty[]) => xs.slice().sort((a, b) => (b.teaching + b.research) - (a.teaching + a.research) || a.id.localeCompare(b.id))[0];
  return strongest(s.faculty.filter((x) => x.field === f.field)) ?? strongest(s.faculty);
}

// The chairs a professor holds (the person page).
export function chairsHeldBy(s: GameState, facultyId: string): NamedFund[] {
  return fundsOf(s).filter((f) => chairHolder(s, f)?.id === facultyId);
}

// What a chair pays toward its holder's salary a year: its income, never
// more than the salary.
export function chairPays(s: GameState, f: NamedFund): number {
  const holder = chairHolder(s, f);
  return holder ? Math.min(fundIncome(s, f), holder.salary * marketRateMultiplier(s.self.reputation)) : 0;
}

// Endows a fund (catalogueEngine.ts, an answer's `fund`). The principal is
// the gift the answer already put into the endowment. A chair goes first to
// the strongest professor in the field of the one the event named.
export function endowFund(s: GameState, purpose: NamedFund['purpose'], name: string, principal: number, namedFacultyId?: string): NamedFund | undefined {
  if (principal <= 0) return undefined;
  const adv = s.advancement ??= { running: null, closed: [], restrictedBuilding: 0 };
  const funds = adv.funds ??= [];
  const fund: NamedFund = { id: `fund-${s.clock.year}-${funds.length + 1}`, name, purpose, principal: Math.round(principal), year: s.clock.year };
  if (purpose === 'chair') {
    const named = s.faculty.find((x) => x.id === namedFacultyId);
    fund.field = named?.field ?? s.faculty[0]?.field;
    const holder = chairHolder(s, { ...fund, holderId: undefined });
    // Not the professor the chair is named for, when they are leaving.
    const others = s.faculty.filter((x) => x.id !== namedFacultyId && x.field === fund.field);
    const first = others.slice().sort((a, b) => (b.teaching + b.research) - (a.teaching + a.research) || a.id.localeCompare(b.id))[0] ?? holder;
    if (first) fund.holderId = first.id;
  }
  funds.push(fund);
  s.log.unshift({ year: s.clock.year, week: s.clock.week, kind: 'good', topic: 'money', message: `${name} is endowed with ${money(principal)}.` });
  return fund;
}
