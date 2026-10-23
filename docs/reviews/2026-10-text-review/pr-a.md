# Plan 111 PR A — the first hour: before and after

*Every player-facing line PR A changed (commit `3d12c82d`), paired from the diff. `${…}` are values the game fills in.*


### `unischool/src/components/OpeningCoach.tsx`

| Before | After |
|---|---|
| The clock is held until this is done | Time is paused until you do this |

### `unischool/src/data/chapterData.ts`

| Before | After |
|---|---|
| develop-second-course / Develop a program's second course | develop-second-course / Start a program's second course |
| A program is ten courses, and the curriculum committee writes each one before it is taught. The committee writes ${COMMITTEE} courses at once, each over ten to fifteen weeks. A program's later courses open once its first is taught. | Each program has ten courses, and each one must be written before it can be taught. The curriculum committee writes ${COMMITTEE} at a time, and each takes ten to fifteen weeks. A program's later courses open once its first course is taught. |
| In the Curriculum, a program's row lists its courses: Develop starts one, with a professor to teach it. | In the Curriculum, find the program and click Develop on its next course. Then pick a professor to teach it. |
| The lamps under the Curriculum button are the committee's seats, one lit for each course being written. | Each lit lamp under the Curriculum button is a course being written. |
| The clock runs at double speed from its second button, or press 2. Space pauses it. | Press 2, or click the second speed button, to run at double speed. Space pauses. |
| every course taught gives the catalog ${SEATS} places, and every student needs one | every course you teach gives ${SEATS} students a place in class, and every student needs one |
| a professor teaches every course, so a growing catalog needs a growing faculty | every course needs a professor, so more courses need more professors |
| Bring back the opening view | Go back to the starting view |
| The campus is seen from one corner at a time, so a tall building hides whatever stands behind it. The view pans, turns a quarter round, tilts and zooms, and moving it changes nothing on the campus. | You see the campus from one corner at a time, so tall buildings can hide what's behind them. You can pan, turn, tilt and zoom the view. Moving the view doesn't change anything on campus. |
| W, A, S and D, or the arrows, pan the map; so does dragging it. | Pan with W, A, S and D, the arrow keys, or by dragging the map. |
| Q and E turn the view a quarter round, to see behind a building. | Turn the view with Q and E to see behind buildings. |
| Z and X tilt it, and the scroll wheel zooms in and out. | Tilt with Z and X. Zoom with the scroll wheel. |
| Home brings back the view the college opened on. | Press Home to go back to the starting view. |
| a spot behind a tall building, and the way a path reaches it, show once the view turns | turning the view shows the space behind tall buildings, and whether a path reaches it |
| a path laid behind a building is hidden from one corner and plain from the next | a path hidden behind a building from one side is easy to see from another |
| site-residence-hall / Site a residence hall | site-residence-hall / Place a residence hall |
| site-dining-hall / Site a dining hall | site-dining-hall / Place a dining hall |
| Students need somewhere to sleep and somewhere to eat, and the campus has neither yet. A residence hall gives beds and a dining hall gives meals, each for a set number of students. Most students commute, but they still judge a campus by its beds and its meals. | Your students need somewhere to sleep and somewhere to eat, and the campus has neither yet. A residence hall gives beds, and a dining hall serves meals, each for a set number of students. Most students commute, but they still judge the college by its beds and meals. |
| The build menu rings the next residence hall: pick it up and set it down anywhere on the map. | Open the build menu and click the ringed residence hall. Then click the map to place it. |
| Then the same for a dining hall. | Do the same with a dining hall. |
| The cost is paid when a building is placed; it opens when its weeks of building are done. | You pay when you place a building. It opens when construction is finished. |
| Satisfaction / beds and meals are two of the needs that make the students content | Satisfaction / beds and meals are two of the needs that keep students happy |
| , text: "content students speak well of the college, and next summer | , text: "happy students speak well of the college, and next summer |
| seat-every-student / Places for every student | seat-every-student / A place in class for every student |
| Every student needs a place in the catalog, and each course taught adds ${SEATS}. Until the catalog has a place for everyone, the students short of one are less content. | Every student needs a place in class, and each course you teach adds ${SEATS} places. Students without a place are less happy. |
| Develop more courses in the programs the college teaches, as many at once as the committee has seats. | Develop more courses in your programs. The committee can write a few at once. |
| Found another program in a free slot of Founders Hall, with a professor to teach it. | Found another program in a free slot in Founders Hall. It needs a professor to teach it. |
| Appoint a professor from the Faculty tab's market when a course has nobody to teach it. | If a course has nobody to teach it, hire a professor from the market in the Faculty tab. |
| Satisfaction / class seats are part of the academic need: every student without one pulls it down | Satisfaction / class places are part of the academic need, so every student without one pulls it down |
| the summer admits no more students than the catalog has places for | the summer admits no more students than you have places for |
| weekly-surplus / Take in more each week than the college spends | weekly-surplus / Earn more each week than you spend |
| Tuition comes in every week, and salaries, upkeep and teaching go out every week. A building or a course is paid for in full when it starts. Cash under a term of expenses worries the board, and term after term of deficit walks the college down its scale, as far as a construction freeze. | Tuition comes in every week, and salaries, upkeep and teaching costs go out. You pay for a building or a course in full when you start it. If you keep losing money, the board steps in, and in the end it can stop all building. |
| The funds figure on the dock opens the Treasury: the week's income and costs, line by line. | Click your funds at the bottom of the screen to open the Treasury. It lists each week\ |
| When cash falls short of a building, the build menu offers a loan for the difference, repaid weekly. | If you can't afford a building, the build menu offers a loan for the difference. You repay it weekly. |
| The Treasury's board scale says where the books stand, from sound down to an interim CFO. | The board scale in the Treasury shows how worried the board is, from sound down to an interim CFO. |
| every building and course is paid from cash, and a freeze stops them all | buildings and courses are paid from cash, and a board freeze stops them all |
| salaries are paid every week, and every appointment adds one | salaries are paid every week, and each new professor adds one |
| , text: "tuition is most of the income, and each summer sets the next class | , text: "tuition is most of your income, and each summer you set the next class |
| set-first-class / Set the first class's price and admit rate | set-first-class / Set the first class's tuition and admit rate |
| Week 52 is the summer, and the year stops there for three pages: the year in review with its report card, admissions, and the students' petitions. In admissions the price comes first, and it holds for that class's four years. The applicants it drew come next, then the share the college admits. | Week 52 is the summer. The year pauses for three pages: the year in review, admissions, and the students' petitions. In admissions you set tuition first, and the new class pays that price for all four years. |
| Tuition: the slider says whether a price is in line with the college's standing. The applicants show only once it is set. | Tuition: the slider shows whether a price fits your college's standing. You see the applicants only after you set it. |
| Admit rate: every consequence shows before the choice, the places left in the catalog among them. | Admit rate: you see every result before you choose, including how many class places are left. |
| The report card grades each part of prestige, and shows the step prestige takes next. | The report card grades each part of prestige, and shows where prestige goes next. |
| , text: "a class | a class pays its tuition for four years, so a small class leaves you short for four years |
| the admit rate sets how many come, and a thin class thins the income and the classrooms both | the admit rate sets how many students come, and a small class means less income and emptier classrooms |
| , text: "the report card is prestige | the report card judges the year, and prestige starts next year from it |
| open-history / Open History, where prestige's make-up is | open-history / Open History to see what prestige is made of |
| prestige-rising / Prestige's target above prestige | prestige-rising / Prestige heading up |
| Prestige is the college's name in the world, and satisfaction is how content its students are. Each drifts week by week toward a target. Prestige's target blends four pillars, academics, research, student life and athletics, with the endowment, less run-down buildings; both figures move slowly. | Prestige is your college's reputation. Satisfaction is how happy your students are. Neither one jumps: each moves a little every week toward a target. |
| History shows prestige's target and what makes up each pillar; the readout above gives each pillar's points now. | History shows where prestige is heading, and what each of its four pillars adds: academics, research, student life and athletics. |
| The Students tab shows the five needs and the one pulling satisfaction down most. | The Students tab shows the five needs, and which one pulls satisfaction down most. |
| Nobody sets either figure: the college raises a target, and the figure follows. | Your endowment raises where prestige is heading, and run-down buildings lower it. |
| prestige draws applicants, and content students tell the next class to come | prestige draws applicants, and happy students tell others to come |
| the committee gains a seat at prestige 70, 80, 90 and 100 | the committee gets another seat at prestige 70, 80, 90 and 100 |
| under 50 satisfaction a share of each class leaves at the summer, and from year 3 under 60 brings demands | below 50 satisfaction some students leave each summer, and from year 3 below 60 brings demands |
| every-program-staffed / Every program staffed | every-program-staffed / Staff every program |
| post-a-search / Post a search, when the market has nobody in a field | post-a-search / Post a search if the market has nobody in a field |
| Appoint a professor who teaches at B or better | Hire a professor with teaching ${GRADE_B} or more |
| Each professor teaches out of 100 and does research out of 100, and both grow with the years toward a potential set when they arrive. The rank beside a name, from Adjunct to Distinguished, only reads the average of the two. The market lists few people in a thin field, and an unstaffed course darkens its whole program. | Each professor has a teaching score and a research score, both out of 100. Both grow over the years toward the potential the professor arrived with. A course with no professor goes dark, and so does its whole program. |
| The Faculty tab's market lists who can be appointed; a course's grade follows its professor's teaching. | The market in the Faculty tab lists who you can hire. A course's grade follows its professor's teaching. |
| A search spends two weeks of running costs to turn somebody up in one field within half a year. | If nobody in a field is on the market, post a search. It costs two weeks of running costs and finds someone within half a year. |
| Salaries grow with skill and seniority, and every course needs a professor in its field. | The rank beside a name, from Adjunct to Distinguished, is the average of the two scores. |
| teaching quality is one of the parts of the academics pillar | teaching quality is part of the academics pillar |
| a dark program loses its places until somebody teaches it again | a dark program loses its class places until someone teaches it again |
| later, the labs run on the research half of the same professors | later, your labs use the research scores of these same professors |
| site-academic-hall / Site an academic hall | site-academic-hall / Place an academic hall |
| claim-a-hall / Give a hall three programs of one school | claim-a-hall / Put three programs from one school in one hall |
| Founders Hall has six program slots, and each academic hall adds six more. When three programs of one school share a hall, that school claims the hall and gives it its name. Six programs together found the school. | Founders Hall has six program slots, and each academic hall adds six more. When three programs from the same school share a hall, the hall becomes that school's. Six programs there found the school. |
| The build menu lists the first academic hall once eight courses are taught. | The first academic hall appears in the build menu once eight courses are taught. |
| A program moves from its hall's panel: four weeks out of Founders Hall, twelve from anywhere else. | To move a program, click the hall it is in, pick the program, and click Move to. It stops teaching for 4 weeks if it leaves Founders Hall, or 12 from any other hall. |
| The Curriculum groups the programs by school. | The Curriculum groups your programs by school. |
| a founded school opens the first laboratory, and with it research | a founded school can build the first laboratory, which starts research |
| the breadth of the curriculum and the depth of its schools lead the academics pillar | more subjects, and fuller schools, raise the academics pillar |
| Each new chapter's briefing opens by itself, once. J opens the objectives at any time. | Each new chapter's briefing opens on its own, once. Press J to open the objectives at any time. |
| The objectives stay one line in the ticker; J or a click opens them. | The objectives stay as one line at the bottom of the screen. Press J or click it to open them. |
| No chapters: the ticker as it was before, and nothing waits for a chapter (for this college, even if they are turned back on). | No chapters, and nothing waits for one. For this college, that stays true even if you turn chapters back on. |
| ${title} opens when the chapter before it is done. | ${title} opens when you finish the chapter before it. |
| Prestige ${now}, its target ${target} | Prestige ${now}, heading for ${target} |

