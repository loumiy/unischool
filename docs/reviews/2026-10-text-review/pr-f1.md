# Plan 111 PR F, part one: the event catalogue

Every player-facing string changed in `unischool/src/data/eventCatalogue.ts`: 224 strings. Placeholders such as `{building}` are kept by name, since they are filled at play, not code; ¶ marks a paragraph break. Ids, numbers, effects and conditions are unchanged.

### anonymous-gift

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · anonymous-gift · text | An alumna of the {class} has left the college a bequest, on the single condition that it never be spent on administration. Her lawyer was firm about this and appears to have enjoyed saying it. | An alumna of the {class} has left your college a bequest, on the single condition that it never be spent on administration. Her lawyer was firm about this and appears to have enjoyed saying it. |

### star-poached

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · star-poached · choice `wish` | Wish them well | Wish them well, and let them go |

### heating-fails

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · heating-fails · choice `emergency` | Emergency contractors | Call in emergency contractors |
| eventCatalogue.ts · heating-fails · choice `blankets` | Blankets and an apology | Hand out blankets and an apology |

### prize-won

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · prize-won · choice `note` | A note of congratulation | Send a note of congratulation |

### auditors

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · auditors · text | The auditors have asked, in a footnote, whether the college's reserves policy is 'documented anywhere'. It is not, and writing one down now would mean writing down what it has been. | The auditors have asked, in a footnote, whether your reserves policy is 'documented anywhere'. It isn't. Writing one down now would mean writing down what it has been. |

### storm

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · storm · text | The storm came through on Tuesday night and took the roofs off two buildings, a run of mature lindens along the north walk, and the temporary structure nobody had gotten around to making permanent. Nobody was hurt. The engineers' report is nine pages long and uses the word 'char' as a verb, which the insurers have queried. ¶ The college has been here before and the minutes say so: in the founder's time the same wind took the roof off the first hall and the response, recorded with some satisfaction, was to build it back higher. | The storm came through on Tuesday night and took the roofs off two buildings, a run of mature lindens along the north walk, and the temporary structure nobody had gotten around to making permanent. Nobody was hurt. The engineers' report is nine pages long and uses the word 'char' as a verb, which the insurers have queried. ¶ The college has been here before, and the minutes say so. In the founder's time the same wind took the roof off the first hall. The response, recorded with some satisfaction, was to build it back higher. |
| eventCatalogue.ts · storm · choice `patch` | Make safe and defer the rest | Make it safe and put off the rest |
| eventCatalogue.ts · storm · choice `appeal` | Launch a storm appeal | Launch a storm appeal to the alumni |

### recession

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · recession · text | The markets have done in two weeks what they usually take a decade to do. The endowment is worth materially less than it was at breakfast on Monday, the investment committee has asked for a special meeting, and three members of it have separately called to say they were always uneasy about the allocation. ¶ None of this changes what the college costs to run this year. That is the whole of the problem. | The markets have done in two weeks what they usually take a decade to do. Your endowment is worth a good deal less than it was at breakfast on Monday. The investment committee has asked for a special meeting. Three of its members have called, separately, to say they were always uneasy about the allocation. ¶ None of this changes what your college costs to run this year. That is the whole problem. |
| eventCatalogue.ts · recession · choice `ride` | Ride it out on the standing draw | Ride it out at the usual draw rate |

### boiler-condemned

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · boiler-condemned · text | The inspector has condemned the boiler in {building} and left a notice on it in a color the college has not seen before. The boiler room has been locked and the key is with Facilities, who would like it on record that they have mentioned the boiler twice. | The inspector has condemned the boiler in {building} and left a notice on it in a color nobody here has seen before. The boiler room is locked, and Facilities has the key. Facilities would like it on record that they have mentioned the boiler twice. |
| eventCatalogue.ts · boiler-condemned · choice `space-heaters` | Space heaters for the term | Bring in space heaters for the term |

### ivy-structural

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · ivy-structural · choice `rebuild` | Take it off and tuckpoint | Strip the ivy and repoint the wall |

### roof-slates

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · roof-slates · choice `netting` | Netting and a cordon | Put up netting and a cordon |

### derelict-notice

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · derelict-notice · choice `hoarding` | A construction fence and a sign about future plans | Put up a fence and a sign about future plans |

### asbestos

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · asbestos · choice `seal` | Seal and manage in place | Seal it and leave it in place |

### flooded-basement

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · flooded-basement · choice `restore` | Pay for conservation | Pay conservators to save the archive |

### bell-tower

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · bell-tower · choice `restore` | Restore the movement | Restore the old clockwork |
| eventCatalogue.ts · bell-tower · choice `digital` | Fit an electric movement and a recorded chime | Fit an electric motor and a recorded chime |

### elm-disease

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · elm-disease · text | Disease has been confirmed in the elms along the main walk. The recommendation is to fell the affected trees this winter and the ones either side of them as a precaution, which is most of the walk. | Disease has been confirmed in the elms along the main walk. The advice is to fell the sick trees this winter, and the ones either side of them to be safe. That is most of the walk. |
| eventCatalogue.ts · elm-disease · choice `treat` | Treat and hope | Treat the trees and hope |

### desire-path

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · desire-path · text | A brown line now runs corner to corner across the quad, worn by everyone who has ever been late. Grounds have reseeded it twice. The CFO has suggested, not entirely as a joke, that the college pave what the students have surveyed for it. | A brown line now runs corner to corner across the quad, worn by everyone who has ever been late. Grounds have reseeded it twice. The CFO has suggested, not entirely as a joke, that you pave what the students have surveyed for you. |

### bond-rating

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · bond-rating · choice `present` | Present the case and hold the debt | Make your case and keep the debt |

### audit-qualified

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · audit-qualified · text | The auditors intend to qualify their opinion on the year. They have offered to discuss the wording, which is a kindness, and to do so at the Audit Committee, which is not. | The auditors plan to put a formal reservation on this year's accounts. They have offered to discuss the wording, which is a kindness, and to do so at the Audit Committee, which is not. |
| eventCatalogue.ts · audit-qualified · choice `restate` | Restate and take the correction | Correct the accounts and accept the finding |
| eventCatalogue.ts · audit-qualified · choice `contest` | Contest the treatment | Argue the point with the auditors |

### endowment-manager

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · endowment-manager · text | The fund has outgrown the arrangement it was set up with in the founder's time, which was a local firm, a handshake, and a quarterly lunch. The local firm is aware of this and has been gracious. | Your endowment has outgrown the arrangement it was set up with in the founder's time: a local firm, a handshake and a quarterly lunch. The local firm is aware of this and has been gracious. |
| eventCatalogue.ts · endowment-manager · choice `appoint` | Appoint a proper manager | Hire a professional fund manager |

### bequest-conditions

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · bequest-conditions · text | A bequest has arrived with conditions: the money is for a building, the building is to bear the donor's name, and the name is to appear 'in stone, not in vinyl'. The sum is substantial. The estate's lawyers have used the word 'exacting' about the family. | A bequest has arrived with conditions. The money is for a building, the building must carry the donor's name, and the name must appear 'in stone, not in vinyl'. The sum is substantial. The estate's lawyers have used the word 'exacting' about the family. |

### draw-questioned

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · draw-questioned · text | The Finance Committee has noticed the draw. One member has prepared a chart showing what the fund would be worth in thirty years at the current rate and has brought copies, which is the part the CFO objects to. | The Finance Committee has noticed how much you draw from the endowment. One member has made a chart of what the fund would be worth in thirty years at this rate. They have brought copies, which is the part the CFO objects to. |
| eventCatalogue.ts · draw-questioned · choice `cut` | Put a year's excess draw back and lower the rate | Pay back a year's extra draw and lower the rate |
| eventCatalogue.ts · draw-questioned · choice `defend` | Defend the rate | Defend the current rate |

### frozen-post

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · frozen-post · text | The construction freeze has put the building program on hold, and with it the budget line for a vacant teaching post: advertised, unadvertised and advertised again, until the department stopped asking about it. The last advertisement found {candidate}, who teaches {candidateField} and could start this term. | The construction freeze has put building on hold, and with it the money for an empty teaching post. The post was advertised, unadvertised and advertised again, until the department stopped asking about it. The last advertisement found {candidate}, who teaches {candidateField} and could start this term. |
| eventCatalogue.ts · frozen-post · choice `fill` | Appoint {candidate} to the post | Hire {candidate} for the post |

