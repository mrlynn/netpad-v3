/**
 * Conversational & Search Forms Tools for NetPad MCP Server
 *
 * Phase 4 of MCP Server 2.0 update - Conversational & Search Forms
 * Provides tools for creating AI-powered conversational forms and search interfaces.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationalFormOptions {
  name: string;
  description?: string;
  objective: string;
  context?: string;
  templateId?: string;
  persona: {
    style: 'professional' | 'friendly' | 'casual' | 'empathetic' | 'custom';
    tone?: string;
    behaviors?: string[];
    restrictions?: string[];
  };
  topics: Array<{
    id: string;
    name: string;
    description: string;
    priority: 'required' | 'important' | 'optional';
    depth: 'surface' | 'moderate' | 'deep';
    extractionField?: string;
  }>;
  extractionSchema: Array<{
    field: string;
    type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'file';
    required: boolean;
    description: string;
    options?: string[];
    topicId?: string;
  }>;
  conversationLimits?: {
    maxTurns?: number;
    maxDuration?: number;
    minConfidence?: number;
  };
  projectId: string;
  organizationId: string;
  applicationId?: string;
}

export interface RAGConfigOptions {
  formId: string;
  enabled: boolean;
  documentIds?: string[];
  retrievalConfig?: {
    maxChunks?: number;
    minScore?: number;
    retrievalThreshold?: number;
  };
}

export interface SearchFormOptions {
  name: string;
  description?: string;
  connectionId: string;
  database: string;
  collection: string;
  fields: Array<{
    path: string;
    label: string;
    type: string;
    operators: string[];
    defaultOperator: string;
    showInResults: boolean;
    resultOrder?: number;
    optionsSource?: {
      type: 'static' | 'distinct' | 'lookup';
      showCounts?: boolean;
    };
  }>;
  resultsConfig?: {
    layout?: 'table' | 'cards' | 'list';
    pageSize?: number;
    allowView?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
    allowExport?: boolean;
    defaultSortField?: string;
    defaultSortDirection?: 'asc' | 'desc';
  };
  projectId: string;
  organizationId: string;
  applicationId?: string;
}

// ============================================================================
// CONVERSATIONAL FORM TEMPLATES
// ============================================================================

export const CONVERSATIONAL_TEMPLATES = {
  'it-helpdesk': {
    id: 'it-helpdesk',
    name: 'IT Helpdesk',
    description: 'Gather IT support ticket information through natural conversation',
    category: 'support',
    tags: ['it', 'helpdesk', 'support', 'tickets'],
    defaultConfig: {
      objective: 'Gather comprehensive information about the IT issue to create a support ticket',
      persona: {
        style: 'professional' as const,
        tone: 'helpful and patient',
        behaviors: ['Ask clarifying questions', 'Acknowledge user frustration', 'Offer basic troubleshooting tips'],
        restrictions: ['Do not promise resolution times', 'Do not access any systems'],
      },
      topics: [
        { id: 'issue', name: 'Issue Description', description: 'What problem is the user experiencing?', priority: 'required' as const, depth: 'deep' as const, extractionField: 'issueDescription' },
        { id: 'category', name: 'Category', description: 'What type of issue is this?', priority: 'required' as const, depth: 'surface' as const, extractionField: 'category' },
        { id: 'urgency', name: 'Urgency', description: 'How urgent is this issue?', priority: 'important' as const, depth: 'surface' as const, extractionField: 'urgency' },
        { id: 'steps', name: 'Steps Tried', description: 'What has the user already tried?', priority: 'optional' as const, depth: 'moderate' as const, extractionField: 'stepsTried' },
      ],
      extractionSchema: [
        { field: 'issueDescription', type: 'string' as const, required: true, description: 'Detailed description of the IT issue' },
        { field: 'category', type: 'enum' as const, required: true, description: 'Issue category', options: ['Hardware', 'Software', 'Network', 'Account', 'Other'] },
        { field: 'urgency', type: 'enum' as const, required: true, description: 'Urgency level', options: ['Low', 'Medium', 'High', 'Critical'] },
        { field: 'affectedSystems', type: 'array' as const, required: false, description: 'Systems affected by the issue' },
        { field: 'stepsTried', type: 'string' as const, required: false, description: 'Steps the user has already tried' },
      ],
      conversationLimits: { maxTurns: 10, maxDuration: 15, minConfidence: 0.7 },
    },
  },
  'customer-feedback': {
    id: 'customer-feedback',
    name: 'Customer Feedback',
    description: 'Collect detailed customer feedback through friendly conversation',
    category: 'feedback',
    tags: ['feedback', 'nps', 'survey', 'customer'],
    defaultConfig: {
      objective: 'Gather comprehensive feedback about the customer experience',
      persona: {
        style: 'friendly' as const,
        tone: 'warm and appreciative',
        behaviors: ['Thank customer for their time', 'Show genuine interest', 'Ask follow-up questions'],
        restrictions: ['Do not be defensive about criticism', 'Do not promise changes'],
      },
      topics: [
        { id: 'satisfaction', name: 'Overall Satisfaction', description: 'How satisfied is the customer overall?', priority: 'required' as const, depth: 'moderate' as const, extractionField: 'overallSatisfaction' },
        { id: 'highlights', name: 'Positive Aspects', description: 'What did the customer like?', priority: 'important' as const, depth: 'deep' as const, extractionField: 'highlights' },
        { id: 'improvements', name: 'Areas for Improvement', description: 'What could be better?', priority: 'important' as const, depth: 'deep' as const, extractionField: 'improvements' },
        { id: 'recommend', name: 'Recommendation', description: 'Would they recommend us?', priority: 'required' as const, depth: 'surface' as const, extractionField: 'npsScore' },
      ],
      extractionSchema: [
        { field: 'overallSatisfaction', type: 'number' as const, required: true, description: 'Satisfaction rating 1-10' },
        { field: 'highlights', type: 'array' as const, required: false, description: 'Positive aspects mentioned' },
        { field: 'improvements', type: 'array' as const, required: false, description: 'Suggested improvements' },
        { field: 'npsScore', type: 'number' as const, required: true, description: 'NPS score 0-10' },
        { field: 'verbatimFeedback', type: 'string' as const, required: false, description: 'Additional comments' },
      ],
      conversationLimits: { maxTurns: 8, maxDuration: 10, minConfidence: 0.8 },
    },
  },
  'lead-qualification': {
    id: 'lead-qualification',
    name: 'Lead Qualification',
    description: 'Qualify sales leads through conversational intake',
    category: 'intake',
    tags: ['sales', 'leads', 'qualification', 'crm'],
    defaultConfig: {
      objective: 'Qualify the lead and gather information for sales follow-up',
      persona: {
        style: 'professional' as const,
        tone: 'consultative and helpful',
        behaviors: ['Focus on understanding needs', 'Provide relevant information', 'Be responsive to questions'],
        restrictions: ['Do not pressure or be pushy', 'Do not quote prices without authorization'],
      },
      topics: [
        { id: 'needs', name: 'Business Needs', description: 'What problem are they trying to solve?', priority: 'required' as const, depth: 'deep' as const, extractionField: 'businessNeeds' },
        { id: 'budget', name: 'Budget', description: 'What is their budget range?', priority: 'important' as const, depth: 'moderate' as const, extractionField: 'budgetRange' },
        { id: 'timeline', name: 'Timeline', description: 'When do they need a solution?', priority: 'important' as const, depth: 'surface' as const, extractionField: 'timeline' },
        { id: 'authority', name: 'Decision Making', description: 'Who is involved in the decision?', priority: 'important' as const, depth: 'moderate' as const, extractionField: 'decisionMakers' },
      ],
      extractionSchema: [
        { field: 'companyName', type: 'string' as const, required: true, description: 'Company name' },
        { field: 'contactName', type: 'string' as const, required: true, description: 'Contact name' },
        { field: 'businessNeeds', type: 'string' as const, required: true, description: 'Business needs description' },
        { field: 'budgetRange', type: 'enum' as const, required: false, description: 'Budget range', options: ['Under $10k', '$10k-$50k', '$50k-$100k', 'Over $100k'] },
        { field: 'timeline', type: 'enum' as const, required: false, description: 'Purchase timeline', options: ['Immediate', '1-3 months', '3-6 months', '6+ months'] },
        { field: 'decisionMakers', type: 'array' as const, required: false, description: 'Decision makers involved' },
        { field: 'qualificationScore', type: 'number' as const, required: false, description: 'Lead qualification score' },
      ],
      conversationLimits: { maxTurns: 12, maxDuration: 20, minConfidence: 0.75 },
    },
  },
  'patient-intake': {
    id: 'patient-intake',
    name: 'Patient Intake',
    description: 'Collect patient information through empathetic conversation',
    category: 'intake',
    tags: ['healthcare', 'patient', 'intake', 'medical'],
    defaultConfig: {
      objective: 'Gather patient information for their appointment',
      persona: {
        style: 'empathetic' as const,
        tone: 'caring and reassuring',
        behaviors: ['Show empathy', 'Be patient', 'Explain why information is needed'],
        restrictions: ['Do not provide medical advice', 'Do not diagnose', 'Maintain HIPAA compliance'],
      },
      topics: [
        { id: 'symptoms', name: 'Current Symptoms', description: 'What symptoms are they experiencing?', priority: 'required' as const, depth: 'deep' as const, extractionField: 'symptoms' },
        { id: 'history', name: 'Medical History', description: 'Relevant medical history', priority: 'important' as const, depth: 'moderate' as const, extractionField: 'medicalHistory' },
        { id: 'medications', name: 'Current Medications', description: 'What medications are they taking?', priority: 'important' as const, depth: 'surface' as const, extractionField: 'medications' },
        { id: 'allergies', name: 'Allergies', description: 'Any known allergies?', priority: 'required' as const, depth: 'surface' as const, extractionField: 'allergies' },
      ],
      extractionSchema: [
        { field: 'symptoms', type: 'string' as const, required: true, description: 'Current symptoms description' },
        { field: 'symptomDuration', type: 'string' as const, required: true, description: 'How long symptoms have been present' },
        { field: 'symptomSeverity', type: 'enum' as const, required: true, description: 'Severity level', options: ['Mild', 'Moderate', 'Severe'] },
        { field: 'medicalHistory', type: 'array' as const, required: false, description: 'Relevant medical conditions' },
        { field: 'medications', type: 'array' as const, required: false, description: 'Current medications' },
        { field: 'allergies', type: 'array' as const, required: true, description: 'Known allergies' },
      ],
      conversationLimits: { maxTurns: 15, maxDuration: 20, minConfidence: 0.85 },
    },
  },
};

// ============================================================================
// SEARCH OPERATORS
// ============================================================================

export const SEARCH_OPERATORS = {
  string: [
    { id: 'equals', name: 'Equals', description: 'Exact match' },
    { id: 'contains', name: 'Contains', description: 'Contains substring (case-insensitive)' },
    { id: 'startsWith', name: 'Starts With', description: 'Starts with string' },
    { id: 'endsWith', name: 'Ends With', description: 'Ends with string' },
    { id: 'regex', name: 'Regex', description: 'Regular expression match' },
    { id: 'exists', name: 'Exists', description: 'Field exists' },
  ],
  number: [
    { id: 'equals', name: 'Equals', description: 'Exact match' },
    { id: 'greaterThan', name: 'Greater Than', description: '>' },
    { id: 'lessThan', name: 'Less Than', description: '<' },
    { id: 'greaterOrEqual', name: 'Greater or Equal', description: '>=' },
    { id: 'lessOrEqual', name: 'Less or Equal', description: '<=' },
    { id: 'between', name: 'Between', description: 'Range query' },
    { id: 'exists', name: 'Exists', description: 'Field exists' },
  ],
  date: [
    { id: 'equals', name: 'On Date', description: 'Exact date match' },
    { id: 'greaterThan', name: 'After', description: 'After date' },
    { id: 'lessThan', name: 'Before', description: 'Before date' },
    { id: 'between', name: 'Between', description: 'Date range' },
    { id: 'exists', name: 'Exists', description: 'Field exists' },
  ],
  enum: [
    { id: 'equals', name: 'Equals', description: 'Exact match' },
    { id: 'in', name: 'In', description: 'One of values' },
    { id: 'notIn', name: 'Not In', description: 'Not one of values' },
    { id: 'exists', name: 'Exists', description: 'Field exists' },
  ],
  boolean: [
    { id: 'equals', name: 'Is', description: 'True or false' },
    { id: 'exists', name: 'Exists', description: 'Field exists' },
  ],
};

// ============================================================================
// CODE GENERATORS
// ============================================================================

/**
 * Generate code for creating a conversational form
 */
