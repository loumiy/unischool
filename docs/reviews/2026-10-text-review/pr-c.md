# Plan 111 PR C — The summer: before and after

Every player-facing string this PR changed. `{…}` marks a placeholder.

### The year in review (`state/yearInReview.ts`)

| Where (file · context) | Before | After |
|---|---|---|
| yearInReview.ts · Research | {n} research projects begun, {m} concluded | {n} research projects started, {m} finished |
| yearInReview.ts · Students, later summers | Satisfaction averaged {x} this year, against {y} last year ({±d}) | Satisfaction averaged {x} this year, compared with {y} last year ({±d}) |
| yearInReview.ts · Students, first summer | Satisfaction, how content the students are out of 100, averaged {x} this year: from now on it shows at the foot of the screen, and the Students tab opens on the needs it is made of | Satisfaction averaged {x} this year. Satisfaction is how happy your students are, out of 100. From now on it shows at the bottom of the screen, and the Students tab shows the needs behind it |
| yearInReview.ts · Students, petitions | {n} organizations petitioning for recognition | {n} student organizations asking to be recognized |
| yearInReview.ts · Students, who leaves | {n} students will not return this summer — {reason}, {reason} | {n} students won't come back next year. They wanted more {reason} and {reason}. |
| yearInReview.ts · Students, who leaves (no reason) | {n} students will not return this summer — a year averaging {x} | {n} students won't come back next year. Satisfaction averaged {x} this year. |
| yearInReview.ts · Money | Operating funds {$}, against {$} a year ago | Operating funds: {$}, compared with {$} a year ago |
| yearInReview.ts · Money, campaigns | {n} campaigns closed; the endowment stands at {$} | {n} campaigns closed. The endowment is now {$} |
| yearInReview.ts · Standing, grade | The year graded {score}: prestige {a} → {b} ({±d}) | This year's grade: {score}. Prestige {a} → {b} ({±d}) |
| yearInReview.ts · Standing, last year | A year ago prestige stood at {p} | Prestige a year ago: {p} |
| yearInReview.ts · Standing, passed | Passed this year by {rivals} | Passed you this year: {rivals} |
| yearInReview.ts · Events, a letter | {title}, a letter to the President: {choice} | {title}, a letter to the President: you chose “{choice}” |
| yearInReview.ts · Events, who answered | {n} answered by the President | you answered {n} |
| yearInReview.ts · Events, who answered | {n} by the administration | your administration answered {n} |
| yearInReview.ts · Events, who answered | {n} left unanswered, taking the usual course | {n} went unanswered and settled on its/their own |
| yearInReview.ts · Events, unanswered group | {n} matters left unanswered | {n} matters went unanswered |
| yearInReview.ts · Events, one unanswered | Left unanswered: {title} ({answer}) | Unanswered: {title} ({answer}) |
| yearInReview.ts · Events, empty | A quiet year: nothing reached the President's desk. | A quiet year. Nothing reached your desk. |
| yearInReview.ts · Graduating class | {n} seniors leave warm toward the college ({w} of 100) | {n} seniors leave warm toward your college ({w} of 100) |

### Summer log lines (`systems/admissions/resolveAdmissions.ts`)

| Where (file · context) | Before | After |
|---|---|---|
| resolveAdmissions.ts · admissions line | Admissions: tuition {$}/yr — {n} applicants, {p} admitted, {n} freshmen enrolled, {n} graduated. | Admissions: tuition {$}/yr. {n} applicants, {p} admitted, {n} freshmen enrolled, {n} graduated. |
| resolveAdmissions.ts · attrition line | {n} students did not return — {reason}, {reason}. | {n} students didn't come back. They wanted more {reason} and {reason}. |
| resolveAdmissions.ts · attrition line (no reason) | {n} students did not return — a year averaging {x} satisfaction. | {n} students didn't come back. Satisfaction averaged {x} last year. |
| resolveAdmissions.ts · class capped | The catalog had room for {n} more, so the class was held to {n}. | The catalog had room for only {n} more students, so the freshman class was capped at {n}. |
| resolveAdmissions.ts · report card | Report card for Year {y}: graded {score}. Prestige {a} → {b}. | Report card for Year {y}: grade {score}. Prestige {a} → {b}. |

### Admissions (`components/AdmissionsPage.tsx`, `systems/admissions/*`)

