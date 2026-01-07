'use client';

import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  alpha,
} from '@mui/material';
import {
  Rocket,
  Description,
  Storage,
  ArrowForward,
  Chat,
  AccountTree,
} from '@mui/icons-material';

interface WelcomeModalProps {
  open: boolean;
  onContinue: () => void;
}

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function InfoCard({ icon, title, description }: InfoCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        textAlign: 'left',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: alpha('#00ED64', 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.5,
          color: '#00ED64',
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
        {description}
      </Typography>
    </Paper>
  );
}

export function WelcomeModal({ open, onContinue }: WelcomeModalProps) {
  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            p: 4,
            pb: 3,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha('#00ED64', 0.15)} 0%, ${alpha('#00ED64', 0.02)} 100%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Rocket sx={{ fontSize: 56, color: '#00ED64', mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Welcome to NetPad
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Build forms that save directly to MongoDB
          </Typography>
        </Box>

        {/* Info Cards */}
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InfoCard
                icon={<Description />}
                title="Visual Form Builder"
                description="Design forms with drag-and-drop. Add fields, validation, conditional logic, and save directly to MongoDB."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoCard
                icon={<Chat />}
                title="Conversational Forms"
                description="Create AI-powered forms that collect data through natural dialogue instead of static fields."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoCard
                icon={<AccountTree />}
                title="Workflows"
                description="Automate data processing with visual workflows. Transform, route, and integrate your form data."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <InfoCard
                icon={<Storage />}
                title="Auto-Provisioned Database"
                description="We'll set up a free MongoDB Atlas cluster automatically. No configuration required."
              />
            </Grid>
          </Grid>

          {/* CTA */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={onContinue}
            endIcon={<ArrowForward />}
            sx={{
              mt: 3,
              py: 1.5,
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontWeight: 600,
              fontSize: 16,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            Get Started
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
