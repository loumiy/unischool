// A German browser, for number-format.test.ts: every locale-sensitive
// formatter that is not told a locale answers in de-DE, as it would in a
// player's browser set to German. Imported first, so it is in place before
// src/format.ts builds its formatters.

const GERMAN = 'de-DE';

const toLocaleString = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (this: number, locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) {
  return toLocaleString.call(this, locales ?? GERMAN, options);
};

const toLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (this: Date, locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
  return toLocaleDateString.call(this, locales ?? GERMAN, options);
};

const NumberFormat = Intl.NumberFormat;
const DateTimeFormat = Intl.DateTimeFormat;
Intl.NumberFormat = new Proxy(NumberFormat, {
  construct: (target, [locales, options]) => new target(locales ?? GERMAN, options),
  apply: (target, _this, [locales, options]) => target(locales ?? GERMAN, options),
});
Intl.DateTimeFormat = new Proxy(DateTimeFormat, {
  construct: (target, [locales, options]) => new target(locales ?? GERMAN, options),
  apply: (target, _this, [locales, options]) => target(locales ?? GERMAN, options),
});

export const GERMAN_BROWSER = GERMAN;