| Where (file · context) | Before | After |
|---|---|---|
| AdmissionsPage.tsx · price tag | a bargain for the college's prestige | a bargain for your prestige |
| AdmissionsPage.tsx · price tag | in line with the college's prestige | in line with your prestige |
| AdmissionsPage.tsx · price tag | more than the college's prestige supports | more than your prestige supports |
| AdmissionsPage.tsx · price tag | far above what the college's prestige supports | far above what your prestige supports |
| AdmissionsPage.tsx · fair position | — on the gentle side | — on the low side |
| AdmissionsPage.tsx · fair position | — at the top of it | — near the top |
| AdmissionsPage.tsx · plot, before the lock | Set the price to see who applies | Lock the price to see who applies |
| AdmissionsPage.tsx · slider label | Tuition a year, held for the class's four years | Tuition per year. This class pays it for all four years. |
| AdmissionsPage.tsx · tuition floor | The board holds tuition where it is: it may rise, not fall. | The board won't let you lower tuition this year. You can still raise it. |
| AdmissionsPage.tsx · locked | Locked for the class's four years. | Locked. This class pays it for all four years. |
| AdmissionsPage.tsx · pool change | {n} applicants, {±p} on last summer: … | {n} applicants, {±p} from last summer: … |
| AdmissionsPage.tsx · next thousand | The next thousand pay {$} each and cost {$}. | Each of the next thousand students pays {$} and costs {$}. |
| AdmissionsPage.tsx · who leaves | {n} won't return ({reason}, {reason}). | {n} students won't come back. They want more {reason} and {reason}. |
| yearOverYear.ts · pool factor | new pulls | what you offer |
| yearOverYear.ts · admit rate, held to the room | The admit rate opens at {p}, the most the seats left will hold (the founding rate / last summer's is {q}). | The admit rate starts at {p}, the most the places left will hold. The founding rate / Last summer's rate was {q}. |
| yearOverYear.ts · admit rate, first summer | The admit rate opens at the founding rate, {p}. | The admit rate starts at the founding rate, {p}. |
| yearOverYear.ts · admit rate, later | The admit rate opens where last summer set it, {p}. | The admit rate starts where you set it last summer, {p}. |
| yearOverYear.ts · beds full | …; admitting more crowds {n} beds. | … Next year's students already fill your {n} beds, so admitting more will crowd them. |
| cohorts.ts · price-sensitive driver | the price against what the college's prestige supports | your price against what your prestige supports |
| cohorts.ts · athletes note | {Title} is/are worth {n} athlete applicants. | {Title} brings/bring in {n} more athlete applicants. |

### The summer's other steps and the event modals (`components/InterruptModal.tsx`, `components/EventChoices.tsx`)

| Where (file · context) | Before | After |
|---|---|---|
| InterruptModal.tsx · fallback / missing decision event | The matter this concerned has lapsed. Nothing has changed. | This matter no longer applies. Nothing has changed. |
| InterruptModal.tsx · review, log cut short | The log no longer reaches back to its first weeks. | It was a busy year, and the log has lost its first few weeks. |
| InterruptModal.tsx · review, back-up | A browser can clear what a page keeps, after weeks unvisited or when a private window closes. | Your browser may delete this run if you don't visit for a while, or when a private window closes. |
| InterruptModal.tsx · Students step, none | No new student organization petitioned this year. | No new student organizations asked to be recognized this year. |
| InterruptModal.tsx · Standing | This year's standings: the college is #{n}. | This year's standings: you're #{n}. |
| InterruptModal.tsx · Standing, unpublished | The college ranks #{n} of {f}. | Your college ranks #{n} of {f}. |
| InterruptModal.tsx · Standing, passed by | Overtaken by: {rivals}. | Passed you: {rivals}. |
| InterruptModal.tsx · Standing, leader | no college in the country is ahead | no college is ahead of you |
| InterruptModal.tsx · first sport club | The {club} is the first of the college's sport clubs to be recognized. It plays intramurals for now; in a few years it may petition to go varsity, and there will be a department, a venue and a season behind it. The students have already started arguing about what the teams should be called — the colors are {college}'s own, but a name is something people shout. | The {club} is your college's first recognized sport club. It plays intramurals for now. In a few years it may ask to go varsity, with a department, a venue and a season behind it. The students are already arguing about what to call the teams. The colors are {college}'s own, but a name is something people shout. |
| InterruptModal.tsx · athletic director, one team | The college fields a varsity program now, and nobody is running it. | Your college has a varsity program now, and nobody is running it. |
| InterruptModal.tsx · athletic director, several | The college fields {n} varsity programs now, and nobody is running them. | Your college has {n} varsity programs now, and nobody is running them. |
| InterruptModal.tsx · chair's letter, skip | Skip the chair's letters from here on | Skip the rest of the chair's letters |
| InterruptModal.tsx · Deans' recommendations | Some courses have no instructor. The Deans have found who can take them. | Some courses have no professor. Your Deans have found people to teach them. |
| InterruptModal.tsx · Deans, a hire | (appointed from the market, {$}/yr) | (hired from the market, {$}/yr) |
| InterruptModal.tsx · Deans, Not now | the programs stay dark | those courses stay without a professor |
| InterruptModal.tsx · decision event, unaffordable | — the college cannot cover this. | — you can't afford this. |
| EventChoices.tsx · event answer, unaffordable | — the college cannot cover this. | — you can't afford this. |
| EventChoices.tsx · statue pledge | {$} to the building fund for the statue, to place | {$} to the building fund for the statue, which you then place |

### The Final Report and the report card (`data/reportData.ts`, `components/ReportCardActions.tsx`)

| Where (file · context) | Before | After |
|---|---|---|
| reportData.ts · money, rich | It left its successors far richer than it found itself: the endowment grew from {from} to {to}. | Your college left its successors far richer than it began. The endowment grew from {from} to {to}. |
| reportData.ts · money, steady | It kept its money: the endowment went from {from} to {to}. | Your college kept its money. The endowment went from {from} to {to}. |
| reportData.ts · money, poorer | It spent what it was given: the endowment went from {from} to {to}. | Your college spent what it was given. The endowment went from {from} to {to}. |
| reportData.ts · grade hint | The whole arc, not the last snapshot: where each standing stood across fifty years, how far it came from the first decade to the last, where the guide put the college at the end, and how many promises it kept. | The grade covers all fifty years, not just the last one. It weighs where each standing stood across the fifty years, how far it came from the first decade to the last, where the guide ranked your college at the end, and how many promises you kept. |
| reportData.ts · standings heading | Six of the seven standings, graded over the arc | Six of the seven standings, graded over fifty years |
| reportData.ts · standings note | Prestige, the seventh, is the blend of four of these six; it counts once, as the guide's last word above. | Prestige is the seventh. It blends four of these six, so it counts only once, as the guide's last word above. |
| reportData.ts · a standing's line | Averaged {mean} over fifty years; {first} in the first decade, {last} in the last. | Averaged {mean} over fifty years. First decade {first}, last decade {last}. |
| reportData.ts · no promises | The college made no promises in public. | You made no public promises. |
| reportData.ts · no offices | Founders Hall held no offices: the college ran without an administration of its own. | Founders Hall held no offices. Your college ran without an administration of its own. |
| reportData.ts · History, draft | The Final Report is written at the fiftieth summer. Until then, the arc so far. | The Final Report is written in the fiftieth summer. Until then, this is a draft of the years so far. |
| reportData.ts · History, too early | The Final Report is written at the fiftieth summer, and drafted from the tenth: the first decade is too early to judge. | The Final Report is written in the fiftieth summer. A draft appears from the tenth summer. Before that, it's too early to judge. |
| reportData.ts · epilogue | The fifty years are over; the college is not. This summer goes on to set Year 51's tuition and admit its class; then the clock runs on, and every ten years the chronicle gets an addendum. Nothing new opens. | The fifty years are over, but your college goes on. This summer you still set Year 51's tuition and admit its class. After that the clock keeps running, and every ten years the chronicle gets an addendum. Nothing new opens. |
| reportData.ts · New game note, after the report | The college hangs in the hall of fame and closes its books for good: no Epilogue, no addenda. A new name, a new campus, Year 1. | Your college goes into the hall of fame and closes for good. There's no Epilogue and no addenda. You start again in Year 1, with a new name and a new campus. |
| reportData.ts · New game note, mid-run | This ends the college now under way. Only a college that reached its fiftieth summer hangs here; this one will not. | This ends the college you're playing now. Only a college that reaches its fiftieth summer goes into the hall of fame, so this one won't. |
| ReportCardActions.tsx · download failed | The card could not be drawn. | Couldn't draw the card. |

### Log lines (`data/logWords.ts`)

| Where (file · context) | Before | After |
|---|---|---|
| logWords.ts · rivalry lost, third telling | {trophy} went to {them}{streak}; {team} could not hold them. The series stands {series}. | {trophy} went to {them}{streak}. {team} couldn't hold on to it. The series stands {series}. |
