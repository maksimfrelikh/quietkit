<script lang="ts">
  import { applyNbsp, render, NBSP, type LangOption, type OutputMode } from './engine';
  import { Tool, Options, IO, Pane, PaneHead, CopyButton, TextInput, TextOutput, Segmented, SelectOption, Checkbox, urlOptions, seededInput } from '~/ui/shell';

  const opts = urlOptions({ lang: 'auto', out: 'char', last: '0' });
  let input = $state('');
  seededInput((text) => (input = text));

  const lang = $derived((['auto', 'ru', 'en'].includes(opts.value.lang) ? opts.value.lang : 'auto') as LangOption);
  const out = $derived((opts.value.out === 'entity' ? 'entity' : 'char') as OutputMode);
  const result = $derived(applyNbsp(input, { lang, lastWords: opts.value.last === '1' }));
  const output = $derived(render(result.text, out));

  type Seg = { text: string; kind: 'text' | 'added' | 'kept' };
  const segments = $derived.by((): Seg[] => {
    const segs: Seg[] = [];
    const added = new Set(result.added);
    let buf = '';
    for (let i = 0; i < result.text.length; i++) {
      const c = result.text[i];
      if (c === NBSP) {
        if (buf) { segs.push({ text: buf, kind: 'text' }); buf = ''; }
        segs.push({ text: out === 'entity' ? '&nbsp;' : NBSP, kind: added.has(i) ? 'added' : 'kept' });
      } else buf += c;
    }
    if (buf) segs.push({ text: buf, kind: 'text' });
    return segs;
  });

  const example = () => lang === 'en'
    ? 'The quick brown fox jumps over a lazy dog on 5 May at p. 12 — and J. R. R. Tolkien approves.'
    : 'Мы с тобой пойдём в лес за грибами — А. С. Пушкин собрал бы 5 кг, и т. д.';
  const summary = $derived(input
    ? `Result · ${result.added.length} added${result.kept.length ? `, ${result.kept.length} kept` : ''}`
    : 'Result');
</script>

<Tool>
  <Options>
    <SelectOption label="Text language" bind:value={opts.value.lang}>
      <option value="auto">Auto{input ? ` (${result.lang === 'ru' ? 'Russian' : 'English'})` : ''}</option>
      <option value="ru">Russian</option>
      <option value="en">English</option>
    </SelectOption>
    <Segmented legend="Output" name="out" bind:value={opts.value.out}
      options={[{ value: 'char', label: 'Character' }, { value: 'entity', label: '&nbsp;' }]} />
    <Checkbox label="Glue the last two words of each paragraph"
      bind:checked={() => opts.value.last === '1', (v) => opts.set('last', v ? '1' : '0')} />
  </Options>

  <IO>
    <TextInput id="nbsp-in" bind:value={input} {example} spellcheck
      placeholder="Paste text. Short words, numbers, initials and dashes get glued to their neighbours…" />
    <Pane>
      <PaneHead label={summary}>
        {#snippet actions()}<CopyButton text={() => output} disabled={!input} />{/snippet}
      </PaneHead>
      <TextOutput text={output} empty="Result appears here; each non-breaking space is highlighted">
        {#each segments as s, i (i)}{#if s.kind === 'text'}{s.text}{:else}<mark class:was={s.kind === 'kept'} title={s.kind === 'kept' ? 'Already non-breaking' : 'Non-breaking space added'}>{s.text}</mark>{/if}{/each}
      </TextOutput>
    </Pane>
  </IO>
</Tool>