### `unischool/src/data/eventData.ts`

| Before | After |
|---|---|
| Found a program in Founders Hall, with a professor to teach it / , hallId: FOUNDERS_HALL_ID, intent: { kind:  | Found a program in Founders Hall / , hallId: FOUNDERS_HALL_ID, intent: { kind:  |
| Places for ${countOf(placesComing(s))} of ${countOf(totalEnrolled(s.students))} students, counting courses under way: more when the committee has room / , intent: { kind:  | Places for ${countOf(placesComing(s))} of ${countOf(totalEnrolled(s.students))} students, counting courses under way. More can start when the committee has room / , intent: { kind:  |
|  ${p.school} is as close as any, with one program in ${hallName(s, p.hallId)}. |  ${p.school} is closest, with one program in ${hallName(s, p.hallId)}. |
| the founding faculty is ${list(faculty)} / nobody is on the payroll to teach them | your founding faculty is ${list(faculty)} / nobody has been hired to teach them |
| The ${s.self.name} board wishes you well. Three hundred and fifty students are on the books and ${staff}, but there is not one course yet, and Founders Hall, the only building we own, stands empty. ${offers.length > 0 ?  / , and the market lists ${list(listed)} /  : ''}Open Founders Hall on the map and found a program into a free program slot: its first course goes to the curriculum committee the moment it is founded. Each course taught gives the catalog eighty places, and a place for every student is the first thing the money is for. | Welcome to ${s.self.name}. 350 students have enrolled, and ${staff}. But there isn't a single course yet, and Founders Hall, your only building, stands empty. ${offers.length > 0 ?  / , and you can hire ${list(listed)} from the market /  : ''}Open Founders Hall on the map and found a program in a free slot. Its first course goes to the curriculum committee straight away. Each course you teach gives 80 students a place in class, and every student needs one. |
| , ${money(hall.cost)}, ${count(hall.duration)} weeks to build | , costs ${money(hall.cost)} and takes ${count(hall.duration)} weeks to build |
|  : ` Founders Hall teaches ${count(schools.length)} ${schools.length === 1 ?  / } under one roof${schools.length > 1 ? ` — ${list(schools)}` :  |  : ` Founders Hall holds programs from ${schools.length === 1 ?  / ${count(schools.length)} schools (${list(schools)}) |
| ${count(FIRST_HALL_COURSE_GATE)[0].toUpperCase()}${count(FIRST_HALL_COURSE_GATE).slice(1)} courses: this college has a curriculum.${roof} ${elm} is the first hall the college can build: six program slots more${terms}. Site it now; which school grows where is yours to decide. | You now teach ${count(FIRST_HALL_COURSE_GATE)} courses, and the college needs more room.${roof} You can build ${elm}, your first academic hall. It adds six program slots${terms}. Place it now. You decide which school grows where. |
| Site ${hallName(s, FIRST_HALL_ID)} / , intent: { kind:  | Place ${hallName(s, FIRST_HALL_ID)} / , intent: { kind:  |
| Students need somewhere to sleep and somewhere to eat.${campusFigures(s)}${campusLack(s)} A college with nowhere to sleep and nowhere to eat talks itself down, and next summer's applicants hear it. Site a residence hall and a dining hall. | Your students need somewhere to sleep and somewhere to eat.${campusFigures(s)}${campusLack(s)} Students talk, and next summer's applicants will hear about it. Place a residence hall and a dining hall. |
| Site a residence hall and a dining hall | Place a residence hall and a dining hall |
| At week 52 the clock stops for the summer, and it stops once. Three steps: the year in review, admissions and the students. Admissions asks two things — the price, and how much of the applicant pool to take. Understand one thing before you set the price: it is set blind, it locks, and the class that pays it pays it for four years. What a family is quoted is what they pay, and a college nobody has heard of cannot charge what a famous one does. | At week 52 the year pauses for the summer. You'll see three pages: the year in review, admissions, and the students. In admissions you make two choices: the tuition, and how many applicants to admit. Set tuition carefully. You set it before you see the applicants, you can't change it later, and this class pays it for all four years. A college nobody has heard of can't charge what a famous one does. |
| Summer at week 52: the price locks for four years | Summer at week 52: tuition is fixed for four years |
| ${elm} stands, with six program slots. Founders Hall is where the college began; its schools grow in the halls it builds. Three programs of one school in a hall make it that school's: from then it offers that school's programs in place of the three on offer, and the three again once that school has none left to found. Six found the school, and the hall takes its name.${closestLine(s)} Found the school's programs into its hall, or move them there from Founders Hall, which takes ${count(FOUNDERS_MOVE_WEEKS)} weeks; a move between other halls takes ${count(RELOCATION_WEEKS)}. Each program that leaves Founders Hall frees a slot there, for another program or, in time, an office of the administration. | ${elm} is open, with six program slots. Your schools will grow in halls like this one. When three programs from one school share a hall, it becomes that school's hall. After that, its free slots offer only that school's programs, until none are left to found. Six programs in one hall found the school, and the hall takes its name.${closestLine(s)} Found new programs in the hall, or move them in from Founders Hall. A move from Founders Hall takes ${count(FOUNDERS_MOVE_WEEKS)} weeks, and a move between other halls takes ${count(RELOCATION_WEEKS)}. Every program that leaves Founders Hall frees a slot there for another program, or later for an office. |
| A school needs six programs of one school in one hall. | A school needs six of its programs in one hall. |
|  ${hall} is ${p.school}'s hall now: it offers every ${p.school} program the college can found, in place of the offers, until none is left. | ${hall} now belongs to ${p.school}. Its free slots offer only ${p.school} programs until you've founded them all.  |
| ${p.school} has ${count(p.housed)} of six in ${hall}.${offers} ${count(6 - p.housed)[0].toUpperCase()}${count(6 - p.housed).slice(1)} more ${p.school} ${6 - p.housed === 1 ? 'program' : 'programs'} there found the School of ${p.school}. | ${offers}${p.school} has ${count(p.housed)} of the six programs it needs in ${hall}. Found ${count(6 - p.housed)} more there to create the School of ${p.school}. |

### `unischool/src/data/ladderData.ts`

| Before | After |
|---|---|
| The college teaches four subjects now. The board thinks the students have earned somewhere to be when they are not in class. | You teach four programs now. The board thinks your students have earned somewhere to spend time between classes. |
| The first class has walked, and the college has a year behind it: enough to see the year laid out, how content the students were and what they need, what the guidebooks make of it, and the clubs the students have started. | Your first year is over. The Students tab is open now. It shows how happy your students are, what they need, what the guidebooks say about you, and the clubs students have started. History keeps a record of each year. |
| ${FIRST_HALL_COURSE_GATE} courses is a curriculum, and a curriculum outgrows one building. The first academic hall is yours to site. | You now teach ${FIRST_HALL_COURSE_GATE} courses, and the college needs more room. You can build your first academic hall. |

### `unischool/src/data/openingData.ts`

| Before | After |
|---|---|
|  As it stands, ${list(wants)}. |  Right now, ${list(wants)}. |
|  The college has ${count(totalEnrolled(s.students))} students, ${count(s.students.capacity)} beds and ${count(seats)} dining seats. |  You have ${count(totalEnrolled(s.students))} students, ${count(s.students.capacity)} beds and ${count(seats)} dining seats. |
| Skip the walkthrough? It doesn’t come back this run. | Skip the walkthrough? You can’t bring it back in this game. |
| The ${s.self.name} board wishes you well. Three hundred and fifty students have enrolled, and the college is yours to build. It begins with one building, Founders Hall, where the first classes will meet. | Welcome to ${s.self.name}. 350 students have enrolled, and the college is yours to build. You start with one building, Founders Hall. The first classes will meet there. |
| Every building comes from the build menu at the foot of the screen. Click Founders Hall to pick it up, then click anywhere on the map to set it down — its footprint follows the pointer. | Buildings come from the build menu at the bottom of the screen. Click Founders Hall to pick it up. Then click anywhere on the map to place it. |
| ${countWord(n)[0].toUpperCase()}${countWord(n).slice(1)} are on offer in Founders Hall, each with its professor already appointed. / One is on offer in Founders Hall, with its professor already appointed. | ${countWord(n)[0].toUpperCase()}${countWord(n).slice(1)} are on offer in Founders Hall, and each already has a professor. / One is on offer in Founders Hall, and it already has a professor. |
| Programs are what the college teaches. ${offered} Click the ringed slot, pick any one, and found it. | Programs are the subjects your college teaches. ${offered} Click the ringed slot, pick one, and click Found. |

### `unischool/src/data/researchParkData.ts`

| Before | After |
|---|---|
| ${lab} has not finished a research project yet — commission one | ${lab} hasn't finished a research project yet: start one |

### `unischool/src/systems/guidance/establish.ts`

| Before | After |
|---|---|
| Establish ${second ? 'another' : 'a'} school: six programs of one school in one hall | Establish ${second ? 'another' : 'a'} school: put six programs from one school in one hall |
| Establish ${second ? 'another' : 'a'} school: six programs of ${p.school} in one hall (${p.housed} of 6) | Establish ${second ? 'another' : 'a'} school: put six ${p.school} programs in one hall (${p.housed} of 6) |
| move ${programName(intent.programId)} to ${hallName(intent.hallId)} to make room | move ${programName(intent.programId)} out to ${hallName(intent.hallId)} to make room |
| , one of ${countWord(short)} more ${p.school} programs that make it ${p.school}'s hall |  (${countWord(short)} more make it ${p.school}'s hall) |
| no ${p.school} program is on offer | wait for a ${p.school} program to be offered |

### `unischool/src/systems/guidance/nextStep.ts`

| Before | After |
|---|---|
| The board has written | The board has written to you |
| ${last.length} matters lapse this week: ${text} / Lapses this week: ${text} | ${last.length} matters need an answer this week: ${text} / Answer this week: ${text} |
| a library would raise it | build a library |
| a student center or a recreation building would raise it / studentCenter | build a student center or a recreation building / studentCenter |
| a dining hall would raise it | build a dining hall |
| a health center or a gym would raise it / healthCenter | build a health center or a gym / healthCenter |
| a residence hall would raise it | build a residence hall |
| the ${other.name} would raise it / , intent: { kind:  | build the ${other.name} / , intent: { kind:  |
| ${build.text}, and the first opens with ${gate.condition} | ${build.text}, which opens with ${gate.condition} |
| more library seats would raise it (a story on the library, or another) | add library seats with another story or a second library |
| the library has room; better teaching would raise it | better teaching would raise it (the library has room) |
|  — found ${countWord(short)} more ${program.school} ${short === 1 ? 'program' : 'programs'} here to make it ${program.school}'s hall | . ${countWord(short)[0].toUpperCase()}${countWord(short).slice(1)} more ${program.school} ${short === 1 ? 'program' : 'programs'} there will make it ${program.school}'s hall |
|  — it teaches ${program.school} | , ${program.school}'s hall |
| ${nameOf(home)} has room for ${program.name}, on offer${tail} / , hallId: home, intent: { kind:  | Found ${program.name} in ${nameOf(home)}${tail} / , hallId: home, intent: { kind:  |
| ${nameOf(open)} has a free program slot — ${offers.join(', ')} ${offers.length === 1 ? 'is' : 'are'} on offer | ${nameOf(open)} has a free slot: found ${offers.length === 1 ? offers[0] :  |
| ${nameOf(claim.hallId)} has room for ${claim.school} (${claim.housed} of ${claim.slots}): ${own.length === 1 ? own[0].name :  / } on offer there | Found ${own.length === 1 ? own[0].name :  / } in ${nameOf(claim.hallId)} (${claim.school}: ${claim.housed} of ${claim.slots}) |
| Nothing on offer has a hall to go to — site ${nextHall.name} | Place ${nextHall.name}: no hall has room for the programs on offer |
| ${nameOf(FOUNDERS_HALL_ID)} has room for ${claimed.school} when one is on offer | ${nameOf(FOUNDERS_HALL_ID)} has room for a ${claimed.school} program once one is on offer |
| ${nameOf(claimed.hallId)} has room only for ${claimed.school}, and nothing of ${claimed.school} is left to offer | ${nameOf(claimed.hallId)} only takes ${claimed.school} programs, and none are left to found |
| The ${major.name} program is one course from being established${course ?  | Develop ${course.name} to establish the ${major.name} program / The ${major.name} program is one course from being established |
| ${need} — ${name} opens in ${weeksProse(coming.weeks)} / , hallId: coming.building.id, intent: { kind:  | ${need}. ${name} opens in ${weeksProse(coming.weeks)} / , hallId: coming.building.id, intent: { kind:  |
| ${need}; ${name} opens in ${weeksProse(coming.weeks)} | ${need}. ${name} opens in ${weeksProse(coming.weeks)} |
| ${need}; ${remedy.text} | ${need}: ${remedy.text} |
| ${names[0]} is dark: staff it | ${names[0]} has a course with no professor: staff it in the Curriculum |
| ${names.length} programs are dark — ${names[0]} and more; staff them from the market | ${names.length} programs have courses with no professor, ${names[0]} first: staff them in the Curriculum |
| ${lab.name} is idle — commission research | ${lab.name} is idle: start a research project |
| Idle cash counts for nothing — set a standing sweep into the endowment | Set up a sweep to move spare cash into the endowment |
| Site Founders Hall: the clock waits until it stands / , urgent: true, intent: { kind:  | Place Founders Hall. Time is paused until you do / , urgent: true, intent: { kind:  |

### `unischool/src/systems/guidance/seating.ts`

| Before | After |
|---|---|
| ${places}: found ${housed ? 'another' : 'a'} program in ${hall}, with a professor to teach it | ${places}: found ${housed ? 'another' : 'a'} program in ${hall} |
| ${places}: appoint a ${field} professor to develop ${courseName(course)} | ${places}: hire a ${field} professor to develop ${courseName(course)} |
| ${places}: develop ${courseName(course)}, ${SEATS_PER_COURSE} more | ${places}: develop ${courseName(course)} for ${SEATS_PER_COURSE} more |
