'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  alpha,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Add,
  AutoAwesome,
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
  Lightbulb,
  AccountTree,
  Close as CloseIcon,
} from '@mui/icons-material';
import { NodeCategory } from '@/types/workflow';
import { useAIWorkflowGenerator } from '@/hooks/useAI';
import { GeneratedWorkflow } from '@/lib/ai/types';

// Node definition for the picker
interface NodeTypeOption {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: NodeCategory;
}

// Available nodes grouped by category
const NODE_OPTIONS: NodeTypeOption[] = [
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
  annotations: { label: 'Annotations', icon: <CategoryIcon />, color: '#9E9E9E' },
};

// Workflow template definition
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  nodeCount: number;
  nodes: Array<{
    type: string;
    label: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    source: number;
    target: number;
  }>;
}

// Pre-built workflow templates
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // Form Processing
  {
    id: 'form-to-email',
    name: 'Form to Email',
    description: 'Send email when form is submitted',
    icon: '📧',
    category: 'forms',
    nodeCount: 2,
    nodes: [
      { type: 'form-trigger', label: 'Form Submission', position: { x: 250, y: 100 } },
      { type: 'email-send', label: 'Send Email', position: { x: 250, y: 250 } },
    ],
    edges: [{ source: 0, target: 1 }],
  },
  {
    id: 'form-to-mongodb',
    name: 'Form to Database',
    description: 'Save form data to MongoDB',
    icon: '💾',
    category: 'forms',
    nodeCount: 2,
    nodes: [
      { type: 'form-trigger', label: 'Form Submission', position: { x: 250, y: 100 } },
      { type: 'mongodb-write', label: 'Save to MongoDB', position: { x: 250, y: 250 } },
    ],
    edges: [{ source: 0, target: 1 }],
  },
  {
    id: 'form-notification',
    name: 'Form with Notification',
    description: 'Form submission with email & notification',
    icon: '🔔',
    category: 'forms',
    nodeCount: 3,
    nodes: [
      { type: 'form-trigger', label: 'Form Submission', position: { x: 250, y: 100 } },
      { type: 'email-send', label: 'Send Email', position: { x: 150, y: 250 } },
      { type: 'notification', label: 'Push Notification', position: { x: 350, y: 250 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 0, target: 2 },
    ],
  },

  // Data Processing
  {
    id: 'scheduled-sync',
    name: 'Scheduled Data Sync',
    description: 'Periodically sync data from API',
    icon: '🔄',
    category: 'data',
    nodeCount: 3,
    nodes: [
      { type: 'schedule-trigger', label: 'Daily Schedule', position: { x: 250, y: 100 } },
      { type: 'http-request', label: 'Fetch Data', position: { x: 250, y: 250 } },
      { type: 'mongodb-write', label: 'Save to DB', position: { x: 250, y: 400 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
    ],
  },
  {
    id: 'data-pipeline',
    name: 'Data Transform Pipeline',
    description: 'Query, transform, and save data',
    icon: '⚙️',
    category: 'data',
    nodeCount: 4,
    nodes: [
      { type: 'manual-trigger', label: 'Start', position: { x: 250, y: 100 } },
      { type: 'mongodb-query', label: 'Query Data', position: { x: 250, y: 250 } },
      { type: 'transform', label: 'Transform', position: { x: 250, y: 400 } },
      { type: 'mongodb-write', label: 'Save Results', position: { x: 250, y: 550 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
    ],
  },

  // Webhooks & Integrations
  {
    id: 'webhook-processor',
    name: 'Webhook Processor',
    description: 'Process incoming webhooks',
    icon: '🔗',
    category: 'integrations',
    nodeCount: 3,
    nodes: [
      { type: 'webhook-trigger', label: 'Webhook', position: { x: 250, y: 100 } },
      { type: 'transform', label: 'Process Data', position: { x: 250, y: 250 } },
      { type: 'http-request', label: 'Forward to API', position: { x: 250, y: 400 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
    ],
  },
  {
    id: 'api-to-email',
    name: 'API Monitoring',
    description: 'Check API and send alerts',
    icon: '🚨',
    category: 'integrations',
    nodeCount: 4,
    nodes: [
      { type: 'schedule-trigger', label: 'Every 5 min', position: { x: 250, y: 100 } },
      { type: 'http-request', label: 'Check API', position: { x: 250, y: 250 } },
      { type: 'conditional', label: 'Is Error?', position: { x: 250, y: 400 } },
      { type: 'email-send', label: 'Send Alert', position: { x: 250, y: 550 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
    ],
  },

  // AI Workflows
  {
    id: 'ai-classification',
    name: 'AI Text Classification',
    description: 'Classify text and route accordingly',
    icon: '🤖',
    category: 'ai',
    nodeCount: 4,
    nodes: [
      { type: 'form-trigger', label: 'Form Input', position: { x: 250, y: 100 } },
      { type: 'ai-classify', label: 'Classify', position: { x: 250, y: 250 } },
      { type: 'conditional', label: 'Route', position: { x: 250, y: 400 } },
      { type: 'email-send', label: 'Notify Team', position: { x: 250, y: 550 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
    ],
  },
  {
    id: 'ai-extraction',
    name: 'AI Data Extraction',
    description: 'Extract structured data from text',
    icon: '📊',
    category: 'ai',
    nodeCount: 4,
    nodes: [
      { type: 'webhook-trigger', label: 'Receive Data', position: { x: 250, y: 100 } },
      { type: 'ai-extract', label: 'Extract Fields', position: { x: 250, y: 250 } },
      { type: 'transform', label: 'Format', position: { x: 250, y: 400 } },
      { type: 'mongodb-write', label: 'Store', position: { x: 250, y: 550 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
    ],
  },

  // Automation
  {
    id: 'conditional-routing',
    name: 'Conditional Routing',
    description: 'Route data based on conditions',
    icon: '🔀',
    category: 'logic',
    nodeCount: 4,
    nodes: [
      { type: 'manual-trigger', label: 'Start', position: { x: 250, y: 100 } },
      { type: 'conditional', label: 'Check Condition', position: { x: 250, y: 250 } },
      { type: 'email-send', label: 'Path A', position: { x: 100, y: 400 } },
      { type: 'notification', label: 'Path B', position: { x: 400, y: 400 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 1, target: 3 },
    ],
  },
  {
    id: 'batch-processing',
    name: 'Batch Processing',
    description: 'Process items in a loop',
    icon: '🔁',
    category: 'logic',
    nodeCount: 4,
    nodes: [
      { type: 'mongodb-query', label: 'Get Items', position: { x: 250, y: 100 } },
      { type: 'loop', label: 'For Each', position: { x: 250, y: 250 } },
      { type: 'transform', label: 'Process', position: { x: 250, y: 400 } },
      { type: 'mongodb-write', label: 'Update', position: { x: 250, y: 550 } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
    ],
  },
];

// Template categories
const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'forms', label: 'Forms', icon: '📝' },
  { id: 'data', label: 'Data', icon: '💾' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'logic', label: 'Logic', icon: '🔀' },
];

// AI Example prompts
const AI_EXAMPLE_PROMPTS = [
  'When a form is submitted, send an email and save to database',
  'Every day at 9am, fetch data from an API and store it',
  'Process webhooks, classify with AI, and route to different actions',
  'Analyze form submissions with AI and notify the team if negative',
];

interface EmptyWorkflowStateProps {
  onAddNode: (nodeType: string) => void;
  onLoadTemplate: (template: WorkflowTemplate) => void;
  onGenerateWorkflow?: (workflow: GeneratedWorkflow) => void;
  onDismiss?: () => void;
}

export function EmptyWorkflowState({
  onAddNode,
  onLoadTemplate,
  onGenerateWorkflow,
  onDismiss,
}: EmptyWorkflowStateProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedNodeCategory, setSelectedNodeCategory] = useState<NodeCategory | 'all'>('triggers');
  const [aiPrompt, setAiPrompt] = useState('');

  // AI Workflow Generator hook
  const {
    data: generatedWorkflow,
    loading: aiLoading,
    error: aiError,
    generateWorkflow,
    reset: resetAI,
  } = useAIWorkflowGenerator();

  // Handle AI generation
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    await generateWorkflow(aiPrompt);
  };

  // Handle applying generated workflow
  const handleApplyWorkflow = () => {
    if (generatedWorkflow && onGenerateWorkflow) {
      onGenerateWorkflow(generatedWorkflow);
      resetAI();
      setAiPrompt('');
    }
  };

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all'
    ? WORKFLOW_TEMPLATES
    : WORKFLOW_TEMPLATES.filter(t => t.category === selectedCategory);

  // Filter nodes by category
  const filteredNodes = selectedNodeCategory === 'all'
    ? NODE_OPTIONS
    : NODE_OPTIONS.filter(n => n.category === selectedNodeCategory);

  // Get categories that have nodes
  const nodeCategories = ['all', ...new Set(NODE_OPTIONS.map(n => n.category))] as (NodeCategory | 'all')[];

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        width: '100%',
        maxWidth: 700,
        px: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha('#9C27B0', 0.1)} 0%, ${alpha('#9C27B0', 0.02)} 100%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
            position: 'relative',
          }}
        >
          {/* Close Button */}
          {onDismiss && (
            <Tooltip title="Close (drag nodes from palette to start)">
              <IconButton
                onClick={onDismiss}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'text.primary',
                    bgcolor: alpha('#000', 0.05),
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <AccountTree sx={{ fontSize: 48, color: '#9C27B0', mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            Build Your Workflow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start with a trigger node or use a template to get started quickly.
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minHeight: 48,
            },
            '& .Mui-selected': {
              color: '#9C27B0',
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#9C27B0',
            },
          }}
        >
          <Tab
            icon={<Add sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Add Nodes"
          />
          <Tab
            icon={<AccountTree sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Templates"
          />
          <Tab
            icon={<AutoAwesome sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="AI Assist"
          />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ minHeight: 350 }}>
          {/* Tab 0: Node Types */}
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 400 }}>
              {/* Category Filter */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  p: 1.5,
                  pb: 1,
                  overflowX: 'auto',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                {nodeCategories.map((cat) => {
                  const config = cat === 'all'
                    ? { label: 'All', color: '#666' }
                    : CATEGORY_CONFIG[cat];
                  const count = cat === 'all'
                    ? NODE_OPTIONS.length
                    : NODE_OPTIONS.filter(n => n.category === cat).length;

                  return (
                    <Chip
                      key={cat}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{config.label}</span>
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              px: 0.75,
                              py: 0.125,
                              borderRadius: 1,
                              bgcolor: selectedNodeCategory === cat
                                ? alpha('#fff', 0.2)
                                : alpha('#000', 0.08),
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {count}
                          </Box>
                        </Box>
                      }
                      onClick={() => setSelectedNodeCategory(cat)}
                      sx={{
                        height: 32,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        bgcolor: selectedNodeCategory === cat
                          ? config.color
                          : 'transparent',
                        color: selectedNodeCategory === cat
                          ? '#fff'
                          : 'text.primary',
                        border: '1px solid',
                        borderColor: selectedNodeCategory === cat
                          ? config.color
                          : 'divider',
                        '&:hover': {
                          bgcolor: selectedNodeCategory === cat
                            ? config.color
                            : alpha(config.color, 0.08),
                          borderColor: config.color,
                        },
                      }}
                    />
                  );
                })}
              </Box>

              {/* Node List */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
                }}
              >
                <List dense>
                  {filteredNodes.map((node) => (
                    <Tooltip key={node.type} title={node.description} placement="right">
                      <ListItem
                        onClick={() => onAddNode(node.type)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: alpha(node.color, 0.08),
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: 1.5,
                              bgcolor: alpha(node.color, 0.1),
                              color: node.color,
                            }}
                          >
                            {node.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={node.label}
                          secondary={node.description}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}
                          secondaryTypographyProps={{ fontSize: 12 }}
                        />
                      </ListItem>
                    </Tooltip>
                  ))}
                </List>
              </Box>
            </Box>
          )}

          {/* Tab 1: Templates */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 400 }}>
              {/* Category Filter */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 0.75,
                  p: 1.5,
                  pb: 1,
                  overflowX: 'auto',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const count = cat.id === 'all'
                    ? WORKFLOW_TEMPLATES.length
                    : WORKFLOW_TEMPLATES.filter(t => t.category === cat.id).length;
                  return (
                    <Chip
                      key={cat.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              px: 0.75,
                              py: 0.125,
                              borderRadius: 1,
                              bgcolor: selectedCategory === cat.id
                                ? alpha('#fff', 0.2)
                                : alpha('#000', 0.08),
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {count}
                          </Box>
                        </Box>
                      }
                      onClick={() => setSelectedCategory(cat.id)}
                      sx={{
                        height: 32,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        bgcolor: selectedCategory === cat.id
                          ? '#9C27B0'
                          : 'transparent',
                        color: selectedCategory === cat.id
                          ? '#fff'
                          : 'text.primary',
                        border: '1px solid',
                        borderColor: selectedCategory === cat.id
                          ? '#9C27B0'
                          : 'divider',
                        '&:hover': {
                          bgcolor: selectedCategory === cat.id
                            ? '#9C27B0'
                            : alpha('#9C27B0', 0.08),
                          borderColor: '#9C27B0',
                        },
                      }}
                    />
                  );
                })}
              </Box>

              {/* Template Grid */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
                }}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {filteredTemplates.map((template) => (
                    <Paper
                      key={template.id}
                      elevation={0}
                      onClick={() => onLoadTemplate(template)}
                      sx={{
                        flex: '1 1 calc(50% - 6px)',
                        minWidth: 200,
                        maxWidth: 'calc(50% - 6px)',
                        p: 1.5,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: alpha('#9C27B0', 0.5),
                          bgcolor: alpha('#9C27B0', 0.03),
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha('#9C27B0', 0.1)}`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                        <Typography sx={{ fontSize: 24 }}>{template.icon}</Typography>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              mb: 0.25,
                              fontSize: 13,
                            }}
                          >
                            {template.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              fontSize: 11,
                              mb: 0.5,
                            }}
                          >
                            {template.description}
                          </Typography>
                          <Chip
                            label={`${template.nodeCount} nodes`}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 16,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          {/* Tab 2: AI Assist */}
          {activeTab === 2 && (
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: 400 }}>
              {!generatedWorkflow ? (
                <>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <AutoAwesome sx={{ fontSize: 36, color: '#9C27B0', mb: 1 }} />
                    <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                      AI Workflow Assistant
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                      Describe what you want your workflow to do in plain English.
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="e.g., When a form is submitted, send an email notification and save the data to MongoDB"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={aiLoading}
                    sx={{ mb: 1.5 }}
                    size="small"
                  />

                  {/* Example prompts */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Try an example:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {AI_EXAMPLE_PROMPTS.map((example, index) => (
                        <Chip
                          key={index}
                          label={example.length > 40 ? example.substring(0, 40) + '...' : example}
                          size="small"
                          variant="outlined"
                          onClick={() => setAiPrompt(example)}
                          disabled={aiLoading}
                          sx={{ cursor: 'pointer', fontSize: 11 }}
                        />
                      ))}
                    </Box>
                  </Box>

                  {aiError && (
                    <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
                      {aiError}
                    </Alert>
                  )}

                  <Box sx={{ textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      startIcon={aiLoading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                      onClick={handleAIGenerate}
                      disabled={aiLoading || !aiPrompt.trim()}
                      sx={{
                        background: 'linear-gradient(135deg, #9C27B0 0%, #E91E63 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7B1FA2 0%, #C2185B 100%)',
                        },
                        '&.Mui-disabled': {
                          background: alpha('#9C27B0', 0.3),
                          color: alpha('#fff', 0.5),
                        },
                      }}
                    >
                      {aiLoading ? 'Generating...' : 'Generate Workflow'}
                    </Button>
                  </Box>
                </>
              ) : (
                // Generated workflow preview
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AccountTree sx={{ fontSize: 18, color: '#9C27B0' }} />
                    {generatedWorkflow.name}
                  </Typography>
                  {generatedWorkflow.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
                      {generatedWorkflow.description}
                    </Typography>
                  )}

                  <Box
                    sx={{
                      flex: 1,
                      overflowY: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      mb: 2,
                    }}
                  >
                    <List dense disablePadding>
                      {generatedWorkflow.nodes.map((node, index) => (
                        <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: 0.5,
                                bgcolor: alpha(
                                  node.type.includes('trigger') ? '#4CAF50' :
                                  node.type.includes('ai') ? '#E91E63' :
                                  node.type.includes('mongo') ? '#00897B' :
                                  node.type.includes('email') || node.type.includes('notification') ? '#2196F3' :
                                  '#9C27B0',
                                  0.1
                                ),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                              }}
                            >
                              {node.type.includes('trigger') ? '▶️' :
                               node.type.includes('email') ? '📧' :
                               node.type.includes('mongo') ? '💾' :
                               node.type.includes('ai') ? '🤖' :
                               node.type.includes('http') ? '🌐' :
                               node.type.includes('conditional') ? '🔀' :
                               '⚙️'}
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={node.label}
                            secondary={node.type}
                            primaryTypographyProps={{ variant: 'body2', fontSize: 12 }}
                            secondaryTypographyProps={{ variant: 'caption', fontSize: 10 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        resetAI();
                        setAiPrompt('');
                      }}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={handleApplyWorkflow}
                      disabled={!onGenerateWorkflow}
                    >
                      Apply to Canvas
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha('#000', 0.02),
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Lightbulb sx={{ fontSize: 16, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary">
            Tip: Every workflow needs a trigger to start. Choose a trigger node first!
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default EmptyWorkflowState;

// Export template type for use in parent component
export type { WorkflowTemplate };
