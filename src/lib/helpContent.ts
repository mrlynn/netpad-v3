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
    relatedTopics: ['field-configuration', 'form-library', 'multi-page-forms'],
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
    relatedTopics: ['workflow-variables'],
    keywords: ['nodes', 'triggers', 'logic', 'data', 'integrations', 'workflow'],
  },

  // ============================================
  // Employee Onboarding Portal
  // ============================================

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
};
