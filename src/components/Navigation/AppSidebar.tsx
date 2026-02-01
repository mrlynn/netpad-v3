/**
 * App Sidebar (Zone 2)
 *
 * Persistent left sidebar for application navigation.
 * Always visible (240px width) when inside an application context.
 *
 * Features:
 * - Application tree view with expandable sections
 * - Forms, Workflows, Settings, Data under each app
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
  Tooltip,
  IconButton,
  Popover,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Apps,
  Add,
  History,
  ExpandMore,
  ExpandLess,
  Description,
  AccountTree,
  Settings,
  Storage,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  Folder,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApplication, useRecentApplications } from '@/contexts/ApplicationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getAppUrl } from '@/lib/routing';
import { Application } from '@/types/application';
import { TemplateIcon } from '@/components/Templates/TemplateIcon';
import { useSidebarSafe } from '@/contexts/SidebarContext';
import { useSimplifiedUISafe } from '@/hooks/useSimplifiedUI';

// ============================================
// Constants
// ============================================

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 52;
export const SIDEBAR_TRANSITION = 'width 200ms ease-in-out';

// ============================================
// Types
// ============================================

interface RecentItem {
  id: string;
  name: string;
  type: 'form' | 'workflow';
  path: string;
  timestamp: number;
  orgId?: string;
  projectId?: string;
}

interface FormItem {
  id: string;
  formId: string;
  name: string;
  slug?: string;
  isPublished?: boolean;
}

interface WorkflowItem {
  id: string;
  name: string;
  slug?: string;
  status?: string;
}

interface AppContentCache {
  forms: FormItem[];
  workflows: WorkflowItem[];
  loading: boolean;
  loaded: boolean;
}

const STORAGE_KEY = 'netpad_recent_items';

// ============================================
// Helper Components
// ============================================

interface AppTreeItemProps {
  app: Application;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  content: AppContentCache;
  onLoadContent: () => void;
  currentPath: string;
}

function AppTreeItem({
  app,
  isActive,
  isExpanded,
  onToggle,
  content,
  onLoadContent,
  currentPath,
}: AppTreeItemProps) {
  const handleClick = () => {
    onToggle();
    if (!content.loaded && !content.loading) {
      onLoadContent();
    }
  };

  // Check if current path matches any child
  const formsPath = getAppUrl(app.slug, 'forms');
  const workflowsPath = getAppUrl(app.slug, 'workflows');
  const settingsPath = getAppUrl(app.slug, 'settings');
  const dataPath = getAppUrl(app.slug, 'data');

  const isFormsActive = currentPath.startsWith(formsPath);
  const isWorkflowsActive = currentPath.startsWith(workflowsPath);
  const isSettingsActive = currentPath === settingsPath;
  const isDataActive = currentPath.startsWith(dataPath);

  return (
    <Box sx={{ mb: 0.5 }}>
      {/* Application Header */}
      <ListItemButton
        onClick={handleClick}
        sx={{
          borderRadius: 1.5,
          py: 0.75,
          px: 1,
          bgcolor: isActive
            ? (theme) => alpha(app.color || theme.palette.primary.main, 0.12)
            : 'transparent',
          borderLeft: isActive ? '3px solid' : '3px solid transparent',
          borderLeftColor: isActive ? (app.color || 'primary.main') : 'transparent',
          '&:hover': {
            bgcolor: (theme) => alpha(app.color || theme.palette.primary.main, 0.08),
          },
          transition: 'all 0.15s ease',
        }}
      >
        <ListItemIcon sx={{ minWidth: 24 }}>
          {isExpanded ? (
            <ExpandMore sx={{ fontSize: 18, color: 'text.secondary' }} />
          ) : (
            <ChevronRight sx={{ fontSize: 18, color: 'text.secondary' }} />
          )}
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: 28 }}>
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: app.color || ((theme) => alpha(theme.palette.primary.main, 0.15)),
              color: app.color ? '#fff' : 'primary.main',
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            {app.icon ? (
              <TemplateIcon icon={app.icon} size={12} color={app.color ? '#fff' : undefined} />
            ) : (
              app.name.charAt(0).toUpperCase()
            )}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={app.name}
          primaryTypographyProps={{
            fontSize: '0.8125rem',
            fontWeight: isActive ? 600 : 500,
            noWrap: true,
            color: isActive ? 'text.primary' : 'text.secondary',
          }}
        />
      </ListItemButton>

      {/* Expanded Content */}
      <Collapse in={isExpanded}>
        <List disablePadding sx={{ pl: 2.5 }}>
          {/* Forms Section */}
          <TreeSection
            label="Forms"
            icon={<Description sx={{ fontSize: 16, color: '#00ED64' }} />}
            items={content.forms}
            loading={content.loading}
            basePath={formsPath}
            currentPath={currentPath}
            isActive={isFormsActive}
            itemPath={(item) => `${formsPath}/${item.formId || item.id}/edit`}
            count={app.stats?.formsCount}
            emptyText="No forms"
            newItemPath={`${formsPath}/new`}
            newItemLabel="New Form"
          />

          {/* Workflows Section */}
          <TreeSection
            label="Workflows"
            icon={<AccountTree sx={{ fontSize: 16, color: '#9C27B0' }} />}
            items={content.workflows}
            loading={content.loading}
            basePath={workflowsPath}
            currentPath={currentPath}
            isActive={isWorkflowsActive}
            itemPath={(item) => `${workflowsPath}/${item.id}`}
            count={app.stats?.workflowsCount}
            emptyText="No workflows"
            newItemPath={workflowsPath}
            newItemLabel="New Workflow"
          />

          {/* Settings Link */}
          <ListItem disablePadding sx={{ mb: 0.25 }}>
            <ListItemButton
              component={Link}
              href={settingsPath}
              sx={{
                borderRadius: 1,
                py: 0.5,
                px: 1,
                bgcolor: isSettingsActive ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 24 }}>
                <Settings sx={{ fontSize: 16, color: isSettingsActive ? 'primary.main' : 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                primaryTypographyProps={{
                  fontSize: '0.75rem',
                  fontWeight: isSettingsActive ? 600 : 400,
                  color: isSettingsActive ? 'text.primary' : 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* Data Link */}
          <ListItem disablePadding sx={{ mb: 0.25 }}>
            <ListItemButton
              component={Link}
              href={dataPath}
              sx={{
                borderRadius: 1,
                py: 0.5,
                px: 1,
                bgcolor: isDataActive ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 24 }}>
                <Storage sx={{ fontSize: 16, color: isDataActive ? 'primary.main' : 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary="Data"
                primaryTypographyProps={{
                  fontSize: '0.75rem',
                  fontWeight: isDataActive ? 600 : 400,
                  color: isDataActive ? 'text.primary' : 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Collapse>
    </Box>
  );
}

interface TreeSectionProps {
  label: string;
  icon: React.ReactNode;
  items: Array<{ id: string; formId?: string; name: string; slug?: string }>;
  loading: boolean;
  basePath: string;
  currentPath: string;
  isActive: boolean;
  itemPath: (item: { id: string; formId?: string; name: string; slug?: string }) => string;
  count?: number;
  emptyText: string;
  newItemPath: string;
  newItemLabel: string;
}

function TreeSection({
  label,
  icon,
  items,
  loading,
  basePath,
  currentPath,
  isActive,
  itemPath,
  count,
  emptyText,
  newItemPath,
  newItemLabel,
}: TreeSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand if active
  useEffect(() => {
    if (isActive) {
      setExpanded(true);
    }
  }, [isActive]);

  return (
    <Box sx={{ mb: 0.5 }}>
      {/* Section Header */}
      <ListItemButton
        onClick={() => setExpanded(!expanded)}
        sx={{
          borderRadius: 1,
          py: 0.5,
          px: 1,
          bgcolor: isActive && !expanded ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 20 }}>
          {expanded ? (
            <ExpandMore sx={{ fontSize: 14, color: 'text.secondary' }} />
          ) : (
            <ChevronRight sx={{ fontSize: 14, color: 'text.secondary' }} />
          )}
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: 24 }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: '0.75rem',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? 'text.primary' : 'text.secondary',
          }}
        />
        {count !== undefined && count > 0 && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
            {count}
          </Typography>
        )}
      </ListItemButton>

      {/* Section Items */}
      <Collapse in={expanded}>
        <List disablePadding sx={{ pl: 2 }}>
          {loading ? (
            <ListItem sx={{ py: 0.5, px: 1 }}>
              <NetPadLoader size="small" variant="ascii" showPhrases={false} />
            </ListItem>
          ) : items.length === 0 ? (
            <ListItem sx={{ py: 0.5, px: 1 }}>
              <Typography variant="caption" color="text.disabled">{emptyText}</Typography>
            </ListItem>
          ) : (
            items.slice(0, 10).map((item) => {
              const path = itemPath(item);
              const isItemActive = currentPath.includes(item.formId || item.id);
              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    component={Link}
                    href={path}
                    sx={{
                      borderRadius: 1,
                      py: 0.25,
                      px: 1,
                      bgcolor: isItemActive ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemText
                      primary={item.name}
                      primaryTypographyProps={{
                        fontSize: '0.7rem',
                        fontWeight: isItemActive ? 600 : 400,
                        noWrap: true,
                        color: isItemActive ? 'text.primary' : 'text.secondary',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
          {items.length > 10 && (
            <ListItem sx={{ py: 0.25, px: 1 }}>
              <ListItemButton
                component={Link}
                href={basePath}
                sx={{ borderRadius: 1, py: 0.25, px: 0.5 }}
              >
                <Typography variant="caption" color="primary">
                  +{items.length - 10} more...
                </Typography>
              </ListItemButton>
            </ListItem>
          )}
          {/* Add New Item */}
          <ListItem disablePadding sx={{ mt: 0.5 }}>
            <ListItemButton
              component={Link}
              href={newItemPath}
              sx={{
                borderRadius: 1,
                py: 0.25,
                px: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 20 }}>
                <Add sx={{ fontSize: 12, color: 'text.secondary' }} />
              </ListItemIcon>
              <ListItemText
                primary={newItemLabel}
                primaryTypographyProps={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Collapse>
    </Box>
  );
}

// ============================================
// Collapsed Sidebar Components
// ============================================

interface CollapsedNavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  section?: string;
}

interface CollapsedSidebarContentProps {
  currentAppSlug: string | null;
  currentPath: string;
  currentApp: Application | null;
  recentItems: RecentItem[];
  onToggle: () => void;
}

function CollapsedSidebarContent({
  currentAppSlug,
  currentPath,
  currentApp,
  recentItems,
  onToggle,
}: CollapsedSidebarContentProps) {
  const [recentAnchor, setRecentAnchor] = useState<HTMLButtonElement | null>(null);

  const navItems: CollapsedNavItem[] = currentAppSlug
    ? [
        { key: 'overview', icon: <Apps sx={{ fontSize: 20 }} />, label: 'Overview', section: '' },
        { key: 'forms', icon: <Description sx={{ fontSize: 20, color: '#00ED64' }} />, label: 'Forms', section: 'forms' },
        { key: 'workflows', icon: <AccountTree sx={{ fontSize: 20, color: '#9C27B0' }} />, label: 'Workflows', section: 'workflows' },
        { key: 'data', icon: <Storage sx={{ fontSize: 20 }} />, label: 'Data', section: 'data' },
        { key: 'settings', icon: <Settings sx={{ fontSize: 20 }} />, label: 'Settings', section: 'settings' },
      ]
    : [];

  const isActive = (section: string) => {
    if (!currentAppSlug) return false;
    const basePath = `/apps/${currentAppSlug}`;
    if (section === '') {
      return currentPath === basePath || currentPath === `${basePath}/`;
    }
    return currentPath.startsWith(`${basePath}/${section}`);
  };

  const getHref = (section: string) => {
    if (!currentAppSlug) return '#';
    return section ? `/apps/${currentAppSlug}/${section}` : `/apps/${currentAppSlug}`;
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.paper',
        py: 1,
      }}
    >
      {/* Current App Icon */}
      {currentApp && (
        <Tooltip title={currentApp.name} placement="right">
          <IconButton
            component={Link}
            href={getHref('')}
            sx={{
              width: 36,
              height: 36,
              mb: 1,
              borderRadius: 1,
              bgcolor: (theme) => alpha(currentApp.color || theme.palette.primary.main, 0.15),
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 0.75,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: currentApp.color || 'primary.main',
                color: '#fff',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {currentApp.icon ? (
                <TemplateIcon icon={currentApp.icon} size={14} color="#fff" />
              ) : (
                currentApp.name.charAt(0).toUpperCase()
              )}
            </Box>
          </IconButton>
        </Tooltip>
      )}

      <Divider sx={{ width: '70%', my: 1 }} />

      {/* Navigation Icons */}
      {navItems.slice(1).map((item) => (
        <Tooltip key={item.key} title={item.label} placement="right">
          <IconButton
            component={Link}
            href={getHref(item.section || '')}
            sx={{
              width: 36,
              height: 36,
              mb: 0.5,
              borderRadius: 1,
              color: isActive(item.section || '') ? 'primary.main' : 'text.secondary',
              bgcolor: isActive(item.section || '')
                ? (theme) => alpha(theme.palette.primary.main, 0.1)
                : 'transparent',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            {item.icon}
          </IconButton>
        </Tooltip>
      ))}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Recent Items */}
      <Divider sx={{ width: '70%', my: 1 }} />
      <Tooltip title="Recent items" placement="right">
        <IconButton
          onClick={(e) => setRecentAnchor(e.currentTarget)}
          sx={{
            width: 36,
            height: 36,
            mb: 1,
            borderRadius: 1,
            color: recentAnchor ? 'primary.main' : 'text.secondary',
            bgcolor: recentAnchor
              ? (theme) => alpha(theme.palette.primary.main, 0.1)
              : 'transparent',
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          <History sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      {/* Recent Items Popover */}
      <Popover
        open={Boolean(recentAnchor)}
        anchorEl={recentAnchor}
        onClose={() => setRecentAnchor(null)}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              ml: 1,
              width: 220,
              maxHeight: 300,
            },
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography
            variant="overline"
            sx={{ px: 1, color: 'text.secondary', fontSize: '0.65rem' }}
          >
            Recent Items
          </Typography>
          <List disablePadding>
            {recentItems.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No recent items"
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    color: 'text.disabled',
                  }}
                />
              </ListItem>
            ) : (
              recentItems.map((item) => (
                <ListItem key={`${item.type}-${item.id}`} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={item.path}
                    onClick={() => setRecentAnchor(null)}
                    sx={{ borderRadius: 1, py: 0.75 }}
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
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Box>
      </Popover>

      {/* Toggle Button */}
      <Tooltip title="Expand sidebar (Cmd+B)" placement="right">
        <IconButton
          onClick={onToggle}
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'action.hover',
              color: 'text.primary',
            },
          }}
        >
          <ChevronRight sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
    </Box>
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
  const { isCollapsed, toggle } = useSidebarSafe();
  const { useFlatAppList, appCount } = useSimplifiedUISafe();

  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [appContents, setAppContents] = useState<Record<string, AppContentCache>>({});
  const listRef = useRef<HTMLUListElement>(null);

  // Load recent items from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadRecentItems = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const items = JSON.parse(stored) as RecentItem[];
          const sorted = items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
          setRecentItems(sorted);
        }
      } catch {
        // Ignore errors
      }
    };

    loadRecentItems();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadRecentItems();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pathname]);

  // Auto-expand the current application
  useEffect(() => {
    if (currentApplication) {
      setExpandedApps((prev) => {
        const next = new Set(prev);
        next.add(currentApplication.applicationId);
        return next;
      });
      // Also load content if not already loaded
      if (!appContents[currentApplication.applicationId]?.loaded) {
        loadAppContent(currentApplication.applicationId);
      }
    }
  }, [currentApplication?.applicationId]);

  // Listen for form changes (create, delete, update) to refresh sidebar
  useEffect(() => {
    const handleFormChange = (e: CustomEvent<{ applicationId?: string }>) => {
      const appId = e.detail?.applicationId || currentApplication?.applicationId;
      if (appId) {
        // Force reload by marking as not loaded, then load
        setAppContents((prev) => ({
          ...prev,
          [appId]: { ...prev[appId], loaded: false },
        }));
        loadAppContent(appId);
      }
    };

    window.addEventListener('netpad:form-changed', handleFormChange as EventListener);
    return () => window.removeEventListener('netpad:form-changed', handleFormChange as EventListener);
  }, [currentApplication?.applicationId, currentOrgId]);

  // Listen for workflow changes (create, delete, update) to refresh sidebar
  useEffect(() => {
    const handleWorkflowChange = (e: CustomEvent<{ applicationId?: string }>) => {
      const appId = e.detail?.applicationId || currentApplication?.applicationId;
      if (appId) {
        // Force reload by marking as not loaded, then load
        setAppContents((prev) => ({
          ...prev,
          [appId]: { ...prev[appId], loaded: false },
        }));
        loadAppContent(appId);
      }
    };

    window.addEventListener('netpad:workflow-changed', handleWorkflowChange as EventListener);
    return () => window.removeEventListener('netpad:workflow-changed', handleWorkflowChange as EventListener);
  }, [currentApplication?.applicationId, currentOrgId]);

  const currentAppSlug = currentApplication?.slug || pathname?.match(/^\/apps\/([^/]+)/)?.[1];

  const handleNewApp = () => {
    if (currentOrgId) {
      router.push(`/orgs/${currentOrgId}/projects`);
    }
  };

  const toggleAppExpanded = (appId: string) => {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const loadAppContent = async (appId: string) => {
    if (!currentOrgId) return;

    // Mark as loading
    setAppContents((prev) => ({
      ...prev,
      [appId]: { forms: [], workflows: [], loading: true, loaded: false },
    }));

    try {
      // Fetch forms and workflows in parallel
      const [formsRes, workflowsRes] = await Promise.all([
        fetch(`/api/forms/list?orgId=${currentOrgId}&applicationId=${appId}`),
        fetch(`/api/workflows?orgId=${currentOrgId}&applicationId=${appId}`),
      ]);

      const formsData = formsRes.ok ? await formsRes.json() : { forms: [] };
      const workflowsData = workflowsRes.ok ? await workflowsRes.json() : { workflows: [] };

      setAppContents((prev) => ({
        ...prev,
        [appId]: {
          forms: (formsData.forms || []).map((f: any) => ({
            id: f.id || f.formId,
            formId: f.formId || f.id,
            name: f.name,
            slug: f.slug,
            isPublished: f.isPublished,
          })),
          workflows: (workflowsData.workflows || []).map((w: any) => ({
            id: w.id,
            name: w.name,
            slug: w.slug,
            status: w.status,
          })),
          loading: false,
          loaded: true,
        },
      }));
    } catch (err) {
      console.error('Failed to load app content:', err);
      setAppContents((prev) => ({
        ...prev,
        [appId]: { forms: [], workflows: [], loading: false, loaded: true },
      }));
    }
  };

  const getAppContent = (appId: string): AppContentCache => {
    return appContents[appId] || { forms: [], workflows: [], loading: false, loaded: false };
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header - hidden for simple setups to reduce noise */}
      {!useFlatAppList && (
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
      )}
      
      {/* Small top padding when header is hidden */}
      {useFlatAppList && <Box sx={{ pt: 1 }} />}

      {/* Application Tree */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {isLoading ? (
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
          <List ref={listRef} disablePadding>
            {applications.map((app) => (
              <AppTreeItem
                key={app.applicationId}
                app={app}
                isActive={app.slug === currentAppSlug}
                isExpanded={expandedApps.has(app.applicationId)}
                onToggle={() => toggleAppExpanded(app.applicationId)}
                content={getAppContent(app.applicationId)}
                onLoadContent={() => loadAppContent(app.applicationId)}
                currentPath={pathname || ''}
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
            {useFlatAppList ? 'New App' : 'New Application'}
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
                      '&:hover': { bgcolor: 'action.hover' },
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

        {/* Toggle Button */}
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="Collapse sidebar (Cmd+B)" placement="right">
            <IconButton
              onClick={toggle}
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              <ChevronLeft sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        height: '100%',
        overflow: 'hidden',
        transition: SIDEBAR_TRANSITION,
      }}
    >
      {isCollapsed ? (
        <CollapsedSidebarContent
          currentAppSlug={currentAppSlug || null}
          currentPath={pathname || ''}
          currentApp={currentApplication}
          recentItems={recentItems}
          onToggle={toggle}
        />
      ) : (
        drawerContent
      )}
    </Box>
  );
}

export default AppSidebar;
