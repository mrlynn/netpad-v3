// Application building tools for NetPad MCP Server

// ============================================================================
// APPLICATION SCAFFOLDING
// ============================================================================

export function generateNextJsApp(options: {
  appName: string;
  formConfig: string;
  includeWorkflows?: boolean;
  includeMongoDb?: boolean;
  styling?: 'tailwind' | 'mui' | 'none';
}): string {
  const { appName, formConfig, includeWorkflows, includeMongoDb, styling = 'mui' } = options;

  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: {
      next: '^14.2.0',
      react: '^18.3.0',
      'react-dom': '^18.3.0',
      '@netpad/forms': '^0.2.0',
      '@mui/material': '^5.15.0',
      '@mui/icons-material': '^5.15.0',
      '@emotion/react': '^11.11.0',
      '@emotion/styled': '^11.11.0',
      ...(includeWorkflows && { '@netpad/workflows': '^0.1.0' }),
      ...(includeMongoDb && { mongodb: '^6.5.0' }),
    },
    devDependencies: {
      typescript: '^5.4.0',
      '@types/node': '^20.0.0',
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      ...(styling === 'tailwind' && { tailwindcss: '^3.4.0', autoprefixer: '^10.0.0', postcss: '^8.0.0' }),
    },
  };

  const envExample = `# NetPad Configuration
NEXT_PUBLIC_NETPAD_URL=https://your-netpad-instance.com
NETPAD_API_KEY=np_live_xxxxx
${includeMongoDb ? '\n# MongoDB\nMONGODB_URI=mongodb+srv://...' : ''}
`;

  const formPageCode = `'use client';

import { FormRenderer } from '@netpad/forms';
import { createNetPadClient } from '@netpad/forms';
import type { FormConfiguration } from '@netpad/forms';
import { useState } from 'react';
import { Box, Container, Typography, Alert, Snackbar } from '@mui/material';

const formConfig: FormConfiguration = ${formConfig};

const client = createNetPadClient({
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL || '',
  apiKey: process.env.NETPAD_API_KEY || '',
});

export default function FormPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      await client.submitForm(formConfig.slug || formConfig.formId || '', data);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {formConfig.name}
      </Typography>
      {formConfig.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {formConfig.description}
        </Typography>
      )}

      <FormRenderer
        config={formConfig}
        onSubmit={handleSubmit}
        mode="create"
      />

      <Snackbar open={success} autoHideDuration={6000} onClose={() => setSuccess(false)}>
        <Alert severity="success">Form submitted successfully!</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
    </Container>
  );
}
`;

  const layoutCode = `import type { Metadata } from 'next';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
  },
});

export const metadata: Metadata = {
  title: '${appName}',
  description: 'Built with NetPad Forms',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
`;

  return `
## Generated Next.js Application: ${appName}

### 1. package.json
\`\`\`json
${JSON.stringify(packageJson, null, 2)}
\`\`\`

### 2. .env.local (create this file)
\`\`\`
${envExample}
\`\`\`

### 3. app/layout.tsx
\`\`\`tsx
${layoutCode}
\`\`\`

### 4. app/page.tsx
\`\`\`tsx
${formPageCode}
\`\`\`

### Setup Instructions

1. Create the project directory:
   \`\`\`bash
   mkdir ${appName} && cd ${appName}
   \`\`\`

2. Create the files above in their respective locations

3. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

4. Configure environment variables in \`.env.local\`

5. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

6. Open http://localhost:3000
`;
}

// ============================================================================
// WORKFLOW INTEGRATION
// ============================================================================

export interface WorkflowConfig {
  name: string;
  description?: string;
  trigger: 'form_submission' | 'manual' | 'schedule' | 'webhook';
  formSlug?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  type: 'mongodb_insert' | 'mongodb_update' | 'send_email' | 'http_request' | 'transform_data' | 'condition';
  config: Record<string, unknown>;
}

