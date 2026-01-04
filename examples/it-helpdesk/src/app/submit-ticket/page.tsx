'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  AppBar,
  Toolbar,
  Alert,
} from '@mui/material';
import { SupportAgent, ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { FormRenderer } from '@netpad/forms';

// Import the form configuration from our template
// This demonstrates how to use exported template definitions
import { itHelpdeskFormConfig } from '../../../templates/form';

/**
 * IT Support Request Form Configuration
 *
 * The form configuration is imported from templates/form.ts which exports
 * a typed FormConfiguration. This pattern allows:
 * - Type-safe form definitions with full IntelliSense
 * - Reusable configurations across multiple pages
 * - Easy customization by extending the base config
 *
 * You can also define the config inline if you prefer - see the full
 * configuration in templates/form.ts or templates/form.json
 */
const itSupportFormConfig = itHelpdeskFormConfig;

// Example: Customizing the imported config
// const customConfig = {
//   ...itHelpdeskFormConfig,
//   submitButtonText: 'Submit IT Request',
//   theme: { ...itHelpdeskFormConfig.theme, primaryColor: '#00897b' },
// };

export default function SubmitTicketPage() {
  const router = useRouter();
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    console.log('Ticket submitted:', data);
    setSubmittedData(data);
    setShowSuccess(true);

    // In a real application, you would send this to your MongoDB backend
    // For demo purposes, we'll just navigate to the success page
    setTimeout(() => {
      router.push('/success');
    }, 1500);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Button
            color="inherit"
            startIcon={<ArrowBack />}
            onClick={() => router.push('/')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <SupportAgent sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            IT Help Desk
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Submit a Support Request
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Fill out the form below to submit an IT support ticket. Required fields are marked
            with an asterisk (*).
          </Typography>

          {showSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Ticket submitted successfully! Redirecting...
            </Alert>
          )}

          <FormRenderer
            config={itSupportFormConfig}
            onSubmit={handleSubmit}
            mode="create"
          />
        </Paper>

        {/* Debug: Show submitted data in development */}
        {submittedData && process.env.NODE_ENV === 'development' && (
          <Paper elevation={2} sx={{ p: 3, mt: 4, bgcolor: 'grey.100' }}>
            <Typography variant="h6" gutterBottom>
              Submitted Data (Debug View)
            </Typography>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(submittedData, null, 2)}
            </pre>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
