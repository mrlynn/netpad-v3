import { getNestedValue } from './conditionalLogic';

/**
 * Simple formula evaluator for computed fields
 * Supports basic math operations and field references
 */

type FormulaContext = Record<string, unknown>;

/**
 * Extract field references from a formula string
 * Field references use the format: fieldName or nested.field.path
 */
export function extractFieldReferences(formula: string): string[] {
  const references: string[] = [];
  // Match field references (word characters and dots, not inside quotes or function calls)
  const regex = /\b([a-zA-Z_][a-zA-Z0-9_.]*)\b(?!\s*\()/g;
  let match;

  while ((match = regex.exec(formula)) !== null) {
    const ref = match[1];
    // Exclude known functions and constants
    const reserved = [
      'sum', 'avg', 'min', 'max', 'round', 'floor', 'ceil', 'abs',
      'sqrt', 'pow', 'if', 'and', 'or', 'not', 'concat', 'length',
      'true', 'false', 'null', 'undefined', 'Math', 'Number', 'String'
    ];
    if (!reserved.includes(ref.toLowerCase())) {
      references.push(ref);
    }
  }

  return [...new Set(references)];
}

/**
 * Available formula functions
 */
const formulaFunctions = {
  // Math functions
  sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
  avg: (...args: number[]) => args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0,
  min: (...args: number[]) => Math.min(...args),
  max: (...args: number[]) => Math.max(...args),
  round: (n: number, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  },
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,

  // String functions
  concat: (...args: unknown[]) => args.map(String).join(''),
  length: (val: unknown) => {
    if (typeof val === 'string') return val.length;
    if (Array.isArray(val)) return val.length;
    return 0;
  },
  upper: (s: string) => String(s).toUpperCase(),
  lower: (s: string) => String(s).toLowerCase(),
  trim: (s: string) => String(s).trim(),

  // Conditional functions
  if: (condition: boolean, trueVal: unknown, falseVal: unknown) =>
    condition ? trueVal : falseVal,
  coalesce: (...args: unknown[]) =>
    args.find(a => a !== null && a !== undefined && a !== ''),

  // Date functions
  now: () => new Date(),
  today: () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },
  year: (d: Date | string) => new Date(d).getFullYear(),
  month: (d: Date | string) => new Date(d).getMonth() + 1,
  day: (d: Date | string) => new Date(d).getDate(),
};

/**
 * Safely evaluate a formula expression
 */
export function evaluateFormula(
  formula: string,
  context: FormulaContext
): unknown {
  try {
    // Replace field references with their values
    let processedFormula = formula;
    const refs = extractFieldReferences(formula);

    for (const ref of refs) {
      const value = getNestedValue(context, ref);
      let replacement: string;

      if (value === undefined || value === null) {
        replacement = 'null';
      } else if (typeof value === 'string') {
        replacement = JSON.stringify(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        replacement = String(value);
      } else if (value instanceof Date) {
        replacement = `new Date("${value.toISOString()}")`;
      } else {
        replacement = JSON.stringify(value);
      }

      // Replace all occurrences of the field reference
      processedFormula = processedFormula.replace(
        new RegExp(`\\b${ref}\\b`, 'g'),
        replacement
      );
    }

    // Create a sandboxed evaluation context
    const sandbox = {
      ...formulaFunctions,
      Math,
      Number,
      String,
      Boolean,
      Date,
      Array,
      null: null,
      undefined: undefined,
      true: true,
      false: false,
    };

    // Create function with sandbox context
    const fn = new Function(
      ...Object.keys(sandbox),
      `"use strict"; return (${processedFormula});`
    );

    return fn(...Object.values(sandbox));
  } catch (error) {
    console.warn('Formula evaluation error:', error);
    return undefined;
  }
}

/**
 * Validate a formula syntax
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    // Try to parse the formula as a function body
    new Function(`return (${formula})`);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid formula syntax',
    };
  }
}
