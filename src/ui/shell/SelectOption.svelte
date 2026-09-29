<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, value = $bindable(), grow = false, children }: { label: string; value: string; grow?: boolean; children: Snippet } = $props();
</script>

<label class="opt" class:grow>
  <span>{label}</span>
  <select bind:value>{@render children()}</select>
</label>