export function generateCreateConversationalFormCode(options: ConversationalFormOptions): string {
  const { name, description, objective, context, persona, topics, extractionSchema, conversationLimits, projectId, organizationId, applicationId } = options;

  return `// Create a conversational form
// Using: NetPad Platform API

const formData = {
  name: '${name}',
  ${description ? `description: '${description}',` : ''}
  formType: 'conversational',
  projectId: '${projectId}',
  organizationId: '${organizationId}',
  ${applicationId ? `applicationId: '${applicationId}',` : ''}
  conversationalConfig: {
    formType: 'conversational',
    objective: \`${objective}\`,
    ${context ? `context: \`${context}\`,` : ''}
    persona: ${JSON.stringify(persona, null, 4)},
    topics: ${JSON.stringify(topics, null, 4)},
    extractionSchema: ${JSON.stringify(extractionSchema, null, 4)},
    conversationLimits: ${JSON.stringify(conversationLimits || { maxTurns: 10, maxDuration: 15, minConfidence: 0.7 }, null, 4)},
  },
};

const response = await fetch('/api/forms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(formData),
});

const { form } = await response.json();
console.log('Created conversational form:', form.formId);
`;
}

/**
 * Generate code for configuring RAG settings
 */
export function generateConfigureRAGCode(options: RAGConfigOptions): string {
  const { formId, enabled, documentIds, retrievalConfig } = options;

  return `// Configure RAG (Retrieval-Augmented Generation) for a conversational form
