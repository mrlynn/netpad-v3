/**
 * Form Bundle Export API
 * 
 * GET /api/forms/[formId]/bundle
 * Export form + linked workflows + theme as a portable bundle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getFormById } from '@/lib/storage';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, ensureSessionId } from '@/lib/session';
import { cleanFormForExport, createManifest, createBundleExport } from '@/lib/templates/export';
import { getOrgFormsCollection } from '@/lib/platform/db';
import { getWorkflowsCollection, findWorkflowsForForm } from '@/lib/workflow/db';
import { checkFormPermission } from '@/lib/platform/permissions';
import { BundleExport } from '@/types/template';

export const dynamic = 'force-dynamic';

/**
 * GET /api/forms/[formId]/bundle
 * Export form bundle (form + workflows + theme)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const format = searchParams.get('format') || 'json'; // 'json' or 'zip'
    
    let form: any;
    let workflows: any[] = [];
    
    // Try platform-based access first (if orgId provided)
    if (orgId) {
      const session = await getSession();
      if (!session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Check permissions
      const permission = await checkFormPermission(
        session.userId,
        orgId,
        formId,
        'export'
      );
      
      if (!permission.allowed) {
        return NextResponse.json(
          { error: permission.reason || 'Permission denied' },
          { status: 403 }
        );
      }
      
      // Get form from organization database
      const collection = await getOrgFormsCollection(orgId);
      const formDoc = await collection.findOne({
        $or: [{ formId }, { slug: formId }],
      });
      
      if (!formDoc) {
        return NextResponse.json(
          { error: 'Form not found' },
          { status: 404 }
        );
      }
      
      form = {
        ...formDoc,
        id: formDoc.formId,
      };
      
      // Find linked workflows (if any)
      try {
        const workflowsCollection = await getWorkflowsCollection(orgId);
        // For now, we don't have a direct link, so we'll include workflows that reference this form
        // This is a placeholder - in the future, forms and workflows could be explicitly linked
        workflows = [];
      } catch (error) {
        console.warn('Could not fetch workflows:', error);
        workflows = [];
      }
    } else {
      // Fallback to session-based storage (legacy)
      const session = await getIronSession(await cookies(), sessionOptions);
      const sessionId = ensureSessionId(session);
      
      form = await getFormById(sessionId, formId);
      
      if (!form) {
        return NextResponse.json(
          { error: 'Form not found' },
          { status: 404 }
        );
      }
      
      // Legacy storage doesn't support workflows yet
      workflows = [];
    }
    
    // Clean form for export
    const formDefinition = cleanFormForExport(form);
    
    // Clean workflows for export (if any)
    const workflowDefinitions = workflows.map(wf => 
      require('@/lib/templates/export').cleanWorkflowForExport(wf)
    );
    
    // Create manifest
    const manifest = createManifest(
      form.name || 'Exported Form',
      '1.0.0',
      {
        description: form.description,
        forms: [formDefinition],
        workflows: workflowDefinitions.length > 0 ? workflowDefinitions : undefined,
        theme: form.theme,
        tags: ['exported'],
      }
    );
    
    // Create bundle
    const bundle = createBundleExport(
      manifest,
      [formDefinition],
      workflowDefinitions.length > 0 ? workflowDefinitions : undefined,
      form.theme
    );
    
    // Return JSON bundle
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        bundle,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${form.name || 'form'}-bundle.json"`,
        },
      });
    }
    
    // ZIP format (requires additional library - for future implementation)
    return NextResponse.json(
      { error: 'ZIP format not yet implemented. Use format=json' },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Error exporting form bundle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export form bundle' },
      { status: 500 }
    );
  }
}
