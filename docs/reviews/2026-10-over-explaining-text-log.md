# Over-explaining text: a log for review

This log lists player-visible text that explains mechanics, gives reasons or describes the UI where a plain statement would do. The reference case is the quad line. It read "+8 social life, at any size — no capacity figure; a quad does not scale with enrollment." and now reads "+8 social life".

**Reviewed and applied.** The last column records the owner's decision for each row (from the review page), and the game text was changed to match. Paths are relative to `unischool/src/`. Line numbers are as of the polish commit on `claude/beautiful-einstein-wvj3cn`. ★ marks the clearest cases.

Some patterns recur. One decision on a pattern can settle every row that shares it:

- **P1** "— needs X faculty: every professor in the field is teaching a full load / nobody on the market" (Curriculum, building panel)
- **P2** "…until it settles" / "not taught, not advancing, counting toward nothing" (programs moving halls)
- **P3** "counts toward curriculum breadth — the largest input to the prestige target" (milestone letters)
- **P4** "students' worth of social capacity" (athletics venue descriptions)
- **P5** the "beyond need" upkeep sentence: one source (`systems/estate/beyondNeed.ts:85-101`) feeds the building panel, the build tile and the Treasury
- **P6** "The curriculum committee is writing N courses already, its most; …" → "The curriculum committee is full."
- **P7** "Cash is negative — the college is running an operating deficit, so …" → "Cash is negative."
- **P8** "Confirm — <consequence>" on armed buttons, where the consequence is already in the warning beside it

Descriptions in `data/facilitiesData.ts`, `projectData.ts` and `techData.ts` show both in the building info panel and in the course drawer, so one trim covers both.

---

## Building info panel

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 1 ★ | Lab info line | components/BuildingInfoPanel.tsx:186 | "+N% research output — no capacity figure; this program's advanced courses require it instead." | "+N% research output" |Trim |
| 2 ★ | Athletics venue line | BuildingInfoPanel.tsx:81 | "N social capacity — a shared competition venue, not a rec facility." | "N social capacity" |Trim |
| 3 ★ | Facility need line (P5) | systems/estate/beyondNeed.ts:93 | "{use}. Past N% of the need, a place costs 1.5 times as much to keep." | "{use}." |Trim |
| 4 | Same, non-per-student need | beyondNeed.ts:91 | "{label}: N places; N students need N" | "{label}: N places for N needed" |Trim |
| 5 ★ | Founders Hall (offices era) | BuildingInfoPanel.tsx:511 | "Where programs begin, and where the administration sits. A program moving out of it is closed for N weeks on the way; a slot it leaves can hold an office." | "Where programs begin, and where the administration sits." |Trim |
| 6 ★ | Founders Hall (early) | BuildingInfoPanel.tsx:512 | "Where programs begin. Six programs of one school in any hall, this one included, found that school; a program moving out of it is closed for N weeks on the way." | "Where programs begin." |Trim |
| 7 | Hall claim line | BuildingInfoPanel.tsx:505 | "{school} · 3 of 6 — six found the School of {school}." | "{school} · 3 of 6" |Trim |
| 8 ★ | Relocate disclosure (P2) | BuildingInfoPanel.tsx:329 | "Free, but the program closes for N weeks: no teaching, no progress, and it counts toward no school until it settles." | "Free · closed N weeks" |Trim |
| 9 | Relocate, in transit (P2) | BuildingInfoPanel.tsx:319 | "In transit — N weeks until its courses count again. Nothing in it can be started or advanced until then." | "In transit · N weeks left." |Trim |
| 10 | Program tile summary (P2) | BuildingInfoPanel.tsx:260 | "In transit — N weeks until its courses count again." | "In transit · N weeks." |Trim |
| 11 | Tile "moving" tooltip (P2) | BuildingInfoPanel.tsx:243 | "In transit — N weeks until it is teaching again" | "In transit · N weeks" |Trim |
| 12 | Tile "dark" tooltip | BuildingInfoPanel.tsx:245 | "A course has no instructor: the program is dark until it is restaffed" | "A course has no instructor" |Trim |
| 13 | Grade chip tooltip | BuildingInfoPanel.tsx:248 | "Averages N/100 across its developed courses" | "Averages N/100" |Trim |
| 14 | Next course blocked (P1) | BuildingInfoPanel.tsx:269 | "— needs {field} faculty, a candidate is listed / nobody on the market." | "— needs {field} faculty." |Trim |
| 15 | "Not this year" tooltip | BuildingInfoPanel.tsx:484 | "Set {name} aside for another offer; one offer a year may be declined" | "Set {name} aside for another offer" |Trim |
| 16 | Decline, armed (P8) | BuildingInfoPanel.tsx:486 | "Confirm — no other offer can be declined until Year N" | "Confirm" |Trim |
| 17 | Hall offer, committee full (P6) | BuildingInfoPanel.tsx:601 | "The curriculum committee is writing N courses already, its most: a program can be founded once one of them is done." | "The curriculum committee is full." |Trim |
| 18 | No eligible instructor (P1) | BuildingInfoPanel.tsx:643-644 | "Needs {f} faculty: every professor in the field is teaching a full load. Appoint one to found this program." / "…: nobody on the payroll teaches {f}. Appoint a professor to found this program." | "Needs {f} faculty." |Trim |
| 19 | Picked-school note | BuildingInfoPanel.tsx:651 | "{school} has a hall of its own: {hall}. Found it there to keep the school together." | "{school} has a hall of its own: {hall}." |Trim |
| 20 | Found button tooltip (P6) | BuildingInfoPanel.tsx:662 | "No room on the committee for its entry course until one of its courses is done" | "The curriculum committee is full" |Trim |
| 21 | Found warning | BuildingInfoPanel.tsx:671 | "{hall} holds {school} (x/y): {name} here keeps it from becoming the School of {school} until it moves out." | "Takes a slot {school} needs." |Trim |
| 22 | Graduate host waiting | BuildingInfoPanel.tsx:578 | "{name}: opens once every {homeSchool} course is taught." | keep, or "{name}: not yet" |Keep |
| 23 | Add-a-story / expand tooltip | BuildingInfoPanel.tsx:712, BuildPopup.tsx:444 | "The board has frozen construction; nothing new goes up until it lifts." | "Construction is frozen." |Keep |
| 24 | Declare historic | BuildingInfoPanel.tsx:724-726 | label "Declare historic · lends prestige, costs a quarter more to keep"; warning "For good: it can never be demolished, and its upkeep stays a quarter higher." | "Declare historic"; "Permanent. +25% upkeep." |Trim |
| 25 | Demolish warning | BuildingInfoPanel.tsx:772 | "It is free, nothing is returned, and it cannot be undone." | "Cannot be undone." |Trim |
| 26 | Estate lines | BuildingInfoPanel.tsx:709, 717 | "A story going up, open throughout: N weeks left." / "Under renovation, open throughout: N weeks left." | drop "open throughout" |Trim |

