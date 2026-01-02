# @netpad/forms Architecture Guide

This document explains the architecture and design of the `@netpad/forms` package for engineers who want to understand, contribute to, or extend the codebase.

## Overview

`@netpad/forms` is a React component library that enables developers to render NetPad forms in their applications. It provides a form rendering engine, API client, and utility functions for building sophisticated data collection experiences.

### Core Capabilities

1. **Form Rendering** - Render forms from JSON configuration
2. **Multi-Page Wizards** - Step-by-step form navigation with progress tracking
3. **Conditional Logic** - Dynamic field visibility based on user input
4. **Computed Fields** - Formula-based calculated values
5. **Validation** - Built-in and custom validation rules
6. **API Integration** - Client for NetPad's REST API

---

## Package Structure

```
packages/forms/
├── src/
│   ├── index.ts              # Main entry point (exports)
│   ├── client.ts             # NetPad API client
│   ├── components/
│   │   ├── FormRenderer.tsx  # Core form rendering component
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── utils/
│       ├── conditionalLogic.ts  # Field visibility evaluation
│       ├── formulas.ts          # Formula/expression evaluation
│       ├── validation.ts        # Field validation logic
│       └── index.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts            # Build configuration
└── README.md                 # User documentation
```

---

## Core Concepts

### 1. FormConfiguration

The `FormConfiguration` type is the central data structure that defines a form:

```typescript
interface FormConfiguration {
  // Identity
  formId?: string;
  name: string;
  description?: string;
  slug?: string;

  // Fields
  fieldConfigs: FieldConfig[];

  // Multi-page
  multiPage?: MultiPageConfig;

  // Appearance
  theme?: FormTheme;
  header?: FormHeader;

  // Behavior
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;
}
```

**Key points:**
- `fieldConfigs` is the array of all fields in the form
- `multiPage` controls wizard-style navigation
- `theme` allows visual customization

### 2. FieldConfig

Each field in a form is defined by a `FieldConfig`:

```typescript
interface FieldConfig {
  // Required
  path: string;           // Unique identifier, supports dot notation (e.g., "address.city")
  label: string;          // Display label
  type: string;           // Field type (see supported types below)
  included: boolean;      // Whether to render this field

  // Optional
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  defaultValue?: unknown;
  options?: Array<{ label: string; value: string | number }>;

  // Validation
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    errorMessage?: string;
  };

  // Advanced features
  conditionalLogic?: ConditionalLogic;
  computed?: ComputedConfig;
  lookup?: LookupConfig;
  repeater?: RepeaterConfig;
  layout?: LayoutConfig;
}
```

**The `path` field:**
- Acts as both the field identifier and the data path
- Supports dot notation for nested objects: `"contact.email"` → `{ contact: { email: "..." } }`
- Must be unique within the form

### 3. Supported Field Types

| Type | Component | Use Case |
|------|-----------|----------|
| `short_text`, `text` | TextField | Single-line input |
| `long_text`, `textarea` | TextField (multiline) | Multi-line input |
| `email` | TextField | Email with validation |
| `url` | TextField | URL with validation |
| `phone` | TextField | Phone number |
| `number` | TextField/Slider | Numeric input |
| `dropdown`, `select` | Select | Single selection |
| `multiple_choice`, `radio` | RadioGroup | Single selection (visible options) |
| `checkboxes`, `checkbox` | Checkbox | Multiple selection |
| `yes_no`, `boolean` | Switch | True/false toggle |
| `rating` | Rating | Star rating |
| `date` | DatePicker | Date selection |
| `time` | TimePicker | Time selection |
| `autocomplete` | Autocomplete | Searchable select |
| `tags` | Autocomplete (freeSolo) | Tag/chip input |

**Layout field types** (non-input):
- `section-header` - Section title with optional subtitle
- `description` - Informational text
- `divider` - Visual separator
- `spacer` - Empty space

---

## Component Architecture

### FormRenderer

The `FormRenderer` is the main component. Here's how it works:

