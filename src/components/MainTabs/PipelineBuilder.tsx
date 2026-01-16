'use client';

import { Box, Paper, Typography, alpha, Divider, Tooltip } from '@mui/material';
import { PipelineCanvas } from '@/components/PipelineCanvas/PipelineCanvas';
import { StageLibrary } from '@/components/StageLibrary/StageLibrary';
import { StageConfigPanel } from '@/components/StageConfigPanel/StageConfigPanel';
import { CodeExport } from '@/components/CodeExport/CodeExport';
import { AIPipelineInput } from '@/components/AIPipelineInput/AIPipelineInput';
import { ConnectionPanel } from '@/components/ConnectionPanel/ConnectionPanel';
import { ResultsViewer } from '@/components/ResultsViewer/ResultsViewer';
import { SampleDocuments } from '@/components/SampleDocuments/SampleDocuments';
import { HelpButton } from '@/components/Help/HelpButton';
import { useAIPipeline } from '@/hooks/useAIPipeline';
import { SerializedStage } from '@/lib/pipelineSerializer';
import { usePipeline } from '@/contexts/PipelineContext';
import { useState, useEffect } from 'react';
import { Document } from 'mongodb';
import { Button } from '@mui/material';
import { NetPadSpinner } from '@/components/common/NetPadLoader';
import { PlayArrow } from '@mui/icons-material';
import { serializePipeline } from '@/lib/pipelineSerializer';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