## Build menu and descriptions

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 27 ★ | Campus Quad | data/facilitiesData.ts:897 | "A green centerpiece for campus life. Cheap, and worth it at any size — its contribution never dilutes as enrollment grows." | "A green centerpiece for campus life." |Trim |
| 28 ★ | Grand Quad | facilitiesData.ts:914 | "A landscaped centerpiece expansion: more social life, at any size." | "A landscaped centerpiece expansion." |Trim |
| 29 ★ | Grocery | facilitiesData.ts:549 | "A full grocery store for N students — a second basic-needs option alongside the dining halls, though with the towers' shops it covers N% of meals at most. Can be built once enrollment passes N." | "A full grocery store for N students." |Trim |
| 30 ★ | Student Center | facilitiesData.ts:587 | "Social space for N students — happier students mean a bigger applicant pool next cycle." | "Social space for N students." |Trim |
| 31 | Original Commons | facilitiesData.ts:106 | "The college's first dining hall — build it to feed the founding class. Serves N students." | "The college's first dining hall. Serves N." |Trim |
| 32 | Rec Center tier 2 | facilitiesData.ts:692 | "The last of the fitness buildings: a complex keeping N more students fit, and a bigger prestige lift, though not a competition venue. Can be built at prestige N." | "A fitness complex for N more students." |Trim |
| 33 | Field, Arena, Diamond (P4) | facilitiesData.ts:730, 748, 766 | "A competition-grade outdoor field for N students' worth of social capacity, shared by soccer, …" | "A competition-grade outdoor field for soccer, lacrosse, field hockey and track." |Trim |
| 34 ★ | Natatorium (P4) | facilitiesData.ts:784 | "A competition pool for N students' worth of social capacity — distinct from the rec Swimming Pool, and where swim & dive and water polo compete." | "A competition pool for swim & dive and water polo." |Trim |
| 35 | Football Stadium (P4) | facilitiesData.ts:802 | "The pinnacle varsity venue: a full football stadium, and N students' worth of social capacity. Listed once football goes varsity." | "A full football stadium." |Trim |
| 36 | Field House (P4) | facilitiesData.ts:820 | "Weight rooms, … for every varsity program at once — N students' worth of social capacity, and a lift to every team the college fields." | "Weight rooms, an indoor training floor and treatment rooms for every varsity program." |Trim |
| 37 | Medical Center | facilitiesData.ts:875 | "A teaching hospital … caring for N more students: where the MD's clerkship year is spent, and a lift to the college's academics and research while it stands. Opens from Year N, for a campus past N students enrolled." | "A teaching hospital with the college's name over the door, and home of the MD." |Trim |
| 38 | Health center tiers | facilitiesData.ts:841, 858 | "… Can be built once enrollment passes N." | drop the gate sentence if the build menu already shows it |Delete |
| 39 ★ | Research Park | data/projectData.ts:74 | "… Once it stands, any lab can take on a Landmark Program. At a college specialized in research, its Landmark work fills research's specialization share and every lab's output is N% higher; a park at a college specialized in anything else keeps its Landmark Programs and adds nothing more." | "Laboratories at the edge of campus where faculty and industry work side by side: home of the Landmark Programs." |Trim |
| 40 ★ | Athletic Performance Complex | projectData.ts:122 | "… where every varsity athlete trains. At a college specialized in athletics it carries N more flagship programs than the subsidy level allows, its scholarships recruit N% more, …" | cut after "where every varsity athlete trains." |Trim |
| 41 | Training Institute | projectData.ts:106 | "… Each year it takes professors for a term, and they come back a full grade better in the classroom." | borderline: keep, or drop the last sentence |Keep |
| 42 | Specialization buildings | projectData.ts:145 | "Opens once the college is specialized in X; no other college may build it." | drop "; no other college may build it" |Trim |
| 43 ★ | Every lab's description | data/techData.ts:762 | "{blurb} — required for the {major} program's advanced courses, and lets the college produce research." | "{blurb}" |Keep |
| 44 | Academic hall | techData.ts:855 | "An academic hall with N program slots. Six programs of one school in one hall found that school." | "An academic hall with N program slots." |Trim |
| 45 | Graduate entry course | techData.ts:891 | "{desc} Founds {blurb} ({degree}); offered once {gate}, and taught there." | "{desc} Founds {blurb}." |Trim |
| 46 | First dorm | data/campusData.ts:80 | "The college's first residence hall — build it to give students somewhere to live on campus." | "The college's first residence hall." |Trim |
| 47 | Library tile, 2nd line (P5) | components/BuildPopup.tsx:337 | "past N% of need, N times the upkeep" | delete |Trim |
| 48 | Lab tile lines | BuildPopup.tsx:329 | "required for advanced courses" | consider just "research" |Trim |
| 49 ★ | Venue expand tooltip | BuildPopup.tsx:446 | "Expands the {name} in place — no new building. Adds N seats in the stands, and their prestige, at once, and N of social capacity when the N weeks of work are done; the teams keep playing while the work is under way." | "Adds N seats and N social capacity." |Trim |
| 50 | Founders Hall site tile | BuildPopup.tsx:486 | "The founding hall — pick it up, then click where it stands. No charge." | "The founding hall. No charge." |Trim |
| 51 ★ | Erase path tooltip | BuildPopup.tsx:720 | "Erase a drawn pathway — with either tool armed the right mouse button erases too, so this is for a long clearing pass rather than a correction" | "Erase pathways (right-click also erases)" |Trim |
| 52 ★ | Fell trees tooltip | BuildPopup.tsx:745 | "Fell trees — with either tree tool armed the right mouse button fells too, so this is for clearing woodland rather than a correction" | "Fell trees (right-click also fells)" |Trim |
| 53 | Draw path tooltip | BuildPopup.tsx:709 | "Draw a pathway by filling in tiles — P on the map does the same, and the right mouse button erases while either tool is armed" | "Draw pathways (P)" |Trim |
| 54 | Plant trees tooltip | BuildPopup.tsx:733 | "… — the right mouse button fells while either tree tool is armed. Nothing is planted under a building or a path." | "Plant trees" |Trim |
| 55 | Lamp / bench tooltips | BuildPopup.tsx:757, 768 | "… one a click — the right mouse button lifts one. Free, like a path." / "…: it faces the path, and R turns it before it is set. …" | "Place a lamp (free)" / "Place a bench (R turns it)" |Own: "Place a lamp (free)" / "Place a bench (R to rotate)" |
| 56 | Freeze stall note | BuildPopup.tsx:852 | "The board has frozen new construction until the college has run two surplus terms with cash in the bank." | "The board has frozen new construction." |Trim |
| 57 ★ | Negative cash note (P7) | BuildPopup.tsx:855 | "Cash is negative — the college is running an operating deficit, so nothing can be paid for from cash or a loan until the balance recovers. A building the campaign fund covers in full can still start." | "Cash is negative." |Trim |
| 58 | No-loan reason | data/buildWords.ts:21 | "with no cash in hand, the college cannot borrow" | "no cash to borrow against" |Keep |

