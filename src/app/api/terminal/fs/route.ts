/**
 * Terminal Filesystem API
 * 
 * Provides filesystem-like operations for the NetPad terminal
 * POST /api/terminal/fs - Route based on 'action' field
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getOrgDb } from '@/lib/platform/db';
import { getUserOrganizations } from '@/lib/platform/organizations';
import { listProjects } from '@/lib/platform/projects';
import { listApplications } from '@/lib/platform/applications';
import { validateAPIKey } from '@/lib/api/keys';
import { WithId, Document, ObjectId } from 'mongodb';

/**
 * Authenticate request via session or API key
 * Returns userId if authenticated, null otherwise
 */
async function authenticateRequest(request: NextRequest): Promise<{ userId: string; orgId?: string } | null> {
  // First try session auth
  const session = await getSession();
  if (session?.userId) {
    return { userId: session.userId };
  }

  // Try API key auth via Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7);
    const validKey = await validateAPIKey(apiKey);
    if (validKey) {
      return { 
        userId: validKey.createdBy, 
        orgId: validKey.organizationId 
      };
    }
  }

  return null;
}

export const dynamic = 'force-dynamic';

/**
 * Collections that should NOT be exposed via the terminal.
 * These are internal/system collections that users shouldn't access directly.
 */
const BLOCKED_COLLECTION_PREFIXES = [
  'system.',      // MongoDB system collections
  'audit_',       // Audit logs
  'logs',         // Application logs
  '_migrations',  // Database migrations
  '_metadata',    // Internal metadata
  'sessions',     // User sessions
  'tokens',       // Auth tokens
  'api_keys',     // API keys
  'webhooks',     // Webhook configs
  'internal_',    // Internal data
  'platform_',    // Platform data
  'admin_',       // Admin data
  'config',       // Configuration
  'settings',     // Settings
];

/**
 * Check if a collection name is blocked (internal/system)
 */
function isBlockedCollection(collectionName: string): boolean {
  const name = collectionName.toLowerCase();
  return BLOCKED_COLLECTION_PREFIXES.some(prefix => 
    name.startsWith(prefix) || name === prefix.replace('_', '')
  );
}

interface FSRequest {
  action: 'validate' | 'ls' | 'cat' | 'tree' | 'find' | 'grep' | 'create' | 'move' | 'copy' | 'tail' | 'head';
  path: string;
  long?: boolean;
  all?: boolean;
  depth?: number;
  pattern?: string;
  format?: 'json' | 'raw' | 'formatted';
  source?: string;
  destination?: string;
  name?: string;
  lines?: number;
  options?: {
    ignoreCase?: boolean;
    recursive?: boolean;
  };
}

interface PathContext {
  orgId?: string;
  orgName?: string;
  projectId?: string;
  projectName?: string;
  appId?: string;
  appName?: string;
  category?: string;
  itemName?: string;
}

// Parse path and extract context
function parsePath(path: string): { segments: string[]; context: PathContext } {
  const segments = path.split('/').filter(Boolean);
  const context: PathContext = {};
  
  if (segments[0]) context.orgName = segments[0];
  if (segments[1]) context.projectName = segments[1];
  if (segments[2]) context.appName = segments[2];
  if (segments[3]) context.category = segments[3];
  if (segments[4]) context.itemName = segments[4];
  
  return { segments, context };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate via session or API key
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = auth;
    const body: FSRequest = await request.json();
    const { action, path } = body;
    const { segments, context } = parsePath(path);
    const depth = segments.length;

    // Get user's organizations
    const userOrgs = await getUserOrganizations(userId);
    
    switch (action) {
      case 'validate':
        return handleValidate(depth, segments, context, userOrgs, userId);
      
      case 'ls':
        return handleLs(depth, segments, context, userOrgs, userId, body.long, body.all);
      
      case 'cat':
        return handleCat(depth, segments, context, userOrgs, userId, body.format);
      
      case 'tree':
        return handleTree(depth, segments, context, userOrgs, userId, body.depth || 2);
      
      case 'find':
        return handleFind(depth, segments, context, userOrgs, userId, body.pattern || '');
      
      case 'grep':
        return handleGrep(depth, segments, context, userOrgs, userId, body.pattern || '', body.options);
      
      case 'create':
        return handleCreate(depth, segments, context, userOrgs, userId, body.name);
      
      case 'move':
        return handleMoveOrCopy('move', body.source, body.destination, userOrgs, userId);
      
      case 'copy':
        return handleMoveOrCopy('copy', body.source, body.destination, userOrgs, userId);
      
      case 'tail':
        return handleTailOrHead('tail', depth, segments, context, userOrgs, userId, body.lines || 10);
      
      case 'head':
        return handleTailOrHead('head', depth, segments, context, userOrgs, userId, body.lines || 10);
      
      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('[Terminal FS] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal error' 
    });
  }
}

