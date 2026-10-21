import type { QualityBand } from '../systems/admissions/admissionsSystem';

// ---------------------------------------------------------------------
// The admissions page's applicants as a cloud of dots (Plan 108): the
// pool's three quality bands drawn on a GPA by SAT plot, best first, so
// the admit rate reads as a line across the cloud. Nothing here decides
// anything. The funnel admits the best of the pool first
// (admissionsSystem.ts's projectAdmissions), so admitting the top share of
// the dots IS the admit rate: the line and the rate are one choice read two
// ways, and the commit sends the rate as before.
//
// A dot's composite (0..1) is its quality; its SAT and GPA are spread
// along the line of equal composite, so the mean of the two always
// returns it and a straight diagonal is exactly a cut on quality.
// ---------------------------------------------------------------------

export interface ApplicantDot {
  comp: number;   // 0..1, the cut's reading
  sat: number;    // 0..1 along the SAT axis
  gpa: number;    // 0..1 along the GPA axis
  cohort: number; // index into the cohorts it was coloured by
}

export interface ApplicantCloud {
  per: number;           // applicants each dot stands for
  dots: ApplicantDot[];  // best first
  seatDots: number;      // the seats left, in dots
}

// The most dots drawn, so a pool of fifty thousand stays a cloud.
export const MAX_DOTS = 400;

// Each band's slice of the composite scale, best first.
const BAND_RANGE: Record<QualityBand, [number, number]> = {
  top: [0.7, 0.97],
  mid: [0.42, 0.7],
  low: [0.08, 0.42],
};
const BANDS: QualityBand[] = ['top', 'mid', 'low'];

// A small seeded stream (mulberry32), so a summer's cloud holds still
// while the line moves.
function stream(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The cloud for a pool: `bands` the pool by band, `cohorts` its applicants
// by cohort (any order; only the shares are read), `seatsLeft` the room.
// One scale for both, so a dot that flows into the hall is one seat.
export function applicantCloud(bands: Record<QualityBand, number>, cohorts: readonly number[], seatsLeft: number, seed: number): ApplicantCloud {
  const applicants = BANDS.reduce((n, b) => n + Math.max(0, bands[b]), 0);
  const per = Math.max(1, Math.ceil(Math.max(applicants, seatsLeft) / MAX_DOTS));
  const rnd = stream(seed);
  const dots: ApplicantDot[] = [];
  for (const band of BANDS) {
    const n = Math.round(Math.max(0, bands[band]) / per);
    const [lo, hi] = BAND_RANGE[band];
    for (let i = 0; i < n; i += 1) {
      const comp = lo + (hi - lo) * rnd();
      // Spread along the line sat + gpa = 2·comp, inside the plot.
      // A band, not a square: the two scores go together.
      const room = Math.min(comp, 1 - comp, 0.22) * 0.9;
      const sat = comp + (rnd() * 2 - 1) * room;
      dots.push({ comp, sat, gpa: 2 * comp - sat, cohort: 0 });
    }
  }
  dots.sort((x, y) => y.comp - x.comp);
  // Cohorts dealt in proportion, in a shuffled order so colour doesn't
  // band with quality.
  const total = cohorts.reduce((n, c) => n + Math.max(0, c), 0);
  const deck: number[] = [];
  if (total > 0) {
    cohorts.forEach((c, i) => { for (let k = 0; k < Math.round((Math.max(0, c) / total) * dots.length); k += 1) deck.push(i); });
  }
  while (deck.length < dots.length) deck.push(0);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  dots.forEach((d, i) => { d.cohort = deck[i]; });
  return { per, dots, seatDots: Math.floor(seatsLeft / per) };
}

// How many dots an admit rate takes, best first.
export function admittedDots(cloud: ApplicantCloud, rate: number): number {
  return Math.max(0, Math.min(cloud.dots.length, Math.round(rate * cloud.dots.length)));
}

// The admit rate a line at composite `c` takes: the share at or above it.
export function rateForCut(cloud: ApplicantCloud, c: number): number {
  if (cloud.dots.length === 0) return 0;
  return cloud.dots.filter((d) => d.comp >= c).length / cloud.dots.length;
}

// Where the line sits for an admit rate: between the last dot taken and
// the first left out.
export function cutForRate(cloud: ApplicantCloud, rate: number): number {
  const k = admittedDots(cloud, rate);
  const { dots } = cloud;
  if (dots.length === 0) return 0.5;
  if (k <= 0) return Math.min(0.99, dots[0].comp + 0.01);
  if (k >= dots.length) return Math.max(0.01, dots[dots.length - 1].comp - 0.01);
  return (dots[k - 1].comp + dots[k].comp) / 2;
}

// The axes' readings: SAT 400–1600, GPA 2.0–4.0.
export const satOf = (v: number) => Math.round((400 + v * 1200) / 10) * 10;
export const gpaOf = (v: number) => 2 + v * 2;
