'use client';

import { useState, useEffect } from 'react';
import { Box, Paper, Typography, alpha } from '@mui/material';

interface RealTimeCounterProps {
  formId: string;
  connectionString?: string;
  refreshInterval?: number; // milliseconds
}

export function RealTimeCounter({
  formId,
  connectionString,
  refreshInterval = 5000, // 5 seconds
}: RealTimeCounterProps) {
  const [stats, setStats] = useState<{
    total: number;
    submitted: number;
    draft: number;
    incomplete: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, connectionString, refreshInterval]);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      params.set('statsOnly', 'true');
      if (connectionString) params.set('connectionString', connectionString);

      const response = await fetch(`/api/forms/${formId}/responses?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.stats) {
        setStats(data.stats);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading || !stats) {
    return null;
  }

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: alpha('#00ED64', 0.1),
        border: '1px solid',
        borderColor: alpha('#00ED64', 0.3),
        display: 'inline-block',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Live Responses
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
        {stats.total}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Updates every {refreshInterval / 1000}s
      </Typography>
    </Paper>
  );
}

