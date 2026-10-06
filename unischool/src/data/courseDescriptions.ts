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
  FINA101: 'Prices a bond, a loan and a retirement plan with the time value of money, and shows why risk raises what investors demand.',
  FINA110: 'Works through capital budgeting, cost of capital, and the financing and payout decisions a firm makes to create value.',
  FINA120: 'Values stocks and bonds, builds portfolios under the trade-off between risk and return, and tests whether markets price either correctly.',
  FINA130: 'Analyzes mortgages, property valuation, and development pro formas, from a single rental to a securitized pool of loans.',
  FINA140: 'Covers exchange rates, currency risk and hedging, and how firms raise and move capital across borders.',
  FINA210: 'Builds three-statement, discounted cash flow, and scenario models in spreadsheets, with the sensitivity tests that show where a valuation breaks.',
  FINA220: 'Examines payments, lending platforms, and distributed ledgers, and asks which of them changes finance and which only re-plumbs it.',
  FINA230: 'Measures market, credit, and operational risk with value-at-risk and stress tests, and chooses what to hedge with derivatives and what to insure.',
  FINA240: 'Traces how overconfidence, loss aversion, and herding move prices away from what rational models predict, and what that leaves for arbitrage.',
  FINA310: 'Takes one live deal to an investment committee\'s vote, defending the valuation, the financing, and the risks before a panel of practitioners.',

  // --- Accounting ---
  ACCT101: 'Records a small firm\'s first year in journal entries and closes it into a balance sheet and an income statement.',
  ACCT110: 'Prepares and reads the balance sheet, income statement, and cash-flow statement under the standards that govern external reporting.',
  ACCT120: 'Turns cost data into decisions — budgeting, break-even analysis, variance reports, and pricing — for the people who run the business.',
  ACCT130: 'Covers how income, deductions, and credits are computed for individuals and businesses, and how tax planning changes a decision.',
  ACCT140: 'Examines how transactions flow through enterprise software, the controls built into that flow, and where it fails.',
  ACCT210: 'Follows money through fraud schemes, asset tracing, and litigation support, using the accounting record as evidence.',
  ACCT220: 'Handles the hard cases in external reporting — revenue recognition, leases, pensions, income taxes — and ends with consolidations.',
  ACCT230: 'Designs costing systems for complex operations, from activity-based costing to transfer prices and the performance measures they distort.',
  ACCT240: 'Teaches how an auditor gathers evidence, tests internal controls, and decides whether a company\'s financial statements can be relied on.',
  ACCT310: 'Works a full engagement for a mid-sized company, closing its books, preparing its tax return, and testing its statements, and writes up each judgment call.',

  // --- Marketing ---
  MRKT101: 'Surveys the marketing mix — product, price, place, and promotion — through real brand cases.',
  MRKT110: 'Draws on psychology and economics to explain how people notice, evaluate, and choose products, and how often habit and context make the choice instead.',
  MRKT120: 'Designs surveys, focus groups, and experiments, and turns their data into estimates a marketing decision can rest on.',
  MRKT130: 'Plans search, social, email, and paid campaigns around the funnel, and measures them with attribution rather than impressions.',
  MRKT140: 'Builds and defends a brand as an asset: positioning, identity, extensions, and the valuation of what the name alone is worth.',
  MRKT210: 'Applies sponsorship, ticketing, media rights, and fan engagement to teams, leagues, and the athletes who front them.',
  MRKT220: 'Develops creative briefs, media plans, and promotional offers, and evaluates a campaign against the behavior it set out to change.',
  MRKT230: 'Organizes a sales force — territories, quotas, compensation, pipeline forecasting — and the coaching that lifts a team\'s close rate.',
  MRKT240: 'Adapts product, price, and message across cultures, currencies, and regulators, and decides when to standardize and when to localize.',
  MRKT310: 'Writes a year\'s marketing plan for a real client, with the research, segments, budget, and measures behind it, and presents it to the client\'s managers.',

  // --- Economics ---
  ECON101: 'Examines how individuals and firms make decisions under scarcity, from supply and demand to market structure.',
  ECON110: 'Models output, unemployment, inflation, and growth for a whole economy, and what monetary and fiscal policy can do about them.',
  ECON120: 'Fits regression lines to economic data and tests whether a correlation, however strong, can be read as a cause.',
  ECON130: 'Reworks consumer choice, the firm, and market failure with the calculus the principles course left out, and derives what that course could only assert.',
  ECON140: 'Reads the Industrial Revolution, the Great Depression, and the postwar boom as tests of economic theory rather than as a chronicle.',
  ECON210: 'Replaces the rational agent with the one experiments find, and works out what bounded rationality and present bias do to markets and policy.',
  ECON220: 'Analyzes taxation, public spending, and debt: who bears a tax, what a public good is worth, and when redistribution costs efficiency.',
  ECON230: 'Solves strategic interaction with Nash equilibrium, backward induction, and signaling, from auctions to arms races.',
  ECON240: 'Prices pollution, climate damage, and natural resources, and compares taxes, tradable permits, and regulation by what each costs per ton of emissions cut.',
  ECON310: 'Writes an empirical paper on a question of the student\'s own, finds the data and the identification to answer it, and presents it to the seminar.',

  // --- Management ---
  MGMT101: 'Studies how teams form, stall and recover, and what a first-time manager can do about each, through cases and team projects.',
  MGMT110: 'Covers recruiting, compensation, performance review, and employment law, and how each shapes who stays and how they work.',
  MGMT120: 'Designs the processes that make and deliver things: capacity, scheduling, quality, and the bottlenecks that set throughput.',
  MGMT130: 'Tests corporate decisions against moral frameworks, stakeholder claims, and the cases where the law permitted what the public would not.',
  MGMT140: 'Applies research on motivation, perception, and group decisions to why people at work cooperate, quit, or go along with a bad call.',
  MGMT210: 'Plans scope, schedule, budget, and risk with work breakdowns and critical paths, and steers a project as those plans meet reality.',
  MGMT220: 'Takes an idea through customer discovery, business models, and fundraising to a launch, with the failure modes of each stage.',
  MGMT230: 'Diagnoses workplace disputes and applies mediation, interest-based bargaining, and structured processes to settle them.',
  MGMT240: 'Prepares, conducts, and reviews negotiations through live simulations, from distributive haggling to multi-party deals with hidden interests.',
  MGMT310: 'Brings finance, marketing, and operations together in full company cases, sizing up an industry with the five forces and choosing a strategy that holds once rivals respond.',

  // --- Supply Chain & Operations ---
  SPCO101: 'Traces how goods move from raw material to customer, and where supply chains break down.',
  SPCO110: 'Plans warehousing, transportation modes, and delivery networks, and trades off inventory against speed and cost.',
  SPCO120: 'Selects and manages suppliers, negotiates contracts, and weighs total cost of ownership against price, risk, and ethics.',
  SPCO130: 'Applies statistical process control, Six Sigma, and root-cause analysis to keep defects out of a product before inspection finds them.',
  SPCO140: 'Forecasts what customers will order from history, promotions, and market signals, and reconciles the forecast with what operations can supply.',
  SPCO210: 'Manages sourcing and distribution across borders: tariffs, currency, lead times, and the resilience a shock like a port closure demands.',
  SPCO220: 'Sets reorder points, safety stock, and replenishment policies, and tunes them for demand that is uncertain and lead times that slip.',
  SPCO230: 'Applies optimization, simulation, and forecasting models to routing, scheduling, and stock decisions, using real operational data.',
  SPCO240: 'Plans carrier selection, fleet routing, and freight contracts across road, rail, sea, and air, under regulation and fuel cost.',
  SPCO310: 'Redesigns a partner company\'s supply chain as a team, modeling its network, inventory, and costs, and presents the savings to its managers.',

  // === Engineering ===

  // --- Mechanical Engineering ---
  MECH101: 'Teaches freehand sketching, CAD, and engineering drawing, and has each team build a prototype that must meet a written specification.',
  MECH110: 'Analyzes forces and moments on trusses, frames, and machines at rest, then on particles and rigid bodies under acceleration.',
  MECH120: 'Applies the first and second laws to engines, refrigerators, and power cycles, with property tables and the entropy budget of each.',
  MECH130: 'Covers pressure, viscosity, and flow in pipes and around bodies, from Bernoulli and the Navier-Stokes equations to boundary layers and drag.',
  MECH140: 'Relates the structure of metals, polymers, ceramics, and composites to their strength, failure, and processing.',
  MECH210: 'Designs manipulators and mobile robots: kinematics, actuators, sensors, and the control loops that make them move where intended.',
  MECH220: 'Sizes heating, cooling, and ventilation equipment from load calculations and psychrometric charts, and checks the building against the energy code.',
  MECH230: 'Analyzes spark- and compression-ignition cycles, combustion, and emissions, and tunes a running engine on a dynamometer.',
  MECH240: 'Formulates and solves stress, thermal, and vibration problems numerically, and learns when a converged result is still wrong.',
  MECH310: 'Designs, builds, and tests a working machine for an outside sponsor in a year-long team project, to a budget and a written specification.',

  // --- Electrical Engineering ---
  ELEC101: 'Solves resistive, RC, and RL circuits with Kirchhoff\'s laws, nodal analysis, and Thévenin equivalents, and checks each answer on a breadboard.',
  ELEC110: 'Designs combinational and sequential circuits from gates and flip-flops, and builds them on programmable hardware.',
  ELEC120: 'Analyzes continuous and discrete signals with Fourier, Laplace, and z-transforms, and the linear systems that filter them.',
  ELEC130: 'Develops Maxwell\'s equations for static and time-varying fields, transmission lines, and waves, with the antennas and waveguides they explain.',
  ELEC140: 'Analyzes and designs diode and transistor circuits with small-signal models, and biases amplifiers to tolerate temperature drift and part-to-part variation.',
  ELEC210: 'Models generation, transmission, and load flow in the electrical grid, with fault analysis and the stability of the network.',
  ELEC220: 'Covers modulation, coding, fading channels, and multiple access, and works out the link budget that decides whether a call connects.',
  ELEC230: 'Designs feedback controllers with root locus, frequency response, and state space, and tunes them for stability and performance on real plants.',
  ELEC240: 'Lays out digital circuits in CMOS from transistor to chip, with timing, power, and the design flow that gets a chip fabricated.',
  ELEC310: 'Takes a team\'s circuit board or embedded system through specification, prototype, and test, and demonstrates it working to a review panel.',

  // --- Chemical Engineering ---
  CHEN101: 'Follows a barrel of crude and a vat of corn mash through a plant, and names the unit operation each step takes.',
  CHEN110: 'Starts with energy balances on flowing streams, then applies phase and chemical equilibrium to the separations and reactions a plant depends on.',
  CHEN120: 'Calculates friction losses, pump heads, and pressure drops for process piping, with the Reynolds number deciding which correlation applies.',
  CHEN130: 'Closes mass and energy balances on a whole flowsheet, with recycle, purge, and reaction, the bookkeeping a plant design is checked against.',
  CHEN140: 'Sizes batch, stirred, and tubular reactors from kinetics and residence time, with heat effects and catalysis.',
  CHEN210: 'Analyzes hazards, relief systems, and layers of protection with HAZOP studies and the case histories of plant disasters, so a design fails safely.',
  CHEN220: 'Engineers fermentation, enzyme reactors, and downstream purification to make pharmaceuticals and fuels from living cells.',
  CHEN230: 'Covers polymerization, molecular weight, and the viscoelastic behavior of plastics, with the processing that shapes them.',
  CHEN240: 'Evaluates biofuels, hydrogen, carbon capture, and electrochemical storage on efficiency, cost, and life-cycle emissions.',
  CHEN310: 'Designs and costs a complete plant as a team, sizing every unit operation and closing the economics that decide whether it would be built.',

  // --- Civil Engineering ---
  CIVE101: 'Covers forces in equilibrium, free-body diagrams, and load paths, the physical foundation for structural and civil design.',
  CIVE110: 'Finds member forces in determinate trusses, frames, and beams by statics alone, and tracks moving loads through them with influence lines.',
  CIVE120: 'Covers soil classification, seepage, consolidation, and shear strength — the ground properties a foundation design rests on.',
  CIVE130: 'Relates loads to stress, strain, and deflection in bars, shafts, and beams, up to buckling and combined loading.',
  CIVE140: 'Designs roads, intersections, and transit systems from traffic flow, capacity analysis, and geometric standards.',
  CIVE210: 'Designs a bridge from concept through loads, girders, bearings, and substructure to the code checks a real span must pass.',
  CIVE220: 'Assesses the effects of a proposed project on air, water, land, and communities, and writes the statement regulators require.',
  CIVE230: 'Plans a construction project — estimating, scheduling, contracts, procurement, and safety — on a site with weather and subcontractors.',
  CIVE240: 'Covers zoning, land use, transportation, and housing, and drafts a comprehensive plan that has to survive a public hearing.',
  CIVE310: 'Designs a real site\'s structures, drainage, and roads as a consulting team, to code, with the drawings and cost estimate a client would sign.',

  // --- Industrial Engineering ---
  INDE101: 'Maps a process, times its jobs with a stopwatch, and puts a dollar figure on each proposed improvement.',
  INDE110: 'Schedules materials, machines, and people to meet demand, with MRP, capacity planning, and the trade-off between inventory and lead time.',
  INDE120: 'Designs workstations, tools, and tasks around the human body, with the hazard analysis that keeps a workplace from injuring it.',
  INDE130: 'Applies control charts, sampling plans, and process capability to detect drift before it becomes defects.',
  INDE140: 'Lays out plants and warehouses for material flow, with location analysis and the space each operation needs.',
  INDE210: 'Builds discrete-event models of factories, hospitals, and queues, and runs experiments on them that would be too costly in real life.',
  INDE220: 'Optimizes network design, inventory, and sourcing with mathematical programming and data from a real supply chain.',
  INDE230: 'Applies value-stream mapping, pull systems, and continuous improvement to take the waste out of a production line.',
  INDE240: 'Models failure with life distributions and fault trees, and designs maintenance and redundancy for systems that must not stop.',
  INDE310: 'Studies a partner plant or hospital on site, models how its work flows, and proposes and costs the changes that would cut its waste and waiting.',

  // --- Aerospace Engineering ---
  AERO101: 'Surveys the standard atmosphere, airfoils, aircraft performance, and orbits, with a first look at stability and propulsion.',
  AERO110: 'Predicts lift and drag on airfoils and wings with potential-flow theory and compressibility corrections, and tests the predictions in a wind tunnel.',
  AERO120: 'Computes range, endurance, climb, and takeoff and landing distances from an aircraft\'s thrust, drag, and weight.',
  AERO130: 'Covers chemical rockets, electric thrusters, and the rocket equation, with nozzle design and propellant choice.',
  AERO140: 'Analyzes thin-walled beams, stressed skins, and composites under flight loads, with fatigue and the margins certification demands.',
  AERO210: 'Solves two-body orbits, transfers, and rendezvous, and plans interplanetary trajectories with gravity assists.',
  AERO220: 'Designs, builds, and flies a sounding rocket as a team, and answers for its motor choice, stability margin, and recovery.',
  AERO230: 'Takes an aircraft from mission requirements through sizing, configuration, and trade studies to a preliminary design review.',
  AERO240: 'Builds and operates drones — airframes, autopilots, and sensors — under the FAA rules on where and how high they may fly.',
  AERO310: 'Designs an aircraft or a spacecraft mission as a team, closing its weight, power, and performance budgets, and defends it at a design review.',

  // === Arts & Media ===

  // --- Media Studies ---
  MDIA101: 'Measures what newspapers, broadcasters and platforms each reach, and what the research says they do to opinion.',
  MDIA110: 'Reads the major theories of media effects and meaning, from propaganda models to audience reception, against what the evidence supports.',
  MDIA120: 'Compares how press freedom, ownership, and public broadcasting differ across countries, and what each arrangement does to the news.',
  MDIA130: 'Examines how platforms, algorithms, and participatory media reshape identity, community, and the public sphere.',
  MDIA140: 'Works through privacy, deception, harm, and conflict of interest in journalism and entertainment, case by case.',
  MDIA210: 'Follows a film from development finance through distribution windows and marketing, and how streaming rewrote the economics.',
  MDIA220: 'Measures reach, sentiment, and network spread across platforms, and separates a real audience signal from bots and vanity metrics.',
  MDIA230: 'Shoots, edits, and captions news photographs under deadline, with the ethics of staging, cropping, and consent.',
  MDIA240: 'Manages an organization\'s reputation through media relations, crisis response, and campaigns, and measures what the coverage did.',
  MDIA310: 'Researches one medium, company, or audience through archives, interviews, or data, and defends the resulting thesis before the seminar.',

  // --- Graphic Design ---
  GRDS101: 'Composes shape, color, and type on posters and signs, and tests what a viewer sees first against what the designer meant.',
  GRDS110: 'Sets type with attention to letterform, hierarchy, spacing, and grid, from a single word mark to a running text page.',
  GRDS120: 'Edits and composes raster and vector images for print and screen, with color management and resolution handled correctly.',
  GRDS130: 'Arranges type and image on the page and the screen using grids, hierarchy, and white space, for editorial and advertising work.',
  GRDS140: 'Develops logos, identity systems, and brand guidelines, and tests them across the applications a client will actually use.',
  GRDS210: 'Designs responsive interfaces in HTML and CSS with attention to navigation, accessibility, and performance on real devices.',
  GRDS220: 'Animates type and graphics for title sequences, explainers, and broadcast, using timing and easing to carry meaning.',
  GRDS230: 'Develops a personal visual language through editorial, book, and concept illustration in traditional and digital media.',
  GRDS240: 'Designs a complete magazine or book, from pacing and typographic system through the cover to press-ready files.',
  GRDS310: 'Refines a professional portfolio around a self-directed identity project, reviewed by practicing designers at a public show.',

  // --- Creative Writing ---
  CRWR101: 'Writes a poem and a short story a week, read aloud and critiqued, to learn what revision is for.',
  CRWR110: 'Drafts and revises short stories under group critique, with close attention to point of view, scene, and structure.',
  CRWR120: 'Writes in received and open forms, revising for image, line, and sound under weekly critique.',
  CRWR130: 'Writes memoir, essay, and reportage, and works out the obligations to fact and to other people that fiction does not carry.',
  CRWR140: 'Edits other writers\' manuscripts at the line and the structural level, and produces a small literary magazine from submission to print.',
  CRWR210: 'Writes a feature-length screenplay in industry format, from logline and outline through three-act structure and dialogue.',
  CRWR220: 'Develops a one-act play in which everything must be said or done onstage, and hears each draft read aloud by actors.',
  CRWR230: 'Plans and drafts the opening of a novel, sustaining character and plot across a length the short story never asks for.',
  CRWR240: 'Completes a polished manuscript in the writer\'s chosen genre, alongside the craft reading and the query letter to send with it.',
  CRWR310: 'Completes a chapbook of poems or a collection of stories under one faculty reader, and reads from it in public at the year\'s end.',

  // --- Music ---
  MUSC101: 'Covers notation, scales, and harmony, the building blocks of Western music.',
  MUSC110: 'Extends harmony into chromaticism, modulation, and form, analyzing sonatas and songs from the score.',
  MUSC120: 'Traces Western art music from chant and Renaissance polyphony through Bach, Beethoven, and Stravinsky, by listening and score study.',
  MUSC130: 'Writes short pieces for solo instruments and small ensembles, and hears them performed and critiqued.',
  MUSC140: 'Gives weekly private lessons on the student\'s instrument or voice, building technique and repertoire toward a juried performance.',
  MUSC210: 'Improvises over standards and blues forms, learning chord-scale relationships, voicings, and the vocabulary of the tradition by ear.',
  MUSC220: 'Studies musical traditions from West Africa, India, Indonesia, and the Andes through performance as well as listening.',
  MUSC230: 'Records, mixes, and produces music in a digital audio workstation, with synthesis, sampling, and live electronics.',
  MUSC240: 'Composes an extended work for larger forces, orchestrated and rehearsed toward a public premiere.',
  MUSC310: 'Prepares and performs a public recital or a portfolio of premiered compositions, with program notes written by the performer.',

  // --- Film ---
  FILM101: 'Teaches close reading of cinema through shot composition, editing, and narrative structure.',
  FILM110: 'Teaches lighting, lenses, exposure, and camera movement on set, and how each choice shapes what an audience feels.',
  FILM120: 'Develops short scripts through outline, draft, and table read, with structure and dialogue revised under critique.',
  FILM130: 'Takes a short film from pre-production through the shoot as a crew, rotating through the roles a set depends on.',
  FILM140: 'Works with actors, blocks scenes, and translates a script into shot lists, with the director\'s decisions tested on set.',
  FILM210: 'Researches, shoots, and edits a nonfiction film, negotiating access, consent, and the line between observing and staging.',
  FILM220: 'Surveys national cinemas since the silent era by their movements: Soviet montage, Italian neorealism, the French New Wave, and Brazil\'s Cinema Novo.',
  FILM230: 'Records dialogue, builds effects and ambience, and mixes them into a soundtrack that does half the storytelling.',
  FILM240: 'Edits, color-grades, and finishes a film to delivery, with the workflow and versioning a real release requires.',
  FILM310: 'Writes, shoots, and edits a short film as its director, with classmates as the crew, and screens it at the department\'s festival.',

  // --- Studio Art ---
  SART101: 'Works through line, shape, balance and figure-ground in cut paper and ink, critiqued on the wall each week.',
  SART110: 'Builds observational skill in line, value, and proportion from still life and the figure, in charcoal, graphite, and ink.',
  SART120: 'Works in oil and acrylic on color mixing, surface, and composition, from studies to sustained canvases.',
  SART130: 'Builds in clay, plaster, wood, and found material, and learns what changes when a work occupies space rather than a wall.',
  SART140: 'Covers painting, sculpture, and architecture period by period, with slide identifications and the formal analysis a studio critique borrows.',
  SART210: 'Covers relief, intaglio, and screen printing, from plate and stencil to the edition.',
  SART220: 'Throws and hand-builds vessels and sculptural forms, and fires and glazes them with an understanding of the chemistry involved.',
  SART230: 'Shoots, develops, and prints in the darkroom and the digital lab, with the history of the medium alongside the technique.',
  SART240: 'Makes work in generative code, 3D modeling, video, and interactive media, exhibited on screens rather than paper.',
  SART310: 'Makes a coherent body of work over the year, writes an artist\'s statement for it, and hangs it in the college gallery for public critique.',

  // === Social Sciences & Humanities ===

  // --- English ---
  ENGL101: 'Reads a sonnet, a short story and a play line by line, and builds an argument about each from the words on the page.',
  ENGL110: 'Reads Beowulf, Chaucer, Milton, the Romantics, and Woolf in order, and how English itself changed as a literary language.',
  ENGL120: 'Asks what makes a literature American rather than English, through Bradstreet, Douglass, Dickinson, Twain, Faulkner, and Morrison.',
  ENGL130: 'Introduces the schools of criticism — formalist, Marxist, psychoanalytic, feminist, postcolonial — and puts each to work on a text.',
  ENGL140: 'Builds argumentative and research writing for an academic audience, with sustained revision and attention to style.',
  ENGL210: 'Reads a dozen plays across comedy, history, and tragedy, with attention to staging, language, and the texts\' unsettled histories.',
  ENGL220: 'Reads Dryden, Swift, Pope, and the rise of the novel in a century of coffeehouses, satire, and print.',
  ENGL230: 'Reads writing from Africa, South Asia, and the Caribbean in the wake of empire, and the theory that grew up around it.',
  ENGL240: 'Writes documentation, proposals, and reports for expert and lay readers, with structure, plain language, and usability testing.',
  ENGL310: 'Writes a twenty-five-page critical essay on an author or a problem of the student\'s choosing, drafted and defended among peers.',

  // --- Sociology ---
  SOCY101: 'Shows how class, family, school and work shape choices people believe are their own, with the surveys that measure it.',
  SOCY110: 'Analyzes class, status, and power: how inequality is measured, reproduced across generations, and justified.',
  SOCY120: 'Reads Marx, Weber, Durkheim, and their successors, and asks what each framework explains that the others cannot.',
  SOCY130: 'Summarizes survey data with distributions, cross-tabulations, and regression, and tests whether a gap between groups is larger than chance would leave.',
  SOCY140: 'Trains interviewing, ethnographic observation, and the coding of field notes, with the ethics of studying people up close.',
  SOCY210: 'Explains crime and punishment through theories of strain, control, and labeling, and tests them against crime statistics and the courts.',
  SOCY220: 'Studies how marriage, parenting, and kinship vary across class and culture and have changed over a century.',
  SOCY230: 'Examines how racial and ethnic categories are made, enforced, and contested, and their effects on housing, schooling, and justice.',
  SOCY240: 'Analyzes how gender is socially constructed and enforced, in work, family, and the body, and how sexuality intersects with it.',
  SOCY310: 'Poses a question about social life, answers it with data the student gathers or finds, and writes it up to a journal\'s standards.',

  // --- Anthropology ---
  ANTH101: 'Introduces cultural, biological, linguistic and archaeological anthropology, each through the one case it explains best.',
  ANTH110: 'Studies kinship, ritual, exchange, and belief across societies through ethnography, and what fieldwork can and cannot see.',
  ANTH120: 'Covers human evolution, primate behavior, and modern human variation, from fossil evidence to genetics.',
  ANTH130: 'Teaches survey, excavation, stratigraphy, and dating, and how material remains are turned into claims about the past.',
  ANTH140: 'Examines how language shapes and reflects culture: dialect, politeness, multilingualism, and language loss.',
  ANTH210: 'Designs and carries out a small ethnographic project, from gaining access to writing up, with the ethics at every step.',
  ANTH220: 'Compares how cultures understand illness, healing, and the body, and what that means for medicine delivered across them.',
  ANTH230: 'Studies myth, ritual, magic, and belief, and whether to explain them, as Durkheim did, or interpret them, as Geertz did.',
  ANTH240: 'Reads Boas, Malinowski, Evans-Pritchard, and Lévi-Strauss in turn, and how each changed what an ethnographer goes into the field to find.',
  ANTH310: 'Turns a season of fieldwork, a museum collection, or a skeletal sample into an argued paper, presented to the department.',

  // --- Political Science ---
  POLS101: 'Asks who gets what, when, and how, and introduces the states, parties, and elections that decide it.',
  POLS110: 'Compares regimes, party systems, and institutions across countries to explain why democracies and dictatorships rise, endure, and fall.',
  POLS120: 'Introduces realism, liberalism, and constructivism, and applies them to war, trade, alliances, and international organizations.',
  POLS130: 'Examines the Constitution, the separation of powers, federalism, and the parties and interest groups that work them.',
  POLS140: 'Designs a study of a political question with surveys, experiments, or paired cases, and reads the regression tables the field publishes.',
  POLS210: 'Reads the landmark cases on judicial review, federal power, and civil liberties, and how doctrine changes with the Court.',
  POLS220: 'Defines a policy problem, weighs alternatives with cost-benefit analysis and evidence, and explains why the best option often loses.',
  POLS230: 'Reads Rawls, Nozick, and their critics on what a just distribution and a legitimate state would be.',
  POLS240: 'Analyzes war, deterrence, terrorism, and cyber conflict, and the intelligence and defense institutions built to meet them.',
  POLS310: 'Tests one argument about power, elections, or war against cases or data the student assembles, in a paper defended before the seminar.',

  // --- History ---
  HIST101: 'Compares farming, empire, and trade across Afro-Eurasia and the Americas, and how contact bound them into one world.',
  HIST110: 'Builds an argument from primary sources, and reads how Marxist, Annales, and cultural historians have told the same past differently.',
  HIST120: 'Follows the Revolution, the Civil War and Reconstruction, the New Deal, and civil rights as one long argument over who counts as a citizen.',
  HIST130: 'Asks how the Reformation, the French Revolution, and nationalism built Europe\'s nation-states, and how their rivalries led to 1914 and 1939.',
  HIST140: 'Studies Mesopotamia, Egypt, Greece, and Rome through their texts and material remains, and what each left behind.',
  HIST210: 'Examines the causes, conduct, and consequences of the two world wars, from the trenches and the home front to the peace settlements.',
  HIST220: 'Follows China, Japan, and Korea through the Opium Wars, the Meiji reforms, colonial rule, and revolution, in their own sources in translation.',
  HIST230: 'Reads village feuds, witch trials, and carnival as an anthropologist would, working from court and parish records instead of fieldwork.',
  HIST240: 'Traces how scientific ideas and machines were made, contested, and adopted, from the Scientific Revolution to the digital age.',
  HIST310: 'Writes a thesis from primary sources in an archive, with footnotes a referee could check, and defends it before two faculty readers.',

  // --- Philosophy ---
  PHIL101: 'Puts arguments into standard form, tests their validity, and names the fallacies that make bad ones persuasive.',
  PHIL110: 'Examines utilitarian, deontological, and virtue theories of right action, and tests them on real moral problems.',
  PHIL120: 'Asks what exists — numbers, universals, possible worlds — and what makes something the same thing over time or an action free.',
  PHIL130: 'Studies knowledge, justification, and skepticism, and what testimony, perception, and reason can each be trusted to deliver.',
  PHIL140: 'Reads the Presocratics, Plato, and Aristotle closely, on nature, knowledge, the soul, and the good life.',
  PHIL210: 'Reads Kierkegaard, Nietzsche, Heidegger, Sartre, and de Beauvoir on freedom, anxiety, authenticity, and meaning without guarantee.',
  PHIL220: 'Examines consciousness, intentionality, and the mind-body problem, and whether a machine could be conscious or think about anything.',
  PHIL230: 'Reads Descartes, Spinoza, Locke, Hume, and Kant on what the mind can know of the world, and why reason and experience each claimed to settle it.',
  PHIL240: 'Develops propositional and first-order logic with proofs and models, up to the completeness and the limits of the systems.',
  PHIL310: 'Writes and revises one long paper that defends a single thesis against the strongest objections the seminar can raise.',

  // === Science ===

  // --- Mathematics ---
  MATH101: 'Applies limits, derivatives, and integrals to related rates, optimization, and area, and proves the fundamental theorem that joins them.',
  MATH110: 'Covers vector spaces, matrices, eigenvalues, and linear maps, with the geometry and the applications that make them indispensable.',
  MATH120: 'Develops random variables, distributions, and the central limit theorem, and applies them to estimation and hypothesis testing.',
  MATH130: 'Covers logic, sets, combinatorics, graphs, and proof by induction — the mathematics beneath computing.',
  MATH140: 'Solves ordinary differential equations analytically and numerically, and models the oscillators, populations, and circuits they describe.',
  MATH210: 'Builds the real numbers, limits, continuity, and the integral rigorously, and proves the theorems calculus took on trust.',
  MATH220: 'Studies groups, rings, and fields through symmetry and permutations, and shows why no formula in radicals solves every quintic.',
  MATH230: 'Defines open sets, continuity, compactness, and connectedness in the abstract, and uses the fundamental group to tell a sphere from a torus.',
  MATH240: 'Analyzes algorithms for root finding, integration, linear systems, and differential equations, with the error and stability of each.',
  MATH310: 'Masters a recent paper or a classic proof in depth, presents it to the seminar, and writes it up as an exposition another student could follow.',

  // --- Biology ---
  BIOL101: 'Surveys cells, genes, evolution, and ecosystems, with a weekly lab of microscopes, pipettes, and fruit flies.',
  BIOL110: 'Examines membranes, organelles, signaling, and the cell cycle, and the experimental methods that revealed them.',
  BIOL120: 'Covers inheritance from Mendel to the genome: linkage, mutation, gene regulation, and the tools of molecular genetics.',
  BIOL130: 'Studies populations, communities, and ecosystems, with field work on how organisms interact with each other and their environment.',
  BIOL140: 'Explains natural selection, genetic drift, speciation, and phylogenetics, and tests them against the fossil record and DNA sequences.',
  BIOL210: 'Grows, stains, and identifies bacteria in the lab, and covers archaea, viruses, fungi, pathogenesis, and how antibiotics work and fail.',
  BIOL220: 'Examines plankton, invertebrates, fish, and marine mammals, with coastal sampling in estuaries, salt marshes, and tide pools.',
  BIOL230: 'Covers photosynthesis, water transport, hormones, and development, and how plants respond to stress and season.',
  BIOL240: 'Traces innate and adaptive immunity through antigen recognition, antibodies, and T cells, and applies it to vaccines, allergy, and autoimmune disease.',
  BIOL310: 'Runs an independent experiment in a faculty lab for a year, and presents the results as a poster and a written thesis.',

  // --- Chemistry ---
  CHEM101: 'Balances equations, counts moles, and works through atomic structure, bonding, gases, and equilibrium, in a lab where yields rarely match the arithmetic.',
  CHEM110: 'Covers bonding, coordination complexes, and the descriptive chemistry of the main-group and transition elements.',
  CHEM120: 'Develops the structure, stereochemistry, and reaction mechanisms of carbon compounds, with synthesis and spectroscopy in the lab.',
  CHEM130: 'Teaches titration, chromatography, and electrochemical and spectroscopic analysis, with the statistics that say how far to trust a measurement.',
  CHEM140: 'Develops thermodynamics, kinetics, and quantum mechanics as they apply to molecules, with the mathematics each requires.',
  CHEM210: 'Examines proteins, enzymes, nucleic acids, and metabolism, and how the chemistry of the cell is regulated.',
  CHEM220: 'Solves molecular structures from NMR, infrared, and mass spectra, and from X-ray diffraction when a crystal can be grown.',
  CHEM230: 'Follows a drug from target and lead compound through structure-activity relationships to metabolism and dose.',
  CHEM240: 'Models molecules with quantum chemistry and molecular dynamics, and learns what each method can and cannot predict.',
  CHEM310: 'Joins a faculty research group to make or measure something new, keeps a notebook to the group\'s standard, and writes a thesis on the result.',

  // --- Physics ---
  PHYS101: 'Derives motion, force, energy, and momentum from Newton\'s laws, with lab work throughout.',
  PHYS110: 'Develops electric and magnetic fields, potentials, circuits, and induction, and ends with Maxwell\'s equations and the light waves they predict.',
  PHYS120: 'Covers oscillations, wave propagation, interference, diffraction, and polarization, from sound to lasers.',
  PHYS130: 'Introduces special relativity, the quantum, atomic structure, and nuclear physics, and the experiments that forced each.',
  PHYS140: 'Derives temperature, entropy, and the laws of thermodynamics from the statistics of many particles.',
  PHYS210: 'Develops the Schrödinger equation, operators, angular momentum, and spin, and applies them to atoms and simple systems.',
  PHYS220: 'Covers crystal structure, phonons, band theory, semiconductors, and superconductivity — the physics inside every device.',
  PHYS230: 'Applies gravity, nuclear physics, and radiation to stars and galaxies, and dates the universe by its microwave background.',
  PHYS240: 'Introduces the Standard Model of quarks, leptons, and forces, and how accelerators and detectors test it.',
  PHYS310: 'Repeats classic experiments such as Millikan\'s oil drop and the Franck-Hertz tube, then carries one question further in a written thesis.',

  // --- Environmental Science ---
  ENVS101: 'Surveys the carbon and water cycles, soils, biodiversity, and pollution, with a semester of sampling a local stream.',
  ENVS110: 'Traces energy and carbon through atmosphere, ocean, and land, and how those systems drive climate and its change.',
  ENVS120: 'Measures energy flow and nutrient cycling through forests, grasslands, and wetlands, with field and lab methods.',
  ENVS130: 'Follows pollutants through air, water, and soil, with the chemistry of acid rain, ozone, and contaminant fate.',
  ENVS140: 'Builds and analyzes spatial data layers, classifies satellite imagery, and produces a map that answers an environmental question.',
  ENVS210: 'Applies population genetics and landscape ecology to protecting species and habitats, with the policy and the trade-offs involved.',
  ENVS220: 'Covers the water cycle, watersheds, groundwater, and flooding, and how water is allocated among competing users.',
  ENVS230: 'Examines weather, air pollution, and climate dynamics, from radiation and cloud physics to numerical forecasting.',
  ENVS240: 'Analyzes the Clean Water Act, the Endangered Species Act, and NEPA, and plans the cleanup and replanting of a degraded site.',
  ENVS310: 'Studies a real watershed, wetland, or brownfield for a community partner as a team, and delivers the data and recommendations in a public report.',

  // --- Psychology ---
  PSYC101: 'Surveys perception, memory, learning, development, personality, and mental illness, and the experiments each finding rests on.',
  PSYC110: 'Traces cognitive, social, and emotional development from infancy to old age, and the studies that map each stage.',
  PSYC120: 'Examines attention, memory, language, and reasoning through the experiments that reveal how the mind processes information.',
  PSYC130: 'Classifies mental disorders by the DSM and weighs the evidence on the causes and treatment of anxiety, depression, and psychosis.',
  PSYC140: 'Designs experiments and surveys, analyzes their data, and confronts the replication problems of the field.',
  PSYC210: 'Studies conformity, persuasion, prejudice, and group behavior through the classic experiments and their modern retests.',
  PSYC220: 'Links behavior to the brain: neurotransmitters, hormones, sleep, and the effects of drugs and damage.',
  PSYC230: 'Applies psychology to selection, motivation, leadership, and team performance in the workplace.',
  PSYC240: 'Examines how stress, behavior, and belief affect illness and recovery, and the interventions that change them.',
  PSYC310: 'Designs, preregisters, and runs an original study with human participants, and reports it in the format a psychology journal requires.',

  // === Health Science ===

  // --- Public Health ---
  PHLT101: 'Compares two neighboring counties\' death rates and asks how income, housing and policy explain the gap.',
  PHLT110: 'Measures disease in populations with incidence, prevalence, and risk, and designs the cohort and case-control studies that find its causes.',
  PHLT120: 'Teaches descriptive statistics, confidence intervals, hypothesis tests, and simple regression on health data, enough to read a clinical trial\'s results.',
  PHLT130: 'Examines how health systems are financed, regulated, and run, and the policy choices behind coverage, cost, and access.',
  PHLT140: 'Covers air and water pollution, toxic chemicals, and foodborne illness, and the risk assessment and regulation that limit a population\'s exposure.',
  PHLT210: 'Examines disease burden, health systems, and interventions in low-income settings, from vaccination campaigns to maternal care.',
  PHLT220: 'Designs programs that change behavior — smoking, diet, screening — using behavioral theory and an evaluation of what worked.',
  PHLT230: 'Gathers and analyzes local health data with community partners, and turns it into ranked priorities and an improvement plan.',
  PHLT240: 'Tracks maternal and infant mortality, preterm birth, and childhood immunization, and the prenatal care, WIC, and Medicaid meant to improve them.',
  PHLT310: 'Works a semester with a health department or clinic on a live problem, and delivers the analysis and the program plan its staff asked for.',

  // --- Nursing ---
  NURS101: 'Covers a nurse\'s legal scope of practice and code of ethics, and the hand hygiene, vital signs, and charting that every shift begins with.',
  NURS110: 'Covers the structure and function of every organ system, with the lab dissection and the physiology a clinician draws on daily.',
  NURS120: 'Teaches drug classes, mechanisms, dosing, and interactions, and the safe administration of medication to patients.',
  NURS130: 'Trains history-taking and head-to-toe physical examination, with the documentation that turns findings into a care plan.',
  NURS140: 'Places students on hospital wards under supervision, giving basic nursing care to real patients for the first time.',
  NURS210: 'Manages adults on hospital wards with heart failure, diabetes, pneumonia, or a fresh surgical wound, the core of nursing practice and of its licensing examination.',
  NURS220: 'Cares for infants, children, and adolescents, with the growth, dosing, and family communication that differ from adult practice.',
  NURS230: 'Follows a pregnancy through prenatal visits, labor and delivery, and the first days at home, caring for mother and newborn as two patients at once.',
  NURS240: 'Builds a working relationship with patients in crisis, psychosis, or withdrawal, with the risk assessments and de-escalation an inpatient unit runs on.',
  NURS310: 'Runs a full patient load on a specialty unit under one preceptor for a term, and reviews for the licensing examination every graduate sits next.',

  // --- Nutrition ---
  NUTR101: 'Reads a food label line by line: the calories and protein first, then the vitamins whose shortfall still causes disease.',
  NUTR110: 'Follows carbohydrates, fats, and proteins from digestion through the metabolic pathways that store and burn them.',
  NUTR120: 'Matches nutrient needs to each life stage and its common shortfall: folate in pregnancy, iron in toddlers, protein in old age.',
  NUTR130: 'Plans menus and therapeutic diets, such as low-sodium, carbohydrate-controlled, and texture-modified, and documents each case in the nutrition care process.',
  NUTR140: 'Examines the chemistry, microbiology, and processing of food, from spoilage and preservation to what cooking does to it.',
  NUTR210: 'Fuels training and competition with energy, hydration, and timing strategies, and evaluates the supplements athletes take.',
  NUTR220: 'Addresses malnutrition and obesity at the population level, through food policy, school programs, and surveillance.',
  NUTR230: 'Manages nutrition in diabetes, kidney disease, cancer, and critical illness, including tube and intravenous feeding.',
  NUTR240: 'Assesses clients by anthropometric, biochemical, clinical, and dietary data, then counsels them by motivational interviewing in supervised sessions.',
  NUTR310: 'Plans and delivers nutrition care for patients and for a community program under registered dietitians, and presents one case in full.',

  // --- Pharmacy ---
  PHRM101: 'Introduces drug discovery, formulation, and the pharmacist\'s role in patient care.',
  PHRM110: 'Covers organ-system physiology with the emphasis a pharmacist needs, on the receptors and pathways that drugs act on.',
  PHRM120: 'Relates drug structure to activity, stability, and formulation, with the organic and analytical chemistry behind each.',
  PHRM130: 'Covers drug action on the nervous and cardiovascular systems: receptors, dose-response, and the agents used in each.',
  PHRM140: 'Designs dosage forms — tablets, injections, patches — and the kinetics of how a drug is absorbed, distributed, and cleared.',
  PHRM210: 'Extends drug action to infection, cancer, endocrine, and inflammatory disease, with toxicity and resistance.',
  PHRM220: 'Selects and monitors drug therapy for real patient cases, weighing evidence, interactions, and comorbidity.',
  PHRM230: 'Places students in a clinic to review medications, counsel patients, and advise prescribers under supervision.',
  PHRM240: 'Studies drug effects after approval through adverse-event reports and claims data, and the boxed warnings and withdrawals they prompt.',
  PHRM310: 'Runs a semester\'s project in a formulation or pharmacology lab, and presents the data as a drug company\'s project team would expect it.',

  // --- Kinesiology ---
  KINE101: 'Surveys human movement — anatomy, physiology, and mechanics — as one connected system.',
  KINE110: 'Studies muscles, bones, and joints as a system for movement, with palpation and the analysis of everyday and athletic motion.',
  KINE120: 'Measures how the heart, lungs, and muscles respond and adapt to exercise, in the lab with treadmill and metabolic testing.',
  KINE130: 'Applies mechanics to the body — forces, torques, and motion capture — from a golf swing to a fall.',
  KINE140: 'Examines how skills are acquired and coordinated by the nervous system, and how practice and feedback should be structured.',
  KINE210: 'Designs resistance and conditioning programs for athletes, with periodization, performance testing, and the coaching of lifting technique.',
  KINE220: 'Assesses and rehabilitates common sports injuries, from acute care and taping to return-to-play progressions.',
  KINE230: 'Screens clients for risk, runs graded exercise tests, and writes a program\'s frequency, intensity, time, and type to ACSM guidelines.',
  KINE240: 'Designs physical activity for people with disabilities and chronic conditions, with inclusion and safety as the starting points.',
  KINE310: 'Works a semester in a clinic, training room, or fitness program under a certified professional, and documents each client\'s progress.',

  // --- Neuroscience ---
  NEUR101: 'Follows a reflex, a memory and a decision from the neurons that carry them to the behavior they produce.',
  NEUR110: 'Maps the structures of the brain and spinal cord, their connections, and what damage to each does, with brain dissection in the lab.',
  NEUR120: 'Covers ion channels, action potentials, synaptic transmission, and the molecular machinery of the neuron.',
  NEUR130: 'Links perception, memory, language, and decision-making to brain systems, through imaging, lesion, and recording studies.',
  NEUR140: 'Records and analyzes electrical activity at three scales: the patch-clamped single cell, the circuit, and the scalp EEG.',
  NEUR210: 'Examines how drugs act on neurotransmitter systems, in the treatment of disorders and in addiction.',
  NEUR220: 'Traces how the nervous system is built, from neural induction and axon guidance to synapse formation and plasticity.',
  NEUR230: 'Models neurons and networks mathematically, from the Hodgkin-Huxley equations to learning rules and neural coding.',
  NEUR240: 'Examines stroke, epilepsy, Parkinson\'s, Alzheimer\'s, and psychiatric illness at the level of mechanism and treatment.',
  NEUR310: 'Carries an independent question through a faculty lab\'s recordings, imaging, or models, and defends the result as a thesis.',

  // === Computer Science ===

  // --- Computer Science ---
  COMP101: 'Writes small programs that read, loop and decide, and learns to find its own bugs before a grader does.',
  COMP110: 'Implements lists, stacks, trees, hash tables, and graphs, and analyzes which one a problem needs and at what cost.',
  COMP120: 'Designs and analyzes algorithms — sorting, graph search, dynamic programming, greedy methods — with proofs of correctness and running time.',
  COMP130: 'Explains what an operating system does for a program — processes, scheduling, virtual memory, files — and writes concurrent code that uses it.',
  COMP140: 'Covers instruction sets, pipelining, caches, and the memory hierarchy, and how hardware decides what software runs fast.',
  COMP210: 'Writes a compiler from lexing and parsing through type checking, optimization, and code generation for a real target.',
  COMP220: 'Builds a playable game as a team, with a rendering loop, physics, input, and the design iteration that makes it fun.',
  COMP230: 'Programs multicore, GPU, and distributed systems with threads and message passing, and measures the speedup actually obtained.',
  COMP240: 'Ships a full-stack web application to outside users, with authentication, caching, load testing, and the attacks a public site has to withstand.',
  COMP310: 'Pursues one research question with a faculty adviser, reads its literature, runs the experiments it needs, and writes the result up as a thesis.',

  // --- Data Science ---
  DATA101: 'Takes a messy public dataset from download to a first chart, cleaning and questioning it at every step.',
  DATA110: 'Fits linear and generalized linear models, checks their assumptions, and reads what the coefficients do and do not claim.',
  DATA120: 'Trains and evaluates supervised and unsupervised models — regression, trees, clustering, neural networks — with the bias-variance trade-off throughout.',
  DATA130: 'Designs charts and interactive graphics that make a dataset\'s structure legible, and learns what makes a visualization mislead.',
  DATA140: 'Finds patterns in large datasets with association rules, clustering, and anomaly detection, and validates that they are real.',
  DATA210: 'Splits storage and computation across a cluster, and decides when a batch job, a stream, or one large server is the cheaper way to an answer.',
  DATA220: 'Models trend, seasonality, and autocorrelation with ARIMA and state-space methods, and forecasts with honest uncertainty.',
  DATA230: 'Builds systems that parse, classify, and generate text, from n-grams to transformer language models.',
  DATA240: 'Starts from a prior belief, updates it with data by the rules of probability, and lets small groups such as counties borrow strength from one another.',
  DATA310: 'Answers a partner organization\'s question with its own data, cleaned, modeled, and explained to managers who never asked for a p-value.',

  // --- Cybersecurity ---
  CYBR101: 'Surveys who attacks computer systems and why, and the plain controls — patching, backups, least privilege — that stop most attacks.',
  CYBR110: 'Secures networks with firewalls, intrusion detection, VPNs, and protocol hardening, against attacks run in a lab.',
  CYBR120: 'Covers symmetric and public-key ciphers, hashes, signatures, and protocols, and how sound mathematics still fails in careless code.',
  CYBR130: 'Runs authorized penetration tests — reconnaissance, exploitation, privilege escalation — and writes the report that makes the findings fixable.',
  CYBR140: 'Runs a security operations center: log analysis, monitoring, incident response, and the playbooks for when something gets through.',
  CYBR210: 'Secures identity, storage, networking, and workloads on public cloud platforms, where a misconfiguration is the usual cause of a breach.',
  CYBR220: 'Acquires and analyzes evidence from disks, memory, and networks in a way that holds up in court.',
  CYBR230: 'Assesses threats, vulnerabilities, and impact to prioritize controls, and maps them to the compliance frameworks an organization is audited against.',
  CYBR240: 'Finds vulnerabilities in code with static analysis, fuzzing, and code review, and builds the practices that keep them out.',
  CYBR310: 'Defends a simulated company network against a live attacking team for a term, and writes the incident reports and the remediation plan.',

  // --- Software Engineering ---
  SOFT101: 'Writes small programs in a team, with version control, code review, and tests, and ships one against a written requirement.',
  SOFT110: 'Elicits, specifies, and validates what a system must do, with stakeholders who disagree and needs that change.',
  SOFT120: 'Designs unit, integration, and system tests, automates them, and measures coverage and defect rates as a quality process.',
  SOFT130: 'Designs relational schemas, writes SQL, and covers transactions, indexing, and the guarantees a database makes or does not.',
  SOFT140: 'Applies design patterns, SOLID principles, and refactoring to build systems that survive being changed.',
  SOFT210: 'Runs a project in sprints with a product backlog, stand-ups, and retrospectives, and examines what agile fixes and what it hides.',
  SOFT220: 'Builds native apps for phones, with touch interfaces, offline data, sensors, and the constraints of battery and screen.',
  SOFT230: 'Designs interfaces from user research and prototypes through usability testing, with accessibility as a requirement rather than an afterthought.',
  SOFT240: 'Automates build, test, and deployment pipelines with containers, infrastructure as code, and monitoring, so that releases become routine.',
  SOFT310: 'Delivers a working product for a real client as a team, through requirements, sprints, and testing, to a release the client runs.',

  // --- Artificial Intelligence ---
  ARTF101: 'Surveys search, logic, probabilistic reasoning, and learning from data, and the two funding winters that followed when the field overpromised.',
  ARTF110: 'Implements search, constraint satisfaction, and probabilistic reasoning in code — the classical toolkit under modern systems.',
  ARTF120: 'Encodes facts and rules in logics and ontologies, reasons over them with inference engines, and finds where those give out.',
  ARTF130: 'Builds and trains multilayer networks from backpropagation up, with the optimization and regularization that make them learn.',
  ARTF140: 'Fits and compares the workhorse methods of machine learning — decision trees, random forests, boosting — and judges each on data it has not seen.',
  ARTF210: 'Trains convolutional, recurrent, and transformer networks at scale, where the hard part is feeding the GPUs and keeping a week-long run alive.',
  ARTF220: 'Gives a robot senses and plans — localization, mapping, motion planning, and control — on real hardware.',
  ARTF230: 'Finds, outlines, and names objects in images and video, first with hand-built features and then with the deep networks that replaced them.',
  ARTF240: 'Examines bias, accountability, surveillance, and labor displacement in deployed AI, and the governance proposed for it.',
  ARTF310: 'Builds and evaluates an AI system for a real task, with the baseline it must beat and an audit of where it fails and whom that harms.',

  // --- Information Systems ---
  INFO101: 'Walks one order through the systems a firm runs on — web store, database, warehouse software, general ledger — and asks who owns each.',
  INFO110: 'Models an organization\'s processes and data, and specifies the information system that would serve them, with the stakeholders in the room.',
  INFO120: 'Administers databases in production — schema changes, query tuning, backup, security — and weighs when a non-relational store earns its place.',
  INFO130: 'Configures an enterprise system across finance, supply chain, and HR, and studies why so many implementations overrun.',
  INFO140: 'Covers servers, networks, virtualization, and cloud services, and how an organization provisions, secures, and pays for them.',
  INFO210: 'Maps and redesigns workflows with process notation and simulation, and counts the handoffs and waiting time a redesign removes.',
  INFO220: 'Analyzes online business models, platforms, payments, and logistics, and what makes a digital marketplace defensible.',
  INFO230: 'Builds an organization\'s security program: policy, risk assessment, awareness, and governance under regulation.',
  INFO240: 'Designs dimensional models and ETL pipelines that feed analytics and reporting, and keeps the numbers consistent across them.',
  INFO310: 'Scopes, budgets, and manages an information-systems project for a partner organization, and sees it through rollout and the training of its users.',
};

