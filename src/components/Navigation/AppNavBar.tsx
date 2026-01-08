'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useHelp } from '@/contexts/HelpContext';
import { useTheme as useAppTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ClusterStatusIndicator } from './ClusterStatusIndicator';
import { OrganizationSelector } from './OrganizationSelector';
import { ProjectSelectorNav } from './ProjectSelectorNav';
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
    color: '#FF9800',
    matchPaths: ['/projects'],
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
];

export function AppNavBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout, registerPasskey } = useAuth();
  const { organization, currentOrgId } = useOrganization();
  const { openSearch } = useHelp();
  const { mode, toggleTheme } = useAppTheme();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

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
        // Projects link goes to org's projects list, not project-specific
        if (config.key === 'projects') {
          return {
            href: `/orgs/${urlOrgId}/projects`,
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
        return {
          href: config.key === 'forms' ? '/my-forms' : `/${config.key}`,
          label: config.label,
          icon: config.icon,
          color: config.color,
          matchPaths: config.matchPaths,
        };
      });
      setNavItems(items);
      
      // Get project from localStorage for legacy routes
      const stored = localStorage.getItem('selected_project_id');
      setCurrentProjectId(stored || undefined);
    }
  }, [pathname, organization]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newMenuAnchorEl, setNewMenuAnchorEl] = useState<null | HTMLElement>(null);
  const newMenuOpen = Boolean(newMenuAnchorEl);

  // Check if a nav item is active based on current path
  const isNavItemActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    // Special handling for projects - match /orgs/[orgId]/projects (with or without trailing slash or sub-paths)
    if (item.href.includes('/projects') && pathname.match(/^\/orgs\/[^/]+\/projects(\/|$)/)) {
      return true;
    }
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

          {/* Organization & Project Selectors - Compact, quieter */}
          {isAuthenticated && organization && !isMobile && (
            <>
              <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <OrganizationSelector compact />
                <ProjectSelectorNav compact currentProjectId={currentProjectId} />
              </Box>
            </>
          )}
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* CENTER: Primary Navigation - Tabs, not pills */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {navItems.map((item) => {
              const isActive = isNavItemActive(item);
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  startIcon={<Box sx={{ display: 'flex', alignItems: 'center' }}>{item.icon}</Box>}
                  size="small"
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    py: 0.75,
                    color: isActive ? item.color : 'text.secondary',
                    bgcolor: 'transparent',
                    borderRadius: 0,
                    textTransform: 'none',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.875rem',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: isActive ? 'calc(100% - 16px)' : 0,
                      height: 2,
                      bgcolor: isActive ? item.color : 'transparent',
                      transition: 'width 0.2s ease',
                    },
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: isActive ? item.color : 'text.primary',
                      '&::after': {
                        width: isActive ? 'calc(100% - 16px)' : 'calc(100% - 16px)',
                        bgcolor: isActive ? item.color : alpha(item.color, 0.3),
                      }
                    },
                    transition: 'color 0.15s ease'
                  }}
                >
                  {item.label}
                </Button>
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
                      color: isActive ? item.color : 'text.primary',
                      bgcolor: isActive ? alpha(item.color, 0.1) : 'transparent',
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': {
                        bgcolor: alpha(item.color, 0.15),
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive ? item.color : 'inherit', minWidth: 40 }}>
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
