import { encodeAll, decode, parseQuery } from './engine';

describe('encodeAll', () => {
  it('encodes the three flavours differently where they differ', () => {
    const r = encodeAll("a b&c=d/e?f#g!'()*");
    expect(r.component).toBe("a%20b%26c%3Dd%2Fe%3Ff%23g!'()*");
    expect(r.uri).toBe("a%20b&c=d/e?f#g!'()*");
    expect(r.form).toBe('a+b%26c%3Dd%2Fe%3Ff%23g%21%27%28%29%2A');
  });
  it('handles non-Latin text as UTF-8', () => {
    expect(encodeAll('привет').component).toBe('%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
    expect(encodeAll('日本').form).toBe('%E6%97%A5%E6%9C%AC');
  });
  it('is empty for empty input', () => {
    expect(encodeAll('')).toEqual({ component: '', uri: '', form: '' });
  });
});

describe('decode', () => {
  it('round-trips component encoding', () => {
    const s = "a b&c=d/e?f#g привет";
    expect(decode(encodeAll(s).component).value).toBe(s);
  });
  it('treats + as a space only in form mode or when the input looks form-encoded', () => {
    expect(decode('a+b', 'form').value).toBe('a b');
    expect(decode('a+b', 'component').value).toBe('a+b');
    expect(decode('a+b').value).toBe('a b');          // auto: no spaces, no %20 → form
    expect(decode('a+b%20c').value).toBe('a+b c');    // auto: %20 present → literal +
    expect(decode('1 + 1').value).toBe('1 + 1');      // auto: literal spaces → literal +
  });
  it('reports a malformed escape and keeps the rest', () => {
    const r = decode('100%25 sure%');
    expect(r.value).toBe('100% sure%');
    expect(r.error).toMatch(/position 11/);
  });
  it('reports bad UTF-8 without throwing', () => {
    const r = decode('%E0%A4');
    expect(r.value).toBe('%E0%A4');
    expect(r.error).toBeDefined();
  });
});

describe('parseQuery', () => {
  it('parses a full URL and a bare query string alike', () => {
    expect(parseQuery('https://x.dev/p?a=1&b=two+words&c=%D0%B4#frag')).toEqual([
      { key: 'a', value: '1' }, { key: 'b', value: 'two words' }, { key: 'c', value: 'д' },
    ]);
    expect(parseQuery('a=1&b=2')).toEqual([{ key: 'a', value: '1' }, { key: 'b', value: '2' }]);
  });
  it('keeps keys without a value and repeated keys', () => {
    expect(parseQuery('flag&x=1&x=2')).toEqual([
      { key: 'flag', value: '' }, { key: 'x', value: '1' }, { key: 'x', value: '2' },
    ]);
  });
  it('returns null for something that is not a query string', () => {
    expect(parseQuery('hello world')).toBeNull();
    expect(parseQuery('https://x.dev/path')).toBeNull();
  });
});
