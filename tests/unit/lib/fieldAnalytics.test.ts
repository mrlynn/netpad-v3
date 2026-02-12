/**
 * Tests for fieldAnalytics.ts
 * 
 * Tests statistical calculations for form field analytics:
 * text stats, number stats, choice stats, date stats, boolean stats, and field stats.
 */
import {
  calculateTextStats,
  calculateNumberStats,
  calculateChoiceStats,
  calculateDateStats,
  calculateBooleanStats,
  calculateFieldStats,
} from '@/lib/fieldAnalytics';

// Helper to create mock responses
function makeResponses(fieldPath: string, values: any[]) {
  return values.map(v => {
    const data: any = {};
    const parts = fieldPath.split('.');
    let current = data;
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = v;
    return { data } as any;
  });
}

describe('fieldAnalytics', () => {
  // ============================================
  // calculateTextStats
  // ============================================
  describe('calculateTextStats', () => {
    it('should return zeros for empty responses', () => {
      const result = calculateTextStats('name', []);
      expect(result).toEqual({ averageLength: 0, wordCount: 0 });
    });

    it('should return zeros when all values are empty strings', () => {
      const responses = makeResponses('name', ['', '', '']);
      const result = calculateTextStats('name', responses);
      expect(result).toEqual({ averageLength: 0, wordCount: 0 });
    });

    it('should calculate average length', () => {
      const responses = makeResponses('name', ['hello', 'hi']); // 5 + 2 = 7, avg = 3.5
      const result = calculateTextStats('name', responses);
      expect(result!.averageLength).toBe(3.5);
    });

    it('should count total words', () => {
      const responses = makeResponses('name', ['hello world', 'foo bar baz']);
      const result = calculateTextStats('name', responses);
      expect(result!.wordCount).toBe(5);
    });

    it('should identify common words (>2 chars)', () => {
      const responses = makeResponses('comment', [
        'great product love it',
        'great service love the product',
        'great experience',
      ]);
      const result = calculateTextStats('comment', responses);
      expect(result!.commonWords).toBeDefined();
      const greatEntry = result!.commonWords!.find((w: any) => w.word === 'great');
      expect(greatEntry).toBeDefined();
      expect(greatEntry!.count).toBe(3);
    });

    it('should limit common words to top 10', () => {
      const longText = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ');
      const responses = makeResponses('text', [longText, longText]);
      const result = calculateTextStats('text', responses);
      if (result!.commonWords) {
        expect(result!.commonWords.length).toBeLessThanOrEqual(10);
      }
    });

    it('should handle nested field paths', () => {
      const responses = [
        { data: { profile: { bio: 'hello world' } } },
      ] as any[];
      const result = calculateTextStats('profile.bio', responses);
      expect(result!.averageLength).toBe(11);
    });

    it('should convert non-string values to strings', () => {
      const responses = makeResponses('field', [123, true]);
      const result = calculateTextStats('field', responses);
      expect(result!.averageLength).toBeGreaterThan(0);
    });

    it('should skip null/undefined values', () => {
      const responses = makeResponses('name', ['hello', null, undefined, 'world']);
      const result = calculateTextStats('name', responses);
      expect(result!.averageLength).toBe(5); // both "hello" and "world" are 5 chars
    });
  });

  // ============================================
  // calculateNumberStats
  // ============================================
  describe('calculateNumberStats', () => {
    it('should return zeros for empty responses', () => {
      const result = calculateNumberStats('age', []);
      expect(result).toEqual({ min: 0, max: 0, average: 0, median: 0 });
    });

    it('should calculate min, max, average, median for odd count', () => {
      const responses = makeResponses('score', [10, 20, 30]);
      const result = calculateNumberStats('score', responses);
      expect(result!.min).toBe(10);
      expect(result!.max).toBe(30);
      expect(result!.average).toBe(20);
      expect(result!.median).toBe(20);
    });

    it('should calculate median for even count', () => {
      const responses = makeResponses('score', [10, 20, 30, 40]);
      const result = calculateNumberStats('score', responses);
      expect(result!.median).toBe(25); // (20+30)/2
    });

    it('should handle single value', () => {
      const responses = makeResponses('score', [42]);
      const result = calculateNumberStats('score', responses);
      expect(result!.min).toBe(42);
      expect(result!.max).toBe(42);
      expect(result!.average).toBe(42);
      expect(result!.median).toBe(42);
    });

    it('should parse string numbers', () => {
      const responses = makeResponses('score', ['10', '20', '30']);
      const result = calculateNumberStats('score', responses);
      expect(result!.average).toBe(20);
    });

    it('should skip NaN values', () => {
      const responses = makeResponses('score', [10, 'not-a-number', 30]);
      const result = calculateNumberStats('score', responses);
      expect(result!.average).toBe(20);
    });

    it('should handle negative numbers', () => {
      const responses = makeResponses('temp', [-10, 0, 10]);
      const result = calculateNumberStats('temp', responses);
      expect(result!.min).toBe(-10);
      expect(result!.max).toBe(10);
      expect(result!.average).toBe(0);
    });

    it('should generate distribution buckets', () => {
      const values = Array.from({ length: 20 }, (_, i) => i);
      const responses = makeResponses('value', values);
      const result = calculateNumberStats('value', responses);
      expect(result!.distribution).toBeDefined();
      expect(result!.distribution!.length).toBeGreaterThan(0);
      // Total counts should sum to total values
      const totalCount = result!.distribution!.reduce((s: number, d: any) => s + d.count, 0);
      expect(totalCount).toBe(20);
    });
  });

  // ============================================
  // calculateChoiceStats
  // ============================================
  describe('calculateChoiceStats', () => {
    it('should return empty options for empty responses', () => {
      const result = calculateChoiceStats('color', []);
      expect(result).toEqual({ options: [] });
    });

    it('should count option frequencies', () => {
      const responses = makeResponses('color', ['red', 'blue', 'red', 'green', 'red']);
      const result = calculateChoiceStats('color', responses);
      expect(result!.options).toBeDefined();
      const redOption = result!.options!.find((o: any) => o.value === 'red');
      expect(redOption!.count).toBe(3);
      expect(redOption!.percentage).toBe(60);
    });

    it('should sort options by count descending', () => {
      const responses = makeResponses('size', ['S', 'M', 'L', 'M', 'M', 'S']);
      const result = calculateChoiceStats('size', responses);
      expect(result!.options![0].value).toBe('M');
      expect(result!.options![0].count).toBe(3);
    });

    it('should skip null/undefined values', () => {
      const responses = makeResponses('choice', ['A', null, 'B', undefined]);
      const result = calculateChoiceStats('choice', responses);
      const totalCount = result!.options!.reduce((s: number, o: any) => s + o.count, 0);
      expect(totalCount).toBe(2);
    });

    it('should calculate percentages correctly', () => {
      const responses = makeResponses('yn', ['yes', 'no', 'yes', 'yes']);
      const result = calculateChoiceStats('yn', responses);
      const yesOption = result!.options!.find((o: any) => o.value === 'yes');
      expect(yesOption!.percentage).toBe(75);
    });
  });

  // ============================================
  // calculateDateStats
  // ============================================
  describe('calculateDateStats', () => {
    it('should return current dates for empty responses', () => {
      const result = calculateDateStats('date', []);
      expect(result!.earliest).toBeInstanceOf(Date);
      expect(result!.latest).toBeInstanceOf(Date);
    });

    it('should find earliest and latest dates', () => {
      const responses = makeResponses('date', [
        '2026-01-15T12:00:00Z',
        '2026-06-15T12:00:00Z',
        '2026-03-10T12:00:00Z',
      ]);
      const result = calculateDateStats('date', responses);
      expect(result!.earliest.getUTCFullYear()).toBe(2026);
      expect(result!.earliest.getUTCMonth()).toBe(0); // January
      expect(result!.latest.getUTCMonth()).toBe(5); // June
    });

    it('should handle Date objects', () => {
      const responses = makeResponses('date', [
        new Date('2026-01-15T12:00:00Z'),
        new Date('2026-12-15T12:00:00Z'),
      ]);
      const result = calculateDateStats('date', responses);
      expect(result!.earliest.getUTCMonth()).toBe(0);
      expect(result!.latest.getUTCMonth()).toBe(11);
    });

    it('should skip invalid dates', () => {
      const responses = makeResponses('date', ['2026-01-15T12:00:00Z', 'invalid', '2026-12-15T12:00:00Z']);
      const result = calculateDateStats('date', responses);
      expect(result!.earliest.getUTCFullYear()).toBe(2026);
    });

    it('should identify most common dates', () => {
      const responses = makeResponses('date', [
        '2026-01-15', '2026-01-15', '2026-01-15',
        '2026-02-01', '2026-02-01',
        '2026-03-10',
      ]);
      const result = calculateDateStats('date', responses);
      expect(result!.mostCommon).toBeDefined();
      expect(result!.mostCommon![0].date).toBe('2026-01-15');
      expect(result!.mostCommon![0].count).toBe(3);
    });
  });

  // ============================================
  // calculateBooleanStats
  // ============================================
  describe('calculateBooleanStats', () => {
    it('should count true and false values', () => {
      const responses = makeResponses('agree', [true, false, true, true]);
      const result = calculateBooleanStats('agree', responses);
      expect(result!.trueCount).toBe(3);
      expect(result!.falseCount).toBe(1);
      expect(result!.truePercentage).toBe(75);
      expect(result!.falsePercentage).toBe(25);
    });

    it('should handle string "true"', () => {
      const responses = makeResponses('agree', ['true', 'false', 'true']);
      const result = calculateBooleanStats('agree', responses);
      expect(result!.trueCount).toBe(2);
    });

    it('should handle numeric 1 as true', () => {
      const responses = makeResponses('flag', [1, 0, 1]);
      const result = calculateBooleanStats('flag', responses);
      expect(result!.trueCount).toBe(2);
    });

    it('should return 0 percentages for empty responses', () => {
      const result = calculateBooleanStats('agree', []);
      expect(result!.truePercentage).toBe(0);
      expect(result!.falsePercentage).toBe(0);
    });

    it('should handle all true', () => {
      const responses = makeResponses('yes', [true, true, true]);
      const result = calculateBooleanStats('yes', responses);
      expect(result!.truePercentage).toBe(100);
      expect(result!.falsePercentage).toBe(0);
    });

    it('should handle all false', () => {
      const responses = makeResponses('no', [false, false]);
      const result = calculateBooleanStats('no', responses);
      expect(result!.trueCount).toBe(0);
      expect(result!.falseCount).toBe(2);
    });
  });

  // ============================================
  // calculateFieldStats
  // ============================================
  describe('calculateFieldStats', () => {
    it('should calculate completion rate', () => {
      const responses = makeResponses('name', ['Alice', '', 'Bob', null]);
      const result = calculateFieldStats(
        { path: 'name', type: 'string' } as any,
        responses
      );
      expect(result.totalResponses).toBe(4);
      expect(result.completionRate).toBe(50); // 2 out of 4
    });

    it('should return 0 completion rate for empty responses', () => {
      const result = calculateFieldStats(
        { path: 'name', type: 'string' } as any,
        []
      );
      expect(result.completionRate).toBe(0);
    });

    it('should include text stats for string type', () => {
      const responses = makeResponses('name', ['Alice', 'Bob']);
      const result = calculateFieldStats(
        { path: 'name', type: 'string' } as any,
        responses
      );
      expect(result.textStats).toBeDefined();
    });

    it('should include text stats for email type', () => {
      const responses = makeResponses('email', ['a@b.com']);
      const result = calculateFieldStats(
        { path: 'email', type: 'email' } as any,
        responses
      );
      expect(result.textStats).toBeDefined();
    });

    it('should include text stats for url type', () => {
      const responses = makeResponses('site', ['https://example.com']);
      const result = calculateFieldStats(
        { path: 'site', type: 'url' } as any,
        responses
      );
      expect(result.textStats).toBeDefined();
    });

    it('should include number stats for number type', () => {
      const responses = makeResponses('age', [25, 30, 35]);
      const result = calculateFieldStats(
        { path: 'age', type: 'number' } as any,
        responses
      );
      expect(result.numberStats).toBeDefined();
      expect(result.numberStats!.average).toBe(30);
    });

    it('should include boolean stats for boolean type', () => {
      const responses = makeResponses('agree', [true, false]);
      const result = calculateFieldStats(
        { path: 'agree', type: 'boolean' } as any,
        responses
      );
      expect(result.booleanStats).toBeDefined();
    });

    it('should include date stats for date type', () => {
      const responses = makeResponses('dob', ['2000-01-01']);
      const result = calculateFieldStats(
        { path: 'dob', type: 'date' } as any,
        responses
      );
      expect(result.dateStats).toBeDefined();
    });

    it('should attempt choice stats for unknown types with data', () => {
      const responses = makeResponses('option', ['A', 'B', 'A']);
      const result = calculateFieldStats(
        { path: 'option', type: 'select' } as any,
        responses
      );
      expect(result.choiceStats).toBeDefined();
    });

    it('should set fieldPath and fieldType correctly', () => {
      const result = calculateFieldStats(
        { path: 'my.field', type: 'string' } as any,
        []
      );
      expect(result.fieldPath).toBe('my.field');
      expect(result.fieldType).toBe('string');
    });
  });
});
