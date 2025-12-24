'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  alpha,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  TextFields,
  Image,
  HorizontalRule,
  ViewAgenda,
  Title,
  Notes,
  ShortText,
  CheckBox,
  RadioButtonChecked,
  ArrowDropDownCircle,
  DateRange,
  Numbers,
  AttachFile,
  ToggleOn,
  Email,
  Link as LinkIcon,
  Palette,
} from '@mui/icons-material';
interface QuickAddOption {
  type: string;
  label: string;
  icon: React.ReactNode;
  layout?: boolean;
}

const QUICK_OPTIONS: QuickAddOption[] = [
  { type: 'text', label: 'Short Answer', icon: <ShortText fontSize="small" /> },
  { type: 'textarea', label: 'Paragraph', icon: <Notes fontSize="small" /> },
  { type: 'radio', label: 'Multiple Choice', icon: <RadioButtonChecked fontSize="small" /> },
  { type: 'checkbox', label: 'Checkboxes', icon: <CheckBox fontSize="small" /> },
  { type: 'select', label: 'Dropdown', icon: <ArrowDropDownCircle fontSize="small" /> },
];

const LAYOUT_OPTIONS: QuickAddOption[] = [
  { type: 'section-header', label: 'Section Header', icon: <Title fontSize="small" />, layout: true },
  { type: 'description', label: 'Description', icon: <TextFields fontSize="small" />, layout: true },
  { type: 'divider', label: 'Divider', icon: <HorizontalRule fontSize="small" />, layout: true },
  { type: 'image', label: 'Image', icon: <Image fontSize="small" />, layout: true },
];

const MORE_OPTIONS: QuickAddOption[] = [
  { type: 'date', label: 'Date', icon: <DateRange fontSize="small" /> },
  { type: 'number', label: 'Number', icon: <Numbers fontSize="small" /> },
  { type: 'email', label: 'Email', icon: <Email fontSize="small" /> },
  { type: 'url', label: 'URL', icon: <LinkIcon fontSize="small" /> },
  { type: 'file', label: 'File Upload', icon: <AttachFile fontSize="small" /> },
  { type: 'boolean', label: 'Toggle', icon: <ToggleOn fontSize="small" /> },
  { type: 'color', label: 'Color Picker', icon: <Palette fontSize="small" /> },
];

interface FloatingActionToolbarProps {
  onAddField: (type: string, layout?: boolean) => void;
  onOpenAddDialog?: () => void;
}

export function FloatingActionToolbar({
  onAddField,
  onOpenAddDialog,
}: FloatingActionToolbarProps) {
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

  const handleQuickAdd = (option: QuickAddOption) => {
    onAddField(option.type, option.layout);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1,
        px: 0.5,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        zIndex: 10,
        gap: 0.5,
      }}
    >
      {/* Main Add Button - Opens full dialog */}
      <Tooltip title="Add question" placement="left">
        <IconButton
          onClick={onOpenAddDialog}
          sx={{
            bgcolor: '#00ED64',
            color: '#001E2B',
            '&:hover': {
              bgcolor: '#00CC55',
            },
          }}
        >
          <Add />
        </IconButton>
      </Tooltip>

      <Divider sx={{ width: '80%', my: 0.5 }} />

      {/* Quick Add Options */}
      {QUICK_OPTIONS.map((option) => (
        <Tooltip key={option.type} title={option.label} placement="left">
          <IconButton
            onClick={() => handleQuickAdd(option)}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: '#00ED64',
                bgcolor: alpha('#00ED64', 0.08),
              },
            }}
          >
            {option.icon}
          </IconButton>
        </Tooltip>
      ))}

      <Divider sx={{ width: '80%', my: 0.5 }} />

      {/* Layout Options */}
      {LAYOUT_OPTIONS.map((option) => (
        <Tooltip key={option.type} title={option.label} placement="left">
          <IconButton
            onClick={() => handleQuickAdd(option)}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: '#9c27b0',
                bgcolor: alpha('#9c27b0', 0.08),
              },
            }}
          >
            {option.icon}
          </IconButton>
        </Tooltip>
      ))}

      <Divider sx={{ width: '80%', my: 0.5 }} />

      {/* More Options Menu */}
      <Tooltip title="More field types" placement="left">
        <IconButton
          onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              bgcolor: alpha('#000', 0.04),
            },
          }}
        >
          <ViewAgenda fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={() => setMoreMenuAnchor(null)}
        anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
        transformOrigin={{ vertical: 'center', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { minWidth: 180 } }
        }}
      >
        {MORE_OPTIONS.map((option) => (
          <MenuItem
            key={option.type}
            onClick={() => {
              handleQuickAdd(option);
              setMoreMenuAnchor(null);
            }}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              {option.icon}
            </ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
