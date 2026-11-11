// One authored sentence per undergraduate course, keyed by course id and
// read by techData.ts's initialTech(). test/course-descriptions.test.ts
// requires a row for every undergraduate course, and GRADUATE_COURSE_
// DESCRIPTIONS (below) one for every graduate course.
//
// Rules: one present-tense sentence, no course code, no "this course", and
// it must say something the title does not. American spelling ("analyzes",
// "-ize"), and "from X to Y" sparingly: the test holds a program to three.
// A sentence reads right for the course's place in its sequence (Plan 76G).
// Plan 95M set the catalog's shape: each major ends in a 310 capstone, and
// some courses moved number (docs/reviews/2026-10-review-ii-fixes/
// catalog-shape.md).
//
// Grouped by school, then major in seed order, then course number.

export const COURSE_DESCRIPTIONS: Record<string, string> = {
  // === Business ===

  // --- Finance ---
  FINA101: 'Prices a bond, a loan, and a retirement plan with the time value of money, then asks why risk raises what investors demand.',
  FINA110: 'Decides which projects a firm should fund and how to pay for them. The cost of capital is the bar every project has to clear.',
  FINA120: 'Assembles a portfolio of stocks and bonds on the trade-off between risk and return, and tests whether the market priced any of it correctly.',
  FINA130: 'Values property and the mortgages written against it, starting with a single rental and ending with a securitized pool of loans.',
  FINA140: 'Hedges a firm that earns in one currency and owes in another, and learns how capital is raised and moved across borders.',
  FINA210: 'Builds three-statement, discounted cash flow, and scenario models in spreadsheets, with the sensitivity tests that show where a valuation breaks.',
  FINA220: 'Takes apart payments apps, lending platforms, and distributed ledgers to see which of them changes finance and which only re-plumbs it.',
  FINA230: 'Measures market, credit, and operational risk with value-at-risk and stress tests. What to hedge with derivatives and what to insure is the judgment call.',
  FINA240: 'Works out how loss aversion and herding push prices away from what rational models predict, and why arbitrage so often fails to push them back.',
  FINA310: 'Takes one live deal to an investment committee\'s vote, defending the valuation, the financing, and the risks before a panel of practitioners.',

  // --- Accounting ---
  ACCT101: 'Records a small firm\'s first year in journal entries and closes it into a balance sheet and an income statement.',
  ACCT110: 'Prepares and reads the balance sheet, income statement, and cash-flow statement under the standards that govern external reporting.',
  ACCT120: 'Turns cost data into budgets, break-even points, variance reports, and prices for the people who run the business.',
  ACCT130: 'Computes the tax owed by a household and by a small business, then reruns their decisions to see what the code rewards.',
  ACCT140: 'Tracks a transaction through enterprise software, past each control built into its path, to the places where the controls fail.',
  ACCT210: 'Follows money through fraud schemes, asset tracing, and litigation support, using the accounting record as evidence.',
  ACCT220: 'Handles the hard cases in external reporting: revenue recognition, leases, pensions, and income taxes. Consolidations are saved for last.',
  ACCT230: 'Every costing system distorts something. Activity-based costing and transfer prices are studied for what they do to the performance measures built on them.',
  ACCT240: 'Gathers evidence and tests internal controls as an auditor would, to decide whether a company\'s financial statements can be relied on.',
  ACCT310: 'Works a full engagement for a mid-sized company: closing its books, preparing its tax return, and testing its statements. Every judgment call gets written up.',

  // --- Marketing ---
  MRKT101: 'Takes a brand apart into product, price, place, and promotion, one case at a time.',
  MRKT110: 'Draws on psychology and economics to explain how people notice, evaluate, and choose products. Quite often, habit and context have chosen for them.',
  MRKT120: 'Asks customers what they want by survey and focus group, then runs the experiment that shows what they do.',
  MRKT130: 'Plans search, social, email, and paid campaigns around the funnel. Each is measured by what it sold, not by how many people scrolled past it.',
  MRKT140: 'Builds and defends a brand as an asset: positioning, identity, extensions, and the valuation of what the name alone is worth.',
  MRKT210: 'Markets teams and leagues through sponsorship and media rights, a business whose product changes with every game.',
  MRKT220: 'Writes the creative brief and the media plan for a campaign, and judges it against the behavior it set out to change.',
  MRKT230: 'Draws territories and sets quotas and commissions for a sales force. The rest is forecasting the pipeline and coaching the team to close more of it.',
  MRKT240: 'Carries one product across cultures, currencies, and regulators. The standing question is what to standardize and what to localize.',
  MRKT310: 'Plans a year of marketing for an outside client, from the research to the budget. The client\'s managers attend the final presentation and bring their own questions.',

  // --- Economics ---
  ECON101: 'Works out what households and firms choose when they cannot have everything, with supply and demand first and market structure after.',
  ECON110: 'Models output, unemployment, inflation, and growth for a whole economy. What a central bank or a budget can do about any of them is the open question.',
  ECON120: 'Fits regression lines to economic data and tests whether a correlation, however strong, can be read as a cause.',
  ECON130: 'Reworks consumer choice, the firm, and market failure with the calculus the principles course left out. What that course could only assert, this one derives.',
  ECON140: 'Reads the Industrial Revolution, the Great Depression, and the postwar boom as tests of economic theory rather than as a chronicle.',
  ECON210: 'Replaces the rational agent with the one experiments find, and works out what bounded rationality and present bias do to markets and policy.',
  ECON220: 'Asks who bears a tax, what a public good is worth, and when redistribution costs efficiency. The answers decide what to make of public spending and debt.',
  ECON230: 'Finds the Nash equilibrium of an auction or an arms race, where the best move depends on what everyone else is about to do.',
  ECON240: 'Prices pollution, climate damage, and natural resources, then ranks taxes, tradable permits, and regulation by cost per ton of emissions cut.',
  ECON310: 'Writes an empirical paper on a question of the student\'s own, and defends the data and the identification before a seminar that has read it.',

  // --- Management ---
  MGMT101: 'Learns what a first-time manager can do when a team forms, stalls, or recovers. The term\'s team projects supply fresh examples of all three.',
  MGMT110: 'Treats pay and performance review as the levers that decide who stays at a firm, with recruiting and employment law on either side.',
  MGMT120: 'Finds the bottleneck. However its capacity and schedule are planned, the slowest step sets what a process can make and deliver.',
  MGMT130: 'Tests corporate decisions against moral frameworks, stakeholder claims, and the cases where the law permitted what the public would not.',
  MGMT140: 'Applies research on motivation, perception, and group decisions to why people at work cooperate, quit, or go along with a bad call.',
  MGMT210: 'Plans scope, schedule, budget, and risk with work breakdowns and critical paths. Then the project starts, and the plans meet reality.',
  MGMT220: 'Takes one idea from the first customer interview to a funded launch, and learns how ventures fail at each stage in between.',
  MGMT230: 'Diagnoses a workplace dispute before trying to settle it. Mediation and interest-based bargaining fix different problems, and the wrong one makes things worse.',
  MGMT240: 'Negotiates in live simulations every week, starting with a haggle over price and ending with multi-party deals where interests are hidden.',
  MGMT310: 'Brings finance, marketing, and operations together in full company cases, starting with the five forces. A strategy passes only if it holds once rivals respond.',

  // --- Supply Chain & Operations ---
  SPCO101: 'Traces how goods move from raw material to customer, and where supply chains break down.',
  SPCO110: 'Plans where to keep goods and how to ship them, trading inventory against speed and cost.',
  SPCO120: 'Chooses suppliers and negotiates their contracts, on the understanding that the lowest price is rarely the lowest cost.',
  SPCO130: 'Applies statistical process control, Six Sigma, and root-cause analysis to keep defects out of a product before inspection finds them.',
  SPCO140: 'Forecasts what customers will order from past sales, promotions, and market signals. Every forecast is wrong, so the craft is in being wrong by less and telling operations early.',
  SPCO210: 'Stretches a supply chain across borders, where tariffs and currency move the cost and a closed port can stop everything.',
  SPCO220: 'Decides when to reorder and how much safety stock to hold, for demand that is uncertain and lead times that slip.',
  SPCO230: 'Fits optimization, simulation, and forecasting models to routing, scheduling, and stock decisions, using a company\'s own operating data.',
  SPCO240: 'Moves freight by road, rail, sea, and air: choosing carriers, routing fleets, and writing contracts as regulation and fuel prices shift.',
  SPCO310: 'Redesigns a partner company\'s supply chain as a team, modeling its network, inventory, and costs. Its managers get the savings estimate and ask the first hard questions.',

  // === Engineering ===

  // --- Mechanical Engineering ---
  MECH101: 'Sketches freehand, models in CAD, and reads an engineering drawing. Each team then builds a prototype that has to meet a written specification.',
  MECH110: 'Analyzes forces and moments on trusses, frames, and machines at rest, then on particles and rigid bodies under acceleration.',
  MECH120: 'Runs engines and refrigerators through the first and second laws with a book of property tables, and accepts the efficiency the second law allows.',
  MECH130: 'Follows a fluid through pipes and around bodies, from Bernoulli and the Navier-Stokes equations to boundary layers and drag.',
  MECH140: 'Relates the structure of metals, polymers, ceramics, and composites to their strength, failure, and processing.',
  MECH210: 'Makes a robot arm and a mobile robot go where they are told, using kinematics to plan the motion and sensors to report how far off it is.',
  MECH220: 'Sizes the equipment that heats and cools a building from load calculations and psychrometric charts, and checks the result against the energy code.',
  MECH230: 'Studies how spark- and compression-ignition engines burn fuel and what comes out the tailpipe. The lab has a running engine on a dynamometer, waiting to be tuned.',
  MECH240: 'Solves stress, thermal, and vibration problems numerically. A converged result can still be wrong, and telling when is most of the skill.',
  MECH310: 'Designs, builds, and tests a working machine for an outside sponsor in a year-long team project, to a budget and a written specification.',

  // --- Electrical Engineering ---
  ELEC101: 'Solves resistive, RC, and RL circuits with Kirchhoff\'s laws, nodal analysis, and Thévenin equivalents. Each answer gets checked on a breadboard.',
  ELEC110: 'Designs combinational and sequential circuits from gates and flip-flops, and builds them on programmable hardware.',
  ELEC120: 'Moves signals into the frequency domain with Fourier, Laplace, and z-transforms, where the linear systems that filter them become easy to read.',
  ELEC130: 'Develops Maxwell\'s equations for static fields and then for waves, until antennas and transmission lines stop being mysterious.',
  ELEC140: 'Analyzes and designs diode and transistor circuits with small-signal models, and biases amplifiers to tolerate temperature drift and part-to-part variation.',
  ELEC210: 'Models generation, transmission, and load flow in the electrical grid, with fault analysis and the stability of the network.',
  ELEC220: 'Sends bits over a fading channel with modulation and coding, and works out the link budget that decides whether a call connects.',
  ELEC230: 'Designs feedback controllers with root locus, frequency response, and state space. Tuning happens on lab hardware, which has not read the model.',
  ELEC240: 'Lays out digital circuits in CMOS one transistor at a time, and closes timing and power before the design goes out to be fabricated.',
  ELEC310: 'Takes a team\'s circuit board or embedded system through specification, prototype, and test. On the last day it has to work in front of a review panel.',

  // --- Chemical Engineering ---
  CHEN101: 'Follows a barrel of crude and a vat of corn mash through a plant, and names the unit operation each step takes.',
  CHEN110: 'Starts with energy balances on flowing streams, then applies phase and chemical equilibrium to the separations and reactions a plant depends on.',
  CHEN120: 'Calculates friction losses, pump heads, and pressure drops for process piping, with the Reynolds number deciding which correlation applies.',
  CHEN130: 'Closes mass and energy balances on a whole flowsheet with recycle and purge streams. It is bookkeeping, and every plant design is checked against it.',
  CHEN140: 'Sizes batch, stirred, and tubular reactors from kinetics and residence time, with heat effects and catalysis.',
  CHEN210: 'Goes back over the case histories of plant accidents to learn the HAZOP study and the relief system, the tools that let a design fail safely.',
  CHEN220: 'Engineers fermentation, enzyme reactors, and downstream purification to make pharmaceuticals and fuels from living cells.',
  CHEN230: 'Explains why plastics flow like liquids and spring back like solids, starting from how the chains are made and how long they grow.',
  CHEN240: 'Evaluates biofuels, hydrogen, carbon capture, and electrochemical storage on efficiency, cost, and life-cycle emissions.',
  CHEN310: 'Designs and costs a complete plant as a team, sizing every unit operation and closing the economics that decide whether it would be built.',

  // --- Civil Engineering ---
  CIVE101: 'Draws the free-body diagram first. Forces in equilibrium and the path a load takes to the ground follow from it.',
  CIVE110: 'Finds the force in every member of a determinate truss or frame by statics alone, then rolls a moving load across it with influence lines.',
  CIVE120: 'Classifies soil and tests its seepage and shear strength, since the ground decides what a foundation can carry and how far it will settle.',
  CIVE130: 'Relates loads to stress, strain, and deflection in bars, shafts, and beams, up to buckling and combined loading.',
  CIVE140: 'Plans roads and transit lines around traffic flow and capacity analysis, by the geometric standards that keep a curve drivable.',
  CIVE210: 'Carries one bridge through the whole term: loads, girders, bearings, and substructure. It ends with the code checks every span has to pass.',
  CIVE220: 'Prepares the environmental statement regulators require before a project is built, on what it would do to air and water and to the people nearby.',
  CIVE230: 'Plans a construction project through its estimate, schedule, contracts, and safety program, on a site that has weather and subcontractors.',
  CIVE240: 'Drafts a comprehensive plan for how a town zones its land and houses its people. The plan then has to survive a public hearing.',
  CIVE310: 'Acts as a consulting team on an actual site, designing its structures, drainage, and roads to code. The drawings and cost estimate go to a client to sign.',

  // --- Industrial Engineering ---
  INDE101: 'Maps a process, times its jobs with a stopwatch, and puts a dollar figure on each proposed improvement.',
  INDE110: 'Schedules materials, machines, and people to meet demand, with MRP, capacity planning, and the trade-off between inventory and lead time.',
  INDE120: 'Fits the workstation, the tool, and the task to the human body, since the reverse does not work. Hazard analysis covers what is left.',
  INDE130: 'Watches a process on control charts to catch drift before it becomes defects, and samples what the charts cannot see.',
  INDE140: 'Lays out plants and warehouses for material flow, with location analysis and the space each operation needs.',
  INDE210: 'Builds discrete-event models of factories, hospitals, and queues, for running the experiments nobody could afford to run on the originals.',
  INDE220: 'Optimizes a working supply chain with mathematical programming, deciding where to source and how much to stock.',
  INDE230: 'Strips the waste out of a production line with value-stream maps and pull systems, then does it again, because the improvement is meant to be continuous.',
  INDE240: 'Models failure with life distributions and fault trees, and designs maintenance and redundancy for systems that must not stop.',
  INDE310: 'Spends the term inside a partner plant or hospital, modeling how its work flows. The proposal has to say what each change costs and what waiting it removes.',

  // --- Aerospace Engineering ---
  AERO101: 'Learns what keeps an aircraft up and a satellite in orbit, starting with the standard atmosphere and the airfoil.',
  AERO110: 'Predicts lift and drag on airfoils and wings with potential-flow theory and compressibility corrections, and tests the predictions in a wind tunnel.',
  AERO120: 'Computes range, endurance, climb, and takeoff and landing distances from an aircraft\'s thrust, drag, and weight.',
  AERO130: 'Lives by the rocket equation. It sets how much propellant any mission must carry, whether the engine is a chemical rocket or an electric thruster.',
  AERO140: 'Analyzes thin-walled beams, stressed skins, and composites under flight loads, with fatigue and the margins certification demands.',
  AERO210: 'Solves two-body orbits, transfers, and rendezvous. The final problem is a trajectory to another planet, with gravity assists doing some of the work.',
  AERO220: 'Flies a sounding rocket the team designed and built. Afterward the team answers for its motor choice, its stability margin, and where the rocket came down.',
  AERO230: 'Turns a mission requirement into an aircraft on paper, one trade study at a time, until it can face a preliminary design review.',
  AERO240: 'Builds a drone from airframe, autopilot, and sensors. It flies only where and as high as the FAA allows.',
  AERO310: 'Designs an aircraft or a spacecraft mission as a team and defends it at a design review. The weight budget is usually the last to close.',

  // === Arts & Media ===

  // --- Media Studies ---
  MDIA101: 'Counts what newspapers, broadcasters, and platforms each reach. What they do to opinion is a harder question, and the research on it is read with care.',
  MDIA110: 'Reads the major theories of media effects and meaning, from propaganda models to audience reception, against what the evidence supports.',
  MDIA120: 'Compares countries by who owns the press and who pays for the broadcasters. Each arrangement produces recognizably different news.',
  MDIA130: 'Asks what platforms and their algorithms have done to identity and to the public sphere, now that the audience also publishes.',
  MDIA140: 'Works through privacy, deception, harm, and conflict of interest in journalism and entertainment, case by case.',
  MDIA210: 'Tracks a film from development finance through distribution windows and marketing, and learns how streaming rewrote the economics.',
  MDIA220: 'Measures reach, sentiment, and network spread across platforms. The work is separating an audience from bots and vanity metrics.',
  MDIA230: 'Shoots, edits, and captions news photographs under deadline, with the ethics of staging, cropping, and consent.',
  MDIA240: 'Looks after an organization\'s reputation with the press on good days and in a crisis, and measures afterward what the coverage did.',
  MDIA310: 'Researches one medium, company, or audience through archives, interviews, or data. The thesis that results is defended before the seminar.',

  // --- Graphic Design ---
  GRDS101: 'Composes shape, color, and type on posters and signs. The test is whether a viewer sees first what the designer meant them to.',
  GRDS110: 'Sets type from a single word mark to a page of running text, with close attention to letterform and spacing. Nobody kerns casually afterward.',
  GRDS120: 'Edits and composes raster and vector images for print and screen, with color management and resolution handled correctly.',
  GRDS130: 'Arranges type and image on the page and the screen using grids, hierarchy, and white space, for editorial and advertising work.',
  GRDS140: 'Turns a logo into an identity system with written guidelines, and tests it on everything a client will put it on.',
  GRDS210: 'Lays out responsive interfaces in HTML and CSS that stay navigable and accessible, and tests them on phones slower than the designer\'s.',
  GRDS220: 'Animates type and graphics for title sequences, explainers, and broadcast, using timing and easing to carry meaning.',
  GRDS230: 'Develops a personal visual language through editorial, book, and concept illustration in traditional and digital media.',
  GRDS240: 'Designs a complete magazine or book, from pacing and typographic system through the cover to press-ready files.',
  GRDS310: 'Refines a professional portfolio around a self-directed identity project, reviewed by practicing designers at a public show.',

  // --- Creative Writing ---
  CRWR101: 'Writes a poem and a short story a week, read aloud and critiqued, to learn what revision is for.',
  CRWR110: 'Drafts and revises short stories under group critique, where the author listens and may not explain what was meant.',
  CRWR120: 'Composes poems in received and open forms, revising for image, line, and sound under weekly critique.',
  CRWR130: 'Tells true stories as memoir, essay, and reportage. Fiction owes nothing to the facts or to the people in it, and this does.',
  CRWR140: 'Edits other writers\' manuscripts at the line and the structural level, and produces a small literary magazine from submission to print.',
  CRWR210: 'Writes a feature-length screenplay in industry format, from logline and outline through three-act structure and dialogue.',
  CRWR220: 'Develops a one-act play in which everything must be said or done onstage, and hears each draft read aloud by actors.',
  CRWR230: 'Plans and drafts the opening of a novel, sustaining character and plot across a length the short story never asks for.',
  CRWR240: 'Completes a polished manuscript in the writer\'s chosen genre, alongside the craft reading and the query letter to send with it.',
  CRWR310: 'Gathers a year\'s poems into a chapbook or its stories into a collection under one faculty reader, and reads from it in public at the end.',

  // --- Music ---
  MUSC101: 'Notates scales and chords by hand until the harmony they make can be heard before it is played.',
  MUSC110: 'Extends harmony into chromaticism, modulation, and form, analyzing sonatas and songs from the score.',
  MUSC120: 'Hears Western art music in order, from chant to Stravinsky, with the scores open. The listening exam can start anywhere in any piece.',
  MUSC130: 'Writes short pieces for solo instruments and small ensembles, and hears them performed and critiqued.',
  MUSC140: 'Takes weekly private lessons on an instrument or in voice, building technique and repertoire toward a performance before a faculty jury.',
  MUSC210: 'Improvises over standards and blues forms, learning chord-scale relationships, voicings, and the vocabulary of the tradition by ear.',
  MUSC220: 'Learns the music of West Africa, India, Indonesia, and the Andes by playing it as well as listening.',
  MUSC230: 'Records, mixes, and produces music in a digital audio workstation, with synthesis, sampling, and live electronics.',
  MUSC240: 'Composes an extended work for larger forces, orchestrated and rehearsed toward a public premiere.',
  MUSC310: 'Prepares and performs a public recital or a portfolio of premiered compositions, with program notes written by the performer.',

  // --- Film ---
  FILM101: 'Watches films one shot at a time to see how framing and cutting tell the story.',
  FILM110: 'Runs the camera on set: lighting, lenses, exposure, and movement. Each choice changes what an audience feels.',
  FILM120: 'Takes short scripts to a table read, where dialogue that looked fine on the page is heard for the first time.',
  FILM130: 'Plans and shoots a short film as a crew, rotating through every job on set so that nobody only directs.',
  FILM140: 'Directs actors and blocks scenes from a script the student has broken into shot lists, with each decision tested on set.',
  FILM210: 'Researches, shoots, and edits a nonfiction film, negotiating access, consent, and the line between observing and staging.',
  FILM220: 'Screens the movements that made national cinemas: Soviet montage, Italian neorealism, the French New Wave, and Brazil\'s Cinema Novo.',
  FILM230: 'Records dialogue and builds effects and ambience into a soundtrack that does half the storytelling.',
  FILM240: 'Edits, color-grades, and finishes a film to delivery. The file named final is followed by several more.',
  FILM310: 'Directs a short film from the student\'s own script, with classmates as the crew and the department\'s festival as the first audience.',

  // --- Studio Art ---
  SART101: 'Arranges line and shape in cut paper and ink until figure and ground balance. The results go up on the wall for critique each week.',
  SART110: 'Draws from still life and the figure in charcoal and ink, until the hand records what the eye sees and not what the mind expects.',
  SART120: 'Paints in oil and acrylic, first in quick studies of color and surface and then on canvases that take weeks.',
  SART130: 'Builds in clay, plaster, wood, and found material. A work that occupies a room has to hold up from every side, including the back.',
  SART140: 'Goes through painting, sculpture, and architecture period by period. The slide exam fades, but the formal analysis is what a studio critique borrows.',
  SART210: 'Cuts blocks, etches plates, and pulls screens. In an edition, every sheet has to match the first.',
  SART220: 'Throws and hand-builds vessels and sculptural forms, then opens the kiln to find out what the glaze chemistry decided.',
  SART230: 'Shoots, develops, and prints in the darkroom and the digital lab, with the history of the medium alongside the technique.',
  SART240: 'Codes generative images and builds 3D models and interactive video, for work that hangs on a screen rather than on paper.',
  SART310: 'Makes a coherent body of work over the year, hangs it in the college gallery for public critique, and writes the artist\'s statement last, under protest.',

  // === Social Sciences & Humanities ===

  // --- English ---
  ENGL101: 'Reads slowly. Every argument about a poem or a play has to be built from the words on the page.',
  ENGL110: 'Starts at Beowulf and ends at Woolf, with Chaucer, Milton, and the Romantics between, as English itself changes underfoot.',
  ENGL120: 'Asks what makes a literature American rather than English, through Bradstreet, Douglass, Dickinson, Twain, Faulkner, and Morrison.',
  ENGL130: 'Puts one text through formalist, Marxist, psychoanalytic, feminist, and postcolonial readings. It comes out different each time.',
  ENGL140: 'Practices argument and research writing for an academic audience, with sustained revision and attention to style.',
  ENGL210: 'Reads a dozen of the plays across comedy, history, and tragedy, as scripts meant for a stage and as texts whose versions disagree.',
  ENGL220: 'Keeps company with Swift and Pope through a century of coffeehouses and satire, and is there when the novel arrives.',
  ENGL230: 'Empire left its language behind. The writers of Africa, South Asia, and the Caribbean have answered in it, with a body of theory close behind them.',
  ENGL240: 'Writes instructions and proposals in plain language, then watches a test reader try to follow them. The reader is never wrong.',
  ENGL310: 'Drafts a twenty-five-page critical essay on an author or a problem of the student\'s choosing, and defends it among peers.',

  // --- Sociology ---
  SOCY101: 'Finds class, family, school, and work behind choices people believe are their own, using the surveys that measure it.',
  SOCY110: 'Analyzes class, status, and power: how inequality is measured, reproduced across generations, and justified.',
  SOCY120: 'Sets Marx against Weber and both against Durkheim, asking what each framework explains that the others cannot.',
  SOCY130: 'Summarizes survey data in tables and regressions, and tests whether a gap between groups is larger than chance would leave.',
  SOCY140: 'Interviews and observes people up close, under the ethics that requires. Coding the field notes takes longer than the fieldwork did.',
  SOCY210: 'Tests theories of strain, control, and labeling against crime statistics and what the courts do with them.',
  SOCY220: 'Marriage, parenting, and kinship vary by class and culture. None of them looks as it did a century ago.',
  SOCY230: 'Traces how racial and ethnic categories are drawn and contested, and follows their effects into housing, schooling, and the courts.',
  SOCY240: 'Treats gender as something societies build and then enforce at work and at home. Sexuality complicates the picture.',
  SOCY310: 'Poses a question about social life and answers it with data the student gathers or finds. The paper is written to a journal\'s standards and reviewed the way a journal would.',

  // --- Anthropology ---
  ANTH101: 'Meets the four fields in turn: cultural, biological, linguistic, and archaeological. Each arrives with the one case it explains best.',
  ANTH110: 'Kinship, ritual, and exchange look different in every society. Ethnography is how anyone knows, and what fieldwork cannot see is studied too.',
  ANTH120: 'Reconstructs human evolution from fossil casts and living primates. Genetics fills in what bones cannot, including how modern humans came to vary.',
  ANTH130: 'Surveys a site, digs it by layer, and dates what comes up. The harder step is turning broken things into claims about the past.',
  ANTH140: 'Listens to dialect and politeness for what they say about a culture, and counts what is lost when a language dies.',
  ANTH210: 'Carries out a small ethnographic project, from gaining access to writing up, with the ethics at every step.',
  ANTH220: 'Compares how cultures understand illness and healing, and what that means when medicine is delivered across the difference.',
  ANTH230: 'Studies myth, ritual, and magic. The standing argument is whether to explain them as Durkheim did or interpret them as Geertz did.',
  ANTH240: 'Reads Boas, Malinowski, Evans-Pritchard, and Lévi-Strauss in turn. Each changed what an ethnographer goes into the field to find.',
  ANTH310: 'Turns a season of fieldwork, a museum collection, or a skeletal sample into an argued paper, presented to the department.',

  // --- Political Science ---
  POLS101: 'Asks who gets what, when, and how. States, parties, and elections are the usual answers.',
  POLS110: 'Lines countries up by regime and party system to explain why some democracies last and some dictatorships do too.',
  POLS120: 'Explains one war three ways, as a realist, a liberal, and a constructivist would, then does the same for trade and alliances.',
  POLS130: 'Takes the Constitution as a design for separated powers and federalism, and watches parties and interest groups work the machinery.',
  POLS140: 'Designs a study of one political question and learns to read the regression tables the field publishes.',
  POLS210: 'Reads the landmark cases on judicial review, federal power, and civil liberties. Doctrine, it turns out, changes when the Court does.',
  POLS220: 'Defines a policy problem, weighs alternatives with cost-benefit analysis and evidence, and explains why the best option often loses.',
  POLS230: 'Argues with Rawls, Nozick, and their critics over what a just distribution and a legitimate state would be.',
  POLS240: 'Asks what deters a war or a terrorist or a cyberattack, and whether the intelligence and defense institutions built for one can meet the others.',
  POLS310: 'Tests one argument about politics against cases or data the student assembles, in a paper defended before the seminar.',

  // --- History ---
  HIST101: 'Compares how farming and empire arose in Afro-Eurasia and in the Americas, up to the contact that bound them into one world.',
  HIST110: 'Builds an argument from primary sources, and reads how Marxist, Annales, and cultural historians have told the same past differently.',
  HIST120: 'Follows the Revolution, the Civil War and Reconstruction, the New Deal, and civil rights as one long argument over who counts as a citizen.',
  HIST130: 'Watches the Reformation and the French Revolution build Europe\'s nation-states, whose rivalries lead the syllabus to 1914 and then to 1939.',
  HIST140: 'Studies Mesopotamia, Egypt, Greece, and Rome through the texts and the ruins each left behind.',
  HIST210: 'Works through the two world wars from their causes to their peace settlements, at the front and at home.',
  HIST220: 'Sees the Opium Wars, the Meiji reforms, colonial rule, and revolution as China, Japan, and Korea recorded them, in their own sources in translation.',
  HIST230: 'Reads village feuds, witch trials, and carnival as an anthropologist would, working from court and parish records instead of fieldwork.',
  HIST240: 'Traces how scientific ideas and machines have won acceptance since the Scientific Revolution, seldom as quickly as the textbooks suggest.',
  HIST310: 'Writes a thesis from primary sources in an archive and defends it before two faculty readers. Every footnote has to be one a referee could check.',

  // --- Philosophy ---
  PHIL101: 'Puts arguments into standard form, tests their validity, and names the fallacies that make bad ones persuasive.',
  PHIL110: 'Tries utilitarian, deontological, and virtue theories of right action on hard moral cases, where each one eventually says something its defenders regret.',
  PHIL120: 'Asks whether numbers and possible worlds exist the way tables do, and what makes something the same thing over time or an action free.',
  PHIL130: 'Works out what it takes to know something and not merely believe it, against a skeptic who doubts that anyone does.',
  PHIL140: 'Begins where philosophy did, with the Presocratics, Plato, and Aristotle on nature, knowledge, the soul, and the good life.',
  PHIL210: 'No guarantee of meaning is on offer. Kierkegaard, Nietzsche, Heidegger, Sartre, and de Beauvoir are read on freedom, anxiety, and authenticity in its absence.',
  PHIL220: 'Asks how a brain gives rise to experience and how thoughts come to be about anything, then asks both of a machine.',
  PHIL230: 'Reads Descartes, Spinoza, Locke, Hume, and Kant on what the mind can know of the world. Reason and experience each claimed to have settled it.',
  PHIL240: 'Develops propositional and first-order logic with proofs and models, up to the completeness theorem and Gödel\'s limits on what such systems can prove.',
  PHIL310: 'Writes and revises one long paper defending a single thesis against the strongest objections the seminar can raise, and the seminar enjoys raising them.',

  // === Science ===

  // --- Mathematics ---
  MATH101: 'Applies limits, derivatives, and integrals to related rates, optimization, and area. The fundamental theorem shows the two halves were one subject all along.',
  MATH110: 'Handles vector spaces, matrices, eigenvalues, and linear maps, geometry first, then the applications other departments send their students for.',
  MATH120: 'Develops random variables and their distributions as far as the central limit theorem, and puts them to work in estimation and hypothesis testing.',
  MATH130: 'Proves things about logic, sets, graphs, and counting, usually by induction. It is the mathematics underneath computing.',
  MATH140: 'Solves ordinary differential equations on paper where that is possible and numerically where it is not, modeling oscillators and populations.',
  MATH210: 'Builds the real numbers, limits, continuity, and the integral from the axioms up. Every theorem calculus took on trust now has to be proved.',
  MATH220: 'Studies the algebra of symmetry in groups and then rings and fields, far enough to show why no formula in radicals solves every quintic.',
  MATH230: 'Defines continuity by open sets alone, with no distances anywhere. By the end the fundamental group can tell a sphere from a torus.',
  MATH240: 'Analyzes algorithms for root finding, integration, linear systems, and differential equations, with the error and stability of each.',
  MATH310: 'Masters a recent paper or a classic proof and presents it to the seminar. The written exposition has to be one another student could follow.',

  // --- Biology ---
  BIOL101: 'Starts with cells and genes and ends with evolution and ecosystems, with a weekly lab of microscopes, pipettes, and fruit flies.',
  BIOL110: 'Tours the cell from its membrane inward, pairing each organelle and signal with the experiment that first revealed it.',
  BIOL120: 'Follows inheritance from Mendel\'s peas to the sequenced genome, and learns the molecular tools that made the second possible.',
  BIOL130: 'Studies populations, communities, and ecosystems, with field work on how organisms interact with each other and their environment.',
  BIOL140: 'Tests natural selection, genetic drift, and speciation against the fossil record and against the family trees read from DNA.',
  BIOL210: 'Grows, stains, and identifies bacteria in the lab. Lectures cover the microbes the lab leaves out, how pathogens cause disease, and how antibiotics fail.',
  BIOL220: 'Studies life in the sea at every size between plankton and whales, and samples the coast at low tide whatever hour that falls.',
  BIOL230: 'Explains how a plant makes its sugar and lifts its water. Hormones time its growth and its answers to stress and season.',
  BIOL240: 'Traces innate and adaptive immunity through antigen recognition, antibodies, and T cells. Vaccines, allergy, and autoimmune disease are the same system at work.',
  BIOL310: 'Runs an independent experiment in a faculty lab for a year. The poster and the thesis report the version that finally worked.',

  // --- Chemistry ---
  CHEM101: 'Balances equations, counts moles, and works through atomic structure, bonding, gases, and equilibrium, in a lab where yields rarely match the arithmetic.',
  CHEM110: 'Learns what each block of the periodic table tends to do, with bonding theory and coordination complexes to explain it.',
  CHEM120: 'Pushes electrons around carbon compounds until mechanisms can be predicted and not memorized, with synthesis and spectroscopy in the lab.',
  CHEM130: 'Measures by titration, chromatography, and spectroscopy. No result counts until it comes with the statistics that say how far to trust it.',
  CHEM140: 'Develops thermodynamics, kinetics, and quantum mechanics as they apply to molecules, using more calculus than any earlier chemistry course.',
  CHEM210: 'Treats the cell as a chemist would. Proteins, enzymes, and nucleic acids are the parts, and metabolism is what they do under regulation.',
  CHEM220: 'Solves molecular structures from NMR, infrared, and mass spectra, or from X-ray diffraction on the days a crystal agrees to grow.',
  CHEM230: 'Follows a drug from target and lead compound through structure-activity relationships to metabolism and dose.',
  CHEM240: 'Models molecules with quantum chemistry and molecular dynamics, and learns what each method can and cannot predict.',
  CHEM310: 'Joins a faculty research group to make or measure something new. The notebook is kept to the group\'s standard, and the thesis is written out of it.',

  // --- Physics ---
  PHYS101: 'Derives motion, force, energy, and momentum from Newton\'s laws, with lab work throughout.',
  PHYS110: 'Develops electric and magnetic fields through potentials and circuits to induction. Maxwell\'s equations arrive at the end, and light turns out to be a consequence.',
  PHYS120: 'Asks what waves do that particles cannot. Interference and diffraction show up first in sound and at last in laser light.',
  PHYS130: 'Studies the experiments that forced physics to change its mind, and the relativity and quantum theory they left behind.',
  PHYS140: 'Derives temperature, entropy, and the laws of thermodynamics from the statistics of many particles.',
  PHYS210: 'Develops the Schrödinger equation, operators, angular momentum, and spin. The hydrogen atom is solved in full, as one of the few systems that can be.',
  PHYS220: 'Explains why some solids conduct and others do not, starting from crystal structure and band theory. Every device in the room depends on the answer.',
  PHYS230: 'Applies gravity, nuclear physics, and radiation to stars and galaxies. The age and makeup of the universe are read from its microwave background.',
  PHYS240: 'Meets the Standard Model of quarks, leptons, and forces. Accelerators and detectors have spent decades trying to break it.',
  PHYS310: 'Carries one question further in a written thesis, after repeating classic experiments such as Millikan\'s oil drop and the Franck-Hertz tube.',

  // --- Environmental Science ---
  ENVS101: 'Samples one local stream all semester and uses it to learn the carbon and water cycles, soils, biodiversity, and pollution.',
  ENVS110: 'Traces where energy and carbon go once they enter the atmosphere, and how the ocean and the land set the pace of climate change.',
  ENVS120: 'Measures energy flow and nutrient cycling through forests, grasslands, and wetlands, with field and lab methods.',
  ENVS130: 'Chases a pollutant after its release through the reactions that make acid rain and thin the ozone, to wherever it finally settles.',
  ENVS140: 'Stacks spatial data layers and classified satellite imagery into a map that answers one environmental question.',
  ENVS210: 'Applies population genetics and landscape ecology to protecting species and habitats, on budgets that never cover all of them.',
  ENVS220: 'Tracks water through a watershed as rain, runoff, groundwater, and flood. The allocation among competing users is settled elsewhere, usually in court.',
  ENVS230: 'Climbs from radiation and cloud physics to numerical forecasting, with air pollution and climate dynamics along the way.',
  ENVS240: 'Applies the Clean Water Act, the Endangered Species Act, and NEPA to a degraded site, as the first step in planning its cleanup and replanting.',
  ENVS310: 'Studies a watershed, wetland, or brownfield for a community partner as a team. The data and recommendations go out in a public report with the partner\'s name on it.',

  // --- Psychology ---
  PSYC101: 'Visits perception, memory, learning, development, personality, and mental illness, each through the experiments its findings rest on.',
  PSYC110: 'Traces development from infancy to old age through the long-running studies that mapped each stage.',
  PSYC120: 'Infers how the mind pays attention and remembers from reaction times and errors, since nobody can watch it work.',
  PSYC130: 'Classifies mental disorders by the DSM and weighs the evidence on the causes and treatment of anxiety, depression, and psychosis.',
  PSYC140: 'Designs experiments and surveys, analyzes their data, and confronts the replication problems of the field.',
  PSYC210: 'Studies conformity, persuasion, prejudice, and group behavior through the classic experiments, including the ones that did not survive a rerun.',
  PSYC220: 'Links behavior to the brain: neurotransmitters, hormones, sleep, and the effects of drugs and damage.',
  PSYC230: 'Applies psychology to who gets hired and who stays motivated at work, and tests whether the personality quiz predicts either.',
  PSYC240: 'Studies how stress and belief change the course of an illness, and which interventions change the stress and the belief.',
  PSYC310: 'Preregisters and runs an original study with human participants. The report follows the format a psychology journal requires, whatever the result.',

  // === Health Science ===

  // --- Public Health ---
  PHLT101: 'Compares two neighboring counties\' death rates and asks how income, housing, and policy explain the gap.',
  PHLT110: 'Measures disease in populations by incidence, prevalence, and risk. Cohort and case-control studies are designed to find its causes.',
  PHLT120: 'Learns enough statistics on health data to read a clinical trial\'s results table and to doubt it in the right places.',
  PHLT130: 'Follows the money through a health system, since who pays for care goes a long way to deciding who gets it.',
  PHLT140: 'Traces illness back to air, water, chemicals, and food. Risk assessment and regulation are the tools that limit a population\'s exposure.',
  PHLT210: 'Weighs which interventions do the most good where money is shortest, with vaccination campaigns and maternal care as the working cases.',
  PHLT220: 'Designs a program to change a habit like smoking or skipped screenings, grounded in behavioral theory. The evaluation asks whether anyone changed, which the brochure alone rarely achieves.',
  PHLT230: 'Gathers and analyzes local health data with community partners, and turns it into ranked priorities and an improvement plan.',
  PHLT240: 'Tracks maternal and infant mortality, preterm birth, and childhood immunization against the prenatal care, WIC, and Medicaid meant to improve them.',
  PHLT310: 'Works a semester with a health department or clinic on a live problem, and delivers the analysis and the program plan its staff asked for.',

  // --- Nursing ---
  NURS101: 'Starts with a nurse\'s legal scope of practice and code of ethics, then hand hygiene, vital signs, and charting. Charting takes the longest to learn.',
  NURS110: 'Learns every organ system twice, once at the dissection table for structure and once in lecture for function.',
  NURS120: 'Sorts drugs by class, mechanism, and interaction. Before any dose is given, the patient, the drug, the route, and the time are checked again.',
  NURS130: 'Takes a history and examines a patient head to toe, then writes the findings up, because a finding nobody charted did not happen.',
  NURS140: 'Goes onto a hospital ward under supervision and gives basic nursing care to patients for the first time.',
  NURS210: 'Manages adults on hospital wards with heart failure, diabetes, pneumonia, or a fresh surgical wound, the core of nursing practice and of its licensing examination.',
  NURS220: 'Cares for infants, children, and adolescents, where doses go by weight and the conversation is usually with a parent.',
  NURS230: 'Follows a pregnancy through prenatal visits, labor and delivery, and the first days at home, caring for mother and newborn as two patients at once.',
  NURS240: 'Forms a working relationship with patients in psychosis or withdrawal, and learns the risk assessment and de-escalation an inpatient unit runs on.',
  NURS310: 'Runs a full patient load on a specialty unit under one preceptor for a term. The licensing examination comes next, and nobody needs reminding.',

  // --- Nutrition ---
  NUTR101: 'Reads a food label line by line: the calories and protein first, then the vitamins whose shortfall still causes disease.',
  NUTR110: 'Tracks carbohydrates, fats, and proteins from digestion through the metabolic pathways that store and burn them.',
  NUTR120: 'Matches nutrient needs to each life stage and its common shortfall: folate in pregnancy, iron in toddlers, protein in old age.',
  NUTR130: 'Plans menus inside the limits of a low-sodium or texture-modified diet that a person would still want to eat, and documents each case in the nutrition care process.',
  NUTR140: 'Explains what spoils food and what preserves it through its chemistry and microbiology. Cooking gets the same treatment.',
  NUTR210: 'Fuels training and competition by planning energy, hydration, and timing. The supplements athletes take get evaluated on evidence, which thins the shelf considerably.',
  NUTR220: 'Addresses malnutrition and obesity at the population level, through food policy, school programs, and surveillance.',
  NUTR230: 'Manages nutrition in diabetes, kidney disease, cancer, and critical illness, including tube and intravenous feeding.',
  NUTR240: 'Assesses clients by anthropometric, biochemical, clinical, and dietary data. Counseling is by motivational interviewing, in supervised sessions.',
  NUTR310: 'Plans and delivers nutrition care for patients and for a community program under registered dietitians, and presents one case in full.',

  // --- Pharmacy ---
  PHRM101: 'Follows one drug from its discovery through formulation to the pharmacist who hands it across the counter.',
  PHRM110: 'Revisits organ-system physiology with a pharmacist\'s emphasis, on the receptors and pathways that drugs act on.',
  PHRM120: 'Relates drug structure to activity, stability, and formulation, with the organic and analytical chemistry behind each.',
  PHRM130: 'Maps drug action on the nervous and cardiovascular systems: receptors, dose-response curves, and the agents used in each.',
  PHRM140: 'Formulates tablets, injections, and patches around the kinetics of how a drug is absorbed, distributed, and cleared.',
  PHRM210: 'Extends drug action to infection, cancer, endocrine, and inflammatory disease, with toxicity and resistance.',
  PHRM220: 'Selects and monitors drug therapy for patient cases, where the textbook choice meets a second diagnosis and a long medication list.',
  PHRM230: 'Shadows pharmacists in a hospital and a community pharmacy, reconciling medication lists and watching counseling done well.',
  PHRM240: 'Studies drug effects after approval through adverse-event reports and claims data, and the boxed warnings and withdrawals they prompt.',
  PHRM310: 'Runs a semester\'s project in a formulation or pharmacology lab, and presents the data as a drug company\'s project team would expect it.',

  // --- Kinesiology ---
  KINE101: 'Treats human movement as one connected system of anatomy, physiology, and mechanics.',
  KINE110: 'Finds each muscle, bone, and joint by touch on a lab partner. The harder exercise is naming the ones a squat or a throw is using.',
  KINE120: 'Measures how the heart, lungs, and muscles respond to exercise, on a treadmill, in a mask, with classmates taking turns as the subject.',
  KINE130: 'Applies forces and torques to the body with motion capture, analyzing everything from a golf swing to a fall.',
  KINE140: 'Asks how the nervous system acquires a skill, and why a practice schedule that feels worse often teaches better.',
  KINE210: 'Programs resistance and conditioning for athletes in periodized blocks, tests the results, and coaches lifting technique.',
  KINE220: 'Assesses and rehabilitates common sports injuries, from acute care and taping to return-to-play progressions.',
  KINE230: 'Screens clients for risk, runs graded exercise tests, and prescribes frequency, intensity, time, and type by the American College of Sports Medicine\'s guidelines.',
  KINE240: 'Adapts physical activity for people with disabilities and chronic conditions, with inclusion and safety as the starting points.',
  KINE310: 'Works a semester in a clinic or a training room under a certified professional, and documents each client\'s progress in notes someone else must be able to read.',

  // --- Neuroscience ---
  NEUR101: 'Follows a reflex, a memory, and a decision from the neurons that carry them to the behavior they produce.',
  NEUR110: 'Maps the structures of the brain and spinal cord, their connections, and what damage to each does, with brain dissection in the lab.',
  NEUR120: 'Opens up a single neuron to see how it signals, starting at the ion channel and ending at the synapse.',
  NEUR130: 'Links perception, memory, language, and decision-making to brain systems, through imaging, lesion, and recording studies.',
  NEUR140: 'Records and analyzes electrical activity at three scales: the patch-clamped single cell, the circuit, and the scalp EEG.',
  NEUR210: 'Compares how prescribed drugs and addictive ones act on the same neurotransmitter systems, to different ends.',
  NEUR220: 'Traces how the nervous system is built, from neural induction and axon guidance to synapse formation and plasticity.',
  NEUR230: 'Models neurons and networks mathematically, from the Hodgkin-Huxley equations to learning rules and neural coding.',
  NEUR240: 'Traces stroke, epilepsy, Parkinson\'s, Alzheimer\'s, and psychiatric illness down to mechanism. Each mechanism is also where a treatment has to start.',
  NEUR310: 'Carries an independent question through a year in a faculty lab and defends the result as a thesis, before an audience that knows the rig.',

  // === Computer Science ===

  // --- Computer Science ---
  COMP101: 'Writes small programs that read, loop, and decide. The other skill is finding the bugs before a grader does.',
  COMP110: 'Implements each standard structure by hand once. After that the skill is picking the one a problem needs and knowing what it will cost.',
  COMP120: 'Proves an algorithm correct and bounds its running time before trusting it, across sorting, graph search, dynamic programming, and greedy methods.',
  COMP130: 'Learns what an operating system quietly does for every program, then writes concurrent code and finds out what it does not do.',
  COMP140: 'Goes below the compiler to the instruction set and the cache, where the hardware decides which software runs fast.',
  COMP210: 'Writes a compiler stage by stage, from lexing and parsing through type checking and optimization to code that runs on an actual processor.',
  COMP220: 'Builds a playable game as a team, with a rendering loop, physics, input, and the design iteration that makes it fun.',
  COMP230: 'Programs multicore, GPU, and distributed systems with threads and message passing. The last step is measuring the speedup actually obtained.',
  COMP240: 'Ships a full-stack web application to outside users, with authentication, caching, load testing, and the attacks a public site has to withstand.',
  COMP310: 'Pursues one research question with a faculty adviser, and writes up as a thesis whatever the literature and the experiments turn out to support.',

  // --- Data Science ---
  DATA101: 'Takes a messy public dataset from download to a first chart, cleaning and questioning it at every step.',
  DATA110: 'Fits linear and generalized linear models and checks their assumptions before reading what the coefficients do and do not claim.',
  DATA120: 'Trains and evaluates regression, trees, clustering, and neural networks. The bias-variance trade-off turns up in every one of them.',
  DATA130: 'Draws charts and interactive graphics that make a dataset\'s structure legible, and learns what makes a visualization mislead.',
  DATA140: 'Finds patterns in large datasets with association rules, clustering, and anomaly detection. The second job is checking that they are not accidents of the sample.',
  DATA210: 'Splits storage and computation across a cluster, and decides when a batch job, a stream, or one large server is the cheaper way to an answer.',
  DATA220: 'Separates trend from seasonality and autocorrelation with ARIMA and state-space methods, and forecasts with honest uncertainty.',
  DATA230: 'Gets a program to read and write text, with n-gram counts first and transformer language models by the end.',
  DATA240: 'Starts from a prior belief, updates it with data by the rules of probability, and lets small groups such as counties borrow strength from one another.',
  DATA310: 'Answers a partner organization\'s question with its own data, cleaned, modeled, and explained to managers who never asked for a p-value.',

  // --- Cybersecurity ---
  CYBR101: 'Learns who attacks computer systems and why, and that plain habits like patching and backups stop most of them.',
  CYBR110: 'Secures networks with firewalls, intrusion detection, VPNs, and protocol hardening, against attacks run in a lab.',
  CYBR120: 'Works through symmetric and public-key ciphers, hashes, signatures, and protocols. Sound mathematics still fails in careless code.',
  CYBR130: 'Breaks into systems with written permission, working up from reconnaissance to privilege escalation, then writes the report that makes the findings fixable.',
  CYBR140: 'Staffs a security operations center: log analysis, monitoring, incident response, and the playbooks for when something gets through.',
  CYBR210: 'Secures identity, storage, networking, and workloads on public cloud platforms, where a misconfiguration is the usual cause of a breach.',
  CYBR220: 'Pulls evidence off disks and out of memory and network traffic, handled so that it holds up in court.',
  CYBR230: 'Ranks which threats and vulnerabilities deserve a control first, and maps the controls to the compliance frameworks an organization is audited against.',
  CYBR240: 'Finds vulnerabilities in code by static analysis, fuzzing, and review. Keeping the next ones out is a matter of habit, which is harder.',
  CYBR310: 'Defends a simulated company network against a live attacking team for a term, and writes the incident reports and the remediation plan.',

  // --- Software Engineering ---
  SOFT101: 'Writes small programs in a team under version control and code review, and ships one of them against a written requirement.',
  SOFT110: 'Elicits, specifies, and validates what a system must do, with stakeholders who disagree and needs that change.',
  SOFT120: 'Tests a system at every level and automates the tests. Coverage and defect rates say something about quality, though less than a dashboard implies.',
  SOFT130: 'Designs relational schemas and queries them in SQL, and learns which guarantees a database makes about a transaction and which it does not.',
  SOFT140: 'Applies design patterns, SOLID principles, and refactoring to build systems that survive being changed.',
  SOFT210: 'Runs a project in sprints with a product backlog, stand-ups, and retrospectives. The last retrospective asks what agile fixes and what it hides.',
  SOFT220: 'Builds native apps for phones, where the screen is small and the battery is finite and the network comes and goes.',
  SOFT230: 'Carries an interface from user research through prototypes to usability testing, with accessibility as a requirement rather than an afterthought.',
  SOFT240: 'Automates build, test, and deployment pipelines with containers, infrastructure as code, and monitoring, so that releases become routine.',
  SOFT310: 'Delivers a working product for an outside client as a team, through requirements, sprints, and testing. It is finished when the client is running it.',

  // --- Artificial Intelligence ---
  ARTF101: 'Surveys search, logic, probabilistic reasoning, and learning from data, and the two funding winters that followed when the field overpromised.',
  ARTF110: 'Implements classical search and probabilistic reasoning in code, the toolkit still running under modern systems.',
  ARTF120: 'Encodes facts and rules in logics and ontologies, reasons over them with inference engines, and finds where those give out.',
  ARTF130: 'Builds and trains multilayer networks from backpropagation up. Without optimization and regularization they learn nothing useful, so those come next.',
  ARTF140: 'Fits decision trees and then the random forests and boosted ensembles built from them. Each is judged only on data it has not seen.',
  ARTF210: 'Trains convolutional, recurrent, and transformer networks at scale, where the hard part is feeding the GPUs and keeping a week-long run alive.',
  ARTF220: 'Gives a robot senses and plans, through localization, mapping, motion planning, and control, on hardware that does not always do as it is told.',
  ARTF230: 'Finds and names objects in images and video, first with hand-built features and then with the deep networks that replaced them.',
  ARTF240: 'Asks who answers when deployed AI discriminates, surveils, or displaces workers, and whether the governance proposed so far would change it.',
  ARTF310: 'Builds and evaluates an AI system for a task someone needs done, with the baseline it must beat and an audit of where it fails and whom that harms.',

  // --- Information Systems ---
  INFO101: 'Walks one order through the web store, the database, the warehouse software, and the general ledger, asking at each stop who owns the system.',
  INFO110: 'Models an organization\'s processes and data, and specifies the information system that would serve them, with the stakeholders in the room.',
  INFO120: 'Keeps a production database running through schema changes, slow queries, and restores from backup. A non-relational store has to earn its place.',
  INFO130: 'Configures an enterprise system across finance, supply chain, and HR. The reading list is on why so many implementations overrun.',
  INFO140: 'Provisions and secures the servers and cloud services an organization runs on, and reads the monthly bill for them.',
  INFO210: 'Maps and redesigns workflows with process notation and simulation, and counts the handoffs and waiting time a redesign removes.',
  INFO220: 'Analyzes online business models down to payments and logistics, to find what makes a digital marketplace defensible.',
  INFO230: 'Drafts an organization\'s security program: policy, risk assessment, staff awareness, and governance under regulation.',
  INFO240: 'Designs dimensional models and ETL pipelines that feed analytics and reporting, so that two dashboards asked the same question give the same number.',
  INFO310: 'Scopes, budgets, and manages an information-systems project for a partner organization, through rollout and the training of the people who will use it.',
};

