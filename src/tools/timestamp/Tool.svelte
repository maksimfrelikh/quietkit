<script lang="ts">
  import { onMount } from 'svelte';
  import { parseInput, formatAll, UNIT_LABEL, type Unit } from './engine';
  import { Tool, Options, KeyValue, PillButton, SelectOption, urlOptions, seededInput } from '~/ui/shell';

  const opts = urlOptions({ unit: 'auto', tz: '' });
  let input = $state('');
  let inputEl: HTMLInputElement | undefined = $state();
  let nowMs = $state(0);
  let localTz = $state('UTC');
  // Zones start as ['UTC'] so a ?tz=UTC deep link resolves to an existing <option> on the
  // first render; the full list follows on mount WITH UTC KEPT FIRST — if the keyed {#each}
  // has to move the already-selected <option>, Chromium drops the selection.
  let zones: string[] = $state(['UTC']);
  seededInput((text) => (input = text));

  onMount(() => {
    localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    const all = sv ? sv.call(Intl, 'timeZone') : ['Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'];
    zones = ['UTC', ...all.filter((z) => z !== 'UTC')];
    nowMs = Date.now();
    const t = setInterval(() => (nowMs = Date.now()), 1000);
    inputEl?.focus();
    return () => clearInterval(t);
  });

  const tz = $derived(opts.value.tz || localTz);
  const unit = $derived((opts.value.unit in UNIT_LABEL ? opts.value.unit : 'auto') as Unit | 'auto');
  const parsed = $derived(parseInput(input, unit));
  const rows = $derived(
    parsed.kind === 'epoch' || parsed.kind === 'date'
      ? formatAll(parsed.ms, { nowMs, timeZone: tz }).map((r) => ({ ...r, copy: r.label !== 'Note' }))
      : [],
  );

  function useNow() {
    // A value, not "now": the page stays deterministic and the URL shareable.
    input = String(Math.floor(Date.now() / 1000));
    inputEl?.focus();
  }
</script>

<Tool>
  <Options>
    <label class="opt grow">
      <span>Timestamp or date</span>
      <input id="ts-in" type="text" class="field single" bind:this={inputEl} bind:value={input}
        placeholder="1790683200, 1790683200000 or 2026-09-29T12:00:00Z" inputmode="text" spellcheck="false" autocomplete="off" />
    </label>
    <SelectOption label="Unit" bind:value={opts.value.unit}>
      <option value="auto">Auto{parsed.kind === 'epoch' ? ` (${UNIT_LABEL[parsed.unit]})` : ''}</option>
      {#each Object.entries(UNIT_LABEL) as [k, label] (k)}<option value={k}>{label}</option>{/each}
    </SelectOption>
    <SelectOption label="Time zone" bind:value={opts.value.tz}>
      <option value="">Browser ({localTz})</option>
      {#each zones as z (z)}<option value={z}>{z}</option>{/each}
    </SelectOption>
    <PillButton onclick={useNow}>Now</PillButton>
  </Options>

  <div aria-live="polite">
    {#if parsed.kind === 'invalid'}
      <p class="status is-error" role="alert">{parsed.reason}</p>
    {:else if rows.length}
      <KeyValue {rows} />
    {:else}
      <p class="status">Type a Unix timestamp or a date. The unit is detected from the size of the number.</p>
    {/if}
  </div>
</Tool>
