/**
 * Marketplace View Component
 *
 * Main marketplace page showing available applications.
 * Includes search, filtering, and application grid.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Alert,
  Pagination,
  Stack,
  alpha,
  Tabs,
  Tab,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Apps as AppsIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  HourglassTop as HourglassTopIcon,
  Description as FormIcon,
  AccountTree as WorkflowIcon,
  Inventory as BundleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Extension as ExtensionIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationSafe } from '@/contexts/ApplicationContext';
import { usePathname, useRouter } from 'next/navigation';
import { parseOrgProjectFromPath } from '@/lib/routing';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationDetailDialog } from './ApplicationDetailDialog';
import { MyApplicationsView } from './MyApplicationsView';
import { FeaturedMarketplaceSection } from './FeaturedMarketplaceSection';
import { ImportDestinationDialog } from './ImportDestinationDialog';
import { SubmitToMarketplaceDialog } from './SubmitToMarketplaceDialog';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import { Button } from '@mui/material';
import { useInstalledApplications } from '@/hooks/useInstalledApplications';

/** Item type discriminator for marketplace items */
export type MarketplaceItemType = 'application' | 'form' | 'workflow' | 'extension';

interface MarketplaceApplication {
  id: string;
  /** Item type: application (bundle), form (standalone), or workflow (standalone) */
  itemType: MarketplaceItemType;
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
  // Application-specific fields
  formsCount?: number;
  workflowsCount?: number;
  connectionsCount?: number;
  // Form-specific fields
  fieldCount?: number;
  formType?: 'traditional' | 'conversational' | 'search';
  isMultiPage?: boolean;
  hasConditionalLogic?: boolean;
  // Workflow-specific fields
  nodeCount?: number;
  triggerType?: string;
  nodeTypes?: string[];
  // Extension-specific fields
  extensionType?: 'node' | 'integration' | 'theme' | 'hook' | 'multi';
  nodeCategories?: string[];
  routeCount?: number;
  npmPackage?: string;
  minNetPadVersion?: string;
  verified?: boolean;
  // Common fields
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

// Section configuration for grouped display
const SECTION_CONFIG = {
  application: {
    title: 'Applications',
    subtitle: 'Complete solutions with forms, workflows, and connections',
    icon: BundleIcon,
    color: '#00ED64',
    gradientStart: '#00ED64',
    gradientEnd: '#00D4AA',
  },
  form: {
    title: 'Forms',
    subtitle: 'Standalone form templates ready to use',
    icon: FormIcon,
    color: '#58a6ff',
    gradientStart: '#58a6ff',
    gradientEnd: '#388bfd',
  },
  workflow: {
    title: 'Workflows',
    subtitle: 'Automation workflows and integrations',
    icon: WorkflowIcon,
    color: '#d29922',
    gradientStart: '#d29922',
    gradientEnd: '#f1a43c',
  },
  extension: {
    title: 'Extensions',
    subtitle: 'Custom workflow nodes, integrations, and plugins',
    icon: ExtensionIcon,
    color: '#a855f7',
    gradientStart: '#a855f7',
    gradientEnd: '#7c3aed',
  },
} as const;

export function MarketplaceView({ organizationId: propOrganizationId, onImportComplete }: MarketplaceViewProps) {
  const { currentOrgId } = useOrganization();
  const { user, isAuthenticated } = useAuth();
  const applicationContext = useApplicationSafe();
  const router = useRouter();

  // Check if user is on the waitlist
  const isWaitlistUser = isAuthenticated && user?.waitlistStatus === 'pending';
  const pathname = usePathname();
  // Use prop orgId if provided, otherwise use context (for imports)
  const organizationId = propOrganizationId || currentOrgId || undefined;
  // Get projectId from URL if available, or from current application context
  const { projectId: urlProjectId } = parseOrgProjectFromPath(pathname);
  const projectId = urlProjectId || applicationContext?.currentProjectId || undefined;
  
  const [activeTab, setActiveTab] = useState(0);
  const [applications, setApplications] = useState<MarketplaceApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState<'all' | 'official' | 'community'>('all');
  const [itemType, setItemType] = useState<'all' | MarketplaceItemType>('all'); // Item type filter
  const [source, setSource] = useState<'all' | 'web' | 'npm'>('all'); // Source filter
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  // Track collapsed sections (all expanded by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  // Import destination dialog state
  const [importDestinationOpen, setImportDestinationOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    id: string;
    name: string;
    itemType: MarketplaceItemType;
  } | null>(null);
  // Submit to marketplace dialog state
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const limit = 50; // Increase limit when showing grouped view to get all types

  // Toggle section collapse
  const toggleSection = (sectionType: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionType]: !prev[sectionType],
    }));
  };

  // Group applications by item type for grouped display
  const groupedApplications = applications.reduce((acc, app) => {
    const type = app.itemType || 'application';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(app);
    return acc;
  }, {} as Record<MarketplaceItemType, MarketplaceApplication[]>);

  // Extract featured (official) items for hero section - only show when viewing "All" with no search
  const featuredItems = useMemo(() => {
    if (itemType !== 'all' || search) return [];
    return applications.filter(app => app.isOfficial).slice(0, 6);
  }, [applications, itemType, search]);

  // Get IDs of featured items to exclude from main grid
  const featuredItemIds = useMemo(() => {
    return new Set(featuredItems.map(item => item.id));
  }, [featuredItems]);

  // Filter out featured items from grouped applications
  const groupedApplicationsWithoutFeatured = useMemo(() => {
    if (featuredItems.length === 0) return groupedApplications;

    const filtered: Record<MarketplaceItemType, MarketplaceApplication[]> = {} as any;
    for (const [type, items] of Object.entries(groupedApplications)) {
      filtered[type as MarketplaceItemType] = items.filter(app => !featuredItemIds.has(app.id));
    }
    return filtered;
  }, [groupedApplications, featuredItemIds, featuredItems.length]);

  // Fetch installed applications to check import status
  const { installations, mutate: mutateInstallations } = useInstalledApplications({
    orgId: organizationId || '',
    projectId: projectId,
  });

  // Create a Set of imported marketplace application IDs for quick lookup
  const importedAppIds = new Set(
    installations.map(inst => inst.marketplaceApplicationId)
  );

  useEffect(() => {
    console.log('[MarketplaceView] useEffect triggered:', { search, category, type, itemType, source, sort, page });
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, type, itemType, source, sort, page]);

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

      if (itemType !== 'all') {
        params.append('itemType', itemType);
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
    if (!isAuthenticated) {
      alert('Please sign in to import applications from the marketplace.');
      return;
    }

    if (isWaitlistUser) {
      alert('Your account is pending approval. You\'ll be able to import applications once your access is approved.');
      return;
    }

    if (!organizationId) {
      alert('Unable to import: No organization found. Please contact support if this persists.');
      return;
    }

    // Find the item to check its type
    const item = applications.find(app => app.id === id);
    const itemType = item?.itemType || 'application';

    // For standalone forms and workflows, show the destination dialog
    if (itemType === 'form' || itemType === 'workflow') {
      setPendingImport({
        id,
        name: item?.name || 'Item',
        itemType,
      });
      setImportDestinationOpen(true);
      return;
    }

    // For full applications, import directly (they create their own app)
    await executeImport(id);
  };

  // Execute the actual import with optional target application
  const executeImport = async (id: string, targetApplicationId?: string) => {
    try {
      const encodedId = encodeURIComponent(id);
      const response = await fetch(`/api/marketplace/applications/${encodedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organizationId,
          // projectId is optional - API will use default project if not provided
          projectId: projectId || undefined,
          // Pass target application ID if importing into existing app
          targetApplicationId,
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

      // Refresh the application context so the new app appears in the switcher
      if (applicationContext?.refreshApplications) {
        await applicationContext.refreshApplications();
      }

      // Refresh installed applications to update the "Imported" status
      mutateInstallations();

      // Navigate to the newly imported application
      if (result.application?.appSlug) {
        router.push(`/apps/${result.application.appSlug}`);
      } else {
        // Fallback: show success message if we can't navigate
        alert(`Successfully imported ${result.application?.name || 'item'}! Check your application switcher to find it.`);
      }
    } catch (err) {
      console.error('Error importing application:', err);
      alert(err instanceof Error ? err.message : 'Failed to import application');
    }
  };

  // Handle import destination selection
  const handleImportDestinationConfirm = async (
    destination: { type: 'new' } | { type: 'existing'; applicationId: string; applicationName: string }
  ) => {
    setImportDestinationOpen(false);

    if (!pendingImport) return;

    if (destination.type === 'new') {
      // Create new application (existing behavior)
      await executeImport(pendingImport.id);
    } else {
      // Import into existing application
      await executeImport(pendingImport.id, destination.applicationId);
    }

    setPendingImport(null);
  };

  const handleDownload = async (id: string) => {
    try {
      const encodedId = encodeURIComponent(id);
      const response = await fetch(`/api/marketplace/applications/${encodedId}?download=true`);
      
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
      alert('Please sign in to install packages from npm.');
      return;
    }

    try {
      const response = await fetch('/api/marketplace/npm/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName,
          orgId: organizationId,
          // projectId is optional - API will use default project if not provided
          projectId: projectId || undefined,
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

      // Refresh the application context so the new app appears in the switcher
      if (applicationContext?.refreshApplications) {
        await applicationContext.refreshApplications();
      }

      // Navigate to the newly installed application
      if (result.appSlug) {
        router.push(`/apps/${result.appSlug}`);
      } else {
        // Fallback: show success message if we can't navigate
        alert(`Successfully installed ${packageName}@${result.version}! Check your application switcher to find it.`);
      }
    } catch (err) {
      console.error('Error installing package:', err);
      alert(err instanceof Error ? err.message : 'Failed to install package');
    }
  };

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
                Browse the marketplace while you wait for access. You'll be able to import applications once your account is approved.
              </Typography>
            </Box>
          </Box>
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AppsIcon sx={{ fontSize: 40, color: '#00ED64' }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Marketplace
            </Typography>
          </Box>
          {user && !isWaitlistUser && (
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setSubmitDialogOpen(true)}
              sx={{
                bgcolor: '#00ED64',
                color: '#001E2B',
                '&:hover': { bgcolor: '#00CC55' },
              }}
            >
              Submit
            </Button>
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Discover and import ready-to-use applications, forms, and workflows
        </Typography>

        {/* Item Type Filter - Primary Filter */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Item Type:
          </Typography>
          <Chip
            icon={<AppsIcon fontSize="small" />}
            label="All"
            size="small"
            onClick={() => { setItemType('all'); setPage(1); }}
            color={itemType === 'all' ? 'primary' : 'default'}
            variant={itemType === 'all' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            icon={<BundleIcon fontSize="small" />}
            label="Applications"
            size="small"
            onClick={() => { setItemType('application'); setPage(1); }}
            color={itemType === 'application' ? 'primary' : 'default'}
            variant={itemType === 'application' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            icon={<FormIcon fontSize="small" />}
            label="Forms"
            size="small"
            onClick={() => { setItemType('form'); setPage(1); }}
            color={itemType === 'form' ? 'primary' : 'default'}
            variant={itemType === 'form' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            icon={<WorkflowIcon fontSize="small" />}
            label="Workflows"
            size="small"
            onClick={() => { setItemType('workflow'); setPage(1); }}
            color={itemType === 'workflow' ? 'primary' : 'default'}
            variant={itemType === 'workflow' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            icon={<ExtensionIcon fontSize="small" />}
            label="Extensions"
            size="small"
            onClick={() => { setItemType('extension'); setPage(1); }}
            color={itemType === 'extension' ? 'primary' : 'default'}
            variant={itemType === 'extension' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
        </Box>

        {/* Source Filter */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Source:
          </Typography>
          <Chip
            label="All Sources"
            size="small"
            onClick={() => { setSource('all'); setPage(1); }}
            color={source === 'all' ? 'secondary' : 'default'}
            variant={source === 'all' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="Web Marketplace"
            size="small"
            onClick={() => { setSource('web'); setPage(1); }}
            color={source === 'web' ? 'secondary' : 'default'}
            variant={source === 'web' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="npm Packages"
            size="small"
            onClick={() => { setSource('npm'); setPage(1); }}
            color={source === 'npm' ? 'secondary' : 'default'}
            variant={source === 'npm' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      </Box>

      {/* Tabs - hide My Applications for waitlist users */}
      {user && !isWaitlistUser && (
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
          <NetPadLoader size="large" variant="ascii" message="Loading marketplace..." />
        </Box>
      ) : applications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          {search || category !== 'all' ? (
            <>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No applications found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filters
              </Typography>
            </>
          ) : (
            <>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  bgcolor: 'rgba(0, 237, 100, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Typography sx={{ fontSize: 32 }}>🛒</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                Discover Ready-to-Use Solutions
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}>
                The Marketplace is where you can find applications built by the community.
                Install them in seconds and customize to your needs.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                {[
                  { icon: '📋', label: 'Pre-built forms' },
                  { icon: '🔄', label: 'Ready workflows' },
                  { icon: '⚡', label: 'Quick setup' },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: 'rgba(0, 237, 100, 0.08)',
                      border: '1px solid rgba(0, 237, 100, 0.2)',
                    }}
                  >
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{item.icon}</span> {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
                New applications are added regularly. Check back soon!
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <>
          {/* Featured Section - Show at top when viewing "All" with no search */}
          {featuredItems.length > 0 && (
            <FeaturedMarketplaceSection
              items={featuredItems}
              onView={handleView}
              onImport={handleImport}
              importedAppIds={importedAppIds}
              onViewAllOfficial={() => {
                setType('official');
                setPage(1);
              }}
            />
          )}

          {/* Grouped Sections (when "All" is selected) or Flat Grid (when filtered) */}
          {itemType === 'all' ? (
            // Grouped display with section headers
            <Box sx={{ mb: 4 }}>
              {(['application', 'form', 'workflow', 'extension'] as MarketplaceItemType[]).map((sectionType) => {
                const items = groupedApplicationsWithoutFeatured[sectionType] || [];
                if (items.length === 0) return null;

                const config = SECTION_CONFIG[sectionType];
                const SectionIcon = config.icon;
                const isCollapsed = collapsedSections[sectionType];

                return (
                  <Box key={sectionType} sx={{ mb: 4 }}>
                    {/* Section Header */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                        pb: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          '& .section-title': {
                            color: config.color,
                          },
                        },
                      }}
                      onClick={() => toggleSection(sectionType)}
                    >
                      {/* Icon with gradient background */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(135deg, ${config.gradientStart} 0%, ${config.gradientEnd} 100%)`,
                          boxShadow: `0 4px 12px ${alpha(config.color, 0.3)}`,
                        }}
                      >
                        <SectionIcon sx={{ color: 'white', fontSize: 22 }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="h6"
                            className="section-title"
                            sx={{
                              fontWeight: 600,
                              transition: 'color 0.2s ease',
                            }}
                          >
                            {config.title}
                          </Typography>
                          <Chip
                            label={items.length}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              bgcolor: alpha(config.color, 0.1),
                              color: config.color,
                              border: `1px solid ${alpha(config.color, 0.3)}`,
                            }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {config.subtitle}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            color: config.color,
                            bgcolor: alpha(config.color, 0.08),
                          },
                        }}
                      >
                        {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                      </IconButton>
                    </Box>

                    {/* Section Content */}
                    <Collapse in={!isCollapsed}>
                      <Grid container spacing={3}>
                        {items.map((app) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={app.id}>
                            <ApplicationCard
                              application={app}
                              onView={handleView}
                              onImport={handleImport}
                              onDownload={handleDownload}
                              onInstallFromNpm={handleInstallFromNpm}
                              isImported={importedAppIds.has(app.id)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          ) : (
            // Flat grid display (when specific type is filtered)
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {applications.map((app) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={app.id}>
                  <ApplicationCard
                    application={app}
                    onView={handleView}
                    onImport={handleImport}
                    onDownload={handleDownload}
                    onInstallFromNpm={handleInstallFromNpm}
                    isImported={importedAppIds.has(app.id)}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Pagination - only show for filtered view */}
          {itemType !== 'all' && total > limit && (
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

      {/* Import Destination Dialog - for standalone forms/workflows */}
      {pendingImport && organizationId && (
        <ImportDestinationDialog
          open={importDestinationOpen}
          onClose={() => {
            setImportDestinationOpen(false);
            setPendingImport(null);
          }}
          onConfirm={handleImportDestinationConfirm}
          itemName={pendingImport.name}
          itemType={pendingImport.itemType}
          organizationId={organizationId}
          projectId={projectId}
        />
      )}

      {/* Submit to Marketplace Dialog */}
      <SubmitToMarketplaceDialog
        open={submitDialogOpen}
        onClose={() => setSubmitDialogOpen(false)}
        onSuccess={() => {
          setSubmitDialogOpen(false);
          // Refresh the list
          loadApplications();
        }}
      />
        </>
      )}
    </Container>
  );
}
