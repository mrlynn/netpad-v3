/**
 * IT Help Desk Ticket Search Form Configuration
 *
 * A search-focused form that enables IT staff to find, filter, and manage
 * support tickets submitted through the IT Support Request form.
 *
 * This demonstrates the search form type with:
 * - Smart dropdowns powered by distinct values from the database
 * - Search filters for common ticket attributes
 * - Results display with table layout
 * - Actions for viewing, editing, and managing tickets
 *
 * SMART DROPDOWN FEATURES:
 * - Dynamic options loaded from actual ticket data
 * - Count badges showing how many tickets match each filter
 * - Options sorted by frequency (most common first)
 * - Auto-refresh capability for real-time updates
 *
 * @example
 * ```tsx
 * import { FormRenderer } from '@netpad/forms';
 * import { itHelpdeskSearchFormConfig } from './templates/search-form';
 *
 * <FormRenderer config={itHelpdeskSearchFormConfig} mode="search" />
 * ```
 */

import type { FormConfiguration, SearchConfig } from '@netpad/forms';

/**
 * Search configuration for the IT Helpdesk tickets
 */
const searchConfig: SearchConfig = {
  enabled: true,
  fields: {
    // Text search fields with smart autocomplete
    email: {
      enabled: true,
      operators: ['contains', 'equals'],
      defaultOperator: 'contains',
      showInResults: true,
      // Smart autocomplete: show distinct email addresses
      optionsSource: {
        type: 'distinct',
        distinct: {
          showCounts: true,
          sortBy: 'count',
          sortDirection: 'desc',
          limit: 50,
        },
        refreshOnMount: true,
      },
      resultOrder: 3,
      placeholder: 'Search by email...',
    },
    subject: {
      enabled: true,
      operators: ['contains', 'startsWith', 'regex'],
      defaultOperator: 'contains',
      showInResults: true,
      resultOrder: 1,
      placeholder: 'Search ticket subjects...',
    },
    description: {
      enabled: true,
      operators: ['contains', 'regex'],
      defaultOperator: 'contains',
      showInResults: false,
      placeholder: 'Search in descriptions...',
    },
    // Category filters with SMART DROPDOWNS
    // These use optionsSource to dynamically fetch values from the database
    issueCategory: {
      enabled: true,
      operators: ['equals', 'in'],
      defaultOperator: 'equals',
      showInResults: true,
      resultOrder: 4,
      placeholder: 'Filter by category',
      // Smart dropdown: fetch distinct categories from actual tickets
      optionsSource: {
        type: 'distinct',
        distinct: {
          showCounts: true, // Show "Hardware (45)" format
          sortBy: 'count', // Most common categories first
          sortDirection: 'desc',
          limit: 20,
          // Map raw values to friendly labels
          labelMap: {
            hardware: 'Hardware',
            software: 'Software',
            network: 'Network / Connectivity',
            access: 'Access & Permissions',
            other: 'Other',
          },
        },
        refreshOnMount: true,
      },
    },
    urgencyLevel: {
      enabled: true,
      operators: ['equals', 'in'],
      defaultOperator: 'equals',
      showInResults: true,
      resultOrder: 5,
      placeholder: 'Filter by urgency',
      // Smart dropdown: fetch distinct urgency levels with counts
      optionsSource: {
        type: 'distinct',
        distinct: {
          showCounts: true,
          sortBy: 'count',
          sortDirection: 'desc',
          labelMap: {
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            critical: 'Critical',
          },
        },
        refreshOnMount: true,
      },
    },
    department: {
      enabled: true,
      operators: ['equals', 'in'],
      defaultOperator: 'equals',
      showInResults: true,
      resultOrder: 6,
      placeholder: 'Filter by department',
      // Smart dropdown: fetch distinct departments from actual tickets
      optionsSource: {
        type: 'distinct',
        distinct: {
          showCounts: true,
          sortBy: 'count',
          sortDirection: 'desc',
          labelMap: {
            engineering: 'Engineering',
            sales: 'Sales',
            marketing: 'Marketing',
            finance: 'Finance',
            hr: 'Human Resources',
            operations: 'Operations',
            executive: 'Executive',
          },
        },
        refreshOnMount: true,
      },
    },
    // Reporter name: use distinct to show autocomplete of known reporters
    fullName: {
      enabled: true,
      operators: ['contains', 'equals', 'startsWith'],
      defaultOperator: 'contains',
      showInResults: true,
      resultOrder: 2,
      placeholder: 'Search by reporter name...',
      // Smart autocomplete: show distinct reporter names
      optionsSource: {
        type: 'distinct',
        distinct: {
          showCounts: true, // Show how many tickets from this person
          sortBy: 'count',
          sortDirection: 'desc',
          limit: 50, // Top 50 reporters
        },
        refreshOnMount: true,
      },
    },
    // Date range searching on submission metadata
    '_formSubmission.submittedAt': {
      enabled: true,
      operators: ['greaterThan', 'lessThan', 'between'],
      defaultOperator: 'between',
      showInResults: true,
      resultOrder: 0,
      helpText: 'Filter tickets by submission date',
    },
  },
  results: {
    layout: 'table',
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    showPagination: true,
    allowView: true,
    allowEdit: true,
    allowDelete: false, // IT tickets should not be easily deleted
    allowExport: true,
    defaultSortField: '_formSubmission.submittedAt',
    defaultSortDirection: 'desc',
    allowSorting: true,
    allowSelection: true,
    allowBulkActions: true,
  },
  maxResults: 500,
};

