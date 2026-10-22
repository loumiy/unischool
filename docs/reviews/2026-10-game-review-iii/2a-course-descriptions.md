# Appendix to area 2: the course descriptions, sampled

Plan 86's area 2, third review. Commit read: `b1f2114`. Short by design. Plans 95L–M and 102 reshaped the catalog after review II, so this appendix re-reads a sample, not all 473 sentences: the 25 courses review II flagged, the 42 new capstones, and the eight courses 95L–M and 102 added or moved. The titles come from `src/data/techData.ts` and the sentences from `src/data/courseDescriptions.ts`. One reader, a model.

## The catalog now

- **473 courses**: 420 undergraduate (42 majors of ten, the tenth a 310 capstone, Plan 95M) and 53 graduate. The MD has Internal Medicine (MED550, Plan 102), and MED600 is "Transition to Clerkships". The JD has Professional Responsibility (LAWS540), and its clinic comes last (570). Sociology, Political Science, Anthropology, Philosophy and History have the core courses review II found missing (SOCY130, POLS140, ANTH240, PHIL230, HIST220). Nursing has medical-surgical, maternal and psychiatric nursing.
- **Review II's catalog-shape table (B2-6) is closed.** Every row of `2026-10-game-review-ii/2a`'s "The catalog's shape" table was built by 95M or 102, or was declined by the owner (100–400 numbering, Plan 102 decision 1).

## What became of review II's 25 flags

| Group | Rows | On `b1f2114` |
|---|---:|---|
| The 101s that restated their titles (ENGL, SOCY, ANTH, PHIL, PHLT, NUTR, NEUR, MDIA, CRWR, SART, FINA, ACCT, MGMT, COMP, DATA, CHEN) | 16 | **All took 2a's sentence** (95J). NUTR101 is reworded to stay inside the "from X to Y" limit. |
| Catalog order: ACCT140, FINA130, MED550, LAWS530 (a seminar's title) | 4 | **Fixed** by 95M's swaps. LAWS530 is "American Constitutional Law". |
| PHIL240 Symbolic Logic | 1 | **Unchanged**: "…up to the completeness and the limits of the systems" still lacks its noun. |
| PHDL720 Doctoral Seminar in Social Theory | 1 | **Unchanged**: "…from Durkheim to the present", the program's one span. |
| PHYS230 Astrophysics & Cosmology | 1 | **Unchanged**: "dates the universe by its microwave background". |
| KINE230 Exercise Testing & Prescription | 1 | **Unchanged**: "to ACSM guidelines", still the catalog's one unexplained acronym. |
| PHRM230 Clinical Pharmacy Practicum | 1 | **Unchanged**: undergraduates "advise prescribers", which is a pharmacist's work. |

So 20 of 25 are fixed and 5 still hold. Each is one sentence, and review II's rewrites still apply word for word (`2026-10-game-review-ii/2a-course-descriptions.md`).

## The 42 capstones

All 42 were read. **They are the catalog's best tier.** Each names a concrete product, audience or test: "Takes one live deal to an investment committee's vote" (FINA310), "Defends a simulated company network against a live attacking team for a term" (CYBR310), "Answers a partner organization's question with its own data, … explained to managers who never asked for a p-value" (DATA310, the house voice at its driest). None restates its title, and every opener is a verb. Three small points:

- **Titles**: 13 of 42 are "Senior Seminar in …" or "Senior Thesis in …". That is accurate, but it reads as a template in a list. The sentences differ enough that this is taste, not a flag.
- **PHYS310** opens with "Repeats classic experiments such as Millikan's oil drop and the Franck-Hertz tube". That is a junior lab, not a capstone. The second half ("carries one question further in a written thesis") is the capstone, so it should lead.
- **NURS310** "reviews for the licensing examination every graduate sits next" is accurate (the NCLEX) and the only capstone that names an exam. It is fine.

## Habits across the catalog

- **Openers:** "Covers" opens 31 sentences, "Designs" 27, "Examines" 23 (review II: 39, 23, 27). The 101s and capstones vary their openers. The middle tiers still lean on these three.
- **"From X to Y":** 32 sentences, all inside the house test's limits (`test/course-descriptions.test.ts`).

## Verdict

The catalog needs nothing structural. Five review II sentences and one capstone opener are polish, and they are carried as **C2-11** in `2-ui-and-text.md`.
