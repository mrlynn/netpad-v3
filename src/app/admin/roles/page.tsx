'use client';

/**
 * Platform Admin - Roles Management
 * 
 * View all roles (built-in and custom) across all organizations.
 */

import { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Alert,
  Chip,
  Skeleton,
  InputAdornment,
  Tooltip,
  TablePagination,
  Breadcrumbs,
  Link as MuiLink,
  IconButton,
  Badge,
  Tabs,
  Tab,
  alpha,
  useTheme,
} from '@mui/material';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';
import useSWR from 'swr';

interface Role {
  roleId: string;
  name: string;
  slug?: string;
  description?: string;
  type: 'builtin' | 'custom';
  baseRole?: string;
  permissions?: string[];
  organizationId?: string;
  organizationName?: string;
  createdAt?: string;
}

interface Organization {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const BUILTIN_ROLE_INFO: Record<string, { description: string; color: 'error' | 'warning' | 'success' | 'info' }> = {
  owner: { description: 'Full control over the organization', color: 'error' },
  admin: { description: 'Manage members, forms, and settings', color: 'warning' },
  member: { description: 'Create and manage own forms', color: 'success' },
  viewer: { description: 'View-only access', color: 'info' },
};

export default function AdminRolesPage() {
  const theme = useTheme();

  // State
  const [tabValue, setTabValue] = useState(0); // 0 = all, 1 = builtin, 2 = custom
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Build API URL with filters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedOrg) params.set('orgId', selectedOrg);
    if (tabValue === 1) params.set('type', 'builtin');
    if (tabValue === 2) params.set('type', 'custom');
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());
    return `/api/admin/roles?${params.toString()}`;
  }, [searchQuery, selectedOrg, tabValue, page, rowsPerPage]);

  // Fetch roles
  const { data, error, isLoading } = useSWR(buildUrl(), fetcher, {
    refreshInterval: 30000,
  });

  // Fetch organizations for filter
  const { data: orgsData } = useSWR('/api/admin/organizations', fetcher);

  // Handle different response shapes based on type filter
  const builtinRoles: Role[] = data?.builtinRoles || data?.roles || [];
  const customRoles: Role[] = data?.customRoles || (tabValue === 2 ? data?.roles : []) || [];
  const allRoles: Role[] = tabValue === 0 
    ? [...builtinRoles, ...customRoles]
    : tabValue === 1 
      ? builtinRoles 
      : customRoles;
  const total = data?.total || allRoles.length;
  const organizations: Organization[] = orgsData?.organizations || [];

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
  };

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load roles: {error.message}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink component={Link} href="/admin" color="inherit" underline="hover">
          Admin
        </MuiLink>
        <Typography color="text.primary">Roles</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton component={Link} href="/admin">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Roles & Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View built-in and custom roles across organizations
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label="All Roles" 
            icon={<SecurityIcon fontSize="small" />} 
            iconPosition="start"
          />
          <Tab 
            label="Built-in" 
            icon={<LockIcon fontSize="small" />} 
            iconPosition="start"
          />
          <Tab 
            label="Custom" 
            icon={<ShieldIcon fontSize="small" />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Filters (only for custom roles) */}
      {tabValue !== 1 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search roles..."
              size="small"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Organization</InputLabel>
              <Select
                value={selectedOrg}
                label="Organization"
                onChange={(e) => {
                  setSelectedOrg(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Organizations</MenuItem>
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>
      )}

      {/* Built-in Roles Info (when on builtin tab) */}
      {tabValue === 1 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Built-in roles are available to all organizations and cannot be modified.
        </Alert>
      )}

      {/* Roles Table */}
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Type</TableCell>
              {tabValue !== 1 && <TableCell>Organization</TableCell>}
              <TableCell>Description</TableCell>
              <TableCell>Permissions</TableCell>
              {tabValue !== 1 && <TableCell>Created</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  {tabValue !== 1 && <TableCell><Skeleton variant="text" width={100} /></TableCell>}
                  <TableCell><Skeleton variant="text" width={200} /></TableCell>
                  <TableCell><Skeleton variant="text" width={60} /></TableCell>
                  {tabValue !== 1 && <TableCell><Skeleton variant="text" width={80} /></TableCell>}
                </TableRow>
              ))
            ) : allRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tabValue === 1 ? 4 : 6} align="center" sx={{ py: 6 }}>
                  <SecurityIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    {searchQuery || selectedOrg ? 'No roles match your filters' : 'No custom roles found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              allRoles.map((role) => {
                const builtinInfo = BUILTIN_ROLE_INFO[role.roleId];
                const isBuiltin = role.type === 'builtin';

                return (
                  <TableRow key={`${role.roleId}-${role.organizationId || 'global'}`} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isBuiltin ? (
                          <Chip
                            label={role.name || role.roleId}
                            size="small"
                            color={builtinInfo?.color || 'default'}
                            sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                          />
                        ) : (
                          <Typography variant="body2" fontWeight={500}>
                            {role.name}
                          </Typography>
                        )}
                        {isBuiltin && (
                          <Tooltip title="Built-in role">
                            <LockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isBuiltin ? 'Built-in' : 'Custom'}
                        size="small"
                        variant="outlined"
                        color={isBuiltin ? 'default' : 'primary'}
                      />
                    </TableCell>
                    {tabValue !== 1 && (
                      <TableCell>
                        {role.organizationName ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Tooltip title={`Org ID: ${role.organizationId}`}>
                              <Typography variant="body2">{role.organizationName}</Typography>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            All Orgs
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {builtinInfo?.description || role.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {role.permissions ? (
                        <Badge badgeContent={role.permissions.length} color="primary">
                          <Typography variant="body2">permissions</Typography>
                        </Badge>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          {isBuiltin ? 'Varies' : '—'}
                        </Typography>
                      )}
                    </TableCell>
                    {tabValue !== 1 && (
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {role.createdAt
                            ? new Date(role.createdAt).toLocaleDateString()
                            : '—'}
                        </Typography>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {tabValue !== 1 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </TableContainer>
    </Container>
  );
}
