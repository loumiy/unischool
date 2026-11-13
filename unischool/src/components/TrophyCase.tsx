import type { GameState } from '../state/types';
import { sportById } from '../data/studentLifeData';
import HelpHint from './HelpHint';

// The trophy case (Athletics tab, side column): one cup per sport on a
// mantel, under a brass tally of every national title. Each title a sport
// wins adds a band engraved with its year to that cup's base, so a dynasty
// stands tallest. It grows by sport (at most one cup per program), not by
// title, so it stays a fixed size however long the game runs.

export type TrophyShape = 'cup' | 'urn' | 'bowl' | 'star';

// A sport's cup, by its base key, so both genders of a sport share one.
const SHAPE_BY_SPORT: Record<string, TrophyShape> = {
  basketball: 'cup', iceHockey: 'cup', lacrosse: 'cup',
  football: 'urn', swimming: 'urn', waterPolo: 'urn',
  soccer: 'bowl', volleyball: 'bowl', fieldHockey: 'bowl',
  baseball: 'star', softball: 'star', track: 'star',
};
export function trophyShape(sportId: string): TrophyShape {
  return SHAPE_BY_SPORT[sportById(sportId)?.key ?? ''] ?? 'cup';
}

export interface TrophyShelfItem {
  sport: string;
  label: string;       // 'Basketball'
  genderLabel: string; // "Men's", or '' for a one-gender sport
  years: number[];     // oldest first: the base's bands, top to bottom
}

// The cups on the mantel: the sport with the most titles first, ties by the
// latest title.
export function trophyShelf(titles: readonly { sport: string; year: number }[]): TrophyShelfItem[] {
  const bySport = new Map<string, number[]>();
  for (const t of titles) bySport.set(t.sport, [...(bySport.get(t.sport) ?? []), t.year]);
  return [...bySport.entries()]
    .map(([sport, years]) => {
      const def = sportById(sport);
      return { sport, label: def?.label ?? sport, genderLabel: def?.genderLabel ?? '', years: [...years].sort((a, b) => a - b) };
    })
    .sort((a, b) => b.years.length - a.years.length || b.years[b.years.length - 1] - a.years[a.years.length - 1]);
}

const PER_ROW = 4;

