/**
 * Variable Substitution Tests
 *
 * Tests for the workflow variable substitution utilities that handle
 * template variable replacement in node configurations.
 */

import {
  resolvePath,
  hasTemplateVariables,
  substituteString,
  substituteVariables,
  buildSubstitutionContext,
  SubstitutionContext,
} from '@/lib/workflow/variableSubstitution';

describe('Variable Substitution', () => {
  // ============================================
  // Test Fixtures
  // ============================================

  const createContext = (overrides: Partial<SubstitutionContext> = {}): SubstitutionContext => ({
    nodes: {
      formTrigger: {
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          preferences: {
            newsletter: true,
            theme: 'dark',
          },
        },
      },
      transform: {
        result: 'transformed-data',
        items: [1, 2, 3],
      },
    },
    trigger: {
      type: 'form-submission',
      payload: {
        formId: 'form-123',
        data: {
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          rating: 5,
        },
      },
    },
    variables: {
      apiKey: 'secret-key-123',
      baseUrl: 'https://api.example.com',
      maxRetries: 3,
    },
    ...overrides,
  });

  // ============================================
  // hasTemplateVariables
  // ============================================

  describe('hasTemplateVariables', () => {
    it('returns true for strings with template variables', () => {
      expect(hasTemplateVariables('Hello {{name}}')).toBe(true);
      expect(hasTemplateVariables('{{nodes.formTrigger.data.name}}')).toBe(true);
      expect(hasTemplateVariables('Start {{a}} middle {{b}} end')).toBe(true);
    });

    it('returns false for strings without template variables', () => {
      expect(hasTemplateVariables('Hello World')).toBe(false);
      expect(hasTemplateVariables('')).toBe(false);
      expect(hasTemplateVariables('{ not a template }')).toBe(false);
      expect(hasTemplateVariables('{{ incomplete')).toBe(false);
    });

    it('returns false for empty braces', () => {
      expect(hasTemplateVariables('{{}}')).toBe(false);
    });
  });

  // ============================================
  // resolvePath
  // ============================================

  describe('resolvePath', () => {
    const context = createContext();

    describe('node outputs', () => {
      it('resolves simple node output paths', () => {
        expect(resolvePath(context, 'nodes.transform.result')).toBe('transformed-data');
      });

      it('resolves nested node output paths', () => {
        expect(resolvePath(context, 'nodes.formTrigger.data.name')).toBe('John Doe');
        expect(resolvePath(context, 'nodes.formTrigger.data.email')).toBe('john@example.com');
      });

      it('resolves deeply nested paths', () => {
        expect(resolvePath(context, 'nodes.formTrigger.data.preferences.theme')).toBe('dark');
        expect(resolvePath(context, 'nodes.formTrigger.data.preferences.newsletter')).toBe(true);
      });

      it('resolves array values', () => {
        expect(resolvePath(context, 'nodes.transform.items')).toEqual([1, 2, 3]);
      });

      it('returns undefined for non-existent node', () => {
        expect(resolvePath(context, 'nodes.nonExistent.data')).toBeUndefined();
      });

      it('returns undefined for non-existent path', () => {
        expect(resolvePath(context, 'nodes.formTrigger.data.nonExistent')).toBeUndefined();
      });
    });

    describe('trigger data', () => {
      it('resolves trigger type', () => {
        expect(resolvePath(context, 'trigger.type')).toBe('form-submission');
      });

      it('resolves trigger payload', () => {
        expect(resolvePath(context, 'trigger.payload.formId')).toBe('form-123');
      });

      it('resolves trigger payload data', () => {
        expect(resolvePath(context, 'trigger.payload.data.fullName')).toBe('Jane Smith');
        expect(resolvePath(context, 'trigger.payload.data.rating')).toBe(5);
      });
    });

    describe('workflow variables', () => {
      it('resolves string variables', () => {
        expect(resolvePath(context, 'variables.apiKey')).toBe('secret-key-123');
        expect(resolvePath(context, 'variables.baseUrl')).toBe('https://api.example.com');
      });

      it('resolves numeric variables', () => {
        expect(resolvePath(context, 'variables.maxRetries')).toBe(3);
      });

      it('returns undefined for non-existent variables', () => {
        expect(resolvePath(context, 'variables.nonExistent')).toBeUndefined();
      });
    });

    describe('short-form variables (form field convenience)', () => {
      it('resolves short-form paths from trigger.payload.data', () => {
        expect(resolvePath(context, 'fullName')).toBe('Jane Smith');
        expect(resolvePath(context, 'email')).toBe('jane@example.com');
        expect(resolvePath(context, 'rating')).toBe(5);
      });

      it('returns undefined for non-existent short-form paths', () => {
        expect(resolvePath(context, 'nonExistentField')).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('handles null context values', () => {
        const contextWithNull = createContext({
          nodes: {
            node1: { value: null },
          },
        });
        expect(resolvePath(contextWithNull, 'nodes.node1.value')).toBeNull();
        expect(resolvePath(contextWithNull, 'nodes.node1.value.nested')).toBeUndefined();
      });

      it('handles empty string path parts', () => {
        expect(resolvePath(context, 'nodes..formTrigger')).toBeUndefined();
      });

      it('handles numeric values in path', () => {
        expect(resolvePath(context, 'nodes.formTrigger.data.age')).toBe(30);
      });
    });
  });

  // ============================================
  // substituteString
  // ============================================

  describe('substituteString', () => {
    const context = createContext();

    describe('full replacement', () => {
      it('returns resolved value when entire string is a template', () => {
        expect(substituteString('{{nodes.formTrigger.data.name}}', context)).toBe('John Doe');
      });

      it('returns object when template resolves to object', () => {
        const result = substituteString('{{nodes.formTrigger.data.preferences}}', context);
        expect(result).toEqual({ newsletter: true, theme: 'dark' });
      });

      it('returns array when template resolves to array', () => {
        const result = substituteString('{{nodes.transform.items}}', context);
        expect(result).toEqual([1, 2, 3]);
      });

      it('returns number when template resolves to number', () => {
        expect(substituteString('{{nodes.formTrigger.data.age}}', context)).toBe(30);
      });

      it('returns boolean when template resolves to boolean', () => {
        expect(substituteString('{{nodes.formTrigger.data.preferences.newsletter}}', context)).toBe(
          true
        );
      });

      it('keeps original template when variable not found', () => {
        expect(substituteString('{{nonExistent}}', context)).toBe('{{nonExistent}}');
      });

      it('handles whitespace in template', () => {
        expect(substituteString('{{  nodes.formTrigger.data.name  }}', context)).toBe('John Doe');
      });
    });

    describe('partial replacement', () => {
      it('substitutes variables within text', () => {
        expect(substituteString('Hello {{nodes.formTrigger.data.name}}!', context)).toBe(
          'Hello John Doe!'
        );
      });

      it('substitutes multiple variables', () => {
        const template =
          '{{nodes.formTrigger.data.name}} ({{nodes.formTrigger.data.email}})';
        expect(substituteString(template, context)).toBe('John Doe (john@example.com)');
      });

      it('converts objects to JSON in partial replacement', () => {
        const template = 'Preferences: {{nodes.formTrigger.data.preferences}}';
        expect(substituteString(template, context)).toBe(
          'Preferences: {"newsletter":true,"theme":"dark"}'
        );
      });

      it('keeps unresolved templates in partial replacement', () => {
        const template = 'Hello {{nonExistent}}, your name is {{nodes.formTrigger.data.name}}';
        expect(substituteString(template, context)).toBe('Hello {{nonExistent}}, your name is John Doe');
      });

      it('handles null values in partial replacement', () => {
        const contextWithNull = createContext({
          nodes: {
            test: { value: null },
          },
        });
        expect(substituteString('Value: {{nodes.test.value}}', contextWithNull)).toBe(
          'Value: {{nodes.test.value}}'
        );
      });
    });

    describe('short-form variables', () => {
      it('substitutes short-form variables from trigger data', () => {
        expect(substituteString('Hello {{fullName}}!', context)).toBe('Hello Jane Smith!');
      });

      it('substitutes mixed long and short form', () => {
        const template = '{{fullName}} submitted via {{trigger.type}}';
        expect(substituteString(template, context)).toBe(
          'Jane Smith submitted via form-submission'
        );
      });
    });
  });

  // ============================================
  // substituteVariables
  // ============================================

  describe('substituteVariables', () => {
    const context = createContext();

    describe('primitive values', () => {
      it('returns null as-is', () => {
        expect(substituteVariables(null, context)).toBeNull();
      });

      it('returns undefined as-is', () => {
        expect(substituteVariables(undefined, context)).toBeUndefined();
      });

      it('returns numbers as-is', () => {
        expect(substituteVariables(42, context)).toBe(42);
        expect(substituteVariables(3.14, context)).toBe(3.14);
      });

      it('returns booleans as-is', () => {
        expect(substituteVariables(true, context)).toBe(true);
        expect(substituteVariables(false, context)).toBe(false);
      });

      it('returns strings without templates as-is', () => {
        expect(substituteVariables('Hello World', context)).toBe('Hello World');
      });
    });

    describe('string substitution', () => {
      it('substitutes template variables in strings', () => {
        expect(substituteVariables('Hello {{nodes.formTrigger.data.name}}', context)).toBe(
          'Hello John Doe'
        );
      });
    });

    describe('array substitution', () => {
      it('substitutes variables in array elements', () => {
        const input = ['{{nodes.formTrigger.data.name}}', 'static', '{{variables.apiKey}}'];
        const result = substituteVariables(input, context);
        expect(result).toEqual(['John Doe', 'static', 'secret-key-123']);
      });

      it('handles nested arrays', () => {
        const input = [['{{nodes.formTrigger.data.name}}'], ['{{variables.apiKey}}']];
        const result = substituteVariables(input, context);
        expect(result).toEqual([['John Doe'], ['secret-key-123']]);
      });

      it('handles mixed types in arrays', () => {
        const input = ['{{nodes.formTrigger.data.name}}', 42, true, { key: '{{variables.apiKey}}' }];
        const result = substituteVariables(input, context);
        expect(result).toEqual(['John Doe', 42, true, { key: 'secret-key-123' }]);
      });
    });

    describe('object substitution', () => {
      it('substitutes variables in object values', () => {
        const input = {
          to: '{{nodes.formTrigger.data.email}}',
          subject: 'Hello {{nodes.formTrigger.data.name}}',
          retries: '{{variables.maxRetries}}',
        };
        const result = substituteVariables(input, context);
        expect(result).toEqual({
          to: 'john@example.com',
          subject: 'Hello John Doe',
          retries: 3, // Numeric value preserved through full replacement
        });
      });

      it('handles nested objects', () => {
        const input = {
          recipient: {
            name: '{{nodes.formTrigger.data.name}}',
            contact: {
              email: '{{nodes.formTrigger.data.email}}',
            },
          },
        };
        const result = substituteVariables(input, context);
        expect(result).toEqual({
          recipient: {
            name: 'John Doe',
            contact: {
              email: 'john@example.com',
            },
          },
        });
      });

      it('preserves non-template values', () => {
        const input = {
          static: 'value',
          number: 42,
          bool: true,
          dynamic: '{{nodes.formTrigger.data.name}}',
        };
        const result = substituteVariables(input, context);
        expect(result).toEqual({
          static: 'value',
          number: 42,
          bool: true,
          dynamic: 'John Doe',
        });
      });
    });

    describe('complex configurations', () => {
      it('handles email node config', () => {
        const emailConfig = {
          to: '{{nodes.formTrigger.data.email}}',
          subject: 'Welcome {{nodes.formTrigger.data.name}}!',
          body: 'Hi {{nodes.formTrigger.data.name}},\n\nThank you for signing up!',
          headers: {
            'X-Custom': '{{variables.apiKey}}',
          },
        };
        const result = substituteVariables(emailConfig, context);
        expect(result).toEqual({
          to: 'john@example.com',
          subject: 'Welcome John Doe!',
          body: 'Hi John Doe,\n\nThank you for signing up!',
          headers: {
            'X-Custom': 'secret-key-123',
          },
        });
      });

      it('handles HTTP node config', () => {
        const httpConfig = {
          url: '{{variables.baseUrl}}/users/{{nodes.formTrigger.data.email}}',
          method: 'POST',
          body: '{{nodes.formTrigger.data}}',
          headers: {
            Authorization: 'Bearer {{variables.apiKey}}',
            'Content-Type': 'application/json',
          },
        };
        const result = substituteVariables(httpConfig, context);
        expect(result).toEqual({
          url: 'https://api.example.com/users/john@example.com',
          method: 'POST',
          body: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            preferences: { newsletter: true, theme: 'dark' },
          },
          headers: {
            Authorization: 'Bearer secret-key-123',
            'Content-Type': 'application/json',
          },
        });
      });
    });
  });

  // ============================================
  // buildSubstitutionContext
  // ============================================

  describe('buildSubstitutionContext', () => {
    it('builds context from execution state', () => {
      const nodeOutputs = {
        node1: { result: 'value1' },
        node2: { result: 'value2' },
      };
      const trigger = {
        type: 'form-submission',
        payload: { formId: 'form-123' },
      };
      const variables = {
        key: 'value',
      };

      const context = buildSubstitutionContext(nodeOutputs, trigger, variables);

      expect(context).toEqual({
        nodes: nodeOutputs,
        trigger,
        variables,
      });
    });

    it('handles empty inputs', () => {
      const context = buildSubstitutionContext({}, { type: 'manual' }, {});

      expect(context).toEqual({
        nodes: {},
        trigger: { type: 'manual' },
        variables: {},
      });
    });
  });

  // ============================================
  // Real-world Scenarios
  // ============================================

  describe('Real-world Scenarios', () => {
    it('handles form submission to email workflow', () => {
      const context = createContext({
        nodes: {
          formTrigger: {
            data: {
              name: 'Alice Johnson',
              email: 'alice@company.com',
              department: 'Engineering',
              message: 'Please help with onboarding',
            },
          },
        },
        trigger: {
          type: 'form-submission',
          payload: {
            formId: 'onboarding-request',
            data: {
              name: 'Alice Johnson',
              email: 'alice@company.com',
              department: 'Engineering',
              message: 'Please help with onboarding',
            },
          },
        },
        variables: {
          hrEmail: 'hr@company.com',
          companyName: 'Acme Corp',
        },
      });

      const emailConfig = {
        to: '{{variables.hrEmail}}',
        subject: 'New Onboarding Request from {{nodes.formTrigger.data.name}}',
        body: `
New onboarding request submitted:

Name: {{nodes.formTrigger.data.name}}
Email: {{nodes.formTrigger.data.email}}
Department: {{nodes.formTrigger.data.department}}

Message:
{{nodes.formTrigger.data.message}}

---
{{variables.companyName}} HR System
        `.trim(),
      };

      const result = substituteVariables(emailConfig, context);

      expect(result).toEqual({
        to: 'hr@company.com',
        subject: 'New Onboarding Request from Alice Johnson',
        body: `
New onboarding request submitted:

Name: Alice Johnson
Email: alice@company.com
Department: Engineering

Message:
Please help with onboarding

---
Acme Corp HR System
        `.trim(),
      });
    });

    it('handles conditional workflow with multiple data sources', () => {
      const context = createContext({
        nodes: {
          formTrigger: {
            data: {
              amount: 5000,
              currency: 'USD',
            },
          },
          exchangeRate: {
            rate: 0.92,
            targetCurrency: 'EUR',
          },
        },
        trigger: {
          type: 'form-submission',
          payload: {},
        },
        variables: {
          threshold: 1000,
        },
      });

      const notificationConfig = {
        message:
          'Payment of {{nodes.formTrigger.data.amount}} {{nodes.formTrigger.data.currency}} ' +
          '({{nodes.exchangeRate.rate}} {{nodes.exchangeRate.targetCurrency}}) processed.',
        highValue: '{{variables.threshold}}',
      };

      const result = substituteVariables(notificationConfig, context);

      expect(result).toEqual({
        message: 'Payment of 5000 USD (0.92 EUR) processed.',
        highValue: 1000,
      });
    });
  });
});
