<script lang="ts">
  /* Root of a tool island: the grid, the status line, the status context. */
  import type { Snippet } from 'svelte';
  import { provideStatus } from './status';

  let { children }: { children: Snippet } = $props();
  let status = $state('');
  let timer: ReturnType<typeof setTimeout>;
  provideStatus({
    set(message, ttlMs = 2000) {
      status = message;
      clearTimeout(timer);
      if (ttlMs > 0) timer = setTimeout(() => (status = ''), ttlMs);
    },
  });
</script>

<div class="tool">
  {@render children()}
  <p class="status" aria-live="polite">{status}</p>
</div>
