'use client';

/**
 * Platform Admin - Role Assignments Management
 * 
 * View all role assignments across all organizations.
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
  Tabs,
  Tab,
  alpha,
  useTheme,
} from '@mui/material';
import Link from 'next/link';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import useSWR from 'swr';

interface RoleAssignment {
  assignmentId: string;
  organizationId: string;
  organizationName: string;
  targetType: 'user' | 'group';
  targetId: string;
  targetName?: string;
  targetEmail?: string;
  roleType: 'builtin' | 'custom';
  roleId: string;
  roleName: string;
  scope?: {
    type: 'org' | 'project' | 'form';
    resourceId?: string;
  };
  grantedBy: string;
  grantedByName?: string;
  grantedAt: string;
}

interface Organization {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminAssignmentsPage() {
  const theme = useTheme();

  // State
  const [tabValue, setTabValue] = useState(0); // 0=all, 1=users, 2=groups
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [roleTypeFilter, setRoleTypeFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Build API URL with filters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedOrg) params.set('orgId', selectedOrg);
    if (tabValue === 1) params.set('targetType', 'user');
    if (tabValue === 2) params.set('targetType', 'group');
    if (roleTypeFilter) params.set('roleType', roleTypeFilter);
    params.set('limit', rowsPerPage.toString());
    params.set('offset', (page * rowsPerPage).toString());
    return `/api/admin/assignments?${params.toString()}`;
  }, [selectedOrg, tabValue, roleTypeFilter, page, rowsPerPage]);

  // Fetch assignments
  const { data, error, isLoading } = useSWR(buildUrl(), fetcher, {
    refreshInterval: 30000,
  });

  // Fetch organizations for filter
  const { data: orgsData } = useSWR('/api/admin/organizations', fetcher);

  const assignments: RoleAssignment[] = data?.assignments || [];
  const total = data?.total || 0;
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
        <Alert severity="error">Failed to load assignments: {error.message}</Alert>
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
        <Typography color="text.primary">Role Assignments</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton component={Link} href="/admin">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Role Assignments
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View all role assignments across organizations ({total} total)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Assignments" icon={<AssignmentIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Users" icon={<PersonIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Groups" icon={<GroupsIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Role Type</InputLabel>
            <Select
              value={roleTypeFilter}
              label="Role Type"
              onChange={(e) => {
                setRoleTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="builtin">Built-in</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Assignments Table */}
      <TableContainer component={Paper} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Target</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Granted By</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={150} /></TableCell>
                  <TableCell><Skeleton variant="text" width={120} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                </TableRow>
              ))
            ) : assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    No role assignments found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => (
                <TableRow key={assignment.assignmentId} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {assignment.targetType === 'user' ? (
                        <PersonIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      ) : (
                        <GroupsIcon fontSize="small" sx={{ color: 'secondary.main' }} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {assignment.targetName || assignment.targetId}
                        </Typography>
                        {assignment.targetEmail && (
                          <Typography variant="caption" color="text.secondary">
                            {assignment.targetEmail}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Tooltip title={`Org ID: ${assignment.organizationId}`}>
                        <Typography variant="body2">{assignment.organizationName}</Typography>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={assignment.roleName}
                      size="small"
                      color={assignment.roleType === 'builtin' ? 'default' : 'primary'}
                      variant={assignment.roleType === 'builtin' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>
                    {assignment.scope ? (
                      <Chip
                        label={`${assignment.scope.type}: ${assignment.scope.resourceId || 'all'}`}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Org-wide
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {assignment.grantedByName || assignment.grantedBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(assignment.grantedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </TableContainer>
    </Container>
  );
}
