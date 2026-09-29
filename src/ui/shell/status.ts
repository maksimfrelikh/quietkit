/* The one transient status line per tool ("Copied", "Copy failed …"), announced politely.
   Provided by <Tool> through context so CopyButton and friends do not need wiring. */
import { getContext, setContext } from 'svelte';

const KEY = Symbol('tool-status');
export type Status = { set(message: string, ttlMs?: number): void };

export function provideStatus(status: Status): void { setContext(KEY, status); }
export function useStatus(): Status {
  return getContext<Status | undefined>(KEY) ?? { set() {} };
}
