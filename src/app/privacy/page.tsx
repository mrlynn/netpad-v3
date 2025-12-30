'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Button,
  alpha,
  useTheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

export default function PrivacyPolicyPage() {
  const theme = useTheme();
  const lastUpdated = 'December 22, 2025';
  const effectiveDate = 'December 22, 2025';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ color: theme.palette.primary.main }}>
        {title}
      </Typography>
      {children}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Privacy Policy
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: {lastUpdated} • Effective: {effectiveDate}
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.2),
            borderRadius: 2,
          }}
        >
          {/* Introduction */}
          <Section title="Introduction">
            <Typography variant="body1" color="text.secondary" paragraph>
              Welcome to NetPad (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting
              your privacy and ensuring you have a positive experience when using our form builder
              and data management platform.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our website and services. Please read this policy carefully.
              If you do not agree with the terms of this privacy policy, please do not access the site.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Information We Collect */}
          <Section title="Information We Collect">
            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              Personal Information You Provide
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We collect information you voluntarily provide when you:
            </Typography>
            <List dense>
              {[
                'Register for an account (email address, display name)',
                'Create or join an organization',
                'Connect to MongoDB databases (encrypted connection strings)',
                'Submit responses to forms',
                'Contact us for support',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleOutlineIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>

            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 3 }}>
              Information Collected Automatically
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              When you access our service, we may automatically collect:
            </Typography>
            <List dense>
              {[
                'Device information (browser type, operating system)',
                'IP address (for security and rate limiting)',
                'Usage data (pages visited, features used)',
                'Cookies and similar tracking technologies',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleOutlineIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* How We Use Your Information */}
          <Section title="How We Use Your Information">
            <Typography variant="body1" color="text.secondary" paragraph>
              We use the information we collect to:
            </Typography>
            <List dense>
              {[
                'Provide, operate, and maintain our services',
                'Authenticate your identity and manage your account',
                'Process and store your form data securely',
                'Send you service-related communications',
                'Respond to your comments, questions, and support requests',
                'Monitor and analyze usage patterns to improve our service',
                'Detect, prevent, and address technical issues and security threats',
                'Comply with legal obligations',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleOutlineIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Data Storage and Security */}
          <Section title="Data Storage and Security">
            <Typography variant="body1" color="text.secondary" paragraph>
              We implement industry-standard security measures to protect your data:
            </Typography>
            <List dense>
              {[
                'All data is encrypted in transit using TLS/SSL',
                'Database connection strings are encrypted using AES-256-GCM',
                'Passwords are never stored; we use passwordless authentication',
                'Session data is secured with HTTP-only, secure cookies',
                'Regular security audits and vulnerability assessments',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleOutlineIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
              Your MongoDB connection strings are stored in our secure Connection Vault with
              organization-level isolation. Each organization&apos;s data is stored in a separate
              database namespace for maximum security.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Data Sharing */}
          <Section title="Information Sharing and Disclosure">
            <Typography variant="body1" color="text.secondary" paragraph>
              We do not sell your personal information. We may share your information only in the
              following circumstances:
            </Typography>
            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              With Your Consent
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We may share your information when you have given us explicit consent to do so.
            </Typography>
            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              Service Providers
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We may share information with third-party service providers who perform services on
              our behalf, such as email delivery, hosting, and analytics (if you have consented
              to analytics cookies).
            </Typography>
            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              Legal Requirements
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We may disclose your information if required to do so by law or in response to valid
              requests by public authorities.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Your Rights */}
          <Section title="Your Privacy Rights">
            <Typography variant="body1" color="text.secondary" paragraph>
              Depending on your location, you may have the following rights:
            </Typography>

            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              For All Users
            </Typography>
            <List dense>
              {[
                'Access the personal information we hold about you',
                'Request correction of inaccurate information',
                'Request deletion of your account and data',
                'Export your data in a portable format',
                'Withdraw consent for optional data processing',
                'Opt out of marketing communications',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircleOutlineIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>

            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              For EU/EEA Residents (GDPR)
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Under the General Data Protection Regulation, you have additional rights including
              the right to data portability, the right to restrict processing, and the right to
              lodge a complaint with a supervisory authority.
            </Typography>

            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              For California Residents (CCPA)
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Under the California Consumer Privacy Act, you have the right to know what personal
              information is collected, request deletion, and opt out of the sale of personal
              information (we do not sell personal information).
            </Typography>

            <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
              To exercise any of these rights, visit your{' '}
              <a href="/settings?tab=privacy" style={{ color: theme.palette.primary.main }}>
                Privacy Settings
              </a>{' '}
              or contact us at the email below.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Cookies */}
          <Section title="Cookies and Tracking">
            <Typography variant="body1" color="text.secondary" paragraph>
              We use cookies and similar technologies to enhance your experience. You can manage
              your cookie preferences at any time.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              For detailed information about the cookies we use and your choices, please see our{' '}
              <a href="/privacy/cookies" style={{ color: theme.palette.primary.main }}>
                Cookie Policy
              </a>
              .
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Data Retention */}
          <Section title="Data Retention">
            <Typography variant="body1" color="text.secondary" paragraph>
              We retain your personal information for as long as your account is active or as
              needed to provide you services. We will retain and use your information as necessary
              to comply with our legal obligations, resolve disputes, and enforce our agreements.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Form submission data is retained according to your organization&apos;s data retention
              policy, which can be configured in your organization settings.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Children */}
          <Section title="Children&apos;s Privacy">
            <Typography variant="body1" color="text.secondary" paragraph>
              Our service is not intended for children under 16 years of age. We do not knowingly
              collect personal information from children under 16. If you are a parent or guardian
              and believe your child has provided us with personal information, please contact us.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* International Transfers */}
          <Section title="International Data Transfers">
            <Typography variant="body1" color="text.secondary" paragraph>
              Your information may be transferred to and maintained on servers located outside of
              your state, province, country, or other governmental jurisdiction where data
              protection laws may differ. We ensure appropriate safeguards are in place for such
              transfers.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Changes */}
          <Section title="Changes to This Policy">
            <Typography variant="body1" color="text.secondary" paragraph>
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the &quot;Last
              updated&quot; date. For material changes, we will provide additional notice (such as
              email notification).
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Contact */}
          <Section title="Contact Us">
            <Typography variant="body1" color="text.secondary" paragraph>
              If you have any questions about this Privacy Policy or our data practices, please
              contact us:
            </Typography>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Typography variant="body1" fontWeight={500}>
                Privacy Inquiries
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Email:{' '}
                <a href="mailto:privacy@netpad.io" style={{ color: theme.palette.primary.main }}>
                  privacy@netpad.io
                </a>
              </Typography>
            </Box>
          </Section>
        </Paper>

        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button href="/privacy/cookies" variant="text">
            Cookie Policy
          </Button>
          <Button href="/terms" variant="text">
            Terms of Service
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
