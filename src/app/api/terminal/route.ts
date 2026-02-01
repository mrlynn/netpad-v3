/**
 * Terminal API Route
 * 
 * Handles CLI commands from the web terminal, including AI interpretation
 * of natural language commands.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { aiService } from '@/lib/ai/aiService';
import { getOrgDb, getOrgFormsCollection } from '@/lib/platform/db';
import { getUserOrganizations } from '@/lib/platform/organizations';
import { validateAPIKey } from '@/lib/api/keys';
import { generateInterpretationPrompt, parseAIInterpretation } from '@/components/WebTerminal/commandInterpreter';
import { AIServiceContext } from '@/types/ai-analytics';
import { WithId, Document, ObjectId, Db } from 'mongodb';

/**
 * Authenticate request via session or API key
 */
async function authenticateRequest(request: NextRequest): Promise<{ userId: string; orgId?: string } | null> {
  // First try session auth
  const session = await getSession();
  if (session?.userId) {
    return { userId: session.userId };
  }

  // Try API key auth via Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7);
    const validKey = await validateAPIKey(apiKey);
    if (validKey) {
      return { 
        userId: validKey.createdBy, 
        orgId: validKey.organizationId 
      };
    }
  }

  return null;
}

export const dynamic = 'force-dynamic';

// Helper to create AI context
function createAIContext(userId: string, orgId: string = 'terminal'): AIServiceContext {
  return {
    userId,
    orgId,
    isGuest: false,
    feature: 'ai_command_palette',
    endpoint: '/api/terminal',
  };
}

interface TerminalRequest {
  input: string;
  parsed: {
    type: 'structured' | 'natural' | 'help' | 'clear';
    command?: string;
    args?: string[];
    options?: Record<string, string | boolean>;
    raw: string;
    naturalLanguage?: string;
  };
  context: {
    project?: string;
    org?: string;
    history?: string[];
  };
}

interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  data?: unknown;
  suggestions?: string[];
}

// Available commands for AI interpretation
const AVAILABLE_COMMANDS = [
  'create form <name> - Create a new form',
  'create form "<description>" --ai - AI-generate a form from natural language description',
  'create workflow <name> - Create a new workflow',
  'create template <name> - Create a new template',
  'list forms - List all forms',
  'list workflows - List all workflows',
  'list templates - List all templates',
  'list submissions [--form <id>] - List form submissions',
  'show form <id> - Show form details',
  'show workflow <id> - Show workflow details',
  'search <query> - Search forms and templates',
  'deploy form <id> [--env production|preview] - Deploy a form',
  'export submissions [--form <id>] [--format csv|json] - Export submission data',
  'export form <id> [--format json|yaml] - Export form definition',
  'describe form <id> - Get AI description of a form',
  'explain <topic> - Get help on a topic',
  'stats [--form <id>] - Show statistics',
  'query submissions <filter> [--form <id>] [--limit N] - Query submissions with MongoDB filter',
  'query submissions where <field> <op> <value> - Natural language query (e.g., where rating < 3)',
  'scaffold react <form-id> [--output path] - Generate React component using @netpad/forms',
  'scaffold nextjs <form-id> [--output path] - Generate Next.js page with form and API route',
  'watch submissions [--form <id>] - Watch for new submissions in real-time',
  'watch form <id> - Watch for changes to a form',
];

