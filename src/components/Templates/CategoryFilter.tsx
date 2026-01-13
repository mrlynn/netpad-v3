'use client';

import { Box, Chip, alpha } from '@mui/material';
import { getTemplateCategories, loadFormTemplatesByCategory } from '@/lib/templates/loader';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const categories = getTemplateCategories();

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
          ? loadFormTemplatesByCategory('all').length
          : loadFormTemplatesByCategory(cat.id).length;

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
                ? '#00ED64'
                : 'transparent',
              color: selectedCategory === cat.id
                ? '#000'
                : 'text.primary',
              border: '1px solid',
              borderColor: selectedCategory === cat.id
                ? '#00ED64'
                : 'divider',
              fontWeight: selectedCategory === cat.id ? 600 : 400,
              '&:hover': {
                bgcolor: selectedCategory === cat.id
                  ? '#00ED64'
                  : alpha('#00ED64', 0.08),
                borderColor: '#00ED64',
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
