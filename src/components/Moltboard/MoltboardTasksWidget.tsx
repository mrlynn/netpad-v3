'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  Divider,
  Badge,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon,
  PriorityHigh as UrgentIcon,
  Schedule as DueIcon,
  ViewKanban as KanbanIcon,
} from '@mui/icons-material';

interface MoltboardTask {
  id: string;
  title: string;
  description?: string | null;
  columnId: string;
  boardId: string;
  labels?: string[];
  priority?: 'p0' | 'p1' | 'p2' | 'p3' | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MoltboardBoard {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    title: string;
    color: string;
  }>;
}

interface MoltboardTasksWidgetProps {
  apiKey: string;
  baseUrl?: string;
  defaultBoardId?: string;
  maxTasks?: number;
  showCompleted?: boolean;
  title?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  p0: '#f44336', // Critical - Red
  p1: '#ff9800', // High - Orange
  p2: '#2196f3', // Medium - Blue
  p3: '#9e9e9e', // Low - Gray
};

const PRIORITY_LABELS: Record<string, string> = {
  p0: 'Critical',
  p1: 'High',
  p2: 'Medium',
  p3: 'Low',
};

export function MoltboardTasksWidget({
  apiKey,
  baseUrl = 'https://kanban.mlynn.org',
  defaultBoardId,
  maxTasks = 10,
  showCompleted = false,
  title = 'Moltboard Tasks',
}: MoltboardTasksWidgetProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<MoltboardBoard[]>([]);
  const [tasks, setTasks] = useState<MoltboardTask[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(defaultBoardId || '');

  // Fetch boards
  useEffect(() => {
    async function fetchBoards() {
      try {
        const response = await fetch(`${baseUrl}/api/boards`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) throw new Error('Failed to fetch boards');
        const data = await response.json();
        setBoards(data);
        if (!selectedBoardId && data.length > 0) {
          setSelectedBoardId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch boards');
      }
    }
    fetchBoards();
  }, [apiKey, baseUrl, selectedBoardId]);

  // Fetch tasks for selected board
  useEffect(() => {
    if (!selectedBoardId) return;

    async function fetchTasks() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${baseUrl}/api/tasks?boardId=${selectedBoardId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const data = await response.json();
        
        // Filter and sort tasks
        let filteredTasks = data;
        
        // Get the selected board's columns
        const board = boards.find(b => b.id === selectedBoardId);
        const doneColumn = board?.columns.find(c => 
          c.title.toLowerCase() === 'done' || c.title.toLowerCase() === 'completed'
        );
        
        // Filter out completed tasks if showCompleted is false
        if (!showCompleted && doneColumn) {
          filteredTasks = filteredTasks.filter((t: MoltboardTask) => t.columnId !== doneColumn.id);
        }
        
        // Sort by priority (p0 first), then by due date
        filteredTasks.sort((a: MoltboardTask, b: MoltboardTask) => {
          // Priority sort
          const priorityOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
          const aPriority = a.priority ? priorityOrder[a.priority] ?? 4 : 4;
          const bPriority = b.priority ? priorityOrder[b.priority] ?? 4 : 4;
          if (aPriority !== bPriority) return aPriority - bPriority;
          
          // Due date sort (earlier first, null last)
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          
          return 0;
        });
        
        setTasks(filteredTasks.slice(0, maxTasks));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [selectedBoardId, apiKey, baseUrl, maxTasks, showCompleted, boards]);

  const handleRefresh = () => {
    setLoading(true);
    // Trigger refetch by updating a dummy state
    setSelectedBoardId(prev => prev);
  };

  const getColumnName = (columnId: string): string => {
    const board = boards.find(b => b.id === selectedBoardId);
    const column = board?.columns.find(c => c.id === columnId);
    return column?.title || 'Unknown';
  };

  const isOverdue = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatDueDate = (dueDate: string | null | undefined): string => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <KanbanIcon sx={{ color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={handleRefresh} disabled={loading}>
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Board Selector */}
      {boards.length > 1 && (
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>Board</InputLabel>
          <Select
            value={selectedBoardId}
            label="Board"
            onChange={(e) => setSelectedBoardId(e.target.value)}
          >
            {boards.map((board) => (
              <MenuItem key={board.id} value={board.id}>
                {board.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Divider sx={{ mb: 1 }} />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : tasks.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 4 }}
          >
            No tasks found
          </Typography>
        ) : (
          <List dense disablePadding>
            {tasks.map((task) => (
              <ListItem
                key={task.id}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: alpha(
                    task.priority && PRIORITY_COLORS[task.priority]
                      ? PRIORITY_COLORS[task.priority]
                      : theme.palette.grey[500],
                    0.08
                  ),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
                secondaryAction={
                  <Tooltip title="Open in Moltboard">
                    <IconButton
                      size="small"
                      onClick={() =>
                        window.open(
                          `${baseUrl}/boards/${task.boardId}?task=${task.id}`,
                          '_blank'
                        )
                      }
                    >
                      <OpenIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {task.priority === 'p0' || task.priority === 'p1' ? (
                    <UrgentIcon
                      sx={{
                        fontSize: 18,
                        color: PRIORITY_COLORS[task.priority],
                      }}
                    />
                  ) : (
                    <TaskIcon
                      sx={{
                        fontSize: 18,
                        color: task.priority
                          ? PRIORITY_COLORS[task.priority]
                          : theme.palette.text.secondary,
                      }}
                    />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                        }}
                      >
                        {task.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Chip
                        label={getColumnName(task.columnId)}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.65rem',
                          bgcolor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                        }}
                      />
                      {task.priority && (
                        <Chip
                          label={PRIORITY_LABELS[task.priority]}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.65rem',
                            bgcolor: alpha(PRIORITY_COLORS[task.priority], 0.1),
                            color: PRIORITY_COLORS[task.priority],
                          }}
                        />
                      )}
                      {task.dueDate && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.25,
                            color: isOverdue(task.dueDate)
                              ? theme.palette.error.main
                              : theme.palette.text.secondary,
                          }}
                        >
                          <DueIcon sx={{ fontSize: 12 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                            {formatDueDate(task.dueDate)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      {tasks.length > 0 && (
        <>
          <Divider sx={{ mt: 1 }} />
          <Box sx={{ pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </Typography>
            <Tooltip title="Open Moltboard">
              <IconButton
                size="small"
                onClick={() => window.open(`${baseUrl}/boards/${selectedBoardId}`, '_blank')}
              >
                <OpenIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Paper>
  );
}

export default MoltboardTasksWidget;
