// Second and third tellings (Plan 70I, "words that don't repeat"): every
// catalogue event with a cooldown of five years or less comes round often
// enough that its one text wore thin. Each gets two more, in the same voice,
// naming the same placeholders and setting up the same choices. Which one a
// firing reads is picked by a hash of the event and the year, never the
// run's stream, and never the text it read last time
// (systems/events/catalogue.ts's eventText).

export const EVENT_VARIANTS: Readonly<Record<string, readonly [string, string]>> = {
  'roof-goes': [
    'At about two in the morning, the wind took a piece of the roof off {building}. The night guard found most of it on the lawn at six. Facilities asks that nobody put the word \'structural\' in an email until they\'ve been up a ladder.',
    'Part of the roof of {building} is now in the parking lot. Facilities went up to look and came down with a quote.',
  ],
  'star-poached': [
    'A university whose name everybody knows has made {faculty} an offer, and it\'s a generous one. They\'ve left the letter on your desk, face up.',
    'Another college has taken {faculty} to lunch, twice, and followed up with an offer. They told you so themselves, in the corridor, and waited to see what you\'d say.',
  ],
  'heating-fails': [
    'On the coldest morning of the year, the boilers in the older buildings gave up. You can see your breath in the seminar rooms. Students have started bringing thermoses and blankets.',
    'There\'s been no heat in the older buildings since Sunday. Lectures go ahead in coats and scarves. The library is now the warmest room on campus, and the most crowded.',
  ],
  'prize-won': [
    'You have a national prizewinner, a student of {program}. The department has put the certificate in its office window where nobody can miss it. It has also, quietly, asked for more funding.',
    'One of yours, a student of {program}, has won a national prize. The student\'s parents called to say thank you, and that almost never happens. The department is asking how you plan to mark it.',
  ],
  'boiler-condemned': [
    'The boiler in {building} failed its inspection by a margin the inspector called \'educational\'. It is off, labeled and locked, and the building is cold.',
    'An inspector spent half the morning in the boiler room of {building}, then came out and condemned the boiler. The notice on the door is red. Facilities has found its two old memos about this boiler and put both on your desk.',
  ],
  'roof-slates': [
    'A slate came off {building} this morning and broke on the path where the freshmen line up for lunch. It\'s the ninth this month. Facilities has started keeping them, stacked by date, in case anyone needs persuading.',
    'For a month now, {building} has shed a slate or two a week. Someone has chalked a line on the path that nobody is to cross.',
  ],
  'derelict-notice': [
    'A letter from the town council admires your college for one paragraph. The second paragraph is about {building}, and cites the council\'s powers under a section the secretary had to look up. A photograph is enclosed.',
    'Nobody at town hall is hinting about {building} anymore. The council\'s letter is polite and precise, and the word it ends on is eyesore. It asks for your plans.',
  ],
  'flooded-basement': [
    'Overnight, water came up through the basement floor of {building} and stayed until morning. The archive boxes were on the floor, and they are now the wettest records you own.',
    'There are nine inches of water in the basement of {building}, and the archive is in it. The shelving never came, so the boxes were on the floor. The Archivist would like to be there when they\'re opened.',
  ],
  'overdraft': [
    'Your operating account is overdrawn, and the bank has written to say so. The CFO has two ways to cover it and needs you to pick one.',
    'A letter from the bank about the overdrawn account. It begins \'as you will be aware\'. Three careful paragraphs later, it ends with the date by which you\'re expected to be aware of it.',
  ],
  'audit-qualified': [
    'In person, the auditors have told the CFO that this year\'s accounts will carry a formal reservation. They\'re willing to work on the wording with you, in front of the Audit Committee.',
    'This year the external auditors\' opinion on your accounts will run one paragraph longer, and the paragraph is a reservation. They\'ve offered a meeting to discuss it, with the whole Audit Committee there.',
  ],
  'frozen-post': [
    'A teaching post has now been empty longer than it was ever filled, with its money held under the construction freeze. {candidate}, who teaches {candidateField}, has written to ask if it\'s still open.',
    'Under the construction freeze, an empty teaching post has become a budget line marked \'held\'. Students in the program want to know who will teach them in the spring. The department\'s answer is {candidate}, who teaches {candidateField}.',
  ],
  'press-inquiry': [
    'A journalist has sent a page of questions and a deadline of Friday. Somebody has plainly shown them the figures. The Communications Officer needs to know what to say, today.',
    'A reporter from the regional paper keeps calling the CFO\'s office, and the questions have the figures in them. The piece runs on Friday. You can be in it, or be described in it.',
  ],
  'tenure-case': [
    'The tenure file of {faculty} has reached your desk, which is where files go when nobody below wants to decide. The department is for, the committee is against, and the outside reviewer is admiring but no help.',
    'You have two recommendations on {faculty}\'s tenure, and they disagree. The department says yes and the committee says no. The outside reviewer was asked to settle it, and wrote a page and a half that doesn\'t.',
  ],
  'sabbatical-overrun': [
    'A sabbatical ended in September, and the professor on it hasn\'t come back. A warm letter, full of progress, asks for another year. The colleague covering the teaching would like a word.',
    'A professor\'s year of leave is now in its second year. By all accounts the research is going very well. The courses are being taught by someone else, who is asking for how much longer.',
  ],
  'teaching-review': [
    'This year\'s teaching evaluations are the lowest on file. The Dean\'s office has read every comment, and most are short. The students have stopped expecting better.',
    'Student scores on teaching are the lowest you\'ve recorded. Several of the written comments begin with \'as usual\'.',
  ],
  'accreditation-visit': [
    'Accreditation comes around this term. The self-study is due, with evidence of improvement, and the Registrar is asking for the time and money to prepare it properly.',
    'You owe the accreditor a self-study this term. The document is long and the schedule is short, and the section on continuous improvement is so far just a heading.',
  ],
  'program-thin': [
    'Fewer people applied to {program} again this year. The department has written in its own defense. The letter is strong on why the subject matters and vague on when the students will return.',
    'This year\'s freshman class in {program} could meet in the Dean\'s office, and once did, when the seminar room was double-booked. The department\'s report asks for patience. The budget asks for a decision.',
  ],
  'sit-in': [
    'Students have occupied the entrance hall of {building}. They have a list of demands, most of them reasonable, plus a sign-up sheet and a coffee maker. They\'ve been polite to everyone who walks past.',
    'Since Monday, a few dozen students and a banner have held the foyer of {building}. Of their six demands, four are fair. The custodians report that the occupiers clean up after themselves.',
  ],
  'newspaper': [
    'One carefully punctuated sentence from the editor of the student newspaper asks for three things. The paper wants money, a room, and a promise that you won\'t see the pages before they print.',
    'A delegation from the student paper came to your office with one sheet of paper. They want funds, an office and editorial independence, and the last of these is underlined.',
  ],
  'dining-petition': [
    'Students at {school} have been signing a petition about the dining hall all term, and some have plainly signed twice. The caterer\'s reply is a copy of the contract with the relevant clauses highlighted.',
    'Nobody has eaten in the dining hall at {school} this week without being asked to sign the petition about it. The catering company points out, correctly and at length, that it is doing exactly what it was hired to do.',
  ],
  'winter-outbreak': [
    'Ninety students came to the Health Center this week. Whatever it is, it\'s moving through the residence halls, and there is nowhere to put the ones who need to be kept away from their roommates.',
    'Flu is in the residence halls, and beds are the problem. The sick share rooms with the well. The Health Center has four beds and needs ten times that.',
  ],
  'annual-fund-drive': [
    'Development wants to put students on the phones in the evenings, calling alumni from a script. The last campaign paid for itself fifteen times over and drew two complaints.',
    'This year\'s plan for the annual fund uses the telephone. The Development Office admits that\'s old-fashioned and says it pays. It needs your decision and a room with fifteen phones.',
  ],
  'class-complaint': [
    'Nineteen of the {class} have signed a letter. The campus changed without them, a custom of theirs quietly stopped, and they learned of both from a newsletter.',
    'A letter from the {class}, polite, signed by many of them, and hurt. They\'d have liked to be told before the campus changed around them, and before the tradition they started quietly stopped.',
  ],
  'yield-panic': [
    'At this point last year, more admitted students had paid their deposits. The Dean of Admissions wants to make a second round of offers and says it would fill the class.',
    'The confirmed class is short, and it\'s late in the cycle. Admissions has a list of names to offer places to next. It needs your permission, and asks that nobody say \'waitlist\'.',
  ],
  'tuition-letter': [
    'Last year\'s viewbook and this year\'s have arrived side by side, sent by a parent with a careful letter about tuition. It ends with a question. What, exactly, is the difference for?',
    'A sophomore\'s parent wants to know what the tuition increase has bought. The letter is patient, and it encloses receipts.',
  ],
  'recruiting-trip': [
    'Admissions wants to send recruiters into two more states. Its proposal is short. Students who have never heard of {school} don\'t apply to it, and most students haven\'t.',
    'Admissions is asking for a bigger map, with more states, more high schools and more college fairs. Its case, put plainly, is that {school} is known in the county and nowhere else.',
  ],
  'good-year': [
    'Three students wrote to thank you this week, unprompted, and fewer are dropping out. Academic Affairs is delighted, and is asking what changed.',
    'Nobody can point to the reason, but the year is going well. Students are staying and the numbers are kind. You\'ve even had a thank-you letter that didn\'t ask for anything.',
  ],
  'bad-run': [
    'Nothing in particular has gone wrong this year, and everything has gone a little wrong. It shows in the empty seats at lectures, and in the old notices nobody has taken down.',
    'A long, gray stretch, with no scandal and no disaster. Student Affairs has no single thing to report, only a steady wearing-down. Attendance is falling at everything optional.',
  ],
  'one-teacher': [
    'Three instructors teach nearly every hour of next term\'s schedule. It works on paper. The Registrar has added a note in pencil, \'provided nobody catches anything\'.',
    'The draft schedule is back from the Registrar, and three names teach almost all of it. It can be run as it stands, for as long as all three stay well.',
  ],
  'the-ice-walk': [
    'Overnight, the path from the residence halls to the dining hall iced over. Students got to breakfast by sliding, holding on to each other, or not at all. The Health Center has treated bruises and one sprained wrist.',
    'The main walk froze solid overnight, and the salting crew hadn\'t reached it by breakfast. Most of the freshman class crossed anyway. The nurse has wrapped one wrist.',
  ],
  'the-heating-bill': [
    'December\'s heating bill is in, and it is a good deal larger than November\'s. The CFO has checked it against the meter readings. It\'s correct.',
    'It was a cold December, and the heating bill shows it. The CFO has left it on your desk, and wants to know whether to pay it or turn the thermostats down.',
  ],
  'the-snow-day': [
    'There\'s a snowman on the main lawn this morning, wearing a mortarboard. Eleven inches fell overnight, and the Registrar wants to know whether to cancel classes.',
    'A foot of snow on a teaching day. The plows have reached the main road and not the campus. The Registrar needs your ruling on classes by eight.',
  ],
  'the-championship-run': [
    'Nobody on campus has gone to bed since the {sport} team won the title. The boosters want a parade and the athletics department wants a new scoreboard. Academic Affairs wants the class schedule back.',
    'Three days after the {sport} team won the title, the party is still going. The boosters are planning a parade and the athletics department is pricing scoreboards. Attendance at 9 a.m. lectures is a rumor.',
  ],
  'the-rival-prank': [
    '{rival}\'s colors are flying from the top of your tallest building. They went up some time after midnight, and Student Affairs can already name who did it. Your own students would like to reply.',
    'Someone from {rival} climbed your highest roof last night and left a banner. Student Affairs has names and a photograph. A delegation of your students is asking permission to return the favor.',
  ],
  'the-rankings-slip': [
    'You\'ve slipped in this year\'s guide, and the board chair read it before you did. She came to the meeting with a question, and with the name of a consultant a friend recommended.',
    'Your college sits low in the guide, and the board chair has noticed. She put the page on the table at the start of the meeting. She asked what the plan was, and whether it involved a consultant.',
  ],
  'the-noise-complaint': [
    'Thursday nights have brought another letter from the neighbors. There\'s been singing, shouting, and a road sign that turned up in their yard. They\'re asking for a meeting.',
    'Another letter from the houses across the street about the noise on Thursday nights. This one comes with a photo of a traffic cone on their garage roof. They want a meeting, and the local paper has the photo too.',
  ],
  'the-all-nighter': [
    'For the third week running, the library was full at 4 a.m. The nurse is treating more exhaustion than illness. The student paper has put the story on its front page, with a list of demands.',
    'The reading rooms are busier at three in the morning than at three in the afternoon. The nurse has started counting cases of exhaustion, and the student paper has made it the front page.',
  ],
  'the-grant-windfall': [
    '{faculty}\'s proposal has been funded by a national foundation, and the overhead alone is bigger than the department\'s budget. The award letter asks for your signature beside the professor\'s.',
    'You have a grant to countersign. A foundation has funded {faculty}, and the overhead that comes to you would pay for the whole department.',
  ],
  'the-car-park': [
    'On the second Monday of term, everyone with a parking permit drove in at once. The lot has two hundred and twelve spaces. Facilities has issued more than three hundred permits for it.',
    'There are about a hundred and thirty more parking permits than parking spaces. This was fine until the second Monday of term, at about 8:45, when it wasn\'t.',
  ],
  'the-burst-pipe': [
    'The first class on Monday found the leak in {building}. A pipe above the second floor had burst on Saturday night and run ever since. The ceiling tiles are stacked in the corridor to dry, numbered in order.',
    'All weekend, water came through the ceiling of {building} from a burst pipe above the second floor. The Monday seminar found it. By the time Facilities arrived, the tiles were already stacked, labeled and drying.',
  ],
  'the-buckets': [
    'There are now nine buckets in the top corridor of {building}, catching rain from a gutter that has given up. The custodians empty them twice a day and log how much they hold. The numbers are rising.',
    'The top floor of {building} leaks along the gutter whenever it rains. The custodians keep a notebook of how much water they carry out each day. It\'s now on its second volume, and nobody senior has read the first.',
  ],
  'the-lift': [
    'A department chair spent fifty minutes this week inside the elevator in {building}, stuck between floors. It was the elevator\'s fourth failure this term. The chair\'s memo arrived shortly after.',
    'For most of an hour, the elevator in {building} held a department chair between floors. The chair wrote a memo on the spot, on the back of an agenda. It points out that the stairs aren\'t an option for everyone.',
  ],
  'the-timetable-clash': [
    'Forty students in {program} need two required courses to graduate on time, and the new schedule holds both at the same hour. The Registrar blames the software.',
    'On the first morning of the new schedule, the students in {program} found their two required courses meeting at the same time. The Registrar\'s office says it\'s looking into what the system did.',
  ],
  'the-lab-inspection': [
    'Three things failed the lab safety inspection. The fume hood hasn\'t been tested in a decade, the eyewash station is plumbed to nothing, and there was a sandwich in the chemicals fridge.',
    'There are three items in the lab inspector\'s report. One is the fume hood and two is the eyewash station. Three, regrettably, is the fridge marked NO FOOD.',
  ],
  'the-closing-bell': [
    'In exam season the library still closes at midnight. Most nights at a quarter past, the night guard\'s flashlight finds thirty-odd students who didn\'t hear the bell and want to finish the chapter.',
    'It\'s exam season, and the library bell rings at midnight as usual. At twenty past, the night guard is still finding students in the stacks, apologetic and sleepless, asking for five more minutes.',
  ],
  'the-laundry': [
    'Of the six washing machines in the residence halls, two work, and one of those only if you kick it where the tape is. The students have drawn up their own sign-up sheet and are keeping to it.',
    'The residence laundry is down to two working machines out of six. There\'s a line at midnight, a hand-drawn sign-up sheet on the door, and a strip of tape showing where to hit the second machine.',
  ],
  'the-vegan-counter': [
    'By half past twelve every day, the new vegan dish at lunch is gone. The catering manager is asking whether to plan for more of it or leave it at one dish.',
    'Every day this term, the dining hall\'s one vegan option has sold out before one o\'clock. The kitchen wants more notice, more space or fewer people, and is asking which.',
  ],
  'the-bike-thefts': [
    'Bicycles have been disappearing from outside {building} at about three a week since term began. The insurer wants to see the locks before it says anything. The student government is selling better ones at cost.',
    'Dozens of bikes have been stolen outside {building} this term. The student government has set up a table selling better locks. The racks are still dark.',
  ],
  'the-invited-speaker': [
    'The biggest lecture hall on campus is booked for a speaker invited by a student society, and the corridor outside is booked by two societies that object. Security needs an answer by Wednesday.',
    'A student society has invited a speaker, and a good part of the campus objects. The society has booked the largest room. Two other societies have booked protests outside it. Security wants your decision before Wednesday.',
  ],
  'the-reunion-gift': [
    'A clock for the main walk is what the {class} wants its reunion gift to buy. The committee has chosen the clock, the typeface and the class year for its face, and the year is wrong by one. Development is asking whether you\'ll take it as it is.',
    'Your reunion gift from the {class} is a clock for the main walk, specified down to the lettering of the class year. The Development Office has quietly checked the year. It\'s off by one.',
  ],
  'the-insurance-renewal': [
    'Your property insurance has renewed at forty percent more than last year. The surveyor\'s letter gives the reasons, and there are fourteen of them.',
    'Your insurer has renewed the policy, at a price. The survey behind it lists fourteen problems, most with photographs. Item nine is a smell, so it has none.',
  ],
  'the-rankings-survey': [
    'Last year you gave {rival} a two out of five on the guide\'s reputation survey. This year\'s form has arrived, with twenty-four colleges to rate, and your office is asking if the two stands.',
    'The yearly reputation survey is on your desk, asking you to rate your peers from one to five. A note from your office points out that {rival} got a two last year, and asks if anything has changed.',
  ],
  'the-rival-film': [
    '{rival} has made a promotional film, with a rowing crew at dawn and a class held in a meadow. A great many people have watched it, and some of them are your applicants.',
    'Everybody has seen {rival}\'s film. There\'s sunrise over the river, a seminar in a wildflower meadow, and a retriever in the background. The Development Office has watched it more than once, and is asking if you\'ll answer it.',
  ],
  'the-booster-club': [
    'A check from the {sport} boosters has arrived, and it\'s a generous one. The cover letter asks for one thing, a seat on the committee that hires the coach.',
    'There is one condition on the {sport} booster club\'s generous gift, a place on the committee that chooses the coach. The club\'s president has signed both the check and the condition.',
  ],
  'contract-visiting-chair': [
    'The longest-serving member of the department is {candidate}, a visiting professor of {candidateField} on a one-year appointment, renewed nine times. They are asking for a permanent post.',
    'A one-year visiting post in {candidateField} has been renewed every year for nine years. {candidate} has asked whether, after a decade, you might agree they have arrived.',
  ],
  'contract-summer-sections': [
    'Four instructors were hired for the summer school, and twice the expected students have enrolled. Each instructor has been offered a second section, on a contract that lets the Provost\'s office set the pay later.',
    'Summer enrollment has doubled, and the instructors have not. Each of the four has been asked to take a second section on a flexible contract. The contract doesn\'t say what it pays.',
  ],
  // Town and gown (Plan 85H).
  'town-noise': [
    'At one in the morning on Saturday, the chair of the residents\' association was awake, two streets behind Main Street. He has since written to your office and described, in some detail, what he heard. He wants to know what you propose.',
    'This time the residents\' association has sent a recording with its letter about the noise downtown. It\'s a crowd singing your fight song in three keys at once.',
  ],
  'town-street-festival': [
    'Main Street is full and the band is booked, so the street festival committee is asking for your quad. They need the lawn for one Saturday, and promise to leave the grass as they found it, give or take.',
    'Your main quad is where the town wants to hold its street festival this year. The groundskeepers call it the only good grass for a mile. The organizers call it the obvious place, and need it for one Saturday.',
  ],
};
