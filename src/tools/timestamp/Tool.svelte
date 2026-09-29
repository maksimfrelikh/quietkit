<script lang="ts">
  import { onMount } from 'svelte';
  import { copyToClipboard } from 'stark-ui-kit';
  import { parseInput, formatAll, UNIT_LABEL, type Unit } from './engine';
  import { readOptions, readInput, writeOptions } from '~/lib/urlstate';

  const defaults = { unit: 'auto', tz: '' };
  let opts = $state({ ...defaults });
  let input = $state('');
  let inputEl: HTMLInputElement | undefined = $state();
  let status = $state('');
  let nowMs = $state(0);
  let localTz = $state('UTC');
  let zones: string[] = $state([]);

  onMount(() => {
    opts = readOptions(defaults);
    const seeded = readInput();
    if (seeded !== null) input = seeded;
    localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    // Full zone list when the browser has it; a short one otherwise.
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    zones = sv ? sv.call(Intl, 'timeZone') : ['UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'];
    nowMs = Date.now();
    const t = setInterval(() => (nowMs = Date.now()), 1000);
    inputEl?.focus();
    return () => clearInterval(t);
  });
  $effect(() => { writeOptions(opts, defaults); });

  const tz = $derived(opts.tz || localTz);
  const unit = $derived((opts.unit in UNIT_LABEL ? opts.unit : 'auto') as Unit | 'auto');
  const parsed = $derived(parseInput(input, unit));
  const rows = $derived(parsed.kind === 'epoch' || parsed.kind === 'date' ? formatAll(parsed.ms, { nowMs, timeZone: tz }) : []);

  let statusTimer: ReturnType<typeof setTimeout>;
  async function copy(text: string, what: string) {
    const ok = await copyToClipboard(text);
    status = ok ? `${what} copied` : 'Copy failed — select the text and copy it yourself';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status = ''), 2000);
  }
  function useNow() {
    // A value, not "now": the page stays deterministic and the URL shareable.
    input = String(Math.floor(Date.now() / 1000));
    inputEl?.focus();
  }
</script>

<div class="tool">
  <div class="tool-options">
    <label class="opt grow">
      <span>Timestamp or date</span>
      <input id="ts-in" type="text" class="field single" bind:this={inputEl} bind:value={input}
        placeholder="1790683200, 1790683200000 or 2026-09-29T12:00:00Z" inputmode="text" spellcheck="false" autocomplete="off" />
    </label>
    <label class="opt">
      <span>Unit</span>
      <select bind:value={opts.unit}>
        <option value="auto">Auto{parsed.kind === 'epoch' ? ` (${UNIT_LABEL[parsed.unit]})` : ''}</option>
        {#each Object.entries(UNIT_LABEL) as [k, label] (k)}<option value={k}>{label}</option>{/each}
      </select>
    </label>
    <label class="opt">
      <span>Time zone</span>
      <select bind:value={opts.tz}>
        <option value="">Browser ({localTz})</option>
        {#each zones as z (z)}<option value={z}>{z}</option>{/each}
      </select>
    </label>
    <button type="button" class="pill small" onclick={useNow}>Now</button>
  </div>

  <div aria-live="polite">
    {#if parsed.kind === 'invalid'}
      <p class="status is-error" role="alert">{parsed.reason}</p>
    {:else if rows.length}
      <table class="kv">
        <tbody>
          {#each rows as r (r.label)}
            <tr>
              <th scope="row">{r.label}</th>
              <td>{r.value}{#if r.label !== 'Note'}<button type="button" class="pill small" onclick={() => copy(r.value, r.label)}>Copy</button>{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="status">Type a Unix timestamp or a date. The unit is detected from the size of the number.</p>
    {/if}
  </div>
  <p class="status" aria-live="polite">{status}</p>
</div>
