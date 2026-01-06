'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  useTheme,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  Timeline as EdgeIcon,
  Code as CodeIcon,
  ColorLens as StyleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { WorkflowEdge, DataMapping, WorkflowEdgeType } from '@/types/workflow';
import { useWorkflowActions, useWorkflowEditor } from '@/contexts/WorkflowContext';

interface EdgeConfigPanelProps {
  open: boolean;
  onClose: () => void;
}

export function EdgeConfigPanel({ open, onClose }: EdgeConfigPanelProps) {
  const theme = useTheme();
  const { selectedEdge, nodes } = useWorkflowEditor();
  const { updateEdge, removeEdge } = useWorkflowActions();

  // Local state for editing
  const [conditionExpression, setConditionExpression] = useState('');
  const [conditionLabel, setConditionLabel] = useState('');
  const [animated, setAnimated] = useState(true);
  const [edgeType, setEdgeType] = useState<WorkflowEdgeType>('default');
  const [strokeColor, setStrokeColor] = useState('');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);

  // Sync local state with selected edge
  useEffect(() => {
    if (selectedEdge) {
      setConditionExpression(selectedEdge.condition?.expression || '');
      setConditionLabel(selectedEdge.condition?.label || '');
      setAnimated(selectedEdge.animated !== false);
      setEdgeType(selectedEdge.type || 'default');
      setStrokeColor(selectedEdge.style?.stroke || '');
      setStrokeWidth(selectedEdge.style?.strokeWidth || 2);
    }
  }, [selectedEdge]);

  // Save changes
  const handleSave = () => {
    if (!selectedEdge) return;

    const updates: Partial<WorkflowEdge> = {
      animated,
      type: edgeType !== 'default' ? edgeType : undefined,
      condition: conditionExpression
        ? { expression: conditionExpression, label: conditionLabel || undefined }
        : undefined,
      style: strokeColor || strokeWidth !== 2
        ? {
            stroke: strokeColor || undefined,
            strokeWidth: strokeWidth || undefined,
          }
        : undefined,
    };

    updateEdge(selectedEdge.id, updates);
    onClose();
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedEdge) return;
    if (confirm('Are you sure you want to delete this connection?')) {
      removeEdge(selectedEdge.id);
      onClose();
    }
  };

  if (!selectedEdge) {
    return null;
  }

  // Get source and target node labels
  const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
  const targetNode = nodes.find((n) => n.id === selectedEdge.target);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 380,
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <EdgeIcon color="primary" />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          Connection Settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Connection Info */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Connection Path
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={sourceNode?.label || sourceNode?.type || selectedEdge.source}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.success.main, 0.1),
                color: 'success.main',
              }}
            />
            <Typography color="text.secondary">→</Typography>
            <Chip
              label={targetNode?.label || targetNode?.type || selectedEdge.target}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.info.main, 0.1),
                color: 'info.main',
              }}
            />
          </Box>
        </Box>

        {/* Basic Settings */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Basic Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Edge Type</InputLabel>
              <Select
                value={edgeType}
                label="Edge Type"
                onChange={(e) => setEdgeType(e.target.value as WorkflowEdgeType)}
              >
                <MenuItem value="default">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>⌒</Box>
                    Bezier (Default)
                  </Box>
                </MenuItem>
                <MenuItem value="straight">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>—</Box>
                    Straight
                  </Box>
                </MenuItem>
                <MenuItem value="step">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>⌐</Box>
                    Step (Right Angles)
                  </Box>
                </MenuItem>
                <MenuItem value="smoothstep">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>╭</Box>
                    Smooth Step (Rounded)
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={animated}
                  onChange={(e) => setAnimated(e.target.checked)}
                />
              }
              label="Animated"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 2 }}>
              Show animation on the connection line
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Conditional Routing */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <CodeIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Conditional Routing
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Only follow this connection when the condition is true
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Condition Expression"
              value={conditionExpression}
              onChange={(e) => setConditionExpression(e.target.value)}
              placeholder="e.g., data.status === 'approved'"
              multiline
              rows={2}
              sx={{
                mb: 2,
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                },
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Condition Label"
              value={conditionLabel}
              onChange={(e) => setConditionLabel(e.target.value)}
              placeholder="e.g., Approved"
              helperText="Label displayed on the connection"
            />
          </AccordionDetails>
        </Accordion>

        {/* Visual Style */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <StyleIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Visual Style
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Stroke Color</InputLabel>
              <Select
                value={strokeColor}
                label="Stroke Color"
                onChange={(e) => setStrokeColor(e.target.value)}
              >
                <MenuItem value="">Default</MenuItem>
                <MenuItem value="#4CAF50">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#4CAF50', borderRadius: 0.5 }} />
                    Green (Success)
                  </Box>
                </MenuItem>
                <MenuItem value="#f44336">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#f44336', borderRadius: 0.5 }} />
                    Red (Error)
                  </Box>
                </MenuItem>
                <MenuItem value="#FF9800">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#FF9800', borderRadius: 0.5 }} />
                    Orange (Warning)
                  </Box>
                </MenuItem>
                <MenuItem value="#2196F3">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#2196F3', borderRadius: 0.5 }} />
                    Blue (Info)
                  </Box>
                </MenuItem>
                <MenuItem value="#9C27B0">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#9C27B0', borderRadius: 0.5 }} />
                    Purple
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              label="Stroke Width"
              type="number"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              inputProps={{ min: 1, max: 10 }}
              helperText="Line thickness (1-10)"
            />
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 2 }} />

        {/* Delete Edge */}
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          Delete Connection
        </Button>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} sx={{ flex: 1 }}>
          Save Changes
        </Button>
      </Box>
    </Drawer>
  );
}

export default EdgeConfigPanel;
