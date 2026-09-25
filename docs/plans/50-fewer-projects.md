# Plan 50 — Fewer projects

*Planning document only. Its job is to turn the owner's answers into a PR.*

**Status: Landed.**

---

## 0. The answers

The owner went through the nine capital projects one by one:
- **The Great Lawn** is a big green rectangle, the same as a quad. Scrap it.
- **The Championship Stadium:** scrap it. Its drawing becomes the fully
  expanded football stadium (Plan 53).
- **The Medical Center:** scrap the project in favor of the health chain's
  hospital.
  - Rename the hospital the Medical Center.
  - Give it the project's academics and research lift.
  - Open it from Year 15.
  - The School of Medicine is gated on it (Plan 51).
- **The Institute for Advanced Study:** scrap it.
- **The Great Commons** was a dining hall that fed no one. Remove it.
- The Arts Center, the Research Park, the Graduate College and the Museum
  stay. Plans 51 and 52 change what the first three do.

## 1. The PR

- **Five projects go:** the Great Lawn, the Championship Stadium, the
  Medical Center project, the Institute for Advanced Study and the Great
  Commons.
  - They leave the catalog, the drawings, the footprints, and the late
    tier, which keeps only the Museum.
  - The events that named the lawn or the stadium read the quad and the
    football stadium, as they already could.
- **The Medical Center** (`HLTH-T3`, `MEDICAL_CENTER_PROJECT`) is the
  health chain's third rung, formerly the University Hospital, and a
  capital project in all but its place in the build menu. It:
  - lifts academics by 6 and research by 8 while it stands, in proportion
    to its condition;
  - opens from Year 15, after the clinic and past 20,000 students, as
    before;
  - can be paid half from the endowment;
  - no longer waits on the School of Medicine's entry course (Plan 51
    reverses the gate);
  - keeps the MD clerkship, which still trains there.
- **The most the projects can lift** each axis is read from every
  project's terms, the Medical Center's included (`ALL_PROJECT_TERMS`).
  Nothing lifts athletics now.
- **Save version 74**, with a one-off carry from 73 that replaces Plan
  46's:
  - the removed projects leave the save with their sites, whatever state
    they were in;
  - the hospital takes the catalog's name, gate and project terms.
- **Design docs** (`curriculum.md`, `graduate-programs.md`,
  `progression.md`) name the Medical Center.

**As implemented:** as above. The harness is untouched; the owner will
rebuild the sim suite from scratch.
