'use client';

/**
 * Data Import Wizard
 * Step-by-step wizard for importing data from CSV, TSV, JSON, Excel files
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Schema as SchemaIcon,
  Transform as TransformIcon,
  PlayArrow as ExecuteIcon,
  CheckCircle as CompleteIcon,
} from '@mui/icons-material';
import { FileUploadStep } from './steps/FileUploadStep';
import { SchemaPreviewStep } from './steps/SchemaPreviewStep';
import { ColumnMappingStep } from './steps/ColumnMappingStep';
import { ImportExecutionStep } from './steps/ImportExecutionStep';
import { ImportCompleteStep } from './steps/ImportCompleteStep';
import {
  ImportJob,
  InferredSchema,
  ColumnMapping,
  ImportMappingConfig,
  ImportSourceConfig,
} from '@/types/dataImport';

export interface DataImportWizardProps {
  organizationId: string;
  vaultId: string;
  database: string;
  defaultCollection?: string;
  onComplete?: (job: ImportJob) => void;
  onCancel?: () => void;
}

type WizardStep = 'upload' | 'schema' | 'mapping' | 'execute' | 'complete';

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'upload', label: 'Upload File', icon: <UploadIcon /> },
  { key: 'schema', label: 'Preview Schema', icon: <SchemaIcon /> },
  { key: 'mapping', label: 'Configure Mapping', icon: <TransformIcon /> },
  { key: 'execute', label: 'Import Data', icon: <ExecuteIcon /> },
  { key: 'complete', label: 'Complete', icon: <CompleteIcon /> },
];

export function DataImportWizard({
  organizationId,
  vaultId,
  database,
  defaultCollection,
  onComplete,
  onCancel,
}: DataImportWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(null);
  const [sourceConfig, setSourceConfig] = useState<ImportSourceConfig>({
    format: 'csv',
    hasHeader: true,
    delimiter: ',',
  });
  const [collectionName, setCollectionName] = useState(defaultCollection || '');
  const [importId, setImportId] = useState<string | null>(null);
  const [inferredSchema, setInferredSchema] = useState<InferredSchema | null>(null);
  const [suggestedMappings, setSuggestedMappings] = useState<ColumnMapping[]>([]);
  const [mappingConfig, setMappingConfig] = useState<ImportMappingConfig | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: any[][];
    totalRows: number;
  } | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);

  /**
   * Step 1: Create import job and upload file
   */
  const handleFileUpload = useCallback(
    async (uploadedFile: File, config: ImportSourceConfig, collection: string) => {
      setLoading(true);
      setError(null);

      try {
        // Read file content
        let content: string | ArrayBuffer;
        if (
          uploadedFile.name.endsWith('.xlsx') ||
          uploadedFile.name.endsWith('.xls')
        ) {
          content = await uploadedFile.arrayBuffer();
        } else {
          content = await uploadedFile.text();
        }

        // Create import job
        const createResponse = await fetch('/api/data-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            vaultId,
            database,
            collection,
            createCollection: true,
            sourceConfig: config,
            fileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.type,
          }),
        });

        if (!createResponse.ok) {
          const err = await createResponse.json();
          throw new Error(err.error || 'Failed to create import job');
        }

        const { importId: newImportId } = await createResponse.json();

        setFile(uploadedFile);
        setFileContent(content);
        setSourceConfig(config);
        setCollectionName(collection);
        setImportId(newImportId);
        setActiveStep(1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setLoading(false);
      }
    },
    [organizationId, vaultId, database]
  );

  /**
   * Step 2: Analyze schema
   */
  const handleAnalyzeSchema = useCallback(async () => {
    if (!importId || !file || !fileContent) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sampleSize', '1000');

      const response = await fetch(`/api/data-import/${importId}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to analyze data');
      }

      const data = await response.json();
      setInferredSchema(data.schema);
      setSuggestedMappings(data.suggestedMappings);
      setPreview(data.preview);
      setActiveStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [importId, file, fileContent]);

  /**
   * Step 3: Configure and validate mapping
   */
  const handleConfigureMapping = useCallback(
    async (config: ImportMappingConfig) => {
      if (!importId || !file) return;

      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mappingConfig', JSON.stringify(config));

        const response = await fetch(`/api/data-import/${importId}/configure`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to configure mapping');
        }

        const data = await response.json();

        if (!data.valid && data.errors.length > 0) {
          setError(
            `Validation errors: ${data.errors.slice(0, 3).map((e: any) => e.error).join(', ')}`
          );
          return;
        }

        setMappingConfig(config);
        setActiveStep(3);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Configuration failed');
      } finally {
        setLoading(false);
      }
    },
    [importId, file]
  );

  /**
   * Step 4: Execute import
   */
  const handleExecuteImport = useCallback(
    async (dryRun: boolean = false) => {
      if (!importId || !file) return;

      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dryRun', String(dryRun));

        const response = await fetch(`/api/data-import/${importId}/execute`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Import failed');
        }

        const data = await response.json();

        // Get full job details
        const jobResponse = await fetch(`/api/data-import/${importId}`);
        const jobData = await jobResponse.json();

        setImportJob(jobData.job);

        if (!dryRun) {
          setActiveStep(4);
          onComplete?.(jobData.job);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed');
      } finally {
        setLoading(false);
      }
    },
    [importId, file, onComplete]
  );

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
    setError(null);
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <FileUploadStep
            defaultCollection={collectionName}
            sourceConfig={sourceConfig}
            onUpload={handleFileUpload}
            loading={loading}
          />
        );

      case 1:
        return (
          <SchemaPreviewStep
            schema={inferredSchema}
            preview={preview}
            loading={loading}
            onAnalyze={handleAnalyzeSchema}
            onNext={() => setActiveStep(2)}
            onBack={handleBack}
          />
        );

      case 2:
        return (
          <ColumnMappingStep
            schema={inferredSchema}
            suggestedMappings={suggestedMappings}
            onConfigure={handleConfigureMapping}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 3:
        return (
          <ImportExecutionStep
            importId={importId}
            mappingConfig={mappingConfig}
            totalRows={preview?.totalRows || 0}
            onExecute={handleExecuteImport}
            onBack={handleBack}
            loading={loading}
          />
        );

      case 4:
        return (
          <ImportCompleteStep
            job={importJob}
            collectionName={collectionName}
            database={database}
            onCreateForm={() => {
              // Navigate to form builder with pre-filled collection
              window.location.href = `/forms/new?collection=${collectionName}&database=${database}&vaultId=${vaultId}`;
            }}
            onImportMore={() => {
              // Reset wizard
              setActiveStep(0);
              setFile(null);
              setFileContent(null);
              setImportId(null);
              setInferredSchema(null);
              setMappingConfig(null);
              setImportJob(null);
            }}
            onClose={handleCancel}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Import Data
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Import data from CSV, TSV, JSON, or Excel files into your MongoDB collection.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {STEPS.map((step, index) => (
          <Step key={step.key}>
            <StepLabel
              StepIconComponent={() => (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      index < activeStep
                        ? 'success.main'
                        : index === activeStep
                        ? 'primary.main'
                        : 'grey.300',
                    color: index <= activeStep ? 'white' : 'grey.600',
                  }}
                >
                  {index < activeStep ? <CompleteIcon fontSize="small" /> : step.icon}
                </Box>
              )}
            >
              <Typography
                variant="subtitle1"
                fontWeight={index === activeStep ? 600 : 400}
              >
                {step.label}
              </Typography>
            </StepLabel>
            <StepContent>
              <Box sx={{ pt: 1, pb: 2 }}>{getStepContent(index)}</Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        {loading && <CircularProgress size={24} />}
      </Box>
    </Paper>
  );
}
