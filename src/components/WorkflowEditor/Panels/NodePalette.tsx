'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Search as SearchIcon,
  PlayArrow as ManualIcon,
  Description as FormIcon,
  Link as WebhookIcon,
  Schedule as ScheduleIcon,
  CallSplit as ConditionalIcon,
  Loop as LoopIcon,
  Timer as DelayIcon,
  Http as HttpIcon,
  Storage as MongoIcon,
  Email as EmailIcon,
  Notifications as NotificationIcon,
  Transform as TransformIcon,
  FilterList as FilterIcon,
  MergeType as MergeIcon,
  SmartToy as AiIcon,
  Category as CategoryIcon,
  DataObject as ExtractIcon,
  Code as CodeIcon,
  TableChart as SheetsIcon,
  StickyNote2 as StickyNoteIcon,
} from '@mui/icons-material';
import { NodeCategory } from '@/types/workflow';

// Node definition for palette
interface PaletteNode {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: NodeCategory;
}

// Available nodes grouped by category
const PALETTE_NODES: PaletteNode[] = [
  // Triggers
  {
    type: 'manual-trigger',
    label: 'Manual Start',
    description: 'Start workflow manually with a button click',
    icon: <ManualIcon />,
    color: '#4CAF50',
    category: 'triggers',
  },
  {
    type: 'form-trigger',
    label: 'Form Submission',
    description: 'Trigger when a form is submitted',
    icon: <FormIcon />,
    color: '#2196F3',
    category: 'triggers',
  },
  {
    type: 'webhook-trigger',
    label: 'Webhook',
    description: 'Trigger from external webhook call',
    icon: <WebhookIcon />,
    color: '#FF9800',
    category: 'triggers',
  },
  {
    type: 'schedule-trigger',
    label: 'Schedule',
    description: 'Trigger on a time-based schedule',
    icon: <ScheduleIcon />,
    color: '#9C27B0',
    category: 'triggers',
  },

  // Logic
  {
    type: 'conditional',
    label: 'If/Else',
    description: 'Branch based on conditions',
    icon: <ConditionalIcon />,
    color: '#9C27B0',
    category: 'logic',
  },
  {
    type: 'switch',
    label: 'Switch',
    description: 'Route to multiple paths based on value',
    icon: <ConditionalIcon />,
    color: '#9C27B0',
    category: 'logic',
  },
  {
    type: 'loop',
    label: 'Loop',
    description: 'Iterate over a list of items',
    icon: <LoopIcon />,
    color: '#9C27B0',
    category: 'logic',
  },
  {
    type: 'delay',
    label: 'Delay',
    description: 'Wait before continuing',
    icon: <DelayIcon />,
    color: '#9C27B0',
    category: 'logic',
  },

  // Integrations
  {
    type: 'http-request',
    label: 'HTTP Request',
    description: 'Make HTTP API calls',
    icon: <HttpIcon />,
    color: '#FF9800',
    category: 'integrations',
  },
  {
    type: 'mongodb-query',
    label: 'MongoDB Query',
    description: 'Query MongoDB collection',
    icon: <MongoIcon />,
    color: '#00897B',
    category: 'integrations',
  },
  {
    type: 'mongodb-write',
    label: 'MongoDB Write',
    description: 'Insert/Update MongoDB documents',
    icon: <MongoIcon />,
    color: '#00897B',
    category: 'integrations',
  },
  {
    type: 'google-sheets',
    label: 'Google Sheets',
    description: 'Read and write data to Google Sheets',
    icon: <SheetsIcon />,
    color: '#0F9D58',
    category: 'integrations',
  },
  {
    type: 'atlas-cluster',
    label: 'Atlas Cluster',
    description: 'Manage MongoDB Atlas clusters',
    icon: <MongoIcon />,
    color: '#00684A',
    category: 'integrations',
  },
  {
    type: 'atlas-data-api',
    label: 'Atlas Data API',
    description: 'Query MongoDB Atlas via Data API',
    icon: <MongoIcon />,
    color: '#00684A',
    category: 'integrations',
  },

  // Actions
  {
    type: 'email-send',
    label: 'Send Email',
    description: 'Send an email message',
    icon: <EmailIcon />,
    color: '#2196F3',
    category: 'actions',
  },
  {
    type: 'notification',
    label: 'Notification',
    description: 'Send push notification',
    icon: <NotificationIcon />,
    color: '#2196F3',
    category: 'actions',
  },

  // Data
  {
    type: 'transform',
    label: 'Transform',
    description: 'Transform data structure',
    icon: <TransformIcon />,
    color: '#607D8B',
    category: 'data',
  },
  {
    type: 'filter',
    label: 'Filter',
    description: 'Filter items in a list',
    icon: <FilterIcon />,
    color: '#607D8B',
    category: 'data',
  },
  {
    type: 'merge',
    label: 'Merge',
    description: 'Merge multiple data sources',
    icon: <MergeIcon />,
    color: '#607D8B',
    category: 'data',
  },

  // AI
  {
    type: 'ai-prompt',
    label: 'AI Prompt',
    description: 'Send prompt to AI model',
    icon: <AiIcon />,
    color: '#E91E63',
    category: 'ai',
  },
  {
    type: 'ai-classify',
    label: 'AI Classify',
    description: 'Classify text with AI',
    icon: <CategoryIcon />,
    color: '#E91E63',
    category: 'ai',
  },
  {
    type: 'ai-extract',
    label: 'AI Extract',
    description: 'Extract structured data with AI',
    icon: <ExtractIcon />,
    color: '#E91E63',
    category: 'ai',
  },

  // Custom
  {
    type: 'code',
    label: 'Code',
    description: 'Execute custom JavaScript code',
    icon: <CodeIcon />,
    color: '#795548',
    category: 'custom',
  },

  // Annotations
  {
    type: 'sticky-note',
    label: 'Sticky Note',
    description: 'Add notes and annotations to your workflow (Markdown supported)',
    icon: <StickyNoteIcon />,
    color: '#FBC02D',
    category: 'annotations',
  },
];