// Using: NetPad Platform API

const ragConfig = {
  enabled: ${enabled},
  documents: ${JSON.stringify(documentIds || [])},
  retrievalConfig: ${JSON.stringify(retrievalConfig || { maxChunks: 5, minScore: 0.7, retrievalThreshold: 0.5 }, null, 4)},
};

// Update form with RAG configuration
const response = await fetch(\`/api/forms/${formId}\`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    'conversationalConfig.rag': ragConfig,
  }),
});

const { form } = await response.json();
console.log('Updated RAG config for form:', form.formId);

// Upload documents for RAG (if needed)
/*
const uploadDocument = async (file: File, sourceType: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('formId', '${formId}');
  formData.append('sourceType', sourceType);

  const uploadResponse = await fetch('/api/rag/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
    },
    body: formData,
  });

  return uploadResponse.json();
};
*/
`;
}

/**
 * Generate code for adding a RAG document
 */
export function generateAddRAGDocumentCode(formId: string, options: { sourceType: string; title?: string; description?: string }): string {
  const { sourceType, title, description } = options;

  return `// Upload a document for RAG
// Using: NetPad Platform API

const formData = new FormData();
formData.append('file', fileInput.files[0]); // File from input
formData.append('formId', '${formId}');
formData.append('sourceType', '${sourceType}');
${title ? `formData.append('title', '${title}');` : ''}
${description ? `formData.append('description', '${description}');` : ''}

const response = await fetch('/api/rag/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: formData,
});

const { document, status } = await response.json();
console.log('Uploaded document:', document.documentId);
console.log('Processing status:', status);

// The document will be processed asynchronously
// Check status with:
const checkStatus = async () => {
  const statusResponse = await fetch(\`/api/rag/documents/\${document.documentId}/status\`, {
    headers: {
      'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
    },
  });
  return statusResponse.json();
};
`;
}

