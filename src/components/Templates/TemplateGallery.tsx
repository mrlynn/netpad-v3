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
import { loadFormTemplatesByCategory, type FormTemplate } from '@/lib/templates/loader';
import { TemplateCard } from './TemplateCard';
import { CategoryFilter } from './CategoryFilter';
import { TemplatePreview } from './TemplatePreview';

interface TemplateGalleryProps {
  selectedCategory?: string;
  onTemplateSelect: (template: FormTemplate) => void;
  onTemplateCustomize?: (template: FormTemplate) => void;
  variant?: 'compact' | 'default';
  showSearch?: boolean;
}

export function TemplateGallery({
  selectedCategory: initialCategory = 'all',
  onTemplateSelect,
  onTemplateCustomize,
  variant = 'default',
  showSearch = true,
}: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);

  // Load templates by category
  const templates = loadFormTemplatesByCategory(selectedCategory);

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const handleTemplateClick = (template: FormTemplate) => {
    setPreviewTemplate(template);
  };

  const handleUseTemplate = (template: FormTemplate) => {
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
        <CategoryFilter
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
              <TemplateCard
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
      <TemplatePreview
        open={!!previewTemplate}
        template={previewTemplate}
        onClose={handleClosePreview}
        onUseTemplate={handleUseTemplate}
        onCustomize={onTemplateCustomize}
      />
    </Box>
  );
}
