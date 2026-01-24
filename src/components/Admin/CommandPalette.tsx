'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  Box,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  alpha,
  InputAdornment,
  Chip,
  Divider,
} from '@mui/material';
import {
  Search,
  Dashboard,
  People,
  Business,
  Speed,
  BugReport,
  History,
  NotificationsActive,
  Settings,
  Campaign,
  Rocket,
  CloudQueue,
  Security,
  PersonSearch,
  SupportAgent,
  CheckCircle,
  Schedule,
  HourglassEmpty,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'search';
  keywords: string[];
  action?: () => void;
  href?: string;
  shortcut?: string;
}

const NAVIGATION_ITEMS: CommandItem[] = [
  {
    id: 'nav-dashboard',
    title: 'Admin Dashboard',
    description: 'Go to admin overview',
    icon: <Dashboard />,
    category: 'navigation',
    keywords: ['home', 'main', 'overview', 'admin'],
    href: '/admin',
  },
  {
    id: 'nav-users',
    title: 'User Management',
    description: 'View and manage users',
    icon: <People />,
    category: 'navigation',
    keywords: ['users', 'accounts', 'members'],
    href: '/admin/users',
  },
  {
    id: 'nav-organizations',
    title: 'Organizations',
    description: 'View and manage organizations',
    icon: <Business />,
    category: 'navigation',
    keywords: ['orgs', 'teams', 'companies'],
    href: '/admin/organizations',
  },
  {
    id: 'nav-waitlist',
    title: 'Waitlist',
    description: 'Manage waitlist applications',
    icon: <HourglassEmpty />,
    category: 'navigation',
    keywords: ['waiting', 'applications', 'approve', 'pending'],
    href: '/admin/waitlist',
  },
  {
    id: 'nav-system-status',
    title: 'System Status',
    description: 'Monitor service health',
    icon: <CloudQueue />,
    category: 'navigation',
    keywords: ['health', 'status', 'services', 'uptime'],
    href: '/admin/system-status',
    shortcut: 'S',
  },
  {
    id: 'nav-errors',
    title: 'Error Tracking',
    description: 'View and manage errors',
    icon: <BugReport />,
    category: 'navigation',
    keywords: ['errors', 'bugs', 'issues', 'problems'],
    href: '/admin/errors',
    shortcut: 'E',
  },
  {
    id: 'nav-audit-logs',
    title: 'Audit Logs',
    description: 'View platform activity logs',
    icon: <History />,
    category: 'navigation',
    keywords: ['logs', 'activity', 'audit', 'history'],
    href: '/admin/audit-logs',
    shortcut: 'L',
  },
  {
    id: 'nav-alerts',
    title: 'Alerts',
    description: 'View alert history',
    icon: <NotificationsActive />,
    category: 'navigation',
    keywords: ['alerts', 'notifications', 'warnings'],
    href: '/admin/alerts',
    shortcut: 'A',
  },
  {
    id: 'nav-alert-rules',
    title: 'Alert Rules',
    description: 'Configure alert rules',
    icon: <Settings />,
    category: 'navigation',
    keywords: ['rules', 'thresholds', 'configure', 'alert settings'],
    href: '/admin/alerts/rules',
  },
  {
    id: 'nav-api-metrics',
    title: 'API Metrics',
    description: 'View API performance',
    icon: <Speed />,
    category: 'navigation',
    keywords: ['api', 'performance', 'latency', 'metrics'],
    href: '/admin/api-metrics',
    shortcut: 'M',
  },
  {
    id: 'nav-broadcasts',
    title: 'Broadcasts',
    description: 'Manage system announcements',
    icon: <Campaign />,
    category: 'navigation',
    keywords: ['announcements', 'messages', 'notifications', 'broadcast'],
    href: '/admin/broadcasts',
  },
  {
    id: 'nav-deployments',
    title: 'Deployments',
    description: 'View deployment history',
    icon: <Rocket />,
    category: 'navigation',
    keywords: ['deploy', 'releases', 'versions', 'git'],
    href: '/admin/deployments',
  },
];

