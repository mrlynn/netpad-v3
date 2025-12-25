'use client';

import { useState, useEffect } from 'react';
import {
  Chip,
  Tooltip,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  LinkOff,
  Storage,
} from '@mui/icons-material';
import { FormDataSource } from '@/types/form';

interface ConnectionStatusChipProps {
  dataSource?: FormDataSource;
  organizationId?: string;
  onClick?: () => void;
}

interface ConnectionInfo {
  name: string;
  database: string;
}

export function ConnectionStatusChip({
  dataSource,
  organizationId,
  onClick,
}: ConnectionStatusChipProps) {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dataSource?.vaultId && organizationId) {
      loadConnectionInfo();
    } else {
      setConnectionInfo(null);
    }
  }, [dataSource?.vaultId, organizationId]);

  const loadConnectionInfo = async () => {
    if (!dataSource?.vaultId || !organizationId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organizationId}/vault`);
      const data = await response.json();

      if (response.ok && data.connections) {
        const conn = data.connections.find(
          (c: { vaultId: string }) => c.vaultId === dataSource.vaultId
        );
        if (conn) {
          setConnectionInfo({
            name: conn.name,
            database: conn.database,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load connection info:', err);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = !!(dataSource?.vaultId && dataSource?.collection);

  if (loading) {
    return (
      <Chip
        size="small"
        icon={<CircularProgress size={12} sx={{ color: 'inherit' }} />}
        label="Loading..."
        variant="outlined"
        sx={{
          borderColor: 'divider',
          '& .MuiChip-icon': { ml: 0.5 },
        }}
      />
    );
  }

  if (isConnected && connectionInfo) {
    return (
      <Tooltip
        title={
          <span>
            <strong>{connectionInfo.name}</strong>
            <br />
            {connectionInfo.database}.{dataSource?.collection}
          </span>
        }
        arrow
      >
        <Chip
          size="small"
          icon={<CheckCircle sx={{ fontSize: 14 }} />}
          label={`${connectionInfo.database}.${dataSource?.collection}`}
          onClick={onClick}
          sx={{
            bgcolor: alpha('#00ED64', 0.1),
            color: '#00ED64',
            borderColor: alpha('#00ED64', 0.3),
            border: '1px solid',
            cursor: onClick ? 'pointer' : 'default',
            '&:hover': onClick ? {
              bgcolor: alpha('#00ED64', 0.15),
            } : {},
            '& .MuiChip-icon': {
              color: '#00ED64',
            },
            maxWidth: 200,
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Click to connect to a database" arrow>
      <Chip
        size="small"
        icon={<LinkOff sx={{ fontSize: 14 }} />}
        label="Not connected"
        onClick={onClick}
        sx={{
          bgcolor: alpha('#ff9800', 0.1),
          color: '#ff9800',
          borderColor: alpha('#ff9800', 0.3),
          border: '1px solid',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? {
            bgcolor: alpha('#ff9800', 0.15),
          } : {},
          '& .MuiChip-icon': {
            color: '#ff9800',
          },
        }}
      />
    </Tooltip>
  );
}
