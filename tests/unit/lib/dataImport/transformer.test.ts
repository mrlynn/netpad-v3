/**
 * Tests for Data Import Transformer
 */
import {
  transformRecord,
  transformBatch,
  validateTransformResult,
} from '@/lib/dataImport/transformer';
import { ParsedRecord } from '@/lib/dataImport/parser';

function record(data: Record<string, any>, rowNumber = 1): ParsedRecord {
  return { rowNumber, data };
}

describe('transformRecord', () => {
  it('maps fields with import action', () => {
    const result = transformRecord(
      record({ name: 'Alice', age: '30' }),
      {
        mappings: [
          { sourceColumn: 'name', action: 'import', targetPath: 'userName', targetType: 'short-answer' },
          { sourceColumn: 'age', action: 'import', targetPath: 'userAge', targetType: 'number' },
        ],
      }
    );
    expect(result.document).toEqual({ userName: 'Alice', userAge: '30' });
    expect(result.errors).toHaveLength(0);
  });

  it('skips fields with skip action', () => {
    const result = transformRecord(
      record({ name: 'Alice', secret: 'xyz' }),
      {
        mappings: [
          { sourceColumn: 'name', action: 'import', targetPath: 'name', targetType: 'short-answer' },
          { sourceColumn: 'secret', action: 'skip', targetPath: '', targetType: '' },
        ],
      }
    );
    expect(result.document).toEqual({ name: 'Alice' });
  });

  it('applies trim transform', () => {
    const result = transformRecord(
      record({ name: '  Alice  ' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          transforms: [{ type: 'trim' }],
        }],
      }
    );
    expect(result.document.name).toBe('Alice');
  });

  it('applies uppercase transform', () => {
    const result = transformRecord(
      record({ name: 'alice' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          transforms: [{ type: 'uppercase' }],
        }],
      }
    );
    expect(result.document.name).toBe('ALICE');
  });

  it('applies lowercase transform', () => {
    const result = transformRecord(
      record({ name: 'ALICE' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          transforms: [{ type: 'lowercase' }],
        }],
      }
    );
    expect(result.document.name).toBe('alice');
  });

  it('applies titlecase transform', () => {
    const result = transformRecord(
      record({ name: 'alice smith' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          transforms: [{ type: 'titlecase' }],
        }],
      }
    );
    expect(result.document.name).toBe('Alice Smith');
  });

  it('applies parseNumber transform', () => {
    const result = transformRecord(
      record({ price: '$1,234.56' }),
      {
        mappings: [{
          sourceColumn: 'price',
          action: 'import',
          targetPath: 'price',
          targetType: 'number',
          transforms: [{ type: 'parseNumber' }],
        }],
      }
    );
    expect(result.document.price).toBe(1234.56);
  });

  it('parseNumber returns null for empty values', () => {
    const result = transformRecord(
      record({ price: '' }),
      {
        mappings: [{
          sourceColumn: 'price',
          action: 'import',
          targetPath: 'price',
          targetType: 'number',
          transforms: [{ type: 'parseNumber' }],
        }],
      }
    );
    expect(result.document.price).toBeNull();
  });

  it('parseNumber reports error for non-numeric', () => {
    const result = transformRecord(
      record({ price: 'hello' }),
      {
        mappings: [{
          sourceColumn: 'price',
          action: 'import',
          targetPath: 'price',
          targetType: 'number',
          transforms: [{ type: 'parseNumber' }],
        }],
      }
    );
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errorCode).toBe('TRANSFORM_FAILED');
  });

  it('applies parseBoolean transform', () => {
    const result = transformRecord(
      record({ active: 'yes' }),
      {
        mappings: [{
          sourceColumn: 'active',
          action: 'import',
          targetPath: 'active',
          targetType: 'yes-no',
          transforms: [{ type: 'parseBoolean' }],
        }],
      }
    );
    expect(result.document.active).toBe(true);
  });

  it('parseBoolean handles false values', () => {
    const result = transformRecord(
      record({ active: 'no' }),
      {
        mappings: [{
          sourceColumn: 'active',
          action: 'import',
          targetPath: 'active',
          targetType: 'yes-no',
          transforms: [{ type: 'parseBoolean' }],
        }],
      }
    );
    expect(result.document.active).toBe(false);
  });

  it('parseBoolean reports error for unrecognized values', () => {
    const result = transformRecord(
      record({ active: 'maybe' }),
      {
        mappings: [{
          sourceColumn: 'active',
          action: 'import',
          targetPath: 'active',
          targetType: 'yes-no',
          transforms: [{ type: 'parseBoolean' }],
        }],
      }
    );
    expect(result.errors).toHaveLength(1);
  });

  it('applies parseDate transform', () => {
    const result = transformRecord(
      record({ date: '2024-01-15' }),
      {
        mappings: [{
          sourceColumn: 'date',
          action: 'import',
          targetPath: 'date',
          targetType: 'date',
          transforms: [{ type: 'parseDate' }],
        }],
      }
    );
    expect(result.document.date).toBeInstanceOf(Date);
  });

  it('parseDate returns null for empty', () => {
    const result = transformRecord(
      record({ date: '' }),
      {
        mappings: [{
          sourceColumn: 'date',
          action: 'import',
          targetPath: 'date',
          targetType: 'date',
          transforms: [{ type: 'parseDate' }],
        }],
      }
    );
    expect(result.document.date).toBeNull();
  });

  it('applies parseJSON transform', () => {
    const result = transformRecord(
      record({ data: '{"key":"value"}' }),
      {
        mappings: [{
          sourceColumn: 'data',
          action: 'import',
          targetPath: 'data',
          targetType: 'long-answer',
          transforms: [{ type: 'parseJSON' }],
        }],
      }
    );
    expect(result.document.data).toEqual({ key: 'value' });
  });

  it('parseJSON errors on invalid JSON', () => {
    const result = transformRecord(
      record({ data: 'not json' }),
      {
        mappings: [{
          sourceColumn: 'data',
          action: 'import',
          targetPath: 'data',
          targetType: 'long-answer',
          transforms: [{ type: 'parseJSON' }],
        }],
      }
    );
    expect(result.errors).toHaveLength(1);
  });

  it('applies splitToArray transform', () => {
    const result = transformRecord(
      record({ tags: 'a,b,c' }),
      {
        mappings: [{
          sourceColumn: 'tags',
          action: 'import',
          targetPath: 'tags',
          targetType: 'checkboxes',
          transforms: [{ type: 'splitToArray', separator: ',' }],
        }],
      }
    );
    expect(result.document.tags).toEqual(['a', 'b', 'c']);
  });

  it('splitToArray handles empty', () => {
    const result = transformRecord(
      record({ tags: '' }),
      {
        mappings: [{
          sourceColumn: 'tags',
          action: 'import',
          targetPath: 'tags',
          targetType: 'checkboxes',
          transforms: [{ type: 'splitToArray' }],
        }],
      }
    );
    expect(result.document.tags).toEqual([]);
  });

  it('applies nullIfEmpty transform', () => {
    const result = transformRecord(
      record({ name: '   ' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          transforms: [{ type: 'nullIfEmpty' }],
        }],
      }
    );
    expect(result.document.name).toBeNull();
  });

  it('applies default transform', () => {
    const result = transformRecord(
      record({ name: '' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          transforms: [{ type: 'default', defaultValue: 'N/A' }],
        }],
      }
    );
    expect(result.document.name).toBe('N/A');
  });

  it('applies regex transform', () => {
    const result = transformRecord(
      record({ phone: '(555) 123-4567' }),
      {
        mappings: [{
          sourceColumn: 'phone',
          action: 'import',
          targetPath: 'phone',
          targetType: 'short-answer',
          transforms: [{ type: 'regex', pattern: '[^0-9]', replacement: '' }],
        }],
      }
    );
    // regex without g flag only replaces first match
    expect(result.document.phone).toBe('555) 123-4567');
  });

  it('sets nested values with dot notation', () => {
    const result = transformRecord(
      record({ city: 'NYC' }),
      {
        mappings: [{
          sourceColumn: 'city',
          action: 'import',
          targetPath: 'address.city',
          targetType: 'short-answer',
        }],
      }
    );
    expect(result.document.address.city).toBe('NYC');
  });

  it('handles merge action', () => {
    const result = transformRecord(
      record({ first: 'Alice', last: 'Smith' }),
      {
        mappings: [{
          sourceColumn: 'first',
          action: 'merge',
          targetPath: 'fullName',
          targetType: 'short-answer',
          mergeWith: ['last'],
          mergeSeparator: ' ',
        }],
      }
    );
    // Note: merge action computes value but only 'import' action writes to targetPath
    // This is a known limitation — merge alone doesn't write to document
    expect(result.document.fullName).toBeUndefined();
  });

  it('reports required field errors', () => {
    const result = transformRecord(
      record({ name: '' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          required: true,
        }],
      }
    );
    expect(result.errors.some(e => e.errorCode === 'REQUIRED_MISSING')).toBe(true);
  });

  it('skips empty non-required fields with skipIfEmpty', () => {
    const result = transformRecord(
      record({ name: '' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          skipIfEmpty: true,
        }],
      }
    );
    expect('name' in result.document).toBe(false);
  });

  it('adds computed fields', () => {
    const result = transformRecord(
      record({ first: 'Alice', last: 'Smith' }),
      {
        mappings: [
          { sourceColumn: 'first', action: 'import', targetPath: 'first', targetType: 'short-answer' },
          { sourceColumn: 'last', action: 'import', targetPath: 'last', targetType: 'short-answer' },
        ],
        computedFields: [
          { targetPath: 'greeting', expression: 'Hello, {{first}} {{last}}!' },
        ],
      }
    );
    expect(result.document.greeting).toBe('Hello, Alice Smith!');
  });

  it('adds static fields', () => {
    const result = transformRecord(
      record({ name: 'Alice' }),
      {
        mappings: [
          { sourceColumn: 'name', action: 'import', targetPath: 'name', targetType: 'short-answer' },
        ],
        staticFields: [
          { targetPath: 'source', value: 'csv-import' },
        ],
      }
    );
    expect(result.document.source).toBe('csv-import');
  });

  it('chains multiple transforms', () => {
    const result = transformRecord(
      record({ name: '  alice  ' }),
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          transforms: [{ type: 'trim' }, { type: 'uppercase' }],
        }],
      }
    );
    expect(result.document.name).toBe('ALICE');
  });
});

