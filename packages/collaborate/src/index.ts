/**
 * @netpad/collaborate Extension
 *
 * Community collaboration and contribution features for NetPad.
 * This extension provides:
 * - Collaborator intake form and processing
 * - Community gallery of templates and workflows
 * - Contributor leaderboard
 * - Notification system for new submissions
 * - Custom workflow nodes for collaboration automation
 */

import { NextRequest, NextResponse } from 'next/server';
import type { CollaborateService, CollaboratorNotificationPayload } from './types';
import {
  notifyCollaboratorsHandler,
  notifyCollaboratorsDefinition,
} from './nodes';

// Re-export types
export * from './types';

// Re-export nodes for direct access
export * from './nodes';

/**
 * Node handler type (simplified to avoid importing from @/lib)
 */
type NodeHandler = (context: {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  resolvedConfig: Record<string, unknown>;
  inputs: Record<string, unknown>;
  trigger: { type: string; payload?: Record<string, unknown> };
  getConnection: (vaultId: string) => Promise<{ connectionString: string; database: string } | null>;
  getEmailCredentials: (credentialId: string) => Promise<unknown>;
}) => Promise<{
  success: boolean;
  data: Record<string, unknown>;
  error?: { code: string; message: string; retryable: boolean };
  metadata?: { durationMs?: number; bytesProcessed?: number };
}>;

/**
 * Workflow node definition for extension registration
 */
interface ExtensionWorkflowNode {
  definition: {
    type: string;
    label: string;
    description: string;
    category: 'triggers' | 'logic' | 'integrations' | 'actions' | 'data' | 'ai' | 'forms' | 'custom' | 'annotations';
    color: string;
    icon: string;
    version: string;
    configFields?: Array<{
      name: string;
      label: string;
      type: string;
      defaultValue?: unknown;
      placeholder?: string;
      helpText?: string;
      required?: boolean;
      options?: Array<{ label: string; value: string }>;
    }>;
    outputs?: Array<{ id: string; label: string; primary?: boolean }>;
  };
  handler: NodeHandler;
}

/**
 * NetPad Extension interface (matches the core extension types)
 * This is duplicated here to avoid circular dependencies
 */
interface NetPadExtension {
  metadata: {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
  };
  features?: string[];
  routes?: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    handler: (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>;
    requiresAuth?: boolean;
    permissions?: string[];
  }>;
  workflowNodes?: ExtensionWorkflowNode[];
  services?: Record<string, unknown>;
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
}

/**
 * Configuration options for the collaborate extension
 */
export interface CollaborateExtensionConfig {
  /** Email address for notifications */
  notificationEmail?: string;
  /** Resend API key for email notifications */
  resendApiKey?: string;
  /** Base URL for the application */
  baseUrl?: string;
  /** Enable/disable notification emails */
  enableNotifications?: boolean;
}

// Default configuration
let config: CollaborateExtensionConfig = {
  enableNotifications: true,
};

/**
 * Configure the collaborate extension
 */
export function configure(options: CollaborateExtensionConfig): void {
  config = { ...config, ...options };
}

/**
 * Collaborate service implementation
 */
