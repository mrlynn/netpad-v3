'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  alpha,
  Badge,
  Collapse,
  Chip,
} from '@mui/material';
import {
  Add,
  DragIndicator,
  ChevronLeft,
  ChevronRight,
  TextFields,
  Numbers,
  CalendarMonth,
  Email,
  Link as LinkIcon,
  ToggleOn,
  List,
  Title,
  Notes,
  HorizontalRule,
  Image,
  SpaceBar,
  Functions,
  Rule,
  Star,
} from '@mui/icons-material';
import { FieldConfig, LayoutFieldType } from '@/types/form';

const LAYOUT_FIELD_TYPES: LayoutFieldType[] = ['section-header', 'description', 'divider', 'image', 'spacer'];

const getFieldIcon = (config: FieldConfig) => {
  if (config.layout) {
    switch (config.layout.type) {
      case 'section-header': return <Title sx={{ fontSize: 16 }} />;
      case 'description': return <Notes sx={{ fontSize: 16 }} />;
      case 'divider': return <HorizontalRule sx={{ fontSize: 16 }} />;
      case 'image': return <Image sx={{ fontSize: 16 }} />;
      case 'spacer': return <SpaceBar sx={{ fontSize: 16 }} />;
    }
  }

  switch (config.type) {
    case 'string':
    case 'text':
      return <TextFields sx={{ fontSize: 16 }} />;
    case 'number':
    case 'rating':
    case 'scale':
      return <Numbers sx={{ fontSize: 16 }} />;
    case 'date':
    case 'datetime':
      return <CalendarMonth sx={{ fontSize: 16 }} />;
    case 'email':
      return <Email sx={{ fontSize: 16 }} />;
    case 'url':
      return <LinkIcon sx={{ fontSize: 16 }} />;
    case 'boolean':
    case 'yes-no':
    case 'yes_no':
      return <ToggleOn sx={{ fontSize: 16 }} />;
    case 'array':
    case 'array-object':
      return <List sx={{ fontSize: 16 }} />;
    default:
      return <TextFields sx={{ fontSize: 16 }} />;
  }
};

interface MinimalFieldSidebarProps {
  fieldConfigs: FieldConfig[];
  selectedPath: string | null;
  collapsed: boolean;
  onSelectField: (path: string | null) => void;
  onReorderFields?: (newOrder: FieldConfig[]) => void;
  onAddQuestion: () => void;
  onToggleCollapse: () => void;
}

export function MinimalFieldSidebar({
  fieldConfigs,
  selectedPath,
  collapsed,
  onSelectField,
  onReorderFields,
  onAddQuestion,
  onToggleCollapse,
}: MinimalFieldSidebarProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const includedCount = fieldConfigs.filter(f => f.included).length;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldConfigs[index].path);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !onReorderFields) return;

    const newConfigs = [...fieldConfigs];
    const [removed] = newConfigs.splice(draggedIndex, 1);
    newConfigs.splice(targetIndex, 0, removed);
    onReorderFields(newConfigs);

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  if (collapsed) {
    return (
      <Box
        sx={{
          width: 48,
          height: '100%',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 1,
        }}
      >
        <Tooltip title="Expand sidebar" placement="right">
          <IconButton size="small" onClick={onToggleCollapse} sx={{ mb: 1 }}>
            <ChevronRight />
          </IconButton>
        </Tooltip>

        <Tooltip title="Add question" placement="right">
          <IconButton
            size="small"
            onClick={onAddQuestion}
            sx={{
              mb: 1,
              color: '#00ED64',
              '&:hover': { bgcolor: alpha('#00ED64', 0.1) },
            }}
          >
            <Add />
          </IconButton>
        </Tooltip>

        <Badge
          badgeContent={includedCount}
          color="primary"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              bgcolor: '#00ED64',
              color: '#001E2B',
              fontSize: 10,
            },
          }}
        >
          <Box sx={{ width: 24, height: 24 }} />
        </Badge>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 200,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Questions
          </Typography>
          <Chip
            label={`${includedCount}/${fieldConfigs.length}`}
            size="small"
            sx={{ height: 18, fontSize: 10 }}
          />
        </Box>
        <Tooltip title="Collapse sidebar" placement="right">
          <IconButton size="small" onClick={onToggleCollapse} sx={{ p: 0.5 }}>
            <ChevronLeft sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Add button */}
      <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tooltip title="Add new question">
          <IconButton
            onClick={onAddQuestion}
            sx={{
              width: '100%',
              borderRadius: 1,
              border: '2px dashed',
              borderColor: alpha('#00ED64', 0.3),
              color: '#00ED64',
              '&:hover': {
                borderColor: '#00ED64',
                bgcolor: alpha('#00ED64', 0.05),
              },
            }}
          >
            <Add sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Field list */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 0.5 }}>
        {fieldConfigs.map((config, index) => {
          const isSelected = selectedPath === config.path;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const hasFeatures = config.conditionalLogic?.conditions?.length || config.lookup || config.computed;

          return (
            <Box
              key={config.path}
              draggable={!!onReorderFields}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => onSelectField(isSelected ? null : config.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                p: 0.75,
                mb: 0.5,
                borderRadius: 1,
                cursor: onReorderFields ? 'grab' : 'pointer',
                bgcolor: isSelected
                  ? alpha('#00ED64', 0.15)
                  : isDragOver
                  ? alpha('#00ED64', 0.1)
                  : 'transparent',
                border: '1px solid',
                borderColor: isSelected
                  ? '#00ED64'
                  : isDragOver
                  ? alpha('#00ED64', 0.5)
                  : 'transparent',
                opacity: isDragging ? 0.5 : config.included ? 1 : 0.5,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: isSelected ? alpha('#00ED64', 0.15) : alpha('#00ED64', 0.05),
                },
                '&:active': onReorderFields ? { cursor: 'grabbing' } : {},
              }}
            >
              {onReorderFields && (
                <DragIndicator
                  sx={{
                    fontSize: 14,
                    color: 'text.disabled',
                    flexShrink: 0,
                  }}
                />
              )}

              <Box
                sx={{
                  color: isSelected ? '#00ED64' : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                {getFieldIcon(config)}
              </Box>

              <Typography
                variant="caption"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.7rem',
                }}
              >
                {config.label || config.path}
              </Typography>

              {config.required && (
                <Star sx={{ fontSize: 12, color: '#ff9800', flexShrink: 0 }} />
              )}

              {hasFeatures && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: config.computed ? '#9c27b0' : config.lookup ? '#2196f3' : '#00ED64',
                    flexShrink: 0,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
