'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Typography,
} from '@mui/material';
import {
  Search,
} from '@mui/icons-material';
import { WorkflowTemplate } from '@/lib/templates/loader';
import { WorkflowTemplateCard } from './WorkflowTemplateCard';
import { WorkflowCategoryFilter } from './WorkflowCategoryFilter';
import { WorkflowTemplatePreview } from './WorkflowTemplatePreview';

interface WorkflowCategory {
  id: string;
  label: string;
  icon: string;
}

interface WorkflowTemplateGalleryProps {
  templates: WorkflowTemplate[];
  categories: WorkflowCategory[];
  selectedCategory?: string;
  onTemplateSelect: (template: WorkflowTemplate) => void;
  onTemplateCustomize?: (template: WorkflowTemplate) => void;
  variant?: 'compact' | 'default';
  showSearch?: boolean;
}

export function WorkflowTemplateGallery({
  templates,
  categories,
  selectedCategory: initialCategory = 'all',
  onTemplateSelect,
  onTemplateCustomize,
  variant = 'default',
  showSearch = true,
}: WorkflowTemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  // Filter templates by category
  const templatesByCategory = useMemo(() => {
    if (selectedCategory === 'all') {
      return templates;
    }
    return templates.filter(t => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templatesByCategory;

    const query = searchQuery.toLowerCase();
    return templatesByCategory.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
    );
  }, [templatesByCategory, searchQuery]);

  const handleTemplateClick = (template: WorkflowTemplate) => {
    setPreviewTemplate(template);
  };

  const handleUseTemplate = (template: WorkflowTemplate) => {
    onTemplateSelect(template);
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Search */}
      {showSearch && (
        <Box sx={{ mb: 2, flexShrink: 0, px: 2, pt: 2 }}>
          <TextField
            fullWidth
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}

      {/* Category Filter */}
      <Box sx={{ flexShrink: 0, px: 2 }}>
        <WorkflowCategoryFilter
          categories={categories}
          templates={templates}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </Box>

      {/* Template Grid */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          pt: 2,
          px: 2,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 3,
          },
        }}
      >
        {filteredTemplates.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {filteredTemplates.map((template) => (
              <WorkflowTemplateCard
                key={template.id}
                template={template}
                onClick={handleTemplateClick}
                variant={variant}
              />
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery
                ? `No templates found matching "${searchQuery}"`
                : 'No templates in this category'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Preview Dialog */}
      <WorkflowTemplatePreview
        open={!!previewTemplate}
        template={previewTemplate}
        onClose={handleClosePreview}
        onUseTemplate={handleUseTemplate}
        onCustomize={onTemplateCustomize}
      />
    </Box>
  );
}