const collaborateService: CollaborateService = {
  async submitApplication(data) {
    // Generate a submission ID
    const submissionId = `collab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // In a real implementation, this would save to the database
    // For now, we return success and let the notification handle the rest
    return {
      success: true,
      submissionId,
      message: 'Thank you for your interest! We will review your application shortly.',
    };
  },

  async getGalleryItems(options = {}) {
    // Placeholder - would fetch from database
    return {
      items: [],
      total: 0,
    };
  },

  async getContributors(options = {}) {
    // Placeholder - would fetch from database
    return {
      contributors: [],
      total: 0,
    };
  },

  async sendNotification(submission) {
    if (!config.enableNotifications || !config.resendApiKey) {
      console.log('[Collaborate] Notifications disabled or not configured');
      return;
    }

    // Would use Resend or similar to send email
    console.log('[Collaborate] Would send notification for:', submission.email);
  },
};

/**
 * Route handlers for the collaborate extension
 */

// GET /api/ext/collaborate/gallery - Get community gallery items
async function handleGetGallery(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as 'template' | 'workflow' | 'integration' | 'app' | undefined;
  const featured = searchParams.get('featured') === 'true';
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const result = await collaborateService.getGalleryItems({
      category: category || undefined,
      featured,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Collaborate] Gallery fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gallery items' },
      { status: 500 }
    );
  }
}

// GET /api/ext/collaborate/contributors - Get contributor leaderboard
async function handleGetContributors(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const result = await collaborateService.getContributors({ limit, offset });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Collaborate] Contributors fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contributors' },
      { status: 500 }
    );
  }
}

// POST /api/ext/collaborate/notify - Send notification for new submission
async function handleNotify(request: NextRequest): Promise<NextResponse> {
  try {
    const payload: CollaboratorNotificationPayload = await request.json();

    // Validate required fields
    if (!payload.name || !payload.email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Log the notification (in production, this would send an email)
    console.log('[Collaborate] New submission notification:', {
      name: payload.name,
      email: payload.email,
      lane: payload.lane,
      conversationId: payload.conversationId,
    });

    // If Resend is configured, send email via API
    if (config.resendApiKey && config.notificationEmail) {
      try {
        const emailHtml = `
          <h2>New Collaborator Application</h2>
          <p><strong>Name:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Lane:</strong> ${payload.lane || 'Not specified'}</p>
          <p><strong>Shipped:</strong> ${payload.shipped || 'Not provided'}</p>
          <p><strong>Why NetPad:</strong> ${payload.whyNetpad || 'Not provided'}</p>
          <p><strong>Availability:</strong> ${payload.availability || 'Not provided'}</p>
          <p><strong>Location:</strong> ${payload.location || 'Not provided'}</p>
          <p><strong>Work Links:</strong> ${payload.workLinks || 'Not provided'}</p>
          ${payload.conversationId ? `<p><strong>Conversation ID:</strong> ${payload.conversationId}</p>` : ''}
          ${payload.turnCount ? `<p><strong>Turn Count:</strong> ${payload.turnCount}</p>` : ''}
        `;

        // Use Resend API directly via fetch to avoid dependency issues
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NetPad <noreply@netpad.io>',
            to: config.notificationEmail,
            subject: `New Collaborator Application: ${payload.name}`,
            html: emailHtml,
          }),
        });

        if (response.ok) {
          console.log('[Collaborate] Notification email sent');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Collaborate] Resend API error:', errorData);
        }
      } catch (emailError) {
        console.error('[Collaborate] Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification processed',
    });
  } catch (error) {
    console.error('[Collaborate] Notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

// POST /api/ext/collaborate/submit - Submit collaboration application
async function handleSubmit(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await request.json();

    const result = await collaborateService.submitApplication({
      name: data.name,
      email: data.email,
      lane: data.lane || 'not_sure',
      shipped: data.shipped,
      whyNetpad: data.whyNetpad,
      availability: data.availability,
      location: data.location,
      workLinks: data.workLinks,
      source: data.source || 'form',
      conversationMeta: data.conversationMeta,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Collaborate] Submit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

/**
 * The collaborate extension definition
 */
export const collaborateExtension: NetPadExtension = {
  metadata: {
    id: 'netpad-collaborate',
    name: 'NetPad Collaborate',
    version: '1.0.0',
    description: 'Community collaboration and contribution features',
    author: 'Michael Lynn',
  },

  // Custom features provided by this extension
  features: [
    'custom:collaborate',
    'custom:community_gallery',
    'custom:contributor_leaderboard',
    'custom:workflow_nodes',
  ],

  // Custom workflow nodes
  workflowNodes: [
    {
      definition: notifyCollaboratorsDefinition,
      handler: notifyCollaboratorsHandler as unknown as NodeHandler,
    },
  ],

  // API routes
  routes: [
    {
      path: '/api/ext/collaborate/gallery',
      method: 'GET',
      handler: handleGetGallery,
      requiresAuth: false,
    },
    {
      path: '/api/ext/collaborate/contributors',
      method: 'GET',
      handler: handleGetContributors,
      requiresAuth: false,
    },
    {
      path: '/api/ext/collaborate/notify',
      method: 'POST',
      handler: handleNotify,
      requiresAuth: false, // Public endpoint for form submissions
    },
    {
      path: '/api/ext/collaborate/submit',
      method: 'POST',
      handler: handleSubmit,
      requiresAuth: false,
    },
  ],

  // Services provided
  services: {
    collaborate: collaborateService,
  },

  // Initialization
  initialize: async () => {
    console.log('[Collaborate] Extension initialized');

    // Load configuration from environment
    if (process.env.COLLABORATE_NOTIFICATION_EMAIL) {
      config.notificationEmail = process.env.COLLABORATE_NOTIFICATION_EMAIL;
    }
    if (process.env.RESEND_API_KEY) {
      config.resendApiKey = process.env.RESEND_API_KEY;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
      config.baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    }
  },

  // Cleanup
  cleanup: async () => {
    console.log('[Collaborate] Extension cleaned up');
  },
};

// Default export for extension loader
export default collaborateExtension;
