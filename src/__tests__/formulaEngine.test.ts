/**
 * Formula Engine Tests
 *
 * Comprehensive tests for the formula parser, evaluator, and utility functions.
 */

import {
  evaluateFormula,
  validateFormula,
  extractFieldReferences,
  formulaFunctions,
} from '../lib/formulaEngine';

// Helper to evaluate and assert success
function evalOk(formula: string, data: Record<string, any> = {}) {
  const result = evaluateFormula(formula, data);
  expect(result.success).toBe(true);
  return result.value;
}

// Helper to evaluate and assert failure
function evalFail(formula: string, data: Record<string, any> = {}) {
  const result = evaluateFormula(formula, data);
  expect(result.success).toBe(false);
  return result.error;
}

describe('formulaEngine', () => {
  // ─── Arithmetic ───────────────────────────────────────────────
  describe('arithmetic', () => {
    it('adds numbers', () => {
      expect(evalOk('1 + 2')).toBe(3);
    });

    it('subtracts numbers', () => {
      expect(evalOk('10 - 3')).toBe(7);
    });

    it('multiplies numbers', () => {
      expect(evalOk('4 * 5')).toBe(20);
    });

    it('divides numbers', () => {
      expect(evalOk('20 / 4')).toBe(5);
    });

    it('handles modulo', () => {
      expect(evalOk('17 % 5')).toBe(2);
    });

    it('handles exponentiation', () => {
      expect(evalOk('2 ^ 3')).toBe(8);
    });

    it('respects operator precedence (* before +)', () => {
      expect(evalOk('2 + 3 * 4')).toBe(14);
    });

    it('respects parentheses', () => {
      expect(evalOk('(2 + 3) * 4')).toBe(20);
    });

    it('handles unary minus', () => {
      expect(evalOk('-5')).toBe(-5);
      expect(evalOk('-5 + 10')).toBe(5);
    });

    it('handles decimal numbers', () => {
      expect(evalOk('1.5 + 2.3')).toBeCloseTo(3.8);
    });

    it('division by zero falls back to divisor=1', () => {
      // Engine uses Number(right) || 1, so 0 becomes 1
      expect(evalOk('10 / 0')).toBe(10);
    });

    it('handles chained operations', () => {
      expect(evalOk('1 + 2 + 3 + 4')).toBe(10);
    });

    it('power is right-associative', () => {
      // 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      expect(evalOk('2 ^ 3 ^ 2')).toBe(512);
    });
  });

  // ─── Comparisons ──────────────────────────────────────────────
  describe('comparisons', () => {
    it('equality', () => {
      expect(evalOk('5 == 5')).toBe(true);
      expect(evalOk('5 == 6')).toBe(false);
    });

    it('inequality', () => {
      expect(evalOk('5 != 6')).toBe(true);
      expect(evalOk('5 != 5')).toBe(false);
    });

    it('less than', () => {
      expect(evalOk('3 < 5')).toBe(true);
      expect(evalOk('5 < 3')).toBe(false);
    });

    it('greater than', () => {
      expect(evalOk('5 > 3')).toBe(true);
    });

    it('less than or equal', () => {
      expect(evalOk('5 <= 5')).toBe(true);
      expect(evalOk('5 <= 6')).toBe(true);
      expect(evalOk('6 <= 5')).toBe(false);
    });

    it('greater than or equal', () => {
      expect(evalOk('5 >= 5')).toBe(true);
      expect(evalOk('6 >= 5')).toBe(true);
    });
  });

  // ─── Logical Operators ────────────────────────────────────────
  describe('logical operators', () => {
    it('AND', () => {
      expect(evalOk('1 == 1 && 2 == 2')).toBe(true);
      expect(evalOk('1 == 1 && 2 == 3')).toBe(false);
    });

    it('OR', () => {
      expect(evalOk('1 == 2 || 2 == 2')).toBe(true);
      expect(evalOk('1 == 2 || 2 == 3')).toBe(false);
    });

    it('NOT', () => {
      expect(evalOk('!0')).toBe(true);
      expect(evalOk('!1')).toBe(false);
    });
  });

  // ─── String Operations ────────────────────────────────────────
  describe('string operations', () => {
    it('string concatenation with +', () => {
      expect(evalOk('"hello" + " " + "world"')).toBe('hello world');
    });

    it('mixed string + number concatenation', () => {
      expect(evalOk('"count: " + 5')).toBe('count: 5');
    });
  });

  // ─── String Functions ─────────────────────────────────────────
  describe('string functions', () => {
    it('len()', () => {
      expect(evalOk('len("hello")')).toBe(5);
      expect(evalOk('len("")')).toBe(0);
    });

    it('mid()', () => {
      expect(evalOk('mid("hello world", 6, 5)')).toBe('world');
    });

    it('left()', () => {
      expect(evalOk('left("hello", 3)')).toBe('hel');
    });

    it('right()', () => {
      expect(evalOk('right("hello", 3)')).toBe('llo');
    });

    it('concat()', () => {
      expect(evalOk('concat("a", "b", "c")')).toBe('abc');
    });

    it('upper()', () => {
      expect(evalOk('upper("hello")')).toBe('HELLO');
    });

    it('lower()', () => {
      expect(evalOk('lower("HELLO")')).toBe('hello');
    });

    it('trim()', () => {
      expect(evalOk('trim("  hello  ")')).toBe('hello');
    });

    it('replace()', () => {
      expect(evalOk('replace("hello world", "world", "there")')).toBe('hello there');
    });

    it('split()', () => {
      const result = evalOk('split("a,b,c", ",")');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('handles null/undefined gracefully', () => {
      expect(evalOk('len(missingField)', {})).toBe(0);
      expect(evalOk('upper(missingField)', {})).toBe('');
    });
  });

  // ─── Numeric Functions ────────────────────────────────────────
  describe('numeric functions', () => {
    it('sum()', () => {
      expect(evalOk('sum(1, 2, 3)')).toBe(6);
      expect(evalOk('sum(10, 20)')).toBe(30);
    });

    it('average()', () => {
      expect(evalOk('average(10, 20, 30)')).toBe(20);
    });

    it('min()', () => {
      expect(evalOk('min(5, 3, 8, 1)')).toBe(1);
    });

    it('max()', () => {
      expect(evalOk('max(5, 3, 8, 1)')).toBe(8);
    });

    it('round()', () => {
      expect(evalOk('round(3.14159, 2)')).toBe(3.14);
      expect(evalOk('round(3.5)')).toBe(4);
    });

    it('floor()', () => {
      expect(evalOk('floor(3.7)')).toBe(3);
      expect(evalOk('floor(3.2)')).toBe(3);
    });

    it('ceil()', () => {
      expect(evalOk('ceil(3.2)')).toBe(4);
      expect(evalOk('ceil(3.7)')).toBe(4);
    });

    it('abs()', () => {
      expect(evalOk('abs(-5)')).toBe(5);
      expect(evalOk('abs(5)')).toBe(5);
    });

    it('sqrt()', () => {
      expect(evalOk('sqrt(16)')).toBe(4);
      expect(evalOk('sqrt(2)')).toBeCloseTo(1.414, 2);
    });

    it('pow()', () => {
      expect(evalOk('pow(2, 3)')).toBe(8);
      expect(evalOk('pow(10, 0)')).toBe(1);
    });

    it('mod()', () => {
      expect(evalOk('mod(17, 5)')).toBe(2);
      expect(evalOk('mod(10, 3)')).toBe(1);
    });
  });

  // ─── Date Functions ───────────────────────────────────────────
  describe('date functions', () => {
    it('now() returns ISO string', () => {
      const result = evalOk('now()');
      expect(typeof result).toBe('string');
      expect(new Date(result).getTime()).not.toBeNaN();
    });

    it('today() returns date without time', () => {
      const result = evalOk('today()');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('year() extracts year', () => {
      expect(evalOk('year("2025-06-15")')).toBe(2025);
    });

    it('month() extracts month (1-indexed)', () => {
      expect(evalOk('month("2025-06-15")')).toBe(6);
    });

    it('day() extracts day', () => {
      // Use a full ISO timestamp to avoid timezone ambiguity
      expect(evalOk('day("2025-06-15T12:00:00")')).toBe(15);
    });

    it('year/month/day return 0 for invalid dates', () => {
      expect(evalOk('year("not-a-date")')).toBe(0);
      expect(evalOk('month("not-a-date")')).toBe(0);
      expect(evalOk('day("not-a-date")')).toBe(0);
    });

    it('dateAdd() adds days', () => {
      const result = evalOk('dateAdd("2025-01-01T12:00:00", 10, "days")');
      expect(result).toBeTruthy();
      expect(new Date(result).getUTCDate()).toBe(11);
    });

    it('dateAdd() adds months', () => {
      const result = evalOk('dateAdd("2025-01-15T12:00:00", 2, "months")');
      expect(new Date(result).getMonth()).toBe(2); // March (0-indexed)
    });

    it('dateAdd() adds years', () => {
      const result = evalOk('dateAdd("2025-01-15T12:00:00", 3, "years")');
      expect(new Date(result).getFullYear()).toBe(2028);
    });

    it('dateAdd() returns null for invalid date', () => {
      const result = evaluateFormula('dateAdd("invalid", 1, "days")', {});
      // Invalid date input — may return null or error
      expect(result.value === null || !result.success).toBe(true);
    });

    it('dateDiff() in days', () => {
      expect(evalOk('dateDiff("2025-01-11T00:00:00Z", "2025-01-01T00:00:00Z", "days")')).toBe(10);
    });

    it('dateDiff() in months', () => {
      expect(evalOk('dateDiff("2025-06-01T00:00:00Z", "2025-01-01T00:00:00Z", "months")')).toBe(5);
    });

    it('dateDiff() in years', () => {
      expect(evalOk('dateDiff("2028-01-01T00:00:00Z", "2025-01-01T00:00:00Z", "years")')).toBe(3);
    });

    it('dateDiff() returns 0 for invalid dates', () => {
      const result = evaluateFormula('dateDiff("invalid", "2025-01-01", "days")', {});
      expect(result.value).toBe(0);
    });
  });

  // ─── Array Functions ──────────────────────────────────────────
  describe('array functions', () => {
    const data = { items: [10, 20, 30], tags: ['a', 'b', 'c'], empty: [] };

    it('count()', () => {
      expect(evalOk('count(items)', data)).toBe(3);
      expect(evalOk('count(empty)', data)).toBe(0);
      expect(evalOk('count(missing)', data)).toBe(0);
    });

    it('first()', () => {
      expect(evalOk('first(items)', data)).toBe(10);
      expect(evalOk('first(empty)', data)).toBeNull();
    });

    it('last()', () => {
      expect(evalOk('last(items)', data)).toBe(30);
      expect(evalOk('last(empty)', data)).toBeNull();
    });

    it('join()', () => {
      expect(evalOk('join(tags, ", ")', data)).toBe('a, b, c');
    });

    it('contains()', () => {
      expect(evalOk('contains(tags, "a")', data)).toBe(true);
      expect(evalOk('contains(tags, "z")', data)).toBe(false);
      expect(evalOk('contains(missing, "x")', data)).toBe(false);
    });
  });

  // ─── Conditional Functions ────────────────────────────────────
  describe('conditional functions', () => {
    it('if() true branch', () => {
      expect(evalOk('if(1 == 1, "yes", "no")')).toBe('yes');
    });

    it('if() false branch', () => {
      expect(evalOk('if(1 == 2, "yes", "no")')).toBe('no');
    });

    it('coalesce() returns first non-null', () => {
      const data = { a: null, b: '', c: 'found' };
      expect(evalOk('coalesce(a, b, c)', data)).toBe('found');
    });

    it('coalesce() returns null if all empty', () => {
      const data = { a: null, b: '' };
      expect(evalOk('coalesce(a, b)', data)).toBeNull();
    });

    it('isNull()', () => {
      expect(evalOk('isNull(missing)', {})).toBe(true);
      expect(evalOk('isNull("hello")')).toBe(false);
    });

    it('isEmpty()', () => {
      expect(evalOk('isEmpty(missing)', {})).toBe(true);
      expect(evalOk('isEmpty("")')).toBe(true);
      expect(evalOk('isEmpty("hello")')).toBe(false);
    });

    it('isEmpty() with empty array', () => {
      expect(evalOk('isEmpty(items)', { items: [] })).toBe(true);
      expect(evalOk('isEmpty(items)', { items: [1] })).toBe(false);
    });
  });

  // ─── Field References ─────────────────────────────────────────
  describe('field references', () => {
    it('reads simple field', () => {
      expect(evalOk('price', { price: 42 })).toBe(42);
    });

    it('reads nested field', () => {
      expect(evalOk('address.city', { address: { city: 'NYC' } })).toBe('NYC');
    });

    it('returns undefined for missing field', () => {
      expect(evalOk('missing', {})).toBeUndefined();
    });

    it('returns null for deeply missing field', () => {
      // First level returns undefined, then nested access returns null
      expect(evalOk('a.b.c', {})).toBeNull();
    });

    it('works in expressions', () => {
      expect(evalOk('price * quantity', { price: 10, quantity: 5 })).toBe(50);
    });

    it('works in function calls', () => {
      expect(evalOk('upper(name)', { name: 'alice' })).toBe('ALICE');
    });
  });

  // ─── Complex Expressions ──────────────────────────────────────
  describe('complex expressions', () => {
    it('total price calculation', () => {
      const data = { price: 100, tax: 0.08, shipping: 5 };
      expect(evalOk('price + price * tax + shipping', data)).toBeCloseTo(113);
    });

    it('nested function calls', () => {
      expect(evalOk('round(average(10, 20, 33), 1)')).toBeCloseTo(21);
    });

    it('conditional with comparison', () => {
      expect(evalOk('if(age >= 18, "Adult", "Minor")', { age: 21 })).toBe('Adult');
      expect(evalOk('if(age >= 18, "Adult", "Minor")', { age: 15 })).toBe('Minor');
    });

    it('string building with concat and fields', () => {
      const data = { firstName: 'John', lastName: 'Doe' };
      expect(evalOk('concat(upper(left(firstName, 1)), ". ", lastName)', data)).toBe('J. Doe');
    });

    it('nested if', () => {
      const formula = 'if(score >= 90, "A", if(score >= 80, "B", "C"))';
      expect(evalOk(formula, { score: 95 })).toBe('A');
      expect(evalOk(formula, { score: 85 })).toBe('B');
      expect(evalOk(formula, { score: 70 })).toBe('C');
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────
  describe('edge cases', () => {
    it('empty formula returns null', () => {
      expect(evalOk('')).toBeNull();
      expect(evalOk('   ')).toBeNull();
    });

    it('unknown function returns error', () => {
      evalFail('unknownFunc(1)');
    });

    it('handles string literals with escaped quotes', () => {
      expect(evalOk('"hello \\"world\\""')).toBe('hello "world"');
    });

    it('handles single-quoted strings', () => {
      expect(evalOk("'hello'")).toBe('hello');
    });
  });

  // ─── validateFormula ──────────────────────────────────────────
  describe('validateFormula', () => {
    it('valid formulas', () => {
      expect(validateFormula('1 + 2').valid).toBe(true);
      expect(validateFormula('sum(a, b)').valid).toBe(true);
      expect(validateFormula('if(x > 0, "yes", "no")').valid).toBe(true);
      expect(validateFormula('').valid).toBe(true);
    });

    it('invalid formulas', () => {
      expect(validateFormula('unknownFunc()').valid).toBe(false);
    });
  });

  // ─── extractFieldReferences ───────────────────────────────────
  describe('extractFieldReferences', () => {
    it('extracts simple fields', () => {
      const refs = extractFieldReferences('price + tax');
      expect(refs).toContain('price');
      expect(refs).toContain('tax');
    });

    it('excludes function names', () => {
      const refs = extractFieldReferences('sum(price, tax)');
      expect(refs).not.toContain('sum');
      expect(refs).toContain('price');
      expect(refs).toContain('tax');
    });

    it('handles nested field paths', () => {
      const refs = extractFieldReferences('address.city + address.state');
      expect(refs).toContain('address.city');
      expect(refs).toContain('address.state');
    });

    it('returns empty for pure literals', () => {
      expect(extractFieldReferences('1 + 2')).toEqual([]);
      expect(extractFieldReferences('"hello"')).toEqual([]);
    });

    it('deduplicates fields', () => {
      const refs = extractFieldReferences('price + price * 2');
      expect(refs.filter(r => r === 'price')).toHaveLength(1);
    });
  });

  // ─── formulaFunctions catalog ─────────────────────────────────
  describe('formulaFunctions catalog', () => {
    it('has entries for all built-in functions', () => {
      const catalogNames = formulaFunctions.map(f => f.name);
      // spot-check key functions
      expect(catalogNames).toContain('sum');
      expect(catalogNames).toContain('if');
      expect(catalogNames).toContain('len');
      expect(catalogNames).toContain('now');
      expect(catalogNames).toContain('count');
      expect(catalogNames).toContain('coalesce');
    });

    it('every entry has required fields', () => {
      for (const fn of formulaFunctions) {
        expect(fn.name).toBeTruthy();
        expect(fn.description).toBeTruthy();
        expect(fn.syntax).toBeTruthy();
        expect(fn.category).toBeTruthy();
        expect(fn.examples.length).toBeGreaterThan(0);
      }
    });
  });
});
