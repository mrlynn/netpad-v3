'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Chip,
  Skeleton,
  alpha,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  ContentCopy,
  Check,
  Share,
  Edit,
  Link as LinkIcon,
  QrCode2,
} from '@mui/icons-material';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ReferralCodeInfo {
  code: string;
  type: 'standard' | 'influencer' | 'partner' | 'campaign';
  shareUrl: string;
  commissionRates: {
    year1: number;
    year2: number;
    year3: number;
    yearN: number;
  };
  isActive: boolean;
  stats: {
    totalReferrals: number;
    qualifiedReferrals: number;
    totalEarnings: number;
    availableEarnings: number;
  };
}

interface ReferralCodeCardProps {
  orgId: string;
}

export function ReferralCodeCard({ orgId }: ReferralCodeCardProps) {
  const [copied, setCopied] = useState<'code' | 'url' | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR<{ code: ReferralCodeInfo }>(
    `/api/organizations/${orgId}/referrals/code`,
    fetcher
  );

  const codeInfo = data?.code;

  const handleCopy = async (text: string, type: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCustomize = async () => {
    if (!customCode.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${orgId}/referrals/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCode: customCode.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update code');
      }

      setEditDialogOpen(false);
      setCustomCode('');
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update code');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" width="100%" height={56} sx={{ mt: 2, borderRadius: 1 }} />
      </Paper>
    );
  }

  if (!codeInfo) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography color="text.secondary">
          Unable to load referral code. Please try again.
        </Typography>
      </Paper>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <>
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Your Referral Code
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Share this code with others to earn {Math.round(codeInfo.commissionRates.year1 * 100)}% commission
            </Typography>
          </Box>
          <Chip
            label={codeInfo.type.toUpperCase()}
            size="small"
            color={codeInfo.type === 'standard' ? 'default' : 'primary'}
            variant="outlined"
          />
        </Box>

        {/* Code Display */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="h4"
            fontWeight={700}
            fontFamily="monospace"
            sx={{ flex: 1, letterSpacing: 2 }}
          >
            {codeInfo.code}
          </Typography>
          <Tooltip title={copied === 'code' ? 'Copied!' : 'Copy code'}>
            <IconButton onClick={() => handleCopy(codeInfo.code, 'code')} color="primary">
              {copied === 'code' ? <Check /> : <ContentCopy />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Customize code">
            <IconButton onClick={() => setEditDialogOpen(true)}>
              <Edit />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Share URL */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            Share URL
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <LinkIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {codeInfo.shareUrl}
            </Typography>
            <Tooltip title={copied === 'url' ? 'Copied!' : 'Copy URL'}>
              <IconButton size="small" onClick={() => handleCopy(codeInfo.shareUrl, 'url')}>
                {copied === 'url' ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Commission Rates */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Year 1
            </Typography>
            <Typography variant="h6" fontWeight={600} color="primary">
              {Math.round(codeInfo.commissionRates.year1 * 100)}%
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Year 2
            </Typography>
            <Typography variant="h6" fontWeight={600} color="primary">
              {Math.round(codeInfo.commissionRates.year2 * 100)}%
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Year 3
            </Typography>
            <Typography variant="h6" fontWeight={600} color="primary">
              {Math.round(codeInfo.commissionRates.year3 * 100)}%
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Year 4+
            </Typography>
            <Typography variant="h6" fontWeight={600} color="primary">
              {Math.round(codeInfo.commissionRates.yearN * 100)}%
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Customize Code Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Customize Referral Code</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create a memorable custom code. Use 4-20 alphanumeric characters.
          </Typography>
          <TextField
            fullWidth
            label="Custom Code"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
            placeholder="e.g., MYCODE2024"
            inputProps={{ maxLength: 20 }}
            sx={{ '& input': { fontFamily: 'monospace', letterSpacing: 1 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCustomize}
            disabled={!customCode.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