```
┌─────────────────────────────────────────────────────────────┐
│                     FormRenderer                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    State                             │   │
│  │  - formData: Record<string, unknown>                │   │
│  │  - errors: Record<string, string>                   │   │
│  │  - currentPage: number                              │   │
│  │  - submitting: boolean                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Visibility Calculation                  │   │
│  │  visibleFields = fieldConfigs.filter(               │   │
│  │    field => evaluateConditionalLogic(field, data)   │   │
│  │  )                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Page Filtering (if multi-page)         │   │
│  │  currentPageFields = visibleFields.filter(          │   │
│  │    field => pages[currentPage].fields.includes(path)│   │
│  │  )                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Field Rendering                      │   │
│  │  currentPageFields.map(field => renderField(field)) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. User interacts with a field
2. `handleFieldChange(path, value)` is called
3. State is updated via `setNestedValue(formData, path, value)`
4. Computed fields are recalculated
5. Conditional logic is re-evaluated
6. UI re-renders with updated visibility

### Field Rendering

Each field type maps to a specific component:

```typescript
function renderField(props: FieldProps): React.ReactNode {
  const { field } = props;
  const type = field.type.toLowerCase();

  switch (type) {
    case 'short_text':
    case 'email':
      return <TextField_Field {...props} />;
    case 'dropdown':
      return <SelectField {...props} />;
    case 'date':
      return <DateField {...props} />;
    // ... etc
  }
}
```

**FieldProps interface:**
```typescript
interface FieldProps {
  field: FieldConfig;      // Field configuration
  value: unknown;          // Current value
  onChange: (value) => void; // Change handler
  error?: string;          // Validation error
  disabled?: boolean;      // Disabled state
  mode?: FormMode;         // create/edit/view
}
```

---

## Utility Functions

### Conditional Logic (`conditionalLogic.ts`)

Evaluates whether a field should be visible based on conditions:

```typescript
// Example conditional logic
const conditionalLogic = {
  action: 'show',        // 'show' or 'hide'
  logicType: 'all',      // 'all' (AND) or 'any' (OR)
  conditions: [
    { field: 'country', operator: 'equals', value: 'US' },
    { field: 'hasAddress', operator: 'isTrue' }
  ]
};

// Evaluation
const isVisible = evaluateConditionalLogic(conditionalLogic, formData);
// Returns true if country === 'US' AND hasAddress === true
```

**Supported operators:**
- `equals`, `notEquals` - Exact match
- `contains`, `notContains` - String/array contains
- `greaterThan`, `lessThan` - Numeric comparison
- `isEmpty`, `isNotEmpty` - Presence check
- `isTrue`, `isFalse` - Boolean check

### Formula Evaluation (`formulas.ts`)

Evaluates expressions for computed fields:

```typescript
// Example formula
const result = evaluateFormula('quantity * unitPrice * (1 - discount)', {
  quantity: 10,
  unitPrice: 25,
  discount: 0.1
});
// Returns 225

// Available functions
sum(1, 2, 3)           // 6
avg(1, 2, 3)           // 2
round(3.14159, 2)      // 3.14
if(x > 10, 'high', 'low')
concat(firstName, ' ', lastName)
```

**How it works:**
1. Extract field references from formula string
2. Replace references with actual values from form data
3. Evaluate in a sandboxed context with allowed functions

### Validation (`validation.ts`)

Validates field values against rules:

```typescript
// Validate single field
const error = validateField(field, value);
// Returns error message string or null

// Validate entire form
const errors = validateForm(fields, formData);
// Returns { fieldPath: errorMessage, ... }
```

**Validation checks:**
- Required field presence
- String min/max length
- Number min/max value
- Regex pattern matching
- Email format
- URL format
- Phone format (basic)

---

## API Client (`client.ts`)

The `NetPadClient` class provides methods for interacting with NetPad's REST API:

```typescript
const client = createNetPadClient({
  baseUrl: 'https://netpad.example.com',
  apiKey: 'np_live_xxx'
});

// Fetch form configuration
const form = await client.getForm('employee-onboarding');

// Submit form data
const result = await client.submitForm('employee-onboarding', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});

// List submissions
const submissions = await client.listSubmissions('employee-onboarding', {
  page: 1,
  pageSize: 20
});
```

**API Endpoints Used:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/forms/{id}` | Fetch form schema |
| POST | `/api/v1/forms/{id}/submissions` | Submit form data |
| GET | `/api/v1/forms/{id}/submissions` | List submissions |
| GET | `/api/v1/forms/{id}/submissions/{subId}` | Get submission |
| GET | `/api/v1/health` | Health check |

---

## Build & Distribution

### Build Configuration (tsup)

The package uses `tsup` for building:

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts', 'src/types/index.ts'],
  format: ['cjs', 'esm'],    // CommonJS and ES Modules
  dts: true,                  // Generate .d.ts files
  external: [                 // Peer dependencies
    'react',
    'react-dom',
    '@mui/material',
    // ...
  ],
});
```

**Output:**
```
dist/
├── index.js          # CommonJS
├── index.mjs         # ES Module
├── index.d.ts        # TypeScript declarations
├── types/
│   ├── index.js
│   ├── index.mjs
│   └── index.d.ts
```

### Package Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.mjs",
      "require": "./dist/types/index.js"
    }
  }
}
```

