'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  Tabs,
  Tab,
  Divider,
  alpha,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  ExpandMore,
  Description,
  ViewList,
  Refresh,
  Search,
  Code,
} from '@mui/icons-material';
import { Document } from 'mongodb';
import { HelpButton } from '@/components/Help/HelpButton';

interface FieldInfo {
  name: string;
  types: string[];
  isNested: boolean;
  nestedFields?: FieldInfo[];
}

interface SampleDataResponse {
  collectionName: string;
  totalCount: number;
  sampleSize: number;
  documents: Document[];
  fields: FieldInfo[];
}

interface SampleDataPanelProps {
  connectionString: string | null;
  databaseName: string | null;
  collectionName: string | null;
}

export function SampleDataPanel({
  connectionString,
  databaseName,
  collectionName,
}: SampleDataPanelProps) {
  const [sampleData, setSampleData] = useState<SampleDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string | false>(false);

  const loadSampleData = async () => {
    if (!connectionString || !databaseName || !collectionName) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mongodb/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collectionName,
          sampleSize: 10,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSampleData(data.data);
      } else {
        setError(data.error || 'Failed to load sample data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load sample data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (connectionString && databaseName && collectionName) {
      loadSampleData();
    } else {
      setSampleData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionString, databaseName, collectionName]);

  const getTypeColor = (type: string): string => {
    if (type.includes('array')) return '#9d4edd';
    if (type === 'string') return '#06b6d4';
    if (type === 'number') return '#f59e0b';
    if (type === 'boolean') return '#10b981';
    if (type === 'object') return '#ec4899';
    if (type === 'ObjectId') return '#8b5cf6';
    if (type === 'date') return '#3b82f6';
    return '#6b7280';
  };

  const renderFieldList = (fields: FieldInfo[], level: number = 0) => {
    const filteredFields = fields.filter((field) =>
      field.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <List dense sx={{ pl: level * 2 }}>
        {filteredFields.map((field) => (
          <Box key={field.name}>
            <ListItem
              sx={{
                py: 0.5,
                px: 1,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: alpha('#00ED64', 0.05),
                },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 500,
                      }}
                    >
                      {field.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {field.types.map((type) => (
                        <Chip
                          key={type}
                          label={type}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: alpha(getTypeColor(type), 0.2),
                            color: getTypeColor(type),
                            fontFamily: 'monospace',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
            {field.nestedFields && field.nestedFields.length > 0 && (
              <Box sx={{ ml: 2 }}>
                {renderFieldList(field.nestedFields, level + 1)}
              </Box>
            )}
          </Box>
        ))}
      </List>
    );
  };

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedDoc(isExpanded ? panel : false);
  };

  if (!connectionString || !databaseName || !collectionName) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          height: '100%',
        }}
      >
        <Description sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Select a collection to view sample documents and schema
        </Typography>
      </Paper>
    );
  }

  if (isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          height: '100%',
        }}
      >
        <NetPadLoader size="large" variant="ascii" message="Loading sample data..." />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          height: '100%',
        }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Paper>
    );
  }

  if (!sampleData) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {sampleData.collectionName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sampleData.totalCount.toLocaleString()} documents •{' '}
              {sampleData.fields.length} fields
            </Typography>
          </Box>
          <HelpButton topicId="sample-documents" tooltip="Sample Documents Help" />
        </Box>
        <Tooltip title="Refresh sample data">
          <IconButton size="small" onClick={loadSampleData}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<ViewList />} label="Fields" iconPosition="start" />
          <Tab icon={<Description />} label="Documents" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 ? (
          // Fields Tab
          <Box>
            <TextField
              size="small"
              fullWidth
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            {renderFieldList(sampleData.fields)}
          </Box>
        ) : (
          // Documents Tab
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Showing {sampleData.sampleSize} sample document{sampleData.sampleSize !== 1 ? 's' : ''}
            </Typography>
            {sampleData.documents.map((doc, index) => (
              <Accordion
                key={index}
                expanded={expandedDoc === `doc-${index}`}
                onChange={handleAccordionChange(`doc-${index}`)}
                sx={{
                  mb: 1,
                  '&:before': { display: 'none' },
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Code fontSize="small" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      Document {index + 1}
                    </Typography>
                    {doc._id && (
                      <Chip
                        label={`_id: ${doc._id.toString().substring(0, 8)}...`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      bgcolor: alpha('#000', 0.3),
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: '300px',
                    }}
                  >
                    {JSON.stringify(doc, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
