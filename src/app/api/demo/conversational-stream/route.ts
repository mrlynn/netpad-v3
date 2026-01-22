/**
 * Demo Conversational Stream API
 *
 * POST /api/demo/conversational-stream
 * A simplified streaming endpoint for the conversational forms demo.
 * Allows guest access with rate limiting.
 *
 * Analytics: Uses aiService for token tracking under 'demo_guest' organization.
 */

import { NextRequest } from 'next/server';
import { Message } from '@/lib/ai/providers';
import { aiService, createAIContext } from '@/lib/ai/aiService';
import { ConversationalFormConfig, ConversationState } from '@/types/conversational';
import { TokenUsage } from '@/types/ai-analytics';
import {
  updateTopicCoverageFromExtractions,
  addMessageToState,
  updatePartialExtractions,
} from '@/lib/conversational/state';
import { saveConversationState } from '@/lib/conversational/persistence';
import { getOrgFormsCollection, getPlatformDb } from '@/lib/platform/db';
import { createSubmission } from '@/lib/platform/submissions';
import { getDecryptedConnectionString } from '@/lib/platform/connectionVault';
import { MongoClient } from 'mongodb';
import { sendCollaboratorNotification } from '@/lib/auth/email';

// Collection name for global conversational submissions (forms without dataSource)
const GLOBAL_CONVERSATIONS_COLLECTION = 'global_conversations';

// Simple in-memory rate limiting for demo
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const DEMO_RATE_LIMIT = 20; // 20 requests per hour for demo
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: DEMO_RATE_LIMIT - 1 };
  }

  if (entry.count >= DEMO_RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: DEMO_RATE_LIMIT - entry.count };
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Get organization ID and form configuration from form ID
 * Tries to find the form in organization databases, then falls back to published forms
 */
async function getFormConfigFromFormId(formId: string): Promise<{ orgId: string | null; form: any | null }> {
  try {
    console.log('[Demo Stream] Looking up form:', formId);
    
    // First, try to find the form in any organization database
    // We'll search through organizations to find which one has this form
    const platformDb = await getPlatformDb();
    const orgsCollection = platformDb.collection('organizations');
    
    // Get all organizations
    const orgs = await orgsCollection.find({}).toArray();
    console.log('[Demo Stream] Searching through', orgs.length, 'organizations');
    
    // Search each organization's forms collection
    for (const org of orgs) {
      try {
        const orgId = org.orgId;
        const formsCollection = await getOrgFormsCollection(orgId);
        const form = await formsCollection.findOne({
          $or: [
            { formId },
            { id: formId },
            { slug: formId },
          ],
        });
        
        if (form && form.organizationId) {
          console.log('[Demo Stream] ✅ Found form in org database:', {
            formId: form.formId || form.id,
            slug: form.slug,
            orgId: form.organizationId,
            hasDataSource: !!form.dataSource,
            dataSource: form.dataSource,
          });
          return { orgId: form.organizationId, form };
        }
      } catch (err) {
        console.warn('[Demo Stream] Error searching org', org.orgId, ':', err);
        // Continue to next org if this one fails
        continue;
      }
    }
    
    // Fallback: Try published forms
    console.log('[Demo Stream] Form not found in org databases, trying published forms...');
    try {
      const { getPublishedFormBySlug, getPublishedFormById } = await import('@/lib/storage');
      let publishedForm = await getPublishedFormBySlug(formId);
      if (!publishedForm) {
        publishedForm = await getPublishedFormById(formId);
      }
      
      if (publishedForm && publishedForm.organizationId) {
        console.log('[Demo Stream] ✅ Found form in published forms:', {
          formId: publishedForm.id,
          slug: publishedForm.slug,
          orgId: publishedForm.organizationId,
          hasDataSource: !!publishedForm.dataSource,
          dataSource: publishedForm.dataSource,
        });
        return { orgId: publishedForm.organizationId, form: publishedForm };
      }
    } catch (pubErr) {
      console.warn('[Demo Stream] Error checking published forms:', pubErr);
    }
    
    console.warn('[Demo Stream] ❌ Form not found anywhere:', formId);
    return { orgId: null, form: null };
  } catch (error) {
    console.error('[Demo Stream] Error getting form config from form ID:', error);
    return { orgId: null, form: null };
  }
}

/**
 * Get organization ID from form ID (backward compatibility)
 */
async function getOrganizationIdFromFormId(formId: string): Promise<string | null> {
  const { orgId } = await getFormConfigFromFormId(formId);
  return orgId;
}

/**
 * Save conversational turn data to target MongoDB collection
 */
