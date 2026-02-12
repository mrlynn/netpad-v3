/**
 * Tests for utils.ts
 * 
 * Tests utility functions: formatDate, formatBytes
 */
import { formatDate, formatBytes } from '@/lib/utils';

describe('utils', () => {
  // ============================================
  // formatDate
  // ============================================
  describe('formatDate', () => {
    it('should format a Date object', () => {
      const date = new Date('2026-01-15T14:30:00Z');
      const result = formatDate(date);
      // Should contain month, day, year
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2026/);
    });

    it('should format a date string', () => {
      const result = formatDate('2026-06-01T10:00:00Z');
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/1/);
      expect(result).toMatch(/2026/);
    });

    it('should return N/A for null', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    it('should return N/A for undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should return Invalid date for invalid string', () => {
      expect(formatDate('not-a-date')).toBe('Invalid date');
    });

    it('should include time component', () => {
      const result = formatDate(new Date('2026-03-15T15:45:00Z'));
      // Should have hour and minutes
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  // ============================================
  // formatBytes
  // ============================================
  describe('formatBytes', () => {
    it('should return 0 Bytes for 0', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should format terabytes', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('should respect decimal places', () => {
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });

    it('should default to 2 decimal places', () => {
      expect(formatBytes(1234567)).toMatch(/^\d+\.?\d{0,2} [A-Z]+$/);
    });

    it('should return Invalid size for negative numbers', () => {
      expect(formatBytes(-1)).toBe('Invalid size');
    });

    it('should handle large numbers', () => {
      const result = formatBytes(5.5 * 1024 * 1024 * 1024);
      expect(result).toBe('5.5 GB');
    });

    it('should handle fractional bytes', () => {
      // 1500 bytes should be displayed in KB
      const result = formatBytes(1500);
      expect(result).toMatch(/KB/);
    });

    it('should treat negative decimals as 0', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB');
    });
  });
});