/**
 * Validate a path exists and get its type
 */
async function handleValidate(
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string
) {
  // Root is always valid
  if (depth === 0) {
    return NextResponse.json({ valid: true, isDirectory: true, context: {} });
  }
  
  // Check org exists
  const org = userOrgs.find(o => o.name === context.orgName || o.orgId === context.orgName);
  if (!org) {
    return NextResponse.json({ valid: false, isDirectory: false });
  }
  
  if (depth === 1) {
    return NextResponse.json({ 
      valid: true, 
      isDirectory: true, 
      context: { orgId: org.orgId, orgName: org.name } 
    });
  }
  
  // Check project exists
  const projectsResult = await listProjects(org.orgId);
  const project = projectsResult.projects.find((p: { name: string; projectId: string }) => 
    p.name === context.projectName || p.projectId === context.projectName
  );
  if (!project) {
    return NextResponse.json({ valid: false, isDirectory: false });
  }
  
  if (depth === 2) {
    return NextResponse.json({ 
      valid: true, 
      isDirectory: true,
      context: { orgId: org.orgId, orgName: org.name, projectId: project.projectId, projectName: project.name }
    });
  }
  
  // Check application exists
  const appsResult = await listApplications(org.orgId, project.projectId);
  const app = appsResult.applications.find((a: { name: string; applicationId: string }) => 
    a.name === context.appName || a.applicationId === context.appName
  );
  if (!app) {
    return NextResponse.json({ valid: false, isDirectory: false });
  }
  
  if (depth === 3) {
    return NextResponse.json({ 
      valid: true, 
      isDirectory: true,
      context: { 
        orgId: org.orgId, 
        orgName: org.name, 
        projectId: project.projectId, 
        projectName: project.name,
        appId: app.applicationId,
        appName: app.name,
      }
    });
  }
  
  // Check category
  const validCategories = ['forms', 'workflows', 'templates', 'data'];
  if (!validCategories.includes(context.category || '')) {
    return NextResponse.json({ valid: false, isDirectory: false });
  }
  
  if (depth === 4) {
    return NextResponse.json({ valid: true, isDirectory: true, context });
  }
  
  // Check item exists
  const db = await getOrgDb(org.orgId);
  const collection = context.category === 'data' ? context.itemName! : context.category!;
  
  if (context.category === 'data') {
    // Block access to internal collections
    if (isBlockedCollection(context.itemName || '')) {
      return NextResponse.json({ valid: false, isDirectory: false, error: 'Access denied' });
    }
    // Check if collection exists
    const collections = await db.listCollections({ name: context.itemName }).toArray();
    if (collections.length === 0) {
      return NextResponse.json({ valid: false, isDirectory: false });
    }
    return NextResponse.json({ valid: true, isDirectory: true, context });
  }
  
  // Check form/workflow/template exists
  const itemQuery: Record<string, unknown>[] = [
    { name: context.itemName },
    { formId: context.itemName },
  ];
  if (ObjectId.isValid(context.itemName!)) {
    itemQuery.push({ _id: new ObjectId(context.itemName) });
  }
  const item = await db.collection(collection).findOne({ $or: itemQuery });
  
  return NextResponse.json({ 
    valid: !!item, 
    isDirectory: false,
    context,
  });
}

/**
 * List directory contents
 */
