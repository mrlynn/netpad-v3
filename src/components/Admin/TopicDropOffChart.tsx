'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

interface TopicDropOff {
  topicId: string;
  topicName: string;
  startedCount: number;
  completedCount: number;
  dropOffRate: number;
}

interface TopicDropOffChartProps {
  data: TopicDropOff[];
  title?: string;
}

export function TopicDropOffChart({
  data,
  title = 'Topic Drop-off Rates',
}: TopicDropOffChartProps) {
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No topic data available
        </Typography>
      </Paper>
    );
  }

  // Sort by drop-off rate descending and take top 10
  const chartData = data
    .sort((a, b) => b.dropOffRate - a.dropOffRate)
    .slice(0, 10)
    .map((item) => ({
      name: item.topicName.length > 20 ? item.topicName.substring(0, 20) + '...' : item.topicName,
      fullName: item.topicName,
      dropOffRate: item.dropOffRate,
      started: item.startedCount,
      completed: item.completedCount,
    }));

  return (
    <Box>
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} unit="%" />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <Paper sx={{ p: 1.5, fontSize: 12 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {item.fullName}
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      Drop-off: {item.dropOffRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Started: {item.started} | Completed: {item.completed}
                    </Typography>
                  </Paper>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="dropOffRate"
            fill="#f44336"
            name="Drop-off Rate"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
