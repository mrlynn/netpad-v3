// Help system types

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: HelpContent[];
  relatedTopics?: string[];
  keywords?: string[];
  /**
   * If true, this help topic is only visible to platform admins.
   * Used for admin-specific documentation like AI Analytics, User Management, etc.
   */
  adminOnly?: boolean;
}

export interface HelpContent {
  type: 'text' | 'heading' | 'list' | 'code' | 'tip' | 'warning' | 'example';
  content: string | string[];
}

// Pre-defined help topic IDs for type safety
export type HelpTopicId =
  | 'getting-started'
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
  | 'search-forms'
  | 'smart-dropdowns'
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
  | 'api-keys-management'
  | 'workflow-variables'
  | 'workflow-nodes'
  // Trigger nodes
  | 'node-form-trigger'
  | 'node-webhook-trigger'
  | 'node-schedule-trigger'
  | 'node-manual-trigger'
  // Logic nodes
  | 'node-conditional'
  | 'node-switch'
  | 'node-delay'
  | 'node-loop'
  // Integration nodes
  | 'node-http-request'
  | 'node-mongodb-query'
  | 'node-mongodb-write'
  | 'node-google-sheets'
  | 'node-atlas-cluster'
  | 'node-atlas-data-api'
  // Action nodes
  | 'node-email-send'
  | 'node-notification'
  // Data nodes
  | 'node-transform'
  | 'node-filter'
  | 'node-merge'
  // AI nodes
  | 'node-ai-prompt'
  | 'node-ai-classify'
  | 'node-ai-extract'
  | 'node-ai-embed'
  | 'node-vector-search'
  | 'node-semantic-search'
  // Custom nodes
  | 'node-code'
  | 'node-html-output'
  | 'employee-onboarding'
  | 'mcp-server'
  | 'netpad-forms-package'
  | 'netpad-workflows-package'
  // New features
  | 'conversational-forms'
  | 'conversational-templates'
  | 'knowledge-guided-forms'
  | 'rag-document-management'
  | 'projects-management'
  | 'deployment-modes'
  | 'deployment-vercel'
  | 'self-hosted-rag'
  | 'organizations'
  | 'connection-vault'
  | 'template-gallery'
  | 'applications'
  | 'application-releases'
  | 'application-contracts'
  | 'marketplace'
  | 'npm-packages'
  // Admin-only topics
  | 'admin-dashboard'
  | 'admin-user-management'
  | 'admin-waitlist'
  | 'admin-ai-analytics'
  | 'admin-marketplace-review'
  // Open Core / Operations topics
  | 'open-core-architecture'
  | 'extension-system'
  | 'admin-extension-management'
  // Form Reactions
  | 'form-reactions'
  | 'node-field-event-trigger'
  | 'node-form-field-update'
  | 'reactions-api'
  | 'use-form-reactions-hook';