async function handleLs(
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string,
  long?: boolean,
  all?: boolean
) {
  const entries: Array<{ name: string; type: string; metadata?: Record<string, unknown> }> = [];
  
  // Root - list orgs
  if (depth === 0) {
    for (const org of userOrgs) {
      entries.push({ name: org.name, type: 'org' });
    }
    return NextResponse.json({ success: true, entries });
  }
  
  // Find the org
  const org = userOrgs.find(o => o.name === context.orgName || o.orgId === context.orgName);
  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' });
  }
  
  // Org level - list projects
  if (depth === 1) {
    const projectsResult = await listProjects(org.orgId);
    for (const proj of projectsResult.projects) {
      entries.push({ 
        name: proj.name, 
        type: 'project',
        metadata: long ? { updatedAt: proj.updatedAt } : undefined,
      });
    }
    return NextResponse.json({ success: true, entries });
  }
  
  // Find project
  const projectsResult2 = await listProjects(org.orgId);
  const project = projectsResult2.projects.find((p: { name: string; projectId: string }) => 
    p.name === context.projectName || p.projectId === context.projectName
  );
  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' });
  }
  
  // Project level - list applications
  if (depth === 2) {
    const appsResult = await listApplications(org.orgId, project.projectId);
    for (const application of appsResult.applications) {
      entries.push({ 
        name: application.name, 
        type: 'application',
        metadata: long ? { updatedAt: application.updatedAt } : undefined,
      });
    }
    return NextResponse.json({ success: true, entries });
  }
  
  // Find application
  const appsResult2 = await listApplications(org.orgId, project.projectId);
  const app = appsResult2.applications.find((a: { name: string; applicationId: string }) => 
    a.name === context.appName || a.applicationId === context.appName
  );
  if (!app) {
    return NextResponse.json({ success: false, error: 'Application not found' });
  }
  
  // Application level - list categories
  if (depth === 3) {
    entries.push({ name: 'forms', type: 'directory' });
    entries.push({ name: 'workflows', type: 'directory' });
    entries.push({ name: 'templates', type: 'directory' });
    entries.push({ name: 'data', type: 'directory' });
    return NextResponse.json({ success: true, entries });
  }
  
  const db = await getOrgDb(org.orgId);
  
  // Category level - list items
  if (depth === 4) {
    if (context.category === 'forms') {
      const forms = await db.collection('forms')
        .find({ applicationId: app.applicationId })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      
      for (const form of forms) {
        entries.push({
          name: form.name || form.formId || String(form._id),
          type: 'form',
          metadata: long ? { 
            updatedAt: form.updatedAt,
            fieldCount: form.fieldConfigs?.length || 0,
          } : undefined,
        });
      }
    } else if (context.category === 'workflows') {
      const workflows = await db.collection('workflows')
        .find({ applicationId: app.applicationId })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      
      for (const wf of workflows) {
        entries.push({
          name: wf.name || String(wf._id),
          type: 'workflow',
          metadata: long ? { 
            updatedAt: wf.updatedAt,
            nodeCount: wf.nodes?.length || 0,
          } : undefined,
        });
      }
    } else if (context.category === 'templates') {
      const templates = await db.collection('templates')
        .find({})
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      
      for (const tpl of templates) {
        entries.push({
          name: tpl.name || String(tpl._id),
          type: 'template',
          metadata: long ? { updatedAt: tpl.updatedAt } : undefined,
        });
      }
    } else if (context.category === 'data') {
      // Only show user-facing data collections, not internal/system collections
      const collections = await db.listCollections().toArray();
      for (const col of collections) {
        if (!isBlockedCollection(col.name)) {
          entries.push({ name: col.name, type: 'collection' });
        }
      }
    }
    
    return NextResponse.json({ success: true, entries });
  }
  
  // Collection level (data) - list documents
  if (depth === 5 && context.category === 'data') {
    // Block access to internal collections
    if (isBlockedCollection(context.itemName || '')) {
      return NextResponse.json({ success: false, error: 'Access denied: internal collection' });
    }
    
    const docs = await db.collection(context.itemName!)
      .find({})
      .limit(50)
      .toArray();
    
    for (const doc of docs) {
      entries.push({
        name: String(doc._id),
        type: 'document',
        metadata: long ? { updatedAt: doc.updatedAt || doc.createdAt } : undefined,
      });
    }
    return NextResponse.json({ success: true, entries });
  }
  
  return NextResponse.json({ success: true, entries });
}

