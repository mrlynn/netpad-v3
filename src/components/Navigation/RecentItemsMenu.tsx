'use client';

import { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  History,
  Folder,
  AccountTree,
  Close,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { parseOrgProjectFromPath, getOrgProjectUrl } from '@/lib/routing';

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
const MAX_RECENT_ITEMS = 10;

export function RecentItemsMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  const menuOpen = Boolean(anchorEl);

  // Load recent items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as RecentItem[];
        setRecentItems(items);
      }
    } catch (err) {
      console.error('Failed to load recent items:', err);
    }
  }, []);

  // Track current page as recent item
  useEffect(() => {
    // Parse pathname to detect forms/workflows
    const formMatch = pathname.match(/\/forms\/([^/]+)/);
    const workflowMatch = pathname.match(/\/workflows\/([^/]+)/);
    const builderMatch = pathname.match(/\/builder(?:\/([^/]+))?/);
    const orgProjectFormMatch = pathname.match(/\/orgs\/([^/]+)\/projects\/([^/]+)\/forms\/([^/]+)/);
    const orgProjectWorkflowMatch = pathname.match(/\/orgs\/([^/]+)\/projects\/([^/]+)\/workflows\/([^/]+)/);

    let item: RecentItem | null = null;

    if (orgProjectFormMatch) {
      const [, orgId, projectId, formId] = orgProjectFormMatch;
      // Try to get form name from page (we'll need to enhance this)
      item = {
        id: formId,
        name: `Form ${formId.slice(0, 8)}`,
        type: 'form',
        path: pathname,
        timestamp: Date.now(),
        orgId,
        projectId,
      };
    } else if (orgProjectWorkflowMatch) {
      const [, orgId, projectId, workflowId] = orgProjectWorkflowMatch;
      item = {
        id: workflowId,
        name: `Workflow ${workflowId.slice(0, 8)}`,
        type: 'workflow',
        path: pathname,
        timestamp: Date.now(),
        orgId,
        projectId,
      };
    } else if (formMatch) {
      const formId = formMatch[1];
      item = {
        id: formId,
        name: `Form ${formId.slice(0, 8)}`,
        type: 'form',
        path: pathname,
        timestamp: Date.now(),
      };
    } else if (workflowMatch) {
      const workflowId = workflowMatch[1];
      item = {
        id: workflowId,
        name: `Workflow ${workflowId.slice(0, 8)}`,
        type: 'workflow',
        path: pathname,
        timestamp: Date.now(),
      };
    } else if (builderMatch && builderMatch[1]) {
      const formId = builderMatch[1];
      item = {
        id: formId,
        name: `Form ${formId.slice(0, 8)}`,
        type: 'form',
        path: pathname,
        timestamp: Date.now(),
      };
    }

    if (item) {
      setRecentItems((prev) => {
        // Remove duplicates (same id and type)
        const filtered = prev.filter(
          (i) => !(i.id === item!.id && i.type === item!.type)
        );
        // Add new item at the beginning
        const updated = [item!, ...filtered].slice(0, MAX_RECENT_ITEMS);
        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save recent items:', err);
        }
        return updated;
      });
    }
  }, [pathname]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (item: RecentItem) => {
    router.push(item.path);
    handleClose();
  };

  const handleRemoveItem = (e: React.MouseEvent, item: RecentItem) => {
    e.stopPropagation();
    setRecentItems((prev) => {
      const updated = prev.filter(
        (i) => !(i.id === item.id && i.type === item.type)
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save recent items:', err);
      }
      return updated;
    });
  };

  const handleClearAll = () => {
    setRecentItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear recent items:', err);
    }
  };

  const forms = recentItems.filter((i) => i.type === 'form');
  const workflows = recentItems.filter((i) => i.type === 'workflow');

  return (
    <>
      <Tooltip title="Recent items">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              bgcolor: alpha('#000', 0.05),
            },
          }}
        >
          <History sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 280,
            maxWidth: 320,
            maxHeight: 400,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Recent Items
          </Typography>
          {recentItems.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleClearAll}
            >
              Clear all
            </Typography>
          )}
        </Box>

        {recentItems.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No recent items
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Forms and workflows you visit will appear here
            </Typography>
          </Box>
        ) : (
          <>
            {forms.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600 }}>
                    Forms
                  </Typography>
                </Box>
                {forms.map((item) => (
                  <MenuItem
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    sx={{
                      py: 1,
                      px: 2,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Folder sx={{ fontSize: 18, color: '#00ED64' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: { fontSize: '0.8125rem' },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleRemoveItem(e, item)}
                      sx={{
                        ml: 1,
                        p: 0.5,
                        '&:hover': {
                          bgcolor: alpha('#f44336', 0.1),
                        },
                      }}
                    >
                      <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                  </MenuItem>
                ))}
              </>
            )}

            {workflows.length > 0 && (
              <>
                {forms.length > 0 && <Divider />}
                <Box sx={{ px: 2, py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600 }}>
                    Workflows
                  </Typography>
                </Box>
                {workflows.map((item) => (
                  <MenuItem
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    sx={{
                      py: 1,
                      px: 2,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <AccountTree sx={{ fontSize: 18, color: '#9C27B0' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: { fontSize: '0.8125rem' },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => handleRemoveItem(e, item)}
                      sx={{
                        ml: 1,
                        p: 0.5,
                        '&:hover': {
                          bgcolor: alpha('#f44336', 0.1),
                        },
                      }}
                    >
                      <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                  </MenuItem>
                ))}
              </>
            )}
          </>
        )}
      </Menu>
    </>
  );
}
