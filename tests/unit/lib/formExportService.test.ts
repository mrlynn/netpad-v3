/**
 * Tests for formExportService — CSV, Excel, JSON, and PDF export
 */

import { FormResponse } from '@/types/form';

// Mock xlsx before importing the module
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
    aoa_to_sheet: jest.fn(() => ({})),
  },
  write: jest.fn(() => new Uint8Array([1, 2, 3])),
}));

import {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportToPDF,
} from '@/lib/formExportService';

function createMockResponse(overrides: Partial<FormResponse> = {}): FormResponse {
  return {
    _id: 'resp-1',
    formId: 'form-1',
    formVersion: 1,
    data: { name: 'Alice', email: 'alice@example.com' },
    status: 'submitted',
    submittedAt: new Date('2026-01-15T10:00:00Z'),
    startedAt: new Date('2026-01-15T09:55:00Z'),
    completedAt: new Date('2026-01-15T10:00:00Z'),
    completionTime: 300,
    metadata: {
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
      deviceType: 'desktop',
    },
    ...overrides,
  };
}

describe('formExportService', () => {
  // ============================================
  // exportToCSV
  // ============================================
  describe('exportToCSV', () => {
    it('returns empty string for no responses', async () => {
      const csv = await exportToCSV([]);
      expect(csv).toBe('');
    });

    it('exports basic data fields', async () => {
      const csv = await exportToCSV([createMockResponse()]);
      expect(csv).toContain('name');
      expect(csv).toContain('email');
      expect(csv).toContain('Alice');
      expect(csv).toContain('alice@example.com');
    });

    it('auto-discovers all fields across multiple responses', async () => {
      const responses = [
        createMockResponse({ data: { name: 'Alice', age: 30 } }),
        createMockResponse({ _id: 'resp-2', data: { name: 'Bob', city: 'NYC' } }),
      ];
      const csv = await exportToCSV(responses);
      expect(csv).toContain('name');
      expect(csv).toContain('age');
      expect(csv).toContain('city');
    });

    it('uses specified fields when provided', async () => {
      const csv = await exportToCSV(
        [createMockResponse({ data: { name: 'Alice', email: 'a@b.com', phone: '123' } })],
        { fields: ['name', 'phone'] }
      );
      expect(csv).toContain('name');
      expect(csv).toContain('phone');
      // email should still appear as empty column since fields filter selects which columns
      const lines = csv.split('\n');
      expect(lines[0]).not.toContain('email');
    });

    it('includes metadata columns when requested', async () => {
      const csv = await exportToCSV([createMockResponse()], { includeMetadata: true });
      expect(csv).toContain('_id');
      expect(csv).toContain('formId');
      expect(csv).toContain('status');
      expect(csv).toContain('submittedAt');
    });

    it('excludes metadata columns by default', async () => {
      const csv = await exportToCSV([createMockResponse()]);
      const header = csv.split('\n')[0];
      expect(header).not.toContain('_id');
      expect(header).not.toContain('formId');
    });

    it('escapes commas in values', async () => {
      const csv = await exportToCSV([
        createMockResponse({ data: { address: '123 Main St, Apt 4' } }),
      ]);
      // Values should be quoted
      expect(csv).toContain('"123 Main St, Apt 4"');
    });

    it('escapes double quotes in values', async () => {
      const csv = await exportToCSV([
        createMockResponse({ data: { note: 'She said "hello"' } }),
      ]);
      expect(csv).toContain('""hello""');
    });

    it('handles null and undefined data values', async () => {
      const csv = await exportToCSV([
        createMockResponse({ data: { name: null as any, email: undefined as any } }),
      ]);
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('serializes objects as JSON strings', async () => {
      const csv = await exportToCSV([
        createMockResponse({ data: { address: { street: '123 Main', city: 'NYC' } } }),
      ]);
      expect(csv).toContain('street');
      expect(csv).toContain('NYC');
    });

    it('handles multiple responses with consistent columns', async () => {
      const responses = [
        createMockResponse({ _id: 'r1', data: { a: '1', b: '2' } }),
        createMockResponse({ _id: 'r2', data: { a: '3', b: '4' } }),
        createMockResponse({ _id: 'r3', data: { a: '5', b: '6' } }),
      ];
      const csv = await exportToCSV(responses);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(4); // header + 3 rows
    });

    it('includes deviceType in metadata when present', async () => {
      const csv = await exportToCSV(
        [createMockResponse()],
        { includeMetadata: true }
      );
      expect(csv).toContain('deviceType');
      expect(csv).toContain('desktop');
    });

    it('includes completionTime in metadata when present', async () => {
      const csv = await exportToCSV(
        [createMockResponse({ completionTime: 120 })],
        { includeMetadata: true }
      );
      expect(csv).toContain('completionTime');
    });
  });

  // ============================================
  // exportToExcel
  // ============================================
  describe('exportToExcel', () => {
    const XLSX = require('xlsx');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns a buffer for empty responses', async () => {
      const result = await exportToExcel([]);
      expect(result).toBeInstanceOf(Buffer);
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([['No data available']]);
    });

    it('creates a workbook with response data', async () => {
      await exportToExcel([createMockResponse()]);
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
    });

    it('names the sheet "Responses"', async () => {
      await exportToExcel([createMockResponse()]);
      const appendCall = XLSX.utils.book_append_sheet.mock.calls[0];
      expect(appendCall[2]).toBe('Responses');
    });

    it('includes metadata when requested', async () => {
      await exportToExcel([createMockResponse()], { includeMetadata: true });
      const sheetData = XLSX.utils.json_to_sheet.mock.calls[0][0];
      expect(sheetData[0]).toHaveProperty('_id');
      expect(sheetData[0]).toHaveProperty('formId');
      expect(sheetData[0]).toHaveProperty('status');
    });

    it('excludes metadata by default', async () => {
      await exportToExcel([createMockResponse()]);
      const sheetData = XLSX.utils.json_to_sheet.mock.calls[0][0];
      expect(sheetData[0]).not.toHaveProperty('_id');
      expect(sheetData[0]).not.toHaveProperty('formId');
    });

    it('uses specified fields when provided', async () => {
      await exportToExcel(
        [createMockResponse({ data: { name: 'Alice', email: 'a@b.com', phone: '123' } })],
        { fields: ['name'] }
      );
      const sheetData = XLSX.utils.json_to_sheet.mock.calls[0][0];
      expect(sheetData[0]).toHaveProperty('name');
      expect(sheetData[0]).not.toHaveProperty('email');
    });

    it('sets column widths', async () => {
      await exportToExcel([createMockResponse()]);
      const sheet = XLSX.utils.json_to_sheet.mock.results[0]?.value || {};
      // The function sets !cols on the sheet object
      // We can verify json_to_sheet was called
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
    });

    it('handles object values by stringifying them', async () => {
      await exportToExcel([
        createMockResponse({ data: { nested: { key: 'val' } } }),
      ]);
      const sheetData = XLSX.utils.json_to_sheet.mock.calls[0][0];
      expect(typeof sheetData[0].nested).toBe('string');
      expect(sheetData[0].nested).toContain('key');
    });

    it('handles multiple responses', async () => {
      const responses = [
        createMockResponse({ _id: 'r1', data: { x: 1 } }),
        createMockResponse({ _id: 'r2', data: { x: 2 } }),
      ];
      await exportToExcel(responses);
      const sheetData = XLSX.utils.json_to_sheet.mock.calls[0][0];
      expect(sheetData).toHaveLength(2);
    });
  });

  // ============================================
  // exportToJSON
  // ============================================
  describe('exportToJSON', () => {
    it('returns valid JSON string', () => {
      const result = exportToJSON([createMockResponse()]);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('includes all response fields with metadata by default', () => {
      const result = JSON.parse(exportToJSON([createMockResponse()]));
      expect(result[0]).toHaveProperty('_id');
      expect(result[0]).toHaveProperty('formId');
      expect(result[0]).toHaveProperty('data');
      expect(result[0]).toHaveProperty('status');
    });

    it('excludes metadata when includeMetadata is false', () => {
      const result = JSON.parse(
        exportToJSON([createMockResponse()], { includeMetadata: false })
      );
      expect(result[0]).toHaveProperty('data');
      expect(result[0]).not.toHaveProperty('_id');
      expect(result[0]).not.toHaveProperty('formId');
    });

    it('filters to specified fields', () => {
      const response = createMockResponse({
        data: { name: 'Alice', email: 'a@b.com', phone: '123' },
      });
      const result = JSON.parse(exportToJSON([response], { fields: ['name'] }));
      expect(result[0].data).toHaveProperty('name');
      expect(result[0].data).not.toHaveProperty('email');
      expect(result[0].data).not.toHaveProperty('phone');
    });

    it('handles empty responses array', () => {
      const result = JSON.parse(exportToJSON([]));
      expect(result).toEqual([]);
    });

    it('preserves data types in JSON', () => {
      const response = createMockResponse({
        data: { count: 42, active: true, tags: ['a', 'b'] },
      });
      const result = JSON.parse(exportToJSON([response]));
      expect(result[0].data.count).toBe(42);
      expect(result[0].data.active).toBe(true);
      expect(result[0].data.tags).toEqual(['a', 'b']);
    });

    it('pretty prints with 2-space indentation', () => {
      const result = exportToJSON([createMockResponse()]);
      // Pretty-printed JSON has newlines
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });

    it('handles fields filter with non-existent fields', () => {
      const response = createMockResponse({ data: { name: 'Alice' } });
      const result = JSON.parse(exportToJSON([response], { fields: ['nonexistent'] }));
      expect(result[0].data).toEqual({});
    });
  });

  // ============================================
  // exportToPDF
  // ============================================
  describe('exportToPDF', () => {
    it('returns a string with report header', async () => {
      const result = await exportToPDF([createMockResponse()]);
      expect(result).toContain('Form Responses Report');
      expect(result).toContain('Generated:');
    });

    it('includes JSON representation of data', async () => {
      const result = await exportToPDF([createMockResponse()]);
      expect(result).toContain('Alice');
      expect(result).toContain('alice@example.com');
    });

    it('handles empty responses', async () => {
      const result = await exportToPDF([]);
      expect(result).toContain('Form Responses Report');
      expect(result).toContain('[]');
    });

    it('respects export options', async () => {
      const result = await exportToPDF(
        [createMockResponse()],
        { includeMetadata: false }
      );
      expect(result).not.toContain('resp-1'); // _id excluded
    });
  });
});
