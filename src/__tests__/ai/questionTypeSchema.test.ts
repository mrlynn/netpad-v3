/**
 * Tests for Question Types Schema Module
 *
 * Tests MongoDB pipeline generators, document conversion functions,
 * and schema data integrity.
 */

import { ObjectId } from 'mongodb';
import {
  baseQuestionSchema,
  attributeSchemas,
  getFormQuestionsPipeline,
  getQuestionsGroupedByPagePipeline,
  getQuestionTypeStatsPipeline,
  questionToDocument,
  documentToQuestion,
  QuestionDocument,
} from '@/lib/questionTypes/schema';

// ============================================
// baseQuestionSchema
// ============================================

describe('baseQuestionSchema', () => {
  it('is a valid BSON schema object', () => {
    expect(baseQuestionSchema.bsonType).toBe('object');
    expect(baseQuestionSchema.required).toBeInstanceOf(Array);
    expect(baseQuestionSchema.properties).toBeDefined();
  });

  it('requires essential fields', () => {
    const required = baseQuestionSchema.required;
    expect(required).toContain('type');
    expect(required).toContain('formId');
    expect(required).toContain('path');
    expect(required).toContain('label');
    expect(required).toContain('required');
    expect(required).toContain('included');
    expect(required).toContain('order');
    expect(required).toContain('attributes');
    expect(required).toContain('createdAt');
    expect(required).toContain('updatedAt');
  });

  it('defines type as string enum with expected question types', () => {
    const typeSchema = baseQuestionSchema.properties.type;
    expect(typeSchema.bsonType).toBe('string');
    expect(typeSchema.enum).toContain('short_text');
    expect(typeSchema.enum).toContain('long_text');
    expect(typeSchema.enum).toContain('email');
    expect(typeSchema.enum).toContain('multiple_choice');
    expect(typeSchema.enum).toContain('rating');
    expect(typeSchema.enum).toContain('date');
    expect(typeSchema.enum).toContain('file_upload');
    expect(typeSchema.enum).toContain('payment');
  });

  it('defines source as enum with valid values', () => {
    const sourceSchema = baseQuestionSchema.properties.source;
    expect(sourceSchema.enum).toEqual(['schema', 'custom', 'variable']);
  });

  it('defines conditionalLogic structure', () => {
    const cl = baseQuestionSchema.properties.conditionalLogic;
    expect(cl.bsonType).toBe('object');
    expect(cl.properties.action.enum).toEqual(['show', 'hide']);
    expect(cl.properties.logicType.enum).toEqual(['all', 'any']);
    expect(cl.properties.conditions.bsonType).toBe('array');
  });

  it('defines validation structure with numeric constraints', () => {
    const v = baseQuestionSchema.properties.validation;
    expect(v.bsonType).toBe('object');
    expect(v.properties.min).toBeDefined();
    expect(v.properties.max).toBeDefined();
    expect(v.properties.minLength).toBeDefined();
    expect(v.properties.maxLength).toBeDefined();
    expect(v.properties.pattern).toBeDefined();
  });
});

// ============================================
// attributeSchemas
// ============================================

describe('attributeSchemas', () => {
  it('has schemas for all question types in baseQuestionSchema.type.enum', () => {
    const types = baseQuestionSchema.properties.type.enum;
    for (const type of types) {
      expect(attributeSchemas[type as keyof typeof attributeSchemas]).toBeDefined();
    }
  });

  it('short_text has maxLength and inputMask attributes', () => {
    const schema = attributeSchemas.short_text;
    expect(schema.bsonType).toBe('object');
    expect(schema.properties).toBeDefined();
  });

  it('multiple_choice has options-related attributes', () => {
    const schema = attributeSchemas.multiple_choice;
    expect(schema.bsonType).toBe('object');
    expect(schema.properties).toBeDefined();
  });

  it('rating has scale-related attributes', () => {
    const schema = attributeSchemas.rating;
    expect(schema.bsonType).toBe('object');
  });

  it('file_upload has file constraint attributes', () => {
    const schema = attributeSchemas.file_upload;
    expect(schema.bsonType).toBe('object');
  });

  it('all schemas are BSON object type', () => {
    for (const [, schema] of Object.entries(attributeSchemas)) {
      expect(schema.bsonType).toBe('object');
    }
  });
});

// ============================================
// getFormQuestionsPipeline
// ============================================

