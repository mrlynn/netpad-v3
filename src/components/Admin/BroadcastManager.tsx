'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  alpha,
  Skeleton,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Campaign,
  Add,
  Edit,
  Delete,
  Refresh,
  Info,
  Warning,
  Error as ErrorIcon,
  Build,
  Schedule,
  CheckCircle,
  AutoAwesome,
  NewReleases,
  LocalFireDepartment,
  PriorityHigh,
  Stars,
  Announcement,
  Bolt,
  RocketLaunch,
  SystemUpdateAlt,
  Lightbulb,
  LocalOffer,
  Security,
  Policy,
  Science,
  AccessTime,
  Tune,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import useSWR from 'swr';
import { BroadcastType, BroadcastPlacement, BroadcastAudience, CustomBadge } from '@/types/observability';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AdminBroadcast {
  _id: string;
  broadcastId: string;
  title: string;
  message: string;
  type: BroadcastType;
  customBadge?: CustomBadge;
  linkUrl?: string;
  linkText?: string;
  audience: BroadcastAudience;
  targetOrganizations?: string[];
  placement: BroadcastPlacement;
  dismissible: boolean;
  startsAt: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
}

interface BroadcastStats {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
  byType: Record<BroadcastType, number>;
}

interface BroadcastsResponse {
  success: boolean;
  broadcasts: AdminBroadcast[];
  stats?: BroadcastStats;
}

const TYPE_CONFIG: Record<BroadcastType, { icon: React.ReactElement; color: string; label: string }> = {
  info: { icon: <Info />, color: '#2196F3', label: 'Info' },
  warning: { icon: <Warning />, color: '#FF9800', label: 'Warning' },
  alert: { icon: <ErrorIcon />, color: '#f44336', label: 'Alert' },
  maintenance: { icon: <Build />, color: '#9C27B0', label: 'Maintenance' },
  success: { icon: <CheckCircle />, color: '#00ED64', label: 'Success' },
  custom: { icon: <Tune />, color: '#00BCD4', label: 'Custom' },
};

// Custom badge configurations
const BADGE_CONFIG: Record<CustomBadge, { icon: React.ReactElement; color: string; label: string; description: string }> = {
  new: { icon: <NewReleases />, color: '#00ED64', label: 'New', description: 'New features or content' },
  hot: { icon: <LocalFireDepartment />, color: '#FF5722', label: 'Hot', description: 'Trending or popular' },
  attention: { icon: <PriorityHigh />, color: '#FF9800', label: 'Attention', description: 'Requires user attention' },
  special: { icon: <Stars />, color: '#FFD700', label: 'Special', description: 'Special announcements' },
  urgent: { icon: <Bolt />, color: '#f44336', label: 'Urgent', description: 'Time-sensitive updates' },
  announcement: { icon: <Announcement />, color: '#2196F3', label: 'Announcement', description: 'General announcements' },
  breaking: { icon: <AutoAwesome />, color: '#E91E63', label: 'Breaking', description: 'Breaking news or changes' },
  launch: { icon: <RocketLaunch />, color: '#9C27B0', label: 'Launch', description: 'New launches or releases' },
  update: { icon: <SystemUpdateAlt />, color: '#00BCD4', label: 'Update', description: 'System or feature updates' },
  tip: { icon: <Lightbulb />, color: '#FFC107', label: 'Tip', description: 'Helpful tips and tricks' },
  promo: { icon: <LocalOffer />, color: '#4CAF50', label: 'Promo', description: 'Promotions or offers' },
  security: { icon: <Security />, color: '#f44336', label: 'Security', description: 'Security advisories' },
  policy: { icon: <Policy />, color: '#607D8B', label: 'Policy', description: 'Policy changes' },
  beta: { icon: <Science />, color: '#673AB7', label: 'Beta', description: 'Beta features or testing' },
  limited: { icon: <AccessTime />, color: '#FF5722', label: 'Limited', description: 'Limited time availability' },
};

function getBroadcastStatus(broadcast: AdminBroadcast): 'active' | 'scheduled' | 'expired' {
  const now = new Date();
  const startsAt = new Date(broadcast.startsAt);
  const expiresAt = broadcast.expiresAt ? new Date(broadcast.expiresAt) : null;

  if (startsAt > now) return 'scheduled';
  if (expiresAt && expiresAt <= now) return 'expired';
  return 'active';
}

