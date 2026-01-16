'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  InputAdornment,
  alpha,
  useTheme,
  IconButton,
  Chip,
  Button,
  Skeleton,
  useMediaQuery,
} from '@mui/material';
import {
  Search,
  Apps,
  ExpandMore,
  ExpandLess,
  Add,
  History,
  Folder,
  KeyboardCommandKey,
  Refresh,
  ErrorOutline,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useApplication, useRecentApplications, useApplicationsByProject } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Application } from '@/types/application';
import { getAppUrl } from '@/lib/routing';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { NetPadLoader } from '@/components/common/NetPadLoader';

// ============================================
// Types
// ============================================

interface ApplicationSwitcherProps {
  open: boolean;
  onClose: () => void;
  onCreateApp?: () => void;
}

interface ProjectGroup {
  projectId: string;
  projectName?: string;
  applications: Application[];
  isCollapsed: boolean;
}

// ============================================
// Helper Components
// ============================================

function ApplicationIcon({ app, size = 24 }: { app: Application; size?: number }) {
  const theme = useTheme();

  // Use app icon if available, otherwise first letter of name
  if (app.icon) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.7,
        }}
      >
        {app.icon}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: app.color || alpha(theme.palette.primary.main, 0.1),
        color: app.color ? '#fff' : theme.palette.primary.main,
        fontWeight: 600,
        fontSize: size * 0.5,
      }}
    >
      {app.name.charAt(0).toUpperCase()}
    </Box>
  );
}

// ============================================
// Main Component
// ============================================