### trustee-resigns

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · trustee-resigns · choice `replace` | Move quickly on a replacement | Find a replacement quickly |

### press-inquiry

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · press-inquiry · text | A reporter has been asking the kind of questions that mean they already have the figures. The deadline is Friday. The Communications Officer would like to know what the college's position is, and does not appear to be joking. | A reporter has been asking the kind of questions that mean they already have the figures. The deadline is Friday. The Communications Officer would like to know what your position is, and does not appear to be joking. |

### board-retreat

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · board-retreat · text | The board would like a retreat. The proposal is for two days at a hotel with a facilitator, and the stated purpose is to think strategically about the next twenty years, which the last retreat also did. | The board would like a retreat. The proposal is two days at a hotel with a facilitator. The stated purpose is to think strategically about the next twenty years, which the last retreat also did. |

### tenure-case

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · tenure-case · text | A tenure case has reached the President's desk. The department is for it, the school's committee is against it, and the external letter praises {faculty}'s work at length before declining to recommend anything at all. | A tenure case has reached your desk. The department is for it, the school's committee is against it, and the external letter praises {faculty}'s work at length before declining to recommend anything at all. |

### sabbatical-overrun

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · sabbatical-overrun · text | A professor on sabbatical elsewhere has not come back. The work is going well, apparently, and there has been a letter about extending, and the teaching that was covered for one year has now been covered for two. | A professor on sabbatical elsewhere has not come back. The work is going well, apparently. There has been a letter about extending. The teaching that was covered for one year has now been covered for two. |
| eventCatalogue.ts · sabbatical-overrun · choice `recall` | Write to require a return | Write and insist they come back |

### two-body

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · two-body · text | {faculty}, whom {school} would like to keep, has a spouse, {candidate}, who is also an academic, in {candidateField}, a field the college does not teach, and has asked, mildly, whether anything might be possible. Nobody has mentioned going anywhere else, which is itself a kind of mention. | {school} would like to keep {faculty}. Their spouse, {candidate}, is also an academic, in {candidateField}, a field your college doesn't teach. {faculty} has asked, mildly, whether anything might be possible. Nobody has mentioned going anywhere else, which is itself a kind of mention. |
| eventCatalogue.ts · two-body · choice `line` | Appoint {candidate} to a courtesy post | Hire {candidate} into a courtesy post |
| eventCatalogue.ts · two-body · choice `nothing` | Say that nothing is possible | Say nothing is possible, and lose {faculty} |

### star-lecture

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · star-lecture · choice `restrict` | Restrict it to the registered | Keep it to registered students |

### teaching-review

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · teaching-review · text | The teaching returns are the worst the college has recorded. The written comments are not angry, which the Dean's office has noted as the concerning part; they are patient, and several of them say that the students had expected this. | Your teaching evaluations are the worst the college has recorded. The written comments aren't angry, and the Dean's office finds that the worrying part. They are patient. Several of them say the students expected this. |
| eventCatalogue.ts · teaching-review · choice `invest` | Fund a response and publish it | Fund a plan to fix it, and publish it |
| eventCatalogue.ts · teaching-review · choice `note` | Note the returns and circulate them | Circulate the evaluations and leave it there |

### accreditation-visit

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · accreditation-visit · choice `minimum` | Send what exists | Send what you already have |

### library-acquisition

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · library-acquisition · text | A private library is coming up: eleven thousand volumes, a working collection rather than a beautiful one, from a scholar who taught here briefly and disliked it. The heirs would prefer it went somewhere it would be used. | A private library is for sale. It holds eleven thousand working volumes, from a scholar who taught here briefly and disliked it. The heirs would prefer it went somewhere it would be used. |
| eventCatalogue.ts · library-acquisition · choice `buy` | Buy the collection | Buy the whole collection |

### sit-in

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · sit-in · text | Forty students are sitting in the foyer of {building}. They have a list of six things, four of which the college agrees with, and they have been letting the cleaning staff through since Tuesday. | Forty students are sitting in the foyer of {building}. They have a list of six things, and you agree with four of them. They have been letting the cleaning staff through since Tuesday. |

### newspaper

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · newspaper · text | The student newspaper has asked for funding, an office, and an undertaking that the college will not read it before it is printed. The editor is nineteen and has put the three requests in that order on purpose. | The student newspaper has asked for funding, an office, and a promise that you won't read it before it's printed. The editor is nineteen and has put the three requests in that order on purpose. |
| eventCatalogue.ts · newspaper · choice `fund` | Fund it and give the undertaking | Fund it and make the promise |
| eventCatalogue.ts · newspaper · choice `office` | Give them the room, not the money | Give them an office, but no money |
| eventCatalogue.ts · newspaper · choice `decline` | Decline all three | Say no to all three |

### dining-petition

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · dining-petition · choice `nothing` | Acknowledge the petition | Acknowledge the petition and change nothing |

### mascot

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · mascot · text | The college has never settled on a mascot. The students have settled on one: a swan, which lives on the pond and has bitten two people. The student government has produced a costume without being asked. | Your college has never settled on a mascot. The students have settled on one: a swan, which lives on the pond and has bitten two people. The student government has produced a costume without being asked. |

### exam-scandal

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · exam-scandal · text | A final exam has gotten out ahead of time. Eleven students are known to have seen it; the number who saw it and said nothing is not known and cannot be. Student Affairs has asked for a decision before Friday. | A final exam has gotten out ahead of time. Eleven students are known to have seen it. Nobody knows, or can know, how many saw it and said nothing. Student Affairs has asked for a decision before Friday. |
| eventCatalogue.ts · exam-scandal · choice `eleven` | Deal with the eleven | Discipline the eleven |

### winter-outbreak

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · winter-outbreak · text | Something is going around the residences. The Health Center has seen ninety students in four days and has run out of the only thing that helps, which is a room to put them in that is not the room they share. | Something is going around the residences. The Health Center has seen ninety students in four days. It has run out of the only thing that helps, which is a room to put them in that isn't the room they share. |

### annual-fund-drive

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · annual-fund-drive · choice `letter` | Write to them instead | Write to the alumni instead |
| eventCatalogue.ts · annual-fund-drive · choice `nothing` | Leave the ledger alone this year | Don't ask the alumni this year |

### class-complaint

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · class-complaint · text | The {class} have written collectively. The letter is careful, signed by nineteen of them, and concerns a campus that has changed without them, a tradition that has lapsed, and the fact that nobody told them about either. | The {class} have written collectively. The letter is careful, signed by nineteen of them, and concerns a campus that has changed without them, a tradition that has died out, and the fact that nobody told them about either. |
| eventCatalogue.ts · class-complaint · choice `acknowledge` | Acknowledge and file | Acknowledge it and file it |

### alumni-trustee

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · alumni-trustee · text | The alumni would like a seat on the board, filled by election rather than by invitation. They have been polite about it for six years and have now been polite about it in a letter with four hundred names attached. | The alumni would like a seat on the board that they elect themselves. They have been polite about it for six years and have now been polite about it in a letter with four hundred names attached. |

### yield-panic

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · yield-panic · text | The deposits are behind. The Dean of Admissions has proposed a second round of offers, which works, and has also proposed not describing it as a second round, which is where the conversation slowed down. | Deposits from admitted students are behind. The Dean of Admissions has proposed a second round of offers, which works. The Dean has also proposed not calling it a second round, which is where the conversation slowed down. |
| eventCatalogue.ts · yield-panic · choice `second-round` | Go to a second round | Make a second round of offers |

### guidebook

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · guidebook · choice `advertise` | Buy the larger entry | Pay for a larger entry |

### recruiting-trip

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · recruiting-trip · text | Admissions would like to visit schools in three states rather than one. The case is a page long and rests on a single sentence: nobody who has not heard of {school} has applied to it. | Admissions would like to visit high schools in three states instead of one. The case is a page long and rests on a single sentence. Nobody who hasn't heard of {school} has applied to it. |
| eventCatalogue.ts · recruiting-trip · choice `fund` | Fund the wider circuit | Fund visits in three states |
| eventCatalogue.ts · recruiting-trip · choice `local` | Keep to the county | Keep recruiting in the county |