describe('getFormQuestionsPipeline', () => {
  it('returns an array of pipeline stages', () => {
    const pipeline = getFormQuestionsPipeline('form123');
    expect(Array.isArray(pipeline)).toBe(true);
    expect(pipeline.length).toBe(3);
  });

  it('first stage matches by formId and included=true', () => {
    const pipeline = getFormQuestionsPipeline('form123');
    expect(pipeline[0]).toEqual({ $match: { formId: 'form123', included: true } });
  });

  it('second stage sorts by order ascending', () => {
    const pipeline = getFormQuestionsPipeline('form123');
    expect(pipeline[1]).toEqual({ $sort: { order: 1 } });
  });

  it('third stage projects expected fields', () => {
    const pipeline = getFormQuestionsPipeline('form123');
    const project = pipeline[2].$project;
    expect(project._id).toBe(1);
    expect(project.type).toBe(1);
    expect(project.path).toBe(1);
    expect(project.label).toBe(1);
    expect(project.attributes).toBe(1);
    expect(project.order).toBe(1);
  });

  it('uses the provided formId', () => {
    const pipeline = getFormQuestionsPipeline('abc-xyz-789');
    expect(pipeline[0].$match.formId).toBe('abc-xyz-789');
  });
});

// ============================================
// getQuestionsGroupedByPagePipeline
// ============================================

describe('getQuestionsGroupedByPagePipeline', () => {
  it('returns an array of pipeline stages', () => {
    const pipeline = getQuestionsGroupedByPagePipeline('form123');
    expect(Array.isArray(pipeline)).toBe(true);
    expect(pipeline.length).toBe(4);
  });

  it('first stage matches by formId and included', () => {
    const pipeline = getQuestionsGroupedByPagePipeline('form123');
    expect(pipeline[0].$match).toEqual({ formId: 'form123', included: true });
  });

  it('sorts by order before grouping', () => {
    const pipeline = getQuestionsGroupedByPagePipeline('form123');
    expect(pipeline[1].$sort).toEqual({ order: 1 });
  });

  it('groups by pageId with default fallback', () => {
    const pipeline = getQuestionsGroupedByPagePipeline('form123');
    const group = pipeline[2].$group;
    expect(group._id).toEqual({ $ifNull: ['$pageId', 'default'] });
    expect(group.questions).toEqual({ $push: '$$ROOT' });
  });

  it('projects pageId from _id and removes _id', () => {
    const pipeline = getQuestionsGroupedByPagePipeline('form123');
    const project = pipeline[3].$project;
    expect(project.pageId).toBe('$_id');
    expect(project.questions).toBe(1);
    expect(project._id).toBe(0);
  });
});

// ============================================
// getQuestionTypeStatsPipeline
// ============================================

describe('getQuestionTypeStatsPipeline', () => {
  it('returns an array of pipeline stages', () => {
    const pipeline = getQuestionTypeStatsPipeline('form123');
    expect(Array.isArray(pipeline)).toBe(true);
    expect(pipeline.length).toBe(4);
  });

  it('matches by formId (not filtering by included)', () => {
    const pipeline = getQuestionTypeStatsPipeline('form123');
    expect(pipeline[0].$match).toEqual({ formId: 'form123' });
  });

  it('groups by type with count, required, optional aggregations', () => {
    const pipeline = getQuestionTypeStatsPipeline('form123');
    const group = pipeline[1].$group;
    expect(group._id).toBe('$type');
    expect(group.count).toEqual({ $sum: 1 });
    expect(group.required.$sum.$cond[0]).toBe('$required');
  });

  it('projects type from _id and sorts by count descending', () => {
    const pipeline = getQuestionTypeStatsPipeline('form123');
    expect(pipeline[2].$project.type).toBe('$_id');
    expect(pipeline[2].$project._id).toBe(0);
    expect(pipeline[3].$sort).toEqual({ count: -1 });
  });
});

// ============================================
// questionToDocument
// ============================================

