'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useBranding } from '@/contexts/OnboardingBrandingContext';
import { OnboardingBrandingConfig, DEFAULT_BRANDING } from '@/types/onboarding';

export default function SettingsPage() {
  const { branding, setBranding, isLoading: brandingLoading } = useBranding();

  const [formData, setFormData] = useState({
    companyName: '',
    logoUrl: '',
    primaryColor: '#00ED64',
    secondaryColor: '#001E2B',
    welcomeTitle: '',
    welcomeMessage: '',
    successTitle: '',
    successMessage: '',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with branding data
  useEffect(() => {
    if (branding) {
      setFormData({
        companyName: branding.companyName,
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor || '#001E2B',
        welcomeTitle: branding.welcomeTitle,
        welcomeMessage: branding.welcomeMessage,
        successTitle: branding.successTitle,
        successMessage: branding.successMessage,
      });
    }
  }, [branding]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/onboarding/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Update context
        setBranding({
          ...branding,
          ...formData,
          updatedAt: new Date(),
        });
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      companyName: DEFAULT_BRANDING.companyName,
      logoUrl: '',
      primaryColor: DEFAULT_BRANDING.primaryColor,
      secondaryColor: DEFAULT_BRANDING.secondaryColor || '#001E2B',
      welcomeTitle: DEFAULT_BRANDING.welcomeTitle,
      welcomeMessage: DEFAULT_BRANDING.welcomeMessage,
      successTitle: DEFAULT_BRANDING.successTitle,
      successMessage: DEFAULT_BRANDING.successMessage,
    });
    setSuccess(false);
    setError(null);
  };

  if (brandingLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customize branding and messaging for the onboarding portal
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Company Branding */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Company Branding
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={formData.companyName}
                onChange={handleChange('companyName')}
                helperText="Displayed in the header and messages"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Logo URL"
                value={formData.logoUrl}
                onChange={handleChange('logoUrl')}
                placeholder="https://example.com/logo.png"
                helperText="Optional - URL to your company logo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary Color"
                type="color"
                value={formData.primaryColor}
                onChange={handleChange('primaryColor')}
                helperText="Main accent color for buttons and highlights"
                InputProps={{
                  sx: { height: 56 },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secondary Color"
                type="color"
                value={formData.secondaryColor}
                onChange={handleChange('secondaryColor')}
                helperText="Used for text and secondary elements"
                InputProps={{
                  sx: { height: 56 },
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Welcome Page */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Welcome Page
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Welcome Title"
                value={formData.welcomeTitle}
                onChange={handleChange('welcomeTitle')}
                helperText="Main heading on the landing page"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Welcome Message"
                value={formData.welcomeMessage}
                onChange={handleChange('welcomeMessage')}
                helperText="Supports Markdown formatting (bold, lists, etc.)"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Success Page */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Success Page
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Success Title"
                value={formData.successTitle}
                onChange={handleChange('successTitle')}
                helperText="Main heading after form submission"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Success Message"
                value={formData.successMessage}
                onChange={handleChange('successMessage')}
                helperText="Supports Markdown formatting"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Preview
          </Typography>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: '#f8f9fa',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              {formData.logoUrl ? (
                <Box
                  component="img"
                  src={formData.logoUrl}
                  alt={formData.companyName}
                  sx={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }}
                  onError={(e: any) => (e.target.style.display = 'none')}
                />
              ) : (
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: formData.primaryColor,
                    color: '#001E2B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                  }}
                >
                  {formData.companyName.charAt(0)}
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {formData.companyName}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ textAlign: 'center', fontWeight: 700, mb: 2 }}>
              {formData.welcomeTitle}
            </Typography>
            <Button
              variant="contained"
              sx={{
                display: 'block',
                mx: 'auto',
                bgcolor: formData.primaryColor,
                color: '#001E2B',
                '&:hover': { bgcolor: formData.primaryColor },
              }}
            >
              Start Onboarding
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
