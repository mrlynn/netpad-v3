/**
 * Terminal Completions API
 * 
 * GET /api/terminal/completions
 * Returns entity names for tab completion in the terminal
 * 
 * POST /api/terminal/completions
 * Returns path-based completions for the current context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgDb } from '@/lib/platform/db';
import { getUserOrganizations } from '@/lib/platform/organizations';
import { listProjects } from '@/lib/platform/projects';
import { listApplications } from '@/lib/platform/applications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ forms: [], workflows: [], templates: [] });
    }

    // Get user's first organization
    const userOrgs = await getUserOrganizations(session.userId);
    if (userOrgs.length === 0) {
      return NextResponse.json({ forms: [], workflows: [], templates: [] });
    }

    const orgId = userOrgs[0].orgId;
    const db = await getOrgDb(orgId);

    // Fetch names of forms, workflows, and templates (limit to 50 each for performance)
    const [forms, workflows, templates] = await Promise.all([
      db.collection('forms')
        .find({}, { projection: { name: 1, formId: 1 } })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray(),
      db.collection('workflows')
        .find({}, { projection: { name: 1 } })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray(),
      db.collection('templates')
        .find({}, { projection: { name: 1 } })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray(),
    ]);

    return NextResponse.json({
      forms: forms.map(f => f.name || f.formId || String(f._id)).filter(Boolean),
      workflows: workflows.map(w => w.name || String(w._id)).filter(Boolean),
      templates: templates.map(t => t.name || String(t._id)).filter(Boolean),
    });
  } catch (error) {
    console.error('[Terminal Completions] Error:', error);
    return NextResponse.json({ forms: [], workflows: [], templates: [] });
  }
}

/**
 * Get path-based completions for filesystem navigation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ completions: [] });
    }

    const { path, partial } = await request.json();
    const segments = (path || '/').split('/').filter(Boolean);
    const depth = segments.length;
    
    const userOrgs = await getUserOrganizations(session.userId);
    const completions: string[] = [];

    // Root level - complete organization names
    if (depth === 0) {
      const matches = userOrgs
        .map(o => o.name)
        .filter(name => !partial || name.toLowerCase().startsWith(partial.toLowerCase()));
      return NextResponse.json({ completions: matches.map(m => m + '/') });
    }

    // Org level - complete project names
    if (depth === 1) {
      const org = userOrgs.find(o => o.name === segments[0] || o.orgId === segments[0]);
      if (org) {
        const result = await listProjects(org.orgId);
        const matches = result.projects
          .map((p: { name: string }) => p.name)
          .filter((name: string) => !partial || name.toLowerCase().startsWith(partial.toLowerCase()));
        return NextResponse.json({ completions: matches.map((m: string) => m + '/') });
      }
    }

    // Project level - complete application names
    if (depth === 2) {
      const org = userOrgs.find(o => o.name === segments[0] || o.orgId === segments[0]);
      if (org) {
        const result = await listProjects(org.orgId);
        const project = result.projects.find((p: { name: string; projectId: string }) => 
          p.name === segments[1] || p.projectId === segments[1]
        );
        if (project) {
          const appsResult = await listApplications(org.orgId, project.projectId);
          const matches = appsResult.applications
            .map((a: { name: string }) => a.name)
            .filter((name: string) => !partial || name.toLowerCase().startsWith(partial.toLowerCase()));
          return NextResponse.json({ completions: matches.map((m: string) => m + '/') });
        }
      }
    }

    // App level - complete category names
    if (depth === 3) {
      const categories = ['forms', 'workflows', 'templates', 'data'];
      const matches = categories.filter(c => !partial || c.startsWith(partial.toLowerCase()));
      return NextResponse.json({ completions: matches.map(m => m + '/') });
    }

    // Category level - complete item names
    if (depth === 4) {
      const org = userOrgs.find(o => o.name === segments[0] || o.orgId === segments[0]);
      if (org) {
        const db = await getOrgDb(org.orgId);
        const category = segments[3];
        
        if (category === 'forms') {
          const forms = await db.collection('forms')
            .find({}, { projection: { name: 1, formId: 1 } })
            .limit(50)
            .toArray();
          const matches = forms
            .map(f => f.name || f.formId || String(f._id))
            .filter(Boolean)
            .filter(name => !partial || name.toLowerCase().startsWith(partial.toLowerCase()));
          return NextResponse.json({ completions: matches });
        }
        
        if (category === 'workflows') {
          const workflows = await db.collection('workflows')
            .find({}, { projection: { name: 1 } })
            .limit(50)
            .toArray();
          const matches = workflows
            .map(w => w.name || String(w._id))
            .filter(Boolean)
            .filter(name => !partial || name.toLowerCase().startsWith(partial.toLowerCase()));
          return NextResponse.json({ completions: matches });
        }
        
        if (category === 'data') {
          const collections = await db.listCollections().toArray();
          const matches = collections
            .map(c => c.name)
            .filter(name => !name.startsWith('system.'))
            .filter(name => !partial || name.toLowerCase().startsWith(partial.toLowerCase()));
          return NextResponse.json({ completions: matches.map(m => m + '/') });
        }
      }
    }

    return NextResponse.json({ completions });
  } catch (error) {
    console.error('[Terminal Completions] Error:', error);
    return NextResponse.json({ completions: [] });
  }
}
