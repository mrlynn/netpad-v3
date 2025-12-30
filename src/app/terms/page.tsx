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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

export default function TermsOfServicePage() {
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
          Terms of Service
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
          {/* Agreement */}
          <Section title="1. Agreement to Terms">
            <Typography variant="body1" color="text.secondary" paragraph>
              By accessing or using NetPad (&quot;Service&quot;), you agree to be bound by these
              Terms of Service (&quot;Terms&quot;). If you disagree with any part of the terms, you may
              not access the Service.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              These Terms apply to all visitors, users, and others who access or use the Service.
              By using the Service, you represent that you are at least 16 years of age and have
              the legal capacity to enter into these Terms.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Description of Service */}
          <Section title="2. Description of Service">
            <Typography variant="body1" color="text.secondary" paragraph>
              NetPad is a web-based platform that enables users to:
            </Typography>
            <List dense>
              {[
                'Build and manage data collection forms',
                'Connect to MongoDB databases securely',
                'Create aggregation pipelines with a visual builder',
                'Collect and analyze form submissions',
                'Collaborate within organizations',
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

          {/* Accounts */}
          <Section title="3. User Accounts">
            <Typography variant="body1" color="text.secondary" paragraph>
              When you create an account with us, you must provide accurate, complete, and current
              information. Failure to do so constitutes a breach of the Terms.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You are responsible for:
            </Typography>
            <List dense>
              {[
                'Maintaining the security of your account credentials',
                'All activities that occur under your account',
                'Notifying us immediately of any unauthorized access',
                'Ensuring your account information is accurate and up-to-date',
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

          {/* Acceptable Use */}
          <Section title="4. Acceptable Use">
            <Typography variant="body1" color="text.secondary" paragraph>
              You agree not to use the Service to:
            </Typography>
            <List dense>
              {[
                'Violate any applicable laws or regulations',
                'Infringe upon intellectual property rights of others',
                'Transmit malicious code, viruses, or harmful content',
                'Attempt to gain unauthorized access to systems or data',
                'Interfere with or disrupt the Service or servers',
                'Collect personal data without proper consent',
                'Engage in data scraping or automated data collection',
                'Use the Service for spam or unsolicited communications',
                'Impersonate others or misrepresent your affiliation',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Your Data */}
          <Section title="5. Your Data and Content">
            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              Ownership
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You retain all rights to the data and content you upload, create, or store using
              the Service (&quot;Your Content&quot;). We do not claim ownership over Your Content.
            </Typography>

            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              License to Us
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              By using the Service, you grant us a limited license to store, process, and display
              Your Content solely for the purpose of providing and improving the Service.
            </Typography>

            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              Data Security
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We implement industry-standard security measures to protect Your Content. However,
              no method of transmission over the Internet is 100% secure. You acknowledge this
              inherent risk.
            </Typography>

            <Typography variant="h6" fontWeight={500} gutterBottom sx={{ mt: 2 }}>
              Database Connections
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              When you store MongoDB connection strings with us, you represent that you have the
              authority to access and modify the connected databases. We encrypt all connection
              strings and store them securely. You are responsible for the security of your
              database credentials.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Organizations */}
          <Section title="6. Organizations and Collaboration">
            <Typography variant="body1" color="text.secondary" paragraph>
              When you create or join an organization:
            </Typography>
            <List dense>
              {[
                'Organization owners are responsible for managing member access',
                'Data shared within an organization is accessible to authorized members',
                'Removing a member revokes their access to organization resources',
                'Organization data remains after member departure',
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

          {/* Intellectual Property */}
          <Section title="7. Intellectual Property">
            <Typography variant="body1" color="text.secondary" paragraph>
              The Service and its original content, features, and functionality are owned by
              NetPad and are protected by international copyright, trademark, and other
              intellectual property laws.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Our trademarks and trade dress may not be used in connection with any product or
              service without prior written consent.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Third Party Services */}
          <Section title="8. Third-Party Services">
            <Typography variant="body1" color="text.secondary" paragraph>
              Our Service may contain links to or integrations with third-party services,
              including:
            </Typography>
            <List dense>
              {[
                'MongoDB Atlas and self-hosted MongoDB instances',
                'OAuth providers (Google, GitHub)',
                'Analytics services (with your consent)',
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
              We are not responsible for the content, privacy policies, or practices of any
              third-party services. Your use of such services is governed by their respective
              terms and policies.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Disclaimers */}
          <Section title="9. Disclaimers">
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.05),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                mb: 2,
              }}
            >
              <Typography variant="body1" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 500 }}>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
                ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
                NON-INFRINGEMENT.
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" paragraph>
              We do not warrant that:
            </Typography>
            <List dense>
              {[
                'The Service will be uninterrupted or error-free',
                'Defects will be corrected',
                'The Service is free of viruses or harmful components',
                'Results from using the Service will be accurate or reliable',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Limitation of Liability */}
          <Section title="10. Limitation of Liability">
            <Typography variant="body1" color="text.secondary" paragraph>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MONGODB TOOLS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT
              NOT LIMITED TO:
            </Typography>
            <List dense>
              {[
                'Loss of profits, data, or goodwill',
                'Service interruption or data loss',
                'Cost of procurement of substitute services',
                'Unauthorized access to or alteration of your data',
              ].map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WarningAmberIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Indemnification */}
          <Section title="11. Indemnification">
            <Typography variant="body1" color="text.secondary" paragraph>
              You agree to defend, indemnify, and hold harmless NetPad and its officers,
              directors, employees, and agents from any claims, damages, losses, liabilities,
              and expenses arising out of:
            </Typography>
            <List dense>
              {[
                'Your use of the Service',
                'Your violation of these Terms',
                'Your violation of any third-party rights',
                'Your Content or data stored using the Service',
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

          {/* Termination */}
          <Section title="12. Termination">
            <Typography variant="body1" color="text.secondary" paragraph>
              We may terminate or suspend your account immediately, without prior notice or
              liability, for any reason, including breach of these Terms.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Upon termination:
            </Typography>
            <List dense>
              {[
                'Your right to use the Service will cease immediately',
                'You may request export of your data before termination',
                'We may delete your data after a reasonable retention period',
                'Provisions that should survive termination will remain in effect',
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

          {/* Governing Law */}
          <Section title="13. Governing Law">
            <Typography variant="body1" color="text.secondary" paragraph>
              These Terms shall be governed by and construed in accordance with the laws of the
              United States, without regard to its conflict of law provisions.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Any disputes arising under these Terms shall be resolved through binding arbitration
              in accordance with the rules of the American Arbitration Association.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Changes */}
          <Section title="14. Changes to Terms">
            <Typography variant="body1" color="text.secondary" paragraph>
              We reserve the right to modify or replace these Terms at any time. If a revision
              is material, we will provide at least 30 days notice prior to the new terms taking
              effect.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              By continuing to access or use our Service after revisions become effective, you
              agree to be bound by the revised terms.
            </Typography>
          </Section>

          <Divider sx={{ my: 4 }} />

          {/* Contact */}
          <Section title="15. Contact Us">
            <Typography variant="body1" color="text.secondary" paragraph>
              If you have any questions about these Terms, please contact us:
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
                Legal Inquiries
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Email:{' '}
                <a href="mailto:legal@netpad.io" style={{ color: theme.palette.primary.main }}>
                  legal@netpad.io
                </a>
              </Typography>
            </Box>
          </Section>
        </Paper>

        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button href="/privacy" variant="text">
            Privacy Policy
          </Button>
          <Button href="/privacy/cookies" variant="text">
            Cookie Policy
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
