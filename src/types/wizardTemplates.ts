/**
 * Wizard Template System
 *
 * Pre-built wizard configurations that users can select to quickly
 * scaffold common multi-step workflows like employee onboarding,
 * customer intake, application processes, etc.
 */

import { FormPage, FormConfiguration, FieldConfig, MultiPageConfig } from './form';

/**
 * Template category for organization
 */
export type WizardTemplateCategory =
  | 'hr'           // Human Resources (onboarding, offboarding, reviews)
  | 'sales'        // Sales processes (lead qualification, quotes)
  | 'support'      // Customer support (ticket intake, feedback)
  | 'operations'   // Operations (checklists, audits)
  | 'finance'      // Finance (expense reports, approvals)
  | 'general';     // General purpose

/**
 * Template complexity indicator
 */
export type WizardComplexity = 'simple' | 'moderate' | 'advanced';

/**
 * A wizard template definition
 */
export interface WizardTemplate {
  id: string;
  name: string;
  description: string;
  category: WizardTemplateCategory;
  complexity: WizardComplexity;
  estimatedTime: string;           // e.g., "5-10 minutes"
  icon?: string;                   // Icon identifier
  previewImageUrl?: string;        // Screenshot/preview

  // The actual template content
  pages: FormPage[];
  fieldConfigs: FieldConfig[];
  multiPageConfig: Omit<MultiPageConfig, 'pages'>;

  // Customization hints
  customizableFields?: string[];   // Field paths that users commonly customize
  requiredIntegrations?: string[]; // e.g., ['email', 'storage']

  // Metadata
  version: string;
  author?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Template instance - a wizard created from a template
 */
export interface WizardInstance {
  id: string;
  templateId: string;
  templateVersion: string;
  name: string;
  description?: string;

  // The form configuration (copy from template, customized)
  formConfig: FormConfiguration;

  // Deployment settings
  slug?: string;
  isPublished: boolean;
  publishedAt?: string;

  // Standalone app settings
  standaloneApp?: {
    enabled: boolean;
    subdomain?: string;            // e.g., "onboarding" for onboarding.netpad.app
    customDomain?: string;         // e.g., "onboarding.acme.com"
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      companyName?: string;
    };
  };

  // Organization
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category metadata for UI display
 */
export const WIZARD_CATEGORY_META: Record<WizardTemplateCategory, {
  label: string;
  description: string;
  icon: string;
  color: string;
}> = {
  hr: {
    label: 'Human Resources',
    description: 'Employee onboarding, offboarding, performance reviews',
    icon: 'People',
    color: '#9C27B0',
  },
  sales: {
    label: 'Sales',
    description: 'Lead qualification, quotes, proposals',
    icon: 'TrendingUp',
    color: '#2196F3',
  },
  support: {
    label: 'Customer Support',
    description: 'Ticket intake, feedback collection, NPS surveys',
    icon: 'Support',
    color: '#FF9800',
  },
  operations: {
    label: 'Operations',
    description: 'Checklists, audits, inspections',
    icon: 'Checklist',
    color: '#4CAF50',
  },
  finance: {
    label: 'Finance',
    description: 'Expense reports, purchase approvals, invoicing',
    icon: 'AttachMoney',
    color: '#00BCD4',
  },
  general: {
    label: 'General',
    description: 'Multi-purpose wizard templates',
    icon: 'AutoAwesome',
    color: '#607D8B',
  },
};

/**
 * Complexity metadata
 */
export const WIZARD_COMPLEXITY_META: Record<WizardComplexity, {
  label: string;
  description: string;
  pageRange: string;
}> = {
  simple: {
    label: 'Simple',
    description: '2-3 steps, basic fields',
    pageRange: '2-3 pages',
  },
  moderate: {
    label: 'Moderate',
    description: '4-6 steps, conditional logic',
    pageRange: '4-6 pages',
  },
  advanced: {
    label: 'Advanced',
    description: '7+ steps, complex workflows',
    pageRange: '7+ pages',
  },
};
