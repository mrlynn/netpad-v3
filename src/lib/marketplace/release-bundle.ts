import { ApplicationRelease, Application } from '@/types/application';
import { ApplicationManifest, BundleExport } from '@/types/template';
import { getApplicationsCollection, getOrgFormsCollection } from '@/lib/platform/db';
import { getWorkflowsCollection } from '@/lib/workflow/db';
import { cleanFormForExport, cleanWorkflowForExport, createBundleExport } from '@/lib/templates/export';

/**
 * Build a publishable BundleExport from an ApplicationRelease by loading the
 * referenced forms/workflows from the org DB and cleaning them for export.
 */
export async function buildBundleFromRelease(input: {
  orgId: string;
  projectId: string;
  applicationId: string;
  release: ApplicationRelease;
}): Promise<{ application: Application; manifest: ApplicationManifest; bundle: BundleExport }> {
  const { orgId, projectId, applicationId, release } = input;

  const appsCol = await getApplicationsCollection(orgId);
  const application = await appsCol.findOne({ organizationId: orgId, projectId, applicationId });
  if (!application) {
    throw new Error('Application not found for this organization and project');
  }

  const formIds = (release.manifest?.forms || []).map((f) => f.formId).filter(Boolean);
  const workflowIds = (release.manifest?.workflows || []).map((w) => w.workflowId).filter(Boolean);

  const formsCol = await getOrgFormsCollection(orgId);
  const workflowsCol = await getWorkflowsCollection(orgId);

  const [forms, workflows] = await Promise.all([
    formIds.length > 0
      ? formsCol
          .find({
            $or: [{ formId: { $in: formIds } }, { id: { $in: formIds } }],
            organizationId: orgId,
            projectId,
            applicationId,
          })
          .toArray()
      : Promise.resolve([]),
    workflowIds.length > 0
      ? workflowsCol
          .find({
            id: { $in: workflowIds },
            orgId,
            projectId,
            applicationId,
          })
          .toArray()
      : Promise.resolve([]),
  ]);

  const formsExport = forms.map((f: any) => cleanFormForExport(f));
  const workflowsExport = workflows.map((w: any) => cleanWorkflowForExport(w));

  const manifest: ApplicationManifest = {
    name: application.name,
    version: release.version,
    description: application.description,
    id: application.applicationId,
    icon: application.icon,
    color: application.color,
    tags: application.tags || [],
    category: 'other',
    assets: {
      forms: formsExport.length > 0 ? ['forms/form.json'] : undefined,
      workflows: workflowsExport.length > 0 ? ['workflows/workflow.json'] : undefined,
    },
    createdAt: release.createdAt instanceof Date ? release.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const bundle = createBundleExport(manifest, formsExport, workflowsExport);

  return { application, manifest, bundle };
}