## Curriculum tab

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 59 ★ | Program "dark" badge tooltip | tabs/CurriculumTab.tsx:931 | "A course has no instructor: the whole program is dark — no places, no progress, a zero in every grade — until it is restaffed" | "A course has no instructor" |Trim |
| 60 ★ | Negative cash note (P7) | CurriculumTab.tsx:1356 | "Cash is negative — the college is running an operating deficit, so no course can be started until the balance recovers." | "Cash is negative." |Trim |
| 61 ★ | Course drawer, moving (P2) | CurriculumTab.tsx:774 | "Its program is moving halls: not taught, not advancing, and counting toward nothing until it settles." | "Its program is moving halls." |Trim |
| 62 | Program row, moving (P2) | CurriculumTab.tsx:804 | "Moving halls — nothing can start until it settles." | "Moving halls." |Trim |
| 63 | Cell transit stamp tooltip (P2) | CurriculumTab.tsx:406 | "Its program is moving halls — closed until it settles" | "Moving halls" |Trim |
| 64 | Hold reason (P2) | systems/techtree/programProgress.ts:120 | "Its program is moving halls; nothing starts until it settles" | "Its program is moving halls" |Trim |
| 65 | Drawer warning (P6) | CurriculumTab.tsx:765 | "The curriculum committee is writing N courses already, its most; this one starts when one of them is done." | "The curriculum committee is full." |Trim |
| 66 | Develop button tooltip (P6) | CurriculumTab.tsx:870 | "The committee is writing its most (N); the next starts when a course is done" | "The committee is full" |Trim |
| 67 | Instructor gate tooltip (P1) | CurriculumTab.tsx:413-414 | "Needs {f} faculty: every professor in the field is teaching a full load, and a candidate is on the market" (or "…nobody is on the market") | "Needs {f} faculty" |Trim |
| 68 | Drawer, department full | CurriculumTab.tsx:722-723 | "Every {f} professor is teaching a full load. Make room by moving one of their courses, or appoint someone new." | "Every {f} professor is teaching a full load." |Keep |
| 69 | Unstaffed course | CurriculumTab.tsx:684 | "This course has no instructor and is not being taught. Assign someone to restore it." | "No instructor." |Keep |
| 70 | Instructor pay tooltip | CurriculumTab.tsx:468 | "Salary X; the college pays Y a year at its market rate, whichever courses they teach" | "Salary X; paid Y" |Own: Salary X |
| 71 | Faculty chip tooltip | CurriculumTab.tsx:310 | "{name} — drag onto another course in this department to swap" | "{name}" |Trim |
| 72 | "Below A" filter tooltip | CurriculumTab.tsx:1067 | "Every developed course graded below an A, plus any left unstaffed: the courses that hold the college's academic standing back. A course in a dark program counts by the grade its instructor earns on it." | "Courses graded below A, or unstaffed" |Trim |
| 73 | Batch start tooltip | CurriculumTab.tsx:884 | "Start all N with {best}: {cost} — grades {g} as their load climbs" | drop "as their load climbs" |Trim |
| 74 | Empty market | CurriculumTab.tsx:534, FacultyTab.tsx:309, 803 | "No {field} candidates are listed this week. The market turns over every week — or pay for a search." | "No {field} candidates this week." |Trim |
| 75 | Search running | CurriculumTab.tsx:504 | "A {field} search is running — N weeks left. Every week it may turn somebody up." | drop the last sentence |Trim |
| 76 | Prereq "build" tag tooltip | CurriculumTab.tsx:659 | "Built on the campus map, not developed here" | "Built on the map" |Trim |

