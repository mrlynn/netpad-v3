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
} from '@mui/material';
import {
  Circle,
  Home,
  GitHub,
  HelpOutline,
  Login,
  Logout,
  Fingerprint,
  Settings,
  Key,
  Folder,
  Add,
  Storage,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePipeline } from '@/contexts/PipelineContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHelp } from '@/contexts/HelpContext';
import { useTheme } from '@/contexts/ThemeContext';

export function AppNavBar() {
  const { connectionString, databaseName, collection } = usePipeline();
  const { user, isAuthenticated, isLoading, logout, registerPasskey } = useAuth();
  const { openSearch } = useHelp();
  const { mode, toggleTheme } = useTheme();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const isConnected = Boolean(connectionString && databaseName);
  const connectionLabel = isConnected
    ? collection
      ? `${databaseName}.${collection}`
      : databaseName
    : 'Not Connected';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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
        borderColor: 'divider'
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
          <IconButton
            component={Link}
            href="/"
            size="small"
            sx={{
              color: '#00ED64',
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.1)
              }
            }}
          >
            <Home sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* App Title */}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mr: 2,
            display: { xs: 'none', sm: 'block' }
          }}
        >
          FormBuilder
        </Typography>

        {/* My Forms Link */}
        <Tooltip title="View all your saved forms">
          <Button
            component={Link}
            href="/my-forms"
            startIcon={<Folder sx={{ fontSize: 18 }} />}
            size="small"
            sx={{
              minWidth: 'auto',
              px: 1.5,
              py: 0.5,
              color: 'text.secondary',
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64'
              },
              transition: 'all 0.15s ease'
            }}
          >
            My Forms
          </Button>
        </Tooltip>

        {/* New Form Button */}
        <Tooltip title="Create a new form">
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
        </Tooltip>

        {/* Data Browser Link - Always accessible for authenticated users */}
        <Tooltip title="Browse and import data">
          <Button
            component={Link}
            href="/data"
            startIcon={<Storage sx={{ fontSize: 18 }} />}
            size="small"
            sx={{
              minWidth: 'auto',
              px: 1.5,
              py: 0.5,
              color: 'text.secondary',
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              '&:hover': {
                bgcolor: alpha('#00ED64', 0.1),
                color: '#00ED64'
              },
              transition: 'all 0.15s ease'
            }}
          >
            Data
          </Button>
        </Tooltip>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Connection Status */}
        <Tooltip title={isConnected ? `Connected to ${connectionLabel}` : 'No database connection'}>
          <Chip
            icon={
              isConnected
                ? <Circle sx={{ fontSize: '8px !important', color: '#00ED64' }} />
                : <Circle sx={{ fontSize: '8px !important', color: 'text.disabled' }} />
            }
            label={connectionLabel}
            size="small"
            sx={{
              height: 24,
              maxWidth: 200,
              fontSize: '0.75rem',
              bgcolor: isConnected ? alpha('#00ED64', 0.1) : alpha('#000', 0.1),
              color: isConnected ? '#00ED64' : 'text.secondary',
              '& .MuiChip-icon': {
                ml: 0.75
              },
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }}
          />
        </Tooltip>

        {/* GitHub Link */}
        <Tooltip title="View on GitHub">
          <IconButton
            component="a"
            href="https://github.com/mrlynn/aggregation-builder"
            target="_blank"
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: '#00ED64',
                bgcolor: alpha('#00ED64', 0.1)
              }
            }}
          >
            <GitHub sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Help */}
        <Tooltip title="Help (Cmd+/)">
          <IconButton
            size="small"
            onClick={openSearch}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: '#00ED64',
                bgcolor: alpha('#00ED64', 0.1)
              }
            }}
          >
            <HelpOutline sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
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
                      ml: 0.5,
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

                  <MenuItem onClick={handleMenuClose} disabled>
                    <ListItemIcon>
                      <Settings sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
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
                  ml: 0.5,
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
    </AppBar>
  );
}
