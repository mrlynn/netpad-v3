'use client';

import { useState } from 'react';
import { ResponseList } from '@/components/FormResponses/ResponseList';
import { ConversationList } from '@/components/FormResponses/ConversationList';
import { usePipeline } from '@/contexts/PipelineContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Box, Breadcrumbs, Typography, alpha, Tabs, Tab } from '@mui/material';
import { NavigateNext, Folder, People, Chat, ListAlt } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

export default function FormResponsesPage() {
  const params = useParams();
  const formId = params.formId as string;
  const { connectionString } = usePipeline();
  const { currentOrgId } = useOrganization();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppNavBar />

      {/* Breadcrumb Navigation */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5),
        }}
      >
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Typography
            component={Link}
            href="/my-forms"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.secondary',
              textDecoration: 'none',
              fontSize: '0.875rem',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <Folder sx={{ fontSize: 16 }} />
            Forms
          </Typography>
          <Typography
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.primary',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <People sx={{ fontSize: 16 }} />
            Responses
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Tabs for Responses vs Conversations */}
      <Box sx={{ px: 3, pt: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
            },
          }}
        >
          <Tab
            icon={<ListAlt sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Responses"
          />
          <Tab
            icon={<Chat sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Conversations"
          />
        </Tabs>
      </Box>

      <Box sx={{ height: 'calc(100vh - 148px)', overflow: 'auto', p: 3 }}>
        {activeTab === 0 ? (
          <ResponseList formId={formId} connectionString={connectionString || undefined} />
        ) : (
          currentOrgId ? (
            <ConversationList formId={formId} orgId={currentOrgId} />
          ) : (
            <Typography color="text.secondary">
              Organization context required to view conversations.
            </Typography>
          )
        )}
      </Box>
    </Box>
  );
}

