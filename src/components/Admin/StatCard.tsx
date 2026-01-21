'use client';

import { Card, CardContent, Typography, Box, alpha, SxProps, Theme } from '@mui/material';
import { ReactNode } from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  sx?: SxProps<Theme>;
}

const colorMap = {
  primary: '#00ED64', // MongoDB green
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
  sx,
}: StatCardProps) {
  const themeColor = colorMap[color];

  return (
    <Card
      sx={{
        bgcolor: alpha(themeColor, 0.1),
        border: '1px solid',
        borderColor: alpha(themeColor, 0.3),
        height: '100%',
        ...sx,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ my: 0.5, fontWeight: 600 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      trend.direction === 'up'
                        ? 'success.main'
                        : trend.direction === 'down'
                        ? 'error.main'
                        : 'text.secondary',
                    fontWeight: 500,
                  }}
                >
                  {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
                  {' '}{Math.abs(trend.value)}%
                </Typography>
                {trend.label && (
                  <Typography variant="caption" color="text.secondary">
                    {trend.label}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: alpha(themeColor, 0.2),
                color: themeColor,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
