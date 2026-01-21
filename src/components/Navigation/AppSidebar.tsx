/**
 * App Sidebar (Zone 2)
 *
 * Persistent left sidebar for application navigation.
 * Always visible (240px width) when inside an application context.
 *
 * Features:
 * - Application list with active app highlighting
 * - "+ New Application" button
 * - Recent items section
 * - Scrollable when content exceeds viewport
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Button,
  alpha,
  Skeleton,
  Collapse,
} from '@mui/material';
import {
  Apps,
  Add,
  History,
  ExpandMore,
  ExpandLess,
  Description,
  AccountTree,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApplication, useRecentApplications, useApplicationsByProject } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl } from '@/lib/routing';
import { Application } from '@/types/application';
import { TemplateIcon } from '@/components/Templates/TemplateIcon';

// ============================================
// Constants
// ============================================

export const SIDEBAR_WIDTH = 240;

// ============================================
// Types
// ============================================

// Match the RecentItem interface from RecentItemsMenu.tsx
interface RecentItem {
  id: string;
  name: string;
  type: 'form' | 'workflow';
  path: string;
  timestamp: number;
  orgId?: string;
  projectId?: string;
}

const STORAGE_KEY = 'netpad_recent_items';

// ============================================
// Helper Components
// ============================================

interface AppListItemProps {
  app: Application;
  isActive: boolean;
  isFocused?: boolean;
}

function AppListItem({ app, isActive, isFocused = false }: AppListItemProps) {
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        component={Link}
        href={getAppUrl(app.slug, 'forms')}
        sx={{
          borderRadius: 1.5,
          py: 1,
          px: 1.5,
          bgcolor: isActive
            ? (theme) => alpha(app.color || theme.palette.primary.main, 0.12)
            : isFocused
            ? (theme) => alpha(theme.palette.primary.main, 0.06)
            : 'transparent',
          borderLeft: isActive ? '3px solid' : '3px solid transparent',
          borderLeftColor: isActive ? (app.color || 'primary.main') : 'transparent',
          outline: isFocused ? '2px solid' : 'none',
          outlineColor: isFocused ? 'primary.main' : 'transparent',
          outlineOffset: -2,
          '&:hover': {
            bgcolor: (theme) => alpha(app.color || theme.palette.primary.main, 0.08),
          },
          transition: 'all 0.15s ease',
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: app.color || ((theme) => alpha(theme.palette.primary.main, 0.15)),
              color: app.color ? '#fff' : 'primary.main',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {app.icon ? (
              <TemplateIcon icon={app.icon} size={14} color={app.color ? '#fff' : undefined} />
            ) : (
              app.name.charAt(0).toUpperCase()
            )}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={app.name}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            noWrap: true,
            color: isActive ? 'text.primary' : 'text.secondary',
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

// ============================================
// Main Component
// ============================================

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentOrgId } = useOrganization();
  const { applications, currentApplication, isLoading } = useApplication();
  const { recentApps } = useRecentApplications(5);

  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLUListElement>(null);

  // Load recent items from localStorage (shared with RecentItemsMenu)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadRecentItems = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const items = JSON.parse(stored) as RecentItem[];
          // Sort by timestamp (most recent first) and limit to 5
          const sorted = items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
          setRecentItems(sorted);
        }
      } catch {
        // Ignore errors
      }
    };

    // Load initially
    loadRecentItems();

    // Listen for storage changes (in case another tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadRecentItems();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pathname]);

  // Get current app slug from URL or context
  const currentAppSlug = currentApplication?.slug || pathname?.match(/^\/apps\/([^/]+)/)?.[1];

  const handleNewApp = () => {
    // Navigate to create new application
    if (currentOrgId) {
      router.push(`/orgs/${currentOrgId}/projects`);
    }
  };

  // Keyboard navigation for app list
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (applications.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < applications.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : applications.length - 1
        );
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < applications.length) {
          const app = applications[focusedIndex];
          router.push(getAppUrl(app.slug, 'forms'));
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        break;
    }
  }, [applications, focusedIndex, router]);

  // Reset focus when applications change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [applications]);

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            letterSpacing: 1,
            fontSize: '0.7rem',
          }}
        >
          Applications
        </Typography>
      </Box>

      {/* Application List */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {isLoading ? (
          // Loading skeletons
          <List disablePadding>
            {[1, 2, 3].map((i) => (
              <ListItem key={i} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton sx={{ borderRadius: 1.5, py: 1, px: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Skeleton variant="rounded" width={24} height={24} />
                  </ListItemIcon>
                  <ListItemText>
                    <Skeleton width="80%" />
                  </ListItemText>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : applications.length === 0 ? (
          // Empty state with call to action
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Apps sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No applications yet
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Create your first app to get started
            </Typography>
          </Box>
        ) : (
          // Application list with keyboard navigation
          <List
            ref={listRef}
            disablePadding
            onKeyDown={handleKeyDown}
            tabIndex={0}
            sx={{
              outline: 'none',
              '&:focus-visible': {
                // Show subtle focus indicator on list
              },
            }}
          >
            {applications.map((app, index) => (
              <AppListItem
                key={app.applicationId}
                app={app}
                isActive={app.slug === currentAppSlug}
                isFocused={focusedIndex === index}
              />
            ))}
          </List>
        )}

        {/* New Application Button */}
        <Box sx={{ px: 0.5, py: 1 }}>
          <Button
            fullWidth
            startIcon={<Add />}
            onClick={handleNewApp}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: '0.875rem',
              py: 1,
              px: 1.5,
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            New Application
          </Button>
        </Box>
      </Box>

      <Divider />

      {/* Recent Items Section */}
      <Box sx={{ flexShrink: 0 }}>
        <ListItemButton
          onClick={() => setShowRecent(!showRecent)}
          sx={{ py: 1, px: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <History sx={{ fontSize: 18, color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText
            primary="Recent"
            primaryTypographyProps={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          />
          {showRecent ? (
            <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} />
          ) : (
            <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />
          )}
        </ListItemButton>

        <Collapse in={showRecent}>
          <List disablePadding sx={{ px: 1, pb: 1 }}>
            {recentItems.length === 0 ? (
              <ListItem sx={{ py: 1 }}>
                <ListItemText
                  primary="No recent items"
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    color: 'text.disabled',
                    textAlign: 'center',
                  }}
                />
              </ListItem>
            ) : (
              recentItems.map((item) => (
                <ListItem key={`${item.type}-${item.id}`} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    component={Link}
                    href={item.path}
                    sx={{
                      borderRadius: 1,
                      py: 0.75,
                      px: 1.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      {item.type === 'form' ? (
                        <Description sx={{ fontSize: 16, color: '#00ED64' }} />
                      ) : (
                        <AccountTree sx={{ fontSize: 16, color: '#9C27B0' }} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      primaryTypographyProps={{
                        fontSize: '0.8125rem',
                        noWrap: true,
                        color: 'text.secondary',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Collapse>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {drawerContent}
    </Box>
  );
}

export default AppSidebar;