export function PipelineBuilder() {
  const { applyAIGeneratedPipeline } = useAIPipeline();
  const {
    nodes,
    edges,
    connectionString,
    databaseName,
    collection,
    isExecuting,
    dispatch
  } = usePipeline();
  const [results, setResults] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const handleAIPipelineGenerated = (stages: SerializedStage[]) => {
    applyAIGeneratedPipeline(stages);
  };

  const executePipeline = async (page: number = 1, includeCount: boolean = true) => {
    if (!connectionString || !databaseName || !collection || nodes.length === 0) {
      setError('Please connect to MongoDB, select a collection, and build a pipeline');
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
          pipeline,
          page,
          pageSize,
          getCount: includeCount
        })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        setCurrentPage(data.page || page);
        setTotalCount(data.totalCount ?? null);
        setHasMore(data.hasMore ?? false);
        dispatch({
          type: 'SET_EXECUTION_RESULTS',
          payload: { results: new Map([['final', data.results || []]]) }
        });
      } else {
        setError(data.error || 'Failed to execute pipeline');
        setResults([]);
        setTotalCount(null);
        setHasMore(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute pipeline');
      setResults([]);
      setTotalCount(null);
      setHasMore(false);
    } finally {
      dispatch({ type: 'SET_EXECUTING', payload: { isExecuting: false } });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    executePipeline(newPage, false); // Don't re-fetch count when paginating
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.default',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${alpha('#00ED64', 0.3)}, transparent)`,
          zIndex: 1
        }
      }}
    >
      <Box sx={{ height: '100%', width: '100%' }}>
        <Allotment vertical>
          {/* Top Section: Pipeline Builder */}
          <Allotment.Pane preferredSize="60%" minSize={30}>
            <Box sx={{ height: '100%', width: '100%' }}>
              <Allotment>
            {/* Stage Library (left) */}
            <Allotment.Pane preferredSize={300} minSize={250} maxSize={500}>
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'background.paper',
                  position: 'relative',
                  zIndex: 2,
                  borderRadius: 0
                }}
              >
                {/* Connection Panel */}
                <Box data-tour="connection-panel">
                  <ConnectionPanel />
                </Box>

                <Box
                  data-tour="stage-library"
                  sx={{
                    p: 3,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: alpha('#00ED64', 0.05)
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 0.5
                      }}
                    >
                      Stage Library
                    </Typography>
                    <HelpButton topicId="aggregation-stages" tooltip="Aggregation Stages Help" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Drag stages onto the canvas
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <StageLibrary />
                </Box>
              </Paper>
            </Allotment.Pane>

            {/* Pipeline Canvas (center) */}
            <Allotment.Pane minSize={300}>
              <Box
                sx={{
                  height: '100%',
                  position: 'relative',
                  bgcolor: 'background.default',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Run Pipeline Button */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 10
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Pipeline Builder
                    </Typography>
                    <HelpButton topicId="pipeline-builder" tooltip="Pipeline Builder Help" />
                  </Box>
                  {(() => {
                    const isDisabled = !connectionString || !databaseName || !collection || nodes.length === 0 || isExecuting;
                    const missingRequirements: string[] = [];
                    if (!connectionString) missingRequirements.push('MongoDB connection');
                    if (!databaseName) missingRequirements.push('database selection');
                    if (!collection) missingRequirements.push('collection selection');
                    if (nodes.length === 0) missingRequirements.push('pipeline stages');
                    
                    const tooltipText = isDisabled && !isExecuting
                      ? `Missing: ${missingRequirements.join(', ')}`
                      : isExecuting
                      ? 'Pipeline is running...'
                      : 'Run the aggregation pipeline';

                    return (
                      <Tooltip title={tooltipText} arrow>
                        <span data-tour="run-pipeline">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={isExecuting ? <NetPadSpinner size={16} /> : <PlayArrow />}
                            onClick={() => {
                      setCurrentPage(1);
                      executePipeline(1, true);
                    }}
                            disabled={isDisabled}
                          >
                            {isExecuting ? 'Running...' : 'Run Pipeline'}
                          </Button>
                        </span>
                      </Tooltip>
                    );
                  })()}
                </Box>

                <Box data-tour="pipeline-canvas" sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
                  <PipelineCanvas />
                  {/* AI Pipeline Input */}
                  <Box data-tour="ai-input">
                    <AIPipelineInput onPipelineGenerated={handleAIPipelineGenerated} />
                  </Box>
                  {/* Floating code export button */}
                  <CodeExport />
                </Box>
              </Box>
            </Allotment.Pane>

            {/* Config Panel (right) */}
            <Allotment.Pane preferredSize={380} minSize={300} maxSize={600}>
              <Paper
                data-tour="config-panel"
                elevation={0}
                sx={{
                  height: '100%',
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: 'background.paper',
                  position: 'relative',
                  zIndex: 2,
                  borderRadius: 0
                }}
              >
                <Box
                  sx={{
                    p: 3,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: alpha('#00ED64', 0.05)
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #00ED64 0%, #4DFF9F 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 0.5
                    }}
                  >
                    Configuration
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Configure selected stage
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <StageConfigPanel />
                </Box>
              </Paper>
            </Allotment.Pane>
              </Allotment>
            </Box>
          </Allotment.Pane>

        {/* Bottom Section: Results Viewer or Sample Documents */}
        <Allotment.Pane preferredSize="40%" minSize={20}>
          {results.length > 0 ? (
            <Box
              sx={{
                height: '100%',
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Pipeline Results
                </Typography>
                {results.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {results.length} document{results.length !== 1 ? 's' : ''}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
                {error && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha('#f85149', 0.1),
                      borderBottom: '1px solid',
                      borderColor: 'error.main'
                    }}
                  >
                    <Typography variant="body2" color="error.main">
                      {error}
                    </Typography>
                  </Box>
                )}
                <ResultsViewer 
                  documents={results} 
                  isLoading={isExecuting}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  hasMore={hasMore}
                  onPageChange={handlePageChange}
                  connectionString={connectionString}
                  databaseName={databaseName}
                  collection={collection}
                  onDocumentUpdated={() => {
                    // Refresh current page after update
                    executePipeline(currentPage, false);
                  }}
                />
              </Box>
            </Box>
          ) : (
            <SampleDocuments
              connectionString={connectionString}
              databaseName={databaseName}
              collection={collection}
            />
          )}
        </Allotment.Pane>
      </Allotment>
      </Box>
    </Box>
  );
}

