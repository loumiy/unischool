import type { CSSProperties } from 'react';

// A segmented choice drawn as a sliding switch (Plan 89): one sunken track,
// equal columns, and a thumb under the picked option. Give the .segmented
// element the `switch` class and this style; the thumb (styles.css's
// `.segmented.switch::before`) reads the option count and the picked index.
// Only for a short fixed set of levels that fits on one line: a choice of
// more than four, or one that wraps, keeps the pills.
export function switchStyle(count: number, picked: number): CSSProperties {
  return { '--seg-count': count, '--seg-index': picked } as CSSProperties;
}
