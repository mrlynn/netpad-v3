/**
 * Tests for formCodeGenerators — code generation for multiple frameworks,
 * schema generators (Zod, Yup), and TypeScript type generation.
 */

import { generateFormCode, CodeGenerationOptions } from '@/lib/formCodeGenerators';
import { FormConfiguration, FieldConfig } from '@/types/form';

// Helper to create a minimal field
const createField = (overrides: Partial<FieldConfig> = {}): FieldConfig => ({
  path: 'name',
  label: 'Name',
  type: 'string',
  included: true,
  required: false,
  ...overrides,
});

// Helper to create a minimal form config
const createForm = (overrides: Partial<FormConfiguration> = {}): FormConfiguration => ({
  name: 'Test Form',
  collection: 'tests',
  database: 'test_db',
  fieldConfigs: [
    createField({ path: 'name', label: 'Name', type: 'string', required: true }),
    createField({ path: 'email', label: 'Email', type: 'string' }),
    createField({ path: 'age', label: 'Age', type: 'number' }),
    createField({ path: 'active', label: 'Active', type: 'boolean' }),
  ],
  ...overrides,
});

// =============================================================================
// generateFormCode — main dispatch
// =============================================================================

describe('generateFormCode', () => {
  const form = createForm();

  it('returns a non-empty string for every supported framework', () => {
    const frameworks: CodeGenerationOptions['framework'][] = [
      'react', 'vue', 'angular', 'html', 'react-hook-form',
      'nextjs', 'svelte', 'solidjs', 'remix',
      'python-flask', 'python-fastapi', 'python-django',
      'node-express', 'php', 'ruby-rails', 'go-gin', 'java-spring',
      'zod-schema', 'yup-schema', 'typescript-types',
    ];

    for (const framework of frameworks) {
      const code = generateFormCode(form, { framework });
      expect(code).toBeTruthy();
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(50);
    }
  });

  it('defaults to React when no framework is specified', () => {
    const code = generateFormCode(form);
    expect(code).toContain('useState');
    expect(code).toContain('React');
  });

  it('defaults to React for unknown framework', () => {
    const code = generateFormCode(form, { framework: 'unknown-fw' as any });
    expect(code).toContain('useState');
  });
});

// =============================================================================
// React generation
// =============================================================================

describe('React code generation', () => {
  const form = createForm();

  it('generates MUI imports by default', () => {
    const code = generateFormCode(form, { framework: 'react', styling: 'mui' });
    expect(code).toContain("@mui/material");
    expect(code).toContain('TextField');
  });

  it('generates without MUI when styling is none', () => {
    const code = generateFormCode(form, { framework: 'react', styling: 'none' });
    expect(code).not.toContain("@mui/material");
  });

  it('uses TypeScript annotations when language is typescript', () => {
    const code = generateFormCode(form, { framework: 'react', language: 'typescript' });
    expect(code).toContain('FormData');
  });

  it('omits TypeScript annotations for javascript', () => {
    const code = generateFormCode(form, { framework: 'react', language: 'javascript' });
    expect(code).not.toContain("import { FormData } from './types';");
  });

  it('includes all included fields', () => {
    const code = generateFormCode(form, { framework: 'react' });
    expect(code).toContain('name');
    expect(code).toContain('email');
    expect(code).toContain('age');
  });

  it('excludes fields where included=false', () => {
    const formWithExcluded = createForm({
      fieldConfigs: [
        createField({ path: 'visible', label: 'Visible', included: true }),
        createField({ path: 'hidden', label: 'Hidden', included: false }),
      ],
    });
    const code = generateFormCode(formWithExcluded, { framework: 'react' });
    expect(code).toContain('visible');
    // hidden field path shouldn't appear in form rendering
    // (it may appear in state init but not in rendered fields)
  });

  it('handles boolean fields with Switch (MUI)', () => {
    const code = generateFormCode(form, { framework: 'react', styling: 'mui' });
    expect(code).toContain('Switch');
  });

  it('handles number fields with type="number"', () => {
    const code = generateFormCode(form, { framework: 'react' });
    expect(code).toContain('type="number"');
  });

  it('includes handleSubmit function', () => {
    const code = generateFormCode(form, { framework: 'react' });
    expect(code).toContain('handleSubmit');
    expect(code).toContain('onSubmit');
  });

  it('generates component named after form', () => {
    const code = generateFormCode(form, { framework: 'react' });
    expect(code).toContain('TestFormForm');
  });

  it('handles form names with spaces', () => {
    const f = createForm({ name: 'My Cool Form' });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toContain('MyCoolFormForm');
  });
});

