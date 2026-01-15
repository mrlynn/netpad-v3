/**
 * Contracts Tab Component
 * 
 * Displays and manages contracts for an application
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Visibility,
  MoreVert,
  CheckCircle,
  Edit,
  Delete,
  Archive,
  RestoreFromTrash,
  CompareArrows,
} from '@mui/icons-material';
import { ApplicationContract } from '@/types/application';
import { ContractViewer } from './ContractViewer';
import { ContractEditor } from './ContractEditor';
import { BreakingChangesDialog } from './BreakingChangesDialog';
import { fetcher } from '@/lib/swr';
import useSWR from 'swr';
import { ContractComparison } from '@/lib/platform/contractComparison';
import { CreateContractInput } from '@/lib/platform/applicationContracts';

interface ContractsTabProps {
  applicationId: string;
  orgId: string;
  projectId: string;
}

interface ContractsResponse {
  success: boolean;
  contracts?: ApplicationContract[];
  total?: number;
}

export function ContractsTab({ applicationId, orgId, projectId }: ContractsTabProps) {
  const [viewingContract, setViewingContract] = useState<ApplicationContract | null>(null);
  const [editingContract, setEditingContract] = useState<ApplicationContract | null>(null);
  const [creatingContract, setCreatingContract] = useState(false);
  const [comparingContracts, setComparingContracts] = useState<{ from: string; to: string } | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ContractComparison | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; contract: ApplicationContract } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<ContractsResponse>(
    `/api/applications/${applicationId}/contracts?orgId=${orgId}`,
    fetcher
  );

  const contracts = data?.contracts || [];

  const handleViewContract = (contract: ApplicationContract) => {
    setViewingContract(contract);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contract: ApplicationContract) => {
    setMenuAnchor({ el: event.currentTarget, contract });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleActivate = async (contract: ApplicationContract) => {
    if (!confirm(`Activate contract v${contract.version}? This will deprecate any currently active contract.`)) {
      return;
    }

    setActionLoading(contract.contractId);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/contracts/${contract.contractId}?orgId=${orgId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'activate' }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate contract');
      }

      await mutate();
      handleMenuClose();
    } catch (error: any) {
      alert(`Failed to activate contract: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeprecate = async (contract: ApplicationContract) => {
    if (!confirm(`Deprecate contract v${contract.version}?`)) {
      return;
    }

    setActionLoading(contract.contractId);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/contracts/${contract.contractId}?orgId=${orgId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deprecate' }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deprecate contract');
      }

      await mutate();
      handleMenuClose();
    } catch (error: any) {
      alert(`Failed to deprecate contract: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (contract: ApplicationContract) => {
    if (!confirm(`Delete contract v${contract.version}? This action cannot be undone.`)) {
      return;
    }

    if (contract.status === 'active') {
      alert('Cannot delete active contract. Deprecate it first.');
      return;
    }

    setActionLoading(contract.contractId);
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/contracts/${contract.contractId}?orgId=${orgId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete contract');
      }

      await mutate();
      handleMenuClose();
    } catch (error: any) {
      alert(`Failed to delete contract: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditContract = (contract: ApplicationContract) => {
    setEditingContract(contract);
    handleMenuClose();
  };

  const handleCompareContracts = async (fromVersion: string, toVersion: string) => {
    try {
      const response = await fetch(
        `/api/applications/${applicationId}/contracts/compare?orgId=${orgId}&from=${fromVersion}&to=${toVersion}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to compare contracts');
      }

      const data = await response.json();
      setComparisonResult(data.comparison);
      setComparingContracts({ from: fromVersion, to: toVersion });
    } catch (error: any) {
      alert(`Failed to compare contracts: ${error.message}`);
    }
  };

  const handleSaveContract = async (contractData: CreateContractInput) => {
    try {
      const isEdit = !!editingContract;
      const url = isEdit
        ? `/api/applications/${applicationId}/contracts/${editingContract!.contractId}?orgId=${orgId}`
        : `/api/applications/${applicationId}/contracts?orgId=${orgId}`;

      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'} contract`);
      }

      await mutate();
      setCreatingContract(false);
      setEditingContract(null);
    } catch (error: any) {
      throw error;
    }
  };

  // Get suggested version (latest + 1.0.0 or 1.0.0)
  const [suggestedVersion, setSuggestedVersion] = useState<string>('1.0.0');
  
  useEffect(() => {
    if (contracts.length > 0 && creatingContract) {
      // Get latest version and suggest next minor version
      const versions = contracts.map((c) => c.version).sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        if (aParts[0] !== bParts[0]) return bParts[0] - aParts[0];
        if (aParts[1] !== bParts[1]) return bParts[1] - aParts[1];
        return bParts[2] - aParts[2];
      });
      const latest = versions[0];
      const parts = latest.split('.').map(Number);
      setSuggestedVersion(`${parts[0]}.${parts[1] + 1}.0`);
    } else {
      setSuggestedVersion('1.0.0');
    }
  }, [contracts, creatingContract]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load contracts: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Contracts ({contracts.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreatingContract(true)}
          sx={{ textTransform: 'none' }}
        >
          Create Contract
        </Button>
      </Box>

      {contracts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No contracts defined for this application
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a contract to define the public API surface of your application
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreatingContract(true)}
            sx={{ textTransform: 'none' }}
          >
            Create First Contract
          </Button>
        </Paper>
      ) : (
        <List>
          {contracts.map((contract) => (
            <Paper key={contract.contractId} sx={{ mb: 2 }}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Contract v{contract.version}
                      </Typography>
                      <Chip
                        label={contract.status}
                        size="small"
                        color={
                          contract.status === 'active'
                            ? 'success'
                            : contract.status === 'deprecated'
                            ? 'warning'
                            : 'default'
                        }
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Contract ID: {contract.contractId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Created: {new Date(contract.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewContract(contract)}
                      sx={{ textTransform: 'none' }}
                    >
                      View
                    </Button>
                    {contract.status === 'draft' && (
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleEditContract(contract)}
                        sx={{ textTransform: 'none' }}
                      >
                        Edit
                      </Button>
                    )}
                    {contracts.length > 1 && (
                      <Button
                        size="small"
                        startIcon={<CompareArrows />}
                        onClick={() => {
                          // Find another contract to compare with
                          const otherContract = contracts.find((c) => c.contractId !== contract.contractId);
                          if (otherContract) {
                            handleCompareContracts(contract.version, otherContract.version);
                          }
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Compare
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, contract)}
                      disabled={actionLoading === contract.contractId}
                    >
                      {actionLoading === contract.contractId ? (
                        <CircularProgress size={20} />
                      ) : (
                        <MoreVert />
                      )}
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}

      {/* View Contract Dialog */}
      <Dialog
        open={!!viewingContract}
        onClose={() => setViewingContract(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Contract v{viewingContract?.version}
        </DialogTitle>
        <DialogContent>
          {viewingContract && <ContractViewer contract={viewingContract} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingContract(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Contract Editor Dialog */}
      {(creatingContract || editingContract) && (
        <ContractEditor
          open={creatingContract || !!editingContract}
          onClose={() => {
            setCreatingContract(false);
            setEditingContract(null);
          }}
          applicationId={applicationId}
          orgId={orgId}
          contract={editingContract || undefined}
          suggestedVersion={suggestedVersion}
          onSave={handleSaveContract}
        />
      )}

      {/* Breaking Changes Dialog */}
      {comparingContracts && comparisonResult && (
        <BreakingChangesDialog
          open={!!comparingContracts}
          onClose={() => {
            setComparingContracts(null);
            setComparisonResult(null);
          }}
          comparison={comparisonResult}
        />
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={handleMenuClose}
      >
        {menuAnchor?.contract.status === 'draft' && (
          <>
            <MenuItem onClick={() => handleEditContract(menuAnchor.contract)}>
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleActivate(menuAnchor.contract)}>
              <ListItemIcon>
                <CheckCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText>Activate</ListItemText>
            </MenuItem>
          </>
        )}
        {menuAnchor?.contract.status === 'active' && (
          <MenuItem onClick={() => handleDeprecate(menuAnchor.contract)}>
            <ListItemIcon>
              <Archive fontSize="small" />
            </ListItemIcon>
            <ListItemText>Deprecate</ListItemText>
          </MenuItem>
        )}
        {menuAnchor?.contract.status === 'deprecated' && (
          <MenuItem onClick={() => handleActivate(menuAnchor.contract)}>
            <ListItemIcon>
              <RestoreFromTrash fontSize="small" />
            </ListItemIcon>
            <ListItemText>Reactivate</ListItemText>
          </MenuItem>
        )}
        {menuAnchor?.contract.status !== 'active' && (
          <MenuItem
            onClick={() => handleDelete(menuAnchor!.contract)}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
