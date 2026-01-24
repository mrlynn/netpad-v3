'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  IconButton,
  Collapse,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  alpha,
  Link,
} from '@mui/material';
import {
  Close,
  Info,
  Warning,
  Error as ErrorIcon,
  Build,
  CheckCircle,
} from '@mui/icons-material';

interface Broadcast {
  broadcastId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'maintenance' | 'success';
  placement: 'banner' | 'toast' | 'modal';
  dismissible: boolean;
  linkUrl?: string;
  linkText?: string;
  startsAt: string;
  expiresAt?: string;
}

const TYPE_COLORS = {
  info: '#2196F3',
  warning: '#FF9800',
  alert: '#f44336',
  maintenance: '#9C27B0',
  success: '#00ED64',
};

const TYPE_ICONS = {
  info: <Info />,
  warning: <Warning />,
  alert: <ErrorIcon />,
  maintenance: <Build />,
  success: <CheckCircle />,
};

const TYPE_SEVERITY: Record<string, 'info' | 'warning' | 'error' | 'success'> = {
  info: 'info',
  warning: 'warning',
  alert: 'error',
  maintenance: 'info',
  success: 'success',
};

export function SystemBroadcast() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState<Record<string, boolean>>({});

  const fetchBroadcasts = useCallback(async () => {
    try {
      const response = await fetch('/api/broadcasts/active');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.broadcasts) {
          setBroadcasts(data.broadcasts);
          // Initialize toast open states for toast placement broadcasts
          const toasts: Record<string, boolean> = {};
          data.broadcasts.forEach((b: Broadcast) => {
            if (b.placement === 'toast' && !dismissedIds.has(b.broadcastId)) {
              toasts[b.broadcastId] = true;
            }
          });
          setToastOpen(toasts);
          // Auto-open first modal if exists
          const modalBroadcast = data.broadcasts.find(
            (b: Broadcast) => b.placement === 'modal' && !dismissedIds.has(b.broadcastId)
          );
          if (modalBroadcast) {
            setModalOpen(modalBroadcast.broadcastId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error);
    }
  }, [dismissedIds]);

  useEffect(() => {
    fetchBroadcasts();
    // Refresh broadcasts every 5 minutes
    const interval = setInterval(fetchBroadcasts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBroadcasts]);

  const handleDismiss = async (broadcastId: string) => {
    try {
      const response = await fetch('/api/broadcasts/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcastId }),
      });
      if (response.ok) {
        setDismissedIds((prev) => new Set([...prev, broadcastId]));
        setToastOpen((prev) => ({ ...prev, [broadcastId]: false }));
        if (modalOpen === broadcastId) {
          setModalOpen(null);
        }
      }
    } catch (error) {
      console.error('Failed to dismiss broadcast:', error);
    }
  };

  const handleLocalDismiss = (broadcastId: string) => {
    setDismissedIds((prev) => new Set([...prev, broadcastId]));
    setToastOpen((prev) => ({ ...prev, [broadcastId]: false }));
    if (modalOpen === broadcastId) {
      setModalOpen(null);
    }
  };

  // Filter visible broadcasts
  const visibleBroadcasts = broadcasts.filter((b) => !dismissedIds.has(b.broadcastId));
  const bannerBroadcasts = visibleBroadcasts.filter((b) => b.placement === 'banner');
  const toastBroadcasts = visibleBroadcasts.filter((b) => b.placement === 'toast');
  const modalBroadcast = visibleBroadcasts.find((b) => b.placement === 'modal' && b.broadcastId === modalOpen);

  return (
    <>
      {/* Banner Broadcasts - shown at top of page */}
      {bannerBroadcasts.length > 0 && (
        <Box sx={{ width: '100%' }}>
          {bannerBroadcasts.map((broadcast) => (
            <Collapse key={broadcast.broadcastId} in={!dismissedIds.has(broadcast.broadcastId)}>
              <Alert
                severity={TYPE_SEVERITY[broadcast.type]}
                icon={TYPE_ICONS[broadcast.type]}
                action={
                  broadcast.dismissible ? (
                    <IconButton
                      aria-label="close"
                      color="inherit"
                      size="small"
                      onClick={() => handleDismiss(broadcast.broadcastId)}
                    >
                      <Close fontSize="inherit" />
                    </IconButton>
                  ) : null
                }
                sx={{
                  borderRadius: 0,
                  bgcolor: alpha(TYPE_COLORS[broadcast.type], 0.15),
                  borderBottom: '1px solid',
                  borderColor: alpha(TYPE_COLORS[broadcast.type], 0.3),
                  '& .MuiAlert-icon': {
                    color: TYPE_COLORS[broadcast.type],
                  },
                }}
              >
                <AlertTitle sx={{ fontWeight: 600 }}>{broadcast.title}</AlertTitle>
                <Typography variant="body2" component="span">
                  {broadcast.message}
                </Typography>
                {broadcast.linkUrl && (
                  <Link
                    href={broadcast.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ ml: 1 }}
                  >
                    {broadcast.linkText || 'Learn more'}
                  </Link>
                )}
              </Alert>
            </Collapse>
          ))}
        </Box>
      )}

      {/* Toast Broadcasts - shown as snackbars */}
      {toastBroadcasts.map((broadcast, index) => (
        <Snackbar
          key={broadcast.broadcastId}
          open={toastOpen[broadcast.broadcastId] ?? true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ bottom: { xs: 90 + index * 80, sm: 24 + index * 80 } }}
        >
          <Alert
            severity={TYPE_SEVERITY[broadcast.type]}
            icon={TYPE_ICONS[broadcast.type]}
            onClose={
              broadcast.dismissible
                ? () => handleDismiss(broadcast.broadcastId)
                : undefined
            }
            sx={{
              minWidth: 300,
              maxWidth: 400,
              boxShadow: 3,
              bgcolor: alpha(TYPE_COLORS[broadcast.type], 0.15),
              '& .MuiAlert-icon': {
                color: TYPE_COLORS[broadcast.type],
              },
            }}
          >
            <AlertTitle sx={{ fontWeight: 600 }}>{broadcast.title}</AlertTitle>
            <Typography variant="body2" component="span">
              {broadcast.message}
            </Typography>
            {broadcast.linkUrl && (
              <Box sx={{ mt: 1 }}>
                <Link
                  href={broadcast.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {broadcast.linkText || 'Learn more'}
                </Link>
              </Box>
            )}
          </Alert>
        </Snackbar>
      ))}

      {/* Modal Broadcasts - shown as dialogs */}
      {modalBroadcast && (
        <Dialog
          open={true}
          onClose={
            modalBroadcast.dismissible
              ? () => handleLocalDismiss(modalBroadcast.broadcastId)
              : undefined
          }
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: alpha(TYPE_COLORS[modalBroadcast.type], 0.1),
              borderBottom: '1px solid',
              borderColor: alpha(TYPE_COLORS[modalBroadcast.type], 0.2),
            }}
          >
            <Box sx={{ color: TYPE_COLORS[modalBroadcast.type] }}>
              {TYPE_ICONS[modalBroadcast.type]}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {modalBroadcast.title}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <Typography>{modalBroadcast.message}</Typography>
            {modalBroadcast.linkUrl && (
              <Box sx={{ mt: 2 }}>
                <Link
                  href={modalBroadcast.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {modalBroadcast.linkText || 'Learn more'}
                </Link>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {modalBroadcast.dismissible && (
              <Button
                onClick={() => handleDismiss(modalBroadcast.broadcastId)}
                variant="contained"
                color={TYPE_SEVERITY[modalBroadcast.type] === 'error' ? 'error' : 'primary'}
              >
                Dismiss
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
