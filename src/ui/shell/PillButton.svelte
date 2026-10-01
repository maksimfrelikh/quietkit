<script lang="ts">
  /* aria-disabled rather than disabled so the button stays focusable and announced; the
     CSS blocks the pointer, this guard blocks Enter/Space — without it a focused "disabled"
     button still fired (Copy copied an empty string and reported success). */
  import type { Snippet } from 'svelte';
  let { onclick, disabled = false, children }: { onclick: () => void; disabled?: boolean; children: Snippet } = $props();
</script>

<button type="button" class="pill small" onclick={() => { if (!disabled) onclick(); }} aria-disabled={disabled || undefined}>{@render children()}</button>
