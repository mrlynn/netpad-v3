'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Button,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import { NetPadLoader } from '@/components/common/NetPadLoader';
import {
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Refresh,
  Code,
  TableChart
} from '@mui/icons-material';
import { usePipeline } from '@/contexts/PipelineContext';
import { serializePipeline } from '@/lib/pipelineSerializer';
import { Document } from 'mongodb';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`results-tabpanel-${index}`}
      aria-labelledby={`results-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export function ResultsPanel() {
  const { nodes, edges, connectionString, databaseName, collection, isExecuting, executionResults, dispatch } = usePipeline();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Document[]>([]);

  const hasResults = results.length > 0;
  const canExecute = connectionString && databaseName && collection && nodes.length > 0;

  const executePipeline = async () => {
    if (!canExecute) {
      setError('Please connect to MongoDB and select a collection');
      return;
    }

    setError(null);
    dispatch({ type: 'SET_EXECUTING', payload: { isExecuting: true } });

    try {
      const pipeline = serializePipeline(nodes, edges);
      
      const response = await fetch('/api/mongodb/execute-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName,
          collection,
          pipeline
        })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        dispatch({
          type: 'SET_EXECUTION_RESULTS',
          payload: { results: new Map([['final', data.results || []]]) }
        });
        if (!isExpanded) {
          setIsExpanded(true);
        }
      } else {
        setError(data.error || 'Failed to execute pipeline');
        setResults([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute pipeline');
      setResults([]);
    } finally {
      dispatch({ type: 'SET_EXECUTING', payload: { isExecuting: false } });
    }
  };

  const renderJsonView = () => {
    if (results.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No results to display
        </Typography>
      );
    }

    return (
      <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
        <pre
          style={{
            margin: 0,
            padding: '12px',
            backgroundColor: alpha('#000', 0.05),
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {JSON.stringify(results, null, 2)}
        </pre>
      </Box>
    );
  };

  const renderTableView = () => {
    if (results.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No results to display
        </Typography>
      );
    }

    // Get all unique keys from all documents
    const allKeys = new Set<string>();
    results.forEach((doc) => {
      Object.keys(doc).forEach((key) => allKeys.add(key));
    });
    const columns = Array.from(allKeys).slice(0, 10); // Limit to 10 columns for display

    return (
      <TableContainer sx={{ maxHeight: '600px' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>#</TableCell>
              {columns.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                  {col}
                </TableCell>
              ))}
              {allKeys.size > 10 && (
                <TableCell sx={{ fontWeight: 600, bgcolor: 'background.paper' }}>
                  ... ({allKeys.size - 10} more)
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.slice(0, 100).map((doc, idx) => (
              <TableRow key={idx} hover>
                <TableCell>{idx + 1}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col}>
                    {doc[col] !== null && doc[col] !== undefined
                      ? typeof doc[col] === 'object'
                        ? JSON.stringify(doc[col])
                        : String(doc[col])
                      : '—'}
                  </TableCell>
                ))}
                {allKeys.size > 10 && <TableCell>...</TableCell>}
              </TableRow>
            ))}
            {results.length > 100 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  <Typography variant="caption" color="text.secondary">
                    Showing first 100 of {results.length} results
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Box
        sx={{
          p: 2,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: hasResults ? alpha('#00ED64', 0.1) : alpha('#666', 0.1)
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={isExecuting ? <NetPadLoader size="small" variant="svg" showPhrases={false} /> : <PlayArrow />}
              onClick={(e) => {
                e.stopPropagation();
                executePipeline();
              }}
              disabled={!canExecute || isExecuting}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              {isExecuting ? 'Running...' : 'Run Pipeline'}
            </Button>
            {hasResults && (
              <Chip
                label={`${results.length} result${results.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  bgcolor: alpha('#00ED64', 0.2),
                  color: '#00ED64',
                  fontWeight: 600
                }}
              />
            )}
          </Box>
        </Box>
        <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {hasResults && (
            <>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Tab icon={<TableChart />} iconPosition="start" label="Table" />
                <Tab icon={<Code />} iconPosition="start" label="JSON" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {renderTableView()}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {renderJsonView()}
              </TabPanel>
            </>
          )}

          {!hasResults && !isExecuting && !error && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Click "Run Pipeline" to execute the aggregation and view results
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

