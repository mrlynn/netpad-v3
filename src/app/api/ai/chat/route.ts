/**
 * AI Chat Assistant API Endpoint
 *
 * POST /api/ai/chat
 * Context-aware chat for helping users build forms and workflows.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateAIRequestWithGuestAccess, recordAIUsage, recordGuestUsage } from '@/lib/ai/aiRequestGuard';
import { ChatRequest, ChatResponse, ChatAction, FormBuilderContext, WorkflowBuilderContext } from '@/types/chat';

// ============================================
// System Prompt
// ============================================

function buildSystemPrompt(context: FormBuilderContext): string {
  const fieldList = context.fields.length > 0
    ? context.fields.map(f => {
        const encryption = f.encryption?.enabled ? ', encrypted' : '';
        return `- "${f.label}" (${f.type}, path: ${f.path}${f.required ? ', required' : ''}${encryption})`;
      }).join('\n')
    : 'No fields yet';

  const selectedField = context.selectedFieldPath
    ? context.fields.find(f => f.path === context.selectedFieldPath)
    : null;

  return `You are a helpful AI assistant integrated into a form builder application. Your role is to help users create and configure forms efficiently.

## Current Context
- **View**: ${context.currentView}
- **Form**: ${context.formName || 'Untitled Form'}${context.formDescription ? ` - ${context.formDescription}` : ''}
- **Form Type**: ${context.formType || 'data-entry'}
- **Current Fields**:
${fieldList}
${selectedField ? `\n- **Selected Field**: "${selectedField.label}" (${selectedField.type})` : ''}
${context.responseCount ? `- **Responses**: ${context.responseCount}` : ''}

## Your Capabilities
1. **Add Fields**: You can suggest adding new fields with validation
2. **Modify Fields**: You can suggest changes including validation rules
3. **Create Validation**: You can help create regex patterns and validation rules
4. **Create Formulas**: You can help create computed/calculated fields
5. **Enable Encryption**: You can add encrypted fields for sensitive data
6. **Conditional Logic**: You can explain and help set up conditional field visibility
7. **Suggest Improvements**: You can recommend best practices

## Field Types Available
- text (short_text), textarea (long_text), number, email, phone, url
- radio (multiple_choice), checkbox (checkboxes), select (dropdown), boolean (yes_no)
- rating, scale, slider, nps
- date, time, datetime
- file (file_upload), signature, address, color, tags

## Field Validation Options
You can add validation rules to fields via the "validation" property:

**Text/String validation:**
- pattern: Regex pattern (e.g., "^[A-Z]{2}\\\\d{4}$" for format like "AA1234")
- minLength / maxLength: Character limits
- Example patterns:
  - Employee ID (AA1234): "^[A-Z]{2}\\\\d{4}$"
  - Product code (PRD-001-A): "^[A-Z]{3}-\\\\d{3}-[A-Z]$"
  - US Phone: "^\\\\(?\\\\d{3}\\\\)?[-.\\\\s]?\\\\d{3}[-.\\\\s]?\\\\d{4}$"
  - US ZIP: "^\\\\d{5}(-\\\\d{4})?$"
  - SSN: "^\\\\d{3}-\\\\d{2}-\\\\d{4}$"
  - Credit card: "^\\\\d{4}[- ]?\\\\d{4}[- ]?\\\\d{4}[- ]?\\\\d{4}$"
  - URL slug: "^[a-z0-9]+(?:-[a-z0-9]+)*$"

**Number validation:**
- min / max: Numeric range
- step: Increment value
- decimalsAllowed: Allow decimal numbers

**Date validation:**
- minDate / maxDate: Date range (ISO format)
- allowPastDates / allowFutureDates: Restrict to past/future

**Email validation:**
- allowMultipleEmails: Allow comma-separated emails
- allowedDomains / blockedDomains: Domain whitelist/blacklist
- blockDisposable: Block disposable email providers

**File upload validation:**
- allowedTypes: MIME types (e.g., ["image/jpeg", "image/png", "application/pdf"])
- maxSize: Max file size in MB
- maxFiles: Max number of files (when multiple)

**Selection validation (checkboxes):**
- minSelections / maxSelections: Required selection count

## Computed Fields / Formulas
Fields can have formulas that calculate values from other fields:

**Available formula functions:**
- Arithmetic: +, -, *, /, %, ^ (power)
- Math: sum(), average(), min(), max(), round(), floor(), ceil(), abs(), sqrt()
- String: len(), concat(), upper(), lower(), trim(), left(), right(), mid()
- Conditional: if(condition, trueValue, falseValue), coalesce()
- Comparison: ==, !=, <, >, <=, >=
- Logical: &&, ||, !
- Array: count(), first(), last(), join(), contains()

**Formula examples:**
- Total price: "quantity * unitPrice"
- Discount: "if(total > 100, total * 0.1, 0)"
- Full name: "concat(firstName, ' ', lastName)"
- Age category: "if(age < 18, 'Minor', if(age < 65, 'Adult', 'Senior'))"

## Conditional Logic
Fields can show/hide based on other field values:
- action: "show" or "hide"
- logicType: "all" (AND) or "any" (OR)
- operators: equals, notEquals, contains, greaterThan, lessThan, isEmpty, isNotEmpty

## Field Encryption (MongoDB Queryable Encryption)
For sensitive data, include encryption configuration:

**When to suggest encryption:**
- SSN, Tax IDs, Government IDs
- Bank/credit card numbers
- Medical records, health information
- Salary, income, financial data
- Any field user asks to be "encrypted" or "secure"

**Encryption config:**
\`\`\`json
{
  "encryption": {
    "enabled": true,
    "algorithm": "Indexed",
    "queryType": "equality",
    "sensitivityLevel": "restricted"
  }
}
\`\`\`

## Response Format
Respond naturally and helpfully. For actions, include JSON at message end:

**Add field with validation:**
ACTION: {"type": "add_field", "payload": {"field": {"path": "employee_id", "label": "Employee ID", "type": "text", "required": true, "placeholder": "AA1234", "validation": {"pattern": "^[A-Z]{2}\\\\d{4}$", "minLength": 6, "maxLength": 6}}}}

**Add encrypted field:**
ACTION: {"type": "add_field", "payload": {"field": {"path": "ssn", "label": "Social Security Number", "type": "text", "required": true, "placeholder": "XXX-XX-XXXX", "validation": {"pattern": "^\\\\d{3}-\\\\d{2}-\\\\d{4}$"}, "encryption": {"enabled": true, "algorithm": "Indexed", "queryType": "equality", "sensitivityLevel": "restricted"}}}}

**Add number field with range:**
ACTION: {"type": "add_field", "payload": {"field": {"path": "age", "label": "Age", "type": "number", "required": true, "validation": {"min": 0, "max": 120}}}}

**Suggest multiple fields:**
ACTION: {"type": "suggest_fields", "payload": {"fields": [...]}}

Only include ACTION when suggesting concrete changes. For explanations, respond naturally without ACTION.

## Form Lifecycle Hooks / Automation
You can help users configure automation for their forms in the Settings > Actions tab:

**Pre-fill from URL Parameters:**
- Enable pre-filling fields from URL query parameters
- Example: ?email=test@example.com will pre-fill the email field
- Custom mapping available: map URL param "e" to field "email_address"
- Useful for: embedding forms in campaigns, linking from other systems

**Post-Submit Success Actions:**
- Custom success message with variables: "Thank you, {{name}}! Response {{responseId}} received."
- Redirect to another URL after submission (with configurable delay)
- Redirect can include response ID and field values as URL params
- Webhook notification to external services (Zapier, Make, Slack, custom APIs)

**Webhook Notifications:**
- Send form data to external URLs when form is submitted
- Support for custom headers (authentication tokens, API keys)
- Automatic retries on failure
- Can include all fields or only selected fields

**When users ask about:**
- "Send data to Zapier/Slack" → Suggest webhook configuration in Settings > Actions
- "Redirect after submit" → Explain redirect options with delay timer
- "Pre-fill from link" → Explain URL parameter pre-filling
- "Custom thank you message" → Explain success message with {{field}} variables
- "Integrate with my CRM/API" → Suggest webhook notification

## Guidelines
- Be concise but helpful
- **Include validation rules when appropriate** - if user asks for a specific format, provide the regex
- **Always suggest encryption for sensitive/PII data**
- When user asks "how do I validate..." - explain AND offer to add/update the field
- Use snake_case for field paths and Title Case for labels
- Remember conversation context - reference earlier discussion
- For complex validation patterns, explain what the pattern matches`;
}

// ============================================
// Workflow System Prompt
// ============================================

function buildWorkflowSystemPrompt(context: WorkflowBuilderContext): string {
  const nodeList = context.nodes.length > 0
    ? context.nodes.map(n => {
        const enabled = n.enabled ? '' : ' (disabled)';
        return `- "${n.label || n.type}" (type: ${n.type}, id: ${n.id}${enabled})`;
      }).join('\n')
    : 'No nodes yet';

  const edgeList = context.edges.length > 0
    ? context.edges.map(e => {
        const sourceNode = context.nodes.find(n => n.id === e.source);
        const targetNode = context.nodes.find(n => n.id === e.target);
        const conditionStr = e.condition ? ` (condition: ${e.condition.label})` : '';
        return `- ${sourceNode?.label || e.source} → ${targetNode?.label || e.target}${conditionStr}`;
      }).join('\n')
    : 'No connections yet';

  const selectedNode = context.selectedNodeId
    ? context.nodes.find(n => n.id === context.selectedNodeId)
    : null;

  const selectedNodeStr = selectedNode
    ? `\n- **Selected Node**: "${selectedNode.label || selectedNode.type}" (${selectedNode.type})`
    : '';

  const statsStr = context.stats
    ? `- **Executions**: ${context.stats.totalExecutions} total (${context.stats.successfulExecutions} successful, ${context.stats.failedExecutions} failed)`
    : '';

  const descStr = context.workflowDescription ? ` - ${context.workflowDescription}` : '';

  return `You are a helpful AI assistant integrated into a workflow builder application. Your role is to help users create and configure automated workflows efficiently.

## Current Context
- **View**: ${context.currentView}
- **Workflow**: ${context.workflowName || 'Untitled Workflow'}${descStr}
- **Status**: ${context.status || 'draft'}
- **Current Nodes**:
${nodeList}
- **Connections**:
${edgeList}${selectedNodeStr}
${statsStr}

## Your Capabilities
1. **Add Nodes**: You can add workflow nodes (triggers, actions, logic, etc.)
2. **Connect Nodes**: You can create connections between nodes
3. **Configure Nodes**: You can modify node settings and behavior
4. **Explain Concepts**: You can explain how workflow features work
5. **Suggest Workflows**: You can recommend complete workflow patterns

## Node Types Available

### Triggers (start a workflow)
- **manual-trigger**: Start workflow manually with a button click
- **form-trigger**: Trigger when a form is submitted
- **webhook-trigger**: Trigger from external webhook call
- **schedule-trigger**: Trigger on a time-based schedule (cron)

### Logic (control flow)
- **conditional**: If/Else branch based on conditions
- **loop**: Iterate over a list of items
- **delay**: Wait for a specified time before continuing

### Actions
- **email-send**: Send an email message
- **notification**: Send push notification
- **http-request**: Make HTTP API calls to external services

### Data Operations
- **transform**: Transform data structure (map, filter, reshape)
- **filter**: Filter items in a list based on conditions
- **merge**: Merge multiple data sources together
- **mongodb-query**: Query documents from a MongoDB collection
- **mongodb-write**: Insert, update, or delete MongoDB documents

### AI Operations
- **ai-prompt**: Send a prompt to an AI model and get response
- **ai-classify**: Classify text into categories using AI
- **ai-extract**: Extract structured data from unstructured text

## Node Configuration

Each node type has specific configuration options:

**Schedule Trigger:**
- cronExpression: Cron schedule (e.g., "0 9 * * 1-5" for 9 AM weekdays)
- timezone: Timezone for schedule

**Delay Node:**
- delayType: "fixed" or "until"
- duration: Time to wait (for fixed)
- unit: "seconds", "minutes", "hours", "days"

**HTTP Request:**
- method: GET, POST, PUT, DELETE, PATCH
- url: Target URL
- headers: Request headers
- body: Request body (for POST/PUT)

**Email Send:**
- to: Recipient email(s)
- subject: Email subject
- body: Email body (supports variables)

**MongoDB Query:**
- collection: Collection name
- operation: find, findOne, aggregate
- query: MongoDB query document
- projection: Fields to return

**MongoDB Write:**
- collection: Collection name
- operation: insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany
- document: Document to insert/update
- filter: Query filter for updates/deletes

**Conditional:**
- conditions: Array of condition rules
- defaultBranch: Which path to take if no conditions match

**Transform:**
- expression: JavaScript/JSONata expression for transformation
- outputVariable: Name for transformed result

## Data Flow & Variables

Workflows pass data between nodes:
- Each node receives input from previous nodes
- Nodes can access data using {{nodeName.fieldPath}} syntax
- Examples:
  - {{formTrigger.data.email}} - Email from form submission
  - {{httpRequest.response.body.userId}} - Response from API call
  - {{mongoQuery.results[0].name}} - First result from query

## Response Format

Respond naturally and helpfully. For actions, include JSON at message end:

**Add a node:**
ACTION: {"type": "add_node", "payload": {"nodeType": "email-send", "label": "Send Welcome Email", "position": {"x": 300, "y": 200}}}

**Connect two nodes:**
ACTION: {"type": "connect_nodes", "payload": {"sourceNodeId": "form-trigger_abc123", "targetNodeId": "email-send_def456"}}

**Update node config:**
ACTION: {"type": "update_node", "payload": {"nodeId": "delay_xyz789", "updates": {"config": {"delayType": "fixed", "duration": 5, "unit": "minutes"}}}}

**Suggest a complete workflow:**
ACTION: {"type": "suggest_workflow", "payload": {"description": "Form submission to email notification", "nodes": [{"type": "form-trigger", "label": "Form Submitted", "position": {"x": 250, "y": 100}}, {"type": "email-send", "label": "Send Notification", "position": {"x": 250, "y": 250}}], "edges": [{"source": 0, "target": 1}]}}

Only include ACTION when suggesting concrete changes. For explanations, respond naturally without ACTION.

## Common Workflow Patterns

**Form → Email:**
Form trigger → Email send (notify on submission)

**Form → Database:**
Form trigger → MongoDB write (save form data)

**Scheduled Report:**
Schedule trigger → MongoDB query → Transform → Email send

**API Integration:**
Webhook trigger → Transform → HTTP request → MongoDB write

**Conditional Routing:**
Form trigger → Conditional → (Branch A: Email) or (Branch B: Notification)

## Guidelines
- Be concise but helpful
- Suggest appropriate triggers based on user's use case
- When adding nodes, position them logically (triggers at top, flow downward)
- Explain data flow when connecting nodes
- For complex workflows, suggest step-by-step approach
- Remember conversation context - reference earlier discussion`;
}

// ============================================
// Parse Action from Response
// ============================================

function parseActionFromResponse(content: string): { message: string; action?: ChatAction } {
  const actionMatch = content.match(/ACTION:\s*(\{[\s\S]*\})$/);

  if (!actionMatch) {
    return { message: content.trim() };
  }

  const message = content.replace(/ACTION:\s*\{[\s\S]*\}$/, '').trim();

  try {
    const action = JSON.parse(actionMatch[1]) as ChatAction;
    return { message, action };
  } catch {
    console.error('Failed to parse action JSON:', actionMatch[1]);
    return { message: content.trim() };
  }
}

// ============================================
// Contact/Support Detection
// ============================================

const CONTACT_KEYWORDS = [
  'contact', 'support', 'help', 'sales', 'demo', 'pricing', 'price', 'cost',
  'enterprise', 'plan', 'subscription', 'talk to', 'speak to', 'reach out',
  'get in touch', 'call', 'phone', 'email', 'question about', 'interested in',
  'how much', 'free trial', 'trial', 'sign up', 'partnership', 'integrate',
  'api access', 'custom', 'hello', 'hi', 'hey', 'good morning', 'good afternoon'
];

const GENERAL_SUPPORT_PROMPT = `You are a friendly customer support assistant for NetPad, a platform that helps users build forms and workflows connected to MongoDB.

## About NetPad
- NetPad lets you create forms that save data directly to MongoDB
- Forms support 30+ field types including text, email, phone, date, file uploads, signatures, and more
- Includes AI-powered features for form generation and field suggestions
- Supports workflow automation (triggers, conditions, actions)
- Offers field-level encryption for sensitive data (MongoDB Queryable Encryption)
- Teams can collaborate on forms with role-based access

## Pricing
- Free tier: 3 forms, 100 responses/month, basic features
- Pro tier: Unlimited forms, 10,000 responses/month, AI features, webhooks
- Enterprise: Custom pricing, SSO, audit logs, dedicated support

## How to Help
- For demos or sales inquiries: Direct them to /contact or suggest they fill out the contact form
- For technical questions: Provide helpful answers about NetPad's capabilities
- For pricing questions: Share the tier information above
- For account issues: Suggest they check Settings or contact support via /contact

## Guidelines
- Be friendly and helpful
- Keep responses concise (2-3 sentences max for simple queries)
- For complex questions, offer to connect them with the team via the contact form
- If they want to try features, mention they can sign up for free

Don't include ACTION JSON - this is just conversational support.`;

function isContactOrSupportQuery(message: string, history?: Array<{ role: string; content: string }>): boolean {
  const lowerMessage = message.toLowerCase();

  // Check if message contains contact/support keywords
  const hasContactKeyword = CONTACT_KEYWORDS.some(keyword => lowerMessage.includes(keyword));

  // Check if there's no form/workflow context (user isn't actively building something)
  const isGeneralQuery = !lowerMessage.includes('field') &&
                         !lowerMessage.includes('validation') &&
                         !lowerMessage.includes('form builder') &&
                         !lowerMessage.includes('workflow') &&
                         !lowerMessage.includes('node') &&
                         !lowerMessage.includes('trigger');

  // Short greetings or questions are likely support queries
  const isShortGreeting = message.length < 50 && (
    lowerMessage.startsWith('hi') ||
    lowerMessage.startsWith('hello') ||
    lowerMessage.startsWith('hey') ||
    lowerMessage.includes('?')
  );

  return (hasContactKeyword && isGeneralQuery) || isShortGreeting;
}

// ============================================
// API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;

    // Validate request
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI service is not configured' },
        { status: 503 }
      );
    }

    // Determine if this is a contact/support query (no rate limits) or form-building query (rate limited)
    const isContactQuery = isContactOrSupportQuery(body.message, body.conversationHistory);

    let shouldRecordUsage = false;
    let guardContext: { userId: string; orgId: string; isGuest?: boolean } = {
      userId: 'support',
      orgId: 'support',
      isGuest: true,
    };

    // For form/workflow building queries, validate with rate limits
    if (!isContactQuery) {
      const guard = await validateAIRequestWithGuestAccess('ai_form_generator', request, true);
      if (!guard.success) {
        return guard.response;
      }

      // We'll record usage after successful response
      shouldRecordUsage = true;
      guardContext = guard.context;
    }

    const openai = new OpenAI({ apiKey });

    // Determine which system prompt to use
    let systemPrompt: string;
    if (isContactQuery) {
      // Use general support prompt for contact/support queries
      systemPrompt = GENERAL_SUPPORT_PROMPT;
    } else if (body.contextType === 'workflow' && body.workflowContext) {
      systemPrompt = buildWorkflowSystemPrompt(body.workflowContext);
    } else {
      systemPrompt = buildSystemPrompt(body.context || { fields: [], currentView: 'other' });
    }

    // Build messages array
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add conversation history
    if (body.conversationHistory && Array.isArray(body.conversationHistory)) {
      for (const msg of body.conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: body.message,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for chat
      messages,
      temperature: 0.7,
      max_tokens: isContactQuery ? 500 : 1000, // Shorter responses for support queries
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    const { message, action } = parseActionFromResponse(responseContent);

    // Record usage only for form/workflow queries (not contact/support)
    if (shouldRecordUsage) {
      if (guardContext.isGuest) {
        recordGuestUsage(request);
      } else {
        await recordAIUsage(guardContext.orgId);
      }
    }

    const response: ChatResponse = {
      success: true,
      message,
      action,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
