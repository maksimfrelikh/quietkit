/* Non-breaking spaces: glue short words, numbers, initials and dashes to their neighbours
   so a line never ends with a hanging "в" or starts with a dash.

   Pure and idempotent: only plain spaces (U+0020) are ever converted, so running the
   result through again changes nothing, and spaces the author already made non-breaking
   are kept. Rules are data per language; each rule is a regex that matches exactly one
   space with the context in look-around. Because String.replace scans the ORIGINAL text,
   no rule may depend on another rule's output — the look-arounds are written so that they
   don't. */

export const NBSP = ' ';
export type Lang = 'ru' | 'en';
export type LangOption = Lang | 'auto';
export type OutputMode = 'char' | 'entity';

export type NbspOptions = {
  lang: LangOption;
  /** Also glue the last two words of every paragraph (no single-word last lines). */
  lastWords: boolean;
};

export type NbspResult = {
  /** Output with U+00A0 characters. Use toEntities() for HTML. */
  text: string;
  lang: Lang;
  /** Indices (in `text`) of spaces converted by this run. */
  added: number[];
  /** Indices of non-breaking spaces that were already there. */
  kept: number[];
};

/* Characters that may follow a glued word: a letter, a digit, an opening quote/bracket. */
const AFTER = '[\\p{L}\\p{N}«"„“‘\'(\\[]';
/* A word boundary that works for Cyrillic (\\b does not): not preceded by a letter/digit/hyphen. */
const NOT_IN_WORD = '(?<![\\p{L}\\p{N}-])';

const RU_SHORT = 'в|во|на|не|ни|но|и|а|о|об|обо|от|ото|до|для|из|изо|к|ко|с|со|у|по|за|под|подо|над|при|про|без|через|между|перед|как|что|чем|где|или|да|уж|то|вот|ведь|лишь|хоть|чтоб|если|уже|ещё|еще|так|там|тут|все|всё';
const RU_PARTICLES = 'же|ль|ли|бы|б|ж';
const RU_ABBR = 'т|стр|с|рис|табл|гл|ул|г|им|д|кв|св|см|п|пп|тыс|млн|млрд|руб|коп|ч';
const EN_SHORT = 'a|an|the|and|or|but|nor|of|to|in|on|at|by|for|as|if|so|vs|per|via|no|yet|is|be|up';
const EN_ABBR = 'Mr|Mrs|Ms|Dr|Prof|St|Mt|No|vs|p|pp|fig|ch|vol|ed|etc|e\\.g|i\\.e';

const common: RegExp[] = [
  // 10 000 → thousands groups
  /(?<=\d) (?=\d{3}(?!\d))/gu,
  // 5 кг, 10 MB, 2024 году, 30 %, 5 °C, № 5, § 3
  /(?<=\d) (?=(?:\p{L}{1,4}(?!\p{L})|%|°|₽|\$|€|£))/gu,
  /(?<=[№§]) (?=\d)/gu,
  // A. S. Pushkin / J. R. R. Tolkien — an initial glues to the next initial or the surname
  /(?<=(?<!\p{L})\p{Lu}\.) (?=\p{Lu}(?:\.|\p{Ll}))/gu,
  // "word — word": the dash never starts a line
  /(?<=\S) (?=[—–-](?:\s|$))/gu,
];

const rules: Record<Lang, RegExp[]> = {
  ru: [
    ...common,
    new RegExp(`(?<=${NOT_IN_WORD}(?:${RU_SHORT})) (?=${AFTER})`, 'giu'),
    new RegExp(`(?<=\\p{L}) (?=(?:${RU_PARTICLES})(?![\\p{L}\\p{N}]))`, 'giu'),
    new RegExp(`(?<=${NOT_IN_WORD}(?:${RU_ABBR})\\.) (?=[\\p{L}\\p{N}])`, 'giu'),
    // и т. д., т. е., т. п.
    /(?<=(?<!\p{L})т\.) (?=[едпк]\.)/giu,
  ],
  en: [
    ...common,
    new RegExp(`(?<=${NOT_IN_WORD}(?:${EN_SHORT})) (?=${AFTER})`, 'giu'),
    new RegExp(`(?<=${NOT_IN_WORD}(?:${EN_ABBR})\\.) (?=[\\p{L}\\p{N}])`, 'gu'),
  ],
};

const LAST_WORDS = / (?=\S+$)/gmu;

/** &nbsp; and its numeric forms → U+00A0, so HTML input is understood. */
export function normalize(input: string): string {
  return input.replace(/&(?:nbsp|#160|#xA0);/gi, NBSP);
}

export function detectLang(text: string): Lang {
  const cyr = (text.match(/\p{Script=Cyrillic}/gu) ?? []).length;
  const lat = (text.match(/\p{Script=Latin}/gu) ?? []).length;
  return cyr > lat ? 'ru' : 'en';
}

export function applyNbsp(input: string, options: NbspOptions): NbspResult {
  const before = normalize(input);
  const lang = options.lang === 'auto' ? detectLang(before) : options.lang;
  let text = before;
  for (const rule of rules[lang]) text = text.replace(rule, NBSP);
  if (options.lastWords) text = text.replace(LAST_WORDS, NBSP);

  // Every rule swaps one U+0020 for one U+00A0, so lengths match and a diff is a scan.
  const added: number[] = [];
  const kept: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== NBSP) continue;
    if (before[i] === NBSP) kept.push(i);
    else added.push(i);
  }
  return { text, lang, added, kept };
}

export function toEntities(text: string): string {
  return text.replaceAll(NBSP, '&nbsp;');
}

export function render(text: string, mode: OutputMode): string {
  return mode === 'entity' ? toEntities(text) : text;
}
