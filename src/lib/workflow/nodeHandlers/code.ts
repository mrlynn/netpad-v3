/**
 * Code Execution Node Handler
 *
 * Executes custom JavaScript code within a sandboxed environment.
 * Provides access to input data, variables, and helper functions.
 *
 * Config:
 *   - code: JavaScript code to execute
 *   - timeout: Execution timeout in ms (default: 5000, max: 30000)
 *
 * Available in code:
 *   - input: The input data from previous nodes
 *   - variables: Workflow variables
 *   - trigger: Trigger information
 *   - console: { log, warn, error } for logging
 *   - helpers: { dayjs, lodash-like utilities }
 *
 * The code should return a value which becomes the node output.
 *
 * Example code:
 *   const items = input.documents || [];
 *   const processed = items.map(item => ({
 *     ...item,
 *     processedAt: new Date().toISOString()
 *   }));
 *   return { items: processed, count: processed.length };
 */

import { registerHandler } from './registry';
import {
  ExtendedNodeContext,
  NodeHandler,
  HandlerMetadata,
  successResult,
  failureResult,
  NodeErrorCodes,
} from './types';

const metadata: HandlerMetadata = {
  type: 'code',
  name: 'Code',
  description: 'Executes custom JavaScript code',
  version: '1.0.0',
};

// Maximum execution time (30 seconds)
const MAX_TIMEOUT = 30000;
const DEFAULT_TIMEOUT = 5000;

/**
 * Helper utilities available in code execution
 */
const helpers = {
  // Date helpers
  now: () => new Date(),
  formatDate: (date: Date | string, format?: string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!format) return d.toISOString();
    // Basic format support
    return format
      .replace('YYYY', String(d.getFullYear()))
      .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(d.getDate()).padStart(2, '0'))
      .replace('HH', String(d.getHours()).padStart(2, '0'))
      .replace('mm', String(d.getMinutes()).padStart(2, '0'))
      .replace('ss', String(d.getSeconds()).padStart(2, '0'));
  },
  parseDate: (str: string) => new Date(str),
  addDays: (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000),
  addHours: (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000),

  // String helpers
  slugify: (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  truncate: (str: string, length: number, suffix = '...') =>
    str.length > length ? str.slice(0, length - suffix.length) + suffix : str,
  capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
  camelCase: (str: string) => str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : ''),
  snakeCase: (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, ''),

  // Array helpers
  unique: <T>(arr: T[]) => [...new Set(arr)],
  flatten: <T>(arr: T[][]) => arr.flat(),
  chunk: <T>(arr: T[], size: number) => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },
  groupBy: <T>(arr: T[], key: keyof T | ((item: T) => string)) => {
    return arr.reduce((acc, item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  },
  sortBy: <T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc') => {
    return [...arr].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      const comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
      return order === 'desc' ? -comparison : comparison;
    });
  },
  first: <T>(arr: T[]) => arr[0],
  last: <T>(arr: T[]) => arr[arr.length - 1],
  sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
  avg: (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
  min: (arr: number[]) => Math.min(...arr),
  max: (arr: number[]) => Math.max(...arr),

  // Object helpers
  pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) result[key] = obj[key];
    }
    return result;
  },
  omit: <T extends object, K extends keyof T>(obj: T, keys: K[]) => {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result as Omit<T, K>;
  },
  get: (obj: unknown, path: string, defaultValue?: unknown) => {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return defaultValue;
      current = (current as Record<string, unknown>)[part];
    }
    return current ?? defaultValue;
  },
  set: (obj: Record<string, unknown>, path: string, value: unknown) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) current[part] = {};
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    return obj;
  },
  merge: (...objects: Record<string, unknown>[]) => Object.assign({}, ...objects),
  deepMerge: (target: Record<string, unknown>, ...sources: Record<string, unknown>[]): Record<string, unknown> => {
    for (const source of sources) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = helpers.deepMerge(
            (target[key] || {}) as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  },

  // JSON helpers
  parse: (str: string) => JSON.parse(str),
  stringify: (obj: unknown, pretty = false) => JSON.stringify(obj, null, pretty ? 2 : 0),

  // Number helpers
  round: (num: number, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },
  clamp: (num: number, min: number, max: number) => Math.min(Math.max(num, min), max),
  random: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,

  // UUID generator
  uuid: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Encoding
  base64Encode: (str: string) => Buffer.from(str).toString('base64'),
  base64Decode: (str: string) => Buffer.from(str, 'base64').toString('utf-8'),
  urlEncode: (str: string) => encodeURIComponent(str),
  urlDecode: (str: string) => decodeURIComponent(str),
};

