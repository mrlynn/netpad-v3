'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as SuccessIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import Link from 'next/link';

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  interest: string;
  message: string;
}

const INTEREST_OPTIONS = [
  { value: 'demo', label: 'Request a demo' },
  { value: 'pricing', label: 'Pricing inquiry' },
  { value: 'support', label: 'Technical support' },
  { value: 'partnership', label: 'Partnership opportunity' },
  { value: 'other', label: 'Other' },
];

export default function ContactPage() {
  const theme = useTheme();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    interest: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof ContactFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name || !formData.email || !formData.interest) {
        throw new Error('Please fill in all required fields');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Submit to API
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit form');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.background.default,
          p: 3,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.success.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <SuccessIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />
            </Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Thank you for reaching out!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              We&apos;ve received your message and will get back to you within 24 hours.
            </Typography>
            <Button
              component={Link}
              href="/"
              startIcon={<BackIcon />}
              variant="outlined"
            >
              Back to Home
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light || theme.palette.primary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 1,
            }}
          >
            Get in Touch
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Have questions about NetPad? We&apos;d love to hear from you.
          </Typography>
        </Box>

        {/* Form */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={handleChange('name')}
                required
                fullWidth
                placeholder="Your full name"
              />

              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                fullWidth
                placeholder="you@company.com"
              />

              <TextField
                label="Company"
                value={formData.company}
                onChange={handleChange('company')}
                fullWidth
                placeholder="Your company name (optional)"
              />

              <FormControl fullWidth required>
                <InputLabel>What are you interested in?</InputLabel>
                <Select
                  value={formData.interest}
                  onChange={(e) => handleChange('interest')({ target: { value: e.target.value } })}
                  label="What are you interested in?"
                >
                  {INTEREST_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Message"
                value={formData.message}
                onChange={handleChange('message')}
                multiline
                rows={4}
                fullWidth
                placeholder="Tell us more about your needs..."
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                endIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                sx={{
                  mt: 1,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </Button>
            </Box>
          </form>
        </Paper>

        {/* Back link */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            component={Link}
            href="/"
            startIcon={<BackIcon />}
            color="inherit"
            sx={{ color: theme.palette.text.secondary }}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
