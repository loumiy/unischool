import type { Buildable, FacilityType } from '../state/types';

// Architectural motifs: the small amount of drawn structure that makes a
// placed Buildable read as a BUILDING rather than as a coloured rectangle
// with a name written on it.
//
// The house rules from icons.tsx / FacultyPortrait.tsx / CampusMap.tsx hold
// here too: hand-rolled inline SVG, no icon library, no external art, no new
// dependency. What is different from all three is the COLOUR rule. A motif
// is drawn over ~22 different building tints (see styles.css's kind-/tint-
// table), so it cannot name colours of its own without needing 22 variants
// of every part. Every piece below is therefore a TONAL OVERLAY — a
// translucent dark or light wash that darkens or lightens whatever tint it
// happens to be sitting on. One set of motif colours harmonises with all 22
// tints automatically, and a tint retuned later needs no change here at all.
//
// There are eight motifs for the ~22 placeable Buildables rather than
// bespoke art per building: a motif says what KIND of place this is (a hall,
// a residence, a shed, open ground), which is the reading that matters when
// you pull back far enough to see the whole campus at once. Three of them —
// 'grounds', 'bowl' — deliberately draw no building at all, because a quad
// and a playing field are not buildings and drawing a roof on them would be
// a lie the map would then have to keep telling.
//
// Nothing here is mechanical. A motif reads `kind` and `facilityType`,
// which already decide the tint, and changes no outcome whatsoever.

export type Motif =
  | 'hall'         // academic halls: the campus's landmarks — gable, colonnade, ranked windows
  | 'residential'  // dorms: flat roof, dense repeated window grid, one central door
  | 'portico'      // library / performing arts / gallery: a columned front
  | 'pavilion'     // student centre, dining, health, grocery: a canopy over a wide entrance
  | 'hangar'       // rec centre, gym, arena, natatorium: a barrel roof over a clear span
  | 'works'        // labs: flat roof, rooftop stacks, utilitarian
  | 'grounds'      // quad, field, courts, diamond, pool: open ground with markings, NOT a building
  | 'bowl';        // the football stadium: a rim around a pitch

// Which motif each facility type wears. Every FacilityType in
// CampusMap.tsx's FACILITY_TINT_ORDER appears here exactly once.
const FACILITY_MOTIFS: Record<FacilityType, Motif> = {
  library: 'portico',
  studentCenter: 'pavilion',
  diningHall: 'pavilion',
  recCenter: 'hangar',
  healthCenter: 'pavilion',
  quad: 'grounds',
  lab: 'works',
  gym: 'hangar',
  tennisCourts: 'grounds',
  // The rec pool is an open-air pool deck; the natatorium is a roofed
  // competition venue. Same water, different building — which is the same
  // distinction styles.css already draws between their two blues.
  pool: 'grounds',
  performingArtsCenter: 'portico',
  artGallery: 'portico',
  athleticsField: 'grounds',
  athleticsArena: 'hangar',
  athleticsDiamond: 'grounds',
  athleticsNatatorium: 'hangar',
  footballStadium: 'bowl',
  grocery: 'pavilion',
};

