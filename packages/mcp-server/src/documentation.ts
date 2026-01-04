// Embedded documentation for the MCP server

export const DOCUMENTATION = {
  readme: `# @netpad/forms

A powerful React form renderer library that makes building complex forms simple.

## Features

- **28+ Field Types**: Text, email, phone, numbers, dates, dropdowns, checkboxes, ratings, and more
- **Multi-Page Wizards**: Create step-by-step forms with progress tracking
- **Conditional Logic**: Show/hide fields based on other field values
- **Computed Fields**: Formulas that automatically calculate values
- **Nested Data**: Support for nested object structures using dot notation
- **Validation**: Built-in and custom validation rules
- **Theming**: Customizable colors, spacing, and styles
- **TypeScript**: Full type definitions included

## Installation

\`\`\`bash
npm install @netpad/forms
\`\`\`

**Peer Dependencies:**
- React 18+
- Material-UI 5.15+
- Emotion 11+

## Quick Start

\`\`\`tsx
import { FormRenderer } from '@netpad/forms';
import type { FormConfiguration } from '@netpad/forms';

const config: FormConfiguration = {
  name: 'Contact Us',
  fieldConfigs: [
    { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true },
    { path: 'message', label: 'Message', type: 'long_text', included: true },
  ],
};

function ContactForm() {
  const handleSubmit = async (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
  };

  return <FormRenderer config={config} onSubmit={handleSubmit} />;
}
\`\`\`

## API Reference

### FormRenderer Props

| Prop | Type | Description |
|------|------|-------------|
| config | FormConfiguration | Form configuration object (required) |
| initialData | Record<string, unknown> | Pre-fill form with data |
| mode | 'create' \\| 'edit' \\| 'view' | Form mode |
| onSubmit | (data) => Promise<void> \\| void | Submit handler |
| onChange | (data) => void | Change handler |
| onError | (errors) => void | Error handler |
| submitButtonText | string | Custom submit button text |
| showSubmitButton | boolean | Show/hide submit button |
| loading | boolean | Show loading state |
| disabled | boolean | Disable all fields |
| theme | FormTheme | Theme customization |
| onLookup | (config, search) => Promise<options[]> | Lookup handler for dynamic options |

### FormConfiguration

\`\`\`typescript
interface FormConfiguration {
  name: string;                    // Form name
  description?: string;            // Form description
  fieldConfigs: FieldConfig[];     // Array of field configurations
  multiPage?: MultiPageConfig;     // Multi-page wizard settings
  theme?: FormTheme;               // Theme customization
  submitButtonText?: string;       // Submit button text
  successMessage?: string;         // Success message after submission
  redirectUrl?: string;            // Redirect URL after submission
}
\`\`\`

### FieldConfig

\`\`\`typescript
interface FieldConfig {
  path: string;                    // Unique identifier (supports dot notation)
  label: string;                   // Display label
  type: string;                    // Field type
  included: boolean;               // Whether to include the field
  required?: boolean;              // Required field
  disabled?: boolean;              // Disable field
  readOnly?: boolean;              // Read-only field
  placeholder?: string;            // Placeholder text
  helpText?: string;               // Help text below field
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  defaultValue?: unknown;          // Default value
  options?: Array<{ label: string; value: string | number }>;
  validation?: ValidationConfig;   // Validation rules
  conditionalLogic?: ConditionalLogic; // Show/hide logic
  computed?: ComputedConfig;       // Computed field formula
  layout?: LayoutConfig;           // Layout field settings
}
\`\`\`
`,

  architecture: `# @netpad/forms Architecture

## Overview

The library is organized around a central FormRenderer component that:
1. Manages form state (data, errors, submission)
2. Evaluates conditional logic for field visibility
3. Calculates computed field values
4. Validates fields and form
5. Renders fields using Material-UI components

## Component Architecture

\`\`\`
FormRenderer
├── State Management
│   ├── formData (current values)
│   ├── errors (validation errors)
│   ├── currentPage (for multi-page)
│   └── isSubmitting
├── Field Processing
│   ├── Filter by included
│   ├── Filter by conditional logic
│   ├── Filter by current page
│   └── Evaluate computed values
└── Field Rendering
    ├── Text fields (TextField)
    ├── Selection fields (Select, Radio, Checkbox)
    ├── Date/Time fields (DatePicker, TimePicker)
    ├── Rating fields (Rating, NPS)
    └── Layout fields (Header, Description, Divider)
\`\`\`

## Utility Functions

### Conditional Logic
- \`evaluateConditionalLogic(logic, formData)\` - Evaluate field visibility
- \`evaluateCondition(condition, formData)\` - Evaluate single condition
- \`getNestedValue(obj, path)\` - Get value at nested path
- \`setNestedValue(obj, path, value)\` - Set value at nested path

### Formulas
- \`evaluateFormula(formula, context)\` - Evaluate formula expression
- \`validateFormula(formula)\` - Validate formula syntax
- \`extractFieldReferences(formula)\` - Extract referenced fields

### Validation
- \`validateField(field, value, formData)\` - Validate single field
- \`validateForm(fields, formData)\` - Validate all fields

## Extension Points

### Adding New Field Types
1. Add type to field type constants
2. Add rendering logic in FormRenderer
3. Export any new components

### Adding New Operators
1. Add operator to OPERATORS constant
2. Implement in evaluateCondition function

### Adding New Formula Functions
1. Add function to formula context
2. Document in FORMULA_FUNCTIONS constant
`,

  apiClient: `# NetPad API Client

The library includes a client for interacting with the NetPad platform.

## Creating a Client

\`\`\`typescript
import { createNetPadClient } from '@netpad/forms';

const client = createNetPadClient({
  baseUrl: 'https://your-netpad-instance.com',
  apiKey: 'np_live_xxxxx', // or np_test_xxxxx
  organizationId: 'optional-org-id',
});
\`\`\`

## Methods

### getForm(formIdOrSlug)
Fetch a form configuration from the platform.

\`\`\`typescript
const form = await client.getForm('contact-us');
// Returns: FormConfiguration
\`\`\`

### submitForm(formIdOrSlug, data, metadata?)
Submit form data.

\`\`\`typescript
const result = await client.submitForm('contact-us', {
  name: 'John Doe',
  email: 'john@example.com',
  message: 'Hello!',
});
// Returns: { submissionId: string, createdAt: Date }
\`\`\`

### listSubmissions(formIdOrSlug, options?)
List form submissions.

\`\`\`typescript
const submissions = await client.listSubmissions('contact-us', {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
\`\`\`

### getSubmission(formIdOrSlug, submissionId)
Get a single submission.

\`\`\`typescript
const submission = await client.getSubmission('contact-us', 'sub_123');
\`\`\`

### healthCheck()
Check API health.

\`\`\`typescript
const status = await client.healthCheck();
// Returns: { status: 'ok', version: '1.0.0' }
\`\`\`

## Error Handling

\`\`\`typescript
import { NetPadError } from '@netpad/forms';

try {
  await client.submitForm('form-id', data);
} catch (error) {
  if (error instanceof NetPadError) {
    console.error('API Error:', error.message, error.statusCode);
  }
}
\`\`\`
`,
};

