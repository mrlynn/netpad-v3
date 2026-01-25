/**
 * Node editor for action nodes
 * Handles: email-send, notification
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Box, Alert, Typography, Button } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import Link from 'next/link';
import { ConfigField, NodeEditorProps } from './shared/utils';
import { ConfigFieldRenderer } from './shared/ConfigFieldRenderer';

// Config schemas for action nodes
const ACTION_CONFIG_SCHEMAS: Record<string, ConfigField[]> = {
  'email-send': [
    {
      key: 'credentialId',
      label: 'Email Credential',
      type: 'email-credential-select',
      description: 'Select your SMTP or SendGrid credentials',
      required: true,
    },
    {
      key: 'to',
      label: 'To',
      type: 'text',
      description: 'Recipient email (use {{nodes.formTrigger.data.email}} for form field)',
      required: true,
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Send to the email from the form submission"',
        buttonLabel: 'Generate Recipient',
      },
    },
    {
      key: 'subject',
      label: 'Subject',
      type: 'text',
      description: 'Email subject (supports {{variables}})',
      required: true,
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Welcome email with user name"',
        buttonLabel: 'Generate Subject',
      },
    },
    {
      key: 'body',
      label: 'Body',
      type: 'code',
      description: 'Email body (HTML supported, use {{variables}})',
      required: true,
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Professional welcome email with signup details"',
        buttonLabel: 'Generate Email',
      },
    },
    {
      key: 'from',
      label: 'From (optional)',
      type: 'text',
      description: 'Override sender email (defaults to credential setting)',
    },
    {
      key: 'replyTo',
      label: 'Reply-To (optional)',
      type: 'text',
      description: 'Reply-to email address',
    },
  ],
  'notification': [
    // Notification node config - if it exists, add fields here
    // Currently notification may not have config fields defined
  ],
  'html-output': [
    {
      key: 'template',
      label: 'HTML Template',
      type: 'code',
      description: 'HTML template with {{variable}} placeholders. Access form data via {{trigger.data.fieldName}} or {{input.fieldName}}',
      required: true,
      aiAssist: {
        enabled: true,
        promptHint: 'e.g., "Create a confirmation page showing submitted form data"',
        buttonLabel: 'Generate Template',
      },
    },
    {
      key: 'format',
      label: 'Output Format',
      type: 'select',
      description: 'Output format for the rendered content',
      options: ['html', 'markdown'],
    },
    {
      key: 'title',
      label: 'Document Title',
      type: 'text',
      description: 'Title for the HTML document (optional)',
    },
    {
      key: 'includeWrapper',
      label: 'Include HTML Wrapper',
      type: 'boolean',
      description: 'Wrap output in full HTML document structure',
    },
    {
      key: 'defaultStyles',
      label: 'Include Default Styles',
      type: 'boolean',
      description: 'Include built-in CSS styles for common elements',
    },
  ],
};

export function ActionNodeEditor({
  node,
  config,
  onConfigChange,
  availableForms = [],
  formsLoading = false,
  availableConnections = [],
  connectionsLoading = false,
  availableEmailCredentials = [],
  emailCredentialsLoading = false,
  nodeId,
}: NodeEditorProps) {
  const params = useParams();
  const orgId = params.orgId as string | undefined;
  const configSchema = ACTION_CONFIG_SCHEMAS[node.type] || [];

  if (configSchema.length === 0) {
    return null;
  }

  // Check if email credentials are missing for email-send node
  const needsEmailSetup = node.type === 'email-send' &&
    !emailCredentialsLoading &&
    availableEmailCredentials.length === 0;

  return (
    <Box>
      {node.type === 'email-send' && needsEmailSetup && (
        <Alert
          severity="warning"
          sx={{ mb: 2, fontSize: '0.85rem' }}
          action={
            orgId && (
              <Button
                component={Link}
                href={`/settings?tab=integrations`}
                target="_blank"
                size="small"
                startIcon={<SettingsIcon />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Configure
              </Button>
            )
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            Email integration required
          </Typography>
          <Typography variant="caption" component="div">
            Add SMTP or SendGrid credentials to send emails from this workflow.
          </Typography>
        </Alert>
      )}
      {node.type === 'email-send' && !needsEmailSetup && !emailCredentialsLoading && (
        <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
          <Typography variant="caption">
            {availableEmailCredentials.length} email credential{availableEmailCredentials.length !== 1 ? 's' : ''} available
          </Typography>
        </Alert>
      )}
      {configSchema.map((field) => (
        <ConfigFieldRenderer
          key={field.key}
          field={field}
          value={config[field.key]}
          onChange={onConfigChange}
          nodeId={nodeId}
          nodeType={node.type}
          allConfig={config}
          availableForms={availableForms}
          formsLoading={formsLoading}
          availableConnections={availableConnections}
          connectionsLoading={connectionsLoading}
          availableEmailCredentials={availableEmailCredentials}
          emailCredentialsLoading={emailCredentialsLoading}
        />
      ))}
    </Box>
  );
}
