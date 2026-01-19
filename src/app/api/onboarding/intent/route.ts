/**
 * Intent Onboarding API
 *
 * POST /api/onboarding/intent - Generate complete application from natural language intent
 *
 * This endpoint orchestrates the full intent-first onboarding flow:
 * 1. Auto-scaffold organization, project, application for the user
 * 2. Generate form + workflow using AI from the user's intent
 * 3. Create the form and workflow in the database
 * 4. Bind the workflow to the form via form-trigger node
 * 5. Return complete result with app URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { autoScaffoldForUser } from '@/lib/platform/organizations';
import { createApplication, getApplication } from '@/lib/platform/applications';
import { getProject } from '@/lib/platform/projects';
import { createApplicationGenerator } from '@/lib/ai/applicationGenerator';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { createWorkflow, updateWorkflow } from '@/lib/workflow/db';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for AI generation

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Stream a progress update to the client
 */
function streamProgress(phase: string, message?: string): string {
  return JSON.stringify({ phase, message }) + '\n';
}

/**
 * Stream the final result to the client
 */
function streamResult(result: any): string {
  return JSON.stringify({ result }) + '\n';
}

/**
 * Stream an error to the client
 */
function streamError(error: string): string {
  return JSON.stringify({ error }) + '\n';
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session.userId || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { intent } = body;

    if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Intent description is required' },
        { status: 400 }
      );
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Phase 1: Scaffolding - Create org, project, app
          controller.enqueue(encoder.encode(streamProgress('scaffolding')));

          const scaffold = await autoScaffoldForUser(
            session.userId!,
            session.email!
          );

          if (!scaffold) {
            controller.enqueue(encoder.encode(streamError('Failed to create workspace')));
            controller.close();
            return;
          }

          const { organization, projectId, applicationId: defaultAppId } = scaffold;

          // Get the project to access its name
          const project = await getProject(projectId);
          if (!project) {
            controller.enqueue(encoder.encode(streamError('Failed to find project')));
            controller.close();
            return;
          }

          // Phase 2: Analyzing - Generate application with AI
          controller.enqueue(encoder.encode(streamProgress('analyzing')));

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            controller.enqueue(encoder.encode(streamError('AI service not configured')));
            controller.close();
            return;
          }

          const generator = createApplicationGenerator(apiKey);
          const generationResult = await generator.generateApplication({
            prompt: intent.trim(),
            options: {
              includeForm: true,
              includeWorkflow: true,
              maxFields: 10,
              maxNodes: 5,
            },
          });

          if (!generationResult.success || !generationResult.application) {
            controller.enqueue(
              encoder.encode(streamError(generationResult.error || 'Failed to generate application'))
            );
            controller.close();
            return;
          }

          const generated = generationResult.application;

          // Create a dedicated application for this generated content
          // (instead of using the default app)
          let application;
          try {
            application = await createApplication({
              projectId,
              organizationId: organization.orgId,
              name: generated.application.name,
              description: generated.application.description,
              color: generated.application.color,
              tags: generated.application.tags,
              createdBy: session.userId!,
            });
          } catch (appError) {
            // If application creation fails (e.g., slug conflict), use default app
            console.warn('[Intent Onboarding] Failed to create dedicated app, using default:', appError);
            application = await getApplication(organization.orgId, defaultAppId);
            if (!application) {
              controller.enqueue(encoder.encode(streamError('Failed to find application')));
              controller.close();
              return;
            }
          }

          // Phase 3: Create form
          controller.enqueue(encoder.encode(streamProgress('form')));

          let formId: string | null = null;
          let formName = 'Generated Form';
          let formFieldCount = 0;

          if (generated.form) {
            const formData = generated.form;
            formName = formData.name || 'Generated Form';
            formFieldCount = formData.fieldConfigs?.length || 0;

            // Generate form ID and slug
            formId = randomBytes(16).toString('hex');
            const formSlug = generateSlug(formName) + '-' + randomBytes(4).toString('hex');

            // Save form to organization database
            const orgFormsCollection = await getOrgFormsCollection(organization.orgId);
            const now = new Date().toISOString();

            await orgFormsCollection.insertOne({
              formId,
              id: formId,
              name: formName,
              description: formData.description || `AI-generated form from: "${intent.substring(0, 100)}"`,
              slug: formSlug,
              organizationId: organization.orgId,
              projectId,
              applicationId: application.applicationId,
              fieldConfigs: formData.fieldConfigs || [],
              variables: [],
              formType: 'data-entry',
              isPublished: false,
              createdBy: session.userId,
              createdAt: now,
              updatedAt: now,
            });
          }

          // Phase 4: Create workflow
          controller.enqueue(encoder.encode(streamProgress('workflow')));

          let workflowId: string | null = null;
          let workflowName = 'Generated Workflow';
          let workflowNodeCount = 0;

          if (generated.workflow) {
            const workflowData = generated.workflow;
            workflowName = workflowData.name || 'Generated Workflow';

            // Create the workflow
            const workflow = await createWorkflow(organization.orgId, session.userId!, {
              name: workflowName,
              description: workflowData.description || `AI-generated workflow from: "${intent.substring(0, 100)}"`,
              tags: ['ai-generated'],
              projectId,
              applicationId: application.applicationId,
            });

            workflowId = workflow.id;

            // Phase 5: Bind workflow to form
            controller.enqueue(encoder.encode(streamProgress('binding')));

            // Build nodes from generated workflow, adding form-trigger if we have a form
            const nodes: any[] = [];
            const edges: any[] = [];
            let yPosition = 100;

            // If we have a form, add a form-trigger node
            if (formId && workflowData.nodes) {
              // Check if there's already a form-trigger in generated nodes
              const hasFormTrigger = workflowData.nodes.some(
                (n: any) => n.type === 'form-trigger' || n.type === 'form_trigger'
              );

              if (!hasFormTrigger) {
                // Add form-trigger as the first node
                const triggerNodeId = `node_trigger_${Date.now()}`;
                nodes.push({
                  id: triggerNodeId,
                  type: 'form-trigger',
                  position: { x: 250, y: yPosition },
                  data: {
                    label: 'Form Submission',
                    config: {
                      formId,
                      formName,
                    },
                  },
                });
                yPosition += 150;

                // Create edge from trigger to first generated node if any
                if (workflowData.nodes.length > 0) {
                  edges.push({
                    id: `edge_trigger_${Date.now()}`,
                    source: triggerNodeId,
                    sourceHandle: 'output',
                    target: `node_0`,
                    targetHandle: 'input',
                  });
                }
              }
            }

            // Add generated nodes with proper IDs
            workflowData.nodes?.forEach((node: any, index: number) => {
              const nodeId = `node_${index}`;
              nodes.push({
                id: nodeId,
                type: node.type,
                position: node.position || { x: 250, y: yPosition },
                data: {
                  label: node.label,
                  config: {
                    ...node.config,
                    // If this is a form-trigger node, bind it to our form
                    ...(node.type === 'form-trigger' && formId ? { formId, formName } : {}),
                  },
                },
              });
              yPosition += 150;
            });

            // Add generated edges with proper IDs
            workflowData.edges?.forEach((edge: any, index: number) => {
              edges.push({
                id: `edge_${index}`,
                source: edge.sourceTempId?.replace('node_', 'node_') || `node_${index}`,
                sourceHandle: edge.sourceHandle || 'output',
                target: edge.targetTempId?.replace('node_', 'node_') || `node_${index + 1}`,
                targetHandle: edge.targetHandle || 'input',
              });
            });

            workflowNodeCount = nodes.length;

            // Update workflow with canvas
            if (nodes.length > 0) {
              await updateWorkflow(organization.orgId, workflowId, session.userId!, {
                canvas: {
                  nodes,
                  edges,
                  viewport: { x: 0, y: 0, zoom: 1 },
                },
                settings: {
                  executionMode: (workflowData.settings?.executionMode as 'sequential' | 'parallel' | 'auto' | 'immediate') || 'sequential',
                  errorHandling: (workflowData.settings?.errorHandling as 'stop' | 'continue' | 'rollback') || 'stop',
                  maxExecutionTime: 300000, // 5 minutes
                  retryPolicy: {
                    maxRetries: 0,
                    initialDelayMs: 1000,
                    backoffMultiplier: 2,
                  },
                  timezone: 'UTC',
                },
              });
            }
          }

          // Build app URL
          const appUrl = `/apps/${application.slug}`;

          // Stream final result
          const result = {
            application: {
              applicationId: application.applicationId,
              name: application.name,
              slug: application.slug,
              description: application.description,
            },
            form: formId
              ? {
                  id: formId,
                  name: formName,
                  fieldCount: formFieldCount,
                }
              : null,
            workflow: workflowId
              ? {
                  id: workflowId,
                  name: workflowName,
                  nodeCount: workflowNodeCount,
                }
              : null,
            appUrl,
          };

          controller.enqueue(encoder.encode(streamProgress('done')));
          controller.enqueue(encoder.encode(streamResult(result)));
          controller.close();
        } catch (error) {
          console.error('[Intent Onboarding] Error:', error);
          controller.enqueue(
            encoder.encode(
              streamError(error instanceof Error ? error.message : 'An unexpected error occurred')
            )
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Intent Onboarding] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
