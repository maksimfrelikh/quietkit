<script lang="ts">
  /* A read-only text result. Pass children to render rich content (marks, links); the
     plain `text` is still what a CopyButton next to it should copy. */
  import type { Snippet } from 'svelte';
  let { text = '', empty = '—', short = false, children }: { text?: string; empty?: string; short?: boolean; children?: Snippet } = $props();
</script>

<div class="field-out" class:short data-empty={empty}>{#if children}{@render children()}{:else}{text}{/if}</div>
