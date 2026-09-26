// Hands the player a file (Plan 70B): a save now, the report card later.
// Nothing leaves the browser; the file is built here and offered as a
// download.
export function downloadFile(filename: string, content: Blob | string, type = 'application/json'): void {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next turn, once the click has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
