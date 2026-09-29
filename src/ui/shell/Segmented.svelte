<script lang="ts">
  /* Two-to-four mutually exclusive choices as a segmented control (radio group underneath). */
  let { legend, name, options, value = $bindable() }: {
    legend: string; name: string; options: { value: string; label: string }[]; value: string;
  } = $props();
</script>

<fieldset class="opt">
  <legend>{legend}</legend>
  <div class="seg">
    {#each options as o (o.value)}
      <label><input type="radio" {name} value={o.value} bind:group={value} />{o.label}</label>
    {/each}
  </div>
</fieldset>
