'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  DataObject,
  PlayArrow,
  CheckCircle,
  People,
  ShoppingCart,
  Event,
  ContactMail,
  Lightbulb,
  TrendingUp,
  Devices,
  FilterAlt,
  Speed,
  Analytics,
} from '@mui/icons-material';

interface SampleDataLoaderProps {
  organizationId: string;
  onDataLoaded?: () => void;
}

// Analytics features included with each sample dataset
const ANALYTICS_FEATURES = [
  { icon: <TrendingUp fontSize="small" />, label: 'Response trends over time' },
  { icon: <Devices fontSize="small" />, label: 'Device & browser breakdown' },
  { icon: <FilterAlt fontSize="small" />, label: 'Field drop-off analysis' },
  { icon: <Speed fontSize="small" />, label: 'Completion rate tracking' },
];

const SAMPLE_DATASETS = [
  {
    id: 'customer-feedback',
    name: 'Customer Feedback Survey',
    description: 'Product satisfaction survey with ratings, comments, and demographics',
    icon: <ContactMail />,
    submissionCount: 150,
    fields: ['name', 'email', 'product', 'rating', 'comments', 'recommendation'],
    tags: ['survey', 'feedback', 'ratings'],
    analyticsHighlight: '12% drop-off rate, 88% completion',
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    description: 'Conference registration form with attendee details and preferences',
    icon: <Event />,
    submissionCount: 85,
    fields: ['fullName', 'email', 'company', 'jobTitle', 'sessions', 'dietaryRestrictions'],
    tags: ['events', 'registration'],
    analyticsHighlight: '18% drop-off rate, 82% completion',
  },
  {
    id: 'order-intake',
    name: 'Product Order Form',
    description: 'E-commerce order intake with products, quantities, and shipping info',
    icon: <ShoppingCart />,
    submissionCount: 200,
    fields: ['customerName', 'email', 'products', 'quantity', 'shippingAddress', 'paymentMethod'],
    tags: ['orders', 'ecommerce'],
    analyticsHighlight: '25% drop-off rate, 75% completion',
  },
  {
    id: 'job-application',
    name: 'Job Application',
    description: 'Employment application with resume upload and experience details',
    icon: <People />,
    submissionCount: 75,
    fields: ['name', 'email', 'phone', 'position', 'experience', 'resume', 'coverLetter'],
    tags: ['hr', 'recruiting'],
    analyticsHighlight: '22% drop-off rate, 78% completion',
  },
  {
    id: 'nps-survey',
    name: 'NPS Survey',
    description: 'Net Promoter Score survey with 0-10 rating, follow-up questions, and segmentation',
    icon: <TrendingUp />,
    submissionCount: 250,
    fields: ['nps_score', 'feedback', 'improvement', 'customer_segment', 'product', 'follow_up'],
    tags: ['nps', 'loyalty', 'customer experience'],
    analyticsHighlight: 'NPS: +42, 8% drop-off rate',
  },
];

