/**
 * Tests for Question Types Schema module
 * @module lib/questionTypes/schema
 */

import {
  baseQuestionSchema,
  attributeSchemas,
  getFormQuestionsPipeline,
  getQuestionsGroupedByPagePipeline,
  getQuestionTypeStatsPipeline,
  questionToDocument,
  documentToQuestion,
} from '@/lib/questionTypes/schema';
import { createQuestion, questionTypeMetadata } from '@/lib/questionTypes/registry';
import { ObjectId } from 'mongodb';
import { QuestionTypeId } from '@/types/questionTypes';

const ALL_TYPES = Object.keys(questionTypeMetadata) as QuestionTypeId[];

describe('questionTypes/schema', () => {
  describe('baseQuestionSchema', () => {
    it('is defined and has required and properties', () => {
      expect(baseQuestionSchema).toBeDefined();
      expect(baseQuestionSchema).toHaveProperty('required');
      expect(baseQuestionSchema).toHaveProperty('properties');
    });

    it('requires type field', () => {
      expect(baseQuestionSchema.required).toContain('type');
    });

    it('requires formId field', () => {
      expect(baseQuestionSchema.required).toContain('formId');
    });

    it('requires label field', () => {
      expect(baseQuestionSchema.required).toContain('label');
    });

    it('has a type property defined as string', () => {
      expect(baseQuestionSchema.properties.type).toBeDefined();
    });
  });

  describe('attributeSchemas', () => {
    it('has schemas for multiple question types', () => {
      expect(Object.keys(attributeSchemas).length).toBeGreaterThan(10);
    });

    it('each schema is a valid JSON Schema-like object', () => {
      for (const [type, schema] of Object.entries(attributeSchemas)) {
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
      }
    });
  });

  describe('getFormQuestionsPipeline', () => {
    it('returns an array of pipeline stages', () => {
      const pipeline = getFormQuestionsPipeline('form123');
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBeGreaterThanOrEqual(2);
    });

    it('first stage matches on formId and included', () => {
      const pipeline = getFormQuestionsPipeline('form123');
      expect(pipeline[0]).toEqual({ $match: { formId: 'form123', included: true } });
    });

    it('sorts by order ascending', () => {
      const pipeline = getFormQuestionsPipeline('form123');
      const sortStage = pipeline.find((s: any) => s.$sort);
      expect(sortStage).toEqual({ $sort: { order: 1 } });
    });

    it('includes a $project stage', () => {
      const pipeline = getFormQuestionsPipeline('form123');
      const projectStage = pipeline.find((s: any) => s.$project);
      expect(projectStage).toBeDefined();
      expect(projectStage.$project).toHaveProperty('type');
      expect(projectStage.$project).toHaveProperty('label');
      expect(projectStage.$project).toHaveProperty('attributes');
    });

    it('uses the provided formId', () => {
      const pipeline = getFormQuestionsPipeline('myForm');
      expect(pipeline[0].$match.formId).toBe('myForm');
    });
  });

  describe('getQuestionsGroupedByPagePipeline', () => {
    it('returns an array of pipeline stages', () => {
      const pipeline = getQuestionsGroupedByPagePipeline('form123');
      expect(Array.isArray(pipeline)).toBe(true);
    });

    it('matches on formId and included', () => {
      const pipeline = getQuestionsGroupedByPagePipeline('form123');
      expect(pipeline[0]).toEqual({ $match: { formId: 'form123', included: true } });
    });

    it('has a $group stage', () => {
      const pipeline = getQuestionsGroupedByPagePipeline('form123');
      const groupStage = pipeline.find((s: any) => s.$group);
      expect(groupStage).toBeDefined();
      expect(groupStage.$group._id).toBeDefined();
    });

    it('groups by pageId with default fallback', () => {
      const pipeline = getQuestionsGroupedByPagePipeline('form123');
      const groupStage = pipeline.find((s: any) => s.$group);
      expect(groupStage.$group._id).toEqual({ $ifNull: ['$pageId', 'default'] });
    });

    it('pushes questions into array', () => {
      const pipeline = getQuestionsGroupedByPagePipeline('form123');
      const groupStage = pipeline.find((s: any) => s.$group);
      expect(groupStage.$group.questions).toEqual({ $push: '$$ROOT' });
    });
  });

  describe('getQuestionTypeStatsPipeline', () => {
    it('returns an array of pipeline stages', () => {
      const pipeline = getQuestionTypeStatsPipeline('form123');
      expect(Array.isArray(pipeline)).toBe(true);
    });

    it('matches on formId (without included filter)', () => {
      const pipeline = getQuestionTypeStatsPipeline('form123');
      expect(pipeline[0]).toEqual({ $match: { formId: 'form123' } });
    });

    it('groups by type with count', () => {
      const pipeline = getQuestionTypeStatsPipeline('form123');
      const groupStage = pipeline.find((s: any) => s.$group);
      expect(groupStage.$group._id).toBe('$type');
      expect(groupStage.$group.count).toEqual({ $sum: 1 });
    });

    it('counts required and optional separately', () => {
      const pipeline = getQuestionTypeStatsPipeline('form123');
      const groupStage = pipeline.find((s: any) => s.$group);
      expect(groupStage.$group.required).toBeDefined();
      expect(groupStage.$group.optional).toBeDefined();
    });

    it('sorts by count descending', () => {
      const pipeline = getQuestionTypeStatsPipeline('form123');
      const sortStage = pipeline.find((s: any) => s.$sort);
      expect(sortStage).toEqual({ $sort: { count: -1 } });
    });
  });

  describe('questionToDocument', () => {
    it('converts a question to a document', () => {
      const q = createQuestion('short_text', { path: 'name', label: 'Name' });
      const doc = questionToDocument(q, 'form123', 0);
      expect(doc.type).toBe('short_text');
      expect(doc.formId).toBe('form123');
      expect(doc.order).toBe(0);
      expect(doc.path).toBe('name');
      expect(doc.label).toBe('Name');
    });

    it('sets timestamps', () => {
      const q = createQuestion('email');
      const doc = questionToDocument(q, 'form1', 1);
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });

    it('preserves attributes', () => {
      const q = createQuestion('rating');
      const doc = questionToDocument(q, 'form1', 2);
      expect(doc.attributes).toBeDefined();
      expect(doc.attributes).toHaveProperty('maxRating');
    });

    it('preserves conditional logic', () => {
      const logic = {
        action: 'show' as const,
        logicType: 'all' as const,
        conditions: [{ field: 'q1', operator: 'equals', value: 'yes' }],
      };
      const q = createQuestion('short_text', { conditionalLogic: logic });
      const doc = questionToDocument(q, 'form1', 0);
      expect(doc.conditionalLogic).toEqual(logic);
    });

    it('preserves validation rules', () => {
      const validation = { min: 1, max: 100 };
      const q = createQuestion('number', { validation });
      const doc = questionToDocument(q, 'form1', 0);
      expect(doc.validation).toEqual(validation);
    });

    it('uses provided order', () => {
      const q = createQuestion('short_text');
      expect(questionToDocument(q, 'f', 5).order).toBe(5);
      expect(questionToDocument(q, 'f', 99).order).toBe(99);
    });

    it('does not include _id', () => {
      const q = createQuestion('short_text');
      const doc = questionToDocument(q, 'f', 0);
      expect(doc).not.toHaveProperty('_id');
    });

    it('works for all question types', () => {
      for (const type of ALL_TYPES) {
        const q = createQuestion(type);
        const doc = questionToDocument(q, 'form1', 0);
        expect(doc.type).toBe(type);
        expect(doc.formId).toBe('form1');
      }
    });
  });

  describe('documentToQuestion', () => {
    it('converts a document to a question', () => {
      const doc = {
        _id: new ObjectId(),
        type: 'short_text' as QuestionTypeId,
        formId: 'form123',
        path: 'name',
        label: 'Name',
        required: true,
        included: true,
        source: 'custom' as const,
        includeInDocument: true,
        order: 0,
        attributes: { maxLength: 255 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const q = documentToQuestion(doc);
      expect(q.type).toBe('short_text');
      expect(q.label).toBe('Name');
      expect(q.id).toBe(doc._id.toString());
    });

    it('converts _id to string id', () => {
      const oid = new ObjectId();
      const doc = {
        _id: oid,
        type: 'email' as QuestionTypeId,
        formId: 'f1',
        path: 'email',
        label: 'Email',
        required: false,
        included: true,
        source: 'custom' as const,
        includeInDocument: true,
        order: 1,
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const q = documentToQuestion(doc);
      expect(q.id).toBe(oid.toString());
      expect(typeof q.id).toBe('string');
    });

    it('preserves optional fields when present', () => {
      const doc = {
        _id: new ObjectId(),
        type: 'short_text' as QuestionTypeId,
        formId: 'f1',
        path: 'p',
        label: 'L',
        description: 'desc',
        placeholder: 'ph',
        required: true,
        included: true,
        source: 'schema' as const,
        includeInDocument: false,
        order: 0,
        conditionalLogic: { action: 'show' as const, logicType: 'all' as const, conditions: [] },
        validation: { min: 1 },
        modeConfig: { visibleIn: ['edit'] },
        attributes: {},
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-06-01'),
      };
      const q = documentToQuestion(doc);
      expect(q.description).toBe('desc');
      expect(q.placeholder).toBe('ph');
      expect(q.conditionalLogic).toEqual(doc.conditionalLogic);
      expect(q.validation).toEqual(doc.validation);
      expect(q.modeConfig).toEqual(doc.modeConfig);
    });

    it('round-trips with questionToDocument', () => {
      const original = createQuestion('dropdown', {
        path: 'country',
        label: 'Country',
        required: true,
      });
      const doc = questionToDocument(original, 'form1', 3);
      // Add _id to simulate DB
      const fullDoc = { _id: new ObjectId(), ...doc };
      const restored = documentToQuestion(fullDoc);
      expect(restored.type).toBe(original.type);
      expect(restored.label).toBe(original.label);
      expect(restored.path).toBe(original.path);
      expect(restored.required).toBe(original.required);
      expect(restored.attributes).toEqual(original.attributes);
    });
  });
});
