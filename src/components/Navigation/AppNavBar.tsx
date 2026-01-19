'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Chip,
  alpha,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  GitHub,
  HelpOutline,
  Login,
  Logout,
  Fingerprint,
  Key,
  Folder,
  Add,
  DarkMode,
  LightMode,
  Settings,
  AccountTree,
  Storage,
  Payments,
  Api,
  Menu as MenuIcon,
  MonitorHeart,
  FolderOpen,
  ArrowDropDown,
  Description,
  Apps,
  AdminPanelSettings,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useHelp } from '@/contexts/HelpContext';
import { useTheme as useAppTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useApplicationSafe } from '@/contexts/ApplicationContext';
import { ClusterStatusIndicator } from './ClusterStatusIndicator';
import { OrganizationSelector } from './OrganizationSelector';
import { ProjectSelectorNav } from './ProjectSelectorNav';
import { RecentItemsMenu } from './RecentItemsMenu';
import { ApplicationSwitcher, useApplicationSwitcherShortcut } from './ApplicationSwitcher';
import { getOrgProjectUrl, parseOrgProjectFromPath } from '@/lib/routing';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  matchPaths?: string[]; // Additional paths that should highlight this nav item
}

// Navigation items - will be generated dynamically based on context
const NAV_ITEM_CONFIGS = [
  {
    key: 'projects',
    label: 'Projects',
    icon: <FolderOpen sx={{ fontSize: 18 }} />,
    // color: '#FF9800',
    color: '#FF9800',
    matchPaths: ['/projects'],
  },
  {
    key: 'applications',
    label: 'Applications',
    icon: <Apps sx={{ fontSize: 18 }} />,
    color: '#00ED64',
    matchPaths: ['/applications'],
  },
  {
    key: 'forms',
    label: 'Forms',
    icon: <Folder sx={{ fontSize: 18 }} />,
    color: '#00ED64',
    matchPaths: ['/forms', '/builder'],
  },
  {
    key: 'workflows',
    label: 'Workflows',
    icon: <AccountTree sx={{ fontSize: 18 }} />,
    color: '#9C27B0',
  },
  {
    key: 'data',
    label: 'Data',
    icon: <Storage sx={{ fontSize: 18 }} />,
    color: '#2196F3',
  },
  {
    key: 'marketplace',
    label: 'Marketplace',
    icon: <Apps sx={{ fontSize: 18 }} />,
    color: '#00ED64',
    matchPaths: ['/marketplace'],
  },
];