### fire

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · fire · text | The fire began in a service riser in {building} at some time after two in the morning and was out by six. Nobody was in the building. The night guard, who was, walked the whole of the upper floor before the fire department arrived and would like it recorded that he was following the procedure, which he was not. ¶ Smoke has closed the east end for the term: three teaching rooms, the departmental office and forty years of a filing system nobody had photographed. The insurers will meet part of it. Their assessor has used the phrase 'deferred maintenance' twice in a preliminary note and will use it again. ¶ Academic Affairs would like to know what to tell the students who had lectures there on Monday, and has asked in a way that suggests the answer matters more than the building does. | The fire began in a service riser in {building} some time after two in the morning, and was out by six. Nobody was in the building. The night guard, who was, walked the whole upper floor before the fire department arrived. He would like it recorded that he was following the procedure, which he was not. ¶ Smoke has closed the east end for the term: three teaching rooms, the departmental office and forty years of a filing system nobody had photographed. The insurers will pay part of it. Their assessor has used the phrase 'deferred maintenance' twice in a preliminary note and will use it again. ¶ Academic Affairs would like to know what to tell the students who had lectures there on Monday. The way they asked suggests the answer matters more than the building does. |
| eventCatalogue.ts · fire · choice `close` | Make it safe and defer the rebuild | Make it safe and put off the rebuild |

### scandal

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · scandal · text | The irregularity in the business office accounts is eleven years old, amounts to a good deal more than was first thought, and was found by a temporary clerk checking something else. The person responsible retired four years ago with a presentation and a speech. ¶ The auditors have been informed because they had to be. The board has been informed because the auditors informed them. The press have not been informed, yet, and the Communications Officer has written the word 'yet' on the briefing note in a hand that suggests she does not expect that to last. ¶ There is a version of this where {school} announces it first, plainly, with the figure and the referral, and takes a bad two weeks. There is a version where it does not, and the college waits to see whether anyone else will. | The irregularity in the business office accounts is eleven years old. It comes to a good deal more than was first thought. A temporary clerk found it while checking something else. The person responsible retired four years ago with a presentation and a speech. ¶ The auditors have been informed because they had to be. The board has been informed because the auditors informed them. The press have not been informed, yet. The Communications Officer has written the word 'yet' on the briefing note, in a hand that suggests she doesn't expect that to last. ¶ In one version of this, you announce it first, plainly, with the figure and the referral to the authorities, and take a bad two weeks. In another, you don't, and wait to see whether anyone else will. |
| eventCatalogue.ts · scandal · choice `announce` | Announce it, refer it, and publish the figure | Announce it, refer it to the authorities, and publish the figure |
| eventCatalogue.ts · scandal · choice `internal` | Handle it internally and recover what can be recovered | Handle it quietly and recover what you can |

### bequest

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · bequest · text | Eleanor Whitfield left {school} almost everything, which is a great deal more than anyone expected, and a letter of three sentences explaining why. She graduated in a year the college would rather not dwell on, was taught by two people it has since named rooms after, and gave nothing at all for forty years. ¶ The letter says she did not give before because nobody asked her anything except for money. It says she is giving now because of a conversation with a student caller who asked what she had studied and then asked a second question about it. It does not name the student. ¶ The executors are ready. The board has met twice already and has not agreed, because a sum this size is not a gift to a college so much as a decision about what the college is going to be. | Eleanor Whitfield left {school} almost everything, which is a great deal more than anyone expected, and a letter of three sentences explaining why. She graduated in a year the college would rather not dwell on, was taught by two people it has since named rooms after, and gave nothing at all for forty years. ¶ The letter says she did not give before because nobody asked her anything except for money. It says she is giving now because of a conversation with a student caller who asked what she had studied and then asked a second question about it. It does not name the student. ¶ The executors are ready. The board has met twice and has not agreed. A sum this size is less a gift than a decision about what your college is going to be. |
| eventCatalogue.ts · bequest · choice `build` | Build with it now | Take it as cash and build now |

### protest-era

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · protest-era · text | The administration building has been occupied since Thursday. It is orderly: there is a sign-up sheet, the mail is being passed through, and somebody has been watering the plants in the outer office. The demands run to two pages and are mostly about money, which is to say mostly about things the college has already conceded it cannot afford. ¶ The faculty are divided in a way that is new. Eleven have signed a letter supporting the students. Three have signed one opposing it. The rest are waiting to see which letter it is better to have signed, which is the part the President has found most instructive. ¶ The town is watching. The board is waiting. The students in the building are, on the whole, being more reasonable than anyone outside it. | The administration building has been occupied since Thursday. It is orderly: there is a sign-up sheet, the mail is being passed through, and somebody has been watering the plants in the outer office. The demands run to two pages and are mostly about money. That means mostly things you have already admitted you can't afford. ¶ The faculty are divided in a way that is new. Eleven have signed a letter supporting the students. Three have signed one opposing it. The rest are waiting to see which letter it is better to have signed, which is the part you have found most instructive. ¶ The town is watching. The board is waiting. The students in the building are, on the whole, being more reasonable than anyone outside it. |
| eventCatalogue.ts · protest-era · choice `negotiate` | Negotiate in public and concede what is true | Negotiate in public and give ground where they're right |
| eventCatalogue.ts · protest-era · choice `police` | End the occupation | Call the police to end the occupation |

### unheard-of

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · unheard-of · text | A prospective student's parent has telephoned to ask whether {school} is accredited, which it is, and how long it has been open, which is the part the Registrar found harder to answer warmly. Nobody in the county has heard of the place yet. | A prospective student's parent has telephoned to ask whether {school} is accredited, which it is. They also asked how long it has been open, which the Registrar found harder to answer warmly. Nobody in the county has heard of the place yet. |
| eventCatalogue.ts · unheard-of · choice `campaign` | Advertise, properly, for a year | Advertise properly for a year |

### surplus-problem

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · surplus-problem · text | The operating account has more in it than the college has ever held and no plan attached to any of it. Three memos have arrived this week proposing uses. The CFO has pointed out, with feeling, that money sitting still is the only kind that is certainly not doing anything. | Your operating account holds more than the college has ever had, and there's no plan for any of it. Three memos have arrived this week proposing uses. The CFO has pointed out, with feeling, that money sitting still is the only kind that is certainly not doing anything. |
| eventCatalogue.ts · surplus-problem · choice `endow` | Move it into the fund | Move it into the endowment |

### thin-fund

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · thin-fund · text | The endowment is smaller than those of the comparator colleges the board keeps a table of. The table is not in the papers this time, which everyone has noticed. | Your endowment is smaller than those of the colleges the board compares you with. The board keeps a table of them. The table is not in the papers this time, which everyone has noticed. |
| eventCatalogue.ts · thin-fund · choice `restraint` | Put a year's draw back and lower the rate | Pay back a year's draw and lower the rate |
| eventCatalogue.ts · thin-fund · choice `nothing` | Leave it | Leave it alone |

### payroll-share

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · payroll-share · text | Salaries are now most of what the college spends. The CFO's paper says this plainly in one line and then spends four pages explaining that it is not, in itself, a criticism of anybody, which is how everyone knows what the paper is about. | Salaries are now most of what you spend. The CFO's paper says this plainly in one line. It then spends four pages explaining that this is not, in itself, a criticism of anybody, which is how everyone knows what the paper is about. |

### bleak-campus

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · bleak-campus · text | The photographs for the viewbook have come back and the Admissions Office would like to discuss them. The buildings are all present and correct. The difficulty is what is between them, which in most of the frames is nothing at all. | The viewbook photographs have come back, and the Admissions Office would like to discuss them. The buildings are all present and correct. The difficulty is what is between them, which in most of the frames is nothing at all. |

### good-year

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · good-year · text | Something is going right. The returns are good, the leavers are few, and three students have written to the President unprompted, which has not happened before. Academic Affairs would like to know what the college is doing, so that it can keep doing it. | Something is going right. The returns are good, the leavers are few, and three students have written to you unprompted, which has not happened before. Academic Affairs would like to know what you are doing, so you can keep doing it. |

### bad-run

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · bad-run · text | It has been a long few terms. No single thing has gone badly enough to write about, and the accumulation of it is in the corridors, in the returns, and in the number of people who have stopped coming to things. | It has been a long few terms. No single thing has gone badly enough to write about. But it adds up, and it shows in the corridors, in the evaluations, and in how many people have stopped coming to things. |

### one-teacher

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · one-teacher · text | The schedule for next term has been drawn up and shows the same three names against every hour of it. It is workable. The Registrar has attached a note observing that it is workable only for as long as none of the three gets sick. | The schedule for next term has been drawn up and shows the same three names against every hour of it. It is workable. The Registrar has attached a note. It points out that it is workable only as long as none of the three gets sick. |
| eventCatalogue.ts · one-teacher · choice `hire` | Pay the three for overload teaching | Pay the three extra to teach the overload |
| eventCatalogue.ts · one-teacher · choice `cover` | Pay for outside cover | Pay outside teachers to cover |

