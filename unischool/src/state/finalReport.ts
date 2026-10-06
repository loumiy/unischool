import { heldOffices } from '../systems/administration/offices';
import { officeDef } from '../data/officeData';
import { specializationOf } from '../systems/prestige/specialization';
import { SPECIALIZATION_CARDS } from '../data/specializationData';
import type { GameState } from './types';
import { institutionName, totalEnrolled } from './types';
import { STARTING_ENDOWMENT } from '../data/foundingData';
import { settledTitle } from '../systems/promises/promises';
import {
  AXIS_PHRASES, EARNED_PILLAR_TOP, REPORT_SHAPES, SATISFACTION_LEADS_AT, SATISFACTION_LEAD_SHARE, SPECIALIZATION_AXIS, TAG_AXIS, TAG_PHRASES, VERDICTS, WEAKNESSES, WEAKNESS_BELOW, reportGrade, type ReportAxis,
} from '../data/reportData';
import { STANDINGS, playerRank, rankBy, standingValue, type StandingAxis } from '../systems/rivals/rivalsSystem';
import { debtOutstanding } from '../systems/finance/treasury';
import { chronicleOf } from '../systems/chronicle/chronicle';
import { moneyShort } from '../format';

// The founder's numbers on the final report, derived from the record:
//   students taught  every graduating class plus those still enrolled
//   faculty served   everyone who ever held a chair (University.facultyServed)
//   prizes           the research tally's count
//   titles           championships won (orgs.titles)
export interface FounderFigures {
  studentsTaught: number;
  facultyServed: number;
  prizes: number;
  titles: number;
}

export function founderFigures(s: GameState): FounderFigures {
  return {
    studentsTaught: s.history.reduce((sum, h) => sum + h.graduated, 0) + totalEnrolled(s.students),
    facultyServed: s.self.facultyServed,
    prizes: s.research.prizes,
    titles: s.orgs.titles.length,
  };
}

// ---------------------------------------------------------------------
// THE FINAL REPORT (Plan 33, from v2's ending.ts; V2 #54, V1-28): the
// whole arc graded, not the last snapshot. Each standing's average over
// the run, its first decade's and its last's, and the climb between; a
// mark over them, where the guide left the college and whether it kept its
// promises; a title built from what the guidebooks call it; the money's
// verdict; the eras. Written once, at the fiftieth summer
// (resolveAdmissions.ts), onto `s.ending`; until then a draft.
// ---------------------------------------------------------------------

export interface AxisGrade {
  axis: ReportAxis;
  label: string;
  mean: number;   // 0–100
  first: number;  // the first decade's mean
  last: number;   // the last decade's mean
  score: number;
  grade: string;
}

export interface FinalReport {
  year: number;
  college: string;
  title: string;
  mark: string;
  markScore: number;
  axes: AxisGrade[];
  kept: string[];
  missed: string[];
  declined: number;
  finances: string[];
  eras: string[];
  rank: number;
  total: number;
  // The founder's figures as they stood at the report. Optional: a report
  // written before they were kept falls back to the live figures.
  figures?: FounderFigures;
  // The offices Founders Hall held at the report (Plan 89F), by title.
  // Optional: a report written before them says nothing of them.
  offices?: string[];
}

// The report's six (data/reportData.ts), read off rivalsSystem.ts's axes.
const REPORT_AXES: ReadonlyArray<{ axis: ReportAxis; standing: StandingAxis }> = [
  { axis: 'academics', standing: 'academics' },
  { axis: 'research', standing: 'researchStanding' },
  { axis: 'experience', standing: 'socialStanding' },
  { axis: 'athletics', standing: 'athleticStrength' },
  { axis: 'access', standing: 'access' },
  { axis: 'finance', standing: 'financial' },
];
// This game's standings run to 150; the report reads them on v2's 100.
// Athletic strength already runs to 100 (studentLifeData.ts's
// athleticProgramStrength), so it is read as it is (Plan 76C).
const toReportScale = (standing: StandingAxis) => (standing === 'athleticStrength' ? 1 : 100 / 150);
const DECADE = 10;
// The Epilogue's addenda, a decade each (resolveAdmissions.ts).
export const EPILOGUE_DECADE = 10;

