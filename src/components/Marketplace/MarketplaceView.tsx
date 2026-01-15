/**
 * Marketplace View Component
 *
 * Main marketplace page showing available applications.
 * Includes search, filtering, and application grid.
 */

'use client';

import { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
  Pagination,
  Stack,
  alpha,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Apps as AppsIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { parseOrgProjectFromPath } from '@/lib/routing';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationDetailDialog } from './ApplicationDetailDialog';
import { MyApplicationsView } from './MyApplicationsView';

interface MarketplaceApplication {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  version: string;
  category: string;
  tags?: string[];
  icon?: string;
  author?: { name: string; email?: string; url?: string };
  license?: string;
  stats: {
    downloads: number;
    rating?: number;
    reviews: number;
  };
  formsCount: number;
  workflowsCount: number;
  connectionsCount: number;
  publishedAt?: string;
  isOfficial?: boolean;
  source?: 'web' | 'npm'; // Package source
  sourcePackageName?: string; // For npm packages
}

interface MarketplaceViewProps {
  organizationId?: string; // Optional - only needed for imports
  onImportComplete?: () => void;
}

const CATEGORIES = [
  'all',
  'helpdesk',
  'onboarding',
  'survey',
  'ecommerce',
  'healthcare',
  'finance',
  'education',
  'realestate',
  'business',
  'events',
  'support',
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'rating-low', label: 'Lowest Rated' },
  { value: 'reviews', label: 'Most Reviewed' },
];