export function generateWorkflowIntegration(options: {
  formConfig: string;
  workflowType: 'save_to_mongodb' | 'send_notification' | 'full_pipeline';
  collectionName?: string;
  emailTo?: string;
}): string {
  const { workflowType, collectionName = 'submissions', emailTo } = options;
  // Note: formConfig is available in options if needed for future enhancements

  const baseCode = `import { createNetPadWorkflowClient } from '@netpad/workflows';
import { createNetPadClient } from '@netpad/forms';
import type { FormConfiguration } from '@netpad/forms';

// Initialize clients
const formsClient = createNetPadClient({
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL || '',
  apiKey: process.env.NETPAD_API_KEY || '',
});

const workflowClient = createNetPadWorkflowClient({
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL || '',
  apiKey: process.env.NETPAD_API_KEY || '',
  organizationId: process.env.NETPAD_ORG_ID || '',
});
`;

  if (workflowType === 'save_to_mongodb') {
    return `${baseCode}

// Form submission handler with workflow trigger
export async function handleFormSubmission(formData: Record<string, unknown>) {
  // 1. Submit the form
  const submission = await formsClient.submitForm('your-form-slug', formData);

  // 2. Trigger workflow to save to MongoDB
  const execution = await workflowClient.executeWorkflow('save-submission-workflow', {
    payload: {
      submissionId: submission.submissionId,
      data: formData,
      collection: '${collectionName}',
      timestamp: new Date().toISOString(),
    },
  });

  // 3. Wait for workflow completion
  const result = await workflowClient.waitForExecution(execution.executionId, {
    pollingInterval: 1000,
    timeout: 30000,
  });

  return {
    submissionId: submission.submissionId,
    workflowStatus: result.status,
    savedToCollection: '${collectionName}',
  };
}

// Example workflow configuration (create in NetPad dashboard)
const workflowConfig = {
  name: 'Save Form Submission',
  trigger: 'manual',
  steps: [
    {
      id: 'insert_document',
      type: 'mongodb_insert',
      config: {
        collection: '${collectionName}',
        document: '{{payload.data}}',
        addMetadata: true,
      },
    },
  ],
};
`;
  }

  if (workflowType === 'send_notification') {
    return `${baseCode}

// Form submission with email notification
export async function handleFormWithNotification(formData: Record<string, unknown>) {
  // 1. Submit the form
  const submission = await formsClient.submitForm('your-form-slug', formData);

  // 2. Trigger notification workflow
  const execution = await workflowClient.executeWorkflow('notify-on-submission', {
    payload: {
      submissionId: submission.submissionId,
      formData,
      notifyEmail: '${emailTo || '{{formData.email}}'}',
      submittedAt: new Date().toISOString(),
    },
  });

  // 3. Don't wait - notification runs async
  console.log('Notification workflow triggered:', execution.executionId);

  return {
    submissionId: submission.submissionId,
    notificationQueued: true,
  };
}

// Example notification workflow configuration
const notificationWorkflow = {
  name: 'Submission Notification',
  trigger: 'manual',
  steps: [
    {
      id: 'format_email',
      type: 'transform_data',
      config: {
        template: \`
          New form submission received!

          Submitted at: {{payload.submittedAt}}
          Submission ID: {{payload.submissionId}}

          Data:
          {{#each payload.formData}}
            {{@key}}: {{this}}
          {{/each}}
        \`,
      },
    },
    {
      id: 'send_email',
      type: 'send_email',
      config: {
        to: '{{payload.notifyEmail}}',
        subject: 'New Form Submission',
        body: '{{steps.format_email.output}}',
      },
    },
  ],
};
`;
  }

  // Full pipeline
  return `${baseCode}

// Complete form processing pipeline
export async function processFormSubmission(formData: Record<string, unknown>) {
  const results = {
    submissionId: '',
    savedToDb: false,
    notificationSent: false,
    errors: [] as string[],
  };

  try {
    // 1. Submit form to NetPad
    const submission = await formsClient.submitForm('your-form-slug', formData);
    results.submissionId = submission.submissionId;

    // 2. Execute processing workflow
    const execution = await workflowClient.executeWorkflow('process-submission', {
      payload: {
        submissionId: submission.submissionId,
        data: formData,
        collection: '${collectionName}',
        notifyEmail: formData.email || '${emailTo}',
        timestamp: new Date().toISOString(),
      },
    });

    // 3. Wait for completion with status updates
    const result = await workflowClient.waitForExecution(execution.executionId, {
      pollingInterval: 1000,
      timeout: 60000,
      onStatusChange: (status) => {
        console.log('Workflow status:', status);
      },
    });

    if (result.status === 'completed') {
      results.savedToDb = true;
      results.notificationSent = true;
    } else if (result.status === 'failed') {
      results.errors.push(result.error || 'Workflow failed');
    }

  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return results;
}

// Complete workflow configuration
const fullPipelineWorkflow = {
  name: 'Process Form Submission',
  trigger: 'manual',
  steps: [
    {
      id: 'validate_data',
      type: 'transform_data',
      config: {
        validation: {
          required: ['email'],
        },
      },
    },
    {
      id: 'save_to_mongodb',
      type: 'mongodb_insert',
      config: {
        collection: '{{payload.collection}}',
        document: {
          ...formData,
          _submissionId: '{{payload.submissionId}}',
          _createdAt: '{{payload.timestamp}}',
        },
      },
    },
    {
      id: 'send_confirmation',
      type: 'send_email',
      config: {
        to: '{{payload.notifyEmail}}',
        subject: 'Thank you for your submission',
        template: 'submission-confirmation',
        data: '{{payload.data}}',
      },
    },
    {
      id: 'notify_admin',
      type: 'send_email',
      config: {
        to: 'admin@yourcompany.com',
        subject: 'New submission received',
        body: 'Submission {{payload.submissionId}} saved to {{payload.collection}}',
      },
    },
  ],
};
`;
}

