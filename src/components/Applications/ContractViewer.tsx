/**
 * Contract Viewer Component
 * 
 * Displays a read-only view of an application contract
 */

'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Cancel,
  Info,
} from '@mui/icons-material';
import { ApplicationContract } from '@/types/application';

interface ContractViewerProps {
  contract: ApplicationContract;
}

export function ContractViewer({ contract }: ContractViewerProps) {
  const statusColor = {
    draft: 'default',
    active: 'success',
    deprecated: 'warning',
  }[contract.status];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Contract v{contract.version}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Contract ID: {contract.contractId}
            </Typography>
          </Box>
          <Chip
            label={contract.status}
            color={statusColor as any}
            size="small"
            sx={{ textTransform: 'capitalize' }}
          />
        </Box>

        {contract.status === 'active' && (
          <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
            This contract is active and cannot be modified. Create a new version to make changes.
          </Alert>
        )}
      </Paper>

      {/* Inputs */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Inputs
        </Typography>
        {Object.keys(contract.inputs).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No inputs defined
          </Typography>
        ) : (
          <List>
            {Object.entries(contract.inputs).map(([key, input]) => (
              <ListItem key={key} sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {key}
                      </Typography>
                      {input.required && (
                        <Chip label="Required" size="small" color="error" />
                      )}
                      <Chip label={input.type} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      {input.description && (
                        <Typography variant="body2" color="text.secondary">
                          {input.description}
                        </Typography>
                      )}
                      {input.source && (
                        <Typography variant="caption" color="text.secondary">
                          Source: {input.source}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Outputs */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Outputs
        </Typography>
        {Object.keys(contract.outputs).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No outputs defined
          </Typography>
        ) : (
          <List>
            {Object.entries(contract.outputs).map(([key, output]) => (
              <ListItem key={key} sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {key}
                      </Typography>
                      {output.guaranteed && (
                        <Chip label="Guaranteed" size="small" color="success" />
                      )}
                      <Chip label={output.type} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    output.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {output.description}
                      </Typography>
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Side Effects */}
      {contract.sideEffects.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Side Effects
          </Typography>
          <List>
            {contract.sideEffects.map((effect, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={effect.type} size="small" color="info" />
                      <Typography variant="subtitle2">{effect.target}</Typography>
                    </Box>
                  }
                  secondary={
                    effect.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {effect.description}
                      </Typography>
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Events */}
      {contract.events.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Events
          </Typography>
          <List>
            {contract.events.map((event, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {event.name}
                    </Typography>
                  }
                  secondary={
                    event.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {event.description}
                      </Typography>
                    )
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Behaviors */}
      {contract.behaviors.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Behaviors
          </Typography>
          <List>
            {contract.behaviors.map((behavior, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {behavior.workflowId}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Trigger: {behavior.trigger}
                      </Typography>
                      {behavior.description && (
                        <Typography variant="body2" color="text.secondary">
                          {behavior.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Stability Promises */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Stability Promises
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {contract.stability.inputs ? (
              <CheckCircle color="success" fontSize="small" />
            ) : (
              <Cancel color="error" fontSize="small" />
            )}
            <Typography variant="body2">Inputs are stable</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {contract.stability.outputs ? (
              <CheckCircle color="success" fontSize="small" />
            ) : (
              <Cancel color="error" fontSize="small" />
            )}
            <Typography variant="body2">Outputs are stable</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {contract.stability.sideEffects ? (
              <CheckCircle color="success" fontSize="small" />
            ) : (
              <Cancel color="error" fontSize="small" />
            )}
            <Typography variant="body2">Side effects are stable</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {contract.stability.events ? (
              <CheckCircle color="success" fontSize="small" />
            ) : (
              <Cancel color="error" fontSize="small" />
            )}
            <Typography variant="body2">Events are stable</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Metadata */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Metadata
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2">
            <strong>Created:</strong> {new Date(contract.createdAt).toLocaleString()}
          </Typography>
          <Typography variant="body2">
            <strong>Updated:</strong> {new Date(contract.updatedAt).toLocaleString()}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
