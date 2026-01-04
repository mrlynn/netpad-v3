'use client';

import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  SupportAgent,
  Speed,
  Category,
  NotificationsActive,
  CheckCircle,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: <Category color="primary" />,
      title: 'Smart Categorization',
      description: 'Issue categories with conditional fields that collect the right information',
    },
    {
      icon: <Speed color="primary" />,
      title: 'Priority-Based Routing',
      description: 'Urgency levels from Low to Critical for proper ticket prioritization',
    },
    {
      icon: <NotificationsActive color="primary" />,
      title: 'Automated Notifications',
      description: 'Confirmation emails and team alerts built into the workflow',
    },
    {
      icon: <CheckCircle color="primary" />,
      title: 'Complete Tracking',
      description: 'Every submission stored in MongoDB for easy search and reporting',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', color: 'white', mb: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <SupportAgent sx={{ fontSize: 80 }} />
          </Box>
          <Typography variant="h2" component="h1" fontWeight="bold" gutterBottom>
            IT Help Desk
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            A complete internal IT support ticketing system built with NetPad Forms
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push('/submit-ticket')}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.9)',
              },
            }}
          >
            Submit a Ticket
          </Button>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={3} sx={{ mb: 8 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  height: '100%',
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* What This Demo Includes */}
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            What This Demo Includes
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" color="primary" gutterBottom>
                Form Features
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Reporter information fields (name, email, department)" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Issue categorization with conditional fields" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Priority levels with visual indicators" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Contact preferences section" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Section headers for organized layout" />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" color="primary" gutterBottom>
                Technical Highlights
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Conditional logic for dynamic field display" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Required field validation" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Minimum character validation on description" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Half-width field layouts for compact forms" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="MongoDB-ready document structure" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', color: 'white', mt: 8, opacity: 0.8 }}>
          <Typography variant="body2">
            Built with NetPad Forms - A MongoDB-connected form builder
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
