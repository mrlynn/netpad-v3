/**
 * Tests for src/lib/utils.ts
 */

import { formatDate, formatBytes } from '@/lib/utils';

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date('2026-02-05T12:30:00Z');
    const result = formatDate(date);
    // Should contain month, day, year and time
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/2026/);
  });

  it('formats a date string', () => {
    const result = formatDate('2026-01-15T09:00:00Z');
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2026/);
  });

  it('returns N/A for null', () => {
    expect(formatDate(null)).toBe('N/A');
  });

  it('returns N/A for undefined', () => {
    expect(formatDate(undefined)).toBe('N/A');
  });

  it('returns Invalid date for garbage string', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
  });

  it('returns N/A for empty string', () => {
    // empty string is falsy
    expect(formatDate('')).toBe('N/A');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('formats with decimals', () => {
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
  });

  it('formats with custom decimal places', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
  });

  it('returns Invalid size for negative bytes', () => {
    expect(formatBytes(-1)).toBe('Invalid size');
  });

  it('handles large numbers', () => {
    expect(formatBytes(1099511627776)).toBe('1 TB');
  });

  it('handles fractional MB', () => {
    const result = formatBytes(2621440); // 2.5 MB
    expect(result).toBe('2.5 MB');
  });
});
