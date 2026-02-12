/**
 * Formula Engine for Computed Fields
 *
 * Supports:
 * - Field references: fieldName or nested.field.path
 * - Arithmetic: +, -, *, /, %, ^
 * - Comparisons: ==, !=, <, >, <=, >=
 * - Logical: &&, ||, !
 * - String functions: len(), mid(), left(), right(), concat(), upper(), lower(), trim(), replace(), split()
 * - Numeric functions: sum(), average(), min(), max(), round(), floor(), ceil(), abs(), sqrt(), pow()
 * - Date functions: now(), today(), year(), month(), day(), dateAdd(), dateDiff()
 * - Conditional: if(condition, trueValue, falseValue)
 * - Array functions: count(), first(), last(), join(), contains()
 */

export interface FormulaFunction {
  name: string;
  description: string;
  syntax: string;
  category: 'string' | 'numeric' | 'date' | 'array' | 'logical' | 'conditional';
  examples: string[];
}

// Available functions documentation
export const formulaFunctions: FormulaFunction[] = [
  // String functions
  {
    name: 'len',
    description: 'Returns the length of a string',
    syntax: 'len(text)',
    category: 'string',
    examples: ['len(name)', 'len("hello")'],
  },
  {
    name: 'mid',
    description: 'Extracts a substring from the middle of a string',
    syntax: 'mid(text, start, length)',
    category: 'string',
    examples: ['mid(name, 0, 5)', 'mid("hello world", 6, 5)'],
  },
  {
    name: 'left',
    description: 'Returns the leftmost characters of a string',
    syntax: 'left(text, count)',
    category: 'string',
    examples: ['left(name, 3)', 'left("hello", 2)'],
  },
  {
    name: 'right',
    description: 'Returns the rightmost characters of a string',
    syntax: 'right(text, count)',
    category: 'string',
    examples: ['right(name, 3)', 'right("hello", 2)'],
  },
  {
    name: 'concat',
    description: 'Concatenates multiple strings together',
    syntax: 'concat(text1, text2, ...)',
    category: 'string',
    examples: ['concat(firstName, " ", lastName)', 'concat("Hello, ", name, "!")'],
  },
  {
    name: 'upper',
    description: 'Converts text to uppercase',
    syntax: 'upper(text)',
    category: 'string',
    examples: ['upper(name)', 'upper("hello")'],
  },
  {
    name: 'lower',
    description: 'Converts text to lowercase',
    syntax: 'lower(text)',
    category: 'string',
    examples: ['lower(name)', 'lower("HELLO")'],
  },
  {
    name: 'trim',
    description: 'Removes whitespace from both ends of a string',
    syntax: 'trim(text)',
    category: 'string',
    examples: ['trim(name)', 'trim("  hello  ")'],
  },
  {
    name: 'replace',
    description: 'Replaces occurrences of a substring',
    syntax: 'replace(text, search, replacement)',
    category: 'string',
    examples: ['replace(name, " ", "_")', 'replace(email, "@", " at ")'],
  },
  {
    name: 'split',
    description: 'Splits a string into an array by delimiter',
    syntax: 'split(text, delimiter)',
    category: 'string',
    examples: ['split(tags, ",")', 'split(fullName, " ")'],
  },

  // Numeric functions
  {
    name: 'sum',
    description: 'Returns the sum of all arguments',
    syntax: 'sum(num1, num2, ...)',
    category: 'numeric',
    examples: ['sum(price, tax, shipping)', 'sum(1, 2, 3, 4, 5)'],
  },
  {
    name: 'average',
    description: 'Returns the average of all arguments',
    syntax: 'average(num1, num2, ...)',
    category: 'numeric',
    examples: ['average(score1, score2, score3)', 'average(10, 20, 30)'],
  },
  {
    name: 'min',
    description: 'Returns the minimum value',
    syntax: 'min(num1, num2, ...)',
    category: 'numeric',
    examples: ['min(price1, price2, price3)', 'min(5, 10, 3)'],
  },
  {
    name: 'max',
    description: 'Returns the maximum value',
    syntax: 'max(num1, num2, ...)',
    category: 'numeric',
    examples: ['max(score1, score2, score3)', 'max(5, 10, 3)'],
  },
  {
    name: 'round',
    description: 'Rounds a number to specified decimal places',
    syntax: 'round(number, decimals?)',
    category: 'numeric',
    examples: ['round(price, 2)', 'round(3.14159, 2)'],
  },
  {
    name: 'floor',
    description: 'Rounds down to the nearest integer',
    syntax: 'floor(number)',
    category: 'numeric',
    examples: ['floor(price)', 'floor(3.7)'],
  },
  {
    name: 'ceil',
    description: 'Rounds up to the nearest integer',
    syntax: 'ceil(number)',
    category: 'numeric',
    examples: ['ceil(price)', 'ceil(3.2)'],
  },
  {
    name: 'abs',
    description: 'Returns the absolute value',
    syntax: 'abs(number)',
    category: 'numeric',
    examples: ['abs(balance)', 'abs(-5)'],
  },
  {
    name: 'sqrt',
    description: 'Returns the square root',
    syntax: 'sqrt(number)',
    category: 'numeric',
    examples: ['sqrt(area)', 'sqrt(16)'],
  },
  {
    name: 'pow',
    description: 'Raises a number to a power',
    syntax: 'pow(base, exponent)',
    category: 'numeric',
    examples: ['pow(length, 2)', 'pow(2, 3)'],
  },
  {
    name: 'mod',
    description: 'Returns the remainder of division',
    syntax: 'mod(number, divisor)',
    category: 'numeric',
    examples: ['mod(total, 10)', 'mod(17, 5)'],
  },

  // Date functions
  {
    name: 'now',
    description: 'Returns the current date and time',
    syntax: 'now()',
    category: 'date',
    examples: ['now()'],
  },
  {
    name: 'today',
    description: 'Returns the current date (without time)',
    syntax: 'today()',
    category: 'date',
    examples: ['today()'],
  },
  {
    name: 'year',
    description: 'Extracts the year from a date',
    syntax: 'year(date)',
    category: 'date',
    examples: ['year(birthDate)', 'year(now())'],
  },
  {
    name: 'month',
    description: 'Extracts the month (1-12) from a date',
    syntax: 'month(date)',
    category: 'date',
    examples: ['month(createdAt)', 'month(now())'],
  },
  {
    name: 'day',
    description: 'Extracts the day of month from a date',
    syntax: 'day(date)',
    category: 'date',
    examples: ['day(startDate)', 'day(now())'],
  },
  {
    name: 'dateAdd',
    description: 'Adds time to a date (unit: days, months, years)',
    syntax: 'dateAdd(date, amount, unit)',
    category: 'date',
    examples: ['dateAdd(startDate, 30, "days")', 'dateAdd(now(), 1, "years")'],
  },
  {
    name: 'dateDiff',
    description: 'Returns the difference between two dates',
    syntax: 'dateDiff(date1, date2, unit)',
    category: 'date',
    examples: ['dateDiff(endDate, startDate, "days")', 'dateDiff(now(), birthDate, "years")'],
  },

  // Array functions
  {
    name: 'count',
    description: 'Returns the number of items in an array',
    syntax: 'count(array)',
    category: 'array',
    examples: ['count(items)', 'count(tags)'],
  },
  {
    name: 'first',
    description: 'Returns the first item in an array',
    syntax: 'first(array)',
    category: 'array',
    examples: ['first(items)', 'first(names)'],
  },
  {
    name: 'last',
    description: 'Returns the last item in an array',
    syntax: 'last(array)',
    category: 'array',
    examples: ['last(items)', 'last(names)'],
  },
  {
    name: 'join',
    description: 'Joins array elements into a string',
    syntax: 'join(array, separator)',
    category: 'array',
    examples: ['join(tags, ", ")', 'join(names, " and ")'],
  },
  {
    name: 'contains',
    description: 'Checks if an array contains a value',
    syntax: 'contains(array, value)',
    category: 'array',
    examples: ['contains(roles, "admin")', 'contains(tags, "featured")'],
  },

  // Conditional
  {
    name: 'if',
    description: 'Returns one value if condition is true, another if false',
    syntax: 'if(condition, trueValue, falseValue)',
    category: 'conditional',
    examples: ['if(age >= 18, "Adult", "Minor")', 'if(stock > 0, "In Stock", "Out of Stock")'],
  },
  {
    name: 'coalesce',
    description: 'Returns the first non-null/non-empty value',
    syntax: 'coalesce(value1, value2, ...)',
    category: 'conditional',
    examples: ['coalesce(nickname, firstName, "Guest")', 'coalesce(phone, email, "N/A")'],
  },
  {
    name: 'isNull',
    description: 'Checks if a value is null or undefined',
    syntax: 'isNull(value)',
    category: 'conditional',
    examples: ['isNull(middleName)', 'if(isNull(discount), 0, discount)'],
  },
  {
    name: 'isEmpty',
    description: 'Checks if a value is empty (null, undefined, empty string, or empty array)',
    syntax: 'isEmpty(value)',
    category: 'conditional',
    examples: ['isEmpty(notes)', 'if(isEmpty(tags), "No tags", join(tags, ", "))'],
  },
];