---

## Extension Points

### Adding a New Field Type

1. **Create the field component:**
```typescript
function CustomField({ field, value, onChange, error, disabled }: FieldProps) {
  return (
    <FormControl error={!!error}>
      {/* Your custom UI */}
    </FormControl>
  );
}
```

2. **Add to the switch statement in `renderField`:**
```typescript
case 'custom_type':
  return <CustomField {...props} />;
```

3. **Add type definition (optional):**
```typescript
// In types/index.ts
export type CustomFieldConfig = FieldConfig & {
  customOption?: string;
};
```

### Adding a New Validation Rule

1. **Add the validation check in `validateField`:**
```typescript
// Custom validation for a specific field type
if (field.type === 'custom_type' && field.validation?.customRule) {
  if (!customValidation(value)) {
    return 'Custom validation failed';
  }
}
```

### Adding a New Operator

1. **Add to the type:**
```typescript
export type ConditionOperator =
  | 'equals'
  // ...
  | 'customOperator';
```

2. **Add evaluation logic:**
```typescript
case 'customOperator':
  return customEvaluation(fieldValue, compareValue);
```

---

## Design Decisions

### Why MUI?

Material-UI was chosen because:
- NetPad already uses MUI extensively
- Comprehensive component library with good accessibility
- Strong TypeScript support
- Easy theming and customization

### Why Separate Types Package?

Types are exported separately (`@netpad/forms/types`) to allow:
- Importing types without React dependencies
- Sharing types between client and server code
- Smaller bundle when only types are needed

### Why Client-Side Only?

The FormRenderer is client-side only (`'use client'`) because:
- Forms require user interaction (event handlers)
- Dynamic visibility requires client-side state
- DatePicker and other components need browser APIs

For SSR, fetch the form config server-side and pass it as props.

---

## Testing Considerations

When testing forms built with this package:

1. **Unit test validation logic:**
```typescript
expect(validateField(requiredField, '')).toBe('Field is required');
expect(validateField(emailField, 'invalid')).toContain('valid email');
```

2. **Unit test conditional logic:**
```typescript
expect(evaluateConditionalLogic(showIfUS, { country: 'US' })).toBe(true);
expect(evaluateConditionalLogic(showIfUS, { country: 'UK' })).toBe(false);
```

3. **Integration test form submission:**
```typescript
render(<FormRenderer config={config} onSubmit={mockSubmit} />);
fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' }});
fireEvent.click(screen.getByText('Submit'));
await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith({ email: 'test@example.com' }));
```

---

## Common Patterns

### Form with Sections

```typescript
const config: FormConfiguration = {
  name: 'Application Form',
  fieldConfigs: [
    // Section header (layout field)
    {
      path: '_section_personal',
      label: '',
      type: 'layout',
      included: true,
      layout: { type: 'section-header', title: 'Personal Information' }
    },
    // Fields in this section
    { path: 'firstName', label: 'First Name', type: 'short_text', included: true },
    { path: 'lastName', label: 'Last Name', type: 'short_text', included: true },

    // Next section
    {
      path: '_section_contact',
      label: '',
      type: 'layout',
      included: true,
      layout: { type: 'section-header', title: 'Contact Information' }
    },
    { path: 'email', label: 'Email', type: 'email', included: true },
  ]
};
```

### Dependent Dropdowns

```typescript
// Country field
{ path: 'country', label: 'Country', type: 'dropdown', options: countries },

// State field - shown only for US
{
  path: 'state',
  label: 'State',
  type: 'dropdown',
  options: usStates,
  conditionalLogic: {
    action: 'show',
    logicType: 'all',
    conditions: [{ field: 'country', operator: 'equals', value: 'US' }]
  }
}
```

### Calculated Total

```typescript
{ path: 'quantity', label: 'Quantity', type: 'number' },
{ path: 'price', label: 'Unit Price', type: 'number' },
{
  path: 'total',
  label: 'Total',
  type: 'number',
  disabled: true,  // User can't edit
  computed: {
    formula: 'quantity * price',
    dependencies: ['quantity', 'price']
  }
}
```

---

## Questions?

For questions or issues:
- Check the README.md for usage examples
- Review the type definitions in `src/types/index.ts`
- Open an issue in the NetPad repository