// ============================================================================
// MONGODB QUERY HELPERS
// ============================================================================

export function generateMongoDbQuery(options: {
  operation: 'find' | 'aggregate' | 'insert' | 'update' | 'delete';
  collection: string;
  description: string;
  formFields?: string[];
}): string {
  const { operation, collection, description, formFields = [] } = options;

  const fieldExamples = formFields.length > 0
    ? formFields.map(f => `  ${f}: "value"`).join(',\n')
    : '  field1: "value",\n  field2: 123';

  switch (operation) {
    case 'find':
      return `// Query: ${description}
// Collection: ${collection}

// Using MongoDB Node.js driver
const result = await db.collection('${collection}').find({
  // Filter criteria
${fieldExamples}
}).toArray();

// With projection (select specific fields)
const projected = await db.collection('${collection}').find(
  { status: 'active' },
  { projection: { name: 1, email: 1, _id: 0 } }
).toArray();

// With sorting and pagination
const paginated = await db.collection('${collection}')
  .find({})
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(20)
  .toArray();
`;

    case 'aggregate':
      return `// Aggregation: ${description}
// Collection: ${collection}

const pipeline = [
  // Stage 1: Match documents
  {
    $match: {
      status: 'completed',
      createdAt: { $gte: new Date('2024-01-01') }
    }
  },

  // Stage 2: Group and calculate
  {
    $group: {
      _id: '$category',
      count: { $sum: 1 },
      total: { $sum: '$amount' },
      avgAmount: { $avg: '$amount' }
    }
  },

  // Stage 3: Sort results
  {
    $sort: { count: -1 }
  },

  // Stage 4: Reshape output
  {
    $project: {
      category: '$_id',
      count: 1,
      total: { $round: ['$total', 2] },
      avgAmount: { $round: ['$avgAmount', 2] },
      _id: 0
    }
  }
];

const result = await db.collection('${collection}').aggregate(pipeline).toArray();
`;

    case 'insert':
      return `// Insert: ${description}
// Collection: ${collection}

// Insert single document
const insertResult = await db.collection('${collection}').insertOne({
${fieldExamples},
  createdAt: new Date(),
  updatedAt: new Date()
});

console.log('Inserted ID:', insertResult.insertedId);

// Insert multiple documents
const bulkInsert = await db.collection('${collection}').insertMany([
  { name: 'Item 1', value: 100 },
  { name: 'Item 2', value: 200 },
]);

console.log('Inserted count:', bulkInsert.insertedCount);
`;

    case 'update':
      return `// Update: ${description}
// Collection: ${collection}

// Update single document
const updateResult = await db.collection('${collection}').updateOne(
  { _id: new ObjectId('...') }, // Filter
  {
    $set: {
${fieldExamples},
      updatedAt: new Date()
    }
  }
);

// Update multiple documents
const bulkUpdate = await db.collection('${collection}').updateMany(
  { status: 'pending' }, // Filter
  {
    $set: { status: 'processed' },
    $inc: { processCount: 1 }
  }
);

// Upsert (insert if not exists)
const upsertResult = await db.collection('${collection}').updateOne(
  { email: 'user@example.com' },
  {
    $set: { lastLogin: new Date() },
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true }
);
`;

    case 'delete':
      return `// Delete: ${description}
// Collection: ${collection}

// Delete single document
const deleteResult = await db.collection('${collection}').deleteOne({
  _id: new ObjectId('...')
});

// Delete multiple documents
const bulkDelete = await db.collection('${collection}').deleteMany({
  status: 'archived',
  createdAt: { $lt: new Date('2023-01-01') }
});

// Soft delete (recommended pattern)
const softDelete = await db.collection('${collection}').updateOne(
  { _id: new ObjectId('...') },
  {
    $set: {
      deleted: true,
      deletedAt: new Date()
    }
  }
);
`;

    default:
      return `// Unknown operation: ${operation}`;
  }
}

