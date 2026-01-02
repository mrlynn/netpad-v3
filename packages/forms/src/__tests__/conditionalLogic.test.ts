import { describe, it, expect } from 'vitest';
import {
  evaluateConditionalLogic,
  evaluateCondition,
  getOperatorLabel,
  operatorRequiresValue,
  getNestedValue,
  setNestedValue,
} from '../utils/conditionalLogic';
import { ConditionalLogic, FieldCondition } from '../types';

describe('getNestedValue', () => {
  it('returns top-level value', () => {
    expect(getNestedValue({ name: 'John' }, 'name')).toBe('John');
  });

  it('returns nested value', () => {
    expect(getNestedValue({ address: { city: 'NYC' } }, 'address.city')).toBe('NYC');
  });

  it('returns undefined for missing path', () => {
    expect(getNestedValue({ name: 'John' }, 'address.city')).toBeUndefined();
  });

  it('returns undefined for partially missing path', () => {
    expect(getNestedValue({ address: {} }, 'address.city')).toBeUndefined();
  });
});

describe('setNestedValue', () => {
  it('sets top-level value', () => {
    const result = setNestedValue({}, 'name', 'John');
    expect(result.name).toBe('John');
  });

  it('sets nested value', () => {
    const result = setNestedValue({}, 'address.city', 'NYC');
    expect(result.address).toEqual({ city: 'NYC' });
  });

  it('does not mutate original object', () => {
    const original = { name: 'John' };
    const result = setNestedValue(original, 'name', 'Jane');
    expect(original.name).toBe('John');
    expect(result.name).toBe('Jane');
  });
});

