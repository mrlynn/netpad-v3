'use client';

/**
 * Deploy Project Button
 *
 * A button component that opens the deployment wizard for a project.
 */

import { useState } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import { Rocket as RocketIcon, Cloud as CloudIcon } from '@mui/icons-material';
import { Project } from '@/types/platform';
import { DeploymentWizard } from './DeploymentWizard';

interface DeployProjectButtonProps {
  project: Project;
  organizationId: string;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onDeploymentStart?: (deploymentId: string) => void;
}

export function DeployProjectButton({
  project,
  organizationId,
  variant = 'button',
  size = 'medium',
  disabled = false,
  onDeploymentStart,
}: DeployProjectButtonProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleClick = () => {
    setWizardOpen(true);
  };

  const handleClose = () => {
    setWizardOpen(false);
  };

  return (
    <>
      {variant === 'button' ? (
        <Button
          variant="contained"
          startIcon={<RocketIcon />}
          onClick={handleClick}
          disabled={disabled}
          size={size}
          sx={{
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            color: '#000',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #00CC55 0%, #3DFF8F 100%)',
            },
          }}
        >
          Deploy
        </Button>
      ) : (
        <Tooltip title="Deploy to Vercel">
          <IconButton
            onClick={handleClick}
            disabled={disabled}
            size={size}
            sx={{
              color: '#00ED64',
              '&:hover': {
                backgroundColor: 'rgba(0, 237, 100, 0.08)',
              },
            }}
          >
            <CloudIcon fontSize={size === 'small' ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
      )}

      <DeploymentWizard
        open={wizardOpen}
        onClose={handleClose}
        project={project}
        organizationId={organizationId}
        onDeploymentStart={onDeploymentStart}
      />
    </>
  );
}

export default DeployProjectButton;