const mean = (xs: number[]) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : 0);
const round1 = (n: number) => Number(n.toFixed(1));

// Whether the college's satisfaction led the field for most of the arc
// (Plan 95U, the second review's B4-7): the year's average at
// SATISFACTION_LEADS_AT or over it in more than half the history's rows.
// The experience axis then reads satisfaction at SATISFACTION_LEAD_SHARE
// beside the campus-life standing, so the college that kept its students
// happiest earns the axis that names it.
export function satisfactionLeads(s: GameState): boolean {
  const rows = s.history.filter((h) => typeof h.satisfactionAverage === 'number');
  return rows.length > 0 && rows.filter((h) => h.satisfactionAverage >= SATISFACTION_LEADS_AT).length > rows.length / 2;
}

// Each standing over the arc. A year's value comes from its history row
// (Plan 33's journal); rows from before it carry none, and a run with none
// reads today's.
export function gradeAxes(s: GameState): AxisGrade[] {
  const leads = satisfactionLeads(s);
  return REPORT_AXES.map(({ axis, standing }) => {
    const series = s.history.filter((h) => h.standingValues?.[standing] !== undefined).map((h) => {
      const value = h.standingValues![standing] * toReportScale(standing);
      return axis === 'experience' && leads ? (1 - SATISFACTION_LEAD_SHARE) * value + SATISFACTION_LEAD_SHARE * h.satisfactionAverage : value;
    });
    if (series.length === 0) series.push(standingValue(s, standing) * toReportScale(standing));
    const first = mean(series.slice(0, DECADE));
    const last = mean(series.slice(-DECADE));
    const all = mean(series);
    const climb = Math.max(-25, Math.min(25, last - first));
    const score = 0.5 * last + 0.3 * all + 0.2 * (50 + climb * 2);
    return {
      axis,
      label: STANDINGS.find((x) => x.axis === standing)?.label ?? axis,
      mean: round1(all), first: round1(first), last: round1(last), score: round1(score), grade: reportGrade(score),
    };
  });
}

// A pillar in the top EARNED_PILLAR_TOP in any year of the arc, or now.
function everInTop(s: GameState, axis: StandingAxis): boolean {
  return s.history.some((h) => (h.standings?.[axis] ?? Infinity) <= EARNED_PILLAR_TOP) || rankBy(s, axis) <= EARNED_PILLAR_TOP;
}

const FINAL_FOUR: ReadonlyArray<string> = ['champion', 'final', 'semifinal'];

// The tags a college can earn, not only be called (Plan 95U, the second
// review's B4-7): a record the guidebooks cannot argue with. A tag with no
// test here (a party school, a country club, a bargain…) is only ever what
// the college's standing implies.
export const EARNED_TAGS: Readonly<Record<string, (s: GameState) => boolean>> = {
  // Titles, a final four (the last season's, or the Complex's record), or
  // the athletics pillar in the top ten.
  'jock-school': (s) => s.orgs.titles.length > 0
    || Object.values(s.orgs.lastSeason ?? {}).some((r) => FINAL_FOUR.includes(r.finish))
    || (s.orgs.complexRuns ?? []).length > 0
    || everInTop(s, 'athleticStrength'),
  // Research prizes, or the research pillar in the top ten.
  'research-powerhouse': (s) => s.research.prizes > 0 || everInTop(s, 'researchStanding'),
  // The academics pillar in the top ten.
  'teaching-college': (s) => everInTop(s, 'academics'),
  // Financial strength in the top ten.
  'old-money': (s) => everInTop(s, 'financial'),
};

// The tag the title names (Plan 95U): an earned tag before one the
// standing implies. The guidebooks' own tags first, in their order; then a
// tag the college earned that they have not caught up with; then the
// guidebooks' first. Of several earned tags they have not caught up with,
// the one whose standing the arc graded highest.
export function titleTag(s: GameState, grades: AxisGrade[]): string | undefined {
  const tags = s.identity?.tags ?? [];
  const earned = (id: string) => EARNED_TAGS[id]?.(s) ?? false;
  const scoreOf = (id: string) => grades.find((g) => g.axis === TAG_AXIS[id])?.score ?? 0;
  const unheld = Object.keys(EARNED_TAGS).filter((id) => !tags.includes(id) && earned(id)).sort((a, b) => scoreOf(b) - scoreOf(a));
  return tags.find(earned) ?? unheld[0] ?? tags[0];
}

