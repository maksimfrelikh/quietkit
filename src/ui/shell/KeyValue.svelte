<script lang="ts">
  /* Label/value rows, each value with its own Copy unless marked otherwise. */
  import CopyButton from './CopyButton.svelte';
  export type Row = { label: string; value: string; copy?: boolean };
  let { rows }: { rows: Row[] } = $props();
</script>

<table class="kv">
  <tbody>
    {#each rows as r (r.label)}
      <tr>
        <th scope="row">{r.label}</th>
        <td>{r.value}{#if r.copy !== false}<CopyButton text={r.value} what={r.label} />{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>
