# NetPad Forms: Build Data Apps in Hours, Not Weeks

## Stop Building Forms From Scratch

Every enterprise application needs forms. User registration, employee onboarding, customer surveys, support tickets, order forms — the list is endless. And every time, developers face the same challenges:

- Building 15+ form field components
- Implementing multi-step wizard logic
- Writing validation rules (client AND server)
- Handling conditional field visibility
- Managing complex nested data structures
- Ensuring accessibility compliance
- Testing all the edge cases

**The result?** Weeks of development time on boilerplate code that doesn't differentiate your product.

## There's a Better Way

`@netpad/forms` is a production-ready React form engine that handles all the complexity so you can focus on what matters: your application logic.

### Before NetPad

```tsx
// 500+ lines of custom components, state management, validation...
const [formData, setFormData] = useState({});
const [errors, setErrors] = useState({});
const [currentStep, setCurrentStep] = useState(0);

const validateEmail = (email) => { ... };
const validateRequired = (value) => { ... };
const handleStepChange = (direction) => { ... };

// Custom TextField, Select, DatePicker, Checkbox, Radio...
// Conditional rendering logic
// Nested object handling
// ...and on and on
```

### After NetPad

```tsx
import { FormRenderer } from '@netpad/forms';

const config = {
  name: 'Employee Onboarding',
  fieldConfigs: [
    { path: 'name', label: 'Name', type: 'short_text', required: true },
    { path: 'email', label: 'Email', type: 'email', required: true },
    { path: 'department', label: 'Department', type: 'dropdown', options: [...] },
  ],
  multiPage: { enabled: true, pages: [...] },
};

<FormRenderer config={config} onSubmit={handleSubmit} />
```

**That's it.** Multi-page wizard, validation, all field types, conditional logic — handled.

## Key Features

### 28+ Field Types Out of the Box

| Category | Types |
|----------|-------|
| **Text** | short_text, long_text, email, url, phone |
| **Numbers** | number, slider, rating |
| **Selection** | dropdown, multiple_choice, checkboxes, yes_no |
| **Date/Time** | date, time, datetime |
| **Advanced** | autocomplete, tags, file_upload |
| **Layout** | section-header, description, divider, spacer |

### Multi-Page Wizards

```tsx
multiPage: {
  enabled: true,
  showProgressBar: true,
  pages: [
    { id: 'step1', title: 'Personal Info', fields: [...] },
    { id: 'step2', title: 'Employment', fields: [...] },
    { id: 'step3', title: 'Review', fields: [...] },
  ],
}
```

### Conditional Logic

Show or hide fields based on user input — no custom code required:

```tsx
{
  path: 'stateProvince',
  label: 'State/Province',
  type: 'dropdown',
  conditionalLogic: {
    action: 'show',
    logicType: 'any',
    conditions: [
      { field: 'country', operator: 'equals', value: 'US' },
      { field: 'country', operator: 'equals', value: 'CA' },
    ],
  },
}
```

### Nested Data Structures

Use dot notation for nested objects — automatically structured on submission:

```tsx
// Configuration
{ path: 'billing.address.street', label: 'Street', type: 'short_text' }
{ path: 'billing.address.city', label: 'City', type: 'short_text' }

// Output
{
  billing: {
    address: {
      street: '123 Main St',
      city: 'New York'
    }
  }
}
```

### Built-in Validation

```tsx
{
  path: 'password',
  label: 'Password',
  type: 'short_text',
  required: true,
  validation: {
    minLength: 8,
    pattern: '^(?=.*[A-Z])(?=.*[0-9])',
    errorMessage: 'Password must be 8+ chars with uppercase and number',
  },
}
```

### Computed Fields

```tsx
{
  path: 'total',
  label: 'Order Total',
  type: 'number',
  disabled: true,
  computed: {
    formula: 'quantity * unitPrice * (1 - discount)',
    dependencies: ['quantity', 'unitPrice', 'discount'],
  },
}
```

## Real-World Example

See the **[Employee Onboarding Demo](/examples/employee-onboarding-demo/)** — a complete 3-page wizard built in under 300 lines of code:

- Personal information collection
- Employment details with conditional office location
- Emergency contact with nested data structure
- Preferences and policy acknowledgment

**Try it:**
```bash
cd examples/employee-onboarding-demo
npm install && npm run dev
# Open http://localhost:3001
```

## Integration Options

### Option 1: Standalone Package

Install `@netpad/forms` and define forms in code:

```bash
npm install @netpad/forms
```

```tsx
import { FormRenderer, FormConfiguration } from '@netpad/forms';
```

### Option 2: NetPad Platform

Use the full NetPad platform for:

- Visual form builder (no code)
- Built-in MongoDB persistence
- Submission management dashboard
- Analytics and reporting
- Workflow automation

## Comparison

| Capability | DIY | @netpad/forms | NetPad Platform |
|------------|-----|---------------|-----------------|
| Field Components | Build all | Included | Included |
| Multi-page Wizards | Build | Config-based | Visual builder |
| Validation | Build | Config-based | Visual builder |
| Conditional Logic | Build | Config-based | Visual builder |
| Data Persistence | Build | Bring your own | MongoDB built-in |
| Admin Dashboard | Build | Bring your own | Included |
| Time to Production | Weeks | Hours | Minutes |

## Getting Started

### 1. Install

```bash
npm install @netpad/forms
```

### 2. Peer Dependencies

```bash
npm install react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### 3. Build Your First Form

```tsx
'use client';

import { FormRenderer, FormConfiguration } from '@netpad/forms';

const contactForm: FormConfiguration = {
  name: 'Contact Us',
  fieldConfigs: [
    { path: 'name', label: 'Your Name', type: 'short_text', included: true, required: true },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true },
    { path: 'subject', label: 'Subject', type: 'dropdown', included: true, options: [
      { label: 'General Inquiry', value: 'general' },
      { label: 'Support', value: 'support' },
      { label: 'Sales', value: 'sales' },
    ]},
    { path: 'message', label: 'Message', type: 'long_text', included: true, required: true },
  ],
  submitButtonText: 'Send Message',
};

export default function ContactPage() {
  const handleSubmit = async (data: Record<string, unknown>) => {
    await fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) });
    alert('Message sent!');
  };

  return <FormRenderer config={contactForm} onSubmit={handleSubmit} />;
}
```

## Resources

- **[Package Documentation](./README.md)** — API reference and examples
- **[Architecture Guide](./ARCHITECTURE.md)** — How it works under the hood
- **[Example Applications](../examples/)** — Production-ready demos
- **[GitHub Issues](https://github.com/mongodb/netpad/issues)** — Report bugs, request features

## License

Apache-2.0

---

**Stop reinventing forms. Start building your application.**

```bash
npm install @netpad/forms
```