// One authored sentence per graduate course (Plan 72C), under the same
// rules. The entry course of each program also carries its gate, composed
// in techData.ts from the seed, so the sentence and the rule cannot
// disagree.
export const GRADUATE_COURSE_DESCRIPTIONS: Record<string, string> = {
  // --- School of Medicine (MD) ---
  MED501: 'Opens medical training with the body as one system and with the patient interview, which will be practiced for the rest of a career.',
  MED510: 'Dissects alongside the microscope, so that each structure is learned both where it lies and by what its tissue is made of.',
  MED520: 'Pairs each disease\'s mechanism with the drugs that interrupt it, so that a dose and its side effects are learned with the illness they treat.',
  MED530: 'Localizes the lesion from the bedside examination before looking at the scan, a point of pride in neurology, across stroke, seizure, and disorders of movement.',
  MED540: 'Takes clinical trials apart at journal club, limitations first. The question each time is whether the evidence should change practice for one patient or for a population.',
  MED550: 'Reasons through an adult patient\'s complaint to a diagnosis across the heart, lungs, kidneys, and gut. The plan is presented on morning rounds, where it is improved aloud.',
  MED560: 'Follows the contest between an immune system that recognizes and remembers and the pathogens that evade it, with vaccines and antimicrobials tipping the balance.',
  MED570: 'Reads a family pedigree and an exome sequence as clinical evidence. Each result then has to be explained to the family it belongs to.',
  MED580: 'Diagnoses and treats mental illness alongside the behaviors, from sleep to substance use, that shape every other illness a patient has.',
  MED590: 'Learns the operating room in order: consent, sterile technique, anesthesia, and the healing and complications of the days after. The student\'s first job is to hold the retractor.',
  MED600: 'Practices note-writing, case presentations, and handoffs before the wards, so a student can be useful before being knowledgeable.',
  MED610: 'Rotates through internal medicine, pediatrics, obstetrics and gynecology, and family medicine. The year ends as a sub-intern, with patients of the student\'s own and the pager that comes with them.',

  // --- School of Law (JD) ---
  LAWS501: 'Learns where American law comes from and how courts reason from precedent, and briefs a case for every class in the expectation of being called on.',
  LAWS510: 'Asks when a promise binds and what breaking it costs, then when an act becomes a wrong. The reasonable person is consulted throughout.',
  LAWS520: 'Follows a lawsuit from the complaint through discovery and trial, and the rules that decide which facts a jury is ever allowed to hear.',
  LAWS530: 'Turns the Commerce Clause, due process, and equal protection into tests a brief can apply. Moot court supplies the bench, and the bench interrupts.',
  LAWS540: 'Works through the rules of professional conduct on conflicts, confidentiality, and candor to the court. The hard cases set a lawyer\'s duty to a client against the duty to the law.',
  LAWS550: 'Sorts out who owns land and on what terms. A title search and a mortgage lead to the closing, where real estate finally changes hands and everyone signs everything.',
  LAWS560: 'Defines what makes conduct a crime, and holds the state to the constitutional limits on search, interrogation, and trial in proving it.',
  LAWS570: 'Represents the clinic\'s clients under supervision: drafting, negotiating, and appearing in court. The cases are the college\'s, and so are the filing deadlines.',

  // --- Graduate School of Business (MBA) ---
  MBAX501: 'Learns enough accounting, economics, and organizational behavior that a class of engineers, bankers, and poets can argue a case in one vocabulary.',
  MBAX510: 'Decides how a firm should raise money, spend it, and return it, one case at a time. The valuation has to be ready before class, in the event of a cold call.',
  MBAX520: 'Chooses which customers to serve and how to win them against rivals, from segmentation and positioning to pricing and brand.',
  MBAX530: 'Models supply chains and queues with a firm\'s own data, to decide where the business should cut waste and where it should add slack.',
  MBAX540: 'Advises an outside organization on a live problem as a team, and presents the recommendations to its leadership in fewer slides than the team wanted.',

  // --- Doctoral Program in Engineering (PhD) ---
  PHDE701: 'Frames a research question, designs the experiments and simulations to answer it, and defends the result to peers who know where to push.',
  PHDE710: 'Derives the mechanics of solids and fluids from first principles, and applies them to structures and materials at the limits of design.',
  PHDE720: 'Treats wave propagation, antennas, and electromagnetic compatibility at research depth, with papers from the field presented each week.',
  PHDE730: 'Registers the candidate each term until the experiments are done, the chapters are written, and the committee signs off.',

  // --- Doctoral Program in the Natural Sciences (PhD) ---
  PHDS701: 'Learns experimental design, statistics, and research ethics before the first laboratory project, which is the cheapest time to learn them.',
  PHDS710: 'Raises quantum mechanics and statistical physics to the level where current research papers in either field can be read and extended.',
  PHDS720: 'Plans multistep syntheses and proves what was made, with spectroscopy and crystallography read directly from the instruments.',
  PHDS730: 'Ends in a public defense and the graduate school\'s acceptance of the final copy, after however many years the research takes.',

  // --- Doctoral Program in Health Science (PhD) ---
  PHDH701: 'Designs a study of patients or a population, with the biostatistics to power it and the ethics protocol a review board will read line by line.',
  PHDH710: 'Presents and critiques current papers on the circuits behind cognition, weighing what imaging, optogenetics, and population recording can each show about cause.',
  PHDH720: 'Carries a finding from the laboratory into a clinical trial, with the regulatory, statistical, and ethical steps between the two.',
  PHDH730: 'Takes a question of the student\'s own through a proposal, data collection, and three publishable papers to the final defense.',

  // --- Doctoral Program in Computing (PhD) ---
  PHDC701: 'Reads the literature, runs reproducible experiments, and writes papers that computing conferences will accept.',
  PHDC710: 'Studies what can be learned from data and how fast, with the generalization bounds and optimization results behind modern machine learning.',
  PHDC720: 'Works through computability and complexity classes to the limits they set on what any algorithm, however clever, can ever achieve.',
  PHDC730: 'Turns a series of peer-reviewed conference papers into a dissertation, with the experiments rerun until a committee is satisfied.',

  // --- Doctoral Program in the Humanities (PhD) ---
  PHDL701: 'Enters the archive, reads closely, and learns the conventions of scholarly argument, the footnote above all.',
  PHDL710: 'Reads Derrida, Foucault, and Spivak whole rather than in excerpt. The affective and ecological turns that have since argued with them come after.',
  PHDL720: 'Sets Durkheim, Weber, Bourdieu, and Habermas against one another on how societies hold together, change, and divide.',
  PHDL730: 'Writes the dissertation itself, a book-length work of original scholarship, defended before a committee that has read every draft.',

  // --- Doctoral Program in Economics (PhD) ---
  PHDB701: 'Drills the econometrics, identification strategies, and data work that doctoral research in economics is judged on, usually in the first seminar question.',
  PHDB710: 'Builds consumer, producer, and general-equilibrium theory with the mathematics used in current research, from game theory to mechanism design.',
  PHDB720: 'Presents current research on asset pricing, corporate finance, and financial crises to the seminar, one student and one paper each week.',
  PHDB730: 'Assembles three original papers into a dissertation, and sends the strongest out as the job-market paper a candidate presents at every interview.',

  // --- Master of Fine Arts (MFA) ---
  MFAX701: 'Works in a studio of the artist\'s own and brings the results to a weekly critique, where peers and faculty argue over them at length.',
  MFAX710: 'Critiques a new manuscript from each writer every few weeks, alongside craft reading chosen for what that writer\'s work is attempting.',
  MFAX720: 'Brings new scores before performers and peers each week, and learns from the performers which bars cannot be played as written.',
  MFAX730: 'Mounts a public exhibition, performance, or publication to close the degree. The faculty review it, and so does everyone at the opening.',
};
