'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Tooltip,
  useTheme,
  alpha,
  Chip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
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
  Article as HtmlOutputIcon,
  Output as OutputIcon,
  Hub as EmbedIcon,
  Bolt as FieldEventIcon,
  EditNote as FormUpdateIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandPaletteIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  ViewKanban as KanbanIcon,
} from '@mui/icons-material';
import { NodeCategory } from '@/types/workflow';
import { useExtensionNodes, ExtensionNodeDefinition } from '@/hooks/useExtensionNodes';

// Storage key for palette preferences
const PALETTE_PREFS_KEY = 'netpad_node_palette_prefs';

interface PalettePrefs {
  collapsed: boolean;
  viewMode: 'list' | 'grid';
  expandedCategories: NodeCategory[];
}

const DEFAULT_PREFS: PalettePrefs = {
  collapsed: false,
  viewMode: 'grid',
  expandedCategories: ['triggers', 'logic', 'actions'],
};

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
  'Article': <HtmlOutputIcon />,
  'Output': <OutputIcon />,
  'Hub': <EmbedIcon />,
  'Search': <SearchIcon />,
  'Bolt': <FieldEventIcon />,
  'EditNote': <FormUpdateIcon />,
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
  {
    type: 'moltboard:create-task',
    label: 'Moltboard: Create Task',
    description: 'Create a new task in Moltboard kanban',
    icon: <KanbanIcon />,
    color: '#FF5722',
    category: 'integrations',
  },
  {
    type: 'moltboard:update-task',
    label: 'Moltboard: Update Task',
    description: 'Update an existing Moltboard task',
    icon: <KanbanIcon />,
    color: '#FF5722',
    category: 'integrations',
  },
  {
    type: 'moltboard:get-tasks',
    label: 'Moltboard: Get Tasks',
    description: 'Retrieve tasks from Moltboard board',
    icon: <KanbanIcon />,
    color: '#FF5722',
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
  {
    type: 'ai-embed',
    label: 'Generate Embeddings',
    description: 'Generate vector embeddings using Voyage AI or OpenAI',
    icon: <EmbedIcon />,
    color: '#00897B',
    category: 'ai',
  },
  {
    type: 'vector-search',
    label: 'Vector Search',
    description: 'Search MongoDB Atlas Vector Search index',
    icon: <SearchIcon />,
    color: '#00897B',
    category: 'ai',
  },
  {
    type: 'semantic-search',
    label: 'Semantic Search',
    description: 'Embed query and search in one step',
    icon: <SearchIcon />,
    color: '#00897B',
    category: 'ai',
  },

  // Form Reactions - Field Event is a trigger, Update Fields is an action
  {
    type: 'field-event-trigger',
    label: 'Field Event',
    description: 'Trigger workflow on form field change/blur',
    icon: <FieldEventIcon />,
    color: '#00BCD4',
    category: 'triggers',  // This is a trigger - belongs with other triggers
  },
  {
    type: 'form-field-update',
    label: 'Update Fields',
    description: 'Update form fields with workflow data',
    icon: <FormUpdateIcon />,
    color: '#00BCD4',
    category: 'actions',  // This is an action that modifies form state
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

  // Output
  {
    type: 'html-output',
    label: 'HTML Output',
    description: 'Render data as HTML using templates',
    icon: <HtmlOutputIcon />,
    color: '#0891B2',
    category: 'output',
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
  output: { label: 'Output', icon: <OutputIcon />, color: '#0891B2' },
  forms: { label: 'Forms', icon: <FormIcon />, color: '#00BCD4' },
  custom: { label: 'Custom', icon: <CategoryIcon />, color: '#795548' },
  annotations: { label: 'Annotations', icon: <StickyNoteIcon />, color: '#FBC02D' },
};

// Category order for display
const CATEGORY_ORDER: NodeCategory[] = [
  'triggers',
  'logic',
  'integrations',
  'actions',
  'data',
  'ai',
  'output',
  'custom',
  'annotations',
];

interface NodePaletteProps {
  onNodeSelect?: (nodeType: string) => void;
}

export function NodePalette({ onNodeSelect }: NodePaletteProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Load preferences from localStorage
  const [prefs, setPrefs] = useState<PalettePrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PALETTE_PREFS_KEY);
      if (stored) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save preferences to localStorage
  const updatePrefs = (updates: Partial<PalettePrefs>) => {
    setPrefs((prev) => {
      const newPrefs = { ...prev, ...updates };
      try {
        localStorage.setItem(PALETTE_PREFS_KEY, JSON.stringify(newPrefs));
      } catch {
        // Ignore storage errors
      }
      return newPrefs;
    });
  };

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
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    updatePrefs({
      expandedCategories: isExpanded
        ? [...prefs.expandedCategories, category]
        : prefs.expandedCategories.filter((c) => c !== category),
    });
  };

  // Collapsed view - just show category icons
  if (prefs.collapsed) {
    return (
      <Paper
        square
        elevation={0}
        data-tour="node-palette"
        sx={{
          borderRadius: 0,
          width: 48,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
        }}
      >
        {/* Expand button */}
        <Box sx={{ p: 0.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Tooltip title="Expand palette" placement="right">
            <IconButton
              size="small"
              onClick={() => updatePrefs({ collapsed: false })}
              sx={{ width: 36, height: 36 }}
            >
              <ExpandPaletteIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Category icons */}
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          {CATEGORY_ORDER.map((category) => {
            const nodes = nodesByCategory[category];
            if (!nodes || nodes.length === 0) return null;
            const config = CATEGORY_CONFIG[category];

            return (
              <Tooltip
                key={category}
                title={`${config.label} (${nodes.length})`}
                placement="right"
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    py: 0.75,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: alpha(config.color, 0.1),
                      color: config.color,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      '&:hover': {
                        bgcolor: alpha(config.color, 0.2),
                        transform: 'scale(1.1)',
                      },
                    }}
                    onClick={() => {
                      updatePrefs({
                        collapsed: false,
                        expandedCategories: [category],
                      });
                    }}
                  >
                    {config.icon}
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {/* Extension loading indicator */}
        {extensionLoading && (
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
            <NetPadLoader size="small" variant="svg" showPhrases={false} />
          </Box>
        )}
      </Paper>
    );
  }

  // Expanded view
  return (
    <Paper
      square
      elevation={0}
      data-tour="node-palette"
      sx={{
        borderRadius: 0,
        width: 260,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
            Nodes
          </Typography>

          {/* View mode toggle */}
          <ToggleButtonGroup
            size="small"
            value={prefs.viewMode}
            exclusive
            onChange={(_, value) => value && updatePrefs({ viewMode: value })}
            sx={{ height: 28 }}
          >
            <ToggleButton value="grid" sx={{ px: 0.75, py: 0 }}>
              <Tooltip title="Grid view">
                <GridViewIcon sx={{ fontSize: 16 }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" sx={{ px: 0.75, py: 0 }}>
              <Tooltip title="List view">
                <ListViewIcon sx={{ fontSize: 16 }} />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Collapse button */}
          <Tooltip title="Collapse palette">
            <IconButton
              size="small"
              onClick={() => updatePrefs({ collapsed: true })}
              sx={{ width: 28, height: 28 }}
            >
              <CollapseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

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
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: { height: 32, fontSize: '0.875rem' },
          }}
        />
      </Box>

      {/* Node Categories */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {CATEGORY_ORDER.map((category) => {
          const nodes = nodesByCategory[category];
          if (!nodes || nodes.length === 0) return null;

          const config = CATEGORY_CONFIG[category];
          const isExpanded = prefs.expandedCategories.includes(category);

          return (
            <Accordion
              key={category}
              expanded={isExpanded}
              onChange={handleAccordionChange(category)}
              disableGutters
              elevation={0}
              sx={{
                '&:before': { display: 'none' },
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandIcon sx={{ fontSize: 18 }} />}
                sx={{
                  minHeight: 40,
                  px: 1.5,
                  '& .MuiAccordionSummary-content': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    my: 0.5,
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 0.75,
                    bgcolor: alpha(config.color, 0.1),
                    color: config.color,
                    '& svg': { fontSize: 16 },
                  }}
                >
                  {config.icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  {config.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ ml: 'auto', mr: 0.5, color: 'text.secondary', fontSize: '0.7rem' }}
                >
                  {nodes.length}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0.75, pt: 0 }}>
                {/* Grid View */}
                {prefs.viewMode === 'grid' ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 0.5,
                    }}
                  >
                    {nodes.map((node) => (
                      <Tooltip
                        key={node.type}
                        title={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {node.label}
                            </Typography>
                            <Typography variant="caption">{node.description}</Typography>
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
                        <Box
                          draggable
                          onDragStart={(e) => onDragStart(e, node)}
                          onClick={() => onNodeSelect?.(node.type)}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.25,
                            p: 0.75,
                            borderRadius: 1,
                            cursor: 'grab',
                            transition: 'all 0.15s',
                            '&:hover': {
                              bgcolor: alpha(node.color, 0.1),
                              transform: 'scale(1.05)',
                            },
                            '&:active': {
                              cursor: 'grabbing',
                              transform: 'scale(0.95)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              bgcolor: alpha(node.color, 0.15),
                              color: node.color,
                              position: 'relative',
                              '& svg': { fontSize: 18 },
                            }}
                          >
                            {node.icon}
                            {node.isExtension && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: -3,
                                  right: -3,
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: theme.palette.info.main,
                                  border: `1px solid ${theme.palette.background.paper}`,
                                }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              textAlign: 'center',
                              lineHeight: 1.2,
                              color: 'text.secondary',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {node.label.split(' ')[0]}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                ) : (
                  /* List View */
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
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
                        <Box
                          draggable
                          onDragStart={(e) => onDragStart(e, node)}
                          onClick={() => onNodeSelect?.(node.type)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1,
                            py: 0.5,
                            borderRadius: 0.75,
                            cursor: 'grab',
                            transition: 'all 0.15s',
                            '&:hover': {
                              bgcolor: alpha(node.color, 0.08),
                            },
                            '&:active': {
                              cursor: 'grabbing',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: 0.75,
                              bgcolor: alpha(node.color, 0.1),
                              color: node.color,
                              position: 'relative',
                              '& svg': { fontSize: 14 },
                            }}
                          >
                            {node.icon}
                            {node.isExtension && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: -2,
                                  right: -2,
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  bgcolor: theme.palette.info.main,
                                  border: `1px solid ${theme.palette.background.paper}`,
                                }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: '0.8rem', fontWeight: 500 }}
                          >
                            {node.label}
                          </Typography>
                          {node.isExtension && (
                            <Chip
                              label="Ext"
                              size="small"
                              sx={{
                                height: 14,
                                fontSize: '0.6rem',
                                ml: 'auto',
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.main,
                              }}
                            />
                          )}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Help text */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
          {extensionLoading ? (
            <>
              <NetPadLoader size="small" variant="svg" showPhrases={false} />
              Loading extensions...
            </>
          ) : (
            <>
              Drag nodes to canvas
              {extensionNodes.length > 0 && (
                <Chip
                  label={`+${extensionNodes.length} ext`}
                  size="small"
                  sx={{
                    height: 14,
                    fontSize: '0.6rem',
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
