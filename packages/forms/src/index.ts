/**
 * @netpad/forms
 *
 * Render NetPad forms in your React applications.
 * Build sophisticated multi-page wizards with conditional logic,
 * computed fields, and MongoDB integration.
 *
 * @example
 * ```tsx
 * import { FormRenderer, createNetPadClient } from '@netpad/forms';
 *
 * // Using with NetPad API
 * const client = createNetPadClient({
 *   baseUrl: 'https://your-netpad-instance.com',
 *   apiKey: 'np_live_xxx',
 * });
 *
 * const form = await client.getForm('employee-onboarding');
 *
 * <FormRenderer
 *   config={form}
 *   onSubmit={(data) => client.submitForm('employee-onboarding', data)}
 * />
 * ```
 */

// Components
export { FormRenderer } from './components/FormRenderer';

// API Client
export { NetPadClient, NetPadError, createNetPadClient } from './client';
export type { NetPadClientConfig } from './client';

// Types
export type {
  // Core types
  FormConfiguration,
  FormRendererProps,
  FieldConfig,
  FormMode,
  FieldWidth,

  // Multi-page
  FormPage,
  MultiPageConfig,
  PageType,
  PageCallout,

  // Theme
  FormTheme,
  FormHeader,

  // Conditional logic
  ConditionalLogic,
  FieldCondition,
  ConditionOperator,

  // Field features
  LookupConfig,
  ComputedConfig,
  RepeaterConfig,
  LayoutConfig,
  LayoutFieldType,

  // Submissions
  FormSubmissionMetadata,
  FormSubmissionResult,

  // API types
  NetPadFormSchema,
  NetPadSubmissionPayload,
  NetPadSubmissionResponse,
} from './types';

// Utilities
export {
  // Conditional logic
  evaluateConditionalLogic,
  evaluateCondition,
  getOperatorLabel,
  operatorRequiresValue,

  // Data manipulation
  getNestedValue,
  setNestedValue,

  // Formulas
  evaluateFormula,
  validateFormula,
  extractFieldReferences,

  // Validation
  validateField,
  validateForm,
} from './utils';