export default function TrophyCase({ s }: { s: GameState }) {
  const titles = s.orgs.titles;
  const shelf = trophyShelf(titles);
  const latest = titles.reduce((m, t) => Math.max(m, t.year), 0);
  // Whole rows, and always at least one, with empty spots for the cups still to come.
  const slots = Math.max(PER_ROW, Math.ceil(shelf.length / PER_ROW) * PER_ROW);
  const rows: (TrophyShelfItem | null)[][] = [];
  for (let i = 0; i < slots; i += PER_ROW) {
    rows.push(Array.from({ length: PER_ROW }, (_, j) => shelf[i + j] ?? null));
  }
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Trophy case</h2>
        <HelpHint text="When one of your teams wins a national title, it gets a cup here. Each time it wins again, its cup gets a band with the year. A national title raises your athletics prestige for good. It also brings in more applicants for a few summers. For about a year, donors are easier to find and campaigns raise more." />
      </div>
      <TrophyDefs />
      {titles.length === 0 ? (
        <div className="trophy-tally trophy-tally-zero">
          <span className="trophy-tally-num">0</span>
          <span className="trophy-tally-text"><b>No national titles yet</b><span>Win one and that team gets a cup</span></span>
        </div>
      ) : (
        <div className="trophy-tally">
          <span className="trophy-tally-num">{titles.length}</span>
          <span className="trophy-tally-text">
            <b>National title{titles.length === 1 ? '' : 's'}</b>
            <span>across {shelf.length} team{shelf.length === 1 ? '' : 's'} · latest Year {latest}</span>
          </span>
        </div>
      )}
      <div className="trophy-mantel">
        {rows.map((row, r) => (
          <div key={r}>
            <div className="trophy-row">
              {row.map((item, i) => item ? (
                <div key={item.sport} className="trophy-item" title={`${sportName(item)}: ${item.years.length} national title${item.years.length === 1 ? '' : 's'}`}>
                  <TrophyArt shape={trophyShape(item.sport)} />
                  {item.years.map((year, j) => (
                    <div key={year} className="trophy-band" style={{ width: 26 + j * 3 }} title={`${sportName(item)} · Year ${year} · national champions`}>
                      <span>{year}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div key={`empty-${i}`} className="trophy-item trophy-item-empty" aria-hidden="true">
                  <TrophyArt shape="cup" ghost />
                  <div className="trophy-band trophy-band-empty" style={{ width: 26 }} />
                </div>
              ))}
            </div>
            <div className="trophy-plank" />
            <div className="trophy-labels">
              {row.map((item, i) => (
                <div key={item?.sport ?? `empty-${i}`}>
                  {item && <>
                    <b>{item.label}</b>
                    <span>{item.genderLabel}{item.years.length > 1 ? `${item.genderLabel ? ' ' : ''}×${item.years.length}` : ''}</span>
                  </>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {titles.length === 0 && (
        <p className="trophy-note">When one of your teams wins a national title, it gets a cup on this shelf. Each time that team wins again, its cup gets a new band with the year.</p>
      )}
    </section>
  );
}

function sportName(item: TrophyShelfItem): string {
  return item.genderLabel ? `${item.genderLabel} ${item.label}` : item.label;
}

// The metal's gradient, once per case. Only one trophy case is on screen.
function TrophyDefs() {
  return (
    <svg width="0" height="0" className="trophy-defs" aria-hidden="true">
      <defs>
        <linearGradient id="trophy-gold" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#8a6414" /><stop offset=".32" stopColor="#f3cf68" /><stop offset=".48" stopColor="#fff4c8" />
          <stop offset=".68" stopColor="#d9a93a" /><stop offset="1" stopColor="#7d5a10" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 2.9 : 7;
  const t = -Math.PI / 2 + (i * Math.PI) / 5;
  return `${(20 + r * Math.cos(t)).toFixed(2)},${(8 + r * Math.sin(t)).toFixed(2)}`;
}).join(' ');

// A cup's top, drawn in a 40 × 38 box; its base is the bands below it.
// A ghost is the dashed outline of a cup still to be won.
export function TrophyArt({ shape, ghost = false, width = 36 }: { shape: TrophyShape; ghost?: boolean; width?: number }) {
  const metal = ghost
    ? { fill: 'none', stroke: 'currentColor', strokeWidth: 0.9, strokeDasharray: '2 1.6' }
    : { fill: 'url(#trophy-gold)', stroke: '#6e4f10', strokeWidth: 0.7 };
  const rim = ghost ? metal : { ...metal, fill: '#fbe9ad' };
  const handle = ghost
    ? { fill: 'none', stroke: 'currentColor', strokeWidth: 0.9, strokeDasharray: '2 1.6' }
    : { fill: 'none', stroke: '#c8962f', strokeWidth: 2.4, strokeLinecap: 'round' as const };
  return (
    <svg className={ghost ? 'trophy-art trophy-art-ghost' : 'trophy-art'} viewBox="0 0 40 38" width={width} height={(width * 38) / 40} aria-hidden="true">
      {shape === 'cup' && <>
        <path d="M11 8 C3.5 7.5 4 19 13.5 19" {...handle} /><path d="M29 8 C36.5 7.5 36 19 26.5 19" {...handle} />
        <path d="M10 5 H30 C30 17 26 23 20 24 C14 23 10 17 10 5Z" {...metal} />
        <ellipse cx="20" cy="5" rx="10" ry="1.6" {...rim} />
        <rect x="18.6" y="24" width="2.8" height="7" {...metal} /><ellipse cx="20" cy="31" rx="3.6" ry="1.4" {...metal} />
        <path d="M14 33 H26 L27.5 38 H12.5Z" {...metal} />
      </>}
      {shape === 'urn' && <>
        <path d="M15.5 8.5 C10 6 9 13 12.5 16" {...handle} /><path d="M24.5 8.5 C30 6 31 13 27.5 16" {...handle} />
        <path d="M15 4.5 H25 L24 7 C31 11 31 21 23.5 25 L22.5 29 H17.5 L16.5 25 C9 21 9 11 16 7Z" {...metal} />
        <ellipse cx="20" cy="4.2" rx="5.6" ry="1.3" {...rim} /><path d="M17.5 3.4 Q20 0 22.5 3.4Z" {...metal} />
        <ellipse cx="20" cy="30" rx="3.4" ry="1.3" {...metal} /><path d="M14.5 32 H25.5 L27 38 H13Z" {...metal} />
      </>}
      {shape === 'bowl' && <>
        <path d="M5 11 H35 C34 18 28 21.5 20 21.5 C12 21.5 6 18 5 11Z" {...metal} />
        <ellipse cx="20" cy="11" rx="15" ry="2.2" {...rim} />
        <rect x="18.7" y="21.5" width="2.6" height="8" {...metal} /><ellipse cx="20" cy="27" rx="3" ry="1.2" {...metal} />
        <rect x="15" y="30.5" width="10" height="2.5" {...metal} /><path d="M13.5 33 H26.5 L27.5 38 H12.5Z" {...metal} />
      </>}
      {shape === 'star' && <>
        <polygon points={STAR_POINTS} {...metal} />
        <rect x="14" y="15.4" width="12" height="2.3" {...rim} />
        <rect x="16" y="17.7" width="8" height="13.3" {...metal} />
        {!ghost && <path d="M18.6 18.5 V30.2 M21.4 18.5 V30.2" stroke="#6e4f10" strokeWidth={0.5} opacity={0.55} />}
        <rect x="14" y="31" width="12" height="2.5" {...metal} /><rect x="12.5" y="33.5" width="15" height="4.5" {...metal} />
      </>}
    </svg>
  );
}