### the-boiler

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-boiler · choice `defer` | Defer it to the summer works | Put it off until the summer |
| eventCatalogue.ts · the-boiler · recall `defer` | The central boiler whose replacement went to the summer works in Year {answeredYear} has begun to cough again. The summer works, facilities would like it noted, did not reach it. | In Year {answeredYear} you put off replacing the central boiler until the summer. It has begun to cough again. The summer work, Facilities would like it noted, never reached it. |

### the-ice-walk

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-ice-walk · text | The walk from the residence halls to the dining hall froze overnight into a single continuous sheet, and was crossed at breakfast by most of the freshman class in a manner Facilities describes as 'improvised'. Nobody is badly hurt. One wrist. | The walk from the residence halls to the dining hall froze overnight into one continuous sheet. Most of the freshman class crossed it at breakfast, in a manner Facilities describes as 'improvised'. Nobody is badly hurt. One wrist. |

### the-dark-term

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-dark-term · text | The spring term has started in the dark: sunrise after the first lecture, sunset before the last. The counseling service has asked, in a memo with a sun drawn on it, for a daylight lamp in every lounge. | The spring term has started in the dark. The sun rises after the first lecture and sets before the last. The counseling service has asked, in a memo with a sun drawn on it, for a daylight lamp in every lounge. |

### the-freeze

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-freeze · text | The coldest night in forty years came the Sunday before term, and on Monday the pipes gave way in three buildings at once. Water came through the ceiling of a lecture theater in the kind of steady, reasonable way that suggests it has been planning this. The custodians worked through the night and saved the rare books by carrying them, one cart at a time, to the only room in the college that was still dry, which was the chaplain's. ¶ The insurers have sent a man. He has a clipboard and a very good coat. | The coldest night in forty years came the Sunday before term, and on Monday the pipes gave way in three buildings at once. Water came through the ceiling of a lecture theater in the kind of steady, reasonable way that suggests it has been planning this. The custodians worked through the night. They saved the rare books by carrying them, one cart at a time, to the only room on campus that was still dry, which was the chaplain's. ¶ The insurers have sent a man. He has a clipboard and a very good coat. |
| eventCatalogue.ts · the-freeze · choice `replumb` | Replumb properly | Replace the plumbing properly |
| eventCatalogue.ts · the-freeze · choice `patch` | Make safe and dry out | Make it safe and dry it out |

### the-championship-run

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-championship-run · choice `quiet` | A reception and back to work | Hold a reception, then back to work |

### the-rival-prank

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-rival-prank · text | Students from {rival} broke into the bell tower overnight — or the tallest building, in its absence — and hung their colors from the top. Student Affairs has a list of names, a photograph of the banner, and a request from the college's own students to be allowed to answer in kind. | Students from {rival} climbed your tallest building overnight and hung their colors from the top. Student Affairs has a list of names and a photograph of the banner. Your own students are asking to be allowed to answer in kind. |
| eventCatalogue.ts · the-rival-prank · choice `answer` | Look the other way while they answer | Look the other way while your students answer |

### the-rankings-slip

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-rankings-slip · text | The board chair has brought the guide to the meeting, open at the table, with the college's line underlined twice. She would like to know what the administration intends to do about it, and has a consultant in mind. | The board chair has brought the guide to the meeting, open at the table, with your college's line underlined twice. She would like to know what you intend to do about it, and has a consultant in mind. |

### the-all-nighter

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-all-nighter · text | The reading rooms were full at four in the morning for the third week running, and the college nurse has seen more exhaustion this term than flu. The student paper has a front page about it and a list of demands. | The reading rooms were full at four in the morning for the third week running. The college nurse has seen more exhaustion this term than flu. The student paper has a front page about it and a list of demands. |

### the-grant-windfall

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-grant-windfall · text | A national foundation has funded a proposal from {faculty}, and the overhead on the grant is more than the department's budget. The foundation would like the college to countersign, and to say that it means it. | A national foundation has funded a proposal from {faculty}. The grant's overhead, the share that comes to the college, is more than the department's whole budget. The foundation would like you to countersign, and to say that you mean it. |

### the-car-park

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-car-park · choice `ballot` | Allocate the permits by ballot | Hand out the permits by lottery |

### the-burst-pipe

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-burst-pipe · text | A pipe above the second floor of {building} burst on Saturday and ran until Monday, when the first seminar of the week found it. The ceiling tiles are drying in the corridor, stacked and numbered by somebody from the security desk, which Facilities describes as the most useful thing done all weekend. | A pipe above the second floor of {building} burst on Saturday and ran until Monday, when the first seminar of the week found it. The ceiling tiles are drying in the corridor, stacked and numbered by somebody from the security desk. Facilities calls this the most useful thing done all weekend. |

### the-master-key

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-master-key · text | The master key to {building} has been lost. It was last seen on a ring with nine others and a small plastic lobster, and the locksmith's estimate for changing every lock in the building runs to four pages. | The master key to {building} has been lost. It was last seen on a ring with nine others and a small plastic lobster. The locksmith's estimate for changing every lock in the building runs to four pages. |
| eventCatalogue.ts · the-master-key · recall `rekey` | The master key to {building} has been lost. The locks were all changed in Year {answeredYear}, and the new master key has gone the way of the old one, on a ring with nine others and, the porters report, a different small plastic lobster. | The master key to {building} has been lost. The locks were all changed in Year {answeredYear}. The new master key has gone the way of the old one, on a ring with nine others and, the porters report, a different small plastic lobster. |

### the-buckets

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-buckets · text | Rain has been getting into {building} along the valley gutter, and there are now nine buckets in the top-floor corridor. The custodians empty them twice a day and have begun logging the volumes in a notebook, which they would like someone senior to read, because the numbers are going up. | Rain has been getting into {building} along the valley gutter, and there are now nine buckets in the top-floor corridor. The custodians empty them twice a day and have started logging the volumes in a notebook. They would like someone senior to read it, because the numbers are going up. |

### the-lift

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-lift · text | The elevator in {building} has stopped between floors for the fourth time this term, most recently for fifty minutes with a department chair inside it. The chair used the time to draft a memo about the elevator, which has now arrived, and which notes that for some students the stairs are not an alternative. | The elevator in {building} has stopped between floors for the fourth time this term, most recently for fifty minutes with a department chair inside it. The chair used the time to draft a memo about the elevator, which has now arrived. It notes that for some students the stairs are not an option. |

### the-plagiarism-software

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-plagiarism-software · text | The plagiarism software licensed last year has flagged two freshman essays in five. One of them is an essay on academic honesty, flagged for quoting the college's own policy, correctly and with a citation. | The plagiarism software you licensed last year has flagged two freshman essays in five. One of them is an essay on academic honesty, flagged for quoting your own policy, correctly and with a citation. |

### the-writing-requirement

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-writing-requirement · text | The Curriculum Committee has met eleven times on whether freshmen should take a writing course, and has approved the minutes of all eleven meetings and nothing else. The chair has asked whether the President might 'indicate a view', in a tone that suggests a request to be rescued. | The Curriculum Committee has met eleven times on whether freshmen should take a writing course, and has approved the minutes of all eleven meetings and nothing else. The chair has asked whether you might 'indicate a view', in a tone that suggests a request to be rescued. |
| eventCatalogue.ts · the-writing-requirement · recall `leave` | The Curriculum Committee, left with the writing course in Year {answeredYear}, has met eleven more times and approved the minutes of all of them. The chair would again like the President to 'indicate a view', and no longer pretends it is anything but a request to be rescued. | The Curriculum Committee, left with the writing course in Year {answeredYear}, has met eleven more times and approved the minutes of all of them. The chair would again like you to 'indicate a view', and no longer pretends it is anything but a request to be rescued. |

### the-lab-inspection

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-lab-inspection · choice `all` | Put everything on the list right | Fix everything on the list |

### the-last-lecture

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-last-lecture · choice `card` | Send a card and reallocate the office | Send a card and give the office to someone else |

### the-closing-bell

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-closing-bell · choice `open` | Open the library all night in exams | Open the library all night during exams |
| eventCatalogue.ts · the-closing-bell · choice `hold` | Keep to midnight closing | Keep closing at midnight |
| eventCatalogue.ts · the-closing-bell · recall `hold` | It is exam season, and the library still closes at midnight, as the college decided in Year {answeredYear}. At ten past, the night guard's flashlight now finds fifty students who did not hear the bell, and one who has brought a sleeping bag. | It is exam season, and the library still closes at midnight, as you decided in Year {answeredYear}. At ten past, the night guard's flashlight now finds fifty students who did not hear the bell, and one who has brought a sleeping bag. |

