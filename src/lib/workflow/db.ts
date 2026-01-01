/**
 * Workflow Database Operations
 *
 * Manages workflow-related collections in both platform and org databases.
 */

import { Collection, ObjectId } from 'mongodb';
import { getPlatformDb, getOrgDb } from '@/lib/platform/db';
import {
  WorkflowDocument,
  WorkflowExecution,
  ExecutionLog,
  WorkflowJob,
  NodeDefinition,
} from '@/types/workflow';

// ============================================
// COLLECTION ACCESSORS
// ============================================

/**
 * Get workflows collection for an organization
 */
export async function getWorkflowsCollection(orgId: string): Promise<Collection<WorkflowDocument>> {
  const db = await getOrgDb(orgId);
  return db.collection<WorkflowDocument>('workflows');
}

/**
 * Get workflow executions collection (platform-level)
 */
export async function getExecutionsCollection(): Promise<Collection<WorkflowExecution>> {
  const db = await getPlatformDb();
  return db.collection<WorkflowExecution>('workflow_executions');
}

/**
 * Get execution logs collection (platform-level)
 */
export async function getExecutionLogsCollection(): Promise<Collection<ExecutionLog>> {
  const db = await getPlatformDb();
  return db.collection<ExecutionLog>('workflow_execution_logs');
}

/**
 * Get workflow jobs collection (platform-level queue)
 */
export async function getJobsCollection(): Promise<Collection<WorkflowJob>> {
  const db = await getPlatformDb();
  return db.collection<WorkflowJob>('workflow_jobs');
}

/**
 * Get node definitions collection (platform-level)
 */
export async function getNodeDefinitionsCollection(): Promise<Collection<NodeDefinition>> {
  const db = await getPlatformDb();
  return db.collection<NodeDefinition>('node_definitions');
}

// ============================================
// INDEX CREATION
// ============================================

/**
 * Create workflow-related indexes
 * Call this during application startup
 */