## Faculty

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 77 ★ | Department demand sentence | tabs/FacultyTab.tsx:111 | "… Each one occupies a course slot in this department for as long as it is offered, whether or not somebody is teaching it." | delete that sentence |Delete |
| 78 | No course open | FacultyTab.tsx:105 | "No {field} course is open yet — N in the catalog are waiting behind buildings and prerequisites." | "No {field} course is open yet." |Trim |
| 79 | Header stat tooltip | FacultyTab.tsx:456 | "Course slots taken by the courses on offer, whether or not somebody is teaching them" | "Course slots in use" |Trim |
| 80 | Header stat tooltip | FacultyTab.tsx:469 | "Teaching the whole catalog takes N course slots in the departments that hold them: about N more appointments, fewer if they stay long enough to grow" | "About N more appointments to teach the whole catalog" |Trim |
| 81 | Search button tooltip | FacultyTab.tsx:149 | "Nobody is listed in {f}. A search runs half a year with a much better chance every week that somebody is: {cost}." | "Run a search: {cost}" |Trim |
| 82 | Over-supply link tooltip | FacultyTab.tsx:410 | "Departments teaching more than they supply — every course without an instructor, in the Curriculum" | "Unstaffed courses" |Trim |
| 83 | Project badge tooltip | components/FacultyTile.tsx:268 | "On {topic} at {lab}, N left: two course slots fewer until it ends" | drop ": two course slots fewer…" |Trim |
| 84 ★ | Training bar note | data/trainingData.ts:95 | "One pick for every N professors, at least N. A pick raises a professor's teaching by N, and their potential by as much, so the gain lasts; for a term they teach one course fewer. Picks not used by the end of Year N lapse." | "Picks lapse at the end of Year N." |Trim |
| 85 | Training share | trainingData.ts:97 | "…; the academics pillar's specialization share is full at N%." | "N of N professors trained." |Trim |
| 86 | No institute | trainingData.ts:101 | "… to train professors: each year it takes some for a term, and they come back a full grade better in the classroom." | cut after "build menu." |Trim |
| 87 | Train warning | trainingData.ts:112 | "… {course} will be left without an instructor, since nobody in the field has a course slot free." | drop ", since…" |Trim |
| 88 | Why not: top grade | trainingData.ts:114 | "Already teaches at an A: there is no grade above it." | "Already teaches at an A." |Trim |
| 89 | Why not: no picks | trainingData.ts:115 | "No training picks are left in Year N. The next year brings more." | drop the second sentence |Trim |
| 90 | Person card | data/careerWords.ts:27 | "Came with a record from elsewhere, which counts toward their growth but not their years here." | "Came with a record from elsewhere." |Trim |
| 91 | No recognition | careerWords.ts:65 | "Nothing yet. Prizes, a program taught in to its last course and 25 years of service are what count." | "Nothing yet." |Trim |
| 92 | Not trained | careerWords.ts:71 | "Not trained at the institute yet. A training raises teaching a full grade, for good." | "Not trained at the institute yet." |Trim |
| 93 | Candidate history | careerWords.ts:79 | "{name} has not worked at {college}. There is no history here yet: the record starts the week they are appointed." | first sentence only |Trim |

