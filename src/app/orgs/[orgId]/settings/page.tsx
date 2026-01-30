'use client';

/**
 * General Organization Settings
 * 
 * Basic org configuration: name, slug, etc.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Skeleton,
  alpha,
  useTheme,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

interface OrgSettings {
  orgId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export default function GeneralSettingsPage() {
  const params = useParams();
  const theme = useTheme();
  const orgId = params.orgId as string;

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(`/api/platform/orgs/${orgId}`);
        if (!response.ok) throw new Error('Failed to fetch organization');
        const data = await response.json();
        setSettings(data.organization);
        setName(data.organization.name);
        setSlug(data.organization.slug);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [orgId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/platform/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={56} sx={{ mt: 2 }} />
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        General Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your organization&apos;s basic information.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Organization Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            helperText="The display name for your organization"
          />

          <TextField
            label="URL Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            fullWidth
            helperText={`Your organization URL: netpad.io/orgs/${slug || 'your-org'}`}
          />

          <TextField
            label="Organization ID"
            value={settings?.orgId || ''}
            disabled
            fullWidth
            helperText="Unique identifier (cannot be changed)"
          />

          <TextField
            label="Created"
            value={settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString() : ''}
            disabled
            fullWidth
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || (!name.trim())}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
