'use client';

import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Divider,
  Chip,
  alpha,
  Grid,
} from '@mui/material';
import { Close, Delete, Edit, ArrowBack, ArrowForward } from '@mui/icons-material';
import { FormResponse } from '@/types/form';
import { ConversationalSubmissionData } from '@/types/platform';
import { ConversationTranscriptViewer } from '@/components/ConversationalForm';
import { format } from 'date-fns';

interface ResponseDetailProps {
  response: FormResponse;
  onClose: () => void;
  onDelete: (responseId: string) => void;
  connectionString?: string;
  /** Conversational form data if this was a conversational submission */
  conversationalData?: ConversationalSubmissionData;
}

export function ResponseDetail({
  response,
  onClose,
  onDelete,
  connectionString,
  conversationalData,
}: ResponseDetailProps) {
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this response?')) {
      onDelete(response._id!);
      onClose();
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Response Details</Typography>
        <Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </Box>

      {/* Metadata */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          bgcolor: alpha('#00ED64', 0.05),
          border: '1px solid',
          borderColor: alpha('#00ED64', 0.2),
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Metadata
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={response.status}
                size="small"
                color={
                  response.status === 'submitted'
                    ? 'success'
                    : response.status === 'draft'
                    ? 'warning'
                    : 'default'
                }
              />
            </Box>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="caption" color="text.secondary">
              Submitted At
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {format(new Date(response.submittedAt), 'MMM dd, yyyy HH:mm:ss')}
            </Typography>
          </Grid>
          {response.completionTime && (
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Completion Time
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {Math.round(response.completionTime)}s
              </Typography>
            </Grid>
          )}
          {response.metadata?.deviceType && (
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Device Type
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {response.metadata.deviceType}
              </Typography>
            </Grid>
          )}
          {response.metadata?.browser && (
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Browser
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {response.metadata.browser}
              </Typography>
            </Grid>
          )}
          {response.metadata?.os && (
            <Grid item xs={6} sm={4}>
              <Typography variant="caption" color="text.secondary">
                Operating System
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {response.metadata.os}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Conversational Data (if present) */}
      {conversationalData && (
        <Box sx={{ mb: 3 }}>
          <ConversationTranscriptViewer
            conversationalData={conversationalData}
            defaultExpanded={false}
          />
        </Box>
      )}

      {/* Response Data */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Response Data
        </Typography>
        <Paper
          sx={{
            p: 2,
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </Paper>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Box>
    </Paper>
  );
}