export function motifOf(t: Buildable): Motif {
  if (t.kind === 'building') return 'hall';
  if (t.kind === 'dorm') return 'residential';
  if (t.kind === 'facility' && t.facilityType) return FACILITY_MOTIFS[t.facilityType] ?? 'pavilion';
  return 'pavilion';
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Every motif is laid out from the same three bands so that a campus of
// mixed kinds still reads as one place: a roof along the top, a plinth along
// the bottom, and the facade between them. Proportional to the footprint (a
// 9x9 hall and a 3x3 lab are wildly different sizes) but clamped at both
// ends, so the roof of the smallest building is still a roof and the roof of
// the largest is still a band rather than half the building.
interface Bands { roofH: number; baseH: number; }
function bandsFor(height: number): Bands {
  return { roofH: clamp(height * 0.16, 5, 38), baseH: clamp(height * 0.09, 4, 22) };
}

// The label's own horizontal band, which windows must not be drawn into —
// the name is centred in the building (see CampusMap.tsx's labelFor) and a
// window behind a letter reads as neither. Excluded across the FULL width
// rather than just the text's own box: a facade with one clear band across
// its middle reads as a building carrying a sign, which is the right answer
// anyway, and it avoids having to measure rendered text.
export interface LabelBand { top: number; bottom: number; }

// A grid of windows across the facade, skipping any row that would collide
// with the label band. Counts are derived from the space available rather
// than fixed, so a 3x3 lab gets a couple of windows and a 9x9 hall gets
// ranks of them, with the same code and the same apparent window size.
function windowRects(
  x: number, y: number, width: number, height: number,
  { roofH, baseH }: Bands, label: LabelBand | null,
  opts: { cell?: number; gap?: number; maxCols?: number; maxRows?: number; bottomInset?: number } = {},
): { x: number; y: number; w: number; h: number }[] {
  const cell = opts.cell ?? 18;
  const gap = opts.gap ?? 16;
  const left = x + gap;
  const right = x + width - gap;
  const top = y + roofH + gap * 0.6;
  const bottom = y + height - baseH - gap * 0.6 - (opts.bottomInset ?? 0);
  const availW = right - left;
  const availH = bottom - top;
  if (availW < cell || availH < cell) return [];

  // FIXED pitch, then the whole block centred — not a count stretched to
  // fill the space. Stretching is what makes a large facade read as sparse
  // polka dots: on a 9x9 hall it spaces six rows ~90px apart, so the windows
  // stop being a facade and become scattered marks. At a fixed pitch a big
  // building simply gets more ranks of the same window, which is what makes
  // it look like a bigger building rather than the same building enlarged.
  const pitch = cell + gap;
  const cols = clamp(Math.floor((availW + gap) / pitch), 1, opts.maxCols ?? 9);
  const rows = clamp(Math.floor((availH + gap) / pitch), 1, opts.maxRows ?? 6);
  const blockW = cols * pitch - gap;
  const blockH = rows * pitch - gap;
  const startX = left + (availW - blockW) / 2;
  const startY = top + (availH - blockH) / 2;

  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const wy = startY + r * pitch;
    // Whole row dropped if it meets the label band — a half-row of windows
    // stopping either side of the name looks like a mistake, a clear band
    // looks intentional.
    if (label && wy < label.bottom + 3 && wy + cell > label.top - 3) continue;
    for (let c = 0; c < cols; c++) {
      out.push({ x: startX + c * pitch, y: wy, w: cell, h: cell * 0.78 });
    }
  }
  return out;
}

// The doorway every roofed motif shares, centred on the plinth.
function Entrance({ x, y, width, height, baseH }: {
  x: number; y: number; width: number; height: number; baseH: number;
}) {
  const dw = clamp(width * 0.13, 9, 38);
  const dh = clamp(baseH * 1.5, 7, 30);
  return (
    <rect
      className="motif-door"
      x={x + width / 2 - dw / 2}
      y={y + height - dh}
      width={dw}
      height={dh}
      rx={Math.min(2, dw / 4)}
    />
  );
}

// Vertical bars reading as columns, centred under a portico or a hall's
// entrance. Count scales with width so a broad front gets a real colonnade
// and a narrow one gets a modest pair.
// The colonnade's own height, exported so the motifs that use one can keep
// their windows above it rather than letting the two overlap.
export function colonnadeHeight(height: number): number {
  return clamp(height * 0.2, 8, 58);
}

