'use client';

import { AnalyticsTabs } from '@/components/FormAnalytics/AnalyticsTabs';
import { usePipeline } from '@/contexts/PipelineContext';
import { Box, Breadcrumbs, Typography, alpha } from '@mui/material';
import { NavigateNext, Folder, BarChart } from '@mui/icons-material';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppNavBar } from '@/components/Navigation/AppNavBar';

export default function FormAnalyticsPage() {
  const params = useParams();
  const formId = params.formId as string;
  const { connectionString } = usePipeline();

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
            My Forms
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
            <BarChart sx={{ fontSize: 16 }} />
            Analytics
          </Typography>
        </Breadcrumbs>
      </Box>

      <Box sx={{ height: 'calc(100vh - 96px)', overflow: 'auto' }}>
        <AnalyticsTabs formId={formId} connectionString={connectionString || undefined} />
      </Box>
    </Box>
  );
}