/**
 * Generate code for creating a search form
 */
export function generateCreateSearchFormCode(options: SearchFormOptions): string {
  const { name, description, connectionId, database, collection, fields, resultsConfig, projectId, organizationId, applicationId } = options;

  const searchFieldConfigs = fields.reduce((acc, field) => {
    acc[field.path] = {
      enabled: true,
      operators: field.operators,
      defaultOperator: field.defaultOperator,
      showInResults: field.showInResults,
      resultOrder: field.resultOrder,
      optionsSource: field.optionsSource,
    };
    return acc;
  }, {} as Record<string, any>);

  return `// Create a search form
// Using: NetPad Platform API

const formData = {
  name: '${name}',
  ${description ? `description: '${description}',` : ''}
  formType: 'search',
  projectId: '${projectId}',
  organizationId: '${organizationId}',
  ${applicationId ? `applicationId: '${applicationId}',` : ''}
  connectionId: '${connectionId}',
  database: '${database}',
  collection: '${collection}',
  fieldConfigs: ${JSON.stringify(fields.map(f => ({
    path: f.path,
    label: f.label,
    type: f.type,
    search: {
      enabled: true,
      operators: f.operators,
      defaultOperator: f.defaultOperator,
      showInResults: f.showInResults,
      resultOrder: f.resultOrder,
    },
  })), null, 4)},
  searchConfig: {
    enabled: true,
    fields: ${JSON.stringify(searchFieldConfigs, null, 4)},
    results: ${JSON.stringify(resultsConfig || {
      layout: 'table',
      pageSize: 25,
      pageSizeOptions: [10, 25, 50, 100],
      showPagination: true,
      allowView: true,
      allowEdit: true,
      allowDelete: false,
      allowExport: true,
      allowSorting: true,
      allowSelection: true,
      allowBulkActions: false,
    }, null, 4)},
  },
};

const response = await fetch('/api/forms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify(formData),
});

const { form } = await response.json();
console.log('Created search form:', form.formId);
`;
}

/**
 * Generate code for configuring search operators on a field
 */
