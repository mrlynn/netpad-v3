// Help system types

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: HelpContent[];
  relatedTopics?: string[];
  keywords?: string[];
}

export interface HelpContent {
  type: 'text' | 'heading' | 'list' | 'code' | 'tip' | 'warning' | 'example';
  content: string | string[];
}

// Pre-defined help topic IDs for type safety
export type HelpTopicId =
  | 'form-builder'
  | 'field-configuration'
  | 'conditional-logic'
  | 'lookup-fields'
  | 'computed-fields'
  | 'repeater-fields'
  | 'form-variables'
  | 'form-versioning'
  | 'form-lifecycle'
  | 'multi-page-forms'
  | 'form-library'
  | 'document-preview'
  | 'form-publishing'
  | 'pipeline-builder'
  | 'aggregation-stages'
  | 'mongodb-connection'
  | 'form-analytics'
  | 'response-management'
  | 'response-export'
  | 'field-analytics'
  | 'erd-viewer'
  | 'code-generation'
  | 'ai-pipeline-generation'
  | 'results-viewer'
  | 'document-editing'
  | 'sample-documents'
  | 'include-in-document'
  | 'api-overview'
  | 'api-playground'
  | 'api-authentication'
  | 'api-endpoints'
  | 'api-rate-limiting'
  | 'api-keys-management';
