/**
 * AI Chat Assistant API Endpoint
 *
 * POST /api/ai/chat
 * Context-aware chat for helping users build forms.
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateAIRequest, recordAIUsage } from '@/lib/ai/aiRequestGuard';
import { ChatRequest, ChatResponse, ChatAction, FormBuilderContext } from '@/types/chat';

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
// API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and feature access
    const guard = await validateAIRequest('ai_form_generator', true);
    if (!guard.success) {
      return guard.response;
    }

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

    const openai = new OpenAI({ apiKey });

    // Build messages array
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: buildSystemPrompt(body.context || { fields: [], currentView: 'other' }),
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
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    const { message, action } = parseActionFromResponse(responseContent);

    // Record usage
    await recordAIUsage(guard.context.orgId);

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
