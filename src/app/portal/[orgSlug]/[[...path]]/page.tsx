/**
 * Portal Route Handler
 *
 * Handles subdomain-based access to organization forms:
 * - acme.netpad.io/ → Organization portal home
 * - acme.netpad.io/help → Form with slug "help"
 */

import { notFound, redirect } from 'next/navigation';
import { getOrganizationBySlug } from '@/lib/platform/organizations';
import { getOrgFormsCollection } from '@/lib/platform/db';
import PublicFormPage from './PublicFormPage';

interface PortalPageProps {
  params: Promise<{
    orgSlug: string;
    path?: string[];
  }>;
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { orgSlug, path } = await params;

  // Look up organization by slug
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  // No path = organization portal home
  // For MVP, just redirect to a 404 or show a simple message
  if (!path || path.length === 0) {
    // Future: Show organization portal with list of public forms
    notFound();
  }

  // Single path segment = form slug
  if (path.length === 1) {
    const formSlug = path[0];

    // Look up published form by slug within this organization
    const formsCollection = await getOrgFormsCollection(organization.orgId);
    const form = await formsCollection.findOne({
      organizationId: organization.orgId,
      slug: formSlug,
      isPublished: true,
    });

    if (!form) {
      notFound();
    }

    // Use the form ID for the public form page
    const formId = form.formId || form.id;

    // Render the public form page with the form data
    return (
      <PublicFormPage
        formId={formId}
        organization={{
          orgId: organization.orgId,
          name: organization.name,
          slug: organization.slug,
        }}
      />
    );
  }

  // More than one path segment is not supported for MVP
  notFound();
}

export async function generateMetadata({ params }: PortalPageProps) {
  const { orgSlug, path } = await params;

  const organization = await getOrganizationBySlug(orgSlug);
  if (!organization) {
    return { title: 'Not Found' };
  }

  // Form-specific metadata
  if (path && path.length === 1) {
    const formSlug = path[0];
    const formsCollection = await getOrgFormsCollection(organization.orgId);
    const form = await formsCollection.findOne({
      organizationId: organization.orgId,
      slug: formSlug,
      isPublished: true,
    });

    if (form) {
      return {
        title: form.name,
        description: form.description || `${form.name} by ${organization.name}`,
        openGraph: {
          title: form.name,
          description: form.description || `${form.name} by ${organization.name}`,
        },
      };
    }
  }

  return {
    title: `${organization.name} Forms`,
    description: `Forms and applications by ${organization.name}`,
  };
}
