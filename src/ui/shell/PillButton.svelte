<script lang="ts">
  import type { Snippet } from 'svelte';
  let { onclick, disabled = false, children }: { onclick: () => void; disabled?: boolean; children: Snippet } = $props();
</script>

<button type="button" class="pill small" {onclick} aria-disabled={disabled || undefined}>{@render children()}</button>