// Function implementations
const builtInFunctions: Record<string, (...args: any[]) => any> = {
  // String functions
  len: (text: any) => String(text ?? '').length,
  mid: (text: any, start: number, length: number) => String(text ?? '').substring(start, start + length),
  left: (text: any, count: number) => String(text ?? '').substring(0, count),
  right: (text: any, count: number) => {
    const str = String(text ?? '');
    return str.substring(str.length - count);
  },
  concat: (...args: any[]) => args.map(a => String(a ?? '')).join(''),
  upper: (text: any) => String(text ?? '').toUpperCase(),
  lower: (text: any) => String(text ?? '').toLowerCase(),
  trim: (text: any) => String(text ?? '').trim(),
  replace: (text: any, search: string, replacement: string) =>
    String(text ?? '').split(search).join(replacement),
  split: (text: any, delimiter: string) => String(text ?? '').split(delimiter),

  // Numeric functions
  sum: (...args: any[]) => args.flat().reduce((acc, val) => acc + (Number(val) || 0), 0),
  average: (...args: any[]) => {
    const nums = args.flat().map(v => Number(v) || 0);
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  },
  min: (...args: any[]) => Math.min(...args.flat().map(v => Number(v) || 0)),
  max: (...args: any[]) => Math.max(...args.flat().map(v => Number(v) || 0)),
  round: (num: any, decimals: number = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(num) || 0) * factor) / factor;
  },
  floor: (num: any) => Math.floor(Number(num) || 0),
  ceil: (num: any) => Math.ceil(Number(num) || 0),
  abs: (num: any) => Math.abs(Number(num) || 0),
  sqrt: (num: any) => Math.sqrt(Number(num) || 0),
  pow: (base: any, exp: any) => Math.pow(Number(base) || 0, Number(exp) || 0),
  mod: (num: any, divisor: any) => (Number(num) || 0) % (Number(divisor) || 1),

  // Date functions
  now: () => new Date().toISOString(),
  today: () => new Date().toISOString().split('T')[0],
  year: (date: any) => {
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getFullYear();
  },
  month: (date: any) => {
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getMonth() + 1;
  },
  day: (date: any) => {
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? 0 : d.getDate();
  },
  dateadd: (date: any, amount: number, unit: string) => {
    const d = date instanceof Date ? new Date(date) : new Date(date);
    if (isNaN(d.getTime())) return null;
    switch (unit.toLowerCase()) {
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'months':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'years':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }
    return d.toISOString();
  },
  datediff: (date1: any, date2: any, unit: string) => {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const diffMs = d1.getTime() - d2.getTime();
    switch (unit.toLowerCase()) {
      case 'days':
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      case 'months':
        return (d1.getFullYear() - d2.getFullYear()) * 12 + (d1.getMonth() - d2.getMonth());
      case 'years':
        return d1.getFullYear() - d2.getFullYear();
      default:
        return diffMs;
    }
  },

  // Array functions
  count: (arr: any) => (Array.isArray(arr) ? arr.length : 0),
  first: (arr: any) => (Array.isArray(arr) && arr.length > 0 ? arr[0] : null),
  last: (arr: any) => (Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null),
  join: (arr: any, separator: string = ', ') =>
    Array.isArray(arr) ? arr.join(separator) : String(arr ?? ''),
  contains: (arr: any, value: any) => (Array.isArray(arr) ? arr.includes(value) : false),

  // Conditional functions
  if: (condition: any, trueVal: any, falseVal: any) => (condition ? trueVal : falseVal),
  coalesce: (...args: any[]) => {
    for (const arg of args) {
      if (arg !== null && arg !== undefined && arg !== '') return arg;
    }
    return null;
  },
  isnull: (val: any) => val === null || val === undefined,
  isempty: (val: any) => {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  },
};

