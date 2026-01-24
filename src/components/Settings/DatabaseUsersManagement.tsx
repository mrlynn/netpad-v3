'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  alpha,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  InputAdornment,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  Person,
  Add,
  Delete,
  Refresh,
  Visibility,
  VisibilityOff,
  ContentCopy,
  Security,
  Key,
  CheckCircle,
  Warning,
} from '@mui/icons-material';

interface DatabaseUser {
  username: string;
  roles: Array<{ roleName: string; databaseName: string }>;
  createdAt?: string;
}

interface DatabaseUsersManagementProps {
  organizationId: string;
  atlasProjectId?: string;
  clusterName?: string;
}

export function DatabaseUsersManagement({
  organizationId,
  atlasProjectId,
  clusterName,
}: DatabaseUsersManagementProps) {
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchUsers = async () => {
    if (!atlasProjectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/cluster/users`
      );
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (atlasProjectId) {
      fetchUsers();
    }
  }, [atlasProjectId, organizationId]);

  if (!atlasProjectId) {
    return (
      <Alert severity="info">
        Database user management is available once your cluster is provisioned.
      </Alert>
    );
  }

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ color: '#00ED64' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Database Users
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchUsers} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ borderColor: '#00ED64', color: '#00ED64' }}
            >
              Add User
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Manage database users who can access your cluster directly.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <NetPadLoader size="small" variant="svg" showPhrases={false} />
          </Box>
        ) : users.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 3, textAlign: 'center', bgcolor: alpha('#00ED64', 0.02) }}
          >
            <Security sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              A database user was created automatically for the platform.
              <br />
              Add additional users for direct database access.
            </Typography>
          </Paper>
        ) : (
          <List dense>
            {users.map((user) => (
              <ListItem
                key={user.username}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon>
                  <Person sx={{ color: '#00ED64' }} />
                </ListItemIcon>
                <ListItemText
                  primary={user.username}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {user.roles.map((role, i) => (
                        <Chip
                          key={i}
                          label={`${role.roleName}@${role.databaseName}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Delete user">
                    <IconButton
                      edge="end"
                      size="small"
                      sx={{ color: 'error.main' }}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Tip:</strong> To connect directly to your database, use MongoDB Compass
            or the mongo shell with your user credentials.
          </Typography>
        </Alert>
      </CardContent>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        organizationId={organizationId}
        clusterName={clusterName}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchUsers();
        }}
      />
    </Card>
  );
}

// Create User Dialog
function CreateUserDialog({
  open,
  onClose,
  organizationId,
  clusterName,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  clusterName?: string;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('readWrite');
  const [database, setDatabase] = useState('forms');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<{ username: string; password: string } | null>(null);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const handleCreate = async () => {
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/cluster/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          role,
          database,
          clusterName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreatedUser({ username, password });
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setRole('readWrite');
    setDatabase('forms');
    setError(null);
    setCreatedUser(null);
    onClose();
    if (createdUser) {
      onSuccess();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person sx={{ color: '#00ED64' }} />
          {createdUser ? 'User Created!' : 'Create Database User'}
        </Box>
      </DialogTitle>
      <DialogContent>
        {createdUser ? (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Database user created successfully!
            </Alert>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Important:</strong> Save these credentials now. The password
                cannot be retrieved later.
              </Typography>
            </Alert>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#00ED64', 0.02) }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Username
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {createdUser.username}
                  </Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(createdUser.username)}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Password
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {showPassword ? createdUser.password : '••••••••••••••••'}
                  </Typography>
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                  <IconButton size="small" onClick={() => copyToClipboard(createdUser.password)}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Box>
        ) : (
          <Box sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Alphanumeric characters, underscores, and hyphens only"
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                    <Button size="small" onClick={generatePassword}>
                      Generate
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={role}
                  label="Role"
                  onChange={(e) => setRole(e.target.value)}
                >
                  <MenuItem value="read">Read Only</MenuItem>
                  <MenuItem value="readWrite">Read & Write</MenuItem>
                  <MenuItem value="dbAdmin">Database Admin</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              />
            </Box>

            <Alert severity="info">
              <Typography variant="caption">
                This user will have <strong>{role}</strong> access to the{' '}
                <strong>{database}</strong> database.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {createdUser ? 'Done' : 'Cancel'}
        </Button>
        {!createdUser && (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !username || !password}
            startIcon={creating ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <Add />}
            sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00c853' } }}
          >
            {creating ? 'Creating...' : 'Create User'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
