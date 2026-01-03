# @netpad/forms

> Build sophisticated multi-page wizards and data collection forms in hours, not weeks.

[![npm version](https://badge.fury.io/js/@netpad%2Fforms.svg)](https://www.npmjs.com/package/@netpad/forms)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Why @netpad/forms?

Building forms is tedious. Multi-page wizards, conditional logic, validation, nested data structures — it all adds up to weeks of development time. `@netpad/forms` handles all of this with a simple, declarative configuration.

**See it in action:** Check out the [Employee Onboarding Demo](../../examples/employee-onboarding-demo/) — a complete 3-page wizard in under 300 lines of code.

## Features

- **28+ Field Types** — Text, email, date, select, rating, file upload, and more
- **Multi-page Wizards** — Progress tracking, page navigation, step validation
- **Conditional Logic** — Show/hide fields based on user input
- **Computed Fields** — Formula-based calculated values
- **Nested Data** — Dot notation paths create structured objects automatically
- **Validation** — Required, min/max, pattern matching, custom rules
- **TypeScript** — Full type safety with exported types
- **Theming** — Customizable with Material-UI integration

## Installation

```bash
npm install @netpad/forms
```

### Peer Dependencies

```bash
npm install react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled
```

## Quick Start

```tsx
import { FormRenderer, FormConfiguration } from '@netpad/forms';

const contactForm: FormConfiguration = {
  name: 'Contact Form',
  fieldConfigs: [
    { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true },
    { path: 'message', label: 'Message', type: 'long_text', included: true, required: true },
  ],
  submitButtonText: 'Send Message',
};

function ContactPage() {
  const handleSubmit = async (data: Record<string, unknown>) => {
    await fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) });
  };

  return <FormRenderer config={contactForm} onSubmit={handleSubmit} />;
}
```

## Multi-Page Wizards

Create step-by-step forms with progress tracking:

```tsx
const formConfig: FormConfiguration = {
  name: 'Employee Onboarding',
  fieldConfigs: [
    { path: 'firstName', label: 'First Name', type: 'short_text', included: true, required: true },
    { path: 'lastName', label: 'Last Name', type: 'short_text', included: true, required: true },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true },
    { path: 'department', label: 'Department', type: 'dropdown', included: true, options: [
      { label: 'Engineering', value: 'engineering' },
      { label: 'Marketing', value: 'marketing' },
    ]},
    { path: 'startDate', label: 'Start Date', type: 'date', included: true, required: true },
  ],
  multiPage: {
    enabled: true,
    showProgressBar: true,
    pages: [
      { id: 'personal', title: 'Personal Info', fields: ['firstName', 'lastName', 'email'] },
      { id: 'employment', title: 'Employment', fields: ['department', 'startDate'] },
    ],
  },
};
```

## Conditional Logic

Show or hide fields based on other field values:

```tsx
{
  path: 'officeLocation',
  label: 'Office Location',
  type: 'dropdown',
  included: true,
  options: [...],
  conditionalLogic: {
    action: 'show',
    logicType: 'any',
    conditions: [
      { field: 'workLocation', operator: 'equals', value: 'hybrid' },
      { field: 'workLocation', operator: 'equals', value: 'onsite' },
    ],
  },
}
```

**Available operators:** `equals`, `notEquals`, `contains`, `notContains`, `greaterThan`, `lessThan`, `isEmpty`, `isNotEmpty`, `isTrue`, `isFalse`

## Nested Data Structures

Use dot notation for nested objects:

```tsx
{ path: 'emergencyContact.name', label: 'Contact Name', type: 'short_text', included: true }
{ path: 'emergencyContact.phone', label: 'Contact Phone', type: 'phone', included: true }
```

**Produces:**
```json
{
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "555-1234"
  }
}
```

## Computed Fields

Calculate values based on other fields:

```tsx
{
  path: 'total',
  label: 'Order Total',
  type: 'number',
  included: true,
  disabled: true,
  computed: {
    formula: 'quantity * unitPrice * (1 - discount)',
    dependencies: ['quantity', 'unitPrice', 'discount'],
  },
}
```

## API Reference

### FormRenderer Props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `FormConfiguration` | Form configuration with fields, pages, and settings |
| `initialData` | `Record<string, unknown>` | Initial form data (for edit mode) |
| `mode` | `'create' \| 'edit' \| 'view'` | Form mode (default: 'create') |
| `onSubmit` | `(data) => Promise<void>` | Called on form submission |
| `onChange` | `(data) => void` | Called when form data changes |
| `onError` | `(errors) => void` | Called on validation errors |
| `submitButtonText` | `string` | Custom submit button text |
| `showSubmitButton` | `boolean` | Show/hide submit button (default: true) |
| `disabled` | `boolean` | Disable all form inputs |
| `loading` | `boolean` | Show loading state |
| `theme` | `FormTheme` | Theme overrides |

### Supported Field Types

| Type | Description |
|------|-------------|
| `short_text` | Single-line text input |
| `long_text` | Multi-line text area |
| `email` | Email with validation |
| `url` | URL with validation |
| `phone` | Phone number |
| `number` | Numeric input |
| `dropdown` | Select dropdown |
| `multiple_choice` | Radio buttons |
| `checkboxes` | Checkbox group |
| `yes_no` | Boolean switch |
| `date` | Date picker |
| `time` | Time picker |
| `rating` | Star rating |
| `slider` | Numeric slider |
| `tags` | Tag/chip input |
| `autocomplete` | Searchable select |

### NetPad API Client

Connect to a NetPad instance:

```tsx
import { createNetPadClient } from '@netpad/forms';

const client = createNetPadClient({
  baseUrl: 'https://your-netpad-instance.com',
  apiKey: 'np_live_xxx',
});

// Fetch form configuration
const form = await client.getForm('employee-onboarding');

// Submit form data
await client.submitForm('employee-onboarding', formData);

// List submissions
const submissions = await client.listSubmissions('employee-onboarding', { page: 1 });
```

### Utility Functions

```tsx
import {
  evaluateConditionalLogic,
  validateField,
  validateForm,
  evaluateFormula,
} from '@netpad/forms';

// Check if field should be visible
const isVisible = evaluateConditionalLogic(field.conditionalLogic, formData);

// Validate a single field
const error = validateField(field, value);

// Validate entire form
const errors = validateForm(fields, formData);

// Evaluate a formula
const result = evaluateFormula('quantity * price', { quantity: 5, price: 10 });
```

## Theming

Customize the form appearance:

```tsx
const theme: FormTheme = {
  primaryColor: '#00ED64',
  backgroundColor: '#ffffff',
  textColor: '#001E2B',
  borderRadius: 8,
  spacing: 'comfortable',
  inputStyle: 'outlined',
  mode: 'light',
};

<FormRenderer config={formConfig} theme={theme} onSubmit={handleSubmit} />
```

## TypeScript

All types are exported:

```tsx
import type {
  FormConfiguration,
  FieldConfig,
  FormTheme,
  ConditionalLogic,
  FormPage,
  MultiPageConfig,
} from '@netpad/forms';
```

## Examples

- **[Employee Onboarding Demo](../../examples/employee-onboarding-demo/)** — Complete 3-page wizard
- **[Architecture Guide](./ARCHITECTURE.md)** — How it works under the hood
- **[Showcase](./SHOWCASE.md)** — Feature overview and comparisons

## License

Apache-2.0

---

**Questions?** [Open an issue](https://github.com/mrlynn/netpad-v3/issues) or check the [documentation](./ARCHITECTURE.md).
