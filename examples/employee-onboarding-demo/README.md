# Employee Onboarding Portal

> **Built with NetPad** — A complete employee onboarding application in under 300 lines of code.

This example demonstrates how developers can leverage NetPad to build sophisticated, production-ready data collection applications without building form infrastructure from scratch.

![Employee Onboarding Demo](https://via.placeholder.com/800x400?text=Employee+Onboarding+Demo)

## The Problem

Building an employee onboarding system typically requires:

- ❌ Custom form components for 10+ field types
- ❌ Multi-page wizard logic with state management
- ❌ Client-side and server-side validation
- ❌ Conditional field visibility logic
- ❌ Nested data structure handling
- ❌ Progress tracking UI
- ❌ Error handling and display
- ❌ Accessibility compliance

**Time estimate: 2-4 weeks of development**

## The NetPad Solution

With `@netpad/forms`, you define your form declaratively and let NetPad handle the complexity:

```tsx
import { FormRenderer, FormConfiguration } from '@netpad/forms';

const onboardingForm: FormConfiguration = {
  name: 'Employee Onboarding',
  fieldConfigs: [...],  // Define your fields
  multiPage: {...},     // Configure wizard pages
};

// That's it. Render your form:
<FormRenderer config={onboardingForm} onSubmit={handleSubmit} />
```

**Time estimate: 1-2 hours**

## Quick Start

```bash
# Clone and run
git clone <repo-url>
cd examples/employee-onboarding-demo
npm install
npm run dev

# Open http://localhost:3001
```

## What This Demo Includes

### 3-Page Wizard Flow

| Page | Fields | Features |
|------|--------|----------|
| **Personal Info** | Name, email, phone, DOB | Required validation, email format |
| **Employment** | Department, title, start date, work location | Conditional fields, dropdowns |
| **Additional** | Emergency contact, preferences, bio | Nested objects, multi-select |

### Live Features to Try

1. **Progress Bar** — Visual indication of form completion
2. **Conditional Logic** — Select "Hybrid" or "On-site" to see the Office Location field appear
3. **Validation** — Try submitting without required fields
4. **Field Types** — Text, email, phone, date, dropdown, radio, checkbox, toggle

## Code Walkthrough

### Project Structure

```
employee-onboarding-demo/
├── src/app/
│   ├── layout.tsx           # Theme configuration
│   ├── page.tsx             # Landing page
│   ├── onboarding/page.tsx  # ⭐ The form (main demo)
│   └── success/page.tsx     # Confirmation page
├── package.json
└── README.md
```

### The Core: Form Configuration

The entire form is defined in `src/app/onboarding/page.tsx`:

```tsx
const onboardingFormConfig: FormConfiguration = {
  name: 'Employee Onboarding',
  fieldConfigs: [
    // Personal fields
    { path: 'firstName', label: 'First Name', type: 'short_text', required: true },
    { path: 'email', label: 'Email', type: 'email', required: true },

    // Employment fields with conditional logic
    {
      path: 'officeLocation',
      label: 'Office Location',
      type: 'dropdown',
      conditionalLogic: {
        action: 'show',
        logicType: 'any',
        conditions: [
          { field: 'workLocation', operator: 'equals', value: 'hybrid' },
          { field: 'workLocation', operator: 'equals', value: 'onsite' },
        ],
      },
    },

    // Nested data for emergency contact
    { path: 'emergencyContact.name', label: 'Contact Name', type: 'short_text' },
    { path: 'emergencyContact.phone', label: 'Contact Phone', type: 'phone' },
  ],

  // Multi-page configuration
  multiPage: {
    enabled: true,
    showProgressBar: true,
    pages: [
      { id: 'personal', title: 'Personal Info', fields: ['firstName', 'email', ...] },
      { id: 'employment', title: 'Employment', fields: ['department', 'jobTitle', ...] },
      { id: 'additional', title: 'Additional', fields: ['emergencyContact.name', ...] },
    ],
  },
};
```

### Rendering the Form

```tsx
<FormRenderer
  config={onboardingFormConfig}
  onSubmit={handleSubmit}
  mode="create"
/>
```

### Handling Submission

```tsx
const handleSubmit = async (data: Record<string, unknown>) => {
  // Data is automatically structured with nested objects:
  // {
  //   firstName: "John",
  //   email: "john@example.com",
  //   emergencyContact: {
  //     name: "Jane Doe",
  //     phone: "555-1234"
  //   }
  // }

  await fetch('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
```

## NetPad Features Demonstrated

| Feature | How It's Used |
|---------|---------------|
| **28+ Field Types** | text, email, phone, date, dropdown, radio, checkbox, toggle |
| **Multi-Page Wizard** | 3 pages with progress bar |
| **Conditional Logic** | Office location shown based on work location |
| **Nested Data** | `emergencyContact.name` creates `{ emergencyContact: { name: ... } }` |
| **Validation** | Required fields, email format, max length |
| **Section Headers** | Visual grouping with titles and subtitles |
| **Field Width** | Side-by-side fields using `fieldWidth: 'half'` |

## Extending This Example

### Add a Backend API

```tsx
// src/app/api/onboarding/route.ts
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(request: Request) {
  const data = await request.json();

  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  const db = client.db('myapp');

  const result = await db.collection('onboarding').insertOne({
    ...data,
    submittedAt: new Date(),
    status: 'pending',
  });

  return NextResponse.json({ id: result.insertedId });
}
```

### Add More Pages

```tsx
multiPage: {
  pages: [
    ...existingPages,
    {
      id: 'documents',
      title: 'Documents',
      fields: ['idUpload', 'taxForms', 'directDeposit'],
    },
  ],
}
```

### Add Computed Fields

```tsx
{
  path: 'fullName',
  label: 'Full Name',
  type: 'short_text',
  disabled: true,
  computed: {
    formula: 'concat(firstName, " ", lastName)',
    dependencies: ['firstName', 'lastName'],
  },
}
```

## Why NetPad?

| Without NetPad | With NetPad |
|----------------|-------------|
| Build custom TextField, Select, DatePicker, etc. | Use `type: 'short_text'`, `type: 'date'` |
| Implement wizard state machine | Use `multiPage: { enabled: true }` |
| Write conditional rendering logic | Use `conditionalLogic: { ... }` |
| Handle nested form data manually | Use dot notation: `contact.email` |
| Build validation from scratch | Use `required: true`, `validation: { ... }` |

## Resources

- **[@netpad/forms Package](../../packages/forms/)** — The npm package powering this demo
- **[API Reference](../../packages/forms/README.md)** — Full documentation
- **[Architecture Guide](../../packages/forms/ARCHITECTURE.md)** — How it works under the hood

## License

Apache-2.0 — Build amazing things with NetPad!