// "Blackmoor University: a research powerhouse that never gave its students
// much of a campus life." Its specialization first, once it has one (Plan
// 85D: "a college known first for its teaching", the card's own words);
// else its tag, an earned one first (titleTag), or its strongest standing. Then
// its weakest if that is weak, never the one the phrase claims.
export function composeTitle(s: GameState, grades: AxisGrade[]): string {
  const college = institutionName(s.self);
  const byScore = [...grades].sort((a, b) => b.score - a.score);
  const specialization = specializationOf(s);
  const tag = titleTag(s, grades);
  const claims = specialization ? SPECIALIZATION_AXIS[specialization] : tag ? TAG_AXIS[tag] : null;
  const weakest = [...byScore].reverse().find((g) => g.axis !== claims) ?? byScore[byScore.length - 1];
  const phrase = specialization ? SPECIALIZATION_CARDS[specialization].known
    : tag && TAG_PHRASES[tag] ? TAG_PHRASES[tag] : AXIS_PHRASES[byScore[0].axis];
  const shape = weakest.score < WEAKNESS_BELOW ? REPORT_SHAPES.title.replace('{tail}', WEAKNESSES[weakest.axis]) : REPORT_SHAPES.strength;
  return shape.replace('{college}', college).replace('{phrase}', phrase);
}

function financialVerdict(s: GameState): string[] {
  const end = s.finance.endowment;
  const from = moneyShort(STARTING_ENDOWMENT);
  const to = moneyShort(end);
  const ratio = end / STARTING_ENDOWMENT;
  const out = [(ratio >= 2 ? VERDICTS.rich : ratio >= 0.9 ? VERDICTS.steady : VERDICTS.poorer).replace('{from}', from).replace('{to}', to)];
  const distressYears = s.history.filter((h) => (h.worstRung ?? 0) >= 3).length;
  if (distressYears > 0) {
    const scars = s.finance.distress?.scars.length ?? 0;
    const years = distressYears === 1 ? 'a year' : `${distressYears} years`;
    const times = scars === 1 ? 'once' : scars === 2 ? 'twice' : `${scars} times`;
    out.push(VERDICTS.distress.replace('{years}', years).replace('{scars}', scars ? VERDICTS.scars.replace('{times}', times) : ''));
  }
  const debt = debtOutstanding(s);
  out.push(debt > 0 ? VERDICTS.debt.replace('{debt}', moneyShort(debt)) : VERDICTS.clean);
  return out;
}

export function finalReport(s: GameState): FinalReport {
  const axes = gradeAxes(s);
  const settled = s.promises?.settled ?? [];
  const kept = settled.filter((p) => p.kept);
  const missed = settled.filter((p) => !p.kept);
  const rank = playerRank(s);
  const total = s.rivals.length + 1;
  // The mark: the standings over the arc, where the guide left the college,
  // and whether it kept its word.
  const rankScore = 100 * (1 - (rank - 1) / Math.max(1, total - 1));
  const promises = kept.length + missed.length;
  const promiseScore = promises ? (100 * kept.length) / promises : 50;
  const markScore = round1(0.7 * mean(axes.map((a) => a.score)) + 0.2 * rankScore + 0.1 * promiseScore);
  return {
    year: s.clock.year,
    college: institutionName(s.self),
    title: composeTitle(s, axes),
    mark: reportGrade(markScore),
    markScore,
    axes,
    kept: kept.map((p) => settledTitle(s, p)),
    missed: missed.map((p) => settledTitle(s, p)),
    declined: s.promises?.declined.length ?? 0,
    finances: financialVerdict(s),
    eras: chronicleOf(s).eras.map((e) => `${e.name} (${e.from}–${e.to})`),
    rank,
    figures: founderFigures(s),
    offices: heldOffices(s).filter((o) => o.closingWeeks === undefined).map((o) => officeDef(o.id)?.title ?? o.id),
    total,
  };
}