export async function POST(request: NextRequest) {
  try {
    // Check authentication (session or API key)
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, output: '', error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId } = auth;
    const body: TerminalRequest = await request.json();
    const { input, parsed, context } = body;

    // Get user's organization - either from API key, context, or fetch their first org
    let orgId = auth.orgId || context.org;
    if (!orgId) {
      const userOrgs = await getUserOrganizations(userId);
      if (userOrgs.length > 0) {
        orgId = userOrgs[0].orgId;
      }
    }

    if (!orgId) {
      return NextResponse.json({
        success: false,
        output: '',
        error: 'No organization found. Please create or join an organization first.',
        suggestions: ['Visit /onboarding to set up your organization'],
      });
    }

    const user = { id: userId, email: '', orgId }; // Email not available from API key auth

    // Route based on command type
    if (parsed.type === 'natural') {
      return handleNaturalLanguage(input, context, user);
    }

    if (parsed.type === 'structured' && parsed.command) {
      return handleStructuredCommand(parsed, context, user);
    }

    return NextResponse.json({
      success: false,
      output: '',
      error: 'Invalid command format',
      suggestions: ['Try "help" to see available commands'],
    });
  } catch (error) {
    console.error('Terminal API error:', error);
    return NextResponse.json({
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * Check if AI is available (has an API key configured)
 */
function isAIAvailable(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OLLAMA_BASE_URL ||
    process.env.OPENROUTER_API_KEY
  );
}

/**
 * Handle natural language input using AI
 */
async function handleNaturalLanguage(
  input: string,
  context: TerminalRequest['context'],
  user: { id: string; email?: string; orgId: string }
): Promise<NextResponse<CommandResult>> {
  // Check if AI is available first
  if (!isAIAvailable()) {
    return NextResponse.json({
      success: false,
      output: '',
      error: `Command not recognized: "${input}"\n\n` +
        `\x1b[33mAI interpretation unavailable.\x1b[0m\n` +
        `Use \x1b[36mhelp\x1b[0m to see available commands.`,
      suggestions: [
        'help - Show all commands',
        'list forms - List your forms',
        'ls - Browse the file system',
      ],
    });
  }

  try {
    // Generate interpretation prompt
    const prompt = generateInterpretationPrompt(input, {
      availableCommands: AVAILABLE_COMMANDS,
      currentProject: context.project,
      recentHistory: context.history,
    });

    // Get AI interpretation
    const aiContext = createAIContext(user.id);
    const aiResponse = await aiService.complete(
      aiContext,
      [{ role: 'user', content: prompt }],
      { maxTokens: 500, temperature: 0.3 }
    );

    if (!aiResponse.success || !aiResponse.data) {
      // AI call failed - gracefully degrade
      const errorMsg = aiResponse.error || 'Failed to interpret command';
      const isConfigError = errorMsg.includes('not configured') || errorMsg.includes('API key');
      
      return NextResponse.json({
        success: false,
        output: '',
        error: isConfigError
          ? `Command not recognized: "${input}"\n\n\x1b[33mAI is not configured on this server.\x1b[0m\nUse \x1b[36mhelp\x1b[0m to see available commands.`
          : `Could not interpret command. ${errorMsg}`,
        suggestions: [
          'help - Show all commands',
          'list forms - List your forms',
        ],
      });
    }

    const interpretation = parseAIInterpretation(aiResponse.data);

    if (!interpretation || interpretation.command === 'unknown') {
      return NextResponse.json({
        success: false,
        output: '',
        error: "I couldn't understand that command. Try rephrasing or use 'help' to see available commands.",
        suggestions: [
          'help - Show all commands',
          'list forms - Show your forms',
          'create form "Name" - Create a new form',
        ],
      });
    }

    // Build interpretation message
    let interpretationMessage = '';
    
    // Show "Did you mean" for typo corrections
    if (interpretation.didYouMean) {
      interpretationMessage = `\x1b[33m💡 Did you mean:\x1b[0m ${interpretation.didYouMean}\n\n`;
    } else if (interpretation.confidence < 0.8) {
      interpretationMessage = `\x1b[33m🤔 Interpreting:\x1b[0m ${interpretation.explanation}\n\n`;
    }

    // Execute the interpreted command
    const result = await executeCommand(
      interpretation.command,
      interpretation.args,
      {},
      context,
      user
    );

    if (!result) {
      return NextResponse.json({
        success: false,
        output: '',
        error: 'Command execution failed',
      });
    }

    return NextResponse.json({
      success: result.success ?? true,
      output: interpretationMessage + result.output,
      error: result.error,
      data: result.data,
      suggestions: result.suggestions,
    });
  } catch (error) {
    console.error('AI interpretation error:', error);
    return NextResponse.json({
      success: false,
      output: '',
      error: 'Failed to interpret command. Try using a structured command like "list forms".',
    });
  }
}

/**
 * Handle structured command
 * Falls back to AI interpretation if command is unknown or has invalid args
 */
async function handleStructuredCommand(
  parsed: TerminalRequest['parsed'],
  context: TerminalRequest['context'],
  user: { id: string; email?: string; orgId: string }
): Promise<NextResponse<CommandResult>> {
  const result = await executeCommand(
    parsed.command!,
    parsed.args || [],
    parsed.options || {},
    context,
    user
  );
  
  // If result is null, fall back to AI interpretation
  if (result === null) {
    // Reconstruct the original input for AI
    const originalInput = parsed.raw || `${parsed.command} ${(parsed.args || []).join(' ')}`.trim();
    return handleNaturalLanguage(originalInput, context, user);
  }
  
  return NextResponse.json(result);
}

/**
 * Execute a command and return result
 * If the command is unknown or has invalid args, returns null to trigger AI fallback
 */
async function executeCommand(
  command: string,
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalRequest['context'],
  user: { id: string; email?: string; orgId: string }
): Promise<CommandResult | null> {
  // Use the organization's database
  const db = await getOrgDb(user.orgId);

  switch (command.toLowerCase()) {
    case 'list': {
      const type = args[0]?.toLowerCase();
      // Validate type - if invalid, return null to trigger AI
      if (type && !['forms', 'workflows', 'templates', 'submissions'].includes(type)) {
        return null; // Let AI handle it
      }
      return await handleList(type, options, user, db);
    }

    case 'show': {
      const type = args[0]?.toLowerCase();
      const id = args[1];
      // Validate type - if invalid, return null to trigger AI
      if (type && !['form', 'workflow', 'template'].includes(type)) {
        return null; // Let AI handle it
      }
      return await handleShow(type, id, user, db);
    }

    case 'create': {
      const type = args[0]?.toLowerCase();
      const name = args.slice(1).join(' ');
      // Validate type - if invalid, return null to trigger AI
      if (type && !['form', 'workflow', 'template'].includes(type)) {
        return null; // Let AI handle it
      }
      return await handleCreate(type, name, options, user, db);
    }

    case 'search': {
      const query = args.join(' ');
      return await handleSearch(query, options, user, db);
    }

    case 'stats': {
      return await handleStats(options, user, db);
    }

    case 'describe':
    case 'explain': {
      const topic = args.join(' ');
      return await handleExplain(topic);
    }

    case 'query': {
      const type = args[0]?.toLowerCase();
      if (type !== 'submissions') {
        return null; // Let AI handle unknown query types
      }
      const filterArgs = args.slice(1);
      return await handleQuery(filterArgs, options, user, db);
    }

    case 'scaffold': {
      const framework = args[0]?.toLowerCase();
      const formId = args[1];
      if (!['react', 'nextjs', 'next'].includes(framework)) {
        return null; // Let AI handle unknown frameworks
      }
      return await handleScaffold(framework === 'next' ? 'nextjs' : framework, formId, options, user, db);
    }

    case 'watch': {
      const type = args[0]?.toLowerCase();
      if (!['submissions', 'form', 'forms'].includes(type)) {
        return null;
      }
      return await handleWatch(type, args.slice(1), options, user, db);
    }

    case 'export': {
      const type = args[0]?.toLowerCase();
      if (!['submissions', 'form', 'forms', 'data'].includes(type)) {
        return null;
      }
      return await handleExport(type, args.slice(1), options, user, db);
    }

    default:
      // Unknown command - return null to trigger AI fallback
      return null;
  }
}

/**
 * List command handler
 */
async function handleList(
  type: string,
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  try {
    switch (type) {
      case 'forms': {
        // Forms are scoped to the org database, no userId filter needed
        const forms = await db.collection('forms')
          .find({})
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(20)
          .toArray();

        if (forms.length === 0) {
          return {
            success: true,
            output: '\x1b[33mNo forms found.\x1b[0m Create one with: create form "My Form"',
          };
        }

        const output = [
          '\x1b[1m\x1b[36mForms\x1b[0m',
          '',
          '\x1b[90m' + 'ID'.padEnd(26) + 'Name'.padEnd(32) + 'Fields' + '\x1b[0m',
          '\x1b[90m' + '─'.repeat(70) + '\x1b[0m',
          ...forms.map((f) => {
            const doc = f as WithId<Document> & { formId?: string; name?: string; fieldConfigs?: unknown[] };
            const id = doc.formId || String(doc._id);
            const fieldCount = doc.fieldConfigs?.length || 0;
            return `${id.slice(0, 24).padEnd(26)}${(doc.name || 'Untitled').slice(0, 30).padEnd(32)}${fieldCount}`;
          }),
          '',
          `\x1b[90mShowing ${forms.length} form(s)\x1b[0m`,
        ];

        return { success: true, output: output.join('\n'), data: forms };
      }

      case 'workflows': {
        const workflows = await db.collection('workflows')
          .find({})
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(20)
          .toArray();

        if (workflows.length === 0) {
          return {
            success: true,
            output: '\x1b[33mNo workflows found.\x1b[0m Create one with: create workflow "My Workflow"',
          };
        }

        const workflowLines = workflows.map((w) => {
          const doc = w as WithId<Document> & { name?: string; status?: string };
          return `  \x1b[32m${doc.name || 'Untitled'}\x1b[0m (${doc.status || 'draft'})`;
        });

        const output = [
          '\x1b[1m\x1b[36mWorkflows\x1b[0m',
          '',
          ...workflowLines,
        ];

        return { success: true, output: output.join('\n'), data: workflows };
      }

      case 'templates': {
        // Templates are org-scoped
        const templates = await db.collection('templates')
          .find({})
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(20)
          .toArray();

        if (templates.length === 0) {
          return {
            success: true,
            output: '\x1b[33mNo templates found.\x1b[0m',
          };
        }

        const templateLines = templates.map((t) => {
          const doc = t as WithId<Document> & { name?: string; description?: string };
          return `  \x1b[32m${doc.name || 'Untitled'}\x1b[0m - ${doc.description?.slice(0, 50) || 'No description'}`;
        });

        const output = [
          '\x1b[1m\x1b[36mTemplates\x1b[0m',
          '',
          ...templateLines,
        ];

        return { success: true, output: output.join('\n'), data: templates };
      }

      default:
        return {
          success: false,
          output: '',
          error: `Unknown type: ${type}`,
          suggestions: ['list forms', 'list workflows', 'list templates'],
        };
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to list ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Show command handler
 */
async function handleShow(
  type: string,
  id: string,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  if (!id) {
    return {
      success: false,
      output: '',
      error: 'Please specify an ID',
      suggestions: [`show ${type} <id>`],
    };
  }

  try {
    const collection = type === 'form' ? 'forms' : type === 'workflow' ? 'workflows' : 'templates';
    
    // Try to find by ID (formId for forms, _id for others) or name
    let item = null;
    
    // For forms, try formId first
    if (type === 'form') {
      item = await db.collection(collection).findOne({ formId: id });
    }
    
    // Try by ObjectId if valid
    if (!item && ObjectId.isValid(id)) {
      item = await db.collection(collection).findOne({ _id: new ObjectId(id) });
    }
    
    // Try by name
    if (!item) {
      item = await db.collection(collection).findOne({
        name: { $regex: id, $options: 'i' },
      });
    }
    
    if (!item) {
      return {
        success: false,
        output: '',
        error: `${type} not found: ${id}`,
      };
    }
    
    const typedItem = item as WithId<Document> & { 
      formId?: string;
      name?: string; 
      createdAt?: Date; 
      updatedAt?: Date; 
      fieldConfigs?: { label?: string; type?: string }[];
      description?: string;
    };

    const output = [
      `\x1b[1m\x1b[36m${typedItem.name || 'Untitled'}\x1b[0m`,
      '',
      `\x1b[90mID:\x1b[0m ${typedItem.formId || typedItem._id}`,
      `\x1b[90mCreated:\x1b[0m ${typedItem.createdAt ? new Date(typedItem.createdAt).toLocaleDateString() : 'Unknown'}`,
      `\x1b[90mUpdated:\x1b[0m ${typedItem.updatedAt ? new Date(typedItem.updatedAt).toLocaleDateString() : 'Unknown'}`,
    ];

    if (typedItem.description) {
      output.push(`\x1b[90mDescription:\x1b[0m ${typedItem.description}`);
    }

    if (type === 'form' && typedItem.fieldConfigs) {
      output.push('', `\x1b[90mFields:\x1b[0m ${typedItem.fieldConfigs.length}`);
      typedItem.fieldConfigs.slice(0, 5).forEach((f) => {
        output.push(`  • ${f.label || 'Untitled'} (${f.type || 'text'})`);
      });
      if (typedItem.fieldConfigs.length > 5) {
        output.push(`  \x1b[90m... and ${typedItem.fieldConfigs.length - 5} more\x1b[0m`);
      }
    }

    return { success: true, output: output.join('\n'), data: typedItem };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to show ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create command handler
 */
async function handleCreate(
  type: string,
  name: string,
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  if (!name) {
    return {
      success: false,
      output: '',
      error: 'Please specify a name or description',
      suggestions: [
        `create ${type} "My ${type}"`,
        `create form "customer feedback with star rating" --ai`,
      ],
    };
  }

  // Clean up name (remove quotes)
  const cleanName = name.replace(/^["']|["']$/g, '');

  // AI-powered form generation
  if (type === 'form' && options.ai) {
    return await handleAIFormGeneration(cleanName, options, user, db);
  }

  // Regular creation - suggest using UI or AI
  if (type === 'form') {
    return {
      success: false,
      output: '',
      error: 'To create a form, either use the UI or use AI generation.',
      suggestions: [
        `create form "${cleanName}" --ai  (AI-generate from description)`,
        'Visit /forms/new to use the visual builder',
        'list forms - See your existing forms',
      ],
    };
  }

  return {
    success: false,
    output: '',
    error: `Creating ${type}s via terminal is not yet supported. Please use the UI.`,
    suggestions: [
      type === 'workflow' ? 'Visit /workflows/new to create a workflow' : undefined,
      `list ${type}s - See your existing ${type}s`,
    ].filter(Boolean) as string[],
  };
}

/**
 * AI Form Generation handler
 * Takes a natural language description and generates a complete form
 */
async function handleAIFormGeneration(
  description: string,
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  try {
    const aiContext: AIServiceContext = {
      userId: user.id,
      orgId: user.orgId,
      isGuest: false,
      feature: 'ai_form_generator',
      endpoint: '/api/terminal/create',
    };

    const prompt = `You are a form builder assistant. Generate a JSON form configuration based on this description:

"${description}"

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "name": "Form Name",
  "description": "Brief description",
  "fieldConfigs": [
    {
      "path": "fieldName",
      "type": "short_text|long_text|email|number|phone|date|datetime|dropdown|radio|checkboxes|rating|slider|switch|file|signature|address|url",
      "label": "Field Label",
      "required": true|false,
      "placeholder": "Optional placeholder",
      "helpText": "Optional help text",
      "options": ["option1", "option2"] // Only for dropdown, radio, checkboxes
    }
  ]
}

Field type guidelines:
- Use "short_text" for names, titles, brief answers
- Use "long_text" for descriptions, comments, feedback
- Use "email" for email addresses
- Use "number" for quantities, ages, amounts
- Use "rating" for satisfaction scores (1-5 stars)
- Use "slider" for ranges (e.g., 1-10 scale)
- Use "dropdown" for single selection from many options
- Use "radio" for single selection from few options (2-5)
- Use "checkboxes" for multiple selections
- Use "date" for dates, "datetime" for date+time
- Use "switch" for yes/no, true/false toggles
- Use "file" for uploads
- Use "signature" for signatures

Generate appropriate fields based on the description. Be thorough but don't over-engineer.`;

    const response = await aiService.complete(
      aiContext,
      [{ role: 'user', content: prompt }],
      { maxTokens: 2000, temperature: 0.3 }
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        output: '',
        error: response.error || 'AI generation failed. Try again or use the visual builder.',
      };
    }

    // Parse the AI response
    let formConfig;
    try {
      // Clean up response - remove markdown code blocks if present
      let jsonStr = response.data.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      formConfig = JSON.parse(jsonStr);
    } catch (parseError) {
      return {
        success: false,
        output: '',
        error: 'AI returned invalid JSON. Try rephrasing your description.',
        suggestions: [
          'create form "simple contact form with name, email, message" --ai',
          'create form "feedback survey with rating and comments" --ai',
        ],
      };
    }

    // Generate a unique form ID
    const formId = `form_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const slug = (formConfig.name || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);

    // Ensure field configs have required properties
    const fieldConfigs = (formConfig.fieldConfigs || []).map((field: Record<string, unknown>, index: number) => ({
      ...field,
      path: field.path || `field_${index}`,
      id: `field_${Date.now()}_${index}`,
    }));

    // Create the form in the database
    const newForm = {
      formId,
      name: formConfig.name || 'AI Generated Form',
      description: formConfig.description || description,
      slug,
      fieldConfigs,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.id,
      organizationId: user.orgId,
      formType: 'data-entry',
      aiGenerated: true,
      aiPrompt: description,
    };

    await db.collection('forms').insertOne(newForm);

    // Format output
    const output = [
      '\x1b[32m✓\x1b[0m \x1b[1mForm created successfully!\x1b[0m',
      '',
      `\x1b[36mName:\x1b[0m ${newForm.name}`,
      `\x1b[36mID:\x1b[0m ${formId}`,
      `\x1b[36mSlug:\x1b[0m ${slug}`,
      `\x1b[36mFields:\x1b[0m ${fieldConfigs.length}`,
      '',
      '\x1b[90m─'.repeat(50) + '\x1b[0m',
      '',
      '\x1b[1mGenerated Fields:\x1b[0m',
      ...fieldConfigs.map((f: Record<string, unknown>) => 
        `  • ${f.label || f.path} \x1b[90m(${f.type}${f.required ? ', required' : ''})\x1b[0m`
      ),
      '',
      '\x1b[90m─'.repeat(50) + '\x1b[0m',
      '',
      '\x1b[33mNext steps:\x1b[0m',
      `  • Edit in builder: /forms/${formId}/edit`,
      `  • Preview: show form ${formId}`,
      `  • Generate component: scaffold react ${formId}`,
    ];

    return {
      success: true,
      output: output.join('\n'),
      data: { formId, slug, form: newForm },
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Search command handler
 */
async function handleSearch(
  query: string,
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  if (!query) {
    return {
      success: false,
      output: '',
      error: 'Please specify a search query',
      suggestions: ['search feedback', 'search "customer form"'],
    };
  }

  try {
    const searchRegex = { $regex: query, $options: 'i' };
    
    // Search within org-scoped collections
    const [forms, workflows, templates] = await Promise.all([
      db.collection('forms').find({
        $or: [{ name: searchRegex }, { description: searchRegex }],
      }).limit(5).toArray(),
      db.collection('workflows').find({
        $or: [{ name: searchRegex }, { description: searchRegex }],
      }).limit(5).toArray(),
      db.collection('templates').find({
        $or: [{ name: searchRegex }, { description: searchRegex }],
      }).limit(5).toArray(),
    ]);

    const total = forms.length + workflows.length + templates.length;

    if (total === 0) {
      return {
        success: true,
        output: `\x1b[33mNo results found for "${query}"\x1b[0m`,
      };
    }

    const output = [
      `\x1b[1mSearch results for "${query}"\x1b[0m`,
      '',
    ];

    if (forms.length > 0) {
      output.push('\x1b[36mForms:\x1b[0m');
      forms.forEach((f) => {
        const doc = f as WithId<Document> & { name?: string };
        output.push(`  • ${doc.name || 'Untitled'}`);
      });
      output.push('');
    }

    if (workflows.length > 0) {
      output.push('\x1b[36mWorkflows:\x1b[0m');
      workflows.forEach((w) => {
        const doc = w as WithId<Document> & { name?: string };
        output.push(`  • ${doc.name || 'Untitled'}`);
      });
      output.push('');
    }

    if (templates.length > 0) {
      output.push('\x1b[36mTemplates:\x1b[0m');
      templates.forEach((t) => {
        const doc = t as WithId<Document> & { name?: string };
        output.push(`  • ${doc.name || 'Untitled'}`);
      });
      output.push('');
    }

    output.push(`\x1b[90mFound ${total} result(s)\x1b[0m`);

    return { success: true, output: output.join('\n') };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Stats command handler
 */
async function handleStats(
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  try {
    // Count items in org-scoped collections
    const [formCount, workflowCount, submissionCount] = await Promise.all([
      db.collection('forms').countDocuments({}),
      db.collection('workflows').countDocuments({}),
      db.collection('form_submissions').countDocuments({}),
    ]);

    const output = [
      '\x1b[1m\x1b[36mOrganization Stats\x1b[0m',
      '',
      `\x1b[32m${formCount}\x1b[0m Forms`,
      `\x1b[32m${workflowCount}\x1b[0m Workflows`,
      `\x1b[32m${submissionCount}\x1b[0m Submissions`,
    ];

    return { success: true, output: output.join('\n') };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Explain command handler - uses AI to explain topics
 */
async function handleExplain(topic: string): Promise<CommandResult> {
  if (!topic) {
    return {
      success: false,
      output: '',
      error: 'Please specify a topic',
      suggestions: ['explain forms', 'explain workflows', 'explain conditional logic'],
    };
  }

  try {
    // Create a minimal context for the explain feature
    const aiContext: AIServiceContext = {
      userId: 'terminal',
      orgId: 'terminal',
      isGuest: false,
      feature: 'ai_command_palette',
      endpoint: '/api/terminal/explain',
    };

    const response = await aiService.complete(
      aiContext,
      [{
        role: 'user',
        content: `You are a helpful NetPad assistant. Explain the following topic in 2-3 concise sentences, focused on how it works in NetPad (a form builder and workflow automation platform): "${topic}"`,
      }],
      { maxTokens: 200, temperature: 0.5 }
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        output: '',
        error: response.error || 'Failed to get explanation',
      };
    }

    return {
      success: true,
      output: [
        `\x1b[1m\x1b[36m${topic}\x1b[0m`,
        '',
        response.data,
      ].join('\n'),
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to explain topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Query command handler - MongoDB queries on submissions
 * Supports:
 *   query submissions --form <id> --filter '{"rating": {"$lt": 3}}'
 *   query submissions where rating < 3 --form feedback
 *   query submissions --form <id> --limit 10
 */
async function handleQuery(
  args: string[],
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  try {
    const formId = options.form as string;
    const limit = Math.min(parseInt(options.limit as string) || 20, 100);
    
    // Build the query filter
    let filter: Record<string, unknown> = {};
    
    // If --form specified, filter by form
    if (formId) {
      filter.formId = formId;
    }
    
    // Check for natural language "where" clause
    const whereIndex = args.findIndex(a => a.toLowerCase() === 'where');
    if (whereIndex !== -1) {
      const whereClause = args.slice(whereIndex + 1);
      if (whereClause.length >= 3) {
        const field = whereClause[0];
        const operator = whereClause[1];
        const value = whereClause.slice(2).join(' ').replace(/['"]/g, '');
        
        // Parse the value (number, boolean, or string)
        let parsedValue: unknown = value;
        if (!isNaN(Number(value))) {
          parsedValue = Number(value);
        } else if (value.toLowerCase() === 'true') {
          parsedValue = true;
        } else if (value.toLowerCase() === 'false') {
          parsedValue = false;
        }
        
        // Map operators to MongoDB
        const opMap: Record<string, string> = {
          '=': '$eq', '==': '$eq', 'eq': '$eq', 'equals': '$eq',
          '!=': '$ne', '<>': '$ne', 'ne': '$ne', 'not': '$ne',
          '<': '$lt', 'lt': '$lt', 'less': '$lt',
          '<=': '$lte', 'lte': '$lte',
          '>': '$gt', 'gt': '$gt', 'greater': '$gt',
          '>=': '$gte', 'gte': '$gte',
          'contains': '$regex', 'like': '$regex',
          'in': '$in',
        };
        
        const mongoOp = opMap[operator.toLowerCase()];
        if (mongoOp) {
          if (mongoOp === '$regex') {
            filter[`data.${field}`] = { $regex: parsedValue, $options: 'i' };
          } else if (mongoOp === '$in') {
            filter[`data.${field}`] = { $in: String(parsedValue).split(',').map(v => v.trim()) };
          } else if (mongoOp === '$eq') {
            filter[`data.${field}`] = parsedValue;
          } else {
            filter[`data.${field}`] = { [mongoOp]: parsedValue };
          }
        }
      }
    }
    
    // Check for JSON filter
    if (options.filter) {
      try {
        const jsonFilter = JSON.parse(options.filter as string);
        filter = { ...filter, ...jsonFilter };
      } catch {
        return {
          success: false,
          output: '',
          error: 'Invalid JSON filter. Use format: --filter \'{"field": "value"}\'',
        };
      }
    }
    
    // Execute the query
    const submissions = await db.collection('form_submissions')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    if (submissions.length === 0) {
      return {
        success: true,
        output: '\x1b[33mNo submissions found matching your query.\x1b[0m',
        data: [],
      };
    }
    
    // Format output
    const output = [
      `\x1b[1m\x1b[36mQuery Results\x1b[0m (${submissions.length} of ${limit} max)`,
      '',
      '\x1b[90m' + 'ID'.padEnd(26) + 'Form'.padEnd(20) + 'Created'.padEnd(22) + 'Data Preview' + '\x1b[0m',
      '\x1b[90m' + '─'.repeat(90) + '\x1b[0m',
      ...submissions.map((s) => {
        const id = String(s._id).slice(0, 24).padEnd(26);
        const form = (s.formId || 'unknown').toString().slice(0, 18).padEnd(20);
        const created = s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 19).replace('T', ' ') : 'N/A';
        const dataPreview = JSON.stringify(s.data || {}).slice(0, 40) + '...';
        return `${id}${form}${created.padEnd(22)}${dataPreview}`;
      }),
      '',
      `\x1b[90mFilter: ${JSON.stringify(filter)}\x1b[0m`,
    ];
    
    // Add JSON output option hint
    if (!options.json) {
      output.push('\x1b[90mTip: Add --json for raw JSON output\x1b[0m');
    }
    
    return {
      success: true,
      output: options.json ? JSON.stringify(submissions, null, 2) : output.join('\n'),
      data: submissions,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Scaffold command handler - generates React/Next.js components
 * Supports:
 *   scaffold react <form-id>
 *   scaffold nextjs <form-id> --output ./src/pages
 */
async function handleScaffold(
  framework: string,
  formId: string,
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  if (!formId) {
    return {
      success: false,
      output: '',
      error: 'Please specify a form ID: scaffold react <form-id>',
      suggestions: ['list forms - to see available forms'],
    };
  }
  
  try {
    // Fetch the form
    const orConditions: any[] = [
      { formId: formId },
      { slug: formId },
    ];

    // Only add ObjectId condition if formId is a valid ObjectId
    if (ObjectId.isValid(formId)) {
      orConditions.push({ _id: new ObjectId(formId) });
    }

    const form = await db.collection('forms').findOne({
      $or: orConditions,
    });
    
    if (!form) {
      return {
        success: false,
        output: '',
        error: `Form not found: ${formId}`,
        suggestions: ['list forms - to see available forms'],
      };
    }
    
    const formName = form.name || 'MyForm';
    const componentName = formName.replace(/[^a-zA-Z0-9]/g, '');
    const fieldConfigs = form.fieldConfigs || [];
    
    let code: string;
    let filename: string;
    
    if (framework === 'react') {
      filename = `${componentName}.tsx`;
      code = generateReactComponent(componentName, formName, form.formId || String(form._id), fieldConfigs);
    } else {
      filename = `${componentName.toLowerCase()}.tsx`;
      code = generateNextJSPage(componentName, formName, form.formId || String(form._id), fieldConfigs);
    }
    
    const output = [
      `\x1b[1m\x1b[36mGenerated ${framework === 'react' ? 'React Component' : 'Next.js Page'}\x1b[0m`,
      `\x1b[90mForm: ${formName} (${form.formId || form._id})\x1b[0m`,
      `\x1b[90mFile: ${filename}\x1b[0m`,
      '',
      '\x1b[90m─'.repeat(60) + '\x1b[0m',
      '',
      code,
      '',
      '\x1b[90m─'.repeat(60) + '\x1b[0m',
      '',
      '\x1b[32m✓\x1b[0m Copy the code above or use --output <path> to save to file',
      '',
      '\x1b[33mNext steps:\x1b[0m',
      '  1. npm install @netpad/forms',
      '  2. Copy this component to your project',
      '  3. Import and use: <' + componentName + ' onSubmit={handleSubmit} />',
    ];
    
    return {
      success: true,
      output: output.join('\n'),
      data: { filename, code, formId: form.formId || String(form._id) },
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Scaffold failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate a React component using @netpad/forms
 */
function generateReactComponent(
  componentName: string,
  formName: string,
  formId: string,
  fieldConfigs: unknown[]
): string {
  // Generate TypeScript interface from fields
  const fields = fieldConfigs as Array<{ path: string; type: string; required?: boolean }>;
  const interfaceFields = fields
    .filter(f => f.path && !f.path.startsWith('_'))
    .map(f => {
      const optional = f.required ? '' : '?';
      let tsType = 'string';
      switch (f.type) {
        case 'number': case 'rating': case 'slider': tsType = 'number'; break;
        case 'checkbox': case 'switch': tsType = 'boolean'; break;
        case 'checkboxes': case 'multi_select': tsType = 'string[]'; break;
        case 'date': case 'datetime': tsType = 'Date | string'; break;
        default: tsType = 'string';
      }
      return `  ${f.path}${optional}: ${tsType};`;
    })
    .join('\n');

  return `'use client';

import { NetPadForm } from '@netpad/forms';

// Generated from: ${formName}
// Form ID: ${formId}

export interface ${componentName}Data {
${interfaceFields}
}

interface ${componentName}Props {
  onSubmit: (data: ${componentName}Data) => void | Promise<void>;
  defaultValues?: Partial<${componentName}Data>;
}

export function ${componentName}({ onSubmit, defaultValues }: ${componentName}Props) {
  return (
    <NetPadForm
      formId="${formId}"
      onSubmit={onSubmit}
      defaultValues={defaultValues}
    />
  );
}

export default ${componentName};`;
}

/**
 * Generate a Next.js page with form and API route
 */
function generateNextJSPage(
  componentName: string,
  formName: string,
  formId: string,
  fieldConfigs: unknown[]
): string {
  const fields = fieldConfigs as Array<{ path: string; type: string; required?: boolean }>;
  const interfaceFields = fields
    .filter(f => f.path && !f.path.startsWith('_'))
    .map(f => {
      const optional = f.required ? '' : '?';
      let tsType = 'string';
      switch (f.type) {
        case 'number': case 'rating': case 'slider': tsType = 'number'; break;
        case 'checkbox': case 'switch': tsType = 'boolean'; break;
        case 'checkboxes': case 'multi_select': tsType = 'string[]'; break;
        default: tsType = 'string';
      }
      return `  ${f.path}${optional}: ${tsType};`;
    })
    .join('\n');

  return `'use client';

import { useState } from 'react';
import { NetPadForm } from '@netpad/forms';

// Generated from: ${formName}
// Form ID: ${formId}

export interface ${componentName}Data {
${interfaceFields}
}

export default function ${componentName}Page() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ${componentName}Data) => {
    try {
      const response = await fetch('/api/submit/${formId}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (submitted) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-green-600">Thank you!</h1>
        <p>Your submission has been received.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">${formName}</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>
      )}
      <NetPadForm
        formId="${formId}"
        onSubmit={handleSubmit}
      />
    </div>
  );
}

/*
// API Route: app/api/submit/${formId}/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const data = await request.json();
  
  // TODO: Save to your database or forward to NetPad API
  // const response = await fetch('https://netpad.io/api/forms/${formId}/submit', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
  //   body: JSON.stringify(data),
  // });
  
  console.log('Form submission:', data);
  return NextResponse.json({ success: true });
}
*/`;
}

/**
 * Watch command handler - Real-time monitoring of submissions or form changes
 * Note: Full streaming requires SSE/WebSocket endpoint. This provides polling info.
 */
async function handleWatch(
  type: string,
  args: string[],
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  const formId = options.form as string || args[0];
  
  if (type === 'submissions') {
    // Get current count and latest submission
    const filter: Record<string, unknown> = {};
    if (formId) filter.formId = formId;
    
    const [count, latest] = await Promise.all([
      db.collection('form_submissions').countDocuments(filter),
      db.collection('form_submissions')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray(),
    ]);
    
    const latestTime = latest[0]?.createdAt 
      ? new Date(latest[0].createdAt).toISOString().replace('T', ' ').slice(0, 19)
      : 'N/A';
    
    const output = [
      '\x1b[1m\x1b[36m👁️  Watch Mode\x1b[0m',
      '',
      `\x1b[90mMonitoring:\x1b[0m ${formId ? `Form ${formId}` : 'All submissions'}`,
      `\x1b[90mCurrent count:\x1b[0m ${count}`,
      `\x1b[90mLatest:\x1b[0m ${latestTime}`,
      '',
      '\x1b[90m─'.repeat(50) + '\x1b[0m',
      '',
      '\x1b[33m⚡ Real-time streaming:\x1b[0m',
      '',
      'For live updates, use one of these methods:',
      '',
      '\x1b[1m1. Web Terminal (recommended):\x1b[0m',
      '   The web terminal at /terminal supports live streaming.',
      '',
      '\x1b[1m2. API Polling:\x1b[0m',
      '   Poll the submissions endpoint:',
      `   \x1b[36mGET /api/forms/${formId || '<form-id>'}/submissions?since=<timestamp>\x1b[0m`,
      '',
      '\x1b[1m3. Webhook:\x1b[0m',
      '   Configure a webhook in Form Settings → Integrations',
      '',
      '\x1b[1m4. MongoDB Change Stream:\x1b[0m',
      '   Connect directly with your MongoDB connection string.',
      '',
      '\x1b[90mTip: Use "query submissions --form <id> --limit 5" to see recent entries\x1b[0m',
    ];
    
    return {
      success: true,
      output: output.join('\n'),
      data: { count, latest: latest[0], formId },
    };
  }
  
  if (type === 'form' || type === 'forms') {
    if (!formId && !args[0]) {
      return {
        success: false,
        output: '',
        error: 'Please specify a form ID to watch',
        suggestions: ['watch form <form-id>', 'list forms'],
      };
    }
    
    const targetFormId = formId || args[0];
    const orConditionsTarget: any[] = [
      { formId: targetFormId },
      { slug: targetFormId },
    ];

    // Only add ObjectId condition if targetFormId is a valid ObjectId
    if (ObjectId.isValid(targetFormId)) {
      orConditionsTarget.push({ _id: new ObjectId(targetFormId) });
    }

    const form = await db.collection('forms').findOne({
      $or: orConditionsTarget,
    });
    
    if (!form) {
      return {
        success: false,
        output: '',
        error: `Form not found: ${targetFormId}`,
      };
    }
    
    const output = [
      '\x1b[1m\x1b[36m👁️  Watching Form\x1b[0m',
      '',
      `\x1b[36mName:\x1b[0m ${form.name}`,
      `\x1b[36mID:\x1b[0m ${form.formId || form._id}`,
      `\x1b[36mStatus:\x1b[0m ${form.status || 'draft'}`,
      `\x1b[36mFields:\x1b[0m ${(form.fieldConfigs || []).length}`,
      `\x1b[36mLast updated:\x1b[0m ${form.updatedAt ? new Date(form.updatedAt).toISOString() : 'N/A'}`,
      '',
      '\x1b[90mForm change monitoring is available via:\x1b[0m',
      '  • MongoDB Change Streams on the forms collection',
      '  • Webhooks configured in Form Settings',
    ];
    
    return {
      success: true,
      output: output.join('\n'),
      data: { form },
    };
  }
  
  return {
    success: false,
    output: '',
    error: 'Unknown watch type',
    suggestions: ['watch submissions --form <id>', 'watch form <id>'],
  };
}

/**
 * Export command handler - Export submissions or form definitions
 */
async function handleExport(
  type: string,
  args: string[],
  options: Record<string, string | boolean>,
  user: { id: string; email?: string; orgId: string },
  db: Db
): Promise<CommandResult> {
  const format = (options.format as string)?.toLowerCase() || 'json';
  const formId = options.form as string || args[0];
  
  if (type === 'submissions' || type === 'data') {
    // Build filter
    const filter: Record<string, unknown> = {};
    if (formId) filter.formId = formId;
    
    const limit = Math.min(parseInt(options.limit as string) || 100, 1000);
    
    const submissions = await db.collection('form_submissions')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    if (submissions.length === 0) {
      return {
        success: true,
        output: '\x1b[33mNo submissions found to export.\x1b[0m',
        data: [],
      };
    }
    
    if (format === 'csv') {
      // Generate CSV
      const allFields = new Set<string>();
      submissions.forEach(s => {
        Object.keys(s.data || {}).forEach(k => allFields.add(k));
      });
      
      const fields = ['_id', 'formId', 'createdAt', ...Array.from(allFields)];
      const header = fields.join(',');
      
      const rows = submissions.map(s => {
        return fields.map(f => {
          let val;
          if (f === '_id') val = String(s._id);
          else if (f === 'formId') val = s.formId || '';
          else if (f === 'createdAt') val = s.createdAt ? new Date(s.createdAt).toISOString() : '';
          else val = s.data?.[f] ?? '';
          
          // Escape CSV values
          const strVal = String(val);
          if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
            return `"${strVal.replace(/"/g, '""')}"`;
          }
          return strVal;
        }).join(',');
      });
      
      const csv = [header, ...rows].join('\n');
      
      return {
        success: true,
        output: csv,
        data: { format: 'csv', count: submissions.length },
      };
    }
    
    // JSON format (default)
    const jsonOutput = JSON.stringify(submissions.map(s => ({
      id: String(s._id),
      formId: s.formId,
      createdAt: s.createdAt,
      data: s.data,
    })), null, 2);
    
    return {
      success: true,
      output: jsonOutput,
      data: { format: 'json', count: submissions.length },
    };
  }
  
  if (type === 'form' || type === 'forms') {
    const targetFormId = formId || args[0];
    
    if (!targetFormId) {
      return {
        success: false,
        output: '',
        error: 'Please specify a form ID',
        suggestions: ['export form <form-id>', 'list forms'],
      };
    }
    
    const orConditionsAnalyze: any[] = [
      { formId: targetFormId },
      { slug: targetFormId },
    ];

    // Only add ObjectId condition if targetFormId is a valid ObjectId
    if (ObjectId.isValid(targetFormId)) {
      orConditionsAnalyze.push({ _id: new ObjectId(targetFormId) });
    }

    const form = await db.collection('forms').findOne({
      $or: orConditionsAnalyze,
    });

    if (!form) {
      return {
        success: false,
        output: '',
        error: `Form not found: ${targetFormId}`,
      };
    }
    
    // Clean form for export (remove internal fields)
    const exportForm = {
      name: form.name,
      description: form.description,
      slug: form.slug,
      fieldConfigs: form.fieldConfigs,
      formType: form.formType,
      multiPageConfig: form.multiPageConfig,
      theme: form.theme,
      conversationalConfig: form.conversationalConfig,
      variables: form.variables,
    };
    
    if (format === 'yaml') {
      // Simple YAML conversion (basic, not full YAML spec)
      const yamlLines: string[] = [];
      const toYaml = (obj: unknown, indent = 0): void => {
        const spaces = '  '.repeat(indent);
        if (Array.isArray(obj)) {
          obj.forEach(item => {
            if (typeof item === 'object' && item !== null) {
              yamlLines.push(`${spaces}-`);
              toYaml(item, indent + 1);
            } else {
              yamlLines.push(`${spaces}- ${JSON.stringify(item)}`);
            }
          });
        } else if (typeof obj === 'object' && obj !== null) {
          Object.entries(obj).forEach(([key, val]) => {
            if (val === undefined || val === null) return;
            if (typeof val === 'object') {
              yamlLines.push(`${spaces}${key}:`);
              toYaml(val, indent + 1);
            } else {
              yamlLines.push(`${spaces}${key}: ${JSON.stringify(val)}`);
            }
          });
        }
      };
      
      toYaml(exportForm);
      return {
        success: true,
        output: yamlLines.join('\n'),
        data: { format: 'yaml', formId: form.formId || String(form._id) },
      };
    }
    
    // JSON format (default)
    return {
      success: true,
      output: JSON.stringify(exportForm, null, 2),
      data: { format: 'json', formId: form.formId || String(form._id) },
    };
  }
  
  return {
    success: false,
    output: '',
    error: 'Unknown export type',
    suggestions: ['export submissions --form <id>', 'export form <id>'],
  };
}