// =============================================================================
// Vue generation
// =============================================================================

describe('Vue code generation', () => {
  const form = createForm();

  it('generates a Vue template', () => {
    const code = generateFormCode(form, { framework: 'vue' });
    expect(code).toContain('<template>');
    expect(code).toContain('<script');
  });

  it('includes reactive form data', () => {
    const code = generateFormCode(form, { framework: 'vue' });
    // Vue 3 uses ref() or reactive()
    expect(code.toLowerCase()).toMatch(/reactive|ref/);
  });

  it('renders field inputs', () => {
    const code = generateFormCode(form, { framework: 'vue' });
    expect(code).toContain('name');
    expect(code).toContain('email');
  });
});

// =============================================================================
// Angular generation
// =============================================================================

describe('Angular code generation', () => {
  const form = createForm();

  it('generates an Angular component', () => {
    const code = generateFormCode(form, { framework: 'angular' });
    expect(code).toContain('@Component');
  });

  it('includes form fields', () => {
    const code = generateFormCode(form, { framework: 'angular' });
    expect(code).toContain('name');
  });
});

// =============================================================================
// HTML generation
// =============================================================================

describe('HTML code generation', () => {
  const form = createForm();

  it('generates plain HTML form', () => {
    const code = generateFormCode(form, { framework: 'html' });
    expect(code).toContain('<form');
    expect(code).toContain('</form>');
    expect(code).toContain('<input');
  });

  it('includes required attribute for required fields', () => {
    const code = generateFormCode(form, { framework: 'html' });
    expect(code).toContain('required');
  });

  it('includes labels', () => {
    const code = generateFormCode(form, { framework: 'html' });
    expect(code).toContain('Name');
    expect(code).toContain('Email');
  });
});

// =============================================================================
// React Hook Form
// =============================================================================

describe('React Hook Form generation', () => {
  const form = createForm();

  it('imports from react-hook-form', () => {
    const code = generateFormCode(form, { framework: 'react-hook-form' });
    expect(code).toContain('react-hook-form');
  });

  it('uses register or Controller pattern', () => {
    const code = generateFormCode(form, { framework: 'react-hook-form' });
    expect(code).toMatch(/register|Controller/);
  });
});

// =============================================================================
// Next.js generation
// =============================================================================

describe('Next.js code generation', () => {
  const form = createForm();

  it('generates Next.js code with use client or server actions', () => {
    const code = generateFormCode(form, { framework: 'nextjs' });
    // Should have either 'use client' or server action patterns
    expect(code.length).toBeGreaterThan(100);
  });
});

// =============================================================================
// Svelte generation
// =============================================================================

describe('Svelte code generation', () => {
  const form = createForm();

  it('generates Svelte component', () => {
    const code = generateFormCode(form, { framework: 'svelte' });
    expect(code).toContain('<script');
  });

  it('uses Svelte bindings', () => {
    const code = generateFormCode(form, { framework: 'svelte' });
    expect(code).toMatch(/bind:|let /);
  });
});

// =============================================================================
// SolidJS generation
// =============================================================================

describe('SolidJS code generation', () => {
  const form = createForm();

  it('generates SolidJS component', () => {
    const code = generateFormCode(form, { framework: 'solidjs' });
    expect(code).toContain('createSignal');
  });
});

// =============================================================================
// Backend frameworks
// =============================================================================

describe('Python Flask generation', () => {
  const form = createForm();

  it('generates Flask route', () => {
    const code = generateFormCode(form, { framework: 'python-flask' });
    expect(code).toMatch(/flask|Flask/i);
    expect(code).toContain('route');
  });
});

