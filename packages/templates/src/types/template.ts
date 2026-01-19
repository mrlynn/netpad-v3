/**
 * Form Template Types
 *
 * Core types for defining form templates.
 */

import type { FieldConfig, ConditionalLogic } from './field';
import type { FormTheme } from './theme';
import type { ConversationalFormConfig } from './conversational';

// ============================================
// Template Categories
// ============================================

export type FormTemplateCategory =
  | 'business-sales'
  | 'hr-recruitment'
  | 'customer-service'
  | 'marketing-research'
  | 'education-training'
  | 'healthcare-wellness'
  | 'real-estate'
  | 'legal-compliance'
  | 'nonprofit-community'
  | 'events-hospitality'
  | 'technology-it'
  | 'finance-accounting'
  | 'sports-fitness'
  | 'travel-tourism'
  | 'government-public';

export interface TemplateCategoryMeta {
  id: FormTemplateCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategoryMeta[] = [
  {
    id: 'business-sales',
    name: 'Business & Sales',
    description: 'Lead capture, vendor registration, and sales inquiries',
    icon: 'Briefcase',
    color: 'blue',
  },
  {
    id: 'hr-recruitment',
    name: 'HR & Recruitment',
    description: 'Job applications, onboarding, and employee management',
    icon: 'Users',
    color: 'purple',
  },
  {
    id: 'customer-service',
    name: 'Customer Service',
    description: 'Support tickets, feedback, and satisfaction surveys',
    icon: 'Headphones',
    color: 'green',
  },
  {
    id: 'marketing-research',
    name: 'Marketing & Research',
    description: 'Event registration, market research, and surveys',
    icon: 'BarChart3',
    color: 'pink',
  },
  {
    id: 'education-training',
    name: 'Education & Training',
    description: 'Course enrollment, student applications, and assessments',
    icon: 'GraduationCap',
    color: 'indigo',
  },
  {
    id: 'healthcare-wellness',
    name: 'Healthcare & Wellness',
    description: 'Patient intake, appointments, and health assessments',
    icon: 'Heart',
    color: 'red',
  },
  {
    id: 'real-estate',
    name: 'Real Estate & Property',
    description: 'Property inquiries, tenant applications, and maintenance',
    icon: 'Home',
    color: 'amber',
  },
  {
    id: 'legal-compliance',
    name: 'Legal & Compliance',
    description: 'NDAs, contract reviews, and compliance audits',
    icon: 'Scale',
    color: 'slate',
  },
  {
    id: 'nonprofit-community',
    name: 'Nonprofit & Community',
    description: 'Donations, volunteer applications, and grants',
    icon: 'HeartHandshake',
    color: 'teal',
  },
  {
    id: 'events-hospitality',
    name: 'Events & Hospitality',
    description: 'Event registration, RSVPs, and venue booking',
    icon: 'CalendarDays',
    color: 'orange',
  },
  {
    id: 'technology-it',
    name: 'Technology & IT',
    description: 'Bug reports, feature requests, and IT service tickets',
    icon: 'Monitor',
    color: 'cyan',
  },
  {
    id: 'finance-accounting',
    name: 'Finance & Accounting',
    description: 'Expense reports, invoices, and credit applications',
    icon: 'DollarSign',
    color: 'emerald',
  },
  {
    id: 'sports-fitness',
    name: 'Sports & Fitness',
    description: 'Gym memberships, team registration, and waivers',
    icon: 'Dumbbell',
    color: 'lime',
  },
  {
    id: 'travel-tourism',
    name: 'Travel & Tourism',
    description: 'Travel inquiries, bookings, and tour packages',
    icon: 'Plane',
    color: 'sky',
  },
  {
    id: 'government-public',
    name: 'Government & Public Sector',
    description: 'Public records, permits, and citizen services',
    icon: 'Building2',
    color: 'stone',
  },
];

// ============================================
// Template Form Type & Complexity
// ============================================

export type TemplateFormType = 'traditional' | 'conversational' | 'hybrid';
export type TemplateComplexity = 'simple' | 'moderate' | 'advanced';

// ============================================
// Multi-Page Configuration
// ============================================

export type PageType = 'form' | 'info' | 'summary' | 'complete';

export interface PageCallout {
  type: 'info' | 'tip' | 'warning' | 'success';
  title?: string;
  text: string;
  icon?: string;
}

export interface PageContent {
  body?: string;
  contentType?: 'text' | 'markdown' | 'html';
  imageUrl?: string;
  imagePosition?: 'top' | 'left' | 'right' | 'background';
  imageAlt?: string;
  videoUrl?: string;
  videoAspectRatio?: '16:9' | '4:3' | '1:1';
  callouts?: PageCallout[];
  alignment?: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface SummaryPageConfig {
  showAllFields?: boolean;
  showFields?: string[];
  groupByPage?: boolean;
  allowEdit?: boolean;
  editMode?: 'jump-to-page' | 'inline';
  confirmLabel?: string;
  excludeEmptyFields?: boolean;
}

export interface CompletionAction {
  id: string;
  label: string;
  action: 'navigate' | 'close' | 'restart' | 'custom';
  url?: string;
  variant?: 'primary' | 'secondary' | 'text';
  icon?: string;
}

export interface CompletionPageConfig {
  heading?: string;
  message?: string;
  icon?: 'checkmark' | 'celebration' | 'thumbsUp' | 'custom' | 'none';
  customIconUrl?: string;
  showConfetti?: boolean;
  actions?: CompletionAction[];
  autoRedirect?: {
    url: string;
    delay: number;
    showCountdown?: boolean;
  };
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  pageType?: PageType;
  fields: string[];
  order: number;
  showInNavigation?: boolean;
  conditionalLogic?: ConditionalLogic;
  nextLabel?: string;
  prevLabel?: string;
  skipValidation?: boolean;
  content?: PageContent;
  summaryConfig?: SummaryPageConfig;
  completionConfig?: CompletionPageConfig;
}

export interface MultiPageConfig {
  enabled: boolean;
  pages: FormPage[];
  showStepIndicator?: boolean;
  stepIndicatorStyle?: 'dots' | 'numbers' | 'progress' | 'tabs';
  allowJumpToPage?: boolean;
  validateOnPageChange?: boolean;
  showPageTitles?: boolean;
  submitButtonLabel?: string;
  showReviewPage?: boolean;
}

// ============================================
// Form Lifecycle
// ============================================

export interface ActionSuccessConfig {
  action: 'navigate' | 'toast' | 'refresh' | 'close' | 'callback';
  target?: string;
  message?: string;
}

export interface ActionErrorConfig {
  action: 'toast' | 'inline' | 'modal';
  message?: string;
}

export interface SubmitConfig {
  mode: 'insert' | 'update' | 'upsert' | 'custom';
  collection?: string;
  transforms?: {
    omitFields?: string[];
    renameFields?: Record<string, string>;
    addFields?: Record<string, any>;
  };
  webhook?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
  };
  success: ActionSuccessConfig;
  error: ActionErrorConfig;
}

export interface DeleteConfig {
  enabled: boolean;
  confirm: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  };
  softDelete?: {
    enabled: boolean;
    field: string;
    value: any;
  };
  success: ActionSuccessConfig;
  error: ActionErrorConfig;
}

