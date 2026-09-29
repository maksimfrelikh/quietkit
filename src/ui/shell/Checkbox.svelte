<script lang="ts">
  let { label, checked = $bindable(false) }: { label: string; checked: boolean } = $props();
</script>

<label class="check opt">
  <input type="checkbox" bind:checked />
  <span class="plain">{label}</span>
</label>
