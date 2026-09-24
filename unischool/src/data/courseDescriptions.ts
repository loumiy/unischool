// One authored sentence per undergraduate course, keyed by course id and
// read by techData.ts's initialTech(). test/course-descriptions.test.ts
// requires a row for every undergraduate course. Graduate courses keep their
// generated line in techData.ts.
//
// Rules: one present-tense sentence, no course code, no "this course", and
// it must say something the title does not.
//
// Grouped by school, then major in seed order, then course number.

export const COURSE_DESCRIPTIONS: Record<string, string> = {
  // === Business ===

  // --- Finance ---
  FINA101: 'Introduces time value of money, risk, and the core tools of personal and corporate finance.',
  FINA110: 'Works through capital budgeting, cost of capital, and the financing and payout decisions a firm makes to create value.',
  FINA120: 'Values stocks and bonds, builds portfolios under the trade-off between risk and return, and tests whether markets price either correctly.',
  FINA130: 'Builds three-statement, discounted cash flow, and scenario models in spreadsheets, with the sensitivity tests that show where a valuation breaks.',
  FINA140: 'Covers exchange rates, currency risk and hedging, and how firms raise and move capital across borders.',
  FINA210: 'Analyses mortgages, property valuation, and development pro formas, from a single rental to a securitised pool of loans.',
  FINA220: 'Examines payments, lending platforms, and distributed ledgers, and asks which of them changes finance and which only re-plumbs it.',
  FINA230: 'Measures market, credit, and operational risk with value-at-risk and stress tests, and hedges it with derivatives.',
  FINA240: 'Traces how overconfidence, loss aversion, and herding move prices away from what rational models predict, and what that leaves for arbitrage.',

  // --- Accounting ---
  ACCT101: 'Covers the accounting cycle, financial statements, and the language of business record-keeping.',
  ACCT110: 'Prepares and reads the balance sheet, income statement, and cash-flow statement under the standards that govern external reporting.',
  ACCT120: 'Turns cost data into decisions — budgeting, break-even analysis, variance reports, and pricing — for the people who run the business.',
  ACCT130: 'Covers how income, deductions, and credits are computed for individuals and businesses, and how tax planning changes a decision.',
  ACCT140: 'Teaches how an auditor gathers evidence, tests internal controls, and decides whether a set of accounts can be relied on.',
  ACCT210: 'Follows money through fraud schemes, asset tracing, and litigation support, using the accounting record as evidence.',
  ACCT220: 'Handles the hard cases in external reporting: consolidations, leases, pensions, foreign currency, and financial instruments.',
  ACCT230: 'Designs costing systems for complex operations, from activity-based costing to transfer prices and the performance measures they distort.',
  ACCT240: 'Examines how transactions flow through enterprise software, the controls built into that flow, and where it fails.',

  // --- Marketing ---
  MRKT101: 'Surveys the marketing mix — product, price, place, and promotion — through real brand cases.',
  MRKT110: 'Draws on psychology and economics to explain how people notice, evaluate, and choose products, and how habit and context override both.',
  MRKT120: 'Designs surveys, focus groups, and experiments, and turns their data into estimates a marketing decision can rest on.',
  MRKT130: 'Plans search, social, email, and paid campaigns around the funnel, and measures them with attribution rather than impressions.',
  MRKT140: 'Builds and defends a brand as an asset: positioning, identity, extensions, and the valuation of what the name is worth.',
  MRKT210: 'Applies sponsorship, ticketing, media rights, and fan engagement to teams, leagues, and the athletes who front them.',
  MRKT220: 'Develops creative briefs, media plans, and promotional offers, and evaluates a campaign against the behaviour it set out to change.',
  MRKT230: 'Organises a sales force — territories, quotas, compensation, pipeline forecasting — and the coaching that lifts a team\'s close rate.',
  MRKT240: 'Adapts product, price, and message across cultures, currencies, and regulators, and decides when to standardise and when to localise.',

  // --- Economics ---
  ECON101: 'Examines how individuals and firms make decisions under scarcity, from supply and demand to market structure.',
  ECON110: 'Models output, unemployment, inflation, and growth for a whole economy, and what monetary and fiscal policy can do about them.',
  ECON120: 'Estimates economic relationships from data with regression, and confronts the endogeneity and identification problems that make a causal claim hard.',
  ECON130: 'Formalises consumer and producer theory, general equilibrium, and market failure with the calculus the introductory course left out.',
  ECON140: 'Reads the industrial revolution, the great depression, and the post-war boom as tests of economic theory rather than as a chronicle.',
  ECON210: 'Replaces the rational agent with the one experiments find, and works out what bounded rationality and present bias do to markets and policy.',
  ECON220: 'Analyses taxation, public spending, and debt: who bears a tax, what a public good is worth, and when redistribution costs efficiency.',
  ECON230: 'Solves strategic interaction with Nash equilibrium, backward induction, and signalling, from auctions to arms races.',
  ECON240: 'Prices pollution, climate damage, and natural resources, and compares taxes, permits, and regulation as ways of paying for them.',

  // --- Management ---
  MGMT101: 'Introduces leadership styles, team dynamics, and the fundamentals of managing people.',
  MGMT110: 'Covers recruiting, compensation, performance review, and employment law, and how each shapes who stays and how they work.',
  MGMT120: 'Designs the processes that make and deliver things: capacity, scheduling, quality, and the bottlenecks that set throughput.',
  MGMT130: 'Tests corporate decisions against moral frameworks, stakeholder claims, and the cases where the law permitted what the public would not.',
  MGMT140: 'Analyses industries and competitive position, and builds a strategy a firm can sustain once its rivals respond to it.',
  MGMT210: 'Plans scope, schedule, budget, and risk with work breakdowns and critical paths, and steers a project as those plans meet reality.',
  MGMT220: 'Takes an idea through customer discovery, business models, and fundraising to a launch, with the failure modes of each stage.',
  MGMT230: 'Diagnoses workplace disputes and applies mediation, interest-based bargaining, and structured processes to settle them.',
  MGMT240: 'Prepares, conducts, and reviews negotiations through live simulations, from distributive haggling to multi-party deals with hidden interests.',

  // --- Supply Chain & Operations ---
  SPCO101: 'Traces how goods move from raw material to customer, and where supply chains break down.',
  SPCO110: 'Plans warehousing, transport modes, and delivery networks, and trades off inventory against speed and cost.',
  SPCO120: 'Selects and manages suppliers, negotiates contracts, and weighs total cost of ownership against price, risk, and ethics.',
  SPCO130: 'Applies statistical process control, six sigma, and root-cause analysis to keep defects out of a product before inspection finds them.',
  SPCO140: 'Forecasts what customers will order from history, promotions, and market signals, and reconciles the forecast with what operations can supply.',
  SPCO210: 'Manages sourcing and distribution across borders: tariffs, currency, lead times, and the resilience a shock like a port closure demands.',
  SPCO220: 'Sets reorder points, safety stock, and replenishment policies, and tunes them for demand that is uncertain and lead times that slip.',
  SPCO230: 'Applies optimisation, simulation, and forecasting models to routing, scheduling, and stock decisions, using real operational data.',
  SPCO240: 'Plans carrier selection, fleet routing, and freight contracts across road, rail, sea, and air, under regulation and fuel cost.',

  // === Engineering ===

  // --- Mechanical Engineering ---
  MECH101: 'Introduces the design process, sketching, and basic mechanical systems.',
  MECH110: 'Analyses forces and moments on bodies at rest and in motion, from trusses and frames to particles and rigid bodies under acceleration.',
  MECH120: 'Applies the first and second laws to engines, refrigerators, and power cycles, with property tables and the entropy budget of each.',
  MECH130: 'Covers pressure, viscosity, and flow in pipes and around bodies, from Bernoulli and the Navier-Stokes equations to boundary layers and drag.',
  MECH140: 'Relates the structure of metals, polymers, ceramics, and composites to their strength, failure, and processing.',
  MECH210: 'Designs manipulators and mobile robots: kinematics, actuators, sensors, and the control loops that make them move where intended.',
  MECH220: 'Sizes heating, ventilation, and cooling for real buildings, from load calculations, psychrometrics, and equipment selection to the energy codes.',
  MECH230: 'Analyses spark- and compression-ignition cycles, combustion, and emissions, and tunes a real engine on a dynamometer.',
  MECH240: 'Formulates and solves stress, thermal, and vibration problems numerically, and learns when a converged result is still wrong.',

  // --- Electrical Engineering ---
  ELEC101: 'Covers voltage, current, and resistance through hands-on circuit analysis and lab work.',
  ELEC110: 'Designs combinational and sequential circuits from gates and flip-flops, and builds them on programmable hardware.',
  ELEC120: 'Analyses continuous and discrete signals with Fourier, Laplace, and z-transforms, and the linear systems that filter them.',
  ELEC130: 'Develops Maxwell\'s equations for static and time-varying fields, transmission lines, and waves, with the antennas and waveguides they explain.',
  ELEC140: 'Analyses and designs diode, transistor, and amplifier circuits, from device physics to biasing and small-signal models.',
  ELEC210: 'Models generation, transmission, and load flow in the electrical grid, with fault analysis and the stability of the network.',
  ELEC220: 'Covers modulation, coding, fading channels, and multiple access, from cellular networks to the link budget of a single radio.',
  ELEC230: 'Designs feedback controllers with root locus, frequency response, and state space, and tunes them for stability and performance on real plants.',
  ELEC240: 'Lays out digital circuits in CMOS from transistor to chip, with timing, power, and the design flow that gets a chip fabricated.',

  // --- Chemical Engineering ---
  CHEM101: 'Introduces the chemical process industries and the unit operations, flows, and conversions that run them.',
  CHEM110: 'Applies phase equilibria, chemical equilibrium, and solution thermodynamics to the separations and reactions a plant depends on.',
  CHEM120: 'Covers momentum, heat, and mass transfer in process equipment, from pipe flow and pumps to heat exchangers and diffusion.',
  CHEM130: 'Accounts for every stream into and out of a process, with recycle, purge, and reaction — the bookkeeping every plant design starts with.',
  CHEM140: 'Sizes batch, stirred, and tubular reactors from kinetics and residence time, with heat effects and catalysis.',
  CHEM210: 'Analyses hazards, relief systems, and layers of protection with HAZOP studies and the case histories of plant disasters, so a design fails safely.',
  CHEM220: 'Engineers fermentation, enzyme reactors, and downstream purification to make pharmaceuticals and fuels from living cells.',
  CHEM230: 'Covers polymerisation, molecular weight, and the viscoelastic behaviour of plastics, with the processing that shapes them.',
  CHEM240: 'Evaluates biofuels, hydrogen, carbon capture, and electrochemical storage on efficiency, cost, and life-cycle emissions.',

  // --- Civil Engineering ---
  CIVE101: 'Covers forces in equilibrium, free-body diagrams, and load paths, the physical foundation for structural and civil design.',
  CIVE110: 'Determines forces and deflections in beams, trusses, and frames, determinate and indeterminate, by hand and by matrix methods.',
  CIVE120: 'Covers soil classification, seepage, consolidation, and shear strength — the ground properties a foundation design rests on.',
  CIVE130: 'Relates loads to stress, strain, and deformation in bars, shafts, and beams, up to buckling and combined loading.',
  CIVE140: 'Designs roads, intersections, and transit systems from traffic flow, capacity analysis, and geometric standards.',
  CIVE210: 'Designs a bridge from concept through loads, girders, bearings, and substructure to the code checks a real span must pass.',
  CIVE220: 'Assesses the effects of a proposed project on air, water, land, and communities, and writes the statement regulators require.',
  CIVE230: 'Plans a construction project — estimating, scheduling, contracts, procurement, and safety — on a site with weather and subcontractors.',
  CIVE240: 'Covers land use, zoning, transport, and housing, and how planning decisions shape a city over decades.',

  // --- Industrial Engineering ---
  INDE101: 'Introduces systems thinking for analyzing and improving industrial processes.',
  INDE110: 'Schedules materials, machines, and people to meet demand, with MRP, capacity planning, and the trade-off between inventory and lead time.',
  INDE120: 'Designs workstations, tools, and tasks around the human body, with the hazard analysis that keeps a workplace from injuring it.',
  INDE130: 'Applies control charts, sampling plans, and process capability to detect drift before it becomes defects.',
  INDE140: 'Lays out plants and warehouses for material flow, with location analysis and the space each operation needs.',
  INDE210: 'Builds discrete-event models of factories, hospitals, and queues, and runs experiments on them that would be too costly in real life.',
  INDE220: 'Optimises network design, inventory, and sourcing with mathematical programming and data from a real supply chain.',
  INDE230: 'Applies value-stream mapping, pull systems, and continuous improvement to take the waste out of a production line.',
  INDE240: 'Models failure with life distributions and fault trees, and designs maintenance and redundancy for systems that must not stop.',

  // --- Aerospace Engineering ---
  AERO101: 'Covers the forces of flight — lift, drag, thrust, and weight — and how aircraft respond to them.',
  AERO110: 'Analyses lift and drag on airfoils and wings from potential flow to compressibility, with wind-tunnel measurements to check the theory.',
  AERO120: 'Computes range, endurance, climb, and take-off and landing distances from an aircraft\'s thrust, drag, and weight.',
  AERO130: 'Covers chemical rockets, electric thrusters, and the rocket equation, with nozzle design and propellant choice.',
  AERO140: 'Analyses thin-walled beams, stressed skins, and composites under flight loads, with fatigue and the margins certification demands.',
  AERO210: 'Solves two-body orbits, transfers, and rendezvous, and plans interplanetary trajectories with gravity assists.',
  AERO220: 'Designs, builds, and flies a sounding rocket as a team, from motor selection and stability to recovery and flight data.',
  AERO230: 'Takes an aircraft from mission requirements through sizing, configuration, and trade studies to a preliminary design review.',
  AERO240: 'Designs and operates drones — airframes, autopilots, sensors — and the regulations that govern where they can fly.',

  // === Arts & Media ===

  // --- Media Studies ---
  MDIA101: 'Surveys how mass media shapes public opinion, culture, and information flow.',
  MDIA110: 'Reads the major theories of media effects and meaning, from propaganda models to audience reception, against what the evidence supports.',
  MDIA120: 'Compares how press freedom, ownership, and public broadcasting differ across countries, and what each arrangement does to the news.',
  MDIA130: 'Examines how platforms, algorithms, and participatory media reshape identity, community, and the public sphere.',
  MDIA140: 'Works through privacy, deception, harm, and conflict of interest in journalism and entertainment, case by case.',
  MDIA210: 'Follows a film from development finance through distribution windows and marketing, and how streaming rewrote the economics.',
  MDIA220: 'Measures reach, sentiment, and network spread across platforms, and separates a real audience signal from bots and vanity metrics.',
  MDIA230: 'Shoots, edits, and captions news photographs under deadline, with the ethics of staging, cropping, and consent.',
  MDIA240: 'Manages an organisation\'s reputation through media relations, crisis response, and campaigns, and measures what the coverage did.',

  // --- Graphic Design ---
  GRDS101: 'Introduces composition, color, and layout as tools for communicating visually.',
  GRDS110: 'Sets type with attention to letterform, hierarchy, spacing, and grid, from a single word mark to a running text page.',
  GRDS120: 'Edits and composes raster and vector images for print and screen, with colour management and resolution handled correctly.',
  GRDS130: 'Arranges type and image on the page and the screen using grids, hierarchy, and white space, for editorial and advertising work.',
  GRDS140: 'Develops logos, identity systems, and brand guidelines, and tests them across the applications a client will actually use.',
  GRDS210: 'Designs responsive interfaces in HTML and CSS with attention to navigation, accessibility, and performance on real devices.',
  GRDS220: 'Animates type and graphics for title sequences, explainers, and broadcast, using timing and easing to carry meaning.',
  GRDS230: 'Develops a personal visual language through editorial, book, and concept illustration in traditional and digital media.',
  GRDS240: 'Designs a complete magazine or book, from pacing and typographic system through the cover to press-ready files.',

  // --- Creative Writing ---
  CRWR101: 'Workshops short fiction and poetry to build a foundational creative practice.',
  CRWR110: 'Drafts and revises short stories under group critique, with close attention to point of view, scene, and structure.',
  CRWR120: 'Writes in received and open forms, revising for image, line, and sound under weekly critique.',
  CRWR130: 'Writes memoir, essay, and reportage, and works out the obligations to fact and to other people that fiction does not carry.',
  CRWR140: 'Edits other writers\' manuscripts at the line and the structural level, and produces a small literary magazine from submission to print.',
  CRWR210: 'Writes a feature-length screenplay in industry format, from logline and outline through three-act structure and dialogue.',
  CRWR220: 'Writes for the stage, where everything must be said or done in the room, and hears the drafts read aloud by actors.',
  CRWR230: 'Plans and drafts the opening of a novel, sustaining character and plot across a length the short story never asks for.',
  CRWR240: 'Completes a polished manuscript in the writer\'s chosen genre, alongside the craft reading and the query letter to send with it.',

  // --- Music ---
  MUSC101: 'Covers notation, scales, and harmony, the building blocks of Western music.',
  MUSC110: 'Extends harmony into chromaticism, modulation, and form, analysing sonatas and songs from the score.',
  MUSC120: 'Traces Western art music from chant through the classical and romantic eras to the twentieth century, by listening.',
  MUSC130: 'Writes short pieces for solo instruments and small ensembles, and hears them performed and critiqued.',
  MUSC140: 'Gives weekly private lessons on the student\'s instrument or voice, building technique and repertoire toward a juried performance.',
  MUSC210: 'Improvises over standards and blues forms, learning chord-scale relationships, voicings, and the vocabulary of the tradition by ear.',
  MUSC220: 'Studies musical traditions from West Africa, India, Indonesia, and the Andes through performance as well as listening.',
  MUSC230: 'Records, mixes, and produces music in a digital audio workstation, with synthesis, sampling, and live electronics.',
  MUSC240: 'Composes an extended work for larger forces, orchestrated and rehearsed toward a public premiere.',

  // --- Film ---
  FILM101: 'Teaches close reading of cinema through shot composition, editing, and narrative structure.',
  FILM110: 'Teaches lighting, lenses, exposure, and camera movement on set, and how each choice shapes what an audience feels.',
  FILM120: 'Develops short scripts through outline, draft, and table read, with structure and dialogue revised under critique.',
  FILM130: 'Takes a short film from pre-production through the shoot as a crew, rotating through the roles a set depends on.',
  FILM140: 'Works with actors, blocks scenes, and translates a script into shot lists, with the director\'s decisions tested on set.',
  FILM210: 'Researches, shoots, and edits a nonfiction film, negotiating access, consent, and the line between observing and staging.',
  FILM220: 'Surveys national cinemas and movements from silent film to the present, from Soviet montage to the new waves and beyond.',
  FILM230: 'Records dialogue, builds effects and ambience, and mixes them into a soundtrack that does half the storytelling.',
  FILM240: 'Edits, colour-grades, and finishes a film to delivery, with the workflow and versioning a real release requires.',

  // --- Studio Art ---
  SART101: 'Introduces line, shape, and composition through studio exercises in two-dimensional art.',
  SART110: 'Builds observational skill in line, value, and proportion from still life and the figure, in charcoal, graphite, and ink.',
  SART120: 'Works in oil and acrylic on colour mixing, surface, and composition, from studies to sustained canvases.',
  SART130: 'Builds in clay, plaster, wood, and found material, and learns what changes when a work occupies space rather than a wall.',
  SART140: 'Surveys art and architecture from the ancient world to the present, and how to read a work in its period and context.',
  SART210: 'Covers relief, intaglio, and screen printing, from plate and stencil to the edition.',
  SART220: 'Throws and hand-builds vessels and sculptural forms, and fires and glazes them with an understanding of the chemistry involved.',
  SART230: 'Shoots, develops, and prints in the darkroom and the digital lab, with the history of the medium alongside the technique.',
  SART240: 'Makes work in generative code, 3D modelling, video, and interactive media, exhibited on screens rather than paper.',

  // === Social Sciences & Humanities ===

  // --- English ---
  ENGL101: 'Introduces close reading and literary analysis across poetry, fiction, and drama.',
  ENGL110: 'Reads major British writers from Beowulf and Chaucer through the Romantics and Victorians to the twentieth century.',
  ENGL120: 'Reads American writing from the colonial period through the nineteenth century to modernism and after, in its historical argument.',
  ENGL130: 'Introduces the schools of criticism — formalist, Marxist, psychoanalytic, feminist, postcolonial — and puts each to work on a text.',
  ENGL140: 'Builds argumentative and research writing for an academic audience, with sustained revision and attention to style.',
  ENGL210: 'Reads a dozen plays across comedy, history, and tragedy, with attention to staging, language, and the texts\' unsettled histories.',
  ENGL220: 'Reads Dryden, Swift, Pope, and the rise of the novel in a century of coffeehouses, satire, and print.',
  ENGL230: 'Reads writing from Africa, South Asia, and the Caribbean in the wake of empire, and the theory that grew up around it.',
  ENGL240: 'Writes documentation, proposals, and reports for expert and lay readers, with structure, plain language, and usability testing.',

  // --- Sociology ---
  SOCY101: 'Examines how social structures, institutions, and group behavior shape everyday life.',
  SOCY110: 'Analyses class, status, and power: how inequality is measured, reproduced across generations, and justified.',
  SOCY120: 'Reads Marx, Weber, Durkheim, and their successors, and asks what each framework explains that the others cannot.',
  SOCY130: 'Examines how racial and ethnic categories are made, enforced, and contested, and their effects on housing, schooling, and justice.',
  SOCY140: 'Trains interviewing, ethnographic observation, and the coding of field notes, with the ethics of studying people up close.',
  SOCY210: 'Explains crime and punishment through theories of strain, control, and labelling, and tests them against crime statistics and the courts.',
  SOCY220: 'Studies how marriage, parenting, and kinship vary across class and culture and have changed over a century.',
  SOCY230: 'Examines segregation, gentrification, and neighbourhood effects, and how cities shape the lives lived in them.',
  SOCY240: 'Analyses how gender is socially constructed and enforced, in work, family, and the body, and how sexuality intersects with it.',

  // --- Anthropology ---
  ANTH101: 'Introduces the four fields of anthropology and what each asks about being human.',
  ANTH110: 'Studies kinship, ritual, exchange, and belief across societies through ethnography, and what fieldwork can and cannot see.',
  ANTH120: 'Covers human evolution, primate behaviour, and modern human variation, from fossil evidence to genetics.',
  ANTH130: 'Teaches survey, excavation, stratigraphy, and dating, and how material remains are turned into claims about the past.',
  ANTH140: 'Examines how language shapes and reflects culture: dialect, politeness, multilingualism, and language loss.',
  ANTH210: 'Designs and carries out a small ethnographic project, from gaining access to writing up, with the ethics at every step.',
  ANTH220: 'Compares how cultures understand illness, healing, and the body, and what that means for medicine delivered across them.',
  ANTH230: 'Studies myth, ritual, magic, and belief comparatively, and the theories from Durkheim to Geertz that explain them.',
  ANTH240: 'Examines collecting, display, repatriation, and heritage policy, and who gets to tell whose past.',

  // --- Political Science ---
  POLS101: 'Surveys power, institutions, and political behavior, and the questions and methods of the discipline.',
  POLS110: 'Compares regimes, party systems, and institutions across countries to explain why democracies and dictatorships rise, endure, and fall.',
  POLS120: 'Introduces realism, liberalism, and constructivism, and applies them to war, trade, alliances, and international organisations.',
  POLS130: 'Examines the constitution, the separation of powers, federalism, and the parties and interest groups that work them.',
  POLS140: 'Defines a policy problem, weighs alternatives with cost-benefit analysis and evidence, and explains why the best option often loses.',
  POLS210: 'Reads the landmark cases on judicial review, federal power, and civil liberties, and how doctrine changes with the court.',
  POLS220: 'Studies how campaigns are strategised, funded, and run, from polling and messaging to turnout, using a live election where there is one.',
  POLS230: 'Reads Rawls, Nozick, and their critics on what a just distribution and a legitimate state would be.',
  POLS240: 'Analyses war, deterrence, terrorism, and cyber conflict, and the intelligence and defence institutions built to meet them.',

  // --- History ---
  HIST101: 'Surveys major civilizations and turning points from antiquity to the modern era.',
  HIST110: 'Trains the historian\'s craft: finding and reading primary sources, weighing conflicting accounts, and writing from evidence.',
  HIST120: 'Surveys the American past from colonisation through the civil war, industrialisation, and the twentieth century.',
  HIST130: 'Traces Europe from the Renaissance and Reformation through revolutions, nationalism, and the two world wars.',
  HIST140: 'Studies Mesopotamia, Egypt, Greece, and Rome through their texts and material remains, and what each left behind.',
  HIST210: 'Examines the causes, conduct, and consequences of the two world wars, from the trenches and the home front to the peace settlements.',
  HIST220: 'Uses excavated material alongside written records to recover the lives of people the documents left out.',
  HIST230: 'Reads past societies with the anthropologist\'s questions about kinship, ritual, and exchange, from the archive rather than the field.',
  HIST240: 'Traces how scientific ideas and machines were made, contested, and adopted, from the scientific revolution to the digital age.',

  // --- Philosophy ---
  PHIL101: 'Builds skills in argument analysis, deduction, and identifying logical fallacies.',
  PHIL110: 'Examines utilitarian, deontological, and virtue theories of right action, and tests them on real moral problems.',
  PHIL120: 'Asks what exists and what it is to persist, be free, or be the same thing over time, from universals to personal identity.',
  PHIL130: 'Studies knowledge, justification, and scepticism, and what testimony, perception, and reason can each be trusted to deliver.',
  PHIL140: 'Reads the Presocratics, Plato, and Aristotle closely, on nature, knowledge, the soul, and the good life.',
  PHIL210: 'Reads Kierkegaard, Nietzsche, Heidegger, Sartre, and de Beauvoir on freedom, anxiety, authenticity, and meaning without guarantee.',
  PHIL220: 'Examines consciousness, intentionality, and the mind-body problem, and whether a machine could have any of them.',
  PHIL230: 'Asks what art is, what makes a judgement of beauty more than a preference, and how a work can mean anything.',
  PHIL240: 'Develops propositional and first-order logic with proofs and models, up to the completeness and the limits of the systems.',

  // === Science ===

  // --- Mathematics ---
  MATH101: 'Covers limits, derivatives, and integrals, the mathematical toolkit for science and engineering coursework.',
  MATH110: 'Covers vector spaces, matrices, eigenvalues, and linear maps, with the geometry and the applications that make them indispensable.',
  MATH120: 'Develops random variables, distributions, and the central limit theorem, and applies them to estimation and hypothesis testing.',
  MATH130: 'Covers logic, sets, combinatorics, graphs, and proof by induction — the mathematics beneath computing.',
  MATH140: 'Solves ordinary differential equations analytically and numerically, and models the oscillators, populations, and circuits they describe.',
  MATH210: 'Builds the real numbers, limits, continuity, and the integral rigorously, and proves the theorems calculus took on trust.',
  MATH220: 'Studies groups, rings, and fields, from symmetry and permutations to the impossibility of solving the quintic.',
  MATH230: 'Introduces open sets, continuity, compactness, and connectedness in the abstract, and the surfaces and knots they classify.',
  MATH240: 'Analyses algorithms for root finding, integration, linear systems, and differential equations, with the error and stability of each.',

  // --- Biology ---
  BIOL101: 'Covers cell structure, genetics, and the fundamentals of living systems.',
  BIOL110: 'Examines membranes, organelles, signalling, and the cell cycle, and the experimental methods that revealed them.',
  BIOL120: 'Covers inheritance from Mendel to the genome: linkage, mutation, gene regulation, and the tools of molecular genetics.',
  BIOL130: 'Studies populations, communities, and ecosystems, with field work on how organisms interact with each other and their environment.',
  BIOL140: 'Develops natural selection, genetic drift, speciation, and phylogenetics, with the evidence from fossils to DNA.',
  BIOL210: 'Studies bacteria, archaea, viruses, and fungi in the lab, from culture and identification to pathogenesis and antibiotics.',
  BIOL220: 'Examines ocean life from plankton to whales, with coastal field work on reefs, estuaries, and the changing sea.',
  BIOL230: 'Covers photosynthesis, water transport, hormones, and development, and how plants respond to stress and season.',
  BIOL240: 'Traces innate and adaptive immunity from antigen recognition to vaccines, allergy, and autoimmune disease.',

  // --- Chemistry ---
  CHMY101: 'Builds stoichiometry, periodicity, and reaction theory from first principles.',
  CHMY110: 'Covers bonding, coordination complexes, and the descriptive chemistry of the main-group and transition elements.',
  CHMY120: 'Develops the structure, stereochemistry, and reaction mechanisms of carbon compounds, with synthesis and spectroscopy in the lab.',
  CHMY130: 'Teaches titration, chromatography, and electrochemical and spectroscopic analysis, with the statistics that say how far to trust a measurement.',
  CHMY140: 'Develops thermodynamics, kinetics, and quantum mechanics as they apply to molecules, with the mathematics each requires.',
  CHMY210: 'Examines proteins, enzymes, nucleic acids, and metabolism, and how the chemistry of the cell is regulated.',
  CHMY220: 'Solves molecular structures from NMR, infrared, and mass spectra, and the crystallography behind them.',
  CHMY230: 'Follows a drug from target and lead compound through structure-activity relationships to metabolism and dose.',
  CHMY240: 'Models molecules with quantum chemistry and molecular dynamics, and learns what each method can and cannot predict.',

  // --- Physics ---
  PHYS101: 'Derives motion, force, energy, and momentum from Newton\'s laws, with lab work throughout.',
  PHYS110: 'Develops fields, potentials, circuits, and induction from Coulomb\'s law to Maxwell\'s equations, with lab work throughout.',
  PHYS120: 'Covers oscillations, wave propagation, interference, diffraction, and polarisation, from sound to lasers.',
  PHYS130: 'Introduces special relativity, the quantum, atomic structure, and nuclear physics, and the experiments that forced each.',
  PHYS140: 'Derives temperature, entropy, and the laws of thermodynamics from the statistics of many particles.',
  PHYS210: 'Develops the Schrödinger equation, operators, angular momentum, and spin, and applies them to atoms and simple systems.',
  PHYS220: 'Covers crystal structure, phonons, band theory, semiconductors, and superconductivity — the physics inside every device.',
  PHYS230: 'Studies stars, galaxies, dark matter, and the expanding universe, from stellar structure to the cosmic microwave background.',
  PHYS240: 'Introduces the standard model of quarks, leptons, and forces, and how accelerators and detectors test it.',

  // --- Environmental Science ---
  ENVS101: 'Surveys how physical, chemical, and biological systems interact across a changing planet.',
  ENVS110: 'Traces energy and carbon through atmosphere, ocean, and land, and how those systems drive climate and its change.',
  ENVS120: 'Measures energy flow and nutrient cycling through forests, grasslands, and wetlands, with field and lab methods.',
  ENVS130: 'Follows pollutants through air, water, and soil, with the chemistry of acid rain, ozone, and contaminant fate.',
  ENVS140: 'Builds and analyses spatial data in GIS software, from remote-sensing imagery to maps that answer an environmental question.',
  ENVS210: 'Applies population genetics and landscape ecology to protecting species and habitats, with the policy and the trade-offs involved.',
  ENVS220: 'Covers the water cycle, watersheds, groundwater, and flooding, and how water is allocated among competing users.',
  ENVS230: 'Examines weather, air pollution, and climate dynamics, from radiation and cloud physics to numerical forecasting.',
  ENVS240: 'Analyses environmental law and regulation, and plans the restoration of a degraded site from assessment to monitoring.',

  // --- Psychology ---
  PSYC101: 'Surveys the major subfields of psychology, from cognition to clinical practice.',
  PSYC110: 'Traces cognitive, social, and emotional development from infancy to old age, and the studies that map each stage.',
  PSYC120: 'Examines attention, memory, language, and reasoning through the experiments that reveal how the mind processes information.',
  PSYC130: 'Covers the classification, causes, and treatment of mental disorders, from anxiety and depression to psychosis.',
  PSYC140: 'Designs experiments and surveys, analyses their data, and confronts the replication problems of the field.',
  PSYC210: 'Studies conformity, persuasion, prejudice, and group behaviour, through the classic experiments and their modern re-tests.',
  PSYC220: 'Links behaviour to the brain: neurotransmitters, hormones, sleep, and the effects of drugs and damage.',
  PSYC230: 'Applies psychology to selection, motivation, leadership, and team performance in the workplace.',
  PSYC240: 'Examines how stress, behaviour, and belief affect illness and recovery, and the interventions that change them.',

  // === Health Science ===

  // --- Public Health ---
  PHLT101: 'Surveys how populations, policy, and environment shape community health outcomes.',
  PHLT110: 'Measures disease in populations with incidence, prevalence, and risk, and designs the cohort and case-control studies that find its causes.',
  PHLT120: 'Applies regression, survival analysis, and hypothesis testing to health data, with the statistical literacy to read a clinical trial.',
  PHLT130: 'Examines how health systems are financed, regulated, and run, and the policy choices behind coverage, cost, and access.',
  PHLT140: 'Covers air and water quality, toxic exposure, and food safety, and the regulation that protects a population from them.',
  PHLT210: 'Examines disease burden, health systems, and interventions in low-income settings, from vaccination campaigns to maternal care.',
  PHLT220: 'Designs programmes that change behaviour — smoking, diet, screening — using behavioural theory and an evaluation of what worked.',
  PHLT230: 'Gathers and analyses local health data with community partners, and turns it into a set of priorities and a plan.',
  PHLT240: 'Covers pregnancy, birth, infant, and child health outcomes, and the services and policies that improve them.',

  // --- Nursing ---
  NURS101: 'Introduces the nursing profession, scope of practice, and foundations of patient care.',
  NURS110: 'Covers the structure and function of every organ system, with the lab dissection and the physiology a clinician draws on daily.',
  NURS120: 'Teaches drug classes, mechanisms, dosing, and interactions, and the safe administration of medication to patients.',
  NURS130: 'Trains history-taking and head-to-toe physical examination, with the documentation that turns findings into a care plan.',
  NURS140: 'Places students on hospital wards under supervision, giving basic nursing care to real patients for the first time.',
  NURS210: 'Manages ventilated, unstable, and post-operative patients in intensive care, with monitoring, drugs, and rapid response.',
  NURS220: 'Cares for infants, children, and adolescents, with the growth, dosing, and family communication that differ from adult practice.',
  NURS230: 'Cares for older adults with chronic illness, frailty, dementia, and polypharmacy, at home and in long-term care.',
  NURS240: 'Runs a full patient load on a specialty unit under a preceptor — the transition from student to practising nurse.',

  // --- Nutrition ---
  NUTR101: 'Covers macronutrients, micronutrients, and how diet supports human health.',
  NUTR110: 'Follows carbohydrates, fats, and proteins from digestion through the metabolic pathways that store and burn them.',
  NUTR120: 'Covers nutritional needs from pregnancy and infancy through childhood, adulthood, and old age, and where each stage goes wrong.',
  NUTR130: 'Assesses nutritional status, plans diets, and counsels clients — the clinical practice of a dietitian.',
  NUTR140: 'Examines the chemistry, microbiology, and processing of food, from spoilage and preservation to what cooking does to it.',
  NUTR210: 'Fuels training and competition with energy, hydration, and timing strategies, and evaluates the supplements athletes take.',
  NUTR220: 'Addresses malnutrition and obesity at the population level, through food policy, school programmes, and surveillance.',
  NUTR230: 'Manages nutrition in diabetes, kidney disease, cancer, and critical illness, including tube and intravenous feeding.',
  NUTR240: 'Runs supervised client consultations from dietary assessment through behaviour-change counselling and follow-up, the capstone of dietetic practice.',

  // --- Pharmacy ---
  PHRM101: 'Introduces drug discovery, formulation, and the pharmacist\'s role in patient care.',
  PHRM110: 'Covers organ-system physiology with the emphasis a pharmacist needs, on the receptors and pathways that drugs act on.',
  PHRM120: 'Relates drug structure to activity, stability, and formulation, with the organic and analytical chemistry behind each.',
  PHRM130: 'Covers drug action on the nervous and cardiovascular systems: receptors, dose-response, and the agents used in each.',
  PHRM140: 'Designs dosage forms — tablets, injections, patches — and the kinetics of how a drug is absorbed, distributed, and cleared.',
  PHRM210: 'Extends drug action to infection, cancer, endocrine, and inflammatory disease, with toxicity and resistance.',
  PHRM220: 'Selects and monitors drug therapy for real patient cases, weighing evidence, interactions, and comorbidity.',
  PHRM230: 'Places students in a clinic to review medications, counsel patients, and advise prescribers under supervision.',
  PHRM240: 'Studies drug effects in populations after approval, with adverse-event surveillance and the regulation of recalls.',

  // --- Kinesiology ---
  KINE101: 'Surveys human movement — anatomy, physiology, and mechanics — as one connected system.',
  KINE110: 'Studies muscles, bones, and joints as a system for movement, with palpation and the analysis of everyday and athletic motion.',
  KINE120: 'Measures how the heart, lungs, and muscles respond and adapt to exercise, in the lab with treadmill and metabolic testing.',
  KINE130: 'Applies mechanics to the body — forces, torques, and motion capture — from a golf swing to a fall.',
  KINE140: 'Examines how skills are acquired and coordinated by the nervous system, and how practice and feedback should be structured.',
  KINE210: 'Designs resistance and conditioning programmes for athletes, with periodisation, testing, and coaching technique.',
  KINE220: 'Assesses and rehabilitates common sports injuries, from acute care and taping to return-to-play progressions.',
  KINE230: 'Runs fitness assessments and prescribes exercise for healthy and clinical populations, following professional guidelines.',
  KINE240: 'Designs physical activity for people with disabilities and chronic conditions, with inclusion and safety as the starting points.',

  // --- Neuroscience ---
  NEUR101: 'Introduces the nervous system from single neurons up to behavior and cognition.',
  NEUR110: 'Maps the structures of the brain and spinal cord, their connections, and what damage to each does, with brain dissection in the lab.',
  NEUR120: 'Covers ion channels, action potentials, synaptic transmission, and the molecular machinery of the neuron.',
  NEUR130: 'Links perception, memory, language, and decision-making to brain systems, through imaging, lesion, and recording studies.',
  NEUR140: 'Records and analyses electrical activity from neurons and circuits, from single cells to the EEG.',
  NEUR210: 'Examines how drugs act on neurotransmitter systems, in the treatment of disorders and in addiction.',
  NEUR220: 'Traces how the nervous system is built, from neural induction and axon guidance to synapse formation and plasticity.',
  NEUR230: 'Models neurons and networks mathematically, from the Hodgkin-Huxley equations to learning rules and neural coding.',
  NEUR240: 'Examines stroke, epilepsy, Parkinson\'s, Alzheimer\'s, and psychiatric illness at the level of mechanism and treatment.',

  // === Computer Science ===

  // --- Computer Science ---
  COMP101: 'Teaches programming fundamentals — variables, control flow, and functions — through hands-on projects.',
  COMP110: 'Implements lists, stacks, trees, hash tables, and graphs, and analyses which one a problem needs and at what cost.',
  COMP120: 'Designs and analyses algorithms — sorting, graph search, dynamic programming, greedy methods — with proofs of correctness and running time.',
  COMP130: 'Builds the pieces of an operating system: processes and threads, scheduling, memory management, file systems, and concurrency.',
  COMP140: 'Covers instruction sets, pipelining, caches, and the memory hierarchy, and how hardware decides what software runs fast.',
  COMP210: 'Writes a compiler from lexing and parsing through type checking, optimisation, and code generation for a real target.',
  COMP220: 'Builds a playable game as a team, with a rendering loop, physics, input, and the design iteration that makes it fun.',
  COMP230: 'Programs multicore, GPU, and distributed systems with threads and message passing, and measures the speedup actually obtained.',
  COMP240: 'Builds full-stack web applications with a client framework, a server API, a database, and deployment, including authentication and security.',

  // --- Data Science ---
  DATA101: 'Introduces data collection, cleaning, and exploratory analysis techniques.',
  DATA110: 'Fits linear and generalised linear models, checks their assumptions, and reads what the coefficients do and do not claim.',
  DATA120: 'Trains and evaluates supervised and unsupervised models — regression, trees, clustering, neural networks — with the bias-variance trade-off throughout.',
  DATA130: 'Designs charts and interactive graphics that make a dataset\'s structure legible, and learns what makes a visualisation mislead.',
  DATA140: 'Finds patterns in large datasets with association rules, clustering, and anomaly detection, and validates that they are real.',
  DATA210: 'Processes data at scale with distributed storage and computation frameworks, and the trade-offs that shape a data pipeline.',
  DATA220: 'Models trend, seasonality, and autocorrelation with ARIMA and state-space methods, and forecasts with honest uncertainty.',
  DATA230: 'Builds systems that parse, classify, and generate text, from n-grams to transformer language models.',
  DATA240: 'Does inference with priors, likelihoods, and posterior sampling, and applies hierarchical models to problems frequentist methods handle badly.',

  // --- Cybersecurity ---
  CYBR101: 'Surveys threats, defenses, and the core principles of securing systems.',
  CYBR110: 'Secures networks with firewalls, intrusion detection, VPNs, and protocol hardening, against attacks run in a lab.',
  CYBR120: 'Covers symmetric and public-key ciphers, hashes, signatures, and protocols, and why so many real systems get them wrong.',
  CYBR130: 'Runs authorised penetration tests — reconnaissance, exploitation, privilege escalation — and writes the report that makes the findings fixable.',
  CYBR140: 'Runs a security operations centre: log analysis, monitoring, incident response, and the playbooks for when something gets through.',
  CYBR210: 'Secures identity, storage, networking, and workloads on public cloud platforms, where a misconfiguration is the usual breach.',
  CYBR220: 'Acquires and analyses evidence from disks, memory, and networks in a way that holds up in court.',
  CYBR230: 'Assesses threats, vulnerabilities, and impact to prioritise controls, and maps them to the compliance frameworks an organisation is audited against.',
  CYBR240: 'Finds vulnerabilities in code with static analysis, fuzzing, and code review, and builds the practices that keep them out.',

  // --- Software Engineering ---
  SOFT101: 'Covers the software development lifecycle from requirements to deployment.',
  SOFT110: 'Elicits, specifies, and validates what a system must do, with stakeholders who disagree and needs that change.',
  SOFT120: 'Designs unit, integration, and system tests, automates them, and measures coverage and defect rates as a quality process.',
  SOFT130: 'Designs relational schemas, writes SQL, and covers transactions, indexing, and the guarantees a database makes or does not.',
  SOFT140: 'Applies design patterns, SOLID principles, and refactoring to build systems that survive being changed.',
  SOFT210: 'Runs a project in sprints with a product backlog, stand-ups, and retrospectives, and examines what agile fixes and what it hides.',
  SOFT220: 'Builds native apps for phones, with touch interfaces, offline data, sensors, and the constraints of battery and screen.',
  SOFT230: 'Designs interfaces from user research and prototypes through usability testing, with accessibility as a requirement rather than an afterthought.',
  SOFT240: 'Automates build, test, and deployment pipelines with containers, infrastructure as code, and monitoring, so that releases become routine.',

  // --- Artificial Intelligence ---
  ARTF101: 'Surveys the history, goals, and core techniques of artificial intelligence.',
  ARTF110: 'Implements search, constraint satisfaction, and probabilistic reasoning in code — the classical toolkit under modern systems.',
  ARTF120: 'Encodes facts and rules in logics and ontologies, and reasons over them with inference engines and their limits.',
  ARTF130: 'Builds and trains multilayer networks from backpropagation up, with the optimisation and regularisation that make them learn.',
  ARTF140: 'Covers kernel methods, ensembles, probabilistic graphical models, and the theory of generalisation behind them.',
  ARTF210: 'Trains convolutional, recurrent, and transformer architectures at scale, with the engineering that makes large models work.',
  ARTF220: 'Gives a robot senses and plans — localisation, mapping, motion planning, and control — on real hardware.',
  ARTF230: 'Builds systems that detect, segment, and recognise objects in images and video, from filters and features to deep models.',
  ARTF240: 'Examines bias, accountability, surveillance, and labour displacement in deployed AI, and the governance proposed for it.',

  // --- Information Systems ---
  INFO101: 'Introduces how organizations use information systems to run and improve operations.',
  INFO110: 'Models an organisation\'s processes and data, and specifies the information system that would serve them, with the stakeholders in the room.',
  INFO120: 'Administers databases in production: schema design, query tuning, backup, security, and the move from relational to other stores.',
  INFO130: 'Configures an enterprise system across finance, supply chain, and HR, and studies why so many implementations overrun.',
  INFO140: 'Covers servers, networks, virtualisation, and cloud services, and how an organisation provisions, secures, and pays for them.',
  INFO210: 'Maps and redesigns workflows with process notation and simulation, and measures the improvement actually delivered.',
  INFO220: 'Analyses online business models, platforms, payments, and logistics, and what makes a digital marketplace defensible.',
  INFO230: 'Builds an organisation\'s security programme: policy, risk assessment, awareness, and governance under regulation.',
  INFO240: 'Designs dimensional models and ETL pipelines that feed analytics and reporting, and keeps the numbers consistent across them.',
};
