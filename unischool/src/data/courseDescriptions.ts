// ---------------------------------------------------------------------
// WHAT EACH COURSE IS. One authored sentence per undergraduate course,
// keyed by course id, read by techData.ts's initialTech() when it expands
// the seed into Buildables. The course drawer is where a player goes to
// decide what a course IS, and for 336 of the 378 courses the answer used
// to be eight rotating templates with the title swapped in — every
// major's first tier-2 course got the same sentence as every other
// major's first tier-2 course (Plan 20's PR D). This table replaces them,
// filled school by school (PRs E and F) behind the templates as a
// fallback, so no commit in between ships a blank drawer;
// test/course-descriptions.test.ts prints how many courses are still on
// the fallback and holds the count to going down.
//
// TWO RULES, so the table stays a catalogue and does not become 336
// essays:
//
//   - ONE SENTENCE, present tense, no course code, no "this course". The
//     entry courses are the reference register: "Covers the accounting
//     cycle, financial statements, and the language of business
//     record-keeping."
//   - IT MUST SAY SOMETHING THE TITLE DOES NOT. If the sentence is the
//     title with "a study of" in front, the course has not been described
//     — that is the whole failure being fixed, and the one thing to check
//     in review.
//
// Grouped by school, then by major in seed order, then by course number,
// so a reader with one major open in techData.ts's SCHOOLS finds its nine
// sentences together. Graduate courses are NOT here: they keep their
// generated line in techData.ts (a much more uniform register, 37 courses)
// and are the obvious next increment.
// ---------------------------------------------------------------------

export const COURSE_DESCRIPTIONS: Record<string, string> = {
  // ===================================================================
  // Business
  // ===================================================================

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

  // ===================================================================
  // Engineering
  // ===================================================================

  // --- Mechanical Engineering ---
  MECH101: 'Introduces the design process, sketching, and basic mechanical systems.',

  // --- Electrical Engineering ---
  ELEC101: 'Covers voltage, current, and resistance through hands-on circuit analysis and lab work.',

  // --- Chemical Engineering ---
  CHEM101: 'Introduces the chemical process industries and the unit operations, flows, and conversions that run them.',

  // --- Civil Engineering ---
  CIVE101: 'Covers forces in equilibrium, free-body diagrams, and load paths, the physical foundation for structural and civil design.',

  // --- Industrial Engineering ---
  INDE101: 'Introduces systems thinking for analyzing and improving industrial processes.',

  // --- Aerospace Engineering ---
  AERO101: 'Covers the forces of flight — lift, drag, thrust, and weight — and how aircraft respond to them.',

  // ===================================================================
  // Arts & Media
  // ===================================================================

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

  // ===================================================================
  // Social Sciences & Humanities
  // ===================================================================

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

  // ===================================================================
  // Science
  // ===================================================================

  // --- Mathematics ---
  MATH101: 'Covers limits, derivatives, and integrals, the mathematical toolkit for science and engineering coursework.',

  // --- Biology ---
  BIOL101: 'Covers cell structure, genetics, and the fundamentals of living systems.',

  // --- Chemistry ---
  CHMY101: 'Builds stoichiometry, periodicity, and reaction theory from first principles.',

  // --- Physics ---
  PHYS101: 'Derives motion, force, energy, and momentum from Newton\'s laws, with lab work throughout.',

  // --- Environmental Science ---
  ENVS101: 'Surveys how physical, chemical, and biological systems interact across a changing planet.',

  // --- Psychology ---
  PSYC101: 'Surveys the major subfields of psychology, from cognition to clinical practice.',

  // ===================================================================
  // Health Science
  // ===================================================================

  // --- Public Health ---
  PHLT101: 'Surveys how populations, policy, and environment shape community health outcomes.',

  // --- Nursing ---
  NURS101: 'Introduces the nursing profession, scope of practice, and foundations of patient care.',

  // --- Nutrition ---
  NUTR101: 'Covers macronutrients, micronutrients, and how diet supports human health.',

  // --- Pharmacy ---
  PHRM101: 'Introduces drug discovery, formulation, and the pharmacist\'s role in patient care.',

  // --- Kinesiology ---
  KINE101: 'Surveys human movement — anatomy, physiology, and mechanics — as one connected system.',

  // --- Neuroscience ---
  NEUR101: 'Introduces the nervous system from single neurons up to behavior and cognition.',

  // ===================================================================
  // Computer Science
  // ===================================================================

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
