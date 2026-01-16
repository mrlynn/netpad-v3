/**
 * AI-powered node configuration generator
 * Unified service for generating node config from natural language
 */

// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('nodeConfigGenerator can only be used on the server');
}

import {
  NodeConfigGenerationRequest,
  NodeConfigGenerationResponse,
} from './types/nodeConfig';
import { getNodePromptConfig } from './nodeConfigPrompts';

// Dynamic import for OpenAI to avoid client-side bundling issues
async function getOpenAIClient() {
  const { default: OpenAI } = await import('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate node configuration from natural language
 */
export async function generateNodeConfig(
  request: NodeConfigGenerationRequest
): Promise<NodeConfigGenerationResponse> {
  const promptConfig = getNodePromptConfig(request.nodeType, request.fieldKey);

  if (!promptConfig) {
    throw new Error(
      `No AI prompt configured for ${request.nodeType}.${request.fieldKey}`
    );
  }

  const userPrompt = buildUserPrompt(request);

  try {
    const client = await getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: promptConfig.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: promptConfig.temperature ?? 0.3,
      response_format: { type: 'json_object' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse and validate response
    let parsed: { result?: unknown; explanation?: string; suggestions?: string[] };
    try {
      let jsonContent = content.trim();
      // Handle potential markdown code blocks
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
    }

    if (parsed.result === undefined) {
      throw new Error('Invalid response format: missing result');
    }

    return {
      result: parsed.result,
      explanation: parsed.explanation,
      suggestions: parsed.suggestions
    };
  } catch (error: unknown) {
    console.error('Error generating node config:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate configuration: ${String(error)}`);
  }
}

/**
 * Build the user prompt with all relevant context
 */
function buildUserPrompt(request: NodeConfigGenerationRequest): string {
  let prompt = `Generate configuration for: "${request.userQuery}"\n\n`;

  prompt += `Node type: ${request.nodeType}\n`;
  prompt += `Field: ${request.fieldKey}\n`;

  // Include current config context
  if (request.currentConfig && Object.keys(request.currentConfig).length > 0) {
    prompt += `\nCurrent node configuration:\n`;
    prompt += JSON.stringify(request.currentConfig, null, 2);
    prompt += '\n';
  }

  // Include current field value if exists
  if (request.currentFieldValue !== undefined && request.currentFieldValue !== '') {
    prompt += `\nCurrent value for this field:\n`;
    prompt += typeof request.currentFieldValue === 'string'
      ? request.currentFieldValue
      : JSON.stringify(request.currentFieldValue, null, 2);
    prompt += '\n\nNote: The user may want to modify or extend this existing value.\n';
  }

  // Include workflow context
  if (request.workflowContext) {
    const { upstreamNodes, triggerInfo } = request.workflowContext;

    if (triggerInfo) {
      prompt += `\n=== WORKFLOW TRIGGER ===\n`;
      prompt += `Type: ${triggerInfo.type}\n`;
      prompt += `Label: ${triggerInfo.label}\n`;
      prompt += `Available data:\n`;
      for (const field of triggerInfo.availableFields) {
        prompt += `  - ${field}\n`;
      }
    }

    if (upstreamNodes.length > 0) {
      prompt += `\n=== UPSTREAM NODES (available data from previous steps) ===\n`;
      for (const node of upstreamNodes) {
        prompt += `\nNode: "${node.label}" (${node.type})\n`;
        prompt += `Variables:\n`;
        for (const field of node.outputFields) {
          prompt += `  - ${field}\n`;
        }
      }
    }

    prompt += `\nIMPORTANT: When the user refers to "form data", "email", "submitted value", "user input", "previous step", or similar, use the appropriate workflow variable from above using the {{...}} syntax.\n`;
  }

  prompt += `\nGenerate the appropriate configuration.`;

  return prompt;
}