export function AppNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, registerPasskey } = useAuth();
  const { organization, currentOrgId, organizations } = useOrganization();
  const applicationContext = useApplicationSafe();
  const currentApplication = applicationContext?.currentApplication ?? null;
  const isMultiOrg = organizations.length > 1;
  const { openSearch } = useHelp();
  const { mode, toggleTheme } = useAppTheme();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  // Application Switcher state
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);

  // Register global keyboard shortcut for app switcher (Cmd+K / Ctrl+K)
  useApplicationSwitcherShortcut(() => setAppSwitcherOpen(true));

  // Get current org/project from URL or context
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(undefined);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  
  useEffect(() => {
    // Try to parse from URL first
    const { orgId: urlOrgId, projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
    
    if (urlOrgId && urlProjectId) {
      // We're in the new URL structure
      setCurrentProjectId(urlProjectId);
      
      // Generate nav items with new URLs
      const items = NAV_ITEM_CONFIGS.map(config => {
        // Projects and Marketplace links go to org-level, not project-specific
        if (config.key === 'projects') {
          return {
            href: `/orgs/${urlOrgId}/projects`,
            label: config.label,
            icon: config.icon,
            color: config.color,
            matchPaths: config.matchPaths,
          };
        }
        if (config.key === 'marketplace') {
          // Marketplace is project-scoped to enable direct imports
          return {
            href: `/orgs/${urlOrgId}/projects/${urlProjectId}/marketplace`,
            label: config.label,
            icon: config.icon,
            color: config.color,
            matchPaths: config.matchPaths,
          };
        }
        // Other items are project-specific
        return {
          href: getOrgProjectUrl(urlOrgId, urlProjectId, config.key as any),
          label: config.label,
          icon: config.icon,
          color: config.color,
          matchPaths: config.matchPaths,
        };
      });
      setNavItems(items);
    } else {
      // Legacy routes - use old URLs (they'll redirect)
      const items = NAV_ITEM_CONFIGS.map(config => {
        if (config.key === 'projects') {
          // Projects link needs orgId
          const orgId = organization?.orgId;
          return {
            href: orgId ? `/orgs/${orgId}/projects` : '/projects',
            label: config.label,
            icon: config.icon,
            color: config.color,
            matchPaths: config.matchPaths,
          };
        }
        if (config.key === 'marketplace') {
          // Prefer org-scoped marketplace when org is known
          const orgId = organization?.orgId;
          return {
            href: orgId ? `/orgs/${orgId}/marketplace` : '/marketplace',
            label: config.label,
            icon: config.icon,
            color: config.color,
            matchPaths: config.matchPaths,
          };
        }
        return {
          href: config.key === 'forms' ? '/my-forms' : `/${config.key}`,
          label: config.label,
          icon: config.icon,
          color: config.color,
          matchPaths: config.matchPaths,
        };
      });

      // Add admin nav item for platform admins
      const isPlatformAdmin = user?.platformRole === 'admin';
      if (isPlatformAdmin) {
        items.push({
          href: '/admin/marketplace-review',
          label: 'Review',
          icon: <AdminPanelSettings sx={{ fontSize: 18 }} />,
          color: '#FF6B6B',
          matchPaths: ['/admin'],
        });
      }

      setNavItems(items);
      
      // Get project from localStorage for legacy routes
      const stored = localStorage.getItem('selected_project_id');
      setCurrentProjectId(stored || undefined);
    }
  }, [pathname, organization, user]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newMenuAnchorEl, setNewMenuAnchorEl] = useState<null | HTMLElement>(null);
  const newMenuOpen = Boolean(newMenuAnchorEl);

  // Check if a nav item is active based on current path
  const isNavItemActive = (item: NavItem): boolean => {
    // Exact match
    if (pathname === item.href) return true;

    // Special handling for projects list page - ONLY match /orgs/[orgId]/projects exactly
    // Do NOT match when user is inside a project (e.g., /orgs/[orgId]/projects/[projectId]/workflows)
    const isProjectsListHref = item.href.match(/^\/orgs\/[^/]+\/projects$/);
    if (isProjectsListHref) {
      // Only active if we're on the projects list page itself
      return pathname.match(/^\/orgs\/[^/]+\/projects\/?$/) !== null;
    }

    // Special handling for org marketplace page - ONLY match /orgs/[orgId]/marketplace exactly
    const isOrgMarketplaceHref = item.href.match(/^\/orgs\/[^/]+\/marketplace$/);
    if (isOrgMarketplaceHref) {
      return pathname.match(/^\/orgs\/[^/]+\/marketplace\/?$/) !== null;
    }

    // Special handling for admin pages
    if (item.href.startsWith('/admin')) {
      return pathname.startsWith('/admin');
    }

    // For project-specific resources (forms, workflows, data, etc.)
    // Extract the resource type from both the href and current pathname
    // URLs look like: /orgs/{orgId}/projects/{projectId}/{resource}
    const hrefMatch = item.href.match(/\/orgs\/[^/]+\/projects\/[^/]+\/(\w+)/);
    const pathnameMatch = pathname.match(/\/orgs\/[^/]+\/projects\/[^/]+\/(\w+)/);

    if (hrefMatch && pathnameMatch) {
      const hrefResource = hrefMatch[1];
      const pathnameResource = pathnameMatch[1];

      // Direct match
      if (hrefResource === pathnameResource) {
        return true;
      }

      // Check if current pathname resource is in matchPaths for this nav item
      // e.g., Forms nav item should match both /forms and /builder paths
      if (item.matchPaths?.some(matchPath => {
        const pathSegment = matchPath.replace(/^\//, ''); // Remove leading slash
        return pathnameResource === pathSegment;
      })) {
        return true;
      }
    }

    // Legacy path matching for non-project-scoped routes
    if (item.matchPaths?.some(path => pathname.startsWith(path))) return true;

    return false;
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = () => {
    setMobileMenuOpen(true);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    // Redirect to login page after logout to prevent access to protected pages
    router.push('/auth/login');
    router.refresh();
  };

  const handleRegisterPasskey = async () => {
    handleMenuClose();
    await registerPasskey();
  };

  const handleNewMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNewMenuAnchorEl(event.currentTarget);
  };

  const handleNewMenuClose = () => {
    setNewMenuAnchorEl(null);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        borderRadius: 0, // Explicitly override theme for structural navigation element
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        // NetPad signature: subtle glow beneath navbar in dark mode
        boxShadow: (theme) => theme.palette.mode === 'dark'
          ? '0 1px 0 rgba(0, 237, 100, 0.1), 0 4px 12px rgba(0, 237, 100, 0.05)'
          : 'none',
        // Subtle gradient border effect
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, transparent 0%, rgba(0, 237, 100, 0.3) 50%, transparent 100%)'
            : 'transparent',
          pointerEvents: 'none',
        },
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          minHeight: 48,
          px: { xs: 1, sm: 2 },
          gap: 1
        }}
      >
        {/* LEFT: Identity + Scope - Quieter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Logo / Home */}
          <Tooltip title="Back to home">
            <Box
              component={Link}
              href="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                textDecoration: 'none',
                borderRadius: 1,
                px: 0.75,
                py: 0.5,
                '&:hover': {
                  bgcolor: alpha('#000', 0.05)
                },
                transition: 'background-color 0.15s ease'
              }}
            >
              <Image
                src="/logo-250x250-trans.png"
                alt="NetPad"
                width={24}
                height={24}
                style={{
                  opacity: 0.9,
                }}
              />
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  display: { xs: 'none', sm: 'block' },
                  fontSize: '0.875rem',
                }}
              >
                NetPad
              </Typography>
            </Box>
          </Tooltip>

          {/* Organization & Project Selectors - Hidden by default, shown only for multi-org/multi-project users */}
          {/* These are secondary to the Application Switcher which is the primary entry point */}
          {isAuthenticated && organization && !isMobile && isMultiOrg && (
            <>
              <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto', opacity: 0.3 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.7 }}>
                <OrganizationSelector compact />
              </Box>
            </>
          )}

          {/* Application Switcher - PRIMARY ENTRY POINT (always visible when authenticated) */}
          {isAuthenticated && organization && !isMobile && (
            <>
              <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
              <Tooltip title={currentApplication ? "Switch application (⌘K)" : "Select an application (⌘K)"}>
                <Button
                  onClick={() => setAppSwitcherOpen(true)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    textTransform: 'none',
                    color: 'text.primary',
                    bgcolor: currentApplication
                      ? alpha('#00ED64', 0.08)
                      : alpha('#00ED64', 0.15),
                    border: '1px solid',
                    borderColor: currentApplication
                      ? alpha('#00ED64', 0.2)
                      : alpha('#00ED64', 0.4),
                    '&:hover': {
                      bgcolor: alpha('#00ED64', 0.2),
                      borderColor: alpha('#00ED64', 0.4),
                    },
                    transition: 'all 0.15s ease',
                    // Pulse animation when no app selected to draw attention
                    ...((!currentApplication) && {
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          boxShadow: `0 0 0 0 ${alpha('#00ED64', 0.4)}`,
                        },
                        '50%': {
                          boxShadow: `0 0 0 4px ${alpha('#00ED64', 0.1)}`,
                        },
                      },
                    }),
                  }}
                >
                  {currentApplication ? (
                    <>
                      {/* App Icon */}
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: currentApplication.color || alpha('#00ED64', 0.2),
                          color: currentApplication.color ? '#fff' : '#00ED64',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                        }}
                      >
                        {currentApplication.icon || currentApplication.name.charAt(0).toUpperCase()}
                      </Box>
                      {/* App Name + Org (for multi-org users) */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                          }}
                        >
                          {currentApplication.name}
                        </Typography>
                        {/* Show org name for multi-org users */}
                        {isMultiOrg && organization && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              color: 'text.secondary',
                              maxWidth: 150,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1,
                            }}
                          >
                            {organization.name}
                          </Typography>
                        )}
                      </Box>
                    </>
                  ) : (
                    <>
                      {/* No app selected - show prompt */}
                      <Apps sx={{ fontSize: 18, color: '#00ED64' }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          color: '#00ED64',
                        }}
                      >
                        Select App
                      </Typography>
                    </>
                  )}
                  {/* Dropdown indicator */}
                  <ArrowDropDown sx={{ fontSize: 18, color: 'text.secondary', ml: -0.5 }} />
                </Button>
              </Tooltip>
            </>
          )}
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* CENTER: Primary Navigation - Tabs, not pills */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {navItems.map((item, index) => {
              const isActive = isNavItemActive(item);
              // Check if this is Forms, Workflows, or Data by checking the key or href
              const itemKey = NAV_ITEM_CONFIGS.find(c => c.label === item.label)?.key || '';
              const isDeEmphasized = ['forms', 'workflows', 'data'].includes(itemKey);
              // Show divider before Forms (first de-emphasized item) and before Marketplace
              const showDividerBefore = (itemKey === 'forms') || (itemKey === 'marketplace');
              
              return (
                <React.Fragment key={item.href}>
                  {showDividerBefore && (
                    <Divider 
                      orientation="vertical" 
                      flexItem 
                      sx={{ 
                        height: 24, 
                        mx: 0.5,
                        borderColor: 'divider',
                        opacity: 0.5,
                      }} 
                    />
                  )}
                  <Box
                    component={Link}
                    href={item.href}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 2,
                      py: 0.75,
                      color: isActive ? item.color : 'text.secondary',
                      textDecoration: 'none',
                      borderRadius: 1,
                      fontWeight: isActive ? 600 : (isDeEmphasized ? 400 : 500),
                      fontSize: isDeEmphasized ? '0.8125rem' : '0.875rem',
                      position: 'relative',
                      cursor: 'pointer',
                      bgcolor: isActive ? alpha(item.color, 0.12) : 'transparent',
                      opacity: isActive ? 1 : (isDeEmphasized ? 0.6 : 0.7),
                      '& svg': {
                        color: isActive ? item.color : 'text.secondary',
                        fontSize: isDeEmphasized ? 16 : 18,
                        opacity: isActive ? 1 : (isDeEmphasized ? 0.6 : 0.7),
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -1,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: isActive ? '80%' : 0,
                        height: 2,
                        bgcolor: isActive ? item.color : 'transparent',
                        borderRadius: 1,
                        transition: 'width 0.2s ease',
                      },
                      '&:hover': {
                        opacity: isDeEmphasized ? 0.8 : 1,
                        bgcolor: isActive ? alpha(item.color, 0.15) : alpha(item.color, 0.08),
                        color: isActive ? item.color : 'text.primary',
                        '& svg': {
                          color: isActive ? item.color : 'text.primary',
                          opacity: isDeEmphasized ? 0.8 : 1,
                        },
                      },
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Box>
                </React.Fragment>
              );
            })}
          </Box>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <IconButton
            onClick={handleMobileMenuOpen}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* RIGHT: Actions + Status */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* + New Dropdown */}
            {isAuthenticated && (
              <>
                <Button
                  onClick={handleNewMenuOpen}
                  startIcon={<Add sx={{ fontSize: 16 }} />}
                  endIcon={<ArrowDropDown sx={{ fontSize: 16 }} />}
                  size="small"
                  sx={{
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.5,
                    color: 'text.primary',
                    bgcolor: 'transparent',
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: alpha('#000', 0.05),
                      borderColor: 'divider',
                    },
                    transition: 'all 0.15s ease'
                  }}
                >
                  New
                </Button>
                <Menu
                  anchorEl={newMenuAnchorEl}
                  open={newMenuOpen}
                  onClose={handleNewMenuClose}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 180,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                    }
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem
                    component={Link}
                    href={
                      organization?.orgId && currentProjectId
                        ? getOrgProjectUrl(organization.orgId, currentProjectId, 'builder')
                        : '/builder'
                    }
                    onClick={handleNewMenuClose}
                  >
                    <ListItemIcon>
                      <Description sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Form" secondary="Create a new form" />
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    href={
                      organization?.orgId && currentProjectId
                        ? getOrgProjectUrl(organization.orgId, currentProjectId, 'workflows')
                        : '/workflows'
                    }
                    onClick={handleNewMenuClose}
                  >
                    <ListItemIcon>
                      <AccountTree sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Workflow" secondary="Create a new workflow" />
                  </MenuItem>
                  {organization?.orgId && (
                    <MenuItem
                      component={Link}
                      href={`/orgs/${organization.orgId}/projects`}
                      onClick={handleNewMenuClose}
                    >
                      <ListItemIcon>
                        <FolderOpen sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText primary="Project" secondary="Create a new project" />
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}

            {/* Recent Items */}
            {isAuthenticated && (
              <RecentItemsMenu />
            )}

            {/* MongoDB Status - Icon with popover */}
            {isAuthenticated && (
              <ClusterStatusIndicator />
            )}

            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <IconButton
                size="small"
                onClick={toggleTheme}
                sx={{
                  color: 'text.secondary',
                  p: 0.75,
                  '&:hover': {
                    color: 'text.primary',
                    bgcolor: alpha('#000', 0.05)
                  }
                }}
              >
                {mode === 'dark' ? <LightMode sx={{ fontSize: 18 }} /> : <DarkMode sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            {/* Auth Section */}
            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <>
                    <Tooltip title={user.email}>
                      <IconButton
                        onClick={handleMenuOpen}
                        size="small"
                        sx={{
                          p: 0,
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: '#00ED64',
                            color: '#001E2B'
                          }}
                        >
                          {getUserInitials()}
                        </Avatar>
                      </IconButton>
                    </Tooltip>
                    <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                    }
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  {/* User info header */}
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {user.displayName || user.email.split('@')[0]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                    {user.hasPasskey && (
                      <Chip
                        icon={<Fingerprint sx={{ fontSize: 12 }} />}
                        label="Passkey enabled"
                        size="small"
                        sx={{
                          mt: 1,
                          height: 20,
                          fontSize: '0.65rem',
                          bgcolor: alpha('#00ED64', 0.1),
                          color: '#00ED64',
                          '& .MuiChip-icon': { color: '#00ED64' }
                        }}
                      />
                    )}
                  </Box>
                  <Divider />

                  {/* Add passkey option if not already set up */}
                  {!user.hasPasskey && (
                    <MenuItem onClick={handleRegisterPasskey}>
                      <ListItemIcon>
                        <Key sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText primary="Set up Passkey" secondary="Enable biometric login" />
                    </MenuItem>
                  )}

                  {organization?.orgId && (
                    <MenuItem
                      component={Link}
                      href={`/orgs/${organization.orgId}/projects`}
                      onClick={handleMenuClose}
                    >
                      <ListItemIcon>
                        <FolderOpen sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText primary="Projects" secondary="Manage your projects" />
                    </MenuItem>
                  )}

                  <MenuItem
                    component={Link}
                    href="/settings"
                    onClick={handleMenuClose}
                  >
                    <ListItemIcon>
                      <Settings sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Settings" secondary="Organizations & Connections" />
                  </MenuItem>

                  <MenuItem
                    component={Link}
                    href="/api-playground"
                    onClick={handleMenuClose}
                  >
                    <ListItemIcon>
                      <Api sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="API Playground" secondary="Test the public API" />
                  </MenuItem>

                  <MenuItem onClick={() => { openSearch(); handleMenuClose(); }}>
                    <ListItemIcon>
                      <HelpOutline sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Help" secondary="Cmd+/" />
                  </MenuItem>

                  <MenuItem
                    component={Link}
                    href="/pricing"
                    onClick={handleMenuClose}
                  >
                    <ListItemIcon>
                      <Payments sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Pricing" secondary="Plans & features" />
                  </MenuItem>

                  <MenuItem
                    component="a"
                    href="https://github.com/mrlynn/netpad-v3"
                    target="_blank"
                    onClick={handleMenuClose}
                  >
                    <ListItemIcon>
                      <GitHub sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="GitHub" />
                  </MenuItem>

                  <MenuItem
                    component="a"
                    href="https://status.netpad.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleMenuClose}
                  >
                    <ListItemIcon>
                      <MonitorHeart sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="System Status" />
                  </MenuItem>

                  {/* Admin Section - only visible to admins */}
                  {user?.platformRole === 'admin' && (
                    <>
                      <Divider />
                      <MenuItem
                        component={Link}
                        href="/admin"
                        onClick={handleMenuClose}
                        sx={{
                          bgcolor: alpha('#9C27B0', 0.05),
                          '&:hover': { bgcolor: alpha('#9C27B0', 0.1) },
                        }}
                      >
                        <ListItemIcon>
                          <AdminPanelSettings sx={{ fontSize: 18, color: '#9C27B0' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Admin Dashboard"
                          secondary="Users, Waitlist, Reviews"
                          primaryTypographyProps={{ sx: { color: '#9C27B0', fontWeight: 500 } }}
                        />
                      </MenuItem>
                    </>
                  )}

                  <Divider />

                    <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                      <ListItemIcon>
                        <Logout sx={{ fontSize: 18, color: 'error.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Sign out" />
                    </MenuItem>
                  </Menu>
                  </>
                ) : (
                  <Button
                    component={Link}
                    href="/auth/login"
                    startIcon={<Login sx={{ fontSize: 16 }} />}
                    size="small"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      color: 'text.primary',
                      bgcolor: 'transparent',
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: alpha('#000', 0.05),
                        borderColor: 'divider'
                      }
                    }}
                  >
                    Sign In
                  </Button>
                )}
              </>
            )}
          </Box>
        )}
      </Toolbar>

      {/* Application Switcher Modal */}
      <ApplicationSwitcher
        open={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
      />

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'background.paper',
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Navigation
          </Typography>
          
          {/* Organization & Project Selectors for Mobile */}
          {isAuthenticated && organization && (
            <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <OrganizationSelector />
              <ProjectSelectorNav currentProjectId={currentProjectId} />
            </Box>
          )}
          
          <List>
            {navItems.map((item) => {
              const isActive = isNavItemActive(item);
              return (
                <ListItem key={item.href} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    onClick={handleMobileMenuClose}
                    sx={{
                      color: isActive ? item.color : 'text.secondary',
                      bgcolor: isActive ? alpha(item.color, 0.1) : 'transparent',
                      borderRadius: 1,
                      mb: 0.5,
                      opacity: isActive ? 1 : 0.35,
                      '&:hover': {
                        bgcolor: isActive ? alpha(item.color, 0.15) : alpha('#000', 0.05),
                        opacity: isActive ? 1 : 0.5,
                      }
                    }}
                  >
                    <ListItemIcon 
                      sx={{ 
                        color: isActive ? item.color : 'text.secondary', 
                        minWidth: 40,
                        '& svg': {
                          opacity: isActive ? 1 : 0.3,
                        }
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
            {/* New Actions */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href={
                  organization?.orgId && currentProjectId
                    ? getOrgProjectUrl(organization.orgId, currentProjectId, 'builder')
                    : '/builder'
                }
                onClick={handleMobileMenuClose}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Add />
                </ListItemIcon>
                <ListItemText primary="New Form" />
              </ListItemButton>
            </ListItem>
            {organization?.orgId && (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href={
                      organization?.orgId && currentProjectId
                        ? getOrgProjectUrl(organization.orgId, currentProjectId, 'workflows')
                        : '/workflows'
                    }
                    onClick={handleMobileMenuClose}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      pl: 6,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <AccountTree />
                    </ListItemIcon>
                    <ListItemText primary="New Workflow" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href={`/orgs/${organization.orgId}/projects`}
                    onClick={handleMobileMenuClose}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      pl: 6,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <FolderOpen />
                    </ListItemIcon>
                    <ListItemText primary="New Project" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>

          {isAuthenticated && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Infrastructure
                </Typography>
                <ClusterStatusIndicator />
              </Box>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  toggleTheme();
                  handleMobileMenuClose();
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {mode === 'dark' ? <LightMode /> : <DarkMode />}
                </ListItemIcon>
                <ListItemText primary={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} />
              </ListItemButton>
            </ListItem>
            {isAuthenticated && user && (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href="/settings"
                    onClick={handleMobileMenuClose}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Settings />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      openSearch();
                      handleMobileMenuClose();
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <HelpOutline />
                    </ListItemIcon>
                    <ListItemText primary="Help" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
