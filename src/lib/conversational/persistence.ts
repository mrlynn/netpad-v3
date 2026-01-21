/**
 * Conversation State Persistence
 * 
 * Utilities for saving and loading conversation state from MongoDB
 */

import { ConversationState, ConversationSubmission } from '@/types/conversational';
import { getConversationSubmissionsCollection } from '@/lib/platform/db';
import { randomBytes } from 'crypto';
import { getProviderConfigFromEnv } from '@/lib/ai/providers/factory';

/**
 * Save conversation state to database
 */
export async function saveConversationState(
  orgId: string,
  state: ConversationState
): Promise<void> {
  const collection = await getConversationSubmissionsCollection(orgId);

  // Determine status based on conversation state
  let status: 'draft' | 'submitted' | 'abandoned' = 'draft';
  if (state.status === 'completed') {
    status = 'submitted';
  } else if (state.status === 'abandoned') {
    status = 'abandoned';
  }

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
    missingFields: state.progress?.missingRequiredFields || [],
    metadata: {
      startedAt: state.startedAt,
      completedAt: state.completedAt || new Date(),
      turnCount: state.turnCount,
      duration: state.completedAt
        ? Math.floor(
            (state.completedAt.getTime() - state.startedAt.getTime()) / 1000
          )
        : Math.floor((Date.now() - state.startedAt.getTime()) / 1000),
      model: getProviderConfigFromEnv()?.defaultModel || 'unknown',
      provider: (getProviderConfigFromEnv()?.type === 'ollama' ? 'self-hosted' : 'openai') as 'openai' | 'self-hosted',
    },
    submittedAt: state.updatedAt,
    status,
    organizationId: orgId,
    progress: state.progress,
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
 * Mark abandoned conversations instead of deleting them
 *
 * This preserves data for analytics while cleaning up stale drafts.
 */
export async function markAbandonedConversations(
  orgId: string,
  hoursOld: number = 24
): Promise<number> {
  const collection = await getConversationSubmissionsCollection(orgId);

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

  const result = await collection.updateMany(
    {
      status: 'draft',
      submittedAt: { $lt: cutoffDate },
    },
    {
      $set: {
        status: 'abandoned',
        abandonedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

/**
 * Clean up abandoned conversations (older than specified hours)
 * @deprecated Use markAbandonedConversations instead to preserve data for analytics
 */
export async function cleanupAbandonedConversations(
  orgId: string,
  hoursOld: number = 24
): Promise<number> {
  // Now just marks as abandoned instead of deleting
  return markAbandonedConversations(orgId, hoursOld);
}

/**
 * Conversation analytics summary
 */
export interface ConversationAnalytics {
  /** Total conversations started */
  totalConversations: number;
  /** Completed conversations */
  completedConversations: number;
  /** Abandoned conversations (user left before completion) */
  abandonedConversations: number;
  /** Currently active conversations (drafts) */
  activeConversations: number;
  /** Overall completion rate (0-100) */
  completionRate: number;
  /** Average completion percentage across all conversations */
  averageCompletionPercentage: number;
  /** Average turns per conversation */
  averageTurns: number;
  /** Average duration in seconds */
  averageDuration: number;
  /** Average confidence score */
  averageConfidence: number;
  /** Topic drop-off analysis */
  topicDropOff: Array<{
    topicId: string;
    topicName: string;
    startedCount: number;
    completedCount: number;
    dropOffRate: number;
  }>;
  /** Conversations by status */
  byStatus: {
    draft: number;
    submitted: number;
    abandoned: number;
  };
  /** Recent conversations for the list view */
  recentConversations?: ConversationSummary[];
}

/**
 * Summary of a single conversation for list views
 */
export interface ConversationSummary {
  conversationId: string;
  formId: string;
  status: 'draft' | 'submitted' | 'abandoned';
  completionPercentage: number;
  turnCount: number;
  duration: number;
  startedAt: Date;
  updatedAt: Date;
  extractedFields: number;
  topicsCovered: number;
  totalTopics: number;
}

/**
 * Get conversation analytics for an organization
 */
export async function getConversationAnalytics(
  orgId: string,
  options?: {
    formId?: string;
    days?: number;
    includeRecentConversations?: boolean;
    limit?: number;
  }
): Promise<ConversationAnalytics> {
  const collection = await getConversationSubmissionsCollection(orgId);

  const { formId, days = 30, includeRecentConversations = false, limit = 50 } = options || {};

  // Build date filter
  const dateFilter: any = {};
  if (days > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    dateFilter.submittedAt = { $gte: cutoffDate };
  }

  // Build query filter
  const baseFilter: any = { ...dateFilter };
  if (formId) {
    baseFilter.formId = formId;
  }

  // Get counts by status
  const statusCounts = await collection.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]).toArray();

  const byStatus = {
    draft: 0,
    submitted: 0,
    abandoned: 0,
  };
  for (const item of statusCounts) {
    if (item._id === 'draft') byStatus.draft = item.count;
    else if (item._id === 'submitted') byStatus.submitted = item.count;
    else if (item._id === 'abandoned') byStatus.abandoned = item.count;
  }

  const totalConversations = byStatus.draft + byStatus.submitted + byStatus.abandoned;

  // Get aggregate metrics
  const metrics = await collection.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: null,
        avgTurns: { $avg: '$metadata.turnCount' },
        avgDuration: { $avg: '$metadata.duration' },
        avgConfidence: { $avg: '$overallConfidence' },
        // Calculate average completion from topics
        conversations: {
          $push: {
            topicsCovered: '$topicsCovered',
          },
        },
      },
    },
  ]).toArray();

  const aggregateMetrics = metrics[0] || {
    avgTurns: 0,
    avgDuration: 0,
    avgConfidence: 0,
    conversations: [],
  };

  // Calculate average completion percentage from topics
  let totalCompletionPercentage = 0;
  let conversationCount = 0;
  for (const conv of aggregateMetrics.conversations) {
    if (conv.topicsCovered && conv.topicsCovered.length > 0) {
      const requiredTopics = conv.topicsCovered.filter((t: any) => t.priority === 'required');
      const coveredRequired = requiredTopics.filter((t: any) => t.covered);
      if (requiredTopics.length > 0) {
        totalCompletionPercentage += (coveredRequired.length / requiredTopics.length) * 100;
        conversationCount++;
      }
    }
  }

  const averageCompletionPercentage = conversationCount > 0
    ? Math.round(totalCompletionPercentage / conversationCount)
    : 0;

  // Calculate topic drop-off (which topics have lowest completion rates)
  const topicStats = new Map<string, { name: string; started: number; completed: number }>();
  for (const conv of aggregateMetrics.conversations) {
    if (conv.topicsCovered) {
      for (const topic of conv.topicsCovered) {
        const existing = topicStats.get(topic.topicId) || {
          name: topic.name,
          started: 0,
          completed: 0
        };
        existing.started++;
        if (topic.covered) {
          existing.completed++;
        }
        topicStats.set(topic.topicId, existing);
      }
    }
  }

  const topicDropOff = Array.from(topicStats.entries()).map(([topicId, stats]) => ({
    topicId,
    topicName: stats.name,
    startedCount: stats.started,
    completedCount: stats.completed,
    dropOffRate: stats.started > 0
      ? Math.round(((stats.started - stats.completed) / stats.started) * 100)
      : 0,
  })).sort((a, b) => b.dropOffRate - a.dropOffRate);

  // Calculate completion rate
  const completionRate = totalConversations > 0
    ? Math.round((byStatus.submitted / totalConversations) * 100)
    : 0;

  // Get recent conversations if requested
  let recentConversations: ConversationSummary[] | undefined;
  if (includeRecentConversations) {
    const recent = await collection
      .find(baseFilter)
      .sort({ submittedAt: -1 })
      .limit(limit)
      .toArray();

    recentConversations = recent.map((doc) => {
      const topicsCovered = doc.topicsCovered || [];
      const requiredTopics = topicsCovered.filter((t: any) => t.priority === 'required');
      const coveredRequired = requiredTopics.filter((t: any) => t.covered);
      const completionPercentage = requiredTopics.length > 0
        ? Math.round((coveredRequired.length / requiredTopics.length) * 100)
        : 0;

      return {
        conversationId: doc.conversationId,
        formId: doc.formId,
        status: doc.status as 'draft' | 'submitted' | 'abandoned',
        completionPercentage,
        turnCount: doc.metadata?.turnCount || 0,
        duration: doc.metadata?.duration || 0,
        startedAt: doc.metadata?.startedAt || doc.submittedAt,
        updatedAt: doc.submittedAt,
        extractedFields: Object.keys(doc.extractedData || {}).filter(
          (k) => doc.extractedData[k] !== null && doc.extractedData[k] !== undefined
        ).length,
        topicsCovered: topicsCovered.filter((t: any) => t.covered).length,
        totalTopics: topicsCovered.length,
      };
    });
  }

  return {
    totalConversations,
    completedConversations: byStatus.submitted,
    abandonedConversations: byStatus.abandoned,
    activeConversations: byStatus.draft,
    completionRate,
    averageCompletionPercentage,
    averageTurns: Math.round(aggregateMetrics.avgTurns * 10) / 10,
    averageDuration: Math.round(aggregateMetrics.avgDuration),
    averageConfidence: Math.round(aggregateMetrics.avgConfidence * 100) / 100,
    topicDropOff,
    byStatus,
    recentConversations,
  };
}