interface BroadcastDialogProps {
  open: boolean;
  broadcast?: AdminBroadcast | null;
  onClose: () => void;
  onSave: (data: Partial<AdminBroadcast>) => void;
}

function BroadcastDialog({ open, broadcast, onClose, onSave }: BroadcastDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as BroadcastType,
    customBadge: 'new' as CustomBadge,
    linkUrl: '',
    linkText: '',
    audience: 'all' as BroadcastAudience,
    placement: 'banner' as BroadcastPlacement,
    dismissible: true,
    startsAt: new Date(),
    expiresAt: null as Date | null,
  });

  // Update form data when broadcast prop changes (for editing)
  useEffect(() => {
    if (broadcast) {
      setFormData({
        title: broadcast.title || '',
        message: broadcast.message || '',
        type: broadcast.type || 'info',
        customBadge: broadcast.customBadge || 'new',
        linkUrl: broadcast.linkUrl || '',
        linkText: broadcast.linkText || '',
        audience: broadcast.audience || 'all',
        placement: broadcast.placement || 'banner',
        dismissible: broadcast.dismissible !== false,
        startsAt: broadcast.startsAt ? new Date(broadcast.startsAt) : new Date(),
        expiresAt: broadcast.expiresAt ? new Date(broadcast.expiresAt) : null,
      });
    } else {
      // Reset to defaults when creating a new broadcast
      setFormData({
        title: '',
        message: '',
        type: 'info',
        customBadge: 'new',
        linkUrl: '',
        linkText: '',
        audience: 'all',
        placement: 'banner',
        dismissible: true,
        startsAt: new Date(),
        expiresAt: null,
      });
    }
  }, [broadcast]);

  const handleSave = () => {
    onSave({
      title: formData.title,
      message: formData.message,
      type: formData.type,
      customBadge: formData.type === 'custom' ? formData.customBadge : undefined,
      linkUrl: formData.linkUrl || undefined,
      linkText: formData.linkText || undefined,
      audience: formData.audience,
      placement: formData.placement,
      dismissible: formData.dismissible,
      startsAt: formData.startsAt.toISOString(),
      expiresAt: formData.expiresAt?.toISOString(),
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{broadcast ? 'Edit Broadcast' : 'Create Broadcast'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                multiline
                rows={3}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>Call to Action (Optional)</Divider>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Link URL"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="https://example.com/learn-more"
                helperText="Optional URL for a call-to-action button"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Link Text"
                value={formData.linkText}
                onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                placeholder="Learn more"
                helperText="Button text (default: Learn more)"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>Display Settings</Divider>
            </Grid>

            <Grid item xs={12} sm={formData.type === 'custom' ? 6 : 4}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as BroadcastType })}
                >
                  {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                    <MenuItem key={type} value={type}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: config.color }}>{config.icon}</Box>
                        {config.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.type === 'custom' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Badge</InputLabel>
                  <Select
                    value={formData.customBadge}
                    label="Badge"
                    onChange={(e) => setFormData({ ...formData, customBadge: e.target.value as CustomBadge })}
                  >
                    {Object.entries(BADGE_CONFIG).map(([badge, config]) => (
                      <MenuItem key={badge} value={badge}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: config.color }}>{config.icon}</Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {config.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {config.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={formData.type === 'custom' ? 6 : 4}>
              <FormControl fullWidth>
                <InputLabel>Placement</InputLabel>
                <Select
                  value={formData.placement}
                  label="Placement"
                  onChange={(e) => setFormData({ ...formData, placement: e.target.value as BroadcastPlacement })}
                >
                  <MenuItem value="banner">Banner (Top of page)</MenuItem>
                  <MenuItem value="toast">Toast (Bottom corner)</MenuItem>
                  <MenuItem value="modal">Modal (Centered dialog)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={formData.type === 'custom' ? 6 : 4}>
              <FormControl fullWidth>
                <InputLabel>Audience</InputLabel>
                <Select
                  value={formData.audience}
                  label="Audience"
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value as BroadcastAudience })}
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="admins">Admins Only</MenuItem>
                  <MenuItem value="specific_orgs">Specific Organizations</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider>Schedule</Divider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Starts At"
                value={formData.startsAt}
                onChange={(date) => date && setFormData({ ...formData, startsAt: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Expires At (optional)"
                value={formData.expiresAt}
                onChange={(date) => setFormData({ ...formData, expiresAt: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dismissible}
                    onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                  />
                }
                label="Users can dismiss this broadcast"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.title || !formData.message}
          >
            {broadcast ? 'Save Changes' : 'Create Broadcast'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

export function BroadcastManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<AdminBroadcast | null>(null);

  const { data, error, isLoading, mutate } = useSWR<BroadcastsResponse>(
    '/api/admin/broadcasts?includeStats=true',
    fetcher
  );

  const handleCreate = async (broadcastData: Partial<AdminBroadcast>) => {
    try {
      const response = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData),
      });

      if (response.ok) {
        mutate();
        setDialogOpen(false);
      }
    } catch (err) {
      console.error('Failed to create broadcast:', err);
    }
  };

  const handleUpdate = async (broadcastData: Partial<AdminBroadcast>) => {
    if (!editingBroadcast) return;

    try {
      const response = await fetch(`/api/admin/broadcasts/${editingBroadcast.broadcastId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastData),
      });

      if (response.ok) {
        mutate();
        setEditingBroadcast(null);
      }
    } catch (err) {
      console.error('Failed to update broadcast:', err);
    }
  };

  const handleDelete = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;

    try {
      const response = await fetch(`/api/admin/broadcasts/${broadcastId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        mutate();
      }
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
    }
  };

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,
          bgcolor: alpha('#f44336', 0.1),
          border: '1px solid',
          borderColor: alpha('#f44336', 0.3),
          borderRadius: 2,
        }}
      >
        <Typography color="error">Failed to load broadcasts</Typography>
      </Paper>
    );
  }

  const stats = data?.stats;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha('#00BCD4', 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Campaign sx={{ fontSize: 32, color: '#00BCD4' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Broadcasts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              System announcements and notifications
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => mutate()}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
          >
            Create Broadcast
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Active
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#00ED64' }}>
                  {stats.active}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Scheduled
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196F3' }}>
                  {stats.scheduled}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Expired
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {stats.expired}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Broadcasts Table */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell>Type</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Audience</TableCell>
                <TableCell>Placement</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton variant="rounded" height={40} />
                      </TableCell>
                    </TableRow>
                  ))
                : data?.broadcasts.map((broadcast) => {
                    const typeConfig = TYPE_CONFIG[broadcast.type];
                    const badgeConfig = broadcast.type === 'custom' && broadcast.customBadge
                      ? BADGE_CONFIG[broadcast.customBadge]
                      : null;
                    const displayConfig = badgeConfig || typeConfig;
                    const status = getBroadcastStatus(broadcast);

                    return (
                      <TableRow key={broadcast._id} hover>
                        <TableCell>
                          <Chip
                            icon={displayConfig.icon}
                            label={badgeConfig ? badgeConfig.label : typeConfig.label}
                            size="small"
                            sx={{
                              bgcolor: alpha(displayConfig.color, 0.15),
                              color: displayConfig.color,
                              '& .MuiChip-icon': { color: displayConfig.color },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {broadcast.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {broadcast.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={broadcast.audience}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {broadcast.placement}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={
                              status === 'active' ? (
                                <CheckCircle />
                              ) : status === 'scheduled' ? (
                                <Schedule />
                              ) : undefined
                            }
                            label={status}
                            size="small"
                            sx={{
                              bgcolor: alpha(
                                status === 'active'
                                  ? '#00ED64'
                                  : status === 'scheduled'
                                    ? '#2196F3'
                                    : '#9e9e9e',
                                0.15
                              ),
                              color:
                                status === 'active'
                                  ? '#00ED64'
                                  : status === 'scheduled'
                                    ? '#2196F3'
                                    : '#9e9e9e',
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(broadcast.startsAt).toLocaleDateString()}
                            {broadcast.expiresAt && (
                              <> → {new Date(broadcast.expiresAt).toLocaleDateString()}</>
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => setEditingBroadcast(broadcast)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(broadcast.broadcastId)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              {!isLoading && data?.broadcasts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Campaign sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">No broadcasts created</Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      sx={{ mt: 2 }}
                      onClick={() => setDialogOpen(true)}
                    >
                      Create Your First Broadcast
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Dialog */}
      <BroadcastDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreate}
      />

      {/* Edit Dialog */}
      <BroadcastDialog
        open={!!editingBroadcast}
        broadcast={editingBroadcast}
        onClose={() => setEditingBroadcast(null)}
        onSave={handleUpdate}
      />
    </Box>
  );
}
