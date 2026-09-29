import { applyNbsp, detectLang, normalize, toEntities, NBSP as N } from './engine';

const ru = (s: string, lastWords = false) => applyNbsp(s, { lang: 'ru', lastWords }).text;
const en = (s: string, lastWords = false) => applyNbsp(s, { lang: 'en', lastWords }).text;

describe('russian rules', () => {
  it('glues prepositions and conjunctions to the following word', () => {
    expect(ru('Я пошёл в лес и увидел на поляне зайца.'))
      .toBe(`Я пошёл в${N}лес и${N}увидел на${N}поляне зайца.`);
  });
  it('handles a run of short words and a sentence-initial capital', () => {
    expect(ru('И в лесу тихо. В доме тепло.')).toBe(`И${N}в${N}лесу тихо. В${N}доме тепло.`);
  });
  it('does not touch short words inside longer words or before punctuation', () => {
    expect(ru('снова и, опять')).toBe('снова и, опять');
    expect(ru('вода')).toBe('вода');
  });
  it('attaches particles to the previous word', () => {
    expect(ru('Так же, как и ты. Читали ли вы?')).toBe(`Так${N}же, как${N}и${N}ты. Читали${N}ли вы?`);
  });
  it('glues numbers to short units and words, and groups thousands', () => {
    expect(ru('Вес 5 кг, цена 10 000 ₽, в 2024 году, скидка 30 %'))
      .toBe(`Вес 5${N}кг, цена 10${N}000${N}₽, в${N}2024${N}году, скидка 30${N}%`);
    expect(ru('10 человек')).toBe('10 человек');
  });
  it('glues initials and common abbreviations', () => {
    expect(ru('А. С. Пушкин жил на ул. Мойки, см. стр. 12, и т. д.'))
      .toBe(`А.${N}С.${N}Пушкин жил на${N}ул.${N}Мойки, см.${N}стр.${N}12, и${N}т.${N}д.`);
  });
  it('keeps the dash off the line start', () => {
    expect(ru('Москва — столица, а Питер – нет')).toBe(`Москва${N}— столица, а${N}Питер${N}– нет`);
  });
});

describe('english rules', () => {
  it('glues articles, conjunctions and short prepositions', () => {
    expect(en('The cat sat on a mat and looked at me.'))
      .toBe(`The${N}cat sat on${N}a${N}mat and${N}looked at${N}me.`);
  });
  it('glues initials, honorifics and page references', () => {
    expect(en('J. R. R. Tolkien wrote about Mr. Baggins, see p. 12'))
      .toBe(`J.${N}R.${N}R.${N}Tolkien wrote about Mr.${N}Baggins, see p.${N}12`);
  });
  it('leaves capitalised words that are not abbreviations alone', () => {
    expect(en('Made in Paris. Next sentence')).toBe(`Made in${N}Paris. Next sentence`);
  });
});

describe('idempotence and existing spaces', () => {
  const samples = [
    'Я пошёл в лес и увидел на поляне зайца — 5 кг, А. С. Пушкин, 10 000 ₽',
    'The cat sat on a mat with Mr. Baggins at p. 12 — really',
  ];
  it('is a fixed point', () => {
    for (const s of samples) {
      const once = applyNbsp(s, { lang: 'auto', lastWords: true });
      const twice = applyNbsp(once.text, { lang: 'auto', lastWords: true });
      expect(twice.text).toBe(once.text);
      expect(twice.added).toEqual([]);
      expect(twice.kept).toEqual([...once.added, ...once.kept].sort((a, b) => a - b));
    }
  });
  it('understands &nbsp; on input and reports it as kept, not added', () => {
    const r = applyNbsp('в&nbsp;лесу и на поляне', { lang: 'ru', lastWords: false });
    expect(r.text).toBe(`в${N}лесу и${N}на${N}поляне`);
    expect(r.kept).toEqual([1]);
    expect(r.added).toEqual([8, 11]);
  });
  it('normalizes numeric entities too', () => {
    expect(normalize('a&#160;b&#xA0;c&NBSP;d')).toBe(`a${N}b${N}c${N}d`);
  });
});

describe('options', () => {
  it('glues the last two words of each paragraph when asked', () => {
    expect(en('one two three\nfour five\n\nsix', true)).toBe(`one two${N}three\nfour${N}five\n\nsix`);
    expect(en('one two three', false)).toBe('one two three');
  });
  it('detects the language by script', () => {
    expect(detectLang('Привет, world')).toBe('ru');
    expect(detectLang('Hello, мир and more')).toBe('en');
    expect(detectLang('123')).toBe('en');
  });
  it('renders entities for HTML', () => {
    expect(toEntities(`a${N}b`)).toBe('a&nbsp;b');
  });
});
