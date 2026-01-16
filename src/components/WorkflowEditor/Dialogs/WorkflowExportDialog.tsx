/**
 * Workflow Export Dialog
 *
 * Allows users to export workflows in multiple formats:
 * - View/preview the export content
 * - Download in various formats (JSON, Mermaid, n8n, Make)
 * - Copy to clipboard
 * - Render Mermaid diagrams inline
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Divider,
  Chip,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  AccountTree as DiagramIcon,
  Sync as SyncIcon,
  Hub as HubIcon,
  Check as CheckIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { WorkflowDocument } from '@/types/workflow';
import {
  exportWorkflow,
  ExportFormat,
  EXPORT_FORMATS,
} from '@/lib/workflow/exportFormats';
import { cleanWorkflowForExport } from '@/lib/templates/export';

// ============================================
// Types
// ============================================

interface WorkflowExportDialogProps {
  open: boolean;
  onClose: () => void;
  workflow: WorkflowDocument | null;
}

// ============================================
// Syntax Highlighting (Simple)
// ============================================

function SyntaxHighlightedCode({
  code,
  language,
  darkMode = true,
}: {
  code: string;
  language: 'json' | 'mermaid';
  darkMode?: boolean;
}) {
  // Simple syntax highlighting with regex
  const highlightedCode = useMemo(() => {
    if (language === 'json') {
      return code
        // Strings
        .replace(/"([^"\\]|\\.)*"/g, (match) => {
          if (match.startsWith('"') && (code.indexOf(match + ':') !== -1 || code.indexOf(match + ' :') !== -1)) {
            // It's a key
            return `<span style="color: ${darkMode ? '#9CDCFE' : '#0451A5'}">${match}</span>`;
          }
          // It's a value
          return `<span style="color: ${darkMode ? '#CE9178' : '#A31515'}">${match}</span>`;
        })
        // Numbers
        .replace(/\b(\d+\.?\d*)\b/g, `<span style="color: ${darkMode ? '#B5CEA8' : '#098658'}">$1</span>`)
        // Booleans and null
        .replace(/\b(true|false|null)\b/g, `<span style="color: ${darkMode ? '#569CD6' : '#0000FF'}">$1</span>`);
    }

    if (language === 'mermaid') {
      return code
        // Comments
        .replace(/(%%.*)$/gm, `<span style="color: ${darkMode ? '#6A9955' : '#008000'}">$1</span>`)
        // Keywords
        .replace(/\b(flowchart|subgraph|end|direction|classDef|class|TB|LR|TD|RL)\b/g,
          `<span style="color: ${darkMode ? '#C586C0' : '#AF00DB'}">$1</span>`)
        // Node definitions with shapes
        .replace(/(\w+)(\[|\(|\{)/g,
          `<span style="color: ${darkMode ? '#4EC9B0' : '#267F99'}">$1</span>$2`)
        // Arrow styles
        .replace(/(-->|-.->|==>|--o|--x)/g,
          `<span style="color: ${darkMode ? '#DCDCAA' : '#795E26'}">$1</span>`)
        // Labels in pipes
        .replace(/\|([^|]+)\|/g,
          `|<span style="color: ${darkMode ? '#CE9178' : '#A31515'}">$1</span>|`);
    }

    return code;
  }, [code, language, darkMode]);

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        overflow: 'auto',
        maxHeight: 400,
        fontSize: '0.8rem',
        fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
        lineHeight: 1.5,
        backgroundColor: darkMode ? '#1E1E1E' : '#FFFFFF',
        color: darkMode ? '#D4D4D4' : '#000000',
        borderRadius: 1,
        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
        '& span': {
          fontFamily: 'inherit',
        },
      }}
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
}

// ============================================
// Mermaid Diagram Renderer
// ============================================

function MermaidDiagram({
  code,
  darkMode = true,
  onSvgReady,
}: {
  code: string;
  darkMode?: boolean;
  onSvgReady?: (svg: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function renderDiagram() {
      if (!code) return;

      setIsLoading(true);
      setError(null);

      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import('mermaid')).default;

        // Configure mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: darkMode ? 'dark' : 'default',
          themeVariables: darkMode ? {
            primaryColor: '#00ED64',
            primaryTextColor: '#fff',
            primaryBorderColor: '#00ED64',
            lineColor: '#666',
            secondaryColor: '#001E2B',
            tertiaryColor: '#112733',
            background: '#1E1E1E',
            mainBkg: '#001E2B',
            nodeBorder: '#00ED64',
            clusterBkg: '#112733',
            clusterBorder: '#333',
            titleColor: '#fff',
            edgeLabelBackground: '#001E2B',
          } : {
            primaryColor: '#00ED64',
            primaryTextColor: '#001E2B',
            primaryBorderColor: '#00684A',
            lineColor: '#999',
            secondaryColor: '#E3FCF7',
            tertiaryColor: '#F5F5F5',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 15,
          },
          securityLevel: 'loose',
        });

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (mounted) {
          setSvg(renderedSvg);
          onSvgReady?.(renderedSvg);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (mounted) {
          setError(err.message || 'Failed to render diagram');
          onSvgReady?.(null);
          setIsLoading(false);
        }
      }
    }

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [code, darkMode, onSvgReady]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          gap: 2,
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Rendering diagram...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Failed to render Mermaid diagram
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {error}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        p: 2,
        overflow: 'auto',
        maxHeight: 500,
        backgroundColor: darkMode ? '#1E1E1E' : '#FFFFFF',
        borderRadius: 1,
        border: `1px solid ${darkMode ? '#333' : '#E0E0E0'}`,
        '& svg': {
          maxWidth: '100%',
          height: 'auto',
        },
      }}
      dangerouslySetInnerHTML={{ __html: svg || '' }}
    />
  );
}

// ============================================
// Image Export Utilities
// ============================================

async function svgToPng(svgString: string, scale: number = 2, darkMode: boolean = true): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Parse SVG to get dimensions
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Get dimensions from multiple sources
    let width = 0;
    let height = 0;

    // Try viewBox first (most reliable for mermaid SVGs)
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        // viewBox format: min-x min-y width height
        width = parts[2];
        height = parts[3];
      }
    }

    // Check explicit width/height attributes as fallback
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');

    if (widthAttr && !widthAttr.includes('%')) {
      const parsedWidth = parseFloat(widthAttr.replace('px', ''));
      if (parsedWidth > width) width = parsedWidth;
    }
    if (heightAttr && !heightAttr.includes('%')) {
      const parsedHeight = parseFloat(heightAttr.replace('px', ''));
      if (parsedHeight > height) height = parsedHeight;
    }

    // Fallback to reasonable defaults if dimensions couldn't be determined
    if (width <= 0) width = 1200;
    if (height <= 0) height = 800;

    // Add padding around the content
    const padding = 40;
    const totalWidth = width + padding * 2;
    const totalHeight = height + padding * 2;

    // Create a modified SVG with explicit dimensions and removed constraints
    // This ensures the full diagram is rendered at its natural size
    let modifiedSvg = svgString;

    // Remove any max-width constraints and percentage-based sizing
    modifiedSvg = modifiedSvg.replace(/<svg([^>]*)>/, (match, attrs) => {
      // Clean up attributes
      let newAttrs = attrs
        .replace(/width="[^"]*"/g, '')
        .replace(/height="[^"]*"/g, '')
        .replace(/style="[^"]*"/g, '')
        .replace(/class="[^"]*"/g, '');

      // Construct new viewBox if needed
      const hasViewBox = attrs.includes('viewBox');
      const viewBoxAttr = hasViewBox ? '' : ` viewBox="0 0 ${width} ${height}"`;

      // Set explicit dimensions in pixels
      return `<svg${newAttrs}${viewBoxAttr} width="${width}" height="${height}" style="max-width: none; overflow: visible;">`;
    });

    // Also remove any inline max-width styles from nested elements
    modifiedSvg = modifiedSvg.replace(/max-width:\s*[^;"}]+[;"]?/g, '');

    // Create canvas
    const canvasWidth = totalWidth * scale;
    const canvasHeight = totalHeight * scale;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Fill with background color matching the theme
    ctx.fillStyle = darkMode ? '#1E1E1E' : '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Create image from SVG using data URL (avoids tainted canvas issue)
    const img = new Image();

    // Convert SVG to base64 data URL to avoid cross-origin/tainted canvas issues
    const svgBase64 = btoa(unescape(encodeURIComponent(modifiedSvg)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    img.onload = () => {
      // Draw image with padding offset
      ctx.drawImage(img, padding * scale, padding * scale, width * scale, height * scale);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    };

    img.onerror = (e) => {
      console.error('SVG load error:', e);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = dataUrl;
  });
}

// ============================================
// Mermaid Preview with Code/Diagram Tabs
// ============================================

function MermaidPreview({
  code,
  darkMode = true,
  onDarkModeToggle,
  workflowName = 'workflow',
}: {
  code: string;
  darkMode?: boolean;
  onDarkModeToggle: () => void;
  workflowName?: string;
}) {
  const [viewMode, setViewMode] = useState<'diagram' | 'code'>('diagram');
  const [currentSvg, setCurrentSvg] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'svg' | 'png'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const theme = useTheme();

  const handleSvgReady = useCallback((svg: string | null) => {
    setCurrentSvg(svg);
  }, []);

  const handleCopySvg = useCallback(async () => {
    if (!currentSvg) return;

    try {
      await navigator.clipboard.writeText(currentSvg);
      setCopyStatus('svg');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy SVG:', err);
    }
  }, [currentSvg]);

  const handleCopyPng = useCallback(async () => {
    if (!currentSvg) return;

    setIsExporting(true);
    try {
      const pngBlob = await svgToPng(currentSvg, 2, darkMode);

      // Try to copy to clipboard using ClipboardItem API
      if (navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': pngBlob,
          }),
        ]);
        setCopyStatus('png');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } else {
        // Fallback: download the file
        handleDownloadPng();
      }
    } catch (err) {
      console.error('Failed to copy PNG:', err);
      // Fallback: download instead
      handleDownloadPng();
    } finally {
      setIsExporting(false);
    }
  }, [currentSvg, darkMode]);

  const handleDownloadSvg = useCallback(() => {
    if (!currentSvg) return;

    const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowName.toLowerCase().replace(/\s+/g, '-')}-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentSvg, workflowName]);

  const handleDownloadPng = useCallback(async () => {
    if (!currentSvg) return;

    setIsExporting(true);
    try {
      const pngBlob = await svgToPng(currentSvg, 2, darkMode);
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflowName.toLowerCase().replace(/\s+/g, '-')}-diagram.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PNG:', err);
    } finally {
      setIsExporting(false);
    }
  }, [currentSvg, workflowName, darkMode]);

  return (
    <Box>
      {/* Sub-tabs for Diagram vs Code view */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Tabs
          value={viewMode}
          onChange={(_, v) => setViewMode(v)}
          sx={{ minHeight: 36 }}
        >
          <Tab
            value="diagram"
            icon={<ImageIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Diagram"
            sx={{
              textTransform: 'none',
              minHeight: 36,
              py: 0,
              fontSize: '0.875rem',
            }}
          />
          <Tab
            value="code"
            icon={<CodeIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Code"
            sx={{
              textTransform: 'none',
              minHeight: 36,
              py: 0,
              fontSize: '0.875rem',
            }}
          />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        {/* Image export actions - only show on diagram tab */}
        {viewMode === 'diagram' && currentSvg && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={copyStatus === 'svg' ? 'Copied!' : 'Copy SVG'}>
              <IconButton
                size="small"
                onClick={handleCopySvg}
                color={copyStatus === 'svg' ? 'success' : 'default'}
              >
                {copyStatus === 'svg' ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title={copyStatus === 'png' ? 'Copied!' : 'Copy PNG'}>
              <IconButton
                size="small"
                onClick={handleCopyPng}
                color={copyStatus === 'png' ? 'success' : 'default'}
                disabled={isExporting}
              >
                {isExporting ? (
                  <CircularProgress size={16} />
                ) : copyStatus === 'png' ? (
                  <CheckIcon fontSize="small" />
                ) : (
                  <ImageIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Download SVG">
              <IconButton size="small" onClick={handleDownloadSvg}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download PNG">
              <IconButton size="small" onClick={handleDownloadPng} disabled={isExporting}>
                {isExporting ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
          <IconButton size="small" onClick={onDarkModeToggle}>
            {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content based on view mode */}
      {viewMode === 'diagram' ? (
        <MermaidDiagram code={code} darkMode={darkMode} onSvgReady={handleSvgReady} />
      ) : (
        <SyntaxHighlightedCode code={code} language="mermaid" darkMode={darkMode} />
      )}

      {/* Tip for external viewer */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1, textAlign: 'center' }}
      >
        Tip: You can also paste this code into{' '}
        <a
          href="https://mermaid.live"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          Mermaid Live Editor
        </a>
        {' '}for interactive editing.
      </Typography>
    </Box>
  );
}

// ============================================
// Format Icon
// ============================================

function FormatIcon({ format }: { format: ExportFormat }) {
  switch (format) {
    case 'json':
      return <CodeIcon />;
    case 'mermaid':
    case 'mermaid-tb':
    case 'mermaid-lr':
      return <DiagramIcon />;
    case 'n8n':
      return <SyncIcon />;
    case 'make':
      return <HubIcon />;
    default:
      return <CodeIcon />;
  }
}

// ============================================
// Main Component
// ============================================

export function WorkflowExportDialog({
  open,
  onClose,
  workflow,
}: WorkflowExportDialogProps) {
  const theme = useTheme();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [copied, setCopied] = useState(false);
  const [codeDarkMode, setCodeDarkMode] = useState(true);

  // Generate export content
  const exportResult = useMemo(() => {
    if (!workflow) return null;

    try {
      // Clean workflow for export (removes sensitive data like orgId, credentials)
      const cleanedWorkflow = cleanWorkflowForExport(workflow);
      return exportWorkflow(cleanedWorkflow, {
        format: selectedFormat,
        prettyPrint: true,
      });
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  }, [workflow, selectedFormat]);

  // Get format info
  const formatInfo = useMemo(
    () => EXPORT_FORMATS.find((f) => f.id === selectedFormat),
    [selectedFormat]
  );

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!exportResult) return;

    try {
      await navigator.clipboard.writeText(exportResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [exportResult]);

  // Download file
  const handleDownload = useCallback(() => {
    if (!exportResult) return;

    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportResult]);

  // Handle format change
  const handleFormatChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFormat: ExportFormat | null
  ) => {
    if (newFormat) {
      setSelectedFormat(newFormat);
    }
  };

  if (!workflow) return null;

  const isMermaidFormat = selectedFormat.startsWith('mermaid');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DownloadIcon color="primary" />
          <Typography variant="h6">Export Workflow</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {/* Format Selection */}
        <Box sx={{ px: 3, py: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Export Format
          </Typography>
          <ToggleButtonGroup
            value={selectedFormat}
            exclusive
            onChange={handleFormatChange}
            aria-label="export format"
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {EXPORT_FORMATS.map((format) => (
              <ToggleButton
                key={format.id}
                value={format.id}
                sx={{
                  textTransform: 'none',
                  px: 2,
                  gap: 1,
                }}
              >
                <FormatIcon format={format.id} />
                {format.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {formatInfo && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1 }}
            >
              {formatInfo.description}
              {formatInfo.supportsImport && (
                <Chip
                  label="Re-importable"
                  size="small"
                  color="success"
                  sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Preview Content */}
        <Box sx={{ px: 3, py: 2 }}>
          {/* Header with actions for non-mermaid formats */}
          {!isMermaidFormat && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title={codeDarkMode ? 'Light mode' : 'Dark mode'}>
                  <IconButton
                    size="small"
                    onClick={() => setCodeDarkMode(!codeDarkMode)}
                  >
                    {codeDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                  <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}

          {/* Mermaid has its own sub-tabs */}
          {isMermaidFormat && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Preview
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy code to clipboard'}>
                <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                  {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {exportResult ? (
            isMermaidFormat ? (
              <MermaidPreview
                code={exportResult.content}
                darkMode={codeDarkMode}
                onDarkModeToggle={() => setCodeDarkMode(!codeDarkMode)}
                workflowName={workflow.name}
              />
            ) : (
              <SyntaxHighlightedCode
                code={exportResult.content}
                language="json"
                darkMode={codeDarkMode}
              />
            )
          ) : (
            <Alert severity="error">Failed to generate export</Alert>
          )}
        </Box>

        {/* Stats */}
        {exportResult && (
          <Box sx={{ px: 3, py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {exportResult.content.length.toLocaleString()} characters
              {' • '}
              {(new Blob([exportResult.content]).size / 1024).toFixed(1)} KB
              {' • '}
              {workflow.canvas.nodes.length} nodes
              {' • '}
              {workflow.canvas.edges.length} connections
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={!exportResult}
        >
          Download {formatInfo?.fileExtension.toUpperCase()}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WorkflowExportDialog;
