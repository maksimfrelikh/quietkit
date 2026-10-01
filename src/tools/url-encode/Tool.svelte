<script lang="ts">
  import { encodeAll, decode, parseQuery, type DecodeMode } from './engine';
  import { Tool, Options, IO, Pane, PaneHead, PillButton, CopyButton, TextInput, TextOutput, Segmented, SelectOption, urlOptions, seededInput } from '~/ui/shell';

  type Mode = 'encode' | 'decode';
  const opts = urlOptions({ mode: 'encode', plus: 'auto' });
  let input = $state('');
  let inputEl: TextInput | undefined = $state();
  seededInput((text) => (input = text));

  const mode = $derived((opts.value.mode === 'decode' ? 'decode' : 'encode') as Mode);
  const encoded = $derived(mode === 'encode' ? encodeAll(input) : null);
  const plus = $derived((['auto', 'form', 'component'].includes(opts.value.plus) ? opts.value.plus : 'auto') as DecodeMode);
  const decoded = $derived(mode === 'decode' ? decode(input, plus) : null);
  const pairs = $derived(mode === 'decode' && input ? parseQuery(input) : null);

  const flavours = [
    ['component', 'Component', 'encodeURIComponent — for a value inside a query string or path segment'],
    ['form', 'Form', 'application/x-www-form-urlencoded — what a form submits, space is +'],
    ['uri', 'Full URL', 'encodeURI — keeps / ? & = # so a whole URL stays a URL'],
  ] as const;

  const example = () => mode === 'encode'
    ? 'https://example.com/search?q=café & crème brûlée#top'
    : 'https://example.com/search?q=caf%C3%A9+%26+cr%C3%A8me&lang=fr';

  function swap() {
    // Decode ⇄ encode with the current result as the new input.
    const next = mode === 'encode' ? (encoded?.component ?? '') : (decoded?.value ?? '');
    opts.set('mode', mode === 'encode' ? 'decode' : 'encode');
    input = next;
    inputEl?.focus();
  }
</script>

<Tool>
  <Options>
    <Segmented legend="Direction" name="mode" bind:value={opts.value.mode}
      options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} />
    {#if mode === 'decode'}
      <SelectOption label="Plus sign" bind:value={opts.value.plus}>
        <option value="auto">Auto (space when it looks form-encoded)</option>
        <option value="form">Always a space (form data)</option>
        <option value="component">Literal + (URL component)</option>
      </SelectOption>
    {/if}
    <PillButton onclick={swap} disabled={!input}>Swap ⇄</PillButton>
  </Options>

  <IO>
    <TextInput id="url-in" bind:this={inputEl} bind:value={input} {example}
      placeholder={mode === 'encode' ? 'Text or URL to encode…' : 'Percent-encoded text to decode…'} />

    <Pane live>
      {#if mode === 'encode' && encoded}
        {#each flavours as [key, label, hint] (key)}
          <PaneHead {label} title={hint}>
            {#snippet actions()}<CopyButton text={encoded[key]} what={label} disabled={!input} />{/snippet}
          </PaneHead>
          <TextOutput text={encoded[key]} short />
        {/each}
      {:else if decoded}
        <PaneHead label="Decoded">
          {#snippet actions()}<CopyButton text={decoded.value} what="Decoded text" disabled={!input} />{/snippet}
        </PaneHead>
        <TextOutput text={decoded.value} empty="Decoded text appears here" />
        {#if decoded.error}<p class="status is-error" role="alert">{decoded.error}</p>{/if}
        {#if pairs && pairs.length}
          <PaneHead label="Query parameters" />
          <table class="kv">
            <tbody>
              {#each pairs as p, i (i)}
                <tr><th scope="row">{p.key}</th><td>{p.value}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}
    </Pane>
  </IO>
</Tool>
