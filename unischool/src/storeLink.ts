// THE STORE PAGE (Plan 117G). The game's page on a store (Steam, from the
// day it goes up), named by the build: VITE_STORE_URL, which release.yml
// fills from the repository variable STORE_PAGE_URL. Unset, empty or not
// an https address, there is no link anywhere, so the link lands before
// the page and shows nothing until the page exists. Opening it is not
// counted (Plan 117 §3: no analytics on the store link).

const env = (import.meta as ImportMeta & { env?: { VITE_STORE_URL?: string } }).env;

export function storeUrlFrom(set: string | undefined): string | null {
  const raw = set?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
export const STORE_URL: string | null = storeUrlFrom(env?.VITE_STORE_URL);

export const STORE_LINK_LABEL = 'Wishlist on Steam';

export function openStorePage(): void {
  if (!STORE_URL) return;
  try {
    window.open(STORE_URL, '_blank', 'noopener,noreferrer');
  } catch {
    // A browser that refuses: nothing lost.
  }
}
