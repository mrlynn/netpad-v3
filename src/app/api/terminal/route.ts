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
  'export form <id> [--format json|yaml] - Export form definition',
  'export data <form-id> [--format csv|json] - Export submission data',
  'describe form <id> - Get AI description of a form',
  'explain <topic> - Get help on a topic',
  'stats [--form <id>] - Show statistics',
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
 * Handle natural language input using AI
 */
async function handleNaturalLanguage(
  input: string,
  context: TerminalRequest['context'],
  user: { id: string; email?: string; orgId: string }
): Promise<NextResponse<CommandResult>> {
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
      return NextResponse.json({
        success: false,
        output: '',
        error: aiResponse.error || 'Failed to interpret command',
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

    // Show interpretation to user
    const interpretationMessage = interpretation.confidence < 0.8
      ? `\x1b[33mInterpreting:\x1b[0m ${interpretation.explanation}\n\n`
      : '';

    // Execute the interpreted command
    const result = await executeCommand(
      interpretation.command,
      interpretation.args,
      {},
      context,
      user
    );

    return NextResponse.json({
      ...result,
      output: interpretationMessage + result.output,
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
 */
async function handleStructuredCommand(
  parsed: TerminalRequest['parsed'],
  context: TerminalRequest['context'],
  user: { id: string; email?: string; orgId: string }
): Promise<NextResponse<CommandResult>> {
  return NextResponse.json(
    await executeCommand(
      parsed.command!,
      parsed.args || [],
      parsed.options || {},
      context,
      user
    )
  );
}

/**
 * Execute a command and return result
 */
async function executeCommand(
  command: string,
  args: string[],
  options: Record<string, string | boolean>,
  context: TerminalRequest['context'],
  user: { id: string; email?: string; orgId: string }
): Promise<CommandResult> {
  // Use the organization's database
  const db = await getOrgDb(user.orgId);

  switch (command.toLowerCase()) {
    case 'list': {
      const type = args[0]?.toLowerCase();
      return await handleList(type, options, user, db);
    }

    case 'show': {
      const type = args[0]?.toLowerCase();
      const id = args[1];
      return await handleShow(type, id, user, db);
    }

    case 'create': {
      const type = args[0]?.toLowerCase();
      const name = args.slice(1).join(' ');
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

    default:
      return {
        success: false,
        output: '',
        error: `Unknown command: ${command}`,
        suggestions: ['help - Show available commands'],
      };
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
      error: 'Please specify a name',
      suggestions: [`create ${type} "My ${type}"`],
    };
  }

  // Clean up name (remove quotes)
  const cleanName = name.replace(/^["']|["']$/g, '');

  // Note: For forms, you should typically use the Form Builder UI
  // This is a simplified create for quick drafts
  return {
    success: false,
    output: '',
    error: `Creating ${type}s via terminal is not yet supported. Please use the UI.`,
    suggestions: [
      type === 'form' ? 'Visit /forms/new to create a form' : undefined,
      type === 'workflow' ? 'Visit /workflows/new to create a workflow' : undefined,
      'list forms - See your existing forms',
    ].filter(Boolean) as string[],
  };
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
