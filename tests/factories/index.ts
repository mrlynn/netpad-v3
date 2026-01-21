/**
 * Test Factories
 *
 * Central export for all test data factories used throughout the test suite.
 *
 * Usage:
 * ```typescript
 * import { FieldFactory, FormFactory, WorkflowFactory, TestData } from '../factories';
 *
 * const emailField = FieldFactory.email({ required: true });
 * const contactForm = FormFactory.contactForm();
 * const workflow = WorkflowFactory.formToEmail('form-123', 'team@example.com');
 * const validEmail = TestData.valid.email;
 * ```
 */

export { FieldFactory, TestData } from './fieldFactory';
export { FormFactory, SubmissionFactory } from './formFactory';
export { WorkflowFactory, NodeFactory, EdgeFactory, ExecutionContextFactory } from './workflowFactory';
