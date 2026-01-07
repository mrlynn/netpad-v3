/**
 * Project Selector Component
 *
 * A dropdown/select component for choosing a project.
 * Used in form/workflow creation flows.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import { Project } from '@/types/platform';

interface ProjectSelectorProps {
  organizationId: string;
  value?: string;
  onChange: (projectId: string) => void;
  required?: boolean;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export function ProjectSelector({
  organizationId,
  value,
  onChange,
  required = false,
  label = 'Project',
  disabled = false,
  error = false,
  helperText,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    async function fetchProjects() {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects?orgId=${organizationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data.projects || []);
        setErrorState(null);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setErrorState(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [organizationId]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  if (loading) {
    return (
      <FormControl fullWidth required={required} error={error} disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value=""
          label={label}
          disabled
        >
          <MenuItem value="">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              Loading projects...
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  if (errorState) {
    return (
      <FormControl fullWidth required={required} error={true} disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value=""
          label={label}
          disabled
        >
          <MenuItem value="">Error: {errorState}</MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <FormControl fullWidth required={required} error={error} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ''}
        label={label}
        onChange={handleChange}
        disabled={disabled || projects.length === 0}
      >
        {projects.length === 0 ? (
          <MenuItem value="" disabled>
            No projects available
          </MenuItem>
        ) : (
          projects.map((project) => (
            <MenuItem key={project.projectId} value={project.projectId}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {project.color && (
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: project.color,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Box sx={{ flex: 1 }}>{project.name}</Box>
                {project.environment && (
                  <Chip
                    label={project.environment.toUpperCase()}
                    size="small"
                    color={
                      project.environment === 'prod' ? 'error' :
                      project.environment === 'staging' ? 'warning' :
                      project.environment === 'test' ? 'info' : 'default'
                    }
                    sx={{ fontSize: '0.65rem', height: 18, minWidth: 40 }}
                  />
                )}
                {project.stats && (
                  <Chip
                    label={`${project.stats.formCount + project.stats.workflowCount}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
              </Box>
            </MenuItem>
          ))
        )}
      </Select>
      {helperText && (
        <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: error ? 'error.main' : 'text.secondary' }}>
          {helperText}
        </Box>
      )}
    </FormControl>
  );
}