export function generateConfigureSearchOperatorsCode(formId: string, fieldPath: string, operators: string[], defaultOperator: string): string {
  return `// Configure search operators for a field
// Using: NetPad Platform API

const searchFieldConfig = {
  enabled: true,
  operators: ${JSON.stringify(operators)},
  defaultOperator: '${defaultOperator}',
  showInResults: true,
};

const response = await fetch(\`/api/forms/${formId}\`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    [\`searchConfig.fields.${fieldPath}\`]: searchFieldConfig,
  }),
});

const { form } = await response.json();
console.log('Updated search operators for field: ${fieldPath}');
`;
}

/**
 * Generate code for testing a conversational form
 */
export function generateTestConversationalFormCode(formId: string, organizationId: string): string {
  return `// Test a conversational form
// Using: NetPad Platform API

// Start a conversation
const startResponse = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    formId: '${formId}',
    organizationId: '${organizationId}',
    action: 'start',
  }),
});

const { conversationId, message } = await startResponse.json();
console.log('Started conversation:', conversationId);
console.log('AI:', message);

// Send a message
const sendMessage = async (userMessage: string) => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
    },
    body: JSON.stringify({
      formId: '${formId}',
      organizationId: '${organizationId}',
      conversationId,
      message: userMessage,
      action: 'continue',
    }),
  });

  return response.json();
};

// Example conversation flow
const response1 = await sendMessage('I have a problem with my laptop');
console.log('AI:', response1.message);

// Check extraction status
console.log('Partial extractions:', response1.partialExtractions);
console.log('Confidence:', response1.confidence);
console.log('Topics covered:', response1.topicsCovered);
`;
}

/**
 * Generate code for testing a search form
 */
export function generateTestSearchFormCode(formId: string, organizationId: string, exampleQuery: Record<string, any>): string {
  return `// Test a search form
// Using: NetPad Platform API

const searchQuery = ${JSON.stringify(exampleQuery, null, 2)};

const response = await fetch('/api/mongodb/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.NETPAD_API_KEY}\`,
  },
  body: JSON.stringify({
    formId: '${formId}',
    organizationId: '${organizationId}',
    query: searchQuery,
    page: 1,
    pageSize: 25,
    sortField: '_id',
    sortDirection: 'desc',
  }),
});

const { documents, total, page, totalPages } = await response.json();
console.log(\`Found \${total} documents (page \${page} of \${totalPages})\`);
documents.forEach((doc: any) => {
  console.log(\`- \${doc._id}\`);
});
`;
}

/**
 * Generate conversational form configuration
 */
export function generateConversationalFormConfig(options: ConversationalFormOptions): object {
  const templateId = options.templateId;
  const template = templateId ? CONVERSATIONAL_TEMPLATES[templateId as keyof typeof CONVERSATIONAL_TEMPLATES] : null;

  return {
    form: {
      name: options.name,
      description: options.description,
      formType: 'conversational',
    },
    template: template ? {
      id: template.id,
      name: template.name,
      category: template.category,
    } : null,
    conversationalConfig: {
      objective: options.objective,
      context: options.context,
      persona: options.persona,
      topics: options.topics,
      extractionSchema: options.extractionSchema,
      conversationLimits: options.conversationLimits || {
        maxTurns: 10,
        maxDuration: 15,
        minConfidence: 0.7,
      },
    },
  };
}

/**
 * Generate search form configuration
 */
export function generateSearchFormConfig(options: SearchFormOptions): object {
  return {
    form: {
      name: options.name,
      description: options.description,
      formType: 'search',
    },
    dataSource: {
      connectionId: options.connectionId,
      database: options.database,
      collection: options.collection,
    },
    fields: options.fields,
    resultsConfig: options.resultsConfig || {
      layout: 'table',
      pageSize: 25,
      allowView: true,
      allowEdit: true,
      allowDelete: false,
      allowExport: true,
    },
  };
}

/**
 * Get operators for a field type
 */
export function getOperatorsForFieldType(fieldType: string): any[] {
  const type = fieldType.toLowerCase();
  if (type === 'short_text' || type === 'long_text' || type === 'email' || type === 'phone') {
    return SEARCH_OPERATORS.string;
  }
  if (type === 'number' || type === 'slider' || type === 'rating' || type === 'scale') {
    return SEARCH_OPERATORS.number;
  }
  if (type === 'date' || type === 'datetime') {
    return SEARCH_OPERATORS.date;
  }
  if (type === 'dropdown' || type === 'radio' || type === 'status') {
    return SEARCH_OPERATORS.enum;
  }
  if (type === 'checkbox' || type === 'yes_no' || type === 'switch') {
    return SEARCH_OPERATORS.boolean;
  }
  return SEARCH_OPERATORS.string; // default
}
