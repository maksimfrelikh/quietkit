<script lang="ts">
  /* Copies `text` and reports through the tool's status line. */
  import { copyToClipboard } from 'stark-ui-kit';
  import { useStatus } from './status';
  import PillButton from './PillButton.svelte';

  let { text, what = 'Text', disabled = false }: { text: string | (() => string); what?: string; disabled?: boolean } = $props();
  const status = useStatus();
  async function copy() {
    const value = typeof text === 'function' ? text() : text;
    const ok = await copyToClipboard(value);
    status.set(ok ? `${what} copied` : 'Copy failed — select the text and copy it yourself');
  }
</script>

<PillButton onclick={copy} {disabled}>Copy</PillButton>