/**
 * Get a single conversation with full details
 */
export async function getConversationDetails(
  orgId: string,
  conversationId: string
): Promise<ConversationSubmission | null> {
  const collection = await getConversationSubmissionsCollection(orgId);
  const doc = await collection.findOne({ conversationId });
  return doc as ConversationSubmission | null;
}

/**
 * List conversations with filtering and pagination
 */
export async function listConversations(
  orgId: string,
  options?: {
    formId?: string;
    status?: 'draft' | 'submitted' | 'abandoned' | 'all';
    limit?: number;
    offset?: number;
    sortBy?: 'submittedAt' | 'turnCount' | 'duration' | 'confidence';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{ conversations: ConversationSummary[]; total: number }> {
  const collection = await getConversationSubmissionsCollection(orgId);

  const {
    formId,
    status = 'all',
    limit = 50,
    offset = 0,
    sortBy = 'submittedAt',
    sortOrder = 'desc',
  } = options || {};

  // Build filter
  const filter: any = {};
  if (formId) {
    filter.formId = formId;
  }
  if (status !== 'all') {
    filter.status = status;
  }

  // Build sort
  const sort: any = {};
  if (sortBy === 'turnCount') {
    sort['metadata.turnCount'] = sortOrder === 'asc' ? 1 : -1;
  } else if (sortBy === 'duration') {
    sort['metadata.duration'] = sortOrder === 'asc' ? 1 : -1;
  } else if (sortBy === 'confidence') {
    sort.overallConfidence = sortOrder === 'asc' ? 1 : -1;
  } else {
    sort.submittedAt = sortOrder === 'asc' ? 1 : -1;
  }

  // Get total count
  const total = await collection.countDocuments(filter);

  // Get paginated results
  const docs = await collection
    .find(filter)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .toArray();

  const conversations: ConversationSummary[] = docs.map((doc) => {
    const topicsCovered = doc.topicsCovered || [];
    const requiredTopics = topicsCovered.filter((t: any) => t.priority === 'required');
    const coveredRequired = requiredTopics.filter((t: any) => t.covered);
    const completionPercentage = requiredTopics.length > 0
      ? Math.round((coveredRequired.length / requiredTopics.length) * 100)
      : 0;

    return {
      conversationId: doc.conversationId,
      formId: doc.formId,
      status: doc.status as 'draft' | 'submitted' | 'abandoned',
      completionPercentage,
      turnCount: doc.metadata?.turnCount || 0,
      duration: doc.metadata?.duration || 0,
      startedAt: doc.metadata?.startedAt || doc.submittedAt,
      updatedAt: doc.submittedAt,
      extractedFields: Object.keys(doc.extractedData || {}).filter(
        (k) => doc.extractedData[k] !== null && doc.extractedData[k] !== undefined
      ).length,
      topicsCovered: topicsCovered.filter((t: any) => t.covered).length,
      totalTopics: topicsCovered.length,
    };
  });

  return { conversations, total };
}