export async function createWorkflowIndexes(): Promise<void> {
  const platformDb = await getPlatformDb();

  try {
    // Workflow executions collection
    const executions = platformDb.collection('workflow_executions');
    await executions.createIndex({ workflowId: 1, startedAt: -1 });
    await executions.createIndex({ orgId: 1, status: 1 });
    await executions.createIndex({ status: 1, startedAt: 1 });
    await executions.createIndex({ completedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30-day TTL

    // Execution logs collection
    const logs = platformDb.collection('workflow_execution_logs');
    await logs.createIndex({ executionId: 1, timestamp: 1 });
    await logs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

    // Workflow jobs collection (queue)
    const jobs = platformDb.collection('workflow_jobs');
    await jobs.createIndex({ status: 1, runAt: 1, priority: -1 });
    await jobs.createIndex({ lockedAt: 1 }, { expireAfterSeconds: 300 }); // Auto-unlock stale
    await jobs.createIndex({ orgId: 1, status: 1 });
    await jobs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup

    // Node definitions collection
    const nodeDefs = platformDb.collection('node_definitions');
    await nodeDefs.createIndex({ type: 1, version: 1 }, { unique: true });
    await nodeDefs.createIndex({ category: 1 });
    await nodeDefs.createIndex({ orgId: 1 }); // null for global

    console.log('[Workflow DB] Platform indexes created successfully');
  } catch (error) {
    console.log('[Workflow DB] Platform index creation completed (some may already exist)');
  }
}

/**
 * Create workflow indexes for an organization database
 */
export async function createOrgWorkflowIndexes(orgId: string): Promise<void> {
  const db = await getOrgDb(orgId);

  try {
    // Workflows collection
    const workflows = db.collection('workflows');
    await workflows.createIndex({ id: 1 }, { unique: true });
    await workflows.createIndex({ slug: 1 }, { unique: true });
    await workflows.createIndex({ status: 1 });
    await workflows.createIndex({ tags: 1 });
    await workflows.createIndex({ updatedAt: -1 });
    await workflows.createIndex({ createdBy: 1 });

    console.log(`[Workflow DB] Org indexes created for ${orgId}`);
  } catch (error) {
    console.log(`[Workflow DB] Org index creation completed for ${orgId}`);
  }
}

// ============================================
// WORKFLOW CRUD OPERATIONS
// ============================================

import { nanoid } from 'nanoid';
import {
  DEFAULT_WORKFLOW_SETTINGS,
  DEFAULT_WORKFLOW_STATS,
  createEmptyCanvas,
  generateSlug,
} from '@/types/workflow';

/**
 * Create a new workflow
 */
export async function createWorkflow(
  orgId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    tags?: string[];
  }
): Promise<WorkflowDocument> {
  const collection = await getWorkflowsCollection(orgId);

  const now = new Date();
  const id = `wf_${nanoid(12)}`;
  let slug = generateSlug(data.name);

  // Ensure unique slug
  const existingSlug = await collection.findOne({ slug });
  if (existingSlug) {
    slug = `${slug}-${nanoid(4)}`;
  }

  const workflow: WorkflowDocument = {
    id,
    orgId,
    name: data.name,
    description: data.description,
    slug,
    canvas: createEmptyCanvas(),
    settings: { ...DEFAULT_WORKFLOW_SETTINGS },
    variables: [],
    status: 'draft',
    version: 1,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    lastModifiedBy: userId,
    stats: { ...DEFAULT_WORKFLOW_STATS },
  };

  await collection.insertOne(workflow);
  return workflow;
}

/**
 * Get workflow by ID
 */
export async function getWorkflowById(
  orgId: string,
  workflowId: string
): Promise<WorkflowDocument | null> {
  const collection = await getWorkflowsCollection(orgId);
  return collection.findOne({ id: workflowId });
}

/**
 * Get workflow by slug
 */
export async function getWorkflowBySlug(
  orgId: string,
  slug: string
): Promise<WorkflowDocument | null> {
  const collection = await getWorkflowsCollection(orgId);
  return collection.findOne({ slug });
}

/**
 * List workflows for an organization
 */
export async function listWorkflows(
  orgId: string,
  options: {
    status?: string;
    tags?: string[];
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ workflows: WorkflowDocument[]; total: number }> {
  const collection = await getWorkflowsCollection(orgId);
  const {
    status,
    tags,
    page = 1,
    pageSize = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = options;

  // Build query
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (tags && tags.length > 0) query.tags = { $in: tags };

  // Get total count
  const total = await collection.countDocuments(query);

  // Get paginated results
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const workflows = await collection
    .find(query)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return { workflows, total };
}

/**
 * Update workflow
 */
export async function updateWorkflow(
  orgId: string,
  workflowId: string,
  userId: string,
  updates: Partial<Omit<WorkflowDocument, '_id' | 'id' | 'orgId' | 'createdAt' | 'createdBy'>>
): Promise<WorkflowDocument | null> {
  const collection = await getWorkflowsCollection(orgId);

  const result = await collection.findOneAndUpdate(
    { id: workflowId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
        lastModifiedBy: userId,
      },
      $inc: { version: 1 },
    },
    { returnDocument: 'after' }
  );

  return result;
}

/**
 * Delete workflow
 */
export async function deleteWorkflow(
  orgId: string,
  workflowId: string
): Promise<boolean> {
  const collection = await getWorkflowsCollection(orgId);
  const result = await collection.deleteOne({ id: workflowId });
  return result.deletedCount === 1;
}

/**
 * Update workflow status
 */
export async function updateWorkflowStatus(
  orgId: string,
  workflowId: string,
  userId: string,
  status: WorkflowDocument['status']
): Promise<WorkflowDocument | null> {
  const collection = await getWorkflowsCollection(orgId);

  const updates: Partial<WorkflowDocument> = {
    status,
    updatedAt: new Date(),
    lastModifiedBy: userId,
  };

  // If activating, set publishedVersion
  if (status === 'active') {
    const current = await collection.findOne({ id: workflowId });
    if (current) {
      updates.publishedVersion = current.version;
    }
  }

  const result = await collection.findOneAndUpdate(
    { id: workflowId },
    { $set: updates },
    { returnDocument: 'after' }
  );

  return result;
}

// ============================================
// EXECUTION OPERATIONS
// ============================================

/**
 * Create a new execution record
 */
export async function createExecution(
  workflowId: string,
  orgId: string,
  trigger: WorkflowExecution['trigger'],
  workflowVersion: number
): Promise<WorkflowExecution> {
  const collection = await getExecutionsCollection();

  const execution: WorkflowExecution = {
    workflowId,
    workflowVersion,
    orgId,
    trigger,
    status: 'pending',
    startedAt: new Date(),
    completedNodes: [],
    failedNodes: [],
    skippedNodes: [],
    context: {
      variables: {},
      nodeOutputs: {},
      errors: [],
    },
    metrics: {
      totalDurationMs: 0,
      nodeMetrics: {},
    },
  };

  const result = await collection.insertOne(execution);
  return { ...execution, _id: result.insertedId };
}

/**
 * Get execution by ID
 */
export async function getExecutionById(
  executionId: string
): Promise<WorkflowExecution | null> {
  const collection = await getExecutionsCollection();
  return collection.findOne({ _id: new ObjectId(executionId) });
}

/**
 * Update execution status
 */
export async function updateExecutionStatus(
  executionId: string,
  updates: Partial<WorkflowExecution>
): Promise<WorkflowExecution | null> {
  const collection = await getExecutionsCollection();

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(executionId) },
    { $set: updates },
    { returnDocument: 'after' }
  );

  return result;
}