const ACTION_ITEMS: CommandItem[] = [
  {
    id: 'action-search-user',
    title: 'Search User by Email',
    description: 'Find a user by their email address',
    icon: <PersonSearch />,
    category: 'action',
    keywords: ['find', 'lookup', 'user', 'email'],
  },
  {
    id: 'action-impersonate',
    title: 'Impersonate User',
    description: 'View platform as another user',
    icon: <SupportAgent />,
    category: 'action',
    keywords: ['impersonate', 'view as', 'support'],
  },
  {
    id: 'action-approve-waitlist',
    title: 'Approve Waitlist Entry',
    description: 'Approve a pending application',
    icon: <CheckCircle />,
    category: 'action',
    keywords: ['approve', 'accept', 'waitlist'],
  },
  {
    id: 'action-trigger-health-check',
    title: 'Trigger Health Check',
    description: 'Run health checks for all services',
    icon: <CloudQueue />,
    category: 'action',
    keywords: ['health', 'check', 'status', 'refresh'],
  },
  {
    id: 'action-evaluate-alerts',
    title: 'Evaluate Alert Rules',
    description: 'Run all alert rule evaluations now',
    icon: <NotificationsActive />,
    category: 'action',
    keywords: ['alerts', 'evaluate', 'trigger', 'check'],
  },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const router = useRouter();

  // Load recent items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('admin-command-recent');
    if (stored) {
      setRecentItems(JSON.parse(stored));
    }
  }, []);

  // Save recent item
  const addRecentItem = useCallback((id: string) => {
    setRecentItems((prev) => {
      const updated = [id, ...prev.filter((i) => i !== id)].slice(0, 5);
      localStorage.setItem('admin-command-recent', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const allItems = [...NAVIGATION_ITEMS, ...ACTION_ITEMS];

    if (!search) {
      // Show recent items first, then all items
      const recent = recentItems
        .map((id) => allItems.find((item) => item.id === id))
        .filter(Boolean) as CommandItem[];
      const others = allItems.filter((item) => !recentItems.includes(item.id));
      return [...recent, ...others];
    }

    const query = search.toLowerCase();
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.keywords.some((k) => k.includes(query))
      )
      .sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().includes(query);
        const bTitle = b.title.toLowerCase().includes(query);
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        return 0;
      });
  }, [search, recentItems]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          const item = filteredItems[selectedIndex];
          if (item) {
            handleSelect(item);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredItems, selectedIndex, onClose]);

  const handleSelect = (item: CommandItem) => {
    addRecentItem(item.id);

    if (item.href) {
      router.push(item.href);
      onClose();
    } else if (item.action) {
      item.action();
      onClose();
    }

    setSearch('');
  };

  // Clear search on close
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '20%',
          m: 0,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        },
      }}
    >
      {/* Search Input */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TextField
          fullWidth
          placeholder="Search commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: { fontSize: '1.1rem' },
          }}
        />
      </Box>

      {/* Results */}
      <List
        sx={{
          maxHeight: 400,
          overflow: 'auto',
          py: 1,
        }}
      >
        {!search && recentItems.length > 0 && (
          <>
            <Typography
              variant="caption"
              sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}
            >
              Recent
            </Typography>
            {filteredItems
              .filter((item) => recentItems.includes(item.id))
              .map((item, index) => (
                <ListItem
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  selected={selectedIndex === index}
                  sx={{
                    cursor: 'pointer',
                    mx: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      bgcolor: alpha('#2196F3', 0.1),
                    },
                    '&:hover': {
                      bgcolor: alpha('#2196F3', 0.05),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.title}
                        </Typography>
                        {item.shortcut && (
                          <Chip
                            label={`⌘${item.shortcut}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              bgcolor: 'action.hover',
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={item.description}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Schedule sx={{ fontSize: 14, color: 'text.disabled' }} />
                </ListItem>
              ))}
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {(!search && recentItems.length > 0) && (
          <Typography
            variant="caption"
            sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}
          >
            All Commands
          </Typography>
        )}

        {filteredItems
          .filter((item) => search || !recentItems.includes(item.id))
          .map((item, i) => {
            const index = search ? i : i + recentItems.length;
            return (
              <ListItem
                key={item.id}
                onClick={() => handleSelect(item)}
                selected={selectedIndex === index}
                sx={{
                  cursor: 'pointer',
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: alpha('#2196F3', 0.1),
                  },
                  '&:hover': {
                    bgcolor: alpha('#2196F3', 0.05),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.title}
                      </Typography>
                      {item.shortcut && (
                        <Chip
                          label={`⌘${item.shortcut}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            bgcolor: 'action.hover',
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={item.description}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Chip
                  label={item.category === 'navigation' ? 'Navigate' : 'Action'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor:
                      item.category === 'navigation'
                        ? alpha('#2196F3', 0.1)
                        : alpha('#00ED64', 0.1),
                    color:
                      item.category === 'navigation' ? '#2196F3' : '#00ED64',
                  }}
                />
              </ListItem>
            );
          })}

        {filteredItems.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Search sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No results found</Typography>
            <Typography variant="caption" color="text.secondary">
              Try a different search term
            </Typography>
          </Box>
        )}
      </List>

      {/* Footer */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          display: 'flex',
          gap: 2,
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          ↑↓ Navigate
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ↵ Select
        </Typography>
        <Typography variant="caption" color="text.secondary">
          esc Close
        </Typography>
      </Box>
    </Dialog>
  );
}

/**
 * Hook to enable Cmd+K keyboard shortcut for command palette
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
  };
}