export const QUICK_START_GUIDE = `# Quick Start Guide

## 1. Installation

\`\`\`bash
npm install @netpad/forms @mui/material @mui/icons-material @emotion/react @emotion/styled
\`\`\`

## 2. Create Your First Form

\`\`\`tsx
import { FormRenderer } from '@netpad/forms';
import type { FormConfiguration } from '@netpad/forms';

// Define your form configuration
const contactFormConfig: FormConfiguration = {
  name: 'Contact Form',
  fieldConfigs: [
    {
      path: 'name',
      label: 'Your Name',
      type: 'short_text',
      included: true,
      required: true,
      placeholder: 'Enter your full name',
    },
    {
      path: 'email',
      label: 'Email Address',
      type: 'email',
      included: true,
      required: true,
      placeholder: 'you@example.com',
    },
    {
      path: 'subject',
      label: 'Subject',
      type: 'dropdown',
      included: true,
      options: [
        { label: 'General Inquiry', value: 'general' },
        { label: 'Support', value: 'support' },
        { label: 'Feedback', value: 'feedback' },
      ],
    },
    {
      path: 'message',
      label: 'Message',
      type: 'long_text',
      included: true,
      required: true,
      placeholder: 'How can we help you?',
      validation: {
        minLength: 10,
        errorMessage: 'Please enter at least 10 characters',
      },
    },
  ],
  submitButtonText: 'Send Message',
  successMessage: 'Thank you! We will get back to you soon.',
};

// Create your form component
export function ContactPage() {
  const handleSubmit = async (data: Record<string, unknown>) => {
    // Send data to your API
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <FormRenderer
        config={contactFormConfig}
        onSubmit={handleSubmit}
        mode="create"
      />
    </div>
  );
}
\`\`\`

## 3. Add Conditional Logic

Show fields based on other field values:

\`\`\`tsx
{
  path: 'phoneNumber',
  label: 'Phone Number',
  type: 'phone',
  included: true,
  conditionalLogic: {
    action: 'show',
    logicType: 'any',
    conditions: [
      { field: 'subject', operator: 'equals', value: 'support' },
    ],
  },
}
\`\`\`

## 4. Create a Multi-Page Form

\`\`\`tsx
const wizardConfig: FormConfiguration = {
  name: 'Registration',
  fieldConfigs: [
    // Personal info fields
    { path: 'firstName', label: 'First Name', type: 'short_text', included: true, required: true },
    { path: 'lastName', label: 'Last Name', type: 'short_text', included: true, required: true },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true },
    // Account fields
    { path: 'username', label: 'Username', type: 'short_text', included: true, required: true },
    { path: 'password', label: 'Password', type: 'short_text', included: true, required: true },
    // Preferences
    { path: 'newsletter', label: 'Subscribe to newsletter', type: 'checkbox', included: true },
    { path: 'interests', label: 'Interests', type: 'checkboxes', included: true, options: [...] },
  ],
  multiPage: {
    enabled: true,
    showProgressBar: true,
    showPageTitles: true,
    pages: [
      {
        id: 'personal',
        title: 'Personal Information',
        fields: ['firstName', 'lastName', 'email'],
      },
      {
        id: 'account',
        title: 'Account Setup',
        fields: ['username', 'password'],
      },
      {
        id: 'preferences',
        title: 'Preferences',
        fields: ['newsletter', 'interests'],
      },
    ],
  },
};
\`\`\`

## 5. Add Computed Fields

\`\`\`tsx
{
  path: 'quantity',
  label: 'Quantity',
  type: 'number',
  included: true,
  validation: { min: 1 },
},
{
  path: 'unitPrice',
  label: 'Unit Price',
  type: 'number',
  included: true,
},
{
  path: 'total',
  label: 'Total',
  type: 'number',
  included: true,
  disabled: true, // Read-only
  computed: {
    formula: 'quantity * unitPrice',
    dependencies: ['quantity', 'unitPrice'],
    outputType: 'number',
  },
}
\`\`\`

## Next Steps

- Explore all 28+ field types
- Add custom validation rules
- Customize the theme
- Connect to the NetPad platform
`;