/**
 * IT Ticket Search & Management Form
 *
 * A search-type form for IT staff to find and manage tickets.
 * Uses the same collection as the IT Support Request form.
 */
export const itHelpdeskSearchFormConfig: FormConfiguration = {
  name: 'IT Ticket Search',
  description:
    'Search, filter, and manage IT support tickets. Find tickets by reporter, category, urgency, or date range.',
  formType: 'search',
  searchConfig,
  fieldConfigs: [
    // =========================================
    // SEARCH FILTERS SECTION
    // =========================================
    {
      path: '_section_quick_filters',
      label: '',
      type: 'layout',
      included: true,
      required: false,
      layout: {
        type: 'section-header',
        title: 'Quick Filters',
        subtitle: 'Filter tickets by status, urgency, or category',
      },
    },
    {
      path: 'urgencyLevel',
      label: 'Urgency Level',
      type: 'dropdown',
      included: true,
      required: false,
      fieldWidth: 'third',
      placeholder: 'Any urgency',
      validation: {
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Critical', value: 'critical' },
        ],
        clearable: true,
      },
    },
    {
      path: 'issueCategory',
      label: 'Issue Category',
      type: 'dropdown',
      included: true,
      required: false,
      fieldWidth: 'third',
      placeholder: 'Any category',
      validation: {
        options: [
          { label: 'Hardware', value: 'hardware' },
          { label: 'Software', value: 'software' },
          { label: 'Network / Connectivity', value: 'network' },
          { label: 'Access & Permissions', value: 'access' },
          { label: 'Other', value: 'other' },
        ],
        clearable: true,
      },
    },
    {
      path: 'department',
      label: 'Department',
      type: 'dropdown',
      included: true,
      required: false,
      fieldWidth: 'third',
      placeholder: 'Any department',
      validation: {
        options: [
          { label: 'Engineering', value: 'engineering' },
          { label: 'Sales', value: 'sales' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'Finance', value: 'finance' },
          { label: 'Human Resources', value: 'hr' },
          { label: 'Operations', value: 'operations' },
          { label: 'Executive', value: 'executive' },
        ],
        clearable: true,
      },
    },

    // =========================================
    // TEXT SEARCH SECTION
    // =========================================
    {
      path: '_section_text_search',
      label: '',
      type: 'layout',
      included: true,
      required: false,
      layout: {
        type: 'section-header',
        title: 'Text Search',
        subtitle: 'Search by keyword in ticket content',
      },
    },
    {
      path: 'subject',
      label: 'Subject Contains',
      type: 'short_text',
      included: true,
      required: false,
      fieldWidth: 'half',
      placeholder: 'Search ticket subjects...',
      helpText: 'Partial matches are supported',
    },
    {
      path: 'description',
      label: 'Description Contains',
      type: 'short_text',
      included: true,
      required: false,
      fieldWidth: 'half',
      placeholder: 'Search in ticket descriptions...',
      helpText: 'Search for keywords in the detailed description',
    },

    // =========================================
    // REPORTER SEARCH SECTION
    // =========================================
    {
      path: '_section_reporter_search',
      label: '',
      type: 'layout',
      included: true,
      required: false,
      layout: {
        type: 'section-header',
        title: 'Reporter Details',
        subtitle: 'Find tickets by who submitted them',
      },
    },
    {
      path: 'fullName',
      label: 'Reporter Name',
      type: 'short_text',
      included: true,
      required: false,
      fieldWidth: 'half',
      placeholder: 'Search by name...',
    },
    {
      path: 'email',
      label: 'Reporter Email',
      type: 'short_text',
      included: true,
      required: false,
      fieldWidth: 'half',
      placeholder: 'Search by email...',
    },

    // =========================================
    // DATE RANGE SECTION
    // =========================================
    {
      path: '_section_date_range',
      label: '',
      type: 'layout',
      included: true,
      required: false,
      layout: {
        type: 'section-header',
        title: 'Date Range',
        subtitle: 'Filter tickets by submission date',
      },
    },
    {
      path: 'dateFrom',
      label: 'From Date',
      type: 'date',
      included: true,
      required: false,
      fieldWidth: 'half',
      helpText: 'Start of date range',
      // This maps to _formSubmission.submittedAt with greaterThan operator
    },
    {
      path: 'dateTo',
      label: 'To Date',
      type: 'date',
      included: true,
      required: false,
      fieldWidth: 'half',
      helpText: 'End of date range',
      // This maps to _formSubmission.submittedAt with lessThan operator
    },
  ],
  submitButtonText: 'Search Tickets',
  theme: {
    primaryColor: '#1976d2',
    spacing: 'comfortable',
    inputStyle: 'outlined',
    borderRadius: 8,
    mode: 'light',
  },
};

export default itHelpdeskSearchFormConfig;
