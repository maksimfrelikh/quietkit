<script lang="ts">
  /* The label row above a field: a label (or a <label for>), and actions on the right. */
  import type { Snippet } from 'svelte';
  let { label, forId, title, actions }: { label: string; forId?: string; title?: string; actions?: Snippet } = $props();
</script>

<div class="tool-pane-head">
  {#if forId}<label for={forId} {title}>{label}</label>{:else}<span {title}>{label}</span>{/if}
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>
