/**
 * Test helpers for workflow node handler tests
 */
import { ExtendedNodeContext } from '@/lib/workflow/nodeHandlers/types';

/**
 * Create a mock ExtendedNodeContext for testing
 */
export function createMockContext(
  overrides: Partial<ExtendedNodeContext> = {}
): ExtendedNodeContext {
  return {
    nodeId: 'test-node-1',
    executionId: 'exec-1',
    workflowId: 'wf-1',
    inputs: {},
    nodeOutputs: {},
    variables: {},
    resolvedConfig: {},
    trigger: { type: 'manual' },
    log: jest.fn().mockResolvedValue(undefined),
    getConnection: jest.fn().mockResolvedValue(null),
    getEmailCredentials: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as ExtendedNodeContext;
}
