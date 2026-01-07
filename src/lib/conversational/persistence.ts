/**
 * Conversation State Persistence
 * 
 * Utilities for saving and loading conversation state from MongoDB
 */

import { ConversationState, ConversationSubmission } from '@/types/conversational';
import { getConversationSubmissionsCollection } from '@/lib/platform/db';
import { randomBytes } from 'crypto';

/**
 * Save conversation state to database
 */
export async function saveConversationState(
  orgId: string,
  state: ConversationState
): Promise<void> {
  const collection = await getConversationSubmissionsCollection(orgId);

  // Store as draft submission (status: 'draft')
  const draftSubmission: ConversationSubmission = {
    id: `draft_${state.conversationId}`,
    formId: state.formId,
    conversationId: state.conversationId,
    transcript: state.messages,
    extractedData: state.partialExtractions,
    fieldConfidence: {}, // Will be populated on completion
    overallConfidence: state.confidence,
    topicsCovered: state.topics,
    missingFields: [],
    metadata: {
      startedAt: state.startedAt,
      completedAt: state.completedAt || new Date(),
      turnCount: state.turnCount,
      duration: state.completedAt
        ? Math.floor(
            (state.completedAt.getTime() - state.startedAt.getTime()) / 1000
          )
        : Math.floor((Date.now() - state.startedAt.getTime()) / 1000),
      model: 'gpt-4o-mini', // TODO: Get from provider
      provider: 'openai' as const,
    },
    submittedAt: state.updatedAt,
    status: state.status === 'completed' ? 'submitted' : 'draft',
    organizationId: orgId,
  };

  // Upsert based on conversationId
  await collection.updateOne(
    { conversationId: state.conversationId },
    { $set: draftSubmission },
    { upsert: true }
  );
}

/**
 * Load conversation state from database
 */
export async function loadConversationState(
  orgId: string,
  conversationId: string,
  formId?: string
): Promise<ConversationState | null> {
  const collection = await getConversationSubmissionsCollection(orgId);

  const query: any = {
    conversationId,
    status: 'draft',
  };
  if (formId) {
    query.formId = formId;
  }

  const draft = await collection.findOne(query);

  if (!draft) {
    return null;
  }

  // Reconstruct state from draft
  // Ensure dates are Date objects (MongoDB may return them as strings or Date objects)
  const state: ConversationState = {
    conversationId: draft.conversationId,
    formId: draft.formId,
    messages: draft.transcript.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp ? (msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)) : undefined,
    })),
    topics: draft.topicsCovered || [],
    partialExtractions: draft.extractedData || {},
    confidence: draft.overallConfidence || 0,
    turnCount: draft.metadata.turnCount || 0,
    maxTurns: 15, // TODO: Load from form config
    status: draft.status === 'submitted' ? 'completed' : 'active',
    startedAt: draft.metadata.startedAt instanceof Date 
      ? draft.metadata.startedAt 
      : new Date(draft.metadata.startedAt),
    updatedAt: draft.submittedAt instanceof Date 
      ? draft.submittedAt 
      : new Date(draft.submittedAt),
    completedAt: draft.status === 'submitted' && draft.metadata.completedAt
      ? (draft.metadata.completedAt instanceof Date 
          ? draft.metadata.completedAt 
          : new Date(draft.metadata.completedAt))
      : undefined,
  };

  return state;
}

/**
 * Delete conversation state (cleanup abandoned conversations)
 */
export async function deleteConversationState(
  orgId: string,
  conversationId: string
): Promise<void> {
  const collection = await getConversationSubmissionsCollection(orgId);

  await collection.deleteOne({
    conversationId,
    status: 'draft',
  });
}

/**
 * List active conversations for a form
 */
export async function listActiveConversations(
  orgId: string,
  formId: string
): Promise<ConversationState[]> {
  const collection = await getConversationSubmissionsCollection(orgId);

  const drafts = await collection
    .find({
      formId,
      status: 'draft',
    })
    .sort({ submittedAt: -1 })
    .toArray();

  return drafts.map((draft) => ({
    conversationId: draft.conversationId,
    formId: draft.formId,
    messages: draft.transcript.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
    })),
    topics: draft.topicsCovered || [],
    partialExtractions: draft.extractedData || {},
    confidence: draft.overallConfidence || 0,
    turnCount: draft.metadata.turnCount || 0,
    maxTurns: 15, // TODO: Load from form config
    status: 'active',
    startedAt: draft.metadata.startedAt,
    updatedAt: draft.submittedAt,
  }));
}

/**
 * Clean up abandoned conversations (older than specified hours)
 */
export async function cleanupAbandonedConversations(
  orgId: string,
  hoursOld: number = 24
): Promise<number> {
  const collection = await getConversationSubmissionsCollection(orgId);

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

  const result = await collection.deleteMany({
    status: 'draft',
    submittedAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
}