/**
 * Show item details
 */
async function handleCat(
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string,
  format?: 'json' | 'raw' | 'formatted'
) {
  if (depth < 5) {
    return NextResponse.json({ success: false, error: 'cat: Is a directory' });
  }
  
  const org = userOrgs.find(o => o.name === context.orgName || o.orgId === context.orgName);
  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' });
  }
  
  const db = await getOrgDb(org.orgId);
  
  if (context.category === 'forms') {
    const form = await db.collection('forms').findOne({
      $or: [
        { name: context.itemName },
        { formId: context.itemName },
      ]
    });
    
    if (!form) {
      return NextResponse.json({ success: false, error: 'Form not found' });
    }
    
    // JSON format - return raw data
    if (format === 'json') {
      return NextResponse.json({ success: true, output: JSON.stringify(form, null, 2), data: form });
    }
    
    const output = [
      `\x1b[1m\x1b[36m${form.name || 'Untitled Form'}\x1b[0m`,
      '',
      `\x1b[90mID:\x1b[0m          ${form.formId || form._id}`,
      `\x1b[90mCreated:\x1b[0m     ${form.createdAt ? new Date(form.createdAt).toLocaleString() : 'Unknown'}`,
      `\x1b[90mUpdated:\x1b[0m     ${form.updatedAt ? new Date(form.updatedAt).toLocaleString() : 'Unknown'}`,
      `\x1b[90mFields:\x1b[0m      ${form.fieldConfigs?.length || 0}`,
      `\x1b[90mPublished:\x1b[0m   ${form.isPublished ? 'Yes' : 'No'}`,
    ];
    
    if (form.description) {
      output.push(`\x1b[90mDescription:\x1b[0m ${form.description}`);
    }
    
    if (form.fieldConfigs?.length > 0) {
      output.push('', '\x1b[33mFields:\x1b[0m');
      form.fieldConfigs.slice(0, 10).forEach((f: { label?: string; type?: string }, i: number) => {
        output.push(`  ${i + 1}. ${f.label || 'Untitled'} \x1b[90m(${f.type || 'text'})\x1b[0m`);
      });
      if (form.fieldConfigs.length > 10) {
        output.push(`  \x1b[90m... and ${form.fieldConfigs.length - 10} more\x1b[0m`);
      }
    }
    
    return NextResponse.json({ success: true, output: output.join('\r\n'), data: form });
  }
  
  if (context.category === 'workflows') {
    const workflowQuery = ObjectId.isValid(context.itemName!) 
      ? { $or: [{ name: context.itemName }, { _id: new ObjectId(context.itemName) }] }
      : { name: context.itemName };
    const workflow = await db.collection('workflows').findOne(workflowQuery);
    
    if (!workflow) {
      return NextResponse.json({ success: false, error: 'Workflow not found' });
    }
    
    const output = [
      `\x1b[1m\x1b[36m${workflow.name || 'Untitled Workflow'}\x1b[0m`,
      '',
      `\x1b[90mID:\x1b[0m          ${workflow._id}`,
      `\x1b[90mCreated:\x1b[0m     ${workflow.createdAt ? new Date(workflow.createdAt).toLocaleString() : 'Unknown'}`,
      `\x1b[90mUpdated:\x1b[0m     ${workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleString() : 'Unknown'}`,
      `\x1b[90mNodes:\x1b[0m       ${workflow.nodes?.length || 0}`,
      `\x1b[90mStatus:\x1b[0m      ${workflow.status || 'draft'}`,
    ];
    
    if (workflow.description) {
      output.push(`\x1b[90mDescription:\x1b[0m ${workflow.description}`);
    }
    
    return NextResponse.json({ success: true, output: output.join('\r\n') });
  }
  
  if (context.category === 'data' && segments[5]) {
    // Block access to internal collections
    if (isBlockedCollection(context.itemName || '')) {
      return NextResponse.json({ success: false, error: 'Access denied: internal collection' });
    }
    
    // Show document
    const docId = segments[5];
    const docQuery = ObjectId.isValid(docId) 
      ? { _id: new ObjectId(docId) }
      : { _id: docId as unknown as ObjectId }; // Allow string IDs for non-ObjectId collections
    const doc = await db.collection(context.itemName!).findOne(docQuery);
    
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' });
    }
    
    // Format as JSON with colors
    const json = JSON.stringify(doc, null, 2)
      .replace(/"([^"]+)":/g, '\x1b[36m"$1"\x1b[0m:')
      .replace(/: "([^"]+)"/g, ': \x1b[33m"$1"\x1b[0m')
      .replace(/: (\d+)/g, ': \x1b[35m$1\x1b[0m')
      .replace(/: (true|false)/g, ': \x1b[32m$1\x1b[0m')
      .replace(/: null/g, ': \x1b[90mnull\x1b[0m');
    
    return NextResponse.json({ success: true, output: json });
  }
  
  return NextResponse.json({ success: false, error: 'Cannot display this item' });
}

