// How the game writes numbers and names, shared by every screen.

// Whole dollars with thousands separators. A negative figure takes a true
// minus sign before the dollar sign: −$5,000.
export function money(v: number): string {
  const whole = Math.round(v);
  return `${whole < 0 ? '−' : ''}$${Math.abs(whole).toLocaleString()}`;
}

// A share (0..1) as whole percent: 0.42 → "42%".
export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

// A change (0.34 = up 34%) as signed whole points: "+34%", "−3%". A move
// that rounds to zero reads "0%", not "+0%".
export function signedPct(change: number): string {
  const points = Math.round(change * 100);
  if (points === 0) return '0%';
  return `${points > 0 ? '+' : '−'}${Math.abs(points)}%`;
}

// 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st.
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// "Prof. Ada Okafor" → "Okafor".
export function surnameOf(name: string): string {
  const parts = name.replace(/^(Dr|Prof|Professor)\.?\s+/, '').split(' ');
  return parts[parts.length - 1];
}

// Money at the grain a scan or a chart axis needs: "$180k", "$4.0M", "$12M".
export function moneyShort(v: number): string {
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}
