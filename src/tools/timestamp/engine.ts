/* Timestamp converter. Pure: everything time-dependent (now, the viewer's time zone) is
   passed in, so the engine is deterministic and testable in Node.

   Input is either an epoch number (unit auto-detected by magnitude) or a date string
   that Date.parse understands (ISO 8601 first of all). */

export type Unit = 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';

const UNIT_FACTOR: Record<Unit, number> = {
  seconds: 1000,
  milliseconds: 1,
  microseconds: 1 / 1000,
  nanoseconds: 1 / 1_000_000,
};

/** Decide the unit of an epoch number by its magnitude. Boundaries: 1e11 s is year 5138,
    so anything larger cannot be seconds; the same reasoning at each step. */
export function detectUnit(abs: number): Unit {
  if (abs < 1e11) return 'seconds';
  if (abs < 1e14) return 'milliseconds';
  if (abs < 1e17) return 'microseconds';
  return 'nanoseconds';
}

export type Parsed =
  | { kind: 'epoch'; ms: number; unit: Unit }
  | { kind: 'date'; ms: number }
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: string };

export function parseInput(raw: string, unitOverride: Unit | 'auto' = 'auto'): Parsed {
  const s = raw.trim();
  if (!s) return { kind: 'empty' };
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    const unit = unitOverride === 'auto' ? detectUnit(Math.abs(n)) : unitOverride;
    const ms = n * UNIT_FACTOR[unit];
    if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) {
      return { kind: 'invalid', reason: 'Out of range for a date.' };
    }
    return { kind: 'epoch', ms, unit };
  }
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return { kind: 'invalid', reason: 'Not a number and not a date I can parse. Try ISO 8601, e.g. 2026-09-29T12:00:00Z.' };
  return { kind: 'date', ms };
}

export type Row = { label: string; value: string };


/** ISO 8601 with a fixed offset for a time zone, e.g. 2026-09-29T14:00:00+02:00. */
function isoInZone(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(ms));
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  let offset = get('timeZoneName').replace('GMT', '');
  if (/^[+-]\d{2}$/.test(offset)) offset += ':00';
  if (offset === '' || offset === '+00:00' || offset === '-00:00') offset = 'Z';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offset}`;
}

export function relative(ms: number, nowMs: number): string {
  const diff = ms - nowMs;
  const abs = Math.abs(diff);
  if (abs < 1000) return 'now';
  const units: [string, number][] = [
    ['year', 365.25 * 864e5], ['month', 30.44 * 864e5], ['day', 864e5],
    ['hour', 36e5], ['minute', 6e4], ['second', 1e3],
  ];
  for (const [name, size] of units) {
    if (abs >= size || name === 'second') {
      const n = Math.round(abs / size);
      const word = n === 1 ? name : `${name}s`;
      return diff < 0 ? `${n} ${word} ago` : `in ${n} ${word}`;
    }
  }
  return 'now';
}

export type FormatContext = { nowMs: number; timeZone: string };

export function formatAll(ms: number, ctx: FormatContext): Row[] {
  const d = new Date(ms);
  const secs = Math.floor(ms / 1000);
  const rows: Row[] = [
    { label: 'Unix seconds', value: String(secs) },
    { label: 'Unix milliseconds', value: String(Math.trunc(ms)) },
    { label: 'ISO 8601 UTC', value: d.toISOString() },
    { label: `ISO 8601 in ${ctx.timeZone}`, value: isoInZone(ms, ctx.timeZone) },
    { label: 'RFC 2822', value: d.toUTCString() },
    {
      label: `Local (${ctx.timeZone})`,
      value: new Intl.DateTimeFormat('en-GB', {
        timeZone: ctx.timeZone, dateStyle: 'full', timeStyle: 'long',
      }).format(d),
    },
    { label: 'Relative', value: relative(ms, ctx.nowMs) },
    { label: 'Day of week', value: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(d) + ' (UTC)' },
    { label: 'Day of year', value: String(dayOfYear(d)) },
  ];
  const frac = ms - Math.trunc(ms);
  if (frac !== 0) rows.push({ label: 'Note', value: `Sub-millisecond part ${frac.toFixed(6)} ms is not representable by Date and was dropped.` });
  return rows;
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 864e5) + 1;
}

export const UNIT_LABEL: Record<Unit, string> = {
  seconds: 'seconds', milliseconds: 'milliseconds', microseconds: 'microseconds', nanoseconds: 'nanoseconds',
};
