# NetPad Example Applications

This directory contains complete, production-ready example applications that demonstrate how to build powerful data-driven applications using NetPad.

## Why NetPad?

Building forms, wizards, and data management interfaces from scratch is time-consuming and error-prone. NetPad provides:

- **Pre-built form components** with 28+ field types
- **Multi-page wizards** with progress tracking and validation
- **Conditional logic** that responds to user input in real-time
- **MongoDB integration** for seamless data persistence
- **Type-safe APIs** for building custom applications

## Available Examples

### [Employee Onboarding Portal](./employee-onboarding-demo/)

A complete 3-page employee onboarding wizard demonstrating:

- Multi-page form navigation with progress indicator
- Conditional field visibility (office location only shows for hybrid/onsite workers)
- Nested data structures (emergency contact information)
- Form validation and error handling
- Custom theming with Material-UI

**Tech Stack:** Next.js 14, React 18, @netpad/forms, Material-UI

```bash
cd employee-onboarding-demo
npm install
npm run dev
# Open http://localhost:3001
```

## Building Your Own App with NetPad

### Step 1: Install the Package

```bash
npm install @netpad/forms
```

### Step 2: Define Your Form

```tsx
import { FormConfiguration } from '@netpad/forms';

const myForm: FormConfiguration = {
  name: 'My Application Form',
  fieldConfigs: [
    { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },
    { path: 'email', label: 'Email', type: 'email', included: true, required: true },
    // Add more fields...
  ],
};
```

### Step 3: Render It

```tsx
import { FormRenderer } from '@netpad/forms';

function MyApp() {
  const handleSubmit = async (data) => {
    // Save to your backend
    await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return <FormRenderer config={myForm} onSubmit={handleSubmit} />;
}
```

## Package Documentation

- **[@netpad/forms README](../packages/forms/README.md)** - Quick start guide and API reference
- **[@netpad/forms Architecture](../packages/forms/ARCHITECTURE.md)** - Deep dive into how the package works

## Contributing Examples

We welcome new example applications! If you've built something cool with NetPad, please submit a PR.

Guidelines:
1. Create a new directory under `examples/`
2. Include a comprehensive README
3. Ensure `npm install && npm run dev` works out of the box
4. Document what NetPad features are being demonstrated
