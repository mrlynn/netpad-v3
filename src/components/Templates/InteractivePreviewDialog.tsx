/**
 * Interactive Preview Dialog Component
 *
 * Modal dialog that displays an interactive form preview with tabs for:
 * - Try Form: Interactive form fields preview
 * - Conversational: AI-powered conversational form demo
 * - Search Demo: Search through sample data
 *
 * Triggered from the "Try Template" button on template detail pages.
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  alpha,
} from '@mui/material';
import {
  Close,
  Edit as EditIcon,
  Search as SearchIcon,
  AutoAwesome,
} from '@mui/icons-material';
import { FormTemplate } from '@/types/formTemplate';
import { InteractiveTemplatePreview } from './InteractiveTemplatePreview';
import { ConversationalDemoTab } from './ConversationalDemoTab';
import { SearchDemoTab } from './SearchDemoTab';
import { TemplateIcon } from './TemplateIcon';

interface InteractivePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  template: FormTemplate;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        p: 3,
        height: '100%',
        overflow: 'auto',
      }}
    >
      {value === index && children}
    </Box>
  );
}

export function InteractivePreviewDialog({
  open,
  onClose,
  template,
}: InteractivePreviewDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 2,
          maxHeight: fullScreen ? '100%' : '90vh',
          height: fullScreen ? '100%' : '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 0,
          pt: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TemplateIcon icon={template.icon} size={28} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {template.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Explore how this template works
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              color: '#00ED64 !important',
            },
            '& .MuiTabs-indicator': {
              bgcolor: '#00ED64',
            },
          }}
        >
          <Tab
            icon={<EditIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Try Form"
            sx={{ gap: 1 }}
          />
          <Tab
            icon={<AutoAwesome sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Conversational"
            sx={{ gap: 1 }}
          />
          <Tab
            icon={<SearchIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Search Demo"
            sx={{ gap: 1 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        <TabPanel value={tabValue} index={0}>
          <InteractiveTemplatePreview template={template} maxFields={15} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ConversationalDemoTab template={template} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <SearchDemoTab template={template} />
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}

export default InteractivePreviewDialog;
