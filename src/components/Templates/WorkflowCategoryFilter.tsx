'use client';

import { Box, Chip, alpha } from '@mui/material';

interface WorkflowCategory {
  id: string;
  label: string;
  icon: string;
}

interface WorkflowCategoryFilterProps {
  categories: WorkflowCategory[];
  templates: any[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function WorkflowCategoryFilter({
  categories,
  templates,
  selectedCategory,
  onCategoryChange,
}: WorkflowCategoryFilterProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        pb: 2,
      }}
    >
      {categories.map((cat) => {
        const count = cat.id === 'all'
          ? templates.length
          : templates.filter(t => t.category === cat.id).length;

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
            onClick={() => onCategoryChange(cat.id)}
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
              fontWeight: selectedCategory === cat.id ? 600 : 400,
              '&:hover': {
                bgcolor: selectedCategory === cat.id
                  ? '#9C27B0'
                  : alpha('#9C27B0', 0.08),
                borderColor: '#9C27B0',
              },
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        );
      })}
    </Box>
  );
}