### the-laundry

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-laundry · text | The laundry room in the residence halls has six machines, two of which work, and one of which works only if struck in a place the students have marked with tape. A sign-up sheet has appeared on the door. It is fairer than anything the college has issued this year. | The laundry room in the residence halls has six machines, two of which work, and one of which works only if struck in a place the students have marked with tape. A sign-up sheet has appeared on the door. It is fairer than anything you have issued this year. |

### the-vegan-counter

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-vegan-counter · text | The dining hall added a vegan dish to the lunch counter this term, and it has sold out by half past twelve every day since. The catering manager would like to know whether the college intends to plan for this, or to go on being surprised by it at half past twelve. | The dining hall added a vegan dish to the lunch counter this term, and it has sold out by half past twelve every day since. The catering manager would like to know whether you intend to plan for this, or to go on being surprised by it at half past twelve. |

### the-lodge-cat

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-lodge-cat · text | A cat has moved in behind the security desk. It arrived in October, has been fed by at least four people who each believed they were the only one, and now appears in more student photographs than the President does. | A cat has moved in behind the security desk. It arrived in October, has been fed by at least four people who each believed they were the only one, and now appears in more student photographs than you do. |
| eventCatalogue.ts · the-lodge-cat · choice `adopt` | Adopt the cat on the college's books | Adopt the cat officially |

### the-bike-thefts

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-bike-thefts · text | Forty-one bicycles have been stolen from outside {building} since the start of term. Campus security describes it as a wave. The insurer has declined to describe it as anything until it has seen the locks, and the student government has begun selling better ones at cost. | Forty-one bicycles have been stolen from outside {building} since the start of term. Campus security describes it as a wave. The insurer won't describe it as anything until it has seen the locks. The student government has started selling better ones at cost. |

### the-hunger-strike

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-hunger-strike · text | Six students have been on hunger strike for eleven days on the steps of {building}, asking the college to publish where the endowment is invested. They are taking water and seeing the nurse each morning. The nurse has written to say that the second week is when it stops being a gesture. | Six students have been on hunger strike for eleven days on the steps of {building}, asking you to publish where the endowment is invested. They are taking water and seeing the nurse each morning. The nurse has written to say that the second week is when it stops being a gesture. |
| eventCatalogue.ts · the-hunger-strike · choice `publish` | Publish the holdings and meet them | Publish the investments and meet them |

### the-wrong-coach

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-wrong-coach · text | Orientation went wrong in its first hour, when the buses meeting the new students at the station took them to a college with a similar name forty miles away. The other college gave them lunch and a tour, and has written, generously, to say that several of them asked about transferring. | Orientation went wrong in its first hour. The buses meeting the new students at the station took them to a college with a similar name, forty miles away. The other college gave them lunch and a tour, and has written, generously, to say that several of them asked about transferring. |
| eventCatalogue.ts · the-wrong-coach · choice `carry` | Carry on with the program as printed | Carry on with the printed schedule |

### the-invited-speaker

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-invited-speaker · text | A student society has invited a speaker whose views half the campus finds objectionable and the other half has not yet looked up. The society has booked the largest lecture room, two other societies have booked the corridor outside it, and Security would like a decision by Wednesday. | A student society has invited a speaker whose views half the campus finds objectionable and the other half has not yet looked up. The society has booked the largest lecture room. Two other societies have booked the corridor outside it. Security would like a decision by Wednesday. |

### the-statue-donor

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-statue-donor · text | A donor has offered a gift to the endowment, on condition that a bronze of himself be placed at the main entrance. The sculptor has already been engaged, and the maquette shows him somewhat taller than the Registrar remembers. | A donor has offered a gift to the endowment, on condition that a bronze of himself stands at the main entrance. The sculptor has already been engaged, and the maquette shows him somewhat taller than the Registrar remembers. |
| eventCatalogue.ts · the-statue-donor · choice `accept` | Accept the gift, and promise a statue | Accept the gift and promise to place his statue |
| eventCatalogue.ts · the-statue-donor · choice `plaque` | Offer to name an endowed fund instead | Offer to name a scholarship fund after him instead |

### the-reunion-gift

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-reunion-gift · choice `clock` | Accept the clock as given | Accept the clock, wrong year and all |

### the-racehorse

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-racehorse · text | An alumnus has given the college a racehorse, with papers, a trainer, and a stable bill already running. The horse has won twice in four starts, and the Development Office would like it on the record that it did not ask for this. | An alumnus has given your college a racehorse, with papers, a trainer, and a stable bill already running. The horse has won twice in four starts, and the Development Office would like it on the record that it did not ask for this. |
| eventCatalogue.ts · the-racehorse · choice `race` | Race it for a season in the college colors | Race it for a season in your colors |

### the-honorary-degree

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-honorary-degree · choice `defer` | Let the nomination lapse | Let the nomination quietly expire |

### the-address-list

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-address-list · choice `summer` | Pay students to clean it over the summer | Pay students to update the records over the summer |

### the-matching-challenge

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-matching-challenge · text | A trustee has offered to match every alumni gift dollar for dollar, up to about a year of alumni giving, if the challenge is announced and campaigned for. She has done this before, elsewhere, and says it has never once failed. | A trustee has offered to match every alumni gift dollar for dollar, up to about a year's alumni giving. The condition is that you announce the challenge and campaign for it. She has done this before, elsewhere, and says it has never once failed. |

### the-dormant-account

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-dormant-account · text | The auditors have found a bank account in the college's name that nobody in the business office remembers opening. It holds a small balance and a recurring payment, still running, to a florist. | The auditors have found a bank account in your college's name that nobody in the business office remembers opening. It holds a small balance and a recurring payment, still running, to a florist. |
| eventCatalogue.ts · the-dormant-account · choice `close` | Close the account and bring it on the books | Close the account and take the money |

### the-pension-valuation

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-pension-valuation · text | The triennial valuation of the staff pension plan shows a shortfall. The actuary's letter is courteous, and recommends that something be done. | The three-yearly review of the staff pension plan shows a shortfall. The actuary's letter is courteous, and recommends that something be done. |

### the-beverage-contract

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-beverage-contract · text | A beverage company has offered the college an exclusive pouring contract: its machines in every building, its logo on the scoreboard, its color on the recycling bins. The draft runs to forty pages, three of which concern the bins. | A beverage company has offered you an exclusive pouring contract: its machines in every building, its logo on the scoreboard, its color on the recycling bins. The draft runs to forty pages, three of which concern the bins. |

### the-land-offer

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-land-offer · text | A timber company has offered to clear the wooded strip along the college's northern edge, which the college has owned since its founding and has never once found a use for. The offer letter refers to it as 'the opportunity site'. | A timber company has offered to clear the wooded strip along your northern edge. The college has owned it since the founding and never once found a use for it. The offer letter refers to it as 'the opportunity site'. |
| eventCatalogue.ts · the-land-offer · choice `lease` | Sell a twenty-year lease up front | Lease it out for twenty years, paid up front |
| eventCatalogue.ts · the-land-offer · recall `keep` | The timber company told in Year {answeredYear} that the college would keep its wooded northern strip has written again, with a higher figure and the same phrase: 'the opportunity site'. The strip has still found no use, which the letter mentions twice. | In Year {answeredYear} you told the timber company you would keep the wooded northern strip. It has written again, with a higher figure and the same phrase: 'the opportunity site'. The strip has still found no use, which the letter mentions twice. |

### the-strategic-plan

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-strategic-plan · text | The board has asked for a strategic plan. The last one is in the President's filing cabinet, in a binder whose spine reads 'Vision', and nobody has opened it since the year it was printed. | The board has asked for a strategic plan. The last one is in your filing cabinet, in a binder whose spine reads 'Vision', and nobody has opened it since the year it was printed. |

### the-trustee-bid

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-trustee-bid · choice `rebid` | Rebid the contract | Put the contract out to bid again |

### the-consultants-report

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-consultants-report · text | The consultants have delivered their report, two hundred and twelve pages, and its central finding is that the college should 'lean into its distinctiveness'. The appendix describing the distinctiveness appears to have been written for a previous client. | The consultants have delivered their report, two hundred and twelve pages, and its central finding is that you should 'lean into your distinctiveness'. The appendix describing the distinctiveness appears to have been written for a previous client. |

