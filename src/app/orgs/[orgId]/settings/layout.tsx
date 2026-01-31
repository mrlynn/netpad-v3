'use client';

/**
 * Organization Settings Layout
 * 
 * Provides navigation for org settings sections (members, groups, roles, etc.)
 */

import { ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
  Box,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  People as PeopleIcon,
  Groups as GroupsIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  CreditCard as BillingIcon,
  Extension as IntegrationsIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import Link from 'next/link';

interface SettingsLayoutProps {
  children: ReactNode;
}

const settingsNavItems = [
  {
    label: 'General',
    href: '',
    icon: SettingsIcon,
    description: 'Organization name, slug, and basic settings',
  },
  {
    label: 'Members',
    href: '/members',
    icon: PeopleIcon,
    description: 'Manage organization members and invitations',
  },
  {
    label: 'Groups',
    href: '/groups',
    icon: GroupsIcon,
    description: 'Create teams and manage group membership',
  },
  {
    label: 'Roles & Permissions',
    href: '/roles',
    icon: SecurityIcon,
    description: 'Configure custom roles and access control',
  },
  {
    label: 'Role Assignments',
    href: '/assignments',
    icon: AssignmentIcon,
    description: 'Assign roles to users and groups',
  },
  { divider: true },
  {
    label: 'Billing',
    href: '/billing',
    icon: BillingIcon,
    description: 'Subscription, invoices, and payment methods',
  },
  {
    label: 'Integrations',
    href: '/integrations',
    icon: IntegrationsIcon,
    description: 'Connected services and credentials',
  },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const theme = useTheme();
  
  const orgId = params.orgId as string;
  const basePath = `/orgs/${orgId}/settings`;

  const isActive = (href: string) => {
    const fullPath = `${basePath}${href}`;
    if (href === '') {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Organization Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Manage your organization&apos;s members, permissions, and configuration.
      </Typography>

      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* Sidebar Navigation */}
        <Paper
          sx={{
            width: 280,
            flexShrink: 0,
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <List sx={{ py: 1 }}>
            {settingsNavItems.map((item, index) => {
              if ('divider' in item && item.divider) {
                return <Divider key={index} sx={{ my: 1 }} />;
              }
              
              const Icon = item.icon!;
              const active = isActive(item.href!);
              
              return (
                <ListItem key={item.label} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={`${basePath}${item.href}`}
                    selected={active}
                    sx={{
                      mx: 1,
                      borderRadius: 1,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.18),
                        },
                        '& .MuiListItemIcon-root': {
                          color: theme.palette.primary.main,
                        },
                        '& .MuiListItemText-primary': {
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: active ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {/* Main Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {children}
        </Box>
      </Box>
    </Container>
  );
}