/**
 * Show directory tree
 */
async function handleTree(
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string,
  maxDepth: number
) {
  const lines: string[] = [];
  const basePath = '/' + segments.join('/');
  
  lines.push(`\x1b[1m${basePath || '/'}\x1b[0m`);
  
  // For now, show a simplified tree
  // A full implementation would recursively fetch the structure
  
  if (depth === 0 && maxDepth >= 1) {
    for (const org of userOrgs) {
      lines.push(`├── \x1b[35m${org.name}/\x1b[0m`);
    }
  } else if (context.orgName) {
    const org = userOrgs.find(o => o.name === context.orgName);
    if (org && maxDepth >= 1) {
      const projectsResult = await listProjects(org.orgId);
      const projects = projectsResult.projects;
      for (let i = 0; i < projects.length; i++) {
        const isLast = i === projects.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        lines.push(`${prefix}\x1b[34m${projects[i].name}/\x1b[0m`);
        
        if (maxDepth >= 2) {
          const appsResult = await listApplications(org.orgId, projects[i].projectId);
          const apps = appsResult.applications;
          for (let j = 0; j < apps.length; j++) {
            const appIsLast = j === apps.length - 1;
            const indent = isLast ? '    ' : '│   ';
            const appPrefix = appIsLast ? '└── ' : '├── ';
            lines.push(`${indent}${appPrefix}\x1b[36m${apps[j].name}/\x1b[0m`);
            
            if (maxDepth >= 3) {
              const catIndent = indent + (appIsLast ? '    ' : '│   ');
              lines.push(`${catIndent}├── \x1b[33mforms/\x1b[0m`);
              lines.push(`${catIndent}├── \x1b[33mworkflows/\x1b[0m`);
              lines.push(`${catIndent}├── \x1b[33mtemplates/\x1b[0m`);
              lines.push(`${catIndent}└── \x1b[33mdata/\x1b[0m`);
            }
          }
        }
      }
    }
  }
  
  return NextResponse.json({ success: true, output: lines.join('\r\n') });
}

/**
 * Search for items
 */
async function handleFind(
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string,
  pattern: string
) {
  const results: Array<{ path: string; type: string; name: string }> = [];
  const searchRegex = { $regex: pattern, $options: 'i' };
  
  // Get the org to search in
  let searchOrgs = userOrgs;
  if (context.orgName) {
    const org = userOrgs.find(o => o.name === context.orgName);
    if (org) searchOrgs = [org];
  }
  
  for (const org of searchOrgs) {
    const db = await getOrgDb(org.orgId);
    
    // Search forms
    const forms = await db.collection('forms')
      .find({ $or: [{ name: searchRegex }, { description: searchRegex }] })
      .limit(20)
      .toArray();
    
    for (const form of forms) {
      results.push({
        path: `/${org.name}/.../forms/${form.name || form.formId}`,
        type: 'form',
        name: form.name || form.formId || String(form._id),
      });
    }
    
    // Search workflows
    const workflows = await db.collection('workflows')
      .find({ $or: [{ name: searchRegex }, { description: searchRegex }] })
      .limit(20)
      .toArray();
    
    for (const wf of workflows) {
      results.push({
        path: `/${org.name}/.../workflows/${wf.name}`,
        type: 'workflow',
        name: wf.name || String(wf._id),
      });
    }
  }
  
  return NextResponse.json({ success: true, results });
}

