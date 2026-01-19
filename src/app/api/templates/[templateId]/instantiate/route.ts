/**
 * Template Instantiation API
 *
 * POST /api/templates/[templateId]/instantiate
 *
 * Creates a new Application from a gallery template, including:
 * - Application with source='template' and sourceTemplateId set
 * - Form created from the template, attached to the application
 * - Optional workflow(s) if the template suggests them
 *
 * This endpoint bridges the gap between the Template Gallery and the
 * Application publishing workflow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { loadGalleryTemplate, loadWorkflowTemplate } from '@/lib/templates/loader';
import { createApplication } from '@/lib/platform/applications';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getWorkflowsCollection } from '@/lib/workflow/db';
import { generateSecureId } from '@/lib/encryption';
import { getUserOrgPermissions } from '@/lib/platform/permissions';
import { getProject, listProjects, createProject } from '@/lib/platform/projects';
import type { FormConfiguration, FormType } from '@/types/form';
import type { WorkflowDocument, WorkflowNode, WorkflowEdge } from '@/types/workflow';

export const dynamic = 'force-dynamic';

interface InstantiateRequest {
  organizationId: string;
  projectId: string;
  // Optional overrides
  applicationName?: string;
  formName?: string;
  includeWorkflows?: boolean; // Default: true (per user preference)
}

interface InstantiateResponse {
  success: boolean;
  applicationId: string;
  applicationSlug: string;
  formId: string;
  workflowIds?: string[];
  redirectUrl: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const session = await getSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: InstantiateRequest = await request.json();
    const { organizationId, projectId, applicationName, formName, includeWorkflows = true } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Check user has permission in the organization
    const permissions = await getUserOrgPermissions(session.userId, organizationId);
    if (!permissions.orgRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Check user can create applications (owner, admin, or member with create permission)
    if (!['owner', 'admin', 'member'].includes(permissions.orgRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create applications' },
        { status: 403 }
      );
    }

    // Load the gallery template
    const template = loadGalleryTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Template not found: ${templateId}` },
        { status: 404 }
      );
    }

    // Resolve projectId - use provided, find existing, or create new
    let resolvedProjectId = projectId;

    if (!projectId) {
      // No project provided - try to find existing or create one
      const projectsResult = await listProjects(organizationId);

      if (projectsResult.projects.length > 0) {
        // Use first existing project
        resolvedProjectId = projectsResult.projects[0].projectId;
      } else {
        // Create a default project
        const newProject = await createProject({
          organizationId,
          name: 'My Project',
          description: 'Default project created for template apps',
          environment: 'dev',
          createdBy: session.userId,
        });
        resolvedProjectId = newProject.projectId;
      }
    } else {
      // Verify provided project exists
      const project = await getProject(projectId);
      if (!project) {
        return NextResponse.json(
          { error: `Project not found: ${projectId}` },
          { status: 404 }
        );
      }
    }

    // 1. Create the Application
    const appName = applicationName || template.name;
    const application = await createApplication({
      projectId: resolvedProjectId,
      organizationId,
      name: appName,
      description: template.shortDescription,
      icon: template.icon,
      createdBy: session.userId,
    });

    // Update application with source tracking
    const applicationsCollection = await import('@/lib/platform/db').then(m => m.getApplicationsCollection(organizationId));
    await applicationsCollection.updateOne(
      { applicationId: application.applicationId },
      {
        $set: {
          source: 'template',
          sourceTemplateId: templateId,
        },
      }
    );

    // 2. Create the Form from the template
    const formsCollection = await getOrgFormsCollection(organizationId);
    const formId = generateSecureId('form');
    const now = new Date();

    // Map template formType to valid FormType
    const mapFormType = (templateFormType: string | undefined): FormType | undefined => {
      switch (templateFormType) {
        case 'data-entry': return 'data-entry';
        case 'search': return 'search';
        case 'both': return 'both';
        case 'hybrid': return 'both';
        case 'conversational': return 'conversational';
        default: return 'data-entry';
      }
    };

    // Convert template fieldConfigs to form fieldConfigs
    const formConfig: FormConfiguration = {
      id: formId,
      name: formName || template.name,
      description: template.fullDescription,
      collection: generateCollectionName(template.name),
      database: '', // Will be set when user connects a data source
      fieldConfigs: template.fieldConfigs,
      formType: mapFormType(template.formType),
      conversationalConfig: template.conversationalConfig,
      organizationId,
      projectId: resolvedProjectId,
      applicationId: application.applicationId,
      createdBy: session.userId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isPublished: false,
      theme: template.theme,
    };

    // Store the form with formId as the primary identifier
    await formsCollection.insertOne({
      ...formConfig,
      formId,
    });

    // 3. Optionally create workflows from template suggestions
    const workflowIds: string[] = [];

    if (includeWorkflows && template.enhanced?.workflowPairings && template.enhanced.workflowPairings.length > 0) {
      const workflowsCollection = await getWorkflowsCollection(organizationId);

      for (const pairing of template.enhanced.workflowPairings) {
        // Try to find a matching workflow template
        const workflowTemplateId = mapWorkflowPairingToTemplate(pairing.title);

        if (workflowTemplateId) {
          const workflowTemplate = loadWorkflowTemplate(workflowTemplateId);

          if (workflowTemplate) {
            const workflowId = generateSecureId('wf');
            const workflowSlug = generateSlug(`${template.id}-${pairing.title}`);

            // Convert simplified template nodes to full WorkflowNode format
            const nodes: WorkflowNode[] = workflowTemplate.nodes.map((node, index) => ({
              id: `node-${index}`,
              type: node.type,
              position: node.position,
              config: {}, // Empty config - user will configure
              label: node.label,
              enabled: true,
            }));

            // Convert simplified template edges to full WorkflowEdge format
            const edges: WorkflowEdge[] = workflowTemplate.edges.map((edge, index) => ({
              id: `edge-${index}`,
              source: `node-${edge.source}`,
              sourceHandle: 'output',
              target: `node-${edge.target}`,
              targetHandle: 'input',
            }));

            const workflow: WorkflowDocument = {
              id: workflowId,
              orgId: organizationId,
              projectId: resolvedProjectId,
              applicationId: application.applicationId,
              name: pairing.title,
              description: pairing.description,
              slug: workflowSlug,
              canvas: {
                nodes,
                edges,
                viewport: { x: 0, y: 0, zoom: 1 },
              },
              settings: {
                executionMode: 'sequential',
                maxExecutionTime: 300000,
                retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelayMs: 1000 },
                errorHandling: 'stop',
                timezone: 'UTC',
              },
              variables: [],
              status: 'draft',
              version: 1,
              tags: ['template', templateId],
              createdAt: now,
              updatedAt: now,
              createdBy: session.userId,
              lastModifiedBy: session.userId,
              stats: {
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                avgExecutionTimeMs: 0,
              },
            };

            await workflowsCollection.insertOne(workflow);
            workflowIds.push(workflowId);
          }
        }
      }
    }

    // 4. Update application stats
    const { calculateApplicationStats } = await import('@/lib/platform/applications');
    await calculateApplicationStats(organizationId, application.applicationId);

    // Build redirect URL to the form editor within the application context
    const redirectUrl = `/apps/${application.slug}/forms/${formId}/edit`;

    const response: InstantiateResponse = {
      success: true,
      applicationId: application.applicationId,
      applicationSlug: application.slug,
      formId,
      workflowIds: workflowIds.length > 0 ? workflowIds : undefined,
      redirectUrl,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('[Template Instantiate] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to instantiate template' },
      { status: 500 }
    );
  }
}

/**
 * Generate a MongoDB-friendly collection name from the template name
 */
