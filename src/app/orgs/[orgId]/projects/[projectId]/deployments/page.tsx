'use client';

/**
 * Project Deployments Page
 *
 * Displays the deployment dashboard for a project
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Alert } from '@mui/material';
import { DeploymentDashboard } from '@/components/Deploy/DeploymentDashboard';
import { Project } from '@/types/platform';

export default function ProjectDeploymentsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}?orgId=${orgId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load project');
        }
        const data = await response.json();
        setProject(data.project);
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    if (projectId && orgId) {
      loadProject();
    }
  }, [projectId, orgId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Project not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <DeploymentDashboard project={project} organizationId={orgId} />
    </Box>
  );
}
