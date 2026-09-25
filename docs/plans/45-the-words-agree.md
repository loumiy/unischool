# Plan 45 — The words agree

*Planning document only. Its job is to turn the review into a PR.*

**Status: Landed.**

---

## 0. The report, and what was found

A read of every player-facing string found text that was assembled wrong,
text that said something the code does not do, and text that called one
thing by several names.

- **Placeholders filled badly.** The catalog's `{class}` filled "the class
  of 7" into texts that already wrote "the", so the player read "the the
  class of 7". `{sport}` kept the team name's "Team" ("The Men's Soccer Team
  team"). `{school}` was a founded school's name ("Science has appeared in a
  guidebook") or a lower-case "the college". `{building}` could be a quad, a
  statue or a tennis court ("A section of roof has come off Campus Quad").
- **Lines assembled wrong.** "An new exhibited work", "The The Housing
  Campaign is launched", "sits out this season's postseason's and next",
  "no of X and Y would fill them", "1 years", "withdraws in 1 weeks", "the
  Party School" where the guidebooks mean "a party school".
- **Text that contradicted the code.** Promises whose goals did not match
  their titles ("Thirty scholars" kept at twenty-four); a schools promise
  that assumed exactly one school; a petition "more students than the
  college has" at any size; a mascot event after the teams were named; a
  week-9 letter asserting no library and no dining hall whatever stood;
  the year in review counting every money line as a closed endowment
  campaign; the final report calling interim-CFO appointments years; the
  prestige hints describing a weekly drift toward selectivity and faculty
  (prestige is graded each summer and stepped toward the grade, with a
  small drift between, and neither is an input); the Treasury saying
  nothing can start that cash cannot pay for (a campaign's building fund, a
  loan and, for a capital project, the endowment's half can pay); a library
  renovation said to serve no one while its new story goes up.
- **One thing, several names.** The player's institution was "the
  university" and "the school" before any charter; the rankings were "U.S.
  News", a real publication; offices were sometimes lower case; housing was
  "dorm" and "student housing hall"; the bottom distress rung was
  "Receivership" and "the receivers"; campus life was also "Student
  experience" and "Campus-life standing"; petitions were answered "at summer
  admissions" and "in the Students beat". Spelling mixed American and
  British.

## 1. The PR

- **Placeholders** (`systems/events/catalogue.ts`): `{class}` fills "class
  of N" (or "first class"); `{sport}` drops " Team" (fallback
  "intramural"); `{school}` is `institutionName(s.self)`; `{building}` is
  only a roofed building (no open ground, courts, pool deck, stadium bowl or
  ornament; the chapel counts), with a leading "The" lowered mid-sentence.
- **Two gates** in the catalog's vocabulary: the dining petition takes
  `enrolledUnder: 1100`, and a new `mascotAtMost` reading (1 once the teams
  are named) keeps the mascot event to a college with no mascot.
- **Assembly and plurals** fixed where they were built: research, campaigns,
  the chronicle, the final report, coach retirements, the Treasury, faculty
  listings, the opening coach, the campaign panel, the demand asks ("the
  Library").
- **Mechanics told truthfully**: the promise goals match their titles
  (thirty, twelve, two thousand, twenty; the catalog promise names the
  eleven it checks; the schools promise names no count); the week-9 letter
  names only what is missing; the year in review counts campaign closing
  lines; the prestige hints, the Treasury and the build notes say what the
  code does.
- **One name each**: "the college" (or its name) for the player's
  institution; "the guide"; President, Registrar, Bursar, Provost, Athletic
  Director, Facilities Director, Dean of Students, Admissions, the
  Communications Office; residence hall; the interim CFO; Campus life and
  Athletic standing; the summer's Students beat; build menu; add a story;
  the Hellenic Council; program, not major; "Year N".
- **Spelling**: American, always (the owner's call). All player-facing
  text, docs and code comments; identifiers and save field names stay as
  they are, since renaming a save field needs a version bump and a
  migration. The catalog test pins American spelling.
- **Quotes**: curly quotes and `&rsquo;` become straight ASCII.

**As implemented:** everything above. The text in files Plan 43 was
editing at the same time follows the same rules there:
- `engine/reducer.ts`: "The Athletics tab is now open", "The charter is
  declined", the Athletic Director, straight quotes;
- `components/CampusMap.tsx`: the map help no longer calls paths purely
  decorative or the college "the university";
- the founding faculty's bios in `state/actions.ts`.

`BoardLetter.tsx` still prints the current year, because a letter is
stored as an id with no year; it is left as it is. `rollVars` no longer
rolls a random founded school for `{school}`, so the catalog's variable
rolls draw one fewer random number, and seeded runs differ slightly from
before.

Spelling was British at first, then American on the owner's word: the last
commit converts every string with a space in it, JSX text and comment by
walking each file's syntax tree, so no identifier, id or class name moves.

The slow suites fail two checks here beyond Plan 43's: the Earnest
completionist never finishes the whole catalog on any of the three seeds,
and the Regional engine ends insolvent on two of three. `{school}` no
longer rolling a random school shifts every later catalog roll, and the
harness is that sensitive (the review's Q16). The owner chose to merge
with these open; the harness plan re-fits them.