/**
 * Execute code in a sandboxed context
 */
async function executeCode(
  code: string,
  context: {
    input: unknown;
    variables: Record<string, unknown>;
    trigger: unknown;
    nodeOutputs: Record<string, unknown>;
  },
  logFn: (level: string, message: string, data?: unknown) => Promise<void>,
  timeout: number
): Promise<{ success: true; result: unknown } | { success: false; error: string }> {
  const logs: Array<{ level: string; args: unknown[] }> = [];

  // Create console object that captures logs
  const consoleObj = {
    log: (...args: unknown[]) => logs.push({ level: 'info', args }),
    info: (...args: unknown[]) => logs.push({ level: 'info', args }),
    warn: (...args: unknown[]) => logs.push({ level: 'warn', args }),
    error: (...args: unknown[]) => logs.push({ level: 'error', args }),
    debug: (...args: unknown[]) => logs.push({ level: 'debug', args }),
  };

  // Build the execution context
  const execContext = {
    input: context.input,
    variables: context.variables,
    trigger: context.trigger,
    outputs: context.nodeOutputs,
    console: consoleObj,
    helpers,
    // Also expose common globals
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Map,
    Set,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
  };

  // Wrap the code in an async function
  const wrappedCode = `
    (async function(input, variables, trigger, outputs, console, helpers, JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Error, Map, Set, Promise, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI) {
      "use strict";
      ${code}
    })
  `;

  try {
    // Create the function
    const fn = eval(wrappedCode);

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Code execution timeout (${timeout}ms)`)), timeout);
    });

    const executionPromise = fn(
      execContext.input,
      execContext.variables,
      execContext.trigger,
      execContext.outputs,
      execContext.console,
      execContext.helpers,
      execContext.JSON,
      execContext.Math,
      execContext.Date,
      execContext.Array,
      execContext.Object,
      execContext.String,
      execContext.Number,
      execContext.Boolean,
      execContext.RegExp,
      execContext.Error,
      execContext.Map,
      execContext.Set,
      execContext.Promise,
      execContext.parseInt,
      execContext.parseFloat,
      execContext.isNaN,
      execContext.isFinite,
      execContext.encodeURIComponent,
      execContext.decodeURIComponent,
      execContext.encodeURI,
      execContext.decodeURI
    );

    const result = await Promise.race([executionPromise, timeoutPromise]);

    // Process captured logs
    for (const log of logs) {
      await logFn(
        log.level,
        `[code] ${log.args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`
      );
    }

    return { success: true, result };
  } catch (error) {
    // Process captured logs even on error
    for (const log of logs) {
      await logFn(
        log.level,
        `[code] ${log.args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

const handler: NodeHandler = async (context: ExtendedNodeContext) => {
  const startTime = Date.now();

  await context.log('info', 'Executing custom code', {
    nodeId: context.nodeId,
  });

  const { resolvedConfig, inputs } = context;

  // Get code configuration
  const code = resolvedConfig.code as string | undefined;
  let timeout = (resolvedConfig.timeout as number) || DEFAULT_TIMEOUT;

  // Enforce max timeout
  timeout = Math.min(timeout, MAX_TIMEOUT);

  if (!code || code.trim() === '') {
    await context.log('warn', 'No code provided');
    return successResult(
      {
        result: null,
        message: 'No code to execute',
      },
      { durationMs: Date.now() - startTime }
    );
  }

  await context.log('debug', 'Code execution config', {
    codeLength: code.length,
    timeout,
  });

  // Execute the code
  const result = await executeCode(
    code,
    {
      input: inputs,
      variables: context.variables,
      trigger: context.trigger,
      nodeOutputs: context.nodeOutputs,
    },
    async (level, message) => {
      await context.log(level as 'info' | 'warn' | 'error' | 'debug', message);
    },
    timeout
  );

  if (!result.success) {
    await context.log('error', 'Code execution failed', { error: result.error });
    return failureResult(
      NodeErrorCodes.OPERATION_FAILED,
      `Code execution error: ${result.error}`,
      false
    );
  }

  const durationMs = Date.now() - startTime;

  await context.log('info', 'Code executed successfully', {
    durationMs,
    resultType: typeof result.result,
  });

  // If result is an object, spread it; otherwise wrap it
  const outputData = result.result && typeof result.result === 'object' && !Array.isArray(result.result)
    ? { ...result.result as Record<string, unknown> }
    : { result: result.result };

  return successResult(
    {
      ...outputData,
      _execution: {
        durationMs,
        timedOut: false,
      },
    },
    { durationMs }
  );
};

// Register the handler
registerHandler(metadata, handler);

export { handler, metadata };