## Students

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 94 ★ | Orgs panel note | tabs/StudentLifeTab.tsx:93-95 | "Social satisfaction is already at its limit from the campus itself, so these organizations are adding nothing to the target right now — they will start to again the moment the campus grows past what its social facilities cover." | "Social satisfaction is at its limit." |Trim |
| 95 | Need card, dormant | StudentLifeTab.tsx:226 | "Dormant — the campus has not yet reached the size where this need starts to matter." | "Dormant." |Trim |
| 96 | No demands | StudentLifeTab.tsx:~301 | "No outstanding demands. Students ask the institution for something only when satisfaction falls below N." | "No outstanding demands." |Trim |
| 97 | No orgs | StudentLifeTab.tsx:415 | "No student organizations yet — build a Student Center to let students start forming clubs." | "No student organizations yet." |Keep |
| 98 | Club count tooltip | StudentLifeTab.tsx:429 | "Interest clubs and sport clubs are counted against separate limits: a sport club leaves the list when it goes varsity." | delete |Delete |
| 99 | Greek declined | StudentLifeTab.tsx:474 | "The college has no Greek life. The Hellenic Council was declined, and the question does not come back." | "The college has no Greek life." |Trim |
| 100 ★ | Greek panel empty | data/studentLifeData.ts:106 | "No Greek life on this campus. Once clubs are established, students may petition to charter a Hellenic Council — approving one is a deliberate choice, and the college can decline Greek life entirely." | "No Greek life on this campus." |Trim |
| 101 | Pool chart note | tabs/EnrollmentTab.tsx:131 | "Prestige and price set its size; beds, word of mouth and what the college built scale it." | delete |Delete |
| 102 | Other chart notes | EnrollmentTab.tsx:136, 141, 146, 151 | "Admitting deeper buys a bigger class with weaker students.", "…It feeds prestige.", "The year's average scales next summer's pool.", "…A freshman class can be no larger than the catalog's places." | delete the mechanics clauses |Delete |

## Finance / Treasury

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 103 | Instruction line note | tabs/TreasuryTab.tsx:63, 66 | "… — the catalog is smaller than the college" / "… — the catalog is bigger than the college" | drop the dash clauses |Delete |
| 104 | Athletics surplus note | TreasuryTab.tsx:76 | "…, into the department's fund first; this is what was left once every program took its cost" | "N/wk at the gate" |Trim |
| 105 | Beds upkeep note | TreasuryTab.tsx:77 | "N beds — an empty one still costs, at half rate" | "N beds" |Trim |
| 106 | Scale cost note | TreasuryTab.tsx:80 | "… doublings past N — each doubling costs every student more" | drop the dash clause |Delete |
| 107 | Facility upkeep note | TreasuryTab.tsx:82 | "libraries, dining, rec and labs, each carrying its own running cost" | "libraries, dining, rec and labs" |Trim |
| 108 | Athletics subsidy note | TreasuryTab.tsx:85 | "… — the department's cost to the college" | drop |Delete |
| 109 | Scholarships note | TreasuryTab.tsx:86 | "…, set on the Athletics tab: what their recruiting costs" | drop after "flagships" |Trim |
| 110 | Administration note | TreasuryTab.tsx:87 | "N seats, for good — N% of the payroll" | "N seats · N% of payroll" |Trim |
| 111 | Beyond-need upkeep note (P5) | systems/estate/beyondNeed.ts:101 | "{over}: past N% of what the students need, a place costs N times as much to keep" | "{over}" |Trim |
| 112 | Cost-of-being-large chart note | TreasuryTab.tsx:194 | "At today's prestige, catalog and listed price. Every doubling past N students adds to what each one costs to administer; where the lines cross, the next student costs more than they pay. The college has N." | "The college has N." |Keep |
| 113 | History chart note | TreasuryTab.tsx:208 | "Read each summer. The net is the year's change in cash on hand, so a year that built something big reads low." | "Read each summer." |Trim |
| 114 | Distress rung asides | TreasuryTab.tsx:146-148 | " — no construction or borrowing until two surplus terms" etc. | " — no construction or borrowing" |Keep |
| 115 | Endowment "Grows" row | tabs/EndowmentPanel.tsx:55 | " — so next year's draw grows as little" / " — and next year's draw shrinks with it" | delete |Delete |
| 116 | Move-to-endowment confirm (P8) | EndowmentPanel.tsx:67-68 | armed "Confirm — N never comes back to cash"; warning "The endowment is one way: it pays out its draw, but the principal does not come back to cash." | warning "Permanent." |Trim |

