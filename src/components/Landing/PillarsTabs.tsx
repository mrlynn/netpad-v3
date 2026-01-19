'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Description,
  AccountTree,
  Storage,
  ChatBubble,
  Rule,
  Functions,
  PlayArrow,
  Schedule,
  Search,
  TableChart,
  DataObject,
  ImportExport,
  AutoAwesome,
  Psychology,
  Source,
} from '@mui/icons-material';
import Link from 'next/link';
import LinkIcon from '@mui/icons-material/Link';
import { SpotlightCard } from '@/components/marketing';

// Pillar configuration with all data needed for tabs
const pillarConfig = [
  {
    id: 'forms',
    icon: <Description sx={{ fontSize: 24 }} />,
    title: 'Collect',
    subtitle: 'Forms',
    color: '#00ED64',
    rgbColor: '0, 237, 100',
    headline: 'Build Forms That Connect to MongoDB',
    description:
      'Create professional data collection forms with 33 field types, validation, conditional logic, and computed fields. Data flows directly to your MongoDB collections.',
    href: '/builder',
    cta: 'Start Building',
    features: [
      {
        icon: <Storage sx={{ fontSize: 28 }} />,
        title: 'Schema Import',
        description: 'Auto-generate forms from your MongoDB collection schema.',
      },
      {
        icon: <Rule sx={{ fontSize: 28 }} />,
        title: 'Conditional Logic',
        description: 'Show or hide fields based on user input dynamically.',
      },
      {
        icon: <LinkIcon sx={{ fontSize: 28 }} />,
        title: 'Lookup Fields',
        description: 'Reference data from other collections with autocomplete.',
      },
      {
        icon: <Functions sx={{ fontSize: 28 }} />,
        title: 'Computed Fields',
        description: 'Formula-based calculations that update in real-time.',
      },
    ],
  },
  {
    id: 'workflows',
    icon: <AccountTree sx={{ fontSize: 24 }} />,
    title: 'Automate',
    subtitle: 'Workflows',
    color: '#9C27B0',
    rgbColor: '156, 39, 176',
    headline: 'Visual Workflow Automation',
    description:
      'Build powerful automations with a drag-and-drop canvas. Trigger workflows from form submissions, schedules, or database events. AI-assisted workflow generation included.',
    href: '/workflows',
    cta: 'Create Workflow',
    features: [
      {
        icon: <AccountTree sx={{ fontSize: 28 }} />,
        title: 'Visual Workflow Builder',
        description: 'Design automation flows with our drag-and-drop canvas. No coding required.',
      },
      {
        icon: <PlayArrow sx={{ fontSize: 28 }} />,
        title: 'MongoDB Triggers',
        description: 'React to database events like inserts, updates, and deletes automatically.',
      },
      {
        icon: <Schedule sx={{ fontSize: 28 }} />,
        title: 'Scheduled Jobs',
        description: 'Run workflows on a schedule with cron expressions. Perfect for reports.',
      },
      {
        icon: <Functions sx={{ fontSize: 28 }} />,
        title: 'Data Transformations',
        description: 'Map, filter, and transform data between nodes with AI-assisted mappings.',
      },
    ],
  },
  {
    id: 'data',
    icon: <Storage sx={{ fontSize: 24 }} />,
    title: 'Explore',
    subtitle: 'Data',
    color: '#2196F3',
    rgbColor: '33, 150, 243',
    headline: 'Visual Data Browser',
    description:
      'Browse, search, and manage your MongoDB collections without writing queries. View data as tables, cards, or raw JSON. Edit documents with a schema-aware editor.',
    href: '/data',
    cta: 'Explore Data',
    features: [
      {
        icon: <Search sx={{ fontSize: 28 }} />,
        title: 'Visual Search',
        description: 'Find documents instantly with full-text and field-specific search.',
      },
      {
        icon: <TableChart sx={{ fontSize: 28 }} />,
        title: 'Multiple Views',
        description: 'Switch between table, card, and JSON views for your data.',
      },
      {
        icon: <DataObject sx={{ fontSize: 28 }} />,
        title: 'Document Editor',
        description: 'Edit documents directly with a schema-aware visual editor.',
      },
      {
        icon: <ImportExport sx={{ fontSize: 28 }} />,
        title: 'Import & Export',
        description: 'Bulk import data or export to JSON and CSV formats.',
      },
    ],
  },
  {
    id: 'ai',
    icon: <ChatBubble sx={{ fontSize: 24 }} />,
    title: 'Engage',
    subtitle: 'AI & Conversational',
    color: '#E91E63',
    rgbColor: '233, 30, 99',
    headline: 'Collect Data Through Conversation',
    description:
      'Turn any form into a conversational experience. AI-powered chat guides users naturally through data collection with context-aware questions and intelligent responses.',
    href: '/builder',
    cta: 'Try Conversational',
    features: [
      {
        icon: <AutoAwesome sx={{ fontSize: 28 }} />,
        title: 'AI-Powered Conversations',
        description: 'Natural language forms that adapt to user responses in real-time.',
      },
      {
        icon: <Psychology sx={{ fontSize: 28 }} />,
        title: 'RAG Knowledge Base',
        description: 'Connect documents and data sources for context-aware responses.',
      },
      {
        icon: <Source sx={{ fontSize: 28 }} />,
        title: 'Source Citations',
        description: 'Every AI response includes references to source documents.',
      },
      {
        icon: <DataObject sx={{ fontSize: 28 }} />,
        title: 'Structured Extraction',
        description: 'Extract structured data from natural conversations automatically.',
      },
    ],
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`pillar-tabpanel-${index}`}
      aria-labelledby={`pillar-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 4 }}>{children}</Box>}
    </Box>
  );
}

export function PillarsTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const activePillar = pillarConfig[activeTab];

  return (
    <Box>
      {/* Tab Navigation */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 56,
            // Remove default bottom border on tabs scroller
            '& .MuiTabs-scroller': {
              borderBottom: 'none',
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 1.5,
              backgroundColor: activePillar.color,
              transition: 'background-color 0.3s ease, left 0.3s ease, width 0.3s ease',
            },
            '& .MuiTabs-flexContainer': {
              gap: { xs: 0.5, sm: 1 },
              borderBottom: 'none',
            },
          }}
        >
          {pillarConfig.map((pillar, index) => (
            <Tab
              key={pillar.id}
              icon={
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: activeTab === index ? pillar.color : alpha('#fff', 0.5),
                    transition: 'color 0.2s ease',
                  }}
                >
                  {pillar.icon}
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                      }}
                    >
                      {pillar.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 400,
                        textTransform: 'none',
                        fontSize: '0.65rem',
                        opacity: 0.7,
                      }}
                    >
                      {pillar.subtitle}
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{
                minHeight: 56,
                px: { xs: 2, sm: 3 },
                py: 1.5,
                borderRadius: 2,
                mx: 0.5,
                '&:hover': {
                  bgcolor: alpha(pillar.color, 0.08),
                },
                '&.Mui-selected': {
                  bgcolor: alpha(pillar.color, 0.12),
                },
                transition: 'background-color 0.2s ease',
              }}
              aria-label={`${pillar.title} - ${pillar.subtitle}`}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {pillarConfig.map((pillar, index) => (
        <TabPanel key={pillar.id} value={activeTab} index={index}>
          <Grid container spacing={4} alignItems="center">
            {/* Text Content */}
            <Grid item xs={12} md={5} sx={{ order: { xs: 1, md: index % 2 === 0 ? 1 : 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: alpha(pillar.color, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: pillar.color,
                  }}
                >
                  {pillar.icon}
                </Box>
                <Typography
                  variant="overline"
                  sx={{ color: pillar.color, fontWeight: 700, letterSpacing: 1.5 }}
                >
                  {pillar.title}
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: '#fff',
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                }}
              >
                {pillar.headline.split(' ').slice(0, 2).join(' ')}
                <br />
                {pillar.headline.split(' ').slice(2).join(' ')}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: alpha('#fff', 0.6), mb: 3, lineHeight: 1.8 }}
              >
                {pillar.description}
              </Typography>
              <Button
                component={Link}
                href={pillar.href}
                variant="contained"
                startIcon={pillar.icon}
                sx={{
                  background: `linear-gradient(135deg, ${pillar.color} 0%, ${alpha(pillar.color, 0.8)} 100%)`,
                  color: pillar.id === 'forms' ? '#001E2B' : '#fff',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${alpha(pillar.color, 0.9)} 0%, ${pillar.color} 100%)`,
                  },
                }}
              >
                {pillar.cta}
              </Button>
            </Grid>

            {/* Feature Cards */}
            <Grid item xs={12} md={7} sx={{ order: { xs: 2, md: index % 2 === 0 ? 2 : 1 } }}>
              <Grid container spacing={2}>
                {pillar.features.map((feature, featureIndex) => (
                  <Grid item xs={12} sm={6} key={featureIndex}>
                    <SpotlightCard
                      spotlightColor={pillar.rgbColor}
                      hoverBorderColor={alpha(pillar.color, 0.3)}
                      sx={{ p: 2.5, height: '100%' }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: alpha(pillar.color, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: pillar.color,
                          mb: 1.5,
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: alpha('#fff', 0.5), lineHeight: 1.5 }}
                      >
                        {feature.description}
                      </Typography>
                    </SpotlightCard>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>
      ))}

      {/* Quick navigation hint */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: 4,
          gap: 1,
        }}
      >
        {pillarConfig.map((pillar, index) => (
          <Box
            key={pillar.id}
            onClick={() => setActiveTab(index)}
            sx={{
              width: activeTab === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              bgcolor: activeTab === index ? pillar.color : alpha('#fff', 0.2),
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: activeTab === index ? pillar.color : alpha('#fff', 0.4),
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
