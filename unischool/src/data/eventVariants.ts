// Second and third tellings (Plan 70I, "words that don't repeat"): every
// catalogue event with a cooldown of five years or less comes round often
// enough that its one text wore thin. Each gets two more, in the same voice,
// naming the same placeholders and setting up the same choices. Which one a
// firing reads is picked by a hash of the event and the year, never the
// run's stream, and never the text it read last time
// (systems/events/catalogue.ts's eventText).

export const EVENT_VARIANTS: Readonly<Record<string, readonly [string, string]>> = {
  'roof-goes': [
    'The wind took a piece of the roof off {building} at about two in the morning. The night guard found most of it on the lawn at six. Facilities would like the word \'structural\' kept out of any email until they\'ve been up a ladder.',
    'Part of the roof of {building} is now in the parking lot. Facilities went up to look and came down with a quote, and a face the secretary called \'professionally neutral\'.',
  ],
  'star-poached': [
    '{faculty} has had an offer from a university whose name everybody knows and whose students nobody remembers. The offer is generous. They\'ve left the letter on your desk, face up.',
    'A headhunter has taken {faculty} to lunch, twice. They told you so themselves in the corridor, the way people mention the weather where the weather matters.',
  ],
  'heating-fails': [
    'The boilers in the older buildings gave up on the coldest morning of the year. The seminar rooms are at forty-eight degrees. Students have started bringing thermoses and blankets, and in one case a dog.',
    'The older buildings have had no heat since Sunday. Lectures go ahead in coats and scarves. Without anyone deciding it, the library has become the warmest and most crowded room on campus.',
  ],
  'prize-won': [
    'A student of {program} has won a national prize, and the department has put the certificate in its office window where nobody can miss it. It has also, quietly, asked for more funding.',
    'The national prize has gone to one of yours, a student of {program}. The student\'s parents called to say thank you, which almost never happens. The department would like to know what you plan to do about it.',
  ],
  'boiler-condemned': [
    'The boiler in {building} failed its inspection by a margin the inspector called \'educational\'. It is off, labeled and locked. Facilities has dug out the two memos in which it warned you.',
    'An inspector spent forty minutes in the boiler room of {building}, then came out and condemned the boiler. The building is cold and the notice on the door is red. Facilities would like its earlier warnings read into the minutes.',
  ],
  'roof-slates': [
    'A slate came off {building} this morning and broke on the path where the freshmen line up for lunch. It\'s the ninth this month. Facilities has started keeping them, stacked by date, in case anyone needs persuading.',
    'The roof of {building} has shed a slate or two a week since the fall. Someone has chalked a line on the path that nobody is to cross, and nobody knows who drew it first.',
  ],
  'derelict-notice': [
    'The town council has written about the state of {building}. The first paragraph admires your college. The second mentions the council\'s powers under a section the secretary had to look up. A photograph is enclosed, taken on a gray day from an unflattering angle.',
    'A letter from the town about {building}. It\'s polite and precise, and it ends with the word \'eyesore\' in quotation marks, as if someone else had said it first. The secretary has underlined it anyway.',
  ],
  'flooded-basement': [
    'Overnight, water came up through the basement floor of {building} and stayed until morning. The archive boxes on the bottom shelf, which was the floor, are now the wettest records you own.',
    'There are nine inches of water in the basement of {building}, with the archive in it. The boxes sit on the floor because the shelving was put off in the year everything was put off. The Archivist would like to be there when they\'re opened.',
  ],
  'overdraft': [
    'The bank would like a word about the operating account. Its letter is so politely worded that the CFO read it twice before seeing it was a warning.',
    'A letter from the bank about the overdrawn account. It begins \'as you will be aware\'. Three careful paragraphs later, it ends with the date by which you\'re expected to be aware of it.',
  ],
  'audit-qualified': [
    'The auditors have told the CFO in person that they will qualify the accounts. They\'ve offered to work on the wording together, which is generous. They\'d do it in front of the Audit Committee, which is not.',
    'The external auditors mean to qualify their opinion. It\'s one paragraph long. As a courtesy, they\'ve offered a meeting to discuss it, with the whole Audit Committee there.',
  ],
  'frozen-post': [
    'A teaching post has now been empty longer than it was ever filled. The department has stopped raising it at meetings, which, Academic Affairs says, is how you know it matters. {candidate}, who teaches {candidateField}, has written to ask if it\'s still open.',
    'Under the construction freeze, an empty teaching post has become a budget line marked \'held\'. Students on the program want to know who will teach them in the spring. The department would like it to be {candidate}, who teaches {candidateField}.',
  ],
  'press-inquiry': [
    'A journalist has sent eleven questions and a deadline. The questions are specific, which means someone has already given them the answers. The Communications Officer needs to know what to say, today.',
    'A reporter from the regional paper keeps calling the CFO\'s office, and the questions have the figures in them. The piece runs on Friday. You can be in it, or be described in it.',
  ],
  'tenure-case': [
    'The tenure file of {faculty} has reached your desk, which is where files go when nobody below wants to decide. The department is for, the committee is against, and the outside reviewer is admiring but no help.',
    'The tenure case of {faculty} has reached you with two recommendations that disagree. The outside letter praises the candidate for a page and a half, then stops without a verdict, as if interrupted.',
  ],
  'sabbatical-overrun': [
    'A sabbatical ended in September. The professor on it did not. A warm letter, full of progress, asks for another year. The colleague covering the teaching would like a word.',
    'A professor\'s year of leave is now in its second year. By all accounts the research is going very well. The courses are being taught by someone else, who would like to know for how much longer.',
  ],
  'teaching-review': [
    'This year\'s teaching evaluations are the lowest on file. The Dean\'s office has read every comment. It reports that the tone isn\'t anger but resignation, which is much harder to answer.',
    'The student scores on teaching have fallen for a third year. The comments are polite. Several of them begin with \'as usual\'.',
  ],
  'accreditation-visit': [
    'The accreditation self-study is due this term, along with evidence of improvement. The Registrar has been heard asking what, exactly, counts as evidence.',
    'The accreditation self-study is on the calendar. The document is long and the schedule is short. The section on \'continuous improvement\' is so far just a heading.',
  ],
  'program-thin': [
    'Applications to {program} have fallen again. The department says a university without it wouldn\'t be a university, which is a real argument. It also says the numbers will recover, which is a hope.',
    'This year\'s freshman class in {program} could meet in the Dean\'s office, and once did, when the seminar room was double-booked. The department\'s report asks for patience. The budget asks for a decision.',
  ],
  'sit-in': [
    'Students have occupied the entrance hall of {building}. They have a list of demands, most of them reasonable, plus a sign-up sheet and a coffee maker. They\'ve been scrupulously polite to everyone who walks past.',
    'About forty students and a banner have occupied the foyer of {building} since Monday. They have six demands, and you agree with four of them. The cleaning staff report that the occupiers tidy up after themselves.',
  ],
  'newspaper': [
    'The student newspaper would like money, a room, and a promise that you won\'t see the pages before they print. The editor has written all this as one carefully punctuated sentence.',
    'A delegation from the student paper brought three requests to your office on one sheet. They want funds, an office and editorial independence, in that order, and the last one is underlined.',
  ],
  'dining-petition': [
    'Eleven hundred students have signed a petition about the dining hall, which is more than {school} enrolls. The caterer has sent a copy of the contract with the relevant clauses highlighted, and the caterer is right.',
    'A petition about the food has more signatures than {school} has students. The catering company points out, correctly and at length, that it is doing exactly what it was hired to do.',
  ],
  'winter-outbreak': [
    'Something is going around the residence halls. The Health Center saw ninety students this week. It has nowhere to put the ones who need to be kept away from their roommates.',
    'The flu has reached the residence halls, and beds are the problem. The sick share rooms with the well. The Health Center has four beds and is asking for forty.',
  ],
  'annual-fund-drive': [
    'Development would like to run a phone campaign, with students calling alumni in the evenings from a script. The last one paid for itself fifteen times over, and drew two complaints about its manners.',
    'The Development Office\'s plan for the annual fund uses the telephone. It admits that\'s old-fashioned, and says it pays, which is the point. It needs your decision and a room with fifteen phones.',
  ],
  'class-complaint': [
    'Nineteen of the {class} have signed a letter. The campus changed without them, a custom of theirs quietly stopped, and they learned of both from a newsletter. The letter isn\'t angry. It\'s disappointed, which is worse.',
    'A letter from the {class}, polite, signed by many of them, and hurt. They\'d have liked to be told before the campus changed around them, and before the tradition they started quietly stopped.',
  ],
  'yield-panic': [
    'Deposits are down on this week last year. The Dean of Admissions proposes a second round of offers, which would fill the class. The Dean would also like to call it something else.',
    'The confirmed class is short, and it\'s late in the cycle. Admissions has a list of names to offer places to next. It would like your permission, and would rather the word \'waitlist\' appeared nowhere.',
  ],
  'tuition-letter': [
    'A parent has written four careful pages about tuition, with last year\'s viewbook and this year\'s side by side. The letter ends with a question. What, exactly, is the difference for?',
    'A sophomore\'s parent has written about tuition. The letter is patient and well argued, and it encloses receipts. It asks, reasonably, what the increase has bought.',
  ],
  'recruiting-trip': [
    'Admissions wants to recruit in two more states. The proposal is short and ends with its best line. Students who have never heard of {school} aren\'t going to apply to it.',
    'The admissions team would like a bigger map, with more states, more high schools and more college fairs. Their case, put plainly, is that {school} is known in the county and nowhere else.',
  ],
  'good-year': [
    'Fewer students are dropping out, and three wrote to thank you, unprompted, in the same week. Academic Affairs is delighted, slightly alarmed, and would like to know why.',
    'Nobody can point to the reason, but the year is going well. Students are staying and the numbers are kind. You\'ve even had a thank-you letter that didn\'t ask for anything.',
  ],
  'bad-run': [
    'Nothing in particular has gone wrong this year, and everything has gone a little wrong. It shows in the empty seats at lectures, and in the old notices nobody has taken down.',
    'A long, gray stretch, with no scandal and no disaster. Student Affairs calls the steady wearing-down \'morale, in the plural\'. Attendance is falling at everything optional.',
  ],
  'one-teacher': [
    'Next term\'s schedule has the same three instructors in nearly every hour. It works on paper. The Registrar has added a note in pencil: \'provided nobody catches anything\'.',
    'The draft schedule is back from the Registrar, and three names teach almost all of it. It can be run. The Registrar would like it on record that it can be run until the first cold of winter.',
  ],
  'the-ice-walk': [
    'The path from the halls to the dining hall iced over in the night. Students reached breakfast by sliding, holding on, or not at all. The Health Center reports bruises, laughter and one sprained wrist.',
    'The main walk froze solid overnight, and the freshmen crossed it to breakfast the only way they could. Facilities calls it \'a learning experience\'. The nurse has strapped one wrist.',
  ],
  'the-heating-bill': [
    'December\'s heating bill is in. The CFO circled the total in red, then, unable to help it, circled it again in blue.',
    'The gas bill for the first cold month is bigger than the CFO budgeted for the whole term. The total has been circled twice, in two different pens.',
  ],
  'the-snow-day': [
    'Eleven inches of snow fell overnight, and the Registrar wants to know if classes will run. The students have already built a snowman on the main lawn, wearing a mortarboard.',
    'A foot of snow on a teaching day. The Registrar would like your ruling by eight. Judging by the snowball fight on the main lawn, the students have already ruled.',
  ],
  'the-championship-run': [
    'The {sport} team are champions, and the campus hasn\'t gone to bed. The boosters want a parade and the athletics department wants a new scoreboard. Academic Affairs, pointedly, wants the class schedule back.',
    'The {sport} team has won the title, and the party is in its third day. The boosters are planning a parade and the athletics department is pricing scoreboards. Attendance at 9 a.m. lectures is a rumor.',
  ],
  'the-rival-prank': [
    '{rival}\'s colors are flying from the top of your tallest building. They went up some time after midnight, and Student Affairs can already name who did it. Your own students would like to reply.',
    'Someone from {rival} climbed your highest roof last night and left a banner. Student Affairs has names and a photograph. A delegation of your students is asking permission to return the favor.',
  ],
  'the-rankings-slip': [
    'The board chair came to the meeting with this year\'s guide, open at your college\'s entry and underlined twice. She has a question about it, and a consultant a friend recommended.',
    'Your college sits low in the guide, and the board chair has noticed. She put the page on the table at the start of the meeting. She asked what the plan was, and whether it involved a consultant.',
  ],
  'the-noise-complaint': [
    'The neighbors have written again about Thursday nights. There\'s been singing, shouting, and a road sign that turned up in their yard. They\'d like a meeting, and they\'ve copied the local paper.',
    'Another letter from the houses across the street about the noise on Thursday nights. This one has a photo of a traffic cone on their garage, and the local paper is copied in.',
  ],
  'the-all-nighter': [
    'The library was full at 4 a.m. for the third week running, and the nurse is treating more exhaustion than illness. The student paper has put the story on the front page, with a list of demands.',
    'The reading rooms are busier at three in the morning than at three in the afternoon, and the college nurse has started counting. The student paper has made it the front page.',
  ],
  'the-grant-windfall': [
    'A foundation has funded {faculty}\'s proposal, and the overhead alone is bigger than the department\'s budget. The award letter asks for your signature beside the professor\'s.',
    'The grant has come through for {faculty}, and the overhead alone would pay for the department. The foundation would like you to countersign.',
  ],
  'the-car-park': [
    'Facilities sold three hundred and forty permits for a parking lot with two hundred and twelve spaces, trusting that people come and go. On the first Monday of term, everybody came, and nobody went.',
    'The staff parking lot has about a hundred and thirty more permits than spaces. This was fine until the second Monday of term, at about 8:45, when it wasn\'t.',
  ],
  'the-burst-pipe': [
    'A pipe above the second floor of {building} burst on Saturday night and ran until the first class on Monday. The custodians have stacked the ceiling tiles in the corridor to dry, numbered.',
    'All weekend, water came through the ceiling of {building} from a pipe nobody knew was there. The Monday seminar found it. The custodians have already mopped, stacked and labeled everything, and Facilities has praised them.',
  ],
  'the-buckets': [
    'There are now nine buckets in the top corridor of {building}, catching rain from a gutter that has given up. The custodians empty them twice a day and log how much they hold. The numbers are rising.',
    'The top floor of {building} leaks along the gutter whenever it rains. The custodians keep a notebook of how much water they carry out each day. It\'s now on its second volume, and would like a reader.',
  ],
  'the-lift': [
    'The elevator in {building} has stuck between floors again. It\'s the fourth time this term, and this time a department chair was inside for fifty minutes. The chair\'s memo arrived shortly after.',
    'The elevator in {building} failed once more and trapped a department chair for most of an hour. The chair wrote a memo on the spot, on the back of an agenda. It points out that the stairs aren\'t an option for everyone.',
  ],
  'the-timetable-clash': [
    'The new schedule puts both required courses for {program} at the same hour on the same day. Forty students can\'t finish on time unless they can be in two places at once. The Registrar blames the software.',
    'The new schedule has {program}\'s two required courses meeting at the same time. The students noticed on the first morning. The Registrar\'s office says it\'s looking into what the system did.',
  ],
  'the-lab-inspection': [
    'The lab safety inspection found a fume hood untested for a decade, an eyewash station plumbed to nothing, and a sandwich in the chemicals fridge. The report is polite about all three.',
    'The lab inspector\'s report is polite and numbered. Item one is the fume hood. Item two is the eyewash. Item three, regrettably, is the fridge marked NO FOOD.',
  ],
  'the-closing-bell': [
    'In exam season the library shuts at midnight. Most nights at a quarter past, the night guard\'s flashlight finds thirty or forty students who didn\'t hear the bell and would like to finish the chapter.',
    'The library bell rings at midnight. At twenty past, the night guard is still finding students in the stacks, apologetic and sleepless, asking for five more minutes.',
  ],
  'the-laundry': [
    'Of the six washing machines in the residence halls, two work, and one of those only if you kick it where the tape is. The students have made a sign-up sheet. It is a model of fairness.',
    'The residence laundry is down to two working machines out of six. There\'s a line at midnight, a hand-drawn sign-up sheet on the door, and a strip of tape showing where to hit the second machine.',
  ],
  'the-vegan-counter': [
    'The new vegan dish at lunch sells out by half past twelve, every day. The catering manager would like to know if this is a trend you mean to plan for, or a surprise you mean to keep having.',
    'The dining hall\'s one vegan option has sold out before one o\'clock every day this term. The kitchen wants more notice, more space or fewer people, and is asking which.',
  ],
  'the-bike-thefts': [
    'Forty-one bicycles have vanished from outside {building} since term began. Security calls it a wave. The insurers want to see the locks. The student government is selling better ones at cost.',
    'Bike thefts outside {building} have reached forty a term. The racks are dark and the locks are cheap. The student government has set up a table selling proper ones.',
  ],
  'the-invited-speaker': [
    'A society has invited a speaker whose views have split the campus into those who object and those who are about to. The big lecture hall is booked, and so is the corridor outside. Security needs an answer.',
    'A student society has booked a controversial speaker into the largest room on campus. Two other societies have booked protests outside. Security would like your decision before Wednesday.',
  ],
  'the-reunion-gift': [
    'The {class} would like their reunion gift spent on a clock for the main walk, with the class year on its face. They\'ve chosen the clock, the typeface and the year. The year is wrong by one.',
    'The {class} have offered a reunion gift, a clock for the main walk, specified down to the lettering of the class year. The Development Office has quietly checked the year. It\'s one out.',
  ],
  'the-insurance-renewal': [
    'The property insurance has renewed at forty percent more than last year. The surveyor\'s letter lists fourteen concerns. Number nine reads, in full, \'the smell\'.',
    'The insurer has renewed the policy, at a price. The survey behind it lists fourteen problems, most with photographs. One is described only as \'the smell\'.',
  ],
  'the-rankings-survey': [
    'The guide\'s reputation survey has arrived for you to fill in, rating twenty-four colleges from one to five. Last year you gave {rival} a two. Your office would like to know if that stands.',
    'The yearly reputation survey is on your desk, asking you to rate your peers from one to five. A note from your office points out that {rival} got a two last year, and asks if anything has changed.',
  ],
  'the-rival-film': [
    '{rival}\'s new promotional film has more views than {rival} has alumni. It has a rowing crew at dawn, a class held in a meadow, and a dog nobody can account for.',
    'Everybody has seen {rival}\'s film. There\'s sunrise over the river, a seminar in a wildflower meadow, and a retriever that wanders through three scenes. The Development Office has watched it most of all.',
  ],
  'the-booster-club': [
    'The {sport} boosters have offered your college a gift. The cover letter asks for a seat on the committee that hires the coach. The check was in the same envelope.',
    'The {sport} booster club offers a generous gift on one condition, a place on the committee that chooses the coach. The club\'s president has signed both the check and the condition.',
  ],
  'contract-visiting-chair': [
    '{candidate}, the visiting professor of {candidateField}, has been renewed nine years running and is now the department\'s longest-serving member. They have asked, very politely, if they might stop being called visiting.',
    'A one-year visiting post in {candidateField} has been renewed every year for nine years. {candidate} has asked whether, after a decade, you might agree they have arrived.',
  ],
  'contract-summer-sections': [
    'The summer school has twice the students it planned for and the same four instructors. Each has been offered a second section on terms the Provost\'s office calls flexible. The pay is the flexible part.',
    'Summer enrollment has doubled. The instructors have not. Each has been asked to take another section on a \'flexible\' contract, which means the pay can go down.',
  ],
  // Town and gown (Plan 85H).
  'town-noise': [
    'A councilman who lives two streets behind Main Street has called your office. He described, in some detail, what he heard at one in the morning on Saturday. He\'d like to know what you propose, and he has copied the local paper.',
    'The residents\' association has sent a petition about the noise downtown, with a recording attached. It\'s a crowd singing your fight song in three keys at once, which the association feels makes its case.',
  ],
  'town-street-festival': [
    'The street festival committee has come back about the quad. Main Street is full and the band is booked. They\'d be grateful for the lawn for one Saturday, and would leave the grass as they found it, give or take.',
    'The town would like to hold its street festival on your main quad this year. It calls the quad the obvious place. The groundskeepers call it the only good grass for a mile. The organizers have offered to bring their own tents.',
  ],
};
