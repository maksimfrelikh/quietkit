/* Tool options as reactive state mirrored to the URL. Lifted from the first three tools,
   where every one of them had the same three lines: read on mount, write in an effect,
   seed the input from ?input= once. The asymmetry (options written, input read-only) is
   the rule from docs/SPEC.md § 2.8 and lives in ~/lib/urlstate. */
import { onMount } from 'svelte';
import { readOptions, readInput, writeOptions } from '~/lib/urlstate';

export type Options<T extends Record<string, string>> = {
  /** The live options object; bind to its fields (`bind:value={opts.value.mode}`). */
  value: T;
  /** Replace one key immutably (for controls that cannot bind). */
  set<K extends keyof T>(key: K, v: T[K]): void;
};

export function urlOptions<T extends Record<string, string>>(defaults: T): Options<T> {
  let value = $state({ ...defaults }) as T;
  // onMount before $effect on purpose: the read must land before the first write.
  onMount(() => { value = readOptions(defaults); });
  $effect(() => { writeOptions(value, defaults); });
  return {
    get value() { return value; },
    set value(v: T) { value = v; },
    set(key, v) { value = { ...value, [key]: v }; },
  };
}

/** Input seeded from a deep link. Read once, on mount, never written back. */
export function seededInput(apply: (text: string) => void): void {
  onMount(() => {
    const seeded = readInput();
    if (seeded !== null) apply(seeded);
  });
}