## Events, Inbox and letters

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 117 ★ | Milestone: professional school (P3) | data/eventData.ts:128 | "Every course in the {degree} program is finished. A professional school counts toward curriculum breadth — the largest input to the prestige target — and is weighted there above its course count, though still inside that input's cap." | first sentence only |Trim |
| 118 ★ | Milestone: research degree (P3) | eventData.ts:129 | "… A research degree counts toward curriculum breadth AND toward the college's research standing, both as capped inputs to the prestige target." | first sentence only |Trim |
| 119 ★ | Milestone: school distinguished | eventData.ts:149 | "Every program in the school is distinguished. A distinguished school is the heaviest single contribution curriculum breadth can make to the prestige target, and it can train its successors: …" | "Every program in the school is distinguished." |Trim |
| 120 ★ | Milestone: program established (P3) | eventData.ts:161 | "… is finished. The program counts toward curriculum breadth from now on — the largest input to the prestige target — and its advanced courses are open." | "… is finished, and its advanced courses are open." |Trim |
| 121 | Milestone: distinguished program | eventData.ts:169 | "… are done. Distinguishing a program is a further, separate share of curriculum breadth on top of establishing it." | first sentence only |Trim |
| 122 | Milestone: school founded | eventData.ts:138 | "… The school's name is permanent, and a donor may now put a family name on it." | borderline: keep |Keep |
| 123 | Trustee campaign choice | eventData.ts:919 | "It pays out every year from now on, and feeds the financial-resources input to prestige." | delete |Delete |
| 124 | Go varsity choice | eventData.ts:969 | "… a week to run it from now on, whether or not it has a venue yet — the coaching staff is hired separately, from the Athletics tab's own candidate pool." | "{amt} up front and {wk} a week." |Trim |
| 125 | Chapter house choice | eventData.ts:625 | "… both effective immediately — the house itself goes on the build menu, under Housing, for you to place on campus." | drop the dash clause |Trim |
| 126 ★ | Opening letter "Somewhere to sleep" | eventData.ts:1189 | "… Housing is not a cap on how many we admit — this college can grow with no bed at all — but a college with nowhere to sleep and nowhere to eat talks itself down, …" | drop "Housing is not a cap … no bed at all — but" |Trim |
| 127 | Hall letters | eventData.ts:1167, 1221, 1240 | "A school is six programs of one school in one hall, any hall, Founders Hall included, and six program slots go only so far." / "… Programs of other schools can go on beginning in any hall with a free program slot." | trim the rule restatements |Trim |
| 128 | Walkthrough | data/openingData.ts:60 | "… its footprint follows the pointer, and the ground is the college's own, so this one costs nothing. Every later building is placed the same way." | drop the last clause and sentence |Trim |
| 129 | Walkthrough | openingData.ts:80 | "… Each course taught gives the catalog eighty places. Until there are places for all N students the college is crowded: …" | tutorial; low priority |Keep |
| 130 | Summer org digest | components/InterruptModal.tsx:116 | "Recognize an organization and it costs a little every week and adds a little to student satisfaction, for as long as it exists. Decline and the students notice." | delete, or first clause only |Trim |
| 131 | Same, with chapters | InterruptModal.tsx:117 | "Chapters carry more of both than clubs do — more cost, and considerably more student life." | delete |Delete |
| 132 | Students beat | InterruptModal.tsx:617 | " — clubs form once the campus has a Student Center for them to meet in." | delete |Delete |
| 133 ★ | Athletic Director modal | InterruptModal.tsx:1062-1064 | "… A director lifts every team the college fields — and unlike a coach, there is only one of them, so the question is simply how much of the department's budget goes to the person in charge." | "Three candidates have applied." |Trim |
| 134 | AD decline button | InterruptModal.tsx:1100 | "Appoint nobody for now — the search goes on, and the position will come back around." | "Appoint nobody for now" |Trim |
| 135 | Applicant pool label | InterruptModal.tsx:332 | "(including N drawn for this year only by new landmarks and milestones)" | "(+N this year only)" |Trim |
| 136 | Room-for label | InterruptModal.tsx:356 | "(the catalog's places, less those who stay on)" | delete (the figure hint already says it) |Trim |
| 137 | Ceiling note | InterruptModal.tsx:362-366 | "…, counting N in programs moving halls, which teach again early in the year …" / " Nothing in development will add places by next summer." | trim the parentheticals |Trim |
| 138 | Tuition label | InterruptModal.tsx:631 | "(locked for four years)" | optional; it's short |Trim |
| 139 | Standing | InterruptModal.tsx:709, tabs/RankingsPanel.tsx:32 | "… The guide prints fifty names; the college is not yet among them." | "The college ranks #N." |Trim |
| 140 | Milestone modal | InterruptModal.tsx:847 | "Prestige today (steps toward the target each summer, and drifts a little between)" | "Prestige today" |Trim |
| 141 | Unstaffed letter | InterruptModal.tsx:1180 | "Courses without an instructor leave their whole program dark: no places, no progress and a zero in every grade." | "Some courses have no instructor." |Trim |
| 142 | Price tier | InterruptModal.tsx:142 | "far above what the college's prestige supports; expect sticker shock" | drop "; expect sticker shock" |Trim |
| 143 | Inbox empty | components/InboxTab.tsx:249 | "… The button in the toolbar counts what needs deciding." | delete the meta sentence |Delete |
| 144 | Demand side | InboxTab.tsx:377 | "Building it: the demand closes the week it is met" | "Build it" |Trim |
| 145 | Lapsed note | InboxTab.tsx:485 | "It was left unanswered, so it settled the way it does when nobody answers." | "Left unanswered." |Trim |
| 146 | Milestone letter / opens | data/ladderData.ts:184-185 | "… and the Treasury counts it as the cost of being large."; "Health & Counseling Center: care for students, which now counts toward satisfaction" | drop the mechanics tails |Delete |
| 147 | Offices letter | ladderData.ts:172 | "… each a standing advantage, each at a price and a running cost. More offices open as the college grows." | trim |Trim |
| 148 | Specialization line | data/specializationData.ts:159 | "…: X may rise to the full N, and the other three pillars' specialization shares stay empty." | drop ", and the other three…" |Trim |
| 149 | Specialization confirm / later (P8) | specializationData.ts:345, 348 | "Confirm — the other three shares stay empty for good"; "The offer stands: it comes back at the close of every summer until a specialization is chosen." | "Confirm"; "The offer will come back next summer." |Trim |
| 150 | Specialization card | specializationData.ts:240 | "… Each rises a full grade in teaching (the width of their grade on the course scale) and keeps it, …" | drop the parenthetical |Trim |
| 151 | Promise note | data/promiseData.ts:409 | "A public commitment with a date on it. Declining costs nothing; keeping it is worth more than that." | first sentence only |Trim |
| 152 | Campaign missed | data/campaignData.ts:50 | "… What was raised is restricted and waiting; what was asked for was not all given." | flavor; borderline |Trim |

