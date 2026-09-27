// ---------------------------------------------------------------------
// THE STRING TABLE (Plan 73, area 2). Every player-facing string in src/,
// pulled into one table with where it appears, its word count and the
// screen it belongs to, so voice, jargon, repetition and the load on each
// screen can be read and counted rather than guessed at.
//
//   npm run review:strings                        node_modules/.tmp/strings/
//   npm run review:strings -- --out <dir>
//
// Read with the TypeScript compiler's own parser (no regexes over source):
// string literals, template literals (each ${…} kept as {…}) and JSX text.
// What is dropped as not player-facing: import paths, class names, ids,
// keys and every other attribute or property that names rather than says,
// comparisons (`kind === 'dorm'`), and anything shaped like an identifier,
// a path, a colour or SVG data. A string kept is one a player could read;
// the table errs toward keeping (a label of one word is kept when it is
// capitalized), so counts are an upper bound.
//
// Writes strings.json (every row), strings.csv, and strings.md (the
// summary: per screen, per file, the longest, the repeated, the spellings
// and marks the house style rules out, and the jargon).
//
// Not part of the game: nothing in src/ imports this.
// ---------------------------------------------------------------------

import ts from 'typescript';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface StringRow {
  file: string;
  line: number;
  kind: 'literal' | 'template' | 'jsx';
  context: string;       // the property, attribute or call it sits in
  screen: string;
  text: string;
  words: number;
}

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const argv = process.argv.slice(2);
const OUT = (() => { const i = argv.indexOf('--out'); return i >= 0 ? argv[i + 1] : 'node_modules/.tmp/strings'; })();