function Columns({ x, y, width, height, baseH, span }: {
  x: number; y: number; width: number; height: number; baseH: number; span: number;
}) {
  const colW = clamp(width * 0.03, 2.5, 9);
  const colH = colonnadeHeight(height);
  const bandW = width * span;
  const count = clamp(Math.round(bandW / (colW * 3.2)), 2, 9);
  const left = x + (width - bandW) / 2;
  const step = count > 1 ? (bandW - colW) / (count - 1) : 0;
  const top = y + height - baseH - colH;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} className="motif-column" x={left + i * step} y={top} width={colW} height={colH} />
      ))}
    </>
  );
}

// Open ground: no roof, no windows. An inset boundary plus one marking that
// says which kind of ground it is. These are the Buildables a player walks
// across rather than into.
function Grounds({ x, y, width, height, facilityType }: {
  x: number; y: number; width: number; height: number; facilityType?: FacilityType;
}) {
  const inset = clamp(Math.min(width, height) * 0.09, 4, 22);
  const ix = x + inset;
  const iy = y + inset;
  const iw = width - inset * 2;
  const ih = height - inset * 2;
  const cx = x + width / 2;
  const cy = y + height / 2;
  if (iw <= 0 || ih <= 0) return null;

  return (
    <>
      <rect className="motif-ground-edge" x={ix} y={iy} width={iw} height={ih} rx={3} />
      {facilityType === 'athleticsField' && (
        <>
          <line className="motif-ground-line" x1={cx} y1={iy} x2={cx} y2={iy + ih} />
          <ellipse className="motif-ground-line" cx={cx} cy={cy} rx={Math.min(iw, ih) * 0.17} ry={Math.min(iw, ih) * 0.17} />
        </>
      )}
      {facilityType === 'tennisCourts' && (
        <>
          <line className="motif-ground-line" x1={cx} y1={iy} x2={cx} y2={iy + ih} />
          <line className="motif-ground-line" x1={ix} y1={cy} x2={ix + iw} y2={cy} />
        </>
      )}
      {facilityType === 'athleticsDiamond' && (
        // A ball diamond reads from its infield: a square stood on one
        // corner, tucked into the lower half the way a real one sits.
        <polygon
          className="motif-ground-line"
          points={[
            `${cx},${cy + ih * 0.30}`,
            `${cx - iw * 0.22},${cy}`,
            `${cx},${cy - ih * 0.30}`,
            `${cx + iw * 0.22},${cy}`,
          ].join(' ')}
        />
      )}
      {facilityType === 'quad' && (
        // Crossed walks: the one piece of ground on campus whose whole point
        // is that people cut across it.
        <>
          <line className="motif-ground-line" x1={ix} y1={iy} x2={ix + iw} y2={iy + ih} />
          <line className="motif-ground-line" x1={ix + iw} y1={iy} x2={ix} y2={iy + ih} />
          <circle className="motif-ground-medallion" cx={cx} cy={cy} r={Math.min(iw, ih) * 0.13} />
        </>
      )}
      {facilityType === 'pool' && (
        <rect
          className="motif-water"
          x={cx - iw * 0.3}
          y={cy - ih * 0.26}
          width={iw * 0.6}
          height={ih * 0.52}
          rx={3}
        />
      )}
    </>
  );
}

