'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  alpha,
  useTheme,
  Divider,
} from '@mui/material';
import { Home, Code, Visibility } from '@mui/icons-material';
import Link from 'next/link';

// Import components from the collaborate extension
import {
  GalleryGrid,
  ContributorLeaderboard,
  CollaborateHero,
} from '@netpad/collaborate/components';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CollaborateDemoPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);

  const bgColor = isDark ? '#001E2B' : '#f5f7fa';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const textSecondary = isDark ? alpha('#fff', 0.7) : alpha('#000', 0.6);
  const borderColor = isDark ? alpha('#fff', 0.1) : alpha('#000', 0.1);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: bgColor }}>
      {/* Back to home */}
      <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 100 }}>
        <Button
          component={Link}
          href="/collaborate"
          startIcon={<Home />}
          sx={{
            color: isDark ? alpha('#fff', 0.5) : alpha('#000', 0.4),
            textTransform: 'none',
            bgcolor: alpha(bgColor, 0.8),
            backdropFilter: 'blur(8px)',
            '&:hover': { color: '#00ED64', bgcolor: alpha(bgColor, 0.9) },
          }}
        >
          Back to collaborate
        </Button>
      </Box>

      {/* Header */}
      <Box
        sx={{
          py: 8,
          px: 2,
          borderBottom: '1px solid',
          borderColor: borderColor,
          background: isDark
            ? 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.08) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at top, rgba(0, 237, 100, 0.12) 0%, transparent 50%)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Code sx={{ color: '#00ED64' }} />
            <Typography variant="overline" sx={{ color: '#00ED64', fontWeight: 600 }}>
              Extension Demo
            </Typography>
          </Box>
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, color: textColor, mb: 2 }}
          >
            @netpad/collaborate Components
          </Typography>
          <Typography sx={{ color: textSecondary, maxWidth: 600 }}>
            These components are provided by the collaborate extension package
            and can be used to build custom collaborate pages or integrate
            collaborate features into existing pages.
          </Typography>
        </Container>
      </Box>

      {/* Tabs */}
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper
          sx={{
            bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
            border: '1px solid',
            borderColor: borderColor,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: '1px solid',
              borderColor: borderColor,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                color: textSecondary,
                '&.Mui-selected': { color: '#00ED64' },
              },
              '& .MuiTabs-indicator': { bgcolor: '#00ED64' },
            }}
          >
            <Tab label="Hero Section" />
            <Tab label="Gallery Grid" />
            <Tab label="Leaderboard" />
            <Tab label="All Combined" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* Hero Section Demo */}
            <TabPanel value={tab} index={0}>
              <Typography variant="h6" sx={{ color: textColor, mb: 1 }}>
                CollaborateHero Component
              </Typography>
              <Typography variant="body2" sx={{ color: textSecondary, mb: 3 }}>
                A customizable hero section for collaborate pages with CTA buttons and links.
              </Typography>

              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                  border: '1px solid',
                  borderColor: borderColor,
                }}
              >
                <Typography variant="caption" sx={{ color: textSecondary, fontFamily: 'monospace' }}>
                  {`import { CollaborateHero } from '@netpad/collaborate/components';`}
                </Typography>
              </Paper>

              <Divider sx={{ my: 3 }} />

              <CollaborateHero
                title="Join the Community"
                subtitle="Help shape the future of MongoDB-native development tools"
                ctaText="Get Started"
                ctaAction="#demo"
                secondaryText="View Examples"
                secondaryAction="#examples"
                variant="gradient"
              />
            </TabPanel>

            {/* Gallery Grid Demo */}
            <TabPanel value={tab} index={1}>
              <Typography variant="h6" sx={{ color: textColor, mb: 1 }}>
                GalleryGrid Component
              </Typography>
              <Typography variant="body2" sx={{ color: textSecondary, mb: 3 }}>
                Displays community gallery items with filtering and various display options.
                Fetches data from <code>/api/ext/collaborate/gallery</code>.
              </Typography>

              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                  border: '1px solid',
                  borderColor: borderColor,
                }}
              >
                <Typography variant="caption" sx={{ color: textSecondary, fontFamily: 'monospace' }}>
                  {`import { GalleryGrid } from '@netpad/collaborate/components';`}
                </Typography>
              </Paper>

              <Divider sx={{ my: 3 }} />

              <GalleryGrid
                limit={6}
                columns={3}
                emptyMessage="No gallery items yet. Contribute to see your work featured here!"
              />
            </TabPanel>

            {/* Leaderboard Demo */}
            <TabPanel value={tab} index={2}>
              <Typography variant="h6" sx={{ color: textColor, mb: 1 }}>
                ContributorLeaderboard Component
              </Typography>
              <Typography variant="body2" sx={{ color: textSecondary, mb: 3 }}>
                Shows top contributors with various layout options (list, grid, podium).
                Fetches data from <code>/api/ext/collaborate/contributors</code>.
              </Typography>

              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02),
                  border: '1px solid',
                  borderColor: borderColor,
                }}
              >
                <Typography variant="caption" sx={{ color: textSecondary, fontFamily: 'monospace' }}>
                  {`import { ContributorLeaderboard } from '@netpad/collaborate/components';`}
                </Typography>
              </Paper>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: textSecondary, mb: 2 }}>
                    List Variant
                  </Typography>
                  <ContributorLeaderboard variant="list" limit={5} />
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ color: textSecondary, mb: 2 }}>
                    Grid Variant
                  </Typography>
                  <ContributorLeaderboard variant="grid" limit={6} />
                </Box>
              </Box>
            </TabPanel>

            {/* All Combined Demo */}
            <TabPanel value={tab} index={3}>
              <Typography variant="h6" sx={{ color: textColor, mb: 1 }}>
                Full Page Example
              </Typography>
              <Typography variant="body2" sx={{ color: textSecondary, mb: 3 }}>
                Combine all components to create a complete collaborate page.
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <CollaborateHero
                  title="Build With Us"
                  subtitle="Join the NetPad community and help shape the future"
                  ctaText="Apply Now"
                  ctaAction="/collaborate"
                  variant="minimal"
                  showGitHub={true}
                  showDocs={true}
                />

                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: textColor, mb: 3 }}
                  >
                    Community Gallery
                  </Typography>
                  <GalleryGrid limit={3} columns={3} />
                </Box>

                <Box>
                  <ContributorLeaderboard variant="list" limit={5} />
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </Paper>

        {/* Usage Instructions */}
        <Paper
          sx={{
            mt: 4,
            mb: 8,
            p: 3,
            bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
            border: '1px solid',
            borderColor: borderColor,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ color: textColor, mb: 2 }}>
            How to Use These Components
          </Typography>

          <Typography variant="body2" sx={{ color: textSecondary, mb: 2 }}>
            1. Make sure the collaborate extension is enabled in your <code>.env.local</code>:
          </Typography>
          <Paper
            sx={{
              p: 2,
              mb: 3,
              bgcolor: isDark ? '#000' : alpha('#000', 0.05),
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#00ED64',
            }}
          >
            NETPAD_EXTENSIONS=@netpad/collaborate
          </Paper>

          <Typography variant="body2" sx={{ color: textSecondary, mb: 2 }}>
            2. Import and use the components in your pages:
          </Typography>
          <Paper
            sx={{
              p: 2,
              bgcolor: isDark ? '#000' : alpha('#000', 0.05),
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: textSecondary,
              whiteSpace: 'pre-wrap',
            }}
          >
            {`import {
  GalleryGrid,
  ContributorLeaderboard,
  CollaborateHero,
} from '@netpad/collaborate/components';

export default function MyPage() {
  return (
    <div>
      <CollaborateHero
        title="My Collaborate Page"
        ctaAction="#form"
      />
      <GalleryGrid limit={6} columns={3} />
      <ContributorLeaderboard variant="podium" />
    </div>
  );
}`}
          </Paper>
        </Paper>
      </Container>
    </Box>
  );
}