// ---- Which screen a file's words are read on ----
const SCREENS: Array<[RegExp, string]> = [
  [/components\/InterruptModal\.tsx$/, 'Modals (summer, events, letters)'],
  [/components\/EventChoices\.tsx$/, 'Modals (summer, events, letters)'],
  [/components\/InboxTab\.tsx$|systems\/inbox\//, 'Inbox'],
  [/components\/StartupScreen\.tsx$|data\/foundingData\.ts$/, 'Founding screen'],
  [/data\/schoolColors\.ts$/, 'Founding screen'],
  [/components\/(TitleScreen|HallOfFame)\.tsx$/, 'Title screen'],
  [/components\/(MainMenu|ImportSave)\.tsx$/, 'Menu'],
  [/components\/SettingsPanel\.tsx$/, 'Settings'],
  [/components\/Credits\.tsx$/, 'Credits'],
  [/components\/CrashScreen\.tsx$/, 'Crash screen'],
  [/components\/(FinalReportView|ReportCardActions)\.tsx$|data\/reportData\.ts$|state\/finalReport\.ts$/, 'Final Report'],
  [/components\/BuildPopup\.tsx$|data\/buildWords\.ts$/, 'Build menu'],
  [/components\/BuildingInfoPanel\.tsx$/, 'Building panel'],
  [/components\/QuadPanel\.tsx$|data\/quadData\.ts$/, 'Quad panel'],
  [/components\/OpeningCoach\.tsx$|data\/openingData\.ts$/, 'Opening walkthrough'],
  [/data\/boardData\.ts$/, 'Board letters'],
  [/data\/foundingNotes\.ts$/, 'Founding notes'],
  [/components\/LadderPanel\.tsx$|data\/ladderData\.ts$/, 'Ladder and milestone letters'],
  [/components\/(Toolbar|StatusHeader|TabNav|LogTicker|LogStrip|DayTicker|Toasts|ToolbarPopup|Pennant|TouchTitles)\.tsx$/, 'Dock and toolbar'],
  [/data\/demandData\.ts$|systems\/demands\//, 'Student demands'],
  [/components\/(HelpHint|Figure)\.tsx$|data\/figureHints\.ts$/, 'Help hints'],
  [/components\/(CampusMap|Walkers|campusLayout|dressing|groundMarkings|buildingMotifs|landmarks|quadLayer|pathways|siteWorks|ageMarks|trees)\.tsx?$/, 'Campus map'],
  [/components\/DebugPanel\.tsx$|engine\/devBuild\.ts$/, 'Debug panel (developer only)'],
  [/tabs\/CurriculumTab\.tsx$/, 'Curriculum tab'],
  [/tabs\/(FacultyTab|AdministrationPanel|facultySort)\.tsx?$/, 'Faculty tab'],
  [/tabs\/ResearchTab\.tsx$/, 'Research tab'],
  [/tabs\/(StudentsTab|EnrollmentTab|StudentLifeTab|IdentityPanel)\.tsx$/, 'Students tab'],
  [/tabs\/AthleticsTab\.tsx$/, 'Athletics tab'],
  [/tabs\/(HistoryTab|StandingsPanel|ChroniclePanel|AlumniPanel|PromisesPanel)\.tsx$/, 'History tab'],
  [/tabs\/(TreasuryTab|EndowmentPanel|EstatePanel|AdvancementPanel)\.tsx$/, 'Treasury tab'],
  [/data\/courseDescriptions\.ts$/, 'Course descriptions'],
  [/data\/(eventCatalogue|eventVariants)\.ts$|systems\/events\/catalogue/, 'Events (catalogue)'],
  [/data\/eventData\.ts$|systems\/events\/(eventSystem|charter)\.ts$/, 'Events (decision) and letters'],
  [/data\/promiseData\.ts$|systems\/promises\//, 'Promises'],
  [/data\/techData\.ts$/, 'Curriculum names and gates'],
  [/data\/(facilitiesData|campusData|projectData)\.ts$/, 'Building names and blurbs'],
  [/data\/(researchData|researchTopics)\.ts$|systems\/research\//, 'Research'],
  [/data\/studentLifeData\.ts$|systems\/(studentlife|athletics)\//, 'Student life and athletics'],
  [/data\/(facultyData|quirkData)\.ts$|systems\/faculty\//, 'Faculty (bios, quirks, log)'],
  [/data\/(chronicleData)\.ts$|systems\/chronicle\//, 'Chronicle'],
  [/data\/(alumniData|campaignData)\.ts$|systems\/alumni\//, 'Alumni and campaigns'],
  [/data\/seatData\.ts$|systems\/delegation\//, 'Administration'],
  [/data\/tagData\.ts$|systems\/identity\//, 'Identity tags'],
  [/data\/rivalData\.ts$|systems\/rivals\//, 'Rivals and rankings'],
  [/data\/logWords\.ts$/, 'Log'],
  [/systems\/guidance\//, 'Next-step line'],
  [/state\/yearInReview\.ts$/, 'Summer review'],
  [/systems\/finance\/|data\/moneyScale\.ts$/, 'Money (log, letters, Treasury)'],
  [/systems\/admissions\//, 'Admissions'],
  [/systems\/prestige\//, 'Standing (History tab)'],
  [/systems\/estate\//, 'Estate'],
  [/systems\/techtree\//, 'Curriculum (log, gates)'],
  [/systems\/satisfaction\//, 'Satisfaction'],
  [/systems\/ladder\//, 'Ladder and milestone notes'],
  [/state\//, 'State (log lines)'],
  [/engine\//, 'Engine (log lines)'],
  [/data\/audioData\.ts$/, 'Audio (not read)'],
];
function screenOf(file: string): string {
  for (const [re, screen] of SCREENS) if (re.test(file)) return screen;
  return 'Other';
}

// ---- What is not player-facing ----
const NAMING_PROPS = new Set([
  'id', 'key', 'kind', 'type', 'className', 'class', 'icon', 'sound', 'facilityType', 'field', 'sport', 'category',
  'topic', 'tone', 'variant', 'status', 'subject', 'school', 'schoolName', 'cohort', 'axis', 'attribute', 'depth',
  'tier', 'motif', 'family', 'door', 'roof', 'wall', 'material', 'form', 'venueCategory', 'programId', 'courseId',
  'hallId', 'labId', 'topicId', 'eventId', 'choiceId', 'seatId', 'policy', 'rule', 'domain', 'role', 'gender', 'heritage',
  'species', 'shape', 'side', 'dir', 'fill', 'stroke', 'd', 'points', 'transform', 'href', 'src', 'style', 'color',
  'background', 'fontFamily', 'fontWeight', 'textAnchor', 'dominantBaseline', 'cursor', 'display', 'position',
  'width', 'height', 'viewBox', 'xmlns', 'target', 'rel', 'htmlFor', 'name', 'value', 'mode', 'speed', 'level',
  'requiresFaculty', 'prereqs', 'default', 'effect', 'metric', 'need', 'glyph', 'mark', 'layout', 'align', 'justify',
  'defaultPolicy', 'resonates', 'askId', 'abbr', 'code', 'short', 'accent', 'primary', 'secondary', 'onPrimary', 'onSecondary',
  'mascotSuggestion', 'tab', 'tabId', 'inputMode', 'autoComplete', 'enterKeyHint', 'autoCapitalize', 'spellCheck', 'lang',
  'strokeLinecap', 'strokeLinejoin', 'fillRule', 'clipRule', 'preserveAspectRatio', 'gradientUnits', 'offset', 'stopColor',
]);
// Names a player reads as text: a faculty quirk's `name` is its badge on
// the Faculty tab (2d-voice's "Not in the table", Plan 76F).
const SAYING_NAMES: Array<[RegExp, string]> = [
  [/data\/quirkData\.ts$/, 'name'],
];
// Props whose value is player-facing even when it is one word.
const SAYING_PROPS = new Set([
  'title', 'label', 'text', 'message', 'description', 'blurb', 'prompt', 'hint', 'note', 'line', 'detail', 'placeholder',
  'alt', 'aria-label', 'ariaLabel', 'aria-description', 'caption', 'heading', 'body', 'summary', 'kept', 'missed', 'ask',
  'askName', 'teamName', 'displayName', 'whenText', 'tooltip', 'why', 'reason', 'verdict', 'phrase', 'headline', 'sub', 'subtitle',
]);
const CALLS_THAT_NAME = new Set([
  'includes', 'startsWith', 'endsWith', 'indexOf', 'querySelector', 'querySelectorAll', 'getElementById', 'getItem', 'setItem',
  'removeItem', 'addEventListener', 'removeEventListener', 'createElement', 'split', 'join', 'replace', 'replaceAll', 'match',
  'test', 'has', 'get', 'set', 'delete', 'find', 'filter', 'toLocaleString', 'toFixed', 'require', 'import', 'setProperty',
  'getPropertyValue', 'classList', 'toggle', 'add', 'remove', 'closest', 'matches', 'padStart', 'padEnd', 'localeCompare',
  'Intl', 'NumberFormat', 'DateTimeFormat', 'playCue', 'play', 'cue', 'Error', 'console', 'log', 'warn', 'error', 'dispatch',
]);

// The text with every {…} placeholder removed: what a check reads, so a
// variable's name inside a template is never taken for the words.
export const bare = (text: string) => text.replace(/\{[^}]*\}?/g, ' ').replace(/\s+/g, ' ').trim();

function looksLikeProse(text: string): boolean {
  const t = bare(text);
  if (/^(translate|matrix|rotate|scale|skew|rgba?|hsla?|url|calc|var)\(/.test(t) || /^[\s(),.\-\d]*$/.test(t)) return false;
  if (!/[A-Za-z]{2,}/.test(t)) return false;
  if (t.length < 2) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  // Paths, urls, colours, css, svg data, identifiers.
  if (/^(https?:|\.{0,2}\/|#[0-9a-f]{3,8}$|rgba?\(|hsla?\(|var\(--|url\()/i.test(t)) return false;
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9 ,.\-e]+$/.test(t) && /\d/.test(t)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(t)) return false;                 // camelCase or a lower-case token
  if (/^[a-z0-9]+([-_.:/][a-z0-9]+)+$/i.test(t)) return false;       // kebab, snake, dotted, paths
  if (/^[A-Z0-9_]+$/.test(t) && t.length > 1) return false;          // CONSTANTS
  if (/^[A-Z]+-[A-Z0-9-]+$/.test(t)) return false;                   // BUILDABLE-IDS
  if (/^[\d\s.,%$×x+−–-]+[a-z]{0,3}$/i.test(t)) return false;          // numbers and units
  if (/^(px|em|rem|ms|s|deg|vh|vw|%)$/.test(t)) return false;
  if (/\s/.test(t)) return true;
  // One word: a capitalized label, or a word with punctuation.
  return /^[A-Z][a-z’']+[.!?:…]?$/.test(t) || /[.!?…:]$/.test(t);
}

function nameOf(node: ts.Node | undefined): string {
  if (!node) return '';
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isJsxAttribute(node)) return ts.isIdentifier(node.name) ? node.name.text : node.name.getText();
  return '';
}

// Where a string sits: the nearest property, attribute, call or variable,
// and whether that context names rather than says.
function contextOf(node: ts.Node): { context: string; naming: boolean; saying: boolean } {
  let child: ts.Node = node;
  for (let p = node.parent; p; child = p, p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode?.(p) || ts.isExternalModuleReference(p)) {
      return { context: 'import', naming: true, saying: false };
    }
    if (ts.isLiteralTypeNode(p) || ts.isTypeReferenceNode(p) || ts.isUnionTypeNode(p) || ts.isIndexedAccessTypeNode(p)) {
      return { context: 'type', naming: true, saying: false };
    }
    if (ts.isElementAccessExpression(p) && p.argumentExpression === child) return { context: 'index', naming: true, saying: false };
    if (ts.isCaseClause(p) && p.expression === child) return { context: 'case', naming: true, saying: false };
    if (ts.isBinaryExpression(p)) {
      const op = p.operatorToken.kind;
      if (op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsEqualsToken
        || op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken || op === ts.SyntaxKind.InKeyword) {
        return { context: 'comparison', naming: true, saying: false };
      }
    }
    if (ts.isJsxAttribute(p)) {
      const name = nameOf(p);
      return { context: `@${name}`, naming: NAMING_PROPS.has(name) || name.startsWith('data-') || name.startsWith('on'), saying: SAYING_PROPS.has(name) };
    }
    if (ts.isPropertyAssignment(p) && p.initializer === child) {
      const name = nameOf(p.name);
      const file = relative(ROOT, node.getSourceFile().fileName);
      if (SAYING_NAMES.some(([re, prop]) => prop === name && re.test(file))) return { context: `.${name}`, naming: false, saying: true };
      return { context: `.${name}`, naming: NAMING_PROPS.has(name), saying: SAYING_PROPS.has(name) };
    }
    if (ts.isPropertyAssignment(p) && p.name === child) return { context: 'property name', naming: true, saying: false };
    if (ts.isCallExpression(p)) {
      const callee = nameOf(p.expression);
      // Only the call's own arguments name: an array of sentences filtered
      // or joined (the summer review's "answered by" parts) is still prose.
      if (CALLS_THAT_NAME.has(callee) && p.arguments.includes(child as ts.Expression)) return { context: `${callee}()`, naming: true, saying: false };
      // A string as a call's argument, inside some other context: keep looking
      // only if it is the argument itself (a template inside a call's argument).
      if (p.arguments.includes(child as ts.Expression)) return { context: `${callee}()`, naming: false, saying: false };
    }
    if (ts.isNewExpression(p) && nameOf(p.expression) === 'Error') return { context: 'Error', naming: true, saying: false };
    if (ts.isVariableDeclaration(p)) return { context: `const ${nameOf(p.name)}`, naming: false, saying: false };
    if (ts.isReturnStatement(p)) return { context: 'return', naming: false, saying: false };
    if (ts.isJsxExpression(p)) {
      if (p.parent && ts.isJsxAttribute(p.parent)) continue;
      return { context: 'jsx', naming: false, saying: true };
    }
    if (ts.isArrayLiteralExpression(p)) continue;
    if (ts.isConditionalExpression(p) || ts.isParenthesizedExpression(p) || ts.isBinaryExpression(p) || ts.isTemplateSpan(p)
      || ts.isAsExpression(p) || ts.isSatisfiesExpression(p) || ts.isNonNullExpression(p)) continue;
    if (ts.isBlock(p) || ts.isSourceFile(p)) break;
  }
  return { context: '', naming: false, saying: false };
}

function templateText(node: ts.TemplateExpression): string {
  let out = node.head.text;
  for (const span of node.templateSpans) out += `{${span.expression.getText().slice(0, 24)}}` + span.literal.text;
  return out;
}

const countWords = (t: string) => t.replace(/\{[^}]*\}/g, 'X').split(/\s+/).filter((w) => /[A-Za-z0-9X]/.test(w)).length;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

export function collect(): StringRow[] {
  const rows: StringRow[] = [];
  for (const path of walk(SRC).sort()) {
    const file = relative(ROOT, path);
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const fileScreen = screenOf(file);
    const namePool = /data\/(facultyData|studentLifeData|rivalData|alumniData)\.ts$/.test(file);
    const add = (node: ts.Node, kind: StringRow['kind'], text: string) => {
      const clean = text.replace(/\s+/g, ' ').trim();
      const ctx = kind === 'jsx' ? { context: 'jsx text', naming: false, saying: true } : contextOf(node);
      if (ctx.naming && !(ctx.saying && /\s/.test(clean))) return;
      if (!ctx.saying && !looksLikeProse(clean)) return;
      if (ctx.saying && !/[A-Za-z]/.test(clean)) return;
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      // A name pool's entries (people, rivals, mascots) are names, not sentences.
      const screen = namePool && /^[A-Z][\p{L}'’.-]*( [A-Z][\p{L}'’.-]*){0,3}$/u.test(clean) ? 'Names (people, rivals, mascots)' : fileScreen;
      rows.push({ file, line, kind, context: ctx.context, screen, text: clean, words: countWords(clean) });
    };
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        add(node, 'literal', node.text);
      } else if (ts.isTemplateExpression(node)) {
        add(node, 'template', templateText(node));
        // The spans' own expressions may hold strings too.
        for (const span of node.templateSpans) visit(span.expression);
        return;
      } else if (ts.isJsxText(node)) {
        const t = node.getText().replace(/\s+/g, ' ').trim();
        if (t && /[A-Za-z]/.test(t)) add(node, 'jsx', t);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return rows;
}

// ---- The house style's checks ----
// American spelling (Plan 47's one voice); each is [British, American].
const BRITISH: Array<[RegExp, string]> = [
  [/\bcolour(s|ed|ful|ing)?\b/i, 'color'], [/\bcentre(s|d)?\b/i, 'center'], [/\bprogramme(s)?\b/i, 'program'],
  [/\borganis(e|ed|es|ing|ation|ations|ational)\b/i, 'organiz-'], [/\brecognis(e|ed|es|ing)\b/i, 'recogniz-'], [/\breali[s](e|ed|es|ing)\b/i, 'realiz-'],
  [/\bapologis(e|ed|es|ing)\b/i, 'apologiz-'], [/\bprioritis(e|ed|es|ing)\b/i, 'prioritiz-'], [/\bemphasis(e|ed|es|ing)\b/i, 'emphasiz-'],
  [/\banalys(e|ed|es|ing)\b/i, 'analyz-'], [/\blicence\b/i, 'license'], [/\bdefence\b/i, 'defense'], [/\boffence\b/i, 'offense'],
  [/\b(fav|hon|lab|behavi|neighb|harb|rum|hum|vap|vig|od|arm|col|flav|sav|rig|endeav|glam|clam|sav)our(s|ed|ing|ite|ites|able|hood)?\b/i, '-or'],
  [/\btravell(ed|ing|er|ers)\b/i, 'travel-'], [/\bcancell(ed|ing)\b/i, 'cancel-'], [/\blabell(ed|ing)\b/i, 'label-'],
  [/\bmodell(ed|ing)\b/i, 'model-'], [/\bfuell(ed|ing)\b/i, 'fuel-'], [/\bsignall(ed|ing)\b/i, 'signal-'],
  [/\benrolment(s)?\b/i, 'enrollment'], [/\benrol(s)?\b/i, 'enroll'], [/\bfulfil(s|ment)?\b/i, 'fulfill'], [/\binstal(s|ment)?\b/i, 'install'],
  [/\bjudgement(s)?\b/i, 'judgment'], [/\bgrey\b/i, 'gray'], [/\btheatre(s)?\b/i, 'theater'], [/\bmetre(s)?\b/i, 'meter'],
  [/\bstorey(s)?\b/i, 'story'], [/\bcheque(s)?\b/i, 'check'], [/\bwhilst\b/i, 'while'], [/\bamongst\b/i, 'among'],
  [/\btowards\b/i, 'toward'], [/\bafterwards\b/i, 'afterward'], [/\blearnt\b/i, 'learned'], [/\bspelt\b/i, 'spelled'],
  [/\bcatalogue(s|d)?\b/i, 'catalog'], [/\bpractis(e|ed|ing)\b/i, 'practic-'], [/\bsceptic(al|ism|s)?\b/i, 'skeptic'],
  [/\bmum\b/i, 'mom'], [/\bmaths\b/i, 'math'], [/\bpyjamas\b/i, 'pajamas'], [/\bsceptic/i, 'skeptic'], [/\bplough/i, 'plow'],
  [/\bmould/i, 'mold'], [/\bsmoulder/i, 'smolder'], [/\bmanoeuvre/i, 'maneuver'], [/\bparlour/i, 'parlor'], [/\bdraught/i, 'draft'],
  [/\bkerb(s)?\b/i, 'curb'], [/\bartefact/i, 'artifact'], [/\baluminium\b/i, 'aluminum'], [/\bpaediatric/i, 'pediatric'],
  [/\banaesthe/i, 'anesthe-'], [/\boestrogen/i, 'estrogen'], [/\bencyclopaedi/i, 'encyclopedi-'], [/\bfoetus/i, 'fetus'],
  [/\bleukaemia/i, 'leukemia'], [/\bhaemo/i, 'hemo-'], [/\bgynaecolog/i, 'gynecolog-'], [/\borthopaedic/i, 'orthopedic'],
  [/\bspecialis(e|ed|es|ing|ation)\b/i, 'specializ-'], [/\bcivilis(e|ed|ation)\b/i, 'civiliz-'], [/\bsummaris(e|ed|es|ing)\b/i, 'summariz-'],
  [/\bcharacteris(e|ed|es|ing)\b/i, 'characteriz-'], [/\bmemoris(e|ed|es|ing)\b/i, 'memoriz-'], [/\bminimis(e|ed|es|ing)\b/i, 'minimiz-'],
  [/\bmaximis(e|ed|es|ing)\b/i, 'maximiz-'], [/\bauthoris(e|ed|es|ing|ation)\b/i, 'authoriz-'], [/\bcriticis(e|ed|es|ing)\b/i, 'criticiz-'],
  [/\bstandardis(e|ed|es|ing)\b/i, 'standardiz-'], [/\bmobilis(e|ed|es|ing)\b/i, 'mobiliz-'], [/\bfinalis(e|ed|es|ing)\b/i, 'finaliz-'],
];
// Any other -ise, -ised, -ising or -isation, less the words that are -ise in
// American English too.
const ISE_OK = new Set(['advise', 'revise', 'surprise', 'exercise', 'compromise', 'enterprise', 'premise', 'promise', 'raise', 'rise', 'wise',
  'arise', 'supervise', 'televise', 'devise', 'despise', 'disguise', 'franchise', 'merchandise', 'improvise', 'comprise', 'expertise', 'excise',
  'incise', 'precise', 'concise', 'paradise', 'praise', 'noise', 'poise', 'cruise', 'bruise', 'chastise', 'apprise', 'otherwise', 'likewise',
  'clockwise', 'advertise', 'treatise', 'reprise', 'demise', 'reprise', 'guise', 'mise', 'anise', 'valise', 'porpoise', 'tortoise', 'turquoise',
  'chemise', 'cerise', 'marquise', 'unwise', 'sunrise', 'uprise', 'counterwise', 'lengthwise', 'crosswise', 'edgewise', 'streetwise', 'moonrise',
  'surmise', 'circumcise', 'exorcise', 'misadvise', 'premise', 'high-rise', 'low-rise', 'mid-rise', 'louise', 'denise', 'elise', 'eloise']);
function iseSpelling(text: string): string | null {
  for (const m of text.matchAll(/\b([A-Za-z-]+?)(is)(e|ed|es|ing|ation|ations|er|ers)\b/g)) {
    const word = m[0].toLowerCase();
    const stem = (m[1] + 'ise').toLowerCase();
    if (ISE_OK.has(stem) || ISE_OK.has(word) || m[1].length < 3) continue;
    if (/(rais|pris|vis|wis|cis|nois|pois|guis|mis|chis|advertis|enterpris|exercis|compromis|surpris|revis|devis|supervis|improvis|televis)$/i.test(m[1] + 'is')) continue;
    return m[0];
  }
  return null;
}
// Idioms an American reader notices (the voice is a senior American
// administrator's); each hit is for a person to judge, not a defect.
// A third pattern, when given, excuses a string that matches it.
const IDIOMS: Array<[RegExp, string, RegExp?]> = [
  [/\b(a|the|their|his|her|its) flat\b/i, 'apartment'], [/\bporters?\b/i, 'custodian, doorman'], [/\b(fire )?brigade\b/i, 'fire department'],
  [/\binto administration\b/i, 'bankruptcy'], [/\bautumn\b/i, 'fall'], [/\bfortnight/i, 'two weeks'], [/\brota\b/i, 'schedule'],
  [/\bqueue[ds]?\b/i, 'line'], [/\bholidays?\b/i, 'vacation, break'], [/\bcar park/i, 'parking lot'], [/\blorr(y|ies)\b/i, 'truck'],
  [/\bpavement\b/i, 'sidewalk'], [/\bgot round to\b/i, 'got around to'], [/\bat the weekend\b/i, 'on the weekend'], [/\bin hospital\b/i, 'in the hospital'],
  [/\bRegistry\b/, 'Registrar\'s office'], [/\btimetable/i, 'schedule'], [/\bpost(ed)? (to|through)\b|\bin the post\b|\bby post\b/i, 'mail'],
  [/\bmobile phone/i, 'cell phone'], [/\bpetrol\b/i, 'gas'], [/\bheadmaster/i, 'principal'], [/\bsixth form/i, 'high school'],
  [/\bhalls of residence\b/i, 'dorms'], [/\bfreshers?\b/i, 'freshmen'], [/\buni\b/i, 'college'], [/\bmaths\b/i, 'math'],
  [/\bthe (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/, 'on Monday'], [/\brather more\b/i, 'quite a bit more'],
  [/\bwhilst\b/i, 'while'], [/\bamongst\b/i, 'among'], [/\bsorted\b(?! by)/i, 'handled'], [/\bbrolly|\bnaff\b|\bbloke\b|\bquid\b/i, 'slang'],
  // What 2d-voice §4 found that the list above missed (Plan 76F).
  [/\bthe estate\b/i, 'buildings and grounds', /\b(bequest|executors?|heirs?|bankruptcy|will)\b/i], [/\b(academic|league) tables?\b|\bsix tables\b/i, 'rankings, the guide'],
  [/\bround (the|a|an|one|two|three|its|their)\b/i, 'around'], [/\bapartment block/i, 'apartment building'],
  [/\bbiscuits?\b/i, 'cookies'], [/\bfull marks?\b|\bfinal mark\b|\bthe mark ·|\bmarks (undergraduate|essays|papers|exams)\b|\bmarks overnight\b/i, 'grade, the top score'],
  [/\bbursary\b/i, 'bursar\'s office, grant'], [/\bread(s|ing)? (a|the|his|her|their) subject\b/i, 'major in'],
  [/\ba dear\b|\bdear sticker\b/i, 'expensive, steep'], [/\bwelfare\b/i, 'well-being'], [/\bhandover\b/i, 'handoff'],
  [/\b(research|medical) charity\b/i, 'foundation'], [/\bfirst-years?\b/i, 'freshmen'], [/\bupper years\b/i, 'upperclassmen'],
  [/\bthe faculty have\b/i, 'the faculty has'], [/\bcommon room\b/i, 'faculty lounge'], [/\bproper\b/i, 'real'],
  [/\bconsultancy\b/i, 'consulting firm'], [/\ba wood\b/i, 'woodland'], [/\bsporting college\b/i, 'athletic college'],
  [/\bout of the door\b/i, 'out the door'], [/\bprospectus\b/i, 'catalog, viewbook'], [/\bthe Bursar\b/, 'the business office'],
  [/\blost the (semi|quarter)\b/i, 'semifinal, quarterfinal'], [/\blift\b(?= (is|was) (out|broken|stuck))/i, 'elevator'],
];
// The engine's words in the prose (2d-voice §1 and §3, Plan 76F): what the
// code calls a thing, where the college has a word of its own. The menu,
// Settings, the crash screen and the credits may speak of the game and the
// run; nothing else should. Each hit is for a person to judge.
const ENGINE: Array<[RegExp, string]> = [
  [/\bweekly tick\b|\bthe tick\b/i, 'each week'], [/\bthe run\b|\bthis run\b|\bany run\b|\bevery run\b/i, 'the college, the fifty years'],
  [/\b(students|summer's|standing|first|third|fourth) beats?\b|\bthree beats\b/i, 'step'], [/\binterrupts? play\b/i, 'waits on a decision'],
  [/\bunlock(s|ed|able)?\b/i, 'opens, can be built'], [/\breveal(s|ed)\b/i, 'open, listed'], [/\bthrottle\b/i, 'what limits'],
  [/\bpacing\b/i, 'how fast'], [/^the wall$/i, 'waiting on faculty'], [/\bhoused (catalog|programs?|courses?|here)\b/i, 'with a hall, now taught'],
  [/\brecreation chain\b|\bthe chain\b/i, 'the recreation buildings'], [/\bflat (contributors|bonus)\b|\+\S* flat\b/i, 'at any size'],
  [/\bcohort signal\b/i, 'particular pull'], [/\bvarsity-active\b/i, 'plays varsity'], [/\binitiatives?\b/i, 'research project'],
  [/\bstock\b(?! (market|exchange))/i, 'moves slowly'], [/\bfloored\b/i, 'cannot fall below'], [/\bpts\b/i, 'name the unit'],
  [/\bthe rest of the game\b|\b(era|part|stage) of the game\b/i, 'the college'], [/\bthe ladder\b|\bboard's ladder\b/i, 'the board\'s scale, milestones'],
  [/\bscrolled off\b/i, 'the log no longer reaches'], [/\bthe slider\b/i, 'name the figure'], [/\byield step\b/i, 'everyone admitted enrolls'],
  [/\bthe pot\b/i, 'the department\'s fund'], [/\bcommittee seats?\b/i, 'the committee writes N at once'],
];
const ENGINE_OK_SCREENS = new Set(['Menu', 'Settings', 'Crash screen', 'Credits', 'Title screen', 'Founding screen', 'Debug panel (developer only)', 'Audio (not read)', 'Course descriptions', 'Names (people, rivals, mascots)']);

// Words a new player may not know, as the game uses them.
const JARGON = [
  'opex', 'op-ex', 'tier', 'rung', 'cohort', 'seat', 'sweep', 'draw rate', 'drawdown', 'backlog', 'tolerance', 'ceiling', 'standing',
  'concentration', 'breadth', 'welfare', 'crowding', 'coverage', 'intake', 'sections', 'section', 'services', 'endowment',
  'matriculat', 'yield', 'selectivity', 'distinguished', 'established', 'founded', 'housed', 'milestone', 'ladder',
  'vernacular', 'flagship', 'developmental', 'competitive', 'pot', 'subsidy', 'gate', 'veteran', 'prospect', 'scout',
  'market rate', 'tenure', 'teaching standard', 'report card', 'grade', 'target', 'drift', 'tremor', 'dividend', 'annual fund',
  'mothball', 'austerity', 'distress', 'confidence', 'warmth', 'resonance', 'bequest', 'restricted', 'capital project',
  'initiative', 'depth', 'landmark program', 'breakthrough', 'petition', 'digest', 'chapter', 'hellenic',
];

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function summarize(rows: StringRow[]): string {
  const lines: string[] = [];
  const total = rows.reduce((t, r) => t + r.words, 0);
  lines.push('# The string table', '');
  lines.push(`Written by \`npm run review:strings\` (\`tools/review/strings.ts\`). ${rows.length.toLocaleString()} player-facing strings, ${total.toLocaleString()} words, from ${new Set(rows.map((r) => r.file)).size} files. Every row is in \`strings.json\` and \`strings.csv\`.`, '');

  // Per screen.
  const byScreen = new Map<string, StringRow[]>();
  for (const r of rows) byScreen.set(r.screen, [...(byScreen.get(r.screen) ?? []), r]);
  lines.push('## Per screen', '', 'Words a screen can put in front of a player (every string it could show, not what one visit shows).', '');
  lines.push('| Screen | Strings | Words | Longest | Median words |');
  lines.push('|---|---|---|---|---|');
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)] ?? 0;
  for (const [screen, rs] of [...byScreen.entries()].sort((a, b) => b[1].reduce((t, r) => t + r.words, 0) - a[1].reduce((t, r) => t + r.words, 0))) {
    lines.push(`| ${screen} | ${rs.length} | ${rs.reduce((t, r) => t + r.words, 0).toLocaleString()} | ${Math.max(...rs.map((r) => r.words))} | ${med(rs.map((r) => r.words))} |`);
  }
  lines.push('');

  // Per file.
  const byFile = new Map<string, StringRow[]>();
  for (const r of rows) byFile.set(r.file, [...(byFile.get(r.file) ?? []), r]);
  lines.push('## Per file (top 30 by words)', '');
  lines.push('| File | Strings | Words |');
  lines.push('|---|---|---|');
  for (const [file, rs] of [...byFile.entries()].sort((a, b) => b[1].reduce((t, r) => t + r.words, 0) - a[1].reduce((t, r) => t + r.words, 0)).slice(0, 30)) {
    lines.push(`| \`${file}\` | ${rs.length} | ${rs.reduce((t, r) => t + r.words, 0).toLocaleString()} |`);
  }
  lines.push('');

  // The longest.
  lines.push('## The longest strings (top 25)', '');
  for (const r of [...rows].sort((a, b) => b.words - a.words).slice(0, 25)) {
    lines.push(`- **${r.words} words**, ${r.screen}, \`${r.file}:${r.line}\`: ${r.text.slice(0, 220)}${r.text.length > 220 ? '…' : ''}`);
  }
  lines.push('');

  // Repeated.
  const same = new Map<string, StringRow[]>();
  for (const r of rows.filter((x) => x.words >= 4)) same.set(r.text, [...(same.get(r.text) ?? []), r]);
  const repeats = [...same.entries()].filter(([, rs]) => new Set(rs.map((r) => `${r.file}`)).size > 1 || rs.length > 1).sort((a, b) => b[1].length - a[1].length);
  lines.push('## Repeated word for word (four words or more)', '', `${repeats.length} sentences appear more than once.`, '');
  for (const [text, rs] of repeats.slice(0, 40)) {
    lines.push(`- ×${rs.length}: “${text.slice(0, 140)}${text.length > 140 ? '…' : ''}” — ${[...new Set(rs.map((r) => `\`${r.file}:${r.line}\``))].slice(0, 4).join(', ')}`);
  }
  lines.push('');

  // British spellings.
  lines.push('## British spellings (the house voice is American)', '');
  const brit: string[] = [];
  const byWord = new Map<string, number>();
  for (const r of rows) {
    const t = bare(r.text);
    const hits = BRITISH.map(([re, us]) => [t.match(re)?.[0], us] as const).filter(([m]) => m);
    const ise = iseSpelling(t);
    if (ise && !hits.some(([m]) => m?.toLowerCase() === ise.toLowerCase())) hits.push([ise, '-iz-']);
    for (const [m, us] of hits) {
      brit.push(`- “${m}” (${us}) — ${r.screen}, \`${r.file}:${r.line}\`: ${r.text.slice(0, 120)}${r.text.length > 120 ? '…' : ''}`);
      byWord.set(m!.toLowerCase(), (byWord.get(m!.toLowerCase()) ?? 0) + 1);
    }
  }
  if (byWord.size > 0) lines.push(`By word: ${[...byWord.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ×${n}`).join(', ')}.`, '');
  lines.push(brit.length === 0 ? 'None found.' : `${brit.length} found:`, '', ...brit.slice(0, 120), '');
  if (brit.length > 120) lines.push(`…and ${brit.length - 120} more in strings.json.`, '');

  // Idioms.
  lines.push('## British idioms (for a person to judge)', '');
  const idioms: string[] = [];
  const byIdiom = new Map<string, number>();
  for (const r of rows) {
    const t = bare(r.text);
    for (const [re, us, unless] of IDIOMS) {
      const m = t.match(re);
      if (!m || unless?.test(t)) continue;
      idioms.push(`- “${m[0]}” (${us}) — ${r.screen}, \`${r.file}:${r.line}\`: ${r.text.slice(0, 140)}${r.text.length > 140 ? '…' : ''}`);
      byIdiom.set(m[0].toLowerCase(), (byIdiom.get(m[0].toLowerCase()) ?? 0) + 1);
    }
  }
  lines.push(idioms.length === 0 ? 'None found.' : `${idioms.length} found. By phrase: ${[...byIdiom.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ×${n}`).join(', ')}.`, '', ...idioms.slice(0, 150), '');

  // The engine's words.
  lines.push('## Engine words in the prose (for a person to judge)', '');
  const engine: string[] = [];
  const byEngine = new Map<string, number>();
  for (const r of rows) {
    if (ENGINE_OK_SCREENS.has(r.screen)) continue;
    const t = bare(r.text);
    for (const [re, word] of ENGINE) {
      const m = t.match(re);
      if (!m) continue;
      engine.push(`- “${m[0]}” (${word}) — ${r.screen}, \`${r.file}:${r.line}\`: ${r.text.slice(0, 140)}${r.text.length > 140 ? '…' : ''}`);
      byEngine.set(m[0].toLowerCase(), (byEngine.get(m[0].toLowerCase()) ?? 0) + 1);
    }
  }
  lines.push(engine.length === 0 ? 'None found.' : `${engine.length} found. By word: ${[...byEngine.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ×${n}`).join(', ')}.`, '', ...engine.slice(0, 150), '');

  // Marks.
  const marks: Array<[string, RegExp]> = [
    ['exclamation marks', /!(?!=)/], ['second person (you, your)', /\byou(r|rs|'re|’re|'ll|’ll)?\b/i],
    ['contractions', /\b\w+(n't|n’t|'re|’re|'ll|’ll|'ve|’ve|'d|’d|'m|’m)\b/i], ['emoji', /\p{Extended_Pictographic}/u],
    ['ALL CAPS words', /\b[A-Z]{4,}\b/], ['ellipses', /…|\.\.\./],
  ];
  lines.push('## Marks', '', '| Mark | Strings | Per screen (top 5) |', '|---|---|---|');
  for (const [label, re] of marks) {
    const hits = rows.filter((r) => re.test(bare(r.text)));
    const per = new Map<string, number>();
    for (const h of hits) per.set(h.screen, (per.get(h.screen) ?? 0) + 1);
    lines.push(`| ${label} | ${hits.length} | ${[...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([sc, n]) => `${sc} ${n}`).join(', ')} |`);
  }
  lines.push('');
  const exclaims = rows.filter((r) => /!(?!=)/.test(bare(r.text)));
  if (exclaims.length > 0) {
    lines.push('Every exclamation mark:', '');
    for (const r of exclaims.slice(0, 40)) lines.push(`- ${r.screen}, \`${r.file}:${r.line}\`: ${r.text.slice(0, 160)}`);
    lines.push('');
  }

  // Jargon.
  lines.push('## Jargon', '', 'How often each term a new player may not know appears, and on how many screens. A term used on many screens before it is explained anywhere is the thing to check.', '');
  lines.push('| Term | Strings | Screens |', '|---|---|---|');
  for (const term of JARGON) {
    const re = new RegExp(`\\b${term.replace(/[-]/g, '[- ]?')}`, 'i');
    const hits = rows.filter((r) => re.test(bare(r.text)) && !r.screen.startsWith('Debug') && r.screen !== 'Course descriptions');
    if (hits.length === 0) continue;
    lines.push(`| ${term} | ${hits.length} | ${new Set(hits.map((h) => h.screen)).size} |`);
  }
  lines.push('');
  return lines.join('\n');
}

if (process.argv[1]?.includes('strings')) {
  const rows = collect();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'strings.json'), JSON.stringify(rows, null, 1));
  writeFileSync(join(OUT, 'strings.csv'), ['file,line,kind,context,screen,words,text', ...rows.map((r) => [r.file, r.line, r.kind, r.context, r.screen, r.words, r.text].map(csvCell).join(','))].join('\n'));
  writeFileSync(join(OUT, 'strings.md'), summarize(rows));
  console.log(`${rows.length} strings, ${rows.reduce((t, r) => t + r.words, 0)} words → ${OUT}/strings.{json,csv,md}`);
}
