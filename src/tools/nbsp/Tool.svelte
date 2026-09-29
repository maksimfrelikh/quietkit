<script lang="ts">
  import { onMount } from 'svelte';
  import { copyToClipboard } from 'stark-ui-kit';
  import { applyNbsp, render, NBSP, type LangOption, type OutputMode } from './engine';
  import { readOptions, readInput, writeOptions } from '~/lib/urlstate';

  const defaults = { lang: 'auto', out: 'char', last: '0' };
  let opts = $state({ ...defaults });
  let input = $state('');
  let inputEl: HTMLTextAreaElement | undefined = $state();
  let status = $state('');

  onMount(() => {
    opts = readOptions(defaults);
    const seeded = readInput();
    if (seeded !== null) input = seeded;
    inputEl?.focus();
  });
  $effect(() => { writeOptions(opts, defaults); });

  const lang = $derived((['auto', 'ru', 'en'].includes(opts.lang) ? opts.lang : 'auto') as LangOption);
  const out = $derived((opts.out === 'entity' ? 'entity' : 'char') as OutputMode);
  const result = $derived(applyNbsp(input, { lang, lastWords: opts.last === '1' }));
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

  let statusTimer: ReturnType<typeof setTimeout>;
  async function copy() {
    const ok = await copyToClipboard(output);
    status = ok ? 'Copied' : 'Copy failed — select the text and copy it yourself';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status = ''), 2000);
  }
  function example() {
    input = lang === 'en'
      ? 'The quick brown fox jumps over a lazy dog on 5 May at p. 12 — and J. R. R. Tolkien approves.'
      : 'Мы с тобой пойдём в лес за грибами — А. С. Пушкин собрал бы 5 кг, и т. д.';
    inputEl?.focus();
  }
</script>

<div class="tool">
  <div class="tool-options">
    <label class="opt">
      <span>Text language</span>
      <select bind:value={opts.lang}>
        <option value="auto">Auto{input ? ` (${result.lang === 'ru' ? 'Russian' : 'English'})` : ''}</option>
        <option value="ru">Russian</option>
        <option value="en">English</option>
      </select>
    </label>
    <fieldset class="opt">
      <legend>Output</legend>
      <div class="seg">
        <label><input type="radio" name="out" value="char" bind:group={opts.out} />Character</label>
        <label><input type="radio" name="out" value="entity" bind:group={opts.out} />&amp;nbsp;</label>
      </div>
    </fieldset>
    <label class="check opt">
      <input type="checkbox" checked={opts.last === '1'} onchange={(e) => (opts = { ...opts, last: (e.currentTarget as HTMLInputElement).checked ? '1' : '0' })} />
      <span class="plain">Glue the last two words of each paragraph</span>
    </label>
  </div>

  <div class="tool-io">
    <div class="tool-pane">
      <div class="tool-pane-head">
        <label for="nbsp-in">Input</label>
        <div class="actions">
          <button type="button" class="pill small" onclick={example}>Example</button>
          <button type="button" class="pill small" onclick={() => { input = ''; inputEl?.focus(); }} aria-disabled={!input}>Clear</button>
        </div>
      </div>
      <textarea id="nbsp-in" class="field" bind:this={inputEl} bind:value={input}
        placeholder="Paste text. Short words, numbers, initials and dashes get glued to their neighbours…"
        spellcheck="false"></textarea>
    </div>
    <div class="tool-pane">
      <div class="tool-pane-head">
        <span>Result{input ? ` · ${result.added.length} added${result.kept.length ? `, ${result.kept.length} kept` : ''}` : ''}</span>
        <div class="actions">
          <button type="button" class="pill small" onclick={copy} aria-disabled={!input}>Copy</button>
        </div>
      </div>
      <div class="field-out" aria-live="polite" data-empty="Result appears here; each non-breaking space is highlighted">{#each segments as s, i (i)}{#if s.kind === 'text'}{s.text}{:else}<mark class:was={s.kind === 'kept'} title={s.kind === 'kept' ? 'Already non-breaking' : 'Non-breaking space added'}>{s.text}</mark>{/if}{/each}</div>
    </div>
  </div>
  <p class="status" aria-live="polite">{status}</p>
</div>
