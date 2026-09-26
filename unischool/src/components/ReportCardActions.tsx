import { useState } from 'react';
import type { HallEntry } from '../state/hall';
import { CARD_HEIGHT, CARD_WIDTH, reportCardSummary, reportCardSvg } from '../state/reportCard';

// The report card's two buttons (Plan 70J): Download card renders the card's
// SVG (state/reportCard.ts) to a PNG in the browser and saves it, nothing
// uploaded; Copy summary puts one line on the clipboard with the site's
// address.

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'college';

async function downloadCard(entry: HallEntry): Promise<void> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(reportCardSvg(entry, window.location.host))}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  canvas.getContext('2d')?.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(entry.college)}-report-card.png`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function ReportCardActions({ entry }: { entry: HallEntry }) {
  const [said, setSaid] = useState<string | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportCardSummary(entry, window.location.origin));
      setSaid('Copied.');
    } catch {
      setSaid('The browser would not copy it.');
    }
  };
  return (
    <div className="report-card-actions">
      <button type="button" onClick={() => { void downloadCard(entry).catch(() => setSaid('The card could not be drawn.')); }}>Download card</button>
      <button type="button" onClick={() => { void copy(); }}>Copy summary</button>
      {said && <span className="report-card-said" role="status">{said}</span>}
    </div>
  );
}

// Play again (Plan 70J): confirmed first, since carrying on into the
// Epilogue (or back to a run in progress) is also a choice.
export function NewCollegeButton({ onConfirm, note }: { onConfirm: () => void; note: string }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="new-college-btn" onClick={() => setAsking(true)}>Found another college</button>;
  return (
    <div className="new-college-confirm" role="group" aria-label="Found another college">
      <p>{note}</p>
      <button type="button" className="primary" onClick={onConfirm}>Found another college</button>
      <button type="button" onClick={() => setAsking(false)}>Stay</button>
    </div>
  );
}
