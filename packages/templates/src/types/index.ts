/**
 * @netpad/templates - Type Exports
 *
 * All type definitions for templates, fields, themes, and conversational forms.
 */

// Field types
export type {
  ConditionOperator,
  FieldCondition,
  ConditionalLogic,
  LookupConfig,
  ComputedConfig,
  RepeaterItemField,
  RepeaterConfig,
  URLParamConfig,
  ArrayPattern,
  ArrayPatternConfig,
  LayoutFieldType,
  LayoutConfig,
  FormMode,
  FieldModeConfig,
  FieldWidth,
  FieldSource,
  FieldConfig,
  FieldValidation,
  // Encryption types (Queryable Encryption / CSFLE)
  EncryptionAlgorithm,
  EncryptedQueryType,
  DataSensitivityLevel,
  ComplianceFramework,
  FieldEncryptionConfig,
} from './field';

// Theme types
export type {
  FormHeader,
  FormTheme,
  ThemePreset,
} from './theme';

// Conversational types
export type {
  ConversationTopic,
  ConversationPersona,
  ExtractionSchema,
  ConversationLimits,
  ConversationalFormConfig,
} from './conversational';

// Template types
export type {
  FormTemplateCategory,
  TemplateCategoryMeta,
  TemplateFormType,
  TemplateComplexity,
  PageType,
  PageCallout,
  PageContent,
  SummaryPageConfig,
  CompletionAction,
  CompletionPageConfig,
  FormPage,
  MultiPageConfig,
  ActionSuccessConfig,
  ActionErrorConfig,
  SubmitConfig,
  DeleteConfig,
  FormViewAction,
  FormLifecycle,
  TemplateStats,
  EnhancedLongDescription,
  EnhancedUseCase,
  EnhancedCustomizationTip,
  EnhancedWorkflowPairing,
  EnhancedDeveloperNotes,
  EnhancedSEO,
  EnhancedTemplateContent,
  FormTemplate,
  TemplateListItem,
  TemplatesByCategory,
  TemplateFilters,
} from './template';

// Template constants and helpers
export {
  TEMPLATE_CATEGORIES,
  getCategoryMeta,
  getAllCategoryIds,
  formatComplexity,
  formatFormType,
  getComplexityColor,
} from './template';
