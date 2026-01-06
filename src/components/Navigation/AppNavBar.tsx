'use client';

import { useState } from 'react';
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
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useHelp } from '@/contexts/HelpContext';
import { useTheme as useAppTheme } from '@/contexts/ThemeContext';
import { ClusterStatusIndicator } from './ClusterStatusIndicator';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  matchPaths?: string[]; // Additional paths that should highlight this nav item
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/my-forms',
    label: 'Forms',
    icon: <Folder sx={{ fontSize: 18 }} />,
    color: '#00ED64',
    matchPaths: ['/forms', '/builder'],
  },
  {
    href: '/workflows',
    label: 'Workflows',
    icon: <AccountTree sx={{ fontSize: 18 }} />,
    color: '#9C27B0',
  },
  {
    href: '/data',
    label: 'Data',
    icon: <Storage sx={{ fontSize: 18 }} />,
    color: '#2196F3',
  },
];

export function AppNavBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout, registerPasskey } = useAuth();
  const { openSearch } = useHelp();
  const { mode, toggleTheme } = useAppTheme();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if a nav item is active based on current path
  const isNavItemActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
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
        {/* Logo / Home */}
        <Tooltip title="Back to home">
          <Box
            component={Link}
            href="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              borderRadius: 1,
              px: 0.5,
              py: 0.25,
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.1)
              },
              transition: 'background-color 0.15s ease'
            }}
          >
            <Image
              src="/logo-250x250-trans.png"
              alt="NetPad"
              width={28}
              height={28}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0, 237, 100, 0.2))',
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              NetPad
            </Typography>
          </Box>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Desktop Navigation - hide on mobile */}
        {!isMobile && (
          <>
            {/* Navigation Items */}
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item);
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  startIcon={item.icon}
                  size="small"
                  sx={{
                    minWidth: 'auto',
                    px: 1.5,
                    py: 0.5,
                    color: isActive ? item.color : 'text.secondary',
                    bgcolor: isActive ? alpha(item.color, 0.1) : 'transparent',
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.8125rem',
                    '&:hover': {
                      bgcolor: alpha(item.color, 0.15),
                      color: item.color
                    },
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </Button>
              );
            })}

            {/* New Form Button */}
            <Button
              component={Link}
              href="/builder"
              startIcon={<Add sx={{ fontSize: 18 }} />}
              size="small"
              sx={{
                minWidth: 'auto',
                px: 1.5,
                py: 0.5,
                color: '#00ED64',
                bgcolor: alpha('#00ED64', 0.1),
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                '&:hover': {
                  bgcolor: alpha('#00ED64', 0.2)
                },
                transition: 'all 0.15s ease'
              }}
            >
              New Form
            </Button>
          </>
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

        {/* Cluster Status - only show when authenticated, hide on mobile */}
        {isAuthenticated && !isMobile && <ClusterStatusIndicator />}

        {/* Theme Toggle */}
        <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
          <IconButton
            size="small"
            onClick={toggleTheme}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: mode === 'dark' ? '#ffa726' : '#5c6bc0',
                bgcolor: mode === 'dark' ? alpha('#ffa726', 0.1) : alpha('#5c6bc0', 0.1)
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
                  color: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.1),
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  '&:hover': {
                    bgcolor: alpha('#00ED64', 0.2)
                  }
                }}
              >
                Sign In
              </Button>
            )}
          </>
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
          <List>
            {NAV_ITEMS.map((item) => {
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
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                href="/builder"
                onClick={handleMobileMenuClose}
                sx={{
                  color: '#00ED64',
                  bgcolor: alpha('#00ED64', 0.1),
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    bgcolor: alpha('#00ED64', 0.2),
                  }
                }}
              >
                <ListItemIcon sx={{ color: '#00ED64', minWidth: 40 }}>
                  <Add />
                </ListItemIcon>
                <ListItemText 
                  primary="New Form"
                  primaryTypographyProps={{
                    fontWeight: 600,
                  }}
                />
              </ListItemButton>
            </ListItem>
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
