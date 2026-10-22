# Appendix to area 2: the voice of the new text

Plan 86's area 2, third review. Commit read: `b1f2114`. The standard is Plan 47's §2 as Plan 76F wrote it: dry, specific American prose; "the college", not "you" (letters to the President excepted); no contractions, exclamations or cheer; the engine kept out of the prose. Plan 106 §5 adds two rules for briefings: say what a number adds to, and never end a sentence on a passive and a pronoun.

**What was read.** The scanner over everything: **8,472 strings, 59,103 words** (review II: 7,451 and 54,036). Then by hand, the text Plans 89–108 added: the 18 chapters (2,567 words with their drawer words), the walkthrough, the admissions page, the glance, the offices and the speed-ups. One reader, a model.

## The scanner, review II and now

| Check | Review II (`4062bfb`) | After 95J | `b1f2114` |
|---|---:|---:|---:|
| Strings / words | 7,451 / 54,036 | — | **8,472 / 59,103** |
| British spellings | 1 (not shown) | — | 0 |
| British idioms (to judge) | 11 | — | 15: "proper" ×5 (unchanged), "autumn" ×3 (Settings, and two new in the speed-up letters, `speedUpData.ts:103, 134`), "queues" ×3, "full marks" ×1 (new), others as before |
| Engine words | 0 | — | 6: "Unlocked" in the drawer (`chapterData.ts:421`) and the architecture unlock; "the slider" in a briefing; "this run" ×2 (the skip, the backup button) |
| Second person | 37 | 21 | **40** (2c, E7) |
| Contractions | 0 | 0 | **3** (2c, E6) |
| Exclamation marks | 0 | 0 | 0 |
| Glossary checks (Plan 95J) | — | 0 | 1 (a bare "slots", 2c D2) |

Where the 5,000 new words went: the chapters (2,567), the faculty's table and plot (~200), the Founders Hall offices (534), the admissions page (220) and the speed-up letters (191).

## The briefings against Plan 106 §5

§5's limits are what at most 3 sentences, how at most 4 levers, and why 2–4 links. `test/chapters.test.ts` holds every chapter to them, and every chapter passes (`data/c2-opening.md`, the last table). **The limits count sentences, not words.** So the sentences grew to fill them:

- **Briefings run 99–159 words** (median 126). The *what* paragraphs run 30–68 words in three sentences, an average of 16 words a sentence. The longest is 39 words (*A specialization*). Seven are 25 or more.
- **The drawer at a chapter's first opening is 184–255 words**: objectives, briefing, *Also waiting*, milestones and the Guide's list (`data/c2-opening.md`). Plan 106 §5's own sample briefing (what, how, why) is about 95 words.
- **The owner's second rule holds**: no sentence ends on a passive and a pronoun. The first rule ("say what a number adds to") is kept in *A hall of its own* ("each academic hall adds six more").

**The worst sentences, with rewrites:**

| Where | As written | Rewrite |
|---|---|---|
| Paying for it, what | "Cash under a term of expenses worries the board, and term after term of deficit walks the college down its scale, as far as a construction freeze." (27 words, and false: 2b row 3) | "Two deficit terms in a row put the books in Deficit; cash at zero freezes new buildings." |
| A specialization, what | "When the college first stands in the guide's top 30, or from year 20 in the top 10 of any one pillar, the board offers it a specialization: academics, research, student life or athletics, chosen once and for good." (39) | "In the guide's top 30, or from year 20 a pillar's top 10, the board offers a specialization. It is chosen once, for good." |
| Running the college, what | "A seat takes a domain's routine off the President's desk: the Provost, the Deans and the rest each answer the matters in their domain by a policy the President sets." (30) | "A seat answers its own matters, by a policy the President sets." |
| Standing, what | "Prestige's target blends four pillars, academics, research, student life and athletics, with the endowment, less run-down buildings; both figures move slowly." (22, a list inside a list) | "Prestige is four pillars added up, with the endowment. It moves slowly." |
| The first summer, what | "Week 52 is the summer, and the year stops there for three pages: the year in review with its report card, admissions, and the students' petitions." (26) | "The year ends in a summer of three pages: the review, admissions and the students." |
| The first summer, how | "Tuition: the slider says whether a price is in line with the college's standing. The applicants show only once it is set." | "Set the price first. The applicants appear once it is locked." |
| Research, what | "A founded school can build a laboratory, and each laboratory works on one research project at a time: a topic, a team drawn from the faculty, and its funding." (29) | "Each laboratory runs one project at a time: a topic, a team and its funding." |
| The year-1 Review, Students | "Satisfaction, how content the students are out of 100, averaged 39 this year: from now on it shows at the foot of the screen, and the Students tab opens on the needs it is made of" (37, the first summer's first sentence about students) | "Satisfaction averaged 39 of 100. It now shows in the dock, and the Students tab opens on its five needs." |

## Inconsistency the chapters brought

- **Two models of prestige.** Chapter 7: "Each drifts week by week toward a target." The glance: "Graded each summer, it climbs toward its grade and falls faster than it climbs." Both are a reader's first account of prestige, they disagree, and the second is wrong through year 5 (2b row 6).
- **"Target" again.** Plan 98B took the target out of player text, and `prestigeWords`'s comment says so. Chapter 7 says "target" six times (`chapterData.ts:164–171, 318, 436`). These are the only player strings that still say "target" about prestige.
- **"Points" without a scale.** "Its pillars: Academics 5.6 of 41.3" is the drawer's live readout. The glance has no maximum and the Review uses "of 150" (2c, E3).

## Still good

The house voice survives where the chapters touch old ground. The founding note "Somebody lives here now" (the light at midnight, the complaint about the showers pinned up "as the first of its kind") is the best line a new player reads in year 1, and it arrives in week 27 of a guided run. Three new lines in the house voice:

1. "…explained to managers who never asked for a p-value." (DATA310's capstone)
2. "Not for demolition. Founders Hall is where the college began, and stays." (the hall's panel)
3. "Nobody sets either figure: the college raises a target, and the figure follows." (chapter 7: the voice is right, though "target" is the word 98B retired)
