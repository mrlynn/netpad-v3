/**
 * Transform Node Handler Tests
 *
 * Tests for the transform node handler that reshapes data using
 * expressions, mappings, or templates.
 */

import { handler } from '@/lib/workflow/nodeHandlers/transform';
import { ExtendedNodeContext } from '@/lib/workflow/nodeHandlers/types';

describe('Transform Node Handler', () => {
  // ============================================
  // Test Helpers
  // ============================================

  const createContext = (
    resolvedConfig: Record<string, unknown>,
    inputs: Record<string, unknown> = {},
    nodeOutputs: Record<string, Record<string, unknown>> = {},
    trigger: { type: string; payload?: Record<string, unknown> } = { type: 'manual' },
    variables: Record<string, unknown> = {}
  ): ExtendedNodeContext => ({
    workflowId: 'test-workflow',
    executionId: 'test-execution',
    nodeId: 'test-transform',
    orgId: 'test-org',
    inputs,
    config: {},
    resolvedConfig,
    variables,
    nodeOutputs,
    trigger,
    log: jest.fn().mockResolvedValue(undefined),
    getConnection: jest.fn(),
    getEmailCredentials: jest.fn(),
  });

  // ============================================
  // Template Mode
  // ============================================

  describe('template mode', () => {
    it('passes through resolved template values', async () => {
      const context = createContext({
        mode: 'template',
        template: {
          name: 'John Doe',
          email: 'john@example.com',
          formattedName: 'Hello, John Doe!',
        },
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        formattedName: 'Hello, John Doe!',
      });
    });

    it('uses resolved config when no template specified', async () => {
      const context = createContext({
        mode: 'template',
        customField: 'value1',
        anotherField: 123,
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.customField).toBe('value1');
      expect(result.data.anotherField).toBe(123);
    });

    it('excludes internal config keys from output', async () => {
      const context = createContext({
        mode: 'template',
        template: {
          output: 'test',
        },
        expression: 'should be removed',
        mappings: [],
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('mode');
      expect(result.data).not.toHaveProperty('expression');
      expect(result.data).not.toHaveProperty('mappings');
      expect(result.data).not.toHaveProperty('template');
    });

    it('defaults to template mode when mode not specified', async () => {
      const context = createContext({
        outputField: 'value',
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.outputField).toBe('value');
    });
  });

  // ============================================
  // Expression Mode
  // ============================================

  describe('expression mode', () => {
    it('evaluates simple expressions', async () => {
      const context = createContext(
        {
          mode: 'expression',
          expression: '({ result: inputs.default.a + inputs.default.b })',
        },
        { default: { a: 5, b: 3 } }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.result).toBe(8);
    });

    it('accesses node outputs', async () => {
      const context = createContext(
        {
          mode: 'expression',
          expression: '({ userName: nodes.formTrigger.data.name.toUpperCase() })',
        },
        {},
        {
          formTrigger: {
            data: { name: 'John Doe' },
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.userName).toBe('JOHN DOE');
    });

    it('accesses trigger data', async () => {
      const context = createContext(
        {
          mode: 'expression',
          expression: '({ formId: trigger.payload.formId })',
        },
        {},
        {},
        {
          type: 'form-submission',
          payload: { formId: 'form-123' },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.formId).toBe('form-123');
    });

    it('accesses workflow variables', async () => {
      const context = createContext(
        {
          mode: 'expression',
          expression: '({ apiEndpoint: variables.baseUrl + "/api/users" })',
        },
        {},
        {},
        { type: 'manual' },
        { baseUrl: 'https://api.example.com' }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.apiEndpoint).toBe('https://api.example.com/api/users');
    });

    it('has access to utility functions', async () => {
      const context = createContext({
        mode: 'expression',
        expression: '({ pi: Math.PI, json: JSON.stringify({ a: 1 }), now: Date.now() > 0 })',
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.pi).toBe(Math.PI);
      expect(result.data.json).toBe('{"a":1}');
      expect(result.data.now).toBe(true);
    });

    it('wraps non-object results in value key', async () => {
      const context = createContext({
        mode: 'expression',
        expression: '42',
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 42 });
    });

    it('wraps array results in value key', async () => {
      const context = createContext({
        mode: 'expression',
        expression: '[1, 2, 3]',
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: [1, 2, 3] });
    });

    it('returns error for missing expression', async () => {
      const context = createContext({
        mode: 'expression',
      });

      const result = await handler(context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('OPERATION_FAILED');
      expect(result.error?.message).toContain('expression is required');
    });

    it('returns error for invalid expression', async () => {
      const context = createContext({
        mode: 'expression',
        expression: 'this is not valid javascript {{',
      });

      const result = await handler(context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('OPERATION_FAILED');
    });

    describe('complex transformations', () => {
      it('filters and maps array data', async () => {
        const context = createContext(
          {
            mode: 'expression',
            expression: `({
              activeUsers: inputs.default.users
                .filter(u => u.active)
                .map(u => ({ name: u.name, email: u.email }))
            })`,
          },
          {
            default: {
              users: [
                { name: 'John', email: 'john@test.com', active: true },
                { name: 'Jane', email: 'jane@test.com', active: false },
                { name: 'Bob', email: 'bob@test.com', active: true },
              ],
            },
          }
        );

        const result = await handler(context);

        expect(result.success).toBe(true);
        expect(result.data.activeUsers).toHaveLength(2);
        expect(result.data.activeUsers[0]).toEqual({ name: 'John', email: 'john@test.com' });
        expect(result.data.activeUsers[1]).toEqual({ name: 'Bob', email: 'bob@test.com' });
      });

      it('aggregates numeric data', async () => {
        const context = createContext(
          {
            mode: 'expression',
            expression: `({
              total: inputs.default.items.reduce((sum, item) => sum + item.price, 0),
              count: inputs.default.items.length,
              average: inputs.default.items.reduce((sum, item) => sum + item.price, 0) / inputs.default.items.length
            })`,
          },
          {
            default: {
              items: [
                { name: 'A', price: 10 },
                { name: 'B', price: 20 },
                { name: 'C', price: 30 },
              ],
            },
          }
        );

        const result = await handler(context);

        expect(result.success).toBe(true);
        expect(result.data.total).toBe(60);
        expect(result.data.count).toBe(3);
        expect(result.data.average).toBe(20);
      });

      it('merges data from multiple sources', async () => {
        const context = createContext(
          {
            mode: 'expression',
            expression: `({
              user: {
                ...nodes.userLookup.user,
                formData: trigger.payload.data
              }
            })`,
          },
          {},
          {
            userLookup: {
              user: {
                id: 'user-123',
                name: 'John',
                role: 'admin',
              },
            },
          },
          {
            type: 'form-submission',
            payload: {
              data: {
                message: 'Hello',
                rating: 5,
              },
            },
          }
        );

        const result = await handler(context);

        expect(result.success).toBe(true);
        expect(result.data.user).toEqual({
          id: 'user-123',
          name: 'John',
          role: 'admin',
          formData: {
            message: 'Hello',
            rating: 5,
          },
        });
      });
    });
  });

  // ============================================
  // Mapping Mode
  // ============================================

  describe('mapping mode', () => {
    it('maps fields from source to target', async () => {
      const context = createContext(
        {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.default.firstName', target: 'name.first' },
            { source: 'inputs.default.lastName', target: 'name.last' },
            { source: 'inputs.default.email', target: 'contact.email' },
          ],
        },
        {
          default: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: {
          first: 'John',
          last: 'Doe',
        },
        contact: {
          email: 'john@example.com',
        },
      });
    });

    it('maps from node outputs', async () => {
      const context = createContext(
        {
          mode: 'mapping',
          mappings: [
            { source: 'nodes.formTrigger.data.name', target: 'userName' },
            { source: 'nodes.formTrigger.data.email', target: 'userEmail' },
          ],
        },
        {},
        {
          formTrigger: {
            data: {
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        userName: 'John Doe',
        userEmail: 'john@example.com',
      });
    });

    it('maps from trigger data', async () => {
      const context = createContext(
        {
          mode: 'mapping',
          mappings: [
            { source: 'trigger.payload.formId', target: 'sourceForm' },
            { source: 'trigger.payload.data.rating', target: 'rating' },
          ],
        },
        {},
        {},
        {
          type: 'form-submission',
          payload: {
            formId: 'form-123',
            data: {
              rating: 5,
            },
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        sourceForm: 'form-123',
        rating: 5,
      });
    });

    it('applies inline transforms to mapped values', async () => {
      const context = createContext(
        {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.default.name', target: 'upperName', transform: 'value.toUpperCase()' },
            { source: 'inputs.default.price', target: 'formattedPrice', transform: '"$" + value.toFixed(2)' },
            { source: 'inputs.default.items', target: 'itemCount', transform: 'value.length' },
          ],
        },
        {
          default: {
            name: 'John',
            price: 19.5,
            items: ['a', 'b', 'c'],
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        upperName: 'JOHN',
        formattedPrice: '$19.50',
        itemCount: 3,
      });
    });

    it('handles undefined source values', async () => {
      const context = createContext(
        {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.default.existing', target: 'found' },
            { source: 'inputs.default.nonexistent', target: 'notFound' },
          ],
        },
        {
          default: {
            existing: 'value',
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.found).toBe('value');
      expect(result.data.notFound).toBeUndefined();
    });

    it('continues on transform expression error', async () => {
      // Mock console.warn to suppress expected warning
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const context = createContext(
        {
          mode: 'mapping',
          mappings: [
            { source: 'inputs.default.value', target: 'processed', transform: 'value.nonExistent.method()' },
            { source: 'inputs.default.other', target: 'other' },
          ],
        },
        {
          default: {
            value: 'test',
            other: 'works',
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.processed).toBe('test'); // Falls back to original value
      expect(result.data.other).toBe('works');

      warnSpy.mockRestore();
    });

    it('returns empty object when no mappings provided', async () => {
      const context = createContext({
        mode: 'mapping',
        mappings: [],
      });

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  describe('error handling', () => {
    it('returns error for invalid mode', async () => {
      const context = createContext({
        mode: 'invalid-mode',
      });

      const result = await handler(context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CONFIG');
      expect(result.error?.message).toContain('Invalid transform mode');
    });

    it('logs transform operations', async () => {
      const context = createContext({
        mode: 'template',
        template: { output: 'test' },
      });

      await handler(context);

      expect(context.log).toHaveBeenCalledWith(
        'info',
        'Starting transform operation',
        expect.any(Object)
      );
    });
  });

  // ============================================
  // Real-world Scenarios
  // ============================================

  describe('real-world scenarios', () => {
    it('transforms form submission for CRM integration', async () => {
      const context = createContext(
        {
          mode: 'mapping',
          mappings: [
            { source: 'trigger.payload.data.fullName', target: 'contact.name' },
            { source: 'trigger.payload.data.email', target: 'contact.email' },
            { source: 'trigger.payload.data.company', target: 'contact.company' },
            { source: 'trigger.payload.formId', target: 'metadata.sourceForm' },
            { source: 'trigger.type', target: 'metadata.leadSource' },
          ],
        },
        {},
        {},
        {
          type: 'form-submission',
          payload: {
            formId: 'contact-form',
            data: {
              fullName: 'John Doe',
              email: 'john@company.com',
              company: 'Acme Inc',
            },
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        contact: {
          name: 'John Doe',
          email: 'john@company.com',
          company: 'Acme Inc',
        },
        metadata: {
          sourceForm: 'contact-form',
          leadSource: 'form-submission',
        },
      });
    });

    it('transforms webhook payload for processing', async () => {
      const context = createContext(
        {
          mode: 'expression',
          expression: `({
            orderId: trigger.payload.order.id,
            items: trigger.payload.order.line_items.map(item => ({
              sku: item.sku,
              quantity: item.qty,
              total: item.price * item.qty
            })),
            grandTotal: trigger.payload.order.line_items.reduce((sum, item) => sum + (item.price * item.qty), 0),
            customerEmail: trigger.payload.customer.email
          })`,
        },
        {},
        {},
        {
          type: 'webhook',
          payload: {
            order: {
              id: 'order-12345',
              line_items: [
                { sku: 'SKU001', qty: 2, price: 10 },
                { sku: 'SKU002', qty: 1, price: 25 },
              ],
            },
            customer: {
              email: 'buyer@example.com',
            },
          },
        }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        orderId: 'order-12345',
        items: [
          { sku: 'SKU001', quantity: 2, total: 20 },
          { sku: 'SKU002', quantity: 1, total: 25 },
        ],
        grandTotal: 45,
        customerEmail: 'buyer@example.com',
      });
    });

    it('combines data from multiple workflow steps', async () => {
      const context = createContext(
        {
          mode: 'expression',
          expression: `({
            summary: {
              customer: nodes.lookupCustomer.customer,
              orderTotal: nodes.calculateTotal.total,
              discountApplied: nodes.applyDiscount.discountAmount,
              finalAmount: nodes.calculateTotal.total - nodes.applyDiscount.discountAmount,
              paymentStatus: variables.defaultPaymentStatus
            }
          })`,
        },
        {},
        {
          lookupCustomer: {
            customer: { id: 'cust-123', name: 'John', tier: 'gold' },
          },
          calculateTotal: {
            total: 100,
          },
          applyDiscount: {
            discountAmount: 15,
            discountCode: 'SAVE15',
          },
        },
        { type: 'manual' },
        { defaultPaymentStatus: 'pending' }
      );

      const result = await handler(context);

      expect(result.success).toBe(true);
      expect(result.data.summary).toEqual({
        customer: { id: 'cust-123', name: 'John', tier: 'gold' },
        orderTotal: 100,
        discountApplied: 15,
        finalAmount: 85,
        paymentStatus: 'pending',
      });
    });
  });
});
