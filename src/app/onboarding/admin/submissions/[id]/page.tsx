'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Divider,
  Paper,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Computer as ComputerIcon,
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
  AccessTime as AccessTimeIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';
import {
  OnboardingSubmission,
  OnboardingStatus,
  STATUS_CONFIG,
  getSubmissionDisplayName,
  formatCompletionTime,
} from '@/types/onboarding';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SubmissionDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [submission, setSubmission] = useState<OnboardingSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OnboardingStatus>('submitted');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSubmission();
  }, [id]);

  const loadSubmission = async () => {
    try {
      const response = await fetch(`/api/onboarding/submissions/${id}`);
      const data = await response.json();

      if (data.success) {
        setSubmission(data.submission);
      } else {
        setError(data.error || 'Failed to load submission');
      }
    } catch (err) {
      setError('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!submission) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/onboarding/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: statusNotes }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmission(data.submission);
        setStatusDialogOpen(false);
        setStatusNotes('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/onboarding/submissions/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/onboarding/admin/submissions');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const InfoSection = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box sx={{ display: 'flex', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 200, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || '-'}</Typography>
    </Box>
  );

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 3, borderRadius: 2 }} />
      </Box>
    );
  }

  if (error || !submission) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography color="error">{error || 'Submission not found'}</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/onboarding/admin/submissions')}
          sx={{ mt: 2 }}
        >
          Back to Submissions
        </Button>
      </Box>
    );
  }

  const statusConfig = STATUS_CONFIG[submission.status];
  const data = submission.data;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => router.push('/onboarding/admin/submissions')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {getSubmissionDisplayName(data)}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
          >
            {submission.submissionId.toUpperCase()}
          </Typography>
        </Box>
        <Chip
          label={statusConfig.label}
          sx={{
            bgcolor: statusConfig.bgColor,
            color: statusConfig.color,
            fontWeight: 600,
            fontSize: '0.875rem',
            px: 1,
          }}
        />
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => {
            setNewStatus(submission.status);
            setStatusDialogOpen(true);
          }}
        >
          Update Status
        </Button>
        <IconButton color="error" onClick={() => setDeleteDialogOpen(true)}>
          <DeleteIcon />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Personal Information */}
          <InfoSection title="Personal Information" icon={<PersonIcon color="primary" />}>
            <InfoRow label="First Name" value={data.firstName} />
            <InfoRow label="Last Name" value={data.lastName} />
            <InfoRow label="Preferred Name" value={data.preferredName} />
            <InfoRow label="Email" value={data.email} />
            <InfoRow label="Phone" value={data.phone} />
            <InfoRow label="Date of Birth" value={data.dateOfBirth} />
          </InfoSection>

          {/* Address */}
          <InfoSection title="Address" icon={<LocationIcon color="primary" />}>
            <InfoRow label="Street" value={data.address?.street} />
            <InfoRow label="City" value={data.address?.city} />
            <InfoRow label="State" value={data.address?.state} />
            <InfoRow label="ZIP Code" value={data.address?.zip} />
            <InfoRow label="Country" value={data.address?.country} />
          </InfoSection>

          {/* Emergency Contacts */}
          <InfoSection title="Emergency Contacts" icon={<PhoneIcon color="primary" />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Primary Contact
            </Typography>
            <InfoRow label="Name" value={data.emergencyContact1?.name} />
            <InfoRow label="Relationship" value={data.emergencyContact1?.relationship} />
            <InfoRow label="Phone" value={data.emergencyContact1?.phone} />
            <InfoRow label="Email" value={data.emergencyContact1?.email} />
            {data.emergencyContact2?.name && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                  Secondary Contact
                </Typography>
                <InfoRow label="Name" value={data.emergencyContact2?.name} />
                <InfoRow label="Relationship" value={data.emergencyContact2?.relationship} />
                <InfoRow label="Phone" value={data.emergencyContact2?.phone} />
              </>
            )}
          </InfoSection>

          {/* Payroll */}
          <InfoSection title="Payroll & Tax" icon={<AccountBalanceIcon color="primary" />}>
            <InfoRow label="Payment Method" value={data.payrollMethod} />
            {data.payrollMethod === 'direct_deposit' && (
              <>
                <InfoRow label="Bank Name" value={data.bankName} />
                <InfoRow label="Account Type" value={data.bankAccountType} />
                <InfoRow label="Routing Number" value={data.bankRoutingNumber ? '••••' + data.bankRoutingNumber.slice(-4) : '-'} />
                <InfoRow label="Account Number" value={data.bankAccountNumber ? '••••' + data.bankAccountNumber.slice(-4) : '-'} />
              </>
            )}
            <InfoRow label="Tax Filing Status" value={data.taxFilingStatus} />
            <InfoRow label="Federal Withholdings" value={data.taxWithholdings} />
            <InfoRow label="State Withholdings" value={data.stateWithholdings} />
          </InfoSection>

          {/* IT Equipment */}
          <InfoSection title="IT Equipment" icon={<ComputerIcon color="primary" />}>
            <InfoRow label="Computer Preference" value={data.computerPreference} />
            <InfoRow label="Additional Monitor" value={data.additionalMonitor ? 'Yes' : 'No'} />
            <InfoRow label="Headset" value={data.headset ? 'Yes' : 'No'} />
            <InfoRow label="Special Equipment" value={data.specialEquipment} />
            <InfoRow
              label="Software Needs"
              value={data.softwareNeeds?.length ? data.softwareNeeds.join(', ') : '-'}
            />
            <InfoRow label="Remote Setup" value={data.remoteSetup} />
          </InfoSection>

          {/* Acknowledgments */}
          <InfoSection title="Policy Acknowledgments" icon={<DescriptionIcon color="primary" />}>
            <InfoRow label="Employee Handbook" value={data.employeeHandbookAck ? '✓ Acknowledged' : '✗ Not acknowledged'} />
            <InfoRow label="Code of Conduct" value={data.codeOfConductAck ? '✓ Acknowledged' : '✗ Not acknowledged'} />
            <InfoRow label="Data Privacy" value={data.dataPrivacyAck ? '✓ Acknowledged' : '✗ Not acknowledged'} />
            <InfoRow label="IT Security" value={data.itSecurityAck ? '✓ Acknowledged' : '✗ Not acknowledged'} />
            <InfoRow label="Anti-Harassment" value={data.antiHarassmentAck ? '✓ Acknowledged' : '✗ Not acknowledged'} />
            <InfoRow label="Electronic Signature" value={data.electronicSignature} />
            <InfoRow label="Signature Date" value={data.signatureDate} />
          </InfoSection>
        </Grid>

        {/* Right Column - Metadata */}
        <Grid item xs={12} md={4}>
          {/* Submission Info */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Submission Details
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccessTimeIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Submitted
                  </Typography>
                  <Typography variant="body2">{formatDate(submission.submittedAt)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DevicesIcon fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Device
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {submission.metadata.deviceType}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Completion Time
                </Typography>
                <Typography variant="body2">
                  {formatCompletionTime(submission.metadata.completionTimeSeconds)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  IP Address
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {submission.metadata.ipAddress}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Status History
              </Typography>
              <List dense disablePadding>
                {submission.statusHistory.map((entry, index) => {
                  const config = STATUS_CONFIG[entry.status];
                  return (
                    <ListItem key={index} disableGutters sx={{ py: 1 }}>
                      <ListItemText
                        primary={
                          <Chip
                            label={config.label}
                            size="small"
                            sx={{
                              bgcolor: config.bgColor,
                              color: config.color,
                              fontWeight: 500,
                            }}
                          />
                        }
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              {formatDate(entry.changedAt)}
                            </Typography>
                            {entry.notes && (
                              <Typography variant="caption" color="text.secondary">
                                {entry.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value as OnboardingStatus)}
            >
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="under_review">Under Review</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (optional)"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Add notes about this status change..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateStatus} disabled={updating}>
            {updating ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Submission?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this submission? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
