/**
 * Tests for dataExport module
 */
import {
  exportToCSV,
  exportToJSON,
  exportToJSONL,
  exportToTSV,
  exportDocuments,
  getMimeType,
  getFileExtension,
} from '@/lib/dataExport';

const sampleDocs = [
  { _id: '1', name: 'Alice', age: 30 },
  { _id: '2', name: 'Bob', age: 25 },
];

describe('dataExport', () => {
  // ============================================
  // exportToCSV
  // ============================================
  describe('exportToCSV', () => {
    it('should export basic documents', () => {
      const csv = exportToCSV(sampleDocs);
      const lines = csv.split('\n');
      expect(lines[0]).toContain('_id');
      expect(lines[0]).toContain('name');
      expect(lines).toHaveLength(3); // header + 2 rows
    });

    it('should return empty string for empty array', () => {
      expect(exportToCSV([])).toBe('');
    });

    it('should exclude _id when includeId is false', () => {
      const csv = exportToCSV(sampleDocs, { includeId: false });
      expect(csv.split('\n')[0]).not.toContain('_id');
    });

    it('should flatten nested objects', () => {
      const docs = [{ _id: '1', address: { city: 'NYC', zip: '10001' } }];
      const csv = exportToCSV(docs);
      expect(csv).toContain('address.city');
      expect(csv).toContain('NYC');
    });

    it('should handle null values with default empty string', () => {
      const docs = [{ _id: '1', name: null }];
      const csv = exportToCSV(docs);
      const lines = csv.split('\n');
      // Second line: _id value, then empty for null
      expect(lines[1]).toContain('1');
    });

    it('should use custom nullValue', () => {
      const docs = [{ _id: '1', name: null }] as any;
      const csv = exportToCSV(docs, { nullValue: 'N/A' });
      expect(csv).toContain('N/A');
    });

    it('should escape values containing commas', () => {
      const docs = [{ _id: '1', name: 'Doe, John' }];
      const csv = exportToCSV(docs);
      expect(csv).toContain('"Doe, John"');
    });

    it('should escape values containing quotes', () => {
      const docs = [{ _id: '1', name: 'He said "hello"' }];
      const csv = exportToCSV(docs);
      expect(csv).toContain('"He said ""hello"""');
    });

    it('should escape values containing newlines', () => {
      const docs = [{ _id: '1', bio: 'line1\nline2' }];
      const csv = exportToCSV(docs);
      expect(csv).toContain('"line1\nline2"');
    });

    it('should use custom delimiter', () => {
      const csv = exportToCSV(sampleDocs, { delimiter: ';' });
      expect(csv.split('\n')[0]).toContain(';');
    });

    it('should filter to specific fields', () => {
      const csv = exportToCSV(sampleDocs, { fields: ['name'] });
      const header = csv.split('\n')[0];
      expect(header).toBe('name');
    });

    it('should handle Date values with ISO format', () => {
      const docs = [{ _id: '1', created: new Date('2026-01-15T00:00:00Z') }];
      const csv = exportToCSV(docs);
      expect(csv).toContain('2026-01-15T00:00:00.000Z');
    });

    it('should handle Date values with timestamp format', () => {
      const d = new Date('2026-01-15T00:00:00Z');
      const docs = [{ _id: '1', created: d }];
      const csv = exportToCSV(docs, { dateFormat: 'timestamp' });
      expect(csv).toContain(d.getTime().toString());
    });

    it('should handle Date values with locale format', () => {
      const docs = [{ _id: '1', created: new Date('2026-01-15T00:00:00Z') }];
      const csv = exportToCSV(docs, { dateFormat: 'locale' });
      // Should contain some date string
      expect(csv.split('\n')[1].length).toBeGreaterThan(0);
    });

    it('should handle arrays in values', () => {
      const docs = [{ _id: '1', tags: ['a', 'b'] }];
      const csv = exportToCSV(docs);
      // Arrays get JSON.stringified then CSV-escaped (contains commas)
      expect(csv).toContain('[""a""');
    });

    it('should handle ObjectId format ($oid)', () => {
      const docs = [{ _id: { $oid: '507f1f77bcf86cd799439011' }, name: 'Test' }];
      const csv = exportToCSV(docs);
      expect(csv).toContain('507f1f77bcf86cd799439011');
    });

    it('should handle extended JSON date ($date)', () => {
      const docs = [{ _id: '1', created: { $date: '2026-01-15T00:00:00Z' } }];
      const csv = exportToCSV(docs);
      expect(csv).toContain('2026-01-15');
    });

    it('should return empty for docs with no fields after filtering', () => {
      const csv = exportToCSV(sampleDocs, { fields: [] });
      expect(csv).toBe('');
    });

    it('should handle undefined values', () => {
      const docs = [{ _id: '1', name: undefined }] as any;
      const csv = exportToCSV(docs);
      expect(csv.split('\n')).toHaveLength(2);
    });
  });

  // ============================================
  // exportToJSON
  // ============================================
  describe('exportToJSON', () => {
    it('should export valid JSON array', () => {
      const json = exportToJSON(sampleDocs);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Alice');
    });

    it('should be pretty-printed with 2-space indent', () => {
      const json = exportToJSON(sampleDocs);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should exclude _id when includeId is false', () => {
      const json = exportToJSON(sampleDocs, { includeId: false });
      const parsed = JSON.parse(json);
      expect(parsed[0]._id).toBeUndefined();
    });

    it('should filter to specific fields', () => {
      const json = exportToJSON(sampleDocs, { fields: ['name'], includeId: false });
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed[0])).toEqual(['name']);
    });

    it('should include _id in fields filter when includeId is true', () => {
      const json = exportToJSON(sampleDocs, { fields: ['name'] });
      const parsed = JSON.parse(json);
      expect(parsed[0]._id).toBeDefined();
    });

    it('should handle empty array', () => {
      expect(JSON.parse(exportToJSON([]))).toEqual([]);
    });
  });

  // ============================================
  // exportToJSONL
  // ============================================
  describe('exportToJSONL', () => {
    it('should export one JSON object per line', () => {
      const jsonl = exportToJSONL(sampleDocs);
      const lines = jsonl.split('\n');
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).name).toBe('Alice');
      expect(JSON.parse(lines[1]).name).toBe('Bob');
    });

    it('should exclude _id when includeId is false', () => {
      const jsonl = exportToJSONL(sampleDocs, { includeId: false });
      const parsed = JSON.parse(jsonl.split('\n')[0]);
      expect(parsed._id).toBeUndefined();
    });

    it('should filter to specific fields', () => {
      const jsonl = exportToJSONL(sampleDocs, { fields: ['name'], includeId: false });
      const parsed = JSON.parse(jsonl.split('\n')[0]);
      expect(Object.keys(parsed)).toEqual(['name']);
    });

    it('should handle empty array', () => {
      expect(exportToJSONL([])).toBe('');
    });
  });

  // ============================================
  // exportToTSV
  // ============================================
  describe('exportToTSV', () => {
    it('should use tab delimiter', () => {
      const tsv = exportToTSV(sampleDocs);
      expect(tsv.split('\n')[0]).toContain('\t');
    });
  });

  // ============================================
  // exportDocuments (router)
  // ============================================
  describe('exportDocuments', () => {
    it('should route to CSV', () => {
      const result = exportDocuments(sampleDocs, { format: 'csv' });
      expect(result.split('\n')[0]).toContain(',');
    });

    it('should route to JSON', () => {
      const result = exportDocuments(sampleDocs, { format: 'json' });
      expect(JSON.parse(result)).toHaveLength(2);
    });

    it('should route to JSONL', () => {
      const result = exportDocuments(sampleDocs, { format: 'jsonl' });
      expect(result.split('\n')).toHaveLength(2);
    });

    it('should default to JSON', () => {
      const result = exportDocuments(sampleDocs);
      expect(JSON.parse(result)).toHaveLength(2);
    });

    it('should throw on unsupported format', () => {
      expect(() => exportDocuments(sampleDocs, { format: 'xml' as any })).toThrow('Unsupported');
    });
  });

  // ============================================
  // getMimeType
  // ============================================
  describe('getMimeType', () => {
    it('should return text/csv for csv', () => {
      expect(getMimeType('csv')).toBe('text/csv');
    });

    it('should return application/json for json', () => {
      expect(getMimeType('json')).toBe('application/json');
    });

    it('should return application/x-ndjson for jsonl', () => {
      expect(getMimeType('jsonl')).toBe('application/x-ndjson');
    });
  });

  // ============================================
  // getFileExtension
  // ============================================
  describe('getFileExtension', () => {
    it('should return .csv', () => {
      expect(getFileExtension('csv')).toBe('.csv');
    });

    it('should return .json', () => {
      expect(getFileExtension('json')).toBe('.json');
    });

    it('should return .jsonl', () => {
      expect(getFileExtension('jsonl')).toBe('.jsonl');
    });
  });
});