export function SampleDataLoader({ organizationId, onDataLoaded }: SampleDataLoaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLoadData = async () => {
    if (!selectedDataset) return;

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`/api/organizations/${organizationId}/sample-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: selectedDataset }),
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setProgress(100);
        setSuccess(true);
        onDataLoaded?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load sample data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setSelectedDataset(null);
    setError(null);
    setSuccess(false);
    setProgress(0);
  };

  return (
    <>
      <Card
        sx={{
          border: '2px dashed',
          borderColor: alpha('#00ED64', 0.3),
          bgcolor: alpha('#00ED64', 0.02),
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: '#00ED64',
            bgcolor: alpha('#00ED64', 0.05),
          },
        }}
        onClick={() => setDialogOpen(true)}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <DataObject sx={{ fontSize: 48, color: '#00ED64', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Try Demo Forms
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Create a sample form with realistic submissions to explore analytics features.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Demo data is stored in your workspace&apos;s database alongside your real forms.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PlayArrow />}
            sx={{ borderColor: '#00ED64', color: '#00ED64' }}
          >
            Browse Demo Forms
          </Button>
        </CardContent>
      </Card>

      {/* Dataset Selection Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DataObject sx={{ color: '#00ED64' }} />
            Create Demo Form
          </Box>
        </DialogTitle>
        <DialogContent>
          {success ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 64, color: '#00ED64', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Demo Form Created!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                A sample form with realistic submissions has been added to your workspace.
                <br />
                Find it in your Forms list to explore the analytics dashboard.
              </Typography>

              <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
                mb: 3
              }}>
                {ANALYTICS_FEATURES.map((feature, idx) => (
                  <Chip
                    key={idx}
                    icon={feature.icon}
                    label={feature.label}
                    size="small"
                    sx={{
                      bgcolor: alpha('#00ED64', 0.1),
                      borderColor: '#00ED64',
                      '& .MuiChip-icon': { color: '#00ED64' }
                    }}
                    variant="outlined"
                  />
                ))}
              </Box>

              <Alert severity="info" icon={<Analytics />} sx={{ maxWidth: 450, mx: 'auto' }}>
                <Typography variant="body2">
                  <strong>Try it now:</strong> Open your form's Analytics tab to see response
                  trends, device breakdown, and field-by-field drop-off analysis.
                </Typography>
              </Alert>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                Choose a demo form template. This creates a real form in your workspace with
                pre-populated submissions so you can explore our analytics features.
              </Typography>

              <Alert severity="info" icon={<Lightbulb />} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Where does this data go?</strong> Demo forms are stored in your workspace&apos;s
                  MongoDB database (the same place as your real forms). You can delete them anytime.
                </Typography>
              </Alert>

              <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                mb: 3,
                p: 2,
                bgcolor: alpha('#00ED64', 0.03),
                borderRadius: 2,
                border: '1px solid',
                borderColor: alpha('#00ED64', 0.2),
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 1 }}>
                  Included Analytics Features:
                </Typography>
                {ANALYTICS_FEATURES.map((feature, idx) => (
                  <Chip
                    key={idx}
                    icon={feature.icon}
                    label={feature.label}
                    size="small"
                    sx={{
                      '& .MuiChip-icon': { color: '#00ED64' }
                    }}
                  />
                ))}
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {loading && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Loading sample data...
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: alpha('#00ED64', 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#00ED64',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              )}

              <List>
                {SAMPLE_DATASETS.map((dataset) => (
                  <ListItem
                    key={dataset.id}
                    onClick={() => !loading && setSelectedDataset(dataset.id)}
                    sx={{
                      border: '2px solid',
                      borderColor: selectedDataset === dataset.id ? '#00ED64' : 'divider',
                      borderRadius: 2,
                      mb: 2,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      bgcolor: selectedDataset === dataset.id ? alpha('#00ED64', 0.05) : 'transparent',
                      '&:hover': {
                        bgcolor: loading ? undefined : alpha('#00ED64', 0.02),
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: selectedDataset === dataset.id ? '#00ED64' : 'text.secondary',
                      }}
                    >
                      {dataset.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 600 }}>
                            {dataset.name}
                          </Typography>
                          {selectedDataset === dataset.id && (
                            <CheckCircle sx={{ color: '#00ED64', fontSize: 18 }} />
                          )}
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box component="div">
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {dataset.description}
                          </Typography>
                          <Box component="div" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Chip
                              label={`${dataset.submissionCount} submissions`}
                              size="small"
                              variant="outlined"
                            />
                            {dataset.tags.map((tag) => (
                              <Chip key={tag} label={tag} size="small" />
                            ))}
                          </Box>
                          <Typography
                            variant="caption"
                            component="span"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              color: '#00ED64',
                              fontWeight: 500,
                            }}
                          >
                            <Analytics sx={{ fontSize: 14 }} />
                            {dataset.analyticsHighlight}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>
            {success ? 'Done' : 'Cancel'}
          </Button>
          {!success && (
            <Button
              variant="contained"
              onClick={handleLoadData}
              disabled={!selectedDataset || loading}
              startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
              sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00c853' } }}
            >
              {loading ? 'Creating...' : 'Create Demo Form'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
