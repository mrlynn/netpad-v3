/**
 * Public Workflow Execution API Route
 *
 * POST /api/workflows/public/[workflowSlug]/execute - Public workflow execution endpoint
 * 
 * This endpoint allows public execution of workflows via slug, with optional token authentication.
 * Used for embedding workflows in external applications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getOrgDb } from '@/lib/platform/db';
import {
  getWorkflowBySlug,
  createExecution,
  enqueueJob,
  canEnqueueJob,
} from '@/lib/workflow/db';
import { incrementWorkflowExecutionAtQueue } from '@/lib/platform/billing';
import { WorkflowDocument } from '@/types/workflow';

interface RouteParams {
  params: Promise<{ workflowSlug: string }>;
}

/**
 * Hash a token for comparison (same as API keys)
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Find workflow by slug across all organizations
 * This is needed for public access since we don't know the orgId
 */
async function findWorkflowBySlugPublic(slug: string): Promise<WorkflowDocument | null> {
  const { getOrganizationsCollection } = await import('@/lib/platform/db');
  const { getOrgDb } = await import('@/lib/platform/db');
  
  // Get all organizations from platform DB
  const orgsCollection = await getOrganizationsCollection();
  const orgs = await orgsCollection.find({}).toArray();
  
  // Search each org's workflow collection
  for (const org of orgs) {
    try {
      const orgDb = await getOrgDb(org.orgId);
      const workflowsCollection = orgDb.collection<WorkflowDocument>('workflows');
      const workflow = await workflowsCollection.findOne({ 
        slug,
        status: 'active', // Only active workflows can be executed publicly
      });
      
      if (workflow) {
        return workflow;
      }
    } catch (error) {
      // Skip orgs that don't have a database yet
      console.warn(`[Public Workflow] Could not search org ${org.orgId}:`, error);
      continue;
    }
  }
  
  return null;
}

/**
 * Validate execution token if provided
 */
function validateExecutionToken(
  workflow: WorkflowDocument,
  providedToken?: string
): boolean {
  const embedSettings = workflow.settings.embedSettings;
  
  // If no embed settings, workflow is not configured for public execution
  if (!embedSettings || !embedSettings.allowPublicExecution) {
    return false;
  }
  
  // If no token is required, allow execution
  if (!embedSettings.executionToken) {
    return true;
  }
  
  // If token is required but not provided, deny
  if (!providedToken) {
    return false;
  }
  
  // Compare hashed tokens
  const providedHash = hashToken(providedToken);
  const storedHash = embedSettings.executionToken;
  
  return providedHash === storedHash;
}

/**
 * POST /api/workflows/public/[workflowSlug]/execute
 * Public workflow execution endpoint
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workflowSlug } = await params;
    const body = await request.json().catch(() => ({}));
    const { token, payload } = body;

    // Find workflow by slug (search across all orgs)
    const workflow = await findWorkflowBySlugPublic(workflowSlug);
    
    if (!workflow) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Workflow not found or not available for public execution',
          code: 'WORKFLOW_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Validate execution token if workflow requires it
    if (!validateExecutionToken(workflow, token)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing execution token',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      );
    }

    // Check if workflow is active
    if (workflow.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: `Workflow is not active (status: ${workflow.status})`,
          code: 'WORKFLOW_NOT_ACTIVE'
        },
        { status: 400 }
      );
    }

    // Check pending job queue limits
    const canEnqueue = await canEnqueueJob(workflow.orgId, 100);
    if (!canEnqueue) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many pending executions. Please wait for some to complete.',
          code: 'QUEUE_FULL',
        },
        { status: 429 }
      );
    }

    // Check rate limiting if configured
    const embedSettings = workflow.settings.embedSettings;
    if (embedSettings?.rateLimit) {
      // TODO: Implement rate limiting per workflow
      // For now, we'll rely on the queue limit check
    }

    // Increment usage at queue time to enforce limits
    const usageLimit = await incrementWorkflowExecutionAtQueue(workflow.orgId, workflow.id);
    if (!usageLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: usageLimit.reason || 'Monthly workflow execution limit reached',
          code: 'LIMIT_EXCEEDED',
          usage: {
            current: usageLimit.current,
            limit: usageLimit.limit,
            remaining: usageLimit.remaining,
          },
        },
        { status: 429 }
      );
    }

    // Get client IP and user agent for tracking
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create execution record
    const execution = await createExecution(
      workflow.id,
      workflow.orgId,
      {
        type: 'api',
        payload: payload || {},
        source: {
          ip: clientIP,
          userAgent,
        },
      },
      workflow.version
    );

    const executionId = execution._id!.toString();

    // Queue the job for processing
    await enqueueJob({
      workflowId: workflow.id,
      executionId,
      orgId: workflow.orgId,
      priority: 1,
      trigger: {
        type: 'api',
        payload: payload || {},
        source: {
          ip: clientIP,
        },
      },
      runAt: new Date(),
      maxAttempts: workflow.settings.retryPolicy.maxRetries + 1,
    });

    return NextResponse.json({
      success: true,
      executionId,
      status: 'queued',
      message: 'Workflow execution queued',
    });
  } catch (error) {
    console.error('Error executing public workflow:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute workflow',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
