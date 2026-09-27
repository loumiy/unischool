// Second and third tellings (Plan 70I, "words that don't repeat"): every
// catalogue event with a cooldown of five years or less comes round often
// enough that its one text wore thin. Each gets two more, in the same voice,
// naming the same placeholders and setting up the same choices. Which one a
// firing reads is picked by a hash of the event and the year, never the
// run's stream, and never the text it read last time
// (systems/events/catalogue.ts's eventText).

export const EVENT_VARIANTS: Readonly<Record<string, readonly [string, string]>> = {
  'roof-goes': [
    'The wind took a piece of the roof off {building} at about two in the morning, and the porters found most of it on the lawn at six. Facilities would like the word \'structural\' kept out of any email until they have been up a ladder.',
    'Part of the roof of {building} is now in the car park. Facilities has been up to look and come down with a face the Clerk described as \'professionally neutral\', and a quote.',
  ],
  'star-poached': [
    '{faculty} has been approached by a university whose name everybody recognizes and whose students nobody can remember. The offer is generous. They have left the letter on your desk, face up.',
    'A headhunter has had lunch with {faculty}, twice. They mentioned it to you themselves, in the corridor, in the tone of someone mentioning the weather in a place where the weather matters.',
  ],
  'heating-fails': [
    'The boilers serving the older buildings gave up on the coldest morning of the year. The seminar rooms are at nine degrees, and the students have started bringing flasks, and blankets, and in one case a dog.',
    'There has been no heat in the older buildings since Sunday. Lectures are going ahead in coats and scarves, and the library has become, without anyone deciding it, the warmest and most crowded room on campus.',
  ],
  'prize-won': [
    'A student of {program} has taken a national prize, and the department has put the certificate in the window of its office where nobody could miss it. It has also, quietly, put itself up for more funding.',
    'The national prize has gone to one of ours, a student of {program}, whose parents have rung the college to say thank you, which almost never happens. The department would like to know what the college intends to do about it.',
  ],
  'boiler-condemned': [
    'The boiler in {building} has failed its inspection by a margin the inspector called \'educational\'. It is off, labelled and locked, and Facilities has produced the two memos in which it said so earlier.',
    'An inspector spent forty minutes in the plant room of {building} and came out and condemned the boiler. The building is cold, the notice on the door is red, and Facilities has asked that its previous warnings be read into the minutes.',
  ],
  'roof-slates': [
    'A slate came off {building} this morning and broke on the path where the first-years queue for lunch. It is the ninth this month. Facilities has begun keeping them, stacked by date, in case anyone needs persuading.',
    'The roof of {building} has been shedding slates, one or two a week, since the autumn. The porters have chalked a line on the path that nobody is to cross, and nobody knows who drew it first.',
  ],
  'derelict-notice': [
    'The town council has written about the state of {building}. The first paragraph admires the college; the second mentions the council\'s powers under a section the Clerk had to look up. A photograph is enclosed, taken on a grey day, at an unflattering angle.',
    'A letter from the town about {building}: polite, precise, and closing with the word \'eyesore\' in inverted commas, as if someone else had said it first. The Clerk has underlined it anyway.',
  ],
  'flooded-basement': [
    'Water came up through the floor of the basement of {building} overnight and stood there until the morning. The archive boxes on the bottom shelf, which was the floor, are now the wettest records the college holds.',
    'Nine inches of water in the basement of {building}, and the archive in it, on the floor, because the shelving was deferred in the year everything was deferred. The Archivist has asked to be present when the boxes are opened.',
  ],
  'overdraft': [
    'The bank would like a conversation about the operating account. It has put this in a letter so politely worded that the Bursar read it twice before understanding it was a warning.',
    'A letter from the bank about the overdraft, beginning \'as you will be aware\' and ending, three careful paragraphs later, with a date by which the college is expected to be aware of it.',
  ],
  'audit-qualified': [
    'The auditors have told the Bursar, in person, that they will qualify the accounts. They have offered to work on the wording together, which is generous, in front of the Audit Committee, which is not.',
    'The external auditors intend to qualify their opinion. It is one paragraph, and they have offered a meeting to discuss it, with the whole Audit Committee in attendance, as a courtesy.',
  ],
  'frozen-post': [
    'A vacant teaching post has now been held open longer than it was ever filled. The department has stopped raising it at meetings, which the Dean says is how you know it matters.',
    'Under the construction freeze, a vacant teaching post has become a line in the budget labeled \'held\'. The students on the program would like to know who is teaching them in the spring.',
  ],
  'press-inquiry': [
    'A journalist has sent eleven questions and a deadline. The questions are specific in the way that means somebody has already told them the answers. The Communications Officer would like to know what to say, today.',
    'A reporter from the regional paper has been ringing the Bursar\'s office, and the questions have the figures in them. The piece runs on Friday. The college can be in it, or be described in it.',
  ],
  'tenure-case': [
    'The tenure file of {faculty} has come up to the President, which is where files come when nobody below wants to be the one to decide. The department is for, the committee against, and the external reviewer is admiring but unhelpful.',
    'The tenure case of {faculty} has reached the President with two recommendations that disagree and an external letter that praises the candidate for a page and a half and then stops, without a verdict, as though interrupted.',
  ],
  'sabbatical-overrun': [
    'A sabbatical ended in September. The professor on it did not. There has been a letter, warm and full of progress, asking for another year, and the colleague covering the teaching has asked for a word.',
    'A year\'s leave granted to a professor is now in its second year. The research is, by all accounts, going very well; the courses are being taught by somebody else, who would like to know for how much longer.',
  ],
  'teaching-review': [
    'This year\'s teaching evaluations are the lowest the college has on file. The Dean has read every comment and reports that the tone is not anger but resignation, which she finds much harder to answer.',
    'The student returns on teaching have come in, and the scores have fallen for a third year. The comments are courteous. Several of them begin with \'as usual\'.',
  ],
  'accreditation-visit': [
    'The accreditors are coming in April. The self-study is due in February, the evidence of improvement is due with it, and the Registrar has been heard to ask what, precisely, counts as evidence.',
    'An accreditation visit is on the calendar for the spring. The document the panel wants is long, the timetable is short, and the section on \'continuous improvement\' is currently a heading.',
  ],
  'program-thin': [
    'Applications to {program} have fallen again. The department argues that a university without it would not be a university, which is a real argument, and that numbers will recover, which is a hope.',
    'The first-year class in {program} this year could meet in the Dean\'s office, and did, once, when the seminar room was double-booked. The department\'s report asks for patience; the budget asks for a decision.',
  ],
  'sit-in': [
    'Students have occupied the entrance hall of {building}. They have a list of demands, most of them reasonable, a rota, and a kettle, and they have been scrupulously polite to everyone who walks past.',
    'The foyer of {building} has been occupied since Monday by about forty students and a banner. The demands run to six points; the college agrees with four; the cleaners report that the occupiers tidy up after themselves.',
  ],
  'newspaper': [
    'The student newspaper would like money, a room, and a promise not to see the pages before they print. The editor has written this as a single, carefully punctuated sentence.',
    'A delegation from the student paper came to the President\'s office with three requests on a single sheet: funds, an office, and editorial independence, written in that order, underlined in the last.',
  ],
  'dining-petition': [
    'Eleven hundred students have signed a petition about the dining hall, more than there are in {school}. The caterer has sent a copy of the contract, with the relevant clauses highlighted, and it is right.',
    'A petition on the food has gathered signatures from more students than {school} enrolls. The catering company points out, correctly and at length, that it is doing exactly what it was hired to do.',
  ],
  'winter-outbreak': [
    'There is something going round the halls of residence. The Health Center saw ninety students this week and has nowhere to put the ones who need to be kept apart from their roommates.',
    'The flu has reached the residences. Beds are the problem: the sick share rooms with the well, and the Health Center, which has four, is asking for forty.',
  ],
  'annual-fund-drive': [
    'Development would like to run a phone campaign: students, evenings, a script, and a list of alumni. The last one paid for itself four times over and produced two letters of complaint about its manners.',
    'The Development Office has a plan for the annual fund that involves the telephone, which it concedes is old-fashioned, and pays, which it says is the point. It needs a decision and a room with fifteen phones.',
  ],
  'class-complaint': [
    'The {class} have sent a letter, signed by nineteen of them, about a building that has come down, a custom that has lapsed, and learning of both from a newsletter. It is not angry. It is disappointed, which is worse.',
    'A letter from the {class}: courteous, collective, and hurt. They would have liked to be told before the old hall came down, and before the tradition they started quietly stopped.',
  ],
  'yield-panic': [
    'Deposits are down on this week last year. The Dean of Admissions proposes a second round of offers, which would fill the class, and proposes calling it something else, which is the part the President has doubts about.',
    'The confirmed class is short, and it is late in the cycle. Admissions has a list of names to offer to next, and would like permission, and would rather the word \'waitlist\' did not appear anywhere.',
  ],
  'tuition-letter': [
    'A parent has written four careful pages about the fee, with last year\'s prospectus and this year\'s side by side, and a question at the end: what, exactly, is the difference for?',
    'A letter about the fee from the parent of a second-year: patient, well-argued, and enclosing receipts. It asks, reasonably, what the increase has bought.',
  ],
  'recruiting-trip': [
    'Admissions wants to recruit in two more states. The proposal is short and ends with its best line: the students who have never heard of {school} are not going to apply to it.',
    'The admissions team would like a bigger map: more states, more schools, more college fairs. The case, stated plainly, is that {school} is known in the county and nowhere else.',
  ],
  'good-year': [
    'The returns are up, the dropouts are down, and three students have written to thank the college, unprompted, in the same week. The Dean is delighted and slightly alarmed, and would like to know why.',
    'Nobody can point to the reason, but the year is going well. Students are staying, the numbers are kind, and the President has had a letter of thanks that did not ask for anything.',
  ],
  'bad-run': [
    'Nothing in particular has gone wrong this year, and everything has gone a little wrong. It shows in the returns, the empty seats at lectures, and the notices on the boards that nobody has taken down.',
    'A long, grey stretch: no scandal, no disaster, just a steady wearing-down that the Dean describes as \'morale, in the plural\'. Attendance is falling at everything that is optional.',
  ],
  'one-teacher': [
    'Next term\'s timetable has the same three instructors against nearly every hour. It works on paper. The Registrar has added a note in pencil: \'provided nobody catches anything\'.',
    'The draft timetable has come back from the Registrar, and three names teach almost all of it. It can be run. The Registrar would like it on record that it can be run until the first cold of the winter.',
  ],
  'the-ice-walk': [
    'The path from the halls to the dining hall iced over in the night, and breakfast was reached by sliding, holding on, or not at all. The Health Center reports bruises, laughter, and a single sprained wrist.',
    'The main walk froze solid overnight, and the first-years crossed it to breakfast the only way they could. Facilities has called it \'a learning experience\', and the nurse has strapped one wrist.',
  ],
  'the-heating-bill': [
    'December\'s heating bill has come in. The Bursar has circled the total in red, then, apparently unable to help it, circled it again in blue.',
    'The gas bill for the winter\'s first cold month has arrived and is larger than the Bursar had budgeted for the whole term. The total has been circled twice, in two different pens.',
  ],
  'the-snow-day': [
    'Eleven inches of snow fell overnight. The Registrar is asking whether classes will run. The students have already built a snowman on the main lawn wearing a mortarboard.',
    'Snow, a foot of it, on a teaching day. The Registrar would like a ruling by eight. The snowball fight on the main lawn suggests the students have already ruled.',
  ],
  'the-championship-run': [
    'The {sport} team are champions, and the campus has not gone to bed. The boosters want a parade, the Athletic Director a new scoreboard, and the Provost, pointedly, the timetable back.',
    'The {sport} team has won the title, and the celebration is into its third day. The boosters are planning a parade, the Athletic Director is pricing scoreboards, and attendance at 9 a.m. lectures is a rumor.',
  ],
  'the-rival-prank': [
    '{rival}\'s colors are flying from the top of the tallest building on campus, hung there some time after midnight by persons the Dean of Students can already name. The college\'s own students would like to reply.',
    'Somebody from {rival} climbed the college\'s highest roof last night and left a banner. The Dean of Students has names and a photograph, and a delegation of students asking permission to return the favor.',
  ],
  'the-rankings-slip': [
    'The board chair came to the meeting with this year\'s guide, open at the college\'s entry, underlined twice. She has a question about it and a consultant, recommended by a friend.',
    'The college has slipped in the guide, and the chair of the board has noticed. She put the page on the table at the start of the meeting and asked what the plan was, and whether it involved a consultant.',
  ],
  'the-noise-complaint': [
    'The neighbors have written again about Thursday nights: singing, shouting, and a road sign that has appeared in their garden. They would like a meeting. The local paper has been copied in.',
    'Another letter from the houses across the road about the noise on the walk home after Thursday nights, this time with a photograph of a traffic cone on their garage and the local paper copied.',
  ],
  'the-all-nighter': [
    'The library was full at 4 a.m. for the third week in a row, and the nurse is treating more exhaustion than illness. The student paper has run the story on the front page with a list of demands.',
    'The reading rooms have been busier at three in the morning than at three in the afternoon, and the college nurse has started a tally. The student paper has made it the front page.',
  ],
  'the-grant-windfall': [
    'A foundation has funded {faculty}\'s proposal for a center, with overheads larger than the department\'s budget. The foundation asks, in its award letter, where the center will be.',
    'The grant has come through: {faculty} will direct a new center, funded for five years, and the overheads alone would pay for the department. The foundation would like an address.',
  ],
  'the-car-park': [
    'Facilities sold three hundred and forty permits for a car park with two hundred and twelve spaces, trusting that people come and go. On the first Monday of term, everybody came, and nobody went.',
    'There are more permits than spaces in the staff car park, by about a hundred and thirty. This was fine until the second Monday of term, when it was not, at about 8:45.',
  ],
  'the-burst-pipe': [
    'A pipe above the second floor of {building} burst on Saturday night and ran until the first class on Monday. The porters have stacked the ceiling tiles in the corridor, numbered, to dry.',
    'Water came through the ceiling of {building} all weekend from a pipe nobody knew was there. The Monday seminar found it. Facilities has praised the porters, who have already mopped, stacked and labeled everything.',
  ],
  'the-buckets': [
    'There are now nine buckets in the top corridor of {building}, catching rain from a gutter that has given up. The porters empty them twice a day and keep a log of the volumes, and the numbers are rising.',
    'The top floor of {building} leaks along the gutter line whenever it rains. The porters\' notebook of how much water they carry out each day has reached its second volume, and would like a reader.',
  ],
  'the-lift': [
    'The lift in {building} has stuck between floors again, the fourth time this term, this time for fifty minutes with the Dean inside. The Dean\'s memo on the subject arrived shortly after.',
    'The lift in {building} failed once more, stranding the Dean for most of an hour. The Dean wrote the memo about it on the spot, on the back of an agenda, and it makes the point that stairs are not an option for everyone.',
  ],
  'the-timetable-clash': [
    'The new timetable puts the two required courses for {program} at the same hour on the same day. Forty students cannot finish on time unless they can be in two places at once. The Registrar blames the software.',
    'A clash in the new timetable: {program}\'s two required courses meet at the same time. The students noticed on the first morning. The Registrar\'s office says it is looking into what the system did.',
  ],
  'the-lab-inspection': [
    'The safety inspection of the laboratories has turned up a fume cupboard that has not been tested in a decade, an eyewash station plumbed to nothing, and a sandwich in the chemicals fridge. The report allows twenty-eight days.',
    'The lab inspector\'s report is polite and numbered and gives the college four weeks. The fume cupboard, the eyewash, and the fridge marked NO FOOD are items one, two and, regrettably, three.',
  ],
  'the-closing-bell': [
    'The library shuts at midnight in exams. Most nights at a quarter past, the porter doing the rounds with a torch finds thirty or forty students who did not hear the bell and would like to finish the chapter.',
    'At midnight the library bell rings, and at twenty past the porter is still finding students in the stacks, apologetic, sleepless, and asking for just five more minutes.',
  ],
  'the-laundry': [
    'Of the six washing machines in the residence halls, two work, and one of those only when kicked where the tape is. The students have made a rota. It is a model of fairness.',
    'The residence laundry is down to two working machines out of six. There is a queue at midnight, a hand-drawn rota on the door, and a strip of tape marking where to hit the second machine.',
  ],
  'the-vegan-counter': [
    'The new vegan dish at lunch sells out by half past twelve, every day. The catering manager would like to know whether this is a trend the college means to plan for, or a surprise it means to keep having.',
    'The dining hall\'s single vegan option has sold out before one o\'clock every day this term. The kitchen would like more notice, more space, or fewer people, and is asking which.',
  ],
  'the-bike-thefts': [
    'Forty-one bicycles have gone from outside {building} since term began. Security calls it a wave; the insurers are waiting to see the locks; the students\' union is selling better ones at cost.',
    'Bike theft outside {building} has reached forty a term. The racks are dark, the locks are cheap, and the students\' union has started a stall selling proper ones.',
  ],
  'the-invited-speaker': [
    'A society has invited a speaker whose views have divided the campus into those who object and those who are about to. The big lecture hall is booked, so is the corridor outside it, and Security needs an answer.',
    'A student society has booked a controversial speaker into the largest room on campus. Two other societies have booked protests outside. Security would like a decision before Wednesday.',
  ],
  'the-reunion-gift': [
    'The {class} would like its reunion gift spent on a clock for the main walk, with the class year on its face. They have chosen the clock, the typeface and the year; the year is wrong by one.',
    'A reunion gift from the {class}: a clock for the main walk, fully specified, down to the lettering of the class year, which the Development Office has quietly checked and found to be a year out.',
  ],
  'the-insurance-renewal': [
    'The property insurance has renewed at forty percent more than last year. The surveyor\'s letter lists fourteen concerns; number nine reads, in its entirety, \'the smell\'.',
    'The insurer has renewed the policy, at a price. The survey behind it lists fourteen problems, most of them with photographs, one of them described only as \'the smell\', without elaboration.',
  ],
  'the-rankings-survey': [
    'The guide\'s reputation survey has arrived for the President to complete: twenty-four colleges, one to five. Last year the college gave {rival} a two. The President\'s office would like to know if that stands.',
    'The annual reputation survey is on the President\'s desk: rate the peer institutions from one to five. A note from the office points out that {rival} was a two last year, and asks whether anything has changed.',
  ],
  'the-rival-film': [
    '{rival}\'s new promotional film has been watched more often than {rival} has alumni. It has a rowing crew at dawn, a class held in a meadow, and a dog nobody can account for.',
    'Everybody has seen {rival}\'s film: sunrise over the river, a seminar in a wildflower meadow, and a retriever that walks through three scenes. The Development Office has seen it most of all.',
  ],
  'the-booster-club': [
    'The boosters have offered a gift to the {sport} program, and asked, in the covering letter, for a seat on the committee that hires the coach. The check was in the same envelope.',
    'A generous gift from the booster club for {sport}, with a single condition: a place on the committee that chooses the coach. The president of the club has signed both the check and the condition.',
  ],
  'contract-visiting-chair': [
    'The visiting professor has now been renewed nine years running and is the department\'s longest-serving member. They have asked, very courteously, whether they might stop being described as visiting.',
    'A one-year visiting appointment, renewed every year for nine years. The holder has asked whether, after a decade, the college might consider that they have arrived.',
  ],
  'contract-summer-sections': [
    'The summer school has twice the students it planned for and the same four instructors, who have each been offered a second section on terms the Provost\'s office calls flexible. The pay is flexible.',
    'Summer enrollment has doubled. The instructors have not. Each has been asked to take another section, on a contract that is, in the Provost\'s word, flexible, meaning the pay can go down.',
  ],
};
