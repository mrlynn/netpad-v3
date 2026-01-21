'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

interface ConversationMetricsChartProps {
  data: {
    draft: number;
    submitted: number;
    abandoned: number;
  };
  title?: string;
}

const COLORS = {
  draft: '#2196f3',
  submitted: '#00ED64',
  abandoned: '#f44336',
};

export function ConversationMetricsChart({
  data,
  title = 'Conversation Status',
}: ConversationMetricsChartProps) {
  const chartData = [
    { name: 'In Progress', value: data.draft, color: COLORS.draft },
    { name: 'Completed', value: data.submitted, color: COLORS.submitted },
    { name: 'Abandoned', value: data.abandoned, color: COLORS.abandoned },
  ];

  const total = data.draft + data.submitted + data.abandoned;

  if (total === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No conversation data available
        </Typography>
      </Paper>
    );
  }

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
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number | undefined) => [value ?? 0, 'Conversations']}
            labelFormatter={(label) => label}
          />
          <Legend />
          <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
