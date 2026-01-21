/**
 * Workflow Executor Tests
 *
 * Tests for the workflow execution logic including:
 * - Topological sorting of workflow nodes
 * - Input gathering from upstream nodes
 */

// Mock MongoDB before importing executor
jest.mock('mongodb', () => ({
  ObjectId: jest.fn((id) => id || 'mock-id'),
  MongoClient: jest.fn(),
}));

// Mock the db module to avoid MongoDB connections
jest.mock('@/lib/workflow/db', () => ({
  getWorkflowById: jest.fn(),
  updateExecutionStatus: jest.fn(),
  addExecutionLog: jest.fn(),
  completeJob: jest.fn(),
  failJob: jest.fn(),
  updateWorkflowStats: jest.fn(),
  updateVersionStats: jest.fn(),
  getExecutionById: jest.fn(),
  getActiveWorkflowVersion: jest.fn(),
}));

// Mock billing module
jest.mock('@/lib/platform/billing', () => ({
  updateWorkflowExecutionResult: jest.fn(),
}));

// Mock connection vault
jest.mock('@/lib/platform/connectionVault', () => ({
  getDecryptedConnectionString: jest.fn(),
}));

// Mock integration credentials
jest.mock('@/lib/platform/integrationCredentials', () => ({
  getEmailCredentials: jest.fn(),
}));

// Mock variable substitution
jest.mock('@/lib/workflow/variableSubstitution', () => ({
  substituteVariables: jest.fn((config) => config),
  buildSubstitutionContext: jest.fn(() => ({})),
}));

// Mock node handlers
jest.mock('@/lib/workflow/nodeHandlers', () => ({
  getHandler: jest.fn(),
  NodeErrorCodes: {
    HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',
  },
}));

import { topologicalSort, gatherInputs } from '@/lib/workflow/executor';
import { WorkflowNode, WorkflowEdge } from '@/types/workflow';