## Toasts and log messages

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 153 ★ | Faculty on market | systems/faculty/facultySystem.ts:83 | "{name} ({field}) is on the market — a field with courses waiting on a hire." | "{name} ({field}) is on the market." |Trim |
| 154 | Club petition | systems/studentlife/studentLifeSystem.ts:25-26 | "… petitioning for recognition — the President decides at the summer's Students step." | drop the dash clause |Trim |
| 155 | Year review line | state/yearInReview.ts:194 | "… petitioning for recognition — the President answers at this summer's Students step" | same |Trim |
| 156 | Varsity founded | systems/administration/officeActions.ts:92 | "{team} is now a varsity program, founded by the Athletics Development Office: head coach, assistant coach and trainer still to be hired from the Athletics tab." | "{team} is now a varsity program." |Keep |
| 157 | Specialization chosen | systems/prestige/milestone.ts:111 | "… Its share of X opens, for good." | delete the second sentence |Delete |
| 158 | Specialization deferred | milestone.ts:102 | "… The board will ask again at the close of the next summer." | ok, or trim |Keep |
| 159 | Demand lapsed | systems/demands/demandSystem.ts:288 | "… Word of it will follow the college into next year's admissions." | delete |Trim |
| 160 | Team cut letter | systems/athletics/cut.ts:83 | "… and the annual fund will feel it for N years. … The venue stays, for anyone who wants to play." | trim the mechanics tail |Trim |
| 161 | Next-step hint | systems/guidance/nextStep.ts:332 | "Idle cash counts for nothing — set a standing sweep into the endowment" | "Sweep idle cash into the endowment" |Keep |
| 162 | Next-step hint | nextStep.ts:278 | "… serves N% — crowding is costing prestige" | "{need} at N%" |Trim |
| 163 | Next-step hint | nextStep.ts:190 | "… has room for {school} when one is on offer: founding a program or declining an offer draws the next" | drop after the colon |Trim |
| 164 | Next-step hint | nextStep.ts:300-301 | "{name} is dark — a course has no instructor; staff it from the market" | "{name} is dark: staff it" |Trim |
| 165 | Decline refusal | systems/techtree/programOffers.ts:151 | "One offer a year may be declined, and {name} was declined this year. The next can be declined in Year N." | "Already declined one this year." |Trim |
| 166 | Charter refusal | systems/administration/officeActions.ts:41 | "There is no room for another club: a Student Center, and room under the cap, come first." | "No room for another club." |Trim |
| 167 | Cut refusal | systems/athletics/cut.ts:59 | "A flagship plays out its season: move X below the line first, or cut it after the postseason in week N." | borderline |Keep |

## Tooltips, figure hints and help

These have lower priority. Most are opt-in "what is this?" help, where some explanation is expected. Only the rows with a tacked-on reason or meta-UI talk are listed.

