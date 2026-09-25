# Plan 45 — The words agree

*Planning document only. Its job is to turn the review into a PR.*

**Status: In progress.**

---

## 0. The report, and what was found

A read of every player-facing string found text that was assembled wrong,
text that said something the code does not do, and text that called one
thing by several names.

- **Placeholders filled badly.** The catalogue's `{class}` filled "the class
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
  renovation said to serve no one while its new storey goes up.
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
- **Two gates** in the catalogue's vocabulary: the dining petition takes
  `enrolledUnder: 1100`, and a new `mascotAtMost` reading (1 once the teams
  are named) keeps the mascot event to a college with no mascot.
- **Assembly and plurals** fixed where they were built: research, campaigns,
  the chronicle, the final report, coach retirements, the Treasury, faculty
  listings, the opening coach, the campaign panel, the demand asks ("the
  Library").
- **Mechanics told truthfully**: the promise goals match their titles
  (thirty, twelve, two thousand, twenty; the catalogue promise names the
  eleven it checks; the schools promise names no count); the week-9 letter
  names only what is missing; the year in review counts campaign closing
  lines; the prestige hints, the Treasury and the build notes say what the
  code does.
- **One name each**: "the college" (or its name) for the player's
  institution; "the guide"; President, Registrar, Bursar, Provost, Athletic
  Director, Facilities Director, Dean of Students, Admissions, the
  Communications Office; residence hall; the interim CFO; Campus life and
  Athletic standing; the summer's Students beat; build menu; add a storey;
  the Hellenic Council; program, not major; "Year N".
- **Spelling**: British in prose, with "program", building names ending in
  "Center", tab names and course titles left as they are. The catalogue
  test that pinned American spelling now pins British.
- **Quotes**: curly quotes and `&rsquo;` become straight ASCII.

**As implemented:** everything above, except where the text lives in a file
another plan is editing: `engine/reducer.ts` ("The Athletics view is now
available.", "The trustees have declined the charter", the lower-case
athletic director lines, a curly-quoted log line), `components/CampusMap.tsx`
(the map help calls paths purely decorative and the college "the
university"), and the faculty bios in `state/actions.ts`, which still read
"research centers on". `BoardLetter.tsx` prints the current year because a
letter is stored as an id with no year; left as it is. `rollVars` no longer
rolls a random founded school for `{school}`, so the catalogue's variable
rolls draw one fewer random number.