### the-presidents-residence

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-presidents-residence · text | The board would like the President's residence refurbished before the trustees' dinner. The proposal includes a wine room, a second dining room, and a line item headed 'dignity', which is the largest. | The board would like your residence refurbished before the trustees' dinner. The proposal includes a wine room, a second dining room, and a line item headed 'dignity', which is the largest. |

### the-board-secretary

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-board-secretary · choice `hire` | Appoint a full-time successor | Hire a full-time successor |
| eventCatalogue.ts · the-board-secretary · choice `rotate` | Rotate the minutes among the trustees | Have the trustees take turns at the minutes |

### the-rankings-survey

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-rankings-survey · text | The guide's reputation survey has arrived, asking the President to rate twenty-four other colleges from one to five. Last year's return rated {rival} a two, and the President's office would like to know whether that is still the college's position. | The guide's reputation survey has arrived, asking you to rate twenty-four other colleges from one to five. Last year's return rated {rival} a two. Your office would like to know whether that is still your position. |
| eventCatalogue.ts · the-rankings-survey · choice `brochure` | Send every president a brochure, for the board's sake | Send the other presidents a brochure, for the board's sake |

### the-rival-film

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-rival-film · choice `commission` | Commission a film of the college's own | Commission a film of your own |

### the-booster-club

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-booster-club · text | The {sport} booster club has offered the college a gift, with one request attached: a seat on the committee that appoints the coach. The club's president has put the request in the cover letter and the check in the same envelope. | The {sport} booster club has offered you a gift, with one request attached: a seat on the committee that appoints the coach. The club's president has put the request in the cover letter and the check in the same envelope. |
| eventCatalogue.ts · the-booster-club · choice `accept` | Accept the gift and an advisory seat | Accept the gift and give them an advisory seat |
| eventCatalogue.ts · the-booster-club · choice `unconditional` | Take the money, decline the seat | Take the money, refuse the seat |

### the-flood

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-flood · text | The river came over the east meadow on Thursday and did not stop at the path, which the planning documents had assured everyone it would. By Saturday there was water to the second step of {building} and a canoe tied to the bicycle racks, and the grounds staff had carried the ground-floor archive up a story by hand, box by box, through the night. ¶ Nobody was hurt. The claims adjuster has described the damage as 'general', which the project manager has asked him to define. The hydrologist whose report the board received and noted some years ago has written to say she is sorry to have been right. | The river came over the east meadow on Thursday and did not stop at the path, which the planning documents had assured everyone it would. By Saturday there was water up to the second step of {building}, and a canoe tied to the bicycle racks. The grounds staff had carried the ground-floor archive upstairs by hand, box by box, through the night. ¶ Nobody was hurt. The claims adjuster has described the damage as 'general', which the project manager has asked him to define. Some years ago the board received a hydrologist's report, and noted it. She has written to say she is sorry to have been right. |
| eventCatalogue.ts · the-flood · choice `repair` | Dry out and defer the repairs | Dry out and put off the repairs |
| eventCatalogue.ts · the-flood · choice `upstairs` | Move ground-floor teaching for a term | Move ground-floor teaching upstairs for a term |
| eventCatalogue.ts · the-flood · recall `repair` | The river came over the east meadow again on Thursday. The repairs deferred after the flood of Year {answeredYear} were still waiting when the water reached the second step of {building}, and the grounds staff carried the ground-floor archive up a story by hand for the second time, faster than the first. ¶ Nobody was hurt. The claims adjuster has asked, in writing, whether the college intends to make a habit of this. The hydrologist has not written; the board has had her report since the last time. | The river came over the east meadow again on Thursday. The repairs you put off after the flood of Year {answeredYear} were still waiting when the water reached the second step of {building}. The grounds staff carried the ground-floor archive upstairs by hand for the second time, faster than the first. ¶ Nobody was hurt. The claims adjuster has asked, in writing, whether you intend to make a habit of this. The hydrologist has not written. The board has had her report since the last time. |
| eventCatalogue.ts · the-flood · recall `upstairs` | The river came over the east meadow again on Thursday. The teaching moved upstairs after the flood of Year {answeredYear} came back down when the ground floor dried, and it is going back up now, with the archive, by hand, through the night, past the water on the second step of {building}. ¶ Nobody was hurt. The claims adjuster has asked, in writing, whether the college intends to make a habit of this. The hydrologist has not written; the board has had her report since the last time. | The river came over the east meadow again on Thursday. After the flood of Year {answeredYear} you moved the teaching upstairs, and it came back down when the ground floor dried. Now it is going back up, with the archive, by hand, through the night, past the water on the second step of {building}. ¶ Nobody was hurt. The claims adjuster has asked, in writing, whether you intend to make a habit of this. The hydrologist has not written. The board has had her report since the last time. |

### the-sickness-term

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-sickness-term · text | The first cases came in the week after fall break, and by the end of the month a quarter of the college had been sick at once. The public health office has not ordered anything, and has said so in a letter that reads very much like a request. Lectures are running at half attendance, the kitchens are sending trays to the residences, and the chaplain has been sitting up with the students who are frightened, who are more numerous than the ones who are seriously sick. ¶ The question in front of the college is whether to finish the term in person, finish it at a distance, or end it early and hold exams in the spring. | The first cases came in the week after fall break, and by the end of the month a quarter of the college had been sick at once. The public health office has not ordered anything, and has said so in a letter that reads very much like a request. Lectures are running at half attendance, and the kitchens are sending trays to the residences. The chaplain has been sitting up with the students who are frightened. There are more of them than there are seriously sick. ¶ You have to decide whether to finish the term in person, finish it remotely, or end it early and hold exams in the spring. |
| eventCatalogue.ts · the-sickness-term · choice `distance` | Teach at a distance until it passes | Teach remotely until it passes |

### the-essay-ring

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-essay-ring · text | An outside reader in {program} noticed that four senior theses shared a bibliography, down to the same misspelled author. The inquiry that followed has found a paid essay service run from an apartment off campus, a customer list of a hundred and forty names, and a price list the Registrar describes as 'competitive'. Some of the names have already graduated. ¶ Most of the students on the list were frightened of failing, and Student Affairs would like that to count. The Senate would like the degrees to mean what they say. Both are right, which is why it has come to the President. | An outside reader in {program} noticed that four senior theses shared a bibliography, down to the same misspelled author. The inquiry that followed has found a paid essay service run from an apartment off campus, a customer list of a hundred and forty names, and a price list the Registrar describes as 'competitive'. Some of the names have already graduated. ¶ Most of the students on the list were frightened of failing, and Student Affairs would like that to count. The Senate would like the degrees to mean what they say. Both are right, which is why it has come to you. |
| eventCatalogue.ts · the-essay-ring · choice `rescind` | Rescind the degrees and fail the rest | Take back the degrees and fail the rest |

### the-grant-cut

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-grant-cut · text | The legislature has closed the tuition grant program at the end of a budget session that ran into the small hours. The letter informing {school} arrived eleven days after the vote, is a page and a half long, and describes the change as a 'transition'. Roughly one student in six held one of the grants. ¶ The families affected have begun telephoning the Financial Aid office, which has three staff and has stopped taking lunch. The college can replace the money, some of it, or none of it, and each answer has names attached. | The legislature has closed the tuition grant program at the end of a budget session that ran into the small hours. The letter telling {school} arrived eleven days after the vote. It is a page and a half long and calls the change a 'transition'. Roughly one student in six held one of the grants. ¶ The families affected have begun telephoning the Financial Aid office, which has three staff and has stopped taking lunch. You can replace all of the money, some of it, or none of it. Each answer has names attached. |
| eventCatalogue.ts · the-grant-cut · choice `lapse` | Let the grants lapse | Let the grants end |

### the-harrowgate-pledge

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-harrowgate-pledge · text | Hartwell & Sons has filed for bankruptcy owing more than anyone outside the firm had guessed, and with it has gone the second half of Arthur Hartwell's pledge to {school}. The first half is spent, on the drawings for a building that was to carry his name over the door in letters eleven inches high. ¶ The bankruptcy trustee has written to ask whether the college regards the money received so far as a gift or as an asset of the estate, and has enclosed a form. Mr. Hartwell has written separately, by hand, to apologize. | Hartwell & Sons has filed for bankruptcy owing more than anyone outside the firm had guessed, and with it has gone the second half of Arthur Hartwell's pledge to {school}. The first half is spent, on the drawings for a building that was to carry his name over the door in letters eleven inches high. ¶ The bankruptcy trustee has written to ask whether you regard the money received so far as a gift or as part of the estate. A form is enclosed. Mr. Hartwell has written separately, by hand, to apologize. |
| eventCatalogue.ts · the-harrowgate-pledge · choice `finish` | Honor the pledge from the endowment | Make up the missing half from the endowment |
| eventCatalogue.ts · the-harrowgate-pledge · choice `mothball` | Shelve the plans | Shelve the building plans |

