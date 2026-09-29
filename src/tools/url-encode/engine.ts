/* URL encode / decode. Pure: string in, structured result out.
   Three encodings people mix up, shown side by side:
     component — encodeURIComponent: everything but A-Z a-z 0-9 - _ . ! ~ * ' ( )
     uri       — encodeURI: keeps the URL delimiters ; , / ? : @ & = + $ #
     form      — application/x-www-form-urlencoded: like component, but space → "+"
                 and ! ' ( ) * are encoded too (what a <form> submits, what
                 URLSearchParams produces). */

export type Encoded = { component: string; uri: string; form: string };

export function encodeAll(input: string): Encoded {
  const component = encodeURIComponent(input);
  return {
    component,
    uri: encodeURI(input),
    form: component
      .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
      .replace(/%20/g, '+'),
  };
}

export type DecodeMode = 'auto' | 'component' | 'form';
export type Decoded = { value: string; error?: string };

/** Decode a percent-encoded string. `form` also turns "+" into a space; `auto` does so
    only when the input has no literal spaces and no %20 (a strong sign it came from a form). */
export function decode(input: string, mode: DecodeMode = 'auto'): Decoded {
  const plusIsSpace =
    mode === 'form' || (mode === 'auto' && input.includes('+') && !/%20| /.test(input));
  const src = plusIsSpace ? input.replace(/\+/g, ' ') : input;
  try {
    return { value: decodeURIComponent(src) };
  } catch {
    // Malformed sequence (e.g. a lone "%" or "%E0" cut short). Decode what we can, keep
    // the broken bytes verbatim, and say where the first one is.
    const bad = src.search(/%(?![0-9A-Fa-f]{2})/);
    const value = src.replace(/(%[0-9A-Fa-f]{2})+/g, (run) => {
      try { return decodeURIComponent(run); } catch { return run; }
    });
    return {
      value,
      error: bad >= 0
        ? `Malformed escape at position ${bad}; shown as-is.`
        : 'Some escapes do not form valid UTF-8; shown as-is.',
    };
  }
}

export type QueryPair = { key: string; value: string };

/** Parse the query part of a URL (or a bare query string) into pairs, form-decoded.
    Returns null when the input has no "=" anywhere, i.e. is not a query string. */
export function parseQuery(input: string): QueryPair[] | null {
  const qIndex = input.indexOf('?');
  let q = qIndex >= 0 ? input.slice(qIndex + 1) : input;
  const hash = q.indexOf('#');
  if (hash >= 0) q = q.slice(0, hash);
  if (!q.includes('=')) return null;
  return q
    .split('&')
    .filter((p) => p.length > 0)
    .map((pair) => {
      const eq = pair.indexOf('=');
      const rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
      const rawValue = eq >= 0 ? pair.slice(eq + 1) : '';
      return { key: decode(rawKey, 'form').value, value: decode(rawValue, 'form').value };
    });
}