export interface FormViewAction {
  id: string;
  label: string;
  icon?: string;
  action: 'edit' | 'clone' | 'delete' | 'navigate' | 'custom';
  target?: string;
  condition?: string;
}

export interface FormLifecycle {
  create?: {
    defaults?: Record<string, any>;
    onSubmit: SubmitConfig;
  };
  edit?: {
    onSubmit: SubmitConfig;
    onDelete?: DeleteConfig;
    immutableFields?: string[];
  };
  view?: {
    actions?: FormViewAction[];
  };
  clone?: {
    clearFields?: string[];
    onSubmit: SubmitConfig;
  };
}

// ============================================
// Template Statistics
// ============================================

export interface TemplateStats {
  usageCount: number;
  averageRating?: number;
  ratingCount?: number;
  trending?: boolean;
}

// ============================================
// Enhanced Template Content
// ============================================

export interface EnhancedLongDescription {
  opening: string;
  solution: string;
  outcome: string;
}

export interface EnhancedUseCase {
  title: string;
  icon: string;
  industry: string;
  scenario: string;
  painPoint: string;
  keyFields: string[];
  exampleOrganization: string;
}

export interface EnhancedCustomizationTip {
  title: string;
  description: string;
  fieldSuggestion?: string;
  difficulty: 'easy' | 'medium' | 'advanced';
}