async function saveTurnToMongoDB(
  orgId: string,
  form: any,
  state: ConversationState,
  turnData: Record<string, any>
): Promise<void> {
  try {
    console.log('[Demo Stream] saveTurnToMongoDB called:', {
      orgId,
      formId: form?.formId || form?.id,
      hasForm: !!form,
      hasDataSource: !!form?.dataSource,
      dataSource: form?.dataSource,
      conversationId: state.conversationId,
      turnCount: state.turnCount,
    });

    // Check if form has dataSource configured
    if (!form || !form.dataSource || !form.dataSource.vaultId || !form.dataSource.collection) {
      console.warn('[Demo Stream] Form does not have dataSource configured, skipping MongoDB save:', {
        hasForm: !!form,
        hasDataSource: !!form?.dataSource,
        vaultId: form?.dataSource?.vaultId,
        collection: form?.dataSource?.collection,
        formId: form?.formId || form?.id,
      });
      return;
    }

    // Get connection credentials from vault
    console.log('[Demo Stream] Getting connection credentials from vault:', {
      orgId,
      vaultId: form.dataSource.vaultId,
    });
    
    const credentials = await getDecryptedConnectionString(orgId, form.dataSource.vaultId);
    if (!credentials) {
      console.error('[Demo Stream] Could not get connection credentials from vault:', {
        orgId,
        vaultId: form.dataSource.vaultId,
        formId: form.formId || form.id,
      });
      return;
    }
    
    console.log('[Demo Stream] Got credentials:', {
      hasConnectionString: !!credentials.connectionString,
      database: credentials.database,
      collection: form.dataSource.collection,
    });

    // Connect to MongoDB and save the turn data
    const client = new MongoClient(credentials.connectionString, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    try {
      await client.connect();
      const db = client.db(credentials.database);
      const collection = db.collection(form.dataSource.collection);

      // Prepare document with extracted data and conversation metadata
      // Include all partial extractions (accumulated from all turns) as the main data
      const document = {
        ...state.partialExtractions, // All extracted data accumulated so far
        _conversation: {
          conversationId: state.conversationId,
          formId: state.formId,
          turnCount: state.turnCount,
          confidence: state.confidence,
          status: state.status,
          startedAt: state.startedAt,
          updatedAt: state.updatedAt,
          completedAt: state.completedAt,
        },
        _meta: {
          submissionType: 'conversational_turn',
          lastUpdated: new Date(),
          turnCount: state.turnCount,
          allExtractions: state.partialExtractions, // All extractions so far
          topicsCovered: state.topics.filter(t => t.covered).map(t => ({
            topicId: t.topicId,
            name: t.name,
            depth: t.depth,
          })),
          // Include latest turn's extraction for reference
          latestTurnExtraction: turnData,
        },
      };

      // Upsert based on conversationId (update existing or insert new)
      // This updates the document with the latest state on each turn
      const result = await collection.updateOne(
        { '_conversation.conversationId': state.conversationId },
        { $set: document },
        { upsert: true }
      );

      console.log('[Demo Stream] ✅ SAVED turn to MongoDB:', {
        conversationId: state.conversationId,
        collection: form.dataSource.collection,
        database: credentials.database,
        turnCount: state.turnCount,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId,
        extractedFields: Object.keys(state.partialExtractions),
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    // Log error but don't fail the request
    console.error('[Demo Stream] Failed to save turn to MongoDB:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      formId: form?.formId || form?.id,
      orgId,
      hasDataSource: !!form?.dataSource,
    });
  }
}

/**
 * Save conversational turn data to global_conversations collection
 * Used for forms without a dataSource (globally published forms like collaborator-intake)
 * This saves the FULL conversation state at EVERY turn for complete audit trail
 */
async function saveGlobalConversationTurn(
  formId: string,
  state: ConversationState,
  config: ConversationalFormConfig
): Promise<void> {
  try {
    const platformDb = await getPlatformDb();
    const collection = platformDb.collection(GLOBAL_CONVERSATIONS_COLLECTION);

    // Build the document with full conversation state
    const document = {
      formId,
      conversationId: state.conversationId,
      turnCount: state.turnCount,
      status: state.status,
      confidence: state.confidence,

      // All extracted data accumulated so far
      extractedData: state.partialExtractions || {},

      // Full conversation transcript
      messages: state.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp : (m.timestamp ? new Date(m.timestamp) : new Date()),
      })),

      // Topic coverage for tracking conversation progress
      topicsCovered: state.topics.filter(t => t.covered).map(t => ({
        topicId: t.topicId,
        name: t.name,
        depth: t.depth,
      })),
      topicsRemaining: state.topics.filter(t => !t.covered).map(t => ({
        topicId: t.topicId,
        name: t.name,
        priority: t.priority,
      })),

      // Timestamps
      startedAt: state.startedAt,
      updatedAt: new Date(),
      completedAt: state.completedAt,

      // Config reference
      configTemplateId: config.templateId,
    };

    // Upsert based on conversationId - updates existing or creates new
    const result = await collection.updateOne(
      { conversationId: state.conversationId },
      { $set: document },
      { upsert: true }
    );

    console.log('[Demo Stream] ✅ SAVED global conversation turn:', {
      conversationId: state.conversationId,
      formId,
      turnCount: state.turnCount,
      extractedFields: Object.keys(state.partialExtractions || {}),
      messageCount: state.messages.length,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });

    // Check if this is the collaborator form and we have enough data to send notification
    // Send notification once we have name and email (minimum required)
    const isCollaboratorForm = formId === 'collaborator-intake' ||
                               config.templateId === 'collaborator-intake' ||
                               formId.includes('collaborator');

    console.log('[Demo Stream] Checking if collaborator form:', {
      formId,
      templateId: config.templateId,
      isCollaboratorForm,
      hasPartialExtractions: !!state.partialExtractions,
      extractedFields: Object.keys(state.partialExtractions || {}),
    });

    if (isCollaboratorForm && state.partialExtractions) {
      const extracted = state.partialExtractions;
      const hasMinimumData = extracted.name && extracted.email;

      // Check if we've already sent notification for this conversation
      const existingDoc = await collection.findOne({
        conversationId: state.conversationId,
        notificationSent: true
      });

      if (hasMinimumData && !existingDoc?.notificationSent) {
        console.log('[Demo Stream] 📧 Sending collaborator notification:', {
          name: extracted.name,
          email: extracted.email,
          lane: extracted.lane,
          hasShipped: !!extracted.shipped,
          hasWhyNetpad: !!extracted.whyNetpad,
        });

        try {
          const sent = await sendCollaboratorNotification({
            name: extracted.name as string,
            email: extracted.email as string,
            lane: (extracted.lane as string) || 'undecided',
            shipped: (extracted.shipped as string) || '(Conversation in progress)',
            whyNetpad: (extracted.whyNetpad as string) || '(Conversation in progress)',
            availability: extracted.availability as string | undefined,
            conversationId: state.conversationId,
            turnCount: state.turnCount,
          });

          if (sent) {
            // Mark notification as sent to avoid duplicates
            await collection.updateOne(
              { conversationId: state.conversationId },
              { $set: { notificationSent: true, notificationSentAt: new Date() } }
            );
            console.log('[Demo Stream] ✅ Collaborator notification sent successfully');
          } else {
            console.error('[Demo Stream] ❌ Failed to send collaborator notification');
          }
        } catch (emailError) {
          console.error('[Demo Stream] ❌ Error sending collaborator notification:', emailError);
        }
      }
    }
  } catch (error) {
    // Log error but don't fail the request
    console.error('[Demo Stream] Failed to save global conversation turn:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      formId,
      conversationId: state.conversationId,
    });
  }
}

// User context interface for personalized responses
interface DemoUserContext {
  isAuthenticated?: boolean;
  isWaitlistUser?: boolean;
  userName?: string;
  waitlistStatus?: 'pending' | 'approved' | 'rejected';
}

/**
 * Build system prompt for the demo
 */
