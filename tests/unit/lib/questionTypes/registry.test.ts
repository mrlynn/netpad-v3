/**
 * Tests for Question Type Registry
 * @module lib/questionTypes/registry
 */

import {
  createQuestion,
  getDefaultAttributes,
  getQuestionTypeMetadata,
  getQuestionTypesByCategory,
  searchQuestionTypes,
  validateQuestion,
  defaultAttributes,
  questionTypeMetadata,
  attributeSchemas,
  questionTypeRegistry,
} from '@/lib/questionTypes/registry';
import { QuestionTypeId, QuestionCategory } from '@/types/questionTypes';

// All known question type IDs
const ALL_TYPES: QuestionTypeId[] = Object.keys(questionTypeMetadata) as QuestionTypeId[];

describe('questionTypeRegistry', () => {
  describe('defaultAttributes', () => {
    it('has defaults for every question type in metadata', () => {
      for (const type of ALL_TYPES) {
        expect(defaultAttributes[type]).toBeDefined();
        expect(typeof defaultAttributes[type]).toBe('object');
      }
    });

    it('short_text has maxLength', () => {
      expect(defaultAttributes.short_text).toHaveProperty('maxLength');
      expect(typeof defaultAttributes.short_text.maxLength).toBe('number');
    });

    it('rating has maxRating and iconType', () => {
      const attrs = defaultAttributes.rating;
      expect(attrs).toHaveProperty('maxRating');
      expect(attrs).toHaveProperty('iconType');
    });

    it('file_upload has allowed types', () => {
      const attrs = defaultAttributes.file_upload;
      expect(attrs).toHaveProperty('allowedTypes');
      expect(Array.isArray(attrs.allowedTypes)).toBe(true);
    });
  });

  describe('questionTypeMetadata', () => {
    it('every type has required metadata fields', () => {
      for (const type of ALL_TYPES) {
        const meta = questionTypeMetadata[type];
        expect(meta.id).toBe(type);
        expect(meta.displayName).toBeTruthy();
        expect(meta.description).toBeTruthy();
        expect(meta.icon).toBeTruthy();
        expect(meta.category).toBeTruthy();
        expect(Array.isArray(meta.tags)).toBe(true);
      }
    });

    it('category values are all valid', () => {
      const validCategories: QuestionCategory[] = [
        'text_input', 'choice', 'rating_scale', 'date_time',
        'media_upload', 'advanced', 'specialized',
      ];
      for (const type of ALL_TYPES) {
        expect(validCategories).toContain(questionTypeMetadata[type].category);
      }
    });

    it('has at least 20 question types', () => {
      expect(ALL_TYPES.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('attributeSchemas', () => {
    it('has schemas for every question type', () => {
      for (const type of ALL_TYPES) {
        expect(attributeSchemas[type]).toBeDefined();
        expect(Array.isArray(attributeSchemas[type])).toBe(true);
      }
    });

    it('each schema entry has name, label, and dataType', () => {
      for (const type of ALL_TYPES) {
        for (const schema of attributeSchemas[type]) {
          expect(schema.name).toBeTruthy();
          expect(schema.label).toBeTruthy();
          expect(schema.dataType).toBeTruthy();
        }
      }
    });
  });

  describe('createQuestion', () => {
    it('creates a question with correct type', () => {
      const q = createQuestion('short_text');
      expect(q.type).toBe('short_text');
    });

    it('generates a unique id', () => {
      const q1 = createQuestion('short_text');
      const q2 = createQuestion('short_text');
      expect(q1.id).not.toBe(q2.id);
    });

    it('sets default label from metadata displayName', () => {
      const q = createQuestion('email');
      const meta = questionTypeMetadata.email;
      expect(q.label).toBe(meta.displayName);
    });

    it('sets default attributes from defaultAttributes', () => {
      const q = createQuestion('rating');
      expect(q.attributes).toEqual(expect.objectContaining(defaultAttributes.rating));
    });

    it('applies overrides', () => {
      const q = createQuestion('short_text', { label: 'Custom Label', required: true });
      expect(q.label).toBe('Custom Label');
      expect(q.required).toBe(true);
    });

    it('sets timestamps', () => {
      const before = new Date();
      const q = createQuestion('short_text');
      const after = new Date();
      expect(q.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(q.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('defaults to not required', () => {
      const q = createQuestion('number');
      expect(q.required).toBe(false);
    });

    it('defaults to included', () => {
      const q = createQuestion('number');
      expect(q.included).toBe(true);
    });

    it('defaults source to custom', () => {
      const q = createQuestion('dropdown');
      expect(q.source).toBe('custom');
    });

    it('works for every question type', () => {
      for (const type of ALL_TYPES) {
        const q = createQuestion(type);
        expect(q.type).toBe(type);
        expect(q.id).toBeTruthy();
        expect(q.attributes).toBeDefined();
      }
    });
  });

  describe('getDefaultAttributes', () => {
    it('returns a copy (not reference)', () => {
      const a = getDefaultAttributes('short_text');
      const b = getDefaultAttributes('short_text');
      expect(a).toEqual(b);
      a.maxLength = 999;
      expect(b.maxLength).not.toBe(999);
    });

    it('returns correct defaults for each type', () => {
      for (const type of ALL_TYPES) {
        expect(getDefaultAttributes(type)).toEqual(defaultAttributes[type]);
      }
    });
  });

  describe('getQuestionTypeMetadata', () => {
    it('returns metadata for a valid type', () => {
      const meta = getQuestionTypeMetadata('multiple_choice');
      expect(meta.id).toBe('multiple_choice');
      expect(meta.displayName).toBeTruthy();
    });

    it('returns metadata for all types', () => {
      for (const type of ALL_TYPES) {
        const meta = getQuestionTypeMetadata(type);
        expect(meta.id).toBe(type);
      }
    });
  });

  describe('getQuestionTypesByCategory', () => {
    it('returns all 7 categories', () => {
      const byCategory = getQuestionTypesByCategory();
      const categories = Object.keys(byCategory);
      expect(categories).toContain('text_input');
      expect(categories).toContain('choice');
      expect(categories).toContain('rating_scale');
      expect(categories).toContain('date_time');
      expect(categories).toContain('media_upload');
      expect(categories).toContain('advanced');
      expect(categories).toContain('specialized');
    });

    it('every type appears in exactly one category', () => {
      const byCategory = getQuestionTypesByCategory();
      const allInCategories: string[] = [];
      for (const types of Object.values(byCategory)) {
        allInCategories.push(...types.map(t => t.id));
      }
      expect(allInCategories.sort()).toEqual([...ALL_TYPES].sort());
    });

    it('text_input category has common text types', () => {
      const byCategory = getQuestionTypesByCategory();
      const textIds = byCategory.text_input.map(t => t.id);
      expect(textIds).toContain('short_text');
      expect(textIds).toContain('long_text');
    });

    it('choice category has multiple_choice and dropdown', () => {
      const byCategory = getQuestionTypesByCategory();
      const choiceIds = byCategory.choice.map(t => t.id);
      expect(choiceIds).toContain('multiple_choice');
      expect(choiceIds).toContain('dropdown');
    });
  });

  describe('searchQuestionTypes', () => {
    it('finds types by display name', () => {
      const results = searchQuestionTypes('email');
      const ids = results.map(r => r.id);
      expect(ids).toContain('email');
    });

    it('is case insensitive', () => {
      const lower = searchQuestionTypes('email');
      const upper = searchQuestionTypes('EMAIL');
      expect(lower).toEqual(upper);
    });

    it('finds types by description', () => {
      const results = searchQuestionTypes('upload');
      expect(results.length).toBeGreaterThan(0);
    });

    it('finds types by tags', () => {
      const results = searchQuestionTypes('text');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for nonsense query', () => {
      const results = searchQuestionTypes('xyzzyplugh12345');
      expect(results).toHaveLength(0);
    });

    it('returns multiple matches for broad queries', () => {
      const results = searchQuestionTypes('date');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateQuestion', () => {
    it('validates a valid question as valid', () => {
      const q = createQuestion('short_text');
      const result = validateQuestion(q);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates most default questions as valid', () => {
      let validCount = 0;
      for (const type of ALL_TYPES) {
        const q = createQuestion(type);
        const result = validateQuestion(q);
        if (result.valid) validCount++;
      }
      // Most default questions should be valid out of the box
      expect(validCount).toBeGreaterThan(ALL_TYPES.length * 0.7);
    });

    it('catches numeric min violations', () => {
      // Find a type with a numeric attribute that has a min validation
      for (const type of ALL_TYPES) {
        const schemas = attributeSchemas[type];
        const numericSchema = schemas.find(
          s => s.type === 'number' && s.validation?.min !== undefined
        );
        if (numericSchema) {
          const q = createQuestion(type);
          (q as any).attributes[numericSchema.name] = numericSchema.validation!.min! - 1;
          const result = validateQuestion(q);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.code === 'min')).toBe(true);
          return; // One test is enough
        }
      }
    });

    it('catches numeric max violations', () => {
      for (const type of ALL_TYPES) {
        const schemas = attributeSchemas[type];
        const numericSchema = schemas.find(
          s => s.type === 'number' && s.validation?.max !== undefined
        );
        if (numericSchema) {
          const q = createQuestion(type);
          (q as any).attributes[numericSchema.name] = numericSchema.validation!.max! + 1;
          const result = validateQuestion(q);
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.code === 'max')).toBe(true);
          return;
        }
      }
    });

    it('error objects have field, message, and code', () => {
      // Force an error by setting a numeric field below min
      for (const type of ALL_TYPES) {
        const schemas = attributeSchemas[type];
        const numericSchema = schemas.find(
          s => s.type === 'number' && s.validation?.min !== undefined
        );
        if (numericSchema) {
          const q = createQuestion(type);
          (q as any).attributes[numericSchema.name] = -99999;
          const result = validateQuestion(q);
          if (result.errors.length > 0) {
            const err = result.errors[0];
            expect(err).toHaveProperty('field');
            expect(err).toHaveProperty('message');
            expect(err).toHaveProperty('code');
            return;
          }
        }
      }
    });
  });

  describe('questionTypeRegistry export', () => {
    it('exposes all registry functions', () => {
      expect(questionTypeRegistry.create).toBe(createQuestion);
      expect(questionTypeRegistry.getMetadata).toBe(getQuestionTypeMetadata);
      expect(questionTypeRegistry.getDefaults).toBe(getDefaultAttributes);
      expect(questionTypeRegistry.getByCategory).toBe(getQuestionTypesByCategory);
      expect(questionTypeRegistry.search).toBe(searchQuestionTypes);
      expect(questionTypeRegistry.validate).toBe(validateQuestion);
    });

    it('exposes data objects', () => {
      expect(questionTypeRegistry.metadata).toBe(questionTypeMetadata);
      expect(questionTypeRegistry.defaults).toBe(defaultAttributes);
      expect(questionTypeRegistry.schemas).toBe(attributeSchemas);
    });
  });
});
