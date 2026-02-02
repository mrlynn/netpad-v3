/**
 * Moltboard Webhook Endpoint
 * 
 * Receives webhook events from Moltboard for bidirectional sync.
 * Events: task.created, task.updated, task.moved, task.deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlatformDb } from '@/lib/platform/db';
import crypto from 'crypto';

// Webhook event types
type MoltboardEventType =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.deleted'
  | 'task.comment_added'
  | 'board.updated';

interface MoltboardWebhookPayload {
  event: MoltboardEventType;
  timestamp: string;
  tenantId: string;
  data: {
    task?: {
      id: string;
      boardId: string;
      columnId: string;
      title: string;
      description?: string;
      labels?: string[];
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
      createdBy?: string;
      updatedAt: string;
    };
    board?: {
      id: string;
      name: string;
    };
    previousColumnId?: string; // For task.moved
    changes?: Record<string, unknown>; // For task.updated
  };
}

/**
 * Verify webhook signature (if configured)
 */
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string | null
): boolean {
  if (!secret) return true; // No verification if secret not configured
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-moltboard-signature');
    
    // Get webhook secret from environment (optional)
    const webhookSecret = process.env.MOLTBOARD_WEBHOOK_SECRET;
    
    // Verify signature if secret is configured
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload: MoltboardWebhookPayload = JSON.parse(rawBody);

    console.log('[Moltboard Webhook] Received event:', payload.event, {
      tenantId: payload.tenantId,
      taskId: payload.data.task?.id,
    });

    const db = await getPlatformDb();

    // Store webhook event for processing
    await db.collection('moltboard_webhook_events').insertOne({
      event: payload.event,
      tenantId: payload.tenantId,
      data: payload.data,
      timestamp: new Date(payload.timestamp),
      processedAt: null,
      status: 'pending',
      createdAt: new Date(),
    });

    // Process event based on type
    switch (payload.event) {
      case 'task.created':
        await handleTaskCreated(db, payload);
        break;

      case 'task.updated':
        await handleTaskUpdated(db, payload);
        break;

      case 'task.moved':
        await handleTaskMoved(db, payload);
        break;

      case 'task.deleted':
        await handleTaskDeleted(db, payload);
        break;

      default:
        console.log('[Moltboard Webhook] Unhandled event type:', payload.event);
    }

    return NextResponse.json({ success: true, event: payload.event });
  } catch (error) {
    console.error('[Moltboard Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * Handle task.created event
 * Could trigger workflows or update linked submissions
 */
async function handleTaskCreated(db: Awaited<ReturnType<typeof getPlatformDb>>, payload: MoltboardWebhookPayload) {
  const task = payload.data.task;
  if (!task) return;

  // Check if this task is linked to a form submission
  const submission = await db.collection('submissions').findOne({
    'metadata.moltboard.taskId': task.id,
  });

  if (submission) {
    // Update submission with task creation confirmation
    await db.collection('submissions').updateOne(
      { _id: submission._id },
      {
        $set: {
          'metadata.moltboard.synced': true,
          'metadata.moltboard.syncedAt': new Date(),
          'metadata.moltboard.taskTitle': task.title,
          'metadata.moltboard.columnId': task.columnId,
        },
      }
    );
  }

  // TODO: Trigger any workflows listening for Moltboard task events
  console.log('[Moltboard Webhook] Task created:', task.id);
}

/**
 * Handle task.updated event
 */
async function handleTaskUpdated(db: Awaited<ReturnType<typeof getPlatformDb>>, payload: MoltboardWebhookPayload) {
  const task = payload.data.task;
  if (!task) return;

  // Update linked submission if exists
  const submission = await db.collection('submissions').findOne({
    'metadata.moltboard.taskId': task.id,
  });

  if (submission) {
    await db.collection('submissions').updateOne(
      { _id: submission._id },
      {
        $set: {
          'metadata.moltboard.lastUpdated': new Date(),
          'metadata.moltboard.taskTitle': task.title,
          'metadata.moltboard.columnId': task.columnId,
          'metadata.moltboard.priority': task.priority,
        },
      }
    );
  }

  console.log('[Moltboard Webhook] Task updated:', task.id);
}

/**
 * Handle task.moved event (column change)
 */
async function handleTaskMoved(db: Awaited<ReturnType<typeof getPlatformDb>>, payload: MoltboardWebhookPayload) {
  const task = payload.data.task;
  const previousColumnId = payload.data.previousColumnId;
  if (!task) return;

  // Update linked submission with new column
  const submission = await db.collection('submissions').findOne({
    'metadata.moltboard.taskId': task.id,
  });

  if (submission) {
    await db.collection('submissions').updateOne(
      { _id: submission._id },
      {
        $set: {
          'metadata.moltboard.columnId': task.columnId,
          'metadata.moltboard.previousColumnId': previousColumnId,
          'metadata.moltboard.movedAt': new Date(),
        },
      }
    );
  }

  console.log('[Moltboard Webhook] Task moved:', task.id, {
    from: previousColumnId,
    to: task.columnId,
  });
}

/**
 * Handle task.deleted event
 */
async function handleTaskDeleted(db: Awaited<ReturnType<typeof getPlatformDb>>, payload: MoltboardWebhookPayload) {
  const task = payload.data.task;
  if (!task) return;

  // Mark linked submission as having deleted task
  const submission = await db.collection('submissions').findOne({
    'metadata.moltboard.taskId': task.id,
  });

  if (submission) {
    await db.collection('submissions').updateOne(
      { _id: submission._id },
      {
        $set: {
          'metadata.moltboard.taskDeleted': true,
          'metadata.moltboard.deletedAt': new Date(),
        },
        $unset: {
          'metadata.moltboard.taskId': '',
        },
      }
    );
  }

  console.log('[Moltboard Webhook] Task deleted:', task.id);
}

/**
 * GET endpoint for webhook verification (Moltboard may send a verification request)
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge');
  
  if (challenge) {
    // Return challenge for webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Moltboard webhook endpoint',
    supportedEvents: [
      'task.created',
      'task.updated',
      'task.moved',
      'task.deleted',
    ],
  });
}
