import { detectUnit, parseInput, formatAll, relative } from './engine';

const NOW = Date.UTC(2026, 8, 29, 12, 0, 0); // 2026-09-29T12:00:00Z
const ctx = { nowMs: NOW, timeZone: 'Europe/Lisbon' };

describe('detectUnit', () => {
  it('splits on magnitude', () => {
    expect(detectUnit(1_790_000_000)).toBe('seconds');
    expect(detectUnit(1_790_000_000_000)).toBe('milliseconds');
    expect(detectUnit(1_790_000_000_000_000)).toBe('microseconds');
    expect(detectUnit(1.79e18)).toBe('nanoseconds');
  });
});

describe('parseInput', () => {
  it('parses epoch numbers with auto unit', () => {
    expect(parseInput('1790000000')).toEqual({ kind: 'epoch', ms: 1_790_000_000_000, unit: 'seconds' });
    expect(parseInput(' 1790000000000 ')).toEqual({ kind: 'epoch', ms: 1_790_000_000_000, unit: 'milliseconds' });
  });
  it('honours a unit override', () => {
    expect(parseInput('1790000000', 'milliseconds')).toEqual({ kind: 'epoch', ms: 1_790_000_000, unit: 'milliseconds' });
  });
  it('accepts negative and fractional epochs', () => {
    expect(parseInput('-1')).toEqual({ kind: 'epoch', ms: -1000, unit: 'seconds' });
    expect(parseInput('1.5')).toEqual({ kind: 'epoch', ms: 1500, unit: 'seconds' });
  });
  it('parses ISO dates', () => {
    expect(parseInput('2026-09-29T12:00:00Z')).toEqual({ kind: 'date', ms: NOW });
  });
  it('rejects garbage and out-of-range values', () => {
    expect(parseInput('yesterday').kind).toBe('invalid');
    expect(parseInput('99999999999999999', 'seconds').kind).toBe('invalid');
    expect(parseInput('')).toEqual({ kind: 'empty' });
  });
});

describe('formatAll', () => {
  it('produces every row with the right values', () => {
    const rows = Object.fromEntries(formatAll(NOW, ctx).map((r) => [r.label, r.value]));
    expect(rows['Unix seconds']).toBe('1790683200');
    expect(rows['Unix milliseconds']).toBe('1790683200000');
    expect(rows['ISO 8601 UTC']).toBe('2026-09-29T12:00:00.000Z');
    expect(rows['ISO 8601 in Europe/Lisbon']).toBe('2026-09-29T13:00:00+01:00');
    expect(rows['RFC 2822']).toBe('Tue, 29 Sep 2026 12:00:00 GMT');
    expect(rows['Relative']).toBe('now');
    expect(rows['Day of week']).toBe('Tuesday (UTC)');
    expect(rows['Day of year']).toBe('272');
  });
  it('formats a UTC zone offset as Z', () => {
    const rows = Object.fromEntries(formatAll(NOW, { nowMs: NOW, timeZone: 'UTC' }).map((r) => [r.label, r.value]));
    expect(rows['ISO 8601 UTC']).toBe('2026-09-29T12:00:00.000Z');
    expect(rows['ISO 8601 in UTC']).toBe('2026-09-29T12:00:00Z');
  });
  it('floors negative epochs to seconds', () => {
    const rows = Object.fromEntries(formatAll(-1500, ctx).map((r) => [r.label, r.value]));
    expect(rows['Unix seconds']).toBe('-2');
  });
});

describe('relative', () => {
  it('reads naturally in both directions', () => {
    expect(relative(NOW - 90_000, NOW)).toBe('2 minutes ago');
    expect(relative(NOW + 36e5 * 5, NOW)).toBe('in 5 hours');
    expect(relative(NOW - 864e5 * 400, NOW)).toBe('1 year ago');
    expect(relative(NOW - 1000, NOW)).toBe('1 second ago');
  });
});
