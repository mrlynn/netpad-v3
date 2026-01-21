/**
 * Templates Gallery View
 *
 * Public gallery showing all 100+ form templates organized by category.
 * Features search, filtering, and template preview/selection.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  alpha,
  Paper,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Lock as LockIcon,
  Star as StarIcon,
  HourglassTop as HourglassTopIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import {
  loadGalleryTemplates,
  loadGalleryTemplatesByCategory,
  loadFeaturedGalleryTemplates,
  searchGalleryTemplates,
  getGalleryTemplateCounts,
} from '@/lib/templates/loader';
import {
  TEMPLATE_CATEGORIES,
  FormTemplate,
  FormTemplateCategory,
  getCategoryMeta,
  formatComplexity,
  formatFormType,
} from '@/types/formTemplate';
import { TemplateIcon } from './TemplateIcon';
import { TemplateCard } from './TemplateCard';

interface TemplatesViewProps {
  onUseTemplate?: (template: FormTemplate) => void;
}

const COMPLEXITY_OPTIONS = [
  { value: 'all', label: 'All Complexity' },
  { value: 'simple', label: 'Simple' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'advanced', label: 'Advanced' },
];

const FORM_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'traditional', label: 'Traditional Form' },
  { value: 'conversational', label: 'AI Conversational' },
  { value: 'hybrid', label: 'Both' },
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured First' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'time', label: 'Completion Time' },
];

export function TemplatesView({ onUseTemplate }: TemplatesViewProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Check if user is on the waitlist
  const isWaitlistUser = isAuthenticated && user?.waitlistStatus === 'pending';

  // State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [complexity, setComplexity] = useState('all');
  const [formType, setFormType] = useState('all');
  const [sort, setSort] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Removed dialog state - now using dedicated detail pages

  // Get template counts by category
  const templateCounts = useMemo(() => getGalleryTemplateCounts(), []);

  // Load and filter templates
  const templates = useMemo(() => {
    let result: FormTemplate[];

    // Start with category filter
    if (selectedCategory === 'all') {
      result = loadGalleryTemplates();
    } else {
      result = loadGalleryTemplatesByCategory(selectedCategory);
    }

    // Apply search
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.shortDescription.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply complexity filter
    if (complexity !== 'all') {
      result = result.filter((t) => t.complexity === complexity);
    }

    // Apply form type filter
    if (formType !== 'all') {
      result = result.filter((t) => t.formType === formType);
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'featured':
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return a.displayOrder - b.displayOrder;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'complexity':
          const complexityOrder = { simple: 0, moderate: 1, advanced: 2 };
          return complexityOrder[a.complexity] - complexityOrder[b.complexity];
        case 'time':
          return a.estimatedTime - b.estimatedTime;
        default:
          return 0;
      }
    });

    return result;
  }, [selectedCategory, search, complexity, formType, sort]);

  // Featured templates
  const featuredTemplates = useMemo(() => loadFeaturedGalleryTemplates(6), []);

  // Navigate to template detail page
  const handleViewDetails = useCallback((template: FormTemplate) => {
    router.push(`/templates/${template.id}`);
  }, [router]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Waitlist Banner */}
      {isWaitlistUser && (
        <Alert
          severity="info"
          icon={<HourglassTopIcon sx={{ color: '#ff9800' }} />}
          sx={{
            mb: 3,
            bgcolor: alpha('#ff9800', 0.1),
            border: '1px solid',
            borderColor: alpha('#ff9800', 0.3),
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, color: '#ff9800' }}>
                You're on the Waitlist
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse our templates while you wait for access. You'll be able to use these templates once your account is approved.
              </Typography>
            </Box>
          </Box>
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 2,
            background: 'linear-gradient(135deg, #00ED64 0%, #00CC55 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Form Templates
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Start with a professionally designed template and customize it to your needs.
          Over 100 templates across 15 industries.
        </Typography>
      </Box>

      {/* Featured Section (only show when no filters) */}
      {selectedCategory === 'all' && !search && complexity === 'all' && formType === 'all' && (
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <StarIcon sx={{ color: '#fbbf24' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Featured Templates
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {featuredTemplates.map((template) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={template.id}>
                <TemplateCardCompact template={template} onClick={() => handleViewDetails(template)} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Category Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 1,
          bgcolor: 'background.default',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
          }}
        >
          <Chip
            label={`All (${loadGalleryTemplates().length})`}
            onClick={() => setSelectedCategory('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            sx={{
              fontWeight: selectedCategory === 'all' ? 600 : 400,
              bgcolor: selectedCategory === 'all' ? 'rgba(0, 237, 100, 0.15)' : undefined,
              color: selectedCategory === 'all' ? '#00ED64' : undefined,
              '&:hover': {
                bgcolor: selectedCategory === 'all' ? 'rgba(0, 237, 100, 0.2)' : undefined,
              },
            }}
          />
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Chip
              key={cat.id}
              label={`${cat.name} (${templateCounts[cat.id] || 0})`}
              onClick={() => setSelectedCategory(cat.id)}
              color={selectedCategory === cat.id ? 'primary' : 'default'}
              sx={{
                fontWeight: selectedCategory === cat.id ? 600 : 400,
                bgcolor: selectedCategory === cat.id ? 'rgba(0, 237, 100, 0.15)' : undefined,
                color: selectedCategory === cat.id ? '#00ED64' : undefined,
                '&:hover': {
                  bgcolor: selectedCategory === cat.id ? 'rgba(0, 237, 100, 0.2)' : undefined,
                },
                flexShrink: 0,
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Filters & Search */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Complexity</InputLabel>
          <Select
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
            label="Complexity"
          >
            {COMPLEXITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Form Type</InputLabel>
          <Select
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            label="Form Type"
          >
            {FORM_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} label="Sort By">
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Grid View">
            <IconButton
              onClick={() => setViewMode('grid')}
              sx={{
                bgcolor: viewMode === 'grid' ? 'rgba(0, 237, 100, 0.1)' : undefined,
                color: viewMode === 'grid' ? '#00ED64' : 'text.secondary',
              }}
            >
              <GridIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="List View">
            <IconButton
              onClick={() => setViewMode('list')}
              sx={{
                bgcolor: viewMode === 'list' ? 'rgba(0, 237, 100, 0.1)' : undefined,
                color: viewMode === 'list' ? '#00ED64' : 'text.secondary',
              }}
            >
              <ListIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {templates.length} template{templates.length !== 1 ? 's' : ''}
        {selectedCategory !== 'all' && ` in ${getCategoryMeta(selectedCategory as FormTemplateCategory)?.name || selectedCategory}`}
      </Typography>

      {/* Template Grid */}
      {templates.length > 0 ? (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid
              item
              xs={12}
              sm={viewMode === 'list' ? 12 : 6}
              md={viewMode === 'list' ? 12 : 4}
              lg={viewMode === 'list' ? 12 : 3}
              key={template.id}
            >
              {viewMode === 'list' ? (
                <TemplateListItem
                  template={template}
                  onClick={() => handleViewDetails(template)}
                />
              ) : (
                <TemplateCard
                  template={template}
                  onClick={() => handleViewDetails(template)}
                  variant="gallery"
                />
              )}
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filters
          </Typography>
        </Box>
      )}
    </Container>
  );
}

// ============================================
// Sub-components
// ============================================

interface TemplateListItemProps {
  template: FormTemplate;
  onClick: () => void;
}

const COMPLEXITY_COLORS: Record<string, { bg: string; text: string }> = {
  simple: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
  moderate: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
  advanced: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
};

function TemplateListItem({ template, onClick }: TemplateListItemProps) {
  const categoryMeta = getCategoryMeta(template.category);
  const complexityColor = COMPLEXITY_COLORS[template.complexity] || COMPLEXITY_COLORS.simple;

  // Check for encrypted fields
  const encryptedFieldCount = template.fieldConfigs?.filter((f: any) => f.encryption?.enabled).length || 0;
  const hasEncryptedFields = encryptedFieldCount > 0;

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: '#00ED64',
          bgcolor: 'rgba(0, 237, 100, 0.02)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: 'rgba(0, 237, 100, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TemplateIcon icon={template.icon} size={24} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {template.name}
          </Typography>
          {template.isFeatured && (
            <Chip
              label="Featured"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.6rem',
                bgcolor: 'rgba(251, 191, 36, 0.15)',
                color: '#fbbf24',
              }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" noWrap>
          {template.shortDescription}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Chip
          label={categoryMeta?.name || template.category}
          size="small"
          sx={{ height: 24, fontSize: '0.7rem' }}
        />
        <Chip
          label={formatComplexity(template.complexity)}
          size="small"
          sx={{
            height: 24,
            fontSize: '0.7rem',
            bgcolor: complexityColor.bg,
            color: complexityColor.text,
          }}
        />
        {hasEncryptedFields && (
          <Chip
            icon={<LockIcon sx={{ fontSize: 12 }} />}
            label="Secure"
            size="small"
            sx={{
              height: 24,
              fontSize: '0.7rem',
              bgcolor: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              fontWeight: 600,
              '& .MuiChip-icon': { color: '#22c55e', ml: 0.5 },
            }}
          />
        )}
      </Stack>
      <Chip
        label="View"
        clickable
        sx={{
          bgcolor: 'rgba(0, 237, 100, 0.1)',
          color: '#00ED64',
          fontWeight: 600,
          '&:hover': { bgcolor: 'rgba(0, 237, 100, 0.2)' },
        }}
      />
    </Paper>
  );
}

function TemplateCardCompact({ template, onClick }: { template: FormTemplate; onClick: () => void }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2,
        height: '100%',
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: '#00ED64',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <TemplateIcon icon={template.icon} size={24} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
          {template.name}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" noWrap>
        {template.shortDescription}
      </Typography>
    </Paper>
  );
}
