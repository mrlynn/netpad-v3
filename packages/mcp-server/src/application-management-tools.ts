/**
 * Application Management Tools for NetPad MCP Server
 *
 * Phase 1 of MCP Server 2.0 update - Application Management tools
 * Provides AI-assisted application creation, templating, releases, and contracts.
 */

// ============================================================================
// APPLICATION TEMPLATES
// ============================================================================

/**
 * Available application templates for scaffolding new applications
 */
export const APPLICATION_TEMPLATES = {
  'contact-form': {
    id: 'contact-form',
    name: 'Contact Form Application',
    description: 'Simple contact form with email notification workflow',
    category: 'lead-generation',
    tags: ['contact', 'leads', 'simple'],
    structure: {
      forms: [
        {
          name: 'Contact Form',
          slug: 'contact',
          role: 'primary',
          fields: [
            { path: 'name', label: 'Full Name', type: 'short_text', required: true },
            { path: 'email', label: 'Email', type: 'email', required: true },
            { path: 'phone', label: 'Phone', type: 'phone', required: false },
            { path: 'message', label: 'Message', type: 'long_text', required: true },
          ],
        },
      ],
      workflows: [
        {
          name: 'Notify on Submission',
          trigger: 'form_submission',
          steps: ['save_to_database', 'send_email_notification'],
        },
      ],
    },
  },
  'lead-capture': {
    id: 'lead-capture',
    name: 'Lead Capture Application',
    description: 'Lead capture with qualification workflow and CRM integration',
    category: 'lead-generation',
    tags: ['leads', 'crm', 'qualification'],
    structure: {
      forms: [
        {
          name: 'Lead Capture Form',
          slug: 'lead-form',
          role: 'primary',
          fields: [
            { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
            { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
            { path: 'email', label: 'Work Email', type: 'email', required: true },
            { path: 'company', label: 'Company', type: 'short_text', required: true },
            { path: 'jobTitle', label: 'Job Title', type: 'short_text', required: false },
            { path: 'companySize', label: 'Company Size', type: 'dropdown', required: false, options: [
              { label: '1-10', value: '1-10' },
              { label: '11-50', value: '11-50' },
              { label: '51-200', value: '51-200' },
              { label: '201-1000', value: '201-1000' },
              { label: '1000+', value: '1000+' },
            ]},
            { path: 'interest', label: 'What are you interested in?', type: 'checkboxes', options: [
              { label: 'Product Demo', value: 'demo' },
              { label: 'Pricing', value: 'pricing' },
              { label: 'Technical Documentation', value: 'docs' },
            ]},
          ],
        },
      ],
      workflows: [
        {
          name: 'Lead Processing',
          trigger: 'form_submission',
          steps: ['save_to_database', 'qualify_lead', 'send_to_crm', 'send_email_notification'],
        },
      ],
    },
  },
  'event-registration': {
    id: 'event-registration',
    name: 'Event Registration Application',
    description: 'Event registration with ticket selection and confirmation',
    category: 'events',
    tags: ['events', 'registration', 'tickets'],
    structure: {
      forms: [
        {
          name: 'Event Registration',
          slug: 'register',
          role: 'primary',
          fields: [
            { path: 'name', label: 'Full Name', type: 'short_text', required: true },
            { path: 'email', label: 'Email', type: 'email', required: true },
            { path: 'phone', label: 'Phone', type: 'phone', required: false },
            { path: 'organization', label: 'Organization', type: 'short_text', required: false },
            { path: 'ticketType', label: 'Ticket Type', type: 'radio', required: true, options: [
              { label: 'General Admission', value: 'general' },
              { label: 'VIP', value: 'vip' },
              { label: 'Student', value: 'student' },
            ]},
            { path: 'quantity', label: 'Number of Tickets', type: 'number', required: true, validation: { min: 1, max: 10 } },
            { path: 'dietary', label: 'Dietary Restrictions', type: 'checkboxes', options: [
              { label: 'Vegetarian', value: 'vegetarian' },
              { label: 'Vegan', value: 'vegan' },
              { label: 'Gluten-Free', value: 'gluten-free' },
            ]},
          ],
        },
      ],
      workflows: [
        {
          name: 'Registration Processing',
          trigger: 'form_submission',
          steps: ['save_to_database', 'send_confirmation_email', 'add_to_attendee_list'],
        },
      ],
    },
  },
  'feedback-survey': {
    id: 'feedback-survey',
    name: 'Feedback Survey Application',
    description: 'Multi-page customer feedback survey with NPS',
    category: 'surveys',
    tags: ['survey', 'feedback', 'nps'],
    structure: {
      forms: [
        {
          name: 'Customer Feedback',
          slug: 'feedback',
          role: 'primary',
          multiPage: true,
          pages: [
            { id: 'rating', title: 'Your Experience', fields: ['overallRating', 'nps'] },
            { id: 'details', title: 'Tell Us More', fields: ['liked', 'improve'] },
            { id: 'contact', title: 'Stay in Touch', fields: ['name', 'email', 'canContact'] },
          ],
          fields: [
            { path: 'overallRating', label: 'How would you rate your overall experience?', type: 'rating', required: true },
            { path: 'nps', label: 'How likely are you to recommend us?', type: 'nps', required: true },
            { path: 'liked', label: 'What did you like most?', type: 'long_text', required: false },
            { path: 'improve', label: 'What could we improve?', type: 'long_text', required: false },
            { path: 'name', label: 'Name (optional)', type: 'short_text', required: false },
            { path: 'email', label: 'Email (optional)', type: 'email', required: false },
            { path: 'canContact', label: 'May we contact you for follow-up?', type: 'yes_no', required: false },
          ],
        },
      ],
      workflows: [
        {
          name: 'Feedback Processing',
          trigger: 'form_submission',
          steps: ['save_to_database', 'calculate_nps_metrics', 'notify_on_low_score'],
        },
      ],
    },
  },
  'job-application': {
    id: 'job-application',
    name: 'Job Application Application',
    description: 'Job application with resume collection and applicant tracking',
    category: 'hr',
    tags: ['hr', 'recruiting', 'applications'],
    structure: {
      forms: [
        {
          name: 'Job Application',
          slug: 'apply',
          role: 'primary',
          multiPage: true,
          pages: [
            { id: 'personal', title: 'Personal Information', fields: ['firstName', 'lastName', 'email', 'phone'] },
            { id: 'experience', title: 'Experience', fields: ['position', 'yearsExperience', 'currentEmployer'] },
            { id: 'additional', title: 'Additional Information', fields: ['startDate', 'salary', 'coverLetter'] },
          ],
          fields: [
            { path: 'firstName', label: 'First Name', type: 'short_text', required: true, fieldWidth: 'half' },
            { path: 'lastName', label: 'Last Name', type: 'short_text', required: true, fieldWidth: 'half' },
            { path: 'email', label: 'Email', type: 'email', required: true },
            { path: 'phone', label: 'Phone', type: 'phone', required: true },
            { path: 'position', label: 'Position Applied For', type: 'dropdown', required: true },
            { path: 'yearsExperience', label: 'Years of Experience', type: 'number', required: true },
            { path: 'currentEmployer', label: 'Current Employer', type: 'short_text', required: false },
            { path: 'startDate', label: 'Available Start Date', type: 'date', required: false },
            { path: 'salary', label: 'Expected Salary', type: 'number', required: false },
            { path: 'coverLetter', label: 'Cover Letter', type: 'long_text', required: false },
          ],
        },
      ],
      workflows: [
        {
          name: 'Application Processing',
          trigger: 'form_submission',
          steps: ['save_to_database', 'send_confirmation', 'notify_hr'],
        },
      ],
    },
  },
  'order-form': {
    id: 'order-form',
    name: 'Order Form Application',
    description: 'Product order form with computed totals and shipping',
    category: 'ecommerce',
    tags: ['orders', 'ecommerce', 'computed-fields'],
    structure: {
      forms: [
        {
          name: 'Order Form',
          slug: 'order',
          role: 'primary',
          fields: [
            { path: 'product', label: 'Product', type: 'dropdown', required: true },
            { path: 'quantity', label: 'Quantity', type: 'number', required: true, validation: { min: 1, max: 100 } },
            { path: 'unitPrice', label: 'Unit Price', type: 'number', required: true },
            { path: 'subtotal', label: 'Subtotal', type: 'number', computed: true, formula: 'quantity * unitPrice' },
            { path: 'shipping.address', label: 'Shipping Address', type: 'short_text', required: true },
            { path: 'shipping.city', label: 'City', type: 'short_text', required: true, fieldWidth: 'half' },
            { path: 'shipping.zip', label: 'ZIP', type: 'short_text', required: true, fieldWidth: 'half' },
            { path: 'notes', label: 'Order Notes', type: 'long_text', required: false },
          ],
        },
      ],
      workflows: [
        {
          name: 'Order Processing',
          trigger: 'form_submission',
          steps: ['save_to_database', 'send_order_confirmation', 'notify_fulfillment'],
        },
      ],
    },
  },
  'blank': {
    id: 'blank',
    name: 'Blank Application',
    description: 'Start from scratch with no pre-configured forms or workflows',
    category: 'general',
    tags: ['blank', 'custom'],
    structure: {
      forms: [],
      workflows: [],
    },
  },
};

export type ApplicationTemplateId = keyof typeof APPLICATION_TEMPLATES;

// ============================================================================
// APPLICATION CREATION
// ============================================================================

export interface CreateApplicationOptions {
  name: string;
  description?: string;
  slug?: string;
  templateId?: ApplicationTemplateId;
  icon?: string;
  color?: string;
  tags?: string[];
  projectId: string;
  organizationId: string;
}

/**
 * Generate application creation code for NetPad API
 */
export function generateCreateApplicationCode(options: CreateApplicationOptions): string {
  const { name, description, slug, templateId, icon, color, tags, projectId, organizationId } = options;
  const template = templateId ? APPLICATION_TEMPLATES[templateId] : null;

  let code = `// Create a new NetPad application
// Using: NetPad Platform API

const applicationData = {
  name: '${name}',
  ${description ? `description: '${description}',` : ''}
  ${slug ? `slug: '${slug}',` : ''}
  ${icon ? `icon: '${icon}',` : ''}
  ${color ? `color: '${color}',` : ''}
  ${tags && tags.length > 0 ? `tags: ${JSON.stringify(tags)},` : ''}
  projectId: '${projectId}',
  organizationId: '${organizationId}',
};

// API call to create application
const response = await fetch('/api/applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(applicationData),
});

const { application } = await response.json();
console.log('Created application:', application.applicationId);
`;

  if (template && template.structure.forms.length > 0) {
    code += `
// Create forms from template: ${template.name}
`;
    for (const form of template.structure.forms) {
      code += `
// Create form: ${form.name}
const ${form.slug.replace(/-/g, '')}FormData = {
  name: '${form.name}',
  slug: '${form.slug}',
  applicationId: application.applicationId,
  projectId: '${projectId}',
  organizationId: '${organizationId}',
  fieldConfigs: ${JSON.stringify(form.fields, null, 2)},
  ${(form as any).multiPage ? `multiPage: { enabled: true, pages: ${JSON.stringify((form as any).pages)} },` : ''}
};

await fetch('/api/forms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(${form.slug.replace(/-/g, '')}FormData),
});
`;
    }
  }

  if (template && template.structure.workflows.length > 0) {
    code += `
// Create workflows from template
`;
    for (const workflow of template.structure.workflows) {
      code += `
// Workflow: ${workflow.name}
// Trigger: ${workflow.trigger}
// Steps: ${workflow.steps.join(' -> ')}
// Note: Create workflow in NetPad UI or via API with full node configuration
`;
    }
  }

  return code;
}

/**
 * Generate application JSON configuration
 */
export function generateApplicationConfig(options: CreateApplicationOptions): object {
  const { name, description, slug, templateId, icon, color, tags } = options;
  const template = templateId ? APPLICATION_TEMPLATES[templateId] : null;

  const config: any = {
    application: {
      name,
      description: description || (template ? template.description : ''),
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon,
      color,
      tags: tags || (template ? template.tags : []),
      version: '1.0.0',
    },
  };

  if (template) {
    config.template = {
      id: template.id,
      name: template.name,
      category: template.category,
    };
    config.forms = template.structure.forms;
    config.workflows = template.structure.workflows;
  }

  return config;
}

// ============================================================================
// APPLICATION CONTRACT GENERATION
// ============================================================================

export interface ContractInput {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  source?: 'form' | 'api' | 'webhook' | 'config';
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface ContractOutput {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  guaranteed: boolean;
  description?: string;
}

export interface ContractSideEffect {
  type: 'write' | 'api_call' | 'notification' | 'workflow_trigger';
  target: string;
  description?: string;
}

export interface ContractEvent {
  name: string;
  description?: string;
  payloadSchema?: Record<string, any>;
}

export interface GenerateContractOptions {
  applicationId: string;
  version: string;
  inputs?: ContractInput[];
  outputs?: ContractOutput[];
  sideEffects?: ContractSideEffect[];
  events?: ContractEvent[];
  stabilityPromises?: {
    inputs?: boolean;
    outputs?: boolean;
    sideEffects?: boolean;
    events?: boolean;
  };
}

/**
 * Generate application contract JSON
 */
export function generateApplicationContract(options: GenerateContractOptions): object {
  const {
    applicationId,
    version,
    inputs = [],
    outputs = [],
    sideEffects = [],
    events = [],
    stabilityPromises = { inputs: true, outputs: true, sideEffects: true, events: true }
  } = options;

  // Convert arrays to objects for inputs/outputs
  const inputsObj: Record<string, any> = {};
  for (const input of inputs) {
    inputsObj[input.key] = {
      type: input.type,
      required: input.required,
      description: input.description,
      source: input.source,
      constraints: input.constraints,
    };
  }

  const outputsObj: Record<string, any> = {};
  for (const output of outputs) {
    outputsObj[output.key] = {
      type: output.type,
      guaranteed: output.guaranteed,
      description: output.description,
    };
  }

  return {
    applicationId,
    version,
    status: 'draft',
    inputs: inputsObj,
    outputs: outputsObj,
    sideEffects,
    events,
    behaviors: [],
    stability: stabilityPromises,
  };
}

/**
 * Generate contract from form configuration (helper for inferring contract from forms)
 */
export function generateContractFromForms(
  applicationId: string,
  version: string,
  forms: Array<{ name: string; slug: string; fields: any[] }>
): object {
  const inputs: ContractInput[] = [];

  for (const form of forms) {
    for (const field of form.fields) {
      inputs.push({
        key: field.path,
        type: inferContractType(field.type),
        required: field.required || false,
        description: field.label,
        source: 'form',
      });
    }
  }

  // Default outputs for form submissions
  const outputs: ContractOutput[] = [
    { key: 'submissionId', type: 'string', guaranteed: true, description: 'Unique submission identifier' },
    { key: 'submittedAt', type: 'string', guaranteed: true, description: 'ISO timestamp of submission' },
    { key: 'formData', type: 'object', guaranteed: true, description: 'Submitted form data' },
  ];

  // Default side effects
  const sideEffects: ContractSideEffect[] = [
    { type: 'write', target: 'submissions', description: 'Save submission to database' },
  ];

  return generateApplicationContract({
    applicationId,
    version,
    inputs,
    outputs,
    sideEffects,
  });
}

/**
 * Infer contract type from form field type
 */
function inferContractType(fieldType: string): 'string' | 'number' | 'boolean' | 'object' | 'array' {
  switch (fieldType) {
    case 'number':
    case 'scale':
    case 'slider':
    case 'rating':
    case 'nps':
      return 'number';
    case 'boolean':
    case 'yes_no':
    case 'switch':
    case 'checkbox':
      return 'boolean';
    case 'checkboxes':
    case 'checkbox-group':
    case 'tags':
      return 'array';
    default:
      return 'string';
  }
}

// ============================================================================
// APPLICATION RELEASE GENERATION
// ============================================================================

export interface GenerateReleaseOptions {
  applicationId: string;
  version: string;
  changelog?: string;
  forms?: Array<{ formId: string; role: 'primary' | 'secondary' }>;
  workflows?: Array<{ workflowId: string; role: 'core' | 'extension' }>;
  contractId?: string;
}

/**
 * Generate application release manifest
 */
export function generateApplicationRelease(options: GenerateReleaseOptions): object {
  const { applicationId, version, changelog, forms = [], workflows = [], contractId } = options;

  return {
    releaseId: `rel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    applicationId,
    version,
    contractId: contractId || '',
    changelog: changelog || `Release ${version}`,
    manifest: {
      forms,
      workflows,
      configSchemaId: '',
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate release creation code
 */
export function generateReleaseCreationCode(options: GenerateReleaseOptions): string {
  const { applicationId, version, changelog } = options;

  return `// Create a new application release
// Using: NetPad Platform API

const releaseData = {
  applicationId: '${applicationId}',
  version: '${version}',
  changelog: '${changelog || `Release ${version}`}',
  validateContract: true, // Validate contract before release
  requireContract: false, // Set to true to require contract
  allowBreakingChanges: false, // Set to true to allow breaking changes
};

const response = await fetch(\`/api/applications/\${releaseData.applicationId}/releases\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(releaseData),
});

const { release, validation } = await response.json();
console.log('Created release:', release.releaseId);
if (validation) {
  console.log('Contract validation:', validation.valid ? 'Passed' : 'Failed');
  if (validation.warnings?.length > 0) {
    console.log('Warnings:', validation.warnings);
  }
}
`;
}

// ============================================================================
// APPLICATION EXPORT
// ============================================================================

/**
 * Generate application export bundle structure
 */
export function generateExportBundleStructure(applicationName: string): object {
  return {
    bundleFormat: 'netpad-application-bundle',
    bundleVersion: '1.0.0',
    application: {
      name: applicationName,
      version: '1.0.0',
      // Application metadata will be filled in
    },
    components: {
      forms: [],
      workflows: [],
    },
    config: {
      schema: {},
      defaults: {},
    },
    dependencies: {
      connections: [],
      integrations: [],
    },
    export: {
      createdAt: new Date().toISOString(),
      exportedBy: '',
    },
  };
}