/**
 * Search within content (grep)
 */
async function handleGrep(
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string,
  pattern: string,
  options?: { ignoreCase?: boolean; recursive?: boolean }
) {
  if (!pattern) {
    return NextResponse.json({ success: false, error: 'grep: Missing pattern' });
  }
  
  const results: string[] = [];
  const flags = options?.ignoreCase ? 'i' : '';
  const regex = new RegExp(pattern, flags);
  
  // Get the org
  const org = userOrgs.find(o => o.name === context.orgName || o.orgId === context.orgName);
  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' });
  }
  
  const db = await getOrgDb(org.orgId);
  
  // Search in forms' field labels and descriptions
  if (!context.category || context.category === 'forms' || options?.recursive) {
    const forms = await db.collection('forms').find({}).limit(100).toArray();
    for (const form of forms) {
      // Check form name and description
      if (regex.test(form.name || '') || regex.test(form.description || '')) {
        results.push(`\x1b[36mforms/${form.name || form.formId}\x1b[0m: ${(form.name || form.description || '').replace(regex, '\x1b[31m$&\x1b[0m')}`);
      }
      // Check field labels
      for (const field of form.fieldConfigs || []) {
        if (regex.test(field.label || '')) {
          results.push(`\x1b[36mforms/${form.name || form.formId}\x1b[0m:\x1b[33m${field.label}\x1b[0m`);
        }
      }
    }
  }
  
  // Search in workflows
  if (!context.category || context.category === 'workflows' || options?.recursive) {
    const workflows = await db.collection('workflows').find({}).limit(100).toArray();
    for (const wf of workflows) {
      if (regex.test(wf.name || '') || regex.test(wf.description || '')) {
        results.push(`\x1b[36mworkflows/${wf.name}\x1b[0m: ${(wf.name || wf.description || '').replace(regex, '\x1b[31m$&\x1b[0m')}`);
      }
    }
  }
  
  if (results.length === 0) {
    return NextResponse.json({ success: true, output: `\x1b[33mNo matches for "${pattern}"\x1b[0m` });
  }
  
  return NextResponse.json({ success: true, output: results.join('\r\n') });
}

/**
 * Create new item (touch)
 */