describe('questionToDocument', () => {
  const mockQuestion: any = {
    type: 'short_text',
    path: 'customer_name',
    label: 'Customer Name',
    description: 'Enter your name',
    placeholder: 'John Doe',
    required: true,
    included: true,
    source: 'custom',
    includeInDocument: true,
    conditionalLogic: undefined,
    validation: { maxLength: 100 },
    modeConfig: undefined,
    attributes: { maxLength: 100 },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  it('converts a question to a document with correct fields', () => {
    const doc = questionToDocument(mockQuestion, 'form123', 0);
    expect(doc.type).toBe('short_text');
    expect(doc.formId).toBe('form123');
    expect(doc.path).toBe('customer_name');
    expect(doc.label).toBe('Customer Name');
    expect(doc.order).toBe(0);
  });

  it('preserves the provided order', () => {
    const doc = questionToDocument(mockQuestion, 'form123', 5);
    expect(doc.order).toBe(5);
  });

  it('sets updatedAt to current time', () => {
    const before = new Date();
    const doc = questionToDocument(mockQuestion, 'form123', 0);
    const after = new Date();
    expect(doc.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(doc.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('preserves existing createdAt', () => {
    const doc = questionToDocument(mockQuestion, 'form123', 0);
    expect(doc.createdAt).toEqual(new Date('2025-01-01'));
  });

  it('sets createdAt to now if not provided', () => {
    const questionNoDate = { ...mockQuestion, createdAt: undefined };
    const before = new Date();
    const doc = questionToDocument(questionNoDate, 'form123', 0);
    expect(doc.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('defaults attributes to empty object if missing', () => {
    const questionNoAttrs = { ...mockQuestion, attributes: undefined };
    const doc = questionToDocument(questionNoAttrs, 'form123', 0);
    expect(doc.attributes).toEqual({});
  });

  it('does not include _id in the output', () => {
    const doc = questionToDocument(mockQuestion, 'form123', 0);
    expect((doc as any)._id).toBeUndefined();
  });

  it('preserves validation rules', () => {
    const doc = questionToDocument(mockQuestion, 'form123', 0);
    expect(doc.validation).toEqual({ maxLength: 100 });
  });

  it('preserves optional fields as undefined when not set', () => {
    const doc = questionToDocument(mockQuestion, 'form123', 0);
    expect(doc.conditionalLogic).toBeUndefined();
    expect(doc.modeConfig).toBeUndefined();
  });
});

// ============================================
// documentToQuestion
// ============================================

describe('documentToQuestion', () => {
  const mockDoc: QuestionDocument = {
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    type: 'email' as any,
    formId: 'form123',
    path: 'contact_email',
    label: 'Email Address',
    description: 'Your email',
    placeholder: 'user@example.com',
    required: true,
    included: true,
    source: 'custom',
    includeInDocument: true,
    order: 2,
    conditionalLogic: {
      action: 'show' as const,
      logicType: 'all' as const,
      conditions: [{ field: 'has_email', operator: 'equals', value: true }],
    },
    validation: { pattern: '.*@.*' },
    modeConfig: { visibleIn: ['edit', 'view'] },
    attributes: { allowMultiple: false },
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-02-01'),
  };

  it('converts document _id to string id', () => {
    const question = documentToQuestion(mockDoc);
    expect(question.id).toBe('507f1f77bcf86cd799439011');
  });

  it('preserves all common fields', () => {
    const question = documentToQuestion(mockDoc);
    expect(question.type).toBe('email');
    expect(question.path).toBe('contact_email');
    expect(question.label).toBe('Email Address');
    expect(question.description).toBe('Your email');
    expect(question.placeholder).toBe('user@example.com');
    expect(question.required).toBe(true);
    expect(question.included).toBe(true);
    expect(question.source).toBe('custom');
    expect(question.includeInDocument).toBe(true);
  });

  it('preserves conditionalLogic', () => {
    const question = documentToQuestion(mockDoc);
    expect(question.conditionalLogic).toEqual(mockDoc.conditionalLogic);
  });

  it('preserves validation', () => {
    const question = documentToQuestion(mockDoc);
    expect(question.validation).toEqual({ pattern: '.*@.*' });
  });

  it('preserves modeConfig', () => {
    const question = documentToQuestion(mockDoc);
    expect(question.modeConfig).toEqual({ visibleIn: ['edit', 'view'] });
  });

  it('preserves timestamps', () => {
    const question = documentToQuestion(mockDoc);
    expect(question.createdAt).toEqual(new Date('2025-01-15'));
    expect(question.updatedAt).toEqual(new Date('2025-02-01'));
  });

  it('preserves attributes', () => {
    const question = documentToQuestion(mockDoc);
    expect((question as any).attributes).toEqual({ allowMultiple: false });
  });

  it('handles minimal document (no optional fields)', () => {
    const minimalDoc: QuestionDocument = {
      _id: new ObjectId(),
      type: 'short_text' as any,
      formId: 'form456',
      path: 'field1',
      label: 'Field 1',
      required: false,
      included: true,
      source: 'schema',
      includeInDocument: true,
      order: 0,
      attributes: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const question = documentToQuestion(minimalDoc);
    expect(question.id).toBeDefined();
    expect(question.type).toBe('short_text');
    expect(question.conditionalLogic).toBeUndefined();
    expect(question.validation).toBeUndefined();
    expect(question.modeConfig).toBeUndefined();
  });
});
