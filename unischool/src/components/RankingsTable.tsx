import type { RankedEntry } from '../systems/rivals/rivalsSystem';

// The guide's table (Plan 80C): the one-time top-fifty reveal and the
// annual report print it (InterruptModal.tsx's RankingsReportView), and the
// History tab's guide shows it live from the Rank chip (tabs/RankingsPanel
// .tsx). A row is a place in the guide; a college below the printed list is
// shown with its neighbors after a gap.

export interface RankingsRow extends RankedEntry {
  place: number;
  // Last year's place, where the report has one; undefined drops the column.
  previousRank?: number | null;
}

// Past the printed list, the college's own row and one either side.
export const NEIGHBORS = 1;

// The rows a live table shows: the first `printed` of the list, then, for a
// college below them, a gap and its neighbors.
export function rankingsRows(list: readonly RankedEntry[], printed: number): (RankingsRow | 'gap')[] {
  const rows: (RankingsRow | 'gap')[] = list.slice(0, printed).map((e, i) => ({ ...e, place: i + 1 }));
  const mine = list.findIndex((e) => e.isPlayer);
  if (mine >= printed) {
    const from = Math.max(printed, mine - NEIGHBORS);
    if (from > printed) rows.push('gap');
    for (let i = from; i <= Math.min(list.length - 1, mine + NEIGHBORS); i += 1) rows.push({ ...list[i], place: i + 1 });
  }
  return rows;
}

// The four pillars' columns (Plan 85B), when the table is given them.
const PILLAR_HEADS: ReadonlyArray<{ short: string; label: string }> = [
  { short: 'Aca', label: 'Academics' },
  { short: 'Res', label: 'Research' },
  { short: 'Life', label: 'Student life' },
  { short: 'Ath', label: 'Athletics' },
];

export default function RankingsTable({ rows, lastYear, pillars }: {
  rows: readonly (RankingsRow | 'gap')[]; lastYear: boolean;
  // Each school's four pillars on the prestige scale, by key (rivalsSystem.ts's pillarColumns).
  pillars?: ReadonlyMap<string, readonly number[]>;
}) {
  const columns = 3 + (lastYear ? 1 : 0) + (pillars ? PILLAR_HEADS.length : 0);
  return (
    <table className={`report-table${pillars ? ' with-pillars' : ''}`}>
      <thead>
        <tr>
          <th>#</th><th>School</th><th title="Prestige: the blend of the four pillars">Score</th>
          {pillars && PILLAR_HEADS.map((h) => <th key={h.short} className="report-table-pillar" title={h.label}>{h.short}</th>)}
          {lastYear && <th>Last year</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          if (r === 'gap') {
            return <tr key={`gap-${i}`} className="report-table-gap"><td colSpan={columns}>…</td></tr>;
          }
          // Keyed by identity, not by name: the player may name their
          // school anything, including something a rival is already called.
          const previous = r.previousRank ?? null;
          const move = previous === null ? null : previous - r.place;
          return (
            <tr key={r.key} className={r.isPlayer ? 'me' : ''}>
              <td className="report-table-rank">{r.place}</td>
              <td className="report-table-name">{r.name}</td>
              <td className="report-table-score">{Math.round(r.value)}</td>
              {pillars && PILLAR_HEADS.map((h, j) => (
                <td key={h.short} className="report-table-pillar" title={h.label}>{Math.round(pillars.get(r.key)?.[j] ?? 0)}</td>
              ))}
              {lastYear && (
                <td className="report-table-last">
                  {previous === null
                    ? '—'
                    : <>#{previous}{move !== 0 && <span className={`rank-move ${move! > 0 ? 'up' : 'down'}`}> {move! > 0 ? '▲' : '▼'}{Math.abs(move!)}</span>}</>}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