describe('Workflow Executor', () => {
  // ============================================
  // Test Helpers
  // ============================================

  const createNode = (id: string, type: string = 'action', overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
    id,
    type,
    label: `Node ${id}`,
    config: {},
    position: { x: 0, y: 0 },
    enabled: true,
    ...overrides,
  });

  const createEdge = (source: string, target: string, overrides: Partial<WorkflowEdge> = {}): WorkflowEdge => ({
    id: `${source}-${target}`,
    source,
    target,
    ...overrides,
  });

  // ============================================
  // topologicalSort
  // ============================================

  describe('topologicalSort', () => {
    describe('linear workflows', () => {
      it('sorts a single node', () => {
        const nodes = [createNode('A')];
        const edges: WorkflowEdge[] = [];

        const result = topologicalSort(nodes, edges);

        expect(result.map((n) => n.id)).toEqual(['A']);
      });

      it('sorts two connected nodes', () => {
        const nodes = [createNode('B'), createNode('A')];
        const edges = [createEdge('A', 'B')];

        const result = topologicalSort(nodes, edges);

        expect(result.map((n) => n.id)).toEqual(['A', 'B']);
      });

      it('sorts a linear chain of nodes', () => {
        const nodes = [createNode('D'), createNode('B'), createNode('A'), createNode('C')];
        const edges = [createEdge('A', 'B'), createEdge('B', 'C'), createEdge('C', 'D')];

        const result = topologicalSort(nodes, edges);

        expect(result.map((n) => n.id)).toEqual(['A', 'B', 'C', 'D']);
      });

      it('maintains order for disconnected nodes', () => {
        const nodes = [createNode('A'), createNode('B'), createNode('C')];
        const edges: WorkflowEdge[] = [];

        const result = topologicalSort(nodes, edges);

        // All nodes should be present (order may vary since no edges)
        expect(result).toHaveLength(3);
        expect(result.map((n) => n.id)).toContain('A');
        expect(result.map((n) => n.id)).toContain('B');
        expect(result.map((n) => n.id)).toContain('C');
      });
    });

    describe('branching workflows', () => {
      it('handles a node with multiple outputs', () => {
        // A -> B, A -> C
        const nodes = [createNode('A'), createNode('B'), createNode('C')];
        const edges = [createEdge('A', 'B'), createEdge('A', 'C')];

        const result = topologicalSort(nodes, edges);

        // A should come first, B and C after
        expect(result[0].id).toBe('A');
        expect(result.map((n) => n.id)).toContain('B');
        expect(result.map((n) => n.id)).toContain('C');
      });

      it('handles a node with multiple inputs', () => {
        // A -> C, B -> C
        const nodes = [createNode('A'), createNode('B'), createNode('C')];
        const edges = [createEdge('A', 'C'), createEdge('B', 'C')];

        const result = topologicalSort(nodes, edges);

        // C should come last
        const cIndex = result.findIndex((n) => n.id === 'C');
        const aIndex = result.findIndex((n) => n.id === 'A');
        const bIndex = result.findIndex((n) => n.id === 'B');

        expect(cIndex).toBeGreaterThan(aIndex);
        expect(cIndex).toBeGreaterThan(bIndex);
      });

      it('handles diamond pattern', () => {
        // A -> B, A -> C, B -> D, C -> D
        const nodes = [createNode('A'), createNode('B'), createNode('C'), createNode('D')];
        const edges = [
          createEdge('A', 'B'),
          createEdge('A', 'C'),
          createEdge('B', 'D'),
          createEdge('C', 'D'),
        ];

        const result = topologicalSort(nodes, edges);

        const indices = Object.fromEntries(result.map((n, i) => [n.id, i]));

        // A must come first
        expect(indices['A']).toBe(0);
        // B and C must come after A
        expect(indices['B']).toBeGreaterThan(indices['A']);
        expect(indices['C']).toBeGreaterThan(indices['A']);
        // D must come last
        expect(indices['D']).toBeGreaterThan(indices['B']);
        expect(indices['D']).toBeGreaterThan(indices['C']);
      });
    });

    describe('complex workflows', () => {
      it('handles a realistic form workflow', () => {
        // FormTrigger -> Validate -> Transform -> [Send Email, Store DB]
        const nodes = [
          createNode('formTrigger', 'form-trigger'),
          createNode('validate', 'condition'),
          createNode('transform', 'transform'),
          createNode('sendEmail', 'email-send'),
          createNode('storeDB', 'mongodb-insert'),
        ];
        const edges = [
          createEdge('formTrigger', 'validate'),
          createEdge('validate', 'transform'),
          createEdge('transform', 'sendEmail'),
          createEdge('transform', 'storeDB'),
        ];

        const result = topologicalSort(nodes, edges);

        const indices = Object.fromEntries(result.map((n, i) => [n.id, i]));

        expect(indices['formTrigger']).toBe(0);
        expect(indices['validate']).toBe(1);
        expect(indices['transform']).toBe(2);
        // sendEmail and storeDB can be in either order, but both after transform
        expect(indices['sendEmail']).toBeGreaterThan(indices['transform']);
        expect(indices['storeDB']).toBeGreaterThan(indices['transform']);
      });

      it('handles parallel branches that merge', () => {
        // A -> B -> D
        // A -> C -> D
        // D -> E
        const nodes = [
          createNode('A'),
          createNode('B'),
          createNode('C'),
          createNode('D'),
          createNode('E'),
        ];
        const edges = [
          createEdge('A', 'B'),
          createEdge('A', 'C'),
          createEdge('B', 'D'),
          createEdge('C', 'D'),
          createEdge('D', 'E'),
        ];

        const result = topologicalSort(nodes, edges);

        const indices = Object.fromEntries(result.map((n, i) => [n.id, i]));

        expect(indices['A']).toBe(0);
        expect(indices['D']).toBeGreaterThan(indices['B']);
        expect(indices['D']).toBeGreaterThan(indices['C']);
        expect(indices['E']).toBeGreaterThan(indices['D']);
      });

      it('handles multiple independent chains', () => {
        // Chain 1: A -> B
        // Chain 2: C -> D
        const nodes = [createNode('A'), createNode('B'), createNode('C'), createNode('D')];
        const edges = [createEdge('A', 'B'), createEdge('C', 'D')];

        const result = topologicalSort(nodes, edges);

        const indices = Object.fromEntries(result.map((n, i) => [n.id, i]));

        // A before B, C before D
        expect(indices['B']).toBeGreaterThan(indices['A']);
        expect(indices['D']).toBeGreaterThan(indices['C']);
      });
    });

    describe('edge cases', () => {
      it('handles empty nodes array', () => {
        const result = topologicalSort([], []);
        expect(result).toEqual([]);
      });

      it('handles cycle detection gracefully', () => {
        // A -> B -> C -> A (cycle)
        const nodes = [createNode('A'), createNode('B'), createNode('C')];
        const edges = [createEdge('A', 'B'), createEdge('B', 'C'), createEdge('C', 'A')];

        // Should not throw, but may not include all nodes
        const result = topologicalSort(nodes, edges);

        // Result will be incomplete due to cycle
        expect(result.length).toBeLessThan(nodes.length);
      });

      it('handles self-loop gracefully', () => {
        const nodes = [createNode('A')];
        const edges = [createEdge('A', 'A')];

        const result = topologicalSort(nodes, edges);

        // Self-loop creates a cycle, node won't be included
        expect(result).toEqual([]);
      });

      it('ignores edges with non-existent nodes', () => {
        const nodes = [createNode('A'), createNode('B')];
        const edges = [createEdge('A', 'B'), createEdge('X', 'Y')]; // X, Y don't exist

        const result = topologicalSort(nodes, edges);

        expect(result.map((n) => n.id)).toEqual(['A', 'B']);
      });
    });
  });

  // ============================================
  // gatherInputs
  // ============================================

  describe('gatherInputs', () => {
    describe('basic input gathering', () => {
      it('returns empty object when no incoming edges', () => {
        const edges: WorkflowEdge[] = [];
        const nodeOutputs = {};

        const result = gatherInputs('nodeA', edges, nodeOutputs);

        expect(result).toEqual({});
      });

      it('gathers input from a single upstream node', () => {
        const edges = [createEdge('nodeA', 'nodeB')];
        const nodeOutputs = {
          nodeA: { data: 'test', value: 123 },
        };

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({
          default: { data: 'test', value: 123 },
        });
      });

      it('gathers inputs from multiple upstream nodes (overwrites with same targetHandle)', () => {
        // When multiple edges target the same handle, later edges overwrite earlier ones
        const edges = [
          createEdge('nodeA', 'nodeC'),
          createEdge('nodeB', 'nodeC'),
        ];
        const nodeOutputs = {
          nodeA: { resultA: 'valueA' },
          nodeB: { resultB: 'valueB' },
        };

        const result = gatherInputs('nodeC', edges, nodeOutputs);

        // Second edge overwrites first since both use default handle
        expect(result).toEqual({
          default: { resultB: 'valueB' },
        });
      });

      it('uses targetHandle as input key', () => {
        const edges = [
          createEdge('nodeA', 'nodeC', { targetHandle: 'input1' }),
          createEdge('nodeB', 'nodeC', { targetHandle: 'input2' }),
        ];
        const nodeOutputs = {
          nodeA: { result: 'fromA' },
          nodeB: { result: 'fromB' },
        };

        const result = gatherInputs('nodeC', edges, nodeOutputs);

        expect(result).toEqual({
          input1: { result: 'fromA' },
          input2: { result: 'fromB' },
        });
      });
    });

    describe('edge mappings', () => {
      it('applies edge mapping to specific fields', () => {
        const edges = [
          createEdge('nodeA', 'nodeB', {
            mapping: [{ sourceField: 'data.name', targetField: 'userName' }],
          }),
        ];
        const nodeOutputs = {
          nodeA: { data: { name: 'John', age: 30 } },
        };

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({
          userName: 'John',
        });
      });

      it('applies multiple mappings from single edge', () => {
        const edges = [
          createEdge('nodeA', 'nodeB', {
            mapping: [
              { sourceField: 'data.name', targetField: 'userName' },
              { sourceField: 'data.email', targetField: 'userEmail' },
            ],
          }),
        ];
        const nodeOutputs = {
          nodeA: { data: { name: 'John', email: 'john@example.com' } },
        };

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({
          userName: 'John',
          userEmail: 'john@example.com',
        });
      });

      it('creates nested target paths', () => {
        const edges = [
          createEdge('nodeA', 'nodeB', {
            mapping: [{ sourceField: 'value', targetField: 'nested.deep.value' }],
          }),
        ];
        const nodeOutputs = {
          nodeA: { value: 'test' },
        };

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({
          nested: { deep: { value: 'test' } },
        });
      });

      it('handles undefined source fields gracefully', () => {
        const edges = [
          createEdge('nodeA', 'nodeB', {
            mapping: [{ sourceField: 'nonExistent.path', targetField: 'output' }],
          }),
        ];
        const nodeOutputs = {
          nodeA: { data: 'test' },
        };

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({
          output: undefined,
        });
      });
    });

    describe('edge cases', () => {
      it('ignores edges from nodes without output', () => {
        const edges = [createEdge('nodeA', 'nodeB')];
        const nodeOutputs = {}; // nodeA has no output yet

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({});
      });

      it('ignores outgoing edges', () => {
        const edges = [
          createEdge('nodeA', 'nodeB'),
          createEdge('nodeB', 'nodeC'),
        ];
        const nodeOutputs = {
          nodeA: { data: 'A' },
          nodeB: { data: 'B' },
        };

        // Getting inputs for nodeB - should only see nodeA's output
        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({
          default: { data: 'A' },
        });
      });

      it('handles complex nested data', () => {
        const edges = [createEdge('nodeA', 'nodeB')];
        const nodeOutputs = {
          nodeA: {
            user: {
              profile: {
                name: 'John',
                settings: {
                  notifications: true,
                  preferences: ['a', 'b', 'c'],
                },
              },
            },
            metadata: {
              timestamp: 1234567890,
            },
          },
        };

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result.default).toEqual(nodeOutputs.nodeA);
      });

      it('handles array values in mappings', () => {
        const edges = [
          createEdge('nodeA', 'nodeB', {
            mapping: [{ sourceField: 'items', targetField: 'inputItems' }],
          }),
        ];
        const nodeOutputs = {
          nodeA: { items: [1, 2, 3] },
        };

        const result = gatherInputs('nodeB', edges, nodeOutputs);

        expect(result).toEqual({
          inputItems: [1, 2, 3],
        });
      });
    });

    describe('real workflow scenarios', () => {
      it('gathers form trigger output for validation node', () => {
        const edges = [createEdge('formTrigger', 'validate')];
        const nodeOutputs = {
          formTrigger: {
            data: {
              name: 'John',
              email: 'john@example.com',
              amount: 100,
            },
            formId: 'form-123',
            submissionId: 'sub-456',
          },
        };

        const result = gatherInputs('validate', edges, nodeOutputs);

        expect(result).toEqual({
          default: nodeOutputs.formTrigger,
        });
      });

      it('gathers conditional branch outputs for merge node', () => {
        const edges = [
          createEdge('condition', 'merge', { targetHandle: 'true' }),
          createEdge('transform', 'merge', { targetHandle: 'data' }),
        ];
        const nodeOutputs = {
          condition: { passed: true, reason: 'valid' },
          transform: { result: 'transformed' },
        };

        const result = gatherInputs('merge', edges, nodeOutputs);

        expect(result).toEqual({
          true: { passed: true, reason: 'valid' },
          data: { result: 'transformed' },
        });
      });

      it('maps specific fields for email node', () => {
        const edges = [
          createEdge('formTrigger', 'sendEmail', {
            mapping: [
              { sourceField: 'data.email', targetField: 'to' },
              { sourceField: 'data.name', targetField: 'recipientName' },
            ],
          }),
        ];
        const nodeOutputs = {
          formTrigger: {
            data: {
              name: 'John Doe',
              email: 'john@example.com',
              message: 'Hello',
            },
          },
        };

        const result = gatherInputs('sendEmail', edges, nodeOutputs);

        expect(result).toEqual({
          to: 'john@example.com',
          recipientName: 'John Doe',
        });
      });
    });
  });
});
