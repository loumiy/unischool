// ---------------------------------------------------------------------
// The tab walks (Plan 122G, from Ginger's playtest): a few steps through a
// tab the chapters ask the player to look at, one section at a time. The
// Treasury (Paying for it), Students and History (Standing) and Faculty (A
// faculty). Each step names the element it rings by a CSS selector; a step
// whose element the tab does not show yet is left out
// (components/TabWalk.tsx). Finishing or skipping meets the chapter's
// objective for the tab (App.tsx marks tabMark, state/chapters.ts).
// ---------------------------------------------------------------------
export type WalkTab = 'treasury' | 'students' | 'history' | 'faculty';

export interface WalkStep {
  // What it rings.
  selector: string;
  title: string;
  text: string;
}

export const TAB_WALKS: Record<WalkTab, readonly WalkStep[]> = {
  treasury: [
    {
      selector: '.treasury-ledger',
      title: 'Money in, money out',
      text: 'A year of income and costs at this week’s rates. Tuition brings in most of the money. Salaries, upkeep and teaching take most of it. Click a line to see what makes it up.',
    },
    {
      selector: '.treasury-kpis',
      title: 'Cash and the board',
      text: 'Your cash pays for each building and course when you start it. The surplus is what a year adds. The board grades your finances. If you keep losing money, it steps in.',
    },
    {
      selector: '.treasury-levers',
      title: 'Levers for next year',
      text: 'You set tuition each summer at admissions. Here you set how much of the endowment to spend each year and how much of the upkeep to pay.',
    },
  ],
  students: [
    {
      selector: '[data-section="students.breakdown"]',
      title: 'What makes up satisfaction',
      text: 'Satisfaction is made of a few needs, read live off your campus. The lowest pulls the headline down most. Raise it, and satisfaction follows over the coming weeks.',
    },
    {
      selector: '[data-walk="students-effect"]',
      title: 'Clubs and Greek chapters',
      text: 'What student organizations add to where satisfaction is heading.',
    },
    {
      selector: '[data-walk="students-body"]',
      title: 'The student body',
      text: 'How many students you have in each class, and what kinds of student they are.',
    },
    {
      selector: '[data-walk="students-funnel"]',
      title: 'Last summer’s funnel',
      text: 'How many applied, how many you admitted, and how many came.',
    },
    {
      selector: '.identity-panel',
      title: 'What the guidebooks say',
      text: 'What your college is known for. A reputation takes years to earn and years to lose, and it changes who applies.',
    },
  ],
  history: [
    {
      selector: '[data-section="history.prestige"]',
      title: 'Prestige',
      text: 'Your college’s standing. Each of the four pillars adds to it: academics, research, student life and athletics. A meter fills as the pillar earns its share.',
    },
    {
      selector: '[data-walk="history-charts"]',
      title: 'By year',
      text: 'Prestige is graded each summer, and your place in the guide follows it.',
    },
    {
      selector: '.history-views',
      title: 'Two more views',
      text: 'The record is the story so far, on its way to the Final Report. The rankings show where you stand among the other colleges.',
    },
  ],
  faculty: [
    {
      selector: '.faculty-summary',
      title: 'Your faculty',
      text: 'How many professors you employ, how many are on the market, and what your courses need next.',
    },
    {
      selector: '.dept-views',
      title: 'Faculty, market, departments',
      text: 'Your own professors, the people you could hire this week, and both together by field.',
    },
    {
      selector: '.faculty-people',
      title: 'Teaching and research',
      text: 'Each professor has a teaching score and a research score, both out of 100. Both grow over the years toward the potential the professor arrived with.',
    },
  ],
};

export const WALK_WORDS = {
  step: (n: number, of: number) => `${n} of ${of}`,
  back: 'Back',
  next: 'Next',
  done: 'Done',
  skip: 'Skip',
  label: (tab: string) => `A walk through ${tab}`,
};
