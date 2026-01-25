'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  NewReleases,
  LocalFireDepartment,
  PriorityHigh,
  Stars,
  Bolt,
  Announcement,
  AutoAwesome,
  RocketLaunch,
  SystemUpdateAlt,
  Lightbulb,
  LocalOffer,
  Security,
  Policy,
  Science,
  AccessTime,
  Tune,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';

type CustomBadge =
  | 'new'
  | 'hot'
  | 'attention'
  | 'special'
  | 'urgent'
  | 'announcement'
  | 'breaking'
  | 'launch'
  | 'update'
  | 'tip'
  | 'promo'
  | 'security'
  | 'policy'
  | 'beta'
  | 'limited';

interface Broadcast {
  broadcastId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'maintenance' | 'success' | 'custom';
  customBadge?: CustomBadge;
  placement: 'banner' | 'toast' | 'modal';
  dismissible: boolean;
  linkUrl?: string;
  linkText?: string;
  startsAt: string;
  expiresAt?: string;
}

const TYPE_COLORS: Record<string, string> = {
  info: '#2196F3',
  warning: '#FF9800',
  alert: '#f44336',
  maintenance: '#9C27B0',
  success: '#00ED64',
  custom: '#00BCD4',
};

const TYPE_ICONS: Record<string, React.ReactElement> = {
  info: <Info />,
  warning: <Warning />,
  alert: <ErrorIcon />,
  maintenance: <Build />,
  success: <CheckCircle />,
  custom: <Tune />,
};

const TYPE_SEVERITY: Record<string, 'info' | 'warning' | 'error' | 'success'> = {
  info: 'info',
  warning: 'warning',
  alert: 'error',
  maintenance: 'info',
  success: 'success',
  custom: 'info',
};

// Custom badge configurations
const BADGE_CONFIG: Record<CustomBadge, { icon: React.ReactElement; color: string; label: string }> = {
  new: { icon: <NewReleases />, color: '#00ED64', label: 'New' },
  hot: { icon: <LocalFireDepartment />, color: '#FF5722', label: 'Hot' },
  attention: { icon: <PriorityHigh />, color: '#FF9800', label: 'Attention' },
  special: { icon: <Stars />, color: '#FFD700', label: 'Special' },
  urgent: { icon: <Bolt />, color: '#f44336', label: 'Urgent' },
  announcement: { icon: <Announcement />, color: '#2196F3', label: 'Announcement' },
  breaking: { icon: <AutoAwesome />, color: '#E91E63', label: 'Breaking' },
  launch: { icon: <RocketLaunch />, color: '#9C27B0', label: 'Launch' },
  update: { icon: <SystemUpdateAlt />, color: '#00BCD4', label: 'Update' },
  tip: { icon: <Lightbulb />, color: '#FFC107', label: 'Tip' },
  promo: { icon: <LocalOffer />, color: '#4CAF50', label: 'Promo' },
  security: { icon: <Security />, color: '#f44336', label: 'Security' },
  policy: { icon: <Policy />, color: '#607D8B', label: 'Policy' },
  beta: { icon: <Science />, color: '#673AB7', label: 'Beta' },
  limited: { icon: <AccessTime />, color: '#FF5722', label: 'Limited' },
};

// Helper to get display config for a broadcast
function getDisplayConfig(broadcast: Broadcast) {
  if (broadcast.type === 'custom' && broadcast.customBadge && BADGE_CONFIG[broadcast.customBadge]) {
    return BADGE_CONFIG[broadcast.customBadge];
  }
  return {
    icon: TYPE_ICONS[broadcast.type],
    color: TYPE_COLORS[broadcast.type],
    label: null,
  };
}

const BANNER_ROTATION_INTERVAL = 45000; // 45 seconds per message