// Token types for the parser
type TokenType =
  | 'number'
  | 'string'
  | 'identifier'
  | 'operator'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'dot';

interface Token {
  type: TokenType;
  value: string | number;
}

// Tokenizer
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const char = formula[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers
    if (/\d/.test(char) || (char === '.' && /\d/.test(formula[i + 1]))) {
      let num = '';
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
        num += formula[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    // Strings (single or double quoted)
    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      i++; // skip opening quote
      while (i < formula.length && formula[i] !== quote) {
        if (formula[i] === '\\' && i + 1 < formula.length) {
          i++;
          str += formula[i];
        } else {
          str += formula[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Identifiers (field names, function names)
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        id += formula[i++];
      }
      tokens.push({ type: 'identifier', value: id });
      continue;
    }

    // Multi-character operators
    const twoChar = formula.substring(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar });
      i += 2;
      continue;
    }

    // Single character operators and punctuation
    if ('+-*/%^<>!'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }

    if (char === '.') {
      tokens.push({ type: 'dot', value: '.' });
      i++;
      continue;
    }

    // Unknown character, skip
    i++;
  }

  return tokens;
}

// Parser and evaluator
class FormulaEvaluator {
  private tokens: Token[];
  private pos: number;
  private data: Record<string, any>;

  constructor(tokens: Token[], data: Record<string, any>) {
    this.tokens = tokens;
    this.pos = 0;
    this.data = data;
  }