describe('evaluateCondition', () => {
  describe('equals operator', () => {
    it('returns true when values are equal (string)', () => {
      const condition: FieldCondition = { field: 'country', operator: 'equals', value: 'US' };
      expect(evaluateCondition(condition, { country: 'US' })).toBe(true);
    });

    it('returns false when values are not equal', () => {
      const condition: FieldCondition = { field: 'country', operator: 'equals', value: 'US' };
      expect(evaluateCondition(condition, { country: 'UK' })).toBe(false);
    });

    it('returns true when values are equal (number)', () => {
      const condition: FieldCondition = { field: 'count', operator: 'equals', value: 5 };
      expect(evaluateCondition(condition, { count: 5 })).toBe(true);
    });
  });

  describe('notEquals operator', () => {
    it('returns true when values are different', () => {
      const condition: FieldCondition = { field: 'status', operator: 'notEquals', value: 'active' };
      expect(evaluateCondition(condition, { status: 'inactive' })).toBe(true);
    });

    it('returns false when values are equal', () => {
      const condition: FieldCondition = { field: 'status', operator: 'notEquals', value: 'active' };
      expect(evaluateCondition(condition, { status: 'active' })).toBe(false);
    });
  });

  describe('contains operator', () => {
    it('returns true when string contains value (case insensitive)', () => {
      const condition: FieldCondition = { field: 'email', operator: 'contains', value: '@gmail' };
      expect(evaluateCondition(condition, { email: 'user@GMAIL.com' })).toBe(true);
    });

    it('returns false when string does not contain value', () => {
      const condition: FieldCondition = { field: 'email', operator: 'contains', value: '@gmail' };
      expect(evaluateCondition(condition, { email: 'user@yahoo.com' })).toBe(false);
    });

    it('returns true when array contains value', () => {
      const condition: FieldCondition = { field: 'tags', operator: 'contains', value: 'urgent' };
      expect(evaluateCondition(condition, { tags: ['low', 'urgent', 'new'] })).toBe(true);
    });

    it('returns false when array does not contain value', () => {
      const condition: FieldCondition = { field: 'tags', operator: 'contains', value: 'urgent' };
      expect(evaluateCondition(condition, { tags: ['low', 'new'] })).toBe(false);
    });
  });

  describe('notContains operator', () => {
    it('returns true when string does not contain value', () => {
      const condition: FieldCondition = { field: 'text', operator: 'notContains', value: 'bad' };
      expect(evaluateCondition(condition, { text: 'good content' })).toBe(true);
    });

    it('returns false when string contains value', () => {
      const condition: FieldCondition = { field: 'text', operator: 'notContains', value: 'bad' };
      expect(evaluateCondition(condition, { text: 'bad content' })).toBe(false);
    });
  });

  describe('greaterThan operator', () => {
    it('returns true when value is greater', () => {
      const condition: FieldCondition = { field: 'age', operator: 'greaterThan', value: 18 };
      expect(evaluateCondition(condition, { age: 25 })).toBe(true);
    });

    it('returns false when value is equal', () => {
      const condition: FieldCondition = { field: 'age', operator: 'greaterThan', value: 18 };
      expect(evaluateCondition(condition, { age: 18 })).toBe(false);
    });

    it('returns false when value is less', () => {
      const condition: FieldCondition = { field: 'age', operator: 'greaterThan', value: 18 };
      expect(evaluateCondition(condition, { age: 15 })).toBe(false);
    });
  });

  describe('lessThan operator', () => {
    it('returns true when value is less', () => {
      const condition: FieldCondition = { field: 'score', operator: 'lessThan', value: 50 };
      expect(evaluateCondition(condition, { score: 30 })).toBe(true);
    });

    it('returns false when value is equal', () => {
      const condition: FieldCondition = { field: 'score', operator: 'lessThan', value: 50 };
      expect(evaluateCondition(condition, { score: 50 })).toBe(false);
    });

    it('returns false when value is greater', () => {
      const condition: FieldCondition = { field: 'score', operator: 'lessThan', value: 50 };
      expect(evaluateCondition(condition, { score: 70 })).toBe(false);
    });
  });

  describe('isEmpty operator', () => {
    it('returns true for empty string', () => {
      const condition: FieldCondition = { field: 'name', operator: 'isEmpty' };
      expect(evaluateCondition(condition, { name: '' })).toBe(true);
    });

    it('returns true for null', () => {
      const condition: FieldCondition = { field: 'name', operator: 'isEmpty' };
      expect(evaluateCondition(condition, { name: null })).toBe(true);
    });

    it('returns true for undefined', () => {
      const condition: FieldCondition = { field: 'name', operator: 'isEmpty' };
      expect(evaluateCondition(condition, {})).toBe(true);
    });

    it('returns true for empty array', () => {
      const condition: FieldCondition = { field: 'items', operator: 'isEmpty' };
      expect(evaluateCondition(condition, { items: [] })).toBe(true);
    });

    it('returns false for non-empty value', () => {
      const condition: FieldCondition = { field: 'name', operator: 'isEmpty' };
      expect(evaluateCondition(condition, { name: 'John' })).toBe(false);
    });
  });

  describe('isNotEmpty operator', () => {
    it('returns true for non-empty string', () => {
      const condition: FieldCondition = { field: 'name', operator: 'isNotEmpty' };
      expect(evaluateCondition(condition, { name: 'John' })).toBe(true);
    });

    it('returns false for empty string', () => {
      const condition: FieldCondition = { field: 'name', operator: 'isNotEmpty' };
      expect(evaluateCondition(condition, { name: '' })).toBe(false);
    });
  });

  describe('isTrue operator', () => {
    it('returns true for true boolean', () => {
      const condition: FieldCondition = { field: 'active', operator: 'isTrue' };
      expect(evaluateCondition(condition, { active: true })).toBe(true);
    });

    it('returns false for false boolean', () => {
      const condition: FieldCondition = { field: 'active', operator: 'isTrue' };
      expect(evaluateCondition(condition, { active: false })).toBe(false);
    });

    it('returns false for truthy non-boolean values (strict check)', () => {
      // isTrue checks for === true, not truthiness
      const condition: FieldCondition = { field: 'active', operator: 'isTrue' };
      expect(evaluateCondition(condition, { active: 'true' })).toBe(false);
      expect(evaluateCondition(condition, { active: 1 })).toBe(false);
    });
  });

  describe('isFalse operator', () => {
    it('returns true for false boolean', () => {
      const condition: FieldCondition = { field: 'disabled', operator: 'isFalse' };
      expect(evaluateCondition(condition, { disabled: false })).toBe(true);
    });

    it('returns false for true boolean', () => {
      const condition: FieldCondition = { field: 'disabled', operator: 'isFalse' };
      expect(evaluateCondition(condition, { disabled: true })).toBe(false);
    });
  });

  describe('nested field paths', () => {
    it('handles dot notation for nested objects', () => {
      const condition: FieldCondition = { field: 'address.city', operator: 'equals', value: 'NYC' };
      expect(evaluateCondition(condition, { address: { city: 'NYC' } })).toBe(true);
    });

    it('returns false for missing nested path', () => {
      const condition: FieldCondition = { field: 'address.city', operator: 'equals', value: 'NYC' };
      expect(evaluateCondition(condition, { address: {} })).toBe(false);
    });
  });
});