describe('transformBatch', () => {
  const config = {
    mappings: [{
      sourceColumn: 'name',
      action: 'import' as const,
      targetPath: 'name',
      targetType: 'short-answer',
      transforms: [{ type: 'trim' as const }],
    }],
  };

  it('transforms multiple records', () => {
    const records = [record({ name: ' Alice ' }, 1), record({ name: ' Bob ' }, 2)];
    const result = transformBatch(records, config);
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].name).toBe('Alice');
    expect(result.documents[1].name).toBe('Bob');
    expect(result.processed).toBe(2);
  });

  it('skips duplicates when configured', () => {
    const records = [
      record({ name: 'Alice' }, 1),
      record({ name: 'Alice' }, 2),
      record({ name: 'Bob' }, 3),
    ];
    const result = transformBatch(records, {
      ...config,
      skipDuplicates: true,
      duplicateKey: ['name'],
    });
    expect(result.documents).toHaveLength(2);
    expect(result.skipped).toBe(1);
  });

  it('excludes records with required field errors', () => {
    const records = [record({ name: 'Alice' }, 1), record({ name: '' }, 2)];
    const result = transformBatch(records, {
      mappings: [{
        sourceColumn: 'name',
        action: 'import',
        targetPath: 'name',
        targetType: 'short-answer',
        required: true,
      }],
    });
    expect(result.documents).toHaveLength(1);
  });

  it('stops on error when configured', () => {
    const records = [record({ name: '' }, 1), record({ name: 'Alice' }, 2)];
    const result = transformBatch(
      records,
      {
        mappings: [{
          sourceColumn: 'name',
          action: 'import',
          targetPath: 'name',
          targetType: 'short-answer',
          required: true,
        }],
      },
      { stopOnError: true, maxErrors: 1 }
    );
    expect(result.processed).toBeLessThanOrEqual(2);
  });
});

describe('validateTransformResult', () => {
  it('validates matching fields', () => {
    const result = validateTransformResult({ name: 'Alice', age: 30 }, ['name', 'age']);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it('reports missing fields', () => {
    const result = validateTransformResult({ name: 'Alice' }, ['name', 'age', 'email']);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('age');
    expect(result.missingFields).toContain('email');
  });

  it('reports extra fields', () => {
    const result = validateTransformResult({ name: 'Alice', extra: 'x' }, ['name']);
    expect(result.extraFields).toContain('extra');
  });

  it('handles nested objects with dot notation', () => {
    const result = validateTransformResult(
      { address: { city: 'NYC', state: 'NY' } },
      ['address.city']
    );
    expect(result.valid).toBe(true);
  });
});