function buildSystemPrompt(
  config: ConversationalFormConfig,
  state?: ConversationState,
  userContext?: DemoUserContext
): string {
  // Build information about what's already been collected
  let collectedInfo = '';
  let topicsNeeded = '';
  let conversationSummary = '';
  
  if (state) {
    // Build conversation summary from recent messages
    if (state.messages && state.messages.length > 0) {
      const recentMessages = state.messages
        .filter(m => m.role !== 'system')
        .slice(-6); // Last 6 messages (3 exchanges)
      
      if (recentMessages.length > 0) {
        conversationSummary = `\n\n## Recent Conversation Summary\n${recentMessages.map(m => {
          const role = m.role === 'user' ? 'User' : 'You';
          const content = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content;
          return `${role}: ${content}`;
        }).join('\n')}\n\n**Use this context - reference what the user has already told you. Don't ask for information they've already provided.**`;
      }
    }
    
    if (state.partialExtractions && Object.keys(state.partialExtractions).length > 0) {
      const collectedFields: string[] = [];
      const missingRequiredFields: string[] = [];
      
      for (const schemaField of config.extractionSchema) {
        const value = state.partialExtractions[schemaField.field];
        if (value !== undefined && value !== null && value !== '') {
          const displayValue = typeof value === 'string' && value.length > 50 
            ? value.substring(0, 50) + '...' 
            : String(value);
          collectedFields.push(`${schemaField.description || schemaField.field}: ${displayValue}`);
        } else if (schemaField.required) {
          missingRequiredFields.push(schemaField.description || schemaField.field);
        }
      }
      
      if (collectedFields.length > 0) {
        // Build a detailed list with actual values from partialExtractions
        const collectedDetails = config.extractionSchema
          .filter(f => {
            const value = state.partialExtractions[f.field];
            return value !== undefined && value !== null && value !== '';
          })
          .map(field => {
            const value = state.partialExtractions[field.field];
            const displayValue = typeof value === 'string' && value.length > 50 
              ? value.substring(0, 50) + '...' 
              : String(value);
            return `- ${field.description || field.field}: "${displayValue}"`;
          }).join('\n');
        
        collectedInfo = `\n\n## ⚠️ INFORMATION ALREADY COLLECTED - DO NOT ASK AGAIN ⚠️\n\nYou have ALREADY collected the following information from the user:\n${collectedDetails}\n\n**ABSOLUTE RULES - VIOLATING THESE IS A CRITICAL ERROR:**\n\n1. NEVER ask for ANY of the information listed above, even if:\n   - You rephrase the question\n   - You ask it in a different way\n   - You think you need to confirm it\n   - You want to "double-check"\n\n2. SPECIFIC PROHIBITIONS:\n   - If email is listed above → DO NOT ask "Can you share your email?" or "What's your email address?" or ANY variation\n   - If lane/interest is listed above → DO NOT ask "Which lane interests you?" or "What area are you interested in?" or ANY variation\n   - If name is listed above → DO NOT ask for their name again\n   - If they've told you about their projects → DO NOT ask "What have you built?" or "Tell me about your experience" again\n   - If they've explained their interest → DO NOT ask "What brings you here?" or "Why are you interested?" again\n\n3. WHAT TO DO INSTEAD:\n   - Reference the information naturally: "I see you're interested in [lane]" or "Thanks for sharing your email, [email]"\n   - IMMEDIATELY move to the NEXT uncovered topic\n   - If all topics are covered, summarize what you've collected and thank them\n\n4. CHECK BEFORE ASKING:\n   - Before asking ANY question, check this list above\n   - If the information is here, DO NOT ask about it\n   - Move to the next topic that is NOT in this list\n\n**REMEMBER: The user has already provided this information. Asking again is repetitive and frustrating.**`;
      }
      
      if (missingRequiredFields.length > 0) {
        topicsNeeded = `\n\n## Information Still Needed (Required)\nYou still need to collect:\n${missingRequiredFields.map(f => `- ${f}`).join('\n')}\n\nFocus on asking about these topics next. Do NOT ask about topics that are already in the "Information Already Collected" section above.`;
      }
    }

    // Build remaining topics list from state
    if (state.topics && state.topics.length > 0) {
      const uncovered = state.topics.filter(t => !t.covered && t.priority === 'required');

      if (uncovered.length > 0) {
        topicsNeeded = (topicsNeeded || '') + `\n\n## Topics Still Needed\n${uncovered.map(t => {
          const topicConfig = config.topics.find(tc => tc.id === t.topicId);
          return `- ${t.name}: ${topicConfig?.description || ''}`;
        }).join('\n')}`;
      }
    }
  }

  // Add user context awareness
  let userContextInfo = '';
  if (userContext) {
    if (userContext.isWaitlistUser) {
      userContextInfo = `
IMPORTANT USER CONTEXT:
- The user "${userContext.userName || 'this user'}" is currently on the NetPad waitlist (pending approval)
- If they ask about their waitlist status, approval time, or when they can access the platform:
  - Be encouraging and let them know they're on the waitlist and will be notified by email when approved
  - Typical approval time is 1-2 business days
  - They can browse templates and the marketplace while waiting
  - They can contact support@netpad.io if they have questions
- Continue with the form demo while being helpful about waitlist questions`;
    } else if (userContext.isAuthenticated) {
      userContextInfo = `
USER CONTEXT:
- The user "${userContext.userName || 'this user'}" is an approved NetPad user
- If they ask about features, you can encourage them to explore templates and create their own forms`;
    }
  }

  // Put critical "do not ask" info at the VERY TOP where LLMs are most likely to see it
  let criticalDoNotAsk = '';
  if (state?.partialExtractions) {
    const doNotAskItems: string[] = [];
    if (state.partialExtractions.name) {
      doNotAskItems.push(`- User's name is "${state.partialExtractions.name}" - DO NOT ask for their name`);
    }
    if (state.partialExtractions.email) {
      doNotAskItems.push(`- User's email is "${state.partialExtractions.email}" - DO NOT ask for their email`);
    }
    if (state.partialExtractions.lane) {
      doNotAskItems.push(`- User's interest area is "${state.partialExtractions.lane}" - DO NOT ask about lanes/interest`);
    }
    if (state.partialExtractions.shipped) {
      doNotAskItems.push(`- User has described their projects - DO NOT ask "What have you built?" or "Tell me about your experience"`);
    }
    if (state.partialExtractions.whyNetpad) {
      doNotAskItems.push(`- User has explained their interest - DO NOT ask "Why are you interested?" or "What brings you here?"`);
    }
    if (state.partialExtractions.availability) {
      doNotAskItems.push(`- User's availability is "${state.partialExtractions.availability}" - DO NOT ask about time commitment`);
    }
    if (doNotAskItems.length > 0) {
      criticalDoNotAsk = `\n⛔⛔⛔ STOP - READ THIS FIRST ⛔⛔⛔\n${doNotAskItems.join('\n')}\n⛔⛔⛔ DO NOT ASK ABOUT ANY OF THE ABOVE ⛔⛔⛔\n\n`;
    }
  }

  // Build a concise, focused prompt that emphasizes the key rules
  return `${criticalDoNotAsk}You are a friendly assistant collecting information through conversation.

Goal: ${config.objective}
${conversationSummary}
${collectedInfo}
${topicsNeeded}

## RULES (FOLLOW EXACTLY):
1. Check "Information Already Collected" section - NEVER ask about those topics again
2. Ask about ONE topic from "Topics Still Needed"
3. Keep responses to 1-2 sentences
4. Be warm and conversational

If you ask about something already collected, you have FAILED.
${userContextInfo}

Flow example:
- User shares info → Acknowledge briefly → Ask about NEXT uncollected topic
- If corrections given → Confirm the update warmly`;
}

/**
 * Create SSE stream from async generator
 */
