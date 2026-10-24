// ---------------------------------------------------------------------
// The founding form (components/StartupScreen.tsx, Plan 114G): the card is
// a <form>, and "Open the doors" is its one submit, so Enter in the name
// founds. Every other button on the card is type="button", so Enter never
// presses one of them, and the submit is disabled until there is a name,
// so Enter founds only when the button would.
//
// Not part of the game: nothing imports it. Run with `npm test`.
// ---------------------------------------------------------------------

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

let checks = 0;
let failures = 0;
function assert(cond: boolean, msg: string): void {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const { default: StartupScreen } = await import('../src/components/StartupScreen');
const html = renderToStaticMarkup(createElement(StartupScreen, { onStart: () => {}, onBack: () => {} }));

const form = html.match(/<form\b[^>]*>/)?.[0] ?? '';
assert(form.includes('class="startup-card"'), 'the card is a form');
const buttons = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs)].map((m) => ({ attrs: m[1], text: m[2].replace(/<[^>]+>/g, '') }));
const submits = buttons.filter((b) => !/type="button"/.test(b.attrs));
assert(submits.length === 1 && submits[0].text.trim() === 'Open the doors', `"Open the doors" is the one submit (${submits.map((b) => b.text.trim()).join(', ')})`);
assert(/type="submit"/.test(submits[0]?.attrs ?? ''), 'and says so');
assert(/disabled/.test(submits[0]?.attrs ?? ''), 'with no name it is disabled, so Enter founds nothing');
assert(buttons.length > 1, 'the other buttons are on the card too');

console.log(`startup-form: ${checks} checks, ${failures} failures`);
if (failures > 0) process.exit(1);
