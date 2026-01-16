/**
 * AI-powered MongoDB filter query generator
 * Converts natural language to MongoDB find() filter queries
 */

// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('filterQueryGenerator can only be used on the server');
}

// Dynamic import for OpenAI to avoid client-side bundling issues
async function getOpenAIClient() {
  const { default: OpenAI } = await import('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({
    apiKey: apiKey
  });
}

/**
 * Workflow context passed from the frontend
 */
export interface WorkflowContextForAI {
  upstreamNodes: Array<{
    id: string;
    type: string;
    label: string;
    outputFields: string[];
  }>;
  triggerInfo?: {
    type: string;
    label: string;
    availableFields: string[];
  };
}

export interface FilterGenerationRequest {
  query: string;
  collectionName?: string;
  schema?: {
    fields: string[];
    sampleDocs?: Record<string, unknown>[];
  };
  existingFilter?: Record<string, unknown>;
  workflowContext?: WorkflowContextForAI;
}

export interface FilterGenerationResponse {
  filter: Record<string, unknown>;
  explanation?: string;
  confidence?: number;
}

const SYSTEM_PROMPT = `You are an expert MongoDB query builder working within a workflow automation system. Your task is to convert natural language queries into valid MongoDB find() filter queries.

WORKFLOW CONTEXT:
This query is part of a workflow that may have upstream nodes providing data. When the user mentions "form data", "form submission", "trigger", "previous step", etc., they are referring to data from upstream workflow nodes. You should use the variable syntax {{nodes.<nodeId>.<field>}} to reference this data.

Rules:
1. Return ONLY valid JSON in this exact format:
{
  "filter": {"field": {"$operator": "value"}},
  "explanation": "Brief explanation of the query"
}

2. Use proper MongoDB query syntax:
   - Comparison: $eq, $ne, $gt, $gte, $lt, $lte
   - Array: $in, $nin, $all, $elemMatch
   - Logical: $and, $or, $not, $nor
   - Element: $exists, $type
   - Pattern: $regex (with $options for case-insensitive)
   - Evaluation: $mod, $text, $where

3. Examples of valid filters:
   - Simple equality: {"status": "active"} (implicit $eq)
   - Comparison: {"age": {"$gte": 18}}
   - Multiple conditions: {"$and": [{"status": "active"}, {"age": {"$gte": 18}}]}
   - Pattern matching: {"name": {"$regex": "john", "$options": "i"}}
   - Array contains: {"tags": {"$in": ["urgent", "important"]}}
   - Nested fields: {"user.email": "test@example.com"}
   - Exists check: {"deletedAt": {"$exists": false}}

4. WORKFLOW VARIABLE EXAMPLES (use these when referencing upstream data):
   - Find by form email: {"email": "{{nodes.form-trigger_abc123.respondent.email}}"}
   - Match form field value: {"status": "{{nodes.form-trigger_abc123.data.status}}"}
   - Use HTTP response data: {"userId": "{{nodes.http-request_xyz.data.id}}"}

5. Generate complete, working filters with all necessary configurations

6. If the query mentions form data, user input, or previous steps, use the appropriate workflow variable from the provided context

7. Always return valid JSON - no markdown, no code blocks, just pure JSON`;

export async function generateFilterFromQuery(
  request: FilterGenerationRequest
): Promise<FilterGenerationResponse> {
  const userPrompt = buildUserPrompt(request);

  try {
    const client = await getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response - handle potential markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: { filter?: Record<string, unknown>; explanation?: string; confidence?: number };
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', jsonContent);
      throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
    }

    // Validate the response structure
    if (!parsed.filter || typeof parsed.filter !== 'object') {
      throw new Error('Invalid response format: missing filter object');
    }

    return {
      filter: parsed.filter,
      explanation: parsed.explanation,
      confidence: parsed.confidence
    };
  } catch (error: unknown) {
    console.error('Error generating filter:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate filter: ${String(error)}`);
  }
}

function buildUserPrompt(request: FilterGenerationRequest): string {
  let prompt = `Convert this natural language query into a MongoDB find() filter:\n\n"${request.query}"\n\n`;

  if (request.collectionName) {
    prompt += `Collection name: ${request.collectionName}\n`;
  }

  // Include workflow context if available
  if (request.workflowContext) {
    const { upstreamNodes, triggerInfo } = request.workflowContext;

    if (triggerInfo) {
      prompt += `\n=== WORKFLOW TRIGGER ===\n`;
      prompt += `Trigger Type: ${triggerInfo.type}\n`;
      prompt += `Label: ${triggerInfo.label}\n`;
      prompt += `Available data from trigger:\n`;
      for (const field of triggerInfo.availableFields) {
        prompt += `  - ${field}\n`;
      }
    }

    if (upstreamNodes.length > 0) {
      prompt += `\n=== UPSTREAM WORKFLOW NODES (data available from previous steps) ===\n`;
      for (const node of upstreamNodes) {
        prompt += `\nNode: "${node.label}" (${node.type})\n`;
        prompt += `Available variables:\n`;
        for (const field of node.outputFields) {
          prompt += `  - ${field}\n`;
        }
      }
    }

    prompt += `\nIMPORTANT: When the user refers to "form data", "email", "submitted value", "user input", or similar, use the appropriate workflow variable from above using the {{...}} syntax.\n`;
  }

  if (request.schema) {
    prompt += `\nAvailable fields in the collection: ${request.schema.fields.join(', ')}\n`;

    if (request.schema.sampleDocs && request.schema.sampleDocs.length > 0) {
      prompt += `\nSample document structure:\n${JSON.stringify(request.schema.sampleDocs[0], null, 2)}\n`;
    }
  }

  if (request.existingFilter && Object.keys(request.existingFilter).length > 0) {
    prompt += `\nExisting filter (extend or modify this):\n${JSON.stringify(request.existingFilter, null, 2)}\n`;
    prompt += `\nNote: The user wants to extend or modify the existing filter based on their query.`;
  }

  prompt += `\n\nGenerate a complete, valid MongoDB filter query that fulfills the request.`;

  return prompt;
}