function generateCollectionName(templateName: string): string {
  return templateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

/**
 * Generate a URL-friendly slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Map workflow pairing titles to actual workflow template IDs
 */
function mapWorkflowPairingToTemplate(pairingTitle: string): string | null {
  const titleLower = pairingTitle.toLowerCase();

  // Common mappings based on workflow template names
  if (titleLower.includes('email') && titleLower.includes('notification')) {
    return 'form-notification';
  }
  if (titleLower.includes('email')) {
    return 'form-to-email';
  }
  if (titleLower.includes('mongodb') || titleLower.includes('database') || titleLower.includes('save')) {
    return 'form-to-mongodb';
  }
  if (titleLower.includes('webhook')) {
    return 'webhook-processor';
  }
  if (titleLower.includes('classification') || titleLower.includes('categoriz')) {
    return 'ai-classification';
  }
  if (titleLower.includes('extract')) {
    return 'ai-extraction';
  }
  if (titleLower.includes('routing') || titleLower.includes('conditional')) {
    return 'conditional-routing';
  }
  if (titleLower.includes('sync') || titleLower.includes('schedule')) {
    return 'scheduled-sync';
  }
  if (titleLower.includes('pipeline') || titleLower.includes('transform')) {
    return 'data-pipeline';
  }
  if (titleLower.includes('batch')) {
    return 'batch-processing';
  }
  if (titleLower.includes('monitor') || titleLower.includes('api')) {
    return 'api-monitoring';
  }

  return null;
}

