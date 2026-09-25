import type { GameState } from './types';
import { institutionName, totalEnrolled } from './types';
import { STARTING_ENDOWMENT } from '../data/foundingData';
import { promiseById } from '../data/promiseData';
import {
  AXIS_PHRASES, REPORT_SHAPES, TAG_AXIS, TAG_PHRASES, VERDICTS, WEAKNESSES, WEAKNESS_BELOW, reportGrade, type ReportAxis,
} from '../data/reportData';
import { STANDINGS, playerRank, standingValue, type StandingAxis } from '../systems/rivals/rivalsSystem';
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
}

// The report's six (data/reportData.ts), read off rivalsSystem.ts's axes.
const REPORT_AXES: ReadonlyArray<{ axis: ReportAxis; standing: StandingAxis }> = [
  { axis: 'academics', standing: 'reputation' },
  { axis: 'research', standing: 'researchStanding' },
  { axis: 'experience', standing: 'socialStanding' },
  { axis: 'athletics', standing: 'athleticStrength' },
  { axis: 'access', standing: 'access' },
  { axis: 'finance', standing: 'financial' },
];
// This game's standings run to 150; the report reads them on v2's 100.
const TO_REPORT_SCALE = 100 / 150;
const DECADE = 10;
// The Epilogue's addenda, a decade each (resolveAdmissions.ts).
export const EPILOGUE_DECADE = 10;

const mean = (xs: number[]) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : 0);
const round1 = (n: number) => Number(n.toFixed(1));

// Each standing over the arc. A year's value comes from its history row
// (Plan 33's journal); rows from before it carry none, and a run with none
// reads today's.
export function gradeAxes(s: GameState): AxisGrade[] {
  return REPORT_AXES.map(({ axis, standing }) => {
    const series = s.history.map((h) => h.standingValues?.[standing]).filter((v): v is number => v !== undefined).map((v) => v * TO_REPORT_SCALE);
    if (series.length === 0) series.push(standingValue(s, standing) * TO_REPORT_SCALE);
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

// "Blackmoor University: a research powerhouse that never learned to make
// its students happy." What the guidebooks call it first (or its strongest
// standing), and its weakest if that is weak, never the one the tag claims.
export function composeTitle(s: GameState, grades: AxisGrade[]): string {
  const college = institutionName(s.self);
  const byScore = [...grades].sort((a, b) => b.score - a.score);
  const tag = s.identity?.tags[0];
  const claims = tag ? TAG_AXIS[tag] : null;
  const weakest = [...byScore].reverse().find((g) => g.axis !== claims) ?? byScore[byScore.length - 1];
  const phrase = tag && TAG_PHRASES[tag] ? TAG_PHRASES[tag] : AXIS_PHRASES[byScore[0].axis];
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
    out.push(VERDICTS.distress.replace('{years}', String(distressYears)).replace('{scars}', scars ? VERDICTS.scars.replace('{count}', String(scars)) : ''));
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
    kept: kept.map((p) => promiseById(p.id)?.title ?? p.id),
    missed: missed.map((p) => promiseById(p.id)?.title ?? p.id),
    declined: s.promises?.declined.length ?? 0,
    finances: financialVerdict(s),
    eras: chronicleOf(s).eras.map((e) => `${e.name} (${e.from}–${e.to})`),
    rank,
    figures: founderFigures(s),
    total,
  };
}
