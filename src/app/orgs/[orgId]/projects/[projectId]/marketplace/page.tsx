/**
 * Project-Scoped Marketplace Page
 *
 * Browse and import NetPad applications from the marketplace.
 * This page has project context, enabling direct imports.
 */

'use client';

import { AppNavBar } from '@/components/Navigation/AppNavBar';
import { MarketplaceView } from '@/components/Marketplace';
import { useParams, useRouter } from 'next/navigation';
import { getOrgProjectUrl } from '@/lib/routing';

export default function ProjectMarketplacePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const handleImportComplete = () => {
    // Navigate to forms page after successful import
    router.push(getOrgProjectUrl(orgId, projectId, 'forms'));
  };

  return (
    <>
      <AppNavBar />
      <MarketplaceView
        organizationId={orgId}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
