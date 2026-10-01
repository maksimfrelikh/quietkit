<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, value = $bindable(), children }: { label: string; value: string; children: Snippet } = $props();
</script>

<label class="opt">
  <span>{label}</span>
  <select bind:value>{@render children()}</select>
</label>