| # | Where | File | Current | Suggested | Decision |
|---|---|---|---|---|---|
| 168 | Milestone ticker tooltip | components/LogTicker.tsx:81 | "… Click for every milestone and what it opens." | delete the meta sentence |Delete |
| 169 | Status bar: Rank | data/figureHints.ts (rank) | "…; the rank follows prestige, which moves mostly at the summer and rises then by at most N points." | "Of N colleges, by prestige." |Trim |
| 170 | Status bar: Satisfaction | figureHints.ts (satisfaction) | "…, at {figure}, and the Students tab shows what serves each." | drop the last clause |Trim |
| 171 | Treasury: Cash | figureHints.ts (cash) | "Cash on hand now; building is paid from it up front, and a building it cannot cover waits for it, a loan or a gift." | "Cash on hand." |Trim |
| 172 | Summer figures | figureHints.ts (applicants, notReturning, nextThousand, projectedCrowding, tuitionLocked) | the clauses after ";" or ":" that explain how each figure is computed | cut to the first clause |Trim |
| 173 | Enrollment chart note | tabs/HistoryTab.tsx:285 | "The class each summer's funnel committed — fed by prestige, tuition and word of mouth. Beds scale the applicant pool, never a hard limit on enrollment." | "Each summer's entering class." |Trim |
| 174 | Programs chart note | HistoryTab.tsx:301 | "… Breadth counts toward prestige as one part of the academics pillar, Curriculum breadth." | first sentence only |Trim |
| 175 | Prestige chart note | HistoryTab.tsx:104 | "Slow to move: graded each summer and stepped toward the grade, with a little drift toward it between summers." | "Graded each summer." |Trim |
| 176 | Cash chart note | HistoryTab.tsx:293 | "… Troughs are the years the college committed to something expensive." | "Cash on hand each summer." |Trim |
| 177 | Prestige grading line | tabs/StandingBreakdown.tsx:140-146 | "each summer, prestige closes N% of a gap upward (at most N points) and N% downward — …" | "This year is grading N." |Trim |
| 178 | Row drift | StandingBreakdown.tsx:181-182 | "… a week — about N over a year if nothing changes." | trim |Trim |
| 179 | Teaching row detail | systems/prestige/prestigeSystem.ts:492 | "… A campus of B's reaches N; only A's everywhere reach N." | drop the second sentence |Trim |
| 180 | Row details | prestigeSystem.ts:563, 571, 647 | "; X earns nothing and Y pays in full." / "; 50 is neutral." / "; nothing is lost at N% or better." | drop the tails |Trim |
| 181 | School row detail | prestigeSystem.ts:769-773 | "No school founded yet — six programs of one school in one hall found it, and finishing every one of them distinguishes it." / "…: distinguished but never founded — its programs were finished without ever sharing one hall." | "No school founded yet." / "Distinguished but never founded." |Trim |
| 182 | Flagships hint | tabs/AthleticsTab.tsx:318 | "… the first on the list. Only a flagship is funded in full and recruits." | drop the last sentence |Trim |
| 183 | Scholarships / back-to-college hints | AthleticsTab.tsx:321, 328 | "…, paid from its own funds rather than the department's: the Treasury's Athletic scholarships line." / "The subsidy the programs do not take is never charged, and the gate they leave is paid to the college each week, as the Treasury's Athletics surplus." | cut the cross-references |Trim |
| 184 | Recruiting tooltip | AthleticsTab.tsx:523 | "…, and lost a class a year when the money stops or the program is no longer a flagship." | drop |Delete |
| 185 | Cut button tooltip | AthleticsTab.tsx:546 | "End {name} for good. The venue stays, for recreation, and the club may form again; the alumni give less for N years." | "End {name} for good." |Trim |
| 186 | No varsity yet | AthleticsTab.tsx:670 | "No sport club has gone varsity yet. The path: a sport club forms on the Students tab, and after N years it may petition to go varsity — …" | "No sport club has gone varsity yet." |Trim |
| 187 | "Slowed" tag tooltip | data/specializationData.ts:132-133 | "Its staff, funding and recruiting would make it X; above N each point comes harder…, so it plays at Y." | "Would be X; plays at Y." |Trim |
| 188 | Research Park notes | tabs/ResearchTab.tsx:363, 380 | " It is open: build it from the capital projects in the build menu." / "A new lab raises the count: it has to finish a project too." | delete the second, trim the first |Trim |
| 189 | No lab yet | ResearchTab.tsx:439-440 | "No research facility has been finished yet. Every school can build one — a lab, an institute, a studio or a computing center — once its building and that program's entry course are done." | "No research facility has been finished yet." |Trim |
| 190 | Research Park tally tooltip | data/researchParkData.ts:157-158 | "{lab} has not finished a research project — every lab that does brings the Research Park closer" | "{lab}: not yet" |Trim |
| 191 | Admissions office line | components/FoundersOffices.tsx:44 | "…; the summer shows it at the price the college sets." | drop |Delete |
| 192 | Close office confirm (P8) | FoundersOffices.tsx:109 | "Confirm — the slot does nothing for N weeks, and its price is not returned" | "Confirm" |Trim |
| 193 | Office allowance tooltip | FoundersOffices.tsx:129 | "Offices the college may hold: one for each of six milestones" | "Offices the college may hold" |Trim |
| 194 | Seat warning | tabs/AdministrationPanel.tsx:96 | "A seat is for good: its salary is paid every year from now on." | "Permanent." |Trim |
| 195 | No campaign | tabs/AdvancementPanel.tsx:45 | "No campaign is ready. Each opens once the college has the alumni for it and the need it answers." | first sentence only |Trim |
| 196 | Founding name caption | data/foundingData.ts:16 | "This will read "X College", and "X University" once the board grants it. A name of its own, such as "Ashford", reads "Ashford College"." | drop the second sentence |Trim |
| 197 | Downtown hints | data/downtownData.ts:239, 257 | "… It costs the college nothing to keep." / ": places the college does not have to build or keep." | drop the tails |Trim |
| 198 | Speed-up note | data/speedUpData.ts:118 | "It fills the share sooner; the share is full at the same mark." | drop after ";" |Trim |
| 199 | Map help | components/CampusMap.tsx:2551 | long help text including "Courses are never sited: a course is not a place, and develops from the Curriculum tab." | delete that sentence, and shorten generally |Delete |
| 200 | Settings note | components/SettingsPanel.tsx:55 | "… Either way, a matter not yet opened stops it once in its final week." | drop the second sentence |Trim |
| 201 | Replace-save note | components/StartupScreen.tsx:384 | "Opening the doors erases X. Go back to the title screen to keep it." | ok, or first sentence only |Keep |