// The motif for one placed Buildable, drawn inside the body rect's own
// bounds. Geometry only — every colour is a class (see styles.css's
// "building motifs" block).
export default function BuildingMotif({ t, x, y, width, height, corner, label }: {
  t: Buildable;
  x: number; y: number; width: number; height: number;
  // The body rect's own corner radius. The roof and plinth bands are the
  // only parts that reach the building's edge, so they carry it too and the
  // whole motif needs no clip path to stay inside a rounded body.
  corner: number;
  label: LabelBand | null;
}) {
  const motif = motifOf(t);
  const bands = bandsFor(height);
  const { roofH, baseH } = bands;
  // Below this the footprint is only a few pixels on screen and every part
  // below would collapse into mud. Nothing is drawn rather than something
  // illegible. (This is a check on the footprint's own drawn size, not on
  // zoom — the map's zoom is a transform, so it never reaches this code.)
  if (width < 40 || height < 34) return null;

  const plinth = (
    <rect className="motif-plinth" x={x} y={y + height - baseH} width={width} height={baseH} rx={corner} />
  );

  switch (motif) {
    case 'grounds':
      return <Grounds x={x} y={y} width={width} height={height} facilityType={t.facilityType} />;

    case 'bowl': {
      // The stadium: a thick rim around a pitch. The one Buildable with a
      // larger footprint than an academic hall, and it should read as the
      // landmark it is without borrowing a hall's own shape.
      const rim = clamp(Math.min(width, height) * 0.12, 6, 34);
      const pitchW = (width - rim * 3) * 0.78;
      const pitchH = (height - rim * 3) * 0.62;
      return (
        <>
          <rect className="motif-rim" x={x + rim * 0.5} y={y + rim * 0.5} width={width - rim} height={height - rim} rx={rim} strokeWidth={rim} />
          {/* The playing surface is RECTANGULAR — it is a football field.
              An ellipse here read as one enormous egg filling the bowl
              rather than as a pitch with a track around it. */}
          <rect
            className="motif-pitch"
            x={x + width / 2 - pitchW / 2}
            y={y + height / 2 - pitchH / 2}
            width={pitchW}
            height={pitchH}
            rx={3}
          />
          <line className="motif-ground-line" x1={x + width / 2} y1={y + height / 2 - pitchH / 2} x2={x + width / 2} y2={y + height / 2 + pitchH / 2} />
        </>
      );
    }

    case 'hall': {
      // A gable over a colonnade: the most formal front on the map, and the
      // only motif with a pediment.
      const gableW = clamp(width * 0.34, 26, 190);
      const gableH = clamp(roofH * 0.9, 6, 30);
      const cx = x + width / 2;
      return (
        <>
          <rect className="motif-roof" x={x} y={y} width={width} height={roofH} rx={corner} />
          {/* Inside the roof band, never above it: a triangle poking out
              of the body would read as a shape escaping its box, not as a
              pediment, on a map drawn straight down. */}
          <polygon
            className="motif-pediment"
            points={`${cx},${y + roofH - gableH} ${cx + gableW / 2},${y + roofH} ${cx - gableW / 2},${y + roofH}`}
          />
          {plinth}
          {windowRects(x, y, width, height, bands, label, {
            cell: 16, gap: 14, maxCols: 16, maxRows: 14, bottomInset: colonnadeHeight(height) + 6,
          }).map((w, i) => (
            <rect key={i} className="motif-window" x={w.x} y={w.y} width={w.w} height={w.h} rx={1.5} />
          ))}
          <Columns x={x} y={y} width={width} height={height} baseH={baseH} span={0.34} />
          <Entrance x={x} y={y} width={width} height={height} baseH={baseH} />
        </>
      );
    }

    case 'residential': {
      // Dorms are long and shallow (9x3), so their windows are the motif:
      // dense, evenly ranked, the same window over and over. Tighter cell
      // and gap than a hall's on purpose — a residence hall's facade is
      // repetition, an academic hall's is proportion.
      return (
        <>
          <rect className="motif-roof" x={x} y={y} width={width} height={roofH * 0.7} rx={corner} />
          {plinth}
          {windowRects(x, y, width, height, { roofH: roofH * 0.7, baseH }, label, {
            cell: 13, gap: 11, maxCols: 16, maxRows: 6,
          }).map((w, i) => (
            <rect key={i} className="motif-window" x={w.x} y={w.y} width={w.w} height={w.h} rx={1} />
          ))}
          <Entrance x={x} y={y} width={width} height={height} baseH={baseH} />
        </>
      );
    }

    case 'portico': {
      return (
        <>
          <rect className="motif-roof" x={x} y={y} width={width} height={roofH} rx={corner} />
          {plinth}
          {windowRects(x, y, width, height, bands, label, {
            cell: 15, gap: 14, maxCols: 12, maxRows: 8, bottomInset: colonnadeHeight(height) + 6,
          }).map((w, i) => (
            <rect key={i} className="motif-window" x={w.x} y={w.y} width={w.w} height={w.h} rx={1.5} />
          ))}
          <Columns x={x} y={y} width={width} height={height} baseH={baseH} span={0.58} />
          <Entrance x={x} y={y} width={width} height={height} baseH={baseH} />
        </>
      );
    }

    case 'pavilion': {
      // A canopy over a wide entrance: the everyday front door of campus
      // life — dining, the student centre, the clinic, the shop.
      const canopyW = clamp(width * 0.44, 30, 240);
      const canopyH = clamp(height * 0.055, 3, 14);
      return (
        <>
          <rect className="motif-roof" x={x} y={y} width={width} height={roofH * 0.8} rx={corner} />
          {plinth}
          {windowRects(x, y, width, height, { roofH: roofH * 0.8, baseH }, label, { cell: 14, gap: 13, maxCols: 12, maxRows: 8 }).map((w, i) => (
            <rect key={i} className="motif-window" x={w.x} y={w.y} width={w.w} height={w.h} rx={1.5} />
          ))}
          <rect
            className="motif-canopy"
            x={x + width / 2 - canopyW / 2}
            y={y + height - baseH - canopyH * 2.2}
            width={canopyW}
            height={canopyH}
            rx={canopyH / 2}
          />
          <Entrance x={x} y={y} width={width} height={height} baseH={baseH} />
        </>
      );
    }

    case 'hangar': {
      // A clear-span roof over a big room: gyms, courts, rinks, pools. The
      // roof is the whole idea, so it takes a deeper band and a rounded top,
      // and the windows sit high in a clerestory strip rather than ranked
      // down the facade.
      const barrelH = clamp(height * 0.26, 9, 62);
      const stripH = clamp(height * 0.06, 3, 13);
      const stripY = y + barrelH + clamp(height * 0.04, 2, 12);
      const stripInset = clamp(width * 0.1, 6, 40);
      const showStrip = label === null || stripY + stripH < label.top - 3;
      return (
        <>
          <rect className="motif-barrel" x={x} y={y} width={width} height={barrelH} rx={Math.min(barrelH, width / 2)} />
          {plinth}
          {showStrip && (
            <rect className="motif-window" x={x + stripInset} y={stripY} width={width - stripInset * 2} height={stripH} rx={stripH / 2} />
          )}
          <Entrance x={x} y={y} width={width} height={height} baseH={baseH} />
        </>
      );
    }

    case 'works': {
      // The lab: the smallest footprint on campus (3x3) and the plainest
      // front. Two roof stacks are the whole character — utilitarian, and
      // legible even at this size where a colonnade would be a smudge.
      const stackW = clamp(width * 0.07, 2.5, 8);
      const stackH = clamp(height * 0.1, 4, 16);
      const roofY = y + roofH * 0.7;
      return (
        <>
          <rect className="motif-roof" x={x} y={y} width={width} height={roofH * 0.7} rx={corner} />
          <rect className="motif-stack" x={x + width * 0.24} y={roofY - stackH} width={stackW} height={stackH} />
          <rect className="motif-stack" x={x + width * 0.66} y={roofY - stackH * 0.7} width={stackW} height={stackH * 0.7} />
          {plinth}
          {windowRects(x, y, width, height, { roofH: roofH * 0.7, baseH }, label, {
            cell: 12, gap: 12, maxCols: 4, maxRows: 2,
          }).map((w, i) => (
            <rect key={i} className="motif-window" x={w.x} y={w.y} width={w.w} height={w.h} rx={1} />
          ))}
          <Entrance x={x} y={y} width={width} height={height} baseH={baseH} />
        </>
      );
    }
  }
}