// ============================================================================
// API INTEGRATION HELPERS
// ============================================================================

export function generateApiRoute(options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  formSlug?: string;
  includeAuth?: boolean;
}): string {
  const { method, path, formSlug, includeAuth = true } = options;

  const authCheck = includeAuth
    ? `
  // Verify authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
`
    : '';

  if (method === 'GET') {
    return `// app/api/${path}/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createNetPadClient } from '@netpad/forms';
${includeAuth ? "import { getSession } from '@/lib/auth';" : ''}

const client = createNetPadClient({
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL!,
  apiKey: process.env.NETPAD_API_KEY!,
});

export async function GET(request: NextRequest) {
  try {${authCheck}
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const submissions = await client.listSubmissions('${formSlug || 'your-form-slug'}', {
      page,
      pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return NextResponse.json(submissions);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
`;
  }

  if (method === 'POST') {
    return `// app/api/${path}/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createNetPadClient } from '@netpad/forms';
${includeAuth ? "import { getSession } from '@/lib/auth';" : ''}

const client = createNetPadClient({
  baseUrl: process.env.NEXT_PUBLIC_NETPAD_URL!,
  apiKey: process.env.NETPAD_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {${authCheck}
    const body = await request.json();

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await client.submitForm('${formSlug || 'your-form-slug'}', body, {
      source: 'api',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      submissionId: result.submissionId,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
`;
  }

  return `// API route for ${method} ${path}
// Implementation depends on specific requirements
`;
}

// ============================================================================
// BEST PRACTICES & PATTERNS
// ============================================================================