### the-prospectus-case

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-prospectus-case · text | Thirty-one graduates of {program} have filed suit over a line in the viewbook that promised 'employment in the field within six months' and gave a percentage. The percentage came from a survey of nine people, four of whom were related to the staff member who conducted it. The line was withdrawn eight years ago, but not before it had been printed forty thousand times. ¶ Counsel's advice runs to twenty pages and concludes that the college would probably win, eventually, at a cost. The graduates' own letter is two pages long and does not mention money until the last paragraph. | Thirty-one graduates of {program} have filed suit over a line in the viewbook that promised 'employment in the field within six months' and gave a percentage. The percentage came from a survey of nine people, four of whom were related to the staff member who conducted it. The line was withdrawn eight years ago, but not before it had been printed forty thousand times. ¶ Counsel's advice runs to twenty pages and concludes that you would probably win, eventually, at a cost. The graduates' own letter is two pages long and does not mention money until the last paragraph. |
| eventCatalogue.ts · the-prospectus-case · choice `defend` | Defend it, and pay a year of costs | Fight the case, and pay a year of legal costs |
| eventCatalogue.ts · the-prospectus-case · choice `study` | Offer them further study without tuition | Offer them more study, tuition-free |

### the-kitchen-strike

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-kitchen-strike · text | The dining hall staff walked out at six on Monday morning, forty-two of them, after the third year running in which their pay was held and the faculty's was not. They are outside the service entrance with a brazier and a hand-lettered sign, and the students who stop to talk are given coffee from a thermos. Nobody inside has made a breakfast since. ¶ The students are eating from the vending machines and the town's two takeout places, and a petition in support of the staff has been signed by more of them than voted in the last student government election. The claim itself is modest, and the CFO has costed it twice to be sure. | The dining hall staff walked out at six on Monday morning, forty-two of them, after a third year in a row in which their pay was frozen and the faculty's was not. They are outside the service entrance with a brazier and a hand-lettered sign, and the students who stop to talk are given coffee from a thermos. Nobody inside has made a breakfast since. ¶ The students are eating from the vending machines and the town's two takeout places. More of them have signed a petition supporting the staff than voted in the last student government election. The claim itself is modest, and the CFO has costed it twice to be sure. |
| eventCatalogue.ts · the-kitchen-strike · choice `meet` | Meet the claim in full | Pay the claim in full |

### the-records

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-records · text | Someone has copied the student records database: names, addresses, transcripts and the financial aid files of every student since the founding. The college learned of it from a message to the Registrar's inbox with a sample attached and a sum in a currency nobody in the building had heard of. The IT office is four people and a contractor, and the contractor has explained that the server in question was on the list to be replaced. ¶ The alumni affected are all of them. None has been told yet, and how they are told will be remembered longer than the breach itself. | Someone has copied the student records database: names, addresses, transcripts and the financial aid files of every student since the founding. You learned of it from a message to the Registrar's inbox, with a sample attached and a demand in a currency nobody in the building had heard of. The IT office is four people and a contractor. The contractor has explained that the server in question was on the list to be replaced. ¶ The alumni affected are all of them. None has been told yet. How they are told will be remembered longer than the breach itself. |
| eventCatalogue.ts · the-records · choice `tell` | Tell everyone and pay for protection | Tell everyone and pay for identity protection |
| eventCatalogue.ts · the-records · choice `minimum` | Notify only those the law requires | Tell only those the law requires |
| eventCatalogue.ts · the-records · choice `pay` | Pay the demand | Pay the ransom |

### the-sinkhole

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-sinkhole · text | A hole thirty-six feet across opened overnight beside {building}, taking with it a bench, a length of path and a sundial that a founding benefactor gave and nobody could read. The geologists say the ground beneath the older half of the campus is limestone that has been dissolving quietly for some time, and that there are probably others. They have marked three more places with orange paint. ¶ The building is standing, and the engineers would like to drill before anyone calls it sound. The hole has been photographed from the cordon at all hours, which the Communications Office has decided to regard as engagement. | A hole thirty-six feet across opened overnight beside {building}, taking with it a bench, a length of path and a sundial that a founding benefactor gave and nobody could read. The geologists say the ground under the older half of campus is limestone, and it has been quietly dissolving for some time. There are probably other holes to come. They have marked three more places with orange paint. ¶ The building is standing, and the engineers would like to drill before anyone calls it sound. People have photographed the hole from the cordon at all hours, which the Communications Office has decided to count as engagement. |
| eventCatalogue.ts · the-sinkhole · choice `fill` | Fill this one | Fill this hole only |
| eventCatalogue.ts · the-sinkhole · choice `fence` | Fence it and defer the survey | Fence it off and put off the survey |

### the-name-on-the-prize

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-name-on-the-prize · text | The most famous graduate of the {class}, and of the college's publicity for a generation, has been convicted of a fraud large enough to have its own documentary in preparation. His name is on the annual prize for leadership, a seminar room and the back page of the alumni magazine, where he appears shaking hands with three successive presidents. The prize was last awarded a month ago. ¶ The people he defrauded include a pension fund and several hundred households. A number of alumni have written asking for his name to come down. A smaller number have written to say that {school} does not rewrite its history, and the largest donor among them has copied in the board. | The most famous graduate of the {class} has been convicted of a fraud large enough to have its own documentary in preparation. For a generation he was the face of the college's publicity. His name is on the annual prize for leadership, a seminar room and the back page of the alumni magazine, where he appears shaking hands with three successive presidents. The prize was last awarded a month ago. ¶ The people he defrauded include a pension fund and several hundred households. A number of alumni have written asking for his name to come down. A smaller number have written to say that {school} does not rewrite its history, and the largest donor among them has copied in the board. |

### the-merger-proposal

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-merger-proposal · text | {rival} has written proposing a merger. The letter is courteous and long, and its appendix lists the savings to be had from one registrar, one catalog and one set of athletic fields, most of which would be theirs. The name of the combined institution is left blank, in a way that suggests it has been discussed. ¶ The board received a copy directly, which is how the President learned the letter existed. Two trustees think it is the best offer the college will ever have. The rest would like to know why {rival} thinks the college needs one. | {rival} has written proposing a merger. The letter is courteous and long, and its appendix lists the savings to be had from one registrar, one catalog and one set of athletic fields, most of which would be theirs. The name of the combined institution is left blank, in a way that suggests it has been discussed. ¶ The board received a copy directly, which is how you learned the letter existed. Two trustees think it is the best offer the college will ever have. The rest would like to know why {rival} thinks the college needs one. |
| eventCatalogue.ts · the-merger-proposal · choice `share` | Agree to shared services | Agree to share services with them |

### contract-visiting-chair

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · contract-visiting-chair · choice `permanent` | Make the post permanent: appoint {candidate} to the faculty | Make the post permanent and hire {candidate} |

### contract-summer-sections

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · contract-summer-sections · choice `pay` | Pay the second sections properly | Pay properly for the second sections |
| eventCatalogue.ts · contract-summer-sections · choice `cap` | Cap the summer school | Cap summer school enrollment |

### counsellors-tour

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · counsellors-tour · text | Forty school counselors have asked to tour the campus in one afternoon, more than have visited in the college's whole history. The guides have been rehearsing, and one of them has written a song. | Forty school counselors have asked to tour the campus in one afternoon, more than have visited in your college's whole history. The guides have been rehearsing, and one of them has written a song. |

### guide-feature

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · guide-feature · text | A national guide wants to feature the college as the one the others are watching, and would like a photograph of the President looking out of a window. The Communications Office has chosen a window. | A national guide wants to feature your college as the one the others are watching. It would like a photograph of you looking out of a window. The Communications Office has chosen a window. |

