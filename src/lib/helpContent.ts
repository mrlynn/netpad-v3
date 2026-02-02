import { HelpTopic, HelpTopicId } from '@/types/help';

export const helpTopics: Record<HelpTopicId, HelpTopic> = {
  'getting-started': {
    id: 'getting-started',
    title: 'Getting Started with NetPad',
    description:
      'Learn what NetPad is, how it connects to MongoDB, and what you need to get started building forms.',
    content: [
      {
        type: 'heading',
        content: 'What is NetPad?',
      },
      {
        type: 'text',
        content:
          'NetPad is a visual tool for building data collection forms that save directly to MongoDB. Design forms without writing code, and submissions are automatically stored in your database.',
      },
      {
        type: 'heading',
        content: 'What is MongoDB?',
      },
      {
        type: 'text',
        content:
          'MongoDB is a popular database that stores data in flexible, JSON-like documents. It\'s used by millions of applications worldwide to store and manage data.',
      },
      {
        type: 'heading',
        content: 'What is a Connection String?',
      },
      {
        type: 'text',
        content:
          'A connection string is like a URL to your database. It contains the address of your MongoDB server and the credentials needed to access it securely.',
      },
      {
        type: 'code',
        content: 'mongodb+srv://username:password@cluster.mongodb.net/database',
      },
      {
        type: 'list',
        content: [
          'mongodb+srv:// - The protocol used to connect',
          'username:password - Your database credentials',
          'cluster.mongodb.net - The server address',
          '/database - The specific database to use',
        ],
      },
      {
        type: 'heading',
        content: 'Getting Your Connection String',
      },
      {
        type: 'text',
        content:
          'If you have a MongoDB Atlas account, you can find your connection string in the Atlas dashboard under "Connect" > "Connect your application". Don\'t have MongoDB? No problem - NetPad can provision a free MongoDB Atlas cluster for you automatically when you create your workspace.',
      },
      {
        type: 'heading',
        content: 'Quick Setup',
      },
      {
        type: 'list',
        content: [
          'Create a workspace - Give your workspace a name',
          'Get a database - Use your own MongoDB or let us provision a free one',
          'Build forms - Use the visual Form Builder to design your forms',
          'Collect data - Publish forms and start collecting submissions',
        ],
      },
      {
        type: 'tip',
        content:
          'New to MongoDB? Let NetPad provision a free MongoDB Atlas cluster for you. It takes just a minute and requires no configuration.',
      },
      {
        type: 'warning',
        content:
          'Keep your connection string secure. It contains credentials to access your database. Never share it publicly or commit it to version control.',
      },
    ],
    relatedTopics: ['mongodb-connection', 'form-builder', 'form-publishing'],
    keywords: ['getting started', 'introduction', 'connection', 'mongodb', 'database', 'setup', 'begin'],
  },

  'form-builder': {
    id: 'form-builder',
    title: 'Form Builder',
    description:
      'The Form Builder allows you to create dynamic data entry forms based on your MongoDB collection schema. Forms can be saved, versioned, and published for end-user data entry.',
    content: [
      {
        type: 'heading',
        content: 'Getting Started',
      },
      {
        type: 'text',
        content:
          'Connect to your MongoDB database and select a collection. The Form Builder will automatically analyze sample documents to generate field configurations based on your schema.',
      },
      {
        type: 'heading',
        content: 'Key Features',
      },
      {
        type: 'list',
        content: [
          'Start with templates - Use pre-built form templates for common use cases',
          'Automatic schema detection from sample documents',
          'Configure field types, labels, and validation rules',
          'Add conditional logic to show/hide fields',
          'Create lookup fields for cross-collection references',
          'Build computed fields with formulas',
          'Organize forms into multiple pages',
          'Version control for form configurations',
          'Publish forms for public data entry',
        ],
      },
      {
        type: 'tip',
        content:
          'Use the Document Preview panel on the right to see how your form data will be structured when inserted into MongoDB.',
      },
    ],
    relatedTopics: ['template-gallery', 'field-configuration', 'form-library', 'multi-page-forms'],
    keywords: ['form', 'builder', 'create', 'schema'],
  },

  'field-configuration': {
    id: 'field-configuration',
    title: 'Field Configuration',
    description:
      'Configure how each field appears and behaves in your form. Set labels, types, validation rules, and default values.',
    content: [
      {
        type: 'heading',
        content: 'Field Properties',
      },
      {
        type: 'list',
        content: [
          'Label: The display name shown to users',
          'Type: Data type (string, number, boolean, date, etc.)',
          'Required: Whether the field must be filled',
          'Default Value: Pre-populated value for new entries',
          'Placeholder: Hint text shown in empty fields',
          'Included: Whether to show the field in the form',
        ],
      },
      {
        type: 'heading',
        content: 'Field Types',
      },
      {
        type: 'list',
        content: [
          'String: Text input for short text',
          'Number: Numeric input with optional min/max',
          'Boolean: Checkbox or toggle switch',
          'Date: Date picker with calendar',
          'Email: Email input with validation',
          'URL: URL input with validation',
          'Array: List of values (tags, items)',
          'Object: Nested object with sub-fields',
        ],
      },
      {
        type: 'heading',
        content: 'Validation Rules',
      },
      {
        type: 'text',
        content:
          'Add validation rules to ensure data quality. Available validations include:',
      },
      {
        type: 'list',
        content: [
          'Min/Max: Numeric range limits',
          'Min/Max Length: Character count limits',
          'Pattern: Regular expression validation',
        ],
      },
      {
        type: 'tip',
        content:
          'Drag fields to reorder them in the form. The order in the configuration panel matches the order in the form preview.',
      },
    ],
    relatedTopics: ['conditional-logic', 'lookup-fields', 'computed-fields'],
    keywords: ['field', 'type', 'validation', 'required', 'label'],
  },

  'conditional-logic': {
    id: 'conditional-logic',
    title: 'Conditional Logic',
    description:
      'Show or hide fields based on the values of other fields. Create dynamic forms that adapt to user input.',
    content: [
      {
        type: 'heading',
        content: 'How It Works',
      },
      {
        type: 'text',
        content:
          'Conditional logic evaluates rules based on field values and shows or hides the target field accordingly. You can combine multiple conditions using AND or OR logic.',
      },
      {
        type: 'heading',
        content: 'Available Operators',
      },
      {
        type: 'list',
        content: [
          'Equals / Not Equals: Exact value matching',
          'Contains / Not Contains: Partial text matching',
          'Greater Than / Less Than: Numeric comparisons',
          'Is Empty / Is Not Empty: Check for values',
          'Is True / Is False: Boolean checks',
        ],
      },
      {
        type: 'example',
        content:
          'Show a "Company Name" field only when "Account Type" equals "Business". The field remains hidden for personal accounts.',
      },
      {
        type: 'heading',
        content: 'Logic Types',
      },
      {
        type: 'list',
        content: [
          'ALL (AND): All conditions must be true',
          'ANY (OR): At least one condition must be true',
        ],
      },
      {
        type: 'warning',
        content:
          'Avoid circular dependencies where Field A depends on Field B and Field B depends on Field A. This can cause unexpected behavior.',
      },
    ],
    relatedTopics: ['field-configuration', 'form-variables'],
    keywords: ['conditional', 'show', 'hide', 'logic', 'rules', 'dynamic'],
  },

  'lookup-fields': {
    id: 'lookup-fields',
    title: 'Lookup Fields',
    description:
      'Create dropdown fields that fetch options from another MongoDB collection. Enable cascading lookups for dependent selections.',
    content: [
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Collection: The source collection to fetch options from',
          'Display Field: Which field to show in the dropdown (e.g., "name")',
          'Value Field: Which field to store as the value (e.g., "_id")',
          'Searchable: Enable autocomplete search',
          'Multiple: Allow selecting multiple values',
        ],
      },
      {
        type: 'heading',
        content: 'Cascading Lookups',
      },
      {
        type: 'text',
        content:
          'Create dependent dropdowns where the options in one field are filtered based on another field\'s selection.',
      },
      {
        type: 'example',
        content:
          'First select a Country, then the State dropdown shows only states from that country. Configure the State lookup with a filter field pointing to Country.',
      },
      {
        type: 'tip',
        content:
          'For large collections, enable "Searchable" to let users type and filter options instead of loading all values upfront.',
      },
    ],
    relatedTopics: ['field-configuration', 'computed-fields'],
    keywords: ['lookup', 'dropdown', 'reference', 'foreign', 'cascading'],
  },

  'computed-fields': {
    id: 'computed-fields',
    title: 'Computed Fields',
    description:
      'Create fields that automatically calculate their value based on formulas using other field values.',
    content: [
      {
        type: 'heading',
        content: 'Formula Syntax',
      },
      {
        type: 'text',
        content:
          'Use field paths in your formulas to reference other field values. Basic arithmetic operators (+, -, *, /) are supported.',
      },
      {
        type: 'code',
        content: [
          '// Total calculation',
          'price * quantity',
          '',
          '// With discount',
          'price * quantity * (1 - discountRate)',
          '',
          '// String concatenation',
          'firstName + " " + lastName',
        ],
      },
      {
        type: 'heading',
        content: 'Output Types',
      },
      {
        type: 'list',
        content: [
          'Number: For mathematical calculations',
          'String: For text concatenation',
          'Boolean: For true/false results',
        ],
      },
      {
        type: 'warning',
        content:
          'Computed fields are read-only and recalculate automatically when their dependencies change.',
      },
    ],
    relatedTopics: ['field-configuration', 'form-variables'],
    keywords: ['computed', 'formula', 'calculate', 'automatic'],
  },

  'repeater-fields': {
    id: 'repeater-fields',
    title: 'Repeater Fields',
    description:
      'Create fields that allow users to add multiple entries of a structured item, like line items in an order or multiple addresses.',
    content: [
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Min Items: Minimum number of entries required',
          'Max Items: Maximum entries allowed',
          'Item Schema: Define the structure of each entry',
          'Allow Duplication: Enable duplicating existing entries',
          'Collapsible: Allow collapsing entries to save space',
        ],
      },
      {
        type: 'heading',
        content: 'Item Schema Fields',
      },
      {
        type: 'text',
        content:
          'Each item in the repeater can have multiple fields. Define the field name, type, label, and whether it\'s required.',
      },
      {
        type: 'example',
        content:
          'An order form with line items: each item has Product Name (string), Quantity (number), and Unit Price (number) fields.',
      },
      {
        type: 'tip',
        content:
          'Use repeater fields for arrays of objects in your MongoDB documents. The resulting structure matches the nested array format.',
      },
    ],
    relatedTopics: ['field-configuration', 'computed-fields'],
    keywords: ['repeater', 'array', 'multiple', 'items', 'nested'],
  },

  'form-variables': {
    id: 'form-variables',
    title: 'Form Variables & References',
    description:
      'Learn how to reference field values, use variables, and create dynamic content in forms with template syntax.',
    content: [
      {
        type: 'heading',
        content: 'Field References',
      },
      {
        type: 'text',
        content:
          'Reference form field values using their field path. In formulas, use the path directly. In template contexts (like success messages), use double curly braces.',
      },
      {
        type: 'code',
        content: [
          '// In formulas (computed fields)',
          'price * quantity',
          'firstName + " " + lastName',
          '',
          '// In templates (success messages, webhooks)',
          '{{email}}',
          '{{user.firstName}}',
          '{{order.total}}',
        ],
      },
      {
        type: 'heading',
        content: 'Where Variables Can Be Used',
      },
      {
        type: 'list',
        content: [
          'Computed Fields: Calculate values using formulas with field references',
          'Success Messages: Include field values in confirmation messages',
          'Redirect URLs: Pass field values as URL parameters',
          'Webhook Payloads: Send field data to external services',
          'Conditional Logic: Compare field values to show/hide fields',
          'Variable Formulas: Create derived values from other fields',
        ],
      },
      {
        type: 'heading',
        content: 'Template Syntax',
      },
      {
        type: 'text',
        content:
          'Use {{fieldPath}} syntax in templates to insert field values dynamically:',
      },
      {
        type: 'code',
        content: [
          'Thank you, {{name}}! Your order #{{responseId}} has been received.',
          'We will send confirmation to {{email}}.',
        ],
      },
      {
        type: 'heading',
        content: 'Variable Types',
      },
      {
        type: 'list',
        content: [
          'String: Text values',
          'Number: Numeric values',
          'Boolean: True/false flags',
          'Array: Lists of values',
          'Object: Complex structured data',
        ],
      },
      {
        type: 'heading',
        content: 'Value Sources',
      },
      {
        type: 'list',
        content: [
          'Static: A fixed default value',
          'Field: Mirrors the value of a form field',
          'Formula: Calculated from other values',
          'URL Parameter: Read from the page URL',
        ],
      },
      {
        type: 'heading',
        content: 'Available Metadata',
      },
      {
        type: 'list',
        content: [
          '{{responseId}}: Unique ID of the submitted response',
          '{{submittedAt}}: Timestamp when form was submitted',
          '{{formId}}: ID of the form',
          '{{formName}}: Name of the form',
        ],
      },
      {
        type: 'heading',
        content: 'Using the Variable Picker',
      },
      {
        type: 'text',
        content:
          'Click the {x} icon next to any text field that supports variables to open the picker. Browse available fields, variables, and functions, then click to insert.',
      },
      {
        type: 'example',
        content:
          'Create a "isBusinessAccount" boolean variable that is true when the account type field equals "business". Use this variable to show/hide business-specific fields.',
      },
      {
        type: 'tip',
        content:
          'The variable picker shows all available options based on context. In formula fields, it includes functions. In template fields, it includes metadata like responseId.',
      },
    ],
    relatedTopics: ['conditional-logic', 'computed-fields', 'form-lifecycle'],
    keywords: ['variable', 'state', 'dynamic', 'parameter', 'template', 'reference', 'field'],
  },

  'form-lifecycle': {
    id: 'form-lifecycle',
    title: 'Form Lifecycle',
    description:
      'Configure how your form behaves in different modes: create, edit, view, and clone. Define submission behavior, delete actions, and mode-specific field rules.',
    content: [
      {
        type: 'heading',
        content: 'Form Modes',
      },
      {
        type: 'list',
        content: [
          'Create: New document - defaults apply, all fields editable',
          'Edit: Existing document - can be modified and deleted',
          'View: Read-only display of existing document',
          'Clone: Copy existing document into create mode (new ID)',
        ],
      },
      {
        type: 'heading',
        content: 'Submission Configuration',
      },
      {
        type: 'text',
        content:
          'Each mode can have its own submission behavior. Configure what happens when the user saves:',
      },
      {
        type: 'list',
        content: [
          'Insert: Create a new document (create/clone modes)',
          'Update: Modify existing document (edit mode)',
          'Upsert: Create or update based on ID',
          'Custom: Call a webhook for custom handling',
        ],
      },
      {
        type: 'heading',
        content: 'Delete Action',
      },
      {
        type: 'text',
        content:
          'In edit mode, configure whether users can delete documents. Customize confirmation dialogs and choose between hard or soft delete.',
      },
      {
        type: 'heading',
        content: 'Field Mode Overrides',
      },
      {
        type: 'text',
        content:
          'Control field behavior per mode:',
      },
      {
        type: 'list',
        content: [
          'Visible In: Which modes show the field',
          'Editable In: Which modes allow editing',
          'Required In: Which modes require the field',
          'Immutable Fields: Fields that cannot be changed after creation',
        ],
      },
      {
        type: 'example',
        content:
          'Make "createdAt" visible in all modes but only editable in create mode. Mark "accountType" as immutable so it cannot be changed after initial creation.',
      },
      {
        type: 'tip',
        content:
          'Use lifecycle configuration to build complete CRUD workflows without writing code. Forms become workflow nodes, not just UI.',
      },
    ],
    relatedTopics: ['form-builder', 'field-configuration', 'form-publishing'],
    keywords: ['lifecycle', 'mode', 'create', 'edit', 'view', 'clone', 'submit', 'delete'],
  },

  'form-versioning': {
    id: 'form-versioning',
    title: 'Form Versioning',
    description:
      'Save snapshots of your form configuration over time. Restore to previous versions if needed.',
    content: [
      {
        type: 'heading',
        content: 'Creating Versions',
      },
      {
        type: 'text',
        content:
          'Click the "+" button in the Version History panel to create a new version snapshot. Add optional change notes to describe what changed.',
      },
      {
        type: 'heading',
        content: 'Version Information',
      },
      {
        type: 'list',
        content: [
          'Version number (auto-incremented)',
          'Timestamp when created',
          'Change notes describing modifications',
          'Field count and page count',
          'Published status at time of snapshot',
        ],
      },
      {
        type: 'heading',
        content: 'Restoring Versions',
      },
      {
        type: 'text',
        content:
          'Click the restore button on any version to revert your form to that state. Your current configuration is automatically saved as a new version first, so you can undo the restore if needed.',
      },
      {
        type: 'warning',
        content:
          'Restoring a version replaces all current field configurations, pages, and variables with the snapshot values.',
      },
    ],
    relatedTopics: ['form-builder', 'form-library'],
    keywords: ['version', 'history', 'restore', 'snapshot', 'backup'],
  },

  'multi-page-forms': {
    id: 'multi-page-forms',
    title: 'Multi-Page Forms',
    description:
      'Break long forms into multiple pages or steps. Improve user experience with progress indicators and per-page validation.',
    content: [
      {
        type: 'heading',
        content: 'Setting Up Pages',
      },
      {
        type: 'list',
        content: [
          'Enable multi-page mode in the Page Configuration panel',
          'Create pages with titles and optional descriptions',
          'Assign fields to each page',
          'Drag to reorder pages',
        ],
      },
      {
        type: 'heading',
        content: 'Step Indicator Styles',
      },
      {
        type: 'list',
        content: [
          'Dots: Simple dot indicators',
          'Numbers: Numbered steps with titles',
          'Progress: Linear progress bar',
          'Tabs: Clickable tab navigation',
        ],
      },
      {
        type: 'heading',
        content: 'Navigation Options',
      },
      {
        type: 'list',
        content: [
          'Allow Jump to Page: Let users click to any page',
          'Validate on Page Change: Check required fields before proceeding',
          'Show Page Titles: Display current page title',
          'Custom Button Labels: Customize Next/Previous text',
        ],
      },
      {
        type: 'tip',
        content:
          'Add conditional logic to pages to show or hide entire sections based on previous answers.',
      },
    ],
    relatedTopics: ['form-builder', 'conditional-logic'],
    keywords: ['multi-page', 'steps', 'wizard', 'pagination', 'progress'],
  },

  'form-library': {
    id: 'form-library',
    title: 'Form Library',
    description:
      'Save and manage your form configurations. Load saved forms, duplicate them, or delete ones you no longer need.',
    content: [
      {
        type: 'heading',
        content: 'Saving Forms',
      },
      {
        type: 'text',
        content:
          'Click "Save Form" to save your current configuration. Provide a name and optional description. Forms are saved to your session and persist until you clear browser data.',
      },
      {
        type: 'heading',
        content: 'Managing Forms',
      },
      {
        type: 'list',
        content: [
          'Load: Restore a saved form configuration',
          'Duplicate: Create a copy with a new name',
          'Delete: Remove a saved form',
          'Publish: Make a form publicly accessible',
        ],
      },
      {
        type: 'heading',
        content: 'Form Properties',
      },
      {
        type: 'list',
        content: [
          'Name: Display name for the form',
          'Description: Optional details about the form',
          'Collection: Target MongoDB collection',
          'Created/Updated: Timestamps',
        ],
      },
      {
        type: 'tip',
        content:
          'Use descriptive names for your forms, including the target collection, to easily find them later.',
      },
    ],
    relatedTopics: ['form-builder', 'form-versioning', 'form-publishing'],
    keywords: ['library', 'save', 'load', 'manage', 'list'],
  },

  'document-preview': {
    id: 'document-preview',
    title: 'Document Preview',
    description:
      'See a real-time preview of the MongoDB document that will be created from your form data.',
    content: [
      {
        type: 'heading',
        content: 'How It Works',
      },
      {
        type: 'text',
        content:
          'As you fill in form fields, the Document Preview panel shows the resulting document structure. This helps you verify that your form produces the correct data format for your MongoDB collection.',
      },
      {
        type: 'heading',
        content: 'Features',
      },
      {
        type: 'list',
        content: [
          'Real-time updates as you type',
          'Proper nesting for object and array fields',
          'Syntax-highlighted JSON view',
          'Collapsible sections for complex documents',
        ],
      },
      {
        type: 'tip',
        content:
          'Use the Document Preview to verify that nested fields and arrays are structured correctly before inserting documents.',
      },
    ],
    relatedTopics: ['form-builder', 'field-configuration'],
    keywords: ['preview', 'document', 'json', 'mongodb'],
  },

  'form-publishing': {
    id: 'form-publishing',
    title: 'Form Publishing',
    description:
      'Publish your forms to make them publicly accessible via a unique URL. End users can submit data without needing MongoDB access.',
    content: [
      {
        type: 'heading',
        content: 'Publishing a Form',
      },
      {
        type: 'list',
        content: [
          'Open the form you want to publish',
          'Click the "Publish" button',
          'Configure the URL slug (unique identifier)',
          'Set up MongoDB connection for submissions',
          'Share the public URL with users',
        ],
      },
      {
        type: 'heading',
        content: 'Public Form Features',
      },
      {
        type: 'list',
        content: [
          'Custom branding and styling',
          'Form validation',
          'Success/error messages',
          'Submission tracking',
        ],
      },
      {
        type: 'warning',
        content:
          'Ensure your MongoDB connection string is secure. Published forms should use a connection with minimal permissions (insert only).',
      },
    ],
    relatedTopics: ['form-builder', 'form-library'],
    keywords: ['publish', 'public', 'share', 'url', 'submit'],
  },

  'pipeline-builder': {
    id: 'pipeline-builder',
    title: 'Pipeline Builder',
    description:
      'Build MongoDB aggregation pipelines visually. Add stages, configure options, and preview results in real-time.',
    content: [
      {
        type: 'heading',
        content: 'Getting Started',
      },
      {
        type: 'text',
        content:
          'Connect to MongoDB, select a database and collection, then start adding aggregation stages. Each stage transforms the data flowing through the pipeline.',
      },
      {
        type: 'heading',
        content: 'Pipeline Operations',
      },
      {
        type: 'list',
        content: [
          'Add stages by clicking the "+" button',
          'Drag stages to reorder them',
          'Toggle stages on/off to test different combinations',
          'View results after each stage',
          'Export the pipeline as code',
        ],
      },
      {
        type: 'tip',
        content:
          'Use $match early in your pipeline to filter documents and improve performance.',
      },
    ],
    relatedTopics: ['aggregation-stages', 'mongodb-connection'],
    keywords: ['pipeline', 'aggregation', 'stages', 'query'],
  },

  'aggregation-stages': {
    id: 'aggregation-stages',
    title: 'Aggregation Stages',
    description:
      'Learn about the available aggregation stages and how to use them to transform your data.',
    content: [
      {
        type: 'heading',
        content: 'Common Stages',
      },
      {
        type: 'list',
        content: [
          '$match: Filter documents by conditions',
          '$project: Select or transform fields',
          '$group: Group documents and calculate aggregates',
          '$sort: Order documents by field values',
          '$limit/$skip: Pagination controls',
          '$lookup: Join with another collection',
          '$unwind: Flatten arrays into documents',
        ],
      },
      {
        type: 'heading',
        content: 'Advanced Stages',
      },
      {
        type: 'list',
        content: [
          '$addFields: Add new calculated fields',
          '$bucket: Group into ranges',
          '$facet: Multiple parallel pipelines',
          '$graphLookup: Recursive lookups',
          '$merge/$out: Write results to collection',
        ],
      },
      {
        type: 'code',
        content: [
          '// Example: Group by category and count',
          '{',
          '  $group: {',
          '    _id: "$category",',
          '    count: { $sum: 1 },',
          '    avgPrice: { $avg: "$price" }',
          '  }',
          '}',
        ],
      },
    ],
    relatedTopics: ['pipeline-builder'],
    keywords: ['stages', 'match', 'group', 'project', 'lookup'],
  },

  'mongodb-connection': {
    id: 'mongodb-connection',
    title: 'MongoDB Connection',
    description:
      'Connect to your MongoDB database using a connection string. Manage saved connections for quick access.',
    content: [
      {
        type: 'heading',
        content: 'Connection String Format',
      },
      {
        type: 'code',
        content: 'mongodb+srv://username:password@cluster.mongodb.net/database',
      },
      {
        type: 'heading',
        content: 'Connection Options',
      },
      {
        type: 'list',
        content: [
          'Save connections for quick access',
          'Set a default database',
          'Name connections for easy identification',
        ],
      },
      {
        type: 'warning',
        content:
          'Connection strings contain credentials. Never share them publicly or commit them to version control.',
      },
      {
        type: 'tip',
        content:
          'Use MongoDB Atlas connection strings for cloud-hosted databases. They include all necessary configuration.',
      },
    ],
    relatedTopics: ['pipeline-builder', 'form-builder'],
    keywords: ['connection', 'mongodb', 'atlas', 'database', 'connect'],
  },

  'form-analytics': {
    id: 'form-analytics',
    title: 'Form Analytics',
    description:
      'Track form performance with comprehensive analytics including response trends, completion rates, and field-level statistics.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'The Analytics Dashboard provides insights into how your forms are performing. View response trends over time, completion rates, average submission time, and detailed statistics for each field.',
      },
      {
        type: 'heading',
        content: 'Key Metrics',
      },
      {
        type: 'list',
        content: [
          'Total Responses: Count of all form submissions',
          'Completion Rate: Percentage of started forms that were completed',
          'Average Time: Average time to complete the form',
          'Response Trend: Volume of submissions over time',
        ],
      },
      {
        type: 'heading',
        content: 'Time Range Filtering',
      },
      {
        type: 'text',
        content:
          'Filter analytics by date range to analyze performance over specific periods. Compare trends across different timeframes to identify patterns.',
      },
      {
        type: 'heading',
        content: 'Real-Time Updates',
      },
      {
        type: 'text',
        content:
          'The dashboard includes a real-time response counter that updates automatically, showing the current total number of responses.',
      },
      {
        type: 'tip',
        content:
          'Use the Analytics tab to identify which fields have the highest drop-off rates or validation errors, helping you optimize your form design.',
      },
    ],
    relatedTopics: ['response-management', 'field-analytics', 'response-export'],
    keywords: ['analytics', 'statistics', 'metrics', 'dashboard', 'performance'],
  },

  'response-management': {
    id: 'response-management',
    title: 'Response Management',
    description:
      'View, search, filter, and manage form responses. Access detailed response information and perform bulk operations.',
    content: [
      {
        type: 'heading',
        content: 'Viewing Responses',
      },
      {
        type: 'text',
        content:
          'The Response List displays all submissions for your form in a sortable, filterable table. Click any response to view its full details.',
      },
      {
        type: 'heading',
        content: 'Search and Filter',
      },
      {
        type: 'list',
        content: [
          'Search: Full-text search across all response fields',
          'Status Filter: Filter by submission status (submitted, draft, etc.)',
          'Date Range: Filter responses by submission date',
          'Device Type: Filter by device (desktop, mobile, tablet)',
        ],
      },
      {
        type: 'heading',
        content: 'Response Details',
      },
      {
        type: 'text',
        content:
          'Click on any response row to view the complete submission details, including all field values, metadata (IP address, user agent, referrer), and submission timestamp.',
      },
      {
        type: 'heading',
        content: 'Bulk Operations',
      },
      {
        type: 'list',
        content: [
          'Select multiple responses using checkboxes',
          'Bulk delete selected responses',
          'Export filtered responses',
        ],
      },
      {
        type: 'heading',
        content: 'Pagination',
      },
      {
        type: 'text',
        content:
          'Large response sets are paginated for performance. Use the pagination controls at the bottom to navigate through pages of responses.',
      },
      {
        type: 'tip',
        content:
          'Use filters to narrow down responses before exporting. This ensures you only export the data you need.',
      },
    ],
    relatedTopics: ['form-analytics', 'response-export', 'field-analytics'],
    keywords: ['responses', 'submissions', 'manage', 'filter', 'search', 'view'],
  },

  'response-export': {
    id: 'response-export',
    title: 'Response Export',
    description:
      'Export form responses in multiple formats: CSV, Excel, JSON, or PDF. Customize which fields and metadata to include.',
    content: [
      {
        type: 'heading',
        content: 'Export Formats',
      },
      {
        type: 'list',
        content: [
          'CSV: Comma-separated values for spreadsheet applications',
          'Excel (XLSX): Microsoft Excel format with formatting',
          'JSON: Raw data format for developers',
          'PDF: Formatted document for sharing and printing',
        ],
      },
      {
        type: 'heading',
        content: 'Field Selection',
      },
      {
        type: 'text',
        content:
          'Choose which form fields to include in the export. By default, all fields are selected. Uncheck fields you don\'t need to reduce file size.',
      },
      {
        type: 'heading',
        content: 'Metadata Options',
      },
      {
        type: 'list',
        content: [
          'Include Metadata: Add submission timestamp, IP address, user agent, and referrer',
          'Include Response ID: Add unique response identifier',
          'Include Form ID: Add form identifier',
        ],
      },
      {
        type: 'heading',
        content: 'Filtering Before Export',
      },
      {
        type: 'text',
        content:
          'Apply filters in the Response List before exporting. Only filtered responses will be included in the export file.',
      },
      {
        type: 'example',
        content:
          'Export all responses from the last 30 days in Excel format, including metadata, for analysis in a spreadsheet application.',
      },
      {
        type: 'warning',
        content:
          'Large exports may take time to generate. For very large datasets, consider filtering by date range or status before exporting.',
      },
    ],
    relatedTopics: ['response-management', 'form-analytics'],
    keywords: ['export', 'csv', 'excel', 'json', 'pdf', 'download', 'data'],
  },

  'field-analytics': {
    id: 'field-analytics',
    title: 'Field Analytics',
    description:
      'View detailed statistics and distributions for individual form fields. Understand how users interact with each field.',
    content: [
      {
        type: 'heading',
        content: 'Field Statistics',
      },
      {
        type: 'text',
        content:
          'Each field in your form has its own analytics showing how users interact with it. Statistics vary by field type.',
      },
      {
        type: 'heading',
        content: 'Text Fields',
      },
      {
        type: 'list',
        content: [
          'Average length: Mean character count',
          'Min/Max length: Shortest and longest entries',
          'Common values: Most frequently entered values',
          'Empty rate: Percentage of responses with no value',
        ],
      },
      {
        type: 'heading',
        content: 'Number Fields',
      },
      {
        type: 'list',
        content: [
          'Average: Mean value',
          'Median: Middle value',
          'Min/Max: Range of values',
          'Distribution: Histogram showing value frequency',
        ],
      },
      {
        type: 'heading',
        content: 'Choice Fields (Dropdown, Radio, Checkbox)',
      },
      {
        type: 'list',
        content: [
          'Distribution: Count and percentage for each option',
          'Pie/Bar charts: Visual representation of choices',
          'Most/Least selected: Popularity ranking',
        ],
      },
      {
        type: 'heading',
        content: 'Date Fields',
      },
      {
        type: 'list',
        content: [
          'Earliest/Latest: Date range',
          'Distribution: Frequency by day, week, or month',
          'Trend: Pattern over time',
        ],
      },
      {
        type: 'heading',
        content: 'Boolean Fields',
      },
      {
        type: 'list',
        content: [
          'True/False counts: Number of each value',
          'Percentage: Proportion of true vs false',
        ],
      },
      {
        type: 'tip',
        content:
          'Use field analytics to identify fields that users frequently skip or fields with unexpected value patterns. This can help improve form design.',
      },
    ],
    relatedTopics: ['form-analytics', 'response-management'],
    keywords: ['field', 'statistics', 'distribution', 'analytics', 'field-level'],
  },

  'erd-viewer': {
    id: 'erd-viewer',
    title: 'Entity Relationship Diagram (ERD)',
    description:
      'Visualize your MongoDB database schema with an interactive Entity Relationship Diagram showing collections and their fields.',
    content: [
      {
        type: 'heading',
        content: 'Getting Started',
      },
      {
        type: 'text',
        content:
          'Connect to your MongoDB database and select a database. The ERD automatically generates a visual representation of all collections and their field structures.',
      },
      {
        type: 'heading',
        content: 'ERD Features',
      },
      {
        type: 'list',
        content: [
          'Collection nodes: Each collection is displayed as a node',
          'Field information: See field names and types for each collection',
          'Document counts: View approximate document counts per collection',
          'Interactive layout: Drag nodes to reorganize the diagram',
          'Zoom and pan: Navigate large schemas easily',
        ],
      },
      {
        type: 'heading',
        content: 'Schema Analysis',
      },
      {
        type: 'text',
        content:
          'The ERD analyzes sample documents from each collection to infer field types and structures. Nested objects and arrays are represented in the field list.',
      },
      {
        type: 'heading',
        content: 'Using the ERD',
      },
      {
        type: 'list',
        content: [
          'Understand database structure before building forms or pipelines',
          'Identify relationships between collections',
          'Discover available fields for form building',
          'Plan aggregation pipelines by understanding data structure',
        ],
      },
      {
        type: 'tip',
        content:
          'The ERD updates automatically when you change databases. Use it as a reference when configuring lookup fields or building aggregation pipelines.',
      },
    ],
    relatedTopics: ['mongodb-connection', 'form-builder', 'pipeline-builder'],
    keywords: ['erd', 'schema', 'diagram', 'database', 'structure', 'collections'],
  },

  'code-generation': {
    id: 'code-generation',
    title: 'Code Generation',
    description:
      'Generate production-ready code for your forms in multiple languages and frameworks. Export forms as reusable components.',
    content: [
      {
        type: 'heading',
        content: 'Supported Frameworks',
      },
      {
        type: 'text',
        content:
          'Generate code for popular frontend and backend frameworks, including React, Vue, Angular, Next.js, Python Flask/FastAPI/Django, Node.js Express, and more.',
      },
      {
        type: 'heading',
        content: 'Frontend Frameworks',
      },
      {
        type: 'list',
        content: [
          'React (with hooks)',
          'React Hook Form',
          'Vue.js',
          'Angular',
          'Next.js',
          'Svelte',
          'SolidJS',
          'Remix',
          'Plain HTML/JavaScript',
        ],
      },
      {
        type: 'heading',
        content: 'Backend Frameworks',
      },
      {
        type: 'list',
        content: [
          'Python: Flask, FastAPI, Django',
          'Node.js: Express',
          'PHP',
          'Ruby on Rails',
          'Go: Gin',
          'Java: Spring Boot',
        ],
      },
      {
        type: 'heading',
        content: 'Schema Generation',
      },
      {
        type: 'text',
        content:
          'Generate validation schemas in Zod, Yup, or TypeScript types to ensure type safety in your applications.',
      },
      {
        type: 'heading',
        content: 'Using Generated Code',
      },
      {
        type: 'list',
        content: [
          'Copy code to clipboard for immediate use',
          'Download as a file for integration into your project',
          'Generated code includes all form configurations',
          'Conditional logic and validation rules are preserved',
        ],
      },
      {
        type: 'example',
        content:
          'Generate a React Hook Form component with Zod validation. The code includes all field configurations, conditional logic, and form submission handling.',
      },
      {
        type: 'tip',
        content:
          'Generated code follows best practices for each framework. Customize the generated code to match your project\'s coding standards and add additional features as needed.',
      },
    ],
    relatedTopics: ['form-builder', 'form-library', 'form-publishing'],
    keywords: ['code', 'generate', 'export', 'framework', 'react', 'vue', 'angular'],
  },

  'ai-pipeline-generation': {
    id: 'ai-pipeline-generation',
    title: 'AI Pipeline Generation',
    description:
      'Use artificial intelligence to generate MongoDB aggregation pipelines from natural language descriptions.',
    content: [
      {
        type: 'heading',
        content: 'How It Works',
      },
      {
        type: 'text',
        content:
          'Describe what you want to do with your data in plain English, and the AI will generate a complete aggregation pipeline with the appropriate stages and configurations.',
      },
      {
        type: 'heading',
        content: 'Using AI Generation',
      },
      {
        type: 'list',
        content: [
          'Click the "Build pipeline with AI" button',
          'Enter your query in natural language',
          'Review the generated pipeline stages',
          'Approve to add stages to your canvas, or cancel to try again',
        ],
      },
      {
        type: 'heading',
        content: 'Example Queries',
      },
      {
        type: 'code',
        content: [
          '// Group products by category and calculate average price',
          '// Find all orders from the last 30 days',
          '// Join users with their orders and calculate total spent',
          '// Count documents by status and sort by count',
        ],
      },
      {
        type: 'heading',
        content: 'Best Practices',
      },
      {
        type: 'list',
        content: [
          'Be specific about field names and collection names',
          'Mention the collection you\'re working with',
          'Specify any filters or conditions clearly',
          'Describe the desired output format',
        ],
      },
      {
        type: 'heading',
        content: 'Reviewing Generated Pipelines',
      },
      {
        type: 'text',
        content:
          'Always review the generated pipeline before applying it. The AI provides an explanation of what each stage does. You can modify stages after they\'re added to the canvas.',
      },
      {
        type: 'warning',
        content:
          'AI-generated pipelines are suggestions based on your query. Verify the logic matches your requirements, especially for complex aggregations.',
      },
      {
        type: 'tip',
        content:
          'Use AI generation as a starting point, then refine stages using the visual builder. Combine AI assistance with manual configuration for best results.',
      },
    ],
    relatedTopics: ['pipeline-builder', 'aggregation-stages'],
    keywords: ['ai', 'artificial intelligence', 'natural language', 'generate', 'automation'],
  },

  'results-viewer': {
    id: 'results-viewer',
    title: 'Results Viewer',
    description:
      'View and interact with aggregation pipeline results. Navigate through paginated results and switch between different view modes.',
    content: [
      {
        type: 'heading',
        content: 'View Modes',
      },
      {
        type: 'list',
        content: [
          'Table View: Structured table with expandable rows for nested data',
          'List View: Card-based layout with full document preview',
          'JSON View: Raw JSON output for all results',
        ],
      },
      {
        type: 'heading',
        content: 'Pagination',
      },
      {
        type: 'text',
        content:
          'Large result sets are automatically paginated to improve performance. Use Previous/Next buttons or page numbers to navigate through results.',
      },
      {
        type: 'heading',
        content: 'Document Interaction',
      },
      {
        type: 'list',
        content: [
          'Double-click any row to open the document in a JSON editor',
          'Expand rows in table view to see nested objects and arrays',
          'Copy document JSON to clipboard',
          'View formatted JSON with syntax highlighting',
        ],
      },
      {
        type: 'heading',
        content: 'Performance',
      },
      {
        type: 'text',
        content:
          'Pagination ensures that only a manageable number of documents are loaded at once, preventing memory issues with large collections.',
      },
      {
        type: 'tip',
        content:
          'Use the JSON view to see the exact structure of your pipeline output. This is helpful for debugging and understanding data transformations.',
      },
    ],
    relatedTopics: ['pipeline-builder', 'document-editing', 'sample-documents'],
    keywords: ['results', 'viewer', 'pagination', 'table', 'json', 'output'],
  },

  'document-editing': {
    id: 'document-editing',
    title: 'Document Editing',
    description:
      'Edit MongoDB documents directly from the results viewer. Make changes and save them back to the database.',
    content: [
      {
        type: 'heading',
        content: 'Opening the Editor',
      },
      {
        type: 'text',
        content:
          'Double-click any document row in the results viewer to open it in the JSON editor modal. The editor shows the complete document structure with syntax highlighting.',
      },
      {
        type: 'heading',
        content: 'Editing Documents',
      },
      {
        type: 'list',
        content: [
          'Edit JSON directly in the text field',
          'Real-time validation ensures valid JSON syntax',
          'Error messages highlight syntax issues',
          'Copy button to copy the document JSON',
        ],
      },
      {
        type: 'heading',
        content: 'Saving Changes',
      },
      {
        type: 'text',
        content:
          'Click "Save Changes" to update the document in MongoDB. The document is updated using the $set operator, preserving fields you didn\'t modify.',
      },
      {
        type: 'heading',
        content: 'Validation',
      },
      {
        type: 'list',
        content: [
          'JSON syntax is validated before saving',
          'Invalid JSON prevents saving',
          'Error messages guide you to fix issues',
        ],
      },
      {
        type: 'warning',
        content:
          'Changes are saved immediately to the database. Make sure you have the correct connection string and permissions before editing documents.',
      },
      {
        type: 'tip',
        content:
          'After saving, the results viewer automatically refreshes to show your changes. Use this feature to quickly fix data issues or update document values.',
      },
    ],
    relatedTopics: ['results-viewer', 'mongodb-connection'],
    keywords: ['edit', 'document', 'json', 'update', 'modify', 'save'],
  },

  'sample-documents': {
    id: 'sample-documents',
    title: 'Sample Documents',
    description:
      'Preview sample documents from your collection before building forms or pipelines. Understand your data structure.',
    content: [
      {
        type: 'heading',
        content: 'Viewing Samples',
      },
      {
        type: 'text',
        content:
          'The Sample Documents panel displays a preview of documents from your selected collection. This helps you understand the data structure before building forms or aggregation pipelines.',
      },
      {
        type: 'heading',
        content: 'Features',
      },
      {
        type: 'list',
        content: [
          'View multiple sample documents',
          'See field names and types',
          'Understand nested structures',
          'Identify array fields',
          'Refresh to get new samples',
        ],
      },
      {
        type: 'heading',
        content: 'Using Sample Documents',
      },
      {
        type: 'text',
        content:
          'Sample documents are used to automatically infer form field configurations and provide field name suggestions in aggregation pipeline stages.',
      },
      {
        type: 'heading',
        content: 'Schema Inference',
      },
      {
        type: 'text',
        content:
          'The Form Builder analyzes sample documents to automatically generate field configurations with appropriate types, labels, and validation rules.',
      },
      {
        type: 'tip',
        content:
          'Review sample documents before building forms to ensure the auto-generated field configurations match your expectations. You can always adjust field settings afterward.',
      },
    ],
    relatedTopics: ['form-builder', 'field-configuration', 'pipeline-builder'],
    keywords: ['sample', 'documents', 'preview', 'schema', 'structure'],
  },

  'include-in-document': {
    id: 'include-in-document',
    title: 'Include in Document',
    description:
      'Controls whether a field\'s key and value are stored in the MongoDB collection when the form is submitted.',
    content: [
      {
        type: 'heading',
        content: 'What is "Include in Document"?',
      },
      {
        type: 'text',
        content:
          'The "Include in Document" option determines whether a field\'s data will be saved to your MongoDB collection when a form is submitted. When enabled, the field\'s key and value are included in the document that gets inserted into the database.',
      },
      {
        type: 'heading',
        content: 'When to Use',
      },
      {
        type: 'list',
        content: [
          'Enable (default): For fields that represent actual data you want to store in your collection',
          'Disable: For fields used only for display, calculations, or conditional logic that don\'t need to be persisted',
        ],
      },
      {
        type: 'heading',
        content: 'Examples',
      },
      {
        type: 'example',
        content: [
          'Enabled: A "Name" field will be saved as { name: "John Doe" } in your collection',
          'Disabled: A "Total Price" computed field might be used for display but not stored if the individual price components are already saved',
          'Disabled: A "Section Header" layout field is only for visual organization and doesn\'t contain data to store',
        ],
      },
      {
        type: 'tip',
        content:
          'You can preview what will be saved to your database using the Document Preview panel. Fields with "Include in Document" disabled will not appear in the preview.',
      },
      {
        type: 'warning',
        content:
          'If you disable "Include in Document" for a required field, the field will still be validated but its value won\'t be saved. Make sure this is intentional for your use case.',
      },
    ],
    relatedTopics: ['field-configuration', 'document-preview', 'form-builder'],
    keywords: ['include', 'document', 'storage', 'database', 'persist', 'save'],
  },

  // ============================================
  // API Documentation Topics
  // ============================================

  'api-overview': {
    id: 'api-overview',
    title: 'Public API Overview',
    description:
      'NetPad provides a RESTful API for programmatic access to your forms and submissions. Build integrations, automate workflows, or create custom dashboards.',
    content: [
      {
        type: 'heading',
        content: 'What is the NetPad API?',
      },
      {
        type: 'text',
        content:
          'The NetPad API allows you to interact with your forms and submissions programmatically. Use it to integrate NetPad into your applications, automate data collection workflows, or build custom reporting dashboards.',
      },
      {
        type: 'heading',
        content: 'Base URL',
      },
      {
        type: 'code',
        content: '/api/v1',
      },
      {
        type: 'heading',
        content: 'Available Resources',
      },
      {
        type: 'list',
        content: [
          'Forms: List, create, update, and delete forms',
          'Submissions: List, create, and delete form submissions',
          'OpenAPI Spec: Full API specification at /api/v1/openapi.json',
        ],
      },
      {
        type: 'heading',
        content: 'Response Format',
      },
      {
        type: 'text',
        content:
          'All API responses are in JSON format with a consistent structure including success status, data, and request ID.',
      },
      {
        type: 'code',
        content: [
          '{',
          '  "success": true,',
          '  "data": { ... },',
          '  "requestId": "req_abc123"',
          '}',
        ],
      },
      {
        type: 'tip',
        content:
          'Use the API Playground at /api-playground to test API calls directly in your browser, or view the full documentation at /api/docs.',
      },
    ],
    relatedTopics: ['api-playground', 'api-authentication', 'api-endpoints', 'api-keys-management'],
    keywords: ['api', 'rest', 'integration', 'programmatic', 'developer'],
  },

  'api-playground': {
    id: 'api-playground',
    title: 'API Playground',
    description:
      'Test the NetPad API interactively in your browser. Make live API requests, view responses, and explore endpoints without writing code.',
    content: [
      {
        type: 'heading',
        content: 'What is the API Playground?',
      },
      {
        type: 'text',
        content:
          'The API Playground is an interactive testing tool that lets you make real API requests directly from your browser. It\'s perfect for learning the API, debugging integrations, or quickly testing endpoints.',
      },
      {
        type: 'heading',
        content: 'Getting Started',
      },
      {
        type: 'list',
        content: [
          'Navigate to /api-playground or use the menu: Avatar > API Playground',
          'Enter your API key (get one from Settings > API Keys)',
          'Select an endpoint from the dropdown',
          'Customize the request URL and body if needed',
          'Click "Send Request" to execute',
        ],
      },
      {
        type: 'heading',
        content: 'Features',
      },
      {
        type: 'list',
        content: [
          'Endpoint selector with all available API routes',
          'Editable request URL for custom parameters',
          'JSON body editor for POST/PATCH requests',
          'Response viewer with syntax highlighting',
          'Headers tab showing all response headers',
          'Request history to track your session',
          'Quick example buttons for common operations',
        ],
      },
      {
        type: 'heading',
        content: 'Response Information',
      },
      {
        type: 'text',
        content:
          'After sending a request, you\'ll see the HTTP status code, response time, and the full JSON response body. Switch to the Headers tab to view rate limit information and other response headers.',
      },
      {
        type: 'tip',
        content:
          'Use the "Get OpenAPI Spec" quick example to fetch the full API specification, which you can then import into Postman or other API tools.',
      },
      {
        type: 'warning',
        content:
          'The API Playground makes real requests to your account. Creating, updating, or deleting resources will affect your actual data.',
      },
    ],
    relatedTopics: ['api-overview', 'api-authentication', 'api-keys-management'],
    keywords: ['playground', 'test', 'interactive', 'try', 'debug', 'requests'],
  },

  'api-authentication': {
    id: 'api-authentication',
    title: 'API Authentication',
    description:
      'Learn how to authenticate with the NetPad API using API keys. All requests require a valid API key in the Authorization header.',
    content: [
      {
        type: 'heading',
        content: 'Bearer Token Authentication',
      },
      {
        type: 'text',
        content:
          'All API requests must include your API key in the Authorization header using the Bearer scheme.',
      },
      {
        type: 'code',
        content: 'Authorization: Bearer np_live_your_api_key_here',
      },
      {
        type: 'heading',
        content: 'API Key Types',
      },
      {
        type: 'list',
        content: [
          'Live Keys (np_live_): For production use with published forms',
          'Test Keys (np_test_): For development and testing (can submit to unpublished forms)',
        ],
      },
      {
        type: 'heading',
        content: 'Example Request',
      },
      {
        type: 'code',
        content: [
          'curl -X GET "https://your-domain.com/api/v1/forms" \\',
          '  -H "Authorization: Bearer np_live_abc123..."',
        ],
      },
      {
        type: 'heading',
        content: 'Permissions',
      },
      {
        type: 'text',
        content:
          'Each API key has specific permissions that control what operations it can perform. Common permissions include:',
      },
      {
        type: 'list',
        content: [
          'forms:read - View form definitions',
          'forms:write - Create and update forms',
          'forms:delete - Delete forms',
          'submissions:read - View submissions',
          'submissions:write - Create submissions',
          'submissions:delete - Delete submissions',
          'analytics:read - View analytics data',
          'webhooks:manage - Configure webhooks',
        ],
      },
      {
        type: 'warning',
        content:
          'Keep your API keys secure. Never expose them in client-side code, commit them to version control, or share them publicly.',
      },
      {
        type: 'tip',
        content:
          'Create separate API keys for different environments (development, staging, production) with appropriate permissions for each.',
      },
    ],
    relatedTopics: ['api-overview', 'api-keys-management', 'api-rate-limiting'],
    keywords: ['authentication', 'bearer', 'token', 'api key', 'permissions', 'security'],
  },

  'api-endpoints': {
    id: 'api-endpoints',
    title: 'API Endpoints Reference',
    description:
      'Complete reference for all available API endpoints including forms and submissions operations.',
    content: [
      {
        type: 'heading',
        content: 'Forms Endpoints',
      },
      {
        type: 'code',
        content: [
          'GET    /api/v1/forms              # List all forms',
          'POST   /api/v1/forms              # Create a new form',
          'GET    /api/v1/forms/:formId      # Get form details',
          'PATCH  /api/v1/forms/:formId      # Update a form',
          'DELETE /api/v1/forms/:formId      # Delete a form',
        ],
      },
      {
        type: 'heading',
        content: 'Submissions Endpoints',
      },
      {
        type: 'code',
        content: [
          'GET    /api/v1/forms/:formId/submissions              # List submissions',
          'POST   /api/v1/forms/:formId/submissions              # Create submission',
          'GET    /api/v1/forms/:formId/submissions/:id          # Get submission',
          'DELETE /api/v1/forms/:formId/submissions/:id          # Delete submission',
        ],
      },
      {
        type: 'heading',
        content: 'Query Parameters',
      },
      {
        type: 'text',
        content:
          'List endpoints support pagination and filtering:',
      },
      {
        type: 'list',
        content: [
          'page - Page number (default: 1)',
          'pageSize - Items per page (default: 20, max: 100)',
          'status - Filter by status (draft, published)',
          'startDate/endDate - Filter by date range (submissions)',
        ],
      },
      {
        type: 'heading',
        content: 'Example: List Forms',
      },
      {
        type: 'code',
        content: [
          'curl "https://your-domain.com/api/v1/forms?status=published&page=1" \\',
          '  -H "Authorization: Bearer np_live_..."',
        ],
      },
      {
        type: 'heading',
        content: 'Example: Create Submission',
      },
      {
        type: 'code',
        content: [
          'curl -X POST "https://your-domain.com/api/v1/forms/my-form/submissions" \\',
          '  -H "Authorization: Bearer np_live_..." \\',
          '  -H "Content-Type: application/json" \\',
          '  -d \'{"data": {"name": "John", "email": "john@example.com"}}\'',
        ],
      },
      {
        type: 'tip',
        content:
          'Use the form slug or ID in the URL. Both are supported for flexibility.',
      },
    ],
    relatedTopics: ['api-overview', 'api-authentication', 'api-rate-limiting'],
    keywords: ['endpoints', 'routes', 'forms', 'submissions', 'crud', 'rest'],
  },

  'api-rate-limiting': {
    id: 'api-rate-limiting',
    title: 'API Rate Limiting',
    description:
      'Understand API rate limits and how to handle rate limit errors in your applications.',
    content: [
      {
        type: 'heading',
        content: 'Default Rate Limits',
      },
      {
        type: 'list',
        content: [
          '1,000 requests per hour',
          '10,000 requests per day',
        ],
      },
      {
        type: 'heading',
        content: 'Rate Limit Headers',
      },
      {
        type: 'text',
        content:
          'Every API response includes headers showing your current rate limit status:',
      },
      {
        type: 'code',
        content: [
          'X-RateLimit-Limit: 1000        # Maximum requests allowed',
          'X-RateLimit-Remaining: 999     # Requests remaining',
          'X-RateLimit-Reset: 1704067200  # Unix timestamp when limit resets',
          'X-Request-Id: req_abc123       # Unique request identifier',
        ],
      },
      {
        type: 'heading',
        content: 'Rate Limit Exceeded',
      },
      {
        type: 'text',
        content:
          'When you exceed the rate limit, the API returns a 429 status code:',
      },
      {
        type: 'code',
        content: [
          '{',
          '  "success": false,',
          '  "error": {',
          '    "code": "RATE_LIMIT_EXCEEDED",',
          '    "message": "Rate limit exceeded. Try again later.",',
          '    "details": {',
          '      "retryAfter": 3600',
          '    }',
          '  },',
          '  "requestId": "req_abc123"',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Best Practices',
      },
      {
        type: 'list',
        content: [
          'Monitor X-RateLimit-Remaining header to avoid hitting limits',
          'Implement exponential backoff when receiving 429 responses',
          'Cache responses where appropriate to reduce API calls',
          'Use batch operations when available instead of individual requests',
        ],
      },
      {
        type: 'tip',
        content:
          'Custom rate limits can be configured per API key. Contact support if you need higher limits for your use case.',
      },
      {
        type: 'warning',
        content:
          'Repeatedly hitting rate limits may result in temporary suspension of your API key. Design your applications to respect the limits.',
      },
    ],
    relatedTopics: ['api-overview', 'api-authentication', 'api-endpoints'],
    keywords: ['rate limit', 'throttling', 'quota', '429', 'requests'],
  },

  'api-keys-management': {
    id: 'api-keys-management',
    title: 'Managing API Keys',
    description:
      'Learn how to create, configure, and manage API keys in the NetPad dashboard.',
    content: [
      {
        type: 'heading',
        content: 'Creating an API Key',
      },
      {
        type: 'list',
        content: [
          'Navigate to Settings > API Keys',
          'Click "Create API Key"',
          'Enter a descriptive name for the key',
          'Select the environment (Live or Test)',
          'Choose the permissions the key should have',
          'Optionally set an expiration date',
          'Click Create and copy the key immediately',
        ],
      },
      {
        type: 'warning',
        content:
          'Your API key is only shown once when created. Make sure to copy and store it securely. If you lose it, you\'ll need to create a new key.',
      },
      {
        type: 'heading',
        content: 'Key Naming Best Practices',
      },
      {
        type: 'list',
        content: [
          'Use descriptive names: "Production Backend", "Mobile App", "CI/CD Pipeline"',
          'Include the environment: "Staging API Key", "Dev Testing"',
          'Identify the purpose: "Analytics Dashboard", "Form Sync Service"',
        ],
      },
      {
        type: 'heading',
        content: 'Revoking API Keys',
      },
      {
        type: 'text',
        content:
          'If an API key is compromised or no longer needed, revoke it immediately from the Settings page. Revoked keys cannot be reactivated.',
      },
      {
        type: 'heading',
        content: 'Key Information',
      },
      {
        type: 'list',
        content: [
          'Key Prefix: First 16 characters shown for identification (np_live_abc...)',
          'Status: Active, Revoked, or Expired',
          'Last Used: When the key was last used for an API request',
          'Usage Count: Total number of requests made with this key',
          'Created/Expires: Key creation and expiration dates',
        ],
      },
      {
        type: 'heading',
        content: 'Security Recommendations',
      },
      {
        type: 'list',
        content: [
          'Rotate keys periodically (every 90 days recommended)',
          'Use separate keys for each application or service',
          'Grant only the minimum permissions needed',
          'Set expiration dates for temporary integrations',
          'Monitor key usage for unusual activity',
        ],
      },
      {
        type: 'tip',
        content:
          'Store API keys in environment variables or a secrets manager. Never hardcode them in your application code.',
      },
    ],
    relatedTopics: ['api-overview', 'api-authentication', 'api-rate-limiting'],
    keywords: ['api keys', 'create', 'manage', 'revoke', 'permissions', 'settings'],
  },

  'workflow-variables': {
    id: 'workflow-variables',
    title: 'Workflow Variables',
    description: 'Learn how to use variables to pass data between workflow nodes.',
    content: [
      {
        type: 'heading',
        content: 'What are Variables?',
      },
      {
        type: 'text',
        content:
          'Variables allow you to reference data from previous nodes in your workflow. When a node executes, its output becomes available to all downstream nodes through variable references.',
      },
      {
        type: 'heading',
        content: 'Variable Syntax',
      },
      {
        type: 'text',
        content:
          'Use double curly braces to reference variables in text fields and configuration:',
      },
      {
        type: 'code',
        content: '{{nodes.formTrigger.data.email}}',
      },
      {
        type: 'heading',
        content: 'Variable Path Structure',
      },
      {
        type: 'list',
        content: [
          'nodes.<nodeId>.<field> - Access output from a specific node',
          'trigger.payload.<field> - Access the original trigger data',
          'variables.<name> - Access workflow-level variables',
        ],
      },
      {
        type: 'example',
        content:
          'Example: In an HTTP Request node, set the URL to https://api.example.com/users/{{nodes.formTrigger.data.userId}} to dynamically insert the user ID from a form submission.',
      },
      {
        type: 'heading',
        content: 'Common Variable Paths',
      },
      {
        type: 'list',
        content: [
          '{{nodes.formTrigger.data.*}} - Form submission fields',
          '{{nodes.formTrigger.respondent.email}} - Submitter email',
          '{{nodes.httpRequest.data}} - HTTP response body',
          '{{nodes.httpRequest.status}} - HTTP status code',
          '{{nodes.mongodbQuery.documents}} - Query results array',
          '{{nodes.conditional.branch}} - "true" or "false"',
          '{{nodes.switch.output}} - Matched switch branch name',
        ],
      },
      {
        type: 'heading',
        content: 'Using the Variable Picker',
      },
      {
        type: 'text',
        content:
          'Click the {x} icon next to any text or code field to open the variable picker. It shows all available variables from upstream nodes. Click a variable to insert it at your cursor position.',
      },
      {
        type: 'tip',
        content:
          'Variables are only available from nodes that execute before the current node. Connect nodes in the correct order to ensure data flows properly.',
      },
      {
        type: 'heading',
        content: 'Nested Object Access',
      },
      {
        type: 'text',
        content:
          'Use dot notation to access nested properties. For arrays, use bracket notation:',
      },
      {
        type: 'code',
        content: [
          '{{nodes.httpRequest.data.user.name}}',
          '{{nodes.mongodbQuery.documents[0].email}}',
        ],
      },
      {
        type: 'warning',
        content:
          'If a variable path does not exist, the template will remain unchanged (e.g., the literal text {{path}} will be used). Always verify your paths are correct.',
      },
    ],
    relatedTopics: ['workflow-nodes'],
    keywords: ['variables', 'data', 'reference', 'template', 'nodes', 'workflow', 'dynamic'],
  },

  'workflow-nodes': {
    id: 'workflow-nodes',
    title: 'Workflow Node Types',
    description: 'Overview of available workflow nodes and their outputs.',
    content: [
      {
        type: 'heading',
        content: 'Trigger Nodes',
      },
      {
        type: 'text',
        content: 'Triggers start your workflow. Every workflow needs at least one trigger.',
      },
      {
        type: 'list',
        content: [
          'Form Trigger - Runs when a form is submitted',
          'Webhook Trigger - Runs when an external HTTP request is received',
          'Schedule Trigger - Runs on a cron schedule',
          'Manual Trigger - Runs when manually started by a user',
        ],
      },
      {
        type: 'heading',
        content: 'Logic Nodes',
      },
      {
        type: 'list',
        content: [
          'If/Else (Conditional) - Branch based on conditions, outputs true/false branch',
          'Switch - Route to multiple named branches based on a value',
          'Delay - Wait for a specified duration before continuing',
          'Filter - Filter an array based on conditions',
        ],
      },
      {
        type: 'heading',
        content: 'Data Nodes',
      },
      {
        type: 'list',
        content: [
          'Transform - Modify and reshape data',
          'MongoDB Query - Query documents from MongoDB (find, findOne, aggregate, count)',
          'MongoDB Write - Insert, update, or delete documents',
        ],
      },
      {
        type: 'heading',
        content: 'Integration Nodes',
      },
      {
        type: 'list',
        content: [
          'HTTP Request - Make API calls to external services',
          'Send Email - Send email notifications',
        ],
      },
      {
        type: 'heading',
        content: 'Custom Nodes',
      },
      {
        type: 'list',
        content: [
          'Code - Execute custom JavaScript with access to input data and helper functions',
        ],
      },
      {
        type: 'tip',
        content:
          'Each node type outputs specific data that can be referenced by downstream nodes. Click a node and expand "Available Data" to see what variables it provides.',
      },
    ],
    relatedTopics: ['workflow-variables', 'node-form-trigger', 'node-conditional', 'node-http-request', 'node-transform'],
    keywords: ['nodes', 'triggers', 'logic', 'data', 'integrations', 'workflow'],
  },

  // ============================================
  // Workflow Node Documentation - Triggers
  // ============================================

  'node-form-trigger': {
    id: 'node-form-trigger',
    title: 'Form Trigger Node',
    description: 'Start a workflow automatically when a form is submitted. The most common way to trigger workflows in NetPad.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Form Trigger node starts your workflow whenever a linked form receives a submission. This is the primary way to automate actions based on user input.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Form: Select which form should trigger this workflow',
          'The trigger automatically receives all form submission data',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'data: Object containing all submitted form field values',
          'formId: Unique identifier of the form',
          'formName: Display name of the form',
          'submissionId: Unique identifier of this submission',
          'submittedAt: ISO timestamp of when the form was submitted',
          '_rawPayload: Full trigger payload for advanced use cases',
        ],
      },
      {
        type: 'heading',
        content: 'Accessing Form Data',
      },
      {
        type: 'text',
        content: 'Use variable syntax to access submitted field values in downstream nodes:',
      },
      {
        type: 'code',
        content: [
          '{{nodes.formTrigger.data.email}}',
          '{{nodes.formTrigger.data.firstName}}',
          '{{nodes.formTrigger.data.address.city}}',
          '{{nodes.formTrigger.submissionId}}',
        ],
      },
      {
        type: 'example',
        content: 'A contact form workflow: Form Trigger → Send Email (notify sales team) → MongoDB Write (save to CRM collection)',
      },
      {
        type: 'tip',
        content: 'Each form can trigger multiple workflows. Create separate workflows for different automation needs (email notifications, data processing, integrations).',
      },
    ],
    relatedTopics: ['workflow-nodes', 'workflow-variables', 'node-webhook-trigger'],
    keywords: ['form', 'trigger', 'submission', 'start', 'workflow', 'data'],
  },

  'node-webhook-trigger': {
    id: 'node-webhook-trigger',
    title: 'Webhook Trigger Node',
    description: 'Start a workflow from external HTTP requests. Integrate with third-party services, CI/CD pipelines, or custom applications.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Webhook Trigger creates a unique URL endpoint that external systems can call to start your workflow. Perfect for integrations with services like Stripe, GitHub, Zapier, or custom applications.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Webhook URL: Auto-generated unique URL for this trigger',
          'HTTP Methods: Which methods to accept (POST, GET, PUT, etc.)',
          'Authentication: Optional secret token for security',
          'Response Mode: Sync (wait for workflow) or Async (immediate acknowledgment)',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'body: The JSON body of the incoming request',
          'headers: HTTP headers from the request',
          'method: HTTP method used (POST, GET, etc.)',
          'query: URL query parameters',
          'path: Request path',
        ],
      },
      {
        type: 'heading',
        content: 'Example Webhook Call',
      },
      {
        type: 'code',
        content: [
          'curl -X POST https://your-domain.com/api/webhooks/wh_abc123 \\',
          '  -H "Content-Type: application/json" \\',
          '  -H "X-Webhook-Secret: your-secret-token" \\',
          '  -d \'{"event": "user.created", "data": {"id": "123", "email": "user@example.com"}}\'',
        ],
      },
      {
        type: 'heading',
        content: 'Security Best Practices',
      },
      {
        type: 'list',
        content: [
          'Always use a webhook secret for production workflows',
          'Validate the request body structure in a Conditional node',
          'Use HTTPS endpoints only',
          'Log incoming requests for debugging',
        ],
      },
      {
        type: 'warning',
        content: 'Webhook URLs should be kept secret. Anyone with the URL can trigger your workflow.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-form-trigger', 'node-http-request'],
    keywords: ['webhook', 'trigger', 'http', 'api', 'integration', 'external'],
  },

  'node-schedule-trigger': {
    id: 'node-schedule-trigger',
    title: 'Schedule Trigger Node',
    description: 'Run workflows on a time-based schedule using cron expressions. Automate recurring tasks like reports, cleanups, and syncs.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Schedule Trigger runs your workflow automatically at specified times. Use cron expressions for flexible scheduling from every minute to once a year.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Cron Expression: Standard cron format (minute hour day month weekday)',
          'Timezone: Timezone for schedule interpretation (default: UTC)',
          'Enabled: Toggle to pause/resume the schedule',
        ],
      },
      {
        type: 'heading',
        content: 'Cron Expression Format',
      },
      {
        type: 'code',
        content: [
          '┌───────────── minute (0 - 59)',
          '│ ┌─────────── hour (0 - 23)',
          '│ │ ┌───────── day of month (1 - 31)',
          '│ │ │ ┌─────── month (1 - 12)',
          '│ │ │ │ ┌───── day of week (0 - 6, Sunday = 0)',
          '│ │ │ │ │',
          '* * * * *',
        ],
      },
      {
        type: 'heading',
        content: 'Common Cron Examples',
      },
      {
        type: 'list',
        content: [
          '0 9 * * 1-5 → Every weekday at 9:00 AM',
          '0 0 * * * → Every day at midnight',
          '*/15 * * * * → Every 15 minutes',
          '0 8 1 * * → First day of every month at 8:00 AM',
          '0 0 * * 0 → Every Sunday at midnight',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'scheduledTime: ISO timestamp of when the workflow was scheduled to run',
          'executionTime: ISO timestamp of actual execution',
          'cronExpression: The cron expression that triggered this run',
        ],
      },
      {
        type: 'example',
        content: 'Daily report workflow: Schedule Trigger (0 8 * * *) → MongoDB Query (get yesterday\'s data) → Transform (format report) → Send Email',
      },
      {
        type: 'tip',
        content: 'Test scheduled workflows manually first using the Manual Trigger before enabling the schedule.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-manual-trigger'],
    keywords: ['schedule', 'cron', 'timer', 'recurring', 'automated', 'daily', 'weekly'],
  },

  'node-manual-trigger': {
    id: 'node-manual-trigger',
    title: 'Manual Trigger Node',
    description: 'Start a workflow with a button click. Perfect for testing, on-demand tasks, and admin operations.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Manual Trigger lets you start a workflow by clicking a button in the workflow editor. Essential for testing workflows and running on-demand operations.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Input Data: Optional JSON object to pass as trigger payload',
          'This simulates data that would come from other trigger types',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'triggeredAt: ISO timestamp of when the workflow was triggered',
          'triggeredBy: User ID of who triggered the workflow',
          'payload: Any input data provided in configuration',
        ],
      },
      {
        type: 'heading',
        content: 'Use Cases',
      },
      {
        type: 'list',
        content: [
          'Testing workflows before connecting to real triggers',
          'Running data migration or cleanup tasks',
          'Admin operations like sending batch notifications',
          'Development and debugging',
        ],
      },
      {
        type: 'tip',
        content: 'Add test data in the Input Data field to simulate form submissions or webhook payloads during development.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-form-trigger', 'node-webhook-trigger'],
    keywords: ['manual', 'trigger', 'test', 'button', 'start', 'debug'],
  },

  // ============================================
  // Workflow Node Documentation - Logic
  // ============================================

  'node-conditional': {
    id: 'node-conditional',
    title: 'Conditional (If/Else) Node',
    description: 'Branch your workflow based on conditions. Route data down different paths depending on field values.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Conditional node evaluates conditions and routes your workflow down a "true" or "false" branch. Use it to create different paths for different scenarios.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Conditions: One or more conditions to evaluate',
          'Combine With: "AND" (all must be true) or "OR" (any can be true)',
        ],
      },
      {
        type: 'heading',
        content: 'Condition Operators',
      },
      {
        type: 'list',
        content: [
          'equals / not_equals: Exact value matching',
          'contains / not_contains: Partial text matching (case-insensitive)',
          'starts_with / ends_with: Text prefix/suffix matching',
          'gt / gte / lt / lte: Numeric comparisons (>, >=, <, <=)',
          'is_empty / is_not_empty: Check for null, undefined, or empty string',
          'is_true / is_false: Boolean checks',
          'exists / not_exists: Check if field is defined',
          'regex: Regular expression matching',
        ],
      },
      {
        type: 'heading',
        content: 'Example Conditions',
      },
      {
        type: 'code',
        content: [
          '// Check if priority is high',
          'field: "nodes.formTrigger.data.priority"',
          'operator: "equals"',
          'value: "high"',
          '',
          '// Check if amount is over $1000',
          'field: "nodes.formTrigger.data.amount"',
          'operator: "gt"',
          'value: 1000',
          '',
          '// Check if email is from company domain',
          'field: "nodes.formTrigger.data.email"',
          'operator: "ends_with"',
          'value: "@company.com"',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'result: Boolean - the final evaluation result',
          'branch: "true" or "false" - which path was taken',
          'data: Pass-through of input data',
          'evaluatedConditions: Array with details of each condition evaluation',
        ],
      },
      {
        type: 'example',
        content: 'Route support tickets: If priority equals "urgent" → Send Slack alert, Else → Add to queue',
      },
      {
        type: 'tip',
        content: 'Use dot notation to access nested fields: "nodes.formTrigger.data.address.country"',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-switch', 'workflow-variables'],
    keywords: ['conditional', 'if', 'else', 'branch', 'condition', 'logic', 'route'],
  },

  'node-switch': {
    id: 'node-switch',
    title: 'Switch Node',
    description: 'Route data to multiple paths based on a field value. More flexible than conditional for multi-branch logic.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Switch node evaluates a field and routes to different outputs based on matching cases. Unlike Conditional (binary true/false), Switch supports many named output branches.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Field: The field path to evaluate (supports dot notation)',
          'Cases: Array of value → output branch mappings',
          'Default Output: Branch name when no case matches (default: "default")',
          'Match Mode: How to compare values (exact, contains, regex, range)',
        ],
      },
      {
        type: 'heading',
        content: 'Match Modes',
      },
      {
        type: 'list',
        content: [
          'exact: Value must match exactly (or string comparison)',
          'contains: Field value contains the case value (for strings/arrays)',
          'regex: Case value is treated as a regular expression',
          'range: Use min/max values for numeric ranges',
        ],
      },
      {
        type: 'heading',
        content: 'Example Configuration',
      },
      {
        type: 'code',
        content: [
          'field: "nodes.formTrigger.data.department"',
          'matchMode: "exact"',
          'cases: [',
          '  { value: "sales", output: "sales-team" },',
          '  { value: "support", output: "support-team" },',
          '  { value: "engineering", output: "eng-team" }',
          ']',
          'defaultOutput: "general"',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'output: Name of the matched output branch',
          'matchedCase: The value that matched (or "default")',
          'matchedIndex: Index of the matched case (-1 for default)',
          'isDefault: Boolean indicating if default was used',
          'fieldValue: The actual value that was evaluated',
          'data: Pass-through of input data',
        ],
      },
      {
        type: 'example',
        content: 'Route by region: Switch on country → separate branches for US, EU, APAC processing with different compliance rules.',
      },
      {
        type: 'tip',
        content: 'Use range mode for numeric tiers: 0-100 → "bronze", 100-500 → "silver", 500+ → "gold"',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-conditional', 'workflow-variables'],
    keywords: ['switch', 'route', 'multiple', 'branch', 'case', 'match'],
  },

  'node-delay': {
    id: 'node-delay',
    title: 'Delay Node',
    description: 'Pause workflow execution for a specified duration. Useful for rate limiting, scheduling, and timed sequences.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Delay node pauses your workflow for a specified amount of time before continuing to the next node. Data passes through unchanged after the delay.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Duration: Number of time units to wait',
          'Unit: Time unit - milliseconds, seconds, minutes, or hours',
        ],
      },
      {
        type: 'heading',
        content: 'Examples',
      },
      {
        type: 'list',
        content: [
          '5 seconds: Rate limiting between API calls',
          '1 minute: Cool-down period before retry',
          '1 hour: Delayed follow-up email',
          'Maximum delay: 10 minutes (capped for safety)',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'delayed: Always true',
          'requestedMs: The delay duration that was requested',
          'actualMs: The actual duration waited',
          'Plus all input data passed through',
        ],
      },
      {
        type: 'heading',
        content: 'Use Cases',
      },
      {
        type: 'list',
        content: [
          'Rate limiting: Add delays between API calls to avoid rate limits',
          'Staged emails: Send welcome email, delay 1 day, send follow-up',
          'Retry backoff: Delay before retrying failed operations',
          'Scheduled actions: Wait before performing time-sensitive operations',
        ],
      },
      {
        type: 'warning',
        content: 'Delays longer than 10 minutes are automatically capped. For longer delays, use the Schedule Trigger to start a new workflow at a specific time.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-conditional', 'node-schedule-trigger'],
    keywords: ['delay', 'wait', 'pause', 'timer', 'rate', 'limit'],
  },

  'node-loop': {
    id: 'node-loop',
    title: 'Loop Node',
    description: 'Iterate over arrays and process each item. Execute a sequence of nodes for every item in a list.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Loop node iterates over an array and executes connected nodes for each item. Perfect for processing lists of records, sending batch notifications, or performing bulk operations.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Array Field: Path to the array to iterate over',
          'Item Variable: Name for the current item (default: "item")',
          'Index Variable: Name for the current index (default: "index")',
          'Batch Size: Process items in batches (optional)',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data (per iteration)',
      },
      {
        type: 'list',
        content: [
          'item: The current array item being processed',
          'index: Current index (0-based)',
          'total: Total number of items in the array',
          'isFirst: Boolean - true for first item',
          'isLast: Boolean - true for last item',
        ],
      },
      {
        type: 'heading',
        content: 'Example',
      },
      {
        type: 'code',
        content: [
          '// Array field: "nodes.mongodbQuery.documents"',
          '',
          '// In downstream nodes, access:',
          '{{loop.item.email}}',
          '{{loop.index}}',
          '{{loop.total}}',
        ],
      },
      {
        type: 'example',
        content: 'Send personalized emails: MongoDB Query (get users) → Loop → Send Email (using {{loop.item.email}} and {{loop.item.name}})',
      },
      {
        type: 'warning',
        content: 'Be careful with large arrays. Consider using batch processing or filtering to limit the number of iterations.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-filter', 'node-mongodb-query'],
    keywords: ['loop', 'iterate', 'array', 'batch', 'foreach', 'process'],
  },

  // ============================================
  // Workflow Node Documentation - Integrations
  // ============================================

  'node-http-request': {
    id: 'node-http-request',
    title: 'HTTP Request Node',
    description: 'Make HTTP API calls to external services. Supports all methods, authentication, headers, and body formats.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The HTTP Request node makes HTTP calls to external APIs. Use it to integrate with any REST API, send webhooks, or fetch data from external services.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'URL: The endpoint URL (supports {{variables}})',
          'Method: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
          'Headers: Custom HTTP headers as key-value pairs',
          'Query Parameters: URL query parameters',
          'Body: Request body for POST/PUT/PATCH',
          'Body Type: json, form, text, or binary',
          'Authentication: none, basic, bearer, or api_key',
          'Timeout: Request timeout in milliseconds (default: 30000)',
          'Follow Redirects: Whether to follow HTTP redirects',
        ],
      },
      {
        type: 'heading',
        content: 'Authentication Types',
      },
      {
        type: 'list',
        content: [
          'None: No authentication',
          'Basic: Username/password (Basic Auth header)',
          'Bearer: Token-based authentication (Bearer token)',
          'API Key: Custom header with API key',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'status: HTTP status code (200, 404, etc.)',
          'statusText: HTTP status text (OK, Not Found, etc.)',
          'headers: Response headers object',
          'data: Response body (auto-parsed if JSON)',
          'ok: Boolean - true if status is 2xx',
          'url: Final URL after redirects',
        ],
      },
      {
        type: 'heading',
        content: 'Example: POST with JSON Body',
      },
      {
        type: 'code',
        content: [
          'URL: https://api.example.com/users',
          'Method: POST',
          'Headers: { "X-API-Key": "{{variables.apiKey}}" }',
          'Body Type: json',
          'Body: {',
          '  "email": "{{nodes.formTrigger.data.email}}",',
          '  "name": "{{nodes.formTrigger.data.name}}"',
          '}',
        ],
      },
      {
        type: 'tip',
        content: 'Use the Conditional node after HTTP Request to handle different status codes - route errors to a notification node.',
      },
      {
        type: 'warning',
        content: 'Store API keys and secrets in workflow variables, not directly in node configuration.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-webhook-trigger', 'workflow-variables'],
    keywords: ['http', 'request', 'api', 'rest', 'fetch', 'post', 'get', 'integration'],
  },

  'node-mongodb-query': {
    id: 'node-mongodb-query',
    title: 'MongoDB Query Node',
    description: 'Query documents from MongoDB. Supports find, findOne, aggregate, count, and distinct operations.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The MongoDB Query node retrieves data from your MongoDB collections. Use it to fetch records, run aggregations, count documents, or get distinct values.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Connection: Select a MongoDB connection from your vault',
          'Collection: Name of the collection to query',
          'Operation: find, findOne, aggregate, count, or distinct',
        ],
      },
      {
        type: 'heading',
        content: 'Operations',
      },
      {
        type: 'list',
        content: [
          'find: Return multiple matching documents (with limit)',
          'findOne: Return first matching document',
          'aggregate: Run aggregation pipeline',
          'count: Count matching documents',
          'distinct: Get unique values for a field',
        ],
      },
      {
        type: 'heading',
        content: 'Find/FindOne Options',
      },
      {
        type: 'list',
        content: [
          'Query: MongoDB filter object { field: value }',
          'Projection: Fields to include/exclude',
          'Sort: Sort order { field: 1 or -1 }',
          'Limit: Maximum documents to return (default: 100)',
          'Skip: Number of documents to skip (for pagination)',
        ],
      },
      {
        type: 'heading',
        content: 'Example Query',
      },
      {
        type: 'code',
        content: [
          'Operation: find',
          'Collection: orders',
          'Query: {',
          '  "status": "pending",',
          '  "createdAt": { "$gte": "{{variables.startDate}}" }',
          '}',
          'Sort: { "createdAt": -1 }',
          'Limit: 50',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'documents: Array of matched documents (for find/aggregate)',
          'document: Single document (for findOne)',
          'count: Number of documents (for count, or result count)',
          'values: Distinct values (for distinct)',
          'found: Boolean - whether findOne found a document',
          'metadata: { collection, database, operation, executionTimeMs }',
        ],
      },
      {
        type: 'tip',
        content: 'Use aggregation pipelines for complex queries. The Pipeline Builder in NetPad can help you create them visually.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-mongodb-write', 'mongodb-connection'],
    keywords: ['mongodb', 'query', 'find', 'aggregate', 'database', 'collection'],
  },

  'node-mongodb-write': {
    id: 'node-mongodb-write',
    title: 'MongoDB Write Node',
    description: 'Insert, update, or delete documents in MongoDB. Supports single and bulk operations.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The MongoDB Write node modifies data in your MongoDB collections. Use it to insert new documents, update existing ones, or delete records.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Connection: Select a MongoDB connection from your vault',
          'Collection: Name of the collection to modify',
          'Operation: insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, replaceOne',
        ],
      },
      {
        type: 'heading',
        content: 'Insert Operations',
      },
      {
        type: 'list',
        content: [
          'insertOne: Insert a single document',
          'insertMany: Insert multiple documents',
          'Document(s): The document(s) to insert',
        ],
      },
      {
        type: 'heading',
        content: 'Update Operations',
      },
      {
        type: 'list',
        content: [
          'updateOne: Update first matching document',
          'updateMany: Update all matching documents',
          'Filter: Query to match documents',
          'Update: Update operations ($set, $inc, $push, etc.)',
          'Upsert: Create document if none match (optional)',
        ],
      },
      {
        type: 'heading',
        content: 'Example: Insert Document',
      },
      {
        type: 'code',
        content: [
          'Operation: insertOne',
          'Collection: submissions',
          'Document: {',
          '  "email": "{{nodes.formTrigger.data.email}}",',
          '  "name": "{{nodes.formTrigger.data.name}}",',
          '  "createdAt": "{{variables.now}}",',
          '  "status": "pending"',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Example: Update Document',
      },
      {
        type: 'code',
        content: [
          'Operation: updateOne',
          'Filter: { "_id": "{{nodes.formTrigger.data.userId}}" }',
          'Update: {',
          '  "$set": { "lastLogin": "{{variables.now}}" },',
          '  "$inc": { "loginCount": 1 }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'acknowledged: Boolean - operation was acknowledged by MongoDB',
          'insertedId: ID of inserted document (for insertOne)',
          'insertedIds: Array of IDs (for insertMany)',
          'matchedCount: Number of documents matched (for update)',
          'modifiedCount: Number of documents modified (for update)',
          'deletedCount: Number of documents deleted (for delete)',
        ],
      },
      {
        type: 'warning',
        content: 'Be careful with deleteMany and updateMany operations. Always test with restrictive filters first.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-mongodb-query', 'mongodb-connection'],
    keywords: ['mongodb', 'write', 'insert', 'update', 'delete', 'database', 'collection'],
  },

  'node-google-sheets': {
    id: 'node-google-sheets',
    title: 'Google Sheets Node',
    description: 'Read and write data to Google Sheets. Sync form submissions, create reports, or import data.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Google Sheets node integrates with Google Sheets for reading and writing spreadsheet data. Perfect for creating reports, syncing submissions, or importing data.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Spreadsheet ID: The ID from the Google Sheets URL',
          'Sheet Name: Name of the specific sheet/tab',
          'Operation: read, append, update, or clear',
          'Range: Cell range in A1 notation (e.g., "A1:D100")',
          'Data: Values to write (for append/update)',
        ],
      },
      {
        type: 'heading',
        content: 'Operations',
      },
      {
        type: 'list',
        content: [
          'read: Read data from a range',
          'append: Add new rows to the end of data',
          'update: Update specific cells',
          'clear: Clear values from a range',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data (Read)',
      },
      {
        type: 'list',
        content: [
          'values: 2D array of cell values',
          'rows: Array of objects (if first row contains headers)',
          'rowCount: Number of rows returned',
          'columnCount: Number of columns',
        ],
      },
      {
        type: 'example',
        content: 'Form to Sheet: Form Trigger → Transform (format data) → Google Sheets (append row with {{nodes.transform.name}}, {{nodes.transform.email}})',
      },
      {
        type: 'tip',
        content: 'The Spreadsheet ID is found in the URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-http-request', 'node-transform'],
    keywords: ['google', 'sheets', 'spreadsheet', 'excel', 'read', 'write', 'append'],
  },

  'node-atlas-cluster': {
    id: 'node-atlas-cluster',
    title: 'Atlas Cluster Node',
    description: 'Manage MongoDB Atlas clusters. Get cluster status, pause/resume, or scale operations.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Atlas Cluster node interacts with the MongoDB Atlas Admin API to manage clusters. Use it for monitoring, cost optimization, or automated scaling.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Atlas Credentials: API key pair from your Atlas project',
          'Project ID: Atlas project ID',
          'Cluster Name: Name of the cluster to manage',
          'Operation: getStatus, pause, resume, or scale',
        ],
      },
      {
        type: 'heading',
        content: 'Operations',
      },
      {
        type: 'list',
        content: [
          'getStatus: Get current cluster status and configuration',
          'pause: Pause the cluster (saves cost when not in use)',
          'resume: Resume a paused cluster',
          'scale: Modify cluster tier (requires tier specification)',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'clusterName: Name of the cluster',
          'stateName: Current state (IDLE, CREATING, UPDATING, etc.)',
          'mongoDBVersion: MongoDB version',
          'clusterType: REPLICASET or SHARDED',
          'providerSettings: Cloud provider details',
        ],
      },
      {
        type: 'example',
        content: 'Cost optimization: Schedule Trigger (end of business day) → Atlas Cluster (pause) → Send Email (confirm paused)',
      },
      {
        type: 'warning',
        content: 'Pausing and resuming clusters takes several minutes. Plan for downtime in your workflows.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-atlas-data-api', 'mongodb-connection'],
    keywords: ['atlas', 'cluster', 'mongodb', 'cloud', 'scale', 'pause', 'manage'],
  },

  'node-atlas-data-api': {
    id: 'node-atlas-data-api',
    title: 'Atlas Data API Node',
    description: 'Query MongoDB Atlas via the Data API. Serverless database access without connection management.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Atlas Data API node uses MongoDB Atlas\'s REST-based Data API for database operations. Unlike direct connections, it\'s serverless and doesn\'t require connection management.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Data API Key: API key from Atlas Data API settings',
          'App ID: Atlas App Services App ID',
          'Cluster: Name of the cluster',
          'Database: Database name',
          'Collection: Collection name',
          'Operation: find, findOne, insertOne, updateOne, deleteOne, aggregate',
        ],
      },
      {
        type: 'heading',
        content: 'When to Use Data API vs Direct Connection',
      },
      {
        type: 'list',
        content: [
          'Data API: Serverless functions, edge deployments, simple queries',
          'Direct Connection: High-performance needs, complex transactions, bulk operations',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'text',
        content: 'Same as MongoDB Query/Write nodes, depending on the operation.',
      },
      {
        type: 'tip',
        content: 'Enable the Data API in Atlas under App Services > Data API. Create an API key with appropriate permissions.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-mongodb-query', 'node-atlas-cluster'],
    keywords: ['atlas', 'data', 'api', 'serverless', 'rest', 'mongodb'],
  },

  // ============================================
  // Workflow Node Documentation - Actions
  // ============================================

  'node-email-send': {
    id: 'node-email-send',
    title: 'Send Email Node',
    description: 'Send emails via SMTP or SendGrid. Supports HTML templates, attachments, and dynamic content.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Send Email node sends emails using your configured email credentials (SMTP or SendGrid). Perfect for notifications, confirmations, and automated communications.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Email Credential: REQUIRED - Select from your configured SMTP or SendGrid integrations',
          'To: Recipient email address(es) - comma-separated for multiple',
          'Subject: Email subject line (supports {{variables}})',
          'Body: Email content - plain text or HTML',
          'From: Optional sender address (overrides credential default)',
          'Reply-To: Optional reply-to address',
        ],
      },
      {
        type: 'heading',
        content: 'Setting Up Email Credentials',
      },
      {
        type: 'text',
        content: 'Before using this node, configure email credentials in Settings > Integrations:',
      },
      {
        type: 'list',
        content: [
          'SMTP: Your email server (Gmail, Outlook, custom SMTP)',
          'SendGrid: API key from your SendGrid account',
        ],
      },
      {
        type: 'tip',
        content: 'Node reference IDs: Use the reference ID of an upstream node (e.g. Form Submission) in place of "formTrigger" below. Find it in Node Configuration > Node references, or hover over a node on the canvas to see its reference (e.g. nodes.form-trigger_abc123).',
      },
      {
        type: 'heading',
        content: 'HTML Email Example',
      },
      {
        type: 'code',
        content: [
          'To: {{nodes.formTrigger.data.email}}',
          'Subject: Welcome to our platform, {{nodes.formTrigger.data.name}}!',
          'Body: <html>',
          '  <body>',
          '    <h1>Welcome, {{nodes.formTrigger.data.name}}!</h1>',
          '    <p>Thank you for signing up on {{variables.date}}.</p>',
          '    <p>Your account ID is: {{nodes.formTrigger.submissionId}}</p>',
          '  </body>',
          '</html>',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'sent: Boolean - whether email was sent successfully',
          'messageId: Unique message ID from the email provider',
          'recipients: Array of recipient addresses',
          'accepted: Addresses that accepted the email',
          'rejected: Addresses that rejected the email',
          'provider: "smtp" or "sendgrid"',
          'timestamp: ISO timestamp of when email was sent',
        ],
      },
      {
        type: 'tip',
        content: 'Test emails with your own address first. Check spam folders if emails don\'t arrive.',
      },
      {
        type: 'warning',
        content: 'Email credentials are required. System SMTP (used for authentication emails) cannot be used in workflows.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-notification', 'workflow-variables'],
    keywords: ['email', 'send', 'smtp', 'sendgrid', 'notification', 'message'],
  },

  'node-notification': {
    id: 'node-notification',
    title: 'Notification Node',
    description: 'Send push notifications and in-app alerts. Notify users about important events.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Notification node sends in-app notifications to users. Use it to alert team members about form submissions, workflow completions, or important events.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Title: Notification title',
          'Message: Notification body text',
          'Type: info, success, warning, or error',
          'Recipients: User IDs or "all" for broadcast',
          'Link: Optional URL to navigate when clicked',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'sent: Boolean - notification was queued successfully',
          'notificationId: Unique notification ID',
          'recipientCount: Number of recipients',
        ],
      },
      {
        type: 'example',
        content: 'Alert on high-priority ticket: Form Trigger → Conditional (priority = "high") → Notification (alert support team)',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-email-send'],
    keywords: ['notification', 'alert', 'push', 'message', 'user'],
  },

  // ============================================
  // Workflow Node Documentation - Data
  // ============================================

  'node-transform': {
    id: 'node-transform',
    title: 'Transform Node',
    description: 'Transform and reshape data between nodes. Map fields, apply expressions, or restructure objects.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Transform node modifies data structure between nodes. Use it to rename fields, combine values, format data, or prepare payloads for APIs.',
      },
      {
        type: 'heading',
        content: 'Modes',
      },
      {
        type: 'list',
        content: [
          'Template: Define output object with {{variable}} substitution',
          'Expression: JavaScript expression that returns transformed data',
          'Mapping: Map source fields to target fields with optional transforms',
        ],
      },
      {
        type: 'tip',
        content: 'Node reference IDs: Replace "formTrigger" in the example with your upstream node\'s reference ID. Find it in Node Configuration > Node references, or hover over a node on the canvas (e.g. nodes.form-trigger_abc123).',
      },
      {
        type: 'heading',
        content: 'Template Mode (Recommended)',
      },
      {
        type: 'text',
        content: 'Define your output structure with variable placeholders:',
      },
      {
        type: 'code',
        content: [
          '{',
          '  "fullName": "{{nodes.formTrigger.data.firstName}} {{nodes.formTrigger.data.lastName}}",',
          '  "email": "{{nodes.formTrigger.data.email}}",',
          '  "submittedAt": "{{nodes.formTrigger.submittedAt}}",',
          '  "metadata": {',
          '    "source": "web-form",',
          '    "formId": "{{nodes.formTrigger.formId}}"',
          '  }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Expression Mode',
      },
      {
        type: 'text',
        content: 'Write JavaScript that returns the transformed object:',
      },
      {
        type: 'code',
        content: [
          '// Access data from previous nodes',
          'const items = inputs.documents || [];',
          '',
          '// Transform each item',
          'const processed = items.map(item => ({',
          '  id: item._id,',
          '  name: item.name.toUpperCase(),',
          '  value: item.price * item.quantity',
          '}));',
          '',
          'return { items: processed, count: processed.length };',
        ],
      },
      {
        type: 'heading',
        content: 'Available in Expressions',
      },
      {
        type: 'list',
        content: [
          'inputs: Data from the previous node',
          'nodes: Outputs from all previous nodes',
          'variables: Workflow variables',
          'trigger: Original trigger data',
          'JSON, Math, Date, Array, Object, String, Number: Standard JS objects',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'text',
        content: 'The node outputs whatever you return from template/expression/mapping.',
      },
      {
        type: 'tip',
        content: 'Use Template mode for simple restructuring, Expression mode for complex logic or array processing.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-filter', 'workflow-variables'],
    keywords: ['transform', 'map', 'reshape', 'convert', 'format', 'data'],
  },

  'node-filter': {
    id: 'node-filter',
    title: 'Filter Node',
    description: 'Filter arrays based on conditions. Remove items that don\'t match your criteria.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Filter node removes items from an array that don\'t match specified conditions. Use it to narrow down query results, remove invalid entries, or select specific records.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Array Field: Path to the array to filter',
          'Conditions: Criteria each item must match (same operators as Conditional node)',
          'Combine With: AND or OR for multiple conditions',
        ],
      },
      {
        type: 'heading',
        content: 'Example',
      },
      {
        type: 'code',
        content: [
          'Array Field: "nodes.mongodbQuery.documents"',
          'Conditions:',
          '  - field: "status", operator: "equals", value: "active"',
          '  - field: "score", operator: "gte", value: 80',
          'Combine With: AND',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'items: Filtered array of items that matched',
          'count: Number of items that passed the filter',
          'removed: Number of items that were filtered out',
          'originalCount: Original array length',
        ],
      },
      {
        type: 'tip',
        content: 'Combine with MongoDB Query\'s filter for best performance - filter at the database level when possible.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-transform', 'node-loop'],
    keywords: ['filter', 'array', 'condition', 'remove', 'select'],
  },

  'node-merge': {
    id: 'node-merge',
    title: 'Merge Node',
    description: 'Combine data from multiple sources. Merge objects, concatenate arrays, or join datasets.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Merge node combines data from multiple upstream nodes. Use it to consolidate results from parallel branches or combine related data.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Mode: object (merge objects), array (concatenate arrays), or join (join by key)',
          'Sources: Paths to the data to merge',
          'Join Key: Field to match on (for join mode)',
        ],
      },
      {
        type: 'heading',
        content: 'Merge Modes',
      },
      {
        type: 'list',
        content: [
          'Object: Combine multiple objects into one (later values override)',
          'Array: Concatenate multiple arrays into a single array',
          'Join: Match records from two arrays by a common key',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'result: The merged data (object or array depending on mode)',
          'sourceCount: Number of sources merged',
        ],
      },
      {
        type: 'example',
        content: 'Enrich user data: MongoDB Query (users) + HTTP Request (external profiles) → Merge (join by email) → Send Email',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-transform', 'node-filter'],
    keywords: ['merge', 'combine', 'join', 'concatenate', 'union'],
  },

  // ============================================
  // Workflow Node Documentation - AI
  // ============================================

  'node-ai-prompt': {
    id: 'node-ai-prompt',
    title: 'AI Prompt Node',
    description: 'Send prompts to AI language models. Generate text, analyze content, or answer questions.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The AI Prompt node sends text to an AI language model and returns the generated response. Use it for text generation, summarization, analysis, and more.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Prompt: The text prompt to send (supports {{variables}})',
          'System Message: Optional system instruction to guide the AI',
          'Model: AI model to use (auto-selected based on provider)',
          'Temperature: Creativity level (0 = deterministic, 1 = creative)',
          'Max Tokens: Maximum response length',
        ],
      },
      {
        type: 'heading',
        content: 'Example Prompt',
      },
      {
        type: 'code',
        content: [
          'System: You are a customer support assistant. Be helpful and professional.',
          '',
          'Prompt: Please summarize this customer feedback:',
          '{{nodes.formTrigger.data.feedback}}',
          '',
          'Include: key points, sentiment, and suggested action.',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'response: The AI-generated text response',
          'model: Model that was used',
          'usage: Token usage statistics',
          'finishReason: Why generation stopped (stop, length, etc.)',
        ],
      },
      {
        type: 'example',
        content: 'Auto-respond: Form Trigger (support request) → AI Prompt (generate response) → Send Email (to customer)',
      },
      {
        type: 'tip',
        content: 'Be specific in your prompts. Include context, format requirements, and examples for best results.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-ai-classify', 'node-ai-extract'],
    keywords: ['ai', 'prompt', 'llm', 'generate', 'text', 'gpt', 'language'],
  },

  'node-ai-classify': {
    id: 'node-ai-classify',
    title: 'AI Classify Node',
    description: 'Classify text into predefined categories using AI. Auto-route tickets, categorize feedback, or tag content.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The AI Classify node uses AI to categorize text into predefined categories. Perfect for ticket routing, sentiment analysis, and content tagging.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Text: The text to classify (supports {{variables}})',
          'Categories: List of possible categories',
          'Allow Multiple: Whether multiple categories can be selected',
          'Include Confidence: Include confidence scores in output',
        ],
      },
      {
        type: 'heading',
        content: 'Example',
      },
      {
        type: 'code',
        content: [
          'Text: {{nodes.formTrigger.data.message}}',
          'Categories:',
          '  - billing',
          '  - technical-support',
          '  - feature-request',
          '  - general-inquiry',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'category: The selected category (or array if multiple)',
          'confidence: Confidence score (0-1)',
          'allScores: Scores for all categories',
        ],
      },
      {
        type: 'example',
        content: 'Support routing: Form Trigger → AI Classify → Switch (by category) → different notification channels',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-ai-prompt', 'node-switch'],
    keywords: ['ai', 'classify', 'category', 'route', 'tag', 'sentiment'],
  },

  'node-ai-extract': {
    id: 'node-ai-extract',
    title: 'AI Extract Node',
    description: 'Extract structured data from unstructured text using AI. Pull out names, dates, addresses, and custom fields.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The AI Extract node uses AI to pull structured data from unstructured text. Extract entities like names, emails, dates, amounts, or any custom fields you define.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Text: The text to extract from (supports {{variables}})',
          'Fields: List of fields to extract with types and descriptions',
          'Strict Mode: Fail if required fields not found',
        ],
      },
      {
        type: 'heading',
        content: 'Field Configuration',
      },
      {
        type: 'code',
        content: [
          'Fields:',
          '  - name: "customerName"',
          '    type: "string"',
          '    description: "The customer\'s full name"',
          '    required: true',
          '  - name: "amount"',
          '    type: "number"',
          '    description: "Dollar amount mentioned"',
          '  - name: "productNames"',
          '    type: "array"',
          '    description: "List of products mentioned"',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'Each configured field becomes an output property',
          'extracted: Object containing all extracted values',
          'confidence: Confidence scores per field',
        ],
      },
      {
        type: 'example',
        content: 'Email parsing: Webhook (incoming email) → AI Extract (customer name, order number) → MongoDB Query (find order)',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-ai-prompt', 'node-transform'],
    keywords: ['ai', 'extract', 'parse', 'entity', 'structured', 'data'],
  },

  'node-ai-embed': {
    id: 'node-ai-embed',
    title: 'Generate Embeddings Node',
    description: 'Generate vector embeddings for text using Voyage AI, Atlas AI Services, or OpenAI. Enable semantic search and RAG applications.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Generate Embeddings node creates vector embeddings from text. Embeddings are numerical representations that capture semantic meaning, enabling similarity search and RAG (Retrieval Augmented Generation) applications.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Provider: auto (recommended), atlas-ai, voyage, or openai',
          'Model: Embedding model to use',
          'Text: The text content to embed (supports {{variables}})',
          'Input Type: document (for indexing) or query (for searching)',
        ],
      },
      {
        type: 'heading',
        content: 'Embedding Providers',
      },
      {
        type: 'list',
        content: [
          'Auto-detect: Uses best available provider (Atlas AI → Voyage → OpenAI)',
          'Atlas AI Services: MongoDB\'s managed Voyage AI integration',
          'Voyage AI Direct: Direct API access to Voyage models',
          'OpenAI: OpenAI\'s embedding models',
        ],
      },
      {
        type: 'heading',
        content: 'Voyage AI Models',
      },
      {
        type: 'list',
        content: [
          'voyage-3: General purpose, 1024 dimensions ($0.06/M tokens)',
          'voyage-3-lite: Cost-optimized, 512 dimensions ($0.02/M tokens)',
          'voyage-code-3: Code/technical, 1536 dimensions ($0.06/M tokens)',
          'voyage-3-large: High accuracy, 1024 dimensions ($0.18/M tokens)',
        ],
      },
      {
        type: 'heading',
        content: 'Document vs Query Input Types',
      },
      {
        type: 'text',
        content: 'Voyage AI uses asymmetric embeddings - documents and queries are embedded differently for better search:',
      },
      {
        type: 'list',
        content: [
          'document: Use when embedding content to store in a database',
          'query: Use when embedding a search query to find similar content',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'embedding: Vector array of numbers (e.g., 1024 floats)',
          'dimensions: Number of dimensions in the embedding',
          'model: Model that was used',
          'provider: Provider that was used',
          'cost: Estimated cost in USD',
        ],
      },
      {
        type: 'example',
        content: 'RAG workflow: Form Trigger (question) → Generate Embeddings (query type) → Vector Search → AI Prompt (answer with context)',
      },
      {
        type: 'tip',
        content: 'Store document embeddings in MongoDB with a Vector Search index. Use the Vector Search node to find similar documents.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-vector-search', 'node-semantic-search', 'rag-document-management'],
    keywords: ['embedding', 'vector', 'voyage', 'atlas', 'openai', 'semantic', 'ai'],
  },

  'node-vector-search': {
    id: 'node-vector-search',
    title: 'Vector Search Node',
    description: 'Search MongoDB Atlas Vector Search index. Find semantically similar documents using vector embeddings.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Vector Search node queries a MongoDB Atlas Vector Search index to find documents similar to a given embedding vector. Use it after generating query embeddings to find relevant content.',
      },
      {
        type: 'heading',
        content: 'Prerequisites',
      },
      {
        type: 'list',
        content: [
          'MongoDB Atlas M10+ cluster (or Atlas Local for self-hosted)',
          'Vector Search index created on your collection',
          'Documents with stored embedding vectors',
        ],
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Connection: MongoDB connection from your vault',
          'Collection: Collection containing embedded documents',
          'Index Name: Name of your Vector Search index',
          'Embedding Field: Field containing the vectors (default: "embedding")',
          'Query Vector: The embedding to search for (use {{previous.embedding}})',
          'Number of Candidates: Pre-filter candidates (default: 100)',
          'Limit: Maximum results to return (default: 10)',
          'Minimum Score: Threshold for similarity (0-1, default: 0)',
          'Pre-Filter: Optional MongoDB filter before vector search',
        ],
      },
      {
        type: 'heading',
        content: 'Example Configuration',
      },
      {
        type: 'code',
        content: [
          'Collection: knowledge_base',
          'Index Name: vector_index',
          'Embedding Field: embedding',
          'Query Vector: {{nodes.aiEmbed.embedding}}',
          'Number of Candidates: 200',
          'Limit: 5',
          'Minimum Score: 0.7',
          'Pre-Filter: { "category": "technical" }',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'results: Array of matching documents with similarity scores',
          'count: Number of results returned',
          'latencyMs: Search execution time',
        ],
      },
      {
        type: 'heading',
        content: 'Result Document Structure',
      },
      {
        type: 'code',
        content: [
          '{',
          '  "_id": "...",',
          '  "title": "Document Title",',
          '  "content": "Document content...",',
          '  "vectorSearchScore": 0.92  // Similarity score',
          '}',
        ],
      },
      {
        type: 'tip',
        content: 'Use pre-filtering to narrow results by metadata (category, date, etc.) before vector similarity is calculated.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-ai-embed', 'node-semantic-search'],
    keywords: ['vector', 'search', 'atlas', 'similarity', 'semantic', 'embedding'],
  },

  'node-semantic-search': {
    id: 'node-semantic-search',
    title: 'Semantic Search Node',
    description: 'Combined embedding + vector search in one step. Simplify RAG workflows by handling both operations.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Semantic Search node combines embedding generation and vector search into a single step. Provide a text query, and it generates the embedding and searches in one operation.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Provider: Embedding provider (auto, atlas-ai, voyage, openai)',
          'Model: Embedding model to use',
          'Query: Natural language search query (supports {{variables}})',
          'Connection: MongoDB connection from your vault',
          'Collection: Collection containing embedded documents',
          'Index Name: Name of your Vector Search index',
          'Embedding Field: Field containing the vectors',
          'Limit: Maximum results to return',
          'Minimum Score: Similarity threshold (0-1)',
          'Pre-Filter: Optional MongoDB filter',
        ],
      },
      {
        type: 'heading',
        content: 'Semantic Search vs Separate Nodes',
      },
      {
        type: 'list',
        content: [
          'Semantic Search: Simpler, single node for common use cases',
          'Separate Embed + Vector Search: More control, reusable embeddings',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'results: Array of matching documents with scores',
          'count: Number of results',
          'queryEmbedding: The generated embedding (for debugging)',
          'embeddingCost: Cost of embedding generation',
          'latencyMs: Total operation time',
        ],
      },
      {
        type: 'example',
        content: 'Knowledge base Q&A: Form Trigger (question) → Semantic Search (find relevant docs) → AI Prompt (answer using {{results}})',
      },
      {
        type: 'tip',
        content: 'The Semantic Search node automatically uses "query" input type for optimal search embeddings.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-ai-embed', 'node-vector-search', 'node-ai-prompt'],
    keywords: ['semantic', 'search', 'rag', 'embedding', 'vector', 'query'],
  },

  // ============================================
  // Workflow Node Documentation - Custom
  // ============================================

  'node-code': {
    id: 'node-code',
    title: 'Code Node',
    description: 'Execute custom JavaScript code. Full control for complex transformations, calculations, and logic.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The Code node executes custom JavaScript in a sandboxed environment. Use it when built-in nodes don\'t cover your specific requirements.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Code: JavaScript code to execute',
          'Timeout: Execution timeout (default: 5000ms, max: 30000ms)',
        ],
      },
      {
        type: 'heading',
        content: 'Available Variables',
      },
      {
        type: 'list',
        content: [
          'input: Data from the previous node',
          'outputs: All previous node outputs by node ID',
          'variables: Workflow variables',
          'trigger: Original trigger data',
          'console: { log, warn, error } for logging',
          'helpers: Utility functions (see below)',
        ],
      },
      {
        type: 'heading',
        content: 'Helper Functions',
      },
      {
        type: 'list',
        content: [
          'Date: now(), formatDate(), parseDate(), addDays(), addHours()',
          'String: slugify(), truncate(), capitalize(), camelCase(), snakeCase()',
          'Array: unique(), flatten(), chunk(), groupBy(), sortBy(), sum(), avg()',
          'Object: pick(), omit(), get(), set(), merge(), deepMerge()',
          'Encoding: base64Encode(), base64Decode(), urlEncode(), urlDecode()',
          'Utility: uuid(), round(), clamp(), random()',
        ],
      },
      {
        type: 'heading',
        content: 'Example Code',
      },
      {
        type: 'code',
        content: [
          '// Process order data',
          'const items = input.items || [];',
          '',
          '// Calculate totals using helpers',
          'const subtotal = helpers.sum(items.map(i => i.price * i.quantity));',
          'const tax = helpers.round(subtotal * 0.08, 2);',
          'const total = subtotal + tax;',
          '',
          '// Group items by category',
          'const byCategory = helpers.groupBy(items, \'category\');',
          '',
          '// Return the result',
          'return {',
          '  orderId: helpers.uuid(),',
          '  items,',
          '  subtotal,',
          '  tax,',
          '  total,',
          '  byCategory,',
          '  processedAt: helpers.now().toISOString()',
          '};',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'text',
        content: 'Whatever your code returns becomes the node output. If returning an object, its properties are accessible to downstream nodes.',
      },
      {
        type: 'tip',
        content: 'Use console.log() for debugging - logs appear in the workflow execution details.',
      },
      {
        type: 'warning',
        content: 'Code runs in a sandbox without network access or file system. For external calls, use the HTTP Request node.',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-transform', 'workflow-variables'],
    keywords: ['code', 'javascript', 'custom', 'script', 'function', 'logic'],
  },

  'node-html-output': {
    id: 'node-html-output',
    title: 'HTML Output Node',
    description: 'Render data as HTML using templates. Create formatted reports, emails, or web content.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content: 'The HTML Output node renders data into HTML using a template. Use it to create formatted emails, reports, or any HTML content with dynamic data.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Template: HTML template with {{variable}} placeholders',
          'Data: Data object to use in the template',
          'Include Styles: Whether to include default styling',
        ],
      },
      {
        type: 'heading',
        content: 'Template Example',
      },
      {
        type: 'code',
        content: [
          '<html>',
          '<head><style>',
          '  body { font-family: Arial; }',
          '  .header { background: #4CAF50; color: white; padding: 20px; }',
          '</style></head>',
          '<body>',
          '  <div class="header">',
          '    <h1>Order Confirmation</h1>',
          '  </div>',
          '  <p>Thank you, {{data.customerName}}!</p>',
          '  <table>',
          '    {{#each data.items}}',
          '    <tr>',
          '      <td>{{this.name}}</td>',
          '      <td>${{this.price}}</td>',
          '    </tr>',
          '    {{/each}}',
          '  </table>',
          '  <p><strong>Total: ${{data.total}}</strong></p>',
          '</body>',
          '</html>',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'html: The rendered HTML string',
          'plainText: Plain text version (HTML stripped)',
        ],
      },
      {
        type: 'example',
        content: 'Email report: MongoDB Query → Transform → HTML Output → Send Email (using {{html}} as body)',
      },
    ],
    relatedTopics: ['workflow-nodes', 'node-email-send', 'node-transform'],
    keywords: ['html', 'template', 'render', 'output', 'report', 'email'],
  },

  // ============================================
  // Employee Onboarding Portal
  // ============================================

  // ============================================
  // Developer Packages
  // ============================================

  'mcp-server': {
    id: 'mcp-server',
    title: 'MCP Server (@netpad/mcp-server)',
    description:
      'Model Context Protocol server with 75 AI-powered tools for building NetPad forms, applications, workflows, and data-driven experiences.',
    content: [
      {
        type: 'heading',
        content: 'What is the MCP Server?',
      },
      {
        type: 'text',
        content:
          'The @netpad/mcp-server package (v2.2.0) is a comprehensive Model Context Protocol (MCP) server that integrates with AI assistants like Claude Desktop and Cursor IDE. It provides 75 AI-powered tools across 7 categories for building forms, applications, workflows, conversational experiences, and MongoDB integrations. All tools now generate validated, self-contained TypeScript code that runs with `npx tsx` - no SDK dependencies required.',
      },
      {
        type: 'heading',
        content: 'Installation',
      },
      {
        type: 'code',
        content: [
          '# Using npx (recommended)',
          'npx @netpad/mcp-server',
          '',
          '# Or install globally',
          'npm install -g @netpad/mcp-server',
          'netpad-mcp',
        ],
      },
      {
        type: 'heading',
        content: 'Claude Desktop Setup',
      },
      {
        type: 'text',
        content:
          'Add the MCP server to your Claude Desktop configuration file (claude_desktop_config.json):',
      },
      {
        type: 'code',
        content: [
          '{',
          '  "mcpServers": {',
          '    "netpad": {',
          '      "command": "npx",',
          '      "args": ["@netpad/mcp-server"]',
          '    }',
          '  }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Cursor IDE Setup',
      },
      {
        type: 'text',
        content: 'Add to your .cursor/mcp.json file:',
      },
      {
        type: 'code',
        content: [
          '{',
          '  "mcpServers": {',
          '    "netpad": {',
          '      "command": "npx",',
          '      "args": ["@netpad/mcp-server"]',
          '    }',
          '  }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Tool Categories (75 tools)',
      },
      {
        type: 'list',
        content: [
          'Form Building (6 tools) - Generate forms, fields, conditional logic, computed fields',
          'Application Management (7 tools) - Create applications, contracts, releases',
          'Marketplace & npm (8 tools) - Publish, search, and install applications',
          'Workflow Automation (10 tools) - Build workflows with 25+ node types',
          'Conversational & Search Forms (11 tools) - AI-powered data collection and RAG',
          'Enhanced Templates (5 tools) - Access 25+ form templates',
          'Data Browser (12 tools) - MongoDB queries, aggregations, schema analysis',
          'Reference & Helper (16 tools) - Documentation, best practices, debugging',
        ],
      },
      {
        type: 'heading',
        content: 'New in v2.2.0: Consolidated Tools',
      },
      {
        type: 'list',
        content: [
          'get_reference - Unified access to field types, operators, formula functions, validation options, theme options, and documentation',
          'browse_templates - Browse all 40+ templates (forms, applications, workflows, conversational, queries) with filtering and search',
        ],
      },
      {
        type: 'tip',
        content:
          'Use get_reference and browse_templates for a streamlined experience. The older individual tools (list_field_types, list_form_templates, etc.) still work but are deprecated.',
      },
      {
        type: 'heading',
        content: 'Form Building Tools',
      },
      {
        type: 'list',
        content: [
          'generate_form - Generate complete form configurations from natural language',
          'generate_field - Create individual field configurations with validation',
          'generate_conditional_logic - Create show/hide logic for fields',
          'generate_computed_field - Create formula-based calculated fields',
          'generate_multipage_config - Generate multi-page wizard configurations',
          'validate_form_config - Validate form configurations and identify issues',
        ],
      },
      {
        type: 'heading',
        content: 'Application Management Tools',
      },
      {
        type: 'list',
        content: [
          'create_application - Generate code to create new applications',
          'generate_application_contract - Define API contracts for applications',
          'generate_application_release - Create versioned releases',
          'list_application_templates - Browse application templates',
          'publish_to_marketplace - Publish applications to marketplace',
        ],
      },
      {
        type: 'heading',
        content: 'Workflow Automation Tools',
      },
      {
        type: 'list',
        content: [
          'create_workflow - Generate complete workflow configurations',
          'add_workflow_node - Add nodes to workflows',
          'connect_workflow_nodes - Connect nodes with edges',
          'list_workflow_node_types - Browse 25+ available node types',
          'list_workflow_templates - Get pre-built workflow templates',
        ],
      },
      {
        type: 'heading',
        content: 'Conversational & Search Form Tools',
      },
      {
        type: 'list',
        content: [
          'create_conversational_form - Create AI-powered conversational forms',
          'configure_rag_settings - Enable RAG with document retrieval',
          'create_search_form - Build MongoDB search interfaces',
          'list_search_operators - Browse search operators by field type',
          'list_conversational_templates - IT helpdesk, feedback, intake templates',
        ],
      },
      {
        type: 'heading',
        content: 'Template Tools',
      },
      {
        type: 'list',
        content: [
          'list_form_templates - Browse 25+ form templates across 10 categories',
          'get_form_template - Get detailed template configuration',
          'create_form_from_template - Create forms with customizations',
          'Categories: Business, Events, Feedback, Support, Healthcare, Education, etc.',
        ],
      },
      {
        type: 'heading',
        content: 'Data Browser Tools',
      },
      {
        type: 'list',
        content: [
          'generate_connection_config - Configure MongoDB connections',
          'generate_data_browser_query - Generate find, aggregate, distinct queries',
          'generate_aggregation_pipeline - Build complex aggregation pipelines',
          'generate_index_recommendations - Get index suggestions',
          'generate_schema_analysis - Analyze collection schemas',
        ],
      },
      {
        type: 'heading',
        content: 'Example Usage',
      },
      {
        type: 'text',
        content:
          'Once configured, you can ask Claude to help you build comprehensive applications:',
      },
      {
        type: 'example',
        content:
          '"Create a customer feedback application with an NPS survey form and a workflow that sends thank-you emails and saves responses to MongoDB."',
      },
      {
        type: 'tip',
        content:
          'The MCP server provides 25+ form templates, 5 workflow templates, and 4 conversational form templates. Ask Claude to "list form templates" or "create a form from the patient-intake template".',
      },
      {
        type: 'heading',
        content: 'Available Resources (16 resources)',
      },
      {
        type: 'list',
        content: [
          'netpad://docs/readme - Main documentation',
          'netpad://docs/quick-start - Quick start guide',
          'netpad://reference/field-types - Field type reference',
          'netpad://reference/application-templates - Application templates',
          'netpad://reference/workflow-nodes - Workflow node types',
          'netpad://reference/form-templates - 25+ form templates',
          'netpad://reference/conversational-templates - Conversational form templates',
          'netpad://reference/search-operators - Search operators',
          'netpad://reference/connection-types - MongoDB connection types',
          'netpad://reference/query-templates - Query templates',
        ],
      },
    ],
    relatedTopics: ['netpad-forms-package', 'netpad-workflows-package', 'form-builder'],
    keywords: [
      'mcp',
      'model context protocol',
      'claude',
      'cursor',
      'ai',
      'code generation',
      'scaffolding',
      'package',
      'npm',
      'applications',
      'workflows',
      'conversational',
      'rag',
      'templates',
      'marketplace',
    ],
  },

  'netpad-forms-package': {
    id: 'netpad-forms-package',
    title: 'Forms Package (@netpad/forms)',
    description:
      'React form engine library for rendering NetPad forms in your applications with multi-page wizards, conditional logic, and computed fields.',
    content: [
      {
        type: 'heading',
        content: 'What is @netpad/forms?',
      },
      {
        type: 'text',
        content:
          '@netpad/forms is a production-ready React library that renders sophisticated forms from JSON configuration. Build multi-page wizards, add conditional logic, create computed fields, and integrate with your backend—all with declarative configuration.',
      },
      {
        type: 'heading',
        content: 'Installation',
      },
      {
        type: 'code',
        content: [
          'npm install @netpad/forms',
          '',
          '# Peer dependencies',
          'npm install react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled',
        ],
      },
      {
        type: 'heading',
        content: 'Quick Start',
      },
      {
        type: 'code',
        content: [
          "import { FormRenderer } from '@netpad/forms';",
          '',
          'const config = {',
          "  name: 'Contact Form',",
          '  fieldConfigs: [',
          "    { path: 'name', label: 'Name', type: 'short_text', included: true, required: true },",
          "    { path: 'email', label: 'Email', type: 'email', included: true, required: true },",
          "    { path: 'message', label: 'Message', type: 'long_text', included: true }",
          '  ]',
          '};',
          '',
          'function MyForm() {',
          '  return <FormRenderer config={config} onSubmit={handleSubmit} />;',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Key Features',
      },
      {
        type: 'list',
        content: [
          'Multi-page wizards with progress tracking',
          'Conditional logic for dynamic field visibility',
          'Computed fields with formula evaluation',
          'Built-in validation with custom error messages',
          'Nested data structures with dot notation paths',
          'Customizable theming (colors, fonts, input styles)',
          '28+ field types (text, number, date, file upload, and more)',
        ],
      },
      {
        type: 'heading',
        content: 'Supported Field Types',
      },
      {
        type: 'list',
        content: [
          'Text: short_text, long_text, email, url, phone',
          'Numeric: number, slider, rating',
          'Selection: dropdown, multiple_choice, checkboxes, yes_no',
          'Date/Time: date, time, datetime',
          'Advanced: autocomplete, tags, file_upload',
          'Layout: section-header, description, divider, spacer, image',
        ],
      },
      {
        type: 'heading',
        content: 'Multi-Page Configuration',
      },
      {
        type: 'code',
        content: [
          'const config = {',
          "  name: 'Employee Onboarding',",
          '  multiPageConfig: {',
          '    enabled: true,',
          "    stepIndicator: 'numbers',",
          '    pages: [',
          "      { id: 'personal', title: 'Personal Info', type: 'form' },",
          "      { id: 'employment', title: 'Employment', type: 'form' },",
          "      { id: 'review', title: 'Review', type: 'summary' }",
          '    ]',
          '  },',
          '  fieldConfigs: [',
          "    { path: 'name', label: 'Name', pageId: 'personal', ... },",
          "    { path: 'department', label: 'Department', pageId: 'employment', ... }",
          '  ]',
          '};',
        ],
      },
      {
        type: 'heading',
        content: 'Conditional Logic',
      },
      {
        type: 'code',
        content: [
          '{',
          "  path: 'companyName',",
          "  label: 'Company Name',",
          "  type: 'short_text',",
          '  conditionalLogic: {',
          "    action: 'show',",
          "    logicType: 'all',",
          '    conditions: [',
          "      { field: 'accountType', operator: 'equals', value: 'business' }",
          '    ]',
          '  }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'API Client',
      },
      {
        type: 'text',
        content:
          'The package includes a client for fetching forms and submitting data to the NetPad API:',
      },
      {
        type: 'code',
        content: [
          "import { createNetPadClient } from '@netpad/forms';",
          '',
          'const client = createNetPadClient({',
          "  baseUrl: 'https://your-netpad-instance.com',",
          "  apiKey: 'np_live_xxx'",
          '});',
          '',
          "const form = await client.getForm('my-form-id');",
          "await client.submitForm('my-form-id', formData);",
        ],
      },
      {
        type: 'heading',
        content: 'Utility Functions',
      },
      {
        type: 'list',
        content: [
          'evaluateConditionalLogic() - Evaluate field visibility conditions',
          'validateField() / validateForm() - Validate form data',
          'evaluateFormula() - Evaluate computed field formulas',
          'getNestedValue() / setNestedValue() - Handle nested data paths',
        ],
      },
      {
        type: 'heading',
        content: 'TypeScript Support',
      },
      {
        type: 'text',
        content:
          'Full TypeScript support with exported types for type-safe form configuration:',
      },
      {
        type: 'code',
        content: [
          "import type { FormConfiguration, FieldConfig, FormRendererProps } from '@netpad/forms';",
        ],
      },
      {
        type: 'tip',
        content:
          'Check out the examples in the NetPad repository for complete implementations including the Employee Onboarding demo and IT Help Desk application.',
      },
    ],
    relatedTopics: ['mcp-server', 'netpad-workflows-package', 'form-builder', 'multi-page-forms'],
    keywords: [
      'forms',
      'react',
      'form renderer',
      'npm',
      'package',
      'library',
      'wizard',
      'multi-page',
      'validation',
    ],
  },

  'netpad-workflows-package': {
    id: 'netpad-workflows-package',
    title: 'Workflows Package (@netpad/workflows)',
    description:
      'Type-safe TypeScript client for programmatically triggering and managing NetPad workflows from your applications.',
    content: [
      {
        type: 'heading',
        content: 'What is @netpad/workflows?',
      },
      {
        type: 'text',
        content:
          '@netpad/workflows is a TypeScript client library that enables external systems, CI/CD pipelines, and server-side code to trigger, manage, and monitor NetPad workflow executions programmatically.',
      },
      {
        type: 'heading',
        content: 'Installation',
      },
      {
        type: 'code',
        content: 'npm install @netpad/workflows',
      },
      {
        type: 'heading',
        content: 'Quick Start',
      },
      {
        type: 'code',
        content: [
          "import { createNetPadWorkflowClient } from '@netpad/workflows';",
          '',
          'const client = createNetPadWorkflowClient({',
          "  baseUrl: 'https://your-netpad-instance.com',",
          "  apiKey: 'np_live_xxx'",
          '});',
          '',
          '// Trigger a workflow',
          "const execution = await client.executeWorkflow('workflow-id', {",
          '  variables: { userId: 123, action: "process" }',
          '});',
          '',
          '// Wait for completion',
          'const result = await client.waitForExecution(execution.executionId);',
          'console.log(result.status, result.outputs);',
        ],
      },
      {
        type: 'heading',
        content: 'Workflow Management',
      },
      {
        type: 'list',
        content: [
          'listWorkflows(options) - List workflows with filtering and pagination',
          'getWorkflow(workflowId) - Get workflow details and configuration',
          'createWorkflow(options) - Create a new workflow',
          'updateWorkflow(workflowId, options) - Update workflow configuration',
          'deleteWorkflow(workflowId) - Delete a workflow',
          'activateWorkflow(workflowId) - Activate a workflow',
          'pauseWorkflow(workflowId) - Pause a workflow',
          'archiveWorkflow(workflowId) - Archive a workflow',
        ],
      },
      {
        type: 'heading',
        content: 'Workflow Execution',
      },
      {
        type: 'list',
        content: [
          'executeWorkflow(workflowId, options) - Trigger workflow execution',
          'listExecutions(workflowId, options) - List execution history',
          'getExecution(workflowId, executionId) - Get execution details',
          'getExecutionStatus(executionId) - Get current execution status',
          'waitForExecution(executionId, options) - Poll until completion',
          'retryExecution(workflowId, executionId) - Retry a failed execution',
          'cancelExecution(workflowId, executionId) - Cancel running execution',
        ],
      },
      {
        type: 'heading',
        content: 'Execute and Wait Pattern',
      },
      {
        type: 'code',
        content: [
          '// Start execution and wait for result',
          "const execution = await client.executeWorkflow('workflow-id', {",
          "  variables: { email: 'user@example.com' }",
          '});',
          '',
          'const result = await client.waitForExecution(execution.executionId, {',
          '  timeout: 300000,     // 5 minutes',
          '  pollInterval: 2000   // Check every 2 seconds',
          '});',
          '',
          "if (result.status === 'completed') {",
          '  console.log(result.context.outputs);',
          "} else if (result.status === 'failed') {",
          '  console.error(result.context.errors);',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Execution Status Values',
      },
      {
        type: 'list',
        content: [
          'pending - Execution is queued but not started',
          'running - Execution is currently in progress',
          'paused - Execution is paused (waiting for input)',
          'completed - Execution finished successfully',
          'failed - Execution encountered an error',
          'cancelled - Execution was manually cancelled',
        ],
      },
      {
        type: 'heading',
        content: 'Error Handling',
      },
      {
        type: 'code',
        content: [
          "import { NetPadWorkflowError } from '@netpad/workflows';",
          '',
          'try {',
          "  await client.executeWorkflow('workflow-id');",
          '} catch (error) {',
          '  if (error instanceof NetPadWorkflowError) {',
          '    if (error.status === 404) {',
          "      console.error('Workflow not found');",
          '    } else if (error.status === 429) {',
          "      console.error('Rate limit exceeded, retry later');",
          '    }',
          '  }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'TypeScript Types',
      },
      {
        type: 'text',
        content:
          'All types are exported for full type safety in your applications:',
      },
      {
        type: 'code',
        content: [
          'import type {',
          '  WorkflowDocument,',
          '  WorkflowExecution,',
          '  ExecutionStatus,',
          '  WorkflowVariable,',
          '  ExecuteWorkflowOptions',
          "} from '@netpad/workflows';",
        ],
      },
      {
        type: 'heading',
        content: 'Batch Execution',
      },
      {
        type: 'code',
        content: [
          '// Execute multiple workflows in parallel',
          'const users = [1, 2, 3, 4, 5];',
          '',
          'const executions = await Promise.allSettled(',
          '  users.map(userId =>',
          "    client.executeWorkflow('onboarding-workflow', {",
          '      variables: { userId }',
          '    })',
          '  )',
          ');',
        ],
      },
      {
        type: 'tip',
        content:
          'Use the waitForExecution method with appropriate timeout values for long-running workflows. The default timeout is 5 minutes with 1-second polling intervals.',
      },
      {
        type: 'warning',
        content:
          'API keys should be stored securely in environment variables. Never expose them in client-side code or commit them to version control.',
      },
    ],
    relatedTopics: ['mcp-server', 'netpad-forms-package', 'workflow-nodes', 'workflow-variables'],
    keywords: [
      'workflows',
      'automation',
      'npm',
      'package',
      'api client',
      'typescript',
      'execute',
      'trigger',
    ],
  },

  'employee-onboarding': {
    id: 'employee-onboarding',
    title: 'Employee Onboarding Portal',
    description:
      'A standalone application showcasing NetPad\'s multi-page wizard/form capabilities with full MongoDB persistence, admin dashboard, and customizable branding.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'The Employee Onboarding Portal is a complete, production-ready application that demonstrates how to build sophisticated data collection workflows using NetPad\'s form builder capabilities.',
      },
      {
        type: 'heading',
        content: 'Key Features',
      },
      {
        type: 'list',
        content: [
          '8-page wizard form with step-by-step progress tracking',
          'Full MongoDB persistence for all submissions',
          'Protected admin dashboard with password authentication',
          'Real-time analytics with charts and metrics',
          'Customizable branding (colors, logos, messaging)',
          'Export functionality (CSV/JSON)',
          'Responsive design for all devices',
        ],
      },
      {
        type: 'heading',
        content: 'Public-Facing Routes',
      },
      {
        type: 'list',
        content: [
          '/onboarding - Landing page with customizable welcome message and "Start Onboarding" button',
          '/onboarding/form - The 8-page wizard form with progress indicator',
          '/onboarding/success/[id] - Confirmation page with reference number and confetti animation',
        ],
      },
      {
        type: 'heading',
        content: 'Admin Dashboard Routes',
      },
      {
        type: 'list',
        content: [
          '/onboarding/admin - Dashboard overview with stats (total submissions, pending, approved, rejected)',
          '/onboarding/admin/submissions - Paginated list of all submissions with search and filter',
          '/onboarding/admin/submissions/[id] - Detailed view of individual submission with status management',
          '/onboarding/admin/analytics - Charts showing submission trends, device breakdown, and completion metrics',
          '/onboarding/admin/settings - Branding customization (company name, colors, welcome/success messages)',
          '/onboarding/admin/login - Password-protected admin access',
        ],
      },
      {
        type: 'heading',
        content: 'Form Pages',
      },
      {
        type: 'text',
        content:
          'The employee onboarding wizard collects comprehensive information across 8 organized pages:',
      },
      {
        type: 'list',
        content: [
          'Page 1: Personal Information - Full name, preferred name, email, phone, date of birth',
          'Page 2: Home Address - Street address, city, state/province, postal code, country',
          'Page 3: Employment Details - Job title, department, start date, manager name, employment type',
          'Page 4: Emergency Contact - Contact name, relationship, phone, email',
          'Page 5: Tax Information - SSN/Tax ID, tax filing status, withholding allowances',
          'Page 6: Direct Deposit - Bank name, account type, routing number, account number',
          'Page 7: Equipment Needs - Laptop preference, monitor size, additional equipment',
          'Page 8: Review & Submit - Review all entered information before final submission',
        ],
      },
      {
        type: 'heading',
        content: 'Submission Workflow',
      },
      {
        type: 'list',
        content: [
          'submitted - Initial state when employee completes the form',
          'under_review - Admin has started reviewing the submission',
          'approved - Submission approved and employee cleared for onboarding',
          'rejected - Submission rejected with reason (can be resubmitted)',
        ],
      },
      {
        type: 'heading',
        content: 'Analytics Dashboard',
      },
      {
        type: 'text',
        content:
          'The analytics page provides real-time insights into your onboarding process:',
      },
      {
        type: 'list',
        content: [
          'Total submissions with status breakdown',
          'Submission trends over time (line chart)',
          'Status distribution (pie chart)',
          'Device type breakdown (desktop, mobile, tablet)',
          'Average completion time',
          'Pending review count',
        ],
      },
      {
        type: 'heading',
        content: 'Branding Customization',
      },
      {
        type: 'text',
        content:
          'Customize the portal to match your company branding:',
      },
      {
        type: 'list',
        content: [
          'Company name - Displayed in headers and messages',
          'Logo URL - Your company logo',
          'Primary color - Main accent color for buttons and highlights',
          'Secondary color - Text and secondary elements',
          'Welcome title and message - Landing page content (supports Markdown)',
          'Success title and message - Confirmation page content (supports Markdown)',
        ],
      },
      {
        type: 'heading',
        content: 'Data Export',
      },
      {
        type: 'text',
        content:
          'Export submission data for further processing:',
      },
      {
        type: 'list',
        content: [
          'CSV format - For spreadsheet applications (Excel, Google Sheets)',
          'JSON format - For data processing and integration with other systems',
          'Filter by status, date range, or search term before export',
          'Include or exclude metadata (IP address, user agent, timestamps)',
        ],
      },
      {
        type: 'heading',
        content: 'API Endpoints',
      },
      {
        type: 'code',
        content: [
          'POST /api/onboarding/submit - Submit new onboarding form',
          'GET  /api/onboarding/submissions - List submissions (paginated)',
          'GET  /api/onboarding/submissions/[id] - Get submission details',
          'PATCH /api/onboarding/submissions/[id] - Update status/notes',
          'DELETE /api/onboarding/submissions/[id] - Delete submission',
          'GET  /api/onboarding/analytics - Get analytics data',
          'GET  /api/onboarding/settings - Get branding settings',
          'PUT  /api/onboarding/settings - Update branding settings',
          'GET  /api/onboarding/export - Export submissions',
        ],
      },
      {
        type: 'heading',
        content: 'Admin Authentication',
      },
      {
        type: 'text',
        content:
          'The admin dashboard is protected with password authentication. Set the ONBOARDING_ADMIN_PASSWORD environment variable to configure the admin password. Sessions are managed using iron-session for secure, encrypted cookies.',
      },
      {
        type: 'heading',
        content: 'MongoDB Collections',
      },
      {
        type: 'list',
        content: [
          'onboarding_submissions - Stores all form submissions with status tracking',
          'onboarding_branding - Stores branding configuration',
        ],
      },
      {
        type: 'tip',
        content:
          'Use this application as a reference implementation for building your own multi-page forms with NetPad. The architecture demonstrates best practices for form wizards, admin dashboards, and MongoDB persistence.',
      },
      {
        type: 'example',
        content:
          'To access the admin dashboard, navigate to /onboarding/admin/login and enter the password set in your ONBOARDING_ADMIN_PASSWORD environment variable. From there, you can manage submissions, view analytics, and customize branding.',
      },
      {
        type: 'warning',
        content:
          'The onboarding form collects sensitive information like SSN and bank account details. In production, ensure you have proper security measures in place including HTTPS, secure session management, and data encryption.',
      },
    ],
    relatedTopics: ['multi-page-forms', 'form-builder', 'form-analytics', 'response-management'],
    keywords: [
      'onboarding',
      'employee',
      'wizard',
      'multi-page',
      'admin',
      'dashboard',
      'branding',
      'analytics',
      'submissions',
      'hr',
      'human resources',
      'new hire',
    ],
  },

  'search-forms': {
    id: 'search-forms',
    title: 'Search Forms',
    description:
      'Learn how to create search forms that enable users to find, filter, and manage data stored in MongoDB. Search forms provide powerful querying capabilities with smart dropdowns, multiple operators, and customizable result displays.',
    content: [
      {
        type: 'heading',
        content: 'What are Search Forms?',
      },
      {
        type: 'text',
        content:
          'Search forms are a special form type designed for data discovery and management rather than data entry. While data-entry forms collect new submissions, search forms let users query and filter existing data in your MongoDB collection.',
      },
      {
        type: 'heading',
        content: 'Form Types',
      },
      {
        type: 'list',
        content: [
          'data-entry - Traditional forms for collecting new submissions',
          'search - Forms designed for querying and filtering existing data',
          'both - Forms that support both data entry and search modes',
        ],
      },
      {
        type: 'heading',
        content: 'Creating a Search Form',
      },
      {
        type: 'text',
        content:
          'To create a search form, set the formType to "search" and configure a searchConfig object that defines which fields are searchable, what operators are available, and how results should be displayed.',
      },
      {
        type: 'code',
        content: `{
  "formType": "search",
  "searchConfig": {
    "enabled": true,
    "fields": {
      "status": {
        "enabled": true,
        "operators": ["equals", "in"],
        "defaultOperator": "equals",
        "showInResults": true
      }
    },
    "results": {
      "layout": "table",
      "pageSize": 25,
      "allowView": true,
      "allowEdit": true
    }
  }
}`,
      },
      {
        type: 'heading',
        content: 'Search Operators',
      },
      {
        type: 'list',
        content: [
          'equals / notEquals - Exact match comparison',
          'contains / startsWith / endsWith - Text pattern matching',
          'greaterThan / lessThan / between - Numeric and date ranges',
          'in / notIn - Value in/not in array of options',
          'exists - Check if field exists',
          'regex - Regular expression matching',
        ],
      },
      {
        type: 'heading',
        content: 'Results Configuration',
      },
      {
        type: 'text',
        content:
          'Configure how search results are displayed using the results configuration. Choose from table, cards, or list layouts, enable pagination, and control which actions (view, edit, delete, export) are available.',
      },
      {
        type: 'tip',
        content:
          'Use Smart Dropdowns (optionsSource) to automatically populate filter options from your actual data. This ensures users only see values that exist in the database.',
      },
      {
        type: 'example',
        content:
          'A ticket search form might have filters for urgency level, category, and department—each populated dynamically with values from existing tickets, showing counts like "Hardware (45)" so users know how many results to expect.',
      },
      {
        type: 'heading',
        content: 'Search Form Templates',
      },
      {
        type: 'text',
        content:
          'Start quickly with pre-built search form templates that demonstrate best practices for search forms. Templates are available for common use cases like customer search, order search, and support ticket search.',
      },
      {
        type: 'list',
        content: [
          'Customer Search - Search customers by name, email, company, status, and creation date',
          'Order Search - Filter orders by status, date range, customer, order number, and total amount',
          'Support Ticket Search - Search tickets by status, priority, category, reporter, and date',
        ],
      },
      {
        type: 'tip',
        content:
          'When using a search form template, the formType and searchConfig are automatically configured. You can customize the search fields, operators, and result display settings in the Form Settings drawer.',
      },
      {
        type: 'heading',
        content: 'Using Search Templates',
      },
      {
        type: 'list',
        content: [
          'Select a search form template from the template gallery',
          'The template includes fields and search configuration',
          'Customize the search fields and operators as needed',
          'Connect to your MongoDB collection to start searching',
          'Smart dropdowns will automatically populate from your data',
        ],
      },
    ],
    relatedTopics: ['smart-dropdowns', 'form-builder', 'response-management', 'lookup-fields'],
    keywords: [
      'search',
      'filter',
      'query',
      'find',
      'data management',
      'search form',
      'operators',
      'results',
      'table',
      'pagination',
    ],
  },

  'smart-dropdowns': {
    id: 'smart-dropdowns',
    title: 'Smart Dropdowns (Dynamic Options)',
    description:
      'Smart dropdowns automatically populate their options from your MongoDB data. Instead of hardcoded values, dropdown options are fetched dynamically—showing actual values with counts, sorted by frequency.',
    content: [
      {
        type: 'heading',
        content: 'What are Smart Dropdowns?',
      },
      {
        type: 'text',
        content:
          'Smart dropdowns use the optionsSource configuration to dynamically fetch options from your database. This is especially useful for search forms where you want filters to show only values that actually exist in your data.',
      },
      {
        type: 'heading',
        content: 'Options Source Types',
      },
      {
        type: 'list',
        content: [
          'static - Use hardcoded options (traditional approach)',
          'distinct - Extract unique values from the collection',
          'lookup - Fetch options from another collection',
          'aggregation - Use custom MongoDB aggregation pipeline',
        ],
      },
      {
        type: 'heading',
        content: 'Distinct Values Configuration',
      },
      {
        type: 'text',
        content:
          'The most common smart dropdown type is "distinct" which extracts unique values from a field. You can show counts, sort by frequency, and map raw values to friendly labels.',
      },
      {
        type: 'code',
        content: `{
  "optionsSource": {
    "type": "distinct",
    "distinct": {
      "showCounts": true,
      "sortBy": "count",
      "sortDirection": "desc",
      "limit": 50,
      "labelMap": {
        "hardware": "Hardware",
        "software": "Software",
        "network": "Network / Connectivity"
      }
    },
    "refreshOnMount": true
  }
}`,
      },
      {
        type: 'heading',
        content: 'Configuration Options',
      },
      {
        type: 'list',
        content: [
          'showCounts - Display count badges like "Hardware (45)"',
          'sortBy - Sort by "count", "value", or "label"',
          'sortDirection - "asc" or "desc"',
          'limit - Maximum number of options to show',
          'labelMap - Map raw values to display labels',
          'filter - Base MongoDB filter to apply',
          'refreshOnMount - Fetch options when form loads',
          'refreshInterval - Auto-refresh interval in milliseconds',
        ],
      },
      {
        type: 'heading',
        content: 'API Endpoint',
      },
      {
        type: 'text',
        content:
          'Smart dropdowns use the /api/mongodb/distinct-values endpoint to fetch unique values. This endpoint uses MongoDB aggregation to efficiently extract and count distinct values from your collection.',
      },
      {
        type: 'code',
        content: `POST /api/mongodb/distinct-values
{
  "formId": "your-form-id",
  "field": "issueCategory",
  "includeCounts": true,
  "sortBy": "count",
  "limit": 100
}`,
      },
      {
        type: 'tip',
        content:
          'Use labelMap to convert database values like "hr" to user-friendly labels like "Human Resources". The raw value is still used for filtering, but users see the friendly label.',
      },
      {
        type: 'example',
        content:
          'An IT ticket search form uses smart dropdowns for Issue Category, Urgency Level, and Department. Each dropdown shows options like "Software (127)" and "Hardware (45)", sorted by frequency so the most common values appear first.',
      },
      {
        type: 'warning',
        content:
          'Smart dropdowns require a database connection. If the form is not connected to a collection, the API will return an error. Make sure your form has a valid dataSource configured.',
      },
    ],
    relatedTopics: ['search-forms', 'lookup-fields', 'form-builder', 'field-configuration'],
    keywords: [
      'smart dropdown',
      'dynamic options',
      'distinct values',
      'optionsSource',
      'dropdown',
      'autocomplete',
      'filter options',
      'count',
      'frequency',
      'labelMap',
    ],
  },

  'conversational-forms': {
    id: 'conversational-forms',
    title: 'Conversational Forms',
    description:
      'Create AI-powered conversational forms that collect data through natural dialogue instead of traditional form fields.',
    content: [
      {
        type: 'heading',
        content: 'What are Conversational Forms?',
      },
      {
        type: 'text',
        content:
          'Conversational forms use AI to engage users in a natural dialogue, extracting structured data from the conversation. Instead of filling out static fields, users chat with an AI assistant that guides them through the data collection process.',
      },
      {
        type: 'heading',
        content: 'Key Features',
      },
      {
        type: 'list',
        content: [
          'Natural language interaction - Users describe their needs conversationally',
          'Intelligent topic coverage - AI ensures all required information is gathered',
          'Automatic data extraction - Structured data is extracted from conversation',
          'Adaptive questioning - Follow-up questions based on user responses',
          'Configurable personas - Customize the AI\'s communication style',
        ],
      },
      {
        type: 'heading',
        content: 'Creating a Conversational Form',
      },
      {
        type: 'list',
        content: [
          'Create a new form (or open an existing form)',
          'Open Form Settings (Settings button or keyboard shortcut)',
          'Go to the Form Type section and enable "Conversational" mode',
          'In the Conversational Configuration panel, choose a template (e.g., IT Helpdesk, Customer Feedback) or start from scratch',
          'Define topics the conversation should cover',
          'Configure the extraction schema for structured output',
          'Set conversation limits (max turns, duration, confidence threshold)',
          'Customize the AI persona (professional, friendly, empathetic)',
        ],
      },
      {
        type: 'heading',
        content: 'Conversational Form Templates',
      },
      {
        type: 'text',
        content:
          'Conversational forms use a separate template system from regular form templates. When you enable conversational mode, you\'ll see template options directly in the conversational configuration panel. Templates are pre-configured with topics, extraction schemas, and personas.',
      },
      {
        type: 'tip',
        content:
          'Unlike regular form templates (which include fields), conversational templates include conversation topics, extraction schemas, and AI persona configurations. They\'re accessed through Form Settings when conversational mode is enabled, not from the main template gallery.',
      },
      {
        type: 'heading',
        content: 'Topics and Coverage',
      },
      {
        type: 'text',
        content:
          'Topics define what information should be gathered during the conversation. Each topic has a priority (required, important, optional) and depth (surface, moderate, deep). The AI tracks topic coverage and ensures required topics are fully explored.',
      },
      {
        type: 'heading',
        content: 'Extraction Schema',
      },
      {
        type: 'text',
        content:
          'The extraction schema defines what structured data to extract from the conversation. Fields can be strings, numbers, booleans, enums, arrays, or objects. Each field has a description to guide the extraction process.',
      },
      {
        type: 'code',
        content: `{
  "fields": [
    { "field": "issue_summary", "type": "string", "required": true },
    { "field": "urgency", "type": "enum", "options": ["low", "medium", "high"] },
    { "field": "affected_systems", "type": "array" }
  ]
}`,
      },
      {
        type: 'tip',
        content:
          'Start with a built-in template like IT Helpdesk or Customer Feedback, then customize it to match your specific needs. Templates include pre-configured topics, extraction schemas, and personas.',
      },
      {
        type: 'example',
        content:
          'An IT helpdesk conversational form greets the user, asks about their issue, gathers details about affected systems and urgency, and extracts structured ticket data that can be automatically routed to the right team.',
      },
    ],
    relatedTopics: ['conversational-templates', 'knowledge-guided-forms', 'form-builder', 'form-publishing'],
    keywords: [
      'conversational',
      'AI form',
      'chatbot',
      'natural language',
      'dialogue',
      'extraction',
      'topics',
      'persona',
      'knowledge base',
      'RAG',
    ],
  },

  'conversational-templates': {
    id: 'conversational-templates',
    title: 'Conversational Form Templates',
    description:
      'Manage and customize templates for conversational forms. Templates provide pre-configured conversation flows, topics, and extraction schemas.',
    content: [
      {
        type: 'heading',
        content: 'What are Templates?',
      },
      {
        type: 'text',
        content:
          'Templates are pre-built configurations for conversational forms. They include topics to explore, extraction schemas, persona settings, and conversation limits. NetPad includes built-in templates and you can create custom templates for your organization.',
      },
      {
        type: 'heading',
        content: 'Built-in Templates',
      },
      {
        type: 'list',
        content: [
          'IT Helpdesk - Technical support ticket creation with troubleshooting',
          'Customer Feedback - Collect customer satisfaction and feedback',
          'Patient Intake - Healthcare patient information gathering',
          'General Intake - Flexible intake form for various use cases',
        ],
      },
      {
        type: 'heading',
        content: 'Managing Templates',
      },
      {
        type: 'text',
        content:
          'Access the Template Admin in Settings > Templates. Here you can view all templates, clone built-in templates to customize them, and create new templates from scratch.',
      },
      {
        type: 'heading',
        content: 'Template Components',
      },
      {
        type: 'list',
        content: [
          'Basic Info - Name, description, category, priority',
          'Persona - AI communication style, tone, behaviors, restrictions',
          'Topics - Conversation topics with priority and depth settings',
          'Extraction Schema - Fields to extract from conversation',
          'Prompts - Optional custom prompt templates for advanced control',
          'Limits - Max turns, duration, minimum confidence threshold',
        ],
      },
      {
        type: 'heading',
        content: 'Cloning Templates',
      },
      {
        type: 'text',
        content:
          'To customize a built-in template, clone it to your organization. The clone becomes an editable custom template that you can modify while keeping the original built-in template unchanged.',
      },
      {
        type: 'tip',
        content:
          'Use template categories (Support, Feedback, Intake, Application, General) to organize your templates. Filter by category in the template selector to quickly find the right template.',
      },
    ],
    relatedTopics: ['conversational-forms', 'knowledge-guided-forms', 'form-builder'],
    keywords: [
      'template',
      'conversational template',
      'IT helpdesk',
      'customer feedback',
      'patient intake',
      'clone template',
      'admin',
    ],
  },

  'knowledge-guided-forms': {
    id: 'knowledge-guided-forms',
    title: 'Knowledge-Guided Forms',
    description:
      'Enhance conversational forms with RAG (Retrieval-Augmented Generation) to provide AI responses grounded in your uploaded documents and knowledge base.',
    content: [
      {
        type: 'heading',
        content: 'What are Knowledge-Guided Forms?',
      },
      {
        type: 'text',
        content:
          'Knowledge-guided forms combine conversational AI with your organization\'s knowledge base. By uploading documents like policies, FAQs, manuals, and guides, the AI can provide accurate, contextual responses based on your actual content rather than general knowledge.',
      },
      {
        type: 'heading',
        content: 'Key Benefits',
      },
      {
        type: 'list',
        content: [
          'Accurate responses - AI answers are grounded in your documents',
          'Reduced hallucination - Responses cite actual sources',
          'Consistent information - Everyone gets the same accurate answers',
          'Easy updates - Upload new documents to keep knowledge current',
          'Source citations - Users can see where information comes from',
        ],
      },
      {
        type: 'heading',
        content: 'How It Works',
      },
      {
        type: 'list',
        content: [
          'Upload documents (PDF, DOCX, TXT, MD) to your form',
          'Documents are automatically chunked and embedded using vector search',
          'When users ask questions, relevant chunks are retrieved',
          'The AI uses retrieved context to provide accurate, sourced answers',
          'Citations show users which documents informed the response',
        ],
      },
      {
        type: 'heading',
        content: 'Enabling Knowledge-Guided Mode',
      },
      {
        type: 'list',
        content: [
          'Open a conversational form in the editor',
          'Navigate to the AI Configuration section',
          'Toggle "Enable Knowledge-Guided Mode"',
          'Upload documents in the Knowledge Base panel',
          'Configure retrieval settings (max chunks, minimum score)',
        ],
      },
      {
        type: 'heading',
        content: 'Requirements',
      },
      {
        type: 'list',
        content: [
          'Team plan or higher subscription',
          'MongoDB Atlas M10+ cluster (for vector search)',
          'Supported document types: PDF, DOCX, TXT, MD',
          'Maximum document size: 10MB per file',
        ],
      },
      {
        type: 'tip',
        content:
          'Start with high-quality documents like official policies, FAQs, and procedures. Well-structured documents with clear headings produce better retrieval results.',
      },
      {
        type: 'tip',
        content:
          'Knowledge-guided forms require a PRO, TEAMS, or ENTERPRISE subscription and work with any Atlas cluster tier (including M0 free tier). For production workloads with high availability requirements, M10+ clusters are recommended.',
      },
      {
        type: 'example',
        content:
          'An HR onboarding form can be enhanced with the employee handbook, benefits guide, and company policies. When new hires ask about PTO policies or health insurance options, the AI responds with accurate, cited information from your actual documents.',
      },
    ],
    relatedTopics: ['conversational-forms', 'rag-document-management', 'organizations', 'self-hosted-rag'],
    keywords: [
      'RAG',
      'knowledge base',
      'document upload',
      'vector search',
      'embeddings',
      'citations',
      'grounded AI',
      'context',
      'retrieval',
    ],
  },

  'rag-document-management': {
    id: 'rag-document-management',
    title: 'Document Management for RAG',
    description:
      'Upload, manage, and organize documents that power knowledge-guided conversational forms.',
    content: [
      {
        type: 'heading',
        content: 'Document Types',
      },
      {
        type: 'text',
        content:
          'Knowledge-guided forms support various document types to build your knowledge base. Each document is processed, chunked, and embedded for semantic search.',
      },
      {
        type: 'list',
        content: [
          'PDF - Policies, manuals, reports (text-based PDFs work best)',
          'DOCX - Word documents, guides, procedures',
          'TXT - Plain text files, logs, notes',
          'MD - Markdown documentation, README files',
        ],
      },
      {
        type: 'heading',
        content: 'Uploading Documents',
      },
      {
        type: 'list',
        content: [
          'Open the Knowledge Base panel in your conversational form',
          'Click "Upload Document" or drag and drop files',
          'Add metadata: title, description, source type, tags',
          'Documents are automatically processed in the background',
          'Status shows: pending → processing → ready (or error)',
        ],
      },
      {
        type: 'heading',
        content: 'Source Types',
      },
      {
        type: 'text',
        content:
          'Categorize documents by source type to help organize your knowledge base and improve retrieval relevance.',
      },
      {
        type: 'list',
        content: [
          'Policy - Official policies and compliance documents',
          'Contract - Agreements, terms, legal documents',
          'Guide - How-to guides and tutorials',
          'Manual - Technical manuals and specifications',
          'FAQ - Frequently asked questions',
          'Other - General documents',
        ],
      },
      {
        type: 'heading',
        content: 'Document Processing',
      },
      {
        type: 'text',
        content:
          'When you upload a document, it goes through several processing steps:',
      },
      {
        type: 'list',
        content: [
          'Text Extraction - Content is extracted from the document',
          'Chunking - Text is split into smaller, overlapping chunks (~1000 characters)',
          'Embedding - Each chunk is converted to a vector representation',
          'Indexing - Vectors are stored for fast semantic search',
        ],
      },
      {
        type: 'heading',
        content: 'Managing Documents',
      },
      {
        type: 'list',
        content: [
          'View all documents and their processing status',
          'Filter by status (ready, processing, error)',
          'Delete documents to remove from knowledge base',
          'Re-upload to update document content',
        ],
      },
      {
        type: 'tip',
        content:
          'For best results, use text-based PDFs rather than scanned images. Split very large documents into logical sections. Include descriptive titles and tags to improve organization.',
      },
      {
        type: 'warning',
        content:
          'Deleting a document removes it from the knowledge base immediately. This cannot be undone. Consider downloading important documents before deletion.',
      },
    ],
    relatedTopics: ['knowledge-guided-forms', 'conversational-forms', 'mongodb-connection', 'self-hosted-rag'],
    keywords: [
      'document upload',
      'PDF',
      'DOCX',
      'knowledge base',
      'chunking',
      'embedding',
      'processing',
      'source type',
      'RAG documents',
    ],
  },

  'projects-management': {
    id: 'projects-management',
    title: 'Projects',
    description:
      'Organize your forms and workflows into projects for better management and collaboration.',
    content: [
      {
        type: 'heading',
        content: 'What are Projects?',
      },
      {
        type: 'text',
        content:
          'Projects are containers that group related forms, workflows, and resources together. Use projects to organize work by client, department, or initiative.',
      },
      {
        type: 'heading',
        content: 'Creating a Project',
      },
      {
        type: 'list',
        content: [
          'Go to the Projects section from the navigation',
          'Click "New Project" and enter a name and description',
          'Optionally add tags and configure project settings',
          'Start adding forms and workflows to the project',
        ],
      },
      {
        type: 'heading',
        content: 'Project Features',
      },
      {
        type: 'list',
        content: [
          'Group forms and workflows logically',
          'Export entire projects for backup or migration',
          'Share project access with team members',
          'Track project-level analytics and usage',
        ],
      },
      {
        type: 'heading',
        content: 'Exporting Projects',
      },
      {
        type: 'text',
        content:
          'Export a project to create a portable package containing all forms, workflows, and configurations. Use exports for backup, migration between environments, or sharing with other organizations.',
      },
      {
        type: 'tip',
        content:
          'Use descriptive project names and tags to make it easy to find projects later. Consider organizing by client name, department, or initiative.',
      },
    ],
    relatedTopics: ['form-builder', 'organizations', 'deployment-vercel'],
    keywords: ['project', 'organize', 'group', 'export', 'management', 'folder', 'container'],
  },

  'deployment-modes': {
    id: 'deployment-modes',
    title: 'Deployment Modes Overview',
    description:
      'Understanding NetPad\'s three deployment modes: Cloud (SaaS), Self-Hosted, and Standalone exported apps.',
    content: [
      {
        type: 'heading',
        content: 'Understanding Deployment Modes',
      },
      {
        type: 'text',
        content:
          'NetPad supports three distinct deployment modes, each designed for different use cases. Understanding the differences helps you choose the right approach for your needs.',
      },
      {
        type: 'heading',
        content: '1. Cloud Mode (netpad.io)',
      },
      {
        type: 'text',
        content:
          'This is the fully managed SaaS option at netpad.io. We handle all infrastructure, updates, and scaling for you.',
      },
      {
        type: 'list',
        content: [
          'Zero infrastructure management - just sign up and start building',
          'Automatic updates and security patches',
          'Built-in team collaboration features',
          'Premium features like advanced analytics',
          'Knowledge-guided forms (RAG) require PRO/TEAMS/ENTERPRISE subscription (any cluster tier)',
          'Data stored on our managed infrastructure',
          'Environment variable: NETPAD_PLATFORM_MODE=cloud',
        ],
      },
      {
        type: 'heading',
        content: '2. Self-Hosted Mode',
      },
      {
        type: 'text',
        content:
          'Deploy the full NetPad platform on your own infrastructure using Vercel or similar hosting providers.',
      },
      {
        type: 'list',
        content: [
          'Complete control over your data and infrastructure',
          'Use your own MongoDB Atlas cluster or Atlas Local (Docker)',
          'Custom domain and branding options',
          'RAG features available to ALL tiers when using Atlas Local',
          'No usage limits imposed by NetPad',
          'You manage updates, security, and backups',
          'Environment variable: NETPAD_PLATFORM_MODE=self-hosted',
        ],
      },
      {
        type: 'heading',
        content: '3. Standalone Exported Apps',
      },
      {
        type: 'text',
        content:
          'Export individual NetPad applications as standalone Next.js apps that run completely independently.',
      },
      {
        type: 'list',
        content: [
          'Full application ownership - runs without any NetPad infrastructure',
          'Export includes all forms, workflows, and configurations',
          'Direct MongoDB connection - no Platform DB needed',
          'Deploy anywhere that supports Next.js (Vercel, Netlify, self-hosted)',
          'User provides their own OpenAI API key for AI features',
          'Conversational form transcripts stored at document root level',
          'Environment variable: STANDALONE_MODE=true',
        ],
      },
      {
        type: 'heading',
        content: 'Key Differences',
      },
      {
        type: 'list',
        content: [
          'Cloud & Self-Hosted: Full multi-tenant platform with organizations, projects, and team features',
          'Standalone: Single application, no multi-tenancy, simplified architecture',
          'Cloud & Self-Hosted: Conversation data stored in _formMetadata.conversational',
          'Standalone: Conversation data stored at conversational (document root)',
          'Cloud: NetPad manages your data; Self-Hosted/Standalone: You own all data',
        ],
      },
      {
        type: 'heading',
        content: 'Which Mode Should You Choose?',
      },
      {
        type: 'list',
        content: [
          'Choose Cloud if you want zero maintenance and rapid deployment',
          'Choose Self-Hosted if you need data control or compliance requirements',
          'Choose Standalone when building a dedicated app that shouldn\'t depend on NetPad services',
        ],
      },
      {
        type: 'tip',
        content:
          'You can start with Cloud mode to prototype quickly, then export as Standalone when ready for production. This gives you the best of both worlds: rapid development and full ownership.',
      },
      {
        type: 'warning',
        content:
          'Standalone apps require you to manage your own AI API keys (OpenAI) and MongoDB connection. Make sure to secure these credentials in production.',
      },
    ],
    relatedTopics: ['deployment-vercel', 'self-hosted-rag', 'organizations', 'applications'],
    keywords: [
      'deployment',
      'hosting',
      'cloud',
      'self-hosted',
      'standalone',
      'export',
      'vercel',
      'infrastructure',
      'data ownership',
      'modes',
      'comparison',
    ],
  },

  'deployment-vercel': {
    id: 'deployment-vercel',
    title: 'Deploying to Vercel',
    description:
      'Self-host your own NetPad instance by deploying to Vercel with your own database configuration.',
    content: [
      {
        type: 'heading',
        content: 'What is Self-Hosting?',
      },
      {
        type: 'text',
        content:
          'NetPad can be deployed to your own Vercel account, giving you complete control over your instance. Self-hosting allows you to use your own MongoDB database, custom domain, and environment configuration.',
      },
      {
        type: 'heading',
        content: 'Deployment Process',
      },
      {
        type: 'list',
        content: [
          'Click "Deploy to Vercel" from the Settings page',
          'Connect your GitHub account if not already connected',
          'Fork the NetPad repository to your account',
          'Configure environment variables in Vercel',
          'Deploy and access your custom instance',
        ],
      },
      {
        type: 'heading',
        content: 'Required Environment Variables',
      },
      {
        type: 'list',
        content: [
          'MONGODB_URI - Your MongoDB connection string',
          'NEXTAUTH_SECRET - Random secret for authentication',
          'NEXTAUTH_URL - Your deployment URL',
          'GOOGLE_CLIENT_ID/SECRET - For Google OAuth (optional)',
        ],
      },
      {
        type: 'heading',
        content: 'Benefits of Self-Hosting',
      },
      {
        type: 'list',
        content: [
          'Full control over data and infrastructure',
          'Use existing MongoDB databases',
          'Custom domain and branding',
          'No usage limits or rate limiting',
          'Private, isolated instance',
        ],
      },
      {
        type: 'warning',
        content:
          'Self-hosted instances require you to manage updates, security patches, and infrastructure. Make sure to keep your deployment up to date with the latest NetPad releases.',
      },
      {
        type: 'tip',
        content:
          'Use Vercel\'s preview deployments to test changes before deploying to production. Each pull request automatically gets a preview URL.',
      },
    ],
    relatedTopics: ['deployment-modes', 'organizations', 'mongodb-connection', 'self-hosted-rag'],
    keywords: ['vercel', 'deploy', 'self-host', 'hosting', 'infrastructure', 'custom domain'],
  },

  'self-hosted-rag': {
    id: 'self-hosted-rag',
    title: 'Self-Hosted RAG with Atlas Local',
    description:
      'Enable RAG and Vector Search features in self-hosted deployments using MongoDB Atlas Local without requiring an M10+ cluster.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'Self-hosted NetPad deployments can use RAG (Retrieval-Augmented Generation) features without upgrading to an M10+ MongoDB Atlas cluster. This is made possible by MongoDB Atlas Local, a Docker-based local deployment that supports Vector Search.',
      },
      {
        type: 'heading',
        content: 'Deployment Modes',
      },
      {
        type: 'text',
        content:
          'NetPad supports two deployment modes that determine feature availability:',
      },
      {
        type: 'list',
        content: [
          'Cloud Mode: Running as hosted SaaS (e.g., netpad.io on Vercel). Knowledge-guided forms (RAG) require PRO/TEAMS/ENTERPRISE subscription and work with any Atlas cluster tier.',
          'Self-Hosted Mode: Running privately or locally. Knowledge-guided forms available to ALL subscription tiers with any MongoDB instance (Atlas or Atlas Local).',
        ],
      },
      {
        type: 'heading',
        content: 'Setting Up Atlas Local',
      },
      {
        type: 'text',
        content:
          'Atlas Local provides a Docker-based MongoDB deployment with Vector Search support. Choose one of these methods:',
      },
      {
        type: 'heading',
        content: 'Option 1: Using Atlas CLI',
      },
      {
        type: 'code',
        content: '# Install Atlas CLI\nbrew install mongodb-atlas-cli\n\n# Create local deployment\natlas deployments setup local --type local\n\n# Start the deployment\natlas deployments start local',
      },
      {
        type: 'heading',
        content: 'Option 2: Using Docker Directly',
      },
      {
        type: 'code',
        content: 'docker run -d -p 27017:27017 mongodb/mongodb-atlas-local',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'text',
        content:
          'Set the following environment variables for self-hosted mode:',
      },
      {
        type: 'code',
        content: '# Enable self-hosted mode\nNETPAD_PLATFORM_MODE=self-hosted\n\n# Point to your Atlas Local instance\nMONGODB_URI=mongodb://localhost:27017/',
      },
      {
        type: 'heading',
        content: 'RAG Features Available',
      },
      {
        type: 'list',
        content: [
          'Knowledge-Guided Forms: Conversational forms powered by document knowledge bases',
          'Document Upload: PDF, DOCX, TXT, MD files for building knowledge bases',
          'Vector Search: Semantic search across uploaded documents',
          'AI Chat: Document-grounded responses in conversational forms',
        ],
      },
      {
        type: 'heading',
        content: 'Atlas Local Limitations',
      },
      {
        type: 'text',
        content:
          'While Atlas Local enables RAG features for development and private deployments, it has some limitations compared to managed Atlas clusters:',
      },
      {
        type: 'list',
        content: [
          'Designed for development/testing, not production workloads',
          'No automatic scaling or high availability',
          'No managed backups (you handle your own)',
          'Vector Search index refresh delay of ~1 second',
          'No dedicated search nodes or multi-region support',
          'Resource constraints based on local hardware',
        ],
      },
      {
        type: 'warning',
        content:
          'Atlas Local is ideal for development, testing, and private self-hosted deployments. For production workloads with high availability requirements, consider upgrading to MongoDB Atlas M10+ clusters.',
      },
      {
        type: 'tip',
        content:
          'Self-hosted deployments can start with Atlas Local for RAG features and later migrate to a managed Atlas cluster when scaling requirements increase. The code and data are fully compatible.',
      },
      {
        type: 'heading',
        content: 'Verifying Your Setup',
      },
      {
        type: 'text',
        content:
          'After configuration, verify your setup:',
      },
      {
        type: 'list',
        content: [
          'Check that Atlas Local is running: docker ps | grep mongodb-atlas-local',
          'Verify connection: mongosh mongodb://localhost:27017/',
          'Test Vector Search: Create a search index in the Atlas Local UI or via the API',
          'Upload a test document in NetPad and verify processing completes',
        ],
      },
    ],
    relatedTopics: ['deployment-modes', 'deployment-vercel', 'knowledge-guided-forms', 'rag-document-management', 'mongodb-connection'],
    keywords: [
      'self-hosted',
      'atlas local',
      'docker',
      'vector search',
      'RAG',
      'deployment mode',
      'M10',
      'cluster tier',
      'local development',
    ],
  },

  'organizations': {
    id: 'organizations',
    title: 'Organizations',
    description:
      'Manage workspaces, team members, and shared resources within your organization.',
    content: [
      {
        type: 'heading',
        content: 'What are Organizations?',
      },
      {
        type: 'text',
        content:
          'Organizations (also called workspaces) are the top-level container for all your NetPad resources. Each organization has its own database, forms, workflows, and team members.',
      },
      {
        type: 'heading',
        content: 'Organization Features',
      },
      {
        type: 'list',
        content: [
          'Isolated data and resources per organization',
          'Team member management with roles and permissions',
          'Shared connection vault for database credentials',
          'Organization-specific templates and settings',
          'Billing and usage tracking per organization',
        ],
      },
      {
        type: 'heading',
        content: 'Creating an Organization',
      },
      {
        type: 'text',
        content:
          'New users are guided through the onboarding wizard to create their first organization. You can create additional organizations from the organization selector in the navigation bar.',
      },
      {
        type: 'heading',
        content: 'Switching Organizations',
      },
      {
        type: 'text',
        content:
          'If you\'re a member of multiple organizations, use the organization selector in the top navigation to switch between them. Each organization maintains separate data and settings.',
      },
      {
        type: 'heading',
        content: 'Organization Settings',
      },
      {
        type: 'list',
        content: [
          'Go to Settings > Organizations to manage your workspace',
          'Update organization name and details',
          'Manage team members and their roles',
          'Configure database connections',
          'View cluster status and usage',
        ],
      },
      {
        type: 'tip',
        content:
          'Create separate organizations for different clients or projects to keep data isolated. Use the organization selector to quickly switch between workspaces.',
      },
    ],
    relatedTopics: ['connection-vault', 'getting-started', 'mongodb-connection'],
    keywords: ['organization', 'workspace', 'team', 'members', 'roles', 'permissions', 'settings'],
  },

  'connection-vault': {
    id: 'connection-vault',
    title: 'Connection Vault',
    description:
      'Securely manage database connections and credentials for your organization.',
    content: [
      {
        type: 'heading',
        content: 'What is the Connection Vault?',
      },
      {
        type: 'text',
        content:
          'The Connection Vault is a secure storage for database connection strings and credentials. It allows team members to use shared connections without exposing sensitive credentials.',
      },
      {
        type: 'heading',
        content: 'Key Features',
      },
      {
        type: 'list',
        content: [
          'Encrypted credential storage',
          'Named connections for easy reference',
          'Team-wide access without sharing passwords',
          'Connection testing and validation',
          'Usage tracking and audit logs',
        ],
      },
      {
        type: 'heading',
        content: 'Adding a Connection',
      },
      {
        type: 'list',
        content: [
          'Go to Settings > Connections',
          'Click "Add Connection" and enter a name',
          'Paste your MongoDB connection string',
          'Test the connection to verify it works',
          'Save the connection to the vault',
        ],
      },
      {
        type: 'heading',
        content: 'Using Connections',
      },
      {
        type: 'text',
        content:
          'Once a connection is saved to the vault, it appears in the connection selector throughout NetPad. Team members can use the connection without seeing the actual connection string.',
      },
      {
        type: 'warning',
        content:
          'Only organization administrators can add or modify connections in the vault. Regular users can only use existing connections that have been shared with them.',
      },
      {
        type: 'tip',
        content:
          'Use descriptive names for connections like "Production DB" or "Staging - Analytics" to make it easy for team members to select the right connection.',
      },
    ],
    relatedTopics: ['organizations', 'mongodb-connection', 'getting-started'],
    keywords: [
      'connection vault',
      'credentials',
      'connection string',
      'database connection',
      'secure storage',
      'team sharing',
    ],
  },

  'template-gallery': {
    id: 'template-gallery',
    title: 'Template Gallery',
    description:
      'Use pre-built templates to quickly create forms and workflows. Browse by category, preview templates, and customize them to fit your needs.',
    content: [
      {
        type: 'heading',
        content: 'What are Templates?',
      },
      {
        type: 'text',
        content:
          'Templates are pre-configured forms and workflows that you can use as starting points. They include common field configurations, validation rules, and structure for popular use cases like contact forms, job applications, event registration, and more.',
      },
      {
        type: 'heading',
        content: 'Using Templates',
      },
      {
        type: 'text',
        content:
          'When creating a new form or workflow, you\'ll see the template gallery. You can:',
      },
      {
        type: 'list',
        content: [
          'Browse templates by category (Business, Events, Feedback, Support, etc.)',
          'Search for specific templates using the search bar',
          'Preview template details including fields, complexity, and estimated setup time',
          'Click "Use Template" to apply the template immediately',
          'Click "Customize" to load the template and make changes before applying',
        ],
      },
      {
        type: 'heading',
        content: 'Template Categories',
      },
      {
        type: 'list',
        content: [
          'Business: Contact forms, job applications, lead capture, quote requests',
          'Events: Registration, RSVP, volunteer signup, webinar registration',
          'Feedback: Customer satisfaction, NPS surveys, product feedback',
          'Support: Support tickets, appointment booking',
          'E-commerce: Order forms, return requests',
          'Healthcare: Patient intake, health screening (with encryption support)',
          'Finance: Expense reports, financial applications (with encryption)',
          'Education: Course enrollment, scholarship applications',
          'Real Estate: Property inquiries, rental applications',
        ],
      },
      {
        type: 'heading',
        content: 'Template Preview',
      },
      {
        type: 'text',
        content:
          'Click on any template card to see a detailed preview showing:',
      },
      {
        type: 'list',
        content: [
          'Template description and category',
          'Complete list of fields with types and validation',
          'Complexity level (simple, moderate, advanced)',
          'Estimated setup time',
          'Field count and structure',
        ],
      },
      {
        type: 'heading',
        content: 'Workflow Templates',
      },
      {
        type: 'text',
        content:
          'Workflow templates provide pre-configured workflows for common automation scenarios:',
      },
      {
        type: 'list',
        content: [
          'Form Processing: Form to email, form to database',
          'Data Processing: Scheduled sync, data pipelines',
          'Integrations: Webhook processors, API monitoring',
          'AI Workflows: Text classification, data extraction',
          'Logic: Conditional routing, batch processing',
        ],
      },
      {
        type: 'tip',
        content:
          'Templates are starting points - you can modify any field, add new ones, or remove fields you don\'t need. Templates help you get started quickly while maintaining full flexibility.',
      },
      {
        type: 'tip',
        content:
          'After applying a template, you\'ll be prompted to name your form and configure the target MongoDB collection. The template fields will be ready to customize.',
      },
    ],
    relatedTopics: ['form-builder', 'workflow-nodes', 'field-configuration', 'google-forms-import'],
    keywords: [
      'template',
      'gallery',
      'pre-built',
      'starter',
      'preset',
      'category',
      'preview',
      'customize',
      'quick start',
    ],
  },

  'google-forms-import': {
    id: 'google-forms-import',
    title: 'Google Forms Import',
    description:
      'Import existing Google Forms into NetPad with intelligent field mapping, preserving structure, validation rules, and multi-page layouts.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'NetPad can import forms directly from Google Forms, automatically mapping field types, validation rules, and form structure. This allows you to migrate existing forms or leverage Google Forms as a quick design tool before customizing in NetPad.',
      },
      {
        type: 'heading',
        content: 'Two Import Methods',
      },
      {
        type: 'text',
        content:
          'NetPad offers two ways to import Google Forms, depending on whether your form is public or private:',
      },
      {
        type: 'list',
        content: [
          'URL Import (No Auth): Paste a public Google Form URL directly. No Google account connection required.',
          'OAuth Import: Connect your Google account to access all your forms, including private ones.',
        ],
      },
      {
        type: 'heading',
        content: 'URL Import (Public Forms)',
      },
      {
        type: 'text',
        content:
          'For publicly accessible Google Forms, simply paste the form URL. NetPad parses the form structure directly from the page without requiring authentication. This works with both full URLs (docs.google.com/forms/...) and short URLs (forms.gle/...).',
      },
      {
        type: 'tip',
        content:
          'URL import is the fastest way to import a form. Make sure your Google Form is set to "Anyone with the link can view" for this to work.',
      },
      {
        type: 'heading',
        content: 'OAuth Import (Private Forms)',
      },
      {
        type: 'text',
        content:
          'Connect your Google account to browse and import any form you have access to, including private forms. OAuth import provides better field type detection and access to all your Google Forms in one place.',
      },
      {
        type: 'heading',
        content: 'Supported Field Types',
      },
      {
        type: 'list',
        content: [
          'Short Answer → Text field',
          'Paragraph → Long Text field',
          'Multiple Choice → Radio buttons',
          'Checkboxes → Checkbox group',
          'Dropdown → Dropdown select',
          'Linear Scale → Rating field',
          'Date → Date picker',
          'Time → Time picker',
          'File Upload → File upload field',
          'Multiple Choice Grid → Matrix field (approximate)',
          'Checkbox Grid → Matrix field (approximate)',
        ],
      },
      {
        type: 'heading',
        content: 'Preserved Features',
      },
      {
        type: 'list',
        content: [
          'Required/optional field status',
          'Field descriptions and help text',
          'Options for choice fields (radio, checkbox, dropdown)',
          'Scale ranges and labels for rating fields',
          'File upload constraints (max files, file size, allowed types)',
          'Form title and description',
          'Multi-page structure with page breaks',
          'Number, email, and URL validation',
          'Min/max length constraints',
          'Regular expression patterns',
        ],
      },
      {
        type: 'heading',
        content: 'Import Wizard Steps',
      },
      {
        type: 'list',
        content: [
          '1. Choose Method: Select URL import or OAuth import',
          '2. Enter Source: Paste URL or select from your Google Forms',
          '3. Preview: Review field mappings with confidence indicators',
          '4. Import: Execute the import with progress tracking',
          '5. Complete: Open the imported form in the editor',
        ],
      },
      {
        type: 'heading',
        content: 'Mapping Confidence',
      },
      {
        type: 'text',
        content:
          'Each field mapping shows a confidence level: "exact" means a perfect 1:1 mapping, while "approximate" means the field type was mapped to the closest equivalent (e.g., grid questions become matrix fields).',
      },
      {
        type: 'warning',
        content:
          'Some Google Forms features cannot be imported: go-to section logic, image/video items, and certain validation types like "text contains". These limitations are shown in the preview.',
      },
      {
        type: 'heading',
        content: 'How to Import',
      },
      {
        type: 'list',
        content: [
          'Navigate to the Forms page within an application',
          'Click the "Import" dropdown button',
          'Select "Import from Google Forms"',
          'Follow the import wizard steps',
        ],
      },
      {
        type: 'tip',
        content:
          'After importing, you can fully customize the form in the NetPad Form Builder. Add conditional logic, computed fields, and other advanced features that Google Forms doesn\'t support.',
      },
    ],
    relatedTopics: ['form-builder', 'template-gallery', 'field-configuration'],
    keywords: [
      'google forms',
      'import',
      'migrate',
      'conversion',
      'google',
      'oauth',
      'url',
      'transfer',
      'copy',
      'external',
      'integration',
    ],
  },

  'applications': {
    id: 'applications',
    title: 'Applications',
    description:
      'Applications are first-class entities that group related forms and workflows together. They provide organization, versioning, and sharing capabilities.',
    content: [
      {
        type: 'heading',
        content: 'What are Applications?',
      },
      {
        type: 'text',
        content:
          'Applications in NetPad are containers that group related forms and workflows together. Think of an application as a complete solution - like "IT Help Desk" or "Customer Onboarding" - that includes all the forms, workflows, and connections needed to solve a specific business problem.',
      },
      {
        type: 'heading',
        content: 'Key Benefits',
      },
      {
        type: 'list',
        content: [
          'Organization: Group related forms and workflows logically',
          'Versioning: Create releases to snapshot your application at specific versions',
          'Sharing: Publish applications to the marketplace for others to use',
          'Insights: Track application-level statistics (forms, workflows, connections)',
          'Export: Export entire applications as bundles for backup or sharing',
        ],
      },
      {
        type: 'heading',
        content: 'Creating Applications',
      },
      {
        type: 'text',
        content:
          'Applications are created automatically when you create forms or workflows within a project. You can also create them explicitly from the Applications page. Each application has a name, description, icon, tags, and version.',
      },
      {
        type: 'heading',
        content: 'Application Structure',
      },
      {
        type: 'list',
        content: [
          'Forms: All forms associated with the application',
          'Workflows: All workflows that automate processes for the application',
          'Connections: Form-to-workflow connections that trigger automation',
          'Releases: Versioned snapshots of the application at specific points in time',
        ],
      },
      {
        type: 'tip',
        content:
          'Applications help you think about your solution holistically. Instead of managing individual forms and workflows, you manage complete applications that solve business problems.',
      },
    ],
    relatedTopics: ['application-releases', 'marketplace', 'projects-management'],
    keywords: [
      'application',
      'app',
      'group',
      'organize',
      'container',
      'solution',
      'package',
      'bundle',
    ],
  },

  'application-releases': {
    id: 'application-releases',
    title: 'Application Releases',
    description:
      'Create versioned snapshots of your applications with semantic versioning. Releases capture the exact state of forms, workflows, and connections at a point in time.',
    content: [
      {
        type: 'heading',
        content: 'What are Releases?',
      },
      {
        type: 'text',
        content:
          'Releases are versioned snapshots of your application. They capture the exact state of all forms, workflows, and connections at a specific point in time, allowing you to track changes, roll back if needed, and publish to the marketplace.',
      },
      {
        type: 'heading',
        content: 'Semantic Versioning',
      },
      {
        type: 'text',
        content:
          'Releases use semantic versioning (X.Y.Z format): Major.Minor.Patch. For example, 1.0.0 is the first release, 1.1.0 adds features, and 1.1.1 fixes bugs.',
      },
      {
        type: 'list',
        content: [
          'Major (X.0.0): Breaking changes or major new features',
          'Minor (X.Y.0): New features that are backward compatible',
          'Patch (X.Y.Z): Bug fixes and minor improvements',
        ],
      },
      {
        type: 'heading',
        content: 'Creating Releases',
      },
      {
        type: 'list',
        content: [
          'Navigate to your application → Releases tab',
          'Click "Create Release"',
          'Enter a version number (or use the suggested next version)',
          'Add a changelog describing what changed',
          'The release captures a snapshot of all forms, workflows, and connections',
        ],
      },
      {
        type: 'heading',
        content: 'Release Manifest',
      },
      {
        type: 'text',
        content:
          'Each release includes a manifest that documents what was included: which forms, workflows, and connections are part of this version. This manifest is used when publishing to the marketplace or exporting the application.',
      },
      {
        type: 'heading',
        content: 'Publishing Releases',
      },
      {
        type: 'text',
        content:
          'Once you create a release, you can publish it to the marketplace. The release becomes the source of truth for the marketplace listing, ensuring users get the exact version you tested and approved.',
      },
      {
        type: 'tip',
        content:
          'Create a release before making major changes. This gives you a safe point to roll back to if something goes wrong.',
      },
      {
        type: 'warning',
        content:
          'Releases are immutable - once created, they cannot be modified. Create a new release if you need to make changes.',
      },
    ],
    relatedTopics: ['applications', 'marketplace'],
    keywords: [
      'release',
      'version',
      'versioning',
      'snapshot',
      'semantic versioning',
      'changelog',
      'manifest',
      'publish',
    ],
  },

  'marketplace': {
    id: 'marketplace',
    title: 'Application Marketplace',
    description:
      'Discover and share NetPad applications. Browse published applications, import them into your projects, or publish your own applications for others to use.',
    content: [
      {
        type: 'heading',
        content: 'What is the Marketplace?',
      },
      {
        type: 'text',
        content:
          'The Application Marketplace is a public catalog where you can discover ready-to-use NetPad applications created by the community and NetPad team. Browse applications, preview their contents, and import them directly into your projects.',
      },
      {
        type: 'heading',
        content: 'Browsing the Marketplace',
      },
      {
        type: 'list',
        content: [
          'Navigate to Marketplace from the main navigation',
          'Browse by category (helpdesk, onboarding, survey, etc.)',
          'Filter by type (Official NetPad apps vs Community packages)',
          'Filter by source (Web Marketplace, npm Packages, or All Sources)',
          'Use quick filter chips in the header to quickly switch between sources',
          'Search by name, description, or tags',
          'Sort by popularity, recent additions, or ratings',
        ],
      },
      {
        type: 'heading',
        content: 'Application Details',
      },
      {
        type: 'text',
        content:
          'Each marketplace listing shows: application name, description, version, number of forms/workflows/connections, author information, download statistics, and ratings. npm packages also display a red "npm" badge and the package name. Click on an application to see full details and preview its contents.',
      },
      {
        type: 'heading',
        content: 'Importing Applications',
      },
      {
        type: 'text',
        content:
          'Applications can be imported from two sources:',
      },
      {
        type: 'heading',
        content: 'Web Marketplace Applications',
      },
      {
        type: 'list',
        content: [
          'Click "Import" on any web marketplace application',
          'Select your organization and project',
          'Choose import options (generate new IDs, preserve slugs, etc.)',
          'The application\'s forms and workflows are imported into your project',
          'You can then customize them to fit your needs',
        ],
      },
      {
        type: 'heading',
        content: 'npm Packages',
      },
      {
        type: 'list',
        content: [
          'Filter by "npm Packages" source or click the "npm Packages" chip',
          'Browse npm packages (they display a red "npm" badge)',
          'Click "Install from npm" on any npm package',
          'The package is automatically downloaded from npm registry and installed',
          'Dependencies are automatically resolved and installed',
          'The application is created in your project with all forms and workflows',
        ],
      },
      {
        type: 'heading',
        content: 'Publishing Your Applications',
      },
      {
        type: 'list',
        content: [
          'Create a release of your application (see Application Releases)',
          'Click "Publish" on the release',
          'Fill in marketplace metadata (summary, tags, category)',
          'Submit for review (admin approval required)',
          'Once approved, your application appears in the marketplace',
        ],
      },
      {
        type: 'heading',
        content: 'My Applications',
      },
      {
        type: 'text',
        content:
          'The "My Applications" tab shows all applications you\'ve published. You can edit metadata, unpublish/republish, view statistics, and delete listings. Only you can manage your published applications.',
      },
      {
        type: 'heading',
        content: 'Official vs Community',
      },
      {
        type: 'list',
        content: [
          'Official: Applications created and verified by the NetPad team',
          'Community: Applications created by users and shared publicly',
          'Both types are available in the marketplace',
          'Official apps are marked with a verified badge',
        ],
      },
      {
        type: 'heading',
        content: 'Web Marketplace vs npm Packages',
      },
      {
        type: 'text',
        content:
          'Applications can be published in two ways:',
      },
      {
        type: 'list',
        content: [
          'Web Marketplace: Published directly through the NetPad UI, stored in NetPad database',
          'npm Packages: Published to npm registry, automatically synced to marketplace',
          'Both appear in the marketplace and can be installed/imported',
          'Use the source filter to view only web marketplace apps, only npm packages, or both',
          'npm packages show a red "npm" badge and display the npm package name',
        ],
      },
      {
        type: 'tip',
        content:
          'Before publishing, make sure your application is well-tested and documented. Good descriptions and tags help others discover your application.',
      },
      {
        type: 'warning',
        content:
          'Published applications go through an admin review process. Make sure your application follows best practices and includes proper documentation.',
      },
    ],
    relatedTopics: ['applications', 'application-releases', 'npm-packages'],
    keywords: [
      'marketplace',
      'publish',
      'share',
      'discover',
      'import',
      'catalog',
      'gallery',
      'community',
      'official',
      'verified',
    ],
  },

  'npm-packages': {
    id: 'npm-packages',
    title: 'npm Package Integration',
    description:
      'Publish and install NetPad applications as npm packages. Share applications through npm registry and install them via npm CLI or web UI.',
    content: [
      {
        type: 'heading',
        content: 'What are npm Packages?',
      },
      {
        type: 'text',
        content:
          'NetPad applications can be published as npm packages, similar to how n8n publishes community nodes. This allows developers to share applications through the npm registry, making them discoverable and installable via familiar npm workflows.',
      },
      {
        type: 'heading',
        content: 'Package Types',
      },
      {
        type: 'list',
        content: [
          'Applications: Complete, self-contained solutions with forms, workflows, and configuration (@netpad/app-* or @your-org/netpad-app-*)',
          'Plugins: Reusable components that extend NetPad capabilities (@netpad/plugin-* or @your-org/netpad-plugin-*)',
        ],
      },
      {
        type: 'heading',
        content: 'Package Naming',
      },
      {
        type: 'text',
        content:
          'NetPad packages follow specific naming conventions for discovery:',
      },
      {
        type: 'list',
        content: [
          'Official packages: @netpad/app-* or @netpad/plugin-* (verified by NetPad team)',
          'Community packages: @your-org/netpad-app-* or netpad-app-* (published by developers)',
          'All packages must include "netpad-app" or "netpad-plugin" in keywords for discovery',
        ],
      },
      {
        type: 'heading',
        content: 'Package Structure',
      },
      {
        type: 'text',
        content:
          'Each npm package contains:',
      },
      {
        type: 'list',
        content: [
          'package.json: Standard npm package.json with a "netpad" field containing application/plugin metadata',
          'dist/bundle.json: Complete application bundle with forms, workflows, and configuration',
          'README.md: Documentation for the package',
          'CHANGELOG.md: Version history and changes',
        ],
      },
      {
        type: 'code',
        content: `{
  "name": "@netpad/app-customer-feedback",
  "version": "1.2.0",
  "description": "Customer feedback collection application",
  "keywords": ["netpad", "netpad-app", "feedback"],
  "main": "dist/bundle.json",
  "netpad": {
    "type": "application",
    "applicationId": "app_customer_feedback",
    "name": "Customer Feedback",
    "version": "1.2.0",
    "minNetPadVersion": "3.0.0",
    "category": "customer-engagement",
    "dependencies": {
      "plugins": ["@netpad/plugin-node-slack@^1.0.0"]
    }
  }
}`,
      },
      {
        type: 'heading',
        content: 'Publishing to npm',
      },
      {
        type: 'list',
        content: [
          'Create a release of your application (see Application Releases)',
          'Use the package builder to generate package.json and bundle.json',
          'Publish to npm: npm publish',
          'Package will be automatically discovered by NetPad marketplace sync',
          'Appears in marketplace within 1 hour of publishing',
        ],
      },
      {
        type: 'heading',
        content: 'Installing from npm',
      },
      {
        type: 'text',
        content:
          'You can install npm packages in three ways:',
      },
      {
        type: 'list',
        content: [
          'Web UI: Browse marketplace, filter by "npm Packages" source, and click "Install from npm" (handles npm installation automatically)',
          'CLI: npx @netpad/cli install @netpad/app-customer-feedback',
          'Direct npm: npm install @netpad/app-customer-feedback (for self-hosted instances)',
        ],
      },
      {
        type: 'heading',
        content: 'Marketplace UI Features',
      },
      {
        type: 'text',
        content:
          'The marketplace UI includes special features for npm packages:',
      },
      {
        type: 'list',
        content: [
          'Source Filter: Filter applications by source (All Sources, Web Marketplace, npm Packages)',
          'Quick Filter Chips: Click chips in the header to quickly filter by source type',
          'npm Badge: npm packages display a red "npm" badge to distinguish them from web marketplace applications',
          'Package Name Display: npm package names are shown in monospace font below the application name',
          'Install Button: npm packages show an "Install from npm" button instead of the standard "Import" button',
          'Package Info: Click on an npm package to see detailed package information including the npm package name',
        ],
      },
      {
        type: 'text',
        content:
          'To find npm packages in the marketplace:',
      },
      {
        type: 'list',
        content: [
          'Go to the Marketplace page',
          'Use the "Source" filter dropdown and select "npm Packages"',
          'Or click the "npm Packages" chip in the header',
          'Browse npm packages - they will have a red "npm" badge',
          'Click "Install from npm" to install the package to your project',
        ],
      },
      {
        type: 'heading',
        content: 'Package Discovery',
      },
      {
        type: 'text',
        content:
          'NetPad marketplace automatically discovers packages from npm registry by:',
      },
      {
        type: 'list',
        content: [
          'Searching for packages with keywords: "netpad-app", "netpad-plugin", "netpad-community-app", "netpad-community-plugin"',
          'Checking for "netpad" field in package.json',
          'Syncing every hour to discover new packages',
          'Updating existing packages when new versions are published',
        ],
      },
      {
        type: 'heading',
        content: 'Dependencies',
      },
      {
        type: 'text',
        content:
          'Applications can depend on other applications and plugins:',
      },
      {
        type: 'code',
        content: `{
  "netpad": {
    "dependencies": {
      "applications": ["@netpad/app-notifications@^1.0.0"],
      "plugins": ["@netpad/plugin-node-slack@^1.0.0"],
      "workflowTemplates": ["@netpad/template-email-notification@^1.0.0"]
    }
  }
}`,
      },
      {
        type: 'text',
        content:
          'When installing an application, all dependencies are automatically resolved and installed.',
      },
      {
        type: 'heading',
        content: 'Verification',
      },
      {
        type: 'list',
        content: [
          'Official packages (@netpad/ scope): Automatically verified, maintained by NetPad team',
          'Community packages: Can be submitted for verification review to get "Verified by NetPad" badge',
          'Unverified packages: Still available in marketplace, marked as community packages',
        ],
      },
      {
        type: 'heading',
        content: 'Package Development',
      },
      {
        type: 'list',
        content: [
          'Use @netpad/cli to scaffold new packages: npx @netpad/cli create-app my-app',
          'Build package: npm run build (validates structure and generates bundle.json)',
          'Test locally before publishing',
          'Follow semantic versioning (X.Y.Z format)',
          'Include comprehensive README and CHANGELOG',
        ],
      },
      {
        type: 'tip',
        content:
          'Before publishing, validate your package structure using the package validators. Ensure all required fields are present and follow NetPad conventions.',
      },
      {
        type: 'warning',
        content:
          'Package names must follow npm naming conventions and NetPad conventions. Official @netpad/ scope is reserved for NetPad team packages.',
      },
    ],
    relatedTopics: ['marketplace', 'applications', 'application-releases', 'application-contracts'],
    keywords: [
      'npm',
      'package',
      'publish',
      'install',
      'registry',
      'npmjs',
      'community',
      'plugin',
      'bundle',
      'package.json',
      'semantic versioning',
      'dependencies',
    ],
  },

  'application-contracts': {
    id: 'application-contracts',
    title: 'Application Contracts & Protection',
    description:
      'Define explicit contracts for your applications to ensure stability and prevent breaking changes. Protect forms and workflows from accidental modifications.',
    content: [
      {
        type: 'heading',
        content: 'What are Application Contracts?',
      },
      {
        type: 'text',
        content:
          'Application contracts are explicit definitions of your application\'s public API surface. They document what inputs consumers must provide, what outputs are guaranteed, what side effects occur, what events are emitted, and which behaviors are part of the contract. Contracts enable deterministic breaking change detection and enforcement.',
      },
      {
        type: 'heading',
        content: 'Why Use Contracts?',
      },
      {
        type: 'list',
        content: [
          'Prevent Breaking Changes: Contracts enforce that breaking changes require major version bumps',
          'Consumer Protection: Consumers know exactly what they can rely on',
          'Upgrade Safety: Automatic detection of breaking changes during upgrades',
          'Documentation: Contracts serve as living documentation of your application\'s API',
          'Component Protection: Lock forms and workflows to prevent accidental modifications',
        ],
      },
      {
        type: 'heading',
        content: 'Contract Components',
      },
      {
        type: 'text',
        content:
          'A contract defines five key aspects of your application:',
      },
      {
        type: 'list',
        content: [
          'Inputs: What external consumers must provide (fields, types, required/optional, constraints)',
          'Outputs: What consumers can rely on (guaranteed fields and their types)',
          'Side Effects: What the application does (writes to collections, API calls, notifications)',
          'Events: Events the application emits (what external systems can subscribe to)',
          'Behaviors: Which workflows are part of the public contract (workflow IDs, triggers)',
        ],
      },
      {
        type: 'heading',
        content: 'Creating Contracts',
      },
      {
        type: 'text',
        content:
          'Contracts are created in the Contracts tab of your application. You can create contracts manually using the visual Contract Editor, or they can be inferred from your forms and workflows (future feature).',
      },
      {
        type: 'list',
        content: [
          'Navigate to your application → Contracts tab',
          'Click "Create Contract"',
          'Enter a version number (must match a release version)',
          'Define inputs, outputs, side effects, events, and behaviors',
          'Set stability promises (which parts are guaranteed stable)',
          'Save as draft, then activate when ready',
        ],
      },
      {
        type: 'heading',
        content: 'Contract Lifecycle',
      },
      {
        type: 'list',
        content: [
          'Draft: Contract is being defined and can be edited',
          'Active: Contract is live and enforced. Cannot be modified (create new version instead)',
          'Deprecated: Contract is no longer recommended but still valid',
        ],
      },
      {
        type: 'heading',
        content: 'Breaking Change Detection',
      },
      {
        type: 'text',
        content:
          'When you create a new release, the system compares the new contract with the previous active contract to detect breaking changes. Breaking changes include:',
      },
      {
        type: 'list',
        content: [
          'Removed inputs or outputs',
          'Type changes (string → number)',
          'Required field changes (optional → required)',
          'Removed side effects or events',
          'Removed behaviors or workflow changes',
          'Removed stability guarantees',
        ],
      },
      {
        type: 'heading',
        content: 'Contract Enforcement',
      },
      {
        type: 'text',
        content:
          'Contracts are enforced at release creation time:',
      },
      {
        type: 'list',
        content: [
          'Breaking changes require a major version bump (1.0.0 → 2.0.0)',
          'Non-breaking changes allow minor or patch bumps',
          'You can override enforcement if needed (with warnings)',
          'Validation results are shown before release creation',
        ],
      },
      {
        type: 'heading',
        content: 'Component Protection',
      },
      {
        type: 'text',
        content:
          'You can explicitly lock forms and workflows to prevent accidental modifications:',
      },
      {
        type: 'list',
        content: [
          'Lock components when they\'re part of a published contract',
          'Locked components show a warning in the editor',
          'You can specify which fields remain editable (if any)',
          'Only owners/admins can lock/unlock components',
          'Lock status is visible in form and workflow editors',
        ],
      },
      {
        type: 'heading',
        content: 'Comparing Contracts',
      },
      {
        type: 'text',
        content:
          'Use the Compare feature to see differences between contract versions:',
      },
      {
        type: 'list',
        content: [
          'View breaking changes with impact levels (high, medium, low)',
          'See non-breaking changes that may require consumer updates',
          'View additive changes (new features)',
          'Get migration guides for breaking changes',
        ],
      },
      {
        type: 'heading',
        content: 'Best Practices',
      },
      {
        type: 'list',
        content: [
          'Create contracts early in development to establish API boundaries',
          'Activate contracts before publishing to marketplace',
          'Use stability promises to communicate what won\'t change',
          'Lock critical components to prevent accidental breaking changes',
          'Review breaking changes carefully before major version bumps',
          'Provide migration guides for breaking changes',
        ],
      },
      {
        type: 'tip',
        content:
          'Contracts are optional but highly recommended for applications you plan to share or publish. They provide confidence to consumers and help you maintain backward compatibility.',
      },
      {
        type: 'warning',
        content:
          'Active contracts cannot be modified. If you need to change a contract, create a new version. This ensures contract immutability and consumer trust.',
      },
    ],
    relatedTopics: ['applications', 'application-releases', 'application-contracts', 'marketplace'],
    keywords: [
      'contract',
      'contracts',
      'protection',
      'breaking changes',
      'versioning',
      'api',
      'stability',
      'lock',
      'locked',
      'component protection',
      'migration',
      'upgrade',
      'compatibility',
      'semantic versioning',
    ],
  },

  // ============================================
  // Admin-Only Help Topics
  // ============================================

  'admin-dashboard': {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    description:
      'Overview of the admin dashboard for platform administrators. Access user management, waitlist, AI analytics, and marketplace review.',
    adminOnly: true,
    content: [
      {
        type: 'heading',
        content: 'What is the Admin Dashboard?',
      },
      {
        type: 'text',
        content:
          'The Admin Dashboard is the central hub for platform administrators to manage users, review waitlist applications, monitor AI usage, and oversee marketplace submissions. Only users with the platform admin role can access this area.',
      },
      {
        type: 'heading',
        content: 'Available Admin Features',
      },
      {
        type: 'list',
        content: [
          'User Management - View and manage all platform users, roles, and permissions',
          'Waitlist - Review and approve pending waitlist applications',
          'AI Analytics - Monitor AI usage, token consumption, and costs across all organizations',
          'Marketplace Review - Review and approve marketplace template submissions',
          'Referrals - Manage referral codes, track referrals, and process commission payouts',
        ],
      },
      {
        type: 'heading',
        content: 'Accessing the Admin Dashboard',
      },
      {
        type: 'text',
        content:
          'Navigate to /admin from the main navigation menu. You must have platform admin privileges to access this page. If you do not see the Admin option in the menu, contact your organization administrator.',
      },
      {
        type: 'tip',
        content:
          'All admin actions are logged for security and compliance. Treat admin access as a privileged role with full visibility into platform operations.',
      },
    ],
    relatedTopics: ['admin-user-management', 'admin-waitlist', 'admin-ai-analytics', 'admin-marketplace-review', 'admin-referrals'],
    keywords: ['admin', 'dashboard', 'administration', 'management', 'platform', 'settings'],
  },

  'admin-user-management': {
    id: 'admin-user-management',
    title: 'User Management',
    description:
      'Manage all platform users, view their organizations, and control access levels across the NetPad platform.',
    adminOnly: true,
    content: [
      {
        type: 'heading',
        content: 'User Management Overview',
      },
      {
        type: 'text',
        content:
          'The User Management section allows platform administrators to view all registered users, their email verification status, organization memberships, and platform roles. Use this to monitor user activity and manage access.',
      },
      {
        type: 'heading',
        content: 'User Information',
      },
      {
        type: 'list',
        content: [
          'Email - User email address and verification status',
          'Name - User display name',
          'Organizations - List of organizations the user belongs to',
          'Platform Role - Admin or regular user',
          'Last Active - When the user last accessed the platform',
          'Registration Date - When the user account was created',
        ],
      },
      {
        type: 'heading',
        content: 'Available Actions',
      },
      {
        type: 'list',
        content: [
          'View user details and activity history',
          'Promote or demote users to/from admin role',
          'View organization memberships',
          'Monitor email verification status',
        ],
      },
      {
        type: 'warning',
        content:
          'Changing a user\'s platform role affects their access to admin features. Only grant admin access to trusted users who need platform-wide visibility.',
      },
    ],
    relatedTopics: ['admin-dashboard', 'admin-waitlist', 'organizations'],
    keywords: ['users', 'management', 'admin', 'roles', 'permissions', 'access', 'organization', 'members'],
  },

  'admin-waitlist': {
    id: 'admin-waitlist',
    title: 'Waitlist Management',
    description:
      'Review, approve, or reject waitlist applications from users requesting access to the NetPad platform.',
    adminOnly: true,
    content: [
      {
        type: 'heading',
        content: 'Waitlist Overview',
      },
      {
        type: 'text',
        content:
          'The Waitlist section shows all pending, approved, and rejected applications from users who want to join the platform. As an admin, you can review applications and grant or deny access.',
      },
      {
        type: 'heading',
        content: 'Application Information',
      },
      {
        type: 'list',
        content: [
          'Email - Applicant\'s email address',
          'Name - Applicant\'s name',
          'Company - Organization or company name',
          'Use Case - How they plan to use NetPad',
          'Status - Pending, Approved, or Rejected',
          'Applied Date - When the application was submitted',
        ],
      },
      {
        type: 'heading',
        content: 'Approval Workflow',
      },
      {
        type: 'list',
        content: [
          'Review the application details and use case',
          'Click "Approve" to grant platform access',
          'Click "Reject" to deny the application',
          'Approved users receive an email invitation to complete registration',
        ],
      },
      {
        type: 'tip',
        content:
          'Review use cases to understand how users plan to use NetPad. This helps prioritize users who align with platform goals and identify potential power users.',
      },
    ],
    relatedTopics: ['admin-dashboard', 'admin-user-management'],
    keywords: ['waitlist', 'applications', 'approval', 'access', 'registration', 'invite', 'pending'],
  },

  'admin-ai-analytics': {
    id: 'admin-ai-analytics',
    title: 'AI Analytics Dashboard',
    description:
      'Monitor AI usage across the platform including token consumption, costs, top users, and usage trends by feature and model.',
    adminOnly: true,
    content: [
      {
        type: 'heading',
        content: 'AI Analytics Overview',
      },
      {
        type: 'text',
        content:
          'The AI Analytics dashboard provides comprehensive visibility into how AI features are being used across the platform. Track token consumption, estimated costs, latency metrics, and identify top users and organizations.',
      },
      {
        type: 'heading',
        content: 'Key Metrics',
      },
      {
        type: 'list',
        content: [
          'Total Requests - Number of AI API calls across all users',
          'Total Tokens - Combined prompt and completion tokens used',
          'Estimated Cost - Calculated cost based on model pricing',
          'Average Latency - Mean response time for AI requests',
          'Error Rate - Percentage of failed AI requests',
          'Unique Users - Number of users who made AI requests',
        ],
      },
      {
        type: 'heading',
        content: 'Usage Breakdown',
      },
      {
        type: 'list',
        content: [
          'By Feature - See which AI features (chat, form generation, formulas, etc.) are most used',
          'By Model - Track usage across different AI models (GPT-4o-mini, GPT-4o, etc.)',
          'By Organization - View top organizations by token consumption',
          'By User - Identify top users by AI usage',
          'Trends - Daily usage charts showing token consumption over time',
        ],
      },
      {
        type: 'heading',
        content: 'Time Range Selection',
      },
      {
        type: 'text',
        content:
          'Use the time range selector to view analytics for different periods: 7 days, 30 days, or 90 days. This helps identify usage trends and plan for capacity.',
      },
      {
        type: 'heading',
        content: 'Data Retention',
      },
      {
        type: 'text',
        content:
          'Detailed request logs are retained for 90 days. After this period, individual request data is automatically deleted, but aggregated statistics remain available.',
      },
      {
        type: 'tip',
        content:
          'Monitor the cost trend to forecast AI expenses. If costs are rising unexpectedly, check the top users and features to understand the driving factors.',
      },
      {
        type: 'warning',
        content:
          'AI analytics includes data from all organizations. Handle this information with appropriate confidentiality as it reveals usage patterns across the entire platform.',
      },
    ],
    relatedTopics: ['admin-dashboard', 'admin-user-management'],
    keywords: [
      'ai',
      'analytics',
      'tokens',
      'usage',
      'cost',
      'monitoring',
      'openai',
      'gpt',
      'llm',
      'metrics',
      'dashboard',
      'trends',
    ],
  },

  'admin-marketplace-review': {
    id: 'admin-marketplace-review',
    title: 'Marketplace Review',
    description:
      'Review and approve marketplace template submissions before they are published to the public template gallery.',
    adminOnly: true,
    content: [
      {
        type: 'heading',
        content: 'Marketplace Review Overview',
      },
      {
        type: 'text',
        content:
          'When users submit templates to the marketplace, they require admin review before becoming publicly available. This section shows pending submissions and allows you to approve or reject them.',
      },
      {
        type: 'heading',
        content: 'Review Criteria',
      },
      {
        type: 'list',
        content: [
          'Quality - Is the template well-designed and functional?',
          'Completeness - Does it include description, screenshots, and documentation?',
          'Originality - Is it original work or properly attributed?',
          'Compliance - Does it follow platform guidelines and policies?',
          'Security - Does it avoid potentially harmful patterns?',
        ],
      },
      {
        type: 'heading',
        content: 'Review Actions',
      },
      {
        type: 'list',
        content: [
          'Preview Template - View the full template configuration',
          'Approve - Publish the template to the marketplace',
          'Request Changes - Ask the author to make modifications',
          'Reject - Decline the submission with a reason',
        ],
      },
      {
        type: 'tip',
        content:
          'When rejecting or requesting changes, provide clear feedback to help authors improve their submissions. Good feedback leads to better marketplace content.',
      },
    ],
    relatedTopics: ['admin-dashboard', 'marketplace', 'template-gallery'],
    keywords: [
      'marketplace',
      'review',
      'templates',
      'submissions',
      'approval',
      'publish',
      'gallery',
      'moderation',
    ],
  },

  // ============================================
  // Open Core Architecture Topics
  // ============================================

  'open-core-architecture': {
    id: 'open-core-architecture',
    title: 'Open Core Architecture',
    description:
      'Learn about NetPad\'s open core model that separates cloud-only features from the open source core, enabling both SaaS and self-hosted deployments.',
    content: [
      {
        type: 'heading',
        content: 'What is Open Core?',
      },
      {
        type: 'text',
        content:
          'NetPad uses an open core model similar to GitLab, Supabase, and Cal.com. The core platform is open source (MIT license), while cloud-specific features like Stripe billing and Atlas provisioning are in a private package.',
      },
      {
        type: 'heading',
        content: 'Architecture Overview',
      },
      {
        type: 'list',
        content: [
          'Public Repository (netpad-3): Core features including Form Builder, Workflows, Data Browser, Conversational Forms, and the Extension System',
          'Private Package (@netpad/cloud-features): Stripe billing, Atlas provisioning, marketplace services, admin features',
          'Extension System: Dynamic loading mechanism that imports cloud features when running in cloud mode',
        ],
      },
      {
        type: 'heading',
        content: 'Deployment Modes',
      },
      {
        type: 'list',
        content: [
          'Cloud (NETPAD_PLATFORM_MODE=cloud): Full features with Stripe billing and Atlas integration',
          'Self-Hosted (NETPAD_PLATFORM_MODE=self-hosted): Core features with usage tracking, no Stripe',
          'Standalone (STANDALONE_MODE=true): Exported apps running independently',
        ],
      },
      {
        type: 'heading',
        content: 'Feature Availability',
      },
      {
        type: 'text',
        content:
          'In cloud mode, all cloud-only features are automatically available. In self-hosted mode, the UI adapts to show only applicable features - for example, the billing page shows usage metrics instead of Stripe checkout.',
      },
      {
        type: 'tip',
        content:
          'The extension system uses dynamic imports, so the private package is only loaded when actually needed in cloud mode. Self-hosted deployments work perfectly without it.',
      },
    ],
    relatedTopics: ['deployment-modes', 'extension-system', 'admin-extension-management'],
    keywords: [
      'open core',
      'architecture',
      'cloud',
      'self-hosted',
      'extension',
      'deployment',
      'saas',
      'enterprise',
    ],
  },

  'extension-system': {
    id: 'extension-system',
    title: 'Extension System',
    description:
      'Learn about NetPad\'s extension system for adding custom functionality through modular npm packages.',
    content: [
      {
        type: 'heading',
        content: 'What Are Extensions?',
      },
      {
        type: 'text',
        content:
          'Extensions are npm packages that add custom functionality to NetPad. They can provide API routes, UI components, services, middleware, custom workflow nodes, and more. Extensions integrate seamlessly with NetPad\'s core while remaining isolated and independently maintainable.',
      },
      {
        type: 'heading',
        content: 'Extension Capabilities',
      },
      {
        type: 'list',
        content: [
          'API Routes: Custom endpoints under /api/ext/{extension-name}/',
          'Services: Shared business logic (billing, provisioning, analytics)',
          'Middleware: Request/response processing with priority ordering',
          'Components: React UI components for use in pages',
          'Features: Feature flags that enable/disable functionality',
          'Workflow Nodes: Custom workflow node types for automation',
          'Lifecycle Hooks: Initialize and cleanup logic',
        ],
      },
      {
        type: 'heading',
        content: 'Built-in Extensions',
      },
      {
        type: 'text',
        content: 'NetPad includes several built-in extensions:',
      },
      {
        type: 'list',
        content: [
          '@netpad/cloud-features: Billing & subscriptions (Stripe), Atlas provisioning, premium AI features, usage analytics (cloud deployments only)',
          '@netpad/collaborate: Community gallery, contributors, collaboration features',
        ],
      },
      {
        type: 'heading',
        content: 'Enabling Extensions',
      },
      {
        type: 'text',
        content:
          'Extensions are enabled via the NETPAD_EXTENSIONS environment variable. Add it to your .env.local file:',
      },
      {
        type: 'code',
        content: '# Enable single extension\nNETPAD_EXTENSIONS=@netpad/collaborate\n\n# Enable multiple extensions\nNETPAD_EXTENSIONS=@netpad/collaborate,@myorg/custom-extension',
      },
      {
        type: 'text',
        content: 'Then install the package and restart NetPad:',
      },
      {
        type: 'code',
        content: 'npm install @netpad/collaborate',
      },
      {
        type: 'heading',
        content: 'Extension Architecture',
      },
      {
        type: 'text',
        content:
          'Extensions follow a clear pattern. Each extension exports a NetPadExtension object with:',
      },
      {
        type: 'list',
        content: [
          'Metadata: ID, name, version, description',
          'Features: Array of feature flags provided',
          'Routes: API route definitions',
          'Middleware: Request/response middleware',
          'Services: Service implementations (billing, provisioning, etc.)',
          'Workflow Nodes: Custom workflow node types',
          'Components: React component overrides',
          'Lifecycle Hooks: initialize() and cleanup() functions',
        ],
      },
      {
        type: 'heading',
        content: 'Extension Loading Order',
      },
      {
        type: 'list',
        content: [
          'Cloud Extension: @netpad/cloud-features (if NETPAD_CLOUD=true)',
          'Plugin Extensions: Packages listed in NETPAD_EXTENSIONS',
          'Programmatic Extensions: Registered via registerExtensionManually()',
        ],
      },
      {
        type: 'heading',
        content: 'Feature Checking',
      },
      {
        type: 'text',
        content:
          'Check if a feature is available in your code:',
      },
      {
        type: 'code',
        content: "import { isFeatureAvailable } from '@/lib/extensions/registry';\n\n// Check if a feature is available\nif (isFeatureAvailable('billing')) {\n  // Show billing UI\n}\n\n// Custom extension features use the custom: prefix\nif (isFeatureAvailable('custom:collaborate')) {\n  // Show collaborate features\n}",
      },
      {
        type: 'heading',
        content: 'Creating Custom Extensions',
      },
      {
        type: 'text',
        content:
          'To create your own extension:',
      },
      {
        type: 'list',
        content: [
          'Create an npm package with your extension code',
          'Export a NetPadExtension object as the default export',
          'Implement required interfaces (metadata, routes, services, etc.)',
          'Publish to npm or use locally',
          'Enable via NETPAD_EXTENSIONS environment variable',
        ],
      },
      {
        type: 'heading',
        content: 'Key Components',
      },
      {
        type: 'list',
        content: [
          'Registry (registry.ts): Central registry for managing extensions and their services',
          'Loader (loader.ts): Dynamic import mechanism for loading extension packages',
          'Hooks (hooks.ts): React hooks for feature detection (useExtensionFeature, useDeploymentMode)',
          'Components (CloudFeature.tsx): Conditional rendering based on deployment mode',
        ],
      },
      {
        type: 'heading',
        content: 'API Endpoints',
      },
      {
        type: 'list',
        content: [
          'GET /api/extensions/status: Returns extension registry status and loaded features',
          'GET /api/extensions/features: Lists all enabled features',
        ],
      },
      {
        type: 'tip',
        content:
          'For detailed documentation on creating extensions, see https://docs.netpad.io/docs/extensions/overview',
      },
    ],
    relatedTopics: ['open-core-architecture', 'deployment-modes', 'admin-extension-management'],
    keywords: [
      'extension',
      'system',
      'registry',
      'loader',
      'hooks',
      'services',
      'billing',
      'atlas',
      'cloud',
      'custom',
      'npm',
      'package',
    ],
  },

  'admin-extension-management': {
    id: 'admin-extension-management',
    title: 'Extension Management (Admin)',
    description:
      'Administrative guide for managing the extension system, monitoring feature availability, and troubleshooting extension issues.',
    adminOnly: true,
    content: [
      {
        type: 'heading',
        content: 'Extension Status Monitoring',
      },
      {
        type: 'text',
        content:
          'Platform administrators can monitor extension status via the /api/extensions/status endpoint. This returns information about loaded extensions, available features, and initialization state.',
      },
      {
        type: 'code',
        content: 'curl https://your-netpad-instance/api/extensions/status\n\n{\n  "extensionCount": 1,\n  "extensions": [\n    {\n      "id": "netpad-cloud",\n      "name": "NetPad Cloud",\n      "version": "1.1.0",\n      "features": ["billing", "stripe_integration", ...]\n    }\n  ],\n  "enabledFeatures": [...],\n  "initialized": true,\n  "deploymentMode": "cloud"\n}',
      },
      {
        type: 'heading',
        content: 'Environment Configuration',
      },
      {
        type: 'list',
        content: [
          'NETPAD_PLATFORM_MODE: Set to "cloud" or "self-hosted"',
          'NEXT_PUBLIC_NETPAD_PLATFORM_MODE: Client-side deployment mode detection',
          'For cloud mode, ensure @netpad/cloud-features is installed in node_modules',
        ],
      },
      {
        type: 'heading',
        content: 'Troubleshooting',
      },
      {
        type: 'list',
        content: [
          'Extension not loading: Check NETPAD_PLATFORM_MODE is set to "cloud"',
          'Features unavailable: Verify @netpad/cloud-features package is installed',
          'Service errors: Check that database operations are configured for billing service',
          'UI not adapting: Ensure NEXT_PUBLIC_NETPAD_PLATFORM_MODE matches server setting',
        ],
      },
      {
        type: 'heading',
        content: 'Cloud Package Installation',
      },
      {
        type: 'text',
        content:
          'The @netpad/cloud-features package is a private npm package. To install it in a cloud deployment:',
      },
      {
        type: 'code',
        content: '# Authenticate with npm\nnpm login --scope=@netpad\n\n# Install the package\nnpm install @netpad/cloud-features\n\n# Set deployment mode\nNETPAD_PLATFORM_MODE=cloud',
      },
      {
        type: 'tip',
        content:
          'In production cloud deployments, the package should be pre-installed and the deployment mode should be set via environment variables in your hosting platform.',
      },
    ],
    relatedTopics: ['admin-dashboard', 'open-core-architecture', 'extension-system'],
    keywords: [
      'admin',
      'extension',
      'management',
      'status',
      'troubleshooting',
      'cloud',
      'package',
      'configuration',
    ],
  },

  'admin-referrals': {
    id: 'admin-referrals',
    title: 'Referral Management',
    description:
      'Manage referral codes, track referrals, configure benefits for referred users, and process commission payouts.',
    adminOnly: true,
    content: [
      {
        type: 'heading',
        content: 'Referral Program Overview',
      },
      {
        type: 'text',
        content:
          'The Referral Management system allows platform administrators to create and manage referral codes, track referral performance, configure incentives for both referrers and referred users, and process commission payouts. Access this feature at /admin/referrals.',
      },
      {
        type: 'heading',
        content: 'Referral Code Types',
      },
      {
        type: 'text',
        content:
          'NetPad supports multiple referral code types with different commission structures. Each type has default commission rates that apply to the referrer (the person sharing the code):',
      },
      {
        type: 'list',
        content: [
          'Standard - Auto-generated for organizations: 20% / 15% / 10% / 10% (Year 1/2/3/N)',
          'Partner - For strategic partners: 30% / 25% / 20% / 15% (Year 1/2/3/N)',
          'Influencer - For content creators: 25% / 20% / 15% / 10% (Year 1/2/3/N)',
          'Campaign - For marketing campaigns: 20% / 15% / 10% / 10% (Year 1/2/3/N)',
        ],
      },
      {
        type: 'heading',
        content: 'Commission Structure',
      },
      {
        type: 'text',
        content:
          'Commissions are calculated as a percentage of each invoice amount paid by the referred organization. The rate decreases over the lifetime of the referral based on how long ago the referral was attributed:',
      },
      {
        type: 'list',
        content: [
          'Year 1 - Highest commission rate (first 12 months)',
          'Year 2 - Reduced rate (months 13-24)',
          'Year 3 - Further reduced rate (months 25-36)',
          'Year N - Ongoing rate for all subsequent years',
        ],
      },
      {
        type: 'tip',
        content:
          'Referrals must be "qualified" before earning commissions. Qualification requires 2 paid invoices from the referred organization.',
      },
      {
        type: 'heading',
        content: 'Referred User Benefits',
      },
      {
        type: 'text',
        content:
          'In addition to referrer commissions, you can configure incentives for the referred user (the person using the code to sign up):',
      },
      {
        type: 'list',
        content: [
          'Discount Percentage - X% off their first N payments (e.g., 10% off first 3 payments)',
          'Account Credit - Flat dollar amount credited to their account (e.g., $20 credit)',
          'Trial Extension - Extra days added to the standard trial period (e.g., +14 days)',
          'Feature Unlocks - Temporary access to premium features (future enhancement)',
        ],
      },
      {
        type: 'heading',
        content: 'Creating Referral Codes',
      },
      {
        type: 'text',
        content:
          'To create a new referral code, navigate to /admin/referrals and click "Create Code" in the Referral Codes tab:',
      },
      {
        type: 'list',
        content: [
          '1. Enter a unique code (4-20 alphanumeric characters, automatically uppercased)',
          '2. Select the code type (Partner, Influencer, or Campaign)',
          '3. Optionally enable benefits for referred users and configure discount/credit/trial options',
          '4. Optionally assign to an organization (search by name, slug, or owner email)',
          '5. Click "Create" to generate the code',
        ],
      },
      {
        type: 'heading',
        content: 'Unassigned vs Assigned Codes',
      },
      {
        type: 'text',
        content:
          'Codes can be created without an organization assignment. This is useful for pre-generating codes for marketing campaigns or partnerships:',
      },
      {
        type: 'list',
        content: [
          'Unassigned Codes - Created but not linked to any organization. Commission earnings go nowhere until assigned.',
          'Assigned Codes - Linked to a specific organization. That organization earns commissions when their code is used.',
        ],
      },
      {
        type: 'tip',
        content:
          'Use the "Assign to Organization" feature to link an unassigned code to an organization after creation. Search by organization name, slug, or owner email.',
      },
      {
        type: 'heading',
        content: 'Managing Payouts',
      },
      {
        type: 'text',
        content:
          'When referrers accumulate available earnings (after the 30-day hold period), they can request payouts. Admins must review and approve payout requests:',
      },
      {
        type: 'list',
        content: [
          'Pending Payouts - Review requested payouts in the first tab',
          'Minimum Payout - $50 USD minimum for payout requests',
          'Payment Methods - PayPal, Wise, bank transfer, or other',
          'Approve - Marks the payout as approved for processing',
          'Reject - Denies the payout request (requires reason)',
        ],
      },
      {
        type: 'warning',
        content:
          'Approved payouts require manual processing outside of NetPad. After approving, coordinate with finance to send the payment via the specified method.',
      },
      {
        type: 'heading',
        content: 'Referral Lifecycle',
      },
      {
        type: 'list',
        content: [
          '1. User shares their referral code URL: netpad.io/signup?ref=CODE',
          '2. New user clicks the link - code is stored in a 30-day cookie',
          '3. New user signs up and creates an organization - referral is "attributed"',
          '4. New user makes payments - referral status progresses to "qualifying"',
          '5. After 2 payments - referral becomes "qualified" and commissions start accruing',
          '6. Referrer sees earnings in their dashboard with 30-day hold',
          '7. After hold period, earnings become "available" for payout',
          '8. Referrer requests payout - admin approves/rejects',
          '9. If referred org cancels - referral status changes to "churned" (no more commissions)',
        ],
      },
      {
        type: 'heading',
        content: 'Tracking Performance',
      },
      {
        type: 'text',
        content:
          'The admin dashboard provides visibility into referral program performance:',
      },
      {
        type: 'list',
        content: [
          'Pending Payouts - Number of payout requests awaiting approval',
          'Active Codes - Total number of active referral codes',
          'Unassigned Codes - Codes not yet linked to an organization',
          'Qualified Referrals - Referrals that have reached qualification threshold',
        ],
      },
    ],
    relatedTopics: ['admin-dashboard', 'admin-user-management', 'billing'],
    keywords: [
      'referrals',
      'referral',
      'codes',
      'commission',
      'payout',
      'affiliate',
      'partner',
      'influencer',
      'campaign',
      'discount',
      'benefits',
      'admin',
    ],
  },

  // ============================================
  // Form Reactions
  // ============================================

  'form-reactions': {
    id: 'form-reactions',
    title: 'Form Reactions',
    description:
      'Trigger workflows in response to form field events and update form fields with workflow outputs in real-time.',
    content: [
      {
        type: 'heading',
        content: 'What are Form Reactions?',
      },
      {
        type: 'text',
        content:
          'Form Reactions connect form field events (like blur, change, or focus) to workflows, enabling real-time field updates based on workflow outputs. For example, when a user enters a company domain, a reaction can fetch company data from an API and auto-fill related fields.',
      },
      {
        type: 'heading',
        content: 'Key Concepts',
      },
      {
        type: 'list',
        content: [
          'Trigger: The form field event that starts the reaction (change, blur, focus, validate, clear)',
          'Workflow: The workflow that processes the trigger data and returns field updates',
          'Field Updates: Mappings from workflow output data to form fields',
          'Execution: Synchronous execution with configurable timeout and cascade protection',
        ],
      },
      {
        type: 'heading',
        content: 'Creating a Reaction',
      },
      {
        type: 'list',
        content: [
          '1. Build a workflow with a "Field Event Trigger" node as the entry point',
          '2. Add processing nodes (HTTP Request, Transform, AI, etc.)',
          '3. Add a "Form Field Update" node to map outputs to form fields',
          '4. Create a reaction on your form linking to this workflow',
          '5. Configure trigger fields, events, and debounce settings',
        ],
      },
      {
        type: 'heading',
        content: 'Reaction Configuration',
      },
      {
        type: 'list',
        content: [
          'Name: Descriptive name for the reaction',
          'Workflow: The workflow to execute when triggered',
          'Trigger Fields: Which form fields trigger this reaction',
          'Trigger Event: The event type (change, blur, focus)',
          'Debounce: Delay in milliseconds to prevent rapid firing (0-30000ms)',
          'Timeout: Maximum execution time (1000-30000ms, default 10000ms)',
        ],
      },
      {
        type: 'heading',
        content: 'Example Use Cases',
      },
      {
        type: 'list',
        content: [
          'Company lookup: Enter domain → fetch company info → auto-fill name, industry, size',
          'Address validation: Enter postal code → validate → auto-fill city, state',
          'Price calculation: Select products → calculate → update total price field',
          'AI suggestions: Enter description → AI categorizes → suggest tags',
          'Real-time validation: Enter email → check against database → show availability',
        ],
      },
      {
        type: 'tip',
        content:
          'Use debounce (e.g., 500ms) for text fields to avoid triggering on every keystroke. For select/checkbox fields, 0ms debounce is usually appropriate.',
      },
      {
        type: 'warning',
        content:
          'Reactions have cascade protection (max depth of 3) to prevent infinite loops when field updates trigger other reactions.',
      },
    ],
    relatedTopics: [
      'node-field-event-trigger',
      'node-form-field-update',
      'reactions-api',
      'use-form-reactions-hook',
      'workflow-nodes',
    ],
    keywords: [
      'reaction',
      'reactions',
      'form',
      'trigger',
      'field',
      'event',
      'update',
      'real-time',
      'auto-fill',
      'workflow',
    ],
  },

  'node-field-event-trigger': {
    id: 'node-field-event-trigger',
    title: 'Field Event Trigger Node',
    description:
      'Workflow trigger node that fires when a form field event occurs. Entry point for form reaction workflows.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'The Field Event Trigger node is the entry point for form reaction workflows. It receives data when a configured form field event occurs (change, blur, focus, etc.) and provides form context to downstream nodes.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Form ID: Optional - Usually set automatically by the reaction system',
          'Trigger Mode: "any" fires when any field triggers; "all" requires all specified fields to have values',
          'Debounce (ms): Delay before executing to prevent rapid firing (0-30000ms)',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'triggerField: Name of the field that triggered the event',
          'triggerEvent: Event type (change, blur, focus, validate, clear)',
          'fieldValue: Current value of the triggering field',
          'formData: Complete form data object with all field values',
          'formId: ID of the form',
          'reactionId: ID of the reaction being executed',
        ],
      },
      {
        type: 'heading',
        content: 'Accessing Data in Downstream Nodes',
      },
      {
        type: 'text',
        content: 'Use template expressions to access trigger data in subsequent nodes:',
      },
      {
        type: 'code',
        content: [
          '// Access the triggering field value',
          '{{nodes.fieldEventTrigger.fieldValue}}',
          '',
          '// Access a specific form field',
          '{{nodes.fieldEventTrigger.formData.companyDomain}}',
          '',
          '// Access the trigger event type',
          '{{nodes.fieldEventTrigger.triggerEvent}}',
        ],
      },
      {
        type: 'example',
        content:
          'Domain lookup workflow: Field Event Trigger (domain field blur) → HTTP Request (company API) → Form Field Update (company name, industry)',
      },
      {
        type: 'tip',
        content:
          'The trigger mode "any" is best for single-field reactions. Use "all" when you need multiple fields to have values before processing.',
      },
    ],
    relatedTopics: ['form-reactions', 'node-form-field-update', 'workflow-nodes', 'node-form-trigger'],
    keywords: ['field', 'event', 'trigger', 'form', 'reaction', 'blur', 'change', 'focus'],
  },

  'node-form-field-update': {
    id: 'node-form-field-update',
    title: 'Form Field Update Node',
    description:
      'Update form fields with data from workflow execution. Maps workflow outputs to specific form fields.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'The Form Field Update node sends computed values back to form fields. Configure field mappings to specify which form fields receive which workflow data. This is typically the final node in a form reaction workflow.',
      },
      {
        type: 'heading',
        content: 'Configuration',
      },
      {
        type: 'list',
        content: [
          'Feedback Mode: How to notify users when fields are updated (silent, subtle, toast)',
          'Validate After Update: Whether to run form validation after applying updates',
          'Field Mappings: Array of source-to-field mappings (see below)',
        ],
      },
      {
        type: 'heading',
        content: 'Field Mapping Configuration',
      },
      {
        type: 'text',
        content: 'Each mapping specifies how workflow data flows to a form field:',
      },
      {
        type: 'list',
        content: [
          'Form Field Path: The target form field (e.g., "companyName", "address.city")',
          'Source Data Path: Path to value in workflow data (e.g., "httpRequest.data.company.name")',
          'Null Behavior: What to do if source value is null/undefined:',
          '  - skip: Don\'t update the field (default)',
          '  - clear: Set the field to null/empty',
          '  - default: Use a specified default value',
        ],
      },
      {
        type: 'heading',
        content: 'Source Path Examples',
      },
      {
        type: 'code',
        content: [
          '// From HTTP Request node output',
          'httpRequest.data.company.name',
          'httpRequest.data.employees[0].email',
          '',
          '// From Transform node output',
          'transform.processedData.category',
          '',
          '// From original form data',
          'fieldEventTrigger.formData.existingField',
        ],
      },
      {
        type: 'heading',
        content: 'Output Data',
      },
      {
        type: 'list',
        content: [
          'success: Whether updates were applied successfully',
          'updates: Object containing the field updates that were sent',
          'updatedFields: Array of field names that were updated',
          'skippedFields: Array of field names skipped due to null values',
        ],
      },
      {
        type: 'example',
        content:
          'Company auto-fill: Source "httpRequest.data.name" → Field "companyName", Source "httpRequest.data.industry" → Field "industry"',
      },
      {
        type: 'tip',
        content:
          'Use dot notation for nested paths. Reference upstream node outputs using their node ID as the prefix (e.g., httpRequest.data.result).',
      },
    ],
    relatedTopics: ['form-reactions', 'node-field-event-trigger', 'workflow-nodes'],
    keywords: ['update', 'field', 'form', 'mapping', 'output', 'reaction'],
  },

  'reactions-api': {
    id: 'reactions-api',
    title: 'Form Reactions API',
    description:
      'REST API endpoints for managing and executing form reactions programmatically.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'The Reactions API provides programmatic access to create, manage, and execute form reactions. All endpoints require authentication and an orgId query parameter.',
      },
      {
        type: 'heading',
        content: 'List Reactions',
      },
      {
        type: 'code',
        content: [
          'GET /api/forms/{formId}/reactions?orgId={orgId}',
          '',
          'Response:',
          '{',
          '  "success": true,',
          '  "reactions": [...],',
          '  "total": 3',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Create Reaction',
      },
      {
        type: 'code',
        content: [
          'POST /api/forms/{formId}/reactions?orgId={orgId}',
          '',
          'Body:',
          '{',
          '  "name": "Company Lookup",',
          '  "description": "Fetch company data on domain blur",',
          '  "workflowId": "wf_abc123",',
          '  "trigger": {',
          '    "fields": ["companyDomain"],',
          '    "event": "blur",',
          '    "debounceMs": 500',
          '  },',
          '  "execution": {',
          '    "mode": "sync",',
          '    "timeoutMs": 10000',
          '  },',
          '  "feedback": {',
          '    "showLoading": true,',
          '    "loadingText": "Looking up company..."',
          '  }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Get Single Reaction',
      },
      {
        type: 'code',
        content: ['GET /api/forms/{formId}/reactions/{reactionId}?orgId={orgId}'],
      },
      {
        type: 'heading',
        content: 'Update Reaction',
      },
      {
        type: 'code',
        content: [
          'PUT /api/forms/{formId}/reactions/{reactionId}?orgId={orgId}',
          '',
          'Body: (partial update)',
          '{',
          '  "enabled": false,',
          '  "trigger": { "debounceMs": 1000 }',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Delete Reaction',
      },
      {
        type: 'code',
        content: [
          'DELETE /api/forms/{formId}/reactions/{reactionId}?orgId={orgId}',
          '',
          'Response:',
          '{',
          '  "success": true,',
          '  "deletedId": "reaction_abc123"',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Execute Reaction',
      },
      {
        type: 'code',
        content: [
          'POST /api/forms/{formId}/reactions/execute?orgId={orgId}',
          '',
          'Body:',
          '{',
          '  "reactionId": "reaction_abc123",',
          '  "triggerField": "companyDomain",',
          '  "triggerEvent": "blur",',
          '  "fieldValue": "mongodb.com",',
          '  "formData": {',
          '    "companyDomain": "mongodb.com",',
          '    "companyName": ""',
          '  }',
          '}',
          '',
          'Response:',
          '{',
          '  "success": true,',
          '  "status": "completed",',
          '  "updates": {',
          '    "companyName": "MongoDB, Inc.",',
          '    "industry": "Technology"',
          '  },',
          '  "durationMs": 850',
          '}',
        ],
      },
      {
        type: 'tip',
        content:
          'The execute endpoint is typically called by the useFormReactions hook, not directly. Use it for testing or custom integrations.',
      },
    ],
    relatedTopics: ['form-reactions', 'api-overview', 'api-authentication'],
    keywords: ['api', 'reactions', 'endpoint', 'rest', 'execute', 'crud'],
  },

  'use-form-reactions-hook': {
    id: 'use-form-reactions-hook',
    title: 'useFormReactions Hook',
    description:
      'React hook for integrating form reactions into custom form implementations.',
    content: [
      {
        type: 'heading',
        content: 'Overview',
      },
      {
        type: 'text',
        content:
          'The useFormReactions hook provides a React interface for triggering reactions, managing state, and receiving field updates. Use it when building custom form implementations or integrating reactions with existing forms.',
      },
      {
        type: 'heading',
        content: 'Basic Usage',
      },
      {
        type: 'code',
        content: [
          "import { useFormReactions } from '@/hooks/useFormReactions';",
          '',
          'function MyForm({ formId, orgId, reactions }) {',
          '  const {',
          '    triggerReaction,',
          '    cancelReaction,',
          '    reactionStates,',
          '    pendingFields,',
          '    recentlyUpdatedFields,',
          '  } = useFormReactions({',
          '    formId,',
          '    orgId,',
          '    reactions,',
          '    onFieldUpdate: (fieldPath, value) => {',
          "      // Update your form state with the new value",
          '      setFormData(prev => ({ ...prev, [fieldPath]: value }));',
          '    },',
          '    onReactionError: (reactionId, error) => {',
          "      console.error('Reaction failed:', error);",
          '    },',
          '  });',
          '',
          '  // Trigger a reaction manually',
          '  const handleBlur = (fieldName, value) => {',
          '    triggerReaction(reactionId, {',
          '      triggerField: fieldName,',
          "      triggerEvent: 'blur',",
          '      fieldValue: value,',
          '      formData: currentFormData,',
          '    });',
          '  };',
          '}',
        ],
      },
      {
        type: 'heading',
        content: 'Hook Options',
      },
      {
        type: 'list',
        content: [
          'formId: ID of the form',
          'orgId: Organization ID',
          'reactions: Array of FormReaction objects',
          'onFieldUpdate: Callback when a field should be updated (fieldPath, value)',
          'onReactionStart: Called when a reaction starts executing',
          'onReactionComplete: Called when a reaction completes successfully',
          'onReactionError: Called when a reaction fails',
        ],
      },
      {
        type: 'heading',
        content: 'Return Values',
      },
      {
        type: 'list',
        content: [
          'triggerReaction(reactionId, context): Manually trigger a reaction with debounce support',
          'cancelReaction(reactionId): Cancel a pending reaction (uses AbortController)',
          'hasReaction(fieldPath): Check if a field has any associated reactions',
          'getFieldReactions(fieldPath): Get all reactions for a specific field',
          'reactionStates: Map of reaction states (pending, loading, success, error)',
          'pendingFields: Set of field paths with pending reactions',
          'recentlyUpdatedFields: Set of fields recently updated by reactions',
        ],
      },
      {
        type: 'heading',
        content: 'Reaction States',
      },
      {
        type: 'code',
        content: [
          '// Check if a specific reaction is loading',
          "if (reactionStates[reactionId]?.status === 'loading') {",
          '  // Show loading indicator',
          '}',
          '',
          '// Check if a reaction had an error',
          "if (reactionStates[reactionId]?.status === 'error') {",
          '  const errorMessage = reactionStates[reactionId].error;',
          '}',
        ],
      },
      {
        type: 'tip',
        content:
          'The hook handles debouncing internally based on reaction configuration. Multiple rapid calls to triggerReaction will be debounced.',
      },
      {
        type: 'warning',
        content:
          'Phase 1 supports manual triggering only. Automatic field event attachment will be available in Phase 3.',
      },
    ],
    relatedTopics: ['form-reactions', 'node-field-event-trigger', 'node-form-field-update'],
    keywords: ['hook', 'react', 'useFormReactions', 'trigger', 'state', 'callback'],
  },

  // ============================================
  // RBAC / Access Control
  // ============================================

  'rbac-overview': {
    id: 'rbac-overview',
    title: 'Access Control Overview',
    description:
      'Role-Based Access Control (RBAC) for managing organization users, groups, and permissions.',
    content: [
      {
        type: 'heading',
        content: 'What is RBAC?',
      },
      {
        type: 'text',
        content:
          'NetPad uses Role-Based Access Control (RBAC) to manage who can access what in your organization. Users are assigned roles, either directly or through groups, and roles determine what permissions they have.',
      },
      {
        type: 'heading',
        content: 'Key Concepts',
      },
      {
        type: 'list',
        content: [
          'Users: Organization members with assigned roles',
          'Groups: Teams of users for easier permission management',
          'Roles: Built-in or custom sets of permissions',
          'Permissions: Granular actions users can perform',
        ],
      },
      {
        type: 'heading',
        content: 'Built-in Roles',
      },
      {
        type: 'list',
        content: [
          'Owner: Full control over the organization',
          'Admin: Manage members, settings, and resources',
          'Member: Create and manage own forms/workflows',
          'Viewer: Read-only access to resources',
        ],
      },
      {
        type: 'tip',
        content:
          'Use groups to manage permissions for teams. Instead of assigning roles to individuals, add them to groups like "Engineering" or "Marketing".',
      },
    ],
    relatedTopics: ['rbac-users', 'rbac-groups', 'rbac-roles', 'rbac-permissions'],
    keywords: ['rbac', 'access control', 'permissions', 'roles', 'security'],
  },

  'rbac-users': {
    id: 'rbac-users',
    title: 'Managing Users',
    description: 'Invite, manage, and remove organization members.',
    content: [
      {
        type: 'heading',
        content: 'Inviting Users',
      },
      {
        type: 'text',
        content:
          'Invite new members from Organization Settings → Members. Enter their email and select a role. They will receive an invitation email to join.',
      },
      {
        type: 'heading',
        content: 'User Roles',
      },
      {
        type: 'list',
        content: [
          'Admin: Full management access (cannot delete org)',
          'Member: Create and manage own resources',
          'Viewer: Read-only access',
        ],
      },
      {
        type: 'heading',
        content: 'CLI Commands',
      },
      {
        type: 'code',
        content: [
          '# List members',
          'netpad users list -o <orgId>',
          '',
          '# Invite user',
          'netpad users add jane@example.com --role member',
          '',
          '# Change role',
          'netpad users update jane@example.com --role admin',
          '',
          '# Remove user',
          'netpad users remove jane@example.com',
        ],
      },
      {
        type: 'warning',
        content:
          'You cannot demote the last owner. Transfer ownership before changing your role.',
      },
    ],
    relatedTopics: ['rbac-overview', 'rbac-groups', 'rbac-roles'],
    keywords: ['users', 'members', 'invite', 'remove', 'role'],
  },

  'rbac-groups': {
    id: 'rbac-groups',
    title: 'Managing Groups',
    description: 'Create teams and manage group membership for easier permission management.',
    content: [
      {
        type: 'heading',
        content: 'Why Use Groups?',
      },
      {
        type: 'text',
        content:
          'Groups let you organize users into teams. Instead of assigning permissions to individuals, assign them to groups. When team composition changes, just update group membership.',
      },
      {
        type: 'heading',
        content: 'Group Features',
      },
      {
        type: 'list',
        content: [
          'Default Role: All group members inherit this role',
          'Member Management: Add/remove users easily',
          'Bulk Permissions: Assign roles to entire teams',
        ],
      },
      {
        type: 'heading',
        content: 'CLI Commands',
      },
      {
        type: 'code',
        content: [
          '# List groups',
          'netpad groups list -o <orgId>',
          '',
          '# Create group with default role',
          'netpad groups create "Engineering" --role member',
          '',
          '# Add member to group',
          'netpad groups add-member engineering jane@example.com',
          '',
          '# Remove member from group',
          'netpad groups remove-member engineering jane@example.com',
        ],
      },
      {
        type: 'tip',
        content:
          'Create groups that match your team structure: Engineering, Marketing, Contractors, etc.',
      },
    ],
    relatedTopics: ['rbac-overview', 'rbac-users', 'rbac-roles'],
    keywords: ['groups', 'teams', 'membership', 'organize'],
  },

  'rbac-roles': {
    id: 'rbac-roles',
    title: 'Managing Roles',
    description: 'View built-in roles and create custom roles with specific permissions.',
    content: [
      {
        type: 'heading',
        content: 'Built-in Roles',
      },
      {
        type: 'text',
        content:
          'NetPad provides four built-in roles that cannot be modified: Owner, Admin, Member, and Viewer. Each has a predefined set of permissions.',
      },
      {
        type: 'heading',
        content: 'Custom Roles',
      },
      {
        type: 'text',
        content:
          'Create custom roles for specific needs. Custom roles can inherit from built-in roles and add or remove permissions.',
      },
      {
        type: 'heading',
        content: 'CLI Commands',
      },
      {
        type: 'code',
        content: [
          '# List all roles',
          'netpad roles list -o <orgId>',
          '',
          '# Create custom role (inheriting from viewer)',
          'netpad roles create "Form Reviewer" --base viewer',
          '',
          '# Grant permission to role',
          'netpad roles grant form-reviewer responses:export',
          '',
          '# Revoke permission from role',
          'netpad roles revoke form-reviewer responses:delete',
        ],
      },
      {
        type: 'example',
        content:
          'Common custom roles: "Billing Admin" (org:manage_billing), "Content Editor" (forms:update, forms:publish), "Data Analyst" (responses:read, responses:export)',
      },
    ],
    relatedTopics: ['rbac-overview', 'rbac-permissions', 'rbac-groups'],
    keywords: ['roles', 'custom roles', 'built-in roles', 'permissions'],
  },

  'rbac-permissions': {
    id: 'rbac-permissions',
    title: 'Permissions Reference',
    description: 'Complete list of available permissions and what they control.',
    content: [
      {
        type: 'heading',
        content: 'Permission Format',
      },
      {
        type: 'text',
        content:
          'Permissions follow the format category:action (e.g., forms:create, members:invite).',
      },
      {
        type: 'heading',
        content: 'Organization Permissions',
      },
      {
        type: 'list',
        content: [
          'org:read - View organization details',
          'org:update - Update organization settings',
          'org:delete - Delete the organization',
          'org:manage_billing - Manage billing and subscription',
          'org:manage_settings - Configure organization settings',
        ],
      },
      {
        type: 'heading',
        content: 'Member Permissions',
      },
      {
        type: 'list',
        content: [
          'members:read - View organization members',
          'members:invite - Invite new members',
          'members:remove - Remove members',
          'members:update_role - Change member roles',
        ],
      },
      {
        type: 'heading',
        content: 'Form Permissions',
      },
      {
        type: 'list',
        content: [
          'forms:read - View forms',
          'forms:create - Create new forms',
          'forms:update - Edit forms',
          'forms:delete - Delete forms',
          'forms:publish - Publish/unpublish forms',
          'forms:manage_permissions - Manage form access',
        ],
      },
      {
        type: 'heading',
        content: 'Response Permissions',
      },
      {
        type: 'list',
        content: [
          'responses:read - View form submissions',
          'responses:export - Export submissions',
          'responses:delete - Delete submissions',
        ],
      },
      {
        type: 'heading',
        content: 'CLI Commands',
      },
      {
        type: 'code',
        content: [
          '# List all permissions',
          'netpad permissions list',
          '',
          '# Check if you have a permission',
          'netpad permissions check forms:create -o <orgId>',
          '',
          '# View your effective permissions',
          'netpad permissions me -o <orgId>',
        ],
      },
    ],
    relatedTopics: ['rbac-overview', 'rbac-roles'],
    keywords: ['permissions', 'access', 'capabilities', 'authorization'],
  },
};