export const BEST_PRACTICES = {
  formDesign: `
## Form Design Best Practices

### 1. Field Organization
- Group related fields together using section headers
- Use fieldWidth to create visual hierarchy (full, half, third, quarter)
- Place the most important fields first
- Limit forms to 5-7 fields per page for multi-page wizards

### 2. Validation
- Always validate email fields with the 'email' type
- Use minLength/maxLength for text fields
- Provide clear error messages with the errorMessage property
- Make only truly required fields required

### 3. User Experience
- Use placeholder text to show expected format
- Add helpText for complex fields
- Use conditional logic to reduce clutter
- Provide progress indicators for long forms

### 4. Data Structure
- Use dot notation for nested data (e.g., address.city)
- Keep field paths consistent with your database schema
- Use meaningful path names for better data analysis

### 5. Performance
- Load forms asynchronously in Next.js with dynamic imports
- Use the NetPad client for server-side form fetching
- Implement proper error boundaries
`,

  workflowPatterns: `
## Workflow Integration Patterns

### 1. Form → Database Pattern
\`\`\`
Form Submission → Workflow Trigger → MongoDB Insert → Confirmation Email
\`\`\`

### 2. Approval Workflow Pattern
\`\`\`
Form Submission → Save as Draft → Notify Approver → Wait for Approval → Process/Reject
\`\`\`

### 3. Multi-Step Processing Pattern
\`\`\`
Form → Validate → Enrich Data → Save → Notify → Analytics Update
\`\`\`

### 4. Error Handling
- Always wrap workflow executions in try/catch
- Use waitForExecution with reasonable timeouts
- Implement retry logic for transient failures
- Log execution IDs for debugging

### 5. Async vs Sync
- Use waitForExecution when you need the result immediately
- Fire-and-forget for notifications and analytics
- Consider user experience - show loading states
`,

  securityGuidelines: `
## Security Guidelines

### 1. API Keys
- Never expose API keys in client-side code
- Use NETPAD_API_KEY for server-side, NEXT_PUBLIC_* only for non-sensitive config
- Rotate keys periodically
- Use test keys (np_test_*) in development

### 2. Data Validation
- Always validate on the server, never trust client data
- Sanitize user input before storing
- Use Zod or similar for type-safe validation

### 3. Authentication
- Protect sensitive form endpoints with authentication
- Use session-based auth for user-facing forms
- Use API keys for service-to-service communication

### 4. Data Privacy
- Don't log sensitive form data
- Implement data retention policies
- Support GDPR deletion requests
- Encrypt sensitive fields at rest
`,

  troubleshooting: `
## Troubleshooting Guide

### Form Not Rendering
1. Check that all peer dependencies are installed (@mui/material, @emotion/*)
2. Verify the form config is valid JSON
3. Check browser console for errors
4. Ensure the FormRenderer is wrapped in a ThemeProvider

### Submissions Failing
1. Verify API key is correct and has write permissions
2. Check network tab for API errors
3. Ensure required fields are provided
4. Check if form is published (not draft)

### Workflow Not Executing
1. Verify workflow is in 'active' status
2. Check execution payload matches expected format
3. Review workflow logs in NetPad dashboard
4. Ensure organizationId is set in workflow client

### Conditional Logic Not Working
1. Verify field paths match exactly (case-sensitive)
2. Check operator is appropriate for field type
3. Test with simple conditions first
4. Use browser dev tools to inspect form state

### Common Error Codes
- 401: Invalid or missing API key
- 403: Insufficient permissions
- 404: Form or workflow not found
- 422: Validation error in submission data
- 500: Server error - check logs
`,
};

// ============================================================================
// USE CASE TEMPLATES
// ============================================================================

