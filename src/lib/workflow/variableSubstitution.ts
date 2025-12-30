/**
 * Variable Substitution Utility
 *
 * Handles substitution of template variables in workflow node configurations.
 * Supports patterns like:
 * - {{nodes.formTrigger.data.fieldName}}
 * - {{trigger.payload.data}}
 * - {{variables.myVar}}
 */

export interface SubstitutionContext {
  nodes: Record<string, Record<string, unknown>>;
  trigger: {
    type: string;
    payload?: Record<string, unknown>;
  };
  variables: Record<string, unknown>;
}

/**
 * Resolve a dot-notation path from the context
 * e.g., "nodes.formTrigger.data.name" -> value at that path
 */
export function resolvePath(context: SubstitutionContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Check if a string contains template variables
 */
export function hasTemplateVariables(value: string): boolean {
  return /\{\{[^}]+\}\}/.test(value);
}

/**
 * Substitute template variables in a string
 * Handles:
 * - Full replacement: "{{nodes.formTrigger.data}}" -> object
 * - Partial replacement: "Hello {{nodes.formTrigger.data.name}}" -> "Hello John"
 */
export function substituteString(value: string, context: SubstitutionContext): unknown {
  // Check if it's a full template (entire string is one template)
  const fullMatch = value.match(/^\{\{([^}]+)\}\}$/);
  if (fullMatch) {
    // Full replacement - can return any type
    const path = fullMatch[1].trim();
    const resolved = resolvePath(context, path);
    return resolved !== undefined ? resolved : value;
  }

  // Partial replacement - always returns string
  return value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const resolved = resolvePath(context, trimmedPath);

    if (resolved === undefined || resolved === null) {
      return match; // Keep original if not found
    }

    if (typeof resolved === 'object') {
      return JSON.stringify(resolved);
    }

    return String(resolved);
  });
}

/**
 * Recursively substitute variables in any value
 * - Strings: Substitute template variables
 * - Arrays: Substitute each element
 * - Objects: Substitute each value
 * - Other types: Return as-is
 */
export function substituteVariables(value: unknown, context: SubstitutionContext): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (hasTemplateVariables(value)) {
      return substituteString(value, context);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => substituteVariables(item, context));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = substituteVariables(val, context);
    }
    return result;
  }

  // Numbers, booleans, etc. - return as-is
  return value;
}

/**
 * Build substitution context from workflow execution state
 */
export function buildSubstitutionContext(
  nodeOutputs: Record<string, Record<string, unknown>>,
  trigger: { type: string; payload?: Record<string, unknown> },
  variables: Record<string, unknown>
): SubstitutionContext {
  return {
    nodes: nodeOutputs,
    trigger,
    variables,
  };
}
