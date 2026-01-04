'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Email,
  AccessTime,
  Phone,
  ArrowBack,
  Add,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
  const router = useRouter();

  // Generate a mock ticket number for demo purposes
  const ticketNumber = `IT-${Date.now().toString().slice(-6)}`;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 5, textAlign: 'center' }}>
          {/* Success Icon */}
          <CheckCircle
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 2,
            }}
          />

          {/* Success Message */}
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Ticket Submitted!
          </Typography>

          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your ticket number is:
          </Typography>

          <Typography
            variant="h3"
            fontWeight="bold"
            color="primary"
            sx={{
              bgcolor: 'primary.50',
              py: 2,
              px: 4,
              borderRadius: 2,
              display: 'inline-block',
              mb: 4,
            }}
          >
            {ticketNumber}
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* What Happens Next */}
          <Typography variant="h6" align="left" gutterBottom>
            What happens next?
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <Email color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Confirmation Email"
                secondary="You'll receive an email confirmation with your ticket details"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <AccessTime color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Response Time"
                secondary="Low/Medium: 24 hours | High: 4 hours | Critical: Immediate"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Phone color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Need Immediate Help?"
                secondary="For urgent issues, call the IT Help Desk at ext. 4357"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/submit-ticket')}
            >
              Submit Another Ticket
            </Button>
          </Box>
        </Paper>

        {/* Footer Note */}
        <Typography
          variant="body2"
          sx={{
            color: 'white',
            textAlign: 'center',
            mt: 4,
            opacity: 0.8,
          }}
        >
          This is a demo application. In production, the ticket would be stored in MongoDB and
          workflow automations would send real emails.
        </Typography>
      </Container>
    </Box>
  );
}