export const ARCHITECTURE_GUIDE = DOCUMENTATION.architecture;

export const EXAMPLES = `# @netpad/forms Examples

## Contact Form

\`\`\`typescript
const contactForm: FormConfiguration = {
  name: 'Contact Us',
  fieldConfigs: [
    { path: 'name', label: 'Full Name', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true, fieldWidth: 'half' },
    { path: 'phone', label: 'Phone', type: 'phone', included: true, fieldWidth: 'half' },
    { path: 'company', label: 'Company', type: 'short_text', included: true, fieldWidth: 'half' },
    { path: 'subject', label: 'Subject', type: 'dropdown', included: true, required: true,
      options: [
        { label: 'General Inquiry', value: 'general' },
        { label: 'Sales', value: 'sales' },
        { label: 'Support', value: 'support' },
        { label: 'Partnership', value: 'partnership' },
      ]
    },
    { path: 'message', label: 'Message', type: 'long_text', included: true, required: true,
      validation: { minLength: 20, errorMessage: 'Please provide more details (at least 20 characters)' }
    },
    { path: 'newsletter', label: 'Subscribe to our newsletter', type: 'checkbox', included: true },
  ],
  submitButtonText: 'Send Message',
  successMessage: 'Thank you for contacting us! We will respond within 24 hours.',
};
\`\`\`

## Customer Survey (Multi-Page)

\`\`\`typescript
const surveyForm: FormConfiguration = {
  name: 'Customer Satisfaction Survey',
  fieldConfigs: [
    // Page 1: About You
    { path: 'name', label: 'Your Name (optional)', type: 'short_text', included: true },
    { path: 'email', label: 'Email (optional)', type: 'email', included: true },
    { path: 'howHeard', label: 'How did you hear about us?', type: 'dropdown', included: true,
      options: [
        { label: 'Search Engine', value: 'search' },
        { label: 'Social Media', value: 'social' },
        { label: 'Friend/Colleague', value: 'referral' },
        { label: 'Advertisement', value: 'ad' },
        { label: 'Other', value: 'other' },
      ]
    },
    // Page 2: Your Experience
    { path: 'overallSatisfaction', label: 'Overall Satisfaction', type: 'rating', included: true, required: true },
    { path: 'npsScore', label: 'How likely are you to recommend us?', type: 'nps', included: true, required: true },
    { path: 'likedMost', label: 'What did you like most?', type: 'checkboxes', included: true,
      options: [
        { label: 'Product Quality', value: 'quality' },
        { label: 'Customer Service', value: 'service' },
        { label: 'Ease of Use', value: 'ease' },
        { label: 'Price', value: 'price' },
        { label: 'Features', value: 'features' },
      ]
    },
    { path: 'improvements', label: 'What could we improve?', type: 'long_text', included: true },
    // Page 3: Follow-up
    { path: 'canContact', label: 'May we contact you for follow-up?', type: 'yes_no', included: true },
    { path: 'preferredContact', label: 'Preferred contact method', type: 'radio', included: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
      ],
      conditionalLogic: {
        action: 'show',
        logicType: 'all',
        conditions: [{ field: 'canContact', operator: 'isTrue' }],
      }
    },
    { path: 'additionalComments', label: 'Any additional comments?', type: 'long_text', included: true },
  ],
  multiPage: {
    enabled: true,
    showProgressBar: true,
    showPageTitles: true,
    pages: [
      { id: 'about', title: 'About You', fields: ['name', 'email', 'howHeard'] },
      { id: 'experience', title: 'Your Experience', fields: ['overallSatisfaction', 'npsScore', 'likedMost', 'improvements'] },
      { id: 'followup', title: 'Follow-up', fields: ['canContact', 'preferredContact', 'additionalComments'] },
    ],
  },
  submitButtonText: 'Submit Survey',
  successMessage: 'Thank you for your feedback!',
};
\`\`\`

## Order Form with Computed Fields

\`\`\`typescript
const orderForm: FormConfiguration = {
  name: 'Product Order',
  fieldConfigs: [
    // Product selection
    { path: 'product', label: 'Product', type: 'dropdown', included: true, required: true, fieldWidth: 'half',
      options: [
        { label: 'Basic Plan - $10/mo', value: 'basic' },
        { label: 'Pro Plan - $25/mo', value: 'pro' },
        { label: 'Enterprise - $99/mo', value: 'enterprise' },
      ]
    },
    { path: 'quantity', label: 'Quantity (months)', type: 'number', included: true, required: true, fieldWidth: 'half',
      defaultValue: 1,
      validation: { min: 1, max: 24 }
    },
    { path: 'unitPrice', label: 'Unit Price', type: 'number', included: true, disabled: true, fieldWidth: 'third' },
    { path: 'discount', label: 'Discount (%)', type: 'number', included: true, fieldWidth: 'third',
      defaultValue: 0,
      validation: { min: 0, max: 50 }
    },
    { path: 'total', label: 'Total', type: 'number', included: true, disabled: true, fieldWidth: 'third',
      computed: {
        formula: 'quantity * unitPrice * (1 - discount / 100)',
        dependencies: ['quantity', 'unitPrice', 'discount'],
        outputType: 'number',
      }
    },
    // Customer info
    { path: 'sectionCustomer', label: 'Customer Information', type: 'section-header', included: true,
      layout: { type: 'section-header', title: 'Customer Information' }
    },
    { path: 'customerName', label: 'Name', type: 'short_text', included: true, required: true },
    { path: 'customerEmail', label: 'Email', type: 'email', included: true, required: true },
    // Billing address
    { path: 'billing.street', label: 'Street Address', type: 'short_text', included: true, required: true },
    { path: 'billing.city', label: 'City', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'billing.state', label: 'State', type: 'short_text', included: true, required: true, fieldWidth: 'quarter' },
    { path: 'billing.zip', label: 'ZIP', type: 'short_text', included: true, required: true, fieldWidth: 'quarter' },
  ],
  submitButtonText: 'Place Order',
};
\`\`\`

## Employee Onboarding (Complex Multi-Page)

\`\`\`typescript
const onboardingForm: FormConfiguration = {
  name: 'Employee Onboarding',
  fieldConfigs: [
    // Personal Information
    { path: 'firstName', label: 'First Name', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'lastName', label: 'Last Name', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true, fieldWidth: 'half' },
    { path: 'phone', label: 'Phone', type: 'phone', included: true, required: true, fieldWidth: 'half' },
    { path: 'dateOfBirth', label: 'Date of Birth', type: 'date', included: true, required: true, fieldWidth: 'half' },
    { path: 'address.street', label: 'Street Address', type: 'short_text', included: true, required: true },
    { path: 'address.city', label: 'City', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'address.state', label: 'State', type: 'short_text', included: true, required: true, fieldWidth: 'quarter' },
    { path: 'address.zip', label: 'ZIP Code', type: 'short_text', included: true, required: true, fieldWidth: 'quarter' },

    // Employment Details
    { path: 'department', label: 'Department', type: 'dropdown', included: true, required: true,
      options: [
        { label: 'Engineering', value: 'engineering' },
        { label: 'Product', value: 'product' },
        { label: 'Design', value: 'design' },
        { label: 'Marketing', value: 'marketing' },
        { label: 'Sales', value: 'sales' },
        { label: 'HR', value: 'hr' },
        { label: 'Finance', value: 'finance' },
      ]
    },
    { path: 'jobTitle', label: 'Job Title', type: 'short_text', included: true, required: true },
    { path: 'startDate', label: 'Start Date', type: 'date', included: true, required: true },
    { path: 'workLocation', label: 'Work Location', type: 'radio', included: true, required: true,
      options: [
        { label: 'Remote', value: 'remote' },
        { label: 'Hybrid', value: 'hybrid' },
        { label: 'On-site', value: 'onsite' },
      ]
    },
    { path: 'officeLocation', label: 'Office Location', type: 'dropdown', included: true,
      options: [
        { label: 'New York', value: 'nyc' },
        { label: 'San Francisco', value: 'sf' },
        { label: 'London', value: 'london' },
        { label: 'Singapore', value: 'singapore' },
      ],
      conditionalLogic: {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'workLocation', operator: 'equals', value: 'hybrid' },
          { field: 'workLocation', operator: 'equals', value: 'onsite' },
        ],
      }
    },

    // Emergency Contact
    { path: 'emergencyContact.name', label: 'Emergency Contact Name', type: 'short_text', included: true, required: true },
    { path: 'emergencyContact.relationship', label: 'Relationship', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'emergencyContact.phone', label: 'Phone', type: 'phone', included: true, required: true, fieldWidth: 'half' },
  ],
  multiPage: {
    enabled: true,
    showProgressBar: true,
    showPageTitles: true,
    pages: [
      {
        id: 'personal',
        title: 'Personal Information',
        description: 'Please provide your personal details',
        fields: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address.street', 'address.city', 'address.state', 'address.zip'],
      },
      {
        id: 'employment',
        title: 'Employment Details',
        description: 'Information about your role',
        fields: ['department', 'jobTitle', 'startDate', 'workLocation', 'officeLocation'],
      },
      {
        id: 'emergency',
        title: 'Emergency Contact',
        description: 'In case of emergency',
        fields: ['emergencyContact.name', 'emergencyContact.relationship', 'emergencyContact.phone'],
      },
    ],
  },
  submitButtonText: 'Complete Onboarding',
  successMessage: 'Welcome to the team! Your onboarding form has been submitted.',
};
\`\`\`

## Form with Layout Elements

\`\`\`typescript
const applicationForm: FormConfiguration = {
  name: 'Job Application',
  fieldConfigs: [
    // Header section
    { path: 'headerSection', label: '', type: 'section-header', included: true,
      layout: { type: 'section-header', title: 'Job Application', subtitle: 'Please complete all required fields' }
    },
    { path: 'instructions', label: '', type: 'description', included: true,
      layout: { type: 'description', content: 'Thank you for your interest in joining our team. This application should take about 10 minutes to complete.' }
    },
    { path: 'divider1', label: '', type: 'divider', included: true, layout: { type: 'divider' } },

    // Personal section
    { path: 'personalHeader', label: '', type: 'section-header', included: true,
      layout: { type: 'section-header', title: 'Personal Information' }
    },
    { path: 'firstName', label: 'First Name', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'lastName', label: 'Last Name', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true, fieldWidth: 'half' },
    { path: 'phone', label: 'Phone', type: 'phone', included: true, fieldWidth: 'half' },

    { path: 'spacer1', label: '', type: 'spacer', included: true, layout: { type: 'spacer', height: 16 } },

    // Position section
    { path: 'positionHeader', label: '', type: 'section-header', included: true,
      layout: { type: 'section-header', title: 'Position' }
    },
    { path: 'position', label: 'Position Applied For', type: 'dropdown', included: true, required: true,
      options: [
        { label: 'Software Engineer', value: 'swe' },
        { label: 'Product Manager', value: 'pm' },
        { label: 'Designer', value: 'design' },
      ]
    },
    { path: 'experience', label: 'Years of Experience', type: 'number', included: true, required: true, fieldWidth: 'half' },
    { path: 'salary', label: 'Expected Salary', type: 'number', included: true, fieldWidth: 'half' },

    // Documents
    { path: 'coverLetter', label: 'Cover Letter', type: 'long_text', included: true, required: true,
      helpText: 'Tell us why you would be a great fit for this role',
      validation: { minLength: 100 }
    },

    // Agreement
    { path: 'divider2', label: '', type: 'divider', included: true, layout: { type: 'divider' } },
    { path: 'agreeTerms', label: 'I certify that all information provided is accurate', type: 'checkbox', included: true, required: true },
  ],
  submitButtonText: 'Submit Application',
};
\`\`\`
`;