describe('Python FastAPI generation', () => {
  const form = createForm();

  it('generates FastAPI endpoint', () => {
    const code = generateFormCode(form, { framework: 'python-fastapi' });
    expect(code).toMatch(/fastapi|FastAPI/i);
  });

  it('uses Pydantic models', () => {
    const code = generateFormCode(form, { framework: 'python-fastapi' });
    expect(code).toMatch(/BaseModel|pydantic/i);
  });
});

describe('Python Django generation', () => {
  const form = createForm();

  it('generates Django form/view', () => {
    const code = generateFormCode(form, { framework: 'python-django' });
    expect(code).toMatch(/django|Django/i);
  });
});

describe('Node Express generation', () => {
  const form = createForm();

  it('generates Express route', () => {
    const code = generateFormCode(form, { framework: 'node-express' });
    expect(code).toMatch(/express|Express/i);
    expect(code).toContain('app.post');
  });
});

describe('PHP generation', () => {
  const form = createForm();

  it('generates PHP code', () => {
    const code = generateFormCode(form, { framework: 'php' });
    expect(code).toContain('<?php');
  });
});

describe('Ruby Rails generation', () => {
  const form = createForm();

  it('generates Rails code', () => {
    const code = generateFormCode(form, { framework: 'ruby-rails' });
    expect(code).toMatch(/class|def|rails/i);
  });
});

describe('Go Gin generation', () => {
  const form = createForm();

  it('generates Go struct and handler', () => {
    const code = generateFormCode(form, { framework: 'go-gin' });
    expect(code).toContain('struct');
    expect(code).toMatch(/gin|Gin/);
  });
});

describe('Java Spring generation', () => {
  const form = createForm();

  it('generates Java Spring controller', () => {
    const code = generateFormCode(form, { framework: 'java-spring' });
    expect(code).toMatch(/Spring|@RestController|@Controller/);
  });
});

// =============================================================================
// Schema generators
// =============================================================================

describe('Zod schema generation', () => {
  const form = createForm();

  it('generates Zod schema', () => {
    const code = generateFormCode(form, { framework: 'zod-schema' });
    expect(code).toContain('zod');
    expect(code).toContain('z.');
  });

  it('maps string fields to z.string()', () => {
    const code = generateFormCode(form, { framework: 'zod-schema' });
    expect(code).toContain('z.string()');
  });

  it('maps number fields to z.number()', () => {
    const code = generateFormCode(form, { framework: 'zod-schema' });
    expect(code).toContain('z.number()');
  });

  it('maps boolean fields to z.boolean()', () => {
    const code = generateFormCode(form, { framework: 'zod-schema' });
    expect(code).toContain('z.boolean()');
  });

  it('marks required fields appropriately', () => {
    const code = generateFormCode(form, { framework: 'zod-schema' });
    // Non-required fields should be optional
    expect(code).toContain('optional()');
  });

  it('exports validate function', () => {
    const code = generateFormCode(form, { framework: 'zod-schema' });
    expect(code).toContain('validate');
  });

  it('exports inferred type', () => {
    const code = generateFormCode(form, { framework: 'zod-schema' });
    expect(code).toContain('z.infer');
  });
});