export function ApplicationSwitcher({ open, onClose, onCreateApp }: ApplicationSwitcherProps) {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentOrgId, organization } = useOrganization();
  const { selectApplication, currentApplication, isLoading, applications, error, refreshApplications } = useApplication();
  const { recentApps } = useRecentApplications(5);
  const { groups: projectGroups } = useApplicationsByProject();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  // Announce search results to screen readers
  const announceResults = useCallback((count: number, query: string) => {
    if (announcerRef.current) {
      if (query) {
        announcerRef.current.textContent = count === 0
          ? `No applications found for "${query}"`
          : `${count} application${count === 1 ? '' : 's'} found`;
      } else {
        announcerRef.current.textContent = `${count} application${count === 1 ? '' : 's'} available`;
      }
    }
  }, []);

  // Handle retry after error
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await refreshApplications();
    } finally {
      setIsRetrying(false);
    }
  }, [refreshApplications]);

  // ----------------------------------------
  // Computed Values
  // ----------------------------------------

  // Filter applications by search query
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) {
      return applications;
    }

    const query = searchQuery.toLowerCase();
    return applications.filter(
      app =>
        app.name.toLowerCase().includes(query) ||
        app.description?.toLowerCase().includes(query) ||
        app.slug.toLowerCase().includes(query)
    );
  }, [applications, searchQuery]);

  // Build flat list of items for keyboard navigation
  const navigationItems = useMemo(() => {
    const items: Array<{ type: 'app' | 'create'; app?: Application }> = [];

    if (searchQuery.trim()) {
      // When searching, show flat filtered list
      filteredApps.forEach(app => {
        items.push({ type: 'app', app });
      });
    } else {
      // Show recent apps first
      recentApps.forEach(app => {
        items.push({ type: 'app', app });
      });

      // Then grouped by project (excluding recent apps from groups)
      const recentIds = new Set(recentApps.map(a => a.applicationId));
      projectGroups.forEach(group => {
        if (!collapsedProjects.has(group.projectId)) {
          group.applications.forEach(app => {
            if (!recentIds.has(app.applicationId)) {
              items.push({ type: 'app', app });
            }
          });
        }
      });
    }

    // Add create option at the end
    items.push({ type: 'create' });

    return items;
  }, [filteredApps, searchQuery, recentApps, projectGroups, collapsedProjects]);

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  const handleSelectApp = useCallback(async (app: Application) => {
    setIsNavigating(true);
    try {
      // Select application in context (updates localStorage, recent apps, etc.)
      await selectApplication(app.applicationId, { navigate: false });

      // Navigate to the new app-centric URL structure
      const url = getAppUrl(app.slug, 'forms');
      router.push(url);
      onClose();
    } catch (error) {
      console.error('[ApplicationSwitcher] Failed to select app:', error);
    } finally {
      setIsNavigating(false);
    }
  }, [selectApplication, router, onClose]);

  const handleCreateApp = useCallback(() => {
    onClose();
    if (onCreateApp) {
      onCreateApp();
    }
  }, [onClose, onCreateApp]);

  const toggleProjectCollapse = useCallback((projectId: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, navigationItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const item = navigationItems[highlightedIndex];
        if (item?.type === 'app' && item.app) {
          handleSelectApp(item.app);
        } else if (item?.type === 'create') {
          handleCreateApp();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [navigationItems, highlightedIndex, handleSelectApp, handleCreateApp, onClose]);

  // ----------------------------------------
  // Effects
  // ----------------------------------------

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setIsNavigating(false);
      // Focus search input after dialog opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Reset highlighted index when search changes and announce results
  useEffect(() => {
    setHighlightedIndex(0);
    // Debounce announcement to avoid excessive screen reader updates
    const timer = setTimeout(() => {
      announceResults(filteredApps.length, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filteredApps.length, announceResults]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[data-nav-item]');
      const highlightedItem = items[highlightedIndex];
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // ----------------------------------------
  // Render Helpers
  // ----------------------------------------

  const renderAppItem = (app: Application, index: number, showProjectName = false) => {
    const isHighlighted = index === highlightedIndex;
    const isCurrentApp = currentApplication?.applicationId === app.applicationId;

    return (
      <ListItem 
        key={app.applicationId} 
        disablePadding 
        data-nav-item
        role="option"
        aria-selected={isHighlighted}
        id={`app-${app.applicationId}`}
      >
        <ListItemButton
          selected={isHighlighted}
          onClick={() => handleSelectApp(app)}
          sx={{
            borderRadius: 1,
            mx: 1,
            py: isMobile ? 1.5 : 1, // Larger touch target on mobile
            minHeight: isMobile ? 44 : 'auto', // Ensure 44px minimum on mobile
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
          }}
          aria-label={`${app.name}${isCurrentApp ? ', current application' : ''}`}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <ApplicationIcon app={app} size={28} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  {app.name}
                </Typography>
                {isCurrentApp && (
                  <Chip
                    label="Current"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.65rem',
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                    }}
                    aria-label="Current application"
                  />
                )}
              </Box>
            }
            secondary={
              showProjectName && (
                <Typography variant="caption" color="text.secondary">
                  {/* We'd need project name here - for now show nothing */}
                </Typography>
              )
            }
          />
        </ListItemButton>
      </ListItem>
    );
  };

  // ----------------------------------------
  // Main Render
  // ----------------------------------------

  return (
    <>
      {/* Screen reader announcements */}
      <Box
        ref={announcerRef}
        component="div"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      />
      
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: isMobile ? '90vh' : '70vh',
            overflow: 'hidden',
          },
        }}
        // Focus management
        disableAutoFocus={false}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
        aria-labelledby="app-switcher-title"
        aria-describedby="app-switcher-description"
      >
      {/* Search Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          inputRef={searchInputRef}
          fullWidth
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          size="small"
          aria-label="Search applications"
          aria-describedby="app-switcher-description"
          inputProps={{
            'aria-autocomplete': 'list',
            'aria-controls': 'app-switcher-list',
            'role': 'combobox',
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    backgroundColor: alpha(theme.palette.text.primary, 0.05),
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                >
                  <KeyboardCommandKey sx={{ fontSize: 12 }} />
                  <Typography variant="caption">K</Typography>
                </Box>
              </InputAdornment>
            ),
            sx: {
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              backgroundColor: alpha(theme.palette.text.primary, 0.03),
              borderRadius: 1,
            },
          }}
        />
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
        {/* Hidden description for screen readers */}
        <Box
          id="app-switcher-description"
          sx={{
            position: 'absolute',
            left: '-10000px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        >
          Application switcher. Use arrow keys to navigate, Enter to select, Escape to close.
        </Box>

        {isLoading ? (
          <Box sx={{ px: 2, py: 4 }}>
            {/* Skeleton loading states */}
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant="circular" width={28} height={28} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : error ? (
          // Error state with retry
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <ErrorOutline sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Failed to Load Applications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {error || 'An error occurred while loading applications. Please try again.'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => refreshApplications()}
              sx={{ minHeight: 44 }} // Ensure touch target size
            >
              Retry
            </Button>
          </Box>
        ) : applications.length === 0 ? (
          // Empty state
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Apps sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Applications Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first application to get started
            </Typography>
          </Box>
        ) : (
          <List 
            ref={listRef} 
            sx={{ py: 1 }}
            id="app-switcher-list"
            role="listbox"
            aria-label="Applications"
            aria-activedescendant={
              navigationItems[highlightedIndex]?.type === 'app' && navigationItems[highlightedIndex]?.app
                ? `app-${navigationItems[highlightedIndex].app?.applicationId}`
                : undefined
            }
          >
            {/* Search Results */}
            {searchQuery.trim() ? (
              <>
                {filteredApps.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No applications found for "{searchQuery}"
                    </Typography>
                  </Box>
                ) : (
                  filteredApps.map((app, idx) => renderAppItem(app, idx, true))
                )}
              </>
            ) : (
              <>
                {/* Recent Applications */}
                {recentApps.length > 0 && (
                  <>
                    <ListItem sx={{ py: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <History sx={{ fontSize: 14 }} />
                        Recent
                      </Typography>
                    </ListItem>
                    {recentApps.map((app, idx) => renderAppItem(app, idx))}
                    <Divider sx={{ my: 1 }} />
                  </>
                )}

                {/* Applications by Project */}
                {projectGroups.map((group, groupIdx) => {
                  const isCollapsed = collapsedProjects.has(group.projectId);
                  const recentIds = new Set(recentApps.map(a => a.applicationId));
                  const nonRecentApps = group.applications.filter(
                    app => !recentIds.has(app.applicationId)
                  );

                  // Skip empty groups (all apps already shown in recent)
                  if (nonRecentApps.length === 0) return null;

                  // Calculate starting index for this group's apps
                  const startIdx = recentApps.length + projectGroups
                    .slice(0, groupIdx)
                    .reduce((sum, g) => {
                      const ids = new Set(recentApps.map(a => a.applicationId));
                      return sum + g.applications.filter(a => !ids.has(a.applicationId)).length;
                    }, 0);

                  return (
                    <React.Fragment key={group.projectId}>
                      <ListItemButton
                        onClick={() => toggleProjectCollapse(group.projectId)}
                        sx={{ py: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Folder sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              {group.projectId} {/* Would need project name lookup */}
                            </Typography>
                          }
                        />
                        {isCollapsed ? (
                          <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />
                        ) : (
                          <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} />
                        )}
                      </ListItemButton>
                      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
                        {nonRecentApps.map((app, idx) =>
                          renderAppItem(app, startIdx + idx)
                        )}
                      </Collapse>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </List>
        )}

        {/* Create New Application */}
        <Divider />
        <List sx={{ py: 0.5 }}>
          <ListItem 
            disablePadding 
            data-nav-item
            role="option"
            aria-selected={highlightedIndex === navigationItems.length - 1}
            id="create-app-option"
          >
            <ListItemButton
              onClick={handleCreateApp}
              selected={highlightedIndex === navigationItems.length - 1}
              sx={{
                borderRadius: 1,
                mx: 1,
                py: isMobile ? 1.5 : 1, // Larger touch target on mobile
                minHeight: isMobile ? 44 : 'auto', // Ensure 44px minimum on mobile
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
              aria-label="Create new application"
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Add sx={{ color: theme.palette.primary.main }} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" color="primary" fontWeight={500}>
                    Create new application
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        </List>
      </DialogContent>

      {/* Loading overlay */}
      {isNavigating && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            zIndex: 1,
          }}
        >
          <NetPadLoader size="small" message="Switching application..." />
        </Box>
      )}
      </Dialog>
    </>
  );
}

// ============================================
// Keyboard Shortcut Hook
// ============================================

/**
 * Hook to register the Cmd+K / Ctrl+K global shortcut for opening the app switcher
 * Uses the global useKeyboardShortcuts hook
 */
export function useApplicationSwitcherShortcut(onOpen: () => void) {
  useKeyboardShortcuts({
    shortcuts: [
      COMMON_SHORTCUTS.commandPalette(() => onOpen()),
    ],
    enabled: true,
  });
}

export default ApplicationSwitcher;
