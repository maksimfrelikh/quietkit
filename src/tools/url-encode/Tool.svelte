<script lang="ts">
  import { onMount } from 'svelte';
  import { copyToClipboard } from 'stark-ui-kit';
  import { encodeAll, decode, parseQuery, type DecodeMode } from './engine';
  import { readOptions, readInput, writeOptions } from '~/lib/urlstate';

  type Mode = 'encode' | 'decode';
  const defaults = { mode: 'encode', plus: 'auto' };
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

  const mode = $derived((opts.mode === 'decode' ? 'decode' : 'encode') as Mode);
  const encoded = $derived(mode === 'encode' ? encodeAll(input) : null);
  const decoded = $derived(mode === 'decode' ? decode(input, opts.plus as DecodeMode) : null);
  const pairs = $derived(mode === 'decode' && input ? parseQuery(input) : null);

  let statusTimer: ReturnType<typeof setTimeout>;
  async function copy(text: string, what: string) {
    const ok = await copyToClipboard(text);
    status = ok ? `${what} copied` : 'Copy failed — select the text and copy it yourself';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status = ''), 2000);
  }
  function example() {
    input = mode === 'encode'
      ? 'https://example.com/search?q=café & crème brûlée#top'
      : 'https://example.com/search?q=caf%C3%A9+%26+cr%C3%A8me&lang=fr';
    inputEl?.focus();
  }
  function swap() {
    // Decode ⇄ encode with the current result as the new input.
    const next = mode === 'encode' ? (encoded?.component ?? '') : (decoded?.value ?? '');
    opts = { ...opts, mode: mode === 'encode' ? 'decode' : 'encode' };
    input = next;
  }
</script>

<div class="tool">
  <div class="tool-options">
    <fieldset class="opt">
      <legend>Direction</legend>
      <div class="seg">
        <label><input type="radio" name="mode" value="encode" bind:group={opts.mode} />Encode</label>
        <label><input type="radio" name="mode" value="decode" bind:group={opts.mode} />Decode</label>
      </div>
    </fieldset>
    {#if mode === 'decode'}
      <label class="opt">
        <span>Plus sign</span>
        <select bind:value={opts.plus}>
          <option value="auto">Auto (space when it looks form-encoded)</option>
          <option value="form">Always a space (form data)</option>
          <option value="component">Literal + (URL component)</option>
        </select>
      </label>
    {/if}
    <button type="button" class="pill small" onclick={swap} aria-disabled={!input}>Swap ⇄</button>
  </div>

  <div class="tool-io">
    <div class="tool-pane">
      <div class="tool-pane-head">
        <label for="url-in">Input</label>
        <div class="actions">
          <button type="button" class="pill small" onclick={example}>Example</button>
          <button type="button" class="pill small" onclick={() => { input = ''; inputEl?.focus(); }} aria-disabled={!input}>Clear</button>
        </div>
      </div>
      <textarea id="url-in" class="field" bind:this={inputEl} bind:value={input}
        placeholder={mode === 'encode' ? 'Text or URL to encode…' : 'Percent-encoded text to decode…'}
        spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
    </div>

    <div class="tool-pane" aria-live="polite">
      {#if mode === 'encode' && encoded}
        {#each [
          ['component', 'Component', 'encodeURIComponent — for a value inside a query string or path segment'],
          ['form', 'Form', 'application/x-www-form-urlencoded — what a form submits, space is +'],
          ['uri', 'Full URL', 'encodeURI — keeps / ? & = # so a whole URL stays a URL'],
        ] as [key, label, hint] (key)}
          <div class="tool-pane-head">
            <span title={hint}>{label}</span>
            <div class="actions">
              <button type="button" class="pill small" onclick={() => copy(encoded[key as keyof typeof encoded], label)} aria-disabled={!input}>Copy</button>
            </div>
          </div>
          <div class="field-out short" data-empty="—">{encoded[key as keyof typeof encoded]}</div>
        {/each}
      {:else if decoded}
        <div class="tool-pane-head">
          <span>Decoded</span>
          <div class="actions">
            <button type="button" class="pill small" onclick={() => copy(decoded.value, 'Decoded text')} aria-disabled={!input}>Copy</button>
          </div>
        </div>
        <div class="field-out" data-empty="Decoded text appears here">{decoded.value}</div>
        {#if decoded.error}<p class="status is-error" role="alert">{decoded.error}</p>{/if}
        {#if pairs && pairs.length}
          <div class="tool-pane-head"><span>Query parameters</span></div>
          <table class="kv">
            <tbody>
              {#each pairs as p, i (i)}
                <tr><th scope="row">{p.key}</th><td>{p.value}</td></tr>
              {/each}
            </tbody>
          </table>
        {/if}
      {/if}
    </div>
  </div>
  <p class="status" aria-live="polite">{status}</p>
</div>
