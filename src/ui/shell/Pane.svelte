<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children, live = false }: { children: Snippet; live?: boolean } = $props();
</script>

<div class="tool-pane" aria-live={live ? 'polite' : undefined}>{@render children()}</div>