export function MarketplaceView({ organizationId: propOrganizationId, onImportComplete }: MarketplaceViewProps) {
  const { currentOrgId } = useOrganization();
  const { user } = useAuth();
  const pathname = usePathname();
  // Use prop orgId if provided, otherwise use context (for imports)
  const organizationId = propOrganizationId || currentOrgId || undefined;
  // Get projectId from URL if available
  const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
  const projectId = urlProjectId || undefined;
  
  const [activeTab, setActiveTab] = useState(0);
  const [applications, setApplications] = useState<MarketplaceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState<'all' | 'official' | 'community'>('all');
  const [source, setSource] = useState<'all' | 'web' | 'npm'>('all'); // Source filter
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const limit = 12;

  useEffect(() => {
    console.log('[MarketplaceView] useEffect triggered:', { search, category, type, source, sort, page });
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, type, source, sort, page]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        sort,
      });

      if (search) {
        params.append('search', search);
      }

      if (category !== 'all') {
        params.append('category', category);
      }

      if (type !== 'all') {
        params.append('isOfficial', type === 'official' ? 'true' : 'false');
      }

      if (source !== 'all') {
        params.append('source', source);
      }

      if (minRating !== null && minRating > 0) {
        params.append('minRating', minRating.toString());
      }

      const url = `/api/marketplace/applications?${params.toString()}`;
      console.log('[MarketplaceView] Fetching:', url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MarketplaceView] API error:', response.status, errorText);
        throw new Error(`Failed to load applications: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('[MarketplaceView] Received data:', {
        applicationsCount: data.applications?.length || 0,
        total: data.total,
        applications: data.applications,
      });
      
      setApplications(data.applications || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('[MarketplaceView] Error loading applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: string) => {
    setSelectedApp(id);
    setDetailDialogOpen(true);
  };

  const handleImport = async (id: string) => {
    if (!organizationId) {
      alert('Please select an organization to import the application.');
      return;
    }

    try {
      const response = await fetch(`/api/marketplace/applications/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organizationId,
          options: {
            generateNewIds: true,
            preserveSlugs: false,
            overwriteExisting: false,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const result = await response.json();
      
      if (onImportComplete) {
        onImportComplete();
      }

      // Show success (could use a snackbar)
      alert(`Successfully imported ${result.application.name}!`);
    } catch (err) {
      console.error('Error importing application:', err);
      alert(err instanceof Error ? err.message : 'Failed to import application');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/marketplace/applications/${id}?download=true`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}-bundle.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading application:', err);
      alert('Failed to download application');
    }
  };

  const handleInstallFromNpm = async (packageName: string) => {
    if (!organizationId) {
      alert('Please select an organization to install the package.');
      return;
    }

    if (!projectId) {
      alert('Please select a project to install the package.');
      return;
    }

    try {
      const response = await fetch('/api/marketplace/npm/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName,
          orgId: organizationId,
          projectId,
          overwriteExisting: false,
          installDependencies: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Installation failed');
      }

      const result = await response.json();
      
      if (onImportComplete) {
        onImportComplete();
      }

      // Show success
      alert(`Successfully installed ${packageName}@${result.version}!${result.applicationId ? `\nApplication ID: ${result.applicationId}` : ''}`);
    } catch (err) {
      console.error('Error installing package:', err);
      alert(err instanceof Error ? err.message : 'Failed to install package');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AppsIcon sx={{ fontSize: 40, color: '#00ED64' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Application Marketplace
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Discover and import ready-to-use NetPad applications with forms, workflows, and connections
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Web Marketplace"
            size="small"
            onClick={() => setSource('web')}
            color={source === 'web' ? 'primary' : 'default'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="npm Packages"
            size="small"
            onClick={() => setSource('npm')}
            color={source === 'npm' ? 'primary' : 'default'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="All Sources"
            size="small"
            onClick={() => setSource('all')}
            color={source === 'all' ? 'primary' : 'default'}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      </Box>

      {/* Tabs */}
      {user && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Browse" icon={<AppsIcon />} iconPosition="start" />
            <Tab label="My Applications" icon={<PersonIcon />} iconPosition="start" />
          </Tabs>
        </Box>
      )}

      {/* My Applications View */}
      {activeTab === 1 && user ? (
        <MyApplicationsView organizationId={organizationId} />
      ) : (
        <>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            fullWidth
            placeholder="Search applications..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              label="Category"
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'all' | 'official' | 'community');
                setPage(1);
              }}
              label="Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="official">Official</MenuItem>
              <MenuItem value="community">Community</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={source}
              onChange={(e) => {
                setSource(e.target.value as 'all' | 'web' | 'npm');
                setPage(1);
              }}
              label="Source"
            >
              <MenuItem value="all">All Sources</MenuItem>
              <MenuItem value="web">Web Marketplace</MenuItem>
              <MenuItem value="npm">npm Packages</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Min Rating</InputLabel>
            <Select
              value={minRating === null ? 'all' : minRating.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setMinRating(value === 'all' ? null : parseInt(value, 10));
                setPage(1);
              }}
              label="Min Rating"
            >
              <MenuItem value="all">All Ratings</MenuItem>
              <MenuItem value="4">4+ Stars</MenuItem>
              <MenuItem value="3">3+ Stars</MenuItem>
              <MenuItem value="2">2+ Stars</MenuItem>
              <MenuItem value="1">1+ Star</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} label="Sort By">
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#00ED64' }} />
        </Box>
      ) : applications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No applications found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {search || category !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Check back later for new applications'}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Applications Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {applications.map((app) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={app.id}>
                <ApplicationCard
                  application={app}
                  onView={handleView}
                  onImport={handleImport}
                  onDownload={handleDownload}
                  onInstallFromNpm={handleInstallFromNpm}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {total > limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={Math.ceil(total / limit)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                sx={{
                  '& .MuiPaginationItem-root.Mui-selected': {
                    bgcolor: '#00ED64',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#00CC55',
                    },
                  },
                }}
              />
            </Box>
          )}
        </>
      )}

      {/* Detail Dialog */}
      {selectedApp && (
        <ApplicationDetailDialog
          open={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedApp(null);
          }}
          applicationId={selectedApp}
          organizationId={organizationId}
          onImportComplete={onImportComplete}
        />
      )}
        </>
      )}
    </Container>
  );
}