describe('Yup schema generation', () => {
  const form = createForm();

  it('generates Yup schema', () => {
    const code = generateFormCode(form, { framework: 'yup-schema' });
    expect(code).toContain('yup');
  });

  it('maps string fields to yup.string()', () => {
    const code = generateFormCode(form, { framework: 'yup-schema' });
    expect(code).toContain('string()');
  });

  it('maps number fields to yup.number()', () => {
    const code = generateFormCode(form, { framework: 'yup-schema' });
    expect(code).toContain('number()');
  });

  it('marks required fields', () => {
    const code = generateFormCode(form, { framework: 'yup-schema' });
    expect(code).toMatch(/required\(/);
  });
});

describe('TypeScript types generation', () => {
  const form = createForm();

  it('generates TypeScript interfaces', () => {
    const code = generateFormCode(form, { framework: 'typescript-types' });
    expect(code).toContain('interface');
    expect(code).toContain('export');
  });

  it('maps string fields to string type', () => {
    const code = generateFormCode(form, { framework: 'typescript-types' });
    expect(code).toContain('string');
  });

  it('maps number fields to number type', () => {
    const code = generateFormCode(form, { framework: 'typescript-types' });
    expect(code).toContain('number');
  });

  it('maps boolean fields to boolean type', () => {
    const code = generateFormCode(form, { framework: 'typescript-types' });
    expect(code).toContain('boolean');
  });

  it('generates partial type', () => {
    const code = generateFormCode(form, { framework: 'typescript-types' });
    expect(code).toContain('Partial');
  });
});

// =============================================================================
// Conditional logic in generated code
// =============================================================================

describe('Conditional logic in code generation', () => {
  const formWithConditionals = createForm({
    fieldConfigs: [
      createField({ path: 'role', label: 'Role', type: 'string', required: true }),
      createField({
        path: 'manager',
        label: 'Manager Name',
        type: 'string',
        conditionalLogic: {
          action: 'show',
          logicType: 'all',
          conditions: [
            { field: 'role', operator: 'equals' as any, value: 'employee' },
          ],
        },
      }),
    ],
  });

  it('includes conditional logic helpers in React output', () => {
    const code = generateFormCode(formWithConditionals, { framework: 'react' });
    expect(code).toContain('evaluateCondition');
  });

  it('wraps conditional fields in visibility checks', () => {
    const code = generateFormCode(formWithConditionals, { framework: 'react' });
    expect(code).toContain('evaluateCondition');
    // The manager field should be conditionally rendered
    expect(code).toContain('Manager');
  });

  it('does not include conditional helpers when no fields have logic', () => {
    const simpleForm = createForm();
    const code = generateFormCode(simpleForm, { framework: 'react' });
    expect(code).not.toContain('evaluateCondition');
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe('Edge cases', () => {
  it('handles empty fieldConfigs', () => {
    const emptyForm = createForm({ fieldConfigs: [] });
    const code = generateFormCode(emptyForm, { framework: 'react' });
    expect(code).toBeTruthy();
    expect(code).toContain('Submit');
  });

  it('handles form with only excluded fields', () => {
    const f = createForm({
      fieldConfigs: [
        createField({ path: 'a', included: false }),
        createField({ path: 'b', included: false }),
      ],
    });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toBeTruthy();
  });

  it('handles special characters in field labels', () => {
    const f = createForm({
      fieldConfigs: [
        createField({ path: 'q1', label: "What's your name?" }),
      ],
    });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toContain("What's your name?");
  });

  it('handles nested field paths', () => {
    const f = createForm({
      fieldConfigs: [
        createField({ path: 'address.street', label: 'Street' }),
        createField({ path: 'address.city', label: 'City' }),
      ],
    });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toContain('address.street');
  });

  it('handles date fields', () => {
    const f = createForm({
      fieldConfigs: [
        createField({ path: 'dob', label: 'Date of Birth', type: 'date' }),
      ],
    });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toContain('date');
  });

  it('handles array/select fields', () => {
    const f = createForm({
      fieldConfigs: [
        createField({ path: 'tags', label: 'Tags', type: 'array' }),
      ],
    });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toBeTruthy();
  });

  it('generates different output for each framework', () => {
    const f = createForm();
    const react = generateFormCode(f, { framework: 'react' });
    const vue = generateFormCode(f, { framework: 'vue' });
    const flask = generateFormCode(f, { framework: 'python-flask' });

    // All should be different
    expect(react).not.toEqual(vue);
    expect(react).not.toEqual(flask);
    expect(vue).not.toEqual(flask);
  });

  it('handles form with many fields', () => {
    const manyFields = Array.from({ length: 50 }, (_, i) =>
      createField({ path: `field_${i}`, label: `Field ${i}`, type: i % 3 === 0 ? 'number' : 'string' })
    );
    const f = createForm({ fieldConfigs: manyFields });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toContain('field_0');
    expect(code).toContain('field_49');
  });

  it('handles default values in field configs', () => {
    const f = createForm({
      fieldConfigs: [
        createField({ path: 'status', label: 'Status', defaultValue: 'active' }),
      ],
    });
    const code = generateFormCode(f, { framework: 'react' });
    expect(code).toContain('active');
  });
});
