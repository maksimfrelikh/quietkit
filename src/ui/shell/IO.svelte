<script lang="ts">
  /* Split input/output: one column on phones, two from 900px (app.css .tool-io). */
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div class="tool-io">{@render children()}</div>