export function SystemBroadcast() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState<Record<string, boolean>>({});
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Reset banner index if it exceeds available banners
  useEffect(() => {
    if (currentBannerIndex >= bannerBroadcasts.length && bannerBroadcasts.length > 0) {
      setCurrentBannerIndex(0);
    }
  }, [bannerBroadcasts.length, currentBannerIndex]);

  // Auto-rotation for banner carousel
  useEffect(() => {
    if (bannerBroadcasts.length <= 1) {
      return;
    }

    const startRotation = () => {
      rotationTimerRef.current = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % bannerBroadcasts.length);
      }, BANNER_ROTATION_INTERVAL);
    };

    startRotation();

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, [bannerBroadcasts.length]);

  // Navigation handlers
  const goToPreviousBanner = () => {
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
    }
    setCurrentBannerIndex((prev) => (prev - 1 + bannerBroadcasts.length) % bannerBroadcasts.length);
    // Restart rotation after manual navigation
    rotationTimerRef.current = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerBroadcasts.length);
    }, BANNER_ROTATION_INTERVAL);
  };

  const goToNextBanner = () => {
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
    }
    setCurrentBannerIndex((prev) => (prev + 1) % bannerBroadcasts.length);
    // Restart rotation after manual navigation
    rotationTimerRef.current = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannerBroadcasts.length);
    }, BANNER_ROTATION_INTERVAL);
  };

  return (
    <>
      {/* Banner Broadcasts - shown at top of page with carousel */}
      {bannerBroadcasts.length > 0 && (() => {
        const currentBroadcast = bannerBroadcasts[currentBannerIndex];
        if (!currentBroadcast) return null;
        const displayConfig = getDisplayConfig(currentBroadcast);
        const hasMultipleBanners = bannerBroadcasts.length > 1;

        return (
          <Box sx={{ width: '100%', position: 'relative' }}>
            <Collapse in={!dismissedIds.has(currentBroadcast.broadcastId)}>
              <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                {/* Semi-transparent micro-mark branding */}
                <Box
                  component="img"
                  src="/micro-mark-white-trans.png"
                  alt=""
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    right: hasMultipleBanners ? 120 : 80,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 40,
                    width: 'auto',
                    opacity: 0.15,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
                <Alert
                  severity={TYPE_SEVERITY[currentBroadcast.type]}
                  icon={displayConfig.icon}
                  action={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {/* Navigation arrows for multiple banners */}
                      {hasMultipleBanners && (
                        <>
                          <IconButton
                            aria-label="Previous announcement"
                            color="inherit"
                            size="small"
                            onClick={goToPreviousBanner}
                            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                          >
                            <ChevronLeft fontSize="small" />
                          </IconButton>
                          <IconButton
                            aria-label="Next announcement"
                            color="inherit"
                            size="small"
                            onClick={goToNextBanner}
                            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                          >
                            <ChevronRight fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {currentBroadcast.dismissible && (
                        <IconButton
                          aria-label="close"
                          color="inherit"
                          size="small"
                          onClick={() => handleDismiss(currentBroadcast.broadcastId)}
                        >
                          <Close fontSize="inherit" />
                        </IconButton>
                      )}
                    </Box>
                  }
                  sx={{
                    borderRadius: 0,
                    bgcolor: alpha(displayConfig.color, 0.15),
                    borderBottom: '1px solid',
                    borderColor: alpha(displayConfig.color, 0.3),
                    position: 'relative',
                    zIndex: 1,
                    '& .MuiAlert-icon': {
                      color: displayConfig.color,
                    },
                    '& .MuiAlert-action': {
                      alignItems: 'center',
                      pt: 0,
                    },
                  }}
                >
                  <AlertTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {displayConfig.label && (
                      <Box
                        component="span"
                        sx={{
                          bgcolor: alpha(displayConfig.color, 0.2),
                          color: displayConfig.color,
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {displayConfig.label}
                      </Box>
                    )}
                    {currentBroadcast.title}
                  </AlertTitle>
                  <Typography variant="body2" component="span">
                    {currentBroadcast.message}
                  </Typography>
                  {currentBroadcast.linkUrl && (
                    <Link
                      href={currentBroadcast.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ ml: 1 }}
                    >
                      {currentBroadcast.linkText || 'Learn more'}
                    </Link>
                  )}
                </Alert>
              </Box>
            </Collapse>
          </Box>
        );
      })()}

      {/* Toast Broadcasts - shown as snackbars */}
      {toastBroadcasts.map((broadcast, index) => {
        const displayConfig = getDisplayConfig(broadcast);
        return (
          <Snackbar
            key={broadcast.broadcastId}
            open={toastOpen[broadcast.broadcastId] ?? true}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            sx={{ bottom: { xs: 90 + index * 80, sm: 24 + index * 80 } }}
          >
            <Alert
              severity={TYPE_SEVERITY[broadcast.type]}
              icon={displayConfig.icon}
              onClose={
                broadcast.dismissible
                  ? () => handleDismiss(broadcast.broadcastId)
                  : undefined
              }
              sx={{
                minWidth: 300,
                maxWidth: 400,
                boxShadow: 3,
                bgcolor: alpha(displayConfig.color, 0.15),
                '& .MuiAlert-icon': {
                  color: displayConfig.color,
                },
              }}
            >
              <AlertTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                {displayConfig.label && (
                  <Box
                    component="span"
                    sx={{
                      bgcolor: alpha(displayConfig.color, 0.2),
                      color: displayConfig.color,
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {displayConfig.label}
                  </Box>
                )}
                {broadcast.title}
              </AlertTitle>
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
        );
      })}

      {/* Modal Broadcasts - shown as dialogs */}
      {modalBroadcast && (() => {
        const displayConfig = getDisplayConfig(modalBroadcast);
        return (
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
                bgcolor: alpha(displayConfig.color, 0.1),
                borderBottom: '1px solid',
                borderColor: alpha(displayConfig.color, 0.2),
              }}
            >
              <Box sx={{ color: displayConfig.color }}>
                {displayConfig.icon}
              </Box>
              {displayConfig.label && (
                <Box
                  component="span"
                  sx={{
                    bgcolor: alpha(displayConfig.color, 0.2),
                    color: displayConfig.color,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {displayConfig.label}
                </Box>
              )}
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
        );
      })()}
    </>
  );
}
