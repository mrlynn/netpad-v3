/**
 * AI Form Generator Dialog
 *
 * Dialog component for generating forms from natural language descriptions
 * or from MongoDB collection schemas.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Checkbox,
  FormControlLabel,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Close as CloseIcon,
  Lightbulb as SuggestionIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useAIFormGenerator } from '@/hooks/useAI';
import { useOrganization } from '@/contexts/OrganizationContext';
import { FormConfiguration, FieldConfig } from '@/types/form';
import { sortFieldsByPriority } from '@/lib/ai/fieldOrdering';

// ============================================
// Types
// ============================================

// Connection context from AI form generation
export interface AIGenerationConnectionContext {
  vaultId?: string;           // Vault connection ID (for org vault connections)
  connectionId?: string;      // Legacy connection ID
  database: string;           // Database name
  collection: string;         // Collection name
  organizationId?: string;    // Organization ID (for vault connections)
}

interface AIFormGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (form: Partial<FormConfiguration>, connectionContext?: AIGenerationConnectionContext) => void;
  existingSchema?: Record<string, any>;
}

interface IndustryOption {
  value: string;
  label: string;
}

// Legacy session-based connection
interface SavedConnection {
  id: string;
  name: string;
  defaultDatabase?: string;
  source: 'legacy';
}

// Organization vault connection
interface VaultConnection {
  vaultId: string;
  name: string;
  database: string;
  description?: string;
  status: 'active' | 'disabled' | 'deleted';
  source: 'vault';
}

// Combined connection type
type ConnectionOption = SavedConnection | VaultConnection;

interface DatabaseInfo {
  name: string;
}

interface CollectionInfo {
  name: string;
  type: string;
}

// Detected relationship between collections
interface DetectedRelationship {
  fieldName: string;           // e.g., "bookId"
  fieldType: string;           // e.g., "objectId"
  targetCollection: string;    // e.g., "books"
  displayField: string;        // e.g., "title" - field to show in dropdown
  displayFieldOptions: string[]; // Available fields to choose as display
  confirmed: boolean;          // User confirmed this relationship
  sampleValues?: string[];     // Sample values from target collection for preview
}

type GenerationMode = 'prompt' | 'schema';

// ============================================
// Constants
// ============================================

const INDUSTRIES: IndustryOption[] = [
  { value: '', label: 'Any / General' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'education', label: 'Education' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'technology', label: 'Technology' },
  { value: 'real_estate', label: 'Real Estate' },
];

const EXAMPLE_PROMPTS = [
  'Customer feedback form with rating, comments, and follow-up email',
  'Event registration with name, email, dietary restrictions, and session selection',
  'Job application form with resume upload, experience, and references',
  'Product order form with quantity, shipping address, and payment info',
  'Employee onboarding form with personal details and emergency contact',
];

// ============================================
// Component
// ============================================

export default function AIFormGeneratorDialog({
  open,
  onClose,
  onGenerate,
  existingSchema,
}: AIFormGeneratorDialogProps) {
  // Organization context for vault connections
  const { currentOrgId } = useOrganization();

  // Generation mode
  const [mode, setMode] = useState<GenerationMode>('prompt');

  // Prompt mode state
  const [prompt, setPrompt] = useState('');
  const [industry, setIndustry] = useState('');
  const [audience, setAudience] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Schema mode state
  const [connectionString, setConnectionString] = useState('');
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [selectedConnectionSource, setSelectedConnectionSource] = useState<'legacy' | 'vault' | null>(null);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [sampledSchema, setSampledSchema] = useState<Record<string, any> | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [detectedRelationships, setDetectedRelationships] = useState<DetectedRelationship[]>([]);

  // Loading states for schema mode
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const {
    data: generatedForm,
    loading,
    error,
    generateForm,
    reset,
    suggestions,
    confidence,
  } = useAIFormGenerator();

  // Load connections on mount
  useEffect(() => {
    if (open && mode === 'schema') {
      loadAllConnections();
    }
  }, [open, mode, currentOrgId]);

  // Load both legacy and vault connections
  const loadAllConnections = async () => {
    setLoadingConnections(true);
    const allConnections: ConnectionOption[] = [];

    try {
      // Load legacy session-based connections
      try {
        const response = await fetch('/api/connections/list');
        const data = await response.json();
        if (data.success && data.connections) {
          const legacyConns: SavedConnection[] = data.connections.map((c: any) => ({
            ...c,
            source: 'legacy' as const,
          }));
          allConnections.push(...legacyConns);
        }
      } catch (err) {
        console.error('Failed to load legacy connections:', err);
      }

      // Load organization vault connections
      if (currentOrgId) {
        try {
          const response = await fetch(`/api/organizations/${currentOrgId}/vault`);
          const data = await response.json();
          if (data.connections) {
            const vaultConns: VaultConnection[] = data.connections
              .filter((c: any) => c.status === 'active')
              .map((c: any) => ({
                vaultId: c.vaultId,
                name: c.name,
                database: c.database,
                description: c.description,
                status: c.status,
                source: 'vault' as const,
              }));
            allConnections.push(...vaultConns);
          }
        } catch (err) {
          console.error('Failed to load vault connections:', err);
        }
      }

      setConnections(allConnections);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Helper to get connection ID based on source
  const getConnectionKey = (conn: ConnectionOption): string => {
    return conn.source === 'vault' ? `vault:${conn.vaultId}` : `legacy:${conn.id}`;
  };

  // Load connection details and databases when a connection is selected
  const handleConnectionSelect = async (connectionKey: string) => {
    setSelectedConnectionId(connectionKey);
    setSelectedDatabase('');
    setSelectedCollection('');
    setCollections([]);
    setSampledSchema(null);
    setSchemaError(null);

    if (!connectionKey) {
      setDatabases([]);
      setSelectedConnectionSource(null);
      return;
    }

    const [source, id] = connectionKey.split(':');
    const isVault = source === 'vault';
    setSelectedConnectionSource(isVault ? 'vault' : 'legacy');

    setLoadingDatabases(true);
    try {
      let connString: string;
      let defaultDb: string | undefined;

      if (isVault && currentOrgId) {
        // Decrypt vault connection
        const response = await fetch(`/api/organizations/${currentOrgId}/vault/${id}/decrypt`);
        const data = await response.json();

        if (data.connectionString) {
          connString = data.connectionString;
          defaultDb = data.database;
        } else {
          setSchemaError(data.error || 'Failed to decrypt connection');
          setLoadingDatabases(false);
          return;
        }
      } else {
        // Load legacy connection
        const response = await fetch('/api/connections/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = await response.json();

        if (data.success && data.connection) {
          connString = data.connection.connectionString;
          defaultDb = data.connection.defaultDatabase;
        } else {
          setSchemaError(data.error || 'Failed to load connection');
          setLoadingDatabases(false);
          return;
        }
      }

      setConnectionString(connString);

      // Fetch databases
      const dbResponse = await fetch('/api/mongodb/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connString }),
      });
      const dbData = await dbResponse.json();

      if (dbData.databases) {
        setDatabases(dbData.databases);
        // Auto-select default database if available
        if (defaultDb) {
          setSelectedDatabase(defaultDb);
          // Trigger collection loading
          await loadCollections(connString, defaultDb);
        }
      } else {
        setSchemaError(dbData.error || 'Failed to load databases');
      }
    } catch (err) {
      setSchemaError('Failed to connect to database');
    } finally {
      setLoadingDatabases(false);
    }
  };

  // Load collections when database is selected
  const loadCollections = async (connStr: string, dbName: string) => {
    setLoadingCollections(true);
    setSelectedCollection('');
    setCollections([]);
    setSampledSchema(null);

    try {
      const response = await fetch('/api/mongodb/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString: connStr,
          databaseName: dbName,
        }),
      });
      const data = await response.json();

      if (data.collections) {
        setCollections(data.collections);
      } else {
        setSchemaError(data.error || 'Failed to load collections');
      }
    } catch (err) {
      setSchemaError('Failed to load collections');
    } finally {
      setLoadingCollections(false);
    }
  };

  // Handle database selection
  const handleDatabaseSelect = async (dbName: string) => {
    setSelectedDatabase(dbName);
    if (dbName && connectionString) {
      await loadCollections(connectionString, dbName);
    }
  };

  // Sample collection schema and detect relationships
  const handleSampleSchema = async () => {
    if (!connectionString || !selectedDatabase || !selectedCollection) return;

    setLoadingSchema(true);
    setSchemaError(null);
    setSampledSchema(null);
    setDetectedRelationships([]);

    try {
      // Sample the target collection
      const response = await fetch('/api/mongodb/sample-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          databaseName: selectedDatabase,
          collection: selectedCollection,
          limit: 10,
        }),
      });
      const data = await response.json();

      if (data.documents && data.documents.length > 0) {
        // Infer schema from sampled documents
        const schema = inferSchemaFromDocuments(data.documents);
        setSampledSchema(schema);
        setSampleCount(data.totalCount || data.documents.length);

        // Detect potential relationships
        const relationships = await detectRelationships(schema);
        setDetectedRelationships(relationships);
      } else {
        setSchemaError('No documents found in collection');
      }
    } catch (err) {
      setSchemaError('Failed to sample collection');
    } finally {
      setLoadingSchema(false);
    }
  };

  // Detect potential relationships from schema
  const detectRelationships = async (schema: Record<string, any>): Promise<DetectedRelationship[]> => {
    const relationships: DetectedRelationship[] = [];
    const availableCollections = collections.map(c => c.name.toLowerCase());

    for (const [fieldName, fieldInfo] of Object.entries(schema)) {
      // Skip if not an ObjectId type or doesn't look like a reference
      if (fieldInfo.type !== 'objectId' && !isLikelyReferenceField(fieldName)) {
        continue;
      }

      // Skip _id field
      if (fieldName === '_id') continue;

      // Try to infer the target collection from field name
      const targetCollection = inferTargetCollection(fieldName, availableCollections);

      if (targetCollection) {
        // Sample the target collection to get display field options
        try {
          const targetResponse = await fetch('/api/mongodb/sample-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              connectionString,
              databaseName: selectedDatabase,
              collection: targetCollection,
              limit: 5,
            }),
          });
          const targetData = await targetResponse.json();

          if (targetData.documents && targetData.documents.length > 0) {
            const targetSchema = inferSchemaFromDocuments(targetData.documents);
            const displayFieldOptions = findDisplayFieldOptions(targetSchema);
            const bestDisplayField = selectBestDisplayField(displayFieldOptions);

            // Get sample values for preview
            const sampleValues = targetData.documents
              .slice(0, 3)
              .map((doc: any) => doc[bestDisplayField])
              .filter((v: any) => v != null)
              .map((v: any) => String(v).substring(0, 50));

            relationships.push({
              fieldName,
              fieldType: fieldInfo.type,
              targetCollection,
              displayField: bestDisplayField,
              displayFieldOptions,
              confirmed: true, // Default to confirmed, user can uncheck
              sampleValues,
            });
          }
        } catch (err) {
          console.error(`Failed to sample target collection ${targetCollection}:`, err);
        }
      }
    }

    return relationships;
  };

  // Check if a field name looks like a reference (ends in Id, _id, etc.)
  const isLikelyReferenceField = (fieldName: string): boolean => {
    const lowerName = fieldName.toLowerCase();
    return (
      lowerName.endsWith('id') ||
      lowerName.endsWith('_id') ||
      lowerName.endsWith('ref') ||
      lowerName.endsWith('_ref')
    );
  };

  // Infer target collection from field name
  const inferTargetCollection = (fieldName: string, availableCollections: string[]): string | null => {
    // Remove common suffixes to get the base name
    let baseName = fieldName
      .replace(/(_id|Id|_ref|Ref)$/i, '')
      .toLowerCase();

    // Try exact match first
    if (availableCollections.includes(baseName)) {
      return collections.find(c => c.name.toLowerCase() === baseName)?.name || null;
    }

    // Try plural form
    const pluralName = baseName + 's';
    if (availableCollections.includes(pluralName)) {
      return collections.find(c => c.name.toLowerCase() === pluralName)?.name || null;
    }

    // Try removing trailing 's' if base name ends with it
    if (baseName.endsWith('s')) {
      const singularName = baseName.slice(0, -1);
      if (availableCollections.includes(singularName)) {
        return collections.find(c => c.name.toLowerCase() === singularName)?.name || null;
      }
    }

    // Try common variations
    const variations = [
      baseName,
      baseName + 's',
      baseName + 'es',
      baseName.replace(/y$/, 'ies'),
    ];

    for (const variant of variations) {
      const match = availableCollections.find(c => c === variant);
      if (match) {
        return collections.find(c => c.name.toLowerCase() === match)?.name || null;
      }
    }

    return null;
  };

  // Find suitable display field options from schema
  const findDisplayFieldOptions = (schema: Record<string, any>): string[] => {
    const options: string[] = [];
    const priorityFields = ['name', 'title', 'label', 'displayName', 'display_name', 'email', 'username'];

    // Add priority fields first if they exist
    for (const field of priorityFields) {
      if (schema[field] && schema[field].type === 'string') {
        options.push(field);
      }
    }

    // Add other string fields
    for (const [fieldName, fieldInfo] of Object.entries(schema)) {
      if (fieldInfo.type === 'string' && !options.includes(fieldName) && fieldName !== '_id') {
        options.push(fieldName);
      }
    }

    // If no string fields, add any non-object fields
    if (options.length === 0) {
      for (const [fieldName, fieldInfo] of Object.entries(schema)) {
        if (fieldInfo.type !== 'object' && fieldInfo.type !== 'array' && fieldName !== '_id') {
          options.push(fieldName);
        }
      }
    }

    return options;
  };

  // Select the best display field from options
  const selectBestDisplayField = (options: string[]): string => {
    const priorityOrder = ['title', 'name', 'label', 'displayName', 'display_name', 'email', 'username'];

    for (const priority of priorityOrder) {
      if (options.includes(priority)) {
        return priority;
      }
    }

    return options[0] || 'name';
  };

  // Toggle relationship confirmation
  const toggleRelationship = (fieldName: string) => {
    setDetectedRelationships(prev =>
      prev.map(rel =>
        rel.fieldName === fieldName ? { ...rel, confirmed: !rel.confirmed } : rel
      )
    );
  };

  // Update display field for a relationship
  const updateRelationshipDisplayField = (fieldName: string, displayField: string) => {
    setDetectedRelationships(prev =>
      prev.map(rel =>
        rel.fieldName === fieldName ? { ...rel, displayField } : rel
      )
    );
  };

  // Infer schema from sampled documents
  const inferSchemaFromDocuments = (documents: Record<string, any>[]): Record<string, any> => {
    const schema: Record<string, any> = {};

    documents.forEach((doc) => {
      Object.entries(doc).forEach(([key, value]) => {
        if (!schema[key]) {
          schema[key] = {
            type: inferType(value),
            sample: value,
            count: 1,
          };
        } else {
          schema[key].count++;
        }
      });
    });

    return schema;
  };

  // Infer type from value
  const inferType = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') {
      if (value._bsontype === 'ObjectId' || value.$oid) return 'objectId';
      if (value.$date) return 'date';
      return 'object';
    }
    if (typeof value === 'string') {
      // Check for patterns
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
      if (/^\+?[\d\s-()]{10,}$/.test(value)) return 'phone';
      if (/^https?:\/\//.test(value)) return 'url';
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      return 'string';
    }
    return typeof value;
  };

  // Handle form generation
  const handleGenerate = useCallback(async () => {
    if (mode === 'prompt') {
      if (!prompt.trim()) return;

      await generateForm(
        prompt,
        {
          industry: industry || undefined,
          audience: audience || undefined,
          schema: existingSchema,
        },
        {
          includeValidation: true,
          includeConditionalLogic: true,
        }
      );
    } else {
      // Schema mode
      if (!sampledSchema) return;

      // Build relationship instructions for the AI
      const confirmedRelationships = detectedRelationships.filter(r => r.confirmed);
      const relationshipInstructions = confirmedRelationships.length > 0
        ? `

IMPORTANT - Reference Fields (create as lookup/dropdown fields):
${confirmedRelationships.map(rel =>
  `- Field "${rel.fieldName}" references the "${rel.targetCollection}" collection.
   Create this as a "lookup" or "dropdown" field type.
   Configure it to display the "${rel.displayField}" field from ${rel.targetCollection}.
   The field should store the _id but show "${rel.displayField}" to users.
   Set lookup.collection to "${rel.targetCollection}" and lookup.displayField to "${rel.displayField}".`
).join('\n')}`
        : '';

      const schemaPrompt = `Generate a user-friendly data entry form for a MongoDB collection with this schema:

Collection: ${selectedCollection}
Database: ${selectedDatabase}
Document count: ${sampleCount}

Schema (field name → type and sample):
${Object.entries(sampledSchema)
  .map(([key, info]: [string, any]) => `- ${key}: ${info.type} (sample: ${JSON.stringify(info.sample)?.substring(0, 50)})`)
  .join('\n')}
${relationshipInstructions}

Create a form with:
1. Appropriate field types based on the data types and field names
2. User-friendly labels (convert snake_case/camelCase to Title Case)
3. Sensible validation rules
4. Skip internal fields like _id, __v, createdAt, updatedAt unless they're user-editable
5. Group related fields logically
6. Mark fields that appear in all documents as required
${confirmedRelationships.length > 0 ? '7. For reference fields listed above, use lookup/dropdown type with the specified configuration' : ''}`;

      await generateForm(
        schemaPrompt,
        {
          schema: sampledSchema,
          relationships: confirmedRelationships,
        },
        {
          includeValidation: true,
          includeConditionalLogic: false,
        }
      );
    }
  }, [mode, prompt, industry, audience, existingSchema, generateForm, sampledSchema, selectedCollection, selectedDatabase, sampleCount, detectedRelationships]);

  // Handle applying the generated form
  const handleApply = useCallback(() => {
    if (generatedForm) {
      let formToApply = { ...generatedForm };
      let connectionContext: AIGenerationConnectionContext | undefined;

      // If in schema mode, set the collection and database
      if (mode === 'schema') {
        formToApply = {
          ...formToApply,
          collection: selectedCollection,
          database: selectedDatabase,
        };

        // Build connection context for the form builder
        if (selectedConnectionId) {
          const [source, id] = selectedConnectionId.split(':');
          connectionContext = {
            database: selectedDatabase,
            collection: selectedCollection,
            ...(source === 'vault' ? {
              vaultId: id,
              organizationId: currentOrgId || undefined,
            } : {
              connectionId: id,
            }),
          };
        }

        // Apply lookup configurations for confirmed relationships
        const confirmedRelationships = detectedRelationships.filter(r => r.confirmed);
        if (confirmedRelationships.length > 0 && formToApply.fieldConfigs) {
          formToApply.fieldConfigs = formToApply.fieldConfigs.map(field => {
            const relationship = confirmedRelationships.find(
              r => r.fieldName === field.path || r.fieldName === field.path.replace(/^.*\./, '')
            );

            if (relationship) {
              // Configure this field as a lookup field
              return {
                ...field,
                type: 'lookup',
                lookup: {
                  collection: relationship.targetCollection,
                  displayField: relationship.displayField,
                  valueField: '_id',
                  searchable: true,
                  preloadOptions: true,
                },
              };
            }
            return field;
          });
        }
      }

      // Sort fields by priority (contact info first, metadata last)
      if (formToApply.fieldConfigs) {
        formToApply.fieldConfigs = sortFieldsByPriority(formToApply.fieldConfigs);
      }

      onGenerate(formToApply, connectionContext);
      handleClose();
    }
  }, [generatedForm, onGenerate, mode, selectedCollection, selectedDatabase, selectedConnectionId, currentOrgId, detectedRelationships]);

  // Handle closing the dialog
  const handleClose = useCallback(() => {
    reset();
    setPrompt('');
    setIndustry('');
    setAudience('');
    setShowAdvanced(false);
    setSelectedConnectionId('');
    setSelectedConnectionSource(null);
    setConnectionString('');
    setDatabases([]);
    setSelectedDatabase('');
    setCollections([]);
    setSelectedCollection('');
    setSampledSchema(null);
    setDetectedRelationships([]);
    setSchemaError(null);
    onClose();
  }, [reset, onClose]);

  // Handle example prompt click
  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
  }, []);

  // Handle mode change
  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: GenerationMode | null
  ) => {
    if (newMode) {
      setMode(newMode);
      reset();
      if (newMode === 'schema') {
        loadAllConnections();
      }
    }
  };

  const canGenerate = mode === 'prompt'
    ? prompt.trim().length > 0
    : sampledSchema !== null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AIIcon color="primary" />
            <Typography variant="h6">Generate Form with AI</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Mode Toggle */}
        <Box mb={3}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            fullWidth
            size="small"
          >
            <ToggleButton value="prompt" sx={{ gap: 1 }}>
              <EditIcon fontSize="small" />
              Describe Your Form
            </ToggleButton>
            <ToggleButton value="schema" sx={{ gap: 1 }}>
              <StorageIcon fontSize="small" />
              Generate from Collection
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Prompt Mode */}
        {mode === 'prompt' && (
          <Box mb={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Describe the form you want to create in plain language. Be specific about the fields,
              validation rules, and any conditional logic you need.
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Describe your form"
              placeholder="e.g., Create a customer feedback form with a 1-5 star rating, optional comments field, and ask for email only if they want a follow-up response"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
            />

            {/* Example prompts */}
            <Box mb={2}>
              <Typography variant="caption" color="text.secondary">
                Try an example:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                {EXAMPLE_PROMPTS.map((example, index) => (
                  <Chip
                    key={index}
                    label={example.length > 40 ? example.substring(0, 40) + '...' : example}
                    size="small"
                    variant="outlined"
                    onClick={() => handleExampleClick(example)}
                    disabled={loading}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Advanced options */}
            <Accordion
              expanded={showAdvanced}
              onChange={() => setShowAdvanced(!showAdvanced)}
              elevation={0}
              sx={{ backgroundColor: 'transparent', '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" color="text.secondary">
                  Advanced Options
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" gap={2}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Industry</InputLabel>
                    <Select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      label="Industry"
                      disabled={loading}
                    >
                      {INDUSTRIES.map((ind) => (
                        <MenuItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    label="Target Audience"
                    placeholder="e.g., customers, employees"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    disabled={loading}
                    sx={{ flexGrow: 1 }}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {/* Schema Mode */}
        {mode === 'schema' && (
          <Box mb={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Connect to a MongoDB collection and let AI analyze the schema to generate an optimized form
              with appropriate field types and validation.
            </Typography>

            {/* Connection selector */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Saved Connection</InputLabel>
              <Select
                value={selectedConnectionId}
                onChange={(e) => handleConnectionSelect(e.target.value)}
                label="Saved Connection"
                disabled={loading || loadingConnections}
              >
                <MenuItem value="">
                  <em>Select a connection...</em>
                </MenuItem>
                {connections.map((conn) => {
                  const key = getConnectionKey(conn);
                  const dbName = conn.source === 'vault' ? conn.database : conn.defaultDatabase;
                  return (
                    <MenuItem key={key} value={key}>
                      {conn.name} {dbName && `(${dbName})`}
                      {conn.source === 'vault' && (
                        <Chip
                          label="Org"
                          size="small"
                          sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Database selector */}
            {selectedConnectionId && (
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Database</InputLabel>
                <Select
                  value={selectedDatabase}
                  onChange={(e) => handleDatabaseSelect(e.target.value)}
                  label="Database"
                  disabled={loading || loadingDatabases || databases.length === 0}
                >
                  <MenuItem value="">
                    <em>Select a database...</em>
                  </MenuItem>
                  {databases.map((db) => (
                    <MenuItem key={db.name} value={db.name}>
                      {db.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Collection selector */}
            {selectedDatabase && (
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Collection</InputLabel>
                <Select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  label="Collection"
                  disabled={loading || loadingCollections || collections.length === 0}
                >
                  <MenuItem value="">
                    <em>Select a collection...</em>
                  </MenuItem>
                  {collections.map((coll) => (
                    <MenuItem key={coll.name} value={coll.name}>
                      {coll.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Sample button */}
            {selectedCollection && !sampledSchema && (
              <Button
                variant="outlined"
                onClick={handleSampleSchema}
                disabled={loadingSchema}
                startIcon={loadingSchema ? <CircularProgress size={16} /> : <RefreshIcon />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {loadingSchema ? 'Sampling Collection...' : 'Sample Collection Schema'}
              </Button>
            )}

            {/* Schema error */}
            {schemaError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {schemaError}
              </Alert>
            )}

            {/* Sampled schema preview */}
            {sampledSchema && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">
                    Schema Preview ({Object.keys(sampledSchema).length} fields)
                  </Typography>
                  <Chip
                    label={`${sampleCount} documents`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {Object.entries(sampledSchema).map(([field, info]: [string, any]) => {
                    const hasRelationship = detectedRelationships.some(r => r.fieldName === field);
                    return (
                      <Box
                        key={field}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        py={0.5}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          bgcolor: hasRelationship ? (theme) => alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {hasRelationship && (
                            <Tooltip title="Reference field detected">
                              <LinkIcon fontSize="small" color="primary" sx={{ fontSize: 14 }} />
                            </Tooltip>
                          )}
                          <Typography variant="body2" fontFamily="monospace">
                            {field}
                          </Typography>
                        </Box>
                        <Chip label={info.type} size="small" variant="outlined" />
                      </Box>
                    );
                  })}
                </Box>
                <Button
                  size="small"
                  onClick={() => {
                    setSampledSchema(null);
                    setDetectedRelationships([]);
                  }}
                  sx={{ mt: 1 }}
                >
                  Re-sample
                </Button>
              </Paper>
            )}

            {/* Detected relationships */}
            {detectedRelationships.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: (theme) => alpha(theme.palette.info.main, 0.05),
                  borderColor: 'info.main',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <LinkIcon color="info" fontSize="small" />
                  <Typography variant="subtitle2">
                    Detected Relationships ({detectedRelationships.length})
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  We detected fields that reference other collections. Confirmed relationships will be
                  created as dropdown selects in the form.
                </Typography>
                <Divider sx={{ mb: 1.5 }} />

                {detectedRelationships.map((rel) => (
                  <Box
                    key={rel.fieldName}
                    sx={{
                      mb: 2,
                      pb: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { mb: 0, pb: 0, borderBottom: 'none' },
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rel.confirmed}
                          onChange={() => toggleRelationship(rel.fieldName)}
                          size="small"
                        />
                      }
                      label={
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
                            {rel.fieldName}
                          </Typography>
                          <ArrowIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                          <Chip
                            label={rel.targetCollection}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                    />

                    {rel.confirmed && (
                      <Box sx={{ ml: 4, mt: 1 }}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Display Field</InputLabel>
                            <Select
                              value={rel.displayField}
                              onChange={(e) => updateRelationshipDisplayField(rel.fieldName, e.target.value)}
                              label="Display Field"
                            >
                              {rel.displayFieldOptions.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                  {opt}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {rel.sampleValues && rel.sampleValues.length > 0 && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Preview:
                              </Typography>
                              <Box display="flex" gap={0.5} mt={0.25}>
                                {rel.sampleValues.map((val, i) => (
                                  <Chip
                                    key={i}
                                    label={val}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Paper>
            )}

            {/* No connections message */}
            {!loadingConnections && connections.length === 0 && (
              <Alert severity="info">
                No connections found. Please save a MongoDB connection from the Configure Data Storage
                dialog or add one to your organization&apos;s connection vault.
              </Alert>
            )}
          </Box>
        )}

        {/* Loading state */}
        {loading && (
          <Box textAlign="center" py={4}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              {mode === 'schema'
                ? 'Analyzing schema and generating form...'
                : 'Generating your form...'}
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Generated form preview */}
        {generatedForm && !loading && (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                Generated Form Preview
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  Confidence:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={confidence * 100}
                  sx={{ width: 80, height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round(confidence * 100)}%
                </Typography>
              </Box>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {generatedForm.name}
              </Typography>
              {generatedForm.description && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {generatedForm.description}
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Fields ({generatedForm.fieldConfigs?.length || 0}):
              </Typography>
              <List dense disablePadding>
                {generatedForm.fieldConfigs?.map((field, index) => (
                  <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={field.label}
                      secondary={`${field.type}${field.required ? ' • Required' : ''}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  mb={1}
                >
                  <SuggestionIcon fontSize="small" />
                  Suggestions for improvement:
                </Typography>
                {suggestions.map((suggestion, index) => (
                  <Alert
                    key={index}
                    severity="info"
                    icon={<WarningIcon fontSize="small" />}
                    sx={{ mb: 1, py: 0 }}
                  >
                    <Typography variant="caption">{suggestion}</Typography>
                  </Alert>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        {!generatedForm ? (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            startIcon={loading ? <CircularProgress size={16} /> : <AIIcon />}
          >
            {loading ? 'Generating...' : 'Generate Form'}
          </Button>
        ) : (
          <>
            <Button onClick={reset} disabled={loading}>
              Try Again
            </Button>
            <Button variant="contained" onClick={handleApply} color="success">
              Apply to Builder
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