  private current(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private advance(): Token | null {
    const token = this.current();
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.advance();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${type}, got ${token?.type || 'end of input'}`);
    }
    return token;
  }

  parse(): any {
    return this.parseExpression();
  }

  private parseExpression(): any {
    return this.parseOr();
  }

  private parseOr(): any {
    let left = this.parseAnd();
    while (this.current()?.value === '||') {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  private parseAnd(): any {
    let left = this.parseComparison();
    while (this.current()?.value === '&&') {
      this.advance();
      const right = this.parseComparison();
      left = left && right;
    }
    return left;
  }

  private parseComparison(): any {
    let left = this.parseAddSub();
    const ops = ['==', '!=', '<', '>', '<=', '>='];
    while (this.current() && ops.includes(String(this.current()?.value))) {
      const op = this.advance()!.value;
      const right = this.parseAddSub();
      switch (op) {
        case '==': left = left == right; break;
        case '!=': left = left != right; break;
        case '<': left = left < right; break;
        case '>': left = left > right; break;
        case '<=': left = left <= right; break;
        case '>=': left = left >= right; break;
      }
    }
    return left;
  }

  private parseAddSub(): any {
    let left = this.parseMulDiv();
    while (this.current() && ['+', '-'].includes(String(this.current()?.value))) {
      const op = this.advance()!.value;
      const right = this.parseMulDiv();
      if (op === '+') {
        // String concatenation or addition
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left ?? '') + String(right ?? '');
        } else {
          left = (Number(left) || 0) + (Number(right) || 0);
        }
      } else {
        left = (Number(left) || 0) - (Number(right) || 0);
      }
    }
    return left;
  }

  private parseMulDiv(): any {
    let left = this.parsePower();
    while (this.current() && ['*', '/', '%'].includes(String(this.current()?.value))) {
      const op = this.advance()!.value;
      const right = this.parsePower();
      switch (op) {
        case '*': left = (Number(left) || 0) * (Number(right) || 0); break;
        case '/': left = (Number(left) || 0) / (Number(right) || 1); break;
        case '%': left = (Number(left) || 0) % (Number(right) || 1); break;
      }
    }
    return left;
  }

  private parsePower(): any {
    let left = this.parseUnary();
    if (this.current()?.value === '^') {
      this.advance();
      const right = this.parsePower(); // Right associative
      left = Math.pow(Number(left) || 0, Number(right) || 0);
    }
    return left;
  }

  private parseUnary(): any {
    if (this.current()?.value === '-') {
      this.advance();
      return -(Number(this.parseUnary()) || 0);
    }
    if (this.current()?.value === '!') {
      this.advance();
      return !this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const token = this.current();

    if (!token) {
      return null;
    }

    // Number literal
    if (token.type === 'number') {
      this.advance();
      return token.value;
    }

    // String literal
    if (token.type === 'string') {
      this.advance();
      return token.value;
    }

    // Parenthesized expression
    if (token.type === 'lparen') {
      this.advance();
      const value = this.parseExpression();
      this.expect('rparen');
      return value;
    }

    // Identifier (field reference or function call)
    if (token.type === 'identifier') {
      const name = String(token.value);
      this.advance();

      // Check for function call
      if (this.current()?.type === 'lparen') {
        return this.parseFunctionCall(name);
      }

      // Check for nested field access (e.g., address.city)
      let fieldPath = name;
      while (this.current()?.type === 'dot') {
        this.advance();
        const nextToken = this.expect('identifier');
        fieldPath += '.' + nextToken.value;
      }

      // Get field value from data
      return this.getFieldValue(fieldPath);
    }

    return null;
  }

  private parseFunctionCall(name: string): any {
    this.expect('lparen');
    const args: any[] = [];

    while (this.current() && this.current()?.type !== 'rparen') {
      args.push(this.parseExpression());
      if (this.current()?.type === 'comma') {
        this.advance();
      }
    }

    this.expect('rparen');

    // Look up and call function
    const fn = builtInFunctions[name.toLowerCase()];
    if (fn) {
      return fn(...args);
    }

    throw new Error(`Unknown function: ${name}`);
  }

  private getFieldValue(path: string): any {
    const parts = path.split('.');
    let value: any = this.data;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }

    return value;
  }
}

/**
 * Evaluates a formula with the given field data
 */
export function evaluateFormula(
  formula: string,
  data: Record<string, any>
): { success: boolean; value: any; error?: string } {
  try {
    if (!formula || !formula.trim()) {
      return { success: true, value: null };
    }

    const tokens = tokenize(formula);
    const evaluator = new FormulaEvaluator(tokens, data);
    const value = evaluator.parse();

    return { success: true, value };
  } catch (error: any) {
    return {
      success: false,
      value: null,
      error: error.message || 'Formula evaluation error',
    };
  }
}

/**
 * Validates a formula without evaluating it
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    if (!formula || !formula.trim()) {
      return { valid: true };
    }

    // Try to tokenize and parse with empty data
    const tokens = tokenize(formula);
    const evaluator = new FormulaEvaluator(tokens, {});
    evaluator.parse();

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid formula syntax',
    };
  }
}

/**
 * Extracts field references from a formula
 */
export function extractFieldReferences(formula: string): string[] {
  const fields: Set<string> = new Set();

  try {
    const tokens = tokenize(formula);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === 'identifier') {
        // Check if it's a function call (followed by lparen)
        const next = tokens[i + 1];
        if (next?.type !== 'lparen') {
          // It's a field reference
          let fieldPath = String(token.value);

          // Check for nested access
          let j = i + 1;
          while (j < tokens.length && tokens[j]?.type === 'dot') {
            j++;
            if (tokens[j]?.type === 'identifier') {
              fieldPath += '.' + tokens[j].value;
              j++;
            }
          }

          fields.add(fieldPath);
        }
      }
    }
  } catch {
    // Ignore parsing errors for field extraction
  }

  return Array.from(fields);
}
