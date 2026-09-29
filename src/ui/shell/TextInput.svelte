<script lang="ts">
  /* The input pane: label row with Example / Clear, an autofocused textarea. */
  import { onMount } from 'svelte';
  import Pane from './Pane.svelte';
  import PaneHead from './PaneHead.svelte';
  import PillButton from './PillButton.svelte';

  let {
    id, value = $bindable(''), label = 'Input', placeholder = '', example, spellcheck = false, autofocus = true,
  }: {
    id: string; value?: string; label?: string; placeholder?: string;
    /** Returns the example text; the button is shown only when given. */
    example?: () => string; spellcheck?: boolean; autofocus?: boolean;
  } = $props();

  let el: HTMLTextAreaElement | undefined = $state();
  export function focus() { el?.focus(); }
  onMount(() => { if (autofocus) el?.focus(); });
</script>

<Pane>
  <PaneHead {label} forId={id}>
    {#snippet actions()}
      {#if example}<PillButton onclick={() => { value = example(); el?.focus(); }}>Example</PillButton>{/if}
      <PillButton onclick={() => { value = ''; el?.focus(); }} disabled={!value}>Clear</PillButton>
    {/snippet}
  </PaneHead>
  <textarea {id} class="field" bind:this={el} bind:value {placeholder} {spellcheck}
    autocapitalize={spellcheck ? undefined : 'off'} autocomplete="off"></textarea>
</Pane>
