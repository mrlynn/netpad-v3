/**
 * Organization Selector Component
 * 
 * Displays current organization and allows switching between organizations
 */

'use client';

import { useState } from 'react';
import {
  Box,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  alpha,
} from '@mui/material';
import {
  Business,
  Check,
  Add,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRouter } from 'next/navigation';

interface OrganizationSelectorProps {
  compact?: boolean;
}

export function OrganizationSelector({ compact = false }: OrganizationSelectorProps) {
  const { organization, organizations, selectOrganization } = useOrganization();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectOrg = async (orgId: string) => {
    await selectOrganization(orgId);
    handleClose();
    // Refresh the page to update all context
    router.refresh();
  };

  if (!organization) {
    return null;
  }

  return (
    <>
      <Chip
        icon={<Business sx={{ fontSize: 14 }} />}
        label={compact ? organization.name : organization.name}
        onClick={handleClick}
        size="small"
        sx={{
          height: 26,
          bgcolor: 'transparent',
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
          fontWeight: 400,
          fontSize: '0.8125rem',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: alpha('#000', 0.05),
            borderColor: 'divider',
            color: 'text.primary',
          },
          '& .MuiChip-icon': {
            color: 'text.secondary',
          },
        }}
        variant="outlined"
      />
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 250,
            maxWidth: 350,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600 }}>
            Organization
          </Typography>
        </Box>
        <Divider />
        {organizations.map((org) => (
          <MenuItem
            key={org.orgId}
            onClick={() => handleSelectOrg(org.orgId)}
            selected={org.orgId === organization.orgId}
            sx={{
              py: 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {org.orgId === organization.orgId && (
                <Check sx={{ fontSize: 18, color: '#00ED64' }} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={org.name}
              secondary={org.orgId}
              primaryTypographyProps={{
                fontWeight: org.orgId === organization.orgId ? 600 : 400,
              }}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          component="a"
          href="/settings"
          onClick={handleClose}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Add sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText primary="Manage Organizations" />
        </MenuItem>
      </Menu>
    </>
  );
}