// One authored sentence per graduate course (Plan 72C), under the same
// rules. The entry course of each program also carries its gate, composed
// in techData.ts from the seed, so the sentence and the rule cannot
// disagree.
export const GRADUATE_COURSE_DESCRIPTIONS: Record<string, string> = {
  // --- School of Medicine (MD) ---
  MED501: 'Opens medical training with the body as a system, from cell to organ, and with the history, examination, and patient interview every later year builds on.',
  MED510: 'Works through dissection alongside the microscope, so students learn each structure both where it lies and what its tissue is made of.',
  MED520: 'Pairs each disease\'s mechanism with the drugs that interrupt it, so dosing, interactions, and side effects are learned with the illness they treat.',
  MED530: 'Localizes lesions from the bedside examination, then confirms them with imaging, across stroke, seizure, dementia, and disorders of movement.',
  MED540: 'Teaches students to read a trial critically, weigh screening and prevention across a population, and decide when the evidence should change practice.',
  MED550: 'Compares how countries pay for, staff, and ration health care, and why outcomes differ so widely between systems that spend alike.',
  MED560: 'Covers how the immune system recognizes and remembers a threat, how pathogens evade it, and how vaccines and antimicrobials tip the balance.',
  MED570: 'Reads inheritance and the genome clinically, through family pedigrees, carrier screening, and exome sequencing, and the counseling each result requires.',
  MED580: 'Diagnoses and treats mental illness alongside the behaviors, from sleep to substance use, that shape every other illness a patient has.',
  MED590: 'Prepares students for the operating room, from consent and sterile technique to anesthesia, wound healing, and the complications of the days after.',
  MED600: 'Readies students for the wards with note-writing, case presentations, and handoffs, the skills every clerkship after it assumes.',
  MED610: 'Rotates students through internal medicine, pediatrics, obstetrics and gynecology, and family medicine, then gives them patients of their own as sub-interns.',

  // --- School of Law (JD) ---
  LAWS501: 'Introduces the sources of American law, how courts reason from precedent, and the legal writing and case briefing every later class assumes.',
  LAWS510: 'Covers when a promise binds and what breaking it costs, and when an act, whether intentional, careless, or merely dangerous, becomes a wrong.',
  LAWS520: 'Follows a lawsuit from the complaint through discovery and trial, and the rules that decide which facts a jury is ever allowed to hear.',
  LAWS530: 'Turns the Commerce Clause, due process, and equal protection into tests a brief applies, and argues the cases as counsel did before the Court.',
  LAWS540: 'Works through the rules of professional conduct on conflicts, confidentiality, and candor to the court, and the cases where a lawyer\'s duty to a client meets the duty to the law.',
  LAWS550: 'Covers ownership, leases, easements, and land use, and the title searches, mortgages, and closings that move real estate between hands.',
  LAWS560: 'Examines what makes conduct a crime and the constitutional limits on search, interrogation, and trial that bind the state in proving it.',
  LAWS570: 'Puts students in front of real clients under supervision, drafting, negotiating, and appearing in court on cases the college takes on.',

  // --- Graduate School of Business (MBA) ---
  MBAX501: 'Grounds the MBA in accounting, economics, and organizational behavior, so students from any background share one working vocabulary.',
  MBAX510: 'Values companies and projects the way investors do, and decides how a firm should raise money, spend it, and return it to shareholders.',
  MBAX520: 'Chooses which customers to serve and how to win them against rivals, from segmentation and positioning to pricing and brand.',
  MBAX530: 'Models supply chains, queues, and capacity, and uses data to decide where a business should cut waste and where it should add slack.',
  MBAX540: 'Sends student teams to advise a real organization on a live problem, ending in recommendations presented to its leadership.',

  // --- Doctoral Program in Engineering (PhD) ---
  PHDE701: 'Prepares doctoral students to frame a research question, design experiments and simulations to answer it, and defend the result to peers.',
  PHDE710: 'Derives the mechanics of solids and fluids from first principles, and applies them to structures and materials at the limits of design.',
  PHDE720: 'Treats wave propagation, antennas, and electromagnetic compatibility at research depth, with papers from the field presented each week.',
  PHDE730: 'Registers the candidate each term until the experiments are done, the chapters are written, and the committee signs off.',

  // --- Doctoral Program in the Natural Sciences (PhD) ---
  PHDS701: 'Covers experimental design, statistics, and the ethics of research that every doctoral scientist needs before starting a laboratory project.',
  PHDS710: 'Builds quantum mechanics and statistical physics to the level where current research papers in either field can be read and extended.',
  PHDS720: 'Plans multistep syntheses and proves what was made, with spectroscopy and crystallography read directly from the instruments.',
  PHDS730: 'Ends in a public defense and the graduate school\'s acceptance of the final copy, after however many years the research takes.',

  // --- Doctoral Program in Health Science (PhD) ---
  PHDH701: 'Trains doctoral students in study design, biostatistics, and research ethics for work that involves patients and populations.',
  PHDH710: 'Presents and critiques current papers on the circuits behind cognition, weighing what imaging, optogenetics, and population recording can each show about cause.',
  PHDH720: 'Carries a finding from the laboratory into a clinical trial, with the regulatory, statistical, and ethical steps between the two.',
  PHDH730: 'Takes a question of the student\'s own through a proposal, data collection, and three publishable papers to the final defense.',

  // --- Doctoral Program in Computing (PhD) ---
  PHDC701: 'Prepares doctoral students to read the literature, run reproducible experiments, and write papers that computing conferences will accept.',
  PHDC710: 'Studies what can be learned from data and how fast, with the generalization bounds and optimization results behind modern machine learning.',
  PHDC720: 'Covers computability, complexity classes, and the limits they set on what any algorithm, however clever, can ever achieve.',
  PHDC730: 'Turns a series of peer-reviewed conference papers into a dissertation, with the experiments rerun until a committee is satisfied.',

  // --- Doctoral Program in the Humanities (PhD) ---
  PHDL701: 'Trains doctoral students in archives, close reading, and the conventions of scholarly argument across the humanities.',
  PHDL710: 'Reads Derrida, Foucault, and Spivak whole rather than in excerpt, and the affective and ecological turns that have since argued with them.',
  PHDL720: 'Works through the classic and current theories of how societies hold together, change, and divide, from Durkheim to the present.',
  PHDL730: 'Supports the dissertation itself: a book-length work of original humanities scholarship, defended before a committee.',

  // --- Doctoral Program in Economics (PhD) ---
  PHDB701: 'Covers the econometrics, identification strategies, and data work that doctoral research in economics is judged on.',
  PHDB710: 'Builds consumer, producer, and general-equilibrium theory with the mathematics used in current research, from game theory to mechanism design.',
  PHDB720: 'Reads current research on asset pricing, corporate finance, and financial crises, and presents it to the seminar each week.',
  PHDB730: 'Assembles three original papers into a dissertation, and sends the strongest out as the job-market paper a candidate presents at every interview.',

  // --- Master of Fine Arts (MFA) ---
  MFAX701: 'Gives each artist a studio of their own and a weekly critique, where the work is made, shown, and argued over by peers and faculty.',
  MFAX710: 'Critiques a new manuscript from each writer every few weeks, alongside craft reading chosen for what that writer\'s work is attempting.',
  MFAX720: 'Brings new scores before performers and peers each week, from the first sketch to a finished work ready for the concert hall.',
  MFAX730: 'Culminates the degree in a public exhibition, performance, or publication, mounted by the student and reviewed by the faculty.',
};
