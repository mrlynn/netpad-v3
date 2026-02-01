/**
 * useSimplifiedUI Hook
 * 
 * Determines if the UI should be simplified based on the user's setup complexity.
 * 
 * Simple setups (1 org, 1 project, few apps) get a cleaner UI:
 * - No organization selector
 * - No project selector  
 * - Flatter navigation (apps shown directly)
 * - Simplified breadcrumbs
 * 
 * Complex setups (multiple orgs/projects/many apps) get the full hierarchy.
 */

'use client';

import { useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplicationSafe } from '@/contexts/ApplicationContext';

// ============================================
// Constants
// ============================================

/** Maximum number of apps before showing "complex" UI */
const MAX_SIMPLE_APPS = 5;

/** Maximum number of projects before showing project selector */
const MAX_SIMPLE_PROJECTS = 1;

// ============================================
// Types
// ============================================

export interface SimplifiedUIState {
  /** True if user has a simple setup that warrants simplified UI */
  isSimpleSetup: boolean;
  
  /** True if we should hide the organization selector */
  hideOrgSelector: boolean;
  
  /** True if we should hide the project layer entirely */
  hideProjectLayer: boolean;
  
  /** True if we should show a flat app list instead of nested tree */
  useFlatAppList: boolean;
  
  /** True if breadcrumbs should be simplified */
  useSimpleBreadcrumb: boolean;
  
  /** Number of organizations user has access to */
  orgCount: number;
  
  /** Number of projects in current org */
  projectCount: number;
  
  /** Number of applications user has access to */
  appCount: number;
  
  /** Still loading data to determine complexity */
  isLoading: boolean;
}

// ============================================
// Hook
// ============================================

export function useSimplifiedUI(): SimplifiedUIState {
  const { organizations, organization, isLoading: isOrgLoading } = useOrganization();
  const appContext = useApplicationSafe();
  const applications = appContext?.applications ?? [];
  const isAppLoading = appContext?.isLoading ?? false;
  
  return useMemo(() => {
    const isLoading = isOrgLoading || isAppLoading;
    
    const orgCount = organizations?.length ?? 0;
    const appCount = applications?.length ?? 0;
    
    // Count unique projects from applications
    const projectIds = new Set(applications.map(app => app.projectId).filter(Boolean));
    const projectCount = projectIds.size || 1; // At least 1 if they have apps
    
    // Determine simplification flags
    const hideOrgSelector = orgCount <= 1;
    const hideProjectLayer = projectCount <= MAX_SIMPLE_PROJECTS;
    const useFlatAppList = appCount <= MAX_SIMPLE_APPS && hideProjectLayer;
    const useSimpleBreadcrumb = hideOrgSelector && hideProjectLayer;
    
    // Overall "simple" if all conditions met
    const isSimpleSetup = hideOrgSelector && hideProjectLayer && useFlatAppList;
    
    return {
      isSimpleSetup,
      hideOrgSelector,
      hideProjectLayer,
      useFlatAppList,
      useSimpleBreadcrumb,
      orgCount,
      projectCount,
      appCount,
      isLoading,
    };
  }, [organizations, applications, isOrgLoading, isAppLoading]);
}

/**
 * Safe version that returns defaults when used outside providers
 */
export function useSimplifiedUISafe(): SimplifiedUIState {
  try {
    return useSimplifiedUI();
  } catch {
    return {
      isSimpleSetup: false,
      hideOrgSelector: false,
      hideProjectLayer: false,
      useFlatAppList: false,
      useSimpleBreadcrumb: false,
      orgCount: 0,
      projectCount: 0,
      appCount: 0,
      isLoading: true,
    };
  }
}