/**
 * List executions for a workflow
 */
export async function listExecutions(
  workflowId: string,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<WorkflowExecution[]> {
  const collection = await getExecutionsCollection();
  const { status, limit = 50, offset = 0 } = options;

  const query: Record<string, unknown> = { workflowId };
  if (status) query.status = status;

  return collection
    .find(query)
    .sort({ startedAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();
}

// ============================================
// EXECUTION LOGGING
// ============================================

/**
 * Add execution log entry
 */
export async function addExecutionLog(
  executionId: string,
  nodeId: string,
  level: ExecutionLog['level'],
  event: ExecutionLog['event'],
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  const collection = await getExecutionLogsCollection();

  const log: ExecutionLog = {
    executionId,
    nodeId,
    timestamp: new Date(),
    level,
    event,
    message,
    data,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  await collection.insertOne(log);
}

/**
 * Get logs for an execution
 */
export async function getExecutionLogs(
  executionId: string,
  options: {
    nodeId?: string;
    level?: string;
    limit?: number;
  } = {}
): Promise<ExecutionLog[]> {
  const collection = await getExecutionLogsCollection();
  const { nodeId, level, limit = 1000 } = options;

  const query: Record<string, unknown> = { executionId };
  if (nodeId) query.nodeId = nodeId;
  if (level) query.level = level;

  return collection
    .find(query)
    .sort({ timestamp: 1 })
    .limit(limit)
    .toArray();
}

// ============================================
// JOB QUEUE OPERATIONS
// ============================================

/**
 * Enqueue a workflow job
 */
export async function enqueueJob(
  job: Omit<WorkflowJob, '_id' | 'status' | 'attempts' | 'createdAt' | 'expiresAt'>
): Promise<string> {
  const collection = await getJobsCollection();

  const fullJob: WorkflowJob = {
    ...job,
    status: 'pending',
    attempts: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  const result = await collection.insertOne(fullJob);
  return result.insertedId.toString();
}

/**
 * Claim next available job (with distributed locking)
 */
export async function claimJob(workerId: string): Promise<WorkflowJob | null> {
  const collection = await getJobsCollection();
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 min

  const job = await collection.findOneAndUpdate(
    {
      status: { $in: ['pending', 'processing'] },
      runAt: { $lte: now },
      $or: [
        { lockedAt: { $exists: false } },
        { lockedAt: { $lt: staleThreshold } },
      ],
    },
    {
      $set: {
        status: 'processing',
        lockedAt: now,
        lockedBy: workerId,
      },
      $inc: { attempts: 1 },
    },
    {
      sort: { priority: -1, runAt: 1 },
      returnDocument: 'after',
    }
  );

  return job;
}

/**
 * Mark job as complete
 */
export async function completeJob(
  jobId: string | ObjectId,
  result?: unknown
): Promise<void> {
  const collection = await getJobsCollection();
  const id = typeof jobId === 'string' ? new ObjectId(jobId) : jobId;

  await collection.updateOne(
    { _id: id },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        result,
      },
      $unset: { lockedAt: 1, lockedBy: 1 },
    }
  );
}

/**
 * Mark job as failed (with retry logic)
 */
export async function failJob(
  jobId: string | ObjectId,
  error: string,
  retryable: boolean = true
): Promise<void> {
  const collection = await getJobsCollection();
  const id = typeof jobId === 'string' ? new ObjectId(jobId) : jobId;

  const job = await collection.findOne({ _id: id });
  if (!job) return;

  const maxAttempts = job.maxAttempts || 3;
  const shouldRetry = retryable && job.attempts < maxAttempts;
  const backoffMs = Math.pow(2, job.attempts) * 1000;

  if (shouldRetry) {
    await collection.updateOne(
      { _id: id },
      {
        $set: {
          status: 'pending',
          lastError: error,
          runAt: new Date(Date.now() + backoffMs),
        },
        $unset: { lockedAt: 1, lockedBy: 1 },
      }
    );
  } else {
    await collection.updateOne(
      { _id: id },
      {
        $set: {
          status: 'failed',
          lastError: error,
        },
      }
    );
  }
}

/**
 * Get pending job count for an organization (for rate limiting)
 */
export async function getPendingJobCount(orgId: string): Promise<number> {
  const collection = await getJobsCollection();
  return collection.countDocuments({
    orgId,
    status: { $in: ['pending', 'processing'] },
  });
}

/**
 * Check if organization can enqueue more jobs
 */
export async function canEnqueueJob(
  orgId: string,
  maxPending: number = 100
): Promise<boolean> {
  const count = await getPendingJobCount(orgId);
  return count < maxPending;
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: string): Promise<WorkflowJob | null> {
  const collection = await getJobsCollection();
  return collection.findOne({ _id: new ObjectId(jobId) });
}

/**
 * Get job by execution ID
 */
export async function getJobByExecutionId(executionId: string): Promise<WorkflowJob | null> {
  const collection = await getJobsCollection();
  return collection.findOne({ executionId });
}

/**
 * Retry a failed or stuck job immediately
 * Resets the job to pending status with runAt set to now
 */
export async function retryJob(jobId: string): Promise<WorkflowJob | null> {
  const collection = await getJobsCollection();
  const id = new ObjectId(jobId);

  const job = await collection.findOne({ _id: id });
  if (!job) return null;

  // Only allow retry for failed, pending (stuck), or processing (stale) jobs
  if (!['failed', 'pending', 'processing'].includes(job.status)) {
    return null;
  }

  const result = await collection.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: 'pending',
        runAt: new Date(),
        lastError: job.lastError ? `Manually retried. Previous error: ${job.lastError}` : undefined,
      },
      $unset: { lockedAt: 1, lockedBy: 1 },
    },
    { returnDocument: 'after' }
  );

  return result;
}