export interface EnhancedWorkflowPairing {
  workflowType: string;
  title: string;
  description: string;
  trigger: string;
  benefits: string[];
}

export interface EnhancedDeveloperNotes {
  schemaHighlights: string[];
  integrationHints: string[];
  mongoDBConsiderations: string[];
}

export interface EnhancedSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogDescription: string;
}

export interface EnhancedTemplateContent {
  headline?: string;
  subheadline?: string;
  longDescription?: EnhancedLongDescription;
  useCases?: EnhancedUseCase[];
  customizationTips?: EnhancedCustomizationTip[];
  workflowPairings?: EnhancedWorkflowPairing[];
  developerNotes?: EnhancedDeveloperNotes;
  seo?: EnhancedSEO;
  socialProofAngles?: string[];
}

// ============================================
// Form Template
// ============================================

export interface FormTemplate {
  /** Unique template identifier */
  id: string;
  /** Human-readable template name */
  name: string;
  /** Short description for cards */
  shortDescription: string;
  /** Detailed description */
  fullDescription: string;
  /** Category for organization */
  category: FormTemplateCategory;
  /** Form type this template supports */
  formType: TemplateFormType;
  /** Complexity indicator */
  complexity: TemplateComplexity;
  /** Estimated completion time in minutes */
  estimatedTime: number;
  /** Icon identifier */
  icon: string;
  /** Tags for search and filtering */
  tags: string[];
  /** Preview image URL */
  previewImage?: string;
  /** Whether this is a featured template */
  isFeatured: boolean;
  /** Display order within category */
  displayOrder: number;
  /** Use cases / when to use this template */
  useCases: string[];
  /** Key features / what's included */
  features: string[];
  /** Field configurations */
  fieldConfigs: FieldConfig[];
  /** Multi-page configuration */
  multiPage?: MultiPageConfig;
  /** Form lifecycle settings */
  lifecycle?: FormLifecycle;
  /** Theme/styling */
  theme: FormTheme;
  /** Conversational form config */
  conversationalConfig?: ConversationalFormConfig;
  /** Template version */
  version: string;
  /** When template was created */
  createdAt: string;
  /** When template was last updated */
  updatedAt: string;
  /** Author */
  author: 'netpad' | string;
  /** Usage statistics */
  stats?: TemplateStats;
  /** Enhanced content for rich detail pages */
  enhanced?: EnhancedTemplateContent;
}

// ============================================
// Template API Types
// ============================================

export interface TemplateListItem {
  id: string;
  name: string;
  shortDescription: string;
  category: FormTemplateCategory;
  formType: TemplateFormType;
  complexity: TemplateComplexity;
  estimatedTime: number;
  icon: string;
  tags: string[];
  previewImage?: string;
  isFeatured: boolean;
  usageCount?: number;
}

export interface TemplatesByCategory {
  category: TemplateCategoryMeta;
  templates: TemplateListItem[];
}

export interface TemplateFilters {
  category?: FormTemplateCategory;
  formType?: TemplateFormType;
  complexity?: TemplateComplexity;
  search?: string;
  tags?: string[];
  featured?: boolean;
}

// ============================================
// Helper Functions
// ============================================

export function getCategoryMeta(categoryId: FormTemplateCategory): TemplateCategoryMeta | undefined {
  return TEMPLATE_CATEGORIES.find(c => c.id === categoryId);
}

export function getAllCategoryIds(): FormTemplateCategory[] {
  return TEMPLATE_CATEGORIES.map(c => c.id);
}

export function formatComplexity(complexity: TemplateComplexity): string {
  const labels: Record<TemplateComplexity, string> = {
    simple: 'Simple',
    moderate: 'Moderate',
    advanced: 'Advanced',
  };
  return labels[complexity];
}

export function formatFormType(formType: TemplateFormType): string {
  const labels: Record<TemplateFormType, string> = {
    traditional: 'Traditional Form',
    conversational: 'AI Conversational',
    hybrid: 'Hybrid (Both)',
  };
  return labels[formType];
}

export function getComplexityColor(complexity: TemplateComplexity): string {
  const colors: Record<TemplateComplexity, string> = {
    simple: 'text-green-600 bg-green-50',
    moderate: 'text-amber-600 bg-amber-50',
    advanced: 'text-red-600 bg-red-50',
  };
  return colors[complexity];
}
