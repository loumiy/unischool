import { useEffect, useRef, useState } from 'react';
import ConfirmButton from './ConfirmButton';
import type { HallEntry } from '../state/hall';
import { CARD_HEIGHT, CARD_WIDTH, reportCardSummary, reportCardSvg } from '../state/reportCard';
import { reportShared } from '../analytics/analytics';
import { siteUrl } from '../build';

// The report card's two buttons (Plan 70J): Download card renders the card's
// SVG (state/reportCard.ts) to a PNG in the browser and saves it, nothing
// uploaded; Copy summary puts one line on the clipboard with the site's
// address. Where the browser will not let the page write the clipboard
// (Chrome inside itch.io's frame, Plan 97D), the line is shown selected,
// to copy by hand.

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'college';

async function downloadCard(entry: HallEntry): Promise<void> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(reportCardSvg(entry, siteUrl().host))}`;
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

// The shortcut to copy, as this keyboard has it.
const copyKeys = () => (/Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '') ? '⌘C' : 'Ctrl+C');

export default function ReportCardActions({ entry }: { entry: HallEntry }) {
  const [said, setSaid] = useState<string | null>(null);
  // The line, shown to copy by hand when the clipboard is refused.
  const [manual, setManual] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { box.current?.select(); }, [manual]);
  const copy = async () => {
    const line = reportCardSummary(entry, siteUrl().origin);
    try {
      await navigator.clipboard.writeText(line);
      setManual(null);
      setSaid('Copied.');
      reportShared('copy');
    } catch {
      setManual(line);
      setSaid(null);
    }
  };
  return (
    <div className="report-card-actions">
      <button type="button" onClick={() => { reportShared('download'); void downloadCard(entry).catch(() => setSaid('The card could not be drawn.')); }}>Download card</button>
      <button type="button" onClick={() => { void copy(); }}>Copy summary</button>
      {said && <span className="report-card-said" role="status">{said}</span>}
      {manual && (
        <label className="report-card-manual">
          <span>Press {copyKeys()} to copy:</span>
          <input
            ref={box}
            readOnly
            value={manual}
            onFocus={(e) => e.currentTarget.select()}
            onCopy={() => reportShared('copy')}
          />
        </label>
      )}
    </div>
  );
}

// Play again (Plan 70J), through ConfirmButton like every loss (Plan 47):
// armed, it names what ends (`lost`) and the note says the rest; blur or
// Escape stays. With nothing to lose it acts on the first click.
export function NewCollegeButton({ onConfirm, note, lost }: { onConfirm: () => void; note: string; lost?: string }) {
  return (
    <ConfirmButton
      className="new-college-btn"
      label="New game"
      armedLabel={`Confirm — ${lost ?? 'a new game'}`}
      warning={note}
      needsConfirm={lost !== undefined}
      onConfirm={onConfirm}
    />
  );
}