export const USE_CASE_TEMPLATES = {
  leadCapture: {
    name: 'Lead Capture Form',
    description: 'Capture leads with automatic CRM integration',
    formConfig: {
      name: 'Lead Capture',
      fieldConfigs: [
        { path: 'firstName', label: 'First Name', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
        { path: 'lastName', label: 'Last Name', type: 'short_text', included: true, required: true, fieldWidth: 'half' },
        { path: 'email', label: 'Work Email', type: 'email', included: true, required: true },
        { path: 'company', label: 'Company', type: 'short_text', included: true, required: true },
        { path: 'jobTitle', label: 'Job Title', type: 'short_text', included: true },
        { path: 'companySize', label: 'Company Size', type: 'dropdown', included: true, options: [
          { label: '1-10', value: '1-10' },
          { label: '11-50', value: '11-50' },
          { label: '51-200', value: '51-200' },
          { label: '201-1000', value: '201-1000' },
          { label: '1000+', value: '1000+' },
        ]},
        { path: 'interest', label: 'What are you interested in?', type: 'checkboxes', included: true, options: [
          { label: 'Product Demo', value: 'demo' },
          { label: 'Pricing', value: 'pricing' },
          { label: 'Technical Documentation', value: 'docs' },
          { label: 'Partnership', value: 'partnership' },
        ]},
        { path: 'message', label: 'How can we help?', type: 'long_text', included: true },
      ],
      submitButtonText: 'Get in Touch',
      successMessage: 'Thanks! We\'ll be in touch within 24 hours.',
    },
    workflow: 'save_to_crm_and_notify_sales',
  },

  eventRegistration: {
    name: 'Event Registration',
    description: 'Event registration with ticket selection and payment',
    formConfig: {
      name: 'Event Registration',
      fieldConfigs: [
        { path: 'attendeeHeader', label: '', type: 'section-header', included: true, layout: { type: 'section-header', title: 'Attendee Information' } },
        { path: 'name', label: 'Full Name', type: 'short_text', included: true, required: true },
        { path: 'email', label: 'Email', type: 'email', included: true, required: true },
        { path: 'phone', label: 'Phone', type: 'phone', included: true },
        { path: 'organization', label: 'Organization', type: 'short_text', included: true },
        { path: 'ticketHeader', label: '', type: 'section-header', included: true, layout: { type: 'section-header', title: 'Ticket Selection' } },
        { path: 'ticketType', label: 'Ticket Type', type: 'radio', included: true, required: true, options: [
          { label: 'General Admission - $99', value: 'general' },
          { label: 'VIP - $249', value: 'vip' },
          { label: 'Student - $49', value: 'student' },
        ]},
        { path: 'quantity', label: 'Number of Tickets', type: 'number', included: true, required: true, defaultValue: 1, validation: { min: 1, max: 10 } },
        { path: 'dietaryHeader', label: '', type: 'section-header', included: true, layout: { type: 'section-header', title: 'Dietary Requirements' } },
        { path: 'dietary', label: 'Dietary Restrictions', type: 'checkboxes', included: true, options: [
          { label: 'Vegetarian', value: 'vegetarian' },
          { label: 'Vegan', value: 'vegan' },
          { label: 'Gluten-Free', value: 'gluten-free' },
          { label: 'Halal', value: 'halal' },
          { label: 'Kosher', value: 'kosher' },
        ]},
        { path: 'dietaryOther', label: 'Other dietary requirements', type: 'short_text', included: true },
      ],
      submitButtonText: 'Register Now',
    },
    workflow: 'process_registration_and_send_confirmation',
  },

  feedbackSurvey: {
    name: 'Customer Feedback Survey',
    description: 'Multi-page feedback survey with NPS',
    formConfig: {
      name: 'Customer Feedback',
      multiPage: {
        enabled: true,
        showProgressBar: true,
        pages: [
          { id: 'rating', title: 'Your Experience', fields: ['overallRating', 'nps', 'recommend'] },
          { id: 'details', title: 'Tell Us More', fields: ['liked', 'improve', 'features'] },
          { id: 'contact', title: 'Stay in Touch', fields: ['name', 'email', 'canContact'] },
        ],
      },
      fieldConfigs: [
        { path: 'overallRating', label: 'How would you rate your overall experience?', type: 'rating', included: true, required: true },
        { path: 'nps', label: 'How likely are you to recommend us to a friend or colleague?', type: 'nps', included: true, required: true },
        { path: 'recommend', label: 'Would you use our service again?', type: 'yes_no', included: true },
        { path: 'liked', label: 'What did you like most?', type: 'long_text', included: true },
        { path: 'improve', label: 'What could we improve?', type: 'long_text', included: true },
        { path: 'features', label: 'Which features do you use most?', type: 'checkboxes', included: true, options: [
          { label: 'Feature A', value: 'a' },
          { label: 'Feature B', value: 'b' },
          { label: 'Feature C', value: 'c' },
        ]},
        { path: 'name', label: 'Name (optional)', type: 'short_text', included: true },
        { path: 'email', label: 'Email (optional)', type: 'email', included: true },
        { path: 'canContact', label: 'May we contact you for follow-up?', type: 'yes_no', included: true },
      ],
      submitButtonText: 'Submit Feedback',
      successMessage: 'Thank you for your feedback!',
    },
    workflow: 'save_feedback_and_analyze',
  },
};