### admissions-poached

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · admissions-poached · text | A larger college has offered the Director of Admissions twice the salary to do for them what was done here. The director has asked, kindly, whether the college would like to make a counter-offer. | A larger college has offered your Director of Admissions twice the salary to do for them what they did here. The director has asked, kindly, whether you would like to make a counter-offer. |
| eventCatalogue.ts · admissions-poached · choice `farewell` | Wish them well | Wish them well and let them go |

### prospectus-copied

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · prospectus-copied · text | A college three states away has copied the college's viewbook word for word, including the photograph of the founders and the typing error on page nine. Legal would like to send a letter; Admissions would like to send flowers. | A college three states away has copied your viewbook word for word, including the photograph of the founders and the typing error on page nine. Legal would like to send a letter. Admissions would like to send flowers. |
| eventCatalogue.ts · prospectus-copied · choice `lawyers` | Send the letter | Send the lawyers' letter |

### what-happened

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · what-happened · text | The regional paper has run a long piece about the college under the headline 'Whatever It Was Going to Be', illustrated with a photograph of the college in its first year. It is, everyone agrees, a good photograph. | The regional paper has run a long piece about your college under the headline 'Whatever It Was Going to Be', illustrated with a photograph of the college in its first year. It is, everyone agrees, a good photograph. |

### schools-stop-sending

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · schools-stop-sending · text | Three high schools that sent the college students every year have sent none this year. Their counselors, asked why, were polite and specific. | Three high schools that sent you students every year have sent none this year. Their counselors, asked why, were polite and specific. |

### two-stars

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · two-stars · text | A college review site gives the college two stars out of five, and the most-read review is about the showers. The review is accurate about the showers. | A college review site gives your college two stars out of five, and the most-read review is about the showers. The review is accurate about the showers. |

### talk-at-the-gate

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · talk-at-the-gate · text | The board has read the admissions figures, the regional paper and, at the chair's insistence, the comments under the paper. Where the college is spoken of at all, it is spoken of as a place that was going to be something. The board would like the sentence to end differently. ¶ It asks for a plan it can repeat in public. It would prefer one that costs something, because the kind that costs nothing has been tried. | The board has read the admissions figures, the regional paper and, at the chair's insistence, the comments under the paper. Where people talk about your college at all, they talk about a place that was going to be something. The board would like the sentence to end differently. ¶ It asks for a plan it can repeat in public. It would prefer one that costs something, because the kind that costs nothing has been tried. |
| eventCatalogue.ts · talk-at-the-gate · choice `message` | Spend on the message | Spend on publicity |

### second-generation

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · second-generation · choice `legacy` | Give this year's alumni children a preference | Give alumni children an edge this year |

### fifty-years

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · fifty-years · text | The board would like to begin planning the college's fiftieth anniversary, and has already formed a committee to consider forming a committee. The questions before it are the usual ones: a dinner or a festival, whether to invite the founders' families, and whether the history the college commissions should be the true one or the flattering one. ¶ The board leans, on the whole, toward the true one, but would like it well written. It asks the President for a direction and, if possible, a budget. | The board would like to begin planning your college's fiftieth anniversary, and has already formed a committee to consider forming a committee. The questions before it are the usual ones: a dinner or a festival, whether to invite the founders' families, and whether the history you commission should be the true one or the flattering one. ¶ The board leans, on the whole, toward the true one, but would like it well written. It asks you for a direction and, if possible, a budget. |

### heritage-listing

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · heritage-listing · text | The state historic preservation office proposes to designate Founders Hall a landmark, which would protect it from alteration, and from the college. Facilities has read what can no longer be changed and has asked for a chair. | The state historic preservation office proposes to designate Founders Hall a landmark, which would protect it from alteration, and from you. Facilities has read what can no longer be changed and has asked for a chair. |

### who-comes-next

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · who-comes-next · text | The board chair has asked, gently and in private, whether the President has given any thought to who comes next. The chair asks because the chair has, and has a list. | The board chair has asked, gently and in private, whether you have given any thought to who comes next. The chair asks because the chair has, and has a list. |

### the-history

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · the-history · choice `open` | Open everything | Open the whole archive |
| eventCatalogue.ts · the-history · choice `flattering` | Open the flattering years | Open only the flattering years |

### old-rival-proposal

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · old-rival-proposal · text | {rival}, the college's oldest rival, has written to propose a joint degree, a shared bus and, in a postscript, a merger at some point. The athletics department has asked that the postscript not be answered. | {rival}, your oldest rival, has written to propose a joint degree, a shared bus and, in a postscript, a merger at some point. The athletics department has asked that the postscript not be answered. |

### fund-for-fifty

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · fund-for-fifty · text | The investment committee notes that the endowment is now older than most of the committee. It asks whether the college means to spend it on the next fifty years or keep it for the fifty after, and would like the answer in writing. | The investment committee notes that the endowment is now older than most of the committee. It asks whether you mean to spend it on the next fifty years or keep it for the fifty after. It would like the answer in writing. |
| eventCatalogue.ts · fund-for-fifty · choice `dividend` | Draw a one-off dividend | Take a one-off payout from it |

### town-bar

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · town-bar · text | The Bell, the oldest bar on Main Street, proposes a partnership: a student night every Thursday, the college's crest over the door and a fee for the privilege. The owner has already had the crest painted, slightly wrong, and is prepared to discuss the lion. | The Bell, the oldest bar on Main Street, proposes a partnership: a student night every Thursday, your crest over the door and a fee for the privilege. The owner has already had the crest painted, slightly wrong, and is prepared to discuss the lion. |
| eventCatalogue.ts · town-bar · choice `terms` | Accept on the college's terms: no drinks promotions | Accept on your terms, with no drinks promotions |

### town-street-festival

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · town-street-festival · text | The town's summer street festival has outgrown Main Street, and the organizers would like to borrow the college's main quad for one Saturday. They promise to put it back exactly as they found it, and have attached a plan of the stalls drawn on the back of a menu. | The town's summer street festival has outgrown Main Street, and the organizers would like to borrow your main quad for one Saturday. They promise to put it back exactly as they found it, and have attached a plan of the stalls drawn on the back of a menu. |

### town-rents

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · town-rents · text | The landlords downtown have raised the rents on student apartments for the third year running, citing demand, which the college created, and the downtown, which the college also created. The student newspaper has run the figures on its front page under a headline the Dean of Students has asked not to be quoted. | The landlords downtown have raised the rents on student apartments for the third year running, citing demand, which you created, and the downtown, which you also created. The student newspaper has run the figures on its front page under a headline the Dean of Students has asked not to be quoted. |
| eventCatalogue.ts · town-rents · choice `grant` | A housing grant for students in need | Fund a housing grant for students in need |

### town-night-buses

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · town-night-buses · text | The town council proposes late-night buses between Main Street and the residence halls, and suggests the college pay half. The council's own half is to come from a parking fee that the council has not yet voted on and the merchants have already opposed. | The town council proposes late-night buses between Main Street and the residence halls, and suggests you pay half. The council's own half is to come from a parking fee. The council hasn't voted on it yet, and the merchants already oppose it. |
| eventCatalogue.ts · town-night-buses · choice `share` | Pay the college's half | Pay your half |
| eventCatalogue.ts · town-night-buses · choice `decline` | Decline: the walk does them good | Decline, since the walk does them good |

### town-colors

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · town-colors · title | The college's colors downtown | Your colors downtown |
| eventCatalogue.ts · town-colors · text | The Downtown Merchants' Association would like to put the college's colors in every shop window for the first week of term, and asks whether the college would pay for the banners. The hardware store has offered to hang them, and has been asked not to. | The Downtown Merchants' Association would like to put your colors in every shop window for the first week of term. It asks whether you would pay for the banners. The hardware store has offered to hang them, and has been asked not to. |

### university-charter

| Where (file · context) | Before | After |
|---|---|---|
| eventCatalogue.ts · university-charter · text | With its first laboratory open, the board has voted the college a university charter. {name} College may now call itself {name} University, as many American colleges did when they took up research and graduate work. Others kept the name they opened under and were none the worse for it. ¶ The board would have the new name carved over Founders Hall, unless the President prefers the old one, and if the President would rather the college had another name altogether, this is the one time to say so: the stone is cut once. The stonemason has been asked to wait a month. | With its first laboratory open, the board has voted the college a university charter. {name} College may now call itself {name} University, as many American colleges did when they took up research and graduate work. Others kept the name they opened under and were none the worse for it. ¶ The board would have the new name carved over Founders Hall, unless the President prefers the old one. If the President would rather the college had another name altogether, this is the one time to say so. The stone is cut once. The stonemason has been asked to wait a month. |
