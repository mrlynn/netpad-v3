'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Email,
  Fingerprint,
  Google,
  GitHub,
  Key,
  Delete,
  Add,
  CheckCircle,
  LinkOff,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsSection, SettingsItem } from './index';

export function ProfileSettings() {
  const { user, registerPasskey, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterPasskey = async () => {
    await registerPasskey('My Device');
  };

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress sx={{ color: '#00ED64' }} />
      </Box>
    );
  }

  return (
    <Box>

      {/* Profile Card */}
      <SettingsSection
        title="Profile Information"
        description="Update your display name and email"
        icon={<Person fontSize="small" />}
        color="#00ED64"
        defaultExpanded={true}
      >
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              fontSize: '2rem',
              bgcolor: '#00ED64',
              color: '#001E2B',
            }}
          >
            {(user.displayName || user.email)[0].toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <SettingsItem
              label="Display Name"
              description="How your name appears to other users"
            >
              <TextField
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </SettingsItem>
            <SettingsItem
              label="Email"
              description="Your account email address"
            >
              <TextField
                fullWidth
                value={user.email}
                disabled
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </SettingsItem>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleSaveProfile}
                disabled={saving}
                sx={{ bgcolor: '#00ED64', color: '#001E2B', '&:hover': { bgcolor: '#00c853' } }}
              >
                {saving ? <CircularProgress size={20} /> : 'Save Changes'}
              </Button>
              {saveSuccess && (
                <Chip
                  icon={<CheckCircle />}
                  label="Saved!"
                  color="success"
                  size="small"
                />
              )}
            </Box>
          </Box>
        </Box>
      </SettingsSection>

      {/* Authentication Methods */}
      <SettingsSection
        title="Authentication Methods"
        description="Manage how you sign in to your account"
        icon={<Key fontSize="small" />}
        color="#00ED64"
        defaultExpanded={true}
      >
        <List>
          {/* Passkey */}
          <ListItem>
            <ListItemIcon>
              <Fingerprint sx={{ color: user.hasPasskey ? '#00ED64' : 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Passkey"
              secondary={
                user.hasPasskey
                  ? 'Sign in securely with biometrics or security key'
                  : 'Add a passkey for secure, passwordless login'
              }
            />
            <ListItemSecondaryAction>
              {user.hasPasskey ? (
                <Chip
                  icon={<CheckCircle />}
                  label="Enabled"
                  size="small"
                  sx={{
                    bgcolor: alpha('#00ED64', 0.1),
                    color: '#00ED64',
                  }}
                />
              ) : (
                <Button
                  startIcon={<Add />}
                  onClick={handleRegisterPasskey}
                  disabled={isLoading}
                  sx={{ color: '#00ED64' }}
                >
                  Add Passkey
                </Button>
              )}
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          {/* Email (Magic Link) */}
          <ListItem>
            <ListItemIcon>
              <Email sx={{ color: '#00ED64' }} />
            </ListItemIcon>
            <ListItemText
              primary="Email (Magic Link)"
              secondary={`Sign in via email link sent to ${user.email}`}
            />
            <ListItemSecondaryAction>
              <Chip
                icon={<CheckCircle />}
                label="Active"
                size="small"
                sx={{
                  bgcolor: alpha('#00ED64', 0.1),
                  color: '#00ED64',
                }}
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          {/* Google */}
          <ListItem>
            <ListItemIcon>
              <Google sx={{ color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Google"
              secondary="Sign in with your Google account"
            />
            <ListItemSecondaryAction>
              <Button
                startIcon={<Add />}
                href="/api/auth/oauth/google"
                sx={{ color: 'text.secondary' }}
              >
                Connect
              </Button>
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          {/* GitHub */}
          <ListItem>
            <ListItemIcon>
              <GitHub sx={{ color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="GitHub"
              secondary="Sign in with your GitHub account"
            />
            <ListItemSecondaryAction>
              <Button
                startIcon={<Add />}
                href="/api/auth/oauth/github"
                sx={{ color: 'text.secondary' }}
              >
                Connect
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        title="Security"
        description="Manage security settings and account access"
        icon={<Key fontSize="small" />}
        color="#00ED64"
        defaultExpanded={false}
      >
        <List>
          <ListItem>
            <ListItemIcon>
              <Key sx={{ color: 'text.secondary' }} />
            </ListItemIcon>
            <ListItemText
              primary="Active Sessions"
              secondary="Manage your active login sessions"
            />
            <ListItemSecondaryAction>
              <Button sx={{ color: 'text.secondary' }} disabled>
                View Sessions
              </Button>
            </ListItemSecondaryAction>
          </ListItem>

          <Divider />

          <ListItem>
            <ListItemIcon>
              <Delete sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Delete Account"
              secondary="Permanently delete your account and all data"
            />
            <ListItemSecondaryAction>
              <Button color="error" disabled>
                Delete Account
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </SettingsSection>
    </Box>
  );
}