// Category configuration
const CATEGORY_CONFIG: Record<NodeCategory, { label: string; icon: React.ReactNode; color: string }> = {
  triggers: { label: 'Triggers', icon: <ManualIcon />, color: '#4CAF50' },
  logic: { label: 'Logic', icon: <ConditionalIcon />, color: '#9C27B0' },
  integrations: { label: 'Integrations', icon: <HttpIcon />, color: '#FF9800' },
  actions: { label: 'Actions', icon: <EmailIcon />, color: '#2196F3' },
  data: { label: 'Data', icon: <TransformIcon />, color: '#607D8B' },
  ai: { label: 'AI', icon: <AiIcon />, color: '#E91E63' },
  forms: { label: 'Forms', icon: <FormIcon />, color: '#00BCD4' },
  custom: { label: 'Custom', icon: <CategoryIcon />, color: '#795548' },
  annotations: { label: 'Annotations', icon: <StickyNoteIcon />, color: '#FBC02D' },
};

interface NodePaletteProps {
  onNodeSelect?: (nodeType: string) => void;
}

export function NodePalette({ onNodeSelect }: NodePaletteProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<NodeCategory[]>(['triggers', 'logic', 'actions']);

  // Filter nodes by search query
  const filteredNodes = PALETTE_NODES.filter(
    (node) =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group nodes by category
  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    if (!acc[node.category]) acc[node.category] = [];
    acc[node.category].push(node);
    return acc;
  }, {} as Record<NodeCategory, PaletteNode[]>);

  // Handle drag start
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow-nodetype', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle accordion expand
  const handleAccordionChange = (category: NodeCategory) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedCategories((prev) =>
      isExpanded ? [...prev, category] : prev.filter((c) => c !== category)
    );
  };

  return (
    <Paper
      elevation={0}
      data-tour="node-palette"
      sx={{
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
          Node Palette
        </Typography>
        <TextField
          data-tour="node-search"
          fullWidth
          size="small"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Node Categories */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {(Object.keys(CATEGORY_CONFIG) as NodeCategory[]).map((category) => {
          const nodes = nodesByCategory[category];
          if (!nodes || nodes.length === 0) return null;

          const config = CATEGORY_CONFIG[category];

          return (
            <Accordion
              key={category}
              expanded={expandedCategories.includes(category)}
              onChange={handleAccordionChange(category)}
              disableGutters
              elevation={0}
              sx={{
                '&:before': { display: 'none' },
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandIcon />}
                sx={{
                  minHeight: 48,
                  '& .MuiAccordionSummary-content': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: alpha(config.color, 0.1),
                    color: config.color,
                  }}
                >
                  {config.icon}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {config.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ ml: 'auto', mr: 1, color: 'text.secondary' }}
                >
                  {nodes.length}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <List dense disablePadding>
                  {nodes.map((node) => (
                    <Tooltip
                      key={node.type}
                      title={node.description}
                      placement="right"
                      arrow
                    >
                      <ListItem
                        draggable
                        onDragStart={(e) => onDragStart(e, node.type)}
                        onClick={() => onNodeSelect?.(node.type)}
                        sx={{
                          cursor: 'grab',
                          '&:hover': {
                            bgcolor: alpha(node.color, 0.08),
                          },
                          '&:active': {
                            cursor: 'grabbing',
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 1,
                              bgcolor: alpha(node.color, 0.1),
                              color: node.color,
                              fontSize: 18,
                            }}
                          >
                            {node.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={node.label}
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: 500,
                          }}
                        />
                      </ListItem>
                    </Tooltip>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Help text */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Drag nodes onto the canvas to add them to your workflow
        </Typography>
      </Box>
    </Paper>
  );
}

export default NodePalette;