/**
 * Cancel a pending or processing job
 */
export async function cancelJob(jobId: string): Promise<WorkflowJob | null> {
  const collection = await getJobsCollection();
  const id = new ObjectId(jobId);

  const job = await collection.findOne({ _id: id });
  if (!job) return null;

  // Only allow cancel for pending or processing jobs
  if (!['pending', 'processing'].includes(job.status)) {
    return null;
  }

  const result = await collection.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: 'failed',
        lastError: 'Cancelled by user',
        completedAt: new Date(),
      },
      $unset: { lockedAt: 1, lockedBy: 1 },
    },
    { returnDocument: 'after' }
  );

  // Also update the execution status
  if (result) {
    await updateExecutionStatus(job.executionId, {
      status: 'failed',
      completedAt: new Date(),
      result: {
        success: false,
        error: {
          nodeId: 'system',
          code: 'CANCELLED',
          message: 'Cancelled by user',
          timestamp: new Date(),
        },
      },
    });
  }

  return result;
}

/**
 * Get job queue status for an organization
 */
export async function getJobQueueStatus(orgId: string): Promise<{
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  oldestPendingAt: Date | null;
}> {
  const collection = await getJobsCollection();

  const [counts, oldestPending] = await Promise.all([
    collection.aggregate([
      { $match: { orgId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray(),
    collection.findOne(
      { orgId, status: 'pending' },
      { sort: { createdAt: 1 } }
    ),
  ]);

  const statusCounts = {
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
  };

  for (const item of counts) {
    if (item._id in statusCounts) {
      statusCounts[item._id as keyof typeof statusCounts] = item.count;
    }
  }

  return {
    ...statusCounts,
    oldestPendingAt: oldestPending?.createdAt || null,
  };
}

// ============================================
// WORKFLOW STATS UPDATES
// ============================================

/**
 * Update workflow stats after execution
 */
export async function updateWorkflowStats(
  orgId: string,
  workflowId: string,
  success: boolean,
  durationMs: number
): Promise<void> {
  const collection = await getWorkflowsCollection(orgId);

  const workflow = await collection.findOne({ id: workflowId });
  if (!workflow) return;

  const { stats } = workflow;
  const newTotal = stats.totalExecutions + 1;
  const newAvg = ((stats.avgExecutionTimeMs * stats.totalExecutions) + durationMs) / newTotal;

  await collection.updateOne(
    { id: workflowId },
    {
      $set: {
        'stats.totalExecutions': newTotal,
        'stats.successfulExecutions': success ? stats.successfulExecutions + 1 : stats.successfulExecutions,
        'stats.failedExecutions': success ? stats.failedExecutions : stats.failedExecutions + 1,
        'stats.avgExecutionTimeMs': Math.round(newAvg),
        'stats.lastExecutedAt': new Date(),
      },
    }
  );
}
