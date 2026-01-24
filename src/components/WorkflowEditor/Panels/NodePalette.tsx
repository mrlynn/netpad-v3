'use client';

import React, { useState, useMemo } from 'react';
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
  Chip,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
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
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import { NodeCategory } from '@/types/workflow';
import { useExtensionNodes, ExtensionNodeDefinition } from '@/hooks/useExtensionNodes';

// Node definition for palette
interface PaletteNode {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: NodeCategory;
  isExtension?: boolean;
  providedBy?: string;
}

// Map of icon names to icon components for extension nodes
const ICON_MAP: Record<string, React.ReactNode> = {
  'Extension': <ExtensionIcon />,
  'Code': <CodeIcon />,
  'Http': <HttpIcon />,
  'Storage': <MongoIcon />,
  'Email': <EmailIcon />,
  'SmartToy': <AiIcon />,
  'Transform': <TransformIcon />,
  'Category': <CategoryIcon />,
  'Description': <FormIcon />,
  'Notifications': <NotificationIcon />,
  'FilterList': <FilterIcon />,
  'MergeType': <MergeIcon />,
  'DataObject': <ExtractIcon />,
  'TableChart': <SheetsIcon />,
  'Schedule': <ScheduleIcon />,
  'Loop': <LoopIcon />,
  'Timer': <DelayIcon />,
  'CallSplit': <ConditionalIcon />,
  'Link': <WebhookIcon />,
  'PlayArrow': <ManualIcon />,
  'StickyNote2': <StickyNoteIcon />,
};

// Convert extension node definition to palette node
function extensionToPaletteNode(ext: ExtensionNodeDefinition): PaletteNode {
  return {
    type: ext.type,
    label: ext.label,
    description: ext.description,
    icon: ICON_MAP[ext.icon] || <ExtensionIcon />,
    color: ext.color,
    category: ext.category,
    isExtension: true,
    providedBy: ext.providedBy,
  };
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

  // Fetch extension nodes
  const { nodes: extensionNodes, loading: extensionLoading } = useExtensionNodes();

  // Combine built-in nodes with extension nodes
  const allNodes = useMemo(() => {
    const extensionPaletteNodes = extensionNodes.map(extensionToPaletteNode);
    return [...PALETTE_NODES, ...extensionPaletteNodes];
  }, [extensionNodes]);

  // Filter nodes by search query
  const filteredNodes = allNodes.filter(
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
  const onDragStart = (event: React.DragEvent, node: PaletteNode) => {
    event.dataTransfer.setData('application/reactflow-nodetype', node.type);
    // Pass extension metadata for proper rendering
    if (node.isExtension) {
      event.dataTransfer.setData('application/reactflow-nodedata', JSON.stringify({
        extensionColor: node.color,
        extensionIcon: getIconEmoji(node.type, extensionNodes),
        isExtension: true,
        providedBy: node.providedBy,
      }));
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  // Get emoji icon for extension nodes (for BaseNode display)
  function getIconEmoji(nodeType: string, extNodes: ExtensionNodeDefinition[]): string {
    const extNode = extNodes.find(n => n.type === nodeType);
    if (!extNode) return '⚙️';
    // Map icon names to emojis
    const iconToEmoji: Record<string, string> = {
      'Notifications': '🔔',
      'Email': '📧',
      'Http': '🌐',
      'Storage': '💾',
      'SmartToy': '🤖',
      'Transform': '🔧',
      'Code': '💻',
      'Description': '📝',
      'FilterList': '🔍',
      'Schedule': '⏰',
      'Loop': '🔄',
      'Timer': '⏳',
      'Extension': '🔌',
    };
    return iconToEmoji[extNode.icon] || '🔌';
  }

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
      square
      elevation={0}
      data-tour="node-palette"
      sx={{
        borderRadius: 0, // Explicitly override theme for structural element
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
                      title={
                        <Box>
                          <Typography variant="body2">{node.description}</Typography>
                          {node.isExtension && (
                            <Typography variant="caption" sx={{ opacity: 0.8, mt: 0.5, display: 'block' }}>
                              Extension: {node.providedBy}
                            </Typography>
                          )}
                        </Box>
                      }
                      placement="right"
                      arrow
                    >
                      <ListItem
                        draggable
                        onDragStart={(e) => onDragStart(e, node)}
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
                              position: 'relative',
                            }}
                          >
                            {node.icon}
                            {node.isExtension && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: -4,
                                  right: -4,
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: theme.palette.info.main,
                                  border: `1.5px solid ${theme.palette.background.paper}`,
                                }}
                              />
                            )}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {node.label}
                              {node.isExtension && (
                                <Chip
                                  label="Ext"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.65rem',
                                    bgcolor: alpha(theme.palette.info.main, 0.1),
                                    color: theme.palette.info.main,
                                  }}
                                />
                              )}
                            </Box>
                          }
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
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
          {extensionLoading ? (
            <>
              <NetPadLoader size="small" variant="svg" showPhrases={false} />
              Loading extension nodes...
            </>
          ) : (
            <>
              Drag nodes onto the canvas to add them to your workflow
              {extensionNodes.length > 0 && (
                <Chip
                  label={`+${extensionNodes.length} ext`}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.65rem',
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                  }}
                />
              )}
            </>
          )}
        </Typography>
      </Box>
    </Paper>
  );
}

export default NodePalette;