function createSSEStream(
  generator: AsyncGenerator<string, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          const event = `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
      } catch (error: any) {
        const errorEvent = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Rate limit exceeded. Please try again later.', code: 'RATE_LIMIT' })}\n\n`,
      {
        status: 429,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { message, state, config, userContext } = body as {
      message: string;
      state: ConversationState;
      config: ConversationalFormConfig;
      userContext?: DemoUserContext;
    };

    // Validate required fields
    if (!message || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if AI service is available
    const isAvailable = await aiService.isAvailable();
    if (!isAvailable) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', error: 'AI service not configured', code: 'NO_PROVIDER' })}\n\n`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        }
      );
    }

    // Create AI context for analytics tracking
    const aiContext = createAIContext(
      `guest_${ip.replace(/\./g, '_')}`, // anonymized user ID based on IP
      'demo_guest',                       // dedicated org ID for demo analytics
      'rag_conversational_forms',         // conversational forms feature
      '/api/demo/conversational-stream',
      true                                // isGuest = true
    );

    // IMPORTANT: Extract from ALL user messages (including current) BEFORE building the system prompt
    // This ensures the AI knows what was just collected and doesn't ask about it again
    const allUserMessages = [
      ...(state?.messages || []).filter((m) => m.role === 'user').map((m) => m.content),
      message, // Current user message
    ];
    const userMessagesForExtraction = allUserMessages.join('\n');
    
    // Do extraction on ALL messages (not just current) to get complete picture
    let currentExtraction: { data: Record<string, any>; confidence: Record<string, number> } | null = null;
    try {
      console.log('[Demo Stream] Starting extraction on messages:', {
        messageCount: allUserMessages.length,
        lastMessage: message.substring(0, 100),
        allMessages: userMessagesForExtraction.substring(0, 200),
      });
      currentExtraction = await extractFromConversation(userMessagesForExtraction, config);
      console.log('[Demo Stream] ✅ Extraction from all messages:', {
        extractedData: currentExtraction.data,
        extractedFields: Object.keys(currentExtraction.data),
        hasEmail: !!currentExtraction.data.email,
        emailValue: currentExtraction.data.email,
        previousExtractions: state?.partialExtractions,
        merged: { ...(state?.partialExtractions || {}), ...currentExtraction.data },
      });
    } catch (extractionError) {
      console.error('[Demo Stream] ❌ Extraction error:', extractionError);
    }

    // Update state with current extraction BEFORE building the prompt
    // Merge with existing partialExtractions to preserve all previous extractions
    let stateWithCurrentExtraction = state;
    if (currentExtraction) {
      // Start with existing state or create new one
      const baseState = state || {
        conversationId: `demo_${Date.now()}`,
        formId: config.templateId || 'demo',
        messages: [],
        topics: config.topics.map((t) => ({
          topicId: t.id,
          name: t.name,
          covered: false,
          depth: 0,
          priority: t.priority,
          turnCount: 0,
        })),
        partialExtractions: {},
        confidence: 0,
        turnCount: 0,
        maxTurns: config.conversationLimits.maxTurns,
        status: 'active' as const,
        startedAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Merge current extraction with existing partialExtractions
      stateWithCurrentExtraction = {
        ...baseState,
        partialExtractions: {
          ...baseState.partialExtractions,
          ...currentExtraction.data, // Current extraction overrides previous if same field
        },
      };
      
      // Update topic coverage immediately so the prompt knows what's covered
      stateWithCurrentExtraction = updateTopicCoverageFromExtractions(
        stateWithCurrentExtraction,
        currentExtraction.data,
        config.extractionSchema,
        config.topics
      );
      
      console.log('[Demo Stream] State after extraction:', {
        partialExtractions: stateWithCurrentExtraction.partialExtractions,
        topicsCovered: stateWithCurrentExtraction.topics.filter(t => t.covered).map(t => t.name),
      });
    }

    // Build conversation messages with user context
    // Pass the UPDATED state (with current extraction) to buildSystemPrompt
    const stateWithExtractions = stateWithCurrentExtraction ? {
      ...stateWithCurrentExtraction,
      partialExtractions: stateWithCurrentExtraction.partialExtractions || {},
    } : undefined;
    const systemPrompt = buildSystemPrompt(config, stateWithExtractions, userContext);
    const conversationHistory: Message[] = state?.messages
      ?.filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })) || [];

    // CRITICAL FIX: Build an explicit "do not ask" message to inject right before the user message
    // This ensures the LLM sees exactly what was extracted and cannot miss it
    let doNotAskReminder = '';
    if (stateWithExtractions?.partialExtractions && Object.keys(stateWithExtractions.partialExtractions).length > 0) {
      const extracted = stateWithExtractions.partialExtractions;
      const items: string[] = [];

      if (extracted.name) items.push(`name="${extracted.name}"`);
      if (extracted.email) items.push(`email="${extracted.email}"`);
      if (extracted.lane) items.push(`lane/area="${extracted.lane}"`);
      if (extracted.shipped) items.push(`shipped/projects=COLLECTED`);
      if (extracted.whyNetpad) items.push(`whyNetpad/motivation=COLLECTED`);
      if (extracted.availability) items.push(`availability="${extracted.availability}"`);

      if (items.length > 0) {
        doNotAskReminder = `[SYSTEM REMINDER: You have ALREADY collected: ${items.join(', ')}. DO NOT ask about ANY of these again. Move to the NEXT uncollected topic only.]`;
      }
    }

    // Add current user message
    conversationHistory.push({ role: 'user', content: message });

    // Build messages array with system prompt, conversation history,
    // and inject the "do not ask" reminder as a system message RIGHT BEFORE the last user message
    // This ensures the LLM sees it immediately before generating a response
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(0, -1), // All messages except the last one
    ];

    // Inject the reminder right before the final user message (if we have extracted data)
    if (doNotAskReminder) {
      messages.push({ role: 'system', content: doNotAskReminder });
    }

    // Add the final user message
    messages.push(conversationHistory[conversationHistory.length - 1]);

    // Debug: Log what we're sending to the LLM
    console.log('[Demo Stream] 📤 Sending to LLM:', {
      partialExtractions: stateWithExtractions?.partialExtractions,
      hasName: !!stateWithExtractions?.partialExtractions?.name,
      nameValue: stateWithExtractions?.partialExtractions?.name,
      hasLane: !!stateWithExtractions?.partialExtractions?.lane,
      laneValue: stateWithExtractions?.partialExtractions?.lane,
      hasShipped: !!stateWithExtractions?.partialExtractions?.shipped,
      doNotAskReminder: doNotAskReminder || '(none)',
      messageCount: messages.length,
      lastUserMessage: message,
    });

    // Extra debug: Log the full message sequence to verify the reminder is injected
    console.log('[Demo Stream] 📋 Message sequence:', messages.map((m, i) => ({
      index: i,
      role: m.role,
      contentPreview: m.content.substring(0, 80) + (m.content.length > 80 ? '...' : ''),
    })));

    // Stream response using aiService for analytics tracking
    const streamResult = await aiService.streamChat(aiContext, messages, {
      temperature: 0.7,
      maxTokens: 500,
    });

    // Collect full response for extraction
    let fullResponse = '';
    let getUsage: (() => Promise<TokenUsage | null>) | null = streamResult.getUsage;

    async function* processStream() {
      for await (const chunk of streamResult.stream) {
        fullResponse += chunk;
        yield chunk;
      }
    }

    const sseStream = createSSEStream(processStream());

    // Create a TransformStream to add extraction after completion
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = sseStream.getReader();
    const encoder = new TextEncoder();

    // Process stream and add extraction at the end
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }

        // Send stream_complete event IMMEDIATELY when LLM finishes streaming
        // This stops the spinner right away, before extraction completes
        const streamCompleteEvent = `data: ${JSON.stringify({ type: 'stream_complete' })}\n\n`;
        await writer.write(encoder.encode(streamCompleteEvent));

        // After stream completes, use the extraction we already did (or do it if we didn't)
        if (fullResponse) {
          // Use the extraction we already did before building the prompt
          // This ensures consistency and avoids duplicate extraction
          const extraction = currentExtraction || await extractFromConversation(userMessagesForExtraction, config);

          // Start with the state that already has current extraction (from before prompt building)
          // Use stateWithCurrentExtraction if we did pre-extraction, otherwise use state
          const formId = state?.formId || config.templateId || 'demo';
          let updatedState: ConversationState = stateWithCurrentExtraction || state || {
            conversationId: `demo_${Date.now()}`,
            formId,
            messages: [],
            topics: config.topics.map((t) => ({
              topicId: t.id,
              name: t.name,
              covered: false,
              depth: 0,
              priority: t.priority,
              turnCount: 0,
            })),
            partialExtractions: {},
            confidence: 0,
            turnCount: 0,
            maxTurns: config.conversationLimits.maxTurns,
            status: 'active',
            startedAt: new Date(),
            updatedAt: new Date(),
          };

          // Ensure formId is set correctly
          updatedState.formId = formId;
          
          // CRITICAL: If we used stateWithCurrentExtraction, it already has topics updated
          // Don't overwrite them - preserve the topic coverage from pre-extraction
          if (stateWithCurrentExtraction && stateWithCurrentExtraction.topics) {
            updatedState.topics = stateWithCurrentExtraction.topics;
            updatedState.partialExtractions = stateWithCurrentExtraction.partialExtractions;
          }

          // If this is a new conversation (no messages yet), save initial state
          const isNewConversation = !updatedState.messages || updatedState.messages.length === 0;
          if (isNewConversation) {
            try {
              const { orgId, form } = await getFormConfigFromFormId(updatedState.formId);
              if (orgId) {
                await saveConversationState(orgId, updatedState);
                console.log('[Demo Stream] Saved initial conversation state:', {
                  conversationId: updatedState.conversationId,
                  formId: updatedState.formId,
                  orgId,
                });

                // Save initial turn to MongoDB if form has dataSource
                if (form && form.dataSource) {
                  await saveTurnToMongoDB(orgId, form, updatedState, {});
                }
              } else {
                console.warn('[Demo Stream] Could not find organization ID for form:', updatedState.formId);
              }
            } catch (saveError) {
              console.error('[Demo Stream] Failed to save initial conversation state:', saveError);
            }
          }

          // Add user message to state (if not already added)
          if (!updatedState.messages.some(m => m.role === 'user' && m.content === message)) {
            updatedState = addMessageToState(updatedState, 'user', message);
          }
          
          // Add assistant message to state
          updatedState = addMessageToState(updatedState, 'assistant', fullResponse);

          // Merge extraction results with existing partialExtractions
          // Use the extraction we already did (currentExtraction) or do it now
          const finalExtraction = currentExtraction || extraction;
          
          // Always update partialExtractions (merge with existing)
          updatedState = updatePartialExtractions(
            updatedState,
            finalExtraction.data,
            finalExtraction.confidence.overall || 0.5
          );

          // CRITICAL: Always update topic coverage based on ALL current extractions
          // Use the merged partialExtractions (not just current turn) to ensure all topics are marked
          console.log('[Demo Stream] 🔍 Before topic coverage update:', {
            partialExtractions: updatedState.partialExtractions,
            hasEmail: !!updatedState.partialExtractions.email,
            emailValue: updatedState.partialExtractions.email,
            extractionSchema: config.extractionSchema.map(s => ({ field: s.field, topicId: s.topicId })),
            emailFieldSchema: config.extractionSchema.find(s => s.field === 'email'),
            topicsConfig: config.topics.map(t => ({ id: t.id, name: t.name, depth: t.depth })),
            emailTopic: config.topics.find(t => t.id === 'email'),
            currentTopics: updatedState.topics.map(t => ({ topicId: t.topicId, name: t.name, covered: t.covered })),
          });
          
          // VERIFY: Email should be in partialExtractions
          if (updatedState.partialExtractions.email) {
            console.log('[Demo Stream] ✅ Email found in partialExtractions, updating topic coverage...');
          } else {
            console.warn('[Demo Stream] ⚠️ Email NOT found in partialExtractions!', {
              partialExtractions: updatedState.partialExtractions,
              finalExtraction: finalExtraction.data,
            });
          }
          
          updatedState = updateTopicCoverageFromExtractions(
            updatedState,
            updatedState.partialExtractions, // Use ALL accumulated extractions, not just this turn
            config.extractionSchema,
            config.topics
          );
          
          // VERIFY: Email topic should now be covered
          const emailTopic = updatedState.topics.find(t => t.topicId === 'email');
          console.log('[Demo Stream] ✅ After topic coverage update:', {
            partialExtractions: updatedState.partialExtractions,
            hasEmail: !!updatedState.partialExtractions.email,
            emailValue: updatedState.partialExtractions.email,
            emailTopic: emailTopic ? {
              topicId: emailTopic.topicId,
              name: emailTopic.name,
              covered: emailTopic.covered,
              depth: emailTopic.depth,
            } : 'NOT FOUND',
            allTopics: updatedState.topics.map(t => ({
              topicId: t.topicId,
              name: t.name,
              covered: t.covered,
              depth: t.depth,
            })),
            coveredTopics: updatedState.topics.filter(t => t.covered).map(t => t.name),
            uncoveredTopics: updatedState.topics.filter(t => !t.covered).map(t => t.name),
          });

          // Update updatedAt timestamp
          updatedState.updatedAt = new Date();
          
          // Debug: Log extraction and topic coverage for troubleshooting
          console.log('[Demo Stream] Extraction results:', {
            extractedData: extraction.data,
            topicsCovered: updatedState.topics.filter(t => t.covered).map(t => ({ name: t.name, topicId: t.topicId, depth: t.depth })),
            topicsUncovered: updatedState.topics.filter(t => !t.covered && t.priority === 'required').map(t => ({ name: t.name, topicId: t.topicId, depth: t.depth })),
            allTopics: updatedState.topics.map(t => ({ name: t.name, topicId: t.topicId, covered: t.covered, depth: t.depth })),
          });

          // Save conversation state to database for abandonment tracking
          // AND save to target MongoDB collection on each turn
          try {
            console.log('[Demo Stream] Looking up form config for formId:', updatedState.formId);
            const { orgId, form } = await getFormConfigFromFormId(updatedState.formId);
            
            console.log('[Demo Stream] Form lookup result:', {
              formId: updatedState.formId,
              foundOrgId: !!orgId,
              orgId,
              foundForm: !!form,
              formName: form?.name,
              hasDataSource: !!form?.dataSource,
              dataSource: form?.dataSource,
            });
            
            if (orgId) {
              // Save conversation state (for abandonment tracking)
              await saveConversationState(orgId, updatedState);
              console.log('[Demo Stream] Saved conversation state:', {
                conversationId: updatedState.conversationId,
                formId: updatedState.formId,
                orgId,
                turnCount: updatedState.turnCount,
              });

              // Save to target MongoDB collection (if form has dataSource configured)
              if (form && form.dataSource) {
                console.log('[Demo Stream] Form has dataSource, saving to MongoDB...');
                await saveTurnToMongoDB(orgId, form, updatedState, finalExtraction.data);
              } else {
                console.warn('[Demo Stream] Form does NOT have dataSource configured:', {
                  formId: updatedState.formId,
                  hasForm: !!form,
                  hasDataSource: !!form?.dataSource,
                });
              }
            } else {
              console.error('[Demo Stream] ❌ Could not find organization ID for form:', updatedState.formId);
            }
          } catch (saveError) {
            console.error('[Demo Stream] ❌ Failed to save conversation state or turn data:', {
              error: saveError instanceof Error ? saveError.message : 'Unknown error',
              stack: saveError instanceof Error ? saveError.stack : undefined,
              formId: updatedState.formId,
            });
            // Don't fail the request if state save fails
          }

          // Send extraction update
          const extractionEvent = `data: ${JSON.stringify({
            type: 'extraction_update',
            data: extraction.data,
            confidence: extraction.confidence,
            overallConfidence: updatedState.confidence,
          })}\n\n`;
          await writer.write(encoder.encode(extractionEvent));

          // Send state update with properly calculated topic coverage
          // CRITICAL: Include ALL partialExtractions (from all turns) in the state update
          const completePartialExtractions = {
            ...(state?.partialExtractions || {}),
            ...updatedState.partialExtractions,
          };
          
          // CRITICAL: Log topic states before sending
          const topicsForUpdate = updatedState.topics.map((t) => ({
            topicId: t.topicId,
            name: t.name,
            covered: t.covered,
            depth: t.depth,
            turnCount: t.turnCount,
          }));
          
          console.log('[Demo Stream] Sending state_update:', {
            conversationId: updatedState.conversationId,
            turnCount: updatedState.turnCount,
            partialExtractions: completePartialExtractions,
            topicsCovered: updatedState.topics.filter(t => t.covered).map(t => t.name),
            topicsUncovered: updatedState.topics.filter(t => !t.covered).map(t => t.name),
            allTopics: topicsForUpdate,
            messageCount: updatedState.messages.length,
          });
          
          const stateUpdate = `data: ${JSON.stringify({
            type: 'state_update',
            state: {
              conversationId: updatedState.conversationId,
              turnCount: updatedState.turnCount,
              confidence: updatedState.confidence,
              topics: topicsForUpdate, // Send ALL topics with their current state
              partialExtractions: completePartialExtractions, // Include ALL extractions from all turns
              messages: updatedState.messages.map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
              })),
            },
          })}\n\n`;
          await writer.write(encoder.encode(stateUpdate));

          // Save conversation to global_conversations collection at EVERY turn
          // This creates a complete audit trail of all conversations
          // Build complete state with all extractions for saving
          const stateToSave: ConversationState = {
            ...updatedState,
            partialExtractions: completePartialExtractions,
          };
          // Save asynchronously (don't block the response)
          saveGlobalConversationTurn(
            updatedState.formId || config.templateId || 'unknown',
            stateToSave,
            config
          ).catch(err => {
            console.error('[Demo Stream] Background save failed:', err);
          });

          // Check if we should suggest completion
          // Use ALL partialExtractions (from all turns), not just current extraction
          const requiredFields = config.extractionSchema.filter((f) => f.required);
          const allExtractions = completePartialExtractions;
          const filledRequired = requiredFields.filter((f) => {
            const value = allExtractions[f.field];
            return value !== undefined && value !== null && value !== '';
          });

          console.log('[Demo Stream] Completion check:', {
            requiredFields: requiredFields.map(f => f.field),
            filledRequired: filledRequired.map(f => f.field),
            allExtractions: Object.keys(allExtractions),
            shouldComplete: filledRequired.length === requiredFields.length,
          });

          if (filledRequired.length === requiredFields.length) {
            const completionEvent = `data: ${JSON.stringify({
              type: 'completion_check',
              shouldComplete: true,
              reason: 'All required information has been collected.',
            })}\n\n`;
            await writer.write(encoder.encode(completionEvent));
          }
        }
      } finally {
        // Log token usage to analytics (this triggers the aiService logging)
        if (getUsage) {
          try {
            const usage = await getUsage();
            if (usage) {
              console.log('[Demo Stream] Token usage:', {
                prompt: usage.prompt,
                completion: usage.completion,
                total: usage.total,
              });
            }
          } catch (usageError) {
            console.error('[Demo Stream] Failed to log usage:', usageError);
          }
        }
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error: any) {
    console.error('[Demo Stream] Error:', error);
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: error.message || 'Internal error' })}\n\n`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      }
    );
  }
}

/**
 * Extract structured data from conversation using simple pattern matching
 * For demo purposes - production uses AI extraction
 *
 * IMPORTANT: This should only be called with USER messages, not assistant messages,
 * to avoid false positives from AI's conversational phrases.
 *
 * Messages are processed in order, with later corrections overriding earlier values.
 */
async function extractFromConversation(
  userMessagesText: string,
  config: ConversationalFormConfig
): Promise<{ data: Record<string, any>; confidence: Record<string, number> }> {
  const data: Record<string, any> = {};
  const confidence: Record<string, number> = {};

  // Common words to filter out - these are NOT names or companies
  const commonWords = new Set([
    'ok', 'okay', 'sure', 'yes', 'no', 'hi', 'hello', 'hey', 'thanks', 'thank',
    'please', 'help', 'need', 'want', 'get', 'started', 'begin', 'simple',
    'excited', 'great', 'good', 'fine', 'well', 'what', 'information', 'you',
    'the', 'and', 'for', 'that', 'this', 'with', 'have', 'are', 'was', 'were',
    'not', 'actually', 'meant', 'should', 'it', 'is', 'was', 'be', 'let',
  ]);

  const isCommonWord = (word: string) => commonWords.has(word.toLowerCase());

  // Split into individual messages for ordered processing
  const messages = userMessagesText.split('\n').filter(m => m.trim());

  // Determine the correct field name for storing the name (once, outside the loop)
  const nameField = config.extractionSchema.find(f =>
    f.field === 'name' || f.description?.toLowerCase().includes('name')
  )?.field || 'fullName';

  // Process each message in order - later messages can override earlier ones
  for (const message of messages) {
    const msg = message.trim();

    // Check for CORRECTIONS first - these have highest priority
    // Patterns like: "actually it's X", "not X - Y", "name was Y not X", "should be X"
    // Note: Use case-insensitive patterns since users may type names in lowercase
    const correctionPatterns = [
      // "actually my name is X" / "actually it's X"
      /actually\s+(?:my\s+)?(?:name\s+)?(?:is|it's|its)\s+([a-z]+)/i,
      // "the name was X" / "name was X not Y" / "the victim's name was X"
      /(?:the\s+)?(?:\w+'s\s+)?name\s+(?:was|is|should be)\s+([a-z]+)(?:\s*[-,]\s*not)?/i,
      // "it was X not Y"
      /it\s+(?:was|is|should be)\s+([a-z]+)(?:\s*[-,]\s*not)?/i,
      // "not X - Y" or "not X, Y" for name correction (captures the SECOND name)
      /not\s+[a-z]+\s*[-,.]\s*([a-z]+)/i,
      // "should be X"
      /should\s+be\s+([a-z]+)/i,
      // "I meant X"
      /i\s+meant\s+([a-z]+)/i,
    ];

    for (const pattern of correctionPatterns) {
      const match = msg.match(pattern);
      if (match && match[1]) {
        const correctedName = match[1].trim();
        // Capitalize the first letter for proper name formatting
        const formattedName = correctedName.charAt(0).toUpperCase() + correctedName.slice(1).toLowerCase();
        if (formattedName.length > 2 && !isCommonWord(formattedName.toLowerCase())) {
          data[nameField] = formattedName;
          confidence[nameField] = 0.95; // Higher confidence for explicit corrections
        }
      }
    }

    // Email correction patterns
    const emailCorrectionMatch = msg.match(/(?:actually|correct|should be|it's|its)\s+[\w.-]+@[\w.-]+\.\w{2,}/i);
    if (emailCorrectionMatch) {
      const emailMatch = msg.match(/[\w.-]+@[\w.-]+\.\w{2,}/i);
      if (emailMatch) {
        data.email = emailMatch[0].toLowerCase();
        confidence.email = 0.95;
      }
    }

    // Standard email extraction (if no correction found yet)
    if (!data.email) {
      const emailMatch = msg.match(/[\w.-]+@[\w.-]+\.\w{2,}/i);
      if (emailMatch) {
        data.email = emailMatch[0].toLowerCase();
        confidence.email = 0.95;
        console.log('[Demo Stream] ✅ EXTRACTED EMAIL:', {
          email: data.email,
          fromMessage: msg.substring(0, 100),
        });
      }
    }

    // Name extraction - standard patterns (only if no correction set it)
    // Only extract name if we haven't already captured it
    if (!data[nameField]) {
      const namePatterns = [
        /(?:my name is|i'm|i am|call me|name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        // Single word that's just a capitalized name (likely answering "what's your name?")
        /^([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)$/,
      ];
      for (const pattern of namePatterns) {
        const match = msg.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          const firstWord = name.split(' ')[0].toLowerCase();
          if (name.length > 2 && !isCommonWord(firstWord)) {
            data[nameField] = name;
            confidence[nameField] = 0.85;
            console.log('[Demo Stream] ✅ EXTRACTED NAME:', {
              name: data[nameField],
              field: nameField,
              fromMessage: msg.substring(0, 100),
            });
            break;
          }
        }
      }
    }
  }

  // Company extraction - scan full text
  const companyPatterns = [
    /(?:work(?:ing)?\s+(?:at|for)|company is|from|with)\s+([A-Z][A-Za-z0-9\s&.-]{2,}?)(?:\.|,|$|\n)/i,
    /(?:at|for)\s+([A-Z][A-Za-z0-9\s&.-]{2,}?)\s+(?:as|doing)/i,
  ];
  for (const pattern of companyPatterns) {
    const match = userMessagesText.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      const firstWord = company.split(' ')[0].toLowerCase();
      if (company.length > 2 && !isCommonWord(firstWord)) {
        data.company = company;
        confidence.company = 0.8;
        break;
      }
    }
  }

  // Phone number extraction
  const phoneMatch = userMessagesText.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
  if (phoneMatch) {
    data.phone = phoneMatch[0].replace(/[^\d+]/g, '');
    confidence.phone = 0.9;
  }

  // Interest/reason extraction
  const interestPatterns = [
    /(?:interested in|looking (?:for|into)|want to learn about|curious about|need help with)\s+(.{5,}?)(?:\.|$|\n)/i,
    /(?:here (?:to|for)|checking out)\s+(.{5,}?)(?:\.|$|\n)/i,
  ];
  for (const pattern of interestPatterns) {
    const match = userMessagesText.match(pattern);
    if (match && match[1]) {
      const interest = match[1].trim();
      if (interest.length > 5 && !isCommonWord(interest.split(' ')[0])) {
        data.interest = interest;
        confidence.interest = 0.7;
        break;
      }
    }
  }

  // Extract additional fields based on schema descriptions
  // This is a simple pattern-based approach - production would use AI extraction
  for (const schemaField of config.extractionSchema) {
    const fieldName = schemaField.field;
    const fieldDesc = schemaField.description?.toLowerCase() || '';
    
    // Skip if already extracted
    if (data[fieldName]) continue;
    
    // Extract based on field type and description
    if (schemaField.type === 'enum' && schemaField.options) {
      // For enum fields, look for keywords in the options
      for (const option of schemaField.options) {
        const optionLower = option.toLowerCase().replace(/_/g, ' ');
        if (userMessagesText.toLowerCase().includes(optionLower)) {
          data[fieldName] = option;
          confidence[fieldName] = 0.7;
          break;
        }
      }
    } else if (fieldDesc.includes('lane') || fieldDesc.includes('area of interest') || fieldName === 'lane') {
      // Extract collaboration lane - check for exact matches first, then keywords
      const laneText = userMessagesText.toLowerCase();

      console.log('[Extraction] Looking for lane/area of interest in:', laneText.substring(0, 200));

      // Check for exact phrase matches first (highest confidence)
      if (laneText.includes('product & design') || laneText.includes('product and design')) {
        data[fieldName] = 'product_design';
        confidence[fieldName] = 0.95;
        console.log('[Extraction] ✅ Matched "Product & Design" phrase');
      } else if (laneText.includes('product design')) {
        data[fieldName] = 'product_design';
        confidence[fieldName] = 0.95;
        console.log('[Extraction] ✅ Matched "product design" phrase');
      }

      // Check for exact enum value matches (most reliable)
      if (!data[fieldName] && schemaField.options) {
        for (const option of schemaField.options) {
          const optionLower = String(option).toLowerCase();
          // Check if user message contains the option value or label
          if (laneText.includes(optionLower) ||
              (optionLower === 'engineering' && laneText.match(/\bengineering\b/i)) ||
              (optionLower === 'product_design' && laneText.match(/\b(product|design|ux|ui)\b/i)) ||
              (optionLower === 'integrations' && laneText.match(/\b(integrat|ecosystem|api|webhook)\b/i))) {
            data[fieldName] = option;
            confidence[fieldName] = 0.85; // Higher confidence for enum matches
            console.log(`[Extraction] ✅ Matched enum option: ${option}`);
            break;
          }
        }
      }

      // Fallback to keyword matching if no enum match found
      if (!data[fieldName]) {
        if (laneText.match(/\b(product|design|ux|ui)\b/i)) {
          data[fieldName] = 'product_design';
          confidence[fieldName] = 0.7;
          console.log('[Extraction] ✅ Matched keyword: product/design/ux/ui');
        } else if (laneText.match(/\b(engineer|engineering|code|develop|full.?stack|backend|frontend)\b/i)) {
          data[fieldName] = 'engineering';
          confidence[fieldName] = 0.8; // Higher confidence for "Engineering" exact match
          console.log('[Extraction] ✅ Matched keyword: engineering');
        } else if (laneText.match(/\b(integrat|ecosystem|api|webhook|connector)\b/i)) {
          data[fieldName] = 'integrations';
          confidence[fieldName] = 0.7;
          console.log('[Extraction] ✅ Matched keyword: integrations');
        }
      }

      if (data[fieldName]) {
        console.log(`[Extraction] Lane extracted: ${data[fieldName]} with confidence ${confidence[fieldName]}`);
      } else {
        console.log('[Extraction] ⚠️ No lane match found');
      }
    } else if (fieldDesc.includes('shipped') || fieldDesc.includes('built') || fieldDesc.includes('project') || fieldName === 'shipped') {
      // Extract what they've built - look for project descriptions
      // Split by messages (newlines) to process each user response
      const userResponses = userMessagesText.split('\n').filter(s => s.trim().length > 0);

      // Keywords that indicate they're talking about their work/projects
      const projectKeywords = [
        'built', 'created', 'developed', 'made', 'worked on', 'shipped',
        'launched', 'implemented', 'designed', 'architected', 'led',
        'project', 'app', 'application', 'platform', 'system', 'tool',
        'website', 'service', 'product', 'feature', 'api', 'dashboard',
        'startup', 'company', 'team', 'users', 'customers', 'clients'
      ];

      // Find responses that talk about their projects
      const projectResponses = userResponses.filter(response => {
        const lower = response.toLowerCase();
        // Must be substantial (at least 30 chars) AND contain project keywords
        return response.length > 30 && projectKeywords.some(kw => lower.includes(kw));
      });

      if (projectResponses.length > 0) {
        // Join all project-related responses
        data[fieldName] = projectResponses.join(' ').trim();
        confidence[fieldName] = 0.75;
        console.log('[Extraction] ✅ Extracted shipped/projects:', {
          field: fieldName,
          responseCount: projectResponses.length,
          preview: data[fieldName].substring(0, 100) + '...',
        });
      } else {
        // Fallback: look for any substantial response (might be describing their work)
        const substantialResponses = userResponses.filter(r => r.length > 80);
        if (substantialResponses.length > 0) {
          data[fieldName] = substantialResponses.join(' ').trim();
          confidence[fieldName] = 0.5;
          console.log('[Extraction] ⚠️ Fallback extraction for shipped (long responses)');
        }
      }
    } else if (fieldDesc.includes('why') || fieldDesc.includes('interest') || fieldDesc.includes('drawn') || fieldName === 'whyNetpad') {
      // Extract why they're interested - look for motivation/interest statements
      const userResponses = userMessagesText.split('\n').filter(s => s.trim().length > 0);

      // Keywords that indicate motivation or interest
      const motivationKeywords = [
        'interested', 'because', 'want', 'love', 'excited', 'passionate',
        'curious', 'drawn', 'attracted', 'compelling', 'opportunity',
        'learn', 'grow', 'contribute', 'help', 'solve', 'improve',
        'believe', 'think', 'feel', 'cool', 'awesome', 'interesting',
        'vision', 'mission', 'goal', 'potential', 'impact', 'challenge'
      ];

      // Find responses about motivation/interest
      const motivationResponses = userResponses.filter(response => {
        const lower = response.toLowerCase();
        return response.length > 25 && motivationKeywords.some(kw => lower.includes(kw));
      });

      if (motivationResponses.length > 0) {
        data[fieldName] = motivationResponses.join(' ').trim();
        confidence[fieldName] = 0.7;
        console.log('[Extraction] ✅ Extracted whyNetpad/interest:', {
          field: fieldName,
          responseCount: motivationResponses.length,
          preview: data[fieldName].substring(0, 100) + '...',
        });
      } else {
        // Fallback: any response that's not just a simple answer
        const thoughtfulResponses = userResponses.filter(r =>
          r.length > 50 && !r.match(/^(yes|no|sure|ok|yeah|nope|hi|hello|hey)/i)
        );
        if (thoughtfulResponses.length > 0) {
          data[fieldName] = thoughtfulResponses.join(' ').trim();
          confidence[fieldName] = 0.45;
          console.log('[Extraction] ⚠️ Fallback extraction for whyNetpad (thoughtful responses)');
        }
      }
    } else if (fieldDesc.includes('link') || fieldDesc.includes('github') || fieldDesc.includes('portfolio')) {
      // Extract URLs
      const urlMatch = userMessagesText.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        data[fieldName] = urlMatch[0];
        confidence[fieldName] = 0.8;
      }
    } else if (fieldDesc.includes('location') || fieldDesc.includes('based') || fieldDesc.includes('where')) {
      // Extract location
      const locationMatch = userMessagesText.match(/(?:from|based in|live in|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
      if (locationMatch) {
        data[fieldName] = locationMatch[1];
        confidence[fieldName] = 0.7;
      }
    } else if (fieldDesc.includes('availability') || fieldDesc.includes('time') || fieldDesc.includes('commit') || fieldName === 'availability') {
      // Extract availability - handle various patterns
      const text = userMessagesText.toLowerCase();

      // Check for 10+ hours patterns
      if (text.match(/10\+|10 ?\+|more than 10|over 10|ten\+|ten plus|10 hours|plenty of time|full.?time|a lot of time/i)) {
        data[fieldName] = '10+_hours';
        confidence[fieldName] = 0.8;
        console.log('[Extraction] ✅ Matched availability: 10+_hours');
      }
      // Check for 5-10 hours patterns
      else if (text.match(/5.?10|5 to 10|five.?ten|5-10|moderate|part.?time|several hours|good amount/i)) {
        data[fieldName] = '5-10_hours';
        confidence[fieldName] = 0.75;
        console.log('[Extraction] ✅ Matched availability: 5-10_hours');
      }
      // Check for few hours patterns
      else if (text.match(/few hours|couple hours|2.?4|limited|not much|some time|here and there|when I can/i)) {
        data[fieldName] = 'few_hours';
        confidence[fieldName] = 0.7;
        console.log('[Extraction] ✅ Matched availability: few_hours');
      }
      // Check for "depends" patterns
      else if (text.match(/depends|varies|flexible|it depends|depending on|case by case|project by project/i)) {
        data[fieldName] = 'depends';
        confidence[fieldName] = 0.75;
        console.log('[Extraction] ✅ Matched availability: depends');
      }
    }
  }

  // Calculate overall confidence
  const filledFields = Object.keys(data).length;
  const totalFields = config.extractionSchema.length;
  confidence.overall = filledFields > 0 ? Math.min(0.95, filledFields / totalFields) : 0;

  return { data, confidence };
}