async function handleCreate(
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string,
  name?: string
) {
  // Must be in a category directory (forms, workflows, etc.)
  if (depth < 4 || !context.category) {
    return NextResponse.json({ 
      success: false, 
      error: 'touch: Must be in a category directory (forms, workflows, templates)' 
    });
  }
  
  if (!name) {
    return NextResponse.json({ success: false, error: 'touch: Missing name' });
  }
  
  const org = userOrgs.find(o => o.name === context.orgName || o.orgId === context.orgName);
  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' });
  }
  
  const db = await getOrgDb(org.orgId);
  const now = new Date();
  
  // Get project and app IDs (would need to resolve these)
  const projectsResult = await listProjects(org.orgId);
  const project = projectsResult.projects.find((p: { name: string }) => p.name === context.projectName);
  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' });
  }
  
  const appsResult = await listApplications(org.orgId, project.projectId);
  const app = appsResult.applications.find((a: { name: string }) => a.name === context.appName);
  if (!app) {
    return NextResponse.json({ success: false, error: 'Application not found' });
  }
  
  if (context.category === 'forms') {
    const formId = `form_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newForm = {
      formId,
      name,
      applicationId: app.applicationId,
      projectId: project.projectId,
      fieldConfigs: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      isPublished: false,
    };
    
    await db.collection('forms').insertOne(newForm);
    return NextResponse.json({ 
      success: true, 
      output: `\x1b[32m✓\x1b[0m Created form: ${name}`,
      data: newForm,
    });
  }
  
  if (context.category === 'workflows') {
    const newWorkflow = {
      name,
      applicationId: app.applicationId,
      projectId: project.projectId,
      nodes: [],
      edges: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      status: 'draft',
    };
    
    const result = await db.collection('workflows').insertOne(newWorkflow);
    return NextResponse.json({ 
      success: true, 
      output: `\x1b[32m✓\x1b[0m Created workflow: ${name}`,
      data: { ...newWorkflow, _id: result.insertedId },
    });
  }
  
  return NextResponse.json({ success: false, error: `touch: Cannot create items in ${context.category}` });
}

/**
 * Move or copy items
 */
async function handleMoveOrCopy(
  operation: 'move' | 'copy',
  source?: string,
  destination?: string,
  userOrgs?: Array<{ orgId: string; name: string }>,
  userId?: string
) {
  if (!source || !destination) {
    return NextResponse.json({ 
      success: false, 
      error: `${operation}: Missing source or destination` 
    });
  }
  
  const srcParts = parsePath(source);
  const dstParts = parsePath(destination);
  
  // Validate both paths are forms/workflows in same org
  if (srcParts.segments.length < 5 || dstParts.segments.length < 4) {
    return NextResponse.json({ 
      success: false, 
      error: `${operation}: Can only ${operation} items (forms, workflows)` 
    });
  }
  
  const org = userOrgs?.find(o => o.name === srcParts.context.orgName);
  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' });
  }
  
  const db = await getOrgDb(org.orgId);
  const srcCategory = srcParts.context.category;
  const srcName = srcParts.context.itemName;
  
  if (srcCategory === 'forms') {
    const form = await db.collection('forms').findOne({
      $or: [{ name: srcName }, { formId: srcName }]
    });
    
    if (!form) {
      return NextResponse.json({ success: false, error: `${operation}: Source form not found` });
    }
    
    if (operation === 'move') {
      // Update the form's application/project
      // For now, just rename if destination is a new name
      const newName = dstParts.context.itemName || dstParts.segments[dstParts.segments.length - 1];
      await db.collection('forms').updateOne(
        { _id: form._id },
        { $set: { name: newName, updatedAt: new Date() } }
      );
      return NextResponse.json({ 
        success: true, 
        output: `\x1b[32m✓\x1b[0m Renamed: ${srcName} → ${newName}` 
      });
    } else {
      // Copy the form
      const newName = dstParts.context.itemName || `${form.name} (copy)`;
      const { _id, ...formData } = form;
      const newForm = {
        ...formData,
        formId: `form_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: newName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection('forms').insertOne(newForm);
      return NextResponse.json({ 
        success: true, 
        output: `\x1b[32m✓\x1b[0m Copied: ${srcName} → ${newName}` 
      });
    }
  }
  
  return NextResponse.json({ success: false, error: `${operation}: Not supported for this item type` });
}

/**
 * Get first or last N items
 */
async function handleTailOrHead(
  operation: 'tail' | 'head',
  depth: number,
  segments: string[],
  context: PathContext,
  userOrgs: Array<{ orgId: string; name: string }>,
  userId: string,
  lines: number
) {
  // Must be targeting a collection (data) or submissions
  if (context.category !== 'data' || !context.itemName) {
    return NextResponse.json({ 
      success: false, 
      error: `${operation}: Can only ${operation} data collections` 
    });
  }
  
  const org = userOrgs.find(o => o.name === context.orgName);
  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' });
  }
  
  const db = await getOrgDb(org.orgId);
  const sortOrder = operation === 'tail' ? -1 : 1;
  
  const docs = await db.collection(context.itemName)
    .find({})
    .sort({ _id: sortOrder })
    .limit(lines)
    .toArray();
  
  if (docs.length === 0) {
    return NextResponse.json({ success: true, output: '\x1b[90m(no documents)\x1b[0m' });
  }
  
  // If tail, reverse to show oldest first
  if (operation === 'tail') {
    docs.reverse();
  }
  
  const output = docs.map((doc, i) => {
    const preview = JSON.stringify(doc).slice(0, 80);
    return `\x1b[90m${i + 1}.\x1b[0m ${doc._id}: ${preview}${preview.length >= 80 ? '...' : ''}`;
  }).join('\r\n');
  
  return NextResponse.json({ success: true, output });
}