describe('evaluateConditionalLogic', () => {
  describe('show action', () => {
    it('returns true when no conditional logic', () => {
      expect(evaluateConditionalLogic(undefined, {})).toBe(true);
    });

    it('returns true when all conditions pass (logicType: all)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'all',
        conditions: [
          { field: 'country', operator: 'equals', value: 'US' },
          { field: 'age', operator: 'greaterThan', value: 18 },
        ],
      };

      expect(evaluateConditionalLogic(logic, { country: 'US', age: 25 })).toBe(true);
    });

    it('returns false when any condition fails (logicType: all)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'all',
        conditions: [
          { field: 'country', operator: 'equals', value: 'US' },
          { field: 'age', operator: 'greaterThan', value: 18 },
        ],
      };

      expect(evaluateConditionalLogic(logic, { country: 'US', age: 15 })).toBe(false);
    });

    it('returns true when any condition passes (logicType: any)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'country', operator: 'equals', value: 'US' },
          { field: 'country', operator: 'equals', value: 'CA' },
        ],
      };

      expect(evaluateConditionalLogic(logic, { country: 'CA' })).toBe(true);
    });

    it('returns false when no conditions pass (logicType: any)', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'country', operator: 'equals', value: 'US' },
          { field: 'country', operator: 'equals', value: 'CA' },
        ],
      };

      expect(evaluateConditionalLogic(logic, { country: 'UK' })).toBe(false);
    });
  });

  describe('hide action', () => {
    it('returns false when all conditions pass', () => {
      const logic: ConditionalLogic = {
        action: 'hide',
        logicType: 'all',
        conditions: [{ field: 'internal', operator: 'isTrue' }],
      };

      expect(evaluateConditionalLogic(logic, { internal: true })).toBe(false);
    });

    it('returns true when conditions fail', () => {
      const logic: ConditionalLogic = {
        action: 'hide',
        logicType: 'all',
        conditions: [{ field: 'internal', operator: 'isTrue' }],
      };

      expect(evaluateConditionalLogic(logic, { internal: false })).toBe(true);
    });
  });

  describe('empty conditions', () => {
    it('returns true for empty conditions array with show action', () => {
      const logic: ConditionalLogic = {
        action: 'show',
        logicType: 'all',
        conditions: [],
      };

      expect(evaluateConditionalLogic(logic, {})).toBe(true);
    });
  });
});

describe('getOperatorLabel', () => {
  it('returns correct labels for operators', () => {
    expect(getOperatorLabel('equals')).toBe('equals');
    expect(getOperatorLabel('notEquals')).toBe('does not equal');
    expect(getOperatorLabel('contains')).toBe('contains');
    expect(getOperatorLabel('isEmpty')).toBe('is empty');
    expect(getOperatorLabel('isTrue')).toBe('is true');
    expect(getOperatorLabel('greaterThan')).toBe('is greater than');
    expect(getOperatorLabel('lessThan')).toBe('is less than');
  });
});

describe('operatorRequiresValue', () => {
  it('returns true for operators that need a value', () => {
    expect(operatorRequiresValue('equals')).toBe(true);
    expect(operatorRequiresValue('notEquals')).toBe(true);
    expect(operatorRequiresValue('contains')).toBe(true);
    expect(operatorRequiresValue('greaterThan')).toBe(true);
  });

  it('returns false for operators that do not need a value', () => {
    expect(operatorRequiresValue('isEmpty')).toBe(false);
    expect(operatorRequiresValue('isNotEmpty')).toBe(false);
    expect(operatorRequiresValue('isTrue')).toBe(false);
    expect(operatorRequiresValue('isFalse')).toBe(false);
  });
});
